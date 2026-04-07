import { supabase } from '@/lib/supabase';

export interface Circle {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  cover_image_url: string | null;
  invite_code: string;
  allow_member_invites: boolean;
  require_approval: boolean;
  disabled_default_preset_ids: string[];
  allow_member_custom_topics: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  social_links: {
    website?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    email?: string;
    youtube?: string;
    tiktok?: string;
  };
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  type: 'admin' | 'moderator' | 'member'; // Member type (admin/moderator/member)
  role: string | null; // Actual user role in circle (Mentor, Mentee, Alumni, etc.)
  admin_type: 'creator' | 'circle_admin' | null;
  status: 'active' | 'pending' | 'suspended';
  joined_at: string;
}

export interface CircleRole {
  id: string;
  circle_id: string;
  name: string;
  description: string | null;
  color: string;
  display_order: number;
}

export interface CircleTopicPreset {
  id: string;
  circle_id: string;
  name: string;
  description: string | null;
  topics: string[];
  custom_questions: string[];
  is_active: boolean;
  display_order: number;
}

export type AdminType = 'super_admin' | 'creator' | 'circle_admin' | null;

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
      type: 'admin',
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
      type: 'member',
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
 * Get member counts for a circle (total and online) — parallelized
 */
export async function getCircleMemberCounts(circleId: string) {
  const [totalResult, onlineResult] = await Promise.all([
    supabase
      .from('circle_members')
      .select('*', { count: 'exact', head: true })
      .eq('circle_id', circleId)
      .eq('status', 'active'),
    supabase
      .from('circle_members')
      .select('profiles!inner(is_online)', { count: 'exact', head: true })
      .eq('circle_id', circleId)
      .eq('status', 'active')
      .eq('profiles.is_online', true),
  ]);

  if (totalResult.error) throw totalResult.error;
  if (onlineResult.error) throw onlineResult.error;

  return {
    total: totalResult.count || 0,
    online: onlineResult.count || 0
  };
}

// Module-level cache for default circle (rarely changes during a session)
let _cachedDefaultCircle: any = null;
let _defaultCircleFetchPromise: Promise<any> | null = null;

/**
 * Clear the default circle cache (call after admin edits to circle)
 */
export function invalidateDefaultCircleCache() {
  _cachedDefaultCircle = null;
  _defaultCircleFetchPromise = null;
}

/**
 * Get or create the default "Mentor the Young" circle.
 * Result is cached at module level to avoid redundant DB hits.
 */
export async function getOrCreateDefaultCircle() {
  if (_cachedDefaultCircle) return _cachedDefaultCircle;

  // Deduplicate concurrent calls (multiple components mounting at once)
  if (_defaultCircleFetchPromise) return _defaultCircleFetchPromise;

  _defaultCircleFetchPromise = (async () => {
    try {
      const { data: existingCircle } = await supabase
        .from('circles')
        .select('*')
        .eq('invite_code', 'MENTORYOUNG2024')
        .single();

      if (existingCircle) {
        _cachedDefaultCircle = existingCircle;
        return existingCircle;
      }

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

      _cachedDefaultCircle = newCircle;
      return newCircle;
    } finally {
      _defaultCircleFetchPromise = null;
    }
  })();

  return _defaultCircleFetchPromise;
}

/**
 * Add user to default circle
 */
export async function addUserToDefaultCircle(userId: string, userRole?: string) {
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

    // Add user to circle with their selected role
    const { error } = await supabase
      .from('circle_members')
      .insert({
        circle_id: defaultCircle.id,
        user_id: userId,
        type: 'member',
        role: userRole || null, // Store the actual user role (Mentor, Mentee, Alumni, etc.)
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

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

// List of super admin emails (fallback when platform_admins table doesn't exist yet)
const SUPER_ADMIN_EMAILS = [
  'talkspree.app@gmail.com',
  'mihail.hummel@gmail.com'
];

/**
 * Check super admin status for a given user object (avoids re-calling auth.getUser)
 */
export async function checkIsSuperAdminForUser(user: { id: string; email?: string | null }): Promise<boolean> {
  if (user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return true;
  }

  try {
    const { data } = await supabase
      .from('platform_admins')
      .select('id')
      .eq('user_id', user.id)
      .eq('admin_type', 'super_admin')
      .single();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Check if current user is a super admin
 */
export async function checkIsSuperAdmin(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  return checkIsSuperAdminForUser(user);
}

/**
 * Check if current user is a circle admin (creator or admin)
 */
export async function checkIsCircleAdmin(circleId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const isSuperAdmin = await checkIsSuperAdminForUser(user);
  if (isSuperAdmin) return true;

  try {
    const { data } = await supabase
      .from('circle_members')
      .select('admin_type, role')
      .eq('user_id', user.id)
      .eq('circle_id', circleId)
      .single();

    return data?.admin_type === 'creator' || data?.admin_type === 'circle_admin' || data?.role === 'admin';
  } catch (error) {
    console.warn('Error checking circle admin status:', error);
    return false;
  }
}

/**
 * Get user's admin type for a circle
 */
export async function getUserAdminType(circleId: string): Promise<AdminType> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const isSuperAdmin = await checkIsSuperAdminForUser(user);
  if (isSuperAdmin) return 'super_admin';

  try {
    const { data } = await supabase
      .from('circle_members')
      .select('admin_type')
      .eq('user_id', user.id)
      .eq('circle_id', circleId)
      .single();

    return data?.admin_type || null;
  } catch (error) {
    console.warn('Error fetching admin type:', error);
    return null;
  }
}

/**
 * Get user's display role in a circle
 */
export async function getUserCircleRole(circleId: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'Member';

  const isSuperAdmin = await checkIsSuperAdminForUser(user);
  if (isSuperAdmin) return 'Super Admin';

  try {
    const { data: membership } = await supabase
      .from('circle_members')
      .select('id, admin_type, type, role')
      .eq('user_id', user.id)
      .eq('circle_id', circleId)
      .single();

    if (!membership) return 'Member';

    if (membership.admin_type === 'creator') return 'Creator';
    if (membership.admin_type === 'circle_admin') return 'Admin';
    if (membership.type === 'admin') return 'Admin';

    if (membership.role) {
      return membership.role;
    }

    const { data: roleAssignment } = await supabase
      .from('circle_member_roles')
      .select('circle_roles(name)')
      .eq('circle_member_id', membership.id)
      .single();

    if (roleAssignment?.circle_roles) {
      return (roleAssignment.circle_roles as any).name;
    }

    return 'Member';
  } catch (error) {
    console.warn('Error fetching circle role:', error);
    return 'Member';
  }
}

/**
 * Unified function: get role, isAdmin, and adminType in a SINGLE pass.
 * One auth call, one super-admin check, one membership query.
 * This replaces calling getUserCircleRole + checkIsCircleAdmin + getUserAdminType separately.
 */
export async function getFullCircleRoleData(circleId: string): Promise<{
  role: string;
  isAdmin: boolean;
  adminType: AdminType;
}> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { role: 'Member', isAdmin: false, adminType: null };

  const isSuperAdmin = await checkIsSuperAdminForUser(user);
  if (isSuperAdmin) {
    return { role: 'Super Admin', isAdmin: true, adminType: 'super_admin' };
  }

  try {
    const { data: membership } = await supabase
      .from('circle_members')
      .select('id, admin_type, type, role')
      .eq('user_id', user.id)
      .eq('circle_id', circleId)
      .single();

    if (!membership) return { role: 'Member', isAdmin: false, adminType: null };

    const isAdmin =
      membership.admin_type === 'creator' ||
      membership.admin_type === 'circle_admin' ||
      membership.type === 'admin';

    const adminType: AdminType =
      membership.admin_type ||
      (membership.type === 'admin' ? 'circle_admin' : null);

    let role = 'Member';
    if (membership.admin_type === 'creator') role = 'Creator';
    else if (membership.admin_type === 'circle_admin') role = 'Admin';
    else if (membership.type === 'admin') role = 'Admin';
    else if (membership.role) role = membership.role;
    else {
      try {
        const { data: roleAssignment } = await supabase
          .from('circle_member_roles')
          .select('circle_roles(name)')
          .eq('circle_member_id', membership.id)
          .single();
        if (roleAssignment?.circle_roles) {
          role = (roleAssignment.circle_roles as any).name;
        }
      } catch { /* custom roles table may not exist */ }
    }

    return { role, isAdmin, adminType };
  } catch (error) {
    console.warn('Error fetching circle role data:', error);
    return { role: 'Member', isAdmin: false, adminType: null };
  }
}

/**
 * Get all circle roles
 */
export async function getCircleRoles(circleId: string): Promise<CircleRole[]> {
  try {
    const { data, error } = await supabase
      .from('circle_roles')
      .select('*')
      .eq('circle_id', circleId)
      .order('display_order');

    if (error) {
      console.error('Error fetching circle roles:', error);
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Failed to fetch circle roles:', error);
    throw error;
  }
}

/**
 * Create a circle role
 */
export async function createCircleRole(circleId: string, role: { name: string; description?: string; color?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const isAdmin = await checkIsCircleAdmin(circleId);
  if (!isAdmin) throw new Error('Only admins can create roles');

  const { data, error } = await supabase
    .from('circle_roles')
    .insert({
      circle_id: circleId,
      ...role
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a circle role
 */
export async function updateCircleRole(roleId: string, updates: Partial<CircleRole>) {
  const { data, error } = await supabase
    .from('circle_roles')
    .update(updates)
    .eq('id', roleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a circle role
 */
export async function deleteCircleRole(roleId: string) {
  const { error } = await supabase
    .from('circle_roles')
    .delete()
    .eq('id', roleId);

  if (error) throw error;
}

/**
 * Assign a role to a circle member
 */
export async function assignCircleRole(circleMemberId: string, circleRoleId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('circle_member_roles')
    .upsert({
      circle_member_id: circleMemberId,
      circle_role_id: circleRoleId,
      assigned_by: user.id
    }, {
      onConflict: 'circle_member_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get circle topic presets
 */
export async function getCircleTopicPresets(circleId: string): Promise<CircleTopicPreset[]> {
  const { data, error } = await supabase
    .from('circle_topic_presets')
    .select('*')
    .eq('circle_id', circleId)
    .eq('is_active', true)
    .order('display_order');

  if (error) throw error;
  return data || [];
}

/**
 * Create a topic preset
 */
export async function createTopicPreset(circleId: string, preset: { 
  name: string; 
  description?: string; 
  topics: string[]; 
  custom_questions?: string[] 
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('circle_topic_presets')
    .insert({
      circle_id: circleId,
      created_by: user.id,
      ...preset
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update circle details (for admins)
 */
export async function updateCircle(circleId: string, updates: Partial<Pick<Circle, 'name' | 'description' | 'logo_url' | 'cover_image_url' | 'social_links' | 'disabled_default_preset_ids' | 'allow_member_custom_topics'>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const isAdmin = await checkIsCircleAdmin(circleId);
  if (!isAdmin) throw new Error('Only admins can update circle details');

  const { data, error } = await supabase
    .from('circles')
    .update(updates)
    .eq('id', circleId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Assign circle admin
 */
export async function assignCircleAdmin(circleId: string, userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Only creators and super admins can assign circle admins
  const adminType = await getUserAdminType(circleId);
  if (adminType !== 'super_admin' && adminType !== 'creator') {
    throw new Error('Only creators can assign circle admins');
  }

  const { data, error } = await supabase
    .from('circle_members')
    .update({ admin_type: 'circle_admin', role: 'admin' })
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Remove circle admin
 */
export async function removeCircleAdmin(circleId: string, userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Only creators and super admins can remove circle admins
  const adminType = await getUserAdminType(circleId);
  if (adminType !== 'super_admin' && adminType !== 'creator') {
    throw new Error('Only creators can remove circle admins');
  }

  // Can't remove the creator
  const { data: targetMember } = await supabase
    .from('circle_members')
    .select('admin_type')
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .single();

  if (targetMember?.admin_type === 'creator') {
    throw new Error('Cannot remove the circle creator');
  }

  const { data, error } = await supabase
    .from('circle_members')
    .update({ admin_type: null, type: 'member' })
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Toggle a default preset's visibility in a circle
 */
export async function toggleDefaultPreset(circleId: string, presetId: string, enabled: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Only admins can toggle default presets
  const isAdmin = await checkIsCircleAdmin(circleId);
  if (!isAdmin) throw new Error('Only circle admins can toggle default presets');

  // Get current disabled list
  const { data: circle } = await supabase
    .from('circles')
    .select('disabled_default_preset_ids')
    .eq('id', circleId)
    .single();

  const currentDisabled = circle?.disabled_default_preset_ids || [];
  
  let newDisabled: string[];
  if (enabled) {
    // Remove from disabled list
    newDisabled = currentDisabled.filter((id: string) => id !== presetId);
  } else {
    // Add to disabled list
    newDisabled = [...currentDisabled, presetId];
  }

  const { error } = await supabase
    .from('circles')
    .update({ disabled_default_preset_ids: newDisabled })
    .eq('id', circleId);

  if (error) throw error;
}

/**
 * Toggle whether circle members can use the Custom topic feature
 */
export async function toggleMemberCustomTopics(circleId: string, enabled: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const isAdmin = await checkIsCircleAdmin(circleId);
  if (!isAdmin) throw new Error('Only circle admins can change member permissions');

  const { error } = await supabase
    .from('circles')
    .update({ allow_member_custom_topics: enabled })
    .eq('id', circleId);

  if (error) throw error;
}

/**
 * Update a user's role in a circle (admin function)
 */
export async function updateUserCircleRole(circleId: string, userId: string, role: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Only admins can update other users' roles
  const isAdmin = await checkIsCircleAdmin(circleId);
  if (!isAdmin) {
    throw new Error('Only circle admins can update member roles');
  }

  const { data, error } = await supabase
    .from('circle_members')
    .update({ role })
    .eq('circle_id', circleId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update current user's own role in a circle
 */
export async function updateMyCircleRole(circleId: string, role: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('circle_members')
    .update({ role })
    .eq('circle_id', circleId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all circles the current user is a member of
 */
export async function getMyCircles() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('circle_members')
    .select(`
      circle_id,
      role,
      status,
      circles (
        id,
        name,
        logo_url,
        description
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (error) throw error;
  return data;
}

