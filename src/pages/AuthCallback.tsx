import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { hasCompletedOnboarding } from '@/lib/api/profiles';
import { markFeedbackTooltipForNextLogin } from '@/components/feedback/feedbackTooltipFlag';
import { clearPendingAffiliate } from '@/lib/affiliate';
import { claimPendingAffiliate } from '@/lib/api/affiliates';

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
        // attributed to whoever's link they last visited.
        console.log('[AuthCallback] session.user.id=', session.user.id, 'onboardingComplete=', onboardingComplete);
        if (onboardingComplete) {
          // Re-login: drop any stale stash so it can't linger across sessions.
          clearPendingAffiliate();
        } else {
          // Fresh signup: poll for the profile row, claim with retry, and
          // only clear the stash on success. On 'failed', leave the stash
          // for the Onboarding page to take another shot at it.
          const outcome = await claimPendingAffiliate(session.user.id);
          console.log('[AuthCallback] claimPendingAffiliate outcome=', outcome);
          if (outcome === 'claimed' || outcome === 'already-claimed' || outcome === 'no-stash') {
            clearPendingAffiliate();
          } else {
            console.warn('[AuthCallback] claimPendingAffiliate failed; leaving stash for onboarding retry');
          }
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


