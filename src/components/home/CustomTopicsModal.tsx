import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface CustomTopicsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPreset?: { name: string; topics: string[]; customQuestions?: string[] };
  tempCustomData?: { topics: string[]; customQuestions?: string[] } | null;
  onSavePreset: (name: string, topics: string[], customQuestions?: string[]) => void;
  onUseOnce?: (topics: string[], customQuestions?: string[]) => void;
  onDeletePreset?: () => void;
}

const topicCategories = [
  'Hobbies', 'Career', 'Business advice', 'Investments',
  'Traveling & Trips', 'Politics', 'Values & Beliefs', 'Fun Facts',
  'Would You Rather', 'Bucket List Items', 'This or That', 'Life Lessons',
  'Passions', 'Books & Movies', 'Sports & Wellness', 'Goals & Ambitions', 'Custom'
];

export function CustomTopicsModal({ open, onOpenChange, editingPreset, tempCustomData, onSavePreset, onUseOnce, onDeletePreset }: CustomTopicsModalProps) {
  const [presetName, setPresetName] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [nameError, setNameError] = useState(false);

  // Load editing preset data or temp custom data
  useEffect(() => {
    if (editingPreset) {
      setPresetName(editingPreset.name);
      const regularTopics = editingPreset.topics.filter(t => topicCategories.includes(t));
      setSelectedTopics(regularTopics);
      setCustomQuestions(editingPreset.customQuestions || []);
    } else if (tempCustomData) {
      setPresetName('');
      const regularTopics = tempCustomData.topics.filter(t => topicCategories.includes(t));
      setSelectedTopics(regularTopics);
      setCustomQuestions(tempCustomData.customQuestions || []);
    } else {
      setPresetName('');
      setSelectedTopics([]);
      setCustomQuestions([]);
      setNewQuestion('');
    }
    setNameError(false);
  }, [editingPreset, tempCustomData, open]);

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter(t => t !== topic));
    } else {
      if (selectedTopics.length < 5) {
        setSelectedTopics([...selectedTopics, topic]);
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

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      setNameError(true);
      toast({ description: 'Please enter a preset name', variant: 'destructive' });
      return;
    }
    if (selectedTopics.length === 0 && customQuestions.length === 0) {
      toast({ description: 'Select at least 1 topic or add a custom question', variant: 'destructive' });
      return;
    }
    onSavePreset(presetName, selectedTopics, customQuestions.length > 0 ? customQuestions : undefined);
    onOpenChange(false);
    toast({ description: editingPreset ? 'Preset updated successfully!' : 'Preset saved successfully!' });
    resetForm();
  };

  const handleUseOnce = () => {
    if (selectedTopics.length === 0 && customQuestions.length === 0) {
      toast({ description: 'Select at least 1 topic or add a custom question', variant: 'destructive' });
      return;
    }
    onUseOnce?.(selectedTopics, customQuestions.length > 0 ? customQuestions : undefined);
    onOpenChange(false);
    toast({ description: 'Custom topics applied!' });
  };

  const resetForm = () => {
    setPresetName('');
    setSelectedTopics([]);
    setCustomQuestions([]);
    setNewQuestion('');
    setNameError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPreset ? 'Edit Topic Preset' : 'Create Custom Topic Preset'}</DialogTitle>
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

          <div className="text-sm text-destructive text-right font-medium">
            Select Minimum 1; Maximum 5
          </div>

          {/* Topics */}
          <div className="flex flex-wrap gap-2">
            {topicCategories.map((topic) => (
              <Badge
                key={topic}
                variant={selectedTopics.includes(topic) ? 'default' : 'secondary'}
                className={`cursor-pointer px-5 py-2 text-sm ${
                  topic === 'Custom' ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''
                } ${selectedTopics.includes(topic) ? 'shadow-glow' : 'shadow-apple-sm'}`}
                onClick={() => toggleTopic(topic)}
              >
                {topic}
              </Badge>
            ))}
          </div>

          {/* Custom Questions - Only show if Custom is selected */}
          {selectedTopics.includes('Custom') && (
            <div className="space-y-3 pt-4">
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
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              <Button onClick={handleSavePreset} disabled={selectedTopics.length === 0 && customQuestions.length === 0}>
                Save Preset
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {!editingPreset && (
                <Button 
                  variant="secondary" 
                  onClick={handleUseOnce}
                  disabled={selectedTopics.length === 0 && customQuestions.length === 0}
                >
                  Use Once
                </Button>
              )}
            </div>
            {editingPreset && onDeletePreset && (
              <Button 
                variant="destructive" 
                onClick={() => {
                  onDeletePreset();
                  onOpenChange(false);
                  toast({ description: 'Preset deleted successfully!' });
                }}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
