import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CircleRoleCardProps {
  circleName: string;
  currentRole: string;
  onRoleChange: (role: string) => void;
  circleImage?: string;
}

const roles = [
  { value: 'mentor', label: 'Mentor', emoji: '🧭', description: 'Guide and support others' },
  { value: 'mentee', label: 'Mentee', emoji: '🌱', description: 'Learn and grow from others' },
  { value: 'alumni', label: 'Alumni', emoji: '🎓', description: 'Former member' },
];

export function CircleRoleCard({ circleName, currentRole, onRoleChange, circleImage }: CircleRoleCardProps) {
  const selectedRole = roles.find(r => r.value === currentRole);

  return (
    <Card className="shadow-apple-md border-2">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={circleImage} />
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {circleName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-semibold">{circleName}</h3>
              <p className="text-sm text-muted-foreground">Select your role in this circle</p>
            </div>
          </div>
          {selectedRole && (
            <Badge variant="default" className="text-base px-3 py-1">
              {selectedRole.emoji} {selectedRole.label}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Role</label>
          <Select value={currentRole} onValueChange={onRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center gap-2">
                    <span>{role.emoji}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.label}</span>
                      <span className="text-xs text-muted-foreground">{role.description}</span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
