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
  | 'Dismissed'
  | 'Pending Password Reset'
  | 'Deactivated'
  | 'Published'
  | 'Unpublished'
  | 'Draft'
  | 'Superseded';

export type LguAdminRole =
  | 'Super Administrator'
  | 'Verifier'
  | 'Incident Officer'
  | 'Analytics Viewer'
  | 'Fare Administrator';

export interface LguAdmin {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  role: LguAdminRole;
  accountStatus: 'Active' | 'Pending Password Reset' | 'Deactivated';
  lastLogin?: string;
  createdAt: string;
}

export interface LguAdminProfile {
  admin_id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  contact_number?: string | null;
  position?: string | null;
  account_status: 'Active' | 'Suspended';
  last_login?: string | null;
  created_at: string;
}

export interface FareMatrixItem {
  id: string;
  baseFare: number;
  baseDistanceKm: number;
  succeedingRate: number;
  effectiveTimestamp: string;
  isActive: boolean;
  configuredBy: string;
  notes?: string;
  createdAt: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  targetRole: 'All' | 'Passenger' | 'Driver' | 'TODA Administrator';
  todaId?: string | null;
  todaName?: string | null;
  isPublished: boolean;
  publishTiming?: 'Immediate' | 'Scheduled';
  scheduledDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorRole?: string;
  actionType: string;
  targetId: string;
  targetName: string;
  details: string;
  timestamp: string;
  category?: 'Authentication' | 'Verification' | 'User Oversight' | 'Fare Matrix' | 'Announcement' | 'System';
}

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
