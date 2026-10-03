import { getStrikeLadderTier } from '@sakay/shared/utils/restrictionUtils';

const LEVEL_COLORS = [
  { color: '#1E8E3E', bg: '#E6F4EA', border: '#A8DADC' },
  { color: '#B06000', bg: '#FEF7E0', border: '#FCE8E6' },
  { color: '#C2410C', bg: '#FFF7ED', border: '#FDBA74' },
  { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
  { color: '#B91C1C', bg: '#FEE2E2', border: '#F87171' },
  { color: '#7F1D1D', bg: '#FEF2F2', border: '#EF4444' },
];

/** Strike-ladder label and chip colours for an active-strike total (Sections 20/21). */
export function getStrikeLevel(activeStrikes: number): { label: string; color: string; bg: string; border: string } {
  const { tier, label } = getStrikeLadderTier(activeStrikes);
  return { label: tier === 0 ? label : `Level ${tier}: ${label}`, ...LEVEL_COLORS[tier] };
}
