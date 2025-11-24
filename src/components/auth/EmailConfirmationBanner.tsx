import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Mail, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function EmailConfirmationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);

  // Don't show if email is already confirmed or user dismissed it
  if (!user || user.email_confirmed_at || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setResending(true);
    // TODO: Implement resend email functionality
    // await supabase.auth.resend({ type: 'signup', email: user.email! });
    setTimeout(() => {
      setResending(false);
    }, 2000);
  };

  return (
    <Alert className="rounded-none border-x-0 border-t-0 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
      <div className="flex items-center gap-3 w-full">
        <Mail className="h-5 w-5 text-amber-600 dark:text-amber-500" />
        <AlertDescription className="flex-1 text-sm">
          <span className="font-medium text-amber-900 dark:text-amber-100">
            Please verify your email address.
          </span>
          <span className="text-amber-700 dark:text-amber-300 ml-1">
            Check your inbox for the confirmation link.
          </span>
        </AlertDescription>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={resending}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
          >
            {resending ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Email'
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}

