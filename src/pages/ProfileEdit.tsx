import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdaptiveLayout } from '@/components/layouts/AdaptiveLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from '@/hooks/use-toast';
import { interests, interestCategories, getInterestsByCategory } from '@/data/interests';
import { useProfileData } from '@/hooks/useProfileData';
import { Upload, ArrowLeft } from 'lucide-react';
import { CircleRoleCard } from '@/components/profile/CircleRoleCard';
import { updateProfile as updateProfileAPI, uploadProfilePicture } from '@/lib/api/profiles';
import { getMyCircles, updateMyCircleRole } from '@/lib/api/circles';
import { supabase } from '@/lib/supabase';
import { ImageCropModal } from '@/components/ui/ImageCropModal';
import {
  GENDER_OPTIONS,
  INDUSTRY_OPTIONS,
  WORKPLACE_OPTIONS,
  normalizeGender,
} from '@/data/occupationOptions';

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { profileData, updateProfile: updateProfileState } = useProfileData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'role'>('general');
  
  const [formData, setFormData] = useState({
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    dateOfBirth: profileData.dateOfBirth,
    gender: normalizeGender(profileData.gender),
    location: profileData.location,
    occupation: profileData.occupation,
    bio: profileData.bio,
    phone: profileData.phone,
    instagram: profileData.instagram,
    facebook: profileData.facebook,
    linkedin: profileData.linkedin,
    youtube: profileData.youtube,
    tiktok: profileData.tiktok,
    profilePicture: profileData.profilePicture || '',
    industry: profileData.industry || '',
    workPlace: profileData.workPlace || '',
    university: profileData.university || '',
    studyField: profileData.studyField || '',
    role: profileData.role || ''
  });

  const [selectedInterests, setSelectedInterests] = useState<string[]>(profileData.interests);
  
  useEffect(() => {
    setFormData({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      dateOfBirth: profileData.dateOfBirth,
      gender: normalizeGender(profileData.gender),
      location: profileData.location,
      occupation: profileData.occupation,
      bio: profileData.bio,
      phone: profileData.phone,
      instagram: profileData.instagram,
      facebook: profileData.facebook,
      linkedin: profileData.linkedin,
      youtube: profileData.youtube,
      tiktok: profileData.tiktok,
      profilePicture: profileData.profilePicture || '',
      industry: profileData.industry || '',
      workPlace: profileData.workPlace || '',
      university: profileData.university || '',
      studyField: profileData.studyField || '',
      role: profileData.role || ''
    });
    setSelectedInterests(profileData.interests);
  }, [profileData]);

  // Load user's circles
  useEffect(() => {
    const loadCircles = async () => {
      try {
        const circles = await getMyCircles();
        setUserCircles(circles);
      } catch (error) {
        console.error('Error loading circles:', error);
      }
    };

    loadCircles();
  }, []);

  const handleCircleRoleChange = (circleId: string, role: string) => {
    setCircleRoleChanges(prev => ({
      ...prev,
      [circleId]: role
    }));
  };
  
  const MAX_INTERESTS = 20;

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else if (prev.length < MAX_INTERESTS) {
        return [...prev, id];
      } else {
        toast({ description: 'Maximum 20 interests allowed', variant: 'destructive' });
        return prev;
      }
    });
  };

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  
  // Circle roles
  const [userCircles, setUserCircles] = useState<any[]>([]);
  const [circleRoleChanges, setCircleRoleChanges] = useState<Record<string, string>>({});

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError('');

    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setUploadError('Please upload a JPG, PNG, HEIC, or WebP image');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > maxSize) {
        setUploadError('Image must be less than 10MB');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      // Open the crop modal so the user can adjust the framing first.
      setCropSource(file);
      setShowCropModal(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedFile: File, dataUrl: string) => {
    setUploadedFile(croppedFile);
    setFormData((prev) => ({ ...prev, profilePicture: dataUrl }));
    setCropSource(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      // If on role tab, save circle role changes
      if (activeTab === 'role') {
        const roleUpdates = Object.entries(circleRoleChanges);
        if (roleUpdates.length > 0) {
          await Promise.all(
            roleUpdates.map(([circleId, role]) => 
              updateMyCircleRole(circleId, role)
            )
          );
          toast({
            title: 'Success',
            description: 'Your circle roles have been updated',
          });
          setCircleRoleChanges({}); // Clear pending changes
        } else {
          toast({
            description: 'No changes to save',
          });
        }
        setIsSaving(false);
        return;
      }

      // Otherwise, save profile data
      let profilePictureUrl = formData.profilePicture;

      // Handle profile picture upload if a new file was selected
      if (uploadedFile) {
        if (import.meta.env.DEV) {
          console.log('🖼️  New profile picture file detected:', uploadedFile.name);
        }
        toast({ description: 'Uploading profile picture...' });
        
        // Delete old profile picture if it exists
        if (profileData.profilePicture && !profileData.profilePicture.startsWith('data:')) {
          try {
            // Extract the file path from the full URL
            // Remove cache buster query param first (e.g., ?t=123456)
            const urlWithoutQuery = profileData.profilePicture.split('?')[0];
            const urlParts = urlWithoutQuery.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const oldPath = `profile-pictures/${fileName}`;
            
            if (import.meta.env.DEV) {
              console.log('🗑️  Deleting old profile picture:', oldPath);
            }
            
            const { error: deleteError } = await supabase.storage
                .from('avatars')
                .remove([oldPath]);
            
            if (deleteError) {
              console.error('❌ Delete error:', deleteError);
            } else if (import.meta.env.DEV) {
              console.log('✅ Old picture deleted successfully');
            }
          } catch (error) {
            console.error('❌ Failed to delete old profile picture:', error);
            // Continue even if deletion fails
          }
        }

        // Upload new profile picture
        if (import.meta.env.DEV) {
          console.log('📤 Uploading new profile picture...');
        }
        const uploadedUrl = await uploadProfilePicture(uploadedFile, false);
        if (import.meta.env.DEV) {
          console.log('✅ Upload completed, URL:', uploadedUrl);
        }
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl;
        }
      }

      // Update profile in database
      if (import.meta.env.DEV) {
        console.log('💾 Saving profile with picture URL:', profilePictureUrl);
      }
      await updateProfileAPI({
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        location: formData.location,
        occupation: formData.occupation,
        bio: formData.bio,
        phone: formData.phone,
        profile_picture_url: profilePictureUrl || null,
        industry: formData.industry || null,
        work_place: formData.workPlace || null,
        university: formData.university || null,
        study_field: formData.studyField || null,
        role: (formData.role as 'mentor' | 'mentee' | 'alumni') || null,
      });

      // Update social media links
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Delete existing social links
        await supabase
          .from('social_links')
          .delete()
          .eq('user_id', user.id);

        // Insert new social links
        const socialLinks = [];
        if (formData.instagram) socialLinks.push({ user_id: user.id, platform: 'instagram', url: formData.instagram });
        if (formData.facebook) socialLinks.push({ user_id: user.id, platform: 'facebook', url: formData.facebook });
        if (formData.linkedin) socialLinks.push({ user_id: user.id, platform: 'linkedin', url: formData.linkedin });
        if (formData.youtube) socialLinks.push({ user_id: user.id, platform: 'youtube', url: formData.youtube });
        if (formData.tiktok) socialLinks.push({ user_id: user.id, platform: 'tiktok', url: formData.tiktok });

        if (socialLinks.length > 0) {
          await supabase
            .from('social_links')
            .insert(socialLinks);
        }

        // Update interests
        await supabase
          .from('user_interests')
          .delete()
          .eq('user_id', user.id);

        if (selectedInterests.length > 0) {
          const interestsToInsert = selectedInterests.map(interestId => ({
            user_id: user.id,
            interest_id: interestId,
          }));

          await supabase
            .from('user_interests')
            .insert(interestsToInsert);
        }
      }

      toast({ description: 'Profile updated successfully!' });
      
      // Reload the page to refresh all profile data
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({ 
        description: error.message || 'Failed to update profile', 
        variant: 'destructive' 
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdaptiveLayout>
      <div className="min-h-screen bg-gradient-subtle py-6 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Circle
          </Button>

          {/* Toggle Buttons */}
          <div className="mb-6">
            <ToggleGroup type="single" value={activeTab} onValueChange={(value) => value && setActiveTab(value as 'general' | 'role')} className="justify-start gap-2 bg-muted p-1 rounded-xl w-fit">
              <ToggleGroupItem value="general" className="px-6 py-2 rounded-lg data-[state=on]:bg-gradient-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md font-medium transition-all">
                General
              </ToggleGroupItem>
              <ToggleGroupItem value="role" className="px-6 py-2 rounded-lg data-[state=on]:bg-gradient-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-md font-medium transition-all">
                Role
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <form onSubmit={handleSave}>
            {activeTab === 'general' ? (
              <Card className="shadow-apple-lg border-2">
                <CardContent className="pt-6 space-y-6">
                {/* Profile Picture Upload */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Profile Picture</h3>
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={formData.profilePicture} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-bold">
                        {formData.firstName[0]}{formData.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </Button>
                      {uploadError && (
                        <p className="text-xs text-destructive mt-2">{uploadError}</p>
                      )}
                      {!uploadError && (
                        <p className="text-xs text-muted-foreground mt-2">JPG, PNG, HEIC or WebP • Max 10MB</p>
                      )}
                    </div>
                  </div>
                </div>

              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">First Name</label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name</label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender</label>
                    <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Occupation</label>
                    <Input
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Industry</label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) => setFormData({ ...formData, industry: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRY_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Place of Work</label>
                    <Select
                      value={formData.workPlace}
                      onValueChange={(value) => setFormData({ ...formData, workPlace: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select workplace type" />
                      </SelectTrigger>
                      <SelectContent>
                        {WORKPLACE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">University</label>
                    <Input
                      value={formData.university}
                      onChange={(e) => setFormData({ ...formData, university: e.target.value })}
                      placeholder="University name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Field of Study</label>
                    <Input
                      value={formData.studyField}
                      onChange={(e) => setFormData({ ...formData, studyField: e.target.value })}
                      placeholder="e.g., Computer Science"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <Textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Media</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Instagram</label>
                    <Input
                      value={formData.instagram}
                      onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Facebook</label>
                    <Input
                      value={formData.facebook}
                      onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                      placeholder="facebook.com/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LinkedIn</label>
                    <Input
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">YouTube</label>
                    <Input
                      value={formData.youtube}
                      onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                      placeholder="youtube.com/@username"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">TikTok</label>
                    <Input
                      value={formData.tiktok}
                      onChange={(e) => setFormData({ ...formData, tiktok: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                </div>
              </div>

              {/* Interests */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Interests</h3>
                  <span className={`text-sm font-medium ${selectedInterests.length >= MAX_INTERESTS ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {selectedInterests.length}/{MAX_INTERESTS} selected
                  </span>
                </div>
                {selectedInterests.length >= MAX_INTERESTS && (
                  <p className="text-xs text-red-500 font-medium">Maximum interests reached</p>
                )}
                {interestCategories.map((category) => (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-medium text-muted-foreground">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                      {getInterestsByCategory(category).map((interest) => (
                        <Badge
                          key={interest.id}
                          variant={selectedInterests.includes(interest.id) ? 'default' : 'secondary'}
                          className={`cursor-pointer px-3 py-2 text-sm ${
                            selectedInterests.includes(interest.id) ? 'shadow-glow' : 'shadow-apple-sm'
                          } ${
                            !selectedInterests.includes(interest.id) && selectedInterests.length >= MAX_INTERESTS ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          onClick={() => toggleInterest(interest.id)}
                        >
                          {interest.emoji} {interest.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button type="submit" size="lg" className="flex-1" disabled={isSaving}>
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" onClick={() => navigate('/')} variant="secondary" size="lg" className="flex-1" disabled={isSaving}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userCircles.length === 0 ? (
                  <Card className="shadow-apple-md">
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">You are not a member of any circles yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {userCircles.map((membership) => (
                      <CircleRoleCard
                        key={membership.circle_id}
                        circleId={membership.circle_id}
                        onRoleChange={handleCircleRoleChange}
                      />
                    ))}
                  </>
                )}
                
                {/* Actions for Role tab */}
                {userCircles.length > 0 && (
                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      size="lg" 
                      className="flex-1" 
                      disabled={isSaving || Object.keys(circleRoleChanges).length === 0}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button type="button" onClick={() => navigate('/')} variant="secondary" size="lg" className="flex-1" disabled={isSaving}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
      <ImageCropModal
        open={showCropModal}
        onOpenChange={setShowCropModal}
        source={cropSource}
        aspect={1}
        shape="round"
        outputFileName={`profile-${Date.now()}.jpg`}
        title="Adjust your profile picture"
        onCropComplete={handleCropComplete}
      />
    </AdaptiveLayout>
  );
}
