import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { InviteCodeForm } from '@/components/auth/InviteCodeForm';
import { EmailConfirmationModal } from '@/components/auth/EmailConfirmationModal';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useDevice } from '@/hooks/useDevice';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import WelcomeAnimation from '@/components/auth/welcome/WelcomeAnimation';
import { markFeedbackTooltipForNextLogin } from '@/components/feedback/feedbackTooltipFlag';
import { getPendingAffiliate, clearPendingAffiliate, type PendingAffiliate } from '@/lib/affiliate';

type AuthMode = 'login' | 'signup' | 'invite';

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
  const [signupPassword, setSignupPassword] = useState(''); // Store password for post-verification sign in
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const device = useDevice();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();

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
    const { error } = await signIn(email, password);
    if (error) {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // Set the tooltip flag BEFORE any further awaits. The auth-state change
      // listener can trigger navigation to /home while hasCompletedOnboarding()
      // is still pending, so if we wait until after that await the FeedbackButton
      // will already have mounted and consumed nothing.
      markFeedbackTooltipForNextLogin();

      const { hasCompletedOnboarding } = await import('@/lib/api/profiles');
      const onboardingComplete = await hasCompletedOnboarding();
      
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in."
      });

      if (onboardingComplete) {
        navigate('/home');
      } else {
        navigate('/onboarding');
      }
    }
  };

  const handleSignUp = async (email: string, password: string, confirmPassword: string) => {
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are the same.",
        variant: "destructive"
      });
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
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // Store the email and password for confirmation modal and post-verification sign in
      setSignupEmail(email);
      setSignupPassword(password); // Store password temporarily for signing in after verification

      // Get user ID from the signup response
      if (data?.user?.id) {
        setSignupUserId(data.user.id);
      }

      // The DB trigger has persisted invited_by/invited_via_circle_id at this
      // point, so the localStorage stash has done its job. Clear it so a
      // future signup on this device doesn't inherit a stale affiliate.
      if (pendingAffiliate) {
        clearPendingAffiliate();
        setPendingAffiliateState(null);
      }

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
      toast({
        title: "Sign in required",
        description: "Please sign in with your credentials to continue.",
        variant: "destructive"
      });
      // Clear stored password
      setSignupPassword('');
      return;
    }
    
    // Clear stored password after successful sign in
    setSignupPassword('');

    // Auto-reveal the bug-report tooltip once when they reach the home page.
    markFeedbackTooltipForNextLogin();

    // Navigate to onboarding (useEffect in Auth will handle this after sign in)
    // But we'll navigate anyway to be explicit
    navigate('/onboarding', { replace: true });
  };

  const handleGoogleAuth = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleValidInviteCode = () => {
    setMode('signup');
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
          <div className="w-full max-w-sm">
            {mode === 'login' && (
              <LoginForm
                onSwitchToSignup={() => setMode('invite')}
                onGoogleSignIn={handleGoogleAuth}
                onLogin={handleLogin}
              />
            )}
            {mode === 'invite' && (
              <InviteCodeForm
                onValidCode={handleValidInviteCode}
                onBack={() => setMode('login')}
              />
            )}
            {mode === 'signup' && (
              <SignupForm
                onSwitchToLogin={() => setMode('login')}
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
          <div className="w-full max-w-sm">
            {mode === 'login' && (
              <LoginForm
                onSwitchToSignup={() => setMode('invite')}
                onGoogleSignIn={handleGoogleAuth}
                onLogin={handleLogin}
              />
            )}
            {mode === 'invite' && (
              <InviteCodeForm
                onValidCode={handleValidInviteCode}
                onBack={() => setMode('login')}
              />
            )}
            {mode === 'signup' && (
              <SignupForm
                onSwitchToLogin={() => setMode('login')}
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