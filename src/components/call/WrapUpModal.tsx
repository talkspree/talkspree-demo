import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SampleUser } from '@/data/sampleUsers';
import { interests } from '@/data/interests';
import { connectionsManager } from '@/utils/connections';
import { AboutMeSection } from '@/components/profile/AboutMeSection';

interface WrapUpModalProps {
  matchedUser?: SampleUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => void;
  onSkip: () => void;
  onNext: () => void;
  onBackToCircle: () => void;
}

export function WrapUpModal({
  matchedUser,
  open,
  onOpenChange,
  onConnect,
  onSkip,
  onNext,
  onBackToCircle
}: WrapUpModalProps) {
  const [decision, setDecision] = useState<'connect' | 'skip' | null>(null);

  if (!matchedUser) return null;

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const userInterests = matchedUser.interests
    .map(id => interests.find(i => i.id === id))
    .filter(Boolean);

  const handleConnect = () => {
    setDecision('connect');
    onConnect();
    
    // Save connection to localStorage
    if (matchedUser) {
      connectionsManager.addConnection(matchedUser);
    }
  };

  const handleSkip = () => {
    setDecision('skip');
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader className="relative">
          <Button
            size="sm"
            variant="destructive"
            className="absolute right-0 top-0"
            onClick={() => console.log('Report')}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Report
          </Button>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-6">
            {/* Profile Section */}
            <div className="flex items-start gap-6">
              <Avatar className="h-32 w-32 shrink-0">
                <AvatarImage src={matchedUser.profilePicture || ''} />
                <AvatarFallback className="bg-warning text-warning-foreground text-3xl">
                  {matchedUser.firstName[0]}{matchedUser.lastName[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold mb-3">{matchedUser.firstName} {matchedUser.lastName}</h2>
                  <AboutMeSection
                    role={matchedUser.role}
                    occupation={matchedUser.occupation}
                    industry={matchedUser.industry}
                    studyField={matchedUser.studyField}
                    university={matchedUser.university}
                    age={calculateAge(matchedUser.dateOfBirth)}
                    gender={matchedUser.gender}
                    location={matchedUser.location}
                    className="text-muted-foreground"
                  />
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">
                    {matchedUser.bio}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {userInterests.map((interest) => (
                      <Badge key={interest!.id} variant="secondary">
                        {interest!.emoji} {interest!.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 pt-0">
          {decision === null ? (
            <>
              <Button
                size="lg"
                className="flex-1 bg-success hover:bg-success/90 text-white"
                onClick={handleConnect}
              >
                Connect
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                onClick={handleSkip}
              >
                Skip
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="outline"
                onClick={onBackToCircle}
              >
                Back to Circle
              </Button>
              <Button
                size="lg"
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  onNext();
                  onOpenChange(false);
                }}
              >
                NEXT
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
