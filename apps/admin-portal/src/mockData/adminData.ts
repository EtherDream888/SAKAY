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
