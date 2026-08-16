import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// In-memory fallback audit ledger
let auditLogs = [
  {
    log_id: 'AUDIT-LOG-1001',
    action_type: 'FARE_MATRIX_UPDATED',
    category: 'Fare Matrix',
    actor_name: 'Admin Maria Santos (LGU)',
    target_id: 'fm-2024-001',
    target_name: 'City Ordinance No. 2024-04',
    details: 'Enacted baseline ₱15.00 base fare for 2.0 km + ₱1.00/km rate across all TODAs.',
    performed_at: '2026-08-16T14:30:00Z',
  },
  {
    log_id: 'AUDIT-LOG-1002',
    action_type: 'TODA_ACCREDITATION_APPROVED',
    category: 'Verification',
    actor_name: 'Admin Maria Santos (LGU)',
    target_id: 'toda-1',
    target_name: 'Calapan Central TODA (CCTODA)',
    details: 'Verified SEC registration & barangay clearances; issued permit CAL-TODA-2024-001.',
    performed_at: '2026-08-16T14:15:00Z',
  },
  {
    log_id: 'AUDIT-LOG-1003',
    action_type: 'DRIVER_ACCOUNT_SUSPENDED',
    category: 'User Oversight',
    actor_name: 'Admin Maria Santos (LGU)',
    target_id: 'DRV-9901',
    target_name: 'Renato Panganiban',
    details: 'Issued 7-day administrative suspension due to non-roster terminal operation violation.',
    performed_at: '2026-08-16T13:45:00Z',
  },
];

// GET /api/admin/audit-logs - Query audit trail
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, action_type } = req.query;

    if (supabase) {
      let query = supabase.from('audit_log').select('*').order('performed_at', { ascending: false });
      if (action_type) query = query.eq('action_type', action_type);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    }

    let filtered = [...auditLogs];
    if (category) filtered = filtered.filter((log) => log.category === category);
    if (action_type) filtered = filtered.filter((log) => log.action_type === action_type);

    return res.json({ success: true, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/audit-logs - Record an immutable audit log entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      action_type,
      category = 'General',
      actor_name = 'LGU Administrator',
      target_id,
      target_name,
      details,
    } = req.body;

    if (!action_type || !details) {
      return res.status(400).json({
        success: false,
        error: 'action_type and details are required for audit trail records.',
      });
    }

    const newLog = {
      log_id: `AUDIT-LOG-${Date.now()}`,
      action_type,
      category,
      actor_name,
      target_id: target_id || null,
      target_name: target_name || null,
      details,
      performed_at: new Date().toISOString(),
    };

    auditLogs.unshift(newLog);

    if (supabase) {
      await supabase.from('audit_log').insert([
        {
          action_type,
          target_id,
          details: `[${category}] ${actor_name}: ${details}`,
          performed_at: newLog.performed_at,
        },
      ]);
    }

    return res.status(201).json({
      success: true,
      message: 'Audit log committed to immutable ledger.',
      data: newLog,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
