import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, NESTED_DIALOG_Z } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2 } from 'lucide-react';
import { reportUser } from '@/lib/api/calls';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  reportedUserId?: string;
  callId?: string | null;
  /** Raise above high-z parents (e.g. ContactDetailModal at z-[9999]). */
  elevated?: boolean;
}

const reportReasons = [
  { value: 'inappropriate', label: 'Inappropriate behavior' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'fake', label: 'Fake profile' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Other' },
];

const AUTO_CLOSE_MS = 2400;

export function ReportModal({
  open,
  onOpenChange,
  userName,
  reportedUserId,
  callId,
  elevated = false,
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the modal opens
  useEffect(() => {
    if (open) {
      setSelectedReason('');
      setDetails('');
      setSubmitted(false);
      setError(null);
    }
  }, [open]);

  // Auto-close after showing confirmation
  useEffect(() => {
    if (!submitted) return;
    const timer = window.setTimeout(() => onOpenChange(false), AUTO_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [submitted, onOpenChange]);

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason for reporting.');
      return;
    }
    if (!reportedUserId) {
      setError('Unable to identify the user being reported.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await reportUser(reportedUserId, callId ?? null, selectedReason, details.trim() || undefined);
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit report:', err);
      setError('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-md w-[calc(100%-2rem)] rounded-2xl sm:rounded-2xl',
          elevated && NESTED_DIALOG_Z,
        )}
        overlayClassName={elevated ? NESTED_DIALOG_Z : undefined}
      >
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500 shrink-0" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="text-lg font-semibold">Report submitted</p>
              <p className="text-sm text-muted-foreground">
                Thank you for helping us maintain a safe community.
              </p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report {userName}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-base mb-3 block">Reason for reporting</Label>
                <RadioGroup value={selectedReason} onValueChange={(v) => { setSelectedReason(v); setError(null); }}>
                  {reportReasons.map((reason) => (
                    <div key={reason.value} className="flex items-center space-x-2 mb-2">
                      <RadioGroupItem value={reason.value} id={reason.value} />
                      <Label htmlFor={reason.value} className="cursor-pointer font-normal">
                        {reason.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="details" className="text-base mb-2 block">
                  Additional details (optional)
                </Label>
                <Textarea
                  id="details"
                  placeholder="Please provide any additional information..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-destructive hover:bg-destructive/90"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting…' : 'Submit Report'}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
