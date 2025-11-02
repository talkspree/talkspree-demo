import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingData } from '@/pages/Onboarding';

interface ContactStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function ContactStep({ data, updateData, onNext, onPrev }: ContactStepProps) {
  const [phoneNumber, setPhoneNumber] = useState(data.phoneNumber);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleNext = async () => {
    setIsVerifying(true);
    // Mock verification process
    await new Promise(resolve => setTimeout(resolve, 1500));
    updateData({ phoneNumber });
    setIsVerifying(false);
    onNext();
  };

  const isValid = phoneNumber.trim() && phoneNumber.length >= 10;

  return (
    <Card className="glass shadow-apple-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-medium">Verify Your Phone Number</CardTitle>
        <p className="text-muted-foreground">
          This helps us prevent multiple accounts and will not be accessible to other users until you connect.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Mobile Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="transition-spring"
          />
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            📱 We'll send you a verification code to confirm your number.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={onPrev} className="transition-spring" disabled={isVerifying}>
            Back
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!isValid || isVerifying}
            className="flex-1 bg-gradient-primary hover:shadow-glow transition-spring"
          >
            {isVerifying ? 'Verifying...' : 'Verify & Continue'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}