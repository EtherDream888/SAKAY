import {
  SummaryMetric,
  TodaApplication,
  DriverVerificationData,
  IncidentReportItem,
  NotificationItem,
  ActiveTripMarker,
  BookingTrendPoint,
} from '../types/admin';

export const SUMMARY_METRICS: SummaryMetric[] = [
  {
    id: 'accredited-todas',
    title: 'Accredited TODAs',
    value: 61,
    subtitle: 'Active organizations',
    route: '/accredited-todas',
  },
  {
    id: 'active-drivers',
    title: 'Active Drivers',
    value: 742,
    subtitle: 'Online: 168',
    trend: '↑ 12%',
    trendDirection: 'up',
    route: '/drivers',
  },
  {
    id: 'active-trips',
    title: 'Active Trips',
    value: 38,
    subtitle: 'Ongoing trips',
    route: '/live-trips',
  },
  {
    id: 'todays-bookings',
    title: "Today's Bookings",
    value: 124,
    subtitle: 'Total bookings',
    trend: '↑ 8%',
    trendDirection: 'up',
    route: '/live-trips',
  },
];

export const BOOKING_TREND_DAILY: BookingTrendPoint[] = [
  { label: '06:00', value: 120 },
  { label: '08:00', value: 450 },
  { label: '10:00', value: 380 },
  { label: '12:00', value: 520 },
  { label: '14:00', value: 410 },
  { label: '16:00', value: 680 },
  { label: '18:00', value: 890 },
  { label: '20:00', value: 340 },
];

export const BOOKING_TREND_WEEKLY: BookingTrendPoint[] = [
  { label: 'Mon', value: 680 },
  { label: 'Tue', value: 1120 },
  { label: 'Wed', value: 1600 },
  { label: 'Thu', value: 1040 },
  { label: 'Fri', value: 820 },
  { label: 'Sat', value: 960 },
  { label: 'Sun', value: 1400 },
];

export const BOOKING_TREND_MONTHLY: BookingTrendPoint[] = [
  { label: 'Jan', value: 12400 },
  { label: 'Feb', value: 14200 },
  { label: 'Mar', value: 15800 },
  { label: 'Apr', value: 16900 },
  { label: 'May', value: 18200 },
  { label: 'Jun', value: 17500 },
  { label: 'Jul', value: 19100 },
  { label: 'Aug', value: 20400 },
  { label: 'Sep', value: 18900 },
  { label: 'Oct', value: 21500 },
  { label: 'Nov', value: 22800 },
  { label: 'Dec', value: 25600 },
];

export const RECENT_TODA_APPLICATIONS: TodaApplication[] = [
  {
    id: 'toda-1',
    name: 'Bagong Silang TODA',
    submittedDate: 'May 11, 2025',
    status: 'Pending',
  },
  {
    id: 'toda-2',
    name: 'Singko TODA',
    submittedDate: 'May 10, 2025',
    status: 'Pending',
  },
  {
    id: 'toda-3',
    name: 'Lazareto TODA',
    submittedDate: 'May 9, 2025',
    status: 'Approved',
  },
  {
    id: 'toda-4',
    name: 'Suqui United TODA',
    submittedDate: 'May 8, 2025',
    status: 'Rejected',
  },
];

export const DRIVER_VERIFICATION_DATA: DriverVerificationData = {
  approvedCount: 512,
  pendingCount: 138,
  rejectedCount: 52,
  suspendedCount: 40,
  totalDrivers: 742,
};

export const RECENT_INCIDENT_REPORTS: IncidentReportItem[] = [
  {
    id: 'inc-1',
    category: 'Overcharging',
    timestamp: 'May 12, 2026 • 10:24 AM',
    status: 'Under Review',
    iconType: 'overcharging',
  },
  {
    id: 'inc-2',
    category: 'Driver Misconduct',
    timestamp: 'May 12, 2026 • 9:15 AM',
    status: 'Under Review',
    iconType: 'misconduct',
  },
  {
    id: 'inc-3',
    category: 'Route Deviation',
    timestamp: 'May 11, 2026 • 6:45 AM',
    status: 'Resolved',
    iconType: 'route',
  },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'TODA Application Submitted',
    description: 'Bagong Silang TODA submitted a new accreditation application.',
    time: '10 mins ago',
    unread: true,
    type: 'toda',
  },
  {
    id: 'notif-2',
    title: 'Driver Verification Pending',
    description: '5 driver applications are waiting for review in Calapan Central Zone.',
    time: '1 hour ago',
    unread: true,
    type: 'driver',
  },
  {
    id: 'notif-3',
    title: 'Incident Report Submitted',
    description: 'A passenger reported an overcharging incident on Route 4.',
    time: '2 hours ago',
    unread: false,
    type: 'incident',
  },
];

export const ACTIVE_TRIP_MARKERS: ActiveTripMarker[] = [
  { id: 'trip-1', driverName: 'Juan Dela Cruz', todaName: 'Lazareto TODA', lat: 13.4147, lng: 121.1823, status: 'Active' },
  { id: 'trip-2', driverName: 'Pedro Santos', todaName: 'Bagong Silang TODA', lat: 13.4180, lng: 121.1760, status: 'Active' },
  { id: 'trip-3', driverName: 'Mark Reyes', todaName: 'Suqui United TODA', lat: 13.4070, lng: 121.1890, status: 'Active' },
  { id: 'trip-4', driverName: 'Gabriel Ramos', todaName: 'Singko TODA', lat: 13.4095, lng: 121.1710, status: 'Active' },
];
