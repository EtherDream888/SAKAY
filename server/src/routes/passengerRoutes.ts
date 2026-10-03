import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { forbidDirectAccountAction } from './disabledEndpoints';

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

// Suspend / reactivate / strike are enforced by the database policy engine and are
// disabled here (the routes were unauthenticated). See disabledEndpoints.ts.
router.post('/:id/suspend', forbidDirectAccountAction);
router.post('/:id/reactivate', forbidDirectAccountAction);
router.post('/:id/strike', forbidDirectAccountAction);

export default router;
