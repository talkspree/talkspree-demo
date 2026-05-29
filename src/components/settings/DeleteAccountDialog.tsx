import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIRMATION_PHRASE = 'DELETE';

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmation.trim().toUpperCase() === CONFIRMATION_PHRASE && !deleting;

  const handleClose = (next: boolean) => {
    if (deleting) return;
    if (!next) {
      setConfirmation('');
      setError(null);
    }
    onOpenChange(next);
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('delete_my_account');
      if (rpcError) throw rpcError;
      await signOut().catch(() => {});
      navigate('/auth', { replace: true });
    } catch (err) {
      console.error('Failed to delete account:', err);
      const msg = err instanceof Error ? err.message : 'Failed to delete your account. Please contact support.';
      setError(msg);
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto sm:mx-0 mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center sm:text-left">Delete your account?</DialogTitle>
          <DialogDescription className="text-center sm:text-left">
            This will permanently delete your profile, circle memberships, interests, and all related data.
            This action <span className="font-semibold text-destructive">cannot be undone</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="delete-confirm" className="text-sm">
            Type <span className="font-mono font-semibold text-destructive">{CONFIRMATION_PHRASE}</span> to confirm
          </Label>
          <Input
            id="delete-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={CONFIRMATION_PHRASE}
            autoComplete="off"
            disabled={deleting}
            className="font-mono"
          />
          {error && (
            <p className="text-xs text-destructive pt-1">{error}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={deleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete}
            className="w-full sm:w-auto"
          >
            {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {deleting ? 'Deleting...' : 'Delete account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
