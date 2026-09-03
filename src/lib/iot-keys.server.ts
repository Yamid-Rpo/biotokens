// Server-only helpers for ESP32 device API keys.
// Keys are shown to the owner ONCE at registration; only the SHA-256 hash is stored.

export function generateDeviceApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `btk_${hex}`;
}

export async function hashDeviceApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
