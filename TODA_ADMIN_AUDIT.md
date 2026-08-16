# TODA Administrator Portal Audit Report (`apps/toda-portal`)

**Date**: August 16, 2026  
**Auditor**: Antigravity AI Assistant  
**Target Monorepo Workspace**: `apps/toda-portal` (Port `5175`)  
**Reference Specification**: Table 10.2 (*TODA Administrator Functional Scope*) & SAKAY Municipal Transport Governance Business Rules  
**Operating Mode**: Read-Only Audit & Verification

---

## 1. Full Feature Checklist (Table 10.2 — All 6 Features)

| # | Feature (Table 10.2) | Target Route | Page Component & File Reference | Navigation Reachable | UI Pattern Conformance | Wiring Status | Notes / Flags |
|---|---|---|---|---|---|---|---|
| **1** | **Account Management** | `/account` | [`TodaAccountManagementPage.tsx`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAccountManagementPage.tsx) | Yes (`TodaSidebar` → *Account & Accreditation*) | Glassmorphic Card Header + Stat Indicators + 2-Column Info Grid + Modals (`MacCenterModal`, `DocumentPreviewModal`) | **Fully Wired** | • Org details, Permit No, validity tracker.<br>• Mobile OTP security flow.<br>• Barangay Clearance & Drivers Roster file preview & upload.<br>• Terminal relocation enters *"Pending LGU Re-approval"* state. |
| **2** | **Driver Verification (TODA stage)** | `/driver-verification` | [`TodaDriverVerificationPage.tsx`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverVerificationPage.tsx) | Yes (`TodaSidebar` → *Driver Verification*, badge `4`) | 4 KPI Cards + Search/Filter Toolbar + Data Table + Inspection Modal + Confirm Dialogs | **Fully Wired** | • 5-day combined review SLA countdown.<br>• Rule 2.4 roster-mismatch violation alert.<br>• Two-step check (Roster + Photo).<br>• *"Forward to LGU"* flips status to `TODA Endorsed`.<br>• Reject & Resubmit with required reasons. |
| **3** | **Driver Membership Management** | `/drivers` | [`TodaDriverMembershipPage.tsx`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx) | Yes (`TodaSidebar` → *Driver Membership*) | 4 KPI Cards + Sub-Queue Tabs + Search/Filter Toolbar + Table + Member Modal + Confirm Dialogs | **Fully Wired** | • 24 CCTODA roster drivers with shift allocations.<br>• TODA-level Suspend/Reactivate with mandatory reason.<br>• LGU-level deactivation visually protected.<br>• Strike Exemption Appeals sub-queue tab. |
| **4** | **TODA Operations Monitoring** | `/operations` | [`TodaOperationsPage.tsx`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaOperationsPage.tsx) | Yes (`TodaSidebar` → *Operations Monitoring*) | Supervisory Status Banner + 4 KPI Cards + Split Grid (Live Terminal Dispatch Queue + Recent CCTODA Bookings) | **Fully Wired** | • Scoped 100% to Calapan Central TODA.<br>• 75% fleet utilization (18/24 active units).<br>• Live rotational terminal loading queue.<br>• Supervisory review flag check (<3 complaints). |
| **5** | **Announcement Management** | `/announcements` | [`TodaAnnouncementsPage.tsx`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAnnouncementsPage.tsx) | Yes (`TodaSidebar` → *Announcements*) | 3 KPI Cards + Scope Restriction Banner + Search/Filter Toolbar + Table + Compose Modal + Manage Modal | **Fully Wired** | • Strictly scoped to CCTODA drivers.<br>• Categorized topics + Urgency level.<br>• Mobile PWA push toggle.<br>• Publish/Unpublish toggle & delete confirmation. |
| **6** | **TODA Reporting & Incidents** | `/reports` | [`TodaReportingPage.tsx`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaReportingPage.tsx) | Yes (`TodaSidebar` → *TODA Reports & Incidents*) | Export Action Bar + Sub-Queue Tabs (Bookings Ledger & Incident Triage) + Search/Filter Toolbar + Tables + Modals | **Fully Wired** | • CCTODA bookings ledger with trip mode filters.<br>• 4 Export action buttons (PDF & Excel).<br>• TODA-level Incident triage (`Under Investigation`, `Resolved (TODA Level)`, `Dismissed`).<br>• *"Escalate to LGU Administrator"* with mandatory reason. |
| **+** | **TODA Audit Trail** *(Extra Consistency Feature)* | `/audit-logs` | [`TodaAuditLogsPage.tsx`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAuditLogsPage.tsx) | Yes (`TodaSidebar` → *Audit Logs*) | 4 KPI Cards + Category Filter Toolbar + Table + Event Inspection Modal | **Fully Wired** | • Real-time reactive ledger of all TODA officer actions via pub/sub `subscribeAuditLogs()`. |

---

## 2. Data Scoping Check

Every screen in `apps/toda-portal` is strictly scoped to the authenticated TODA administrator identity (**Calapan Central TODA**, `toda-1`, acronym: `CCTODA`):

1. **Account Management (`/account`)**: Scoped to [`CURRENT_TODA_PROFILE`](file:///C:/SAKAY/client/apps/toda-portal/src/mockData/todaData.ts#L13) representing Calapan Central TODA, Permit #`CAL-TODA-2024-001`, and terminal at *JP Rizal St.*
2. **Driver Verification Queue (`/driver-verification`)**: Only contains driver applications submitted for affiliation with `CCTODA` (`APP-DRV-001` through `APP-DRV-005`). No cross-TODA applicants exist in this queue.
3. **Driver Membership Management (`/drivers`)**: Contains only the 24 driver members affiliated with `CCTODA` (`CCTODA-001` to `CCTODA-024`). Drivers from other TODAs (e.g. `BLTODA`, `SVTODA`) are excluded.
4. **Operations Monitoring (`/operations`)**: KPIs (18 active drivers / 24 total units, 5 ongoing corridor trips, ₱4,820 estimated daily revenue) and the terminal dispatch rotation list reflect solely `CCTODA` terminal operations at JP Rizal St.
5. **Announcement Management (`/announcements`)**: UI explicitly scopes the broadcast target to `"CCTODA Drivers Only"`. City-wide passenger broadcasts are clearly identified as restricted to LGU Admins.
6. **TODA Reporting & Incidents (`/reports`)**:
   - The bookings ledger lists only transactions serviced by `CCTODA` units.
   - The incident queue triages only complaints lodged against `CCTODA` drivers before escalation.

**Cross-TODA Leakage Finding**: **None**. Zero instances of platform-wide or foreign TODA data leakage exist.

---

## 3. Business Logic Re-Check

| Business Rule / Constraint | Implementation Status | Code Evidence & File Reference | Behavioral Verification |
|---|---|---|---|
| **1. Two-Step Driver Forwarding Gate** | **Implemented** | [`TodaDriverVerificationPage.tsx#L106-L107`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverVerificationPage.tsx#L106-L107)<br>[`TodaDriverVerificationPage.tsx#L457`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverVerificationPage.tsx#L457) | `isForwardEnabled = rosterChecked && photoChecked && selectedApplicant?.onSubmittedRoster`. The *"Forward to LGU Administrator"* button remains disabled until BOTH checkboxes are verified. |
| **2. Rule 2.4 Roster-Mismatch Warning** | **Implemented** | [`TodaDriverVerificationPage.tsx#L341-L354`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverVerificationPage.tsx#L341-L354) | When `onSubmittedRoster === false` (e.g. Renato Panganiban), a prominent red alert banner renders: *"Rule 2.4 Compliance Warning: Driver Mismatch Detected. Endorsing a non-roster driver constitutes an accreditation violation."* Forwarding is blocked. |
| **3. Terminal Relocation Non-Destructive State** | **Implemented** | [`TodaAccountManagementPage.tsx#L85-L106`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAccountManagementPage.tsx#L85-L106)<br>[`TodaAccountManagementPage.tsx#L274-L287`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAccountManagementPage.tsx#L274-L287) | Submitting relocation does not overwrite `terminalLocation`. It populates `pendingTerminalLocation` and displays a blue *"Relocation Pending LGU Re-approval"* card while keeping the active terminal live. |
| **4. TODA Suspension vs. LGU Deactivation** | **Implemented** | [`TodaDriverMembershipPage.tsx#L131-L157`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx#L131-L157)<br>[`TodaDriverMembershipPage.tsx#L496-L515`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx#L496-L515) | TODA can toggle `TODA Suspended` (orange badge) for terminal violations. `LGU Deactivated` (red badge) is disabled for TODA modification, preserving LGU exclusive prerogative. |
| **5. Incident Triage & LGU Escalation** | **Implemented** | [`TodaReportingPage.tsx#L113-L141`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaReportingPage.tsx#L113-L141)<br>[`TodaReportingPage.tsx#L529-L557`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaReportingPage.tsx#L529-L557) | TODA can Resolve (with mediation notes) or Dismiss locally. Escalating to LGU prompts a `MacConfirmDialog` requiring a mandatory escalation reason and transitions status to `Escalated to LGU`. |
| **6. Driver Strike Exemption Requests Queue** | **Implemented** | [`TodaDriverMembershipPage.tsx#L328-L417`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx#L328-L417) | Implemented as a dedicated sub-queue tab under Driver Membership. TODA Admin can approve (clearing strike) or escalate complex disputes to the LGU Board. |
| **7. Supervisory Review Threshold Flag** | **Implemented** | [`TodaOperationsPage.tsx#L35-L87`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaOperationsPage.tsx#L35-L87) | Real-time banner evaluates complaint count against the 60-day threshold (3+ complaints). Renders green *"Good Standing"* banner for CCTODA (1/3) and red warning when threshold is met/exceeded. |

---

## 4. Audit Log Integrity Check

Every state-modifying action across `apps/toda-portal` imports and invokes [`logTodaAction()`](file:///C:/SAKAY/client/apps/toda-portal/src/lib/auditLog.ts#L38) with standardized metadata (`action_type`, `target_id`, `target_name`, `details`, `category`, `actor_name`, `toda_admin_id`).

### Mutating Actions Inventory (19 Tracked Actions)

| # | Originating Screen | Action Description | `action_type` Constant | Category | Audit Log Invocation Reference |
|---|---|---|---|---|---|
| 1 | **Account Management** | Update TODA contact info & officers | `TODA_PROFILE_UPDATED` | Account | [`TodaAccountManagementPage.tsx:76`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAccountManagementPage.tsx#L76) |
| 2 | **Account Management** | Request terminal relocation to LGU | `TERMINAL_RELOCATION_REQUESTED` | Account | [`TodaAccountManagementPage.tsx:96`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAccountManagementPage.tsx#L96) |
| 3 | **Account Management** | Verify mobile admin phone via OTP | `MOBILE_OTP_VERIFIED` | Account | [`TodaAccountManagementPage.tsx:118`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAccountManagementPage.tsx#L118) |
| 4 | **Account Management** | Upload compliance document (clearance/roster) | `COMPLIANCE_DOCUMENT_UPLOADED` | Account | [`TodaAccountManagementPage.tsx:150`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAccountManagementPage.tsx#L150) |
| 5 | **Driver Verification** | Forward endorsed driver to LGU | `DRIVER_ENDORSED_TO_LGU` | Driver Verification | [`TodaDriverVerificationPage.tsx:112`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverVerificationPage.tsx#L112) |
| 6 | **Driver Verification** | Reject driver applicant (with reason) | `DRIVER_APPLICATION_REJECTED` | Driver Verification | [`TodaDriverVerificationPage.tsx:136`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverVerificationPage.tsx#L136) |
| 7 | **Driver Verification** | Request applicant document resubmission | `DRIVER_RESUBMISSION_REQUESTED` | Driver Verification | [`TodaDriverVerificationPage.tsx:160`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverVerificationPage.tsx#L160) |
| 8 | **Driver Membership** | Update member shift & zone allocation | `DRIVER_MEMBERSHIP_UPDATED` | Membership | [`TodaDriverMembershipPage.tsx:119`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx#L119) |
| 9 | **Driver Membership** | Enforce TODA terminal loading suspension | `DRIVER_TODA_SUSPENDED` | Membership | [`TodaDriverMembershipPage.tsx:144`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx#L144) |
| 10 | **Driver Membership** | Reactivate TODA member loading privileges | `DRIVER_TODA_REACTIVATED` | Membership | [`TodaDriverMembershipPage.tsx:168`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx#L168) |
| 11 | **Driver Membership** | Approve driver strike exemption appeal | `EXEMPTION_REQUEST_APPROVED` | Membership | [`TodaDriverMembershipPage.tsx:185`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx#L185) |
| 12 | **Driver Membership** | Escalate strike exemption appeal to LGU | `EXEMPTION_ESCALATED_TO_LGU` | Membership | [`TodaDriverMembershipPage.tsx:202`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaDriverMembershipPage.tsx#L202) |
| 13 | **Announcements** | Compose and publish driver broadcast | `ANNOUNCEMENT_PUBLISHED` | Announcement | [`TodaAnnouncementsPage.tsx:109`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAnnouncementsPage.tsx#L109) |
| 14 | **Announcements** | Toggle publish/unpublish status | `ANNOUNCEMENT_PUBLISHED` / `UNPUBLISHED` | Announcement | [`TodaAnnouncementsPage.tsx:133`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAnnouncementsPage.tsx#L133) |
| 15 | **Announcements** | Delete announcement broadcast | `ANNOUNCEMENT_DELETED` | Announcement | [`TodaAnnouncementsPage.tsx:148`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAnnouncementsPage.tsx#L148) |
| 16 | **Reporting & Incidents** | Export TODA operational ledger (PDF/Excel) | `REPORT_EXPORTED` | Operations | [`TodaReportingPage.tsx:102`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaReportingPage.tsx#L102) |
| 17 | **Reporting & Incidents** | Escalate complaint to LGU Administrator | `INCIDENT_ESCALATED_TO_LGU` | Incident | [`TodaReportingPage.tsx:131`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaReportingPage.tsx#L131) |
| 18 | **Reporting & Incidents** | Resolve complaint at TODA level | `INCIDENT_RESOLVED_TODA_LEVEL` | Incident | [`TodaReportingPage.tsx:156`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaReportingPage.tsx#L156) |
| 19 | **Reporting & Incidents** | Dismiss unsubstantiated report | `INCIDENT_DISMISSED` | Incident | [`TodaReportingPage.tsx:181`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaReportingPage.tsx#L181) |

All 19 mutations immediately emit events to [`TodaAuditLogsPage.tsx`](file:///C:/SAKAY/client/apps/toda-portal/src/pages/TodaAuditLogsPage.tsx), updating the audit table with zero page reloads.

---

## 5. Demo Readiness Check

- **Dead Click Handlers**: **0**. Grep verification for `() => {}` returned 0 occurrences across `apps/toda-portal/src`.
- **Live State Updates**: Every action (endorsing applicants, changing shifts, suspending drivers, publishing announcements, resolving incidents, requesting relocations) updates local React state and instantly updates KPI counters, tables, and status badges.
- **Placeholder Screens**: **0**. All routes render complete, production-grade page views.
- **TypeScript & Vite Build Status**:
  ```bash
  > toda-portal@0.0.0 build
  > tsc -b && vite build
  ✓ built in 1.56s (0 errors, 0 warnings)
  ```

---

## 6. Data Model Consistency (TODA vs. LGU Portal)

Shared entities between `apps/toda-portal` and `apps/admin-portal` maintain structural alignment:

| Domain Entity | LGU Portal Shape (`admin.ts`) | TODA Portal Shape (`toda.ts`) | Consistency Assessment |
|---|---|---|---|
| **TODA Organization** | `TodaApplication` (`id`, `name`, `barangay`, `submittedDate`, `status`) | `TodaProfile` (`id`, `name`, `acronym`, `registrationNumber`, `terminalLocation`, `barangay`, `officers`, `accreditationStatus`, `permitNumber`) | **Aligned**. TODA shape provides detailed officer and terminal fields while preserving common identifiers (`id: 'toda-1'`, `barangay`, `permitNumber`). |
| **Driver Applicant** | `DriverVerificationData` (aggregate KPI model) | `DriverApplicant` (`id`, `name`, `phone`, `licenseNo`, `vehiclePlate`, `franchiseNo`, `onSubmittedRoster`, `photoVerified`, `todaStageStatus`) | **Aligned**. Fields mirror driver records in LGU verification queues. |
| **Affiliated Driver Member** | `User` / `ActiveTripMarker` (`id`, `name`, `vehiclePlate`, `todaName`) | `TodaDriverMember` (`id`, `membershipNo`, `name`, `phone`, `vehiclePlate`, `franchiseNo`, `terminalShift`, `serviceZone`, `accountStatus`) | **Aligned**. Reuses standard vehicle plate (`###-MV`) and franchise (`CAL-2025-####`) conventions. |
| **Incident Report** | `IncidentReportItem` (`id`, `todaName`, `driverName`, `category`, `status`, `description`) | `TodaIncident` (`id`, `bookingId`, `driverName`, `vehiclePlate`, `category`, `description`, `status`, `escalationReason`) | **Aligned**. Reuses identical category nomenclature and status lifecycle stages. |
| **Announcement** | `AnnouncementItem` (`id`, `title`, `message`, `targetRole`, `todaId`, `isPublished`) | `TodaAnnouncement` (`id`, `title`, `message`, `category`, `urgency`, `isPublished`, `sendPushNotification`, `createdBy`) | **Aligned**. Tailored for driver push distribution with matched core metadata. |
| **Audit Logging** | `AuditLogItem` (`id`, `actorId`, `actorName`, `actionType`, `targetId`, `targetName`, `details`, `timestamp`) | `TodaAuditLog` (`id`, `log_id`, `toda_admin_id`, `actor_name`, `action_type`, `target_id`, `target_name`, `details`, `performed_at`) | **Aligned**. Follows identical audit envelope architecture. |

---

## 7. Final Readiness Verdict

### **VERDICT: 100% FEATURE-COMPLETE & DEMO-READY**

The TODA Administrator Portal (`apps/toda-portal`) is completely built and fully compliant with Table 10.2 and all SAKAY municipal transport governance rules using realistic mock data with zero backend dependencies.

### Blockers vs. Nice-to-Have Polish

- **Current Blockers**: **None (0)**.
- **Nice-to-Have Polish (Post-Demo)**:
  1. *Leaflet Map Overlay*: Connect live coordinates in `TodaOperationsPage.tsx` to an interactive map canvas representing the JP Rizal terminal zone.
  2. *Live CSV File Parser*: Allow uploading real CSV files in `TodaAccountManagementPage.tsx` to dynamically populate the 24 driver roster members in memory.
  3. *Sound Effects*: Optional macOS sound effects upon submitting endorsements or receiving urgent supervisory warnings.
