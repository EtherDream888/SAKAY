# SAKAY LGU Administrator Module — Codebase Audit Report

**Date of Audit:** August 16, 2026  
**Scope:** Read-only inspection of the Local Government Unit (LGU) Administrator portal within the SAKAY monorepo repository ([C:/SAKAY/client](file:///C:/SAKAY/client)).  
**Target Application:** [apps/admin-portal](file:///C:/SAKAY/client/apps/admin-portal)  

---

## 1. Location & Structure

### 1.1 Codebase Location
All LGU Administrator client source code is located in the dedicated monorepo workspace directory:
```
C:\SAKAY\client\apps\admin-portal\
```

### 1.2 File Tree
```
apps/admin-portal/
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── vite-env.d.ts
    ├── components/
    │   ├── admin/
    │   │   ├── ActionButton.tsx
    │   │   ├── DocumentPreviewModal.tsx
    │   │   ├── DriverDetailModal.tsx
    │   │   ├── FilterToolbar.tsx
    │   │   ├── IncidentDetailModal.tsx
    │   │   ├── MacCenterModal.tsx
    │   │   ├── MacConfirmDialog.tsx
    │   │   ├── SlideOverDetail.tsx
    │   │   ├── TodaDetailModal.tsx
    │   │   └── TripDetailModal.tsx
    │   ├── common/
    │   │   ├── MacTooltip.tsx
    │   │   └── StatusBadge.tsx
    │   ├── dashboard/
    │   │   ├── BookingTrendCard.tsx
    │   │   ├── DriverVerificationCard.tsx
    │   │   ├── LiveTripsMapCard.tsx
    │   │   ├── RecentIncidentReportsCard.tsx
    │   │   ├── RecentTodaApplicationsCard.tsx
    │   │   └── SummaryCard.tsx
    │   ├── layout/
    │   │   ├── AdminHeader.tsx
    │   │   ├── AdminLayout.tsx
    │   │   ├── AdminSidebar.tsx
    │   │   └── WelcomeHeader.tsx
    │   └── popovers/
    │       ├── DateCalendarPopover.tsx
    │       └── NotificationPopover.tsx
    ├── mockData/
    │   ├── adminData.ts
    │   └── dashboardData.ts
    ├── pages/
    │   ├── AccreditedTodasPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── DriverManagementPage.tsx
    │   ├── IncidentReportsPage.tsx
    │   ├── LiveTripsPage.tsx
    │   ├── PassengerManagementPage.tsx
    │   ├── PlaceholderPage.tsx
    │   └── TodaApplicationsPage.tsx
    ├── routes/
    │   └── adminRoutes.tsx
    ├── styles/
    │   ├── globals.css
    │   └── macOS-theme.css
    └── types/
        └── admin.ts
```

### 1.3 Router Setup & Workspace Separation
- **Router Setup:** The root entry file [src/main.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/main.tsx) mounts `<BrowserRouter>` around `<App />` ([src/App.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/App.tsx)), which directly renders `<AdminRoutes />` ([src/routes/adminRoutes.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/routes/adminRoutes.tsx)).
- **Layout Wrapping:** Every route in [src/routes/adminRoutes.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/routes/adminRoutes.tsx) wraps its page inside `<AdminLayout pageTitle="..." pageSubtitle="...">`, providing the persistent Apple-inspired macOS glassmorphic sidebar ([AdminSidebar.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/layout/AdminSidebar.tsx)) and sticky header ([AdminHeader.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/layout/AdminHeader.tsx)).
- **Monorepo Separation:** SAKAY uses **NPM Workspaces** at the repo root. The LGU Admin Portal is completely isolated in `apps/admin-portal` with its own `package.json`, dependencies (`react@19`, `@mui/material@9`, `leaflet@1.9`, `lucide-react`), and dev server port (`http://localhost:5174`). It is decoupled from the Passenger PWA (`apps/passenger-pwa` on port 5173), Driver PWA (`apps/driver-pwa`), and the backend API (`server/`). Shared models and graphics are imported via the `@sakay/shared` workspace package alias (`packages/shared/src`).

---

## 2. Screens Inventory

Below is an inventory of all active screens in `apps/admin-portal/src/pages/`, mapped against the 10 target LGU Admin features.

| # | Feature Name | Mapped Screen & File Path | Route | Status | Current Behavior & Clickable Elements |
|---|---|---|---|---|---|
| **1** | **Account Management** | *None* | *None* | **Missing** | No screen exists for LGU admin accounts, role creation, staff permissions, or first-login password reset. In [adminRoutes.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/routes/adminRoutes.tsx), `/settings` renders `PlaceholderPage`. |
| **2** | **TODA Accreditation Management** | [TodaApplicationsPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/TodaApplicationsPage.tsx) & [AccreditedTodasPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/AccreditedTodasPage.tsx) | `/toda-applications`<br/>`/accredited-todas` | **Present** | **`TodaApplicationsPage`**: 4 KPI stat boxes (Pending, Under Review, Approved, Declined); search bar; status & date dropdown filters; table with clearance expiry and "Overdue >5 Days" chips. Clicking a row/Review button opens [MacCenterModal](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/MacCenterModal.tsx) with representative contact, clearance renewal reminder button (triggers 3s "Reminder Sent ✓"), official document listing, and 3 distinct confirmation dialogs ([MacConfirmDialog](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/MacConfirmDialog.tsx)): *Approve Accreditation*, *Request Resubmission* (requires reason), and *Decline Accreditation* (requires reason).<br/>**`AccreditedTodasPage`**: Directory table with search and size filters; shows clearance status, driver counts, and "Flagged (>3 Incidents)" chips. Clicking "View Directory" opens [TodaDetailModal](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/TodaDetailModal.tsx) with an interactive Leaflet service zone map, contact cards, official files, and a 124-driver roster table with pagination controls. |
| **3** | **Driver Verification (LGU stage)** | [DriverManagementPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/DriverManagementPage.tsx) | `/drivers` | **Partial** | Search bar and filters for Verification ('Verified', 'Pending', 'Suspended') and Online Session ('Online', 'Offline'); table displaying driver name, MTOP operator, TODA affiliation, license/permit expiry status badges. Clicking "Inspect" opens [DriverDetailModal](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/DriverDetailModal.tsx) rendering: 5-level rolling 90-day strike tier badge, manual strike issuance button, TODA endorsement status, LGU verification status, MTOP/franchise info, permit renewal reminder button, document verification list, and [DocumentPreviewModal](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/DocumentPreviewModal.tsx).<br/>*Gap:* Displays status but lacks a dedicated step-by-step LGU approval action queue to endorse/verify pending drivers. |
| **4** | **User Account Oversight** | [PassengerManagementPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PassengerManagementPage.tsx) & [DriverManagementPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/DriverManagementPage.tsx) | `/passengers`<br/>`/drivers` | **Present** | **`PassengerManagementPage`**: Search by name/phone/email; status ('Active', 'Suspended') and verification filters. Table shows completed rides, policy strikes, and account status. Clicking "View Account" opens [MacCenterModal](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/MacCenterModal.tsx) with star ratings, 90-day strike log, "+ Issue Manual Strike" button, recent ride feedback/complaints list, and [MacConfirmDialog](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/MacConfirmDialog.tsx) for *Suspend Account* (with required reason) and *Reactivate Account*.<br/>**`DriverManagementPage`**: Suspend and reactivate actions via [DriverDetailModal](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/DriverDetailModal.tsx). |
| **5** | **Fare Configuration** | [PlaceholderPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PlaceholderPage.tsx) via `/settings` | `/settings` | **Missing** | No dedicated Fare Matrix configuration screen exists. The route `/settings` displays a construction placeholder (`PlaceholderPage`). (Individual trip fare breakdowns and shared-ride discounts are viewable in [TripDetailModal.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/TripDetailModal.tsx), but no global rate manager exists). |
| **6** | **Incident Report & Complaint Management** | [IncidentReportsPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/IncidentReportsPage.tsx) | `/incident-reports` | **Present** | 4 KPI summary cards (Pending Review, Under Investigation, Resolved, Dismissed); search bar; status and category dropdowns (10 categories: Overcharging, Unsafe Driving, Harassment, etc.); table with reporter and driver names. Clicking "Review Incident" opens [IncidentDetailModal](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/IncidentDetailModal.tsx) displaying: supervisory review warning banner if driver has >=3 complaints, full written description, evidence attachment list with preview modal, investigation findings text field, chronological status history audit trail, and action buttons to move status to *Under Investigation*, *Resolved*, or *Dismissed* (all updating component state). |
| **7** | **Announcement Management** | *None* | *None* | **Missing** | No announcement publishing, broadcast, or scheduling screen exists in the admin portal. |
| **8** | **System Dashboard (KPIs)** | [DashboardPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/DashboardPage.tsx) | `/dashboard` (and `/`) | **Present** | [WelcomeHeader](file:///C:/SAKAY/client/apps/admin-portal/src/components/layout/WelcomeHeader.tsx); dismissible TODA Supervisory Review alert banner (filtered dynamically by TODAs with >=3 incidents); dismissible Overdue Verifications banner (>5 days); 6 KPI stat cards (Passengers, Drivers, Accredited TODAs, Trip Stats, Pending Review, Incidents); [BookingTrendCard](file:///C:/SAKAY/client/apps/admin-portal/src/components/dashboard/BookingTrendCard.tsx) with Daily/Weekly/Monthly interactive tabs and SVG trend graphs; [DriverVerificationCard](file:///C:/SAKAY/client/apps/admin-portal/src/components/dashboard/DriverVerificationCard.tsx) breakdown; [LiveTripsMapCard](file:///C:/SAKAY/client/apps/admin-portal/src/components/dashboard/LiveTripsMapCard.tsx) with embedded Leaflet map and Calapan City markers; [RecentIncidentReportsCard](file:///C:/SAKAY/client/apps/admin-portal/src/components/dashboard/RecentIncidentReportsCard.tsx) with direct links. |
| **9** | **System Alerts** | [NotificationPopover.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/popovers/NotificationPopover.tsx) & [DashboardPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/DashboardPage.tsx) | Header Popover & `/dashboard` | **Partial** | Global header bell icon with unread badge dot opening [NotificationPopover](file:///C:/SAKAY/client/apps/admin-portal/src/components/popovers/NotificationPopover.tsx) with mock alerts (TODA application submitted, driver verification pending, incident submitted) and "Mark all read" action. Dashboard has warning banners for supervisory review and overdue requests.<br/>*Gap:* No dedicated System Alert Management / Alert Broadcast configuration page. |
| **10** | **Audit Logging** | [PlaceholderPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PlaceholderPage.tsx) via `/audit-logs` | `/audit-logs` | **Missing** | Route `/audit-logs` renders `PlaceholderPage` ("Immutable log of administrative actions, credential verifications, and status modifications"). Admin actions taken on other pages are not written to any persistent or UI-accessible audit log. |

### Additional Screens Existing in Codebase:
- **Live Trips Monitoring Screen:** [LiveTripsPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/LiveTripsPage.tsx) (`/live-trips`): Full-screen capable Leaflet map tracking active tricycle telemetry in Calapan City, driver marker popups, trip focus selector, zone filters, and [TripDetailModal](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/TripDetailModal.tsx) displaying passenger info, driver unit, and route/fare calculations.
- **Reports Placeholder Screen:** [PlaceholderPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PlaceholderPage.tsx) (`/reports`).
- **Analytics Placeholder Screen:** [PlaceholderPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PlaceholderPage.tsx) (`/analytics`).
- **Help / Tulong Placeholder Screen:** [PlaceholderPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PlaceholderPage.tsx) (`/tulong`).

---

## 3. Data Layer

### 3.1 Data Source: Mocked vs. Supabase
- **Current State:** The entire LGU Admin Portal is **100% mocked and hardcoded in static TypeScript files**.
- **Supabase Integration:** There is **no Supabase client initialized or imported** inside `apps/admin-portal`. (The Supabase client exists only in `apps/passenger-pwa/src/services/supabaseClient.ts`).
- **State Mutability:** All user actions (approving TODAs, requesting resubmission, suspending passengers/drivers, updating incident status, issuing strikes) mutate only local component React state (`useState`). All changes revert upon page reload.

### 3.2 Fixtures & Mock Data Locations
Fixtures are stored across two files in `apps/admin-portal/src/mockData/`:
1. **[apps/admin-portal/src/mockData/adminData.ts](file:///C:/SAKAY/client/apps/admin-portal/src/mockData/adminData.ts)** (862 lines):
   - `SYSTEM_DASHBOARD_KPIS`: Object holding counts for passengers, drivers, TODAs, trips, verifications, incidents.
   - `MOCK_TODA_APPLICATIONS` (4 records): Detailed TODA applications with representative details, clearance dates, and document arrays.
   - `MOCK_ACCREDITED_TODAS` (4 records): Accredited TODA organizations with geo-coordinates (`centerLat`, `centerLng`), registered driver totals, and driver rosters.
   - `MOCK_DRIVERS` (4 records): Driver profiles with license numbers, MTOP details, TODA affiliations, strike history arrays, and credential document arrays.
   - `MOCK_PASSENGERS` (4 records): Passenger profiles with rating, booking counts, 90-day strike arrays, and feedback history.
   - `MOCK_ACTIVE_TRIPS` (4 records): Live ride telemetry records with coordinate pairs, fare estimates, and ride-share details.
   - `MOCK_ONLINE_DRIVERS` (4 records): Online driver positions with DPS scores and idle durations.
   - `MOCK_INCIDENT_REPORTS_DETAILED` (4 records): Detailed incident reports with evidence files, status history arrays, and driver complaint counts.
2. **[apps/admin-portal/src/mockData/dashboardData.ts](file:///C:/SAKAY/client/apps/admin-portal/src/mockData/dashboardData.ts)** (174 lines):
   - `SUMMARY_METRICS`: 4 top metric cards.
   - `BOOKING_TREND_DAILY`, `BOOKING_TREND_WEEKLY`, `BOOKING_TREND_MONTHLY`: Trend series points.
   - `RECENT_TODA_APPLICATIONS`, `DRIVER_VERIFICATION_DATA`, `RECENT_INCIDENT_REPORTS`, `MOCK_NOTIFICATIONS`, `ACTIVE_TRIP_MARKERS`.

### 3.3 TypeScript Types & Interfaces Defined for LGU Entities

#### In [apps/admin-portal/src/types/admin.ts](file:///C:/SAKAY/client/apps/admin-portal/src/types/admin.ts):
```typescript
type StatusType = 'Approved' | 'Pending' | 'Rejected' | 'Suspended' | 'Under Review' | 'Resolved' | 'Active' | 'Inactive' | 'Declined' | 'Verified' | 'Unverified' | 'Valid' | 'Expiring Soon' | 'Expired' | 'Resubmission Required' | 'Pending Review' | 'Under Investigation' | 'Dismissed';

interface User { id: string; name: string; email: string; role: 'admin' | 'staff' | 'driver' | 'passenger'; }
interface BookingTrendPoint { date?: string; label?: string; value: number; bookings?: number; revenue?: number; }
interface SummaryMetric { id: string; title: string; value: string | number; change?: string; changeType?: 'positive' | 'negative' | 'neutral'; subtitle?: string; route?: string; trend?: string; trendDirection?: 'up' | 'down' | 'neutral'; }
interface TodaApplication { id: string; name: string; representative?: string; barangay?: string; submittedDate: string; status: StatusType; }
interface DriverVerificationData { approved?: number; approvedCount: number; pending?: number; pendingCount: number; rejected?: number; rejectedCount: number; suspended?: number; suspendedCount: number; total?: number; totalDrivers: number; }
interface IncidentReportItem { id: string; todaName?: string; driverName?: string; category: string; date?: string; timestamp?: string; status: StatusType; description?: string; iconType?: string; }
interface NotificationItem { id: string; title: string; time?: string; read?: boolean; unread?: boolean; type?: string; description?: string; }
interface ActiveTripMarker { id: string; driverName: string; todaName: string; lat: number; lng: number; status: 'Available' | 'On Trip' | 'Offline' | 'Active'; }
```

#### In [apps/admin-portal/src/mockData/adminData.ts](file:///C:/SAKAY/client/apps/admin-portal/src/mockData/adminData.ts):
```typescript
interface TodaApplicationRecord {
  id: string; name: string; representative: string; phone: string; email: string; barangay: string;
  submittedDate: string; memberCount: number; status: 'Pending' | 'Under Review' | 'Approved' | 'Declined' | 'Resubmission Required';
  declineReason?: string; resubmissionReason?: string; barangayClearanceExpiry: string;
  clearanceStatus: 'Valid' | 'Expiring Soon' | 'Expired'; isOverdue5Days?: boolean;
  documents: { name: string; type: string; date: string; url: string; }[];
}

interface AccreditedTodaRecord {
  id: string; name: string; representative: string; phone: string; email: string; barangay: string;
  registeredDrivers: number; status: 'Active' | 'Suspended' | 'Inactive'; accreditationNo: string;
  accreditedDate: string; expiryDate: string; barangayClearanceExpiry: string;
  clearanceStatus: 'Valid' | 'Expiring Soon' | 'Expired'; confirmedIncidents: number;
  flaggedForReview: boolean; centerLat: number; centerLng: number;
  documents: { name: string; type: string; date: string; }[];
  driverRoster: { id: string; name: string; vehiclePlate: string; verificationStatus: 'Verified' | 'Pending' | 'Suspended'; accountStatus: 'Active' | 'Inactive'; onlineStatus: 'Online' | 'Offline'; }[];
}

interface StrikeItem {
  id: string; date: string; reason: string; strikesApplied: number;
  status: 'Active (Rolling 90d)' | 'Expired' | 'Waived on Appeal'; issuedBy: string;
}

interface DriverRecord {
  id: string; name: string; licenseNo: string; licenseExpiry: string; licenseStatus: 'Valid' | 'Expiring Soon' | 'Expired';
  mtopNo: string; mtopExpiry: string; mtopStatus: 'Valid' | 'Expiring Soon' | 'Expired'; mtopOperatorName: string;
  todaName: string; todaId: string; vehiclePlate: string; franchiseNo: string; franchiseExpiry: string;
  todaVerificationStatus: 'Verified' | 'Pending'; lguVerificationStatus: 'Verified' | 'Pending' | 'Suspended';
  verificationStatus: 'Verified' | 'Pending' | 'Suspended'; accountStatus: 'Active' | 'Inactive';
  onlineStatus: 'Online' | 'Offline'; rating: number; ratingCount: number; phone: string; barangay: string;
  isOverdue5Days?: boolean; strikesCount: number; strikeHistory: StrikeItem[];
  documents: { name: string; type: string; status: 'Verified' | 'Pending'; }[];
}

interface PassengerRecord {
  id: string; name: string; phone: string; email: string; verificationStatus: 'Verified' | 'Unverified';
  accountStatus: 'Active' | 'Suspended'; suspensionReason?: string; activeSession: boolean;
  totalBookings: number; registeredDate: string; rating: number; ratingCount: number;
  strikesCount: number; strikeHistory: StrikeItem[];
  recentFeedback?: { rating: number; category: string; comment: string; date: string; tripId: string; }[];
}

interface IncidentReportRecord {
  id: string; bookingId: string; tripId: string; category: 'Overcharging Attempt' | 'Unsafe Driving' | 'Rude Behavior' | 'Harassment' | 'Vehicle Issue' | 'Route Deviation' | 'Reckless Driving' | 'Passenger Misconduct' | 'Lost Item' | 'Others';
  reportedBy: 'Passenger' | 'Driver'; reporterName: string; driverName: string; todaName: string;
  vehiclePlate: string; passengerName: string; submittedDate: string; submittedTime: string;
  status: 'Pending Review' | 'Under Investigation' | 'Resolved' | 'Dismissed'; description: string;
  evidenceFiles: { name: string; type: 'image' | 'video' | 'pdf'; url: string; }[]; findings?: string;
  relatedIncidentsCount: number; statusHistory: { step: string; timestamp: string; actor: string; }[];
}
```

#### In [packages/shared/src/types/database.ts](file:///C:/SAKAY/client/packages/shared/src/types/database.ts):
Defines `Toda`, `Passenger`, `Driver`, `Booking` matching Supabase tables in `snake_case`.

### 3.4 Type Inconsistencies & Flags
1. **Divergent Field Naming:** Frontend mock interfaces use `camelCase` (e.g. `todaName`, `driverName`, `licenseNo`, `mtopNo`, `accountStatus`), whereas [packages/shared/src/types/database.ts](file:///C:/SAKAY/client/packages/shared/src/types/database.ts) and [supabase_schema.sql](file:///C:/SAKAY/client/supabase_schema.sql) use `snake_case` (e.g. `toda_name`, `license_number`, `franchise_number`).
2. **Duplicate & Conflicting Type Definitions:** `apps/admin-portal/src/types/admin.ts` defines `TodaApplication` and `IncidentReportItem`, while `apps/admin-portal/src/mockData/adminData.ts` defines `TodaApplicationRecord` and `IncidentReportRecord` with different property structures.
3. **Missing Schema Types:** Neither `admin.ts` nor `database.ts` defines types for `FareMatrix`, `Announcement`, `AuditLog`, `SystemAlert`, or `LguAdmin` entities.
4. **Schema Field Disconnect:** Rich features modeled in the frontend mock data (e.g. `strikeHistory`, `strikesCount`, `evidenceFiles`, `findings`, `statusHistory`, `isOverdue5Days`, `barangayClearanceExpiry`) do not have corresponding columns in `packages/shared/src/types/database.ts` or [supabase_schema.sql](file:///C:/SAKAY/client/supabase_schema.sql).

---

## 4. Business Logic: Present vs. Absent

| Business Logic Requirement | Status | File Reference | Current Code Analysis |
|---|---|---|---|
| **Two-stage driver verification (TODA endorsement required before LGU sees it)** | **Partially Implemented** | [DriverDetailModal.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/DriverDetailModal.tsx#L265-L267)<br/>[adminData.ts](file:///C:/SAKAY/client/apps/admin-portal/src/mockData/adminData.ts#L83-L85) | Visual fields exist in mock data (`todaVerificationStatus: 'Verified'` and `lguVerificationStatus: 'Verified' | 'Pending'`). The UI displays "TODA Endorsement Status". However, the driver table shows all mock drivers regardless of TODA endorsement; there is no queue logic preventing unendorsed drivers from appearing in the LGU view, nor an explicit verification transition action. |
| **Distinct actions for Reject vs. Require Resubmission** | **Implemented** | [TodaApplicationsPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/TodaApplicationsPage.tsx#L72-L93)<br/>[MacConfirmDialog.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/MacConfirmDialog.tsx) | `TodaApplicationsPage` provides distinct buttons and modals: "Request Resubmission" sets status to `'Resubmission Required'` with a mandatory reason prompt; "Decline Application" sets status to `'Declined'` with permanent decline reason logging. Both display recorded reasons on the review card. *(Note: Not present on Driver page).* |
| **Role-based permissions (Super Admin / Verifier / Incident Officer / Fare Admin) gating UI** | **Not Present** | [AdminSidebar.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/layout/AdminSidebar.tsx#L337-L345)<br/>[adminRoutes.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/routes/adminRoutes.tsx) | There is no permission check or RBAC guard. The sidebar hardcodes a single static profile (`LGU Admin`). All routes and navigation tabs are open and accessible to any visitor. |
| **Strike / suspension / deactivation logic & display** | **Implemented** | [DriverDetailModal.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/DriverDetailModal.tsx#L55-L66)<br/>[PassengerManagementPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PassengerManagementPage.tsx#L82-L90)<br/>[adminData.ts](file:///C:/SAKAY/client/apps/admin-portal/src/mockData/adminData.ts#L59-L66) | Both driver and passenger modals implement a full 5-tier rolling 90-day strike consequence calculator (`Level 1: Warning`, `Level 2: Admin Review`, `Level 3: 7-Day Suspension`, `Level 4: 30-Day Suspension`, `Level 5: Permanent Deactivation`), render detailed historical strike entries, provide a "+ Issue Manual Strike" action, and include suspend/reactivate confirmation dialogs with mandatory violation reason entry. |
| **Audit log entries written on admin actions** | **Not Present** | [TodaApplicationsPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/TodaApplicationsPage.tsx)<br/>[PassengerManagementPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PassengerManagementPage.tsx)<br/>[IncidentReportsPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/IncidentReportsPage.tsx) | Admin actions only update local React component state variables (`setApplications`, `setPassengers`, `setIncidents`). No audit logging service is invoked, and the `/audit-logs` route is a static placeholder. |
| **Fare matrix versioning (old configs kept, not overwritten)** | **Not Present** | [adminRoutes.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/routes/adminRoutes.tsx#L112-L121) | Although the PostgreSQL table `fare_matrix` in [supabase_schema.sql](file:///C:/SAKAY/client/supabase_schema.sql#L533-L542) includes `is_active` and `effective_timestamp`, there is zero frontend UI, version history list, or configuration logic implemented. |
| **Incident escalation routing (TODA-first vs. LGU-escalated vs. immediate-LGU)** | **Partially Implemented** | [IncidentDetailModal.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/admin/IncidentDetailModal.tsx#L65-L88)<br/>[IncidentReportsPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/IncidentReportsPage.tsx) | Displays a supervisory review warning banner if a driver has accumulated 3+ complaints within 30 days. However, there is no automated triage routing separating TODA-first categories (e.g. lost item, rude behavior) from immediate-LGU escalation categories (e.g. harassment, overcharging, reckless driving). |

---

## 5. State & Authentication

### 5.1 Authentication & Session Handling
- **No Auth Guard:** There is no login screen, session provider, token storage, or Supabase Auth listener in `apps/admin-portal`.
- **Default State:** Anyone accessing `http://localhost:5174` is immediately routed to the dashboard with full administrative UI access.
- **Role Switching:** No role switching mechanism exists. [AdminSidebar.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/components/layout/AdminSidebar.tsx#L337-L345) renders a hardcoded avatar (`LA`) and static label ("LGU Admin - Calapan City LGU").

### 5.2 Loading, Empty, and Error State Handling
- **Empty States:** Handled in table components via conditional rendering (e.g. `filteredApps.length > 0 ? (...) : (<TableRow><TableCell>No TODA accreditation requests found matching your filters.</TableCell></TableRow>)`).
- **Loading States:** **Not implemented.** Data is loaded synchronously from memory. No skeleton loaders, progress bars, or suspense spinners exist on data tables.
- **Error States:** **Not implemented.** Because no asynchronous network requests exist, there are no error banners, retry prompts, or React Error Boundaries.

---

## 6. Rough Completion Estimates

| # | Target Feature | UI Only % | UI + Logic % | UI + Logic + Correct Business Rules % | One-Line Note on Biggest Gap |
|---|---|:---:|:---:|:---:|---|
| **1** | Account Management | 0% | 0% | 0% | No screen, user table, or password reset flow exists. |
| **2** | TODA Accreditation Management | 95% | 75% | 60% | Complete UI and modals; lacks backend persistence and automatic accreditation number generation. |
| **3** | Driver Verification (LGU stage) | 80% | 40% | 25% | Shows driver details and credentials, but lacks a dedicated step-by-step LGU review/endorsement pipeline. |
| **4** | User Account Oversight | 95% | 75% | 65% | Comprehensive UI with 90-day strike tiers and suspension modals; lacks Supabase sync and automated strike expiration timers. |
| **5** | Fare Configuration | 5% | 0% | 0% | Only a construction placeholder exists at `/settings`. |
| **6** | Incident Report & Complaint Management | 90% | 70% | 50% | Complete triage UI and investigation logs; lacks category-based automatic routing and resolution notifications. |
| **7** | Announcement Management | 0% | 0% | 0% | No announcement composer, scheduling, or broadcasting UI exists. |
| **8** | System Dashboard (KPIs) | 95% | 85% | 70% | High-fidelity cards, Leaflet map preview, and trend graphs; values are hardcoded mock fixtures. |
| **9** | System Alerts | 70% | 40% | 20% | Header popover and dashboard alert banners exist; lacks broadcast composer and system threshold alert rules. |
| **10** | Audit Logging | 5% | 0% | 0% | Route renders `PlaceholderPage`; actions taken across screens do not create audit log entries. |

---

## 7. Additional Findings & Flags

### 7.1 Dead / Unwired Interactive Elements
1. **Empty File Preview Click Handler:** In [TodaApplicationsPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/TodaApplicationsPage.tsx#L351), the document action chip has an empty callback:
   ```tsx
   <Chip label="View File" size="small" onClick={() => {}} ... />
   ```
2. **Placeholder Pages in Active Navigation:** Routes `/reports`, `/analytics`, `/settings`, `/audit-logs`, and `/tulong` all navigate to [PlaceholderPage.tsx](file:///C:/SAKAY/client/apps/admin-portal/src/pages/PlaceholderPage.tsx) ("Routing & Page Shell Ready for Step 2 Implementation").

### 7.2 Code Cleanliness
- **Console Logs & Debuggers:** No rogue `console.log` statements or debugger breakpoints were found.
- **TypeScript Compilation:** The application builds cleanly (`npm run build --workspace=apps/admin-portal` completes with 0 errors).

### 7.3 Schema & Naming Discrepancies
- **Casing Mismatches:** Frontend interfaces use `camelCase` (e.g. `vehiclePlate`, `licenseNo`, `todaName`), while the backend relational schema ([supabase_schema.sql](file:///C:/SAKAY/client/supabase_schema.sql)) uses `snake_case` (e.g. `plate_number`, `license_number`, `toda_name`).
- **Entity Type Duplication:** Types are split across `types/admin.ts` and `mockData/adminData.ts` rather than being unified in `packages/shared/src/types/`.

### 7.4 Missing Configuration Files
- Unlike `apps/passenger-pwa`, `apps/admin-portal` does not currently contain a `.env` or `.env.example` file for Supabase API URL and Anon key configuration.
