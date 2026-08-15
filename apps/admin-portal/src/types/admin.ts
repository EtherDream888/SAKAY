export type StatusType = 'Approved' | 'Pending' | 'Rejected' | 'Suspended' | 'Under Review' | 'Resolved' | 'Active';

export interface SummaryMetric {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  trend?: string;
  trendDirection?: 'up' | 'down';
  accentColor?: string;
  route: string;
}

export type TrendPeriod = 'Daily' | 'Weekly' | 'Monthly';

export interface BookingTrendPoint {
  label: string;
  value: number;
}

export interface TodaApplication {
  id: string;
  name: string;
  submittedDate: string;
  status: StatusType;
}

export interface DriverVerificationData {
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  suspendedCount: number;
  totalDrivers: number;
}

export interface IncidentReportItem {
  id: string;
  category: string;
  timestamp: string;
  status: StatusType;
  iconType: 'overcharging' | 'misconduct' | 'route' | 'safety';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: 'toda' | 'driver' | 'incident' | 'system';
}

export interface ActiveTripMarker {
  id: string;
  driverName: string;
  todaName: string;
  lat: number;
  lng: number;
  status: 'Active' | 'EnRoute';
}
