import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentProfile, getUserInterests, getUserSocialLinks } from '@/lib/api/profiles';

// Shared cache key for the current user's profile. All consumers read the same
// cached result (deduped), so multiple profile-displaying components on a page
// trigger a single fetch instead of one per component.
export const CURRENT_PROFILE_QUERY_KEY = ['profile', 'current'] as const;

export interface ProfileData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  location: string;
  occupation: string;
  bio: string;
  phone: string;
  email: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  interests: string[];
  profilePicture?: string;
  role: string;
  university: string;
  studyField: string;
  workPlace: string;
  industry: string;
  /** 6-char [a-z0-9] identifier used in this user's personal invite links. */
  slug: string;
}

const DEFAULT_PROFILE: ProfileData = {
  id: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  location: '',
  occupation: '',
  bio: '',
  phone: '',
  email: '',
  instagram: '',
  facebook: '',
  linkedin: '',
  youtube: '',
  tiktok: '',
  interests: [],
  profilePicture: '',
  role: '',
  university: '',
  studyField: '',
  workPlace: '',
  industry: '',
  slug: ''
};

async function fetchProfileData(): Promise<ProfileData> {
  const profile = await getCurrentProfile();
  if (!profile) return DEFAULT_PROFILE;

  // Parallel fetch interests and social links (independent of each other)
  const [interests, socialLinks] = await Promise.all([
    getUserInterests(),
    getUserSocialLinks(),
  ]);

  const interestIds = interests.map((interest: any) => interest.id);

  const socialLinksMap: Record<string, string> = {};
  socialLinks.forEach((link: any) => {
    socialLinksMap[link.platform] = link.url;
  });

  return {
    id: profile.id || '',
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    dateOfBirth: profile.date_of_birth || '',
    gender: profile.gender || '',
    location: profile.location || '',
    occupation: profile.occupation || '',
    bio: profile.bio || '',
    phone: profile.phone || '',
    email: profile.email || '',
    instagram: socialLinksMap['instagram'] || '',
    facebook: socialLinksMap['facebook'] || '',
    linkedin: socialLinksMap['linkedin'] || '',
    youtube: socialLinksMap['youtube'] || '',
    tiktok: socialLinksMap['tiktok'] || '',
    interests: interestIds,
    profilePicture: profile.profile_picture_url || '',
    role: profile.role || '',
    university: profile.university || '',
    studyField: profile.study_field || '',
    workPlace: profile.work_place || '',
    industry: profile.industry || '',
    slug: profile.slug || ''
  };
}

export function useProfileData() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: CURRENT_PROFILE_QUERY_KEY,
    queryFn: fetchProfileData,
    staleTime: 60_000,
  });

  const profileData = data ?? DEFAULT_PROFILE;

  // Local optimistic update — writes directly to the shared cache so every
  // consumer sees the change immediately.
  const updateProfile = (updates: Partial<ProfileData>) => {
    queryClient.setQueryData<ProfileData>(CURRENT_PROFILE_QUERY_KEY, (prev) => ({
      ...(prev ?? DEFAULT_PROFILE),
      ...updates,
    }));
  };

  // Force a refetch of the shared profile cache (e.g. after persisting changes).
  const reloadProfile = async () => {
    await queryClient.invalidateQueries({ queryKey: CURRENT_PROFILE_QUERY_KEY });
  };

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return 0;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return {
    profileData,
    updateProfile,
    reloadProfile,
    age: calculateAge(profileData.dateOfBirth),
    loading: isLoading
  };
}
