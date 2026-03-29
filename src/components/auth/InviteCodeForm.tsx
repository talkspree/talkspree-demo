import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDevice } from '@/hooks/useDevice';
import logo from '@/assets/logo.svg';

interface InviteCodeFormProps {
  onValidCode: () => void;
  onBack: () => void;
}

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
      // Check if it's a direct code or extract from invite link
      let codeToValidate = code;
      
      if (inviteLink) {
        // Extract code from invite link (assuming format: .../invite?code=1111)
        const urlMatch = inviteLink.match(/code=([^&]+)/);
        if (urlMatch) {
          codeToValidate = urlMatch[1];
        } else {
          throw new Error('Invalid invite link format');
        }
      }

      // Validate code (hardcoded as 1111 for now)
      if (codeToValidate === '1111') {
        onValidCode();
      } else {
        setError('Invalid invite code. Please check and try again.');
      }
    } catch (err) {
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