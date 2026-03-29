// Connection management with Supabase persistence
import { SampleUser } from '@/data/sampleUsers';
import { 
  addContact as addContactToDb, 
  getContacts as getContactsFromDb, 
  getUnseenContactsCount as getUnseenCountFromDb,
  markAllContactsSeen as markAllSeenInDb,
  markContactSeen as markContactSeenInDb,
  Contact,
  ContactProfile
} from '@/lib/api/contacts';

// Connection interface
export interface Connection {
  id?: string; // Database ID
  userId: string;
  connectedAt: string;
  user: SampleUser;
  isSeen?: boolean;
  isFromDb?: boolean;
}

const SEEN_CONTACTS_KEY = 'talkspree_seen_contacts';

// Convert database contact to Connection format
function dbContactToConnection(contact: Contact): Connection {
  const profile = contact.profile as ContactProfile;
  
  // Extract social media links from socialLinks array
  const getSocialHandle = (platform: string): string => {
    const link = profile?.socialLinks?.find(sl => sl.platform.toLowerCase() === platform.toLowerCase());
    if (!link) return '';
    
    // Extract handle from URL
    const url = link.url;
    if (platform === 'instagram') {
      return url.replace(/https?:\/\/(www\.)?instagram\.com\//g, '@');
    } else if (platform === 'facebook') {
      return url.replace(/https?:\/\/(www\.)?facebook\.com\//g, '');
    } else if (platform === 'linkedin') {
      return url; // Keep full URL for LinkedIn
    } else if (platform === 'youtube') {
      return url.replace(/https?:\/\/(www\.)?youtube\.com\/@?/g, '@');
    } else if (platform === 'tiktok') {
      return url.replace(/https?:\/\/(www\.)?tiktok\.com\/@?/g, '@');
    }
    return url;
  };
  
  return {
    id: contact.id,
    userId: contact.contact_user_id,
    connectedAt: contact.connected_at,
    isSeen: contact.is_seen,
    isFromDb: true,
    user: {
      id: profile?.id || contact.contact_user_id,
      email: profile?.email || '',
      firstName: profile?.first_name || 'Unknown',
      lastName: profile?.last_name || 'User',
      dateOfBirth: profile?.date_of_birth || '2000-01-01',
      gender: profile?.gender || 'Unknown',
      location: profile?.location || 'Unknown',
      occupation: profile?.occupation || 'Unknown',
      bio: profile?.bio || '',
      interests: profile?.interests || [],
      role: (profile?.role as any) || 'mentee',
      university: profile?.university || '',
      studyField: profile?.study_field || '',
      workPlace: profile?.work_place || '',
      industry: profile?.industry || '',
      phone: '',
      instagram: getSocialHandle('instagram'),
      facebook: getSocialHandle('facebook'),
      linkedin: getSocialHandle('linkedin'),
      youtube: getSocialHandle('youtube'),
      tiktok: getSocialHandle('tiktok'),
      isOnline: profile?.is_online || false,
      inCall: false,
      callStartTime: null,
      sessionDuration: 15,
      profilePicture: profile?.profile_picture_url || undefined,
    } as SampleUser & { profilePicture?: string, email?: string }
  };
}

export const connectionsManager = {
  // Add a contact (stored in database)
  addContact: async (contactUserId: string, circleId?: string, callId?: string) => {
    try {
      await addContactToDb(contactUserId, circleId, callId);
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  },

  // Get all connections (from database)
  getDbConnections: async (): Promise<Connection[]> => {
    try {
      const contacts = await getContactsFromDb();
      return contacts.map(dbContactToConnection);
    } catch (error) {
      console.error('Error fetching db contacts:', error);
      return [];
    }
  },

  // Get all connections (returns empty for sync, use getConnectionsAsync)
  getConnections: (): Connection[] => {
    return [];
  },

  // Get all connections async (from database)
  getConnectionsAsync: async (): Promise<Connection[]> => {
    const dbConnections = await connectionsManager.getDbConnections();
    
    // Sort by most recent
    return dbConnections.sort((a, b) => 
      new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
    );
  },

  // Get unseen contacts count from database
  getUnseenDbCount: async (): Promise<number> => {
    try {
      return await getUnseenCountFromDb();
    } catch (error) {
      console.error('Error getting unseen db count:', error);
      return 0;
    }
  },

  // Get total unseen count (db only now)
  getNewConnectionsCount: (): number => {
    return 0; // Sync version returns 0, use async
  },

  // Get total unseen count async
  getNewConnectionsCountAsync: async (): Promise<number> => {
    return await connectionsManager.getUnseenDbCount();
  },

  // Get seen contact IDs from localStorage (for UI state tracking)
  getSeenContactIds: (): string[] => {
    const data = localStorage.getItem(SEEN_CONTACTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  // Mark all db contacts as seen
  markAllDbSeen: async () => {
    try {
      await markAllSeenInDb();
    } catch (error) {
      console.error('Error marking all db contacts seen:', error);
    }
  },

  // Clear all notifications async
  clearNewConnectionsCountAsync: async () => {
    await connectionsManager.markAllDbSeen();
  },

  // Mark a single contact as seen (localStorage for UI)
  markContactSeen: (userId: string) => {
    const seenIds = connectionsManager.getSeenContactIds();
    if (!seenIds.includes(userId)) {
      seenIds.push(userId);
      localStorage.setItem(SEEN_CONTACTS_KEY, JSON.stringify(seenIds));
    }
  },

  // Mark a db contact as seen
  markDbContactSeen: async (contactId: string) => {
    try {
      await markContactSeenInDb(contactId);
    } catch (error) {
      console.error('Error marking db contact seen:', error);
    }
  },

  // Check if a contact is seen
  isContactSeen: (userId: string): boolean => {
    const seenIds = connectionsManager.getSeenContactIds();
    return seenIds.includes(userId);
  },

  // Legacy methods for backward compatibility
  getLocalConnections: (): Connection[] => [],
  getUnseenLocalCount: (): number => 0,
  addConnection: () => {},
};
