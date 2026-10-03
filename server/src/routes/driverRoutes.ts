import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { forbidDirectAccountAction } from './disabledEndpoints';

const router = Router();

// ============================================================================
// 1. GET /api/admin/drivers - List drivers from Supabase
// ============================================================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, toda, search } = req.query;

    if (supabase) {
      let query = supabase
        .from('driver')
        .select(`
          *,
          toda:toda_id (
            toda_id,
            toda_name,
            toda_acronym,
            barangay
          )
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'All') {
        query = query.eq('account_status', status);
      }

      const { data, error } = await query;

      if (!error && data) {
        let result = data.map((d: any) => ({
          driver_id: d.driver_id,
          id: d.driver_id,
          full_name: d.full_name,
          name: d.full_name,
          contact_number: d.contact_number,
          phone: d.contact_number,
          email: d.email || '',
          toda_id: d.toda_id,
          toda_name: d.toda?.toda_name || 'Calapan Central TODA',
          toda_acronym: d.toda?.toda_acronym || 'CCTODA',
          toda_membership_number: d.toda_membership_number || 'N/A',
          license_number: d.license_number || 'N/A',
          license_expiry: d.license_expiry || '2026-12-31',
          franchise_number: d.franchise_number || 'N/A',
          plate_number: d.plate_number || 'N/A',
          barangay_service_area: d.barangay_service_area || d.toda?.barangay || 'Calapan City',
          account_status: d.account_status || 'Pending Verification',
          availability_status: d.availability_status || 'Offline',
          weighted_average_rating: Number(d.weighted_average_rating) || 5.0,
          strikes_count: d.strikes_count ?? 0,
          created_at: d.created_at,
        }));

        if (toda && toda !== 'All') {
          result = result.filter(
            (d) =>
              d.toda_acronym === toda ||
              d.toda_name.toLowerCase().includes((toda as string).toLowerCase())
          );
        }

        if (search) {
          const q = (search as string).toLowerCase();
          result = result.filter(
            (d) =>
              d.full_name.toLowerCase().includes(q) ||
              d.license_number.toLowerCase().includes(q) ||
              d.plate_number.toLowerCase().includes(q) ||
              d.franchise_number.toLowerCase().includes(q) ||
              d.toda_name.toLowerCase().includes(q)
          );
        }

        return res.json({ success: true, data: result });
      }
    }

    return res.json({ success: true, data: [] });
  } catch (err) {
    console.error('[driverRoutes] GET / error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 2-5. verify / suspend / reactivate / strike
// Driver approval is the LGU's Stage 2 decision (verify_driver_affiliation RPC) and
// strikes/suspensions are enforced by the database policy engine (Batch 3). These
// Express routes were unauthenticated, trusted `actor_name` from the request body and
// wrote with the service-role key. Nothing calls them, so they are disabled.
// ============================================================================
router.post('/:id/verify', forbidDirectAccountAction);
router.post('/:id/suspend', forbidDirectAccountAction);
router.post('/:id/reactivate', forbidDirectAccountAction);
router.post('/:id/strike', forbidDirectAccountAction);

export default router;
