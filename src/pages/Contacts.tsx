import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/home/Header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, ArrowLeft, ChevronDown } from 'lucide-react';
import { ContactCircleSection } from '@/components/contacts/ContactCircleSection';
import { sampleUserManager } from '@/data/sampleUsers';
import { connectionsManager, Connection } from '@/utils/connections';
import { useDevice } from '@/hooks/useDevice';
import { ContactDetailModal } from '@/components/contacts/ContactDetailModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

export default function Contacts() {
  const navigate = useNavigate();
  const device = useDevice();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'similarity' | 'job'>('recent');
  const [connections, setConnections] = useState(connectionsManager.getConnections());
  const [selectedContact, setSelectedContact] = useState<Connection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Update connections when component mounts or when navigating back
  useEffect(() => {
    setConnections(connectionsManager.getConnections());
  }, []);

  // Get filtered and sorted connections
  const getFilteredContacts = () => {
    let filtered = connections;
    
    // Apply search
    if (searchQuery) {
      filtered = connectionsManager.searchConnections(searchQuery);
    } else {
      filtered = connectionsManager.getSortedConnections(sortBy);
    }
    
    // Map to contact format
    return filtered.map((conn) => {
      const age = new Date().getFullYear() - new Date(conn.user.dateOfBirth).getFullYear();
      return {
        id: conn.userId,
        name: `${conn.user.firstName} ${conn.user.lastName}`,
        job: conn.user.occupation,
        age: `${age}y`,
        country: conn.user.location,
        gender: conn.user.gender,
        rating: 4.5,
        avatarUrl: '',
        isSample: true,
        role: conn.user.role,
        industry: conn.user.industry,
        studyField: conn.user.studyField,
        university: conn.user.university,
      };
    });
  };

  const filteredContacts = getFilteredContacts();
  
  // Get online count from sample users
  const onlineCount = sampleUserManager.getOnlineCount();
  const totalMembers = connections.length;

  const handleContactClick = (contact: any) => {
    const fullConnection = connections.find(c => c.userId === contact.id);
    if (fullConnection) {
      setSelectedContact(fullConnection);
      setModalOpen(true);
    }
  };

  // Single circle - Mentor the young
  const circles = [
    {
      id: 1,
      name: 'Mentor the Young',
      members: totalMembers.toString(),
      online: onlineCount.toString(),
      avatarUrl: '',
      contacts: filteredContacts,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {device !== 'mobile' && <Header />}
      
      <div className={`max-w-[1920px] mx-auto px-6 lg:px-12 pb-12 ${device === 'mobile' ? 'pt-6' : 'pt-6'}`}>
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

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

        {/* Contacts by Circle */}
        <div className="space-y-8">
          {circles.map((circle) => (
            <ContactCircleSection
              key={circle.id}
              circle={circle}
              searchQuery={searchQuery}
              onContactClick={handleContactClick}
            />
          ))}
        </div>
      </div>

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={selectedContact}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
