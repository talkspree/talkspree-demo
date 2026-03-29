import { Button } from '@/components/ui/button';
import { Clock, Check, X } from 'lucide-react';

interface ExtensionBannerProps {
  show: boolean;
  iRequested: boolean;
  theyRequested: boolean;
  bothAgreed: boolean;
  theyDeclined?: boolean;
  userName: string;
  onRequest: () => void;
  onApprove: () => void;
  onDecline: () => void;
}

export function ExtensionBanner({
  show,
  iRequested,
  theyRequested,
  bothAgreed,
  theyDeclined = false,
  userName,
  onRequest,
  onApprove,
  onDecline,
}: ExtensionBannerProps) {
  if (!show) return null;

  // Declined state — partner rejected the extension
  if (theyDeclined) {
    return (
      <div className="bg-destructive text-white px-4 py-3 rounded-2xl flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
        <X className="h-5 w-5 shrink-0" />
        <span className="font-medium text-sm">{userName} declined the extension request</span>
      </div>
    );
  }

  // Success state - show briefly then hide
  if (bothAgreed) {
    return (
      <div className="bg-green-500 text-white px-4 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
        <Check className="h-5 w-5" />
        <span className="font-medium">Call extended by 10 minutes!</span>
        <Check className="h-5 w-5" />
      </div>
    );
  }

  // Waiting for them to approve
  if (iRequested && !theyRequested) {
    return (
      <div className="bg-gradient-primary text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 animate-pulse" />
          <span className="font-medium text-sm">Waiting for {userName}...</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20 h-7 px-3"
          onClick={onDecline}
        >
          Cancel
        </Button>
      </div>
    );
  }

  // They want to extend, I need to approve
  if (theyRequested) {
    return (
      <div className="bg-warning text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          <span className="font-medium text-sm">{userName} wants to extend</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-white text-warning hover:bg-white/90 h-7 px-4"
            onClick={onApprove}
          >
            Agree
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 h-7 w-7 p-0"
            onClick={onDecline}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Initial state: offer to extend
  return (
    <div className="bg-gradient-primary text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5" />
        <span className="font-medium text-sm">2 minutes left</span>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-white text-primary hover:bg-white/90 h-7 px-4"
          onClick={onRequest}
        >
          Extend
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20 h-7 w-7 p-0"
          onClick={onDecline}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
