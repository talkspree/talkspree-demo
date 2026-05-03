import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDevice } from '@/hooks/useDevice';
import logo from '@/assets/logo.svg';
import { getInviterBySlug, getCircleByAbbreviation } from '@/lib/api/affiliates';
import { setPendingAffiliate, clearPendingAffiliate } from '@/lib/affiliate';

interface InviteCodeFormProps {
  onValidCode: () => void;
  onBack: () => void;
}

// Personal invite link format: talkspree.com/<CIRCLE_ABBR>/<6-CHAR_SLUG>
// e.g. https://talkspree.com/MTY/xa7k2p
const PERSONAL_LINK_REGEX = /^https?:\/\/[^/]+\/([A-Za-z0-9]{2,10})\/([a-z0-9]{6})\/?$/;

export function InviteCodeForm({ onValidCode, onBack }: InviteCodeFormProps) {
  const [code, setCode] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const device = useDevice();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const trimmedLink = inviteLink.trim();

      // 1. Pasted personal affiliate link -> resolve, stash, advance
      if (trimmedLink) {
        const personalMatch = trimmedLink.match(PERSONAL_LINK_REGEX);
        if (personalMatch) {
          const circleAbbrev = personalMatch[1].toUpperCase();
          const userSlug = personalMatch[2].toLowerCase();

          const [inviter, circle] = await Promise.all([
            getInviterBySlug(userSlug),
            getCircleByAbbreviation(circleAbbrev),
          ]);

          if (!inviter || !circle) {
            setError('Invalid invite link. Please check and try again.');
            return;
          }

          setPendingAffiliate({
            inviterId: inviter.id,
            inviterFirstName: inviter.firstName,
            inviterLastName: inviter.lastName,
            inviterPicture: inviter.profilePicture,
            inviterSlug: inviter.slug,
            circleId: circle.id,
            circleAbbrev: circle.abbreviation,
          });

          onValidCode();
          return;
        }

        // 2. Legacy `?code=XXXX` link -> no affiliation
        const legacyMatch = trimmedLink.match(/code=([^&]+)/);
        if (legacyMatch) {
          if (legacyMatch[1] === '1111') {
            clearPendingAffiliate();
            onValidCode();
            return;
          }
          setError('Invalid invite code. Please check and try again.');
          return;
        }

        setError('Invalid invite link format.');
        return;
      }

      // 3. Raw demo code typed in the code field -> no affiliation
      if (code.trim() === '1111') {
        clearPendingAffiliate();
        onValidCode();
        return;
      }

      setError('Invalid invite code. Please check and try again.');
    } catch (err) {
      console.error('InviteCodeForm error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cardClasses = device === 'mobile' 
    ? "w-full border-0 bg-transparent shadow-none"
    : "w-full max-w-sm glass shadow-[3px_5px_20px_rgba(0,0,0,0.2)]";

  return (
    <Card className={cardClasses}>
      <CardHeader className="space-y-4 text-center">
        <img src={logo} alt="TalkSpree" className="h-6 mx-auto" />
        <CardTitle className="text-2xl font-medium">Join TalkSpree</CardTitle>
        <CardDescription>
          Enter your invite code or paste the invite link to get started
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-code">Invite Code</Label>
            <Input
              id="invite-code"
              type="text"
              placeholder="• • • •"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={4}
              className="transition-spring text-center tracking-widest"
            />
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-link">Invite Link</Label>
            <Input
              id="invite-link"
              type="url"
              placeholder="Paste the full invite link here"
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
              className="transition-spring"
            />
          </div>

          {error && (
            <div className="text-sm text-destructive text-center bg-destructive/10 p-2 rounded-md">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-gradient-primary hover:shadow-glow transition-spring"
            disabled={loading || (!code && !inviteLink)}
          >
            {loading ? 'Validating...' : 'Continue'}
          </Button>
        </form>

        <div className="text-center">
          <Button 
            variant="link" 
            onClick={onBack}
            className="text-muted-foreground hover:text-primary transition-smooth"
          >
            ← Back to login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}