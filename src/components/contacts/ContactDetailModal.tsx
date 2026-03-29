import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Instagram, Linkedin, Facebook, Youtube, Trash2, AlertTriangle, Mail, Copy, Check, X, GraduationCap } from 'lucide-react';
import { Connection } from '@/utils/connections';
import { interests } from '@/data/interests';
import { useProfileData } from '@/hooks/useProfileData';
import { AboutMeSection } from '@/components/profile/AboutMeSection';
import { useDevice } from '@/hooks/useDevice';
import { useState } from 'react';
import { deleteMutualContact } from '@/lib/api/contacts';
import { toast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TiktokIcon = ({ size = 18, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z" />
  </svg>
);

interface ContactDetailModalProps {
  contact: Connection | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactDeleted?: () => void;
}

export function ContactDetailModal({ contact, open, onOpenChange, onContactDeleted }: ContactDetailModalProps) {
  const { profileData } = useProfileData();
  const device = useDevice();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  if (!contact) return null;

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const copyEmail = () => {
    const email = (contact.user as any).email;
    if (email) {
      navigator.clipboard.writeText(email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2000);
      toast({
        title: 'Email copied!',
        description: `${email} copied to clipboard`,
      });
    }
  };

  const userInterests = contact.user.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  const currentUserInterests = profileData.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  const socialLinks = [
    { platform: 'Instagram', handle: contact.user.instagram, icon: Instagram, url: `https://instagram.com/${contact.user.instagram?.replace('@', '')}`, colorClass: 'hover:text-pink-600' },
    { platform: 'LinkedIn', handle: contact.user.linkedin, icon: Linkedin, url: contact.user.linkedin?.startsWith('http') ? contact.user.linkedin : `https://linkedin.com/in/${contact.user.linkedin}`, colorClass: 'hover:text-blue-700' },
    { platform: 'Facebook', handle: contact.user.facebook, icon: Facebook, url: contact.user.facebook?.startsWith('http') ? contact.user.facebook : `https://facebook.com/${contact.user.facebook}`, colorClass: 'hover:text-blue-600' },
    { platform: 'YouTube', handle: contact.user.youtube, icon: Youtube, url: contact.user.youtube?.startsWith('http') ? contact.user.youtube : `https://youtube.com/@${contact.user.youtube?.replace('@', '')}`, colorClass: 'hover:text-red-600' },
    { platform: 'TikTok', handle: contact.user.tiktok, icon: TiktokIcon, url: `https://tiktok.com/@${contact.user.tiktok?.replace('@', '')}`, colorClass: 'hover:text-foreground' },
  ].filter(link => link.handle && link.handle.trim() !== '');

  const handleDeleteContact = async () => {
    setIsDeleting(true);
    try {
      await deleteMutualContact(contact.userId);
      toast({
        title: 'Contact deleted',
        description: `${contact.user.firstName} ${contact.user.lastName} has been removed from your contacts.`,
      });
      onOpenChange(false);
      setShowDeleteConfirm(false);
      // Notify parent component to refresh the contacts list
      onContactDeleted?.();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete contact. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Main Dialog with custom overlay */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-background/60 backdrop-blur-md transition-opacity animate-in fade-in-0" 
            onClick={() => onOpenChange(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-3xl bg-card rounded-[1.5rem] shadow-[5px_5px_30px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 fade-in-0 duration-300">
            
            {/* Close Button (Fixed) */}
            <button 
              onClick={() => onOpenChange(false)}
              className="absolute top-4 right-4 sm:top-4 sm:right-2 p-2 z-50 rounded-full bg-muted backdrop-blur text-muted-foreground hover:bg-destructive/10 transition-colors hover:text-destructive hover:scale-110"
            >
              <X size={20} />
            </button>

            {/* Scrollable Area */}
            <div className="overflow-y-auto custom-scrollbar-contact pl-6 pr-2 sm:p-8 sm:pl-10 sm:pr-4  mr-2 sm:mr-4">
              
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 items-center sm:items-start text-center sm:text-left mb-8">
                {/* Avatar */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 shrink-0 rounded-full ring-4 ring-primary/20 shadow-apple-lg overflow-hidden bg-muted">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={contact.user.profilePicture || ''} />
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-3xl">
                      {contact.user.firstName[0]}{contact.user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Basic Info */}
                <div className="flex-1 space-y-4 pt-2">
                  <h2 className="text-3xl font-extrabold tracking-tight">{contact.user.firstName} {contact.user.lastName}</h2>
                  
                  {/* About Me Section */}
                  <AboutMeSection
                    role={contact.user.role}
                    occupation={contact.user.occupation}
                    industry={contact.user.industry}
                    studyField={contact.user.studyField}
                    university={contact.user.university}
                    age={calculateAge(contact.user.dateOfBirth)}
                    gender={contact.user.gender}
                    location={contact.user.location}
                    className="text-muted-foreground"
                  />
                </div>
              </div>

              {/* Content Body */}
              <div className="space-y-6">
                
                {/* Bio */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Bio</h3>
                  <p className="text-muted-foreground leading-relaxed text-base">
                    {contact.user.bio}
                  </p>
                </div>

                {/* Email */}
                {(contact.user as any).email && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Email</h3>
                    <div 
                      onClick={copyEmail}
                      className="group flex items-center justify-between p-2 px-4 rounded-2xl bg-muted/50 border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                       <div className="flex items-center gap-4">
                         <Mail size={18} className="text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-110" />
                         <span className="font-regular text-muted-foreground group-hover:font-medium transition-colors">{(contact.user as any).email}</span>
                       </div>
                       <button className="text-muted-foreground group-hover:text-primary transition-colors group-hover:scale-110">
                         {emailCopied ? <Check size={20} /> : <Copy size={18} />}
                       </button>
                    </div>
                  </div>
                )}

                {/* Social Media */}
            {socialLinks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Social Media</h3>
                    <div className="flex flex-wrap gap-3">
                      {socialLinks.map(({ platform, url, icon: Icon, colorClass }) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-muted-foreground hover:border-muted-foreground/50 ${colorClass} transition-all active:scale-95 shadow-sm hover:shadow-md group`}
                        >
                          <Icon size={18} className="group-hover:scale-110 transition-transform shrink-0" />
                          <span className="font-medium text-sm">{platform}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Interests</h3>
                  <div className="flex flex-wrap gap-2.5">
                    {userInterests.map((interest) => {
                      const isCommon = currentUserInterests.some(ui => ui?.id === interest!.id);
                      return (
                        <Badge 
                          key={interest!.id} 
                          variant={isCommon ? 'interest' : 'interest'}
                          className={`
                            inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border-2 transition-all
                            ${isCommon 
                              ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105' 
                              : 'bg-muted text-muted-foreground border-border hover:border-border/80'
                            }
                          `}
                        >
                          {interest!.emoji} {interest!.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>

                {/* Remove Contact Button (Bottom of content) */}
                <div className="flex justify-center pt-6 border-t border-border">
                   <Button 
                     variant="destructive"
                     className="w-fit py-6 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all group"
                     onClick={() => setShowDeleteConfirm(true)}
                   >
                     <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
                     <span>Remove Contact</span>
                   </Button>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-xl">Remove Contact?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base space-y-3 pt-2">
              <p>
                Are you sure you want to remove <strong>{contact.user.firstName} {contact.user.lastName}</strong> from your contacts?
              </p>
              <div className="bg-muted/50 rounded-lg p-3 border-l-4 border-warning">
                <p className="text-sm font-medium text-foreground">
                  ⚠️ This will also remove your contact information from their contact list.
                </p>
              </div>
              <p className="text-sm">
                This action cannot be undone. You can always reconnect after another call.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isDeleting ? 'Removing...' : 'Remove Contact'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
