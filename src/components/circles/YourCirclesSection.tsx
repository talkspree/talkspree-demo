import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { circlePath } from '@/lib/navigation';
import type { CircleCardData } from './types';

interface YourCirclesSectionProps {
  circles: CircleCardData[];
  loading: boolean;
  onJoinClick: () => void;
}

export function YourCirclesSection({ circles, loading, onJoinClick }: YourCirclesSectionProps) {
  const navigate = useNavigate();
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);

  const openCircle = (c: CircleCardData) => navigate(circlePath(c.abbreviation));

  return (
    <section className="mb-2 sm:mb-3">
      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between mb-5 sm:mb-4 gap-4 sm:gap-3 px-1 sm:px-0">
        <h2 className="text-xl sm:text-[1.35rem] font-bold text-gray-900 tracking-tight">Your Circles:</h2>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onJoinClick}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-[1.25rem] sm:rounded-full bg-white text-gray-800 font-bold text-sm shadow-md border border-gray-200 hover:bg-gray-50 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Plus size={18} strokeWidth={3} /> JOIN
          </button>
          <button
            disabled
            title="Creating circles is coming soon"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 rounded-[1.25rem] sm:rounded-full bg-gradient-to-r from-[#4A72FF] to-[#BF48FF] text-white font-bold text-sm shadow-sm opacity-60 cursor-not-allowed transition-all"
          >
            <Plus size={18} strokeWidth={3} /> CREATE
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:flex gap-y-6 gap-x-2 sm:gap-6 pb-3 pt-2 sm:pb-2 sm:pt-1 px-1 justify-items-center">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:flex sm:items-start gap-y-6 gap-x-2 sm:gap-6 sm:overflow-x-auto pb-3 pt-2 sm:pb-2 sm:pt-1 px-1 sm:pl-1 sm:pr-8 sm:hide-scrollbar sm:snap-x justify-items-center">
          {circles.map((community, i) => (
            <motion.div
              key={community.id}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => openCircle(community)}
              className="flex flex-col items-center group/card cursor-pointer sm:flex-shrink-0 sm:snap-start"
            >
              <div className={`w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] relative transition-all duration-300 ease-out shadow-sm sm:group-hover/card:-translate-y-1.5 sm:group-hover/card:shadow-xl
                ${community.isCreated ? 'bg-gradient-to-r from-[#4A72FF] to-[#BF48FF] p-[3px]' : 'bg-white border border-gray-200 group-hover/card:border-gray-300'}
              `}>
                <div className={`w-full h-full relative overflow-hidden bg-white ${community.isCreated ? 'rounded-[calc(2rem-3px)]' : 'rounded-[2rem]'}`}>
                  {community.logo_url ? (
                    <img src={community.logo_url} alt={community.name} className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#4A72FF] to-[#BF48FF] flex items-center justify-center text-white font-extrabold text-3xl">
                      {community.name.charAt(0)}
                    </div>
                  )}

                  {/* Desktop hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-black/5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 hidden sm:flex flex-col justify-end p-3.5 pt-0 z-10">
                    <div className="translate-y-3 group-hover/card:translate-y-0 transition-transform duration-300">
                      <span className="text-white font-bold text-[13px] leading-tight line-clamp-2 drop-shadow-md">{community.name}</span>
                      {community.isCreated && <span className="text-[#e8c1ff] text-[9px] uppercase font-black tracking-widest mt-0.5 block drop-shadow-md">Created</span>}
                      <div className={`flex items-center gap-1.5 ${community.isCreated ? 'mt-0.5' : 'mt-1.5'}`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#75d777] shadow-[0_0_5px_#75d777]" />
                        <span className="text-gray-100 text-[10px] font-medium drop-shadow-md">{community.onlineCount} online</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile label */}
              <div className="sm:hidden mt-3 flex flex-col items-center w-24 text-center">
                <span className="text-gray-900 font-bold text-[11px] truncate w-full tracking-tight">{community.name}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#75d777]" />
                  <span className="text-gray-500 text-[10px] font-medium">{community.onlineCount} online</span>
                </div>
              </div>
            </motion.div>
          ))}

          {/* "Add circle" tile → Join (Create disabled) */}
          <div className="relative flex flex-col items-center sm:flex-shrink-0 sm:snap-start">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32">
              <div
                onClick={() => setIsPlusMenuOpen((v) => !v)}
                className="absolute inset-0 rounded-[2rem] bg-gray-100 sm:bg-transparent border border-dashed border-gray-300 sm:border-none flex items-center justify-center group cursor-pointer"
              >
                <div className="hidden sm:flex border-2 border-dashed border-gray-300 rounded-[2rem] w-full h-full items-center justify-center group-hover:border-primary group-hover:text-primary transition-colors bg-white">
                  <Plus className="text-gray-400 group-hover:text-primary transition-colors" size={32} />
                </div>
                <Plus className="sm:hidden text-gray-400 group-hover:text-gray-600 transition-colors" size={24} />
              </div>

              <AnimatePresence>
                {isPlusMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setIsPlusMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      className="absolute inset-0 sm:-inset-1 bg-white border border-gray-200 shadow-md rounded-[2rem] p-1.5 z-40 flex flex-col justify-between origin-center"
                    >
                      <button
                        onClick={() => { setIsPlusMenuOpen(false); onJoinClick(); }}
                        className="w-full rounded-[1.25rem] text-[11px] sm:text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors flex items-center justify-center flex-1"
                      >
                        Join
                      </button>
                      <div className="h-[1px] w-3/4 mx-auto bg-gray-100/80 rounded-full flex-shrink-0" />
                      <div className="w-full rounded-[1.25rem] text-[11px] sm:text-sm font-bold text-gray-300 cursor-not-allowed flex items-center justify-center flex-1">
                        Create
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="sm:hidden mt-3 flex flex-col items-center w-24 text-center pointer-events-none">
              <span className="text-gray-400 font-bold text-[11px] truncate w-full tracking-tight">Add Circle</span>
              <div className="flex items-center gap-1 mt-0.5 opacity-0">
                <div className="w-1.5 h-1.5 rounded-full" />
                <span className="text-[10px] font-medium">spacer</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
