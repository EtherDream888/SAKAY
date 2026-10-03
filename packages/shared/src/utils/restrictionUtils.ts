import { STRIKE_LADDER } from '../config/policyConfig';

/**
 * Account restriction helpers (Batch 3 - Sections 1, 20, 21, 22).
 * The database decides whether an account is restricted (public.account_restriction_state);
 * these helpers only describe that decision to the user in Tagalog / English.
 */

export type RestrictionKind = 'SUSPENDED' | 'INVESTIGATION' | 'DEACTIVATED' | 'CLOSED';

export interface AccountRestriction {
  restricted: boolean;
  kind?: RestrictionKind | null;
  /** ISO timestamp (UTC) when a time-bound suspension ends; null for open-ended states */
  until?: string | null;
  reason?: string | null;
}

export type NoticeLanguage = 'tl' | 'en';

/** The only part of a Supabase client the restriction lookup needs. */
export interface RpcCapableClient {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
}

/**
 * Asks the database whether the signed-in user is suspended or deactivated
 * (public.get_my_account_restriction). The database also lifts a suspension whose period
 * has ended, so nobody is kept out by a background job that has not run yet.
 * Returns null when the check cannot be made; callers then fall back to the status column.
 */
export async function fetchOwnAccountRestriction(
  client: RpcCapableClient,
  role: 'passenger' | 'driver'
): Promise<AccountRestriction | null> {
  try {
    const { data, error } = await client.rpc('get_my_account_restriction', { p_role: role });
    const row = data as { found?: boolean; restricted?: boolean; kind?: RestrictionKind | null; until?: string | null; reason?: string | null } | null;
    if (error || !row || row.found === false) return null;
    return { restricted: Boolean(row.restricted), kind: row.kind ?? null, until: row.until ?? null, reason: row.reason ?? null };
  } catch {
    return null;
  }
}

/** Formats an ISO timestamp for display in Asia/Manila (storage stays UTC). */
export function formatManilaDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })} (PHT)`;
}

/** Plain-language notice for a restriction, in the user's language. */
export function describeRestriction(restriction: AccountRestriction, language: NoticeLanguage): string {
  const until = formatManilaDateTime(restriction.until);
  switch (restriction.kind) {
    case 'DEACTIVATED':
    case 'CLOSED':
      return language === 'tl'
        ? 'Na-deactivate ang inyong account at nangangailangan ng pagsusuri ng LGU.'
        : 'Your account is deactivated and requires LGU review.';
    case 'INVESTIGATION':
      return language === 'tl'
        ? 'Pansamantalang sinuspinde ang inyong account habang may imbestigasyon.'
        : 'Your account is suspended pending investigation.';
    case 'SUSPENDED':
    default:
      if (until) {
        return language === 'tl'
          ? `Suspendido ang inyong account hanggang ${until}.`
          : `Your account is suspended until ${until}.`;
      }
      return language === 'tl' ? 'Suspendido ang inyong account.' : 'Your account is suspended.';
  }
}

/**
 * Recovers the restriction from a database error raised by the enforcement guards
 * (messages start with ERR_ACCOUNT_SUSPENDED / ERR_ACCOUNT_DEACTIVATED and end with
 * "[kind=... until=...]"). Returns null for any other error.
 */
export function parseRestrictionError(message: string | null | undefined): AccountRestriction | null {
  if (!message) return null;
  if (!message.includes('ERR_ACCOUNT_SUSPENDED') && !message.includes('ERR_ACCOUNT_DEACTIVATED')) return null;
  const kindMatch = message.match(/kind=([A-Z]+)/);
  const untilMatch = message.match(/until=([0-9T:\-Z.]+)/);
  const kind = (kindMatch?.[1] as RestrictionKind | undefined) ??
    (message.includes('ERR_ACCOUNT_DEACTIVATED') ? 'DEACTIVATED' : 'SUSPENDED');
  return { restricted: true, kind, until: untilMatch?.[1] ?? null };
}

export interface StrikeLadderTier {
  /** 0 = compliant ... 5 = deactivation */
  tier: 0 | 1 | 2 | 3 | 4 | 5;
  label: string;
}

/** Ladder tier for an active-strike total (Sections 20/21), with lengths from policyConfig. */
export function getStrikeLadderTier(activeStrikes: number): StrikeLadderTier {
  const n = Math.max(0, Math.floor(activeStrikes));
  const L = STRIKE_LADDER;
  if (n >= L.DEACTIVATION_AT) return { tier: 5, label: `Permanent Deactivation Review (${n} / ${L.DEACTIVATION_AT})` };
  if (n >= L.SUSPENSION_2_AT) return { tier: 4, label: `${L.SUSPENSION_2_DAYS}-Day Suspension (${n} / ${L.DEACTIVATION_AT})` };
  if (n >= L.SUSPENSION_1_AT) return { tier: 3, label: `${L.SUSPENSION_1_DAYS}-Day Suspension (${n} / ${L.DEACTIVATION_AT})` };
  if (n >= L.ADMIN_REVIEW_AT) return { tier: 2, label: `Administrative Review (${n} / ${L.DEACTIVATION_AT})` };
  if (n >= L.WARNING_AT) return { tier: 1, label: `Warning Issued (${n} / ${L.DEACTIVATION_AT})` };
  return { tier: 0, label: `Compliant (0 / ${L.DEACTIVATION_AT})` };
}
