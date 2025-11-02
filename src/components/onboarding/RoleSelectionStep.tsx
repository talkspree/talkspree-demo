import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OnboardingData } from '@/pages/Onboarding';

interface RoleSelectionStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onComplete: () => void;
  onPrev?: () => void;
}

const roles = [
  {
    id: 'alumni',
    title: 'Alumni',
    description: 'Share your experience and mentor others',
    icon: '🎓',
  },
  {
    id: 'mentee',
    title: 'Mentee',
    description: 'Learn from experienced professionals',
    icon: '🌱',
  },
  {
    id: 'mentor',
    title: 'Mentor',
    description: 'Guide and support others in their journey',
    icon: '🧭',
  },
];

export function RoleSelectionStep({ data, updateData, onComplete, onPrev }: RoleSelectionStepProps) {
  const [selectedRole, setSelectedRole] = useState(data.role);
  const [showCongrats, setShowCongrats] = useState(false);

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    updateData({ role: roleId });
    
    // Show congratulations message
    setShowCongrats(true);
    
    // Auto-complete after showing congrats
    setTimeout(() => {
      onComplete();
    }, 2000);
  };

  if (showCongrats) {
    return (
      <Card className="glass shadow-apple-lg text-center">
        <CardContent className="py-12">
          <div className="animate-in zoom-in-95 duration-500">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-medium mb-2">Welcome to the Mentor the Young Circle!</h2>
            <p className="text-muted-foreground">You're all set up and ready to start connecting.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass shadow-apple-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-medium">Define your Role in the Circle</CardTitle>
        <p className="text-muted-foreground">
          Choose the role that best describes your purpose in the community.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          {roles.map((role) => (
            <Card
              key={role.id}
              className={`cursor-pointer transition-spring hover:shadow-apple-sm ${
                selectedRole === role.id 
                  ? 'ring-2 ring-primary bg-primary-subtle' 
                  : 'hover:bg-accent'
              }`}
              onClick={() => handleRoleSelect(role.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{role.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium">{role.title}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {onPrev && (
          <div className="flex justify-start pt-4">
            <Button variant="outline" onClick={onPrev} className="transition-spring">
              Back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}