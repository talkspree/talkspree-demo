import { useState, useEffect } from 'react';
import { getUserCircleRole, checkIsCircleAdmin, getUserAdminType, getOrCreateDefaultCircle, AdminType } from '@/lib/api/circles';

export interface CircleRoleData {
  role: string;
  isAdmin: boolean;
  adminType: AdminType;
  circleId: string | null;
  loading: boolean;
}

export function useCircleRole() {
  const [roleData, setRoleData] = useState<CircleRoleData>({
    role: 'Member',
    isAdmin: false,
    adminType: null,
    circleId: null,
    loading: true
  });

  const loadCircleRole = async () => {
    try {
      // Get the default circle (Mentor the Young)
      const circle = await getOrCreateDefaultCircle();
      
      if (circle) {
        const [role, isAdmin, adminType] = await Promise.all([
          getUserCircleRole(circle.id),
          checkIsCircleAdmin(circle.id),
          getUserAdminType(circle.id)
        ]);

        setRoleData({
          role,
          isAdmin,
          adminType,
          circleId: circle.id,
          loading: false
        });
      } else {
        setRoleData(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error loading circle role:', error);
      setRoleData(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadCircleRole();
  }, []);

  const reloadRole = async () => {
    setRoleData(prev => ({ ...prev, loading: true }));
    await loadCircleRole();
  };

  return {
    ...roleData,
    reloadRole
  };
}

