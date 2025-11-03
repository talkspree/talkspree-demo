import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContactCard } from './ContactCard';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Contact {
  id: number | string;
  name: string;
  job: string;
  age: string;
  country: string;
  gender: string;
  rating: number;
  avatarUrl: string;
}

interface Circle {
  id: number;
  name: string;
  members: string;
  online: string;
  avatarUrl: string;
  contacts: Contact[];
}

interface ContactCircleSectionProps {
  circle: Circle;
  searchQuery: string;
  onContactClick?: (contact: Contact) => void;
}

export function ContactCircleSection({ circle, searchQuery, onContactClick }: ContactCircleSectionProps) {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'recent' | 'similarity' | 'job'>('recent');
  
  // Filter contacts based on search query
  const filteredContacts = circle.contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredContacts.length === 0 && searchQuery) {
    return null;
  }

  return (
    <div className="border-2 border-border rounded-3xl p-6 bg-card shadow-apple-md">
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 lg:divide-x divide-border">
        {/* Circle Summary Section */}
        <div className="lg:pr-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-muted-foreground">Circle</h2>
          </div>

          {/* Circle Card - Gradient Background like Home */}
          <div className="relative rounded-[2rem] overflow-hidden shadow-apple-lg bg-gradient-primary pb-4">
            {/* Subtle dot overlay */}
            <div className="pointer-events-none absolute inset-0 opacity-30 rounded-[2rem] bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIyIiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')]" />
            
            {/* Top cover section */}
            <div className="h-24 rounded-t-[2rem]" />

            {/* Avatar - positioned to overlap */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 z-20">
              <Avatar className="h-24 w-24 border-4 border-card shadow-apple-lg">
                <AvatarImage src={circle.avatarUrl} />
                <AvatarFallback className="bg-warning text-warning-foreground text-2xl font-semibold">
                  {circle.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Content Bubble */}
            <div className="px-4">
              <div className="bg-card border-2 border-border rounded-2xl shadow-apple-md pt-16 pb-6 px-6">
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">{circle.name}</h3>
                  <div className="flex items-center justify-center gap-3 text-xs">
                    <span className="text-muted-foreground">{circle.members} members</span>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                      <span className="font-medium">{circle.online} online</span>
                    </div>
                  </div>

                  {/* Open Circle Button */}
                  <Button 
                    size="sm"
                    className="mt-4 bg-success hover:bg-success/90 text-success-foreground rounded-full px-6"
                    onClick={() => navigate('/')}
                  >
                    Open Circle
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts Section */}
        <div className="lg:pl-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-muted-foreground">Contacts</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-full">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Sort by
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card z-50">
                <DropdownMenuItem 
                  onClick={() => setSortBy('recent')}
                  className="cursor-pointer"
                >
                  Recently Added
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('similarity')}
                  className="cursor-pointer"
                >
                  Similarity
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setSortBy('job')}
                  className="cursor-pointer"
                >
                  Job
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Contacts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filteredContacts.map((contact) => (
              <ContactCard 
                key={contact.id} 
                contact={contact}
                onClick={() => onContactClick?.(contact)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
