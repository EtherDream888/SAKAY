import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// In-memory fallback seed data for Drivers
let drivers = [
  {
    driver_id: 'CCTODA-001',
    full_name: 'Danilo Ramos Santos',
    contact_number: '+63 917 123 4567',
    email: 'danilo.santos@gmail.com',
    toda_name: 'Calapan Central TODA',
    toda_acronym: 'CCTODA',
    toda_membership_number: 'CCTODA-2024-001',
    license_number: 'D02-14-089721',
    franchise_number: 'MTOP-2024-001',
    plate_number: 'AA 1234',
    account_status: 'Verified',
    availability_status: 'Available',
    weighted_average_rating: 4.85,
    strikes_count: 0,
    created_at: '2024-01-20T00:00:00Z',
  },
  {
    driver_id: 'CCTODA-002',
    full_name: 'Jose Mari Hernandez',
    contact_number: '+63 918 234 5678',
    email: 'jm.hernandez@gmail.com',
    toda_name: 'Calapan Central TODA',
    toda_acronym: 'CCTODA',
    toda_membership_number: 'CCTODA-2024-002',
    license_number: 'D02-15-098712',
    franchise_number: 'MTOP-2024-002',
    plate_number: 'BB 5678',
    account_status: 'Verified',
    availability_status: 'Busy',
    weighted_average_rating: 4.9,
    strikes_count: 1,
    created_at: '2024-01-22T00:00:00Z',
  },
  {
    driver_id: 'APP-DRV-001',
    full_name: 'Eduardo M. Perez',
    contact_number: '+63 928 444 8902',
    email: 'eduardo.perez@gmail.com',
    toda_name: 'Calapan Central TODA',
    toda_acronym: 'CCTODA',
    toda_membership_number: 'CCTODA-2024-025',
    license_number: 'D02-18-112233',
    franchise_number: 'MTOP-2026-PENDING',
    plate_number: 'CC 9012',
    account_status: 'Pending Verification',
    availability_status: 'Offline',
    weighted_average_rating: 5.0,
    strikes_count: 0,
    created_at: '2026-08-14T00:00:00Z',
  },
];

// GET /api/admin/drivers - List drivers with optional status filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, toda } = req.query;

    if (supabase) {
      let query = supabase.from('driver').select('*');
      if (status) query = query.eq('account_status', status);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    }

    let filtered = [...drivers];
    if (status) filtered = filtered.filter((d) => d.account_status === status);
    if (toda) filtered = filtered.filter((d) => d.toda_acronym === toda);

    return res.json({ success: true, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/drivers/:id/verify - Approve & issue MTOP franchise
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { franchise_number } = req.body;

    const driver = drivers.find((d) => d.driver_id === id);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    driver.account_status = 'Verified';
    if (franchise_number) driver.franchise_number = franchise_number;

    return res.json({
      success: true,
      message: `Driver ${driver.full_name} verified and approved.`,
      data: driver,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/drivers/:id/suspend - Suspend driver account
router.post('/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, duration_days = 7 } = req.body;

    const driver = drivers.find((d) => d.driver_id === id);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    driver.account_status = 'Suspended';
    return res.json({
      success: true,
      message: `Driver ${driver.full_name} suspended for ${duration_days} days.`,
      data: { driver, reason, duration_days },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/drivers/:id/reactivate - Reactivate suspended driver
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const driver = drivers.find((d) => d.driver_id === id);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    driver.account_status = 'Verified';
    return res.json({
      success: true,
      message: `Driver ${driver.full_name} reactivated.`,
      data: driver,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/drivers/:id/strike - Issue policy strike
router.post('/:id/strike', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, violation_type } = req.body;

    const driver = drivers.find((d) => d.driver_id === id);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    driver.strikes_count = (driver.strikes_count || 0) + 1;
    let autoSuspended = false;
    if (driver.strikes_count >= 3) {
      driver.account_status = 'Suspended';
      autoSuspended = true;
    }

    return res.json({
      success: true,
      message: `Strike issued to ${driver.full_name}. Total strikes: ${driver.strikes_count}`,
      data: { driver, reason, violation_type, autoSuspended },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
