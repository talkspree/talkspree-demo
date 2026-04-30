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
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import logo from '@/assets/logo.svg';

/**
 * Page that the password-reset email lands on. Supabase puts a recovery
 * token in the URL hash (handled automatically by detectSessionInUrl)
 * which gives us a temporary session that lets the user set a new password.
 */
export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const { updatePassword, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    /**
     * When the user lands here via the email link, Supabase fires a
     * `PASSWORD_RECOVERY` auth event after parsing the URL fragment.
     * If they navigated here directly, there will be no session and we
     * won't be able to update the password.
     */
    let recovered = false;
    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        recovered = true;
        setHasRecoverySession(true);
      }
    });

    // Also check for an existing session in case the event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setHasRecoverySession(true);
      } else if (!recovered) {
        // Give the auth listener a moment to run before deciding
        setTimeout(() => {
          if (hasRecoverySession === null) setHasRecoverySession(false);
        }, 1500);
      }
    });

    return () => {
      sub.data.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ description: "Passwords don't match", variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast({ description: error.message, variant: 'destructive' });
        return;
      }
      setDone(true);
      // Sign the user out so they have to use their new password
      setTimeout(async () => {
        await signOut();
        navigate('/auth', { replace: true });
      }, 1500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdaptiveLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <Card className="glass shadow-[3px_5px_20px_rgba(0,0,0,0.15)]">
            <CardHeader className="space-y-4 text-center">
              <img src={logo} alt="TalkSpree" className="h-6 mx-auto" />
              <CardTitle className="text-2xl font-medium">
                {done ? 'Password updated' : 'Choose a new password'}
              </CardTitle>
              {!done && (
                <CardDescription>
                  Enter a new password for your account below.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {done ? (
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
              ) : hasRecoverySession === false ? (
                <div className="space-y-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    This password reset link is invalid or has expired. Please request a new one.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/auth/forgot-password')}
                  >
                    Request new link
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    disabled={loading || hasRecoverySession === null}
                  >
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Update password
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdaptiveLayout>
  );
}
