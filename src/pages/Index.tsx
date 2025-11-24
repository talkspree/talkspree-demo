import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { hasCompletedOnboarding } from '@/lib/api/profiles';

/**
 * Landing page that redirects users based on auth status
 * - Not logged in -> /auth (login/signup)
 * - Logged in + onboarding incomplete -> /onboarding
 * - Logged in + onboarding complete -> /home
 */
export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      if (!loading) {
        if (user) {
          // Check if user has completed onboarding
          const onboardingComplete = await hasCompletedOnboarding();
          
          if (onboardingComplete) {
            // Profile is complete - go to home
            navigate('/home', { replace: true });
          } else {
            // Profile not complete - go to onboarding
            navigate('/onboarding', { replace: true });
          }
        } else {
          // User is not logged in - show auth page
          navigate('/auth', { replace: true });
        }
        setChecking(false);
      }
    };

    checkAndRedirect();
  }, [user, loading, navigate]);

  // Show loading spinner while checking auth status
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading TalkSpree...</p>
      </div>
    </div>
  );
}
