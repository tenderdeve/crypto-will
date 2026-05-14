import { NextRequest, NextResponse } from "next/server";
import { formatEther } from "viem";
import { getExpiredWills, updateWillStatus } from "@/lib/db/queries/wills";
import { getPublicClient, getWalletClient } from "@/lib/chain/client";
import {
  CRYPTO_WILL_ABI,
  CRYPTO_WILL_ADDRESS,
  CRYPTO_WILL_V2_ABI,
  CRYPTO_WILL_V2_ADDRESS,
} from "@/lib/chain/contracts";
import { sendWillExecutedEmail, sendBeneficiaryNotificationEmail, sendGuardianVotingEmail } from "@/lib/email/resend";
import { getSupabaseAdmin } from "@/lib/db/supabase";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const expiredWills = await getExpiredWills();

    let executed = 0;
    let votingStarted = 0;
    let failed = 0;

    for (const will of expiredWills) {
      try {
        // Get user's wallet address
        const supabase = getSupabaseAdmin();
        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("id", will.user_id)
          .single();

        if (!user) {
          failed++;
          continue;
        }

        const publicClient = getPublicClient();
        const walletClient = getWalletClient();
        const isV2 = will.contract_version === 2;
        const contractAddress = isV2 ? CRYPTO_WILL_V2_ADDRESS : CRYPTO_WILL_ADDRESS;

        let txHash: `0x${string}` | undefined;
        let ethAmount = "0";

        if (isV2 && will.contract_will_id !== null) {
          // V2: Check if will has guardians
          const guardianConfig = await publicClient.readContract({
            address: contractAddress,
            abi: CRYPTO_WILL_V2_ABI,
            functionName: "getGuardianConfig",
            args: [
              user.wallet_address as `0x${string}`,
              BigInt(will.contract_will_id),
            ],
          });

          const hasGuardians = guardianConfig.guardians.length > 0;

          if (hasGuardians) {
            // Will has guardians — start voting instead of executing
            try {
              const hash = await walletClient.writeContract({
                address: contractAddress,
                abi: CRYPTO_WILL_V2_ABI,
                functionName: "startVoting",
                args: [
                  user.wallet_address as `0x${string}`,
                  BigInt(will.contract_will_id),
                ],
              });

              await publicClient.waitForTransactionReceipt({ hash });

              // Send notification emails to guardians
              const { data: guardians } = await supabase
                .from("will_guardians")
                .select("*")
                .eq("will_id", will.id);

              for (const guardian of guardians || []) {
                if (guardian.guardian_email) {
                  await sendGuardianVotingEmail({
                    to: guardian.guardian_email,
                    ownerAddress: user.wallet_address,
                    guardianAddress: guardian.guardian_address,
                    willId: will.contract_will_id!.toString(),
                    votingWindowDays: will.voting_window_days || 14,
                  }).catch(() => {}); // Don't fail on email error
                }
              }

              votingStarted++;
              continue;
            } catch {
              // startVoting might fail if already started or other issue
              failed++;
              continue;
            }
          }

          // V2 without guardians — execute directly
          const onChainWill = await publicClient.readContract({
            address: contractAddress,
            abi: CRYPTO_WILL_V2_ABI,
            functionName: "getWill",
            args: [
              user.wallet_address as `0x${string}`,
              BigInt(will.contract_will_id),
            ],
          });

          if (!onChainWill.active) {
            await updateWillStatus(will.id, "executed");
            executed++;
            continue;
          }

          txHash = await walletClient.writeContract({
            address: contractAddress,
            abi: CRYPTO_WILL_V2_ABI,
            functionName: "executeWill",
            args: [
              user.wallet_address as `0x${string}`,
              BigInt(will.contract_will_id),
            ],
          });

          await publicClient.waitForTransactionReceipt({ hash: txHash });
        } else {
          // V1: Original behavior
          const onChainWill = await publicClient.readContract({
            address: CRYPTO_WILL_ADDRESS,
            abi: CRYPTO_WILL_ABI,
            functionName: "getWill",
            args: [user.wallet_address as `0x${string}`],
          });

          if (!onChainWill.active) {
            await updateWillStatus(will.id, "executed");
            executed++;
            continue;
          }

          // Read ETH balance before execution
          try {
            const ethBalance = await publicClient.readContract({
              address: CRYPTO_WILL_ADDRESS,
              abi: CRYPTO_WILL_ABI,
              functionName: "ethBalances",
              args: [user.wallet_address as `0x${string}`],
            });
            ethAmount = formatEther(ethBalance);
          } catch {
            // Non-critical — default to "0"
          }

          txHash = await walletClient.writeContract({
            address: CRYPTO_WILL_ADDRESS,
            abi: CRYPTO_WILL_ABI,
            functionName: "executeWill",
            args: [user.wallet_address as `0x${string}`],
          });

          await publicClient.waitForTransactionReceipt({ hash: txHash });
        }

        // Update DB status
        await updateWillStatus(will.id, "executed");

        // Notify owner via email (best effort)
        if (user.email) {
          await sendWillExecutedEmail({
            to: user.email,
            beneficiaryAddress: will.beneficiary_address,
            ownerAddress: user.wallet_address,
            tokenCount: will.token_addresses.length,
          }).catch(() => {}); // Don't fail on email error
        }

        // Notify beneficiary via email (best effort)
        if (will.beneficiary_email && txHash) {
          await sendBeneficiaryNotificationEmail({
            to: will.beneficiary_email,
            ownerAddress: user.wallet_address,
            beneficiaryAddress: will.beneficiary_address,
            tokenCount: will.token_addresses.length,
            ethAmount,
            txHash,
          }).catch(() => {}); // Don't fail on email error
        }

        executed++;
      } catch {
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      processed: expiredWills.length,
      executed,
      votingStarted,
      failed,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
