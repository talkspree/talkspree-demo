import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Pencil } from 'lucide-react';
import { CustomTopicsModal } from './CustomTopicsModal';
import { sampleUserManager, SampleUser } from '@/data/sampleUsers';
import { useProfileData } from '@/hooks/useProfileData';

type Role = 'random' | 'alumni' | 'mentee' | 'mentor';
type TopicPreset = 'none' | 'icebreak' | 'friendship' | 'career' | 'custom' | string;
type Duration = 10 | 15 | 30 | 0;

export function FiltersSection() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('random');
  const [similarity, setSimilarity] = useState(50);
  const [topic, setTopic] = useState<TopicPreset>('none');
  const [duration, setDuration] = useState<Duration>(10);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPresets, setCustomPresets] = useState<Array<{ name: string; topics: string[]; customQuestions?: string[] }>>([]);
  const [editingPresetIndex, setEditingPresetIndex] = useState<number | null>(null);
  const [tempCustomTopics, setTempCustomTopics] = useState<{ topics: string[]; customQuestions?: string[] } | null>(null);

  const getSimilarityLabel = () => {
    if (similarity <= 33) return 'Different';
    if (similarity <= 66) return 'Balanced';
    return 'Similar';
  };

  const { profileData } = useProfileData();

  // Calculate interest similarity between two users (0-100)
  const calculateSimilarity = (interests1: string[], interests2: string[]): number => {
    if (interests1.length === 0 || interests2.length === 0) return 0;
    const common = interests1.filter(i => interests2.includes(i)).length;
    const total = new Set([...interests1, ...interests2]).size;
    return Math.round((common / total) * 100);
  };

  // Find a matching user based on filters
  const findMatch = (): SampleUser | null => {
    const availableUsers = sampleUserManager.getAvailableUsers();
    
    if (availableUsers.length === 0) return null;

    // Filter by role if not random
    let candidates = availableUsers;
    if (role !== 'random') {
      candidates = candidates.filter(u => u.role === role);
    }

    if (candidates.length === 0) return null;

    // Calculate similarity scores for all candidates
    const candidatesWithScores = candidates.map(user => ({
      user,
      similarityScore: calculateSimilarity(profileData.interests, user.interests)
    }));

    // Filter based on similarity preference
    let filtered = candidatesWithScores;
    if (similarity === 0) {
      // Different: prefer low similarity (0-40%)
      filtered = candidatesWithScores.filter(c => c.similarityScore <= 40);
    } else if (similarity === 100) {
      // Similar: prefer high similarity (60-100%)
      filtered = candidatesWithScores.filter(c => c.similarityScore >= 60);
    }
    // Balanced: accept any similarity

    if (filtered.length === 0) {
      // If no one matches the similarity filter, just pick from all candidates
      filtered = candidatesWithScores;
    }

    // Pick a random match from filtered candidates
    const match = filtered[Math.floor(Math.random() * filtered.length)];
    return match.user;
  };

  const handleStartSession = () => {
    console.log('Starting session with:', { role, similarity, topic, duration });
    
    // Try to find a match
    const match = findMatch();
    
    if (match) {
      // Simulate the other user's duration preference (random from available options)
      const possibleDurations: Duration[] = [10, 15, 30, 0];
      const otherUserDuration = possibleDurations[Math.floor(Math.random() * possibleDurations.length)];
      
      // Use the lower duration (0 means infinite, so it doesn't count as lower)
      let finalDuration = duration;
      if (duration === 0) {
        finalDuration = otherUserDuration;
      } else if (otherUserDuration !== 0) {
        finalDuration = Math.min(duration, otherUserDuration) as Duration;
      }
      
      // Navigate directly to call with matched user
      navigate('/call', { 
        state: { 
          duration: finalDuration, 
          topic, 
          role, 
          similarity,
          matchedUser: match 
        } 
      });
    } else {
      // Navigate to waiting room if no match available
      navigate('/waiting', { 
        state: { 
          duration, 
          topic, 
          role, 
          similarity 
        } 
      });
    }
  };

  // Calculate matching users count
  const getMatchingUsersCount = (): number => {
    const onlineUsers = sampleUserManager.getOnlineUsers();
    
    // Filter by role if not random
    let candidates = onlineUsers;
    if (role !== 'random') {
      candidates = candidates.filter(u => u.role === role);
    }
    
    if (candidates.length === 0) return 0;
    
    // Calculate similarity scores
    const candidatesWithScores = candidates.map(user => ({
      user,
      similarityScore: calculateSimilarity(profileData.interests, user.interests)
    }));
    
    // Filter based on similarity preference
    let filtered = candidatesWithScores;
    if (similarity === 0) {
      filtered = candidatesWithScores.filter(c => c.similarityScore <= 40);
    } else if (similarity === 100) {
      filtered = candidatesWithScores.filter(c => c.similarityScore >= 60);
    }
    
    return filtered.length;
  };

  const matchingCount = getMatchingUsersCount();

  return (
    <>
      <Card className="shadow-apple-md border-2">
        <CardContent className="p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Set your preferences to find the right match.
            </h2>

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold">Role:</label>
              <div className="flex gap-2">
                {[
                  { value: 'random', label: 'Random' },
                  { value: 'alumni', label: 'Alumni' },
                  { value: 'mentee', label: 'Mentee' },
                  { value: 'mentor', label: 'Mentor' },
                ].map((r) => (
                  <Badge
                    key={r.value}
                    variant={role === r.value ? 'default' : 'secondary'}
                    className={`cursor-pointer px-6 py-2 text-sm ${
                      role === r.value ? 'shadow-glow' : 'shadow-apple-sm'
                    }`}
                    onClick={() => setRole(r.value as Role)}
                  >
                    {r.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Similarity Slider */}
            <div className="space-y-3 pt-4">
              <label className="text-sm font-semibold">Similarity Slider:</label>
              <div className="w-full max-w-md">
                <Slider
                  value={[similarity]}
                  onValueChange={([v]) => {
                    // Snap to closest value
                    if (v <= 33) setSimilarity(0);
                    else if (v <= 66) setSimilarity(50);
                    else setSimilarity(100);
                  }}
                  max={100}
                  step={50}
                  className="py-4"
                />
              </div>
              <div className="flex justify-between text-sm w-full max-w-md">
                <span className={similarity === 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  Different
                </span>
                <span className={similarity === 50 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  Balanced
                </span>
                <span className={similarity === 100 ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                  Similar
                </span>
              </div>
            </div>

            {/* Topics */}
            <div className="space-y-3 pt-4">
              <label className="text-sm font-semibold">Topics:</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'none', label: 'No Topic' },
                  { value: 'icebreak', label: 'Ice-Break' },
                  { value: 'friendship', label: 'Friendship Fast-Track' },
                  { value: 'career', label: 'Career Swap' },
                ].map((t) => (
                  <Badge
                    key={t.value}
                    variant={topic === t.value ? 'default' : 'secondary'}
                    className={`cursor-pointer px-5 py-2 text-sm ${
                      topic === t.value ? 'shadow-glow' : 'shadow-apple-sm'
                    }`}
                    onClick={() => setTopic(t.value as TopicPreset)}
                  >
                    {t.label}
                  </Badge>
                ))}
                
                {/* Custom Presets */}
                {customPresets.map((preset, idx) => (
                  <Badge
                    key={`preset-${idx}`}
                    variant={topic === preset.name ? 'default' : 'secondary'}
                    className={`cursor-pointer px-5 py-2 text-sm flex items-center gap-2 ${
                      topic === preset.name ? 'shadow-glow' : 'shadow-apple-sm'
                    }`}
                    onClick={() => setTopic(preset.name)}
                  >
                    {preset.name}
                    <Pencil 
                      className="h-3 w-3" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPresetIndex(idx);
                        setShowCustomModal(true);
                      }}
                    />
                  </Badge>
                ))}

                <Badge
                  variant={topic === 'custom' ? 'default' : 'secondary'}
                  className={`cursor-pointer px-5 py-2 text-sm bg-warning hover:bg-warning/90 text-warning-foreground flex items-center gap-2 ${
                    topic === 'custom' ? 'shadow-glow' : ''
                  }`}
                  onClick={() => {
                    setTopic('custom');
                    setEditingPresetIndex(null);
                    setShowCustomModal(true);
                  }}
                >
                  Custom
                  {topic === 'custom' && <Pencil className="h-3 w-3" />}
                </Badge>
              </div>
            </div>

            {/* Session Duration */}
            <div className="space-y-3 pt-4">
              <label className="text-sm font-semibold">Session:</label>
              <div className="flex gap-2">
                {[
                  { value: 10, label: '10 min' },
                  { value: 15, label: '15 min' },
                  { value: 30, label: '30 min' },
                  { value: 0, label: '∞' },
                ].map((d) => (
                  <Badge
                    key={d.value}
                    variant={duration === d.value ? 'default' : 'secondary'}
                    className={`cursor-pointer px-6 py-2 text-sm ${
                      duration === d.value ? 'shadow-glow' : 'shadow-apple-sm'
                    }`}
                    onClick={() => setDuration(d.value as Duration)}
                  >
                    {d.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-start flex-col gap-2">
            <Button
              size="lg"
              className="w-48 text-lg font-semibold py-6 shadow-glow"
              onClick={handleStartSession}
            >
              START
            </Button>
            <p className="text-xs text-muted-foreground">
              {matchingCount} user{matchingCount !== 1 ? 's' : ''} match your filters
            </p>
          </div>
        </CardContent>
      </Card>

      <CustomTopicsModal
        open={showCustomModal}
        onOpenChange={(open) => {
          setShowCustomModal(open);
          if (!open) setEditingPresetIndex(null);
        }}
        editingPreset={editingPresetIndex !== null ? customPresets[editingPresetIndex] : undefined}
        tempCustomData={editingPresetIndex === null && topic === 'custom' ? tempCustomTopics : undefined}
        onSavePreset={(name, topics, customQuestions) => {
          if (editingPresetIndex !== null) {
            const updated = [...customPresets];
            updated[editingPresetIndex] = { name, topics, customQuestions };
            setCustomPresets(updated);
            setEditingPresetIndex(null);
          } else {
            setCustomPresets([...customPresets, { name, topics, customQuestions }]);
          }
        }}
        onUseOnce={(topics, customQuestions) => {
          setTempCustomTopics({ topics, customQuestions });
        }}
        onDeletePreset={() => {
          if (editingPresetIndex !== null) {
            const updated = customPresets.filter((_, idx) => idx !== editingPresetIndex);
            setCustomPresets(updated);
            setTopic('none');
            setEditingPresetIndex(null);
          }
        }}
      />
    </>
  );
}
