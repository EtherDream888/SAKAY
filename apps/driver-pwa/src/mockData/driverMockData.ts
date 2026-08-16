export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  licenseNo: string;
  licenseExpiry: string;
  avatarUrl: string;
  rating: number;
  totalTrips: number;
  accountStatus: 'Verified' | 'Pending Verification' | 'Rejected' | 'Suspended';
  selectedTodaId: string;
  selectedVehicleId: string;
  isOnline: boolean;
  isPaused: boolean;
  currentLat: number;
  currentLng: number;
}

export interface AccreditedTodaOption {
  id: string;
  name: string;
  acronym: string;
  terminalLocation: string;
  status: 'Verified' | 'Pending Approval';
}

export interface TricycleUnitOption {
  id: string;
  plateNumber: string;
  franchiseNumber: string;
  todaId: string;
  model: string;
  status: 'Verified' | 'Under Inspection';
}

export interface DriverEarningRecord {
  tripId: string;
  bookingCode: string;
  passengerName: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  fareAmount: number;
  tripType: 'Solo' | 'Shared';
  time: string;
  date: string;
}

export interface DriverNotification {
  id: string;
  title: string;
  message: string;
  category: 'Dispatch Alert' | 'TODA Announcement' | 'Reminders';
  time: string;
  unread: boolean;
}

export const INITIAL_DRIVER_PROFILE: DriverProfile = {
  id: 'DRV-001',
  name: 'Aurelio "Auring" Bautista',
  phone: '+63 917 111 0201',
  email: 'aurelio.bautista@gmail.com',
  licenseNo: 'N02-14-001928',
  licenseExpiry: 'December 2027',
  avatarUrl: '',
  rating: 4.9,
  totalTrips: 842,
  accountStatus: 'Verified',
  selectedTodaId: 'toda-1', // Default CCTODA
  selectedVehicleId: 'VEH-001', // Default 773-MV
  isOnline: false,
  isPaused: false,
  currentLat: 13.4124, // Calapan City Center
  currentLng: 121.1834,
};

export const ACCREDITED_TODAS: AccreditedTodaOption[] = [
  {
    id: 'toda-1',
    name: 'Calapan Central TODA',
    acronym: 'CCTODA',
    terminalLocation: 'JP Rizal St. Central Terminal',
    status: 'Verified',
  },
  {
    id: 'toda-2',
    name: 'Barangay Lumangbayan TODA',
    acronym: 'BLTODA',
    terminalLocation: 'Lumangbayan Bridge Terminal',
    status: 'Verified',
  },
  {
    id: 'toda-3',
    name: 'San Vicente TODA',
    acronym: 'SVTODA',
    terminalLocation: 'San Vicente Parish Bay',
    status: 'Pending Approval',
  },
];

export const VERIFIED_TRICYCLES: TricycleUnitOption[] = [
  {
    id: 'VEH-001',
    plateNumber: '773-MV',
    franchiseNumber: 'CAL-2025-0773',
    todaId: 'toda-1',
    model: 'Kawasaki Barako 175 (Orange/Silver)',
    status: 'Verified',
  },
  {
    id: 'VEH-002',
    plateNumber: '809-MV',
    franchiseNumber: 'CAL-2025-0809',
    todaId: 'toda-2',
    model: 'Bajaj CT100 (Blue/Silver)',
    status: 'Verified',
  },
];

export const MOCK_DRIVER_HISTORY: DriverEarningRecord[] = [
  {
    tripId: 'TRP-9041',
    bookingCode: 'BK-CAL-9011',
    passengerName: 'Maria Clara Santos',
    pickup: 'JP Rizal Central Terminal',
    dropoff: 'Calapan City Public Market',
    distanceKm: 2.4,
    fareAmount: 18.0,
    tripType: 'Solo',
    time: '09:15 AM',
    date: 'Ngayong Araw',
  },
  {
    tripId: 'TRP-9038',
    bookingCode: 'BK-CAL-8994',
    passengerName: 'Carlos Mendoza',
    pickup: 'San Vicente High School',
    dropoff: 'Calapan Port Gate 1',
    distanceKm: 4.8,
    fareAmount: 58.0,
    tripType: 'Solo',
    time: '08:30 AM',
    date: 'Ngayong Araw',
  },
  {
    tripId: 'TRP-9012',
    bookingCode: 'BK-CAL-8840',
    passengerName: 'Joshua Dizon (Paired Ride)',
    pickup: 'City Hall Complex',
    dropoff: 'Provincial Capitol',
    distanceKm: 3.1,
    fareAmount: 26.0,
    tripType: 'Shared',
    time: '04:45 PM',
    date: 'Kahapon',
  },
];

export const MOCK_DRIVER_NOTIFICATIONS: DriverNotification[] = [
  {
    id: 'NOTIF-DRV-01',
    title: 'TODA General Assembly Notice',
    message: 'General meeting scheduled this coming Sunday, 2:00 PM at San Vicente Gymnasium. Mandatory attendance.',
    category: 'TODA Announcement',
    time: '2 hours ago',
    unread: true,
  },
  {
    id: 'NOTIF-DRV-02',
    title: 'Peak Hour Fare Incentive',
    message: 'Increased passenger volume at JP Rizal Terminal between 5:00 PM and 7:00 PM.',
    category: 'Dispatch Alert',
    time: '4 hours ago',
    unread: true,
  },
  {
    id: 'NOTIF-DRV-03',
    title: 'Quarterly Franchise Sticker Check',
    message: 'Please ensure 2026 MTOP sticker is prominently displayed on the front windshield of the sidecar.',
    category: 'Reminders',
    time: 'Yesterday',
    unread: false,
  },
];
