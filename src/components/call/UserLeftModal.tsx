import React, { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserLeftModalProps {
  open: boolean;
  userName: string;
  onCountdownComplete: () => void;
}

export function UserLeftModal({ open, userName, onCountdownComplete }: UserLeftModalProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onCountdownComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open, onCountdownComplete]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Call Ended</AlertDialogTitle>
          <AlertDialogDescription className="text-center py-4">
            <div className="mb-4">
              {userName} has left the call.
            </div>
            <div className="text-4xl font-bold text-primary">
              {countdown}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              Redirecting to wrap-up...
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}

