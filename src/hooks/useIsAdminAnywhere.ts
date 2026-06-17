import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { checkIsAdminAnywhereCached } from '@/lib/api/circles';

/**
 * Whether the current user administers ANY circle (or is a super admin).
 *
 * Drives the universal "Admin Manager" entry point, which is independent of the
 * active-circle route context (so it shows on the hub, contacts, and while
 * viewing a circle you don't administer). The underlying check is cached per
 * user id (see `checkIsAdminAnywhereCached`), so the single mounted header
 * doesn't refetch on every navigation, and an account switch recomputes.
 */
export function useIsAdminAnywhere(): { isAdminAnywhere: boolean; loading: boolean } {
  const { user } = useAuth();
  const [isAdminAnywhere, setIsAdminAnywhere] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setIsAdminAnywhere(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    checkIsAdminAnywhereCached(userId)
      .then((result) => {
        if (!cancelled) {
          setIsAdminAnywhere(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsAdminAnywhere(false);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [user?.id]);

  return { isAdminAnywhere, loading };
}
