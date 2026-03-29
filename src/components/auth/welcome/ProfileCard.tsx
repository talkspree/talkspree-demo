import React, { useState } from 'react';
import { WelcomeUser } from './types';
import { Zap, User as UserIcon } from 'lucide-react';

interface ProfileCardProps {
  user: WelcomeUser;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      className="match-card relative shrink-0 bg-white group transition-colors duration-500 rounded-2xl overflow-hidden select-none shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] w-[clamp(5rem,9vw,12rem)] h-[clamp(5rem,9vw,12rem)] mr-[clamp(0.5rem,1vw,1.25rem)]"
      data-id={user.id}
    >
      {/* Background Image */}
      <div className="absolute inset-0 bg-white group-[.active-match]:bg-slate-700 transition-colors duration-500 flex items-center justify-center p-2 md:p-2">
        {!imgError ? (
          <img
            src={user.image}
            alt={user.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain opacity-100 group-[.active-match]:opacity-15 group-[.active-match]:scale-90 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-300 opacity-50 rounded-xl">
            <UserIcon className="w-8 h-8" strokeWidth={1} />
          </div>
        )}
      </div>

      {/* Match Badge */}
      <div className="match-badge absolute top-0 left-0 w-full p-[clamp(3px,1vw,10px)] flex justify-center opacity-0 transform -translate-y-4 transition-all duration-300 z-10">
        <div className="bg-green-500 text-white text-[clamp(8px,0.65vw,12px)] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg">
          <Zap className="w-[clamp(8px,0.7vw,13px)] h-[clamp(8px,0.7vw,13px)]" strokeWidth={4} fill="currentColor" /> Match
        </div>
      </div>

      {/* Card Content */}
      <div className="absolute bottom-0 left-0 w-full p-[clamp(5px,0.7vw,14px)] flex flex-col items-start transition-transform duration-300 group-[.active-match]:translate-y-1">
        <h3 className="text-slate-900 group-[.active-match]:text-white font-bold text-[clamp(10px,0.9vw,15px)] leading-tight tracking-tight opacity-0 translate-y-2 group-[.active-match]:opacity-100 group-[.active-match]:translate-y-0 transition-all duration-500">
          {user.name}{/*, {user.age}*/}
        </h3>
        <p className="text-slate-500 group-[.active-match]:text-slate-300 text-[clamp(8px,0.7vw,12px)] font-semibold tracking-wider mt-0.5 mb-1.5 opacity-0 translate-y-2 group-[.active-match]:opacity-100 group-[.active-match]:translate-y-0 transition-all duration-500 delay-100">
          {user.role}
        </p>
        <div className="sim-indicator w-full h-1 bg-slate-100 group-[.active-match]:bg-slate-800 rounded-full overflow-hidden opacity-0 group-[.active-match]:opacity-100 transition-all duration-500 delay-100">
          <div className="h-full bg-green-400 w-0 transition-all duration-700 ease-out sim-bar" />
        </div>
        <div className="w-full flex justify-between items-center mt-1 opacity-0 group-[.active-match]:opacity-100 transition-opacity duration-500 delay-200">
          <span className="text-[clamp(7px,0.6vw,10px)] text-green-500 font-bold">COMPATIBILITY</span>
          <span className="text-[clamp(8px,0.7vw,11px)] text-slate-600 group-[.active-match]:text-slate-300 font-mono sim-text">0%</span>
        </div>
      </div>

      {/* Highlight Overlay */}
      <div className="absolute inset-0 bg-green-500 opacity-0 group-[.active-match]:opacity-5 transition-opacity duration-300 pointer-events-none" />
    </div>
  );
};

export default React.memo(ProfileCard);
