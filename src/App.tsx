/** Copyright (c) 2026 Custom Agile LLC. All rights reserved. */

import React, { useState, useMemo, useCallback } from 'react';
import '@customagile/widget-ai/styles/rally-app-tokens.css';
import '@customagile/widget-ai/styles/grid.css';

import type { RallyContext } from '@customagile/widget-ai/types/rally-context';
import { Grid } from '@customagile/widget-ai/components/Grid';
import type { GridColumn } from '@customagile/widget-ai/components/Grid';
import { AppHeader } from '@customagile/widget-ai/components/AppHeader';
import { EditModePanel, SettingRow } from '@customagile/widget-ai/components/EditModePanel';
import { useWidgetSettings, defineWidgetSettings } from '@customagile/widget-ai/components/settings';
import { useToast } from '@customagile/widget-ai/hooks';
import { ToastContainer } from '@customagile/widget-ai/components/Toast';

import type { WsjfDataProvider, WsjfItem, WsjfSettings } from './types';
import { calcWsjfScore } from './types';
import { useWsjfData } from './hooks/useWsjfData';

// ── Constants ──────────────────────────────────────────────────────────

const ITEM_TYPE_OPTIONS = [
  { value: 'portfolioitem/feature', label: 'Feature' },
  { value: 'portfolioitem/epic', label: 'Epic' },
];

const SETTINGS_DEFAULTS = defineWidgetSettings<WsjfSettings>({
  itemType: 'portfolioitem/feature',
  query: '',
});

// ── WSJF score color band ──────────────────────────────────────────────
// Uses blue / gray / light-gray to be colorblind-safe (no red/green adjacency)
function wsjfScoreStyle(score: number | null): React.CSSProperties {
  if (score === null) return { color: 'var(--ca-text-disabled)' };
  if (score >= 5) return { color: 'var(--ca-status-blue)', fontWeight: 600 };
  if (score >= 2) return { color: 'var(--ca-text-primary)', fontWeight: 500 };
  return { color: 'var(--ca-text-secondary)' };
}

// ── Column definitions ─────────────────────────────────────────────────

function buildColumns(rallyBaseUrl?: string): GridColumn[] {
  return [
    {
      text: 'ID',
      dataIndex: 'FormattedID',
      columnType: 'textShort',
      width: 90,
      sortable: true,
      locked: true,
      renderer: (value, record) => {
        const fid = value as string;
        if (!fid) return null;
        const oid = record.ObjectID as number;
        const base = rallyBaseUrl ?? '';
        const href = base
          ? `${base}/#/detail/portfolioitem/${(record.PortfolioItemTypeName as string).toLowerCase()}/${oid}`
          : undefined;
        return href
          ? <a href={href} target="_blank" rel="noreferrer" style={{ color: 'var(--ca-link)' }}>{fid}</a>
          : <span>{fid}</span>;
      },
    },
    {
      text: 'Name',
      dataIndex: 'Name',
      columnType: 'textLong',
      flex: 2,
      sortable: true,
      locked: true,
    },
    {
      text: 'State',
      dataIndex: 'State',
      columnType: 'textShort',
      width: 110,
      sortable: true,
    },
    {
      text: 'RR/OE Value',
      dataIndex: 'RROEValue',
      columnType: 'numeric',
      width: 100,
      sortable: true,
      editable: true,
      editorType: 'number',
    },
    {
      text: 'User/Biz Value',
      dataIndex: 'UserBusinessValue',
      columnType: 'numeric',
      width: 110,
      sortable: true,
      editable: true,
      editorType: 'number',
    },
    {
      text: 'Time Criticality',
      dataIndex: 'TimeCriticality',
      columnType: 'numeric',
      width: 120,
      sortable: true,
      editable: true,
      editorType: 'number',
    },
    {
      text: 'Job Size',
      dataIndex: 'JobSize',
      columnType: 'numeric',
      width: 90,
      sortable: true,
      editable: true,
      editorType: 'number',
    },
    {
      text: 'WSJF Score',
      dataIndex: 'WSJFScore',
      columnType: 'numeric',
      width: 110,
      sortable: true,
      renderer: (value) => {
        const score = value as number | null;
        return (
          <span style={wsjfScoreStyle(score)}>
            {score === null ? '—' : score.toFixed(2)}
          </span>
        );
      },
    },
    {
      text: 'Owner',
      dataIndex: 'OwnerName',
      columnType: 'textShort',
      width: 140,
      sortable: true,
    },
  ];
}

// ── App component ──────────────────────────────────────────────────────

interface AppProps {
  rallyContext: RallyContext;
  data: WsjfDataProvider;
}

export default function App({ rallyContext, data }: AppProps) {
  // ── Settings ───────────────────────────────────────────────────────
  const { settings, updateSetting, updateSettings } = useWidgetSettings<WsjfSettings>(
    rallyContext,
    SETTINGS_DEFAULTS,
  );

  // ── Local item state (optimistic updates) ──────────────────────────
  const [localItems, setLocalItems] = useState<Map<number, Partial<WsjfItem>>>(new Map());

  // ── Data ───────────────────────────────────────────────────────────
  const { items, loading, error, refresh } = useWsjfData(
    data,
    settings.itemType ?? 'portfolioitem/feature',
    settings.query || null,
  );

  // Merge local overrides into server items
  const mergedItems = useMemo(
    () =>
      items.map((item) => {
        const overrides = localItems.get(item.ObjectID);
        if (!overrides) return item as unknown as Record<string, unknown>;
        return { ...item, ...overrides } as unknown as Record<string, unknown>;
      }),
    [items, localItems],
  );

  // ── Toast ──────────────────────────────────────────────────────────
  const toast = useToast();

  // ── Inline edit handler ────────────────────────────────────────────
  const handleCellEdit = useCallback(
    async (record: Record<string, unknown>, field: string, value: unknown) => {
      const oid = record.ObjectID as number;
      const numValue = value === '' || value === null ? null : Number(value);

      // Build the update: the edited field + recalculated WSJFScore
      const current = { ...record, ...localItems.get(oid) } as Record<string, unknown>;
      const next: Record<string, unknown> = { [field]: numValue };

      if (['RROEValue', 'UserBusinessValue', 'TimeCriticality', 'JobSize'].includes(field)) {
        const rroe = field === 'RROEValue' ? numValue : (current.RROEValue as number | null);
        const ubv = field === 'UserBusinessValue' ? numValue : (current.UserBusinessValue as number | null);
        const tc = field === 'TimeCriticality' ? numValue : (current.TimeCriticality as number | null);
        const js = field === 'JobSize' ? numValue : (current.JobSize as number | null);
        next.WSJFScore = calcWsjfScore(rroe, ubv, tc, js);
      }

      // Optimistic update
      setLocalItems((prev) => {
        const m = new Map(prev);
        m.set(oid, { ...(m.get(oid) ?? {}), ...next } as Partial<WsjfItem>);
        return m;
      });

      try {
        await data.updateItem(settings.itemType ?? 'portfolioitem/feature', oid, next);
      } catch (err) {
        // Revert optimistic update on failure
        setLocalItems((prev) => {
          const m = new Map(prev);
          m.delete(oid);
          return m;
        });
        toast.showError(err instanceof Error ? err.message : 'Failed to save');
        throw err;
      }
    },
    [data, localItems, settings.itemType, toast],
  );

  // ── Columns ────────────────────────────────────────────────────────
  const columns = useMemo(
    () => buildColumns(rallyContext.Url?.origin),
    [rallyContext.Url?.origin],
  );

  // ── EditMode render ────────────────────────────────────────────────
  if (rallyContext.isEditMode) {
    return (
      <EditModePanel
        appName="WSJF Grid"
        version="0.1.0"
        appSlug="wsjf-grid"
        settings={settings as unknown as Record<string, unknown>}
        onSave={(dirty: Partial<WsjfSettings>) => updateSettings(dirty)}
        onClose={() => { /* Rally controls EditMode exit */ }}
      >
        <SettingRow label="Portfolio Item Type" settingKey="itemType">
          <select
            value={settings.itemType ?? 'portfolioitem/feature'}
            onChange={(e) => updateSetting('itemType', e.target.value)}
            style={{
              padding: '4px 8px',
              fontSize: 'var(--ca-font-size-sm)',
              color: 'var(--ca-text-primary)',
              backgroundColor: 'var(--ca-surface-raised)',
              border: '1px solid var(--ca-border-default)',
              borderRadius: 'var(--ca-radius-xs)',
            }}
          >
            {ITEM_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </SettingRow>

        <SettingRow label="Additional Filter" settingKey="query">
          <input
            type="text"
            value={settings.query ?? ''}
            onChange={(e) => updateSetting('query', e.target.value)}
            placeholder='e.g. (State = "In-Progress")'
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '4px 8px',
              fontSize: 'var(--ca-font-size-sm)',
              color: 'var(--ca-text-primary)',
              backgroundColor: 'var(--ca-surface-raised)',
              border: '1px solid var(--ca-border-default)',
              borderRadius: 'var(--ca-radius-xs)',
            }}
          />
        </SettingRow>
      </EditModePanel>
    );
  }

  // ── Normal view ────────────────────────────────────────────────────
  const typeLabel = ITEM_TYPE_OPTIONS.find((o) => o.value === settings.itemType)?.label ?? 'Features';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        fontFamily: 'var(--ca-font-family)',
        backgroundColor: 'var(--ca-surface-page)',
        color: 'var(--ca-text-primary)',
        overflow: 'hidden',
      }}
    >
      <AppHeader
        title="WSJF Grid"
        help={{
          content: (
            <>
              <p>
                The WSJF Grid shows {typeLabel} ranked by their Weighted Shortest Job First score.
                Click any cell in the RR/OE Value, User/Biz Value, Time Criticality, or Job Size
                columns to edit it inline — the WSJF Score updates automatically.
              </p>
              <p>
                <strong>Formula:</strong> WSJF = (RR/OE Value + User/Biz Value + Time Criticality) / Job Size
              </p>
              <p>
                Use Edit Mode to switch between Feature and Epic types, or add a custom filter.
              </p>
            </>
          ),
        }}
      />

      {error && (
        <div
          role="alert"
          style={{
            margin: 'var(--ca-space-2)',
            padding: 'var(--ca-space-2)',
            backgroundColor: 'var(--ca-status-red-bg)',
            color: 'var(--ca-status-red)',
            borderRadius: 'var(--ca-radius-sm)',
            fontSize: 'var(--ca-font-size-sm)',
          }}
        >
          ⚠ Error loading items: {error}
        </div>
      )}

      {loading && (
        <div
          aria-live="polite"
          aria-busy="true"
          style={{
            padding: 'var(--ca-space-4)',
            textAlign: 'center',
            color: 'var(--ca-text-secondary)',
            fontSize: 'var(--ca-font-size-sm)',
          }}
        >
          Loading…
        </div>
      )}

      {!loading && (
        <div style={{ flex: 1, overflow: 'hidden', padding: 'var(--ca-space-2)' }}>
          <Grid
            data={mergedItems}
            columns={columns}
            pageSize={50}
            rowKey="ObjectID"
            stateId="wsjf-grid-columns"
            showRowNumbers
            emptyText={`No ${typeLabel} found.`}
            onCellEdit={handleCellEdit}
            exportToCsv={`wsjf-${typeLabel.toLowerCase()}.csv`}
            exportToExcel={`wsjf-${typeLabel.toLowerCase()}.xlsx`}
          />
        </div>
      )}

      <ToastContainer />
    </div>
  );
}
