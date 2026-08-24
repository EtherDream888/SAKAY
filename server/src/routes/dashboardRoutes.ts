import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// ============================================================================
// GET /api/admin/dashboard/stats - Real Dashboard Analytics & KPIs
// ============================================================================
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    if (!supabase) {
      return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    // 1. Query Passengers counts
    const [
      passengersTotalRes,
      passengersActiveRes,
      driversTotalRes,
      driversVerifiedRes,
      driversPendingRes,
      driversSuspendedRes,
      todasActiveRes,
      todasPendingRes,
      bookingsTotalRes,
      bookingsCompletedRes,
      bookingsOngoingRes,
      incidentsTotalRes,
      incidentsOpenRes,
      recentIncidentsRes,
      recentTodasRes,
    ] = await Promise.all([
      supabase.from('passenger').select('*', { count: 'exact', head: true }),
      supabase.from('passenger').select('*', { count: 'exact', head: true }).eq('account_status', 'Active'),
      supabase.from('driver').select('*', { count: 'exact', head: true }),
      supabase.from('driver').select('*', { count: 'exact', head: true }).eq('account_status', 'Verified'),
      supabase.from('driver').select('*', { count: 'exact', head: true }).eq('account_status', 'Pending Verification'),
      supabase.from('driver').select('*', { count: 'exact', head: true }).eq('account_status', 'Suspended'),
      supabase.from('toda').select('*', { count: 'exact', head: true }).eq('account_status', 'Active'),
      supabase.from('toda').select('*', { count: 'exact', head: true }).neq('account_status', 'Active'),
      supabase.from('booking').select('*', { count: 'exact', head: true }),
      supabase.from('booking').select('*', { count: 'exact', head: true }).eq('booking_status', 'Completed'),
      supabase.from('booking').select('*', { count: 'exact', head: true }).in('booking_status', ['Driver Assigned', 'Driver En Route', 'Driver Arrived', 'Trip Ongoing']),
      supabase.from('incident_report').select('*', { count: 'exact', head: true }),
      supabase.from('incident_report').select('*', { count: 'exact', head: true }).neq('status', 'Resolved'),
      supabase.from('incident_report').select('*').order('created_at', { ascending: false }).limit(5),
      supabase.from('toda').select('*').order('created_at', { ascending: false }).limit(5),
    ]);

    const totalPassengers = passengersTotalRes.count || 0;
    const activePassengers = passengersActiveRes.count || 0;
    const inactivePassengers = totalPassengers - activePassengers;

    const totalDrivers = driversTotalRes.count || 0;
    const verifiedDrivers = driversVerifiedRes.count || 0;
    const pendingDrivers = driversPendingRes.count || 0;
    const suspendedDrivers = driversSuspendedRes.count || 0;

    const activeTodas = todasActiveRes.count || 0;
    const pendingTodas = todasPendingRes.count || 0;

    const totalBookings = bookingsTotalRes.count || 0;
    const completedBookings = bookingsCompletedRes.count || 0;
    const ongoingBookings = bookingsOngoingRes.count || 0;

    const totalIncidents = incidentsTotalRes.count || 0;
    const openIncidents = incidentsOpenRes.count || 0;

    // Driver Verification Segments Calculation
    const driverBreakdown = {
      total: totalDrivers,
      approved: verifiedDrivers,
      pending: pendingDrivers,
      rejected: 0,
      suspended: suspendedDrivers,
    };

    // Format recent incidents
    const recentIncidents = (recentIncidentsRes.data || []).map((inc: any) => ({
      id: inc.incident_id,
      category: inc.category || 'General Incident',
      status: inc.status || 'Under Investigation',
      timestamp: inc.created_at
        ? new Date(inc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : 'Recent',
      severity: inc.severity || 'Medium',
      description: inc.description || '',
      iconType: (inc.category || '').toLowerCase().includes('charge') ? 'overcharging' : (inc.category || '').toLowerCase().includes('misconduct') ? 'misconduct' : 'safety',
    }));

    // Format recent TODA applications
    const recentApplications = (recentTodasRes.data || []).map((toda: any) => ({
      id: toda.toda_id,
      name: toda.toda_name,
      barangay: toda.barangay || 'Calapan City',
      submittedDate: toda.created_at
        ? new Date(toda.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Recent',
      status: toda.account_status === 'Active' ? 'Approved' : toda.account_status === 'Deactivated' ? 'Declined' : 'Pending',
      representative: toda.president_name || 'TODA Officer',
      memberCount: toda.active_driver_count || toda.registered_tricycle_count || 0,
    }));

    return res.json({
      success: true,
      data: {
        kpis: {
          passengers: {
            total: totalPassengers,
            active: activePassengers,
            inactive: Math.max(0, inactivePassengers),
          },
          drivers: {
            total: totalDrivers,
            active: verifiedDrivers,
            inactive: Math.max(0, totalDrivers - verifiedDrivers),
          },
          todas: {
            total: activeTodas,
            pendingReview: pendingTodas,
          },
          trips: {
            total: completedBookings,
            ongoing: ongoingBookings,
            allBookings: totalBookings,
          },
          verifications: {
            pending: pendingDrivers + pendingTodas,
            overdue5Days: 0,
          },
          incidents: {
            open: openIncidents,
            total: totalIncidents,
          },
        },
        driverBreakdown,
        recentIncidents,
        recentApplications,
      },
    });
  } catch (err) {
    console.error('[dashboardRoutes] /stats error:', err);
    return res.status(500).json({ success: false, error: (err as Error).message });
  }
});

export default router;
