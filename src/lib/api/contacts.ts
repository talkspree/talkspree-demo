import { supabase } from '@/lib/supabase';

export interface Contact {
  id: string;
  user_id: string;
  contact_user_id: string;
  circle_id: string | null;
  connected_at: string;
  is_seen: boolean;
  seen_at: string | null;
  call_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profile?: ContactProfile;
}

export interface ContactProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  bio: string | null;
  role: string | null;
  university: string | null;
  study_field: string | null;
  work_place: string | null;
  industry: string | null;
  is_online: boolean;
  // Joined data
  interests?: string[];
  socialLinks?: { platform: string; url: string }[];
}

/**
 * Add a contact after a call connection
 */
export async function addContact(
  contactUserId: string, 
  circleId?: string, 
  callId?: string
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.rpc('add_mutual_contact', {
    p_user_id: user.id,
    p_contact_user_id: contactUserId,
    p_circle_id: circleId || null,
    p_call_id: callId || null
  });

  if (error) {
    console.error('Error adding contact:', error);
    throw error;
  }
}

/**
 * Get all contacts for the current user with profile data
 */
export async function getContacts(): Promise<Contact[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      profile:profiles!contact_user_id (
        id,
        email,
        first_name,
        last_name,
        profile_picture_url,
        date_of_birth,
        gender,
        location,
        occupation,
        bio,
        role,
        university,
        study_field,
        work_place,
        industry,
        is_online
      )
    `)
    .eq('user_id', user.id)
    .order('connected_at', { ascending: false });

  if (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }

  if (!data || data.length === 0) return [];

  const contactUserIds = data.map(c => c.contact_user_id);

  // Parallel fetch interests and social links (independent queries)
  const [{ data: interestsData }, { data: socialLinksData }] = await Promise.all([
    supabase.from('user_interests').select('user_id, interest_id').in('user_id', contactUserIds),
    supabase.from('social_links').select('user_id, platform, url').in('user_id', contactUserIds),
  ]);

  // Group interests by user_id
  const interestsByUser: Record<string, string[]> = {};
  interestsData?.forEach(item => {
    if (!interestsByUser[item.user_id]) {
      interestsByUser[item.user_id] = [];
    }
    interestsByUser[item.user_id].push(item.interest_id);
  });

  // Group social links by user_id
  const socialLinksByUser: Record<string, { platform: string; url: string }[]> = {};
  socialLinksData?.forEach(item => {
    if (!socialLinksByUser[item.user_id]) {
      socialLinksByUser[item.user_id] = [];
    }
    socialLinksByUser[item.user_id].push({ platform: item.platform, url: item.url });
  });

  // Merge the data
  return data.map(contact => ({
    ...contact,
    profile: contact.profile ? {
      ...contact.profile,
      interests: interestsByUser[contact.contact_user_id] || [],
      socialLinks: socialLinksByUser[contact.contact_user_id] || []
    } : undefined
  }));
}

/**
 * Get unseen contacts count
 */
export async function getUnseenContactsCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase.rpc('get_unseen_contacts_count', {
    p_user_id: user.id
  });

  if (error) {
    console.error('Error getting unseen count:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Mark all contacts as seen
 */
export async function markAllContactsSeen(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data, error } = await supabase.rpc('mark_contacts_seen', {
    p_user_id: user.id
  });

  if (error) {
    console.error('Error marking contacts seen:', error);
    return 0;
  }

  return data || 0;
}

/**
 * Mark a single contact as seen
 */
export async function markContactSeen(contactId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_contact_seen', {
    p_contact_id: contactId
  });

  if (error) {
    console.error('Error marking contact seen:', error);
    throw error;
  }
}

/**
 * Search contacts by name
 */
export async function searchContacts(query: string): Promise<Contact[]> {
  // Use getContacts and filter in memory
  const allContacts = await getContacts();
  const lowerQuery = query.toLowerCase();
  
  return allContacts.filter(contact => {
    const fullName = `${contact.profile?.first_name} ${contact.profile?.last_name}`.toLowerCase();
    const occupation = (contact.profile?.occupation || '').toLowerCase();
    return fullName.includes(lowerQuery) || occupation.includes(lowerQuery);
  });
}

/**
 * Get contacts sorted by different criteria
 */
export async function getSortedContacts(sortBy: 'recent' | 'name' | 'job'): Promise<Contact[]> {
  const contacts = await getContacts();

  // Sort by the specified criteria
  if (sortBy === 'recent') {
    return contacts.sort((a, b) => 
      new Date(b.connected_at).getTime() - new Date(a.connected_at).getTime()
    );
  } else if (sortBy === 'name') {
    return contacts.sort((a, b) => {
      const nameA = `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`.toLowerCase();
      const nameB = `${b.profile?.first_name || ''} ${b.profile?.last_name || ''}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });
  } else if (sortBy === 'job') {
    return contacts.sort((a, b) => {
      const jobA = (a.profile?.occupation || '').toLowerCase();
      const jobB = (b.profile?.occupation || '').toLowerCase();
      return jobA.localeCompare(jobB);
    });
  }

  return contacts;
}

/**
 * Delete a contact
 */
export async function deleteContact(contactId: string): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId);

  if (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
}

/**
 * Delete a contact mutually (removes from both users' contact lists)
 */
export async function deleteMutualContact(
  contactUserId: string,
  circleId?: string
): Promise<void> {
  const { error } = await supabase.rpc('delete_mutual_contact', {
    p_contact_user_id: contactUserId,
    p_circle_id: circleId || null
  });

  if (error) {
    console.error('Error deleting mutual contact:', error);
    throw error;
  }
}

/**
 * Check if a user is already a contact
 */
export async function isContact(contactUserId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('contacts')
    .select('id')
    .eq('user_id', user.id)
    .eq('contact_user_id', contactUserId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking contact:', error);
  }

  return !!data;
}
