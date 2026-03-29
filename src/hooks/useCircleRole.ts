import { useCircle } from '@/contexts/CircleContext';
import { AdminType } from '@/lib/api/circles';

export interface CircleRoleData {
  role: string;
  isAdmin: boolean;
  adminType: AdminType;
  circleId: string | null;
  allowMemberCustomTopics: boolean;
  loading: boolean;
}

/**
 * Hook that provides circle role data.
 * Now backed by CircleContext — single fetch shared across all consumers.
 */
export function useCircleRole() {
  const { role, isAdmin, adminType, circleId, allowMemberCustomTopics, loading, reloadRole } = useCircle();

  return {
    role,
    isAdmin,
    adminType,
    circleId,
    allowMemberCustomTopics,
    loading,
    reloadRole,
  };
}
