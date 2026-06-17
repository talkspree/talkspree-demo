/**
 * Centralised navigation targets for the two-level app structure:
 *   - the hub ("/home") lists the user's circles + Discover
 *   - each circle homepage lives at "/circle/:abbreviation"
 *
 * Using these helpers (instead of scattered string literals) keeps the policy in
 * one place: "back to home" goes to the hub, while the in-call/circle flow
 * returns to the circle the user is actually inside.
 */
import type { NavigateFunction, NavigateOptions } from 'react-router-dom';

/** The top-level hub: "Your circles" + "Discover circles". */
export const HUB_PATH = '/home';

/**
 * sessionStorage key for the circle the user is currently "inside". Owned by
 * CircleContext; read here so navigation helpers can return to that circle from
 * routes that don't carry the abbreviation (e.g. the in-call flow).
 */
export const ACTIVE_CIRCLE_ABBREV_KEY = 'activeCircleAbbrev';

/** Build the path to a specific circle's homepage. */
export function circlePath(abbreviation: string): string {
  return `/circle/${abbreviation}`;
}

/** Navigate to the hub (the new app home). */
export function navigateToHub(navigate: NavigateFunction, options?: NavigateOptions): void {
  navigate(HUB_PATH, options);
}

/**
 * Navigate to the active circle's homepage. Uses the passed circle if given,
 * otherwise the sticky abbreviation in sessionStorage; falls back to the hub
 * when no circle is known.
 */
export function navigateToActiveCircle(
  navigate: NavigateFunction,
  circle?: { abbreviation?: string | null } | null,
  options?: NavigateOptions,
): void {
  const abbrev =
    circle?.abbreviation ??
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(ACTIVE_CIRCLE_ABBREV_KEY) : null);
  if (abbrev) {
    navigate(circlePath(abbrev), options);
  } else {
    navigate(HUB_PATH, options);
  }
}
