/** Copyright (c) 2026 Custom Agile LLC. All rights reserved. */

import type { WidgetSettings } from '@customagile/widget-ai/components/settings';

// ── WSJF item data shape ───────────────────────────────────────────────

/** A single Portfolio Item row in the WSJF Grid. */
export interface WsjfItem {
  ObjectID: number;
  FormattedID: string;
  Name: string;
  /** RR/OE Value — Risk component of WSJF */
  RROEValue: number | null;
  /** User/Business Value component of WSJF */
  UserBusinessValue: number | null;
  /** Time Criticality component of WSJF */
  TimeCriticality: number | null;
  /** Job Size — denominator of WSJF formula */
  JobSize: number | null;
  /** WSJF Score = (RROEValue + UserBusinessValue + TimeCriticality) / JobSize */
  WSJFScore: number | null;
  /** Portfolio item type name (e.g. "Feature", "Epic") */
  PortfolioItemTypeName: string;
  /** State name for display */
  State: string | null;
  /** Owner display name */
  OwnerName: string | null;
  [key: string]: unknown;
}

// ── WSJF formula ───────────────────────────────────────────────────────

/**
 * Calculate WSJF score from its four components.
 * Returns null when JobSize is 0 or null (avoid divide-by-zero).
 */
export function calcWsjfScore(
  rroe: number | null,
  ubv: number | null,
  tc: number | null,
  jobSize: number | null,
): number | null {
  if (!jobSize) return null;
  const numerator = (rroe ?? 0) + (ubv ?? 0) + (tc ?? 0);
  return Math.round((numerator / jobSize) * 100) / 100;
}

// ── App settings ───────────────────────────────────────────────────────

export interface WsjfSettings extends WidgetSettings {
  /** Portfolio item type path, e.g. "portfolioitem/feature" or "portfolioitem/epic" */
  itemType: string;
  /** Optional user-defined WSAPI query filter */
  query: string;
}

// ── DataProvider interface ─────────────────────────────────────────────

export interface WsjfDataProvider {
  /**
   * Fetch portfolio items for the current project scope.
   * @param itemType  WSAPI type path (e.g. "portfolioitem/feature")
   * @param extraQuery  Optional additional WSAPI query filter
   */
  fetchItems(itemType: string, extraQuery: string | null): Promise<WsjfItem[]>;

  /**
   * Update fields on a single portfolio item.
   * @param itemType  WSAPI type path
   * @param oid       ObjectID of the item
   * @param fields    Partial field map to update
   */
  updateItem(itemType: string, oid: number, fields: Record<string, unknown>): Promise<void>;
}
