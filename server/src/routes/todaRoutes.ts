import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// ============================================================================
// 1. LIST TODA APPLICATIONS (Pending Verification / Review / Return / All)
// ============================================================================
router.get('/applications', async (req: Request, res: Response) => {
  try {
    const { status, barangay, search } = req.query;

    if (supabase) {
      let query = supabase
        .from('toda')
        .select('*')
        .order('created_at', { ascending: false });

      if (status && status !== 'All') {
        query = query.eq('account_status', status);
      } else {
        // By default on applications page, include all non-active or all records if requested
        // Or show pending / under review / returned / deactivated
      }

      if (barangay && barangay !== 'All') {
        query = query.eq('barangay', barangay);
      }

      const { data, error } = await query;

      if (!error && data) {
        // Format database rows into structured application records
        const formatted = data.map((row: any) => ({
          id: row.toda_id,
          name: row.toda_name,
          acronym: row.toda_acronym || '',
          registrationNumber: row.registration_number,
          dateEstablished: row.date_established || '',
          representative: row.president_name || 'Designated Representative',
          phone: row.contact_number || row.president_contact || '+63 900 000 0000',
          email: row.email || '',
          barangay: row.barangay || 'Calapan City',
          terminalLocation: row.service_coverage_area || 'Calapan City Terminal',
          terminalLatitude: row.terminal_latitude || 13.4115,
          terminalLongitude: row.terminal_longitude || 121.1803,
          serviceCoverageArea: row.service_coverage_area || '',
          memberCount: row.active_driver_count || row.registered_tricycle_count || 0,
          registeredTricycleCount: row.registered_tricycle_count || 0,
          activeDriverCount: row.active_driver_count || 0,
          barangayClearanceExpiry: row.certificate_expiry
            ? new Date(row.certificate_expiry).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'Dec 31, 2026',
          clearanceStatus: row.account_status === 'Active' ? 'Valid' : 'Under Review',
          submittedDate: row.created_at
            ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : 'Recent',
          status: row.account_status === 'Active'
            ? 'Approved'
            : row.account_status === 'Deactivated'
            ? 'Declined'
            : 'Pending',
          officers: {
            president: row.president_name || 'N/A',
            presidentContact: row.president_contact || row.contact_number || 'N/A',
            vicePresident: row.vice_president_name || 'N/A',
            vicePresidentContact: row.vice_president_contact || 'N/A',
            secretary: row.secretary_name || 'N/A',
            secretaryContact: row.secretary_contact || 'N/A',
            treasurer: row.treasurer_name || 'N/A',
            treasurerContact: row.treasurer_contact || 'N/A',
          },
          documents: [
            {
              name: `Barangay Clearance (${row.barangay || 'Calapan City'})`,
              type: 'PDF Document (Official LGU Seal)',
              date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026',
              status: 'Verified',
              url: null,
            },
            {
              name: 'SEC / CDA Certificate of Registration',
              type: 'Certified True Copy',
              date: row.date_established || '2024',
              status: 'Verified',
              url: null,
            },
            {
              name: `Official Driver Master Roster (${row.active_driver_count || row.registered_tricycle_count || 0} Units)`,
              type: 'Master Roster Ledger (PDF)',
              date: row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '2026',
              status: 'Verified',
              url: null,
            },
            {
              name: "Mayor's Permit & Franchise Clearance",
              type: 'Official Municipal Permit',
              date: '2026',
              status: 'Verified',
              url: null,
            },
          ],
        }));

        let filtered = formatted;
        if (search) {
          const q = (search as string).toLowerCase();
          filtered = filtered.filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.representative.toLowerCase().includes(q) ||
              t.barangay.toLowerCase().includes(q) ||
              t.id.toLowerCase().includes(q)
          );
        }

        return res.json({ success: true, data: filtered });
      }
    }

    return res.json({ success: true, data: [] });
  } catch (err) {
    console.error('[todaRoutes] /applications error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 2. LIST ACCREDITED TODAS (account_status = 'Active')
// ============================================================================
router.get('/accredited', async (req: Request, res: Response) => {
  try {
    const { search } = req.query;

    if (supabase) {
      const { data, error } = await supabase
        .from('toda')
        .select('*')
        .eq('account_status', 'Active')
        .order('toda_name', { ascending: true });

      if (!error && data) {
        let result = data;
        if (search) {
          const q = (search as string).toLowerCase();
          result = result.filter(
            (t: any) =>
              t.toda_name.toLowerCase().includes(q) ||
              (t.barangay && t.barangay.toLowerCase().includes(q)) ||
              (t.president_name && t.president_name.toLowerCase().includes(q)) ||
              (t.registration_number && t.registration_number.toLowerCase().includes(q))
          );
        }
        return res.json({ success: true, data: result });
      }
    }

    return res.json({ success: true, data: [] });
  } catch (err) {
    console.error('[todaRoutes] /accredited error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 3. GET SINGLE TODA DETAILS
// ============================================================================
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (supabase) {
      const { data, error } = await supabase
        .from('toda')
        .select('*')
        .eq('toda_id', id)
        .maybeSingle();

      if (!error && data) {
        return res.json({ success: true, data });
      }
    }

    return res.status(404).json({ success: false, error: 'TODA record not found' });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 4. APPROVE TODA APPLICATION
// ============================================================================
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { certificate_number, remarks, actor_name = 'LGU Administrator' } = req.body;

    const certNo = certificate_number || `CERT-LGU-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const certExpiry = new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString();

    if (supabase) {
      // 1. Update toda table
      const { data, error } = await supabase
        .from('toda')
        .update({
          account_status: 'Active',
          certificate_number: certNo,
          certificate_expiry: certExpiry,
        })
        .eq('toda_id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 2. Insert audit log record
      try {
        await supabase.from('audit_log').insert([
          {
            action_type: 'TODA_ACCREDITATION_APPROVED',
            target_id: id,
            details: `[Accreditation] ${actor_name}: Approved municipal accreditation for TODA '${data?.toda_name || id}'. Issued Certificate ${certNo}. ${remarks ? 'Remarks: ' + remarks : ''}`,
            performed_at: new Date().toISOString(),
          },
        ]);
      } catch (auditErr) {
        console.warn('[todaRoutes] Audit log recording failed:', auditErr);
      }

      return res.json({
        success: true,
        message: `TODA ${data?.toda_name || id} successfully accredited. Certificate ${certNo} issued.`,
        data,
      });
    }

    return res.status(500).json({ success: false, error: 'Database service unavailable' });
  } catch (err) {
    console.error('[todaRoutes] /:id/approve error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 5. RETURN TODA APPLICATION FOR CORRECTION
// ============================================================================
router.post('/:id/return-correction', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, actor_name = 'LGU Administrator' } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'A mandatory reason or correction instructions must be specified.',
      });
    }

    if (supabase) {
      // 1. Fetch current TODA details
      const { data: toda } = await supabase
        .from('toda')
        .select('toda_name')
        .eq('toda_id', id)
        .maybeSingle();

      // 2. Insert audit log record
      await supabase.from('audit_log').insert([
        {
          action_type: 'TODA_APPLICATION_RETURNED_FOR_CORRECTION',
          target_id: id,
          details: `[Accreditation Review] ${actor_name}: Returned accreditation application for TODA '${toda?.toda_name || id}' for correction. Required Correction: ${reason}`,
          performed_at: new Date().toISOString(),
        },
      ]);

      return res.json({
        success: true,
        message: `Application for ${toda?.toda_name || id} has been returned for correction.`,
        data: { id, reason, status: 'Returned for Correction' },
      });
    }

    return res.status(500).json({ success: false, error: 'Database service unavailable' });
  } catch (err) {
    console.error('[todaRoutes] /:id/return-correction error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 6. REJECT / DECLINE TODA APPLICATION
// ============================================================================
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, actor_name = 'LGU Administrator' } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'A mandatory rejection reason must be provided.',
      });
    }

    if (supabase) {
      // 1. Update toda account_status to Deactivated
      const { data, error } = await supabase
        .from('toda')
        .update({
          account_status: 'Deactivated',
        })
        .eq('toda_id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 2. Insert audit log record
      await supabase.from('audit_log').insert([
        {
          action_type: 'TODA_APPLICATION_REJECTED',
          target_id: id,
          details: `[Accreditation Review] ${actor_name}: Permanently declined accreditation application for TODA '${data?.toda_name || id}'. Rejection Reason: ${reason}`,
          performed_at: new Date().toISOString(),
        },
      ]);

      return res.json({
        success: true,
        message: `Application for TODA '${data?.toda_name || id}' has been rejected.`,
        data,
      });
    }

    return res.status(500).json({ success: false, error: 'Database service unavailable' });
  } catch (err) {
    console.error('[todaRoutes] /:id/reject error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// Backwards compatibility alias for decline
router.post('/:id/decline', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { reason, actor_name = 'LGU Administrator' } = req.body;

  if (!reason) {
    return res.status(400).json({
      success: false,
      error: 'A mandatory rejection reason must be provided.',
    });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('toda')
        .update({ account_status: 'Deactivated' })
        .eq('toda_id', id)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('audit_log').insert([
        {
          action_type: 'TODA_APPLICATION_REJECTED',
          target_id: id,
          details: `[Accreditation Review] ${actor_name}: Declined accreditation application for '${data?.toda_name || id}'. Reason: ${reason}`,
          performed_at: new Date().toISOString(),
        },
      ]);

      return res.json({
        success: true,
        message: `Application for TODA '${data?.toda_name || id}' has been declined.`,
        data,
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: (err as Error).message });
    }
  }

  return res.status(500).json({ success: false, error: 'Database service unavailable' });
});

export default router;

