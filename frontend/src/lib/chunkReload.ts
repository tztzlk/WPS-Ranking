/** Set before reloading after a failed lazy chunk load; stops a reload loop. */
export const RELOAD_FLAG = 'wps-chunk-reload';

/** Call once a page has loaded fine, so a later deploy can reload again. */
export function clearChunkReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    /* storage unavailable */
  }
}
