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

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { profileData, updateProfile } = useProfileData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'role'>('general');
  
  const [formData, setFormData] = useState({
    firstName: profileData.firstName,
    lastName: profileData.lastName,
    dateOfBirth: profileData.dateOfBirth,
    gender: profileData.gender,
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
      gender: profileData.gender,
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profilePicture: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      ...formData,
      interests: selectedInterests
    });
    toast({ description: 'Profile updated successfully!' });
    navigate('/');
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
                        accept="image/*"
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
                      <p className="text-xs text-muted-foreground mt-2">Click to upload a profile picture from your device</p>
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
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Non-binary">Non-binary</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
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
                    <Input
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      placeholder="e.g., Technology, Finance"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Place of Work</label>
                    <Input
                      value={formData.workPlace}
                      onChange={(e) => setFormData({ ...formData, workPlace: e.target.value })}
                      placeholder="Company or organization name"
                    />
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
                    <Button type="submit" size="lg" className="flex-1">
                      Save Changes
                    </Button>
                    <Button type="button" onClick={() => navigate('/')} variant="secondary" size="lg" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <CircleRoleCard
                  circleName="Mentor the Young"
                  currentRole={formData.role}
                  onRoleChange={(role) => setFormData({ ...formData, role })}
                  circleImage="/placeholder.svg"
                />
                
                {/* Actions for Role tab */}
                <div className="flex gap-3">
                  <Button type="submit" size="lg" className="flex-1">
                    Save Changes
                  </Button>
                  <Button type="button" onClick={() => navigate('/')} variant="secondary" size="lg" className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </AdaptiveLayout>
  );
}
