// SAKAY Database Types matching Supabase PostgreSQL Schema

export interface Toda {
  toda_id: string;
  toda_name: string;
  toda_acronym?: string;
  date_established?: string;
  terminal_latitude?: number;
  terminal_longitude?: number;
  barangay?: string;
  service_coverage_area?: string;
  contact_number?: string;
  email?: string;
  president_name?: string;
  president_contact?: string;
  vice_president_name?: string;
  vice_president_contact?: string;
  secretary_name?: string;
  secretary_contact?: string;
  treasurer_name?: string;
  treasurer_contact?: string;
  barangay_clearance_url?: string;
  accredited_drivers_url?: string;
  bylaws_url?: string;
  registered_tricycle_count: number;
  active_driver_count: number;
  toda_status: 'Pending Verification' | 'Active' | 'Suspended' | 'Deactivated';
  account_status?: 'Pending Verification' | 'Active' | 'Suspended' | 'Deactivated';
  certificate_number?: string;
  certificate_expiry?: string;
  pending_terminal_latitude?: number;
  pending_terminal_longitude?: number;
  pending_terminal_location?: string;
  terminal_relocation_status?: 'None' | 'Pending LGU Re-approval' | 'Approved' | 'Rejected';
  terminal_relocation_requested_at?: string;
  created_at: string;
}

export interface LguAdmin {
  admin_id: string;
  auth_user_id: string;
  full_name: string;
  email: string;
  contact_number?: string;
  position?: string;
  account_status: 'Active' | 'Suspended';
  last_login?: string;
  created_at: string;
}

export interface TodaAdmin {
  admin_id: string;
  auth_user_id: string;
  toda_id: string;
  full_name: string;
  email: string;
  contact_number?: string;
  account_status: 'Active' | 'Suspended';
  created_at: string;
}

export interface Passenger {
  passenger_id: string;
  auth_user_id: string;
  full_name: string;
  contact_number: string;
  email?: string;
  profile_photo_url?: string;
  date_of_birth?: string;
  residential_address?: string;
  account_status: 'Pending OTP Verification' | 'Active' | 'Suspended' | 'Deactivated';
  created_at: string;
  updated_at: string;
}

export interface Driver {
  driver_id: string;
  auth_user_id: string;
  toda_id?: string;
  full_name: string;
  contact_number: string;
  email?: string;
  profile_photo_url?: string;
  date_of_birth?: string;
  residential_address?: string;
  toda_membership_number?: string;
  license_number?: string;
  license_expiry?: string;
  franchise_number?: string;
  plate_number?: string;
  assigned_terminal?: string;
  barangay_service_area?: string;
  account_status: 'Pending Verification' | 'Verified' | 'Rejected' | 'Suspended' | 'Deactivated' | 'Resubmission Required';
  availability_status: 'Offline' | 'Available' | 'Busy';
  weighted_average_rating: number;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  is_permanently_disqualified?: boolean;
  disqualification_reason?: string;
  disqualified_at?: string;
  disqualified_by?: string;
  rejection_reason?: string;
  rejection_comment?: string;
  lgu_approved_at?: string;
  endorsed_at?: string;
  mtop_expiry?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverVerification {
  verification_id: string;
  driver_id: string;
  reviewed_by?: string; // TODA Admin ID
  reviewed_by_lgu?: string; // LGU Admin ID
  ocr_full_name?: string;
  submitted_full_name?: string;
  ocr_license_number?: string;
  submitted_license_number?: string;
  ocr_dob?: string;
  submitted_dob?: string;
  ocr_address?: string;
  submitted_address?: string;
  ocr_dl_codes?: string;
  submitted_dl_codes?: string;
  ocr_toda_membership_number?: string;
  submitted_toda_membership_number?: string;
  ocr_franchise_number?: string;
  submitted_franchise_number?: string;
  ocr_operator_name?: string;
  submitted_operator_name?: string;
  ocr_plate_number?: string;
  submitted_plate_number?: string;
  license_expiry?: string;
  franchise_expiry?: string;
  is_duplicate_license?: boolean;
  is_duplicate_mtop?: boolean;
  pending_license_expiry?: string;
  pending_mtop_expiry?: string;
  pending_license_photo_url?: string;
  pending_mtop_photo_url?: string;
  renewal_status?: 'Pending LGU Verification' | 'Approved' | 'Rejected';
  mime_type?: string;
  file_size?: number;
  scan_status: 'Clean' | 'Flagged';
  verification_status: 'Pending' | 'Approved' | 'Rejected' | 'Resubmission Required';
  remarks?: string;
  submitted_at: string;
  reviewed_at?: string;
}

export interface FareMatrix {
  fare_matrix_id: string;
  base_fare: number;
  base_distance_km: number;
  succeeding_rate: number;
  effective_timestamp: string;
  is_active: boolean;
  configured_by?: string;
  created_at: string;
}

export interface Booking {
  booking_id: string;
  passenger_id: string;
  driver_id?: string;
  toda_id?: string;
  booking_type: 'Immediate' | 'Scheduled';
  is_shared_trip: boolean;
  shared_trip_match_id?: string;
  passenger_count: number;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
  dropoff_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  estimated_distance_km?: number;
  actual_distance_km?: number;
  estimated_fare?: number;
  actual_fare?: number;
  fare_confirmation_status: 'Matched' | 'Flagged for Review';
  booking_status: 'Pending' | 'Searching Driver' | 'Driver Assigned' | 'Driver En Route' | 'Driver Arrived' | 'Passenger Boarded' | 'Trip Ongoing' | 'Completed' | 'Cancelled' | 'No Driver Found';
  cancelled_by?: 'Passenger' | 'Driver' | 'System';
  cancellation_reason?: string;
  requested_at: string;
  accepted_at?: string;
  arrived_at?: string;
  trip_started_at?: string;
  trip_completed_at?: string;
  cancelled_at?: string;
  created_at: string;
}

export interface DispatchAttempt {
  attempt_id: string;
  booking_id: string;
  driver_id: string;
  dispatch_method: string;
  driver_rank?: number;
  response_status: 'Pending' | 'Accepted' | 'Declined' | 'Timed Out';
  notification_sent_at: string;
  responded_at?: string;
}

export interface SharedTripMatch {
  match_id: string;
  primary_booking_id: string;
  additional_booking_id?: string;
  route_progress_at_request?: number;
  driver_response_status: 'Pending' | 'Accepted' | 'Declined';
  match_status: 'Searching' | 'Matched' | 'Completed' | 'Cancelled';
  matched_at?: string;
  created_at: string;
}

export interface Rating {
  rating_id: string;
  booking_id: string;
  rater_id: string;
  ratee_id: string;
  rater_role: 'Passenger' | 'Driver';
  stars: number;
  tags?: string[];
  comment?: string;
  created_at: string;
}

export interface IncidentReport {
  incident_id: string;
  booking_id?: string;
  passenger_id?: string;
  driver_id?: string;
  reported_by: 'Passenger' | 'Driver' | 'LGU Staff' | 'TODA Officer';
  category: string;
  description: string;
  status: 'Pending' | 'Under Investigation' | 'Resolved (TODA Level)' | 'Resolved' | 'Dismissed' | 'Escalated to LGU';
  reviewed_by_toda?: string;
  reviewed_by_lgu?: string;
  resolution?: string;
  created_at: string;
  resolved_at?: string;
}

export interface Notification {
  notification_id: string;
  recipient_id?: string;
  subject_id?: string;
  threshold_days?: number;
  passenger_id?: string;
  driver_id?: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  sent_at: string;
}

export interface Announcement {
  announcement_id: string;
  toda_id?: string; // Optional if city-wide LGU announcement
  title: string;
  message: string;
  created_by?: string;
  created_at: string;
}

export interface AuditLog {
  log_id: string;
  toda_admin_id?: string;
  lgu_admin_id?: string;
  actor_id?: string;
  actor_role?: string;
  action_type: string;
  target_id?: string;
  details?: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  performed_at: string;
}

export interface DriverTodaAffiliation {
  affiliation_id: string;
  driver_id: string;
  toda_id: string;
  toda_membership_number?: string;
  toda_endorsement_status: 'Submitted' | 'Endorsed' | 'Resubmission Required' | 'Rejected';
  toda_endorsed_at?: string;
  toda_endorsed_by?: string;
  toda_rejection_reason?: string;
  toda_return_notes?: string;
  lgu_verification_status: 'Pending' | 'Approved' | 'Resubmission Required' | 'Rejected';
  lgu_verified_at?: string;
  lgu_verified_by?: string;
  lgu_rejection_reason?: string;
  lgu_return_notes?: string;
  is_active_selection: boolean;
  submitted_at: string;
  resubmitted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminReviewFlag {
  flag_id: string;
  flag_type: 'ROSTER_MISMATCH' | 'TODA_EXCESS_INCIDENTS' | 'APPLICATION_OVERDUE' | 'DUPLICATE_LICENSE' | 'DUPLICATE_PLATE' | 'PERMANENT_DISQUALIFICATION';
  subject_type: 'toda' | 'driver_application' | 'driver';
  subject_id: string;
  source_rule: string;
  status: 'Open' | 'Under Review' | 'Resolved' | 'Dismissed';
  details?: Record<string, any>;
  resolution?: string;
  resolved_by?: string;
  resolved_at?: string;
  assigned_role: 'lgu_admin' | 'toda_admin';
  created_at: string;
}

export interface ServiceAreaConfig {
  config_id: string;
  area_name: string;
  center_latitude: number;
  center_longitude: number;
  radius_km: number;
  is_active: boolean;
  toda_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TodaRosterEntry {
  roster_id: string;
  toda_id: string;
  driver_full_name: string;
  franchise_number?: string;
  plate_number?: string;
  normalized_name?: string;
  normalized_franchise?: string;
  normalized_plate?: string;
  created_at: string;
}

