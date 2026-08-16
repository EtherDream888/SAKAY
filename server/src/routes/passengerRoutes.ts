import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// In-memory fallback seed data for Passengers
let passengers = [
  {
    passenger_id: 'PSG-001',
    full_name: 'Maria Clara Santos',
    contact_number: '+63 917 999 1122',
    email: 'maria.santos@gmail.com',
    residential_address: 'Brgy. San Vicente Central, Calapan City',
    account_status: 'Active',
    completed_trips_count: 34,
    strikes_count: 0,
    created_at: '2024-02-15T00:00:00Z',
  },
  {
    passenger_id: 'PSG-002',
    full_name: 'Juan Antonio Luna',
    contact_number: '+63 920 888 3344',
    email: 'juan.luna@gmail.com',
    residential_address: 'Brgy. Lumangbayan, Calapan City',
    account_status: 'Active',
    completed_trips_count: 12,
    strikes_count: 1,
    created_at: '2024-03-01T00:00:00Z',
  },
  {
    passenger_id: 'PSG-003',
    full_name: 'Gabriel Reyes',
    contact_number: '+63 919 777 5566',
    email: 'gabriel.reyes@gmail.com',
    residential_address: 'Brgy. Tawiran, Calapan City',
    account_status: 'Suspended',
    completed_trips_count: 5,
    strikes_count: 3,
    created_at: '2024-04-10T00:00:00Z',
  },
];

// GET /api/admin/passengers - List passengers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;

    if (supabase) {
      let query = supabase.from('passenger').select('*');
      if (status) query = query.eq('account_status', status);
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    }

    let filtered = [...passengers];
    if (status) filtered = filtered.filter((p) => p.account_status === status);

    return res.json({ success: true, data: filtered });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/passengers/:id/suspend - Suspend passenger account
router.post('/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, duration_days = 7 } = req.body;

    const passenger = passengers.find((p) => p.passenger_id === id);
    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Passenger not found' });
    }

    passenger.account_status = 'Suspended';
    return res.json({
      success: true,
      message: `Passenger ${passenger.full_name} suspended for ${duration_days} days.`,
      data: { passenger, reason, duration_days },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/passengers/:id/reactivate - Reactivate passenger account
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const passenger = passengers.find((p) => p.passenger_id === id);
    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Passenger not found' });
    }

    passenger.account_status = 'Active';
    return res.json({
      success: true,
      message: `Passenger ${passenger.full_name} reactivated.`,
      data: passenger,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/passengers/:id/strike - Issue strike to passenger
router.post('/:id/strike', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, violation_type } = req.body;

    const passenger = passengers.find((p) => p.passenger_id === id);
    if (!passenger) {
      return res.status(404).json({ success: false, error: 'Passenger not found' });
    }

    passenger.strikes_count = (passenger.strikes_count || 0) + 1;
    let autoSuspended = false;
    if (passenger.strikes_count >= 3) {
      passenger.account_status = 'Suspended';
      autoSuspended = true;
    }

    return res.json({
      success: true,
      message: `Strike issued to ${passenger.full_name}. Total strikes: ${passenger.strikes_count}`,
      data: { passenger, reason, violation_type, autoSuspended },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
