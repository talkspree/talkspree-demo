import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { EmailConfirmationBanner } from '@/components/auth/EmailConfirmationBanner';
import { useDevice } from '@/hooks/useDevice';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { hasCompletedOnboarding } from '@/lib/api/profiles';
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
  role: '',
};

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const device = useDevice();
  const { user } = useAuth();
  const { toast } = useToast();

  // Check if user is authenticated and if they've already completed onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      // Wait a bit for session to be available (might be created after email confirmation)
      let currentUser = user;
      
      if (!currentUser) {
        // Try to get session directly
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          currentUser = session.user;
          console.log('Got user from session in onboarding page');
        } else {
          // Wait a bit more for session to be created
          await new Promise(resolve => setTimeout(resolve, 1500));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession?.user) {
            currentUser = retrySession.user;
            console.log('Got user from session after retry');
          }
        }
      }

      // If still no user, redirect to auth
      // (Email verification via 4-digit code now creates a session)
      if (!currentUser) {
        console.log('No authenticated user found, redirecting to auth');
        navigate('/auth', { replace: true });
        return;
      }

      // Check if onboarding is already completed
      const completed = await hasCompletedOnboarding();
      if (completed) {
        // Already completed - redirect to home
        navigate('/home', { replace: true });
        return;
      }

      setLoading(false);
    };

    checkOnboarding();
  }, [user, navigate]);

  if (loading) {
    return (
      <AdaptiveLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      </AdaptiveLayout>
    );
  }

  // Desktop: 7 steps (grouped), Mobile: 11 steps (individual)
  const totalSteps = device === 'mobile' ? 11 : 7;
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

  const handleComplete = async (selectedRole?: string) => {
    setSaving(true);
    try {
      // Import the completeOnboarding function
      const { completeOnboarding } = await import('@/lib/api/profiles');

      // Merge in the freshly-selected role so we don't depend on React's
      // async state batching to have flushed before save.
      const finalData = selectedRole
        ? { ...data, role: selectedRole }
        : data;

      console.log('Starting onboarding save...', finalData);

      // Save user data to Supabase
      await completeOnboarding(finalData);
      
      console.log('✅ Onboarding data saved successfully!');
      
      toast({
        title: "Profile saved! 🎉",
        description: "Your profile has been successfully created.",
      });
      
      navigate('/home');
    } catch (error: any) {
      console.error('❌ Error completing onboarding:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      toast({
        title: "Failed to save profile",
        description: error.message || 'Unknown error occurred. Please try again.',
        variant: "destructive"
      });
      
      // Don't navigate if save failed
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    if (device === 'mobile') {
      // Mobile: Individual steps (11 total - social media moved, phone removed)
      switch (currentStep) {
        case 1: return <PersonalInfoStepMobile data={data} updateData={updateData} onNext={nextStep} onPrev={currentStep > 1 ? prevStep : undefined} field="firstName" />;
        case 2: return <PersonalInfoStepMobile data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="dateOfBirth" />;
        case 3: return <PersonalInfoStepMobile data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="gender" />;
        case 4: return <PersonalInfoStepMobile data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="location" />;
        case 5: return <OccupationStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 6: return <InterestsStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 7: return <ContactStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 8: return <ProfileStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="profilePicture" />;
        case 9: return <ProfileStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} field="bio" />;
        case 10: return <WelcomeCircleStep onNext={nextStep} onPrev={prevStep} />;
        case 11: return <RoleSelectionStep data={data} updateData={updateData} onComplete={handleComplete} onPrev={prevStep} />;
        default: return <RoleSelectionStep data={data} updateData={updateData} onComplete={handleComplete} onPrev={prevStep} />;
      }
    } else {
      // Desktop: Grouped steps (7 total - social media moved, phone removed)
      switch (currentStep) {
        case 1: return <PersonalInfoStep data={data} updateData={updateData} onNext={nextStep} grouped />;
        case 2: return <OccupationStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 3: return <InterestsStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 4: return <ContactStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} />;
        case 5: return <ProfileStep data={data} updateData={updateData} onNext={nextStep} onPrev={prevStep} grouped />;
        case 6: return <WelcomeCircleStep onNext={nextStep} onPrev={prevStep} />;
        case 7: return <RoleSelectionStep data={data} updateData={updateData} onComplete={handleComplete} onPrev={prevStep} />;
        default: return <RoleSelectionStep data={data} updateData={updateData} onComplete={handleComplete} onPrev={prevStep} />;
      }
    }
  };

  return (
    <AdaptiveLayout>
      <EmailConfirmationBanner />
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