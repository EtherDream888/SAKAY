import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// In-memory fallback seed data for Incidents
let incidents = [
  {
    incident_id: 'INC-2026-001',
    booking_id: 'BK-2026-9081',
    reported_by: 'Passenger',
    reporter_name: 'Clarissa Santos',
    reporter_contact: '+63 917 555 4321',
    driver_name: 'Jose Mari Hernandez',
    driver_toda: 'CCTODA',
    driver_id: 'CCTODA-002',
    category: 'Overcharging',
    description: 'Driver demanded ₱80 for a 2km ride instead of the regulated ₱15 matrix fare.',
    status: 'Under Investigation',
    severity: 'Medium',
    created_at: '2026-08-15T09:30:00Z',
    evidence_urls: [],
    assigned_officer: 'LGU Transport Triage Officer Ramos',
    resolution_notes: null,
  },
  {
    incident_id: 'INC-2026-002',
    booking_id: 'BK-2026-8812',
    reported_by: 'Driver',
    reporter_name: 'Danilo Ramos Santos',
    reporter_contact: '+63 917 123 4567',
    driver_name: 'Danilo Ramos Santos',
    driver_toda: 'CCTODA',
    driver_id: 'CCTODA-001',
    category: 'Passenger Misconduct',
    description: 'Passenger refused to pay standard shared fare upon arrival at destination.',
    status: 'Resolved',
    severity: 'Low',
    created_at: '2026-08-14T16:45:00Z',
    evidence_urls: [],
    assigned_officer: 'LGU Transport Triage Officer Ramos',
    resolution_notes: 'Passenger contacted; amicable settlement reached with fare payment transferred.',
  },
  {
    incident_id: 'INC-2026-003',
    booking_id: 'BK-2026-7734',
    reported_by: 'Passenger',
    reporter_name: 'Mark Villafuerte',
    reporter_contact: '+63 928 111 2233',
    driver_name: 'Unverified Driver Unit',
    driver_toda: 'Non-Accredited Colorum',
    category: 'Colorum Operation',
    description: 'Unregistered tricycle unit operating without Calapan MTOP franchise sticker.',
    status: 'Escalated to LGU',
    severity: 'High',
    created_at: '2026-08-16T11:00:00Z',
    evidence_urls: [],
    assigned_officer: 'City Transport Enforcement Division',
    resolution_notes: null,
  },
];

// GET /api/admin/incidents - List all incidents
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, category, severity } = req.query;

    if (supabase) {
      let query = supabase.from('incident_report').select('*').order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    }

    let filtered = [...incidents];
    if (status) filtered = filtered.filter((i) => i.status === status);
    if (category) filtered = filtered.filter((i) => i.category === category);
    if (severity) filtered = filtered.filter((i) => i.severity === severity);

    return res.json({ success: true, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// PATCH /api/admin/incidents/:id/status - Update incident triage status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, resolution_notes, assigned_officer } = req.body;

    const incident = incidents.find((i) => i.incident_id === id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident report not found' });
    }

    if (status) incident.status = status;
    if (resolution_notes) incident.resolution_notes = resolution_notes;
    if (assigned_officer) incident.assigned_officer = assigned_officer;

    return res.json({
      success: true,
      message: `Incident ${id} updated to status '${status}'.`,
      data: incident,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
