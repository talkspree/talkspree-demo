import { useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { submitBugReport, type BugReportType } from '@/lib/api/bugReports';

const TYPES: ReadonlyArray<{ id: BugReportType; icon: string; label: string }> = [
  { id: 'bug',  icon: '🐛', label: 'Bug' },
  { id: 'ui',   icon: '🎨', label: 'UI / UX' },
  { id: 'perf', icon: '⚡', label: 'Performance' },
  { id: 'idea', icon: '💡', label: 'Idea' },
];

const SEVERITIES = [
  { val: 1, color: 'bg-green-500' },
  { val: 2, color: 'bg-lime-500' },
  { val: 3, color: 'bg-yellow-500' },
  { val: 4, color: 'bg-orange-500' },
  { val: 5, color: 'bg-red-500' },
];

const SEVERITY_LABELS = [
  'Low - minor cosmetic',
  'Minor - workaround exists',
  'Moderate - impairs workflow',
  'High - major functionality',
  'Critical - app is unusable',
];

const getSevLabel = (n: number) => SEVERITY_LABELS[n - 1] ?? '';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [details, setDetails] = useState('');
  const [type, setType] = useState<BugReportType>('bug');
  const [severity, setSeverity] = useState(3);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [fieldError, setFieldError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const resetForm = () => {
    setStatus('idle');
    setDetails('');
    setType('bug');
    setSeverity(3);
    setFieldError(false);
    setSubmitError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!details.trim()) {
      setFieldError(true);
      setTimeout(() => setFieldError(false), 1800);
      return;
    }

    setStatus('submitting');
    setSubmitError(null);

    try {
      await submitBugReport({
        type,
        severity: type === 'idea' ? null : severity,
        details,
      });

      setStatus('success');
      setTimeout(() => {
        onClose();
        setTimeout(resetForm, 300);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send report. Please try again.';
      setSubmitError(message);
      setStatus('error');
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 font-sans"
          onClick={status === 'submitting' ? undefined : onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.88, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-[420px] bg-white shadow-[0_24px_48px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)] rounded-[20px] overflow-hidden relative"
          >
            <div className="px-6 pt-[22px] flex justify-between items-start">
              <div>
                <div className="text-[11px] font-semibold text-[#6e6afe] uppercase tracking-[0.08em] mb-1">
                  Beta Feedback
                </div>
                <h2 className="text-[20px] font-semibold tracking-tight text-neutral-900">
                  Report an issue
                </h2>
                <p className="text-[13px] text-neutral-500 mt-[3px]">
                  Your feedback helps us ship faster.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={status === 'submitting'}
                className="w-7 h-7 shrink-0 ml-3 rounded-lg bg-neutral-100 border border-transparent text-neutral-500 flex items-center justify-center hover:bg-neutral-200 hover:text-neutral-700 transition-colors focus:outline-none disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 pb-0">
              <AnimatePresence mode="wait">
                {status === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col items-center justify-center py-10 text-center"
                  >
                    <div className="w-14 h-14 bg-[#2e9e5b]/10 border border-[#2e9e5b]/20 rounded-full flex items-center justify-center mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M5 12L10 17L19 8"
                          stroke="#2e9e5b"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.3px] text-neutral-900 mb-1.5">
                      Report sent — thank you!
                    </h3>
                    <p className="text-[13px] text-neutral-500 leading-relaxed">
                      We'll review your feedback and get
                      <br />
                      back to you if we need more details.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    className="flex flex-col"
                  >
                    <div className="grid grid-cols-4 sm:flex sm:flex-nowrap gap-2 mb-4">
                      {TYPES.map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => setType(t.id)}
                          className={`flex-1 py-2 px-1 rounded-[10px] border flex flex-col items-center gap-1 text-[12px] font-medium transition-colors ${
                            type === t.id
                              ? 'bg-[#6e6afe]/10 border-[#6e6afe]/30 text-[#6e6afe]'
                              : 'bg-neutral-50/50 border-neutral-200/60 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
                          }`}
                        >
                          <span className="text-[15px]">{t.icon}</span>
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <div className="mb-3.5 relative">
                      <label className="block text-[12px] font-medium text-neutral-500 mb-1.5 tracking-[0.02em]">
                        Details
                      </label>
                      <textarea
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Describe the issue in detail..."
                        className={`w-full h-[88px] bg-neutral-50 border ${
                          fieldError
                            ? 'border-[#c0292a]/60 shadow-[0_0_0_3px_rgba(192,41,42,0.12)]'
                            : 'border-neutral-200 focus:border-[#6e6afe]/50 focus:bg-white focus:shadow-[0_0_0_3px_rgba(110,106,254,0.1)]'
                        } rounded-[10px] text-neutral-900 text-[13px] px-3.5 py-2.5 outline-none transition-all placeholder:text-neutral-400 resize-none leading-relaxed`}
                        disabled={status === 'submitting'}
                      />
                    </div>

                    {type !== 'idea' && (
                      <div className="mb-5">
                        <label className="block text-[12px] font-medium text-neutral-500 mb-2 tracking-[0.02em]">
                          Severity
                        </label>
                        <div className="flex gap-1.5 sm:gap-2 items-center flex-wrap sm:flex-nowrap">
                          <div className="flex gap-1.5">
                            {SEVERITIES.map((s) => (
                              <button
                                key={s.val}
                                type="button"
                                onClick={() => setSeverity(s.val)}
                                className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all duration-150 ${
                                  severity === s.val
                                    ? `${s.color} border-white text-white scale-[1.15] shadow-[0_2px_12px_rgba(0,0,0,0.2)]`
                                    : `${s.color} border-transparent text-transparent hover:scale-110 hover:border-white/50`
                                }`}
                                aria-label={`Severity ${s.val}`}
                              >
                                {s.val}
                              </button>
                            ))}
                          </div>
                          <span className="text-[12px] text-neutral-500 ml-1 sm:ml-2 leading-[1.3] w-full sm:w-auto mt-1.5 sm:mt-0">
                            {getSevLabel(severity)}
                          </span>
                        </div>
                      </div>
                    )}

                    {submitError && (
                      <div className="mb-3 text-[12px] text-[#c0292a] bg-[#c0292a]/5 border border-[#c0292a]/20 rounded-[10px] px-3 py-2">
                        {submitError}
                      </div>
                    )}

                    <div
                      className={`mt-0 md:mt-2 ${
                        type === 'idea' ? 'pt-[14px]' : 'pt-0'
                      } pb-[22px] flex justify-center`}
                    >
                      <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#6e6afe] to-[#9e6aff] rounded-[10px] text-white text-[13px] font-semibold shadow-[0_4px_16px_rgba(110,106,254,0.35)] hover:opacity-90 hover:-translate-y-[1px] hover:shadow-[0_6px_24px_rgba(110,106,254,0.5)] active:scale-95 transition-all tracking-[0.01em] border-none disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
                      >
                        <span
                          className={`flex items-center gap-2 transition-transform duration-300 ${
                            status === 'submitting' ? '-translate-y-8' : 'translate-y-0'
                          }`}
                        >
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path
                              d="M1.5 6.5L11.5 6.5M7.5 2.5L11.5 6.5L7.5 10.5"
                              stroke="white"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          Send report
                        </span>
                        <span
                          className={`absolute inset-0 flex items-center justify-center gap-2 transition-transform duration-300 ${
                            status === 'submitting' ? 'translate-y-0' : 'translate-y-8'
                          }`}
                        >
                          <svg
                            className="animate-spin h-3.5 w-3.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Sending
                        </span>
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
