# SAKAY Policy Compliance Matrix

This document tracks system-wide compliance against *Appendix B - Operational Policies and Business Rules* for the SAKAY ride-hailing platform (Calapan City, Oriental Mindoro).

---

## 1. Compliance Status Legend

- **`[OK]`**: Implemented AND verified by reading the authoritative code path (cite exact file path, function/component name, line range, and enforcement logic).
- **`[PARTIAL]`**: Exists but incomplete, incorrect, UI-only, client-side only, or non-authoritative (state what is missing).
- **`[MISSING]`**: Not implemented anywhere in the repository.
- **`[CONFLICT]`**: Implemented differently from the policy, or two implementations/specifications disagree.
- **`[UNKNOWN]`**: Cannot be determined from the repository.

---

## 2. Batch Policy Section Ownership Map

| Batch | Focus & Scope | Policy Sections & Specific Rules Owned |
|---|---|---|
| **Batch 0** | **Foundation**: repository map, single sources of truth, central policy config, compliance tracking | Central configuration architecture, Section 1 Definitions initial audit, single source of truth mappings |
| **Batch 1** | **TODA & Driver Onboarding, Accreditation & Boundaries** | Sections 2, 3, 24 |
| **Batch 2** | **Passenger Registration & Account Management** | Section 4, Rule 29.1 |
| **Batch 3** | **Disciplinary Framework, Strikes, Suspensions & Review Flags** | Section 1 (disciplinary terms), Sections 20, 21, 22, 25, shared admin-review-flag mechanism |
| **Batch 4** | **Driver Session Lifecycle, Availability & Online Persistence** | Section 5, Rules 3.1, 3.10, 7.6–7.8, 17.6–17.8, 29.7, 29.18, driver online-state persistence bug |
| **Batch 5** | **Fare Matrix & Municipal Tariff Enforcement** | Section 6, Rule 14.7 |
| **Batch 6** | **Intelligent Driver Dispatch & Assignment** | Section 7, Rule 12.8, Intelligent Driver Dispatch Specification (Tiers 1–3) |
| **Batch 7** | **Stall Monitoring, Approach Phase & Driver Telemetry** | Sections 8, 9, 17 (except 17.6–17.8), Rules 29.2, 29.10, 29.11 |
| **Batch 8** | **Passenger Arrival, No-Show Gating & Cancellations** | Sections 10, 11, 12, Rules 29.8, 29.9 |
| **Batch 9** | **Trip Execution, Destination Gating, Payments & Receipts** | Sections 13, 16, 18, Rules 29.3–29.5 |
| **Batch 10** | **Ride-Sharing Pairing, Capacity & Segments** | Section 14, Rules 6.5, 12.5, 29.17 |
| **Batch 11** | **Incident Reporting, Safety & Disciplinary Violations** | Sections 15, 19, 26, Rules 29.6, 29.12–29.16, 29.19–29.23 |
| **Batch 12** | **Ratings, Feedback, System Audit Logging & Analytics** | Sections 23, 27, 28 |
| **Batch 13** | **End-to-End System Verification & Release Audit** | Complete multi-role trace across Passenger PWA, Driver PWA, TODA Portal, and LGU Portal |

---

## 3. Section 1 Policy Rules & Batch 0 Baseline Matrix

| Rule No. | Requirement / Description | Status | Evidence (File, Component/Function, Lines) | Enforcement Detail & Gap | Batch Owner & Verification |
|---|---|---|---|---|---|
| **Sec 1.1** | **Strike**: Disciplinary violation point issued against accounts; accumulates in rolling 90-day window; distinct from rating. | `[PARTIAL]` | `supabase/migrations/20260927010000_portal_fixes_phase1.sql:189-195` | Columns `strikes_count` exist on `driver` and `passenger`. Missing: violation log table, timestamped events, 90-day rolling expiration job. | Batch 3 |
| **Sec 1.2** | **Violation**: Confirmed breach of platform rules, system-detected or reported via upheld incident report. | `[PARTIAL]` | `supabase_schema.sql:647-663`, `incident_report` table | Incidents exist, but automated system violations (stalls, off-route) and linkage from upheld incidents to strikes are missing. | Batch 3 / Batch 11 |
| **Sec 1.3** | **Warning**: Non-punitive in-app notice; does not restrict account access. | `[PARTIAL]` | `supabase_schema.sql:664-675`, `notification` table with type `'Policy'` | Notifications exist visually, but no formal Warning tracking entity exists in the database. | Batch 3 |
| **Sec 1.4** | **Suspension**: Temporary block on login/dispatch for fixed period; auto-lifted upon expiration. | `[PARTIAL]` | `supabase/migrations/20260927010000_portal_fixes_phase1.sql:191-197`, columns `suspended_at`, `suspension_reason` | DB columns exist; client checks `accountStatus !== 'Active'`. Missing: auto-lift scheduled job and database-level RLS token blocking. | Batch 3 |
| **Sec 1.5** | **Deactivation**: Indefinite account freeze requiring manual TODA/LGU review. | `[PARTIAL]` | `packages/shared/src/types/database.ts:86`, `apps/lgu-portal/src/services/adminApiService.ts:1010-1025` | UI actions exist, but database-level auth trigger and RLS session blocking need hardening. | Batch 1 / Batch 3 |
| **Sec 1.6** | **No Driver Found**: Dispatch outcome where all eligible drivers decline, time out, or none are available. | `[PARTIAL]` | `apps/passenger-pwa/src/services/dispatchService.ts:284-289`, `apps/passenger-pwa/src/features/trip-monitoring/components/TripMonitoring.tsx:55` | Implemented in client dispatch loop, but runs in browser rather than authoritative backend RPC. Downgraded pending Batch 6. | Batch 6 |
| **Sec 1.7** | **Exemption**: Waiver of strike/penalty after review for verified external cause. | `[MISSING]` | None | No exemption schema, API endpoint, or UI modal exists in the codebase. | Batch 3 |
| **Sec 1.8** | **Stall**: Driver accepted booking but shows <20 m movement within monitoring window. | `[MISSING]` | None | No position delta comparison or stall detection routine exists in driver tracking. | Batch 7 |
| **Sec 1.9** | **Ghost Booking**: Booking abandoned by either party without formal cancellation. | `[MISSING]` | None | No heartbeat detection or stale booking reaper exists. | Batch 8 |
| **Sec 1.10** | **Force Majeure**: Unforeseeable external event waiving cancellation/dispatch penalties. | `[MISSING]` | None | No emergency declaration state, banner, or penalty waiver toggle exists. | Batch 11 |
| **Sec 1.11** | **Coverage Gap**: Recurring condition where a barangay experiences insufficient available drivers (5+ No Driver Found in 24 h). | `[MISSING]` | None | No analytics aggregation query or reporting UI exists. | Batch 6 / Batch 12 |
| **Sec 1.12** | **Verified Driver**: Driver whose identity, Driver's License, MTOP, TODA affiliation, and LGU approval have all been validated. | `[PARTIAL]` | `apps/toda-portal/src/services/todaApiService.ts:909-954`, `apps/lgu-portal/src/services/adminApiService.ts:973-1005` | Two-stage approval workflow exists in portals (TODA endorsement + LGU approval); RLS enforcement and credential validation require re-audit. | Batch 1 |
| **Sec 1.13** | **Mobile-Verified Passenger**: Completed OTP verification; active account status; mobile number control confirmed. | `[PARTIAL]` | `server/src/routes/authRoutes.ts:38-125`, `supabase/migrations/20260917000000_allow_otp_activation_passenger.sql:67` | OTP verification activates passenger, but edge cases and token issuance require Batch 2 re-audit. | Batch 2 |
| **Sec 1.14** | **Administrative Override**: Manual action by authorized TODA/LGU Admin superseding platform decision; recorded in `audit_log`. | `[PARTIAL]` | `apps/lgu-portal/src/services/adminApiService.ts:1596-1616`, `apps/toda-portal/src/services/todaApiService.ts:1295-1315` | Writes to `audit_log`, but does not link to specific booking override records or store before/after state diffs. | Batch 12 |

---

## 4. Conflict Register (Identified in Batch 0)

| Conflict ID | Concept | Current Code Implementation | Policy / Specification Requirement | One-Line Explanation & Batch Owner |
|---|---|---|---|---|
| **CONF-01** | **Dispatch Tiers & Search Radii** | `apps/passenger-pwa/src/services/dispatchService.ts:185-230`: Tier 1 = 1.5 km (TODA) / 0.8 km (vicinity); Tier 2 = 2.5 km; Tier 3 = [3.5, 5.0, 7.5, 12.0] km | Intelligent Driver Dispatch Spec (Section 17): Tier 1 = 600 m Priority TODA; Tier 2 = 2.0 km; Tier 3 = 2.0–3.5 km dynamic search | Current code radii are significantly larger than the official dispatch spec; left untouched in Batch 0 (Batch 6). |
| **CONF-02** | **Distance & ETA Fallback Formulas** | `packages/shared/src/utils/locationUtils.ts:83-85`: straight-line distance × 1.3 winding factor; duration at fixed 20 km/h | Capstone Specification: OSRM driving distance and duration are primary; fallbacks must be strictly calibrated to Calapan road network | Fallback road multipliers approximate distance rather than using calibrated road network geometry; left untouched in Batch 0 (Batch 6). |
| **CONF-03** | **Driver Availability Status Enum** | `driverApiService.ts:338` writes `'Online'`, while `driver.availability_status` in Supabase and `database.ts:87` expects `'Available'` | Section 5 & Driver Lifecycle: single canonical status vocabulary (`Offline`, `Available`, `Busy`) | `driverApiService` writes non-standard `'Online'` to `availability_status` while DB and UI expect `'Available'`, resetting drivers to offline on page navigation (Batch 4). |
| **CONF-04** | **Booking Status Enum Duplication** | `booking.ts:29-41` has 12 statuses (`Accepted`, `In Transit`, `Arrived at Pickup`), while `database.ts:161` has 10 statuses (`Driver Assigned`, `Driver En Route`, `Driver Arrived`) | Sections 7, 8, 9, 13: unified state machine across database and UI | `booking.ts` and `database.ts` define disjoint status enums, causing frontend aliases to shadow authoritative database state transitions (Batch 6/8/9). |
