import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { AlertTriangle, ArrowRight, X, Check, Star } from 'lucide-react';
import { SampleUser } from '@/data/sampleUsers';
import { ReportModal } from '@/components/call/ReportModal';
import { useProfileData } from '@/hooks/useProfileData';
import { computeSimilarityScore, ProfileForSimilarity } from '@/lib/similarity';
import { saveWrapupDecision } from '@/lib/api/calls';
import { isContact } from '@/lib/api/contacts';

export default function WrapUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profileData } = useProfileData();
  const matchedUser = location.state?.matchedUser as SampleUser | undefined;
  const callId = location.state?.callId as string | undefined;

  const [phase, setPhase] = useState(0);
  const [decision, setDecision] = useState<'connect' | 'skip' | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [alreadyConnected, setAlreadyConnected] = useState<boolean | null>(null);
  const [reportTooltipVisible, setReportTooltipVisible] = useState(false);
  const reportTooltipTimerRef = useRef<number | null>(null);

  // One-shot snapshot — viewport class won't change mid-wrap-up.
  const isMobile = useMemo(
    () => typeof window !== 'undefined' && window.innerWidth < 640,
    [],
  );

  const toSimilarityProfile = (user: any): ProfileForSimilarity => ({
    id: user.id,
    interests: user.interests || [],
    role: user.role,
    industry: user.industry,
    studyField: user.studyField,
    university: user.university,
    location: user.location,
    occupation: user.occupation,
  });

  const similarity = useMemo(
    () =>
      matchedUser
        ? computeSimilarityScore(toSimilarityProfile(profileData), toSimilarityProfile(matchedUser))
        : 0,
    // profileData is read inside via closure; the score is stable for a given match.
    [matchedUser?.id],
  );

  useEffect(() => {
    if (!matchedUser) return;
    isContact(matchedUser.id).then((connected) => {
      setAlreadyConnected(connected);
      if (connected) setPhase(5);
    });
  }, [matchedUser]);

  useEffect(() => {
    if (alreadyConnected) return;
    if (phase === 0) {
      const timer = setTimeout(() => setPhase(1), isMobile ? 800 : 1500);
      return () => clearTimeout(timer);
    }
    if (phase === 1) {
      const timer = setTimeout(() => setPhase(2), isMobile ? 1400 : 2500);
      return () => clearTimeout(timer);
    }
    if (phase === 3) {
      const timer = setTimeout(() => setPhase(4), isMobile ? 800 : 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, alreadyConnected, isMobile]);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setReportTooltipVisible(true), 1800);
    const hideTimer = window.setTimeout(() => setReportTooltipVisible(false), 5600);
    reportTooltipTimerRef.current = showTimer;
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!matchedUser) {
    navigate('/');
    return null;
  }

  const handleConnect = async () => {
    setDecision('connect');
    setPhase(3);

    // Skip confetti on mobile — canvas-confetti is the biggest single source
    // of jank on low-end phones during this transition.
    if (!isMobile) {
      const duration = 1500;
      const end = Date.now() + duration;
      const particleCount = 5;

      const frame = () => {
        confetti({
          particleCount,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#3b82f6', '#8b5cf6', '#ffffff'],
        });
        confetti({
          particleCount,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#3b82f6', '#8b5cf6', '#ffffff'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }

    if (callId) {
      try {
        await saveWrapupDecision(callId, 'connect');
      } catch (error) {
        console.error('Error saving wrap-up decision:', error);
      }
    }
  };

  const handleSkip = async () => {
    setDecision('skip');
    setPhase(3);

    if (callId) {
      try {
        await saveWrapupDecision(callId, 'skip');
      } catch (error) {
        console.error('Error saving skip decision:', error);
      }
    }
  };

  const handleNext = () => {
    const prev = (location.state as any) || {};
    const prevSessionUsers: string[] = prev.chatSessionUsers || [];
    const updatedSessionUsers = matchedUser
      ? [...new Set([...prevSessionUsers, matchedUser.id])]
      : prevSessionUsers;

    // Forward all filter state; strip call-specific keys that don't belong in the waiting room
    const { matchedUser: _mu, callId: _ci, agreedDuration: _ad, callStartTime: _cs, ...filterState } = prev;

    navigate('/waiting', {
      state: {
        ...filterState,
        chatSessionUsers: updatedSessionUsers,
      },
      replace: true,
    });
  };

  return (
    <>
      <div className="h-screen h-[100dvh] bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative">
        {/* Report Button + tooltip */}
        <div
          className="absolute top-6 right-6 z-50 flex items-center"
          onMouseEnter={() => {
            if (reportTooltipTimerRef.current !== null) window.clearTimeout(reportTooltipTimerRef.current);
            setReportTooltipVisible(true);
          }}
          onMouseLeave={() => setReportTooltipVisible(false)}
        >
          <AnimatePresence>
            {reportTooltipVisible && (
              <div className="absolute right-[calc(100%+16px)] top-1/2 -translate-y-1/2 z-50 pointer-events-none drop-shadow-xl flex items-center origin-right">
                <motion.div
                  key="report-tooltip"
                  initial={{ opacity: 0, x: 6, scale: 0.93 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 6, scale: 0.93 }}
                  transition={{ type: "spring", stiffness: 280, damping: 25 }}
                  className="feedback-tooltip-float relative"
                >
                  <div className="relative overflow-hidden bg-gradient-to-br from-red-500 to-orange-400 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl whitespace-nowrap flex items-center shadow-[0_8px_32px_rgba(239,68,68,0.4),inset_0_0_0_0.5px_rgba(255,255,255,0.2)] tracking-tight">
                    <div className="feedback-tooltip-shimmer absolute inset-0 rounded-xl" />
                    <span className="relative z-10">⚠ See something wrong? Report it</span>
                  </div>
                  <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-y-[7px] border-y-transparent border-l-[8px] border-l-orange-400" />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
          <button
            className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm"
            onClick={() => {
              setReportTooltipVisible(false);
              setShowReportModal(true);
            }}
          >
            <AlertTriangle size={18} />
            <span className="text-sm font-medium hidden sm:inline">Report</span>
          </button>
        </div>

        {/* Main Circular Card */}
        <motion.div
          className="relative w-[90vw] max-w-[480px] aspect-square rounded-full flex items-center justify-center p-8 z-10"
          animate={{
            backgroundColor:
              phase === 5
                ? '#ffffff'
                : phase === 3
                ? decision === 'skip'
                  ? '#fee2e2'
                  : decision === 'connect'
                  ? '#dcfce7'
                  : '#ffffff'
                : '#ffffff',
            boxShadow:
              phase === 5
                ? '0 0 80px rgba(234, 179, 8, 0.1)'
                : phase === 3
                ? decision === 'skip'
                  ? '0 0 80px rgba(239, 68, 68, 0.3)'
                  : decision === 'connect'
                  ? '0 0 80px rgba(34, 197, 94, 0.3)'
                  : '0 20px 70px -15px rgba(0,0,0,0.1)'
                : '0 20px 70px -15px rgba(0,0,0,0.1)',
          }}
          transition={{ duration: 0.5 }}
        >
          {/* Circular SVG Border */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none overflow-visible"
          >
            <defs>
              <linearGradient id="gradient-similarity" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="gradient-connect" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
              <linearGradient id="gradient-skip" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
              <linearGradient id="gradient-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fceb7e"/>
              <stop offset="100%" stopColor="#eab308"/>
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Background Track */}
            <circle cx="50" cy="50" r="48" fill="none" strokeWidth="2" stroke="#f1f5f9" />

            {/* Only render the circle for the current state — keeps frame rate
                up on mobile by avoiding 3 unused pathLength animations. */}
            {phase < 3 && phase !== 5 && (
              <motion.circle
                cx="50"
                cy="50"
                r="48"
                stroke="url(#gradient-similarity)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 1 }}
                animate={{ pathLength: similarity / 100, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  pathLength: { duration: 1.5, ease: 'easeOut' },
                  opacity: { duration: 0.3 },
                }}
              />
            )}

            {phase >= 3 && phase !== 5 && decision === 'connect' && (
              <motion.circle
                cx="50"
                cy="50"
                r="48"
                stroke="url(#gradient-connect)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                filter="url(#glow)"
                initial={{ pathLength: similarity / 100, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.8, ease: 'easeInOut' },
                  opacity: { duration: 0.3 },
                }}
              />
            )}

            {phase >= 3 && phase !== 5 && decision === 'skip' && (
              <motion.circle
                cx="50"
                cy="50"
                r="48"
                stroke="url(#gradient-skip)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                filter="url(#glow)"
                initial={{ pathLength: similarity / 100, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 0.8, ease: 'easeInOut' },
                  opacity: { duration: 0.3 },
                }}
              />
            )}

            {phase === 5 && (
              <motion.circle
                cx="50"
                cy="50"
                r="48"
                stroke="url(#gradient-gold)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{
                  pathLength: { duration: 1.2, ease: 'easeOut' },
                  opacity: { duration: 0.3 },
                }}
              />
            )}
          </svg>

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {phase === 1 && (
              <motion.div
                key="percentage"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.6, type: 'spring' }}
                className="absolute flex flex-col items-center justify-center"
              >
                <span className="text-8xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-500 to-violet-500 drop-shadow-sm">
                  {similarity}%
                </span>
                <span className="text-lg font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
                  Similarity
                </span>
              </motion.div>
            )}

            {phase === 2 && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.img
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  src={matchedUser.profilePicture || ''}
                  alt="Profile"
                  className="w-28 h-28 rounded-full border-4 border-white shadow-xl mb-4 object-cover"
                />
                <h2 className="text-3xl font-bold text-slate-900 mb-1">
                  {matchedUser.firstName} {matchedUser.lastName}
                </h2>
                <p className="text-slate-600 font-medium mb-1">{matchedUser.role}</p>
                <p className="text-slate-400 text-sm mb-0 sm:mb-8">{matchedUser.location}</p>

                {/* Desktop-only — mobile uses the viewport-fixed bottom bar below */}
                <div className="hidden sm:flex gap-4 w-full max-w-[280px]">
                  <button
                    onClick={handleSkip}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-red-50 text-red-600 font-bold hover:bg-red-100 hover:text-red-700 transition-colors"
                  >
                    <X size={20} strokeWidth={3} /> Skip
                  </button>
                  <button
                    onClick={handleConnect}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
                  >
                    <Check size={20} strokeWidth={3} /> Connect
                  </button>
                </div>
              </motion.div>
            )}

            {phase >= 3 && phase < 5 && (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center"
              >
                <motion.div
                  layout
                  initial={{ scale: 0, rotate: decision === 'connect' ? -180 : 180 }}
                  animate={{
                    scale: phase === 3 ? 1.5 : 1,
                    rotate: 0,
                    x: phase === 3 && decision === 'skip' ? [0, -10, 10, -10, 10, 0] : 0,
                  }}
                  transition={{
                    type: 'spring',
                    bounce: 0.5,
                    duration: 0.6,
                    x: { delay: 0.2, duration: 0.4 },
                  }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-inner z-10 ${
                    decision === 'connect'
                      ? 'bg-green-100 text-green-500'
                      : 'bg-red-100 text-red-500'
                  }`}
                  style={{ marginBottom: phase >= 4 ? '1.5rem' : '0' }}
                >
                  {decision === 'connect' ? (
                    <Check size={40} strokeWidth={3} />
                  ) : (
                    <X size={40} strokeWidth={3} />
                  )}
                </motion.div>

                <AnimatePresence>
                  {phase >= 4 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="flex flex-col items-center w-full"
                    >
                      <h3 className="text-2xl font-bold text-slate-900">
                        {decision === 'connect' ? 'Connection Sent!' : 'Skipped'}
                      </h3>
                      <p className="text-slate-500 mt-2 text-sm mb-0 sm:mb-8">
                        {decision === 'connect'
                          ? "We'll notify you if they connect back."
                          : 'Moving on to the next person.'}
                      </p>

                      {/* Desktop-only — mobile uses the viewport-fixed bottom bar below */}
                      <div className="hidden sm:flex flex-col gap-4 w-full max-w-[260px] items-center">
                        <button
                          onClick={handleNext}
                          className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
                        >
                          <ArrowRight size={20} /> Next Person
                        </button>
                        <button
                          onClick={() => navigate('/')}
                          className="text-slate-400 hover:text-slate-700 font-semibold text-sm transition-all duration-200 hover:underline underline-offset-4 active:scale-95 cursor-pointer"
                        >
                          Return Home
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {phase === 5 && (
              <motion.div
                key="already-connected"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, type: 'spring', bounce: 0.4 }}
                className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', bounce: 0.5 }}
                  className="relative mb-3"
                >
                  <img
                    src={matchedUser.profilePicture || ''}
                    alt="Profile"
                    className="w-24 h-24 rounded-full border-4 border-amber-300 shadow-xl object-cover"
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: 'spring', bounce: 0.6 }}
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-md"
                  >
                    <Star size={16} className="text-white fill-white" />
                  </motion.div>
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-2xl font-bold text-slate-900 mb-1"
                >
                  {matchedUser.firstName} {matchedUser.lastName}
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-100 mb-4 sm:mb-6"
                >
                  <Check size={16} strokeWidth={4} className="text-slate-600" />
                  <span className="text-sm font-bold text-slate-700 tracking-wider">
                    Already Connected
                  </span>
                </motion.div>

                {/* Desktop-only — mobile uses the viewport-fixed bottom bar below */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="hidden sm:flex flex-col gap-4 w-full max-w-[260px] items-center"
                >
                  <button
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
                  >
                    <ArrowRight size={20} /> Next Person
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="text-slate-400 hover:text-slate-700 font-semibold text-sm transition-all duration-200 hover:underline underline-offset-4 active:scale-95 cursor-pointer"
                  >
                    Return Home
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Mobile-only viewport-fixed action bar. Lives outside any framer
            motion.div so no transformed ancestor can break centering. */}
        <div className="fixed inset-x-0 bottom-2 z-30 flex justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4 sm:hidden pointer-events-none">
          <AnimatePresence mode="wait">
            {phase === 2 && (
              <motion.div
                key="m-phase2"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 32 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="flex w-full max-w-[320px] gap-3 pointer-events-auto"
              >
                <button
                  onClick={handleSkip}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-red-50 text-red-600 font-bold active:bg-red-100 transition-colors shadow-md shadow-red-500/10"
                >
                  <X size={20} strokeWidth={3} /> Skip
                </button>
                <button
                  onClick={handleConnect}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white font-bold active:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
                >
                  <Check size={20} strokeWidth={3} /> Connect
                </button>
              </motion.div>
            )}

            {phase >= 4 && phase < 5 && (
              <motion.div
                key="m-phase4"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 32 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="flex w-full max-w-[320px] flex-col items-center gap-3 pointer-events-auto"
              >
                <button
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white font-bold active:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
                >
                  <ArrowRight size={20} /> Next Person
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="text-slate-400 font-semibold text-sm active:text-slate-700 transition-colors py-1"
                >
                  Return Home
                </button>
              </motion.div>
            )}

            {phase === 5 && (
              <motion.div
                key="m-phase5"
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 32 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280, delay: 0.3 }}
                className="flex w-full max-w-[320px] flex-col items-center gap-3 pointer-events-auto"
              >
                <button
                  onClick={handleNext}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white font-bold active:opacity-90 transition-opacity shadow-lg shadow-blue-500/25"
                >
                  <ArrowRight size={20} /> Next Person
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="text-slate-400 font-semibold text-sm active:text-slate-700 transition-colors py-1"
                >
                  Return Home
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        userName={`${matchedUser.firstName} ${matchedUser.lastName}`}
        reportedUserId={matchedUser.id}
        callId={callId}
      />
    </>
  );
}
