import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Globe, Instagram, Facebook, Linkedin, Mail, Copy, Settings, Upload, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateCircle, Circle } from "@/lib/api/circles";
import { useCircle } from "@/contexts/CircleContext";
import { supabase } from "@/lib/supabase";

export function CircleCard() {
  const navigate = useNavigate();
  const { circle: contextCircle, isAdmin, memberCounts, loading: roleLoading, reloadCircle } = useCircle();
  const [localCircle, setLocalCircle] = useState<Circle | null>(null);
  const [logoHover, setLogoHover] = useState(false);
  const [coverHover, setCoverHover] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [bioOverflows, setBioOverflows] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);

  // Sync local circle state with context (allows local overrides after uploads)
  useEffect(() => {
    if (contextCircle) setLocalCircle(contextCircle);
  }, [contextCircle]);

  const circle = localCircle;
  const onlineCount = memberCounts.online;
  const totalMembers = memberCounts.total;

  // Check if bio overflows 3 lines when collapsed (so we only show "read more" when needed)
  useEffect(() => {
    if (!circle?.description) {
      setBioOverflows(false);
      return;
    }
    if (bioExpanded) {
      setBioOverflows(true); // when expanded, we always show "see less"
      return;
    }
    // When collapsed: measure after layout
    const raf = requestAnimationFrame(() => {
      const el = bioRef.current;
      if (!el) return;
      const overflows = el.scrollHeight > el.clientHeight;
      setBioOverflows(overflows);
    });
    return () => cancelAnimationFrame(raf);
  }, [circle?.description, bioExpanded]);

  // Extract file path from Supabase storage URL
  const extractStoragePath = (url: string): string | null => {
    if (!url) return null;
    try {
      // URL format: https://xxx.supabase.co/storage/v1/object/public/circle-assets/path/to/file
      const match = url.match(/circle-assets\/(.+)$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  // Delete old image from storage
  const deleteOldImage = async (oldUrl: string | null | undefined) => {
    if (!oldUrl) return;
    
    const oldPath = extractStoragePath(oldUrl);
    if (oldPath) {
      try {
        await supabase.storage
          .from('circle-assets')
          .remove([oldPath]);
        console.log('Deleted old image:', oldPath);
      } catch (error) {
        console.warn('Could not delete old image:', error);
        // Don't throw - continue with upload even if delete fails
      }
    }
  };

  // Handle image upload
  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    if (!circle) return;
    
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${circle.id}/${type}_${Date.now()}.${fileExt}`;
    
    // Get the old URL to delete after successful upload
    const oldUrl = type === 'logo' ? circle.logo_url : circle.cover_image_url;
    
    try {
      // Upload new image
      const { error: uploadError } = await supabase.storage
        .from('circle-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('circle-assets')
        .getPublicUrl(fileName);
      
      // Update circle in database
      await updateCircle(circle.id, {
        [type === 'logo' ? 'logo_url' : 'cover_image_url']: publicUrl
      });
      
      // Delete old image after successful update
      await deleteOldImage(oldUrl);
      
      // Update local state immediately, then refresh context
      setLocalCircle({
        ...circle,
        [type === 'logo' ? 'logo_url' : 'cover_image_url']: publicUrl
      });
      reloadCircle();
      
      toast({ title: 'Success', description: `${type === 'logo' ? 'Profile picture' : 'Cover image'} updated` });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to upload image. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const circleData = {
    name: circle?.name || "Mentor the Young",
    members: totalMembers.toString(),
    online: onlineCount.toString(),
    bio: circle?.description || "Mentor the Young Bulgaria is a nonprofit organization dedicated to empowering...",
    inviteLink: `https://talkspree.com/${circle?.abbreviation || circle?.invite_code || 'MTY'}/invite`,
    logoUrl: circle?.logo_url || "",
    coverImageUrl: circle?.cover_image_url || "",
    socials: {
      website: circle?.social_links?.website || "https://example.com",
      instagram: circle?.social_links?.instagram || "https://instagram.com",
      facebook: circle?.social_links?.facebook || "https://facebook.com",
      linkedin: circle?.social_links?.linkedin || "https://linkedin.com",
      email: circle?.social_links?.email || "mailto:info@example.com",
    },
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(circleData.inviteLink);
    toast({ description: "Invite link copied!" });
  };

  return (
    // OUTER WRAPPER - Full height container
    <div className="relative min-h-full">
      {/* COVER = gradient background - wraps around content */}
      <div 
        className="relative rounded-[1.5rem] overflow-visible shadow-apple-lg bg-gradient-primary pb-4"
        onMouseEnter={() => isAdmin && setCoverHover(true)}
        onMouseLeave={() => setCoverHover(false)}
        style={circleData.coverImageUrl ? { 
          backgroundImage: `url(${circleData.coverImageUrl})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center' 
        } : {}}
      >
        {/* subtle dot overlay */}
        {!circleData.coverImageUrl && (
          <div className="pointer-events-none absolute inset-0 opacity-30 rounded-[1.5rem] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]" />
        )}

        {/* Admin: Edit Cover Image overlay */}
        {isAdmin && coverHover && (
          <div 
            className="absolute inset-0 rounded-[1.5rem] bg-black/40 flex items-center justify-center cursor-pointer z-10 transition-opacity"
            onClick={() => coverInputRef.current?.click()}
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium">
              <Camera className="h-4 w-4" />
              Change Cover
            </div>
          </div>
        )}
        <input
          ref={coverInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
        />

        {/* Admin: Quick Edit Button */}
        {isAdmin && !roleLoading && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute top-4 right-4 z-30 shadow-lg"
            onClick={() => navigate('/settings/circle')}
          >
            <Settings className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}

        {/* Top cover section - fixed height */}
        <div className="h-32 rounded-t-[1.5rem]" />

        {/* Avatar - positioned to be half on cover, half on content */}
        <div 
          className="absolute top-16 left-1/2 -translate-x-1/2 z-20 group"
          onMouseEnter={() => isAdmin && setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
        >
          <Avatar className="h-32 w-32 border-4 border-card shadow-apple-lg">
            <AvatarImage src={circleData.logoUrl} />
            <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">
              {circleData.name?.[0] || 'M'}
            </AvatarFallback>
          </Avatar>
          
          {/* Admin: Edit Avatar overlay */}
          {isAdmin && logoHover && (
            <div 
              className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center cursor-pointer transition-opacity"
              onClick={() => logoInputRef.current?.click()}
            >
              <Camera className="h-6 w-6 text-white" />
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
          />
        </div>

        {/* CONTENT BUBBLE - positioned inside cover with margin */}
        <div className="px-4">
          <Card className="bg-card border-2 shadow-apple-md">
            <CardContent className="relative pt-20 pb-6 px-6">
              <div className="space-y-4 text-center">
                <div>
                  <h2 className="text-2xl font-semibold mb-1">{circleData.name}</h2>
                  <div className="flex items-center justify-center gap-4 text-sm">
                    <span className="text-muted-foreground">{circleData.members} members</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span className="font-medium">{circleData.online} online</span>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground leading-relaxed text-center">
                  {!bioExpanded ? (
                    <div className="relative">
                      <p ref={bioRef} className="line-clamp-3">
                        {circleData.bio}
                      </p>
                      {circleData.bio && bioOverflows && (
                        <span className="absolute bottom-0 right-0 pl-0 bg-gradient-to-r from-card to-card">
                          <button
                            type="button"
                            className="text-primary hover:underline whitespace-nowrap"
                            onClick={() => setBioExpanded(true)}
                          >
                            ...read more
                          </button>
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      <p ref={bioRef}>{circleData.bio}</p>
                      {circleData.bio && (
                        <button
                          type="button"
                          className="text-primary hover:underline inline"
                          onClick={() => setBioExpanded(false)}
                        >
                          see less
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Social Links */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Connect with us:</h3>
                  <div className="flex gap-2 justify-center">
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.website} target="_blank" rel="noreferrer">
                        <Globe className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.instagram} target="_blank" rel="noreferrer">
                        <Instagram className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.facebook} target="_blank" rel="noreferrer">
                        <Facebook className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.linkedin} target="_blank" rel="noreferrer">
                        <Linkedin className="h-5 w-5" />
                      </a>
                    </Button>
                    <Button size="icon" variant="outline" className="rounded-full h-12 w-12" asChild>
                      <a href={circleData.socials.email}>
                        <Mail className="h-5 w-5" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Invite Link */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Or invite members to the Circle:</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 bg-muted/50 rounded-lg text-xs truncate">
                      {circleData.inviteLink}
                    </div>
                    <Button size="icon" variant="outline" onClick={copyInviteLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
