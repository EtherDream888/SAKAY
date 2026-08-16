import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// In-memory fallback seed data for TODAs
interface TodaRecord {
  toda_id: string;
  toda_name: string;
  toda_acronym?: string;
  registration_number: string;
  date_established?: string;
  terminal_latitude?: number;
  terminal_longitude?: number;
  barangay?: string;
  service_coverage_area?: string;
  contact_number?: string;
  email?: string;
  president_name?: string;
  registered_tricycle_count: number;
  active_driver_count: number;
  certificate_number?: string;
  certificate_expiry?: string;
  account_status: 'Active' | 'Pending Verification' | 'Suspended' | 'Deactivated';
  created_at: string;
}

let todaApplications = [
  {
    application_id: 'APP-TODA-001',
    toda_name: 'San Vicente Tricycle Operators Association',
    toda_acronym: 'SVTODA',
    barangay: 'San Vicente Central',
    terminal_location: 'San Vicente Market Crossing, JP Rizal',
    registered_units: 32,
    active_drivers: 28,
    president_name: 'Rolando D. Garcia',
    contact_number: '+63 917 555 1201',
    status: 'Under Review',
    submitted_at: '2026-08-10T08:30:00Z',
    compliance_score: 94,
    documents: [
      { name: 'Barangay Clearance 2026', status: 'Verified' },
      { name: 'SEC / CDA Registration', status: 'Verified' },
      { name: 'Official Driver Roster (32 Units)', status: 'Verified' },
    ],
  },
  {
    application_id: 'APP-TODA-002',
    toda_name: 'Balite-Lalud Transport Federation',
    toda_acronym: 'BLTODA',
    barangay: 'Balite',
    terminal_location: 'Balite Public Terminal, Calapan City',
    registered_units: 45,
    active_drivers: 41,
    president_name: 'Eduardo M. Perez',
    contact_number: '+63 928 444 8902',
    status: 'Pending LGU Verification',
    submitted_at: '2026-08-12T14:15:00Z',
    compliance_score: 88,
    documents: [
      { name: 'Barangay Clearance 2026', status: 'Verified' },
      { name: 'SEC / CDA Registration', status: 'Pending Review' },
      { name: 'Driver Master List', status: 'Verified' },
    ],
  },
];

let accreditedTodas: TodaRecord[] = [

  {
    toda_id: 'toda-1',
    toda_name: 'Calapan Central TODA',
    toda_acronym: 'CCTODA',
    registration_number: 'CAL-TODA-2024-001',
    date_established: '2015-03-12',
    terminal_latitude: 13.4115,
    terminal_longitude: 121.1803,
    barangay: 'San Vicente Central',
    service_coverage_area: 'Poblacion, San Vicente, Sto. Niño',
    contact_number: '+63 917 888 1234',
    email: 'cctoda.calapan@gmail.com',
    president_name: 'Mario S. De Chavez',
    registered_tricycle_count: 24,
    active_driver_count: 24,
    certificate_number: 'LGU-MTOP-CERT-2024-001',
    certificate_expiry: '2027-12-31',
    account_status: 'Active',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    toda_id: 'toda-2',
    toda_name: 'Lumangbayan Integrated TODA',
    toda_acronym: 'LITODA',
    registration_number: 'CAL-TODA-2024-002',
    date_established: '2018-07-20',
    terminal_latitude: 13.4022,
    terminal_longitude: 121.1711,
    barangay: 'Lumangbayan',
    service_coverage_area: 'Lumangbayan, Tawiran, Guinobatan',
    contact_number: '+63 920 999 5678',
    email: 'litoda.calapan@gmail.com',
    president_name: 'Vicente B. Ramos',
    registered_tricycle_count: 18,
    active_driver_count: 16,
    certificate_number: 'LGU-MTOP-CERT-2024-002',
    certificate_expiry: '2027-12-31',
    account_status: 'Active',
    created_at: '2024-02-10T00:00:00Z',
  },
];

// GET /api/admin/todas/applications - List pending TODA accreditation applications
router.get('/applications', async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: todaApplications });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/admin/todas/accredited - List verified accredited TODAs
router.get('/accredited', async (_req: Request, res: Response) => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('toda').select('*').order('toda_name');
      if (!error && data && data.length > 0) {
        return res.json({ success: true, data });
      }
    }
    return res.json({ success: true, data: accreditedTodas });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/todas/:id/approve - Approve TODA accreditation
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const applicationIndex = todaApplications.findIndex((a) => a.application_id === id);
    if (applicationIndex === -1) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    const app = todaApplications[applicationIndex];
    const newAccredited: TodaRecord = {
      toda_id: `toda-${Date.now()}`,
      toda_name: app.toda_name,
      toda_acronym: app.toda_acronym,
      registration_number: `CAL-TODA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      barangay: app.barangay,
      service_coverage_area: `${app.barangay} Service Corridor`,
      contact_number: app.contact_number,
      president_name: app.president_name,
      registered_tricycle_count: app.registered_units,
      active_driver_count: app.active_drivers,
      certificate_number: `LGU-MTOP-CERT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      certificate_expiry: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      account_status: 'Active',
      created_at: new Date().toISOString(),
    };

    todaApplications.splice(applicationIndex, 1);
    accreditedTodas.push(newAccredited);

    return res.json({
      success: true,
      message: `TODA ${app.toda_name} (${app.toda_acronym}) successfully accredited!`,
      data: newAccredited,
      remarks,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/admin/todas/:id/decline - Decline or reject TODA application
router.post('/:id/decline', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const application = todaApplications.find((a) => a.application_id === id);
    if (!application) {
      return res.status(404).json({ success: false, error: 'Application not found' });
    }

    application.status = 'Declined';
    return res.json({
      success: true,
      message: `Application ${id} has been declined.`,
      data: { id, reason },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
