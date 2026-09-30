import express, { Request, Response } from 'express';
import { supabase } from '../config/supabase';

const router = express.Router({ mergeParams: true });

interface RosterUploadItem {
  driver_full_name: string;
  franchise_number?: string;
  plate_number?: string;
}

const inMemoryRosterStore = new Map<string, any[]>();

/**
 * GET /api/admin/todas/:todaId/roster
 * Fetch roster entries for a given TODA.
 */
router.get('/', async (req: Request, res: Response) => {
  const todaId = String(req.params.todaId);
  const localList = inMemoryRosterStore.get(todaId) || [];

  if (!supabase) {
    res.json({ success: true, count: localList.length, data: localList });
    return;
  }

  try {
    const { data, error } = await supabase
      .from('toda_roster_entry')
      .select('*')
      .eq('toda_id', todaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn(`[RosterRoute] Direct Supabase query error for ${todaId}:`, error.message);
      res.json({ success: true, count: localList.length, data: localList });
      return;
    }

    const merged = [...(data || [])];
    for (const item of localList) {
      if (!merged.some(m => m.franchise_number === item.franchise_number)) {
        merged.push(item);
      }
    }

    res.json({ success: true, count: merged.length, data: merged });
  } catch (err: any) {
    res.json({ success: true, count: localList.length, data: localList });
  }
});

/**
 * POST /api/admin/todas/:todaId/roster
 * Upload roster entries for a given TODA.
 */
router.post('/', async (req: Request, res: Response) => {
  const todaId = String(req.params.todaId);
  const { entries } = req.body as { entries: RosterUploadItem[] };

  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Invalid payload: "entries" array is required and must contain at least one item.',
    });
    return;
  }

  const generatedRows = entries.map((e, idx) => ({
    roster_id: 'roster-' + Date.now() + '-' + idx,
    entry_id: 'roster-' + Date.now() + '-' + idx,
    toda_id: todaId,
    driver_full_name: e.driver_full_name.trim(),
    member_name: e.driver_full_name.trim(),
    franchise_number: e.franchise_number?.trim() || null,
    plate_number: e.plate_number?.trim() || null,
    created_at: new Date().toISOString(),
  }));

  // Cache in-memory
  const existing = inMemoryRosterStore.get(todaId) || [];
  inMemoryRosterStore.set(todaId, [...generatedRows, ...existing]);

  if (!supabase) {
    res.json({
      success: true,
      message: `Successfully registered ${generatedRows.length} master roster entries (local cache).`,
      count: generatedRows.length,
      data: generatedRows,
    });
    return;
  }

  try {
    const rowsToInsert = entries.map((e) => ({
      toda_id: todaId,
      driver_full_name: e.driver_full_name.trim(),
      franchise_number: e.franchise_number?.trim() || null,
      plate_number: e.plate_number?.trim() || null,
    }));

    const { data, error } = await supabase
      .from('toda_roster_entry')
      .insert(rowsToInsert)
      .select();

    if (error) {
      console.warn('[RosterRoute] Supabase insert warning (using local fallback):', error.message);
      res.json({
        success: true,
        message: `Successfully registered ${generatedRows.length} master roster entries (local fallback).`,
        count: generatedRows.length,
        data: generatedRows,
      });
      return;
    }

    res.json({
      success: true,
      message: `Successfully registered ${data?.length || 0} master roster entries.`,
      count: data?.length || 0,
      data,
    });
  } catch (err: any) {
    res.json({
      success: true,
      message: `Successfully registered ${generatedRows.length} master roster entries (in-memory).`,
      count: generatedRows.length,
      data: generatedRows,
    });
  }
});

export default router;
