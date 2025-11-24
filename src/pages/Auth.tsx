import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { InviteCodeForm } from '@/components/auth/InviteCodeForm';
import { EmailConfirmationModal } from '@/components/auth/EmailConfirmationModal';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useDevice } from '@/hooks/useDevice';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import loginCover from '@/assets/login-cover.jpg';

type AuthMode = 'login' | 'signup' | 'invite';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState(''); // Store password for post-verification sign in
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const device = useDevice();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const { toast } = useToast();

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
      // Check if user has completed onboarding
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

    const { data, error } = await signUp(email, password);
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
      <div className="min-h-screen grid lg:grid-cols-2">
        {/* Left side - Auth forms */}
        <div className="flex items-center justify-center p-8">
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
              />
            )}
          </div>
        </div>

        {/* Right side - Cover image */}
        <div className="hidden lg:block relative overflow-hidden">
          <img 
            src={loginCover}
            alt="TalkSpree - Connect through meaningful conversations"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
          <div className="absolute bottom-8 left-8 right-8">
            <h2 className="text-3xl font-medium text-white mb-2">
              Welcome to TalkSpree
            </h2>
            <p className="text-white/80 text-lg">
              Connect through meaningful conversations and build lasting professional relationships.
            </p>
          </div>
        </div>
      </div>
    </AdaptiveLayout>
  );
}