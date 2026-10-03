import { supabase } from '../config/supabase';

let schedulerTimer: NodeJS.Timeout | null = null;
let initialTimeout: NodeJS.Timeout | null = null;
let isExecuting = false;

/**
 * Executes a single authoritative SLA and credential expiry cascade run.
 * Protected by:
 * 1. Process-level mutex flag (isExecuting)
 * 2. PostgreSQL Transaction Advisory Lock (key: 742901 inside run_scheduled_sla_and_expiry_cascade)
 * 3. Idempotent database unique constraints (idx_notification_dedupe, idx_admin_review_flag_unique_open)
 */
export async function executeSlaCascadeRun(): Promise<{
  success: boolean;
  skipped?: boolean;
  data?: any;
  strikeSweep?: unknown;
  error?: string;
}> {
  if (isExecuting) {
    console.log('[SLA Scheduler] Execution skipped: local run already in progress.');
    return { success: false, skipped: true, error: 'Local run already in progress' };
  }

  if (!supabase) {
    console.warn('[SLA Scheduler] Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized' };
  }

  isExecuting = true;
  const startTime = Date.now();

  try {
    console.log(`[SLA Scheduler] Starting scheduled cascade execution at ${new Date().toISOString()}...`);
    const { data, error } = await supabase.rpc('run_scheduled_sla_and_expiry_cascade');

    if (error) {
      console.error('[SLA Scheduler Error] RPC failed:', error.message);
      return { success: false, error: error.message };
    }

    // Batch 3: lift expired suspensions, confirm provisional strikes, refresh cached strike
    // counts and escalate overdue exemption requests. Enforcement guards in the database
    // never depend on this sweep (they evaluate suspended_until live); it keeps state tidy.
    const { data: sweepData, error: sweepError } = await supabase.rpc('sweep_strike_state');
    if (sweepError) {
      console.error('[SLA Scheduler Error] strike sweep failed:', sweepError.message);
    }

    const elapsed = Date.now() - startTime;
    console.log(`[SLA Scheduler] Execution finished in ${elapsed}ms:`, data, 'strike sweep:', sweepData);
    return { success: true, data, strikeSweep: sweepData ?? null };
  } catch (err: any) {
    console.error('[SLA Scheduler Fatal Error]:', err);
    return { success: false, error: err.message || 'Unknown scheduler error' };
  } finally {
    isExecuting = false;
  }
}

/**
 * Starts the background scheduler daemon inside the Express server.
 * Default interval: 1 hour (3,600,000 ms), configurable via SLA_SCHEDULER_INTERVAL_MS.
 * Performs an initial catch-up execution 5 seconds after server startup.
 */
export function startSlaScheduler() {
  if (schedulerTimer || initialTimeout) {
    console.log('[SLA Scheduler] Daemon is already running.');
    return;
  }

  const intervalMs = parseInt(process.env.SLA_SCHEDULER_INTERVAL_MS || '3600000', 10);
  console.log(`[SLA Scheduler] Initializing SLA & Expiry daemon (Interval: ${intervalMs}ms)...`);

  // Initial catch-up execution after 5 seconds
  initialTimeout = setTimeout(async () => {
    try {
      await executeSlaCascadeRun();
    } catch (err) {
      console.error('[SLA Scheduler] Initial run failed:', err);
    }
  }, 5000);

  // Periodic recurring interval
  schedulerTimer = setInterval(async () => {
    try {
      await executeSlaCascadeRun();
    } catch (err) {
      console.error('[SLA Scheduler] Interval run failed:', err);
    }
  }, intervalMs);

  console.log('[SLA Scheduler] Background daemon successfully started.');
}

/**
 * Stops the background scheduler daemon (used for graceful shutdown or tests).
 */
export function stopSlaScheduler() {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  console.log('[SLA Scheduler] Daemon stopped.');
}
