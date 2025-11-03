import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useDevice } from '@/hooks/useDevice';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logo from '@/assets/logo.svg';

// We'll create these components next
import { PersonalInfoStep } from '@/components/onboarding/PersonalInfoStep';
import { PersonalInfoStepMobile } from '@/components/onboarding/PersonalInfoStepMobile';
import { OccupationStep } from '@/components/onboarding/OccupationStep';
import { InterestsStep } from '@/components/onboarding/InterestsStep';
import { ProfileStep } from '@/components/onboarding/ProfileStep';
import { ContactStep } from '@/components/onboarding/ContactStep';
import { RoleSelectionStep } from '@/components/onboarding/RoleSelectionStep';
import { WelcomeCircleStep } from '@/components/onboarding/WelcomeCircleStep';

export interface OnboardingData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  location: string;
  occupation: string;
  isStudent: boolean;
  studyField: string;
  university: string;
  workPlace: string;
  industry: string;
  interests: string[];
  profilePicture?: File;
  socialMedia: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
  };
  bio: string;
  phoneNumber: string;
  role: string;
}

const initialData: OnboardingData = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  location: '',
  occupation: '',
  isStudent: false,
  studyField: '',
  university: '',
  workPlace: '',
  industry: '',
  interests: [],
  socialMedia: {},
  bio: '',
  phoneNumber: '',
  role: '',
};

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const navigate = useNavigate();
  const device = useDevice();

  // Desktop: 7 steps (grouped), Mobile: 12 steps (individual)
  const totalSteps = device === 'mobile' ? 12 : 7;
  const progress = (currentStep / totalSteps) * 100;

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete onboarding
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    // Save user data to profile storage
    const profileData = {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      location: data.location,
      occupation: data.occupation,
      bio: data.bio,
      phone: data.phoneNumber,
      instagram: data.socialMedia.instagram || '',
      facebook: data.socialMedia.facebook || '',
      linkedin: data.socialMedia.linkedin || '',
      youtube: data.socialMedia.youtube || '',
      tiktok: data.socialMedia.tiktok || '',
      interests: data.interests,
      role: data.role,
      university: data.university,
      studyField: data.studyField,
      workPlace: data.workPlace,
      industry: data.industry
    };
    localStorage.setItem('user_profile_data', JSON.stringify(profileData));
    console.log('Onboarding complete:', data);
    navigate('/');
  };

  const renderStep = () => {
    if (device === 'mobile') {
      // Mobile: Individual steps (12 total now)
      switch (currentStep) {
        case 1: return <PersonalInfoStepMobile data={data} updateData={updateData} onNext={nextStep} onPrev={currentStep > 1 ? prevStep : undefined} field="firstName" />;
        case 2: return <PersonalInfoStepMobile data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="dateOfBirth" />;
        case 3: return <PersonalInfoStepMobile data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="gender" />;
        case 4: return <PersonalInfoStepMobile data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="location" />;
        case 5: return <OccupationStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 6: return <InterestsStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 7: return <ProfileStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="profilePicture" />;
        case 8: return <ProfileStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="socialMedia" />;
        case 9: return <ProfileStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="bio" />;
        case 10: return <ContactStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 11: return <WelcomeCircleStep onNext={nextStep} onPrev={prevStep} />;
        case 12: return <RoleSelectionStep data={data} updateData={updateData} onComplete={handleComplete} onPrev={prevStep} />;
        default: return <RoleSelectionStep data={data} updateData={updateData} onComplete={handleComplete} onPrev={prevStep} />;
      }
    } else {
      // Desktop: Grouped steps (7 total now - added welcome screen before role)
      switch (currentStep) {
        case 1: return <PersonalInfoStep data={data} updateData={updateData} onNext={nextStep} grouped />;
        case 2: return <OccupationStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 3: return <InterestsStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 4: return <ProfileStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} grouped />;
        case 5: return <ContactStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 6: return <WelcomeCircleStep onNext={nextStep} onPrev={prevStep} />;
        case 7: return <RoleSelectionStep data={data} updateData={updateData} onComplete={handleComplete} onPrev={prevStep} />;
        default: return <RoleSelectionStep data={data} updateData={updateData} onComplete={handleComplete} onPrev={prevStep} />;
      }
    }
  };

  return (
    <AdaptiveLayout>
      <div className="min-h-screen py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Logo */}
          <div className="mb-6 text-center">
            <img src={logo} alt="TalkSpree" className="h-6 mx-auto" />
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step content */}
          {renderStep()}
        </div>
      </div>
    </AdaptiveLayout>
  );
}