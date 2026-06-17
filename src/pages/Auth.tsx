import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { EmailConfirmationModal } from '@/components/auth/EmailConfirmationModal';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useDevice } from '@/hooks/useDevice';
import { useAuth } from '@/contexts/AuthContext';
import WelcomeAnimation from '@/components/auth/welcome/WelcomeAnimation';
import { markFeedbackTooltipForNextLogin } from '@/components/feedback/feedbackTooltipFlag';
import { getPendingAffiliate, clearPendingAffiliate, type PendingAffiliate } from '@/lib/affiliate';
import { claimAffiliate } from '@/lib/api/affiliates';

type AuthMode = 'login' | 'signup';

export default function Auth() {
  const [searchParams] = useSearchParams();
  // Resolve any pending affiliate context once on mount; if present we skip
  // the demo invite-gate and start the user directly in the signup view with
  // the "Invited by …" banner.
  const [pendingAffiliate, setPendingAffiliateState] = useState<PendingAffiliate | null>(() => getPendingAffiliate());
  const initialMode: AuthMode =
    pendingAffiliate || searchParams.get('signup') === '1' ? 'signup' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const device = useDevice();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();

  // Re-check pending affiliate when query/storage changes (e.g. after the
  // InviteCodeForm validates a pasted personal invite link and stashes one).
  useEffect(() => {
    const next = getPendingAffiliate();
    setPendingAffiliateState(next);
  }, [mode, searchParams]);

  const invitedByForBanner = pendingAffiliate
    ? {
        firstName: pendingAffiliate.inviterFirstName,
        lastName: pendingAffiliate.inviterLastName,
        profilePicture: pendingAffiliate.inviterPicture,
      }
    : null;

  // Redirect if already authenticated (but not if email confirmation modal is open)
  useEffect(() => {
    const checkUser = async () => {
      // Don't redirect if email confirmation modal is showing
      // The modal will handle the navigation after confirmation
      if (user && !showEmailConfirmation) {
        // Check if user has completed onboarding
        const { hasCompletedOnboarding } = await import('@/lib/api/profiles');
        const onboardingComplete = await hasCompletedOnboarding();
        
        if (onboardingComplete) {
          navigate('/home');
        } else {
          navigate('/onboarding');
        }
      }
    };
    
    checkUser();
  }, [user, navigate, showEmailConfirmation]);

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setAuthError(error.message);
    } else {
      markFeedbackTooltipForNextLogin();
      const { hasCompletedOnboarding } = await import('@/lib/api/profiles');
      const onboardingComplete = await hasCompletedOnboarding();
      if (onboardingComplete) {
        navigate('/home');
      } else {
        navigate('/onboarding');
      }
    }
  };

  const handleSignUp = async (email: string, password: string, confirmPassword: string) => {
    setAuthError(null);
    if (password !== confirmPassword) {
      setAuthError("Passwords don't match — please ensure both fields are the same.");
      return;
    }

    const affiliateContext = pendingAffiliate
      ? {
          invitedBy: pendingAffiliate.inviterId,
          invitedViaCircleId: pendingAffiliate.circleId,
        }
      : null;

    const { data, error } = await signUp(email, password, affiliateContext);
    if (error) {
      setAuthError(error.message);
    } else {
      // Store the email and password for confirmation modal and post-verification sign in
      setSignupEmail(email);
      setSignupPassword(password); // Store password temporarily for signing in after verification

      // Get user ID from the signup response
      if (data?.user?.id) {
        setSignupUserId(data.user.id);
      }

      // Keep pendingAffiliate in localStorage; we only have a real session
      // (and thus auth.uid() for claim_affiliate) after handleContinueToOnboarding
      // signs the user in. Clearing here would orphan the affiliate context
      // if the DB trigger silently failed.

      // Show email confirmation modal with 4-digit code input
      setShowEmailConfirmation(true);
    }
  };

  const handleContinueToOnboarding = async () => {
    setShowEmailConfirmation(false);
    
    // Sign in the user with their credentials to create the session
    const { error } = await signIn(signupEmail, signupPassword);
    
    if (error) {
      console.error('Error signing in after verification:', error);
      setAuthError('Sign-in after verification failed. Please sign in manually.');
      setSignupPassword('');
      return;
    }
    
    // Clear stored password after successful sign in
    setSignupPassword('');

    // Now that a real session exists, claim any pending affiliate context.
    // The RPC is first-writer-wins, so it's a no-op if the DB trigger already
    // populated invited_by; it's the recovery path when the trigger silently
    // failed. One retry handles the race where the profile row isn't visible
    // yet.
    const stash = getPendingAffiliate();
    if (stash) {
      try {
        let ok = await claimAffiliate(stash.inviterId, stash.circleId ?? null);
        if (!ok) {
          await new Promise((r) => setTimeout(r, 800));
          ok = await claimAffiliate(stash.inviterId, stash.circleId ?? null);
        }
        if (!ok) {
          console.warn('claimAffiliate returned false after retry');
        }
      } catch (affErr) {
        console.warn('claimAffiliate failed:', affErr);
      } finally {
        clearPendingAffiliate();
        setPendingAffiliateState(null);
      }
    }

    // Auto-reveal the bug-report tooltip once when they reach the home page.
    markFeedbackTooltipForNextLogin();

    // Navigate to onboarding (useEffect in Auth will handle this after sign in)
    // But we'll navigate anyway to be explicit
    navigate('/onboarding', { replace: true });
  };

  const handleGoogleAuth = async () => {
    setAuthError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(error.message);
    }
  };

  if (device === 'mobile') {
    return (
      <AdaptiveLayout>
        <EmailConfirmationModal
          isOpen={showEmailConfirmation}
          email={signupEmail}
          onContinue={handleContinueToOnboarding}
        />
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-sm space-y-3">
            {authError && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
                {authError}
              </div>
            )}
            {mode === 'login' && (
              <LoginForm
                onSwitchToSignup={() => { setMode('signup'); setAuthError(null); }}
                onGoogleSignIn={handleGoogleAuth}
                onLogin={handleLogin}
              />
            )}
            {mode === 'signup' && (
              <SignupForm
                onSwitchToLogin={() => { setMode('login'); setAuthError(null); }}
                onGoogleSignUp={handleGoogleAuth}
                onSignUp={handleSignUp}
                invitedBy={invitedByForBanner}
              />
            )}
          </div>
        </div>
      </AdaptiveLayout>
    );
  }

  return (
    <AdaptiveLayout>
      <EmailConfirmationModal
        isOpen={showEmailConfirmation}
        email={signupEmail}
        onContinue={handleContinueToOnboarding}
      />
      <div className="min-h-screen lg:h-screen lg:overflow-hidden grid lg:grid-cols-2">
        {/* Left side - Auth forms */}
        <div className="flex items-center justify-center p-8 lg:overflow-y-auto custom-scrollbar">
          <div className="w-full max-w-sm space-y-3">
            {authError && (
              <div className="px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm text-center">
                {authError}
              </div>
            )}
            {mode === 'login' && (
              <LoginForm
                onSwitchToSignup={() => { setMode('signup'); setAuthError(null); }}
                onGoogleSignIn={handleGoogleAuth}
                onLogin={handleLogin}
              />
            )}
            {mode === 'signup' && (
              <SignupForm
                onSwitchToLogin={() => { setMode('login'); setAuthError(null); }}
                onGoogleSignUp={handleGoogleAuth}
                onSignUp={handleSignUp}
                invitedBy={invitedByForBanner}
              />
            )}
          </div>
        </div>

        {/* Right side - Animated welcome */}
        <div className="hidden lg:block relative overflow-hidden lg:h-full">
          <WelcomeAnimation />
        </div>
      </div>
    </AdaptiveLayout>
  );
}