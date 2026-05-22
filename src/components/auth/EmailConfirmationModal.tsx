import { useState, useRef, useEffect } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { verifyEmailCode, resendVerificationCode } from '@/lib/api/profiles';

// Must match the number of {{ index .Token N }} placeholders in the Supabase
// email template AND the OTP length set in Dashboard → Auth → Settings.
const CODE_LENGTH = 6;

interface EmailConfirmationModalProps {
  isOpen: boolean;
  email: string;
  onContinue: () => void;
}

export function EmailConfirmationModal({ isOpen, email, onContinue }: EmailConfirmationModalProps) {
  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusInput = (i: number) => inputRefs.current[i]?.focus();

  useEffect(() => {
    if (isOpen) setTimeout(() => focusInput(0), 100);
  }, [isOpen]);

  useEffect(() => {
    if (code.every(d => d !== '') && !verifying && !isConfirmed) {
      handleVerifyCode();
    }
  }, [code]);

  const clearCode = () => {
    setCode(Array(CODE_LENGTH).fill(''));
    focusInput(0);
  };

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== CODE_LENGTH) {
      setError(`Please enter all ${CODE_LENGTH} digits`);
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const result = await verifyEmailCode(email, fullCode);

      if (!result.success) {
        setError(result.error || 'Invalid code');
        setVerifying(false);
        clearCode();
        return;
      }

      setIsConfirmed(true);
      setTimeout(() => onContinue(), 800);
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError(err.message || 'Failed to verify code');
      setVerifying(false);
      clearCode();
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError(null);

    try {
      await resendVerificationCode(email);
      setResendStatus({ ok: true, msg: 'Code sent — check your inbox' });
      setTimeout(() => setResendStatus(null), 4000);
      clearCode();
    } catch (err: any) {
      setResendStatus({ ok: false, msg: err.message || 'Failed to resend code' });
    } finally {
      setResending(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, '');

    if (digits.length > 1) {
      const newCode = [...code];
      digits.slice(0, CODE_LENGTH - index).split('').forEach((d, i) => {
        newCode[index + i] = d;
      });
      setCode(newCode);
      focusInput(Math.min(index + digits.length, CODE_LENGTH - 1));
    } else {
      const newCode = [...code];
      newCode[index] = digits;
      setCode(newCode);
      if (digits && index < CODE_LENGTH - 1) focusInput(index + 1);
    }

    setError(null);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        focusInput(index - 1);
      } else {
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              isConfirmed
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-primary/10'
            }`}>
              {isConfirmed ? (
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              ) : (
                <Mail className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
          <AlertDialogTitle className="text-center text-2xl">
            {isConfirmed ? 'Email Verified!' : 'Verify your email'}
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="text-center space-y-4 px-6">
          {!isConfirmed ? (
            <>
              <p className="text-base text-muted-foreground">
                We sent a {CODE_LENGTH}-digit verification code to:
              </p>
              <p className="font-semibold text-foreground text-lg">{email}</p>

              <div className="space-y-3 pt-2">
                <div className="flex justify-center gap-3">
                  {Array.from({ length: CODE_LENGTH }, (_, index) => (
                    <input
                      key={index}
                      ref={el => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[index]}
                      onChange={e => handleInputChange(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      className="w-12 h-12 text-center text-xl font-bold border-2 rounded-lg transition-[border-color,background-color] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none focus:border-primary focus-visible:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={verifying}
                      autoComplete="off"
                    />
                  ))}
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                {verifying && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Verifying...</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-left space-y-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Check your inbox for the verification code</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Check spam folder if you don't see it</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Code expires in 60 minutes</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-base text-green-600 dark:text-green-400">
              Your email has been verified. Signing you in...
            </p>
          )}
        </div>

        <AlertDialogHeader className="sr-only">
          <AlertDialogDescription>Email verification</AlertDialogDescription>
        </AlertDialogHeader>

        {!isConfirmed && (
          <AlertDialogFooter className="flex-col gap-2">
            <Button
              onClick={handleResendCode}
              variant="ghost"
              className="w-full"
              disabled={resending || verifying}
            >
              {resending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend Code
                </>
              )}
            </Button>
            {resendStatus && (
              <p className={`text-sm text-center ${resendStatus.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                {resendStatus.msg}
              </p>
            )}
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
