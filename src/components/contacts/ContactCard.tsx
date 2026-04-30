import { Instagram, Facebook, Linkedin, Youtube, Music, Mail, Check, MapPin, MessageSquare, GraduationCap, Briefcase, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AnimatedBorderCard } from '@/components/ui/animated-border-card';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { useChat } from '@/contexts/ChatContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface Contact {
  id: number | string;
  dbId?: string;
  name: string;
  email?: string;
  job: string;
  age: string;
  country: string;
  gender: string;
  avatarUrl: string;
  role?: string;
  industry?: string;
  studyField?: string;
  university?: string;
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  isOnline?: boolean;
  isSample?: boolean;
  isNew?: boolean;
}

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
}

const TiktokIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
  </svg>
);

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const [emailCopied, setEmailCopied] = useState(false);
  const { openChat, openMobileChat } = useChat();
  const isMobile = useIsMobile();
  
  const isOnline = contact.isOnline ?? false;

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const bubble = {
      contactUserId: String(contact.id),
      contactName: contact.name,
      contactAvatar: contact.avatarUrl,
      isOnline,
    };
    if (isMobile) {
      openMobileChat(bubble);
    } else {
      openChat(bubble);
    }
  };

  const iconCls = 'h-4 w-4 text-muted-foreground shrink-0';

  // Trigger fireworks if the contact is new
  useEffect(() => {
    if (contact.isNew) {
      const duration = 1.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 50 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ 
            ...defaults, 
            particleCount, 
            origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.2 } 
        });
      }, 250);
      
      return () => clearInterval(interval);
    }
  }, [contact.isNew]);

  const copyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contact.email) {
      navigator.clipboard.writeText(contact.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
      toast({
        title: 'Email copied!',
        description: `${contact.email} copied to clipboard`,
      });
    }
  };

  const handleSocialClick = (e: React.MouseEvent, platform: string, handle?: string) => {
    e.stopPropagation();
    if (!handle) return;
    
    const urls: Record<string, string> = {
      instagram: `https://instagram.com/${handle.replace('@', '')}`,
      facebook: `https://facebook.com/${handle}`,
      linkedin: handle.startsWith('http') ? handle : `https://linkedin.com/in/${handle}`,
      youtube: handle.startsWith('http') ? handle : `https://youtube.com/@${handle.replace('@', '')}`,
      tiktok: `https://tiktok.com/@${handle.replace('@', '')}`,
    };
    
    if (urls[platform]) {
      window.open(urls[platform], '_blank');
    }
  };

  const socialIcons = (
    <div className="flex items-center justify-center gap-2 lg:gap-0">
      {contact.email && (
        <div className="relative">
          <button
            onClick={copyEmail}
            className="text-[#EA4335] hover:text-[#EA4335] hover:bg-[#EA4335]/10 p-2 rounded-full transition-all hover:scale-110 active:scale-90"
          >
            {emailCopied ? <Check size={18} /> : <Mail size={18} />}
          </button>
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-foreground text-background text-xs rounded-md shadow-lg pointer-events-none transition-all duration-300 ${emailCopied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            Copied!
          </div>
        </div>
      )}
      {contact.instagram && (
        <button onClick={(e) => handleSocialClick(e, 'instagram', contact.instagram)} className="text-[#E4405F] hover:text-[#E4405F] hover:bg-[#E4405F]/10 p-2 rounded-full transition-all hover:scale-110 active:scale-90">
          <Instagram size={18} />
        </button>
      )}
      {contact.facebook && (
        <button onClick={(e) => handleSocialClick(e, 'facebook', contact.facebook)} className="text-[#1877F2] hover:text-[#1877F2] hover:bg-[#1877F2]/10 p-2 rounded-full transition-all hover:scale-110 active:scale-90">
          <Facebook size={18} />
        </button>
      )}
      {contact.linkedin && (
        <button onClick={(e) => handleSocialClick(e, 'linkedin', contact.linkedin)} className="text-[#0A66C2] hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 p-2 rounded-full transition-all hover:scale-110 active:scale-90">
          <Linkedin size={18} />
        </button>
      )}
      {contact.youtube && (
        <button onClick={(e) => handleSocialClick(e, 'youtube', contact.youtube)} className="text-[#FF0000] hover:text-[#FF0000] hover:bg-[#FF0000]/10 p-2 rounded-full transition-all hover:scale-110 active:scale-90">
          <Youtube size={18} />
        </button>
      )}
      {contact.tiktok && (
        <button onClick={(e) => handleSocialClick(e, 'tiktok', contact.tiktok)} className="text-foreground hover:text-foreground hover:bg-muted p-2 rounded-full transition-all hover:scale-110 active:scale-90">
          <TiktokIcon size={18} />
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <AnimatedBorderCard
        className="w-full cursor-pointer hover:translate-y-[-2px] transition-all duration-200"
        isAnimated={contact.isNew}
        onClick={onClick}
      >
        <div className="px-3 py-3 flex flex-col gap-2">
          {/* Top row: avatar | info | actions */}
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden ring-2 ring-card bg-muted shadow-md">
                <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
              </div>
              <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card ${isOnline ? 'bg-success' : 'bg-muted-foreground'}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <h2 className="text-base font-bold tracking-tight leading-tight truncate">{contact.name}</h2>
              <span className={`text-xs font-medium ${isOnline ? 'text-success' : 'text-muted-foreground'}`}>
                {isOnline ? 'online' : 'offline'}
              </span>
              {contact.role && (
                <div className="flex items-center gap-1 text-xs">
                  <GraduationCap size={12} className="text-muted-foreground shrink-0" />
                  <span className="font-medium capitalize truncate">{contact.role}</span>
                </div>
              )}
              {contact.country && (
                <div className="flex items-center gap-1 text-xs">
                  <MapPin size={12} className="text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">{contact.country}</span>
                </div>
              )}
            </div>

            {/* Action button */}
            <div className="shrink-0">
              <button
                onClick={handleMessageClick}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-gradient-primary text-background hover:scale-105 active:scale-95 shadow-apple-md transition-all"
              >
                <MessageSquare size={20} />
              </button>
            </div>
          </div>

          {/* Bottom row: socials */}
          {(contact.email || contact.instagram || contact.facebook || contact.linkedin || contact.youtube || contact.tiktok) && (
            <>
              <div className="h-px w-full bg-border" />
              {socialIcons}
            </>
          )}
        </div>
      </AnimatedBorderCard>
    );
  }

  return (
    <AnimatedBorderCard 
      className="w-full max-w-sm mx-auto cursor-pointer hover:translate-y-[-4px] transition-all duration-200"
      isAnimated={contact.isNew}
      onClick={onClick}
    >
      <div className="p-4 flex flex-col h-full relative">
        
        {/* Profile Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-2">
          <div className="relative mb-4 group">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-card bg-muted flex items-center justify-center shadow-[0_20px_20px_-10px_rgba(0,0,0,0.2)]">
              <img 
                src={contact.avatarUrl} 
                alt={contact.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-4 border-card ${
              isOnline ? 'bg-success' : 'bg-muted-foreground'
            }`} />
          </div>
          
          <h2 className="text-xl font-bold tracking-tight mb-0.5 group-hover:text-primary transition-colors">
            {contact.name}
          </h2>

          <span className={`text-sm font-medium ${isOnline ? 'text-success' : 'text-muted-foreground'}`}>
            {isOnline ? 'online' : 'offline'}
          </span>
        </div>

        {/* Info List */}
        <div className="w-full px-2 mb-4 flex flex-col items-center space-y-2">
            {contact.role && (
              <div className="flex items-center gap-2 text-sm text-center">
                <GraduationCap size={16} className={iconCls} />
                <span className="font-medium capitalize">{contact.role}</span>
              </div>
            )}
            {contact.country && (
              <div className="flex items-center gap-2 text-sm text-center">
                <MapPin size={16} className={iconCls} />
                <span className="text-muted-foreground">{contact.country}</span>
              </div>
            )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-border mb-4" />

        {/* Primary Action */}
        <div className="mb-3 px-10">
          <button 
            onClick={handleMessageClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gradient-primary text-background hover:bg-gradient-primary/90 hover:scale-105 active:scale-95 border border-transparent transition-all shadow-apple-md hover:shadow-apple-lg group"
          >
            <MessageSquare className="text-background group-hover:-translate-y-0.5 transition-transform" size={18} />
            <span className="text-sm font-bold">Message</span>
          </button>
        </div>

        {/* Social Icons Row */}
        {socialIcons}

      </div>
    </AnimatedBorderCard>
  );
}
 