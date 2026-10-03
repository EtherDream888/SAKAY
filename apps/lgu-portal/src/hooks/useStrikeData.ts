import { useCallback, useEffect, useState } from 'react';

import type { StrikeItem } from '../mockData/adminData';
import {
  fetchStrikeHistory,
  fetchViolationCatalog,
  type StrikeSubjectType,
  type ViolationCatalogItem,
} from '../services/adminApiService';
import type { MacConfirmDialogOption } from '../components/admin/MacConfirmDialog';

interface StrikeData {
  history: StrikeItem[];
  activeStrikes: number | null;
  catalog: ViolationCatalogItem[];
  violationOptions: MacConfirmDialogOption[];
  reload: () => Promise<void>;
}

/** Dropdown labels for the violations an administrator may record by hand. */
function toViolationOptions(catalog: ViolationCatalogItem[]): MacConfirmDialogOption[] {
  return catalog.map((v) => {
    const points =
      v.ladder_bypass === 'SUSPEND_PENDING_INVESTIGATION'
        ? 'suspends pending investigation'
        : v.ladder_bypass === 'DEACTIVATE_FOR_REVIEW'
          ? 'deactivates for review'
          : v.ladder_bypass === 'ADMIN_REVIEW_ONLY'
            ? 'review flag only'
            : v.min_points === v.max_points
              ? `${v.default_points} strike${v.default_points === 1 ? '' : 's'}`
              : `${v.min_points}-${v.max_points} strikes`;
    return { value: v.violation_code, label: `${v.description} (${v.source_rule}) — ${points}` };
  });
}

/**
 * Loads one account's strike ledger (and, once, the violation catalog) from the policy
 * engine. The ledger is authoritative; nothing here is computed in the browser.
 */
export function useStrikeData(subjectType: StrikeSubjectType, subjectId: string | null | undefined): StrikeData {
  const [history, setHistory] = useState<StrikeItem[]>([]);
  const [activeStrikes, setActiveStrikes] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<ViolationCatalogItem[]>([]);

  const load = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      if (!subjectId) return;
      try {
        const res = await fetchStrikeHistory(subjectType, subjectId);
        if (isCancelled()) return;
        setHistory(res.history);
        setActiveStrikes(res.activeStrikes);
      } catch (err) {
        console.warn('[useStrikeData] Failed to load strike history:', err);
      }
    },
    [subjectType, subjectId]
  );

  useEffect(() => {
    let cancelled = false;
    setHistory([]);
    setActiveStrikes(null);
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const reload = useCallback(() => load(), [load]);

  useEffect(() => {
    let cancelled = false;
    fetchViolationCatalog(subjectType)
      .then((items) => {
        if (!cancelled) setCatalog(items);
      })
      .catch((err) => console.warn('[useStrikeData] Failed to load violation catalog:', err));
    return () => {
      cancelled = true;
    };
  }, [subjectType]);

  return { history, activeStrikes, catalog, violationOptions: toViolationOptions(catalog), reload };
}
