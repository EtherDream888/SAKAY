export type StatusType =
  | 'Approved'
  | 'Pending'
  | 'Rejected'
  | 'Suspended'
  | 'TODA Suspended'
  | 'LGU Deactivated'
  | 'Deactivated'
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
  | 'Pending Verification'
  | 'Pending Review'
  | 'Under Investigation'
  | 'TODA Endorsed'
  | 'Submitted'
  | 'TODA Review'
  | 'Pending LGU Re-approval'
  | 'Published'
  | 'Unpublished'
  | 'Draft'
  | 'Escalated to LGU'
  | 'Resolved (TODA Level)'
  | 'Dismissed';

export interface TodaProfile {
  id: string;
  name: string;
  acronym: string;
  registrationNumber: string;
  dateEstablished: string;
  terminalLocation: string;
  pendingTerminalLocation?: string | null;
  barangay: string;
  serviceCoverageArea: string;
  contactNumber: string;
  email: string;
  officers: {
    president: string;
    vicePresident: string;
    secretary: string;
    treasurer: string;
  };
  accreditationStatus: 'Active' | 'Pending Verification' | 'Suspended' | 'Deactivated';
  accreditationExpiry: string;
  permitNumber: string;
  barangayClearanceFile: { name: string; date: string; url?: string };
  rosterFile: { name: string; date: string; count: number; url?: string };
  isOtpVerified: boolean;
  misteepComplaintsCount: number;
}

export interface DriverApplicant {
  id: string;
  name: string;
  phone: string;
  licenseNo: string;
  vehiclePlate: string;
  chassisNo: string;
  motorNo: string;
  franchiseNo: string;
  submittedDate: string;
  daysPending: number;
  isOverdue: boolean; // >3 days warning, >5 days SLA violation
  onSubmittedRoster: boolean; // Rule 2.4: Mismatch detection
  tricyclePhotoUrl: string;
  photoVerified: boolean;
  rosterVerified: boolean;
  todaStageStatus: 'Submitted' | 'TODA Review' | 'TODA Endorsed' | 'Rejected' | 'Resubmission Required';
  rejectionReason?: string;
  notes?: string;
}

export interface TodaDriverMember {
  id: string;
  membershipNo: string;
  name: string;
  phone: string;
  email?: string;
  vehiclePlate: string;
  franchiseNo: string;
  licenseNo: string;
  terminalShift: string;
  serviceZone: string;
  todaVerificationStatus: 'Verified' | 'Endorsed' | 'Pending';
  lguVerificationStatus: 'Verified' | 'Pending' | 'Suspended';
  accountStatus: 'Active' | 'TODA Suspended' | 'LGU Deactivated';
  suspensionReason?: string;
  suspendedAt?: string;
  strikesCount: number;
  rating: number;
  totalTrips: number;
  joinedDate: string;
}

export interface DriverExemptionRequest {
  id: string;
  driverId: string;
  driverName: string;
  strikeId: string;
  incidentCategory: string;
  reason: string;
  evidenceFiles: string[];
  submittedAt: string;
  status: 'Pending Review' | 'Approved' | 'Escalated to LGU' | 'Rejected';
  decisionNotes?: string;
}

export interface TodaAnnouncement {
  id: string;
  title: string;
  message: string;
  category: 'Terminal Rules' | 'Document Renewal' | 'Meeting Notice' | 'Safety Advisory' | 'General';
  urgency: 'Standard' | 'High Priority';
  isPublished: boolean;
  sendPushNotification: boolean;
  createdBy: string;
  createdAt: string;
}

export interface TodaBooking {
  id: string;
  bookingCode: string;
  passengerName: string;
  passengerPhone: string;
  driverName: string;
  vehiclePlate: string;
  pickupLocation: string;
  dropoffLocation: string;
  distanceKm: number;
  fareAmount: number;
  tripMode: 'Single Commuter' | 'Solo Charter' | 'Shared Ride';
  status: 'Completed' | 'In Progress' | 'Cancelled';
  paymentMethod: 'Cash' | 'GCash / Digital';
  timestamp: string;
}

export interface TodaIncident {
  id: string;
  bookingId: string;
  tripId: string;
  driverName: string;
  vehiclePlate: string;
  reporterName: string;
  reporterRole: 'Passenger' | 'Driver' | 'Commuter';
  category: string;
  description: string;
  submittedAt: string;
  status: 'Pending Review' | 'Under Investigation' | 'Resolved (TODA Level)' | 'Escalated to LGU' | 'Dismissed';
  findings?: string;
  escalationReason?: string;
  escalatedAt?: string;
}

export interface TodaAuditLog {
  id: string;
  log_id: string;
  toda_admin_id: string;
  actor_name: string;
  action_type: string;
  target_id: string;
  target_name: string;
  details: string;
  performed_at: string;
  category: 'Account' | 'Driver Verification' | 'Membership' | 'Operations' | 'Announcement' | 'Incident';
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
