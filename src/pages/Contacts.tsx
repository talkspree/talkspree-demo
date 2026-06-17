import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/home/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowLeft, ChevronDown, Users } from 'lucide-react';
import { ContactCircleSection, ContactSectionSkeleton } from '@/components/contacts/ContactCircleSection';
import { connectionsManager, Connection } from '@/utils/connections';
import { getMyCircles } from '@/lib/api/circles';
import { useDevice } from '@/hooks/useDevice';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';

export default function Contacts() {
  const navigate = useNavigate();
  const device = useDevice();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'similarity' | 'job'>('recent');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Connection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [seenContactIds, setSeenContactIds] = useState<string[]>([]);
  const [myCircles, setMyCircles] = useState<any[]>([]);
  const [loadingCircles, setLoadingCircles] = useState(true);

  // Load connections
  const loadConnections = async () => {
    setLoadingContacts(true);
    // Get all connections from database
    const allConnections = await connectionsManager.getConnectionsAsync();
    setConnections(allConnections);
    setLoadingContacts(false);
    
    // Get seen contact IDs from localStorage (tracks which cards user has clicked on)
    const previouslySeenIds = connectionsManager.getSeenContactIds();
    setSeenContactIds(previouslySeenIds);
  };

  useEffect(() => {
    loadConnections();

    // Mark all contacts as seen in DB to clear the notification badge
    // This doesn't affect the card animations - those are tracked via localStorage
    connectionsManager.markAllDbSeen();
  }, []);

  // Load the circles the user actually belongs to (drives the sections + the
  // "you haven't joined any circles yet" empty state).
  useEffect(() => {
    (async () => {
      try {
        const rows = await getMyCircles();
        setMyCircles(rows ?? []);
      } catch (e) {
        console.error('Failed to load circles for contacts', e);
      } finally {
        setLoadingCircles(false);
      }
    })();
  }, []);

  // Handle marking a contact as seen when clicked
  const handleMarkContactSeen = useCallback((userId: string, contactDbId?: string) => {
    // Mark local contact as seen
    connectionsManager.markContactSeen(userId);
    setSeenContactIds(prev => [...prev, userId]);
    
    // If it's a db contact, mark it in the database too
    if (contactDbId) {
      connectionsManager.markDbContactSeen(contactDbId);
    }
  }, []);

  // Get filtered and sorted connections
  const getFilteredContacts = () => {
    let filtered = connections;
    
    // Apply search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = connections.filter(c => 
        `${c.user.firstName} ${c.user.lastName}`.toLowerCase().includes(lowerQuery) ||
        c.user.occupation.toLowerCase().includes(lowerQuery) ||
        c.user.location.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'recent':
        filtered = [...filtered].sort((a, b) => 
          new Date(b.connectedAt).getTime() - new Date(a.connectedAt).getTime()
        );
        break;
      case 'job':
        filtered = [...filtered].sort((a, b) => 
          a.user.occupation.localeCompare(b.user.occupation)
        );
        break;
    }
    
    // Map to contact format
    return filtered.map((conn) => {
      const age = new Date().getFullYear() - new Date(conn.user.dateOfBirth).getFullYear();
      // isNew = connection was unseen in the DB at the time the page loaded.
      // isSeen comes directly from the DB record so it's only false for genuinely new connections.
      const isNew = conn.isSeen === false;
      return {
        id: conn.userId,
        dbId: conn.id,
        name: `${conn.user.firstName} ${conn.user.lastName}`,
        email: (conn.user as any).email || '',
        job: conn.user.occupation,
        age: `${age}y`,
        country: conn.user.location,
        gender: conn.user.gender,
        avatarUrl: (conn.user as any).profilePicture || '',
        isOnline: conn.user.isOnline,
        role: conn.user.role,
        industry: conn.user.industry,
        studyField: conn.user.studyField,
        university: conn.user.university,
        instagram: conn.user.instagram,
        facebook: conn.user.facebook,
        linkedin: conn.user.linkedin,
        youtube: conn.user.youtube,
        tiktok: conn.user.tiktok,
        isNew,
      };
    });
  };

  const filteredContacts = getFilteredContacts();

  const handleContactClick = (contact: any) => {
    const fullConnection = connections.find(c => c.userId === contact.id);
    if (fullConnection) {
      // Mark contact as seen when clicking to view details
      handleMarkContactSeen(contact.id, contact.dbId);
      setSelectedContact(fullConnection);
      setModalOpen(true);
    }
  };

  // One section per circle the user belongs to. Connections aren't circle-
  // attributed yet, so (with a single circle today) they all sit under the
  // first circle; per-circle attribution is a future refinement.
  const circleSections = myCircles.map((m: any, idx: number) => {
    const c = m.circles;
    return {
      id: c.id as string,
      name: c.name as string,
      abbreviation: c.abbreviation as string,
      logoUrl: c.logo_url || '',
      coverUrl: c.cover_image_url || '',
      contacts: idx === 0 ? filteredContacts : [],
    };
  });

  return (
    <div className="min-h-screen bg-gradient-subtle px-6 lg:px-16">
      {device !== 'mobile' && <Header />}
      
      <div className={`max-w-[1920px] mx-auto pb-10 ${device === 'mobile' ? 'pt-6' : 'pt-6'}`}>
        {/* Back Button + (mobile-only) Feedback button */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/home')}
            className="text-md"
          >
            <ArrowLeft className="h-20 w-20 mr-2" />
            Back to Home
          </Button>

          {device === 'mobile' && <FeedbackButton />}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search Contact"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-full bg-card border-2"
            />
          </div>
        </div>

        {/* Contacts by Circle (or empty state when not in any circle) */}
        {(loadingCircles || loadingContacts) ? (
          <div className="space-y-8">
            <ContactSectionSkeleton />
          </div>
        ) : circleSections.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Users className="text-muted-foreground" size={28} />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">No circles yet</h3>
            <p className="text-sm text-muted-foreground font-medium px-4">
              You haven't joined any circles yet.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {circleSections.map((circle) => (
              <ContactCircleSection
                key={circle.id}
                circle={circle}
                searchQuery={searchQuery}
                sortBy={sortBy}
                onSortChange={setSortBy}
                onContactClick={handleContactClick}
                loading={false}
              />
            ))}
          </div>
        )}
      </div>

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={selectedContact}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onContactDeleted={() => {
          // Refresh the contacts list after deletion
          loadConnections();
          setSelectedContact(null);
        }}
      />
    </div>
  );
}
