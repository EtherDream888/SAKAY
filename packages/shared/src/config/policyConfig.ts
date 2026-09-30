/**
 * SAKAY CENTRAL POLICY CONFIGURATION
 * Canonical single source of truth for operational constants and business rules.
 *
 * Rules:
 * 1. Every policy number (distances, seconds, minutes, thresholds, counts, windows, fare values)
 *    must live in this canonical module or be database-backed.
 * 2. Only values that already exist scattered in code and map directly to an authoritative
 *    policy rule are included in Batch 0.
 * 3. Later batches will import from this central module.
 */

// ============================================================================
// 1. FARE MATRIX & TARIFF CONFIGURATION (Rules 6.1, 6.1.1, 14.1 - City Ordinance No. 110, s. 2022)
// ============================================================================

export interface TariffConfig {
  /** Base fare covering the first baseDistanceKm (Rule 6.1) */
  baseFare: number;
  /** Included base distance in kilometers (Rule 6.1) */
  baseDistanceKm: number;
  /** Rate per succeeding kilometer beyond base distance (Rule 6.1) */
  succeedingRate: number;
  /** Standard motorized tricycle seating capacity (Rules 6.1.1, 14.1) */
  capacity: number;
}

/**
 * Default Municipal Tariff Matrix for Calapan City Tricycle Services
 * Source: City Ordinance No. 110, Series of 2022
 */
export const DEFAULT_TARIFF: TariffConfig = {
  baseFare: 15.0,        // ₱15.00 base seat fare (Rule 6.1)
  baseDistanceKm: 2.0,   // First 2.0 km inclusive (Rule 6.1)
  succeedingRate: 1.0,   // ₱1.00 per succeeding km (Rule 6.1)
  capacity: 4,           // 4 passenger seats / Solo multiplier (Rules 6.1.1, 14.1)
};

// ============================================================================
// 2. DISPATCH & OFFER TIMERS (Rule 7.3)
// ============================================================================

/**
 * Driver booking offer response window in seconds.
 * A driver offered a sequential booking has exactly 15 seconds to accept before timeout.
 * (Rule 7.3)
 */
export const DRIVER_OFFER_TIMEOUT_SECONDS = 15;
export const DRIVER_OFFER_TIMEOUT_MS = DRIVER_OFFER_TIMEOUT_SECONDS * 1000;

// ============================================================================
// 3. TELEMETRY & GPS MONITORING INTERVALS (Rule 17.1)
// ============================================================================

/**
 * Driver near real-time GPS location refresh interval in seconds during active/assigned trip.
 * (Rule 17.1)
 */
export const ACTIVE_TRIP_GPS_INTERVAL_SECONDS = 5;
export const ACTIVE_TRIP_GPS_INTERVAL_MS = ACTIVE_TRIP_GPS_INTERVAL_SECONDS * 1000;

// ============================================================================
// 4. AUTHENTICATION & SECURITY TIMERS (Rule 4.6)
// ============================================================================

/**
 * Passenger SMS OTP validity time-to-live (TTL).
 * (Rule 4.6)
 */
export const OTP_EXPIRATION_MINUTES = 5;
export const OTP_EXPIRATION_MS = OTP_EXPIRATION_MINUTES * 60 * 1000;

// ============================================================================
// 5. ONBOARDING, ACCREDITATION & SLA TIMERS (Batch 1 - Rules 2.5, 3.5, 3.7, 24.4)
// ============================================================================

/** Driver application combined review deadline in calendar days (Rule 3.5) */
export const DRIVER_APPLICATION_REVIEW_DEADLINE_DAYS = 5;

/** Reviewer reminder threshold in calendar days (Rule 3.7) */
export const DRIVER_APPLICATION_STAGE_REMINDER_DAYS = 3;

/** Upheld incident reports threshold triggering supervisory review (Rule 2.5) */
export const TODA_INCIDENT_REPORT_FLAG_THRESHOLD = 3;

/** Rolling evaluation window in calendar days for TODA incidents (Rule 2.5) */
export const TODA_INCIDENT_REPORT_WINDOW_DAYS = 60;

/** Document and accreditation expiry advance reminder intervals in days (Rule 24.4) */
export const DOCUMENT_EXPIRY_REMINDER_DAYS = [30, 14, 3] as const;

// ============================================================================
// 6. UNIFIED POLICY CONSTANTS OBJECT
// ============================================================================

export const POLICY_CONSTANTS = {
  FARE: DEFAULT_TARIFF,
  DISPATCH: {
    DRIVER_OFFER_TIMEOUT_SECONDS,
    DRIVER_OFFER_TIMEOUT_MS,
  },
  TELEMETRY: {
    ACTIVE_TRIP_GPS_INTERVAL_SECONDS,
    ACTIVE_TRIP_GPS_INTERVAL_MS,
  },
  AUTH: {
    OTP_EXPIRATION_MINUTES,
    OTP_EXPIRATION_MS,
  },
  ONBOARDING: {
    DRIVER_APPLICATION_REVIEW_DEADLINE_DAYS,
    DRIVER_APPLICATION_STAGE_REMINDER_DAYS,
    TODA_INCIDENT_REPORT_FLAG_THRESHOLD,
    TODA_INCIDENT_REPORT_WINDOW_DAYS,
    DOCUMENT_EXPIRY_REMINDER_DAYS,
  },
} as const;

export type PolicyConstants = typeof POLICY_CONSTANTS;

