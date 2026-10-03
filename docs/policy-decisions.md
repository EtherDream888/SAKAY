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


---

## 5. Batch 3 Decisions (Strikes, Suspension, Deactivation, Exemption, Review Flags)

Approved by the project owner when Phase B was started.

| Ref | Decision |
|---|---|
| **D1 / F3.4 / F3.7** | Exemption request window and provisional-strike waiver window are **72 hours** (policy text: 48). One constant for both (`strike_policy_constant('exemption_window_hours')`). |
| **D2 / F3.8** | Previously undefined counts: booking abuse (12.9) **2**, vehicle damage (29.15) **3**, contamination (29.16) **1**, availability violation (5.7) **1**, intentional pickup deviation (8.7) **1** (issued on the 2nd occurrence within 30 days, PI-B3). |
| **D3** | Existing strike counts reset to 0; old test data is not migrated. Suspensions created by the old 3-strike logic ("Automated platform suspension: …") are lifted with the counts; manual suspensions are kept as open-ended and must be reinstated by an administrator. |
| **D5** | The unauthenticated Express strike / suspend / reactivate routes (`server/src/routes/passengerRoutes.ts`, `driverRoutes.ts`) return **403**. |
| **D6** | Ladder thresholds, window and deadlines are code constants in the database (`strike_policy_constant`) mirrored in `packages/shared/src/config/policyConfig.ts` for display. The pause switch is database state in `system_policy_config.strike_accrual_paused`. |
| **F3.3 override** | Suspension lengths: **3 days at 5 strikes, 7 days at 8 strikes** (policy text: 7 and 30). Ladder otherwise as written: 1 warning, 3 administrative review, 10 deactivation. |
| **PI-09** | Option A: errata (a)–(f) applied by intent; counts for (g)–(h) per D2. The Batch 2 `issue_booking_abuse_strike` function, its trigger and the `strike_count` / `last_strike_at` / `is_suspended` passenger columns are removed. |
| **PI-B1** | A consequence fires on each *upward* crossing of a threshold; one strike that crosses several applies the highest and still raises the 3-strike review. A reinstated account still at/over 10 is deactivated again on its next strike. |
| **PI-B2** | Repeated exemption cause (25.7): the 3rd request on the same cause within 30 days is **reviewed**; the 4th and later are denied automatically. |
| **PI-B3** | "Repeated" = the 2nd confirmed occurrence of the same violation within 30 days; the strike is issued on the 2nd and each later one. |
| **PI-B4** | A 10-strike deactivation is reviewed by the **LGU** Administrator; the TODA Administrator can recommend through a review flag. |
| **PI-B5** | The driver's active TODA is snapshotted on each strike and exemption request; that TODA's administrator reviews it. |
| **PI-B6** | Immediate-escalation violations suspend the account **with no end date** ("pending investigation") until an administrator decides. |
| **PI-B7** | The emergency pause carries a scope (`ALL` or `CANCEL_STALL_NOSHOW`); serious and safety violations are never pausable. |
| **PI-B8** | A waiver or void that removes the basis for an *active ladder suspension* lifts it, and dismisses the open 3-strike review. Deactivation is never lifted automatically. |
| **PI-B9** | A driver can state that the TODA is a party to the dispute; the TODA administrator can also escalate with a reason. |

### Assumptions to confirm
- `DRV_FABRICATED_REPORT` (a driver's fabricated report against a passenger) is seeded at **2 strikes**, mirroring the passenger rule 19.5. The Batch 3 policy text only states the passenger count.
- Business days are Monday–Friday in Asia/Manila with **no holiday calendar** in this version.
- Suspension of a driver does not interrupt an active trip; the driver is forced offline when it ends.

### Findings routed to other batches
- **Batch 8:** the PI-09 cancellation trigger tests the booking statuses `Assigned` / `Ongoing`, which no app code writes (apps write `Accepted`, `In Transit`, `Trip Ongoing` …). It does not fire today; Batch 8 owns the definition of a "late" cancellation (12.2) and must align the statuses. The Batch 2 one-open-booking guard (`check_one_open_booking`) tests the same two names and therefore also misses accepted / in-transit bookings.
- **Batch 2:** `apps/passenger-pwa/src/services/bookingService.ts` (~lines 132-147) falls back to "the first passenger in the table" when no valid passenger id is available, so a booking (and any strike it later causes) can be attributed to the wrong person. Hard-coded test logins in `Login.tsx` and `DriverLogin.tsx` bypass the suspension checks and should be removed or gated.
- **Batch 0/1 (fixed after Batch 3):** migration `20260927000000_fix_database_advisor_and_rls.sql` created `toda` policies and `check_toda_is_active` using `account_status`, a column `20260828000003` renamed to `toda_status`, so the chain failed on a fresh database. The file now uses `toda_status`; the full chain applies unpatched (`scripts/db-tests`). The live project already has this migration recorded as applied, so it is unaffected.
- **Batch 1 (fixed after Batch 3):** `POST /api/admin/drivers/:id/verify` had no authentication and wrote `account_status = 'Verified'` with the service-role key. Nothing calls it (the LGU portal uses `verify_driver_affiliation`), so it now returns 403 like the strike/suspend routes, as do the in-memory `POST /api/toda/drivers/:id/suspend` and `/reactivate`.
- **Still open (not changed):** other server routes that mutate data have no authentication: `POST /api/communication/send-sms` (sends real SMS), `/api/toda/:id/approve|return-correction|reject|decline|register`, `/api/toda/applicants/:id/verify-step|forward`, `/api/toda/terminal-relocation`, `/api/admin/fare-matrix`, `/api/admin/announcements`, `/api/admin/audit-logs`, `PATCH /api/admin/incidents/:id/status`, `/api/admin/todas/:id/roster`, and the OCR routes. The LGU and TODA portals call several of them, so they need a verified-JWT middleware rather than a 403.

### Live database state (checked read-only before Batch 3 was committed)
- The live Supabase project's `supabase_migrations.schema_migrations` records migrations only through `20260927020000`.
- **`20260930080000_batch1_onboarding_and_expiry.sql` (Batch 1) is NOT applied on live** (`admin_review_flag`, `system_policy_config`, `driver_toda_affiliation`, the `audit_log` extension columns and `is_driver_documentarily_restricted` are missing). The Batch 3 migrations depend on it and cannot be applied until it is.
- The Batch 2 files (`20261003000001-6`) are present in the database (applied by `scripts/applyBatch2Migrations.js`) but are not recorded in the history table, so `supabase db push` would try to run them again.
- Do not deploy the Batch 3 application code before the database is caught up: the LGU suspend/strike actions, the TODA recommendation and the new restriction checks call functions that do not exist on live yet (the restriction checks fall back gracefully; the LGU and TODA actions show an error).
- **Open for a later batch:** no LGU screen for the emergency pause or the exemption queue; no driver/passenger exemption request forms; TODA review-flag list.
