import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { parseInviteLink } from '@/lib/inviteLink';
import { getInviterBySlug, claimAffiliate } from '@/lib/api/affiliates';
import {
  getPublicCirclePreview,
  joinCircleById,
  type DiscoverableCircle,
  type JoinCircleResult,
} from '@/lib/api/circles';
import type { CircleCardData } from './types';

interface JoinCircleModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * When set (joining a specific private circle discovered in Discover), the
   * pasted link MUST resolve to this circle, otherwise it's rejected.
   */
  targetCircle?: CircleCardData | null;
  onJoined: (circle: CircleCardData, result: JoinCircleResult) => void;
}

/**
 * "Paste an invite link to join a circle" modal. Accepts real personal affiliate
 * links only — `talkspree.com/<ABBREV>/<slug>` — resolves a live preview, then
 * joins + records the inviter on confirm.
 */
export function JoinCircleModal({ isOpen, onClose, targetCircle, onJoined }: JoinCircleModalProps) {
  const [inviteLink, setInviteLink] = useState('');
  const [preview, setPreview] = useState<DiscoverableCircle | null>(null);
  const [inviterId, setInviterId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setInviteLink('');
      setPreview(null);
      setInviterId(null);
      setError('');
      setResolving(false);
      setJoining(false);
    }
  }, [isOpen]);

  // Resolve the pasted link to a live circle preview (debounced).
  useEffect(() => {
    const trimmed = inviteLink.trim();
    setError('');
    if (!trimmed) {
      setPreview(null);
      setInviterId(null);
      return;
    }

    const parsed = parseInviteLink(trimmed);
    if (!parsed) {
      setPreview(null);
      setInviterId(null);
      return;
    }

    let cancelled = false;
    setResolving(true);
    const timer = setTimeout(async () => {
      try {
        const [inviter, circle] = await Promise.all([
          getInviterBySlug(parsed.userSlug),
          getPublicCirclePreview(parsed.circleAbbrev),
        ]);
        if (cancelled) return;

        if (!inviter || !circle) {
          setPreview(null);
          setInviterId(null);
          setError('Invalid invite link. Please check and try again.');
          return;
        }
        if (targetCircle && circle.id !== targetCircle.id) {
          setPreview(null);
          setInviterId(null);
          setError(`This invite link is for a different circle.`);
          return;
        }
        setPreview(circle);
        setInviterId(inviter.id);
      } catch {
        if (!cancelled) setError('Something went wrong. Please try again.');
      } finally {
        if (!cancelled) setResolving(false);
      }
    }, 400);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [inviteLink, targetCircle]);

  const handleJoin = async () => {
    if (!preview) return;
    setJoining(true);
    setError('');
    try {
      const result = await joinCircleById(preview.id);
      if (inviterId) {
        await claimAffiliate(inviterId, preview.id).catch(() => {});
      }
      onJoined({ ...preview, role: null }, result);
    } catch (err: any) {
      setError(err?.message || 'Could not join this circle. Please try again.');
      setJoining(false);
    }
  };

  const close = () => { if (!joining) onClose(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10"
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <X size={20} />
            </button>

            {targetCircle ? (
              <div className="flex items-center gap-3 mb-2">
                {targetCircle.logo_url && (
                  <img
                    src={targetCircle.logo_url}
                    alt={targetCircle.name}
                    className="w-10 h-10 rounded-full border border-gray-200 shadow-sm object-cover"
                  />
                )}
                <h3 className="text-xl font-bold text-gray-900">Join {targetCircle.name}</h3>
              </div>
            ) : (
              <h3 className="text-xl font-bold text-gray-900 mb-2">Join a Circle</h3>
            )}
            <p className="text-gray-500 text-sm mb-6">
              Paste the invite link below to join {targetCircle ? 'this circle' : 'an existing circle'}.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2 ml-1" htmlFor="invite_link">
                Invite Link
              </label>
              <input
                id="invite_link"
                type="text"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="https://talkspree.com/MTY/ab12cd"
                className="w-full bg-gray-50 text-gray-900 font-medium placeholder:text-gray-400 rounded-2xl px-4 py-3 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:border-primary focus-visible:border-primary border border-gray-200 transition-[color,background-color,border-color,box-shadow] shadow-inner"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 font-medium mb-4 ml-1">{error}</p>
            )}

            <AnimatePresence>
              {preview && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mb-6 p-1.5 rounded-2xl border border-gray-200 shadow-sm bg-white flex gap-3 h-[100px]"
                >
                  {preview.logo_url ? (
                    <img
                      src={preview.logo_url}
                      className="w-[88px] h-full rounded-[14px] object-cover shadow-sm border border-gray-100 flex-shrink-0"
                      alt={preview.name}
                    />
                  ) : (
                    <div className="w-[88px] h-full rounded-[14px] bg-gradient-to-br from-[#4A72FF] to-[#BF48FF] flex-shrink-0 flex items-center justify-center text-white font-bold text-2xl">
                      {preview.name.charAt(0)}
                    </div>
                  )}
                  <div className="py-1.5 pr-2 flex flex-col flex-1 overflow-hidden">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-gray-900 text-[15px] leading-tight truncate">{preview.name}</h4>
                      <span className="text-gray-500 text-[10px] font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100 shrink-0">
                        {preview.memberCount} members
                      </span>
                    </div>
                    <p className="text-[11.5px] text-gray-500 line-clamp-3 leading-snug font-medium">
                      {preview.description}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={handleJoin}
              disabled={!preview || joining || resolving}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#4A72FF] to-[#BF48FF] text-white font-bold text-base shadow-sm hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500"
            >
              {joining ? 'Joining…' : 'Join Circle'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
