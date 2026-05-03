import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getInviterBySlug, getCircleByAbbreviation } from '@/lib/api/affiliates';
import { setPendingAffiliate } from '@/lib/affiliate';

/**
 * Personal affiliate invite landing page.
 *
 * Route: `/:circleAbbrev/:userSlug` (e.g. `/MTY/xa7k2p`)
 *
 * Flow:
 *   1. Resolve the inviter (by slug) and the circle (by abbreviation).
 *   2. If either lookup fails, navigate to /404 (the catch-all).
 *   3. If a user is already logged in, just send them home — affiliation is
 *      only recorded for *new* accounts (per spec).
 *   4. Otherwise stash the inviter + circle in localStorage as
 *      `pendingAffiliate`, then navigate to `/auth?signup=1` so the signup
 *      form can render the "Invited by ..." banner and the eventual
 *      `signUp()` call can attach `invited_by` / `invited_via_circle_id`.
 */
export default function AffiliateInvite() {
  const { circleAbbrev, userSlug } = useParams<{ circleAbbrev: string; userSlug: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (handledRef.current) return;
    handledRef.current = true;

    const run = async () => {
      if (!circleAbbrev || !userSlug) {
        navigate('/404', { replace: true });
        return;
      }

      // Already logged in: just go home. (Future: auto-join the circle.)
      if (user) {
        navigate('/home', { replace: true });
        return;
      }

      const [inviter, circle] = await Promise.all([
        getInviterBySlug(userSlug),
        getCircleByAbbreviation(circleAbbrev),
      ]);

      if (!inviter || !circle) {
        navigate('/404', { replace: true });
        return;
      }

      setPendingAffiliate({
        inviterId: inviter.id,
        inviterFirstName: inviter.firstName,
        inviterLastName: inviter.lastName,
        inviterPicture: inviter.profilePicture,
        inviterSlug: inviter.slug,
        circleId: circle.id,
        circleAbbrev: circle.abbreviation,
      });

      navigate('/auth?signup=1', { replace: true });
    };

    run();
  }, [circleAbbrev, userSlug, user, loading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground">Opening your invite...</p>
      </div>
    </div>
  );
}
