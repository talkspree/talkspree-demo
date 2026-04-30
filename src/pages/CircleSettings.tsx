import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Save, Plus, X, Pencil, Trash2, Globe, Instagram, Facebook, Linkedin, Mail, Youtube, Lock, Loader2, ChevronDown, ChevronUp, Monitor, Smartphone, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { toast } from '@/hooks/use-toast';
import { useCircleRole } from '@/hooks/useCircleRole';
import { CircleCardPreview } from '@/components/circle/CircleCardPreview';
import { 
  getOrCreateDefaultCircle,
  invalidateDefaultCircleCache,
  updateCircle, 
  getCircleRoles, 
  createCircleRole, 
  updateCircleRole, 
  deleteCircleRole,
  toggleDefaultPreset,
  toggleMemberCustomTopics,
  CircleRole,
  Circle
} from '@/lib/api/circles';
import {
  getCircleTopics,
  getCirclePresets,
  getDefaultTopics,
  getDefaultPresets,
  createCircleTopic,
  updateCircleTopic,
  deleteCircleTopic,
  createCirclePreset,
  updateCirclePreset,
  deleteCirclePreset,
  DefaultTopic,
  DefaultPreset,
  CircleTopic,
  CirclePreset
} from '@/lib/api/topics';
import { supabase } from '@/lib/supabase';
import { ImageCropModal } from '@/components/ui/ImageCropModal';

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
  const [abbreviation, setAbbreviation] = useState('');
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    instagram: '',
    facebook: '',
    linkedin: '',
    email: '',
    youtube: ''
  });

  // Preview viewport toggle (desktop / mobile) – preview pane is desktop-only.
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  
  // Roles
  const [roles, setRoles] = useState<CircleRole[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleName, setEditingRoleName] = useState('');
  
  // Topics (circle-specific)
  const [circleTopics, setCircleTopics] = useState<CircleTopic[]>([]);
  const [defaultTopics, setDefaultTopics] = useState<DefaultTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicQuestions, setNewTopicQuestions] = useState<string[]>([]);
  const [newTopicQuestion, setNewTopicQuestion] = useState('');
  
  // Editing topics
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicName, setEditingTopicName] = useState('');
  const [editingTopicQuestions, setEditingTopicQuestions] = useState<string[]>([]);
  const [editingTopicNewQuestion, setEditingTopicNewQuestion] = useState('');
  const [expandedTopicId, setExpandedTopicId] = useState<string | null>(null);
  
  // Editing presets
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  const [editingPresetTopicIds, setEditingPresetTopicIds] = useState<string[]>([]);
  
  // Topic Presets (default + circle-specific)
  const [defaultPresets, setDefaultPresets] = useState<DefaultPreset[]>([]);
  const [disabledDefaultPresetIds, setDisabledDefaultPresetIds] = useState<string[]>([]);
  const [allowMemberCustomTopics, setAllowMemberCustomTopics] = useState(true);
  const [circlePresets, setCirclePresets] = useState<CirclePreset[]>([]);
  const [isAddingPreset, setIsAddingPreset] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetTopicIds, setNewPresetTopicIds] = useState<string[]>([]);
  const [savingPreset, setSavingPreset] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Crop modal state
  const [cropSource, setCropSource] = useState<File | null>(null);
  const [cropTarget, setCropTarget] = useState<'logo' | 'cover' | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Load topics and presets for circle
  const loadTopicsAndPresets = useCallback(async (circleId: string) => {
    setLoadingTopics(true);
    try {
      // Load default topics
      const defTopics = await getDefaultTopics();
      setDefaultTopics(defTopics);
      
      // Load default presets
      const defPresets = await getDefaultPresets();
      setDefaultPresets(defPresets);
      
      // Load circle-specific topics
      const cTopics = await getCircleTopics(circleId);
      setCircleTopics(cTopics);
      
      // Load circle-specific presets
      const cPresets = await getCirclePresets(circleId);
      setCirclePresets(cPresets);
    } catch (error) {
      console.warn('Could not load topics/presets:', error);
    } finally {
      setLoadingTopics(false);
    }
  }, []);

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
        setAbbreviation(circleData.abbreviation || '');
        
        // Load disabled default preset IDs
        setDisabledDefaultPresetIds(circleData.disabled_default_preset_ids || []);
        
        // Load member custom topics permission (default true when column doesn't exist yet)
        setAllowMemberCustomTopics(circleData.allow_member_custom_topics ?? true);
        
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
        
        // Load topics and presets
        await loadTopicsAndPresets(circleData.id);
      } catch (error) {
        console.error('Error loading circle data:', error);
        toast({ title: 'Error', description: 'Failed to load circle settings', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [loadTopicsAndPresets]);

  // Redirect if not admin
  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      toast({ title: 'Access Denied', description: 'You must be an admin to access this page', variant: 'destructive' });
      navigate('/');
    }
  }, [roleLoading, isAdmin, navigate]);

  // Abbreviation must be 2-10 chars, A-Z / 0-9 only. Mirrors the DB constraint
  // in migration 078 so we fail fast in the UI before round-tripping.
  const ABBREVIATION_REGEX = /^[A-Z0-9]{2,10}$/;
  const normalisedAbbreviation = abbreviation.trim().toUpperCase();
  const abbreviationError = (() => {
    if (!normalisedAbbreviation) return 'Abbreviation is required';
    if (!ABBREVIATION_REGEX.test(normalisedAbbreviation)) {
      return '2–10 characters, letters and numbers only';
    }
    return null;
  })();

  const handleSave = async () => {
    if (!circle) return;

    if (abbreviationError) {
      toast({ title: 'Invalid abbreviation', description: abbreviationError, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const saved = await updateCircle(circle.id, {
        name,
        description,
        logo_url: logoUrl || null,
        cover_image_url: coverImageUrl || null,
        social_links: socialLinks,
        abbreviation: normalisedAbbreviation,
      });

      invalidateDefaultCircleCache();
      setCircle(prev => prev ? { ...prev, name, abbreviation: saved?.abbreviation ?? normalisedAbbreviation } : prev);
      // Reflect any server-side normalisation (uppercasing) in the input.
      if (saved?.abbreviation) setAbbreviation(saved.abbreviation);

      toast({ title: 'Success', description: 'Circle settings saved successfully' });
    } catch (error) {
      console.error('Error saving circle:', error);
      // Postgres unique-violation surfaces here when the abbreviation is taken.
      const err = error as { code?: string; message?: string } | null;
      const isAbbrevConflict = err?.code === '23505' && (err?.message || '').toLowerCase().includes('abbreviation');
      toast({
        title: 'Error',
        description: isAbbrevConflict
          ? 'That abbreviation is already taken. Please pick another.'
          : 'Failed to save circle settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Preview data – kept in sync with the form fields so the preview pane
  // updates live as admins edit.
  const previewData = useMemo(() => ({
    name,
    description,
    logoUrl,
    coverImageUrl,
    abbreviation: normalisedAbbreviation,
    socialLinks,
  }), [name, description, logoUrl, coverImageUrl, normalisedAbbreviation, socialLinks]);

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

  /**
   * Selecting a file no longer uploads directly. Instead, it opens the
   * crop modal so the admin can frame the image.
   */
  const handleImagePick = (file: File, type: 'logo' | 'cover') => {
    setCropSource(file);
    setCropTarget(type);
    setShowCropModal(true);
    // Allow the same file to be re-picked later
    if (type === 'logo' && logoInputRef.current) logoInputRef.current.value = '';
    if (type === 'cover' && coverInputRef.current) coverInputRef.current.value = '';
  };

  const uploadImageToStorage = async (file: File, type: 'logo' | 'cover') => {
    if (!circle) return;

    const fileName = `${circle.id}/${type}_${Date.now()}.jpg`;
    const oldUrl = type === 'logo' ? logoUrl : coverImageUrl;

    try {
      const { error: uploadError } = await supabase.storage
        .from('circle-assets')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('circle-assets')
        .getPublicUrl(fileName);

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
        variant: 'destructive',
      });
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    if (!cropTarget) return;
    await uploadImageToStorage(croppedFile, cropTarget);
    setCropSource(null);
    setCropTarget(null);
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

  // Handle adding a new circle topic
  const handleAddCircleTopic = async () => {
    if (!circle || !newTopicName.trim()) return;
    
    try {
      const newTopic = await createCircleTopic(circle.id, {
        name: newTopicName.trim(),
        questions: newTopicQuestions
      });
      setCircleTopics([...circleTopics, newTopic]);
      setNewTopicName('');
      setNewTopicQuestions([]);
      setNewTopicQuestion('');
      setIsAddingTopic(false);
      toast({ title: 'Success', description: 'Topic created successfully' });
    } catch (error) {
      console.error('Error creating topic:', error);
      toast({ title: 'Error', description: 'Failed to create topic', variant: 'destructive' });
    }
  };

  // Handle deleting a circle topic
  const handleDeleteCircleTopic = async (topicId: string) => {
    try {
      await deleteCircleTopic(topicId);
      setCircleTopics(circleTopics.filter(t => t.id !== topicId));
      toast({ title: 'Success', description: 'Topic deleted successfully' });
    } catch (error) {
      console.error('Error deleting topic:', error);
      toast({ title: 'Error', description: 'Failed to delete topic', variant: 'destructive' });
    }
  };

  // Handle starting to edit a topic
  const startEditingTopic = (topic: CircleTopic) => {
    setEditingTopicId(topic.id);
    setEditingTopicName(topic.name);
    setEditingTopicQuestions([...topic.questions]);
    setEditingTopicNewQuestion('');
    setExpandedTopicId(topic.id);
  };

  // Handle saving a topic edit
  const handleSaveTopicEdit = async () => {
    if (!editingTopicId || !editingTopicName.trim()) return;
    
    try {
      const updated = await updateCircleTopic(editingTopicId, {
        name: editingTopicName.trim(),
        questions: editingTopicQuestions
      });
      setCircleTopics(circleTopics.map(t => t.id === editingTopicId ? updated : t));
      setEditingTopicId(null);
      toast({ title: 'Success', description: 'Topic updated successfully' });
    } catch (error) {
      console.error('Error updating topic:', error);
      toast({ title: 'Error', description: 'Failed to update topic', variant: 'destructive' });
    }
  };

  // Handle canceling topic edit
  const cancelTopicEdit = () => {
    setEditingTopicId(null);
    setEditingTopicName('');
    setEditingTopicQuestions([]);
    setEditingTopicNewQuestion('');
  };

  // Handle adding a new circle preset
  const handleAddCirclePreset = async () => {
    if (!circle || !newPresetName.trim()) return;
    if (newPresetTopicIds.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one topic', variant: 'destructive' });
      return;
    }
    
    setSavingPreset(true);
    try {
      // Categorize selected topics by type
      const defaultTopicIds: string[] = [];
      const circleTopicIds: string[] = [];
      
      for (const topicId of newPresetTopicIds) {
        // Check if it's a default topic
        if (defaultTopics.some(t => t.id === topicId)) {
          defaultTopicIds.push(topicId);
        } else if (circleTopics.some(t => t.id === topicId)) {
          circleTopicIds.push(topicId);
        }
      }
      
      const newPreset = await createCirclePreset(circle.id, {
        name: newPresetName.trim(),
        defaultTopicIds,
        circleTopicIds
      });
      setCirclePresets([...circlePresets, newPreset]);
      setNewPresetName('');
      setNewPresetTopicIds([]);
      setIsAddingPreset(false);
      toast({ title: 'Success', description: 'Preset created successfully' });
    } catch (error) {
      console.error('Error creating preset:', error);
      toast({ title: 'Error', description: 'Failed to create preset', variant: 'destructive' });
    } finally {
      setSavingPreset(false);
    }
  };

  // Handle deleting a circle preset
  const handleDeleteCirclePreset = async (presetId: string) => {
    try {
      await deleteCirclePreset(presetId);
      setCirclePresets(circlePresets.filter(p => p.id !== presetId));
      toast({ title: 'Success', description: 'Preset deleted successfully' });
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast({ title: 'Error', description: 'Failed to delete preset', variant: 'destructive' });
    }
  };

  // Handle starting to edit a preset
  const startEditingPreset = (preset: CirclePreset) => {
    setEditingPresetId(preset.id);
    setEditingPresetName(preset.name);
    setEditingPresetTopicIds([...(preset.default_topic_ids || []), ...(preset.circle_topic_ids || [])]);
  };

  // Handle saving a preset edit
  const handleSavePresetEdit = async () => {
    if (!editingPresetId || !editingPresetName.trim()) return;
    
    // Categorize topics
    const defaultTopicIds: string[] = [];
    const circleTopicIds: string[] = [];
    
    for (const topicId of editingPresetTopicIds) {
      if (defaultTopics.some(t => t.id === topicId)) {
        defaultTopicIds.push(topicId);
      } else if (circleTopics.some(t => t.id === topicId)) {
        circleTopicIds.push(topicId);
      }
    }
    
    try {
      const updated = await updateCirclePreset(editingPresetId, {
        name: editingPresetName.trim(),
        defaultTopicIds,
        circleTopicIds
      });
      setCirclePresets(circlePresets.map(p => p.id === editingPresetId ? updated : p));
      setEditingPresetId(null);
      toast({ title: 'Success', description: 'Preset updated successfully' });
    } catch (error) {
      console.error('Error updating preset:', error);
      toast({ title: 'Error', description: 'Failed to update preset', variant: 'destructive' });
    }
  };

  // Toggle topic in editing preset
  const toggleEditingPresetTopic = (topicId: string) => {
    if (editingPresetTopicIds.includes(topicId)) {
      setEditingPresetTopicIds(editingPresetTopicIds.filter(id => id !== topicId));
    } else {
      if (editingPresetTopicIds.length < 5) {
        setEditingPresetTopicIds([...editingPresetTopicIds, topicId]);
      } else {
        toast({ description: 'Maximum 5 topics per preset', variant: 'destructive' });
      }
    }
  };

  // Handle toggling a default preset
  const handleToggleDefaultPreset = async (presetId: string, enabled: boolean) => {
    if (!circle) return;
    
    try {
      await toggleDefaultPreset(circle.id, presetId, enabled);
      
      // Update local state
      if (enabled) {
        setDisabledDefaultPresetIds(disabledDefaultPresetIds.filter(id => id !== presetId));
      } else {
        setDisabledDefaultPresetIds([...disabledDefaultPresetIds, presetId]);
      }
      
      toast({ 
        title: 'Success', 
        description: `Preset ${enabled ? 'enabled' : 'disabled'} successfully` 
      });
    } catch (error) {
      console.error('Error toggling preset:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to toggle preset', 
        variant: 'destructive' 
      });
    }
  };

  // Handle toggling whether members can use the Custom topic feature
  const handleToggleMemberCustomTopics = async (enabled: boolean) => {
    if (!circle) return;
    
    try {
      await toggleMemberCustomTopics(circle.id, enabled);
      setAllowMemberCustomTopics(enabled);
      toast({ 
        title: 'Success', 
        description: `Custom topics for members ${enabled ? 'enabled' : 'disabled'}` 
      });
    } catch (error) {
      console.error('Error toggling member custom topics:', error);
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    }
  };

  // Toggle topic selection for new preset
  const togglePresetTopic = (topicId: string) => {
    if (newPresetTopicIds.includes(topicId)) {
      setNewPresetTopicIds(newPresetTopicIds.filter(id => id !== topicId));
    } else {
      if (newPresetTopicIds.length < 5) {
        setNewPresetTopicIds([...newPresetTopicIds, topicId]);
      } else {
        toast({ description: 'Maximum 5 topics per preset', variant: 'destructive' });
      }
    }
  };

  // All available topics (default + circle)
  const allAvailableTopics = [...defaultTopics, ...circleTopics];

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
          <Button onClick={handleSave} disabled={saving || !!abbreviationError}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 max-w-6xl space-y-8">
        {/* Circle Details — split into preview (desktop only) + form */}
        <Card>
          <CardHeader>
            <CardTitle>Circle Details</CardTitle>
            <CardDescription>Update your circle's basic information. Changes appear live in the preview.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Column layout: preview gets a fixed narrower column so the form has more breathing room */}
            <div className="grid grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] gap-8">
              {/* LEFT: Preview pane (desktop only) */}
              <div className="hidden lg:flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-sm">Live preview</h3>
                    <p className="text-xs text-muted-foreground">How your card will look on the homepage.</p>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={previewViewport}
                    onValueChange={(value) => {
                      if (value === 'desktop' || value === 'mobile') setPreviewViewport(value);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <ToggleGroupItem value="desktop" aria-label="Desktop preview" className="gap-1.5">
                      <Monitor className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline text-xs">Desktop</span>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="mobile" aria-label="Mobile preview" className="gap-1.5">
                      <Smartphone className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline text-xs">Mobile</span>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 p-4">
                  {previewViewport === 'desktop' ? (
                    /*
                     * `zoom` scales layout AND visual size together, so no phantom
                     * whitespace. The card renders at its true 400 px width internally
                     * and the browser presents it at 70 % — preserving exact proportions.
                     */
                    <div style={{ zoom: 0.7 }}>
                      <CircleCardPreview data={previewData} viewport="desktop" />
                    </div>
                  ) : (
                    <CircleCardPreview data={previewData} viewport="mobile" />
                  )}
                </div>
              </div>

              {/* RIGHT: Form */}
              <div className="space-y-6">
                {/* Circle Name (top) */}
                <div>
                  <Label htmlFor="name">Circle Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter circle name"
                    maxLength={80}
                  />
                </div>

                {/* Profile Picture */}
                <div className="space-y-2">
                  <Label>Profile Picture</Label>
                  <div className="flex items-start gap-4">
                    <div className="relative group flex-shrink-0">
                      <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                        <AvatarImage src={logoUrl} />
                        <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">
                          {name?.[0] || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Upload className="h-6 w-6 text-white" />
                      </button>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImagePick(e.target.files[0], 'logo')}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload new
                      </Button>
                      <ul className="mt-3 text-xs text-muted-foreground space-y-1 leading-relaxed">
                        <li><span className="font-medium text-foreground">Aspect:</span> 1:1 (square — displayed as a circle)</li>
                        <li><span className="font-medium text-foreground">Recommended:</span> 512×512 px or larger</li>
                        <li><span className="font-medium text-foreground">Formats:</span> JPG, PNG, WebP</li>
                        <li><span className="font-medium text-foreground">Max size:</span> 5 MB</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                  <Label>Cover Image</Label>
                  <div className="flex items-start gap-4">
                    {/* Thumbnail preview — shows the full image at 16:9, no crop */}
                    <div className="relative group flex-shrink-0">
                      <div
                        className="w-36 rounded-lg overflow-hidden border border-border shadow-sm bg-gradient-primary"
                        style={{ aspectRatio: '16/9' }}
                      >
                        {coverImageUrl ? (
                          <img
                            src={coverImageUrl}
                            alt="Cover"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-primary opacity-80" />
                        )}
                        <button
                          type="button"
                          onClick={() => coverInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Upload className="h-5 w-5 text-white" />
                        </button>
                      </div>
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && handleImagePick(e.target.files[0], 'cover')}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Upload new
                      </Button>
                      <ul className="mt-3 text-xs text-muted-foreground space-y-1 leading-relaxed">
                        <li><span className="font-medium text-foreground">Usage:</span> Backgrounds the entire circle card — image is centered and cropped to fit</li>
                        <li><span className="font-medium text-foreground">Key visible area:</span> Top strip ≈ 400×128 px (3.1:1) on desktop; full-width × 128 px on mobile</li>
                        <li><span className="font-medium text-foreground">Recommended:</span> 800×256 px minimum — keep the main subject centred near the top</li>
                        <li><span className="font-medium text-foreground">Formats:</span> JPG, PNG, WebP</li>
                        <li><span className="font-medium text-foreground">Max size:</span> 5 MB</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Description */}
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

                {/* Abbreviation (new) */}
                <div className="space-y-2">
                  <Label htmlFor="abbreviation" className="flex items-center gap-1.5">
                    Abbreviation
                    <span className="text-xs font-normal text-muted-foreground">(invite link & admin identifier)</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="abbreviation"
                      value={abbreviation}
                      onChange={(e) => setAbbreviation(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10))}
                      placeholder="e.g. MTY"
                      maxLength={10}
                      className={`font-mono uppercase tracking-wider w-40 ${abbreviationError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    <span className="text-xs text-muted-foreground tabular-nums">{normalisedAbbreviation.length}/10</span>
                  </div>
                  {abbreviationError ? (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {abbreviationError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>
                        2–10 uppercase letters / numbers. Must be unique across TalkSpree. Used in the invite link
                        <span className="font-mono"> talkspree.com/{normalisedAbbreviation || 'XXXX'}/invite</span>.
                      </span>
                    </p>
                  )}
                </div>
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

        {/* Circle Custom Topics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Circle Topics</CardTitle>
              {loadingTopics && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <CardDescription>Create custom topics with questions for your circle. These will be available to all members.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing Circle Topics - Expandable */}
            {circleTopics.length > 0 && (
              <div className="space-y-2">
                {circleTopics.map((topic) => (
                  <div key={topic.id} className="border rounded-lg overflow-hidden">
                    {/* Topic Header */}
                    <div 
                      className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedTopicId(expandedTopicId === topic.id ? null : topic.id)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedTopicId === topic.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span className="font-medium">{topic.name}</span>
                        <span className="text-xs text-muted-foreground">({topic.questions.length} questions)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingTopic(topic);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCircleTopic(topic.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedTopicId === topic.id && (
                      <div className="p-3 border-t">
                        {editingTopicId === topic.id ? (
                          // Edit mode
                          <div className="space-y-3">
                            <Input
                              value={editingTopicName}
                              onChange={(e) => setEditingTopicName(e.target.value)}
                              placeholder="Topic name"
                            />
                            <Label className="text-sm">Questions</Label>
                            {editingTopicQuestions.map((q, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                                <span className="flex-1">{q}</span>
                                <button 
                                  onClick={() => setEditingTopicQuestions(editingTopicQuestions.filter((_, idx) => idx !== i))}
                                  className="text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ))}
                            <div className="flex gap-2">
                              <Input
                                value={editingTopicNewQuestion}
                                onChange={(e) => setEditingTopicNewQuestion(e.target.value)}
                                placeholder="Add new question"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && editingTopicNewQuestion.trim()) {
                                    setEditingTopicQuestions([...editingTopicQuestions, editingTopicNewQuestion.trim()]);
                                    setEditingTopicNewQuestion('');
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (editingTopicNewQuestion.trim()) {
                                    setEditingTopicQuestions([...editingTopicQuestions, editingTopicNewQuestion.trim()]);
                                    setEditingTopicNewQuestion('');
                                  }
                                }}
                              >
                                Add
                              </Button>
                            </div>
                            <div className="flex gap-2 pt-2">
                              <Button size="sm" onClick={handleSaveTopicEdit}>Save</Button>
                              <Button size="sm" variant="outline" onClick={cancelTopicEdit}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          // View mode - show questions
                          <div className="space-y-1">
                            {topic.questions.map((q, i) => (
                              <div key={i} className="text-sm p-2 bg-muted/30 rounded">
                                {q}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add New Topic */}
            {isAddingTopic ? (
              <div className="p-4 border rounded-lg space-y-4">
                <Input
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  placeholder="Topic name (e.g., 'Leadership Tips')"
                />
                <div>
                  <Label className="text-sm">Questions for this topic</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={newTopicQuestion}
                      onChange={(e) => setNewTopicQuestion(e.target.value)}
                      placeholder="Add a conversation starter question"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTopicQuestion.trim()) {
                          setNewTopicQuestions([...newTopicQuestions, newTopicQuestion.trim()]);
                          setNewTopicQuestion('');
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (newTopicQuestion.trim()) {
                          setNewTopicQuestions([...newTopicQuestions, newTopicQuestion.trim()]);
                          setNewTopicQuestion('');
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  {newTopicQuestions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {newTopicQuestions.map((q, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                          <span className="flex-1">{q}</span>
                          <button onClick={() => setNewTopicQuestions(newTopicQuestions.filter((_, idx) => idx !== i))}>
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddCircleTopic} disabled={!newTopicName.trim() || newTopicQuestions.length === 0}>
                    Create Topic
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsAddingTopic(false);
                    setNewTopicName('');
                    setNewTopicQuestions([]);
                    setNewTopicQuestion('');
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setIsAddingTopic(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Circle Topic
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Topic Presets */}
        <Card>
          <CardHeader>
            <CardTitle>Topic Presets</CardTitle>
            <CardDescription>Manage conversation presets. Toggle default presets on/off, or create your own circle presets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Member Custom Topics Permission */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="flex-1 pr-4">
                <h5 className="font-medium">Allow Members to Use Custom Topics</h5>
                <p className="text-sm text-muted-foreground mt-0.5">
                  When enabled, members can create personal topic presets and use the "Custom" option before starting a session. Disable this to restrict members to only the topics and presets you define.
                </p>
              </div>
              <Switch
                checked={allowMemberCustomTopics}
                onCheckedChange={handleToggleMemberCustomTopics}
              />
            </div>

            {/* Default Presets - with toggles */}
            {defaultPresets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Default Presets</h4>
                {defaultPresets.map((preset) => {
                  const isEnabled = !disabledDefaultPresetIds.includes(preset.id);
                  return (
                    <div key={preset.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                      <div className="flex-1">
                        <h5 className="font-medium">{preset.name}</h5>
                        {preset.description && (
                          <p className="text-sm text-muted-foreground">{preset.description}</p>
                        )}
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) => handleToggleDefaultPreset(preset.id, checked)}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Circle Presets - with edit/delete */}
            {circlePresets.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">Circle Presets</h4>
                {circlePresets.map((preset) => (
              <div key={preset.id} className="p-4 border rounded-lg">
                {editingPresetId === preset.id ? (
                  // Edit mode
                  <div className="space-y-4">
                    <Input
                      value={editingPresetName}
                      onChange={(e) => setEditingPresetName(e.target.value)}
                      placeholder="Preset name"
                    />
                    <div>
                      <Label className="text-sm mb-2 block">Select Topics (1-5)</Label>
                      <div className="flex flex-wrap gap-2">
                        {defaultTopics.map((topic) => (
                          <Badge
                            key={topic.id}
                            variant={editingPresetTopicIds.includes(topic.id) ? 'default' : 'secondary'}
                            className={`cursor-pointer ${editingPresetTopicIds.includes(topic.id) ? 'shadow-glow' : ''}`}
                            onClick={() => toggleEditingPresetTopic(topic.id)}
                          >
                            {topic.name}
                          </Badge>
                        ))}
                        {circleTopics.map((topic) => (
                          <Badge
                            key={topic.id}
                            variant={editingPresetTopicIds.includes(topic.id) ? 'default' : 'secondary'}
                            className={`cursor-pointer border-2 border-blue-300 ${editingPresetTopicIds.includes(topic.id) ? 'shadow-glow' : ''}`}
                            onClick={() => toggleEditingPresetTopic(topic.id)}
                          >
                            {topic.name} (Circle)
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {editingPresetTopicIds.length}/5 topics selected
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSavePresetEdit}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPresetId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{preset.name}</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditingPreset(preset)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCirclePreset(preset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Show included topics */}
                    <div className="flex flex-wrap gap-1">
                      {(preset.default_topic_ids || []).map(topicId => {
                        const topic = defaultTopics.find(t => t.id === topicId);
                        return topic ? (
                          <Badge key={topicId} variant="secondary" className="text-xs">
                            {topic.name}
                          </Badge>
                        ) : null;
                      })}
                      {(preset.circle_topic_ids || []).map(topicId => {
                        const topic = circleTopics.find(t => t.id === topicId);
                        return topic ? (
                          <Badge key={topicId} variant="secondary" className="text-xs border border-blue-300">
                            {topic.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </>
                )}
              </div>
                ))}
              </div>
            )}

            {/* Add New Circle Preset */}
            {isAddingPreset ? (
              <div className="p-4 border rounded-lg space-y-4">
                <Input
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Preset name (e.g., 'Deep Connections')"
                />
                <div>
                  <Label className="text-sm mb-2 block">Select Topics (1-5)</Label>
                  <div className="flex flex-wrap gap-2">
                    {/* Default topics */}
                    {defaultTopics.map((topic) => (
                      <Badge
                        key={topic.id}
                        variant={newPresetTopicIds.includes(topic.id) ? 'default' : 'secondary'}
                        className={`cursor-pointer ${newPresetTopicIds.includes(topic.id) ? 'shadow-glow' : ''}`}
                        onClick={() => togglePresetTopic(topic.id)}
                      >
                        {topic.name}
                      </Badge>
                    ))}
                    {/* Circle topics */}
                    {circleTopics.map((topic) => (
                      <Badge
                        key={topic.id}
                        variant={newPresetTopicIds.includes(topic.id) ? 'default' : 'secondary'}
                        className={`cursor-pointer border-2 border-blue-300 ${newPresetTopicIds.includes(topic.id) ? 'shadow-glow' : ''}`}
                        onClick={() => togglePresetTopic(topic.id)}
                      >
                        {topic.name} (Circle)
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {newPresetTopicIds.length}/5 topics selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAddCirclePreset} 
                    disabled={!newPresetName.trim() || newPresetTopicIds.length === 0 || savingPreset}
                  >
                    {savingPreset && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Create Preset
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsAddingPreset(false);
                    setNewPresetName('');
                    setNewPresetTopicIds([]);
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

        {/* Image Crop Modal (used for both logo and cover) */}
        <ImageCropModal
          open={showCropModal}
          onOpenChange={(open) => {
            setShowCropModal(open);
            if (!open) {
              setCropSource(null);
              setCropTarget(null);
            }
          }}
          source={cropSource}
          aspect={cropTarget === 'cover' ? 16 / 9 : 1}
          shape={cropTarget === 'cover' ? 'rect' : 'round'}
          outputSize={cropTarget === 'cover' ? 1280 : 512}
          outputFileName={`${cropTarget ?? 'image'}-${Date.now()}.jpg`}
          title={cropTarget === 'cover' ? 'Adjust cover image' : 'Adjust profile picture'}
          onCropComplete={handleCropComplete}
        />

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

