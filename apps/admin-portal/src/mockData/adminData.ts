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
      { id: 'DRV-1007', name: 'Gregorio "Goyong" del Pilar', vehiclePlate: '552-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Online' },
      { id: 'DRV-1008', name: 'Manuel "Manoling" Quezon', vehiclePlate: '809-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Offline' },
      { id: 'DRV-1009', name: 'Diosdado "Dado" Macapagal', vehiclePlate: '621-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Online' },
      { id: 'DRV-1010', name: 'Ramon "Monching" Magsaysay', vehiclePlate: '447-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Online' },
      { id: 'DRV-1011', name: 'Elpidio "Elpy" Quirino', vehiclePlate: '290-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Offline' },
      { id: 'DRV-1012', name: 'Sergio "Serge" Osmeña', vehiclePlate: '733-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Online' },
      { id: 'DRV-1013', name: 'Emilio "Miong" Aguinaldo', vehiclePlate: '105-MV', verificationStatus: 'Verified', accountStatus: 'Active', onlineStatus: 'Offline' },
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

// 3. Driver Management Mock Data with Strike History
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
      { name: 'TODA Endorsement Form', type: 'PDF', status: 'Verified' },
      { name: 'Barangay Clearance', type: 'Image', status: 'Verified' },
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
  {
    id: 'DRV-1003',
    name: 'Eduardo "Ed" Ramos',
    licenseNo: 'N02-12-004412',
    licenseExpiry: 'Feb 10, 2026',
    licenseStatus: 'Expired',
    mtopNo: 'MTOP-2024-0012',
    mtopExpiry: 'May 01, 2026',
    mtopStatus: 'Expired',
    mtopOperatorName: 'Bernardo Ramos (Registered Operator)',
    todaName: 'Suqui Beach TODA',
    todaId: 'TODA-ACC-03',
    vehiclePlate: '109-MV',
    franchiseNo: 'LGU-FR-2024-0012',
    franchiseExpiry: 'Dec 31, 2025',
    todaVerificationStatus: 'Verified',
    lguVerificationStatus: 'Suspended',
    verificationStatus: 'Suspended',
    accountStatus: 'Inactive',
    onlineStatus: 'Offline',
    rating: 3.9,
    ratingCount: 42,
    phone: '+63 918 998 1122',
    barangay: 'Suqui, Calapan City',
    strikesCount: 5,
    strikeHistory: [
      {
        id: 'STRK-D-301',
        date: 'Mar 15, 2026',
        reason: 'Unjustified Cancellation while En Route (>50m)',
        strikesApplied: 2,
        status: 'Active (Rolling 90d)',
        issuedBy: 'System Auto-Detector',
      },
      {
        id: 'STRK-D-302',
        date: 'Apr 04, 2026',
        reason: 'Confirmed Unsafe/Reckless Driving (Upheld incident report)',
        strikesApplied: 3,
        status: 'Active (Rolling 90d)',
        issuedBy: 'LGU Administrative Review',
      },
    ],
    documents: [
      { name: "Expired Driver's License", type: 'Image', status: 'Pending' },
      { name: 'Expired MTOP Permit', type: 'PDF', status: 'Pending' },
    ],
  },
  {
    id: 'DRV-1004',
    name: 'Aurelio "Auring" Bautista',
    licenseNo: 'N01-19-551120',
    licenseExpiry: 'Nov 05, 2028',
    licenseStatus: 'Valid',
    mtopNo: 'MTOP-2025-0511',
    mtopExpiry: 'Dec 31, 2026',
    mtopStatus: 'Valid',
    mtopOperatorName: 'Aurelio Bautista (Owner-Operator)',
    todaName: 'Calapan Central TODA',
    todaId: 'TODA-ACC-01',
    vehiclePlate: '773-MV',
    franchiseNo: 'LGU-FR-2025-0511',
    franchiseExpiry: 'Dec 31, 2026',
    todaVerificationStatus: 'Verified',
    lguVerificationStatus: 'Verified',
    verificationStatus: 'Verified',
    accountStatus: 'Active',
    onlineStatus: 'Offline',
    rating: 4.9,
    ratingCount: 210,
    phone: '+63 927 445 6677',
    barangay: 'Ibaba, Calapan City',
    strikesCount: 0,
    strikeHistory: [],
    documents: [
      { name: "LTO Driver's License", type: 'Image', status: 'Verified' },
      { name: 'MTOP Permit', type: 'PDF', status: 'Verified' },
    ],
  },
];

// 4. Passenger Management Mock Data with Strike History
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
    recentFeedback: [
      {
        rating: 4,
        category: 'Fare Compliance',
        comment: 'Good ride experience along Tawiran highway.',
        date: 'May 09, 2026',
        tripId: 'TRIP-7712',
      },
    ],
  },
  {
    id: 'PSG-5003',
    name: 'Elena "Nena" Gonzaga',
    phone: '+63 919 112 4455',
    email: 'elena.gonzaga@outlook.com',
    verificationStatus: 'Unverified',
    accountStatus: 'Suspended',
    suspensionReason: 'Violation of Platform Policy: 5 Strikes accumulated within rolling 90 days.',
    activeSession: false,
    totalBookings: 3,
    registeredDate: 'Apr 02, 2026',
    rating: 3.2,
    ratingCount: 3,
    strikesCount: 5,
    strikeHistory: [
      {
        id: 'STRK-P-201',
        date: 'Apr 10, 2026',
        reason: 'Passenger No-Show at pickup location (5 min wait expired)',
        strikesApplied: 2,
        status: 'Active (Rolling 90d)',
        issuedBy: 'Driver Dispatch Report',
      },
      {
        id: 'STRK-P-202',
        date: 'Apr 28, 2026',
        reason: 'Passenger Payment Refusal / Unfounded Fare Dispute',
        strikesApplied: 2,
        status: 'Active (Rolling 90d)',
        issuedBy: 'LGU Administrative Review',
      },
      {
        id: 'STRK-P-203',
        date: 'May 04, 2026',
        reason: 'Late Cancellation after driver arrival',
        strikesApplied: 1,
        status: 'Active (Rolling 90d)',
        issuedBy: 'System Dispatch Engine',
      },
    ],
    recentFeedback: [
      {
        rating: 1,
        category: 'Overcharging Complaint',
        comment: 'Driver charged 150 pesos from Poblacion to Pachoca.',
        date: 'Apr 28, 2026',
        tripId: 'TRIP-5510',
      },
    ],
  },
];
