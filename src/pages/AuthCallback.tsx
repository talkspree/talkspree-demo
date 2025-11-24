import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hasCompletedOnboarding } from '@/lib/api/profiles';

/**
 * Handles OAuth callbacks (Google, etc.)
 * Checks if user has completed onboarding and redirects accordingly
 */
export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setStatus('error');
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 2000);
          return;
        }

        if (!session?.user) {
          console.error('No user in session');
          setStatus('error');
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 2000);
          return;
        }

        // Wait a bit longer for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Check if user has completed onboarding
        try {
          const onboardingComplete = await hasCompletedOnboarding();
          
          if (onboardingComplete) {
            // User has completed onboarding - go to home
            navigate('/home', { replace: true });
          } else {
            // User hasn't completed onboarding - go to onboarding
            navigate('/onboarding', { replace: true });
          }
        } catch (profileError) {
          console.error('Error checking onboarding status:', profileError);
          // If profile doesn't exist yet, go to onboarding
          navigate('/onboarding', { replace: true });
        }
      } catch (error) {
        console.error('Error handling callback:', error);
        setStatus('error');
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      }
    };

    // Small delay to ensure session is processed
    setTimeout(() => {
      handleCallback();
    }, 500);
  }, [navigate]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Authentication Error
          </h2>
          <p className="text-muted-foreground">
            Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}


