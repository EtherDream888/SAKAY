# SAKAY Policy Decisions Log

This document records the architectural and regulatory decisions for SAKAY policy implementation across Batches 0 to 13.

---

## 1. Policy Issues Decision Log (PI-01 to PI-12)

### PI-01: Barangay Service Zone as a Dispatch Eligibility Rule
- **Issue**: Policy Chapter 1 and Rules 2.2, 7.1, 7.4, 7.10 use the pickup barangay's service zone as a driver eligibility filter. Intelligent Driver Dispatch Specification Section 17 eliminates barangay eligibility filters in favor of metric distance tiers around the pickup.
- **Status**: `recommended - provisional`
- **Approved Option**: **Option C (Hybrid)**
- **Details**: Enforce a booking-creation boundary gate (pickup coordinates must fall inside a participating TODA's accredited operational territory, e.g. Brgy. Lumangbayan / Xentro Mall), but impose NO barangay boundary filter on driver dispatch eligibility. Tiered metric radii (Tier 1 Priority TODA -> Tier 2 -> Tier 3) govern driver offer sequencing.

---

### PI-02: Redispatch Priority Credits vs. Strict Ranking Criteria
- **Issue**: Rules 10.4 and 12.4 specify that drivers receive redispatch priority credits after passenger no-shows, and bookings are redispatched with priority after en-route driver cancellations. Dispatch specifications forbid priority tokens and ranking overrides outside ETA and tie-break orders.
- **Status**: `recommended - provisional`
- **Approved Option**: **Option A (Narrow Deterministic Tie-Breaker)**
- **Details**: Implement a single-use, session-scoped flag (`has_redispatch_priority: boolean`) on the re-queued booking or driver record. This acts strictly as the **first tie-breaker** when two candidates share the exact same ETA, preserving deterministic dispatch without artificial distance boosts.

---

### PI-03: Passenger Destination Change After Booking Confirmation
- **Issue**: Rules 6.2(a) and 6.2.2 describe destination modifications and fare recalculation, whereas Rules 6.2.1, 13.9, 13.10, 29.4 and Section 20 state that destination changes are unsupported after booking confirmation.
- **Status**: `recommended - provisional`
- **Approved Option**: **Option A (Not Supported Post-Confirmation)**
- **Details**: Destination modifications after driver acceptance are not supported in the UI or backend. Fixed cash fares and shared-ride segment mathematics require an immutable route. Unavoidable road closures or emergencies are handled exclusively via emergency early trip termination (Rule 6.2(b)).

---

### PI-04: Shared-Trip Fare Gaps & Calculation Model
- **Issue**: Policy Rule 6.1.4 charges additional fare only on exclusive excess kilometers at ₱1/km, failing to charge distance for the common route beyond 2 km and severely under-collecting driver earnings on long routes.
- **Status**: `pending my/adviser confirmation`
- **Candidate Model**: **Model B (Vehicle-Fare Proportional Pool Model)**, as currently implemented in `packages/shared/src/utils/fareCalculator.ts`.

#### Arithmetic Walkthrough for Model B (Scenario 5)
- **Scenario Parameters**:
  - Passenger A (1 pax) travels 5.0 km total: 2.0 km exclusive segment (before Passenger B boards), followed by 3.0 km common segment with Passenger B.
  - Passenger B (1 pax) boards at km 2.0 and travels 3.0 km common with Passenger A to the destination.
  - Tariff Parameters (City Ordinance No. 110, s. 2022): Base Fare = ₱15.00 (first 2.0 km), Succeeding Rate = ₱1.00/km, Tricycle Capacity = 4 seats.
- **Step 1: Total Route Vehicle Pool**:
  - Total vehicle distance = 5.0 km.
  - Base distance = 2.0 km; Excess distance = 5.0 km - 2.0 km = 3.0 km.
  - Core Seat Fare = ₱15.00 + (3.0 km × ₱1.00/km) = ₱18.00.
  - Total Vehicle Solo Pool = ₱18.00 × 4 seats = **₱72.00**.
- **Step 2: Segment 1 Breakdown (Exclusive to A, 2.0 km, 1 pax onboard)**:
  - Distance proportion = 2.0 km / 5.0 km = 0.40 (40% of route).
  - Passenger A onboard share = 1 pax / 1 total pax onboard = 1.0 (100%).
  - Segment 1 Cost for Booking A = 0.40 × ₱72.00 × 1.0 = **₱28.80**.
- **Step 3: Segment 2 Breakdown (Common to A & B, 3.0 km, 2 pax onboard)**:
  - Distance proportion = 3.0 km / 5.0 km = 0.60 (60% of route).
  - Passenger A onboard share = 1 pax / 2 total pax onboard = 0.50 (50%).
  - Passenger B onboard share = 1 pax / 2 total pax onboard = 0.50 (50%).
  - Segment 2 Cost for Booking A = 0.60 × ₱72.00 × 0.50 = **₱21.60**.
  - Segment 2 Cost for Booking B = 0.60 × ₱72.00 × 0.50 = **₱21.60**.
- **Step 4: Final Fare Aggregation & Rounding**:
  - **Booking A Final Fare**: ₱28.80 + ₱21.60 = ₱50.40 → rounds to **₱50.00**.
  - **Booking B Final Fare**: ₱21.60 → rounds to **₱22.00**.
  - **Total Driver Realized Earnings**: ₱50.40 + ₱21.60 = **₱72.00** (exactly guarantees the full 5.0 km vehicle solo pool).
  - **Minimum Fare Verification**: Both ₱50.00 and ₱22.00 exceed the mandatory municipal minimum base fare (₱15.00).

---

### PI-05: Stall Monitoring Rule vs. "Arrived" Phase
- **Issue**: Rule 8.3 imposes 2 strikes for stalling after arrival confirmation, whereas Rule 8.5 states stall detection applies only to the approach phase, handing off post-arrival waiting to the passenger no-show timer.
- **Status**: `recommended - provisional`
- **Approved Option**: **Option A (Approach Phase Only)**
- **Details**: Stall detection (<20 m movement within monitoring window) applies strictly while the driver is en route to pickup (1 strike). Once the driver marks arrival at the pickup point, behavior is governed by the 5-minute (+2 min one-time grace extension) passenger no-show timer (Section 10).

---

### PI-06: Pickup-Zone Radius & GPS Accuracy Gating
- **Issue**: Rule 10.1 sets 10 m, Rule 10.2 cites 5 m, and Rule 8.5 cites ~20 m. Real-world consumer mobile GPS accuracy ranges between 5–20 meters in Calapan.
- **Status**: `recommended - provisional`
- **Provisional Value**: **25 meters** (`PICKUP_ZONE_RADIUS_METERS = 25`), with dynamic compensation for device accuracy up to 40 m.
- **Note**: Provisional figure; will be benchmarked and finalized during Batch 8 implementation.

---

### PI-07: End-Trip Destination Gating Definition
- **Issue**: Rule 13.2 mentions destination arrival gating within 20 meters, but Section 16 never formally defines the geofence threshold or backend validation.
- **Status**: `recommended - provisional`
- **Provisional Value**: **30 meters** (`DESTINATION_GEOFENCE_RADIUS_METERS = 30`), unlocking "End Trip" only within this geofence or upon confirmed emergency early termination.
- **Note**: Provisional figure; will be benchmarked and finalized during Batch 9 implementation.

---

### PI-08: Passenger Fare Confirmation Indefinite Timeout Block
- **Issue**: Rules 18.2–18.3 block the driver from tapping "Payment Received" until passenger confirms fare or files a dispute, but provides no timeout if the passenger abandons the app.
- **Status**: `recommended - provisional`
- **Provisional Value**: **120 seconds (2 minutes)** (`FARE_CONFIRMATION_TIMEOUT_SECONDS = 120`).
- **Note**: Provisional figure; will be benchmarked and finalized during Batch 9 implementation.

---

### PI-09: Cross-Reference Errata & Undefined Penalties
- **Issue**: Typographical cross-references in policy text (Section 19 vs. 20, Rule 18.4 vs. 18.5, Rule 6.1 vs. 6.1.3, Rule 11 vs. 12, missing 13.1 label). Undefined strike counts for Rule 29.15 (passenger vehicle damage) and Rule 29.16 (passenger contamination).
- **Status**: `recommended - provisional`
- **Approved Option**: **Option A (Implement Obvious Intent)**
- **Details**: Apply corrections (a)–(f). Penalties for Rule 29.15 and Rule 29.16 will be proposed and reviewed in Batch 3.

---

### PI-10: Ride-Sharing Cutoff Comparator
- **Issue**: Rule 6.5 states matching continues while *less than 50%* of trip is completed; Rule 14.2 states *50% or less*; Rule 14.4 cites the *50% cutoff*.
- **Status**: `recommended - provisional`
- **Approved Option**: **Option A (Strictly Less Than 50%)**
- **Details**: `progress = (distance covered along route) / (total route distance) < 0.50`. Pairing closes when progress reaches or exceeds 50.0%.

---

### PI-11: Coverage Gap Definition
- **Issue**: Rule 7.10 defines a coverage gap as 5+ No Driver Found in a service zone within 24 h; Intelligent Driver Dispatch Section 18 triggers it when 5+ bookings from the same pickup barangay reach Tier 3 or end in No Driver Found within 24 h.
- **Status**: `recommended - provisional`
- **Approved Option**: **Option A (Dispatch Specification Definition)**
- **Details**: Analytics monitor bookings originating from the same pickup barangay that reach Tier 3 or end in "No Driver Found" within a rolling 24-hour window.

---

### PI-12: "No Driver Found" Termination Trigger & Maximum Wait Window
- **Issue**: Rules 7.4/7.5 declare "No Driver Found" as soon as eligible drivers decline/time out; dispatch spec keeps refreshing Tier 3 every 30 s up to a 10-minute maximum. Rule 12.8 adds that 3 consecutive accepted drivers cancelling ends the cycle.
- **Status**: `recommended - provisional`
- **Approved Option**: **Option A (Dispatch Specification + Rule 12.8)**
- **Details**: Dispatch executes Tier 1 (15 s) -> Tier 2 (15 s) -> Tier 3 periodic refresh every 30 s up to 10 minutes maximum, or terminates immediately if 3 consecutive accepted drivers cancel. Total worst-case passenger wait is 10 minutes 30 seconds.

---

## 2. Findings Routed to Batches (Architectural Debt & Gaps)

1. **Driver Offline State Persistence Bug** (`apps/driver-pwa/src/services/driverApiService.ts:338`):
   - *Finding*: `updateDriverAvailability` writes `'Online'` to Supabase `driver.availability_status`, whereas the schema and `DriverAvailabilityHome.tsx` query expect `'Available'`. On page navigation, profile re-fetch defaults `isOnline` to `false`.
   - *Routed to*: **Batch 4** (Driver Session Lifecycle & Availability).

2. **TODA Accreditation LocalStorage Overrides** (`apps/lgu-portal/src/services/adminApiService.ts:302-340`):
   - *Finding*: `TODA_STATUS_OVERRIDES_KEY` and `SAKAY_APPROVED_TODAS_KEY` use browser `localStorage` to simulate TODA approvals and bypass database RLS constraints.
   - *Routed to*: **Batch 1** (TODA & Driver Onboarding, Accreditation & Boundaries).

3. **Client-Side Disciplinary Enforcement** (`apps/driver-pwa/src/features/availability/components/DriverAvailabilityHome.tsx:174`):
   - *Finding*: Driver account suspension is checked only in the React UI (`driverData.account_status !== 'Active'`) without database-level RLS token revocation or session termination.
   - *Routed to*: **Batch 3** (Disciplinary Framework, Strikes, Suspensions & Review Flags).

4. **Payment Confirmation LocalStorage Side-Channel** (`apps/driver-pwa/src/features/trip-management/components/DriverActiveTrip.tsx:140-144`):
   - *Finding*: `payment_confirmed_${bookingId}` is polled from `localStorage` across tabs/windows rather than strictly observing authoritative database state transitions on `public.booking`.
   - *Routed to*: **Batch 9** (Trip Execution, Destination Gating, Payments & Receipts).

5. **Fragmented Audit Writers & In-Memory Shadow Arrays** (`apps/lgu-portal/src/lib/auditLog.ts`, `apps/toda-portal/src/lib/auditLog.ts`):
   - *Finding*: Portals maintain local in-memory arrays for audit logs that shadow real `public.audit_log` PostgreSQL rows and fail to record actor IDs and before/after state diffs.
   - *Routed to*: **Batch 12** (Ratings, Feedback, System Audit Logging & Analytics).

6. **Browser-Side Client Dispatch Loop** (`apps/passenger-pwa/src/services/dispatchService.ts:13-295`):
   - *Finding*: The entire sequential tiered dispatch engine runs inside the passenger's browser context via `setTimeout` and client Supabase queries, risking failure if the passenger closes or backgrounds the PWA.
   - *Routed to*: **Batch 6** (Intelligent Driver Dispatch & Assignment - migration to backend/RPC).

7. **Driver Rating Formula Discrepancy** (`database.ts:88`, `supabase/migrations/20260927000000_fix_database_advisor_and_rls.sql:226`):
   - *Finding*: Code uses `weighted_average_rating`, whereas Rule 23.1 requires a plain arithmetic mean over all completed trip ratings.
   - *Routed to*: **Batch 12** (Ratings, Feedback, System Audit Logging & Analytics).

8. **Scattered Hard-Coded Policy Timers Pending Owning-Batch Migration**:
   - *Finding*: Hard-coded copies of the 15 s offer window, 5 s GPS interval, and 5-minute OTP TTL remain in call sites and must be switched to the central config in their respective owning batches:
     - `server/src/services/smsService.ts:10` (5-minute OTP TTL) -> switch to central config in **Batch 2**.
     - `apps/driver-pwa/src/contexts/DriverSessionContext.tsx:73` (15 s countdown) & `apps/driver-pwa/src/features/trip-management/components/DriverActiveTrip.tsx:205` (5 s GPS interval) -> switch to central config in **Batch 4**.
     - `apps/passenger-pwa/src/services/dispatchService.ts:117` (15 s offer window) -> switch to central config in **Batch 6**.
   - *Routed to*: **Batches 2, 4, and 6**.

---

## 3. PROPOSED Canonical Status Vocabulary (For User Approval)

### A. Canonical Booking Status State Machine
```
[Pending]
   │
   ▼
[Searching Driver] ───────────────► [No Driver Found] (All tiers exhausted / timed out)
   │
   ▼
[Driver Assigned] ────────────────► [Cancelled] (By Passenger or Driver before arrival)
   │
   ▼
[Driver En Route] ────────────────► [Cancelled] (By Passenger or Driver en route)
   │
   ▼
[Driver Arrived] (Starts 5-min no-show timer) ──► [Cancelled] (Passenger No-Show)
   │
   ▼
[Passenger Boarded]
   │
   ▼
[Trip Ongoing] ───────────────────► [Cancelled] (Emergency / Force Majeure Termination)
   │
   ▼
[Arrived at Destination] (Gated by destination geofence)
   │
   ▼
[Completed] (Payment confirmed, receipt issued)
```

**Proposed Canonical Status Strings** (`booking_status` column):
1. `'Pending'`: Initial booking reservation created by passenger.
2. `'Searching Driver'`: Active dispatch algorithm currently offering to candidate drivers.
3. `'Driver Assigned'`: Driver accepted offer; awaiting vehicle departure.
4. `'Driver En Route'`: Driver actively traveling to passenger pickup location.
5. `'Driver Arrived'`: Driver within pickup geofence; 5-minute passenger countdown active.
6. `'Passenger Boarded'`: Passenger verified and seated in tricycle.
7. `'Trip Ongoing'`: Vehicle in transit along confirmed route to destination.
8. `'Arrived at Destination'`: Tricycle confirmed within destination geofence; awaiting payment.
9. `'Completed'`: Cash payment received and verified; digital trip receipt archived.
10. `'Cancelled'`: Trip terminated before completion (accompanied by `cancelled_by` and `cancellation_reason`).
11. `'No Driver Found'`: Dispatch exhausted all tiers without driver acceptance.

*(Eliminates ambiguous aliases: `'Accepted'`, `'In Transit'`, `'Arrived at Pickup'`)*.

### B. Canonical Driver Availability State Machine
```
[Offline] ◄─────────────────────────► [Available]
                                          │
                                          ▼
                                       [Busy] (Automatically assigned during active trip)
```

**Proposed Canonical Availability Strings** (`driver.availability_status` column):
1. `'Offline'`: Driver not logged in or toggled off; ineligible for dispatch offers; background telemetry paused.
2. `'Available'`: Driver online, verified, idle or cruising; actively eligible for dispatch matching.
3. `'Busy'`: Driver currently assigned to an accepted booking or executing an active trip.

*(Eliminates non-canonical `'Online'` and `'Paused'` strings from database mutations)*.

---

## 3. Batch 1 Architectural Decisions & Policy Clarifications

### PI-01 (Approved Option C - Temporary Testing Variant): Calapan City Service Area Boundary Gate
- **Decision**: Implement a database-backed booking-creation boundary gate (`public.service_area_config`) enforced server-side before booking insertion (`check_booking_service_area_gate`).
- **Temporary Scope**: For development and acceptance testing, the allowed service area is set to all of Calapan City using a center point at Calapan City Hall (Latitude: `13.4115° N`, Longitude: `121.1803° E`) with an interim testing radius of `16.0 km`.
- **Geographic Coverage & Municipality Boundaries**:
  - Real-world verification confirms this 16 km circle encompasses all 62 Calapan City mainland barangays.
  - However, because municipal boundaries are irregular polygons, this circular radius also temporarily overlaps with portions of neighbouring municipalities (e.g., Baco Poblacion is located at ~`13.3586° N, 121.0983° E`, approximately `10.64 km` from Calapan City Hall, well within the 16 km circle).
- **Enforcement**: Pickups outside this radius are blocked server-side and trigger Tagalog error: *"Ang iyong lokasyon ng pagsakay ay nasa labas ng opisyal na nasasakupan ng SAKAY (Calapan City Service Area)."*
- **Pilot Narrowing Path**: The architecture allows instant narrowing to pilot barangay / terminal radius without code changes using `set_pilot_service_area(p_toda_id, p_radius_km)`.
- **Data Note**: The official **Xentro Mall TODA** record does not exist yet in `public.toda` (Calapan Central TODA / CCTODA is currently seeded). Once Xentro Mall TODA is accredited by the LGU, its DB-stored terminal coordinates will seed the pilot narrowing radius.

### PI-13: Documentary Restriction Scope & Expiry Cascade (Rules 24.1 – 24.5)
- **Decision**: Driver eligibility to accept dispatches and enter `Available` status is strictly gated by credential validity (Driver's License, MTOP Franchise, and TODA Accreditation Certificate).
- **Asia/Manila Date Authority**: Expirations are evaluated strictly against calendar date in `Asia/Manila` timezone (`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Manila')::DATE`).
- **Non-Punitive Restriction**: Expired credentials trigger immediate documentary restriction (cannot go `Available`), but do NOT change `driver.account_status` (driver remains `Verified`), and record zero (0) disciplinary strikes.
- **Active Trip Safety**: If a credential expires while a driver is executing an active trip (`availability_status = 'Busy'`), the driver is permitted to finish the trip safely. The scheduled runner or availability transition forces the driver `Offline` once the vehicle returns to `Available`.
- **Secure Renewal Path (Rule 24.2)**: Drivers cannot edit authoritative expiry columns. Document renewals are submitted to pending staging columns in `driver_verification` (`submit_driver_renewal`), requiring future calendar dates, and become authoritative only after LGU Administrator review (`verify_driver_renewal`).
- **Multi-Affiliation Accreditation Cascade (Rule 24.3)**: If a TODA's accreditation certificate expires, all drivers whose active selection points to that TODA are documentarily restricted from going online. Drivers affiliated with multiple TODAs can switch their active selection to another accredited, unexpired TODA while `Offline`.

### PI-14: Two-Stage Application Resubmission Resume Point (Decision A)
- **Decision**: When a driver resubmits an application returned for corrections:
  - If the application was returned at the **LGU verification stage** (`lgu_verification_status = 'Resubmission Required'`), it resumes at the LGU stage. The TODA endorsement remains intact (`toda_endorsement_status = 'Endorsed'`), and `lgu_verification_status` is reset to `'Pending'`.
  - If the application was returned at the **TODA screening stage** (`toda_endorsement_status = 'Resubmission Required'`), it resumes at the TODA stage (`toda_endorsement_status = 'Submitted'`).
  - In both cases, the 5-calendar-day review clock restarts (`resubmitted_at = CURRENT_TIMESTAMP`).

---

## 4. Open Policy Questions

### Open Question 1: Post-Rejection Driver Affiliation Rules (Rule 3.9)
- **Question**: When a driver's affiliation application to a specific TODA is rejected for ineligibility or fraud (Rule 3.8), is the driver barred from applying to other TODAs, or is the rejection specific only to that TODA?
- **Status**: `Open / Pending Policy Owner Determination`
- **Current Batch 1 Implementation**:
  - Rejection grounds are strictly limited to `ineligible` or `fraudulent` (document errors must use Return/Resubmission).
  - The policy text does not specify whether a driver rejected by one TODA may apply to another.
  - In Batch 1, re-application after rejection requires an audited administrative action (`allow_driver_reapplication(p_affiliation_id, p_reason)`) by the TODA or LGU administrator.
  - Permanently disqualified drivers (`is_permanently_disqualified = TRUE`, Rule 3.9) are globally disqualified from all TODAs and can never be cleared by `allow_driver_reapplication`.

