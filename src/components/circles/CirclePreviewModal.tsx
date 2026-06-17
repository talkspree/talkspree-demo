import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Globe, Users, Tag, Play } from 'lucide-react';
import type { CircleCardData } from './types';
import type { AboutMediaItem } from '@/lib/api/circles';
import { SafeHtml } from '@/components/ui/SafeHtml';
import { isRichTextEmpty } from '@/lib/sanitizeHtml';
import { parseVideoUrl, videoThumbnail } from '@/lib/videoEmbed';

interface CirclePreviewModalProps {
  circle: CircleCardData | null;
  isOpen: boolean;
  onClose: () => void;
  /** Private circle: paste an invite link to join. */
  onJoinViaLink: (circle: CircleCardData) => void;
  /** Public circle: join directly (free). */
  onJoinFree: (circle: CircleCardData) => void;
  joining?: boolean;
  /** Admin "what will members see" preview — disables the join action. */
  previewMode?: boolean;
}

/** Main media viewer: image, embedded video (YouTube/Vimeo), file, or link. */
function MediaViewer({ item }: { item: AboutMediaItem }) {
  if (item.type === 'image') {
    return <img src={item.url} alt="" className="absolute inset-0 w-full h-full object-contain" />;
  }
  const v = parseVideoUrl(item.url);
  if (v && (v.kind === 'youtube' || v.kind === 'vimeo')) {
    return (
      <iframe
        src={v.embedUrl}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    );
  }
  if (v && v.kind === 'file') {
    return <video src={v.embedUrl} controls className="absolute inset-0 w-full h-full object-contain" />;
  }
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white hover:text-white/80"
    >
      <Play className="h-10 w-10" />
      <span className="text-sm font-semibold">Open video</span>
    </a>
  );
}

export function CirclePreviewModal({ circle, isOpen, onClose, onJoinViaLink, onJoinFree, joining, previewMode }: CirclePreviewModalProps) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setActiveMediaIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, circle]);

  if (!circle) return null;

  const isPrivate = circle.visibility === 'private';
  const banner = circle.cover_image_url;

  // Admin-curated "About Us" gallery (cover + logo are intentionally excluded).
  const mediaItems = circle.aboutMedia ?? [];
  const activeIndex = Math.min(activeMediaIndex, Math.max(0, mediaItems.length - 1));
  const activeItem = mediaItems[activeIndex];

  const aboutHtml = circle.aboutDescription && !isRichTextEmpty(circle.aboutDescription)
    ? circle.aboutDescription
    : null;
  const creator = !circle.anonymousCreator ? circle.creator ?? null : null;

  const joinLabel = isPrivate ? 'JOIN VIA LINK' : 'JOIN FOR FREE';
  const handleJoin = () => {
    if (previewMode) return;
    isPrivate ? onJoinViaLink(circle) : onJoinFree(circle);
  };

  const Logo = ({ className }: { className: string }) =>
    circle.logo_url ? (
      <img src={circle.logo_url} alt={circle.name} className={`${className} object-cover bg-white`} />
    ) : (
      <div className={`${className} bg-gradient-to-br from-[#4A72FF] to-[#BF48FF] flex items-center justify-center text-white font-extrabold`}>
        {circle.name.charAt(0)}
      </div>
    );

  const CreatorChip = ({ size = 16 }: { size?: number }) =>
    creator ? (
      <div className="flex items-center gap-2">
        {creator.avatarUrl ? (
          <img src={creator.avatarUrl} alt={creator.name} className="rounded-full object-cover border border-gray-200" style={{ width: size, height: size }} />
        ) : (
          <div className="rounded-full bg-gradient-to-br from-[#4A72FF] to-[#BF48FF] flex items-center justify-center text-white font-bold" style={{ width: size, height: size, fontSize: size * 0.45 }}>
            {creator.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span>by <span className="text-gray-900">{creator.name}</span></span>
      </div>
    ) : null;

  const AboutBody = ({ mobile }: { mobile?: boolean }) => (
    <>
      {aboutHtml ? (
        <SafeHtml html={aboutHtml} className={`text-gray-700 ${mobile ? 'text-[13px]' : 'text-sm'} leading-relaxed`} />
      ) : (
        <p>{circle.description}</p>
      )}
      {isPrivate && (
        <p className="text-gray-500 text-[13px] mt-4">
          This is a private circle — you'll need an invite link from a member to join.
        </p>
      )}
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-6xl flex pointer-events-none max-h-[90vh] relative p-1 sm:p-0"
            >
              {/* DESKTOP */}
              <div className="hidden sm:flex w-full flex-row-reverse justify-center gap-6 max-h-[90vh] pointer-events-none">
                {/* Circle card */}
                <div className="w-[370px] shrink-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-[2rem] shadow-xl flex flex-col relative overflow-hidden h-fit self-start p-5 pointer-events-auto">
                  {banner && (
                    <img src={banner} alt="Cover" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                  )}
                  <div className="bg-white rounded-[1.5rem] w-full flex flex-col relative z-10 px-5 pb-6 pt-0 shadow-lg mt-[60px] grow">
                    <div className="flex justify-center -mt-[55px] mb-3">
                      <Logo className="w-[110px] h-[110px] rounded-full border-[6px] border-white shadow-sm" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 text-center leading-tight mb-2 line-clamp-2">
                      {circle.name}
                    </h2>
                    <div className="flex justify-center items-center gap-3 text-xs font-bold text-gray-500 mb-8">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                        <span className="text-gray-900">{circle.onlineCount} online</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-[12px] text-center font-medium leading-relaxed mb-8">
                      {circle.description}
                    </p>
                    <div className="mt-auto">
                      <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="w-full py-4 rounded-[1.25rem] bg-[#fbd051] hover:bg-[#ebd576] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-gray-900 font-bold text-lg shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {joining ? 'JOINING…' : joinLabel}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 bg-white rounded-[2rem] shadow-xl relative overflow-hidden flex flex-col max-h-[90vh] pointer-events-auto">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 bg-gray-100 hover:bg-gray-200 p-2 rounded-full text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="flex-1 overflow-hidden py-4 sm:py-6 pr-2 sm:pr-4">
                    <div className="overflow-y-auto thin-scrollbar pl-6 sm:pl-8 pr-4 sm:pr-6 h-full w-full">
                      <h3 className="text-3xl font-extrabold text-gray-900 mb-6 pt-0 sm:pt-2">
                        Learn more about {circle.name}
                      </h3>

                      {mediaItems.length > 0 && activeItem && (
                        <div className="flex gap-4 mb-8">
                          <div className="flex-1 bg-black rounded-[1.5rem] relative overflow-hidden flex items-center justify-center shadow-inner aspect-video">
                            <MediaViewer item={activeItem} />
                          </div>
                          {mediaItems.length > 1 && (
                            <div className="w-[60px] shrink-0 flex flex-col gap-2 overflow-y-auto pr-1 thin-scrollbar">
                              {mediaItems.map((item, index) => {
                                const thumb = item.type === 'image' ? item.url : videoThumbnail(item.url);
                                return (
                                  <div
                                    key={index}
                                    onClick={() => setActiveMediaIndex(index)}
                                    className={`w-full h-11 shrink-0 bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative border-[2px] transition-all ${activeIndex === index ? 'border-blue-500 shadow-sm' : 'border-transparent hover:border-gray-300 opacity-70 hover:opacity-100'}`}
                                  >
                                    {thumb ? (
                                      <img src={thumb} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full bg-gradient-to-br from-[#4A72FF] to-[#BF48FF] flex items-center justify-center">
                                        <Play className="h-4 w-4 text-white" />
                                      </div>
                                    )}
                                    {item.type === 'video' && thumb && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                        <Play className="h-3.5 w-3.5 text-white fill-white" />
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-6 text-[13px] font-bold text-gray-700 mb-6 pb-6 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          {isPrivate ? <Lock size={16} className="text-gray-900" strokeWidth={2.5} /> : <Globe size={16} className="text-gray-900" strokeWidth={2.5} />}
                          <span>{isPrivate ? 'Private' : 'Public'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={16} className="text-gray-900" strokeWidth={2.5} />
                          <span>{circle.memberCount} members</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tag size={16} className="text-gray-900" strokeWidth={2.5} />
                          <span>Free</span>
                        </div>
                        <CreatorChip size={18} />
                      </div>

                      <div className="space-y-4 text-gray-700 font-medium leading-relaxed text-sm">
                        <AboutBody />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* MOBILE */}
              <div className="sm:hidden w-full bg-white rounded-[2rem] shadow-xl relative max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 pointer-events-auto">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-20 bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/60 transition-colors"
                >
                  <X size={20} className="stroke-[2.5px]" />
                </button>
                <div className="overflow-y-auto thin-scrollbar flex flex-col w-full h-full pb-8">
                  <div className="h-[100px] w-full relative bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
                    {banner && <img src={banner} alt="Cover" className="w-full h-full object-cover" />}
                  </div>
                  <div className="px-5 flex flex-col relative z-10 -mt-10">
                    <div className="mb-2">
                      <Logo className="w-[80px] h-[80px] rounded-full border-[3px] border-white shadow-md" />
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900 leading-tight mb-2">{circle.name}</h2>
                    <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500 mb-4">
                      <span>{circle.memberCount} members</span>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#34A853] animate-pulse" />
                        <span className="text-gray-900">{circle.onlineCount} online</span>
                      </div>
                    </div>
                    <button
                      onClick={handleJoin}
                      disabled={joining}
                      className="w-full py-3.5 rounded-xl bg-[#fbd051] hover:bg-[#ebd576] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-gray-900 font-bold text-[15px] shadow-sm mb-8 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {joining ? 'JOINING…' : joinLabel}
                    </button>

                    {mediaItems.length > 0 && activeItem && (
                      <div className="w-full mb-8">
                        <div className="w-full bg-black rounded-[1.25rem] relative overflow-hidden flex items-center justify-center shadow-inner aspect-video">
                          <MediaViewer item={activeItem} />
                        </div>
                        {mediaItems.length > 1 && (
                          <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar">
                            {mediaItems.map((item, index) => {
                              const thumb = item.type === 'image' ? item.url : videoThumbnail(item.url);
                              return (
                                <div
                                  key={index}
                                  onClick={() => setActiveMediaIndex(index)}
                                  className={`w-14 h-10 shrink-0 bg-gray-100 rounded-lg overflow-hidden cursor-pointer relative border-[2px] transition-all ${activeIndex === index ? 'border-blue-500' : 'border-transparent opacity-70'}`}
                                >
                                  {thumb ? (
                                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-[#4A72FF] to-[#BF48FF] flex items-center justify-center">
                                      <Play className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-6">
                      <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        {isPrivate ? <Lock size={14} className="text-gray-900" strokeWidth={2.5} /> : <Globe size={14} className="text-gray-900" strokeWidth={2.5} />}
                        <span className="text-[13px] font-bold">{isPrivate ? 'Private' : 'Public'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
                        <Tag size={14} className="text-gray-900" strokeWidth={2.5} />
                        <span className="text-[13px] font-bold">Free</span>
                      </div>
                      {creator && (
                        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 shadow-sm text-[13px] font-bold text-gray-700">
                          <CreatorChip size={16} />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 text-gray-700 font-medium leading-relaxed text-[13px] border-t border-gray-100 pt-6">
                      <h3 className="text-xl font-extrabold text-gray-900 mb-2">About</h3>
                      <AboutBody mobile />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
