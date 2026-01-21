import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface CircleRoleCardProps {
  circleId: string;
  onRoleChange: (circleId: string, role: string) => void;
}

const roles = [
  { value: 'Mentor', label: 'Mentor' },
  { value: 'Mentee', label: 'Mentee' },
  { value: 'Alumni', label: 'Alumni' },
];

export function CircleRoleCard({ circleId, onRoleChange }: CircleRoleCardProps) {
  const [loading, setLoading] = useState(true);
  const [circleName, setCircleName] = useState('');
  const [circleImage, setCircleImage] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  useEffect(() => {
    const loadCircleData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get circle details
        const { data: circle, error: circleError } = await supabase
          .from('circles')
          .select('name, logo_url')
          .eq('id', circleId)
          .single();

        if (circleError) throw circleError;

        setCircleName(circle.name);
        setCircleImage(circle.logo_url);

        // Get user's current role in this circle
        const { data: membership, error: memberError } = await supabase
          .from('circle_members')
          .select('role')
          .eq('circle_id', circleId)
          .eq('user_id', user.id)
          .single();

        if (memberError) throw memberError;

        setCurrentRole(membership.role);
      } catch (error) {
        console.error('Error loading circle data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCircleData();
  }, [circleId]);

  const handleRoleChange = (newRole: string) => {
    setCurrentRole(newRole);
    onRoleChange(circleId, newRole);
  };

  if (loading) {
    return (
      <Card className="shadow-apple-md border-2">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

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
              {selectedRole.label}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Your Role</label>
          <Select value={currentRole || ''} onValueChange={handleRoleChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
