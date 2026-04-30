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
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import logo from '@/assets/logo.svg';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        toast({
          title: 'Could not send reset email',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }
      setSubmitted(true);
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
              <CardTitle className="text-2xl font-medium">Reset your password</CardTitle>
              <CardDescription>
                {submitted
                  ? 'Check your inbox for a link to reset your password.'
                  : "Enter the email address you signed up with and we'll send you a link to reset your password."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitted ? (
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
