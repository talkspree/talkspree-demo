import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  QUESTION_INTERVAL_SECONDS,
  Question,
  TopicPreset,
  getRandomQuestion,
  resolvePresetFromSelection,
  loadPresetFromDatabase,
} from '@/data/questions';
import { 
  getPresetQuestions, 
  getAllAvailableQuestions,
  PresetType,
} from '@/lib/api/topics';
import { sendCallSignal } from '@/lib/api/agora';
import { getCallById } from '@/lib/api/calls';
import { supabase } from '@/lib/supabase';

interface PromptSelection {
  topicKey?: string;
  presetType?: PresetType;
  customTopics?: string[];
  customQuestions?: string[];
}

interface PromptSignalData {
  type: 'prompt_update';
  question: Question;
  questionIndex: number;
  currentTurn: 'caller' | 'recipient';
  usedIndices: number[];
  presetId?: string;
  presetType?: PresetType;
  presetName?: string;
  topics?: string[];
  customQuestions?: string[];
  updatedAt?: string;
  updatedBy?: string;
}

export interface SharedPromptState {
  currentQuestion: Question | null;
  nextQuestionIn: number;
  preset: TopicPreset;
  refreshPrompt: () => Promise<void>;
  ready: boolean;
}

interface LoadedPresetQuestions {
  questions: Question[];
  name: string;
  topics: string[];
}

/**
 * Load questions from a database preset (default, circle, or user)
 */
async function loadQuestionsFromDbPreset(
  presetId: string,
  presetType: PresetType = 'default'
): Promise<LoadedPresetQuestions | null> {
  try {
    const questions = await getPresetQuestions(presetId, presetType);
    if (!questions || questions.length === 0) {
      console.warn(`No questions found for preset ${presetId} (${presetType})`);
      return null;
    }

    const formattedQuestions: Question[] = questions.map(q => ({
      text: q.text,
      topic: q.topic
    }));

    const topics = [...new Set(questions.map(q => q.topic))];

    return {
      questions: formattedQuestions,
      name: `${presetType.charAt(0).toUpperCase() + presetType.slice(1)} Preset`,
      topics
    };
  } catch (error) {
    console.error('Failed to load questions from DB preset:', error);
    return null;
  }
}

/**
 * Fisher-Yates shuffle algorithm for randomizing arrays
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Interleave questions from caller and recipient, alternating between them.
 * Questions within each person's pool are shuffled randomly.
 */
function interleaveQuestions(
  callerQuestions: Question[],
  recipientQuestions: Question[]
): {
  interleaved: Question[];
  sources: ('caller' | 'recipient')[];
} {
  const interleaved: Question[] = [];
  const sources: ('caller' | 'recipient')[] = [];
  
  // Remove duplicates by text
  const callerSet = new Map<string, Question>();
  const recipientSet = new Map<string, Question>();
  
  for (const q of callerQuestions) {
    if (!callerSet.has(q.text)) {
      callerSet.set(q.text, q);
    }
  }
  
  for (const q of recipientQuestions) {
    // Only add if not already in caller's set (avoid duplicates)
    if (!recipientSet.has(q.text) && !callerSet.has(q.text)) {
      recipientSet.set(q.text, q);
    }
  }
  
  // Shuffle each person's questions randomly
  const callerArr = shuffleArray(Array.from(callerSet.values()));
  const recipientArr = shuffleArray(Array.from(recipientSet.values()));
  
  // Interleave: caller first, then recipient, alternating
  const maxLen = Math.max(callerArr.length, recipientArr.length);
  
  for (let i = 0; i < maxLen; i++) {
    if (i < callerArr.length) {
      interleaved.push(callerArr[i]);
      sources.push('caller');
    }
    if (i < recipientArr.length) {
      interleaved.push(recipientArr[i]);
      sources.push('recipient');
    }
  }
  
  return { interleaved, sources };
}

/**
 * Keeps the question prompt in sync between call participants using Supabase realtime.
 * If callId is missing we fall back to local-only behavior.
 */
export function useSharedPrompt(
  callId?: string,
  selection?: PromptSelection
): SharedPromptState {
  const topicsKey = useMemo(
    () => (selection?.customTopics || []).join('|'),
    [selection?.customTopics]
  );
  const customQuestionsKey = useMemo(
    () => (selection?.customQuestions || []).join('|'),
    [selection?.customQuestions]
  );

  const resolvedPreset = useMemo(
    () =>
      resolvePresetFromSelection(
        selection?.topicKey,
        selection?.customTopics,
        selection?.customQuestions
      ),
    [selection?.topicKey, topicsKey, customQuestionsKey]
  );

  const [preset, setPreset] = useState<TopicPreset>(resolvedPreset);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [nextQuestionIn, setNextQuestionIn] = useState<number>(QUESTION_INTERVAL_SECONDS);
  const [lastChangeAt, setLastChangeAt] = useState<number>(Date.now());
  const [isLeader, setIsLeader] = useState(false);
  const [ready, setReady] = useState(false);

  // Question pool management
  const interleavedQuestionsRef = useRef<Question[]>([]);
  const questionSourcesRef = useRef<('caller' | 'recipient')[]>([]);
  const usedIndicesRef = useRef<Set<number>>(new Set());
  const currentIndexRef = useRef<number>(-1);

  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const refreshingRef = useRef(false);
  const initCompletedRef = useRef(false);

  // Stable callback ref for broadcast
  const broadcastPromptRef = useRef<(question: Question, index: number, usedIndices: number[]) => Promise<void>>();

  // Update preset only in local mode
  useEffect(() => {
    if (!callId) {
      setPreset(resolvedPreset);
    }
  }, [resolvedPreset, callId]);

  // Get next question index, cycling through all before repeating
  const getNextQuestionIndex = useCallback((): number => {
    const questions = interleavedQuestionsRef.current;
    const used = usedIndicesRef.current;
    
    if (questions.length === 0) return -1;
    
    // If all questions used, reset
    if (used.size >= questions.length) {
      used.clear();
    }
    
    // Find next unused index
    for (let i = 0; i < questions.length; i++) {
      const nextIdx = (currentIndexRef.current + 1 + i) % questions.length;
      if (!used.has(nextIdx)) {
        return nextIdx;
      }
    }
    
    // Fallback: return next index
    return (currentIndexRef.current + 1) % questions.length;
  }, []);

  // Broadcast prompt to other participant
  broadcastPromptRef.current = async (question: Question, index: number, usedIndices: number[]) => {
    const updatedAt = new Date().toISOString();

    setCurrentQuestion(question);
    setLastChangeAt(Date.now());
    setNextQuestionIn(QUESTION_INTERVAL_SECONDS);
    currentIndexRef.current = index;
    usedIndicesRef.current = new Set(usedIndices);

    if (!callId || !userIdRef.current) {
      return;
    }

    const payload: PromptSignalData = {
      type: 'prompt_update',
      question,
      questionIndex: index,
      currentTurn: questionSourcesRef.current[index] || 'caller',
      usedIndices,
      presetId: preset.id,
      presetName: preset.name,
      topics: preset.topics,
      updatedAt,
      updatedBy: userIdRef.current,
    };

    try {
      await sendCallSignal(callId, 'call_state', payload, 'connected');
    } catch (error) {
      console.error('Failed to broadcast prompt:', error);
    }
  };

  // Refresh prompt (get next question)
  const refreshPrompt = useCallback(async () => {
    if (refreshingRef.current) return;
    
    refreshingRef.current = true;
    
    try {
      const nextIdx = getNextQuestionIndex();
      if (nextIdx < 0 || interleavedQuestionsRef.current.length === 0) {
        return;
      }
      
      const question = interleavedQuestionsRef.current[nextIdx];
      usedIndicesRef.current.add(nextIdx);
      
      await broadcastPromptRef.current?.(question, nextIdx, Array.from(usedIndicesRef.current));
    } finally {
      refreshingRef.current = false;
    }
  }, [getNextQuestionIndex]);

  // Handle incoming signal
  const handleSignal = useCallback((data: PromptSignalData, createdAt?: string) => {
    if (!data?.question) return;
    
    setCurrentQuestion(data.question);
    currentIndexRef.current = data.questionIndex ?? -1;
    
    if (data.usedIndices) {
      usedIndicesRef.current = new Set(data.usedIndices);
    }

    const timestamp = data.updatedAt || createdAt || new Date().toISOString();
    const timestampMs = new Date(timestamp).getTime();
    setLastChangeAt(timestampMs);
    
    const elapsed = Math.floor((Date.now() - timestampMs) / 1000);
    setNextQuestionIn(Math.max(0, QUESTION_INTERVAL_SECONDS - elapsed));
  }, []);

  // Reset init flag when callId changes (e.g. from undefined → recovered value)
  // so the hook re-initializes with the real call data.
  const prevCallIdRef = useRef(callId);
  useEffect(() => {
    if (callId !== prevCallIdRef.current) {
      prevCallIdRef.current = callId;
      if (callId) {
        initCompletedRef.current = false;
      }
    }
  }, [callId]);

  // Initialize - load questions and set up
  useEffect(() => {
    if (initCompletedRef.current) return;
    
    let active = true;

    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        userIdRef.current = user?.id || null;

        // Local-only mode
        if (!callId) {
          const question = getRandomQuestion(resolvedPreset);
          if (!active) return;
          interleavedQuestionsRef.current = resolvedPreset.questions;
          questionSourcesRef.current = resolvedPreset.questions.map(() => 'caller');
          setCurrentQuestion(question);
          setLastChangeAt(Date.now());
          setReady(true);
          initCompletedRef.current = true;
          return;
        }

        // Load call data with retry for recipient preset
        let leaderId: string | null = null;
        let callerQuestions: Question[] = [];
        let recipientQuestions: Question[] = [];
        let callPresetName = 'Conversation';
        
        const MAX_RETRIES = 5;
        const RETRY_DELAY = 1000;
        
        for (let retry = 0; retry < MAX_RETRIES && active; retry++) {
          try {
            const call = await getCallById(callId);
            
            if (!call) {
              break;
            }

            const ids = [call.caller_id, call.recipient_id].filter(Boolean) as string[];
            leaderId = ids.sort()[0] || null;

            const callerPresetId = call.caller_topic_preset;
            const callerPresetType = ((call as any).caller_preset_type || 'default') as PresetType;
            const recipientPresetId = call.recipient_topic_preset;
            const recipientPresetType = ((call as any).recipient_preset_type || 'default') as PresetType;

            // Load caller's questions
            callerQuestions = [];
            if (!callerPresetId || callerPresetId === 'none') {
              const allQuestions = await getAllAvailableQuestions(null);
              callerQuestions = allQuestions.map(q => ({ text: q.text, topic: q.topic }));
            } else if (callerPresetId === 'custom' && call.caller_custom_questions) {
              callerQuestions = call.caller_custom_questions.map((q: string) => ({
                text: q,
                topic: 'Custom'
              }));
            } else {
              const loaded = await loadQuestionsFromDbPreset(callerPresetId, callerPresetType);
              if (loaded) {
                callerQuestions = loaded.questions;
                callPresetName = loaded.name;
              } else {
                const legacyPreset = await loadPresetFromDatabase(callerPresetId, callerPresetType);
                if (legacyPreset) {
                  callerQuestions = legacyPreset.questions;
                  callPresetName = legacyPreset.name;
                }
              }
            }

            // Load recipient's questions
            // Note: always load separately when both use 'custom' — same preset ID string
            // but each user has their own questions in caller_custom_questions /
            // recipient_custom_questions, so equality check must be bypassed for 'custom'.
            recipientQuestions = [];
            if (recipientPresetId && (recipientPresetId !== callerPresetId || recipientPresetId === 'custom')) {
              if (recipientPresetId === 'none') {
                const allQuestions = await getAllAvailableQuestions(null);
                recipientQuestions = allQuestions.map(q => ({ text: q.text, topic: q.topic }));
              } else if (recipientPresetId === 'custom' && call.recipient_custom_questions) {
                recipientQuestions = call.recipient_custom_questions.map((q: string) => ({
                  text: q,
                  topic: 'Custom'
                }));
              } else {
                const loaded = await loadQuestionsFromDbPreset(recipientPresetId, recipientPresetType);
                if (loaded) {
                  recipientQuestions = loaded.questions;
                }
              }
            }

            // Retry when preset_type is missing for either side.
            // Both attemptMatch (caller) and updateRecipientPreset (recipient) write
            // preset_type in a separate DB update after the row is created, so there's
            // a window where the preset UUID is present but the type is still null.
            const isSpecialId = (id: string | null) => !id || id === 'none' || id === 'custom';

            const callerTypeNotYetSaved = !isSpecialId(callerPresetId) && !(call as any).caller_preset_type;
            const recipientTypeNotYetSaved = !isSpecialId(recipientPresetId) && !(call as any).recipient_preset_type;

            if ((!recipientPresetId || callerTypeNotYetSaved || recipientTypeNotYetSaved) && retry < MAX_RETRIES - 1) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
              continue;
            }

            // Success - break out of retry loop
            break;
          } catch (error) {
            console.error('Failed to load call data:', error);
            if (retry < MAX_RETRIES - 1) {
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
          }
        }

        if (!active) return;

        // Interleave questions from both users
        const { interleaved, sources } = interleaveQuestions(callerQuestions, recipientQuestions);
        
        interleavedQuestionsRef.current = interleaved;
        questionSourcesRef.current = sources;

        // Create preset object
        if (interleaved.length > 0) {
          const topics = [...new Set(interleaved.map(q => q.topic))];
          const mergedPreset: TopicPreset = {
            id: 'merged',
            name: callPresetName,
            topics,
            questions: interleaved
          };
          setPreset(mergedPreset);
        }

        const isCurrentLeader = !!userIdRef.current && leaderId === userIdRef.current;
        setIsLeader(isCurrentLeader);

        // Try to load last prompt from database
        try {
          const { data: lastSignal } = await supabase
            .from('call_signals')
            .select('signal_data, created_at')
            .eq('call_id', callId)
            .eq('signal_type', 'call_state')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (lastSignal && (lastSignal as any).signal_data?.type === 'prompt_update') {
            handleSignal((lastSignal as any).signal_data, (lastSignal as any).created_at);
            if (active) {
              setReady(true);
              initCompletedRef.current = true;
            }
            return;
          }
        } catch (error) {
          console.warn('Unable to load last prompt:', error);
        }

        // No existing prompt - leader seeds initial question
        if (isCurrentLeader && interleavedQuestionsRef.current.length > 0) {
          const initialIdx = 0;
          const initialQuestion = interleavedQuestionsRef.current[initialIdx];
          usedIndicesRef.current.add(initialIdx);
          
          await broadcastPromptRef.current?.(initialQuestion, initialIdx, [initialIdx]);
        }

        if (active) {
          setReady(true);
          initCompletedRef.current = true;
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
        if (active) {
          setCurrentQuestion(getRandomQuestion(resolvedPreset));
          setLastChangeAt(Date.now());
          setReady(true);
          initCompletedRef.current = true;
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [callId, resolvedPreset, handleSignal]);

  // Subscribe to prompt updates
  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel(`prompt_sync:${callId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'call_signals',
          filter: `call_id=eq.${callId}`,
        },
        (payload) => {
          const signal = payload.new;
          if (
            signal?.signal_type === 'call_state' &&
            signal.signal_data?.type === 'prompt_update' &&
            signal.signal_data?.updatedBy !== userIdRef.current // Ignore own broadcasts
          ) {
            handleSignal(signal.signal_data as PromptSignalData, signal.created_at);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (e) {
          console.warn('Error unsubscribing:', e);
        }
        channelRef.current = null;
      }
    };
  }, [callId, handleSignal]);

  // Timer countdown and auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastChangeAt) / 1000);
      const remaining = Math.max(0, QUESTION_INTERVAL_SECONDS - elapsed);
      setNextQuestionIn(remaining);

      // Leader auto-refreshes when timer hits 0
      if (isLeader && remaining <= 0 && !refreshingRef.current && callId && initCompletedRef.current) {
        refreshPrompt();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [callId, isLeader, lastChangeAt, refreshPrompt]);

  return {
    currentQuestion,
    nextQuestionIn,
    preset,
    refreshPrompt,
    ready,
  };
}
