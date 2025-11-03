import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
}

const reportReasons = [
  { value: 'inappropriate', label: 'Inappropriate behavior' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or advertising' },
  { value: 'fake', label: 'Fake profile' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Other' },
];

export function ReportModal({ open, onOpenChange, userName }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedReason) {
      toast({
        title: 'Please select a reason',
        description: 'You must select a reason for reporting.',
        variant: 'destructive',
      });
      return;
    }

    // Here you would typically send the report to your backend
    console.log('Report submitted:', { user: userName, reason: selectedReason, details });

    toast({
      title: 'Report submitted',
      description: 'Thank you for helping us maintain a safe community.',
    });

    // Reset form
    setSelectedReason('');
    setDetails('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report {userName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-base mb-3 block">Reason for reporting</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
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

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90"
              onClick={handleSubmit}
            >
              Submit Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
