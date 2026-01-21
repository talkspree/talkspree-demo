import { useState, useEffect } from 'react';
import { getCurrentProfile, getUserInterests, getUserSocialLinks } from '@/lib/api/profiles';

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
  industry: ''
};

export function useProfileData() {
  const [profileData, setProfileData] = useState<ProfileData>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profile = await getCurrentProfile();
      
      if (profile) {
        // Fetch interests
        const interests = await getUserInterests();
        const interestIds = interests.map((interest: any) => interest.id);

        // Fetch social links
        const socialLinks = await getUserSocialLinks();
        const socialLinksMap: Record<string, string> = {};
        socialLinks.forEach((link: any) => {
          socialLinksMap[link.platform] = link.url;
        });

        // Add cache buster to profile picture URL to force refresh
        const profilePictureUrl = profile.profile_picture_url 
          ? `${profile.profile_picture_url}?t=${Date.now()}` 
          : '';

        setProfileData({
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
          profilePicture: profilePictureUrl,
          role: profile.role || '',
          university: profile.university || '',
          studyField: profile.study_field || '',
          workPlace: profile.work_place || '',
          industry: profile.industry || ''
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateProfile = (updates: Partial<ProfileData>) => {
    setProfileData(prev => ({ ...prev, ...updates }));
  };

  const reloadProfile = async () => {
    await loadProfile();
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
    loading
  };
}
