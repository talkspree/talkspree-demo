import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Save, Plus, X, Pencil, Trash2, Globe, Instagram, Facebook, Linkedin, Mail, Youtube, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { useCircleRole } from '@/hooks/useCircleRole';
import { 
  getOrCreateDefaultCircle, 
  updateCircle, 
  getCircleRoles, 
  createCircleRole, 
  updateCircleRole, 
  deleteCircleRole,
  getCircleTopicPresets,
  createTopicPreset,
  CircleRole,
  CircleTopicPreset,
  Circle
} from '@/lib/api/circles';
import { supabase } from '@/lib/supabase';

export default function CircleSettings() {
  const navigate = useNavigate();
  const { isAdmin, adminType, loading: roleLoading } = useCircleRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Circle data
  const [circle, setCircle] = useState<Circle | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    email: '',
    youtube: ''
  });
  
  // Roles
  const [roles, setRoles] = useState<CircleRole[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  
  // Topic Presets
  const [topicPresets, setTopicPresets] = useState<CircleTopicPreset[]>([]);
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetTopics, setNewPresetTopics] = useState<string[]>([]);
  const [newPresetQuestion, setNewPresetQuestion] = useState('');
  const [newPresetQuestions, setNewPresetQuestions] = useState<string[]>([]);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load circle data
  useEffect(() => {
    const loadData = async () => {
      try {
        const circleData = await getOrCreateDefaultCircle();
        setCircle(circleData);
        setName(circleData.name || '');
        setDescription(circleData.description || '');
        setLogoUrl(circleData.logo_url || '');
        setCoverImageUrl(circleData.cover_image_url || '');
        
        if (circleData.social_links) {
          setSocialLinks({
            website: circleData.social_links.website || '',
            instagram: circleData.social_links.instagram || '',
            facebook: circleData.social_links.facebook || '',
            linkedin: circleData.social_links.linkedin || '',
            email: circleData.social_links.email || '',
            youtube: circleData.social_links.youtube || ''
          });
        }
        
        // Load roles (with error handling)
        try {
          const circleRoles = await getCircleRoles(circleData.id);
          setRoles(circleRoles);
        } catch (roleError) {
          console.warn('Could not load circle roles (table may not exist yet):', roleError);
          setRoles([]);
        }
        
        // Load topic presets (with error handling)
        try {
          const presets = await getCircleTopicPresets(circleData.id);
          setTopicPresets(presets);
        } catch (presetError) {
          console.warn('Could not load topic presets (table may not exist yet):', presetError);
          setTopicPresets([]);
        }
      } catch (error) {
        console.error('Error loading circle data:', error);
        toast({ title: 'Error', description: 'Failed to load circle settings', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Redirect if not admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({ title: 'Access Denied', description: 'You must be an admin to access this page', variant: 'destructive' });
      navigate('/');
    }
  }, [roleLoading, isAdmin, navigate]);

  const handleSave = async () => {
    if (!circle) return;
    
    setSaving(true);
    try {
      await updateCircle(circle.id, {
        name,
        description,
        logo_url: logoUrl || null,
        cover_image_url: coverImageUrl || null,
        social_links: socialLinks
      });
      
      toast({ title: 'Success', description: 'Circle settings saved successfully' });
    } catch (error) {
      console.error('Error saving circle:', error);
      toast({ title: 'Error', description: 'Failed to save circle settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Extract file path from Supabase storage URL
  const extractStoragePath = (url: string): string | null => {
    if (!url) return null;
    try {
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
      }
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    if (!circle) return;
    
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${circle.id}/${type}_${Date.now()}.${fileExt}`;
    
    // Get the old URL to delete after successful upload
    const oldUrl = type === 'logo' ? logoUrl : coverImageUrl;
    
    try {
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
      
      const { data: { publicUrl } } = supabase.storage
        .from('circle-assets')
        .getPublicUrl(fileName);
      
      // Delete old image after successful upload
      await deleteOldImage(oldUrl);
      
      if (type === 'logo') {
        setLogoUrl(publicUrl);
      } else {
        setCoverImageUrl(publicUrl);
      }
      
      toast({ title: 'Success', description: `${type === 'logo' ? 'Profile picture' : 'Cover image'} uploaded` });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to upload image. Please try again.', 
        variant: 'destructive' 
      });
    }
  };

  const handleAddRole = async () => {
    if (!circle || !newRoleName.trim()) return;
    
    try {
      const newRole = await createCircleRole(circle.id, { name: newRoleName.trim() });
      setRoles([...roles, newRole]);
      setNewRoleName('');
      setIsAddingRole(false);
      toast({ title: 'Success', description: 'Role created successfully' });
    } catch (error) {
      console.error('Error creating role:', error);
      toast({ title: 'Error', description: 'Failed to create role', variant: 'destructive' });
    }
  };

  const handleUpdateRole = async (roleId: string) => {
    if (!editingRoleName.trim()) return;
    
    try {
      const updated = await updateCircleRole(roleId, { name: editingRoleName.trim() });
      setRoles(roles.map(r => r.id === roleId ? updated : r));
      setEditingRoleId(null);
      setEditingRoleName('');
      toast({ title: 'Success', description: 'Role updated successfully' });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await deleteCircleRole(roleId);
      setRoles(roles.filter(r => r.id !== roleId));
      toast({ title: 'Success', description: 'Role deleted successfully' });
    } catch (error) {
      console.error('Error deleting role:', error);
      toast({ title: 'Error', description: 'Failed to delete role', variant: 'destructive' });
    }
  };

  const handleAddTopicPreset = async () => {
    if (!circle || !newPresetName.trim()) return;
    
    try {
      const newPreset = await createTopicPreset(circle.id, {
        name: newPresetName.trim(),
        topics: newPresetTopics,
        custom_questions: newPresetQuestions
      });
      setTopicPresets([...topicPresets, newPreset]);
      setNewPresetName('');
      setNewPresetTopics([]);
      setNewPresetQuestions([]);
      setIsAddingPreset(false);
      toast({ title: 'Success', description: 'Topic preset created successfully' });
    } catch (error) {
      console.error('Error creating topic preset:', error);
      toast({ title: 'Error', description: 'Failed to create topic preset', variant: 'destructive' });
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Circle Settings</h1>
              <p className="text-sm text-muted-foreground">
                {adminType === 'super_admin' ? 'Super Admin' : adminType === 'creator' ? 'Circle Creator' : 'Circle Admin'}
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Circle Details</CardTitle>
            <CardDescription>Update your circle's basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={logoUrl} />
                  <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">
                    {name?.[0] || 'C'}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <Upload className="h-6 w-6 text-white" />
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                />
              </div>
              <div>
                <h3 className="font-medium">Profile Picture</h3>
                <p className="text-sm text-muted-foreground">Click on the image to change</p>
              </div>
            </div>

            {/* Cover Image */}
            <div>
              <Label>Cover Image</Label>
              <div className="relative group mt-2">
                <div 
                  className="h-32 rounded-lg bg-gradient-primary overflow-hidden"
                  style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                >
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" onClick={() => coverInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Cover
                    </Button>
                  </div>
                </div>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
                />
              </div>
            </div>

            {/* Name & Description */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Circle Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter circle name"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your circle..."
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media</CardTitle>
            <CardDescription>Add links to your circle's social profiles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={socialLinks.website}
                  onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                  placeholder="Website URL"
                />
              </div>
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={socialLinks.instagram}
                  onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                  placeholder="Instagram URL"
                />
              </div>
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={socialLinks.facebook}
                  onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                  placeholder="Facebook URL"
                />
              </div>
              <div className="flex items-center gap-2">
                <Linkedin className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={socialLinks.linkedin}
                  onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                  placeholder="LinkedIn URL"
                />
              </div>
              <div className="flex items-center gap-2">
                <Youtube className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={socialLinks.youtube}
                  onChange={(e) => setSocialLinks({ ...socialLinks, youtube: e.target.value })}
                  placeholder="YouTube URL"
                />
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <Input
                  value={socialLinks.email}
                  onChange={(e) => setSocialLinks({ ...socialLinks, email: e.target.value })}
                  placeholder="Contact Email"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Circle Roles */}
        <Card>
          <CardHeader>
            <CardTitle>Circle Roles</CardTitle>
            <CardDescription>Define roles for members in your circle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 p-4 border rounded-lg bg-muted/30">
              {/* System Roles (Locked) */}
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                <Lock className="h-3 w-3" />
                Creator
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                <Lock className="h-3 w-3" />
                Admin
              </div>
              
              {/* Custom Roles */}
              {roles.map((role) => (
                <div key={role.id} className="group relative">
                  {editingRoleId === role.id ? (
                    <div className="flex items-center gap-1">
                      <Input
                        value={editingRoleName}
                        onChange={(e) => setEditingRoleName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUpdateRole(role.id)}
                        className="h-8 w-28 text-sm"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleUpdateRole(role.id)}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingRoleId(null)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div 
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border text-sm cursor-pointer hover:border-primary transition-colors"
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setEditingRoleName(role.name);
                      }}
                    >
                      {role.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRole(role.id);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Add New Role */}
              {isAddingRole ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                    placeholder="Role name"
                    className="h-8 w-28 text-sm"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleAddRole}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsAddingRole(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingRole(true)}
                  className="flex items-center justify-center h-8 w-8 rounded-full border border-dashed border-muted-foreground/50 hover:border-primary hover:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Click on a role to edit it. Creator and Admin roles cannot be modified.</p>
          </CardContent>
        </Card>

        {/* Topic Presets */}
        <Card>
          <CardHeader>
            <CardTitle>Topic Presets</CardTitle>
            <CardDescription>Create conversation topic presets for your circle members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Presets */}
            {topicPresets.map((preset) => (
              <div key={preset.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{preset.name}</h4>
                </div>
                {preset.description && (
                  <p className="text-sm text-muted-foreground mb-2">{preset.description}</p>
                )}
                {preset.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {preset.topics.map((topic, i) => (
                      <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs">{topic}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Add New Preset */}
            {isAddingPreset ? (
              <div className="p-4 border rounded-lg space-y-4">
                <Input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name"
                />
                <div>
                  <Label className="text-sm">Custom Questions</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newPresetQuestion}
                      onChange={(e) => setNewPresetQuestion(e.target.value)}
                      placeholder="Add a conversation starter question"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newPresetQuestion.trim()) {
                          setNewPresetQuestions([...newPresetQuestions, newPresetQuestion.trim()]);
                          setNewPresetQuestion('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newPresetQuestion.trim()) {
                          setNewPresetQuestions([...newPresetQuestions, newPresetQuestion.trim()]);
                          setNewPresetQuestion('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {newPresetQuestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {newPresetQuestions.map((q, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex-1">{q}</span>
                          <button onClick={() => setNewPresetQuestions(newPresetQuestions.filter((_, idx) => idx !== i))}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddTopicPreset} disabled={!newPresetName.trim()}>
                    Create Preset
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsAddingPreset(false);
                    setNewPresetName('');
                    setNewPresetQuestions([]);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setIsAddingPreset(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Topic Preset
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone (only for Creator and Super Admin) */}
        {(adminType === 'creator' || adminType === 'super_admin') && (
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions for this circle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Circle</p>
                  <p className="text-sm text-muted-foreground">Permanently delete this circle and all its data</p>
                </div>
                <Button variant="destructive" disabled>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Circle
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

