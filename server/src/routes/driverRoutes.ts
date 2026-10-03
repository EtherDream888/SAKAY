import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendRawSms } from '../services/smsService';
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
// 2. POST /api/admin/drivers/:id/verify - Stage 2 LGU Credential Approval
// ============================================================================
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { franchise_number, actor_name = 'LGU Transport Administrator' } = req.body;

    if (supabase) {
      const updatePayload: any = { account_status: 'Verified' };
      if (franchise_number) {
        updatePayload.franchise_number = franchise_number;
      }

      const { data, error } = await supabase
        .from('driver')
        .update(updatePayload)
        .eq('driver_id', id)
        .select('*, toda:toda_id ( toda_name, toda_acronym )')
        .single();

      if (error) throw error;

      await supabase.from('audit_log').insert([
        {
          action_type: 'DRIVER_STAGE2_VERIFIED',
          target_id: id,
          details: `[Driver Verification] ${actor_name}: Approved Stage 2 LGU verification and accredited driver '${data?.full_name || id}'. Franchise: ${data?.franchise_number || 'Existing'}`,
          performed_at: new Date().toISOString(),
        },
      ]);

      // Dispatch official Tagalog approval SMS
      if (data?.contact_number) {
        try {
          const firstName = data.full_name?.split(' ')[0] || data.full_name || 'Drayber';
          const todaName = data.toda?.toda_name || 'TODA';
          const smsMsg = `SAKAY Alert: Magandang araw, ${firstName}! Ang iyong aplikasyon bilang drayber ay opisyal nang inaprubahan ng City LGU Franchising Office at ${todaName}. Beripikado na ang iyong account! Maaari ka nang mag-log in sa SAKAY Driver app upang magsimulang pumasada. Ingat sa biyahe!`;
          await sendRawSms(data.contact_number, smsMsg);
        } catch (smsErr) {
          console.warn('[driverRoutes] LGU verification SMS dispatch error:', smsErr);
        }
      }

      return res.json({
        success: true,
        message: `Driver ${data?.full_name || id} verified and accredited.`,
        data,
      });
    }

    return res.status(500).json({ success: false, error: 'Database service unavailable' });
  } catch (err) {
    console.error('[driverRoutes] /:id/verify error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 3-5. suspend / reactivate / strike
// Enforced by the database policy engine (Batch 3). These routes were
// unauthenticated and wrote with the service-role key, so they are disabled.
// ============================================================================
router.post('/:id/suspend', forbidDirectAccountAction);
router.post('/:id/reactivate', forbidDirectAccountAction);
router.post('/:id/strike', forbidDirectAccountAction);

export default router;
