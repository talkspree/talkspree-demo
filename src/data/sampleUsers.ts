// User profile interface - used throughout the app for user data
export interface SampleUser {
  id: string;
  email?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  location: string;
  occupation: string;
  bio: string;
  interests: string[];
  role: 'mentor' | 'mentee' | 'alumni' | string;
  university: string;
  studyField: string;
  workPlace: string;
  industry: string;
  phone: string;
  instagram: string;
  facebook: string;
  linkedin: string;
  youtube: string;
  tiktok: string;
  isOnline: boolean;
  inCall: boolean;
  callStartTime: number | null;
  sessionDuration: number;
  profilePicture?: string;
}
