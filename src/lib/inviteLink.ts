/**
 * Invite-link parsing — single source of truth for turning a pasted string into
 * something we can resolve to a circle.
 *
 * Today we only accept **personal affiliate links** of the form
 * `https://talkspree.com/<CIRCLE_ABBR>/<6-CHAR_SLUG>` (e.g.
 * `https://talkspree.com/MTY/xa7k2p`). The abbreviation resolves the circle and
 * the slug resolves the inviter (for `invited_by` attribution).
 *
 * The parser is intentionally shaped as a discriminated union so a future
 * `{ kind: 'code' }` branch (raw circle invite_code → joinCircleWithCode) is a
 * single added case. That branch is deliberately NOT enabled yet — per product
 * decision the Join modal accepts real invite links only.
 */

// Personal affiliate link: talkspree.com/<CIRCLE_ABBR>/<6-CHAR_SLUG>
const PERSONAL_LINK_REGEX = /^https?:\/\/[^/]+\/([A-Za-z0-9]{2,10})\/([a-z0-9]{6})\/?$/;

export type ParsedInvite =
  | { kind: 'affiliate'; circleAbbrev: string; userSlug: string };
// Future (disabled): | { kind: 'code'; inviteCode: string }

/**
 * Parse a pasted invite string. Returns the structured invite when it matches a
 * supported format, or `null` when it doesn't.
 */
export function parseInviteLink(input: string): ParsedInvite | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const personalMatch = trimmed.match(PERSONAL_LINK_REGEX);
  if (personalMatch) {
    return {
      kind: 'affiliate',
      circleAbbrev: personalMatch[1].toUpperCase(),
      userSlug: personalMatch[2].toLowerCase(),
    };
  }

  // NOTE: a future `{ kind: 'code' }` branch goes here, gated behind a separate
  // task. Until then, anything that isn't a personal affiliate link is invalid.
  return null;
}
