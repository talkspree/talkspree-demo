import { Button } from '@/components/ui/button';
import { Clock, Check, X } from 'lucide-react';

interface ExtensionBannerProps {
  show: boolean;
  iRequested: boolean;
  theyRequested: boolean;
  bothAgreed: boolean;
  theyDeclined?: boolean;
  userName: string;
  /** Pass true only from mobile call screens to apply liquid-glass surfaces. */
  glass?: boolean;
  onRequest: () => void;
  onApprove: () => void;
  onDecline: () => void;
}

// ── Liquid-glass variants (mobile only) ──────────────────────────────────────
const GLASS_BASE =
  'backdrop-blur-md border shadow-[0_4px_24px_0_rgba(0,0,0,0.25),inset_0_1px_1px_rgba(255,255,255,0.18)]';
const GLASS_NEUTRAL     = `bg-white/10     border-white/15     ${GLASS_BASE}`;
const GLASS_DESTRUCTIVE = `bg-red-500/30   border-red-300/30   ${GLASS_BASE}`;
const GLASS_SUCCESS     = `bg-emerald-500/30 border-emerald-300/30 ${GLASS_BASE}`;
const GLASS_WARNING     = `bg-amber-500/30 border-amber-300/30 ${GLASS_BASE}`;

// ── Original solid variants (desktop) ────────────────────────────────────────
const SOLID_DESTRUCTIVE = 'bg-destructive';
const SOLID_SUCCESS     = 'bg-green-500';
const SOLID_NEUTRAL     = 'bg-gradient-primary';
const SOLID_WARNING     = 'bg-warning';

export function ExtensionBanner({
  show,
  iRequested,
  theyRequested,
  bothAgreed,
  theyDeclined = false,
  glass = false,
  userName,
  onRequest,
  onApprove,
  onDecline,
}: ExtensionBannerProps) {
  if (!show) return null;

  const destructive = glass ? GLASS_DESTRUCTIVE : SOLID_DESTRUCTIVE;
  const success     = glass ? GLASS_SUCCESS     : SOLID_SUCCESS;
  const neutral     = glass ? GLASS_NEUTRAL     : SOLID_NEUTRAL;
  const warning     = glass ? GLASS_WARNING     : SOLID_WARNING;
  const shadow      = glass ? '' : 'shadow-lg';
  const textShadow  = glass ? 'drop-shadow-sm' : '';

  // Declined state — partner rejected the extension
  if (theyDeclined) {
    return (
      <div className={`${destructive} ${shadow} text-white px-4 py-3 rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300`}>
        <X className={`h-5 w-5 shrink-0 ${textShadow}`} />
        <span className={`font-medium text-sm ${textShadow}`}>{userName} declined the extension request</span>
      </div>
    );
  }

  // Success state — show briefly then hide
  if (bothAgreed) {
    return (
      <div className={`${success} ${shadow} text-white px-4 py-3 rounded-2xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300`}>
        <Check className={`h-5 w-5 ${textShadow}`} />
        <span className={`font-medium ${textShadow}`}>Call extended by 10 minutes!</span>
        <Check className={`h-5 w-5 ${textShadow}`} />
      </div>
    );
  }

  // Waiting for them to approve
  if (iRequested && !theyRequested) {
    return (
      <div className={`${neutral} ${shadow} text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 animate-pulse ${textShadow}`} />
          <span className={`font-medium text-sm ${textShadow}`}>Waiting for {userName}...</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20 hover:text-white h-7 px-3"
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
      <div className={`${warning} ${shadow} text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3`}>
        <div className="flex items-center gap-2">
          <Clock className={`h-5 w-5 ${textShadow}`} />
          <span className={`font-medium text-sm ${textShadow}`}>{userName} wants to extend</span>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className={`h-7 px-4 ${glass ? 'bg-white text-amber-600 hover:bg-white/90 shadow-sm' : 'bg-white text-warning hover:bg-white/90'}`}
            onClick={onApprove}
          >
            Agree
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20 hover:text-white h-7 w-7 p-0"
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
    <div className={`${neutral} ${shadow} text-white px-4 py-3 rounded-2xl flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-2">
        <Clock className={`h-5 w-5 ${textShadow}`} />
        <span className={`font-medium text-sm ${textShadow}`}>2 minutes left</span>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className={`h-7 px-4 ${glass ? 'bg-white text-zinc-900 hover:bg-white/90 shadow-sm' : 'bg-white text-primary hover:bg-white/90'}`}
          onClick={onRequest}
        >
          Extend
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/20 hover:text-white h-7 w-7 p-0"
          onClick={onDecline}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
