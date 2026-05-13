import { Resend } from "resend";

let _resend: Resend | undefined;

export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function sendAliveCheckEmail(params: {
  to: string;
  ownerAddress: string;
  checkToken: string;
  gracePeriodDays: number;
}) {
  const resend = getResend();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const aliveLink = `${appUrl}/alive/${params.checkToken}`;

  await resend.emails.send({
    from: "CryptoWill <noreply@cryptowill.xyz>",
    to: params.to,
    subject: "CryptoWill — Confirm you're alive",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Are you still there?</h1>
        <p style="color: #4a4a4a; font-size: 16px;">
          This is your monthly alive check for your CryptoWill.
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          Wallet: <code>${params.ownerAddress.slice(0, 6)}...${params.ownerAddress.slice(-4)}</code>
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          Please confirm you're alive by clicking the button below and signing with your wallet.
          If you don't respond within <strong>${params.gracePeriodDays} days</strong>, your will
          may be executed and funds transferred to your beneficiary.
        </p>
        <a href="${aliveLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Confirm I'm Alive
        </a>
        <p style="color: #888; font-size: 14px;">
          Or visit: ${aliveLink}
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #888; font-size: 12px;">
          CryptoWill — Protecting your crypto legacy. You're receiving this because you created a will at cryptowill.xyz.
        </p>
      </div>
    `,
  });
}

export async function sendExpiryWarningEmail(params: {
  to: string;
  ownerAddress: string;
  daysLeft: number;
  beneficiaryAddress: string;
}) {
  const resend = getResend();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  await resend.emails.send({
    from: "CryptoWill <noreply@cryptowill.xyz>",
    to: params.to,
    subject: `CryptoWill — Your will executes in ${params.daysLeft} days`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">⚠️ Urgent: Will Expiring Soon</h1>
        <p style="color: #4a4a4a; font-size: 16px;">
          Your CryptoWill will be <strong>executed in ${params.daysLeft} day${params.daysLeft === 1 ? "" : "s"}</strong>
          if you don't confirm you're alive.
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          Wallet: <code>${params.ownerAddress.slice(0, 6)}...${params.ownerAddress.slice(-4)}</code><br/>
          Beneficiary: <code>${params.beneficiaryAddress.slice(0, 6)}...${params.beneficiaryAddress.slice(-4)}</code>
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          All approved tokens and deposited ETH will be transferred to your beneficiary
          if you do not check in.
        </p>
        <a href="${appUrl}/dashboard" style="display: inline-block; background: #dc2626; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Confirm I'm Alive Now
        </a>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #888; font-size: 12px;">
          CryptoWill — Protecting your crypto legacy. This is an urgent reminder because your grace period is about to expire.
        </p>
      </div>
    `,
  });
}

export async function sendWillExecutedEmail(params: {
  to: string;
  beneficiaryAddress: string;
  ownerAddress: string;
  tokenCount: number;
}) {
  const resend = getResend();

  await resend.emails.send({
    from: "CryptoWill <noreply@cryptowill.xyz>",
    to: params.to,
    subject: "CryptoWill — A will has been executed",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Will Executed</h1>
        <p style="color: #4a4a4a; font-size: 16px;">
          A CryptoWill has been executed due to inactivity.
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          <strong>Owner:</strong> <code>${params.ownerAddress}</code><br/>
          <strong>Beneficiary:</strong> <code>${params.beneficiaryAddress}</code><br/>
          <strong>Tokens transferred:</strong> ${params.tokenCount}
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          The tokens and ETH have been transferred to the beneficiary wallet.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #888; font-size: 12px;">
          CryptoWill — Protecting your crypto legacy.
        </p>
      </div>
    `,
  });
}

export async function sendBeneficiaryNotificationEmail(params: {
  to: string;
  ownerAddress: string;
  beneficiaryAddress: string;
  tokenCount: number;
  ethAmount: string;
  txHash: string;
}) {
  const resend = getResend();
  const basescanUrl = `https://basescan.org/tx/${params.txHash}`;
  const hasETH = params.ethAmount !== "0";

  await resend.emails.send({
    from: "CryptoWill <noreply@cryptowill.xyz>",
    to: params.to,
    subject: "You've been named as a beneficiary on ChainWill",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">You've Received a Crypto Inheritance</h1>
        <p style="color: #4a4a4a; font-size: 16px;">
          A CryptoWill has been executed and assets have been transferred to your wallet.
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          <strong>Owner wallet:</strong> <code>${params.ownerAddress.slice(0, 6)}...${params.ownerAddress.slice(-4)}</code><br/>
          <strong>Your wallet:</strong> <code>${params.beneficiaryAddress.slice(0, 6)}...${params.beneficiaryAddress.slice(-4)}</code><br/>
          <strong>Tokens transferred:</strong> ${params.tokenCount}<br/>
          ${hasETH ? `<strong>ETH transferred:</strong> ${params.ethAmount} ETH` : ""}
        </p>
        <p style="color: #4a4a4a; font-size: 16px;">
          The approved ERC-20 tokens have been sent directly to your wallet.
          ${hasETH ? "The ETH has also been transferred to your wallet." : "If ETH was deposited in the contract, you may need to claim it separately."}
        </p>
        <a href="${basescanUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View Transaction on Basescan
        </a>
        <p style="color: #888; font-size: 14px;">
          Or visit: ${basescanUrl}
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #888; font-size: 12px;">
          CryptoWill — Protecting your crypto legacy. You're receiving this because you were named as a beneficiary on a CryptoWill.
        </p>
      </div>
    `,
  });
}
