export type StatusType =
  | 'Approved'
  | 'Pending'
  | 'Rejected'
  | 'Suspended'
  | 'Under Review'
  | 'Resolved'
  | 'Active'
  | 'Inactive'
  | 'Declined'
  | 'Verified'
  | 'Unverified'
  | 'Valid'
  | 'Expiring Soon'
  | 'Expired'
  | 'Resubmission Required'
  | 'Pending Review'
  | 'Under Investigation'
  | 'Dismissed';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'driver' | 'passenger';
}

export type TrendPeriod = 'Weekly' | 'Monthly' | 'Daily';

export interface BookingTrendPoint {
  date?: string;
  label?: string;
  value: number;
  bookings?: number;
  revenue?: number;
}

export interface SummaryMetric {
  id: string;
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
  route?: string;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
}

export interface TodaApplication {
  id: string;
  name: string;
  representative?: string;
  barangay?: string;
  submittedDate: string;
  status: StatusType;
}

export interface DriverVerificationData {
  approved?: number;
  approvedCount: number;
  pending?: number;
  pendingCount: number;
  rejected?: number;
  rejectedCount: number;
  suspended?: number;
  suspendedCount: number;
  total?: number;
  totalDrivers: number;
}

export interface IncidentReportItem {
  id: string;
  todaName?: string;
  driverName?: string;
  category: string;
  date?: string;
  timestamp?: string;
  status: StatusType;
  description?: string;
  iconType?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  time?: string;
  read?: boolean;
  unread?: boolean;
  type?: string;
  description?: string;
}

export interface ActiveTripMarker {
  id: string;
  driverName: string;
  todaName: string;
  lat: number;
  lng: number;
  status: 'Available' | 'On Trip' | 'Offline' | 'Active';
}
