# SAKAY Passenger & Driver PWA Audit Report

**Date**: August 16, 2026  
**Auditor**: Antigravity AI Assistant  
**Target Monorepo Workspaces**: `apps/passenger-pwa` (Port `5173`) & `apps/driver-pwa` (Port `5174`/Port `5176`)  
**Reference Specifications**: Table 10.4 (*Passenger Functional Scope*), Table 10.5 (*Driver Functional Scope*), Table 10.6 (*Intelligent Driver Dispatch & Matching*)  
**Operating Mode**: Read-Only Audit & Inventory

---

## 1. Passenger Module — Full Feature Checklist (Table 10.4, 7 Features)

| # | Feature (Table 10.4) | Target Route | Page Component & File Reference | Navigation Reachable | UI Pattern & Real Behavior | Status |
|---|---|---|---|---|---|---|
| **1** | **Account Management** | `/`, `/splash`, `/account-selection`, `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password`, `/profile` | [`Splash.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/account-management/components/Splash/Splash.tsx)<br>[`AccountSelection.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/account-management/components/AccountSelection/AccountSelection.tsx)<br>[`Login.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/account-management/components/Login/Login.tsx)<br>[`Register.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/account-management/components/Register/Register.tsx)<br>[`VerifyOtp.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/account-management/components/VerifyOtp/VerifyOtp.tsx)<br>[`ProfileEditor.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/account-management/components/ProfileEditor/ProfileEditor.tsx) | Yes (Entry flow + Header Navigation Drawer) | • Splash branding animation.<br>• Dual role selector (Passenger vs Driver).<br>• Login via phone/email & password.<br>• Registration with phone formatting (+63).<br>• 6-digit OTP verification with timer.<br>• Password recovery via OTP.<br>• Profile editor for name, phone, residential address, and profile photo. | **Implemented & Fully Wired** |
| **2** | **Ride Booking** | `/dashboard`, `/location-permission`, `/new-trip`, `/set-place`, `/book-summary` | [`Dashboard.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/Dashboard/Dashboard.tsx)<br>[`LocationPermission.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/LocationPermission/LocationPermission.tsx)<br>[`NewTrip.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/NewTrip/NewTrip.tsx)<br>[`SetPlace.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/SetPlace/SetPlace.tsx)<br>[`BookSummary.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/BookSummary/BookSummary.tsx) | Yes (Home screen bottom sheet & drawer) | • Interactive Google Map canvas with GPS recenter button.<br>• Location permission request flow.<br>• "Saan ka pupunta?" destination search with recent places.<br>• Map pin dropping on `/set-place`.<br>• OSRM driving distance calculation with Haversine fallback.<br>• Seat fare formula (₱15 base + ₱1/km).<br>• Solo (Seat × 4) vs Shared fare.<br>• Booking confirmation with Supabase insert / sandbox success modal. | **Implemented & Fully Wired** |
| **3** | **Ride Sharing** | Integrated in `/new-trip` & `/book-summary` | [`NewTrip.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/NewTrip/NewTrip.tsx)<br>[`BookSummary.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/BookSummary/BookSummary.tsx)<br>*(Folder [`src/features/ride-sharing/`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-sharing) is empty)* | Yes | • Passenger can select "Shared" mode in trip configuration.<br>• Shared fare computes single-seat price (`computedSeatFare`) instead of 4-seat solo charter multiplier.<br>• Immediate dispatch is triggered upon confirmation.<br>• **Gap**: Max 2 paired bookings / 4 combined passenger constraint is not enforced in UI.<br>• **Gap**: No post-trip proportionate fare reconciliation view. | **Partially Implemented** |
| **4** | **Trip Monitoring** | *None* | Empty folder: [`src/features/trip-monitoring/`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/trip-monitoring) | No route wired in `App.tsx` | • No active trip tracking screen exists.<br>• Once booking succeeds on `/book-summary`, the success modal navigates back to `/dashboard`.<br>• Live driver location marker, driver photo, franchise number, trip progress bar, and ETA countdown are **not rendered**. | **Missing / Not Present** |
| **5** | **Passenger Feedback** | *None* | Empty folder: [`src/features/feedback/`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/feedback) | No route wired in `App.tsx` | • No post-trip star rating or written review submission screen.<br>• No interface to view previously submitted driver ratings. | **Missing / Not Present** |
| **6** | **Incident Reporting** | *None* (Partial Hotline list in `TulongDialog`) | Empty folder: [`src/features/incident-reporting/`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/incident-reporting)<br>[`TulongDialog.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/Dashboard/TulongDialog.tsx) | Partial dialog on Dashboard | • `TulongDialog` provides clickable phone hotlines for PNP, CDRRMO, and City Health.<br>• **Gap**: No incident reporting form (selecting incident type, text description, photo evidence upload, or LGU complaint tracking status). | **Missing / Not Present** |
| **7** | **Trip History** | `/history` | [`PassengerHistory.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/trip-history/components/PassengerHistory.tsx)<br>[`tripService.ts`](file:///C:/SAKAY/client/apps/passenger-pwa/src/services/tripService.ts) | Yes (Navigation Drawer → *Kasaysayan / History*) | • Lists completed passenger trips grouped by date (*"NGAYONG ARAW"* vs *"NAKARAANG ARAW"*).<br>• Trip details dialog displays pickup/dropoff addresses, driver name, TODA body number, fare price, and trip mode (`Solo` / `Share`).<br>• **Rebook Feature**: Clicking "Rebook" pre-populates pickup/dropoff into `sessionStorage` and navigates to `/new-trip`. | **Implemented & Fully Wired** |

---

## 2. Driver Module — Full Feature Checklist (Table 10.5, 9 Features)

| # | Feature (Table 10.5) | Target Route | Component / File Location | Reachable | Real Behavior / Current State | Status |
|---|---|---|---|---|---|---|
| **1** | **Account Management** | `/driver/register`, `/driver/profile` | *None* (Only driver registration fields exist in [`Register.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/account-management/components/Register/Register.tsx)) | No | Driver document upload (Driver's License, MTOP franchise, tricycle photo) and verification status monitoring screens do not exist. | **Missing / Not Present** |
| **2** | **Availability Management** | `/driver/availability` | *None* | No | No screen to select active TODA affiliation, select verified tricycle unit, toggle online/offline, or pause/resume dispatch. | **Missing / Not Present** |
| **3** | **Booking Management** | `/driver/requests` | *None* | No | No booking dispatch pop-up, request accept/decline buttons, or passenger trip card. | **Missing / Not Present** |
| **4** | **Navigation & Route Assistance** | `/driver/navigation` | *None* | No | No turn-by-turn or route guidance screen to pickup/dropoff with ETA. | **Missing / Not Present** |
| **5** | **Trip Management** | `/driver/active-trip` | *None* | No | No "Start Trip on Pickup", "Complete Trip", or mid-trip Additional Shared Passenger prompt. | **Missing / Not Present** |
| **6** | **Recorded Trip Fare Summary** | `/driver/earnings` | *None* | No | No post-trip fare breakdown or daily/weekly earnings totalizer. | **Missing / Not Present** |
| **7** | **Communication** | `/driver/chat` | *None* | No | No in-app SMS templates or one-touch passenger phone dialer. | **Missing / Not Present** |
| **8** | **Notification** | `/driver/notifications` | *None* | No | No dispatch alerts, strike warnings, or TODA announcement feed. | **Missing / Not Present** |
| **9** | **Trip History** | `/driver/history` | *None* | No | No driver completed trips ledger. | **Missing / Not Present** |

> **Driver PWA Scaffold Finding**: `apps/driver-pwa` currently consists solely of a bare `package.json` file. It lacks `tsconfig.json`, `index.html`, `vite.config.ts`, and a `src/` directory.

---

## 3. Cross-Module Data Flow & Dispatch Architecture

### Current Connectivity Finding: **Two Disconnected States (Independent Prototype & Unbuilt Scaffold)**

```
┌──────────────────────────────────────────────┐          ┌──────────────────────────────────────────────┐
│            PASSENGER PWA (Port 5173)         │          │             DRIVER PWA (Unbuilt)             │
│                                              │          │                                              │
│  [New Trip] ──> [Set Place] ──> [BookSummary]│          │  (No workspace src/ or UI exists)            │
│       │                                │     │          │                                              │
│       ▼                                ▼     │          │                                              │
│  (sessionStorage)            (Supabase insert│          │                                              │
│                               or sandbox)    │          │                                              │
│                                              │          │                                              │
│  * After booking: modal closes to /dashboard │          │                                              │
│  * No Trip Monitoring screen                 │          │                                              │
└──────────────────────────────────────────────┘          └──────────────────────────────────────────────┘
```

1. **Booking Creation to Driver Dispatch**:
   - In `apps/passenger-pwa`, [`BookSummary.tsx:187-201`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/BookSummary/BookSummary.tsx#L187-L201) writes a record to Supabase's `booking` table with `booking_status: 'Searching Driver'`. If offline or unauthenticated, it falls back to a sandbox timer and shows a success dialog.
   - However, because `apps/driver-pwa` is unbuilt, **no driver receives or observes this booking**.
2. **Intelligent Driver Dispatch Logic (Table 10.6)**:
   - **Not Present**. Neither a backend edge function nor a shared client-side mock dispatch broker exists to filter eligible online drivers by TODA accreditation, rank by ETA, or handle auto re-routing on decline.
3. **Driver Acceptance & Trip Lifecycle State Sync**:
   - **Not Present**. When a booking is created, Passenger PWA navigates to `/dashboard` without an active subscription or polling loop to track driver assignment (`Driver Assigned` → `Driver En Route` → `Trip Ongoing` → `Completed`).
4. **Fare Calculation Formula Consistency**:
   - **Consistent in Code**: In `BookSummary.tsx:140-149`, fare calculation adheres to the official municipal tariff:
     $$\text{Seat Fare} = \text{Base Fare (₱15.00)} + \max(0, \text{Distance} - 2.0\text{ km}) \times ₱1.00/\text{km}$$
     $$\text{Solo Fare} = \text{Seat Fare} \times 4$$
     $$\text{Shared Fare (1 Passenger)} = \text{Seat Fare} \times 1$$
   - This formula exactly matches the tariff parameters configured in `apps/admin-portal`'s Fare Configuration matrix and `apps/toda-portal`'s service parameters.

---

## 4. Business Logic Re-Check

| Business Rule / Requirement | Status | File Reference | Assessment & Behavior Details |
|---|---|---|---|
| **Single Open Booking Constraint** | **Partially Implemented** | [`BookSummary.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/BookSummary/BookSummary.tsx) | Database schema enforces `idx_single_active_booking`, but the Passenger UI clears `sessionStorage` and returns to `/dashboard` without maintaining an active booking lock. |
| **Immediate Shared Dispatch (No Waiting Room)** | **Implemented** | [`BookSummary.tsx:189-201`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/BookSummary/BookSummary.tsx#L189-L201) | Selecting "Shared" dispatches the ride immediately with `is_shared_trip: true` without blocking on a second passenger. |
| **Driver Availability Dual-Gate Lock** | **Not Present** | *Driver PWA Unbuilt* | Requirement that driver must select an active TODA affiliation AND verified tricycle unit before going online is not yet implemented. |
| **Driver Decline Auto Re-routing** | **Not Present** | *Driver PWA Unbuilt* | Auto re-routing to next eligible driver on decline is not yet implemented. |
| **Mid-Trip Additional Shared Passenger (<50% threshold)** | **Not Present** | *Driver PWA Unbuilt* | 50% route completion threshold constraint for second passenger pairing is not yet modeled. |
| **Near-Real-Time Driver Location Simulation** | **Not Present** | [`Dashboard.tsx`](file:///C:/SAKAY/client/apps/passenger-pwa/src/features/ride-booking/components/Dashboard/Dashboard.tsx) | Map displays the passenger's own device GPS position, but active driver marker movement simulation does not exist. |
| **Strike-Relevant Behaviors (Late Cancel / No-Show)** | **Not Present** | *None* | Passenger cancellation penalties and driver no-show tracking are absent from the mobile PWA (handled via admin dispute logs). |

---

## 5. Demo Readiness & Build Status

### TypeScript & Vite Build Check

- **Passenger PWA (`apps/passenger-pwa`)**:
  ```bash
  > passenger-pwa@0.0.0 build
  > tsc -b && vite build
  ✓ built in 949ms (0 errors, 0 warnings)
  ```
- **Driver PWA (`apps/driver-pwa`)**:
  ```bash
  > driver-pwa@0.0.0 build
  > tsc -b && vite build
  error TS5083: Cannot read file 'C:/SAKAY/client/apps/driver-pwa/tsconfig.json'.
  (Build fails: Workspace lacks tsconfig.json and src/ files)
  ```

### Interactive Quality Checks
- **Dead Click Handlers**: None found in `apps/passenger-pwa` (navigation and modal triggers function as designed).
- **Placeholder UI**: Empty feature folders exist in `apps/passenger-pwa` (`features/ride-sharing`, `features/trip-monitoring`, `features/feedback`, `features/incident-reporting`).
- **State Updates**: Passenger booking flow transitions smoothly between screens using `sessionStorage` and React state.

---

## 6. Data Model Consistency Check

The types defined in [`packages/shared/src/types/database.ts`](file:///C:/SAKAY/client/packages/shared/src/types/database.ts) serve as the shared schema contract:

| Shared Schema Field (`database.ts`) | Passenger PWA Usage | Consistency Status |
|---|---|---|
| `booking.passenger_id` | Passed in `BookSummary.tsx:188` | **Consistent** |
| `booking.booking_type` (`'Immediate' \| 'Scheduled'`) | Passed as `'Immediate'` in `BookSummary.tsx:189` | **Consistent** |
| `booking.is_shared_trip` (`boolean`) | Passed as `tripType === 'Shared'` in `BookSummary.tsx:190` | **Consistent** |
| `booking.passenger_count` (`number`) | Passed from stepper state in `BookSummary.tsx:191` | **Consistent** |
| `booking.pickup_address` / `dropoff_address` | String addresses stored from Google Places in `BookSummary.tsx:192,195` | **Consistent** |
| `booking.pickup_latitude` / `dropoff_latitude` | Float coordinates stored from geolocation in `BookSummary.tsx:193,196` | **Consistent** |
| `booking.estimated_fare` (`number`) | Computed via base + distance in `BookSummary.tsx:199` | **Consistent** |
| `booking.booking_status` | Initialized to `'Searching Driver'` in `BookSummary.tsx:200` | **Consistent** |

---

## 7. Final Readiness Verdict & Build Roadmap

### **VERDICT: PASSENGER PWA IS 50% COMPLETE (3 OF 7 FEATURES); DRIVER PWA IS UNBUILT (0 OF 9 FEATURES)**

The Passenger PWA has a functional account management system, map search, and booking calculator. However, the end-to-end ride experience is broken after booking confirmation because the **Driver PWA** and **Trip Monitoring / Feedback / Incident Reporting** screens are missing.

---

### Actionable Implementation Roadmap (Priority Order)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       RECOMMENDED BUILD PRIORITIES                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Scaffold apps/driver-pwa (Vite, TS, MUI, Leaflet/Map, PWA Shell)        │
│ 2. Build Shared In-Memory Dispatch Store (reactive pub/sub booking broker) │
│ 3. Build Driver PWA Core Screens (Availability, Incoming Request Pop-up,    │
│    Active Navigation, Trip Management, Earnings)                           │
│ 4. Build Passenger Trip Monitoring Screen (Live driver ETA & route map)     │
│ 5. Build Passenger Feedback & Incident Reporting Screens                   │
│ 6. Wire Live Cross-App Simulation (Passenger books → Driver accepts →      │
│    Passenger tracks live driver movement → Trip completes → Fare summary)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Actual Blockers
1. **Driver PWA workspace scaffold**: `apps/driver-pwa` requires `tsconfig.json`, `vite.config.ts`, `index.html`, and `src/` layout before any driver UI can render.
2. **Missing Active Trip Monitoring screen** in `apps/passenger-pwa`: Passenger cannot view driver status or vehicle details after booking.
3. **Missing Cross-App Dispatch Seam**: Need a shared reactive pub/sub store (in `packages/shared` or broadcast channel) so that confirming a ride in Passenger PWA immediately rings the Driver PWA dispatch modal in real time.
