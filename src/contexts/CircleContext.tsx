import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, matchPath } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCircleByAbbreviationFull,
  canViewCircle,
  getFullCircleRoleData,
  getCircleMemberCounts,
  invalidateDefaultCircleCache,
  Circle,
  AdminType,
} from '@/lib/api/circles';
import { getUnseenContactsCount } from '@/lib/api/contacts';
import { getMyModeration, Moderation, NO_MODERATION } from '@/lib/api/moderation';
import { ModerationGate } from '@/components/moderation/ModerationGate';
import { ACTIVE_CIRCLE_ABBREV_KEY } from '@/lib/navigation';

interface CircleContextValue {
  circle: Circle | null;
  circleId: string | null;
  role: string;
  isAdmin: boolean;
  adminType: AdminType;
  allowMemberCustomTopics: boolean;
  memberCounts: { total: number; online: number };
  unseenContactCount: number;
  moderation: Moderation;
  loading: boolean;
  reloadRole: () => Promise<void>;
  reloadCircle: () => Promise<void>;
  refreshUnseenCount: () => Promise<void>;
  reloadModeration: () => Promise<void>;
}

const CircleContext = createContext<CircleContextValue | null>(null);

// sessionStorage key for the circle the user is currently "inside" — lets the
// call flow (/call, /waiting, …), which has no abbreviation in its URL, stay
// bound to the circle the user entered from. Cleared when they reach the hub.
// Defined in lib/navigation so nav helpers can read it too.
const ACTIVE_ABBREV_KEY = ACTIVE_CIRCLE_ABBREV_KEY;

export function CircleProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [circle, setCircle] = useState<Circle | null>(null);
  const [role, setRole] = useState('Member');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminType, setAdminType] = useState<AdminType>(null);
  const [memberCounts, setMemberCounts] = useState({ total: 0, online: 0 });
  const [unseenContactCount, setUnseenContactCount] = useState(0);
  const [moderation, setModeration] = useState<Moderation>(NO_MODERATION);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  // Monotonic token so a slow load for a circle we've navigated away from can't
  // overwrite state for the circle we're now on.
  const loadTokenRef = useRef(0);

  const resetCircleState = useCallback(() => {
    setCircle(null);
    setRole('Member');
    setIsAdmin(false);
    setAdminType(null);
    setMemberCounts({ total: 0, online: 0 });
    setModeration(NO_MODERATION);
  }, []);

  /**
   * Resolve + load the active circle.
   *  - abbrev null  → no active circle (hub / not inside a circle): clear state.
   *  - abbrev set   → load that circle, but only if the user may view it
   *    (active member or super admin). Non-members on a circle route are
   *    redirected to the hub and never get the full row (incl. invite_code).
   */
  const loadActive = useCallback(async (abbrev: string | null, isCircleRoute: boolean) => {
    const token = ++loadTokenRef.current;
    const alive = () => mountedRef.current && token === loadTokenRef.current;

    try {
      setLoading(true);

      if (!abbrev) {
        if (!alive()) return;
        resetCircleState();
        const unseen = await getUnseenContactsCount().catch(() => 0);
        if (alive()) setUnseenContactCount(unseen);
        return;
      }

      const circleData = await getCircleByAbbreviationFull(abbrev);
      if (!alive()) return;

      const allowed = circleData ? await canViewCircle(circleData.id) : false;
      if (!alive()) return;

      if (!circleData || !allowed) {
        sessionStorage.removeItem(ACTIVE_ABBREV_KEY);
        resetCircleState();
        if (isCircleRoute) navigate('/home', { replace: true });
        return;
      }

      setCircle(circleData);
      sessionStorage.setItem(ACTIVE_ABBREV_KEY, circleData.abbreviation);

      const [roleData, counts, unseen, moderationData] = await Promise.all([
        getFullCircleRoleData(circleData.id),
        getCircleMemberCounts(circleData.id),
        getUnseenContactsCount().catch(() => 0),
        getMyModeration(circleData.id).catch(() => NO_MODERATION),
      ]);
      if (!alive()) return;

      setRole(roleData.role);
      setIsAdmin(roleData.isAdmin);
      setAdminType(roleData.adminType);
      setMemberCounts(counts);
      setUnseenContactCount(unseen);
      setModeration(moderationData);
    } catch (error) {
      console.error('CircleContext: Error loading data:', error);
    } finally {
      if (alive()) setLoading(false);
    }
  }, [navigate, resetCircleState]);

  // Resolve the active circle from the route on every navigation / auth change.
  useEffect(() => {
    mountedRef.current = true;
    if (authLoading) return;

    if (!user) {
      resetCircleState();
      setUnseenContactCount(0);
      setLoading(false);
      return () => { mountedRef.current = false; };
    }

    const match = matchPath('/circle/:abbreviation', location.pathname);
    let abbrev: string | null;
    if (match?.params?.abbreviation) {
      abbrev = match.params.abbreviation.toUpperCase();
    } else if (location.pathname === '/home') {
      // The hub is intentionally circle-agnostic.
      abbrev = null;
      sessionStorage.removeItem(ACTIVE_ABBREV_KEY);
    } else {
      // Off-route pages (call flow, contacts, settings): stay bound to the
      // circle the user last entered, if any.
      abbrev = sessionStorage.getItem(ACTIVE_ABBREV_KEY);
    }

    loadActive(abbrev, !!match);

    return () => { mountedRef.current = false; };
  }, [user, authLoading, location.pathname, loadActive, resetCircleState]);

  // Poll member counts (30s) and unseen contact count (30s) while inside a circle
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
    }, 30_000);

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
    const abbrev = sessionStorage.getItem(ACTIVE_ABBREV_KEY);
    await loadActive(abbrev, false);
  }, [loadActive]);

  const refreshUnseenCount = useCallback(async () => {
    try {
      const count = await getUnseenContactsCount();
      if (mountedRef.current) setUnseenContactCount(count);
    } catch { /* silent */ }
  }, []);

  const reloadModeration = useCallback(async () => {
    if (!circle) return;
    try {
      const m = await getMyModeration(circle.id);
      if (mountedRef.current) setModeration(m);
    } catch (error) {
      console.error('CircleContext: Error reloading moderation:', error);
    }
  }, [circle]);

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
      moderation,
      loading,
      reloadRole,
      reloadCircle,
      refreshUnseenCount,
      reloadModeration,
    }}>
      {children}
      <ModerationGate />
    </CircleContext.Provider>
  );
}

export function useCircle() {
  const ctx = useContext(CircleContext);
  if (!ctx) throw new Error('useCircle must be used within CircleProvider');
  return ctx;
}
