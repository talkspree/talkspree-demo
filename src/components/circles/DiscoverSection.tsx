import { useState } from 'react';
import { Search, Lock, Globe, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CircleCardData } from './types';

interface DiscoverSectionProps {
  circles: CircleCardData[];
  loading: boolean;
  onSelect: (circle: CircleCardData) => void;
}

export function DiscoverSection({ circles, loading, onSelect }: DiscoverSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = circles.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.description ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <section className="pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8 px-1 sm:px-0">
        <h2 className="text-xl sm:text-[1.35rem] font-bold text-gray-900 tracking-tight">
          Discover Circles or <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4A72FF] to-[#BF48FF] cursor-not-allowed hover:opacity-80 transition-opacity">create your own</span>:
        </h2>

        <div className="relative w-full sm:w-[calc((100%-2*1.25rem)/3)] lg:w-[calc((100%-2*1.5rem)/3)] shrink-0">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={17} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for anything"
            className="w-full bg-white border border-gray-300 text-gray-900 font-semibold placeholder:font-medium placeholder:text-gray-400 rounded-full py-2 pl-10 pr-5 text-sm focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus:border-primary focus-visible:border-primary transition-[color,background-color,border-color,box-shadow] shadow-sm hover:shadow-md"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 px-1 sm:px-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-[2rem] bg-gray-100 animate-pulse min-h-[250px] sm:h-[225px]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="text-gray-400" size={28} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No circles found</h3>
          <p className="text-sm text-gray-500 font-medium px-4">
            {searchQuery.trim()
              ? 'No circles match what you have searched for.'
              : 'There are no other circles to discover yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 px-1 sm:px-0">
          {filtered.map((circle, i) => {
            return (
              <motion.div
                key={circle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => onSelect(circle)}
                className={`relative rounded-[2rem] overflow-hidden group cursor-pointer bg-gradient-to-br from-gray-100 to-gray-200 shadow-sm hover:shadow-md transition-all sm:hover:-translate-y-1 min-h-[250px] sm:min-h-[230px] flex flex-col`}
              >
                {circle.cover_image_url && (
                  <div className="absolute inset-0 z-0">
                    <img
                      src={circle.cover_image_url}
                      alt="banner"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                )}

                <div className="relative z-10 m-2 mt-auto bg-white rounded-[1.5rem] p-5 shadow-md">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 sm:gap-4">
                    {circle.logo_url ? (
                      <img
                        src={circle.logo_url}
                        alt={circle.name}
                        className="w-24 h-24 sm:w-[110px] sm:h-[110px] rounded-full -mt-[68px] sm:-mt-[60px] border-[4px] sm:border-[6px] border-white shadow-sm object-cover bg-white flex-shrink-0 relative z-20 group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-[110px] sm:h-[110px] rounded-full -mt-[68px] sm:-mt-[60px] border-[4px] sm:border-[6px] border-white shadow-sm bg-gradient-to-br from-[#4A72FF] to-[#BF48FF] flex-shrink-0 relative z-20 flex items-center justify-center text-white font-extrabold text-3xl">
                        {circle.name.charAt(0)}
                      </div>
                    )}

                    <div className="mt-0 sm:mt-[-6px] w-full">
                      <h3 className="font-extrabold text-gray-900 text-[17px] leading-tight mb-1.5 sm:mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {circle.name}
                      </h3>
                      <div className="flex flex-row justify-center sm:justify-start items-center gap-2 text-[11px] font-bold text-gray-600 mb-1 sm:mb-2">
                        <span>{circle.memberCount} members</span>
                        <span className="text-gray-300">·</span>
                        <div className="flex items-center gap-1">
                          {circle.visibility === 'private'
                            ? <Lock size={11} className="text-gray-500" strokeWidth={2.5} />
                            : <Globe size={11} className="text-gray-500" strokeWidth={2.5} />}
                          <span>{circle.visibility === 'private' ? 'Private' : 'Public'}</span>
                        </div>
                        <span className="text-gray-300">·</span>
                        <div className="flex items-center gap-1">
                          <Tag size={11} className="text-gray-500" strokeWidth={2.5} />
                          <span>Free</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 text-[13px] sm:text-sm sm:mt-2 text-center sm:text-left line-clamp-2 leading-snug font-medium">
                    {circle.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
