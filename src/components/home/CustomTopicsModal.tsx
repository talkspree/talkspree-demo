import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  getVisibleTopics,
  createUserPreset,
  updateUserPreset,
  deleteUserPreset,
  UnifiedTopic,
} from '@/lib/api/topics';

interface CustomTopicsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPresetId?: string | null;
  circleId?: string | null;
  tempCustomData?: { topics: string[]; customQuestions?: string[] } | null;
  onSavePreset: () => void | Promise<void>;
  onUseOnce?: (topics: string[], customQuestions?: string[]) => void;
  onDeletePreset?: () => void | Promise<void>;
}

export function CustomTopicsModal({ 
  open, 
  onOpenChange, 
  editingPresetId, 
  circleId,
  tempCustomData, 
  onSavePreset, 
  onUseOnce, 
  onDeletePreset 
}: CustomTopicsModalProps) {
  const [presetName, setPresetName] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Available topics from database
  const [availableTopics, setAvailableTopics] = useState<UnifiedTopic[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // Load available topics
  const loadTopics = useCallback(async () => {
    setLoadingTopics(true);
    try {
      // Pass circleId to get circle-specific topics
      const topics = await getVisibleTopics(circleId);
      setAvailableTopics(topics);
    } catch (error) {
      console.error('Error loading topics:', error);
    } finally {
      setLoadingTopics(false);
    }
  }, [circleId]);

  // Load topics when modal opens
  useEffect(() => {
    if (open) {
      loadTopics();
    }
  }, [open, loadTopics]);

  // Load editing preset data
  useEffect(() => {
    const loadEditingData = async () => {
      if (editingPresetId) {
        try {
          // Load user preset from database
          const { data: preset } = await supabase
            .from('user_presets')
            .select('*')
            .eq('id', editingPresetId)
            .single();
          
          if (preset) {
            setPresetName(preset.name);
            // Combine all topic IDs
            const allTopicIds = [
              ...(preset.default_topic_ids || []),
              ...(preset.circle_topic_ids || []),
              ...(preset.user_topic_ids || [])
            ];
            setSelectedTopicIds(allTopicIds);
            // Load custom questions (these are editable)
            setCustomQuestions(preset.custom_questions || []);
          }
        } catch (error) {
          console.error('Error loading preset:', error);
        }
      } else if (tempCustomData) {
        setPresetName('');
        setSelectedTopicIds([]);
        setCustomQuestions(tempCustomData.customQuestions || []);
      } else {
        setPresetName('');
        setSelectedTopicIds([]);
        setCustomQuestions([]);
        setNewQuestion('');
      }
      setNameError(false);
    };
    
    if (open) {
      loadEditingData();
    }
  }, [editingPresetId, tempCustomData, open]);

  const toggleTopic = (topicId: string) => {
    if (selectedTopicIds.includes(topicId)) {
      setSelectedTopicIds(selectedTopicIds.filter(t => t !== topicId));
    } else {
      if (selectedTopicIds.length < 5) {
        setSelectedTopicIds([...selectedTopicIds, topicId]);
      } else {
        toast({ description: 'Maximum 5 topics allowed', variant: 'destructive' });
      }
    }
  };

  const addCustomQuestion = () => {
    if (newQuestion.trim()) {
      setCustomQuestions([...customQuestions, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const removeCustomQuestion = (idx: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== idx));
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      setNameError(true);
      toast({ description: 'Please enter a preset name', variant: 'destructive' });
      return;
    }
    if (selectedTopicIds.length === 0 && customQuestions.length === 0) {
      toast({ description: 'Select at least 1 topic or add a custom question', variant: 'destructive' });
      return;
    }
    
    setSaving(true);
    try {
      // Categorize selected topics by type
      const defaultTopicIds: string[] = [];
      const circleTopicIds: string[] = [];
      const userTopicIds: string[] = [];
      
      for (const topicId of selectedTopicIds) {
        const topic = availableTopics.find(t => t.id === topicId);
        if (topic) {
          if (topic.type === 'default') {
            defaultTopicIds.push(topicId);
          } else if (topic.type === 'circle') {
            circleTopicIds.push(topicId);
          } else if (topic.type === 'user') {
            userTopicIds.push(topicId);
          }
        }
      }
      
      if (editingPresetId) {
        // Update existing preset - save custom questions directly
        await updateUserPreset(editingPresetId, {
          name: presetName,
          defaultTopicIds,
          circleTopicIds,
          userTopicIds,
          customQuestions // Save as editable custom questions, NOT a frozen topic
        });
        toast({ description: 'Preset updated successfully!' });
      } else {
        // Create new preset - save custom questions directly
        await createUserPreset({
          name: presetName,
          defaultTopicIds,
          circleTopicIds,
          userTopicIds,
          customQuestions // Save as editable custom questions, NOT a frozen topic
        });
        toast({ description: 'Preset saved successfully!' });
      }
      
      await onSavePreset();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving preset:', error);
      toast({ description: 'Failed to save preset', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleUseOnce = () => {
    if (selectedTopicIds.length === 0 && customQuestions.length === 0) {
      toast({ description: 'Select at least 1 topic or add a custom question', variant: 'destructive' });
      return;
    }
    // Get topic names from IDs for legacy compatibility
    const topicNames = availableTopics
      .filter(t => selectedTopicIds.includes(t.id))
      .map(t => t.name);
    
    onUseOnce?.(topicNames, customQuestions.length > 0 ? customQuestions : undefined);
    onOpenChange(false);
    toast({ description: 'Custom topics applied!' });
  };

  const handleDeletePreset = async () => {
    if (!editingPresetId) return;
    
    setSaving(true);
    try {
      await deleteUserPreset(editingPresetId);
      await onDeletePreset?.();
      onOpenChange(false);
      toast({ description: 'Preset deleted successfully!' });
      resetForm();
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast({ description: 'Failed to delete preset', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setPresetName('');
    setSelectedTopicIds([]);
    setCustomQuestions([]);
    setNewQuestion('');
    setNameError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle>{editingPresetId ? 'Edit Topic Preset' : 'Create Custom Topic Preset'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="preset-name">Preset Name</Label>
            <Input
              id="preset-name"
              placeholder="e.g., Deep Conversations"
              value={presetName}
              onChange={(e) => {
                setPresetName(e.target.value);
                setNameError(false);
              }}
              className={nameError ? 'border-red-500 border-2' : ''}
            />
            {nameError && <p className="text-xs text-red-500">Please enter a preset name</p>}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-destructive font-medium">
              Select Minimum 1; Maximum 5
            </div>
            {loadingTopics && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Topics from database */}
          <div className="flex flex-wrap gap-2">
            {availableTopics.map((topic) => (
              <Badge
                key={topic.id}
                variant={selectedTopicIds.includes(topic.id) ? 'default' : 'secondary'}
                className={`cursor-pointer px-5 py-2 text-sm ${
                  topic.type === 'user' ? 'border-2 border-purple-300' : 
                  topic.type === 'circle' ? '' : ''
                } ${selectedTopicIds.includes(topic.id) ? 'border-none' : ''}`}
                onClick={() => toggleTopic(topic.id)}
              >
                {topic.name}
              </Badge>
            ))}
          </div>

          {/* Custom Questions Section - EDITABLE */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-semibold">Your Custom Questions</Label>
            <p className="text-xs text-muted-foreground">
              Add your own conversation starters. These stay editable and are saved with this preset.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Type your own questions here..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomQuestion()}
                className="flex-1"
              />
              <Button size="icon" onClick={addCustomQuestion} className="shrink-0">
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {customQuestions.length > 0 && (
              <div className="space-y-2">
                {customQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 shrink-0 text-destructive"
                      onClick={() => removeCustomQuestion(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <span className="text-sm flex-1">{q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Button 
                onClick={handleSavePreset} 
                disabled={saving || (selectedTopicIds.length === 0 && customQuestions.length === 0)}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Preset
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              {!editingPresetId && (
                <Button 
                  variant="secondary" 
                  onClick={handleUseOnce}
                  disabled={saving || (selectedTopicIds.length === 0 && customQuestions.length === 0)}
                >
                  Use Once
                </Button>
              )}
            </div>
            {editingPresetId && onDeletePreset && (
              <Button 
                variant="destructive" 
                onClick={handleDeletePreset}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
