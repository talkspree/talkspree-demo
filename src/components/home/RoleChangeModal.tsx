import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { getOrCreateDefaultCircle, getCircleRoles, updateMyCircleRole, CircleRole } from '@/lib/api/circles';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

interface RoleChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: string;
  onRoleChanged: () => void;
}

const DEFAULT_ROLES = [
  { value: 'Mentor', label: 'Mentor' },
  { value: 'Mentee', label: 'Mentee' },
  { value: 'Alumni', label: 'Alumni' },
];

export function RoleChangeModal({ open, onOpenChange, currentRole, onRoleChanged }: RoleChangeModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [circle, setCircle] = useState<any>(null);
  const [roles, setRoles] = useState<{ value: string; label: string }[]>(DEFAULT_ROLES);

  useEffect(() => {
    if (open) {
      loadCircleData();
      setSelectedRole(currentRole);
    }
  }, [open, currentRole]);

  const loadCircleData = async () => {
    try {
      const defaultCircle = await getOrCreateDefaultCircle();
      setCircle(defaultCircle);

      if (defaultCircle) {
        try {
          const circleRoles = await getCircleRoles(defaultCircle.id);
          if (circleRoles.length > 0) {
            setRoles(circleRoles.map(r => ({ value: r.name, label: r.name })));
          }
        } catch {
          // Fall back to default roles if circle_roles table is unavailable
        }
      }
    } catch (error) {
      console.error('Error loading circle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!circle || selectedRole === currentRole) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await updateMyCircleRole(circle.id, selectedRole);
      toast({
        title: 'Success',
        description: `Your role has been updated to ${selectedRole}`,
      });
      onRoleChanged(); // Trigger refresh
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Circle Info */}
            {circle && (
              <div className="flex items-center gap-3 pb-4 border-b">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={circle.logo_url} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                    {circle.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{circle.name}</h3>
                  <p className="text-sm text-muted-foreground">Choose your role in this circle</p>
                </div>
              </div>
            )}

            {/* Role Options */}
            <div className="space-y-2">
              {roles.map((role) => (
                <Card
                  key={role.value}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedRole === role.value
                      ? 'ring-2 ring-primary shadow-md'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedRole(role.value)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-center gap-3">
                      <h4 className="font-semibold text-center flex-1">{role.label}</h4>
                      {selectedRole === role.value && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={saving || selectedRole === currentRole}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

