/**
 * Shared option lists used across onboarding and settings.
 *
 * Storing both `id` (for backward compatibility with previously-saved
 * legacy values) and `label` (the human readable string) lets UI code
 * resolve a stored value to a friendly label even if it was stored as
 * either form.
 */

export interface Option {
  id: string;
  label: string;
}

export const GENDER_OPTIONS: Option[] = [
  { id: 'Man', label: 'Man' },
  { id: 'Woman', label: 'Woman' },
  { id: 'Non-binary', label: 'Non-binary' },
  { id: 'Prefer not to say', label: 'Prefer not to say' },
];

/**
 * Map a value (which might be a legacy id or label) to a normalized
 * canonical label suitable for storing and displaying. Falls back to
 * the original value if no match is found.
 */
export function normalizeGender(value: string | null | undefined): string {
  if (!value) return '';
  const v = value.trim();
  // Legacy synonyms
  const synonyms: Record<string, string> = {
    Male: 'Man',
    Female: 'Woman',
    'I prefer not to say': 'Prefer not to say',
  };
  if (synonyms[v]) return synonyms[v];
  // Already canonical
  const found = GENDER_OPTIONS.find((o) => o.label.toLowerCase() === v.toLowerCase());
  return found ? found.label : v;
}

export const WORKPLACE_OPTIONS: Option[] = [
  { id: 'solopreneur', label: 'Solopreneur / Freelancer' },
  { id: 'startup', label: 'Startup' },
  { id: 'own-business', label: 'Own/Family Business' },
  { id: 'sme', label: 'SME' },
  { id: 'corporation', label: 'Corporation' },
  { id: 'intl-corporation', label: 'International Corporation' },
  { id: 'government', label: 'Government / Public administration' },
  { id: 'education', label: 'School / University' },
  { id: 'ngo', label: 'NGO / Think tank' },
  { id: 'cultural', label: 'Cultural / Religious Institution' },
  { id: 'other', label: 'Other' },
];

export const INDUSTRY_OPTIONS: Option[] = [
  { id: 'agriculture', label: 'Agriculture, Forestry & Fishing' },
  { id: 'utilities', label: 'Utilities, Oil & Gas' },
  { id: 'manufacturing', label: 'Manufacturing (automobiles, electronics, textiles, products)' },
  { id: 'chemistry', label: 'Chemistry & Pharmaceuticals' },
  { id: 'metallurgy', label: 'Metallurgy & Machinery' },
  { id: 'food', label: 'Food processing' },
  { id: 'retail', label: 'Retail and wholesale trade' },
  { id: 'transportation', label: 'Transportation, aviation and logistics' },
  { id: 'finance', label: 'Finance, banking, and insurance' },
  { id: 'healthcare', label: 'Healthcare' },
  { id: 'education', label: 'Education' },
  { id: 'tourism', label: 'Tourism and hospitality' },
  { id: 'real-estate', label: 'Real Estate & construction' },
  { id: 'professional', label: 'Professional services (legal, consulting, marketing)' },
  { id: 'security', label: 'Security and defense' },
  { id: 'it', label: 'Information technology (IT)' },
  { id: 'rnd', label: 'Research and development (R&D)' },
  { id: 'data', label: 'Data analytics' },
  { id: 'research', label: 'Scientific research' },
  { id: 'media', label: 'Media and communications' },
  { id: 'other', label: 'Other' },
];

/**
 * Resolve a stored value (may be a legacy id like "agriculture" or an
 * already-human-readable label) to a display label. Returns the
 * original value if nothing matches.
 */
export function getOptionLabel(options: Option[], value: string | null | undefined): string {
  if (!value) return '';
  const byId = options.find((o) => o.id === value);
  if (byId) return byId.label;
  const byLabel = options.find((o) => o.label === value);
  if (byLabel) return byLabel.label;
  return value;
}

export function getWorkplaceLabel(value: string | null | undefined): string {
  return getOptionLabel(WORKPLACE_OPTIONS, value);
}

export function getIndustryLabel(value: string | null | undefined): string {
  return getOptionLabel(INDUSTRY_OPTIONS, value);
}
