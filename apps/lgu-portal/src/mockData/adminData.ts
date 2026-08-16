// Realistic sample records for Calapan City LGU Admin Portal aligned with SAKAY.docx specifications

export interface TodaApplicationRecord {
  id: string;
  name: string;
  representative: string;
  phone: string;
  email: string;
  barangay: string;
  submittedDate: string;
  memberCount: number;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Declined' | 'Resubmission Required';
  declineReason?: string;
  resubmissionReason?: string;
  barangayClearanceExpiry: string;
  clearanceStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  isOverdue5Days?: boolean;
  documents: {
    name: string;
    type: string;
    date: string;
    url: string;
  }[];
}

export interface AccreditedTodaRecord {
  id: string;
  name: string;
  representative: string;
  phone: string;
  email: string;
  barangay: string;
  registeredDrivers: number;
  status: 'Active' | 'Suspended' | 'Inactive';
  accreditationNo: string;
  accreditedDate: string;
  expiryDate: string;
  barangayClearanceExpiry: string;
  clearanceStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  confirmedIncidents: number;
  flaggedForReview: boolean;
  centerLat: number;
  centerLng: number;
  documents: {
    name: string;
    type: string;
    date: string;
  }[];
  driverRoster: {
    id: string;
    name: string;
    vehiclePlate: string;
    verificationStatus: 'Verified' | 'Pending' | 'Suspended';
    accountStatus: 'Active' | 'Inactive';
    onlineStatus: 'Online' | 'Offline';
  }[];
}

export interface StrikeItem {
  id: string;
  date: string;
  reason: string;
  strikesApplied: number;
  status: 'Active (Rolling 90d)' | 'Expired' | 'Waived on Appeal';
  issuedBy: string;
}

export interface DriverRecord {
  id: string;
  name: string;
  licenseNo: string;
  licenseExpiry: string;
  licenseStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  mtopNo: string;
  mtopExpiry: string;
  mtopStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  mtopOperatorName: string;
  todaName: string;
  todaId: string;
  vehiclePlate: string;
  franchiseNo: string;
  franchiseExpiry: string;
  todaVerificationStatus: 'Verified' | 'Pending';
  lguVerificationStatus: 'Verified' | 'Pending' | 'Suspended';
  verificationStatus: 'Verified' | 'Pending' | 'Suspended';
  accountStatus: 'Active' | 'Inactive';
  onlineStatus: 'Online' | 'Offline';
  rating: number;
  ratingCount: number;
  phone: string;
  barangay: string;
  isOverdue5Days?: boolean;
  strikesCount: number;
  strikeHistory: StrikeItem[];
  documents: {
    name: string;
    type: string;
    status: 'Verified' | 'Pending';
  }[];
}

export interface PassengerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  verificationStatus: 'Verified' | 'Unverified';
  accountStatus: 'Active' | 'Suspended';
  suspensionReason?: string;
  activeSession: boolean;
  totalBookings: number;
  registeredDate: string;
  rating: number;
  ratingCount: number;
  strikesCount: number;
  strikeHistory: StrikeItem[];
  recentFeedback?: {
    rating: number;
    category: string;
    comment: string;
    date: string;
    tripId: string;
  }[];
}

export interface ActiveTripRecord {
  id: string;
  bookingId: string;
  driverName: string;
  driverPhone: string;
  todaName: string;
  todaId: string;
  vehiclePlate: string;
  passengerName: string;
  passengerPhone: string;
  passengerCount: number;
  tripType: 'Solo Trip' | 'Shared Trip';
  status: 'Heading to Passenger' | 'Trip Ongoing';
  eta: string;
  currentArea: string;
  pickupArea: string;
  destinationArea: string;
  startLat: number;
  startLng: number;
  driverLat: number;
  driverLng: number;
  destLat: number;
  destLng: number;
  startTime: string;
  bookingTime: string;
  estimatedFare: number;
  sharedTripDetails?: {
    matchedPassengers: number;
    cutoffPassed: boolean;
    sharedSavings: string;
  };
}

export interface OnlineDriverRecord {
  id: string;
  name: string;
  todaName: string;
  todaId: string;
  vehiclePlate: string;
  verificationStatus: 'Verified' | 'Pending';
  availabilityStatus: 'Available' | 'Assigned' | 'Suspended';
  dpsScore: number;
  idleDuration: string;
  currentArea: string;
  lat: number;
  lng: number;
}

export interface IncidentReportRecord {
  id: string;
  bookingId: string;
  tripId: string;
  category:
    | 'Overcharging Attempt'
    | 'Unsafe Driving'
    | 'Rude Behavior'
    | 'Harassment'
    | 'Vehicle Issue'
    | 'Route Deviation'
    | 'Reckless Driving'
    | 'Passenger Misconduct'
    | 'Lost Item'
    | 'Others';
  reportedBy: 'Passenger' | 'Driver';
  reporterName: string;
  driverName: string;
  todaName: string;
  vehiclePlate: string;
  passengerName: string;
  submittedDate: string;
  submittedTime: string;
  status: 'Pending Review' | 'Under Investigation' | 'Resolved' | 'Dismissed';
  description: string;
  evidenceFiles: {
    name: string;
    type: 'image' | 'video' | 'pdf';
    url: string;
  }[];
  findings?: string;
  relatedIncidentsCount: number;
  statusHistory: {
    step: string;
    timestamp: string;
    actor: string;
  }[];
}

export interface LguAdminRecord {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  role: 'Super Administrator' | 'Verifier' | 'Incident Officer' | 'Analytics Viewer' | 'Fare Administrator';
  accountStatus: 'Active' | 'Pending Password Reset' | 'Deactivated';
  lastLogin?: string;
  createdAt: string;
}

export interface FareMatrixRecord {
  id: string;
  fare_matrix_id: string;
  base_fare: number;
  base_distance_km: number;
  succeeding_rate: number;
  effective_timestamp: string;
  effective_date: string;
  is_active: boolean;
  configured_by_lgu_admin: string;
  ordinance_reference: string;
  notes?: string;
  created_at: string;
}

export interface AnnouncementRecord {
  id: string;
  announcement_id: string;
  toda_id?: string | null;
  toda_name?: string | null;
  title: string;
  message: string;
  target_role: 'All' | 'Passenger' | 'Driver' | 'TODA Administrator';
  is_published: boolean;
  publish_timing: 'Immediate' | 'Scheduled';
  scheduled_date?: string;
  created_by_lgu_admin: string;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  log_id: string;
  lgu_admin_id: string;
  actor_name: string;
  actor_role: string;
  action_type: string;
  target_id: string;
  target_name: string;
  details: string;
  performed_at: string;
  category: 'Authentication' | 'Verification' | 'User Oversight' | 'Fare Matrix' | 'Announcement' | 'System';
}

// System Dashboard Surface-Level KPIs
export const SYSTEM_DASHBOARD_KPIS = {
  passengers: {
    total: 1420,
    active: 1380,
    inactive: 40,
  },
  drivers: {
    total: 384,
    active: 340,
    inactive: 44,
  },
  todas: {
    total: 14,
    active: 12,
    suspended: 2,
  },
  trips: {
    completed: 12480,
    ongoing: 42,
    cancelled: 180,
  },
  verifications: {
    pendingTodas: 2,
    pendingDrivers: 8,
    overdue5Days: 3,
  },
  incidents: {
    open: 4,
    resolved: 58,
  },
};

// 1. TODA Applications Mock Data
export const MOCK_TODA_APPLICATIONS: TodaApplicationRecord[] = [
  {
    id: 'APP-2026-001',
    name: 'Calapan Central TODA',
    representative: 'Capistrano "Cap" Vance',
    phone: '+63 917 554 8892',
    email: 'calapan.central.toda@gmail.com',
    barangay: 'Poblacion 1, Calapan City',
    submittedDate: 'May 10, 2026',
    memberCount: 84,
    status: 'Pending',
    barangayClearanceExpiry: 'Jun 15, 2026',
    clearanceStatus: 'Expiring Soon',
    isOverdue5Days: true,
    documents: [
      { name: 'Barangay Clearance for Accreditation', type: 'PDF Document', date: 'May 09, 2026', url: '#' },
      { name: 'List of Accredited Drivers & Tricycles', type: 'Spreadsheet', date: 'May 10, 2026', url: '#' },
      { name: 'SEC Registration Certificate', type: 'PDF Document', date: 'May 08, 2026', url: '#' },
      { name: 'Proposed Route & Terminal Plan', type: 'PDF Map Plan', date: 'May 10, 2026', url: '#' },
    ],
  },
  {
    id: 'APP-2026-002',
    name: 'Ibaba TODA Express',
    representative: 'Fernando "Nanding" Ramos',
    phone: '+63 920 882 1104',
    email: 'ibaba.express.toda@yahoo.com',
    barangay: 'Ibaba, Calapan City',
    submittedDate: 'May 08, 2026',
    memberCount: 42,
    status: 'Under Review',
    barangayClearanceExpiry: 'Dec 31, 2026',
    clearanceStatus: 'Valid',
    documents: [
      { name: 'Barangay Clearance for Accreditation', type: 'PDF Document', date: 'May 07, 2026', url: '#' },
      { name: 'List of Accredited Drivers', type: 'Spreadsheet', date: 'May 08, 2026', url: '#' },
      { name: 'TODA Constitution & By-Laws', type: 'PDF Document', date: 'May 06, 2026', url: '#' },
    ],
  },
  {
    id: 'APP-2026-003',
    name: 'Balingayan Tricycle Operators Assoc.',
    representative: 'Danilo "Danny" Reyes',
    phone: '+63 919 443 2291',
    email: 'btoa.calapan@gmail.com',
    barangay: 'Balingayan, Calapan City',
    submittedDate: 'May 05, 2026',
    memberCount: 65,
    status: 'Approved',
    barangayClearanceExpiry: 'Nov 20, 2026',
    clearanceStatus: 'Valid',
    documents: [
      { name: 'Barangay Clearance for Accreditation', type: 'PDF Document', date: 'May 04, 2026', url: '#' },
      { name: 'List of Accredited Drivers', type: 'Spreadsheet', date: 'May 05, 2026', url: '#' },
    ],
  },
  {
    id: 'APP-2026-004',
    name: 'Pachoca Seaside TODA',
    representative: 'Rodrigo "Digoy" Morales',
    phone: '+63 918 332 9901',
    email: 'pachoca.toda@gmail.com',
    barangay: 'Pachoca, Calapan City',
    submittedDate: 'May 02, 2026',
    memberCount: 38,
    status: 'Declined',
    declineReason: 'Incomplete driver barangay clearances and overlapping route proposal with Ibaba TODA.',
    barangayClearanceExpiry: 'May 01, 2026',
    clearanceStatus: 'Expired',
    documents: [
      { name: 'Preliminary Driver Roster', type: 'PDF Document', date: 'May 01, 2026', url: '#' },
    ],
  },
];

// 2. Accredited TODAs Mock Data
export const MOCK_ACCREDITED_TODAS: AccreditedTodaRecord[] = [
  {
    id: 'TODA-ACC-01',
    name: 'Calapan Central TODA',
    representative: 'Capistrano Vance',
    phone: '+63 917 554 8892',
    email: 'central.toda@calapan.gov.ph',
    barangay: 'Poblacion 1–3',
    registeredDrivers: 124,
    status: 'Active',
    accreditationNo: 'LGU-TODA-2024-001',
    accreditedDate: 'Jan 15, 2024',
    expiryDate: 'Jan 15, 2027',
    barangayClearanceExpiry: 'Jun 15, 2026',
    clearanceStatus: 'Expiring Soon',
    confirmedIncidents: 3,
    flaggedForReview: true,
    centerLat: 13.4117,
    centerLng: 121.1803,
    documents: [
      { name: 'Official Accreditation Certificate', type: 'PDF Document', date: 'Jan 15, 2024' },
      { name: 'Barangay Clearance for Terminal Operation', type: 'PDF Document', date: 'May 09, 2026' },
      { name: 'Verified Driver Roster', type: 'CSV Document', date: 'May 01, 2026' },
    ],
    driverRoster: [
      { id: 'DRV-1001', name: 'Vicente "Enteng" Sotto', vehiclePlate: '482-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Online' },
      { id: 'DRV-1002', name: 'Rodrigo "Digoy" Perez', vehiclePlate: '915-MV', verificationStatus: 'Pending', accountStatus: 'Active', onlineStatus: 'Online' },
      { id: 'DRV-1004', name: 'Aurelio "Auring" Bautista', vehiclePlate: '773-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Offline' },
      { id: 'DRV-1005', name: 'Catalino "Lino" Mendoza', vehiclePlate: '304-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Online' },
      { id: 'DRV-1006', name: 'Severino "Seve" Aquino', vehiclePlate: '118-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Offline' },
    ],
  },
  {
    id: 'TODA-ACC-02',
    name: 'Ibaba TODA Express',
    representative: 'Fernando Ramos',
    phone: '+63 920 882 1104',
    email: 'ibaba.toda@calapan.gov.ph',
    barangay: 'Ibaba Service Zone',
    registeredDrivers: 68,
    status: 'Active',
    accreditationNo: 'LGU-TODA-2024-002',
    accreditedDate: 'Feb 01, 2024',
    expiryDate: 'Feb 01, 2027',
    barangayClearanceExpiry: 'Dec 31, 2026',
    clearanceStatus: 'Valid',
    confirmedIncidents: 0,
    flaggedForReview: false,
    centerLat: 13.4150,
    centerLng: 121.1850,
    documents: [
      { name: 'Official Accreditation Certificate', type: 'PDF Document', date: 'Feb 01, 2024' },
    ],
    driverRoster: [
      { id: 'DRV-2001', name: 'Danilo Reyes', vehiclePlate: '221-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Online' },
    ],
  },
  {
    id: 'TODA-ACC-03',
    name: 'Suqui Beach TODA',
    representative: 'Eduardo Ramos',
    phone: '+63 918 998 1122',
    email: 'suqui.toda@calapan.gov.ph',
    barangay: 'Suqui Coastal Zone',
    registeredDrivers: 45,
    status: 'Suspended',
    accreditationNo: 'LGU-TODA-2024-003',
    accreditedDate: 'Mar 10, 2024',
    expiryDate: 'Mar 10, 2027',
    barangayClearanceExpiry: 'May 01, 2026',
    clearanceStatus: 'Expired',
    confirmedIncidents: 4,
    flaggedForReview: true,
    centerLat: 13.4220,
    centerLng: 121.1920,
    documents: [
      { name: 'Expired Accreditation Certificate', type: 'PDF Document', date: 'Mar 10, 2024' },
    ],
    driverRoster: [
      { id: 'DRV-1003', name: 'Eduardo "Ed" Ramos', vehiclePlate: '109-MV', verificationStatus: 'Suspended', accountStatus: 'Inactive', onlineStatus: 'Offline' },
    ],
  },
];

// 3. Driver Management Mock Data
export const MOCK_DRIVERS: DriverRecord[] = [
  {
    id: 'DRV-1001',
    name: 'Vicente "Enteng" Sotto',
    licenseNo: 'N01-18-091244',
    licenseExpiry: 'Aug 14, 2028',
    licenseStatus: 'Valid',
    mtopNo: 'MTOP-2025-0891',
    mtopExpiry: 'Dec 31, 2026',
    mtopStatus: 'Valid',
    mtopOperatorName: 'Vicente Sotto (Owner-Operator)',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '482-MV',
    franchiseNo: 'LGU-FR-2025-0891',
    franchiseExpiry: 'Dec 31, 2026',
    todaVerificationStatus: 'Verified',
    lguVerificationStatus: 'Verified',
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    onlineStatus: 'Online',
    rating: 4.8,
    ratingCount: 142,
    phone: '+63 917 112 3344',
    barangay: 'Poblacion 1, Calapan City',
    strikesCount: 1,
    strikeHistory: [
      {
        id: 'STRK-D-101',
        date: 'Apr 18, 2026',
        reason: 'Stall / Failure to proceed to pickup point (3 mins idle)',
        strikesApplied: 1,
        status: 'Active (Rolling 90d)',
        issuedBy: 'System Auto-Detector',
      },
    ],
    documents: [
      { name: "LTO Driver's License", type: 'Image', status: 'Verified' },
      { name: 'MTOP Permit Certificate', type: 'PDF', status: 'Verified' },
    ],
  },
  {
    id: 'DRV-1002',
    name: 'Rodrigo "Digoy" Perez',
    licenseNo: 'N04-20-112984',
    licenseExpiry: 'Oct 22, 2026',
    licenseStatus: 'Valid',
    mtopNo: 'MTOP-2025-0442',
    mtopExpiry: 'Jun 30, 2026',
    mtopStatus: 'Expiring Soon',
    mtopOperatorName: 'Anastacio Perez (Registered Operator)',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '915-MV',
    franchiseNo: 'LGU-FR-2025-0442',
    franchiseExpiry: 'Jun 30, 2026',
    todaVerificationStatus: 'Verified',
    lguVerificationStatus: 'Pending',
    verificationStatus: 'Pending',
    accountStatus: 'Active',
    onlineStatus: 'Online',
    rating: 4.6,
    ratingCount: 84,
    phone: '+63 920 334 5566',
    barangay: 'Lumangbayan, Calapan City',
    isOverdue5Days: true,
    strikesCount: 3,
    strikeHistory: [
      {
        id: 'STRK-D-201',
        date: 'May 02, 2026',
        reason: 'Queue Conflict Violation (Accepted app dispatch while in terminal FIFO queue)',
        strikesApplied: 1,
        status: 'Active (Rolling 90d)',
        issuedBy: 'TODA Spot Monitor Report',
      },
      {
        id: 'STRK-D-202',
        date: 'May 12, 2026',
        reason: 'Overcharging Attempt / Demand for off-platform cash deposit',
        strikesApplied: 2,
        status: 'Active (Rolling 90d)',
        issuedBy: 'LGU Incident Review',
      },
    ],
    documents: [
      { name: "LTO Driver's License", type: 'Image', status: 'Verified' },
      { name: 'MTOP Permit', type: 'PDF', status: 'Pending' },
    ],
  },
];

// 4. Passenger Management Mock Data
export const MOCK_PASSENGERS: PassengerRecord[] = [
  {
    id: 'PSG-5001',
    name: 'Maria Clara Alonso',
    phone: '+63 917 889 0011',
    email: 'maria.alonso@gmail.com',
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    activeSession: true,
    totalBookings: 48,
    registeredDate: 'Jan 10, 2026',
    rating: 4.9,
    ratingCount: 48,
    strikesCount: 0,
    strikeHistory: [],
    recentFeedback: [
      {
        rating: 5,
        category: 'Driver Courtesy',
        comment: 'Driver arrived quickly at Calapan Market and was very respectful.',
        date: 'May 11, 2026',
        tripId: 'TRIP-8841',
      },
    ],
  },
  {
    id: 'PSG-5002',
    name: 'Joshua "Josh" Dizon',
    phone: '+63 920 445 7788',
    email: 'joshua.dizon@yahoo.com',
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    activeSession: false,
    totalBookings: 22,
    registeredDate: 'Feb 18, 2026',
    rating: 4.7,
    ratingCount: 22,
    strikesCount: 1,
    strikeHistory: [
      {
        id: 'STRK-P-101',
        date: 'Apr 22, 2026',
        reason: 'Late Cancellation (>1 min after driver acceptance)',
        strikesApplied: 1,
        status: 'Active (Rolling 90d)',
        issuedBy: 'System Dispatch Engine',
      },
    ],
  },
];

// 5. Active Trips Mock Data (/live-trips)
export const MOCK_ACTIVE_TRIPS: ActiveTripRecord[] = [
  {
    id: 'TRP-2026-00421',
    bookingId: 'BKG-9901',
    driverName: 'Vicente "Enteng" Sotto',
    driverPhone: '+63 917 112 3344',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '482-MV',
    passengerName: 'Maria Clara Alonso',
    passengerPhone: '+63 917 889 0011',
    passengerCount: 2,
    tripType: 'Shared Trip',
    status: 'Trip Ongoing',
    eta: '6 mins',
    currentArea: 'JP Rizal St., Poblacion 1',
    pickupArea: 'Calapan Main Public Market',
    destinationArea: 'Divine Word College Calapan',
    startLat: 13.4117,
    startLng: 121.1803,
    driverLat: 13.4140,
    driverLng: 121.1825,
    destLat: 13.4190,
    destLng: 121.1860,
    startTime: 'May 16, 2026 • 10:42 AM',
    bookingTime: 'May 16, 2026 • 10:38 AM',
    estimatedFare: 24,
    sharedTripDetails: {
      matchedPassengers: 2,
      cutoffPassed: true,
      sharedSavings: '₱18 saved via 2-rider match',
    },
  },
  {
    id: 'TRP-2026-00422',
    bookingId: 'BKG-9902',
    driverName: 'Rodrigo "Digoy" Perez',
    driverPhone: '+63 920 334 5566',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '915-MV',
    passengerName: 'Joshua "Josh" Dizon',
    passengerPhone: '+63 920 445 7788',
    passengerCount: 1,
    tripType: 'Solo Trip',
    status: 'Heading to Passenger',
    eta: '3 mins',
    currentArea: 'Lumangbayan National Highway',
    pickupArea: 'Lumangbayan Elementary School',
    destinationArea: 'Calapan City Plaza',
    startLat: 13.4080,
    startLng: 121.1750,
    driverLat: 13.4095,
    driverLng: 121.1765,
    destLat: 13.4125,
    destLng: 121.1810,
    startTime: 'May 16, 2026 • 10:45 AM',
    bookingTime: 'May 16, 2026 • 10:44 AM',
    estimatedFare: 60,
  },
  {
    id: 'TRP-2026-00423',
    bookingId: 'BKG-9903',
    driverName: 'Danilo Reyes',
    driverPhone: '+63 919 443 2291',
    todaName: 'Ibaba TODA Express',
    todaId: 'TODA-ACC-02',
    vehiclePlate: '221-MV',
    passengerName: 'Elena "Nena" Gonzaga',
    passengerPhone: '+63 919 112 4455',
    passengerCount: 1,
    tripType: 'Solo Trip',
    status: 'Trip Ongoing',
    eta: '8 mins',
    currentArea: 'Ibaba Coastal Road',
    pickupArea: 'Ibaba TODA Terminal',
    destinationArea: 'Suqui Beach Resort',
    startLat: 13.4150,
    startLng: 121.1850,
    driverLat: 13.4180,
    driverLng: 121.1890,
    destLat: 13.4220,
    destLng: 121.1920,
    startTime: 'May 16, 2026 • 10:40 AM',
    bookingTime: 'May 16, 2026 • 10:35 AM',
    estimatedFare: 68,
  },
  {
    id: 'TRP-2026-00424',
    bookingId: 'BKG-9904',
    driverName: 'Catalino "Lino" Mendoza',
    driverPhone: '+63 917 882 3311',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '304-MV',
    passengerName: 'Antonio "Tony" Luna',
    passengerPhone: '+63 928 331 4422',
    passengerCount: 3,
    tripType: 'Shared Trip',
    status: 'Heading to Passenger',
    eta: '4 mins',
    currentArea: 'San Vicente North',
    pickupArea: 'San Vicente Church',
    destinationArea: 'Oriental Mindoro Provincial Hospital',
    startLat: 13.4130,
    startLng: 121.1780,
    driverLat: 13.4145,
    driverLng: 121.1795,
    destLat: 13.4170,
    destLng: 121.1820,
    startTime: 'May 16, 2026 • 10:46 AM',
    bookingTime: 'May 16, 2026 • 10:45 AM',
    estimatedFare: 30,
    sharedTripDetails: {
      matchedPassengers: 3,
      cutoffPassed: false,
      sharedSavings: '₱24 saved via 3-rider match',
    },
  },
];

// 6. Online Drivers Mock Data (/live-trips)
export const MOCK_ONLINE_DRIVERS: OnlineDriverRecord[] = [
  {
    id: 'DRV-1001',
    name: 'Vicente "Enteng" Sotto',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '482-MV',
    verificationStatus: 'Verified',
    availabilityStatus: 'Assigned',
    dpsScore: 98,
    idleDuration: '0 mins',
    currentArea: 'JP Rizal St., Poblacion 1',
    lat: 13.4140,
    lng: 121.1825,
  },
  {
    id: 'DRV-1002',
    name: 'Rodrigo "Digoy" Perez',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '915-MV',
    verificationStatus: 'Pending',
    availabilityStatus: 'Assigned',
    dpsScore: 89,
    idleDuration: '2 mins',
    currentArea: 'Lumangbayan National Highway',
    lat: 13.4095,
    lng: 121.1765,
  },
  {
    id: 'DRV-1004',
    name: 'Aurelio "Auring" Bautista',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '773-MV',
    verificationStatus: 'Verified',
    availabilityStatus: 'Available',
    dpsScore: 100,
    idleDuration: '14 mins',
    currentArea: 'Calapan Main Public Market',
    lat: 13.4117,
    lng: 121.1803,
  },
  {
    id: 'DRV-2001',
    name: 'Danilo Reyes',
    todaName: 'Ibaba TODA Express',
    todaId: 'TODA-ACC-02',
    vehiclePlate: '221-MV',
    verificationStatus: 'Verified',
    availabilityStatus: 'Assigned',
    dpsScore: 94,
    idleDuration: '0 mins',
    currentArea: 'Ibaba Coastal Road',
    lat: 13.4180,
    lng: 121.1890,
  },
  {
    id: 'DRV-1005',
    name: 'Catalino "Lino" Mendoza',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '304-MV',
    verificationStatus: 'Verified',
    availabilityStatus: 'Assigned',
    dpsScore: 96,
    idleDuration: '4 mins',
    currentArea: 'San Vicente North',
    lat: 13.4145,
    lng: 121.1795,
  },
  {
    id: 'DRV-1007',
    name: 'Gregorio "Goyong" del Pilar',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '552-MV',
    verificationStatus: 'Verified',
    availabilityStatus: 'Available',
    dpsScore: 92,
    idleDuration: '28 mins',
    currentArea: 'Tawiran Terminal Area',
    lat: 13.4050,
    lng: 121.1720,
  },
];

// 7. Incident Reports Mock Data (/incident-reports)
export const MOCK_INCIDENT_REPORTS_DETAILED: IncidentReportRecord[] = [
  {
    id: 'INC-2026-0042',
    bookingId: 'BKG-8812',
    tripId: 'TRP-2026-00388',
    category: 'Overcharging Attempt',
    reportedBy: 'Passenger',
    reporterName: 'Maria Clara Alonso',
    driverName: 'Rodrigo "Digoy" Perez',
    todaName: 'Calapan Central TODA',
    vehiclePlate: '915-MV',
    passengerName: 'Maria Clara Alonso',
    submittedDate: 'May 12, 2026',
    submittedTime: '10:24 AM',
    status: 'Pending Review',
    description: 'The driver requested a cash fare of ₱150 for a trip from Poblacion to Pachoca, which exceeds the SAKAY system estimated fare of ₱42 computed under City Ordinance No. 110, Series of 2022.',
    evidenceFiles: [
      { name: 'Fare Discrepancy Screenshot.png', type: 'image', url: '#' },
      { name: 'Cash Receipt Demand.pdf', type: 'pdf', url: '#' },
    ],
    relatedIncidentsCount: 3,
    statusHistory: [
      { step: 'Report Submitted by Passenger', timestamp: 'May 12, 2026 • 10:24 AM', actor: 'Maria Clara Alonso' },
      { step: 'Routed to LGU Administrative Triage Queue', timestamp: 'May 12, 2026 • 10:25 AM', actor: 'System Automated Workflow' },
    ],
  },
  {
    id: 'INC-2026-0041',
    bookingId: 'BKG-8790',
    tripId: 'TRP-2026-00375',
    category: 'Unsafe Driving',
    reportedBy: 'Passenger',
    reporterName: 'Joshua "Josh" Dizon',
    driverName: 'Eduardo "Ed" Ramos',
    todaName: 'Suqui Beach TODA',
    vehiclePlate: '109-MV',
    passengerName: 'Joshua "Josh" Dizon',
    submittedDate: 'May 11, 2026',
    submittedTime: '03:15 PM',
    status: 'Under Investigation',
    description: 'Driver was swerving recklessly across the Tawiran highway lanes and carrying excessive luggage on the sidecar roof.',
    evidenceFiles: [
      { name: 'Dashboard Camera Video Clip.mp4', type: 'video', url: '#' },
    ],
    findings: 'Initial TODA review confirms vehicle was operating with overloaded roof rack. Pending final officer recommendation.',
    relatedIncidentsCount: 4,
    statusHistory: [
      { step: 'Report Submitted by Passenger', timestamp: 'May 11, 2026 • 03:15 PM', actor: 'Joshua "Josh" Dizon' },
      { step: 'Assigned Under Investigation', timestamp: 'May 11, 2026 • 04:00 PM', actor: 'LGU Officer Santos' },
    ],
  },
  {
    id: 'INC-2026-0040',
    bookingId: 'BKG-8640',
    tripId: 'TRP-2026-00340',
    category: 'Route Deviation',
    reportedBy: 'Passenger',
    reporterName: 'Elena "Nena" Gonzaga',
    driverName: 'Vicente "Enteng" Sotto',
    todaName: 'Calapan Central TODA',
    vehiclePlate: '482-MV',
    passengerName: 'Elena "Nena" Gonzaga',
    submittedDate: 'May 09, 2026',
    submittedTime: '09:45 AM',
    status: 'Resolved',
    description: 'Driver detoured through San Vicente inner roads instead of taking the primary JP Rizal arterial route.',
    evidenceFiles: [],
    findings: 'GPS telemetry review indicates driver detoured due to an official DPWH road repair on JP Rizal St. Case resolved with zero penalty.',
    relatedIncidentsCount: 1,
    statusHistory: [
      { step: 'Report Submitted by Passenger', timestamp: 'May 09, 2026 • 09:45 AM', actor: 'Elena "Nena" Gonzaga' },
      { step: 'Under Investigation', timestamp: 'May 09, 2026 • 11:00 AM', actor: 'LGU Officer Santos' },
      { step: 'Case Resolved — No Penalty (Road Repair Verified)', timestamp: 'May 09, 2026 • 02:30 PM', actor: 'LGU Admin Vance' },
    ],
  },
  {
    id: 'INC-2026-0039',
    bookingId: 'BKG-8511',
    tripId: 'TRP-2026-00310',
    category: 'Passenger Misconduct',
    reportedBy: 'Driver',
    reporterName: 'Aurelio "Auring" Bautista',
    driverName: 'Aurelio "Auring" Bautista',
    todaName: 'Calapan Central TODA',
    vehiclePlate: '773-MV',
    passengerName: 'Unverified Passenger',
    submittedDate: 'May 08, 2026',
    submittedTime: '08:10 PM',
    status: 'Dismissed',
    description: 'Passenger refused to board after driver arrived within 2 minutes of booking acceptance.',
    evidenceFiles: [],
    findings: 'Unfounded claim; passenger cancelled within the 1-minute grace period (Rule 12.1). Report dismissed.',
    relatedIncidentsCount: 0,
    statusHistory: [
      { step: 'Report Submitted by Driver', timestamp: 'May 08, 2026 • 08:10 PM', actor: 'Aurelio Bautista' },
      { step: 'Dismissed (Grace Period Compliant)', timestamp: 'May 08, 2026 • 08:30 PM', actor: 'LGU Admin Vance' },
    ],
  },
];

// Current Logged-In Admin Mock Constant
export const CURRENT_ADMIN: {
  id: string;
  name: string;
  email: string;
  role: 'Super Administrator' | 'Verifier' | 'Incident Officer' | 'Analytics Viewer' | 'Fare Administrator';
} = {
  id: 'LGU-ADM-001',
  name: 'Hon. Juanito De Chavez',
  email: 'j.dechavez@calapan.gov.ph',
  role: 'Super Administrator',
};

// 7. LGU Administrator Accounts Mock Data
export const MOCK_LGU_ADMINS: LguAdminRecord[] = [
  {
    id: 'LGU-ADM-001',
    name: 'Hon. Juanito De Chavez',
    email: 'j.dechavez@calapan.gov.ph',
    contactNumber: '+63 917 555 0101',
    role: 'Super Administrator',
    accountStatus: 'Active',
    lastLogin: 'May 12, 2026 • 09:15 AM',
    createdAt: 'Jan 05, 2026',
  },
  {
    id: 'LGU-ADM-002',
    name: 'Maria Elena Santos',
    email: 'm.santos@calapan.gov.ph',
    contactNumber: '+63 918 555 0102',
    role: 'Verifier',
    accountStatus: 'Active',
    lastLogin: 'May 12, 2026 • 08:40 AM',
    createdAt: 'Jan 10, 2026',
  },
  {
    id: 'LGU-ADM-003',
    name: 'Capt. Rodrigo Alcantara',
    email: 'r.alcantara@calapan.gov.ph',
    contactNumber: '+63 919 555 0103',
    role: 'Incident Officer',
    accountStatus: 'Active',
    lastLogin: 'May 11, 2026 • 04:30 PM',
    createdAt: 'Jan 15, 2026',
  },
  {
    id: 'LGU-ADM-004',
    name: 'Engr. Liza Bautista',
    email: 'l.bautista@calapan.gov.ph',
    contactNumber: '+63 920 555 0104',
    role: 'Fare Administrator',
    accountStatus: 'Active',
    lastLogin: 'May 10, 2026 • 11:20 AM',
    createdAt: 'Feb 01, 2026',
  },
  {
    id: 'LGU-ADM-005',
    name: 'Dominic Castillo',
    email: 'd.castillo@calapan.gov.ph',
    contactNumber: '+63 921 555 0105',
    role: 'Analytics Viewer',
    accountStatus: 'Active',
    lastLogin: 'May 09, 2026 • 02:15 PM',
    createdAt: 'Feb 15, 2026',
  },
  {
    id: 'LGU-ADM-006',
    name: 'Grace Villanueva',
    email: 'g.villanueva@calapan.gov.ph',
    contactNumber: '+63 922 555 0106',
    role: 'Verifier',
    accountStatus: 'Pending Password Reset',
    lastLogin: 'Never (First Login Required)',
    createdAt: 'May 10, 2026',
  },
  {
    id: 'LGU-ADM-007',
    name: 'Arnold Hernandez',
    email: 'a.hernandez@calapan.gov.ph',
    contactNumber: '+63 923 555 0107',
    role: 'Incident Officer',
    accountStatus: 'Deactivated',
    lastLogin: 'Apr 20, 2026 • 05:00 PM',
    createdAt: 'Jan 20, 2026',
  },
];

// 8. Fare Matrix Version History Mock Data (City Ordinance No. 118, Series of 2022)
export const MOCK_FARE_MATRIX_HISTORY: FareMatrixRecord[] = [
  {
    id: 'FARE-2026-V3',
    fare_matrix_id: 'FM-003',
    base_fare: 15.0,
    base_distance_km: 2.0,
    succeeding_rate: 1.0,
    effective_timestamp: '2026-01-01T00:00:00.000Z',
    effective_date: 'Jan 01, 2026',
    is_active: true,
    configured_by_lgu_admin: 'Engr. Liza Bautista (Fare Administrator)',
    ordinance_reference: 'City Ordinance No. 118, Series of 2022 (Amendment 2026)',
    notes: 'Approved standard minimum base rate reflecting current fuel and inflation indices.',
    created_at: 'Dec 20, 2025',
  },
  {
    id: 'FARE-2025-V2',
    fare_matrix_id: 'FM-002',
    base_fare: 12.0,
    base_distance_km: 2.0,
    succeeding_rate: 1.0,
    effective_timestamp: '2025-01-01T00:00:00.000Z',
    effective_date: 'Jan 01, 2025 – Dec 31, 2025',
    is_active: false,
    configured_by_lgu_admin: 'Engr. Liza Bautista (Fare Administrator)',
    ordinance_reference: 'City Ordinance No. 84, Series of 2024',
    notes: 'Superseded by Ordinance 118-2026 rate revision.',
    created_at: 'Dec 15, 2024',
  },
  {
    id: 'FARE-2024-V1',
    fare_matrix_id: 'FM-001',
    base_fare: 10.0,
    base_distance_km: 2.0,
    succeeding_rate: 0.75,
    effective_timestamp: '2024-01-01T00:00:00.000Z',
    effective_date: 'Jan 01, 2024 – Dec 31, 2024',
    is_active: false,
    configured_by_lgu_admin: 'Hon. Juanito De Chavez (Super Administrator)',
    ordinance_reference: 'City Ordinance No. 52, Series of 2023',
    notes: 'Initial SAKAY digital metering pilot baseline.',
    created_at: 'Dec 10, 2023',
  },
];

// 9. Municipal Announcements Mock Data
export const MOCK_ANNOUNCEMENTS: AnnouncementRecord[] = [
  {
    id: 'ANN-2026-001',
    announcement_id: 'ANN-001',
    toda_id: null,
    toda_name: 'All City TODAs & Commuters',
    title: 'New SAKAY Fare Cap Ordinance Enforcement Notice',
    message: 'Pursuant to City Ordinance No. 118, all tricycle operators and drivers must adhere strictly to the ₱15 base fare for the first 2.0 km. Overcharging reports will trigger immediate 3-strike policy review.',
    target_role: 'All',
    is_published: true,
    publish_timing: 'Immediate',
    created_by_lgu_admin: 'Hon. Juanito De Chavez (Super Administrator)',
    created_at: 'May 08, 2026 • 10:00 AM',
  },
  {
    id: 'ANN-2026-002',
    announcement_id: 'ANN-002',
    toda_id: 'toda-1',
    toda_name: 'Calapan Central TODA',
    title: 'JP Rizal St. Drainage Construction Temporary Route Advisory',
    message: 'Drivers affiliated with Calapan Central TODA are advised to utilize San Vicente diversion roads during DPWH culvert upgrades between 8:00 AM and 5:00 PM.',
    target_role: 'Driver',
    is_published: true,
    publish_timing: 'Immediate',
    created_by_lgu_admin: 'Maria Elena Santos (Verifier)',
    created_at: 'May 10, 2026 • 08:30 AM',
  },
  {
    id: 'ANN-2026-003',
    announcement_id: 'ANN-003',
    toda_id: null,
    toda_name: 'All TODA Administrators',
    title: 'Annual Barangay Clearance Renewal Deadline (Q2 2026)',
    message: 'All accredited TODA presidents and secretaries are reminded to upload updated Barangay Clearances and driver rosters before June 30, 2026 to prevent account suspension.',
    target_role: 'TODA Administrator',
    is_published: true,
    publish_timing: 'Immediate',
    created_by_lgu_admin: 'Maria Elena Santos (Verifier)',
    created_at: 'May 11, 2026 • 02:00 PM',
  },
  {
    id: 'ANN-2026-004',
    announcement_id: 'ANN-004',
    toda_id: null,
    toda_name: 'All City Commuters',
    title: 'Enhanced Ride-Sharing Discount Availability for Poblacion Routes',
    message: 'Commuters booking through the SAKAY Passenger PWA can now enjoy up to 35% fare discounts when matching co-passengers heading in the same service corridor.',
    target_role: 'Passenger',
    is_published: true,
    publish_timing: 'Immediate',
    created_by_lgu_admin: 'Engr. Liza Bautista (Fare Administrator)',
    created_at: 'May 12, 2026 • 09:00 AM',
  },
  {
    id: 'ANN-2026-005',
    announcement_id: 'ANN-005',
    toda_id: 'toda-2',
    toda_name: 'Ibaba TODA Express',
    title: 'Scheduled MTOP Inspection Day for Ibaba Units (Draft)',
    message: 'Special on-site franchise renewal and tricycle roadworthiness inspection scheduled at Ibaba Barangay Plaza.',
    target_role: 'Driver',
    is_published: false,
    publish_timing: 'Scheduled',
    scheduled_date: 'May 20, 2026',
    created_by_lgu_admin: 'Maria Elena Santos (Verifier)',
    created_at: 'May 12, 2026 • 11:15 AM',
  },
];

// 10. Audit Log Seed Records
export const MOCK_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'LOG-2026-015',
    log_id: 'AUD-015',
    lgu_admin_id: 'LGU-ADM-001',
    actor_name: 'Hon. Juanito De Chavez',
    actor_role: 'Super Administrator',
    action_type: 'TODA_ACCREDITATION_APPROVED',
    target_id: 'APP-2026-003',
    target_name: 'Lazareto TODA',
    details: 'Approved municipal accreditation renewal and issued permit accreditation permit #CAL-TODA-2026-03.',
    performed_at: 'May 12, 2026 • 09:30 AM',
    category: 'Verification',
  },
  {
    id: 'LOG-2026-014',
    log_id: 'AUD-014',
    lgu_admin_id: 'LGU-ADM-003',
    actor_name: 'Capt. Rodrigo Alcantara',
    actor_role: 'Incident Officer',
    action_type: 'MANUAL_STRIKE_ISSUED',
    target_id: 'DRV-002',
    target_name: 'Vicente "Enteng" Sotto',
    details: 'Issued +1 Administrative Policy Strike for confirmed overcharging attempt on Trip #TRP-2026-00412.',
    performed_at: 'May 12, 2026 • 09:05 AM',
    category: 'User Oversight',
  },
  {
    id: 'LOG-2026-013',
    log_id: 'AUD-013',
    lgu_admin_id: 'LGU-ADM-004',
    actor_name: 'Engr. Liza Bautista',
    actor_role: 'Fare Administrator',
    action_type: 'ANNOUNCEMENT_PUBLISHED',
    target_id: 'ANN-2026-004',
    target_name: 'Enhanced Ride-Sharing Discount Availability',
    details: 'Published public passenger broadcast regarding 35% ride-sharing savings.',
    performed_at: 'May 12, 2026 • 09:00 AM',
    category: 'Announcement',
  },
  {
    id: 'LOG-2026-012',
    log_id: 'AUD-012',
    lgu_admin_id: 'LGU-ADM-003',
    actor_name: 'Capt. Rodrigo Alcantara',
    actor_role: 'Incident Officer',
    action_type: 'INCIDENT_TRIAGED',
    target_id: 'INC-2026-0042',
    target_name: 'Incident #INC-2026-0042 (Harassment)',
    details: 'Updated investigation status to "Under Investigation" and requested police coordination log.',
    performed_at: 'May 12, 2026 • 08:50 AM',
    category: 'User Oversight',
  },
  {
    id: 'LOG-2026-011',
    log_id: 'AUD-011',
    lgu_admin_id: 'LGU-ADM-002',
    actor_name: 'Maria Elena Santos',
    actor_role: 'Verifier',
    action_type: 'DOCUMENT_RESUBMISSION_REQUESTED',
    target_id: 'APP-2026-002',
    target_name: 'Ibaba TODA Express',
    details: 'Requested resubmission of updated 2026 Barangay Clearance before accreditation renewal.',
    performed_at: 'May 12, 2026 • 08:20 AM',
    category: 'Verification',
  },
  {
    id: 'LOG-2026-010',
    log_id: 'AUD-010',
    lgu_admin_id: 'LGU-ADM-001',
    actor_name: 'Hon. Juanito De Chavez',
    actor_role: 'Super Administrator',
    action_type: 'ADMIN_ACCOUNT_CREATED',
    target_id: 'LGU-ADM-006',
    target_name: 'Grace Villanueva',
    details: 'Created new Verifier administrator account with status "Pending Password Reset".',
    performed_at: 'May 10, 2026 • 03:45 PM',
    category: 'Authentication',
  },
  {
    id: 'LOG-2026-009',
    log_id: 'AUD-009',
    lgu_admin_id: 'LGU-ADM-003',
    actor_name: 'Capt. Rodrigo Alcantara',
    actor_role: 'Incident Officer',
    action_type: 'PASSENGER_SUSPENDED',
    target_id: 'PAS-004',
    target_name: 'Carlos Mendoza',
    details: 'Suspended passenger account for 7 days due to 3 accumulated booking abandonment strikes.',
    performed_at: 'May 10, 2026 • 01:15 PM',
    category: 'User Oversight',
  },
  {
    id: 'LOG-2026-008',
    log_id: 'AUD-008',
    lgu_admin_id: 'LGU-ADM-004',
    actor_name: 'Engr. Liza Bautista',
    actor_role: 'Fare Administrator',
    action_type: 'FARE_MATRIX_UPDATED',
    target_id: 'FM-003',
    target_name: 'Fare Matrix Version 3 (City Ord. No. 118)',
    details: 'Activated Fare Matrix Version 3 (₱15 base fare / 2.0 km, ₱1.00/km succeeding rate).',
    performed_at: 'May 09, 2026 • 10:30 AM',
    category: 'Fare Matrix',
  },
  {
    id: 'LOG-2026-007',
    log_id: 'AUD-007',
    lgu_admin_id: 'LGU-ADM-003',
    actor_name: 'Capt. Rodrigo Alcantara',
    actor_role: 'Incident Officer',
    action_type: 'INCIDENT_RESOLVED',
    target_id: 'INC-2026-0040',
    target_name: 'Incident #INC-2026-0040 (Route Deviation)',
    details: 'Resolved report without penalty after verifying DPWH road repair on JP Rizal St.',
    performed_at: 'May 09, 2026 • 02:30 PM',
    category: 'User Oversight',
  },
  {
    id: 'LOG-2026-006',
    log_id: 'AUD-006',
    lgu_admin_id: 'LGU-ADM-002',
    actor_name: 'Maria Elena Santos',
    actor_role: 'Verifier',
    action_type: 'CLEARANCE_REMINDER_SENT',
    target_id: 'toda-1',
    target_name: 'Calapan Central TODA',
    details: 'Sent automated SMS and in-portal Barangay Clearance renewal notification to representative.',
    performed_at: 'May 08, 2026 • 11:00 AM',
    category: 'Verification',
  },
  {
    id: 'LOG-2026-005',
    log_id: 'AUD-005',
    lgu_admin_id: 'LGU-ADM-001',
    actor_name: 'Hon. Juanito De Chavez',
    actor_role: 'Super Administrator',
    action_type: 'ADMIN_ACCOUNT_DEACTIVATED',
    target_id: 'LGU-ADM-007',
    target_name: 'Arnold Hernandez',
    details: 'Deactivated staff administrative account following department reassignment.',
    performed_at: 'Apr 20, 2026 • 05:00 PM',
    category: 'Authentication',
  },
];
