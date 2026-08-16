import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// In-memory fallback seed data for Calapan City Fare Matrix
let fareMatrices = [
  {
    fare_matrix_id: 'fm-2024-001',
    base_fare: 15.0,
    base_distance_km: 2.0,
    succeeding_rate: 1.0,
    effective_timestamp: '2024-01-01T00:00:00Z',
    is_active: true,
    configured_by: 'LGU Transport Board',
    created_at: '2024-01-01T00:00:00Z',
    ordinance_number: 'City Ordinance No. 2024-04',
    student_senior_discount_percent: 20,
    night_differential_rate: 2.0,
  },
  {
    fare_matrix_id: 'fm-2022-001',
    base_fare: 12.0,
    base_distance_km: 2.0,
    succeeding_rate: 0.75,
    effective_timestamp: '2022-06-01T00:00:00Z',
    is_active: false,
    configured_by: 'LGU Transport Board',
    created_at: '2022-06-01T00:00:00Z',
    ordinance_number: 'City Ordinance No. 2022-18',
    student_senior_discount_percent: 20,
    night_differential_rate: 0,
  },
];

// GET /api/admin/fare-matrix - Get active fare matrix and historical versions
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('fare_matrix')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    }
    return res.json({ success: true, data: fareMatrices });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/fare-matrix - Enact a new municipal fare rate ordinance
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      base_fare,
      base_distance_km = 2.0,
      succeeding_rate,
      ordinance_number,
      student_senior_discount_percent = 20,
      night_differential_rate = 0,
      configured_by = 'LGU Transport Administrator',
    } = req.body;

    if (base_fare === undefined || succeeding_rate === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fare fields (base_fare, succeeding_rate)',
      });
    }

    const newMatrix = {
      fare_matrix_id: `fm-${Date.now()}`,
      base_fare: Number(base_fare),
      base_distance_km: Number(base_distance_km),
      succeeding_rate: Number(succeeding_rate),
      effective_timestamp: new Date().toISOString(),
      is_active: true,
      configured_by,
      created_at: new Date().toISOString(),
      ordinance_number: ordinance_number || `City Ordinance No. ${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
      student_senior_discount_percent: Number(student_senior_discount_percent),
      night_differential_rate: Number(night_differential_rate),
    };

    // Deactivate previous matrices
    fareMatrices = fareMatrices.map((m) => ({ ...m, is_active: false }));
    fareMatrices.unshift(newMatrix);

    if (supabase) {
      // Deactivate older active records in Supabase
      await supabase.from('fare_matrix').update({ is_active: false }).eq('is_active', true);
      const { data, error } = await supabase.from('fare_matrix').insert([newMatrix]).select();
      if (!error && data) {
        return res.status(201).json({ success: true, data: data[0] });
      }
    }

    return res.status(201).json({ success: true, data: newMatrix });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
