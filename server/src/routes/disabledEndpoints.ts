import { Request, Response } from 'express';

/**
 * Driver approval, strikes, suspensions and reactivations are decided by database functions
 * (verify_driver_affiliation, issue_strike, admin_suspend_account, admin_reinstate_account)
 * that verify the signed-in administrator inside the database. These Express routes had no
 * authentication and either wrote with the service-role key or duplicated that logic in
 * memory, so they are permanently disabled. Clients must call the Supabase RPCs instead.
 */
export function forbidDirectAccountAction(_req: Request, res: Response): void {
  res.status(403).json({
    success: false,
    error:
      'This endpoint is disabled. Driver approval, strikes, suspensions and reinstatements are enforced by database functions that require an authenticated administrator.',
  });
}
