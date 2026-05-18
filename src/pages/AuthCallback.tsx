import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hasCompletedOnboarding } from '@/lib/api/profiles';
import { markFeedbackTooltipForNextLogin } from '@/components/feedback/feedbackTooltipFlag';
import { getPendingAffiliate, clearPendingAffiliate } from '@/lib/affiliate';
import { claimAffiliate } from '@/lib/api/affiliates';

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

        // OAuth callback always represents a fresh sign-in event, so flag the
        // bug-report tooltip to auto-reveal once on the next page (desktop).
        markFeedbackTooltipForNextLogin();

        // Check if user has completed onboarding
        let onboardingComplete = false;
        try {
          onboardingComplete = await hasCompletedOnboarding();
        } catch (profileError) {
          console.error('Error checking onboarding status:', profileError);
          // Treat unknown state as fresh signup (profile may not exist yet)
          onboardingComplete = false;
        }

        // OAuth signup cannot inject `raw_user_meta_data`, so the
        // `handle_new_user` trigger never sees the affiliate context. Apply
        // it here from localStorage — but ONLY for fresh signups (onboarding
        // not yet complete). A legacy user with `invited_by IS NULL` logging
        // back in via Google with stale localStorage would otherwise get
        // attributed to whoever's link they last visited. Clear pending in
        // either case so it can't linger across sessions.
        const pendingAffiliate = getPendingAffiliate();
        if (pendingAffiliate) {
          if (!onboardingComplete) {
            try {
              await claimAffiliate(pendingAffiliate.inviterId, pendingAffiliate.circleId ?? null);
            } catch (affErr) {
              console.warn('claimAffiliate failed in AuthCallback:', affErr);
            }
          }
          clearPendingAffiliate();
        }

        if (onboardingComplete) {
          navigate('/home', { replace: true });
        } else {
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


