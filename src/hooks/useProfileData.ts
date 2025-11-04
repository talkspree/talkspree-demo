import { useState, useEffect } from 'react';

export interface ProfileData {
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

const STORAGE_KEY = 'user_profile_data';

export function useProfileData() {
  const [profileData, setProfileData] = useState<ProfileData>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PROFILE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profileData));
  }, [profileData]);

  const updateProfile = (updates: Partial<ProfileData>) => {
    setProfileData(prev => ({ ...prev, ...updates }));
  };

  const calculateAge = (dateOfBirth: string) => {
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
    age: calculateAge(profileData.dateOfBirth)
  };
}
