import { supabase } from '@/lib/supabase';

export interface Circle {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  invite_code: string;
  allow_member_invites: boolean;
  require_approval: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'suspended';
  joined_at: string;
}

/**
 * Get all circles the current user is a member of
 */
export async function getUserCircles() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('circle_members')
    .select(`
      *,
      circles (*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) throw error;

  return data.map(item => item.circles);
}

/**
 * Get circle details by ID
 */
export async function getCircleById(circleId: string) {
  const { data, error } = await supabase
    .from('circles')
    .select('*')
    .eq('id', circleId)
    .single();

  if (error) throw error;

  return data;
}

/**
 * Get all members of a circle
 */
export async function getCircleMembers(circleId: string) {
  const { data, error } = await supabase
    .from('circle_members')
    .select(`
      *,
      profiles (*)
    `)
    .eq('circle_id', circleId)
    .eq('status', 'active');

  if (error) throw error;

  return data;
}

/**
 * Create a new circle
 */
export async function createCircle(circle: {
  name: string;
  description: string;
  logo_url?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Generate a unique invite code
  const inviteCode = generateInviteCode();

  const { data: circleData, error: circleError } = await supabase
    .from('circles')
    .insert({
      ...circle,
      invite_code: inviteCode,
      created_by: user.id,
    })
    .select()
    .single();

  if (circleError) throw circleError;

  // Add creator as admin
  const { error: memberError } = await supabase
    .from('circle_members')
    .insert({
      circle_id: circleData.id,
      user_id: user.id,
      role: 'admin',
      status: 'active',
    });

  if (memberError) throw memberError;

  return circleData;
}

/**
 * Join a circle using invite code
 */
export async function joinCircleWithCode(inviteCode: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Find the circle with this invite code
  const { data: circle, error: circleError } = await supabase
    .from('circles')
    .select('*')
    .eq('invite_code', inviteCode)
    .single();

  if (circleError) throw new Error('Invalid invite code');

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('circle_members')
    .select('*')
    .eq('circle_id', circle.id)
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    throw new Error('You are already a member of this circle');
  }

  // Add user to circle
  const { data, error } = await supabase
    .from('circle_members')
    .insert({
      circle_id: circle.id,
      user_id: user.id,
      role: 'member',
      status: circle.require_approval ? 'pending' : 'active',
    })
    .select()
    .single();

  if (error) throw error;

  return { circle, membership: data };
}

/**
 * Leave a circle
 */
export async function leaveCircle(circleId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('circle_members')
    .delete()
    .eq('circle_id', circleId)
    .eq('user_id', user.id);

  if (error) throw error;
}

/**
 * Update circle member role (admin only)
 */
export async function updateMemberRole(
  circleId: string,
  userId: string,
  newRole: 'admin' | 'moderator' | 'member'
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  // Check if current user is admin
  const { data: currentMember } = await supabase
    .from('circle_members')
    .select('role')
    .eq('circle_id', circleId)
    .eq('user_id', user.id)
    .single();

  if (!currentMember || currentMember.role !== 'admin') {
    throw new Error('Only admins can change member roles');
  }

  const { data, error } = await supabase
    .from('circle_members')
    .update({ role: newRole })
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Get online members in a circle
 */
export async function getOnlineCircleMembers(circleId: string) {
  const { data, error } = await supabase
    .from('circle_members')
    .select(`
      user_id,
      profiles!inner (
        *
      )
    `)
    .eq('circle_id', circleId)
    .eq('status', 'active')
    .eq('profiles.is_online', true);

  if (error) throw error;

  return data.map(item => item.profiles);
}

/**
 * Get member counts for a circle (total and online)
 */
export async function getCircleMemberCounts(circleId: string) {
  // Get total member count
  const { count: totalCount, error: totalError } = await supabase
    .from('circle_members')
    .select('*', { count: 'exact', head: true })
    .eq('circle_id', circleId)
    .eq('status', 'active');

  if (totalError) throw totalError;

  // Get online member count
  const { count: onlineCount, error: onlineError } = await supabase
    .from('circle_members')
    .select('profiles!inner(is_online)', { count: 'exact', head: true })
    .eq('circle_id', circleId)
    .eq('status', 'active')
    .eq('profiles.is_online', true);

  if (onlineError) throw onlineError;

  return {
    total: totalCount || 0,
    online: onlineCount || 0
  };
}

/**
 * Get or create the default "Mentor the Young" circle
 */
export async function getOrCreateDefaultCircle() {
  // Try to find existing circle
  const { data: existingCircle, error: findError } = await supabase
    .from('circles')
    .select('*')
    .eq('name', 'Mentor the Young')
    .single();

  if (existingCircle) {
    return existingCircle;
  }

  // If not found, create it (use a service account or admin for this in production)
  const { data: newCircle, error: createError } = await supabase
    .from('circles')
    .insert({
      name: 'Mentor the Young',
      description: 'Mentor the Young Bulgaria is a nonprofit organization dedicated to empowering young individuals through mentorship programs. We connect experienced professionals with ambitious youth to foster personal and professional growth.',
      invite_code: 'MENTORYOUNG2024',
      allow_member_invites: true,
      require_approval: false,
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating default circle:', createError);
    throw createError;
  }

  return newCircle;
}

/**
 * Add user to default circle
 */
export async function addUserToDefaultCircle(userId: string) {
  try {
    // Get or create the default circle
    const defaultCircle = await getOrCreateDefaultCircle();

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('circle_members')
      .select('id')
      .eq('circle_id', defaultCircle.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      return; // Already a member
    }

    // Add user to circle
    const { error } = await supabase
      .from('circle_members')
      .insert({
        circle_id: defaultCircle.id,
        user_id: userId,
        role: 'member',
        status: 'active',
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error adding user to default circle:', error);
    // Don't throw - circle membership is not critical for onboarding
  }
}

/**
 * Generate a random invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Validate an invite code
 */
export async function validateInviteCode(code: string) {
  const { data: inviteCode } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code)
    .eq('is_active', true)
    .single();

  if (!inviteCode) {
    return { valid: false, reason: 'Invalid code' };
  }

  if (inviteCode.expires_at && new Date(inviteCode.expires_at) < new Date()) {
    return { valid: false, reason: 'Code expired' };
  }

  if (inviteCode.max_uses && inviteCode.uses_count >= inviteCode.max_uses) {
    return { valid: false, reason: 'Code limit reached' };
  }

  return { valid: true, inviteCode };
}

/**
 * Use an invite code
 */
export async function useInviteCode(code: string) {
  const { data: inviteCode, error } = await supabase
    .from('invite_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (error || !inviteCode) {
    throw new Error('Invalid invite code');
  }

  // Increment uses count
  await supabase
    .from('invite_codes')
    .update({ uses_count: inviteCode.uses_count + 1 })
    .eq('id', inviteCode.id);

  return inviteCode;
}

