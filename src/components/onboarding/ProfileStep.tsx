import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, User } from 'lucide-react';
import { OnboardingData } from '@/pages/Onboarding';

interface ProfileStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
  field?: 'profilePicture' | 'socialMedia' | 'bio';
  grouped?: boolean;
}

export function ProfileStep({ data, updateData, onNext, onPrev, field, grouped = false }: ProfileStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [localData, setLocalData] = useState({
    bio: data.bio,
    socialMedia: data.socialMedia,
  });

  // Load existing profile picture on mount
  useEffect(() => {
    const loadExistingPicture = async () => {
      const { getCurrentProfile } = await import('@/lib/api/profiles');
      try {
        const profile = await getCurrentProfile();
        if (profile?.profile_picture_url) {
          setProfilePicturePreview(profile.profile_picture_url);
        }
      } catch (error) {
        console.error('Error loading profile picture:', error);
      }
    };
    loadExistingPicture();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');
    
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Please upload a JPG, PNG, HEIC, or WebP image');
        return;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        setUploadError('Image must be less than 10MB');
        return;
      }

      // Store the file
      updateData({ profilePicture: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicturePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = () => {
    updateData(localData);
    onNext();
  };

  const handleSingleFieldNext = (value: any, fieldName: string) => {
    updateData({ [fieldName]: value });
    onNext();
  };

  if (!grouped && field) {
    // Mobile: Single field view
    const getTitle = () => {
      switch (field) {
        case 'profilePicture': return 'Add a profile picture';
        case 'socialMedia': return 'Connect your social media';
        case 'bio': return 'Tell us about yourself';
      }
    };

    const renderField = () => {
      switch (field) {
        case 'profilePicture':
          return (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={profilePicturePreview} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-4xl">
                    <User className="h-16 w-16" />
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="transition-spring"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {profilePicturePreview ? 'Change Photo' : 'Choose Photo'}
                </Button>
                {uploadError && (
                  <p className="text-xs text-destructive text-center">
                    {uploadError}
                  </p>
                )}
                {!uploadError && (
                  <p className="text-xs text-muted-foreground text-center">
                    JPG, PNG, HEIC or WebP • Max 10MB
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={onPrev} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={() => onNext()}
                  className="flex-1 bg-gradient-primary hover:shadow-glow transition-spring"
                >
                  {profilePicturePreview ? 'Continue' : 'Skip for now'}
                </Button>
              </div>
            </div>
          );
        case 'socialMedia':
          return (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                These will not be accessible to other users until you connect
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  <Input
                    placeholder="Instagram username"
                    value={data.socialMedia.instagram || ''}
                    onChange={(e) => setLocalData(prev => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, instagram: e.target.value }
                    }))}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <Input
                    placeholder="Facebook profile"
                    value={data.socialMedia.facebook || ''}
                    onChange={(e) => setLocalData(prev => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, facebook: e.target.value }
                    }))}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <Input
                    placeholder="LinkedIn profile"
                    value={data.socialMedia.linkedin || ''}
                    onChange={(e) => setLocalData(prev => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, linkedin: e.target.value }
                    }))}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  <Input
                    placeholder="YouTube channel"
                    value={data.socialMedia.youtube || ''}
                    onChange={(e) => setLocalData(prev => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, youtube: e.target.value }
                    }))}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                  <Input
                    placeholder="TikTok username"
                    value={data.socialMedia.tiktok || ''}
                    onChange={(e) => setLocalData(prev => ({
                      ...prev,
                      socialMedia: { ...prev.socialMedia, tiktok: e.target.value }
                    }))}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => onNext()} className="flex-1">
                  Skip
                </Button>
                <Button 
                  onClick={() => handleSingleFieldNext(localData.socialMedia, 'socialMedia')}
                  className="flex-1 bg-gradient-primary hover:shadow-glow transition-spring"
                >
                  Continue
                </Button>
              </div>
            </div>
          );
        case 'bio':
          return (
            <div className="space-y-4">
              <Textarea
                placeholder="Write a short bio about yourself..."
                value={localData.bio}
                onChange={(e) => setLocalData(prev => ({ ...prev, bio: e.target.value }))}
                className="min-h-[120px] text-lg transition-spring"
                autoFocus
              />
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={onPrev} className="transition-spring">
                  Back
                </Button>
                <Button 
                  onClick={() => handleSingleFieldNext(localData.bio, 'bio')}
                  className="flex-1 bg-gradient-primary hover:shadow-glow transition-spring"
                >
                  Continue
                </Button>
              </div>
            </div>
          );
      }
    };

    return (
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-2xl font-medium">{getTitle()}</CardTitle>
          {field === 'bio' && (
            <p className="text-muted-foreground">What do you want others to know about you?</p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {renderField()}
        </CardContent>
      </Card>
    );
  }

  // Desktop: Grouped view
  const isValid = localData.bio.trim();

  return (
    <Card className="glass shadow-apple-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">Complete Your Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Profile Picture (Optional)</Label>
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={profilePicturePreview} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground text-4xl">
                <User className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button 
              variant="outline" 
              className="transition-spring"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {profilePicturePreview ? 'Change Photo' : 'Choose Photo'}
            </Button>
            {uploadError && (
              <p className="text-xs text-destructive text-center">
                {uploadError}
              </p>
            )}
            {!uploadError && (
              <p className="text-xs text-muted-foreground text-center">
                JPG, PNG, HEIC or WebP • Max 10MB
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <p className="text-sm text-muted-foreground">What do you want others to know about you?</p>
          <Textarea
            id="bio"
            placeholder="Write a short bio about yourself..."
            value={localData.bio}
            onChange={(e) => setLocalData(prev => ({ ...prev, bio: e.target.value }))}
            className="min-h-[120px] transition-spring"
          />
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onPrev} className="transition-spring">
            Back
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!isValid}
            className="flex-1 bg-gradient-primary hover:shadow-glow transition-spring"
          >
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}