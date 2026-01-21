import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Pencil, Info } from 'lucide-react';
import { CustomTopicsModal } from './CustomTopicsModal';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDevice } from '@/hooks/useDevice';
import { useProfileData } from '@/hooks/useProfileData';
import { supabase } from '@/lib/supabase';

type Role = 'random' | 'alumni' | 'mentee' | 'mentor';
type TopicPreset = 'none' | 'icebreak' | 'friendship' | 'career' | 'custom' | string;
type Duration = 10 | 15 | 30 | 0;

export function FiltersSection() {
  const navigate = useNavigate();
  const device = useDevice();
  const [role, setRole] = useState<Role>('random');
  const [similarity, setSimilarity] = useState(50);
  const [topic, setTopic] = useState<TopicPreset>('none');
  const [duration, setDuration] = useState<Duration>(10);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPresets, setCustomPresets] = useState<Array<{ name: string; topics: string[]; customQuestions?: string[] }>>([]);
  const [editingPresetIndex, setEditingPresetIndex] = useState<number | null>(null);
  const [tempCustomTopics, setTempCustomTopics] = useState<{ topics: string[]; customQuestions?: string[] } | null>(null);
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [checkingMatches, setCheckingMatches] = useState(false);

  const getSimilarityLabel = () => {
    if (similarity <= 33) return 'Different';
    if (similarity <= 66) return 'Balanced';
    return 'Similar';
  };

  const { profileData } = useProfileData();
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  // Get real online users count (excluding current user)
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_online', true)
          .neq('id', user?.id || ''); // Exclude current user
        
        setOnlineUsersCount(count || 0);
      } catch (error) {
        console.error('Error fetching online users:', error);
      }
    };

    fetchOnlineUsers();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchOnlineUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  // Live check for users that match the current filters
  useEffect(() => {
    let cancelled = false;
    const checkMatches = async () => {
      setCheckingMatches(true);
      try {
        const { getMatchCount } = await import('@/lib/api/matchmaking');
        const count = await getMatchCount({
          circleId: undefined,
          preferredRoles: role && role !== 'random' ? [role] : undefined,
          preferredTopics: topic && topic !== 'none' && topic !== 'custom' ? [topic] : undefined,
          filterSimilarInterests: similarity === 100,
          filterSimilarBackground: false,
        });
        if (!cancelled) {
          setMatchCount(count);
        }
      } catch (error) {
        console.error('Error checking match availability:', error);
        if (!cancelled) setMatchCount(null);
      } finally {
        if (!cancelled) setCheckingMatches(false);
      }
    };

    const timer = setTimeout(checkMatches, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [role, similarity, topic, duration]);

  const handleStartSession = () => {
    console.log('Starting session with:', { role, similarity, topic, duration });
    const customSelection =
      topic === 'custom'
        ? tempCustomTopics
        : customPresets.find((preset) => preset.name === topic);
    
    // Navigate to waiting room - real matchmaking handles everything
    navigate('/waiting', { 
      state: { 
        duration, 
        topic, 
        role: role !== 'random' ? role : undefined, 
        similarity,
        customTopics: customSelection?.topics,
        customQuestions: customSelection?.customQuestions,
      } 
    });
  };

  // Use real online users count (matchmaking will handle filtering)
  const matchingCount = matchCount !== null ? matchCount : onlineUsersCount;

  // Info icon component - hoverable on desktop, clickable on mobile/tablet
  const InfoIcon = ({ content }: { content: string }) => {
    const isMobileOrTablet = device === 'mobile' || device === 'tablet';
    
    if (isMobileOrTablet) {
      return (
        <Popover>
          <PopoverTrigger asChild>
            <button className="inline-flex items-center justify-center ml-1.5 hover:opacity-70 transition-opacity">
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 text-sm p-3" side="top">
            {content}
          </PopoverContent>
        </Popover>
      );
    }
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center justify-center ml-1.5 hover:opacity-70 transition-opacity">
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="w-64 text-sm p-3">
          {content}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div>
        <Card className="shadow-apple-md border-2">
          <CardContent className="p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Set your preferences to find the right match.
            </h2>

            {/* Role Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold">Role:</label>
                <InfoIcon content="Choose who you want to connect with: Random for anyone, Alumni for experienced members, Mentee for learners, or Mentor for guides." />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'random', label: 'Random' },
                  { value: 'alumni', label: 'Alumni' },
                  { value: 'mentee', label: 'Mentee' },
                  { value: 'mentor', label: 'Mentor' },
                ].map((r) => (
                  <Badge
                    key={r.value}
                    variant={role === r.value ? 'default' : 'secondary'}
                    className={`cursor-pointer px-6 py-2 md:text-sm text-xs md:px-6 px-4 md:py-2 py-1.5 transition-all hover:scale-105 ${
                      role === r.value ? 'shadow-glow' : 'shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
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
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold">Similarity Slider:</label>
                <InfoIcon content="Different: Meet people with opposite interests. Balanced: Mix of similar and different. Similar: Connect with people who share your interests." />
              </div>
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
              <div className="flex justify-between md:text-sm text-xs w-full max-w-md">
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
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold">Topics:</label>
                <InfoIcon content="Select a conversation theme. Ice-Break for casual chat, Friendship Fast-Track for deeper connections, Career Swap for professional talk, or create your own Custom topic." />
              </div>
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
                    className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 transition-all hover:scale-105 ${
                      topic === t.value ? 'shadow-glow' : 'shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
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
                    className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 flex items-center gap-2 transition-all hover:scale-105 ${
                      topic === preset.name ? 'shadow-glow' : 'shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
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
                  className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 bg-warning hover:bg-warning/90 text-warning-foreground flex items-center gap-2 transition-all hover:scale-105 ${
                    topic === 'custom' ? 'shadow-glow' : 'shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
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
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold">Session:</label>
                <InfoIcon content="Choose your conversation length: 10, 15, or 30 minutes for a timed session, or ∞ for unlimited time to chat." />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 10, label: '10 min' },
                  { value: 15, label: '15 min' },
                  { value: 30, label: '30 min' },
                  { value: 0, label: '∞' },
                ].map((d) => (
                  <Badge
                    key={d.value}
                    variant={duration === d.value ? 'default' : 'secondary'}
                    className={`cursor-pointer md:text-sm text-xs md:px-6 px-4 md:py-2 py-1.5 whitespace-nowrap transition-all hover:scale-105 ${
                      duration === d.value ? 'shadow-glow' : 'shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
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
            {matchCount !== null && matchCount === 0 && (
              <div className="text-sm text-destructive">
                No one currently matches your filters. You can still start and wait.
              </div>
            )}
            {checkingMatches && (
              <div className="text-xs text-muted-foreground">Checking live availability…</div>
            )}
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
      </div>
    </TooltipProvider>
  );
}
