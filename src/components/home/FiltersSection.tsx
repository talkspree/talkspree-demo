import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Pencil, Info, Loader2 } from 'lucide-react';
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
import { useCircle } from '@/contexts/CircleContext';
import { supabase } from '@/lib/supabase';
import { 
  getVisiblePresetsWithUserPresets,
  UnifiedPreset,
  UserPreset
} from '@/lib/api/topics';
import { getCircleRoles, CircleRole } from '@/lib/api/circles';
import { cn } from '@/lib/utils';

type TopicPresetSelection = 'none' | 'custom' | string;
type Duration = 10 | 15 | 30;

export function FiltersSection() {
  const navigate = useNavigate();
  const device = useDevice();
  const { circleId, isAdmin, allowMemberCustomTopics, loading: circleLoading } = useCircle();
  const [role, setRole] = useState<string>('random');
  const [similarity, setSimilarity] = useState(50);

  // Elastic-snap slider internals
  const [isDragging, setIsDragging] = useState(false);
  const [rawValue, setRawValue] = useState(50);

  // Dynamic circle roles
  const [circleRoles, setCircleRoles] = useState<CircleRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<TopicPresetSelection>('none');
  const [duration, setDuration] = useState<Duration>(10);
  const [showCustomModal, setShowCustomModal] = useState(false);
  
  // Database presets (default + circle + user)
  const [dbPresets, setDbPresets] = useState<UnifiedPreset[]>([]);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  
  // For editing user presets
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  
  // Temporary custom selection (use once without saving)
  const [tempCustomTopics, setTempCustomTopics] = useState<{ topics: string[]; customQuestions?: string[] } | null>(null);
  
  const [lookingForChatCount, setLookingForChatCount] = useState<number>(0);
  const [chattingCount, setChattingCount] = useState<number>(0);
  const [checkingMatches, setCheckingMatches] = useState(false);
  const [statsInitialized, setStatsInitialized] = useState(false);

  const getSimilarityLabel = () => {
    if (similarity <= 33) return 'Different';
    if (similarity <= 66) return 'Balanced';
    return 'Similar';
  };

  // Load presets from database (single call returns both unified + user presets)
  const loadPresets = useCallback(async () => {
    setLoadingPresets(true);
    try {
      const { presets, userPresets: myPresets } = await getVisiblePresetsWithUserPresets(circleId);
      setDbPresets(presets);
      setUserPresets(myPresets);
    } catch (error) {
      console.error('Error loading presets:', error);
    } finally {
      setLoadingPresets(false);
    }
  }, [circleId]);

  // Load circle roles dynamically
  useEffect(() => {
    if (circleLoading) {
      setLoadingRoles(true);
      return;
    }
    if (!circleId) {
      setCircleRoles([]);
      setLoadingRoles(false);
      return;
    }

    setLoadingRoles(true);
    let cancelled = false;
    (async () => {
      try {
        const roles = await getCircleRoles(circleId);
        if (!cancelled) setCircleRoles(roles);
      } catch (error) {
        console.error('Error loading circle roles:', error);
      } finally {
        if (!cancelled) setLoadingRoles(false);
      }
    })();
    return () => { cancelled = true; };
  }, [circleId, circleLoading]);

  const roleOptions = [
    { value: 'random', label: 'Random' },
    ...circleRoles.map(r => ({ value: r.name, label: r.name })),
  ];

  const snapSimilarity = (v: number) => (v <= 25 ? 0 : v <= 75 ? 50 : 100);

  // Reload presets when circle changes or loads
  useEffect(() => {
    if (!circleLoading) {
      loadPresets();
    }
  }, [loadPresets, circleLoading]);

  // Live check for users that match the current filters (both looking for chat and currently chatting)
  useEffect(() => {
    let cancelled = false;
    // Reset initialized flag when filters change so the button doesn't falsely
    // disable itself while we wait for the first result with the new filters.
    setStatsInitialized(false);

    const checkMatches = async () => {
      setCheckingMatches(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const normalizedCircleId = circleId || null;

        const { data, error } = await supabase.rpc('get_global_activity_stats', {
          p_user_id: user.id,
          p_circle_id: normalizedCircleId,
          p_role: role && role !== 'random' ? role : null
        });

        if (error || !data) return;

        const stats = Array.isArray(data) ? data[0] : data;

        if (!cancelled && stats) {
          setLookingForChatCount(stats.looking_for_chat_count || 0);
          setChattingCount(stats.currently_chatting_count || 0);
          setStatsInitialized(true);
        }
      } catch {
        // Silently keep last known counts on network/auth errors
      } finally {
        if (!cancelled) setCheckingMatches(false);
      }
    };

    // Initial check with debounce when filters change
    const timer = setTimeout(checkMatches, 300);
    
    // Poll every 5 seconds to detect new matching users (faster polling)
    const interval = setInterval(checkMatches, 5000);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [role, similarity, selectedPreset, duration, circleId]);

  const handleStartSession = () => {
    // Determine preset type for the waiting room
    let presetType: 'default' | 'circle' | 'user' | null = null;
    if (selectedPreset !== 'none' && selectedPreset !== 'custom') {
      const preset = dbPresets.find(p => p.id === selectedPreset);
      if (preset) {
        presetType = preset.type;
      } else {
        // Check user presets
        const userPreset = userPresets.find(p => p.id === selectedPreset);
        if (userPreset) {
          presetType = 'user';
        }
      }
    }
    
    // Navigate to waiting room with preset information
    navigate('/waiting', { 
      state: { 
        duration, 
        presetId: selectedPreset !== 'none' && selectedPreset !== 'custom' ? selectedPreset : null,
        presetType,
        circleId, // Pass circleId for "No Topic" mode to pull all available questions
        // Legacy support: still pass topic for backward compatibility
        topic: selectedPreset, 
        role: role !== 'random' ? role : undefined, 
        similarity,
        // For custom topics (use once)
        customTopics: selectedPreset === 'custom' ? tempCustomTopics?.topics : undefined,
        customQuestions: selectedPreset === 'custom' ? tempCustomTopics?.customQuestions : undefined,
      } 
    });
  };

  // Total matching users (looking for chat + currently chatting)
  const totalMatchingUsers = lookingForChatCount + chattingCount;

  const isRoleFilterActive = role !== 'random';
  const startDisabled = isRoleFilterActive && totalMatchingUsers === 0 && statsInitialized;

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
      <div className="h-full">
        <Card className="shadow-apple-md border-2 rounded-[1.5rem] max-h-full flex flex-col">
          <CardContent className=" py-4 md:py-6 pl-6 md:pl-8 pr-4 md:pr-5 mr-2 space-y-6 overflow-y-auto custom-scrollbar min-h-0 flex-1">
          <div>
            <h2 className="text-2xl font-semibold mb-6">
              Set your preferences to find the right match.
            </h2>

            {/* Role Selection */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold">Role:</label>
                <InfoIcon content={`Choose who you want to connect with: Random matches you with anyone${circleRoles.length > 0 ? `, or pick a specific role (${circleRoles.map(r => r.name).join(', ')})` : ''}.`} />
                {loadingRoles && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                {/* Random is always shown immediately */}
                <Badge
                  variant={role === 'random' ? 'default' : 'secondary'}
                  className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 transition-all hover:scale-105 ${
                    role === 'random' ? 'border-none' : 'neu-concave secondary'
                  }`}
                  onClick={() => setRole('random')}
                >
                  Random
                </Badge>

                {loadingRoles ? (
                  /* Skeleton placeholder badges while roles load */
                  [52, 64, 56].map((w, i) => (
                    <div
                      key={i}
                      className="h-7 rounded-full neu-concave bg-muted animate-pulse"
                      style={{ width: `${w}px`, animationDelay: `${i * 120}ms` }}
                    />
                  ))
                ) : (
                  circleRoles.map((r) => (
                    <Badge
                      key={r.name}
                      variant={role === r.name ? 'default' : 'secondary'}
                      className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 transition-all hover:scale-105 ${
                        role === r.name ? 'border-none' : 'neu-concave secondary'
                      }`}
                      onClick={() => setRole(r.name)}
                    >
                      {r.name}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Similarity Slider */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold">Similarity Slider:</label>
                <InfoIcon content="Different: Meet people with different backgrounds and interests (below 30% similarity). Balanced: A mix of similar and different (30-70%). Similar: Connect with people who share your profile (above 70%)." />
              </div>
              <div className="w-full max-w-md">
                <Slider
                  value={[isDragging ? rawValue : similarity]}
                  onValueChange={([v]) => {
                    setRawValue(v);
                    if (!isDragging) setIsDragging(true);
                  }}
                  onValueCommit={([v]) => {
                    const snapped = snapSimilarity(v);
                    setSimilarity(snapped);
                    setRawValue(snapped);
                    setIsDragging(false);
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className={`py-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  thumbClassName={
                    isDragging
                      ? 'transition-none scale-110 cursor-grabbing'
                      : 'slider-snap hover:scale-110 cursor-grab'
                  }
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
                <InfoIcon content="Select a conversation theme from the available presets, or create your own Custom topic." />
                {loadingPresets && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="flex flex-wrap gap-2">
                {/* No Topic option */}
                <Badge
                  variant={selectedPreset === 'none' ? 'default' : 'secondary'}
                  className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 transition-all hover:scale-105 ${
                    selectedPreset === 'none' ? 'border-none' : 'neu-concave secondary'
                  }`}
                  onClick={() => setSelectedPreset('none')}
                >
                  No Topic
                </Badge>
                
                {/* Default presets from database */}
                {dbPresets
                  .filter(p => p.type === 'default')
                  .map((preset) => (
                    <Badge
                      key={preset.id}
                      variant={selectedPreset === preset.id ? 'default' : 'secondary'}
                      className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 transition-all hover:scale-105 ${
                        selectedPreset === preset.id ? 'border-none' : 'neu-concave secondary'
                      }`}
                      onClick={() => setSelectedPreset(preset.id)}
                    >
                      {preset.name}
                    </Badge>
                  ))}
                
                {/* Circle presets (if any) */}
                {dbPresets
                  .filter(p => p.type === 'circle')
                  .map((preset) => (
                    <Badge
                      key={preset.id}
                      variant={selectedPreset === preset.id ? 'default' : 'secondary'}
                      className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 transition-all hover:scale-105 ${
                        selectedPreset === preset.id ? 'border-none' : 'neu-concave secondary'
                      }`}
                      onClick={() => setSelectedPreset(preset.id)}
                    >
                      {preset.name}
                    </Badge>
                  ))}
                
                {/* User's saved presets — hidden for members when custom topics are disabled */}
                {(isAdmin || allowMemberCustomTopics) && userPresets.map((preset) => (
                  <Badge
                    key={preset.id}
                    variant={selectedPreset === preset.id ? 'default' : 'secondary'}
                    className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 flex items-center gap-2 transition-all hover:scale-105 border-2 border-blue-300 ${
                      selectedPreset === preset.id ? 'border-none' : 'neu-concave secondary'
                    }`}
                    onClick={() => setSelectedPreset(preset.id)}
                  >
                    {preset.name}
                    <Pencil 
                      className="h-3 w-3" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPresetId(preset.id);
                        setShowCustomModal(true);
                      }}
                    />
                  </Badge>
                ))}

                {/* Custom / Create new preset button — hidden for members when disabled by admin */}
                {(isAdmin || allowMemberCustomTopics) && (
                  <Badge
                    variant={selectedPreset === 'custom' ? 'default' : 'secondary'}
                    className={`cursor-pointer md:text-sm text-xs md:px-5 px-3 md:py-2 py-1.5 bg-warning hover:bg-warning/90 text-white drop-shadow-lg flex items-center gap-2 transition-all hover:scale-105 ${
                      selectedPreset === 'custom' ? 'border-none' : 'border-none'
                    }`}
                    onClick={() => {
                      setSelectedPreset('custom');
                      setEditingPresetId(null);
                      setShowCustomModal(true);
                    }}
                  >
                    Custom
                    {selectedPreset === 'custom' && <Pencil className="h-3 w-3" />}
                  </Badge>
                )}
              </div>
            </div>

            {/* Session Duration */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-1.5">
                <label className="text-sm font-semibold">Session:</label>
                <InfoIcon content="Choose your conversation length: 10, 15, or 30 minutes." />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 10, label: '10 min' },
                  { value: 15, label: '15 min' },
                  { value: 30, label: '30 min' },
                ].map((d) => (
                  <Badge
                    key={d.value}
                    variant={duration === d.value ? 'default' : 'secondary'}
                    className={`cursor-pointer md:text-sm text-xs md:px-4 px-4 md:py-2 py-1.5 whitespace-nowrap transition-all hover:scale-105 ${
                      duration === d.value ? 'border-none' : 'neu-concave secondary'
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
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button
                    size="lg"
                    className={cn(
                      "w-36 text-lg font-bold py-6 rounded-full my-2",
                      startDisabled && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                    onClick={startDisabled ? undefined : handleStartSession}
                  >
                    START
                  </Button>
                </span>
              </TooltipTrigger>
              {startDisabled && (
                <TooltipContent side="bottom">
                  <p>No "{role}" members are currently online. Wait or select a different role.</p>
                </TooltipContent>
              )}
            </Tooltip>
            {totalMatchingUsers === 0 && statsInitialized && !isRoleFilterActive && (
              <div className="text-xs text-destructive">
                No one currently matches your filters. You can still start and wait.
              </div>
            )}
            {totalMatchingUsers > 0 && (
              <div className="text-xs text-muted-foreground">
                {lookingForChatCount > 0 && chattingCount > 0 ? (
                  <p>
                    {lookingForChatCount} user{lookingForChatCount !== 1 ? 's' : ''} looking for chat, {chattingCount} user{chattingCount !== 1 ? 's' : ''} currently chatting
                  </p>
                ) : (
                  <>
                    {lookingForChatCount > 0 && (
                      <p>{lookingForChatCount} user{lookingForChatCount !== 1 ? 's' : ''} looking for chat</p>
                    )}
                    {chattingCount > 0 && (
                      <p>{chattingCount} user{chattingCount !== 1 ? 's' : ''} currently chatting</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CustomTopicsModal
        open={showCustomModal}
        onOpenChange={(open) => {
          setShowCustomModal(open);
          if (!open) setEditingPresetId(null);
        }}
        editingPresetId={editingPresetId}
        circleId={circleId}
        tempCustomData={editingPresetId === null && selectedPreset === 'custom' ? tempCustomTopics : undefined}
        onSavePreset={async () => {
          // Reload presets after saving
          await loadPresets();
        }}
        onUseOnce={(topics, customQuestions) => {
          setTempCustomTopics({ topics, customQuestions });
        }}
        onDeletePreset={async () => {
          // Reload presets after deleting
          await loadPresets();
          setSelectedPreset('none');
          setEditingPresetId(null);
        }}
      />
      </div>
    </TooltipProvider>
  );
}
