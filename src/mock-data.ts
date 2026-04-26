/** Copyright (c) 2026 Custom Agile LLC. All rights reserved. */

import { DEFAULT_RALLY_CONTEXT } from '@customagile/widget-ai/types/rally-context';
import type { RallyContext } from '@customagile/widget-ai/types/rally-context';
import type { WsjfDataProvider, WsjfItem } from './types';
import { calcWsjfScore } from './types';

// ── Mock portfolio items ───────────────────────────────────────────────

function makeItem(
  oid: number,
  fid: string,
  name: string,
  rroe: number | null,
  ubv: number | null,
  tc: number | null,
  jobSize: number | null,
  state: string,
  owner: string | null,
): WsjfItem {
  return {
    ObjectID: oid,
    FormattedID: fid,
    Name: name,
    RROEValue: rroe,
    UserBusinessValue: ubv,
    TimeCriticality: tc,
    JobSize: jobSize,
    WSJFScore: calcWsjfScore(rroe, ubv, tc, jobSize),
    PortfolioItemTypeName: 'Feature',
    State: state,
    OwnerName: owner,
  };
}

const MOCK_ITEMS: WsjfItem[] = [
  makeItem(1001, 'F1001', 'SSO / Single Sign-On',               8, 9, 7, 3, 'In-Progress', 'Alice Smith'),
  makeItem(1002, 'F1002', 'Customer-facing API v2',             7, 8, 6, 5, 'Defined',     'Bob Jones'),
  makeItem(1003, 'F1003', 'Data export to Excel/CSV',           5, 7, 4, 2, 'Defined',     'Carol Lee'),
  makeItem(1004, 'F1004', 'Mobile app — offline mode',          6, 5, 8, 8, 'Backlog',     null),
  makeItem(1005, 'F1005', 'Compliance: GDPR data retention',    9, 4, 9, 4, 'Defined',     'Alice Smith'),
  makeItem(1006, 'F1006', 'Bulk import wizard',                 3, 6, 3, 3, 'Backlog',     'Bob Jones'),
  makeItem(1007, 'F1007', 'Real-time notifications',            4, 7, 5, 6, 'Backlog',     null),
  makeItem(1008, 'F1008', 'Dashboard performance overhaul',     5, 6, 4, 8, 'Defined',     'Carol Lee'),
  makeItem(1009, 'F1009', 'Self-service password reset',        6, 8, 5, 2, 'Completed',   'Alice Smith'),
  makeItem(1010, 'F1010', 'Audit log viewer',                   7, 5, 6, 3, 'In-Progress', 'Bob Jones'),
  makeItem(1011, 'F1011', 'Multi-tenant workspace isolation',   8, 6, 7, 5, 'Backlog',     null),
  makeItem(1012, 'F1012', 'Webhook integrations',               4, 5, 3, 4, 'Defined',     'Carol Lee'),
  makeItem(1013, 'F1013', 'Advanced search & filtering',        null, null, null, null, 'Backlog', null),
].sort((a, b) => (b.WSJFScore ?? 0) - (a.WSJFScore ?? 0));

// ── Mock provider ─────────────────────────────────────────────────────

const STORE = new Map<number, WsjfItem>(MOCK_ITEMS.map((i) => [i.ObjectID, { ...i }]));

export const mockProvider: WsjfDataProvider = {
  fetchItems: async () => {
    const items = [...STORE.values()].sort((a, b) => (b.WSJFScore ?? 0) - (a.WSJFScore ?? 0));
    return items;
  },

  updateItem: async (_itemType, oid, fields) => {
    const item = STORE.get(oid);
    if (!item) return;
    const updated = { ...item, ...fields } as WsjfItem;
    STORE.set(oid, updated);
  },
};

// ── Mock context ──────────────────────────────────────────────────────

export const mockContext: RallyContext = {
  ...DEFAULT_RALLY_CONTEXT,
  User: {
    _ref: '/user/999',
    DisplayName: 'Mock User',
    EmailAddress: 'mock@example.com',
    UserName: 'mockuser',
    ObjectID: 999,
  },
  WidgetName: 'WSJF Grid',
  WidgetUUID: 'mock-wsjf-grid-uuid',
  isEditMode: false,
  Settings: {},
};
