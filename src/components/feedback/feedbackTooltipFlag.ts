/**
 * sessionStorage key. Set to 'true' right after a successful sign-in so that
 * the very first time the FeedbackButton mounts (typically on the home page)
 * the tooltip auto-reveals once. Cleared after the auto-reveal so a normal
 * page reload while the user is still authenticated does NOT replay it.
 */
export const LOGIN_TOOLTIP_FLAG = 'feedbackTooltipAfterLogin';

/**
 * Call this from your auth flow (right after a successful sign-in) so the
 * FeedbackButton's tooltip auto-reveals once when the user lands on the next
 * page. The flag is consumed on first read.
 */
export function markFeedbackTooltipForNextLogin() {
  try {
    sessionStorage.setItem(LOGIN_TOOLTIP_FLAG, 'true');
  } catch {
    /* sessionStorage may be unavailable (private mode) — ignore. */
  }
}

/**
 * Read-and-consume the flag. Returns true exactly once after a sign-in.
 */
export function consumeFeedbackTooltipFlag(): boolean {
  try {
    const v = sessionStorage.getItem(LOGIN_TOOLTIP_FLAG);
    if (v === 'true') {
      sessionStorage.removeItem(LOGIN_TOOLTIP_FLAG);
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}
