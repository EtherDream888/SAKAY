import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// In-memory fallback seed data for Announcements
let announcements = [
  {
    announcement_id: 'ANN-2026-001',
    title: 'City-Wide Tricycle Fare Matrix Ordinance Enactment',
    message:
      'Pursuant to City Ordinance No. 2024-04, the standard base fare for the first 2.0 km is fixed at ₱15.00 with ₱1.00 per succeeding kilometer.',
    target_audience: 'All (Drivers & Passengers)',
    urgency: 'Important',
    status: 'Published',
    published_at: '2026-08-01T08:00:00Z',
    created_by: 'LGU Transport Board',
  },
  {
    announcement_id: 'ANN-2026-002',
    title: 'JP Rizal St. Road Rehabilitation Advisory',
    message:
      'Temporary rerouting along JP Rizal St. from Brgy. San Vicente to Lumangbayan starting Monday due to drainage upgrading.',
    target_audience: 'Drivers Only',
    urgency: 'Advisory',
    status: 'Published',
    published_at: '2026-08-14T10:00:00Z',
    created_by: 'City Engineering & LGU Transport Office',
  },
];

// GET /api/admin/announcements - List announcements
router.get('/', async (_req: Request, res: Response) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('announcement')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    }
    return res.json({ success: true, data: announcements });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/announcements - Publish or schedule an announcement
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, message, target_audience = 'All', urgency = 'Normal', status = 'Published' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required' });
    }

    const newAnnouncement = {
      announcement_id: `ANN-${Date.now()}`,
      title,
      message,
      target_audience,
      urgency,
      status,
      published_at: new Date().toISOString(),
      created_by: 'LGU Administrator',
    };

    announcements.unshift(newAnnouncement);

    return res.status(201).json({
      success: true,
      message: 'Announcement successfully created.',
      data: newAnnouncement,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// DELETE /api/admin/announcements/:id - Delete / archive an announcement
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = announcements.findIndex((a) => a.announcement_id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    const deleted = announcements.splice(index, 1)[0];
    return res.json({
      success: true,
      message: 'Announcement deleted successfully.',
      data: deleted,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
