import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// In-Memory Seed State for TODA Portal (Calapan Central TODA - CCTODA)
let todaProfile = {
  id: 'toda-1',
  name: 'Calapan Central TODA',
  acronym: 'CCTODA',
  registrationNumber: 'TODA-CAL-2024-001',
  dateEstablished: 'March 15, 1998',
  terminalLocation: 'JP Rizal St. Central Terminal, Barangay San Vicente, Calapan City',
  pendingTerminalLocation: null as string | null,
  barangay: 'San Vicente / Poblacion',
  serviceCoverageArea: 'JP Rizal St., San Vicente, Lumangbayan, Tawiran, Poblacion Commercial Core',
  contactNumber: '+63 917 888 1234',
  email: 'admin@calapancentral-toda.org',
  officers: {
    president: 'Danilo "Ka Danny" Morales',
    vicePresident: 'Rogelio "Roger" Ramos',
    secretary: 'Elena "Nena" Gonzaga',
    treasurer: 'Vicente "Enteng" Sotto',
  },
  accreditationStatus: 'Active',
  accreditationExpiry: 'December 31, 2026',
  permitNumber: 'CAL-TODA-2024-001',
  registeredUnitsCount: 24,
  activeUnitsCount: 18,
  misteepComplaintsCount: 1, // Supervisory review threshold is 3+ in 60 days
};

let driverApplicants = [
  {
    id: 'APP-DRV-001',
    name: 'Nestor "Boyet" Castro',
    phone: '+63 918 555 4101',
    licenseNo: 'N02-18-994821',
    vehiclePlate: '392-MV',
    chassisNo: 'CH-2024-8849',
    motorNo: 'MT-8841-KL',
    franchiseNo: 'CAL-2026-0412',
    submittedDate: 'May 10, 2026',
    daysPending: 2,
    isOverdue: false,
    onSubmittedRoster: true,
    photoVerified: true,
    rosterVerified: true,
    todaStageStatus: 'Submitted',
    notes: 'Complete papers submitted. Ready for final TODA board endorsement to LGU.',
  },
  {
    id: 'APP-DRV-002',
    name: 'Reynaldo "Rey" Dimatulac',
    phone: '+63 920 555 4102',
    licenseNo: 'N02-19-110293',
    vehiclePlate: '481-NX',
    chassisNo: 'CH-2025-0129',
    motorNo: 'MT-9921-PL',
    franchiseNo: 'CAL-2026-0413',
    submittedDate: 'May 11, 2026',
    daysPending: 1,
    isOverdue: false,
    onSubmittedRoster: false, // Rule 2.4 Mismatch Flag
    photoVerified: true,
    rosterVerified: false,
    todaStageStatus: 'Pending Screening',
    notes: 'Applicant not found on official Q1 2026 member roster. Verification required.',
  },
];

let memberDrivers = [
  {
    id: 'DRV-001',
    bodyNumber: '001',
    name: 'Danilo Ramos Santos',
    phone: '+63 917 123 4567',
    licenseNo: 'D02-14-089721',
    vehiclePlate: 'AA 1234',
    mtopNumber: 'MTOP-2024-001',
    mtopStatus: 'Valid',
    mtopExpiry: 'Oct 2026',
    assignedShift: 'Morning (6:00 AM - 2:00 PM)',
    standing: 'Good Standing',
    strikesCount: 0,
    onlineStatus: 'Online',
    totalTripsMonth: 142,
    monthlyEarnings: 18450.0,
    rating: 4.85,
    isSuspended: false,
  },
  {
    id: 'DRV-002',
    bodyNumber: '002',
    name: 'Jose Mari Hernandez',
    phone: '+63 918 234 5678',
    licenseNo: 'D02-15-098712',
    vehiclePlate: 'BB 5678',
    mtopNumber: 'MTOP-2024-002',
    mtopStatus: 'Valid',
    mtopExpiry: 'Nov 2026',
    assignedShift: 'Afternoon (2:00 PM - 10:00 PM)',
    standing: 'Good Standing',
    strikesCount: 1,
    onlineStatus: 'Online',
    totalTripsMonth: 128,
    monthlyEarnings: 16200.0,
    rating: 4.9,
    isSuspended: false,
  },
];

// ============================================================================
// 1. TODA PROFILE & OPERATIONS
// ============================================================================

// GET /api/toda/profile - Retrieve scoped association profile
router.get('/profile', async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: todaProfile });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/toda/operations - Live terminal queue and compliance metrics
router.get('/operations', async (_req: Request, res: Response) => {
  try {
    const queueData = {
      profile: todaProfile,
      totalRegisteredUnits: todaProfile.registeredUnitsCount,
      activeUnitsInQueue: todaProfile.activeUnitsCount,
      supervisoryComplaints: todaProfile.misteepComplaintsCount,
      supervisoryThresholdFlag: todaProfile.misteepComplaintsCount >= 3,
      terminalStatus: 'Operational',
      lastQueueRotation: new Date().toISOString(),
    };
    return res.json({ success: true, data: queueData });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/toda/terminal-relocation - Submit terminal relocation request
router.post('/terminal-relocation', async (req: Request, res: Response) => {
  try {
    const { proposedLocation, justification } = req.body;
    if (!proposedLocation) {
      return res.status(400).json({ success: false, error: 'Proposed location is required' });
    }

    todaProfile.pendingTerminalLocation = proposedLocation;
    return res.json({
      success: true,
      message: 'Terminal relocation request submitted for LGU Transport Board review.',
      data: { proposedLocation, justification, status: 'Pending LGU Re-approval' },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 2. DRIVER APPLICANTS (TODA SCREENING STAGE)
// ============================================================================

// GET /api/toda/applicants - List driver applicants in TODA review stage
router.get('/applicants', async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: driverApplicants });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/toda/applicants/:id/verify-step - Toggle photo or roster verification
router.post('/applicants/:id/verify-step', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { photoVerified, rosterVerified } = req.body;

    const applicant = driverApplicants.find((a) => a.id === id);
    if (!applicant) {
      return res.status(404).json({ success: false, error: 'Applicant not found' });
    }

    if (photoVerified !== undefined) applicant.photoVerified = photoVerified;
    if (rosterVerified !== undefined) applicant.rosterVerified = rosterVerified;

    return res.json({
      success: true,
      message: `Applicant ${applicant.name} verification checks updated.`,
      data: applicant,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/toda/applicants/:id/forward - Forward screened driver to LGU
router.post('/applicants/:id/forward', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const applicant = driverApplicants.find((a) => a.id === id);
    if (!applicant) {
      return res.status(404).json({ success: false, error: 'Applicant not found' });
    }

    if (!applicant.onSubmittedRoster && !applicant.rosterVerified) {
      return res.status(400).json({
        success: false,
        error: 'Rule 2.4 Violation: Driver must match official submitted roster before forwarding to LGU.',
      });
    }

    applicant.todaStageStatus = 'Forwarded to LGU';
    return res.json({
      success: true,
      message: `Driver application for ${applicant.name} endorsed and forwarded to City LGU.`,
      data: applicant,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// ============================================================================
// 3. MEMBER ROSTER & SUSPENSIONS
// ============================================================================

// GET /api/toda/drivers - Retrieve full member driver roster
router.get('/drivers', async (_req: Request, res: Response) => {
  try {
    return res.json({ success: true, data: memberDrivers });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/toda/drivers/:id/suspend - Apply TODA-level suspension
router.post('/drivers/:id/suspend', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, durationDays = 7 } = req.body;

    const driver = memberDrivers.find((d) => d.id === id);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    driver.isSuspended = true;
    driver.standing = 'Suspended (TODA Level)';
    return res.json({
      success: true,
      message: `Driver ${driver.name} placed under TODA-level suspension.`,
      data: { driver, reason, durationDays },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/toda/drivers/:id/reactivate - Reactivate suspended member
router.post('/drivers/:id/reactivate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const driver = memberDrivers.find((d) => d.id === id);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    driver.isSuspended = false;
    driver.standing = 'Good Standing';
    return res.json({
      success: true,
      message: `Driver ${driver.name} reactivated into active terminal rotation.`,
      data: driver,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
