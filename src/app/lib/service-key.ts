// SHA-256 digest of the expected service API key. Only the digest is stored here,
// never the key itself. Note: anything shipped to the browser is inspectable, so
// this is a UI gate, not a substitute for server-side authentication.
const SERVICE_KEY_SHA256 = "e2e8e5d0a2e40cd1cf619e78a95bb0ba13f5434edcbdcf9c489fcba3f177645b";

export const SERVICE_KEY_PATTERN = /^[0-9A-F]{16}$/;

export async function validateServiceKey(key: string): Promise<boolean> {
    const trimmed = key.trim();
    if (!SERVICE_KEY_PATTERN.test(trimmed) || !globalThis.crypto?.subtle) return false;
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(trimmed));
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    return hex === SERVICE_KEY_SHA256;
}
