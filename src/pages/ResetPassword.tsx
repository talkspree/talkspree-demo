import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getProfileById, type Profile } from '@/lib/api/profiles';
import logo from '@/assets/logo.svg';

type Step = 'loading' | 'verify' | 'newPassword' | 'done' | 'invalid';

const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Page that the password-reset email lands on. Supabase puts a recovery
 * token in the URL hash (handled automatically by detectSessionInUrl)
 * which gives us a temporary session. We then ask the user to confirm
 * their identity by entering their first name, last name, and date of
 * birth before letting them choose a new password.
 */
export default function ResetPassword() {
  const [step, setStep] = useState<Step>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string>('');

  // Verify-step state
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  const [dobInput, setDobInput] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // New-password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const { updatePassword, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * When the user lands here via the email link, Supabase fires a
     * `PASSWORD_RECOVERY` auth event after parsing the URL fragment.
     * If they navigated here directly, there will be no session and we
     * won't be able to update the password.
     */
    let cancelled = false;
    let recovered = false;

    const handleSession = async (userId: string, userEmail: string | undefined) => {
      if (cancelled) return;
      setEmail(userEmail ?? '');
      const fetched = await getProfileById(userId);
      if (cancelled) return;
      setProfile(fetched);

      // If profile is missing any of the three verification fields, skip
      // straight to the new-password step. (Decided product policy: don't
      // lock users out for incomplete onboarding.)
      const hasAllFields = !!(
        fetched?.first_name?.trim() &&
        fetched?.last_name?.trim() &&
        fetched?.date_of_birth
      );
      setStep(hasAllFields ? 'verify' : 'newPassword');
    };

    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        recovered = true;
        if (session?.user) {
          handleSession(session.user.id, session.user.email);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        recovered = true;
        handleSession(session.user.id, session.user.email);
      } else {
        // Give the auth listener a moment to run before deciding
        setTimeout(() => {
          if (!recovered && !cancelled) setStep('invalid');
        }, 1500);
      }
    });

    return () => {
      cancelled = true;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const normalize = (s: string) => s.trim().toLowerCase();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError(null);
    if (!profile) return;

    const firstNameMatch =
      normalize(firstNameInput) === normalize(profile.first_name ?? '');
    const lastNameMatch =
      normalize(lastNameInput) === normalize(profile.last_name ?? '');
    const dobMatch = dobInput === profile.date_of_birth;

    if (firstNameMatch && lastNameMatch && dobMatch) {
      setStep('newPassword');
      return;
    }

    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= MAX_VERIFY_ATTEMPTS) {
      // Burn the recovery session so they cannot keep trying.
      await supabase.auth.signOut();
      setStep('invalid');
      return;
    }
    const remaining = MAX_VERIFY_ATTEMPTS - nextAttempts;
    setVerifyError(
      `Those details don't match what we have on file. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
    );
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        setPasswordError(error.message);
        return;
      }
      setStep('done');
      setTimeout(async () => {
        await signOut();
        navigate('/auth', { replace: true });
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  const initials = (() => {
    const f = profile?.first_name?.[0] ?? '';
    const l = profile?.last_name?.[0] ?? '';
    const combined = (f + l).toUpperCase();
    if (combined) return combined;
    return email?.[0]?.toUpperCase() ?? '?';
  })();

  return (
    <AdaptiveLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Card className="glass shadow-[3px_5px_20px_rgba(0,0,0,0.15)]">
            <CardHeader className="space-y-4 text-center">
              <img src={logo} alt="TalkSpree" className="h-6 mx-auto" />
              <CardTitle className="text-2xl font-medium">
                {step === 'done'
                  ? 'Password updated'
                  : step === 'invalid'
                  ? 'Link expired'
                  : step === 'verify'
                  ? "Confirm it's you"
                  : step === 'newPassword'
                  ? 'Choose a new password'
                  : 'Verifying link...'}
              </CardTitle>
              {step === 'verify' && (
                <CardDescription>
                  To confirm it's really you, please enter the details we have on
                  file for this account.
                </CardDescription>
              )}
              {step === 'newPassword' && (
                <CardDescription>
                  Enter a new password for your account below.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 'loading' && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {step === 'invalid' && (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    This password reset link is invalid or has expired. Please
                    request a new one.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/auth/forgot-password')}
                  >
                    Request new link
                  </Button>
                </div>
              )}

              {step === 'verify' && profile && (
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className="h-16 w-16 ring-2 ring-background shadow-apple-sm">
                      <AvatarImage src={profile.profile_picture_url ?? undefined} />
                      <AvatarFallback className="text-base font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-sm text-muted-foreground">{email}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={firstNameInput}
                      onChange={(e) => setFirstNameInput(e.target.value)}
                      autoComplete="given-name"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={lastNameInput}
                      onChange={(e) => setLastNameInput(e.target.value)}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={dobInput}
                      onChange={(e) => setDobInput(e.target.value)}
                      autoComplete="bday"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:shadow-glow transition-spring"
                  >
                    Continue
                  </Button>
                  {verifyError && (
                    <p className="text-sm text-destructive text-center">
                      {verifyError}
                    </p>
                  )}
                </form>
              )}

              {step === 'newPassword' && (
                <form onSubmit={handleNewPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm new password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-primary hover:shadow-glow transition-spring"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update password
                  </Button>
                  {passwordError && (
                    <p className="text-sm text-destructive text-center">
                      {passwordError}
                    </p>
                  )}
                </form>
              )}

              {step === 'done' && (
                <div className="space-y-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your password has been updated. Redirecting to sign in...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdaptiveLayout>
  );
}
