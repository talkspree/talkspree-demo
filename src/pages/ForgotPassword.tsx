import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { lookupAuthProvider } from '@/lib/api/authProvider';

type Step = 'form' | 'emailSent' | 'googleAccount';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { resetPassword, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const provider = await lookupAuthProvider(trimmed);
      if (provider === 'google') {
        setStep('googleAccount');
        return;
      }
      // For 'email' and 'unknown' we both send (or pretend to send) the reset
      // email and show the same confirmation, so an unregistered email cannot
      // be distinguished from a registered one.
      const { error } = await resetPassword(trimmed);
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      setStep('emailSent');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg(null);
    const { error } = await signInWithGoogle();
    if (error) {
      setErrorMsg(error.message);
    }
  };

  const description = (() => {
    switch (step) {
      case 'emailSent':
        return 'Check your inbox for a link to reset your password.';
      case 'googleAccount':
        return 'This account uses Google to sign in.';
      default:
        return "Enter the email address you signed up with and we'll send you a link to reset your password.";
    }
  })();

  return (
    <AdaptiveLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Card className="glass shadow-[3px_5px_20px_rgba(0,0,0,0.15)]">
            <CardHeader className="space-y-4 text-center">
              <img src={logo} alt="TalkSpree" className="h-6 mx-auto" />
              <CardTitle className="text-2xl font-medium">
                {step === 'googleAccount' ? 'Signed up with Google' : 'Reset your password'}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 'emailSent' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm text-center text-muted-foreground">
                    We sent password reset instructions to{' '}
                    <span className="font-medium text-foreground">{email}</span>.
                  </p>
                  <p className="text-xs text-center text-muted-foreground">
                    Didn't get the email? Check your spam folder or try again in a moment.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/auth')}
                  >
                    Back to sign in
                  </Button>
                </div>
              ) : step === 'googleAccount' ? (
                <div className="space-y-4">
                  <p className="text-sm text-center text-muted-foreground">
                    The account for{' '}
                    <span className="font-medium text-foreground">{email}</span>{' '}
                    was created with Google. Your password is managed by Google, so
                    there is nothing to reset here.
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    className="w-full transition-spring hover:shadow-apple-sm"
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Sign in with Google
                  </Button>
                  {errorMsg && (
                    <p className="text-sm text-destructive text-center">{errorMsg}</p>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setStep('form');
                      setErrorMsg(null);
                    }}
                  >
                    Use a different email
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="transition-spring"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:shadow-glow transition-spring"
                    disabled={loading || !email.trim()}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Send reset link
                  </Button>
                  {errorMsg && (
                    <p className="text-sm text-destructive text-center">{errorMsg}</p>
                  )}
                </form>
              )}

              <div className="pt-2 text-center">
                <Link
                  to="/auth"
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-smooth"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                  Back to sign in
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdaptiveLayout>
  );
}
