/**
 * Share a URL: the system share sheet where there is one (phones), otherwise the
 * clipboard. Without clipboard access (plain http, old browsers, denied permission)
 * the link is shown in a prompt so it can still be copied by hand.
 * Returns 'copied' when the link went to the clipboard, so the button can say so.
 */
export async function shareLink(url: string): Promise<'shared' | 'copied' | 'shown'> {
  if (navigator.share) {
    try {
      await navigator.share({ url });
      return 'shared';
    } catch (err) {
      // The person closed the share sheet: nothing else to do.
      if (err instanceof DOMException && err.name === 'AbortError') return 'shared';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    window.prompt('Copy this link:', url);
    return 'shown';
  }
}
