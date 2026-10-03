import { Request, Response } from 'express';

/**
 * Strikes, suspensions and reactivations are decided by the database policy engine
 * (public.issue_strike, admin_suspend_account, admin_reinstate_account) and require an
 * authenticated administrator, which is verified in the database. These Express routes
 * had no authentication and wrote with the service-role key, so they are permanently
 * disabled. Clients must call the Supabase RPCs instead.
 */
export function forbidDirectAccountAction(_req: Request, res: Response): void {
  res.status(403).json({
    success: false,
    error:
      'This endpoint is disabled. Strikes, suspensions and reinstatements are enforced by the database policy engine and require an authenticated administrator.',
  });
}
