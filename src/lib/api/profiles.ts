import { supabase } from '@/lib/supabase';
import { OnboardingData } from '@/pages/Onboarding';
import { getPendingAffiliate, clearPendingAffiliate } from '@/lib/affiliate';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  location: string;
  occupation: string;
  bio: string;
  phone: string;
  profile_picture_url: string | null;
  role: 'mentor' | 'mentee' | 'alumni' | null;
  university: string | null;
  study_field: string | null;
  work_place: string | null;
  industry: string | null;
  is_online: boolean;
  in_call: boolean;
  session_duration: number;
  /** 6-char [a-z0-9] identifier used in personal invite links. Auto-assigned at profile creation. */
  slug: string;
  /** Profile id of the user whose affiliate invite link brought this user to the platform. Set once at signup. */
  invited_by: string | null;
  /** Circle whose invite link was used at signup. Analytics only. */
  invited_via_circle_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

/**
 * Generate a 4-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Store verification code for a user (called during signup)
 */
export async function storeVerificationCode(userId: string, code: string, email?: string) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

  // Poll for the profile the signup trigger creates (instead of a fixed 1s sleep).
  // Resolves as soon as the row appears, capped at ~2s in 100ms steps.
  let existingProfile: { id: string; email: string } | null = null;
  const profileDeadline = Date.now() + 2000;
  while (Date.now() < profileDeadline) {
    const { data, error: checkError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing profile:', checkError);
    }

    if (data) {
      existingProfile = data;
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (!existingProfile) {
    console.warn('Profile row not visible within 2s of signup; proceeding with upsert (trigger may still be in flight)');
  }

  // Get email - priority: parameter > existing profile > auth session
  let userEmail = email || existingProfile?.email || '';
  
  if (!userEmail) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.id === userId) {
        userEmail = user.email || '';
      }
    } catch (e) {
      console.warn('Could not get user email from session:', e);
    }
  }
  
  // If still no email, we have a problem
  if (!userEmail) {
    console.error('❌ CRITICAL: No email found for user:', userId);
    console.error('   Profile will be created but verification will fail!');
    console.error('   Make sure to pass email to storeVerificationCode(userId, code, email)');
  }

  // Use UPSERT (INSERT ... ON CONFLICT DO UPDATE)
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email: userEmail,
      first_name: '',
      last_name: '',
      verification_code: code,
      verification_code_expires_at: expiresAt.toISOString(),
      email_verified: false,
      onboarding_completed: false,
    }, {
      onConflict: 'id',
    })
    .select();

  if (error) {
    console.error('❌ Error storing verification code:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Verify the 6-digit email OTP issued by Supabase Auth.
 * Uses supabase.auth.verifyOtp so Supabase manages token validation and
 * sets auth.users.email_confirmed_at. We then sync profiles.email_verified.
 */
export async function verifyEmailCode(email: string, code: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.toLowerCase().trim(),
    token: code,
    type: 'signup',
  });

  if (error) {
    console.error('Error verifying OTP:', error);
    return { success: false, error: error.message || 'Invalid verification code' };
  }

  if (data.user) {
    await supabase
      .from('profiles')
      .update({
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('id', data.user.id);
  }

  return { success: true, userId: data.user?.id };
}

/**
 * Legacy client-side verification path (no longer used). Retained only so the
 * symbol is not referenced elsewhere; the real check is server-side above.
 */
async function _legacyVerifyEmailCode(email: string, code: string) {
  const normalizedEmail = email.toLowerCase().trim();

  // Try multiple query approaches
  let profile = null;
  let profileError = null;

  // Approach 1: Exact match (normalized)
  const { data: profile1, error: error1 } = await supabase
    .from('profiles')
    .select('id, verification_code, verification_code_expires_at, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (profile1) {
    profile = profile1;
  } else if (error1) {
    console.error('❌ Query error (exact):', error1);
    profileError = error1;
  }
  
  // Approach 2: Case-insensitive search
  if (!profile) {
    const { data: profiles, error: error2 } = await supabase
      .from('profiles')
      .select('id, email, verification_code, verification_code_expires_at')
      .ilike('email', `%${normalizedEmail}%`);
    
    if (profiles && profiles.length > 0) {
      profile = profiles[0];
    } else if (error2) {
      console.error('❌ Query error (case-insensitive):', error2);
      if (!profileError) profileError = error2;
    }
  }
  
  // Approach 3: Try without normalization
  if (!profile) {
    const { data: profile3, error: error3 } = await supabase
      .from('profiles')
      .select('id, email, verification_code, verification_code_expires_at')
      .eq('email', email)
      .maybeSingle();
    
    if (profile3) {
      profile = profile3;
    } else if (error3) {
      console.error('❌ Query error (original):', error3);
      if (!profileError) profileError = error3;
    }
  }
  
  if (profileError && profileError.code !== 'PGRST116') {
    console.error('❌ Profile query error:', profileError);
    return { success: false, error: `Database error: ${profileError.message}. Code: ${profileError.code}` };
  }

  if (!profile) {
    console.error('❌ No profile found after all attempts');
    return { success: false, error: 'User not found. The profile may not exist or RLS is blocking the query. Please contact support.' };
  }
  

  // Check if code exists
  if (!profile.verification_code) {
    console.error('❌ No verification code stored in profile');
    return { success: false, error: 'No verification code found. Please request a new code.' };
  }

  // Check if code matches
  if (profile.verification_code !== code) {
    console.error('❌ Code mismatch. Expected:', profile.verification_code, 'Got:', code);
    return { success: false, error: 'Invalid verification code' };
  }

  // Check if code is expired
  if (profile.verification_code_expires_at) {
    const expiresAt = new Date(profile.verification_code_expires_at);
    if (expiresAt < new Date()) {
      console.error('❌ Code expired. Expires:', expiresAt, 'Now:', new Date());
      return { success: false, error: 'Verification code has expired. Please request a new code.' };
    }
  }
  

  // Code is valid! Update the user's email as confirmed in auth.users
  // This requires using the service role, so we'll use a database function
  const { error: verifyError } = await supabase.rpc('verify_user_email', {
    user_id: profile.id,
  });

  if (verifyError) {
    console.error('Error verifying email:', verifyError);
    return { success: false, error: 'Failed to verify email' };
  }

  // Clear the verification code
  await supabase
    .from('profiles')
    .update({
      verification_code: null,
      verification_code_expires_at: null,
      email_verified: true,
    })
    .eq('id', profile.id);

  return { success: true, userId: profile.id };
}

/**
 * Resend the Supabase signup OTP email.
 */
export async function resendVerificationCode(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.toLowerCase().trim(),
  });

  if (error) throw new Error(error.message);
  return { success: true };
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }

  return data?.onboarding_completed === true;
}

/**
 * Get a profile by user ID
 */
export async function getProfileById(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

/**
 * Update the current user's profile
 */
export async function updateProfile(updates: Partial<Profile>) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('❌ Database update error:', error);
    throw error;
  }

  return data;
}

/**
 * Complete onboarding and create/update profile
 * Works with or without an active session
 */
export async function completeOnboarding(
  onboardingData: OnboardingData,
  opts?: { joinCircleId?: string },
) {

  // Get user from session (should always exist after email verification)
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user) {
    console.error('No authenticated user found');
    throw new Error('You must be logged in to complete onboarding. Please refresh the page and try again.');
  }

  const userId = user.id;
  const userEmail = user.email;

  // Upload profile picture if provided
  let profilePictureUrl: string | null = null;
  if (onboardingData.profilePicture) {
    try {
      profilePictureUrl = await uploadProfilePicture(onboardingData.profilePicture);
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      // Continue even if upload fails
    }
  }

  // Check if profile exists, if not create it
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking profile:', checkError);
    throw new Error(`Failed to check profile: ${checkError.message}`);
  }

  const profileData = {
    first_name: onboardingData.firstName,
    last_name: onboardingData.lastName,
    date_of_birth: onboardingData.dateOfBirth || null,
    gender: onboardingData.gender || null,
    location: onboardingData.location || null,
    occupation: onboardingData.occupation || null,
    bio: onboardingData.bio || null,
    profile_picture_url: profilePictureUrl,
    university: onboardingData.university || null,
    study_field: onboardingData.studyField || null,
    work_place: onboardingData.workPlace || null,
    industry: onboardingData.industry || null,
    onboarding_completed: true,
    email_verified: true, // Mark as verified since they completed onboarding
  };

  if (!existingProfile) {
    // Create profile if it doesn't exist.
    //
    // OAuth signups land here when the `handle_new_user` trigger silently
    // fails (no UPSERT safety net exists for them, unlike email signup which
    // is rescued by `storeVerificationCode`). So this is the *only* path
    // that creates the profile row for those users — meaning it must carry
    // the affiliate context from localStorage forward, or `invited_by` is
    // permanently lost. Self-invite is filtered out as a safety net even
    // though the inviter slug lookup shouldn't produce one.
    const pendingAffiliate = getPendingAffiliate();
    const affiliateFields =
      pendingAffiliate && pendingAffiliate.inviterId && pendingAffiliate.inviterId !== userId
        ? {
            invited_by: pendingAffiliate.inviterId,
            invited_via_circle_id: pendingAffiliate.circleId || null,
          }
        : {};

    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: userEmail!,
        ...profileData,
        ...affiliateFields,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      throw new Error(`Failed to create profile: ${createError.message}. Code: ${createError.code}`);
    }

    if (pendingAffiliate) {
      clearPendingAffiliate();
    }

  } else {
    // Update existing profile
    const { data: updatedProfile, error: profileError } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw new Error(`Failed to update profile: ${profileError.message}. Code: ${profileError.code}`);
    }
    
  }

  // Prepare interests and social links
  const interestsArray = onboardingData.interests.length > 0 ? onboardingData.interests : null;
  
  const socialLinks: SocialLink[] = [];
  if (onboardingData.socialMedia.linkedin) {
    socialLinks.push({ platform: 'linkedin', url: onboardingData.socialMedia.linkedin });
  }
  if (onboardingData.socialMedia.twitter) {
    socialLinks.push({ platform: 'twitter', url: onboardingData.socialMedia.twitter });
  }
  if (onboardingData.socialMedia.instagram) {
    socialLinks.push({ platform: 'instagram', url: onboardingData.socialMedia.instagram });
  }
  if (onboardingData.socialMedia.facebook) {
    socialLinks.push({ platform: 'facebook', url: onboardingData.socialMedia.facebook });
  }
  if (onboardingData.socialMedia.youtube) {
    socialLinks.push({ platform: 'youtube', url: onboardingData.socialMedia.youtube });
  }
  if (onboardingData.socialMedia.tiktok) {
    socialLinks.push({ platform: 'tiktok', url: onboardingData.socialMedia.tiktok });
  }
  const socialLinksJson = socialLinks.length > 0 ? socialLinks : null;

  // If we have a session, use direct inserts (faster)
  // If no session, use the database function (bypasses RLS)
  if (user) {
    // Have session - use direct inserts
    if (interestsArray && interestsArray.length > 0) {
      // Delete existing interests
      await supabase
        .from('user_interests')
        .delete()
        .eq('user_id', userId);

      // Insert new interests
      const interestsToInsert = interestsArray.map(interestId => ({
        user_id: userId,
        interest_id: interestId,
      }));

      const { error: interestsError } = await supabase
        .from('user_interests')
        .insert(interestsToInsert);

      if (interestsError) throw interestsError;
    }

    if (socialLinks.length > 0) {
      // Delete existing social links
      await supabase
        .from('social_links')
        .delete()
        .eq('user_id', userId);

      // Insert new social links
      const socialLinksToInsert = socialLinks.map(link => ({
        user_id: userId,
        ...link,
      }));

      const { error: socialError } = await supabase
        .from('social_links')
        .insert(socialLinksToInsert);

      if (socialError) throw socialError;
    }
  } else {
    // No session - use database function (bypasses RLS)
    
    // Prepare parameters - use null if empty arrays
    const rpcParams: any = {
      p_user_id: userId,
    };
    
    if (interestsArray && interestsArray.length > 0) {
      rpcParams.p_interests = interestsArray;
    } else {
      rpcParams.p_interests = null;
    }
    
    if (socialLinksJson && socialLinks.length > 0) {
      rpcParams.p_social_links = socialLinksJson;
    } else {
      rpcParams.p_social_links = null;
    }
    
    const { data, error: functionError } = await supabase.rpc('complete_user_onboarding', rpcParams);

    if (functionError) {
      console.error('Error calling complete_user_onboarding function:', functionError);
      throw new Error(`Failed to save interests and social links: ${functionError.message}`);
    }
    
  }

  // Join the invited circle with the selected role — ONLY for invited signups
  // (opts.joinCircleId resolved from the affiliate/invite context). Organic
  // signups join no circle here; they pick one later from the hub.
  if (opts?.joinCircleId) {
    try {
      // Capitalize the role for display (mentor -> Mentor, mentee -> Mentee, alumni -> Alumni)
      const formattedRole = onboardingData.role
        ? onboardingData.role.charAt(0).toUpperCase() + onboardingData.role.slice(1)
        : undefined;
      const { joinCircleById } = await import('@/lib/api/circles');
      await joinCircleById(opts.joinCircleId, formattedRole);
    } catch (error) {
      console.error('Failed to add user to circle:', error);
      // Continue even if circle membership fails
    }
  }

  return true;
}

/**
 * Upload profile picture
 */
export async function uploadProfilePicture(file: File, updateProfileAfterUpload: boolean = false): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `profile-pictures/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (uploadError) {
    console.error('❌ Upload error:', uploadError);
    throw uploadError;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Only update profile if explicitly requested (for standalone uploads)
  if (updateProfileAfterUpload) {
    await updateProfile({ profile_picture_url: publicUrl });
  }

  return publicUrl;
}

/**
 * Get user's interests
 */
export async function getUserInterests(userId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) throw new Error('User ID required');

  const { data, error } = await supabase
    .from('user_interests')
    .select(`
      interest_id,
      interests (
        id,
        name,
        emoji,
        category
      )
    `)
    .eq('user_id', targetUserId);

  if (error) throw error;

  return data.map(item => item.interests).filter(Boolean);
}

/**
 * Get user's social links
 */
export async function getUserSocialLinks(userId?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const targetUserId = userId || user?.id;

  if (!targetUserId) throw new Error('User ID required');

  const { data, error } = await supabase
    .from('social_links')
    .select('*')
    .eq('user_id', targetUserId);

  if (error) throw error;

  return data;
}

/**
 * Update user online status
 */
export async function updateOnlineStatus(isOnline: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  await supabase
    .from('profiles')
    .update({
      is_online: isOnline,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', user.id);
}

/**
 * Update user call status
 */
export async function updateCallStatus(inCall: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  await supabase
    .from('profiles')
    .update({ in_call: inCall })
    .eq('id', user.id);
}

/**
 * Search profiles by filters
 */
export async function searchProfiles(filters: {
  role?: string;
  interests?: string[];
  searchQuery?: string;
}) {
  let query = supabase
    .from('profiles')
    .select('*')
    .eq('is_online', true);

  if (filters.role) {
    query = query.eq('role', filters.role);
  }

  if (filters.searchQuery) {
    query = query.or(`first_name.ilike.%${filters.searchQuery}%,last_name.ilike.%${filters.searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  // If interests filter is provided, filter by interests
  if (filters.interests && filters.interests.length > 0) {
    const profilesWithInterests = await Promise.all(
      data.map(async (profile) => {
        const interests = await getUserInterests(profile.id);
        const hasMatchingInterest = interests.some((interest: any) =>
          filters.interests?.includes(interest.id)
        );
        return hasMatchingInterest ? profile : null;
      })
    );

    return profilesWithInterests.filter(Boolean);
  }

  return data;
}

