import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  /** ISO timestamp the restriction lifts at. */
  expiresAt: string;
  /** Fired once when the countdown reaches zero. */
  onExpire?: () => void;
}

function secondsLeft(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

/**
 * Live HH:MM:SS countdown (prefixed with days when > 24h) driven by the absolute
 * expiry timestamp set by the admin — so it reflects the real start time, not
 * when the user first opened the modal.
 */
export function CountdownTimer({ expiresAt, onExpire }: CountdownTimerProps) {
  const [secs, setSecs] = useState(() => secondsLeft(expiresAt));

  useEffect(() => {
    setSecs(secondsLeft(expiresAt));
    const id = setInterval(() => {
      const next = secondsLeft(expiresAt);
      setSecs(next);
      if (next <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
    // onExpire intentionally excluded — we don't want to reset the interval if it changes identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="mt-5 mb-1 flex flex-col items-center justify-center">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">
        Restriction ends in
      </span>
      <span className="text-3xl font-mono font-bold text-foreground tracking-tight tabular-nums">
        {days > 0 && <span>{days}d </span>}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  );
}
