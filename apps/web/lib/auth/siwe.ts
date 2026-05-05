import { SiweMessage } from "siwe";

export async function verifySIWE(
  message: string,
  signature: string
): Promise<{ address: string; success: boolean }> {
  try {
    const siweMessage = new SiweMessage(message);
    const result = await siweMessage.verify({ signature });

    if (!result.success) {
      return { address: "", success: false };
    }

    return { address: result.data.address.toLowerCase(), success: true };
  } catch {
    return { address: "", success: false };
  }
}
