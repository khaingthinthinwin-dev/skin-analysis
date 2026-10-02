/**
 * Writes plain text to the clipboard and reports whether it succeeded.
 * Clipboard access can fail (insecure context, denied permission, unsupported
 * browser), so callers receive `false` instead of an exception and can show
 * their own feedback.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}