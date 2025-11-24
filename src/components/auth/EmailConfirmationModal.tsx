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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface EmailConfirmationModalProps {
  isOpen: boolean;
  email: string;
  onContinue: () => void;
}

export function EmailConfirmationModal({ isOpen, email, onContinue }: EmailConfirmationModalProps) {
  const [code, setCode] = useState(['', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Refs for each input box
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Auto-verify when all 4 digits are entered
  useEffect(() => {
    if (code.every(digit => digit !== '') && !verifying && !isConfirmed) {
      handleVerifyCode();
    }
  }, [code]);

  const handleVerifyCode = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 4) {
      setError('Please enter all 4 digits');
      return;
    }

    setVerifying(true);
    setError(null);

    try {
      const result = await verifyEmailCode(email, fullCode);

      if (!result.success) {
        setError(result.error || 'Invalid code');
        setVerifying(false);
        // Clear the code inputs on error
        setCode(['', '', '', '']);
        inputRefs[0].current?.focus();
        return;
      }

      // Code verified successfully!
      setIsConfirmed(true);

      toast({
        title: "Email verified! 🎉",
        description: "Setting up your account...",
      });

      // Wait a brief moment to show success state, then continue
      // The parent component will handle sign in and navigation
      setTimeout(() => {
        onContinue();
      }, 800);
    } catch (err: any) {
      console.error('Error verifying code:', err);
      setError(err.message || 'Failed to verify code');
      setVerifying(false);
      // Clear the code inputs on error
      setCode(['', '', '', '']);
      inputRefs[0].current?.focus();
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError(null);

    try {
      await resendVerificationCode(email);
      
      toast({
        title: "Code sent!",
        description: "Check your email for the new verification code.",
      });
      
      // Clear the inputs
      setCode(['', '', '', '']);
      inputRefs[0].current?.focus();
    } catch (err: any) {
      toast({
        title: "Failed to resend code",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '');
    
    if (digit.length > 1) {
      // If user pastes multiple digits, distribute them
      const digits = digit.slice(0, 4).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 4) {
          newCode[index + i] = d;
        }
      });
      setCode(newCode);
      
      // Focus the next empty input or the last one
      const nextEmptyIndex = newCode.findIndex((d, i) => i > index && d === '');
      if (nextEmptyIndex !== -1) {
        inputRefs[nextEmptyIndex].current?.focus();
      } else if (index + digits.length < 4) {
        inputRefs[index + digits.length].current?.focus();
      } else {
        inputRefs[3].current?.focus();
      }
    } else {
      // Single digit input
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);
      
      // Auto-focus next input if digit was entered
      if (digit && index < 3) {
        inputRefs[index + 1].current?.focus();
      }
    }
    
    setError(null);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        // If current input is empty, focus previous input
        inputRefs[index - 1].current?.focus();
      } else {
        // Clear current input
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus();
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
                We sent a 4-digit verification code to:
              </p>
              <p className="font-semibold text-foreground text-lg">
                {email}
              </p>
              
              <div className="space-y-3 pt-2">
                {/* 4-Digit Code Input Boxes */}
                <div className="flex justify-center gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <input
                      key={index}
                      ref={inputRefs[index]}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={code[index]}
                      onChange={(e) => handleInputChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-14 h-14 text-center text-2xl font-bold border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={verifying}
                      autoComplete="off"
                    />
                  ))}
                </div>
                
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                
                {verifying && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Verifying...
                    </span>
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
                  <span>Code expires in 10 minutes</span>
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
          <AlertDialogFooter>
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
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
