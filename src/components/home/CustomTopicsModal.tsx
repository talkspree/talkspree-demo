import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HoverHint } from '@/components/common/HoverHint';
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
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAllTopics, setShowAllTopics] = useState(false);

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

  // Load topics when modal opens; reset expand state each time
  useEffect(() => {
    if (open) {
      loadTopics();
      setShowAllTopics(false);
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
        setFormError('Maximum 5 topics allowed');
        setTimeout(() => setFormError(null), 3000);
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
      setFormError('Please enter a preset name');
      return;
    }
    if (selectedTopicIds.length === 0 && customQuestions.length === 0) {
      setFormError('Select at least 1 topic or add a custom question');
      return;
    }
    setFormError(null);
    
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
        await updateUserPreset(editingPresetId, {
          name: presetName,
          defaultTopicIds,
          circleTopicIds,
          userTopicIds,
          customQuestions
        });
      } else {
        await createUserPreset({
          name: presetName,
          defaultTopicIds,
          circleTopicIds,
          userTopicIds,
          customQuestions
        });
      }

      await onSavePreset();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error saving preset:', error);
      setFormError('Failed to save preset. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUseOnce = () => {
    if (selectedTopicIds.length === 0 && customQuestions.length === 0) {
      setFormError('Select at least 1 topic or add a custom question');
      return;
    }
    const topicNames = availableTopics
      .filter(t => selectedTopicIds.includes(t.id))
      .map(t => t.name);

    onUseOnce?.(topicNames, customQuestions.length > 0 ? customQuestions : undefined);
    onOpenChange(false);
  };

  const handleDeletePreset = async () => {
    if (!editingPresetId) return;
    
    setSaving(true);
    try {
      await deleteUserPreset(editingPresetId);
      await onDeletePreset?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error deleting preset:', error);
      setFormError('Failed to delete preset. Please try again.');
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
    <TooltipProvider>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar w-[calc(100%-2rem)] rounded-2xl sm:w-full">
        <DialogHeader>
          <DialogTitle>{editingPresetId ? 'Edit Topic Preset' : 'Create Custom Topic Preset'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 sm:py-2">
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

          {/* Topics from database */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Topics</span>
              <span className={`text-sm font-semibold tabular-nums ${
                selectedTopicIds.length === 5
                  ? 'text-green-600 dark:text-green-400'
                  : selectedTopicIds.length > 0
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}>
                {selectedTopicIds.length}/5
              </span>
              {loadingTopics && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            </div>

            {/* Badge grid — clipped to 4 rows (~200px) until expanded */}
            <div
              className={`flex flex-wrap gap-1.5 overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                showAllTopics ? '' : 'max-h-[180px]'
              }`}
            >
              {availableTopics.map((topic) => (
                <HoverHint key={topic.id} content={topic.description} side="top">
                  <Badge
                    variant={selectedTopicIds.includes(topic.id) ? 'default' : 'secondary'}
                    className={`cursor-pointer px-5 py-2 text-sm ${
                      topic.type === 'user' ? 'border-2 border-purple-300' : 
                      topic.type === 'circle' ? '' : ''
                    } ${selectedTopicIds.includes(topic.id) ? 'border-none' : ''}`}
                    onClick={() => toggleTopic(topic.id)}
                  >
                    {topic.name}
                  </Badge>
                </HoverHint>
              ))}
            </div>

            <button
              type="button"
              className="text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors ml-1"
              onClick={() => setShowAllTopics(v => !v)}
            >
              {showAllTopics ? '↑ Show less' : 'Show all topics ↓'}
            </button>
          </div>

          {/* Custom Questions Section - EDITABLE */}
          <div className="space-y-3 pt-4 border-t pb-4">
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
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
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
    </TooltipProvider>
  );
}
