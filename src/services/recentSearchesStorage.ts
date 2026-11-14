/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExplorerAnatomyId } from '../types/biomedical.ts';
import { EvidenceSourceMode } from '../types/federatedEvidence.ts';

export interface RecentClinicalSearch {
  id: string;
  query: string;
  anatomyId: ExplorerAnatomyId;
  anatomyLabel: string;
  clotPathProgress: number; // 0.0 to 1.0
  mode: EvidenceSourceMode;
  searchedAtIso: string;
}

export const DEFAULT_RECENT_SEARCHES_KEY = 'pe_explorer_recent_searches_v1';
export const XDC_RECENT_SEARCHES_KEY = 'pe_explorer_xdc_recent_searches_v1';
const MAX_RECENT_SEARCHES = 8;

const VALID_ANATOMY_IDS: ReadonlySet<string> = new Set([
  'deepVeins',
  'heart',
  'pulmonaryArtery',
  'lungs',
]);

const VALID_MODES: ReadonlySet<string> = new Set(['all', 'off-chain', 'on-chain']);

export function getShortAnatomyCode(id: ExplorerAnatomyId): string {
  switch (id) {
    case 'deepVeins':
      return 'DVT';
    case 'heart':
      return 'RV';
    case 'pulmonaryArtery':
      return 'PA';
    case 'lungs':
      return 'LUNG';
  }
}

export function loadRecentSearches(
  storageKey: string = DEFAULT_RECENT_SEARCHES_KEY
): RecentClinicalSearch[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is RecentClinicalSearch => {
        return (
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.query === 'string' &&
          item.query.trim().length > 0 &&
          typeof item.anatomyId === 'string' &&
          VALID_ANATOMY_IDS.has(item.anatomyId) &&
          typeof item.mode === 'string' &&
          VALID_MODES.has(item.mode) &&
          typeof item.clotPathProgress === 'number' &&
          Number.isFinite(item.clotPathProgress)
        );
      })
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

function persistRecentSearches(items: RecentClinicalSearch[], storageKey: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(items.slice(0, MAX_RECENT_SEARCHES)));
  } catch {
    // Ignore quota or storage restriction errors cleanly
  }
}

export function recordRecentSearch(
  entry: Omit<RecentClinicalSearch, 'id' | 'searchedAtIso'>,
  storageKey: string = DEFAULT_RECENT_SEARCHES_KEY
): RecentClinicalSearch[] {
  const normalizedQuery = entry.query.trim();
  if (!normalizedQuery) return loadRecentSearches(storageKey);

  const existing = loadRecentSearches(storageKey);
  const deduped = existing.filter(
    (item) => item.query.trim().toLowerCase() !== normalizedQuery.toLowerCase()
  );

  const nextEntry: RecentClinicalSearch = {
    id: `rs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    query: normalizedQuery,
    anatomyId: entry.anatomyId,
    anatomyLabel: entry.anatomyLabel,
    clotPathProgress: Math.max(0, Math.min(1, entry.clotPathProgress)),
    mode: entry.mode,
    searchedAtIso: new Date().toISOString(),
  };

  const updated = [nextEntry, ...deduped].slice(0, MAX_RECENT_SEARCHES);
  persistRecentSearches(updated, storageKey);
  return updated;
}

export function deleteRecentSearch(
  id: string,
  storageKey: string = DEFAULT_RECENT_SEARCHES_KEY
): RecentClinicalSearch[] {
  const updated = loadRecentSearches(storageKey).filter((item) => item.id !== id);
  persistRecentSearches(updated, storageKey);
  return updated;
}

export function clearAllRecentSearches(
  storageKey: string = DEFAULT_RECENT_SEARCHES_KEY
): RecentClinicalSearch[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore storage restriction errors cleanly
    }
  }
  return [];
}
