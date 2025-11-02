import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';
import { InviteCodeForm } from '@/components/auth/InviteCodeForm';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useDevice } from '@/hooks/useDevice';
import loginCover from '@/assets/login-cover.jpg';

type AuthMode = 'login' | 'signup' | 'invite';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const navigate = useNavigate();
  const device = useDevice();

  const handleLogin = async (email: string, password: string) => {
    // Mock authentication - replace with actual auth logic
    console.log('Login:', { email, password });
    navigate('/onboarding');
  };

  const handleSignUp = async (email: string, password: string, confirmPassword: string) => {
    // Mock authentication - replace with actual auth logic
    console.log('SignUp:', { email, password, confirmPassword });
    navigate('/onboarding');
  };

  const handleGoogleAuth = async () => {
    // Mock Google auth - replace with actual Google auth logic
    console.log('Google Auth');
    navigate('/onboarding');
  };

  const handleValidInviteCode = () => {
    setMode('signup');
  };

  if (device === 'mobile') {
    return (
      <AdaptiveLayout>
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