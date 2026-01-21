export interface ProfileForSimilarity {
  id: string;
  interests?: string[];
  role?: string | null;
  industry?: string | null;
  studyField?: string | null;
  university?: string | null;
  location?: string | null;
  occupation?: string | null;
}

const WEIGHTS = {
  interests: 40,
  role: 15,
  industry: 10,
  studyField: 10,
  university: 5,
  location: 10,
  occupation: 10,
};

const TOTAL_WEIGHT =
  WEIGHTS.interests +
  WEIGHTS.role +
  WEIGHTS.industry +
  WEIGHTS.studyField +
  WEIGHTS.university +
  WEIGHTS.location +
  WEIGHTS.occupation;

export function computeSimilarityScore(a: ProfileForSimilarity, b: ProfileForSimilarity): number {
  const aInterests = a.interests || [];
  const bInterests = b.interests || [];
  const commonInterests = aInterests.filter((i) => bInterests.includes(i));
  const maxInterestCount = Math.max(aInterests.length, bInterests.length, 1);
  const interestScore = (commonInterests.length / maxInterestCount) * WEIGHTS.interests;

  const normalize = (str?: string | null) => (str || '').trim().toLowerCase();

  const roleScore = normalize(a.role) && normalize(a.role) === normalize(b.role) ? WEIGHTS.role : 0;
  const industryScore =
    normalize(a.industry) && normalize(a.industry) === normalize(b.industry) ? WEIGHTS.industry : 0;
  const studyScore =
    normalize(a.studyField) && normalize(a.studyField) === normalize(b.studyField)
      ? WEIGHTS.studyField
      : 0;
  const universityScore =
    normalize(a.university) && normalize(a.university) === normalize(b.university)
      ? WEIGHTS.university
      : 0;
  const locationScore =
    normalize(a.location) && normalize(a.location) === normalize(b.location) ? WEIGHTS.location : 0;
  const occupationScore =
    normalize(a.occupation) && normalize(a.occupation) === normalize(b.occupation)
      ? WEIGHTS.occupation
      : 0;

  const rawScore =
    interestScore +
    roleScore +
    industryScore +
    studyScore +
    universityScore +
    locationScore +
    occupationScore;

  return Math.round((rawScore / TOTAL_WEIGHT) * 100);
}
