const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function generateRecoveryCodes(n: number): string[] {
  return Array.from({ length: n }, () => {
    const bytes = crypto.getRandomValues(new Uint8Array(10));
    const raw = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

export async function hashRecoveryCode(userId: string, code: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${userId}:${normalizeRecoveryCode(code)}`));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}
