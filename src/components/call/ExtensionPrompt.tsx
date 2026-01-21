import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface ExtensionPromptProps {
  show: boolean;
  iRequested: boolean;
  theyRequested: boolean;
  bothAgreed: boolean;
  userName: string;
  onRequest: () => void;
  onApprove: () => void;
  onDecline: () => void;
}

export function ExtensionPrompt({
  show,
  iRequested,
  theyRequested,
  bothAgreed,
  userName,
  onRequest,
  onApprove,
  onDecline,
}: ExtensionPromptProps) {
  if (!show) return null;

  // Both agreed - show success message briefly
  if (bothAgreed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm mx-4 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Call Extended!
          </h3>
          <p className="text-gray-600">
            +10 minutes added to your call
          </p>
        </div>
      </div>
    );
  }

  // I requested, waiting for them to approve
  if (iRequested && !theyRequested) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm mx-4 text-center">
          <div className="mb-4 flex justify-center">
            <Clock className="h-12 w-12 text-primary animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Extension Request Sent
          </h3>
          <p className="text-gray-600 mb-4">
            Waiting for {userName} to agree...
          </p>
          <Button
            variant="outline"
            onClick={onDecline}
            className="w-full"
          >
            Cancel Request
          </Button>
        </div>
      </div>
    );
  }

  // They requested, I need to approve/decline
  if (theyRequested) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm mx-4 text-center">
          <div className="mb-4 flex justify-center">
            <Clock className="h-12 w-12 text-warning" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Extension Request
          </h3>
          <p className="text-gray-600 mb-6">
            {userName} wants to extend the call by 10 minutes
          </p>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1"
            >
              Decline
            </Button>
            <Button
              onClick={onApprove}
              className="flex-1 bg-gradient-primary"
            >
              Agree
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Initial state: Ask if user wants to extend
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm mx-4 text-center">
        <div className="mb-4 flex justify-center">
          <Clock className="h-12 w-12 text-warning" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          2 Minutes Remaining
        </h3>
        <p className="text-gray-600 mb-6">
          Would you like to extend the call by 10 minutes?
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onDecline}
            className="flex-1"
          >
            No, End Soon
          </Button>
          <Button
            onClick={onRequest}
            className="flex-1 bg-gradient-primary"
          >
            Extend Call
          </Button>
        </div>
      </div>
    </div>
  );
}
