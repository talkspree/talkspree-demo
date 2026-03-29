import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOrCreateDefaultCircle,
  getFullCircleRoleData,
  getCircleMemberCounts,
  invalidateDefaultCircleCache,
  Circle,
  AdminType,
} from '@/lib/api/circles';
import { getUnseenContactsCount } from '@/lib/api/contacts';

interface CircleContextValue {
  circle: Circle | null;
  circleId: string | null;
  role: string;
  isAdmin: boolean;
  adminType: AdminType;
  allowMemberCustomTopics: boolean;
  memberCounts: { total: number; online: number };
  unseenContactCount: number;
  loading: boolean;
  reloadRole: () => Promise<void>;
  reloadCircle: () => Promise<void>;
  refreshUnseenCount: () => Promise<void>;
}

const CircleContext = createContext<CircleContextValue | null>(null);

export function CircleProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [role, setRole] = useState('Member');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminType, setAdminType] = useState<AdminType>(null);
  const [memberCounts, setMemberCounts] = useState({ total: 0, online: 0 });
  const [unseenContactCount, setUnseenContactCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const circleData = await getOrCreateDefaultCircle();
      if (!mountedRef.current) return;
      setCircle(circleData);

      if (circleData) {
        const [roleData, counts, unseen] = await Promise.all([
          getFullCircleRoleData(circleData.id),
          getCircleMemberCounts(circleData.id),
          getUnseenContactsCount().catch(() => 0),
        ]);
        if (!mountedRef.current) return;

        setRole(roleData.role);
        setIsAdmin(roleData.isAdmin);
        setAdminType(roleData.adminType);
        setMemberCounts(counts);
        setUnseenContactCount(unseen);
      }
    } catch (error) {
      console.error('CircleContext: Error loading data:', error);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // Only load when auth is ready and user is logged in
  useEffect(() => {
    mountedRef.current = true;
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadAll();
    return () => { mountedRef.current = false; };
  }, [loadAll, user, authLoading]);

  // Poll member counts (30s) and unseen contact count (10s)
  useEffect(() => {
    if (!circle) return;
    const circleId = circle.id;

    const countsInterval = setInterval(async () => {
      try {
        const counts = await getCircleMemberCounts(circleId);
        if (mountedRef.current) setMemberCounts(counts);
      } catch { /* silent */ }
    }, 30_000);

    const unseenInterval = setInterval(async () => {
      try {
        const count = await getUnseenContactsCount();
        if (mountedRef.current) setUnseenContactCount(count);
      } catch { /* silent */ }
    }, 10_000);

    return () => {
      clearInterval(countsInterval);
      clearInterval(unseenInterval);
    };
  }, [circle]);

  const reloadRole = useCallback(async () => {
    if (!circle) return;
    try {
      const roleData = await getFullCircleRoleData(circle.id);
      if (mountedRef.current) {
        setRole(roleData.role);
        setIsAdmin(roleData.isAdmin);
        setAdminType(roleData.adminType);
      }
    } catch (error) {
      console.error('CircleContext: Error reloading role:', error);
    }
  }, [circle]);

  const reloadCircle = useCallback(async () => {
    invalidateDefaultCircleCache();
    await loadAll();
  }, [loadAll]);

  const refreshUnseenCount = useCallback(async () => {
    try {
      const count = await getUnseenContactsCount();
      if (mountedRef.current) setUnseenContactCount(count);
    } catch { /* silent */ }
  }, []);

  return (
    <CircleContext.Provider value={{
      circle,
      circleId: circle?.id || null,
      role,
      isAdmin,
      adminType,
      allowMemberCustomTopics: circle?.allow_member_custom_topics ?? true,
      memberCounts,
      unseenContactCount,
      loading,
      reloadRole,
      reloadCircle,
      refreshUnseenCount,
    }}>
      {children}
    </CircleContext.Provider>
  );
}

export function useCircle() {
  const ctx = useContext(CircleContext);
  if (!ctx) throw new Error('useCircle must be used within CircleProvider');
  return ctx;
}
