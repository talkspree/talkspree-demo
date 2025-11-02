// Temporary connection management - will be removed when Supabase is integrated
import { SampleUser } from '@/data/sampleUsers';

export interface Connection {
  userId: string;
  connectedAt: string;
  user: SampleUser;
}

const STORAGE_KEY = 'talkspree_connections';
const NOTIFICATIONS_KEY = 'talkspree_new_connections';

export const connectionsManager = {
  // Add a new connection
  addConnection: (user: SampleUser) => {
    const connections = connectionsManager.getConnections();
    
    // Check if already connected
    if (connections.some(c => c.userId === user.id)) {
      return;
    }
    
    const newConnection: Connection = {
      userId: user.id,
      connectedAt: new Date().toISOString(),
      user
    };
    
    connections.push(newConnection);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
    
    // Add to new connections count
    const newCount = connectionsManager.getNewConnectionsCount() + 1;
    localStorage.setItem(NOTIFICATIONS_KEY, newCount.toString());
  },
  
  // Get all connections
  getConnections: (): Connection[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },
  
  // Get sorted connections
  getSortedConnections: (sortBy: 'recent' | 'similarity' | 'job'): Connection[] => {
    const connections = connectionsManager.getConnections();
    
    switch (sortBy) {
      case 'recent':
        return connections.sort((a, b) => 
          new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
        );
      case 'job':
        return connections.sort((a, b) => 
          a.user.occupation.localeCompare(b.user.occupation)
        );
      case 'similarity':
        // For now, just return as is (will be implemented with actual similarity calculation)
        return connections;
      default:
        return connections;
    }
  },
  
  // Search connections
  searchConnections: (query: string): Connection[] => {
    const connections = connectionsManager.getConnections();
    const lowerQuery = query.toLowerCase();
    
    return connections.filter(c => 
      `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(lowerQuery) ||
      c.user.occupation.toLowerCase().includes(lowerQuery) ||
      c.user.location.toLowerCase().includes(lowerQuery)
    );
  },
  
  // Get new connections count
  getNewConnectionsCount: (): number => {
    const count = localStorage.getItem(NOTIFICATIONS_KEY);
    return count ? parseInt(count) : 0;
  },
  
  // Clear new connections notification
  clearNewConnectionsCount: () => {
    localStorage.setItem(NOTIFICATIONS_KEY, '0');
  }
};
