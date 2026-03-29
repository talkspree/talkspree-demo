import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type PresetType = 'default' | 'circle' | 'user';

// Base topic interface (common fields)
interface BaseTopic {
  id: string;
  name: string;
  description: string | null;
  questions: string[];  // JSONB array of question strings
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// Default topics (global, immutable)
export interface DefaultTopic extends BaseTopic {}

// Circle topics (created by circle admins)
export interface CircleTopic extends BaseTopic {
  circle_id: string;
  created_by: string | null;
  updated_at: string;
}

// User topics (personal)
export interface UserTopic extends BaseTopic {
  user_id: string;
  updated_at: string;
}

// Base preset interface
interface BasePreset {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

// Default presets (global, immutable)
export interface DefaultPreset extends BasePreset {
  topic_ids: string[];
}

// Circle presets
export interface CirclePreset extends BasePreset {
  circle_id: string;
  default_topic_ids: string[];
  circle_topic_ids: string[];
  created_by: string | null;
  updated_at: string;
}

// User presets
export interface UserPreset extends BasePreset {
  user_id: string;
  default_topic_ids: string[];
  circle_topic_ids: string[];
  user_topic_ids: string[];
  custom_questions: string[];  // User's own questions, editable
  updated_at: string;
}

// Unified topic type for UI (combines all topic types)
export interface UnifiedTopic {
  id: string;
  name: string;
  description: string | null;
  questions: string[];
  type: 'default' | 'circle' | 'user';
  circleId?: string;
}

// Unified preset type for UI
export interface UnifiedPreset {
  id: string;
  name: string;
  description: string | null;
  type: PresetType;
  circleId?: string;
}

// Simple question format for calls
export interface SimpleQuestion {
  text: string;
  topic: string;
}

// ============================================================================
// DEFAULT TOPICS & PRESETS (Read-only for most users)
// ============================================================================

/**
 * Get all default topics
 */
export async function getDefaultTopics(): Promise<DefaultTopic[]> {
  const { data, error } = await supabase
    .from('default_topics')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

/**
 * Get all default presets
 */
export async function getDefaultPresets(): Promise<DefaultPreset[]> {
  const { data, error } = await supabase
    .from('default_presets')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific default preset by ID
 */
export async function getDefaultPresetById(presetId: string): Promise<DefaultPreset | null> {
  const { data, error } = await supabase
    .from('default_presets')
    .select('*')
    .eq('id', presetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

// ============================================================================
// CIRCLE TOPICS & PRESETS
// ============================================================================

/**
 * Get topics for a specific circle
 */
export async function getCircleTopics(circleId: string): Promise<CircleTopic[]> {
  const { data, error } = await supabase
    .from('circle_topics')
    .select('*')
    .eq('circle_id', circleId)
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

/**
 * Get presets for a specific circle
 */
export async function getCirclePresets(circleId: string): Promise<CirclePreset[]> {
  const { data, error } = await supabase
    .from('circle_presets')
    .select('*')
    .eq('circle_id', circleId)
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

/**
 * Create a circle topic (admin only)
 */
export async function createCircleTopic(
  circleId: string,
  data: { name: string; description?: string; questions: string[] }
): Promise<CircleTopic> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: topic, error } = await supabase
    .from('circle_topics')
    .insert({
      circle_id: circleId,
      name: data.name,
      description: data.description || null,
      questions: data.questions,
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return topic;
}

/**
 * Update a circle topic (admin only)
 */
export async function updateCircleTopic(
  topicId: string,
  data: { name?: string; description?: string; questions?: string[]; is_active?: boolean }
): Promise<CircleTopic> {
  const { data: topic, error } = await supabase
    .from('circle_topics')
    .update(data)
    .eq('id', topicId)
    .select()
    .single();

  if (error) throw error;
  return topic;
}

/**
 * Delete a circle topic (admin only)
 */
export async function deleteCircleTopic(topicId: string): Promise<void> {
  const { error } = await supabase
    .from('circle_topics')
    .delete()
    .eq('id', topicId);

  if (error) throw error;
}

/**
 * Create a circle preset (admin only)
 */
export async function createCirclePreset(
  circleId: string,
  data: { 
    name: string; 
    description?: string; 
    defaultTopicIds?: string[];
    circleTopicIds?: string[];
  }
): Promise<CirclePreset> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: preset, error } = await supabase
    .from('circle_presets')
    .insert({
      circle_id: circleId,
      name: data.name,
      description: data.description || null,
      default_topic_ids: data.defaultTopicIds || [],
      circle_topic_ids: data.circleTopicIds || [],
      created_by: user.id
    })
    .select()
    .single();

  if (error) throw error;
  return preset;
}

/**
 * Update a circle preset (admin only)
 */
export async function updateCirclePreset(
  presetId: string,
  data: { 
    name?: string; 
    description?: string; 
    defaultTopicIds?: string[];
    circleTopicIds?: string[];
    is_active?: boolean;
  }
): Promise<CirclePreset> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.defaultTopicIds !== undefined) updateData.default_topic_ids = data.defaultTopicIds;
  if (data.circleTopicIds !== undefined) updateData.circle_topic_ids = data.circleTopicIds;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const { data: preset, error } = await supabase
    .from('circle_presets')
    .update(updateData)
    .eq('id', presetId)
    .select()
    .single();

  if (error) throw error;
  return preset;
}

/**
 * Delete a circle preset (admin only)
 */
export async function deleteCirclePreset(presetId: string): Promise<void> {
  const { error } = await supabase
    .from('circle_presets')
    .delete()
    .eq('id', presetId);

  if (error) throw error;
}

// ============================================================================
// USER TOPICS & PRESETS (Personal)
// ============================================================================

/**
 * Get current user's topics
 */
export async function getUserTopics(): Promise<UserTopic[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_topics')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

/**
 * Get current user's presets
 */
export async function getUserPresets(): Promise<UserPreset[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('user_presets')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

/**
 * Create a user topic
 */
export async function createUserTopic(
  data: { name: string; description?: string; questions: string[] }
): Promise<UserTopic> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: topic, error } = await supabase
    .from('user_topics')
    .insert({
      user_id: user.id,
      name: data.name,
      description: data.description || null,
      questions: data.questions
    })
    .select()
    .single();

  if (error) throw error;
  return topic;
}

/**
 * Update a user topic
 */
export async function updateUserTopic(
  topicId: string,
  data: { name?: string; description?: string; questions?: string[]; is_active?: boolean }
): Promise<UserTopic> {
  const { data: topic, error } = await supabase
    .from('user_topics')
    .update(data)
    .eq('id', topicId)
    .select()
    .single();

  if (error) throw error;
  return topic;
}

/**
 * Delete a user topic
 */
export async function deleteUserTopic(topicId: string): Promise<void> {
  const { error } = await supabase
    .from('user_topics')
    .delete()
    .eq('id', topicId);

  if (error) throw error;
}

/**
 * Create a user preset
 */
export async function createUserPreset(
  data: { 
    name: string; 
    description?: string; 
    defaultTopicIds?: string[];
    circleTopicIds?: string[];
    userTopicIds?: string[];
    customQuestions?: string[];
  }
): Promise<UserPreset> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: preset, error } = await supabase
    .from('user_presets')
    .insert({
      user_id: user.id,
      name: data.name,
      description: data.description || null,
      default_topic_ids: data.defaultTopicIds || [],
      circle_topic_ids: data.circleTopicIds || [],
      user_topic_ids: data.userTopicIds || [],
      custom_questions: data.customQuestions || []
    })
    .select()
    .single();

  if (error) throw error;
  return preset;
}

/**
 * Update a user preset
 */
export async function updateUserPreset(
  presetId: string,
  data: { 
    name?: string; 
    description?: string; 
    defaultTopicIds?: string[];
    circleTopicIds?: string[];
    userTopicIds?: string[];
    customQuestions?: string[];
    is_active?: boolean;
  }
): Promise<UserPreset> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.defaultTopicIds !== undefined) updateData.default_topic_ids = data.defaultTopicIds;
  if (data.circleTopicIds !== undefined) updateData.circle_topic_ids = data.circleTopicIds;
  if (data.userTopicIds !== undefined) updateData.user_topic_ids = data.userTopicIds;
  if (data.customQuestions !== undefined) updateData.custom_questions = data.customQuestions;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const { data: preset, error } = await supabase
    .from('user_presets')
    .update(updateData)
    .eq('id', presetId)
    .select()
    .single();

  if (error) throw error;
  return preset;
}

/**
 * Delete a user preset
 */
export async function deleteUserPreset(presetId: string): Promise<void> {
  const { error } = await supabase
    .from('user_presets')
    .delete()
    .eq('id', presetId);

  if (error) throw error;
}

// ============================================================================
// UNIFIED GETTERS (Combine all sources for UI)
// ============================================================================

/**
 * Get circle settings (for checking disabled default presets)
 */
async function getCircleSettings(circleId: string): Promise<{
  disabled_default_preset_ids: string[];
} | null> {
  try {
    const { data } = await supabase
      .from('circles')
      .select('disabled_default_preset_ids')
      .eq('id', circleId)
      .single();
    return data || { disabled_default_preset_ids: [] };
  } catch {
    return { disabled_default_preset_ids: [] };
  }
}

/**
 * Get all visible topics for a user in a circle context — parallelized
 */
export async function getVisibleTopics(circleId?: string | null): Promise<UnifiedTopic[]> {
  const [defaultTopics, circleTopics, userTopics] = await Promise.all([
    getDefaultTopics(),
    circleId ? getCircleTopics(circleId).catch(() => [] as CircleTopic[]) : Promise.resolve([] as CircleTopic[]),
    getUserTopics().catch(() => [] as UserTopic[]),
  ]);

  const results: UnifiedTopic[] = [];

  results.push(...defaultTopics.map(t => ({
    id: t.id, name: t.name, description: t.description, questions: t.questions, type: 'default' as const,
  })));

  results.push(...circleTopics.map(t => ({
    id: t.id, name: t.name, description: t.description, questions: t.questions, type: 'circle' as const, circleId: t.circle_id,
  })));

  results.push(...userTopics.map(t => ({
    id: t.id, name: t.name, description: t.description, questions: t.questions, type: 'user' as const,
  })));

  return results;
}

/**
 * Get all visible presets for a user in a circle context — parallelized.
 * Also returns the raw user presets to avoid a second fetch.
 */
export async function getVisiblePresets(circleId?: string | null): Promise<UnifiedPreset[]> {
  const [settings, defaultPresets, circlePresets, userPresets] = await Promise.all([
    circleId ? getCircleSettings(circleId) : Promise.resolve(null),
    getDefaultPresets(),
    circleId ? getCirclePresets(circleId).catch(() => [] as CirclePreset[]) : Promise.resolve([] as CirclePreset[]),
    getUserPresets().catch(() => [] as UserPreset[]),
  ]);

  const disabledPresetIds = settings?.disabled_default_preset_ids ?? [];
  const results: UnifiedPreset[] = [];

  results.push(...defaultPresets
    .filter(p => !disabledPresetIds.includes(p.id))
    .map(p => ({
      id: p.id, name: p.name, description: p.description, type: 'default' as const,
    })));

  results.push(...circlePresets.map(p => ({
    id: p.id, name: p.name, description: p.description, type: 'circle' as const, circleId: p.circle_id,
  })));

  results.push(...userPresets.map(p => ({
    id: p.id, name: p.name, description: p.description, type: 'user' as const,
  })));

  return results;
}

/**
 * Get all visible presets AND user presets in one call.
 * This avoids the duplicate getUserPresets() call that FiltersSection was doing.
 */
export async function getVisiblePresetsWithUserPresets(circleId?: string | null): Promise<{
  presets: UnifiedPreset[];
  userPresets: UserPreset[];
}> {
  const [settings, defaultPresets, circlePresets, userPresets] = await Promise.all([
    circleId ? getCircleSettings(circleId) : Promise.resolve(null),
    getDefaultPresets(),
    circleId ? getCirclePresets(circleId).catch(() => [] as CirclePreset[]) : Promise.resolve([] as CirclePreset[]),
    getUserPresets().catch(() => [] as UserPreset[]),
  ]);

  const disabledPresetIds = settings?.disabled_default_preset_ids ?? [];
  const presets: UnifiedPreset[] = [];

  presets.push(...defaultPresets
    .filter(p => !disabledPresetIds.includes(p.id))
    .map(p => ({
      id: p.id, name: p.name, description: p.description, type: 'default' as const,
    })));

  presets.push(...circlePresets.map(p => ({
    id: p.id, name: p.name, description: p.description, type: 'circle' as const, circleId: p.circle_id,
  })));

  presets.push(...userPresets.map(p => ({
    id: p.id, name: p.name, description: p.description, type: 'user' as const,
  })));

  return { presets, userPresets };
}

/**
 * Get ALL questions from all available topics (for "No Topic" mode)
 * Pulls from default topics + circle topics (if in a circle)
 */
export async function getAllAvailableQuestions(circleId?: string | null): Promise<SimpleQuestion[]> {
  const questions: SimpleQuestion[] = [];

  // Get default topics
  try {
    const defaultTopics = await getDefaultTopics();
    for (const topic of defaultTopics) {
      questions.push(...topic.questions.map(q => ({ text: q, topic: topic.name })));
    }
  } catch (error) {
    console.warn('Could not load default topics:', error);
  }

  // Get circle topics (if in a circle)
  if (circleId) {
    try {
      const circleTopics = await getCircleTopics(circleId);
      for (const topic of circleTopics) {
        questions.push(...topic.questions.map(q => ({ text: q, topic: topic.name })));
      }
    } catch (error) {
      console.warn('Could not load circle topics:', error);
    }
  }

  return questions;
}

/**
 * Get a random question from all available topics (for "No Topic" mode)
 */
export async function getRandomQuestionFromAll(circleId?: string | null): Promise<SimpleQuestion> {
  const questions = await getAllAvailableQuestions(circleId);
  if (questions.length === 0) {
    return { text: 'What would you like to talk about?', topic: 'General' };
  }
  return questions[Math.floor(Math.random() * questions.length)];
}

// ============================================================================
// QUESTION GETTERS (For calls)
// ============================================================================

/**
 * Get all questions from a preset (any type)
 */
export async function getPresetQuestions(
  presetId: string,
  presetType: PresetType
): Promise<SimpleQuestion[]> {
  try {
    if (presetType === 'default') {
      const { data, error } = await supabase.rpc('get_default_preset_questions', {
        p_preset_id: presetId
      });
      if (error) throw error;
      return (data || []).map((q: any) => ({ text: q.question, topic: q.topic_name }));
    } else if (presetType === 'circle') {
      const { data, error } = await supabase.rpc('get_circle_preset_questions', {
        p_preset_id: presetId
      });
      if (error) throw error;
      return (data || []).map((q: any) => ({ text: q.question, topic: q.topic_name }));
    } else if (presetType === 'user') {
      const { data, error } = await supabase.rpc('get_user_preset_questions', {
        p_preset_id: presetId
      });
      if (error) throw error;
      return (data || []).map((q: any) => ({ text: q.question, topic: q.topic_name }));
    }
  } catch (error) {
    console.warn('Failed to get preset questions via RPC, falling back to manual:', error);
  }

  // Fallback: manual fetch
  return getPresetQuestionsFallback(presetId, presetType);
}

/**
 * Fallback for getting preset questions without RPC
 */
async function getPresetQuestionsFallback(
  presetId: string,
  presetType: PresetType
): Promise<SimpleQuestion[]> {
  const questions: SimpleQuestion[] = [];

  if (presetType === 'default') {
    const preset = await getDefaultPresetById(presetId);
    if (!preset) return [];

    const defaultTopics = await getDefaultTopics();
    for (const topicId of preset.topic_ids) {
      const topic = defaultTopics.find(t => t.id === topicId);
      if (topic) {
        questions.push(...topic.questions.map(q => ({ text: q, topic: topic.name })));
      }
    }
  } else if (presetType === 'circle') {
    const { data: preset } = await supabase
      .from('circle_presets')
      .select('*')
      .eq('id', presetId)
      .single();

    if (!preset) return [];

    // Get default topics
    const defaultTopics = await getDefaultTopics();
    for (const topicId of (preset.default_topic_ids || [])) {
      const topic = defaultTopics.find(t => t.id === topicId);
      if (topic) {
        questions.push(...topic.questions.map(q => ({ text: q, topic: topic.name })));
      }
    }

    // Get circle topics
    const circleTopics = await getCircleTopics(preset.circle_id);
    for (const topicId of (preset.circle_topic_ids || [])) {
      const topic = circleTopics.find(t => t.id === topicId);
      if (topic) {
        questions.push(...topic.questions.map(q => ({ text: q, topic: topic.name })));
      }
    }
  } else if (presetType === 'user') {
    const { data: preset } = await supabase
      .from('user_presets')
      .select('*')
      .eq('id', presetId)
      .single();

    if (!preset) return [];

    // Get default topics
    const defaultTopics = await getDefaultTopics();
    for (const topicId of (preset.default_topic_ids || [])) {
      const topic = defaultTopics.find(t => t.id === topicId);
      if (topic) {
        questions.push(...topic.questions.map(q => ({ text: q, topic: topic.name })));
      }
    }

    // Get user topics
    const userTopics = await getUserTopics();
    for (const topicId of (preset.user_topic_ids || [])) {
      const topic = userTopics.find(t => t.id === topicId);
      if (topic) {
        questions.push(...topic.questions.map(q => ({ text: q, topic: topic.name })));
      }
    }

    // Add custom questions if they exist
    if (preset.custom_questions && Array.isArray(preset.custom_questions)) {
      questions.push(...preset.custom_questions.map((q: string) => ({ 
        text: q, 
        topic: 'Custom' 
      })));
    }
  }

  return questions;
}

/**
 * Get random questions from a preset
 */
export async function getRandomPresetQuestions(
  presetId: string,
  presetType: PresetType,
  count: number = 10
): Promise<SimpleQuestion[]> {
  try {
    const { data, error } = await supabase.rpc('get_random_preset_questions', {
      p_preset_id: presetId,
      p_preset_type: presetType,
      p_count: count
    });
    if (error) throw error;
    return (data || []).map((q: any) => ({ text: q.question, topic: q.topic_name }));
  } catch {
    // Fallback: get all and shuffle
    const allQuestions = await getPresetQuestions(presetId, presetType);
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

/**
 * Get a single random question from a preset
 */
export async function getRandomQuestionFromPreset(
  presetId: string,
  presetType: PresetType
): Promise<SimpleQuestion> {
  const questions = await getRandomPresetQuestions(presetId, presetType, 1);
  if (questions.length === 0) {
    return { text: 'What would you like to talk about?', topic: 'General' };
  }
  return questions[0];
}
