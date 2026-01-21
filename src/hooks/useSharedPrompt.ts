import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  QUESTION_INTERVAL_SECONDS,
  Question,
  TopicPreset,
  getPresetById,
  getRandomQuestion,
  resolvePresetFromSelection,
} from '@/data/questions';
import { sendCallSignal, subscribeToCallSignals } from '@/lib/api/agora';
import { getCallById } from '@/lib/api/calls';
import { supabase } from '@/lib/supabase';

interface PromptSelection {
  topicKey?: string;
  customTopics?: string[];
  customQuestions?: string[];
}

interface PromptSignalData {
  type: 'prompt_update';
  question: Question;
  presetId?: string;
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
  const [nextQuestionIn, setNextQuestionIn] = useState<number>(
    QUESTION_INTERVAL_SECONDS
  );
  const [lastChangeAt, setLastChangeAt] = useState<number>(Date.now());
  const [isLeader, setIsLeader] = useState(false);
  const [ready, setReady] = useState(false);
  const [presetLoadedFromDb, setPresetLoadedFromDb] = useState(false);

  const userIdRef = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof subscribeToCallSignals> | null>(
    null
  );
  const refreshingRef = useRef(false);

  // CRITICAL FIX: Only use resolvedPreset if we haven't loaded from database yet
  // This prevents local selection from overriding the synchronized database preset
  useEffect(() => {
    if (!callId && !presetLoadedFromDb) {
      // No call ID means local-only mode, use the selection
      setPreset(resolvedPreset);
    }
  }, [resolvedPreset, callId, presetLoadedFromDb]);

  const updateFromSignal = useCallback(
    (data: PromptSignalData, createdAt?: string) => {
      if (!data?.question) return;

      const nextPreset =
        data.presetId === 'custom' ||
        (data.customQuestions && data.customQuestions.length > 0)
          ? resolvePresetFromSelection(
              'custom',
              data.topics || [],
              data.customQuestions || []
            )
          : getPresetById(data.presetId || preset.id);

      setPreset(nextPreset);
      setCurrentQuestion(data.question);

      const timestamp = data.updatedAt || createdAt || new Date().toISOString();
      const timestampMs = new Date(timestamp).getTime();
      setLastChangeAt(timestampMs);
      const elapsed = Math.floor((Date.now() - timestampMs) / 1000);
      setNextQuestionIn(Math.max(0, QUESTION_INTERVAL_SECONDS - elapsed));
    },
    [preset.id]
  );

  const broadcastPrompt = useCallback(
    async (question: Question, presetOverride?: TopicPreset) => {
      const usedPreset = presetOverride || preset || resolvedPreset;
      const updatedAt = new Date().toISOString();

      setCurrentQuestion(question);
      setLastChangeAt(new Date(updatedAt).getTime());
      setNextQuestionIn(QUESTION_INTERVAL_SECONDS);

      if (!callId || !userIdRef.current) {
        return;
      }

      const payload: PromptSignalData = {
        type: 'prompt_update',
        question,
        presetId: usedPreset.id,
        presetName: usedPreset.name,
        topics: usedPreset.topics,
        customQuestions:
          usedPreset.id === 'custom'
            ? usedPreset.customQuestions ||
              usedPreset.questions.map((q) => q.text)
            : undefined,
        updatedAt,
        updatedBy: userIdRef.current,
      };

      try {
        console.log('📢 Broadcasting prompt update:', question.text);
        await sendCallSignal(callId, 'call_state', payload, 'connected');
        console.log('✅ Prompt broadcast successful');
      } catch (error) {
        console.error('❌ Failed to broadcast prompt update:', error);
      }
    },
    [callId, preset, resolvedPreset]
  );

  const refreshPrompt = useCallback(async () => {
    console.log('🔄 refreshPrompt called', { hasCallId: !!callId, userId: userIdRef.current });
    const sourcePreset = preset || resolvedPreset;
    const question = getRandomQuestion(sourcePreset);
    console.log('🎲 Generated new question:', question.text);
    await broadcastPrompt(question, sourcePreset);
    console.log('✅ refreshPrompt completed');
  }, [broadcastPrompt, preset, resolvedPreset, callId]);

  // Load last prompt and seed an initial one if needed
  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userIdRef.current = user?.id || null;

        if (!callId) {
          const question = getRandomQuestion(resolvedPreset);
          if (!active) return;
          setCurrentQuestion(question);
          setLastChangeAt(Date.now());
          setReady(true);
          return;
        }

        // Determine a stable leader to own automatic rotations AND get topic config from call
        let leaderId: string | null = null;
        let callTopicPreset: TopicPreset | null = null;

        try {
          const call = await getCallById(callId);
          console.log('📞 Call data from database:', {
            id: call?.id,
            caller_topic_preset: call?.caller_topic_preset,
            caller_custom_topics: call?.caller_custom_topics,
            caller_custom_questions: call?.caller_custom_questions,
            recipient_topic_preset: call?.recipient_topic_preset,
            recipient_custom_topics: call?.recipient_custom_topics,
            recipient_custom_questions: call?.recipient_custom_questions
          });

          if (call) {
            const ids = [call.caller_id, call.recipient_id].filter(
              Boolean
            ) as string[];
            leaderId = ids.sort()[0] || null;

            // Load topic configuration from call_history - this is the source of truth
            // For now, use caller's preset (will implement merging in next step)
            if (call.caller_topic_preset) {
              if (call.caller_topic_preset === 'custom' && call.caller_custom_topics && call.caller_custom_questions) {
                callTopicPreset = resolvePresetFromSelection(
                  'custom',
                  call.caller_custom_topics,
                  call.caller_custom_questions
                );
              } else {
                callTopicPreset = getPresetById(call.caller_topic_preset);
              }

              // Update the preset to match what's stored in the database
              if (callTopicPreset && active) {
                console.log('✅ Loaded caller preset from database:', callTopicPreset.name);
                setPreset(callTopicPreset);
                setPresetLoadedFromDb(true);
              }
            } else {
              console.warn('⚠️ No caller_topic_preset found in call_history! Will use fallback.');
            }
          }
        } catch (error) {
          console.error('❌ Unable to resolve call participants for prompt sync:', error);
        }

        const isCurrentLeader = !!user?.id && leaderId === user?.id;
        if (!active) return;
        setIsLeader(isCurrentLeader);

        // Try to hydrate from the latest prompt signal
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
            console.log('✅ Loaded prompt from last signal');
            const signalData = (lastSignal as any).signal_data as PromptSignalData;
            updateFromSignal(signalData, (lastSignal as any).created_at);

            // If leader, REBROADCAST the loaded question so non-leader gets it
            if (isCurrentLeader && signalData.question) {
              console.log('👑 Leader rebroadcasting loaded question for non-leader');
              await broadcastPrompt(signalData.question, callTopicPreset || resolvedPreset);
            }

            if (active) {
              setPresetLoadedFromDb(true);
              setReady(true);
            }
            return;
          }
        } catch (error) {
          console.warn('Unable to load last prompt signal:', error);
        }

        // No existing prompt found: seed one
        // Use callTopicPreset if available (from database), otherwise fall back to resolvedPreset
        const presetToUse = callTopicPreset || resolvedPreset;
        const initialQuestion = getRandomQuestion(presetToUse);

        if (isCurrentLeader) {
          // Leader broadcasts the initial question
          console.log('👑 Leader seeding initial question from preset:', presetToUse.name);
          setPreset(presetToUse);
          setPresetLoadedFromDb(!!callTopicPreset);
          await broadcastPrompt(initialQuestion, presetToUse);
        } else {
          // Non-leader waits for the broadcast - don't seed locally
          console.log('⏳ Non-leader waiting for initial question from leader...');
          setPreset(presetToUse);
          setPresetLoadedFromDb(!!callTopicPreset);
          // Don't set a question - wait for the broadcast
        }

        if (active) setReady(true);
      } catch (error) {
        console.error('Failed to initialize prompt sync:', error);
        if (active) {
          setCurrentQuestion(getRandomQuestion(resolvedPreset));
          setLastChangeAt(Date.now());
          setReady(true);
        }
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [broadcastPrompt, callId, resolvedPreset, updateFromSignal]);

  // Subscribe to live prompt updates
  useEffect(() => {
    if (!callId) return;
    console.log('🎧 Setting up prompt update subscription for call:', callId);

    // Use unique channel name to avoid conflicts with useAgoraCall subscription
    const channel = supabase
      .channel(`prompt_updates:${callId}`)
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
          console.log('📨 Raw signal received:', {
            signal_type: signal?.signal_type,
            has_signal_data: !!signal?.signal_data,
            signal_data_type: signal?.signal_data?.type,
            full_signal: signal
          });

          if (signal?.signal_type === 'call_state' && signal.signal_data?.type === 'prompt_update') {
            console.log('🔔 Received prompt update signal:', signal.signal_data);
            updateFromSignal(signal.signal_data as PromptSignalData, signal.created_at);
          } else {
            console.log('⚠️ Signal ignored - not a prompt update');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Prompt subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (error) {
          console.warn('Error unsubscribing from prompt channel:', error);
        }
        channelRef.current = null;
      }
    };
  }, [callId, updateFromSignal]);

  // Keep countdown in sync and rotate automatically from the leader
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastChangeAt) / 1000);
      const remaining = Math.max(0, QUESTION_INTERVAL_SECONDS - elapsed);
      setNextQuestionIn(remaining);

      if (
        isLeader &&
        remaining <= 0 &&
        !refreshingRef.current &&
        callId
      ) {
        refreshingRef.current = true;
        refreshPrompt()
          .catch((error) => console.warn('Auto-refresh prompt failed:', error))
          .finally(() => {
            refreshingRef.current = false;
          });
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
