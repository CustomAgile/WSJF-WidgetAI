/**
 * Copyright (c) 2026 Custom Agile LLC. All rights reserved.
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWsjfData } from './useWsjfData';
import type { WsjfDataProvider, WsjfItem } from '../types';

// ── Fake provider helpers ──────────────────────────────────────────────────────

const ITEM_A: WsjfItem = {
  ObjectID: 1,
  FormattedID: 'F1',
  Name: 'Alpha',
  RROEValue: 8,
  UserBusinessValue: 9,
  TimeCriticality: 7,
  JobSize: 3,
  WSJFScore: 8,
  PortfolioItemTypeName: 'Feature',
  State: 'In-Progress',
  OwnerName: 'Alice',
};

const ITEM_B: WsjfItem = {
  ObjectID: 2,
  FormattedID: 'F2',
  Name: 'Beta',
  RROEValue: null,
  UserBusinessValue: null,
  TimeCriticality: null,
  JobSize: null,
  WSJFScore: null,
  PortfolioItemTypeName: 'Feature',
  State: 'Backlog',
  OwnerName: null,
};

function makeProvider(
  items: WsjfItem[] = [ITEM_A, ITEM_B],
): WsjfDataProvider {
  return {
    fetchItems: vi.fn().mockResolvedValue(items),
    updateItem: vi.fn().mockResolvedValue(undefined),
  };
}

function makeErrorProvider(message = 'Network failure'): WsjfDataProvider {
  return {
    fetchItems: vi.fn().mockRejectedValue(new Error(message)),
    updateItem: vi.fn().mockResolvedValue(undefined),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useWsjfData', () => {
  it('starts in loading state', () => {
    const provider = makeProvider();
    const { result } = renderHook(() =>
      useWsjfData(provider, 'portfolioitem/feature', null),
    );
    expect(result.current.loading).toBe(true);
    expect(result.current.items).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('loads items from the provider and clears loading', async () => {
    const provider = makeProvider();
    const { result } = renderHook(() =>
      useWsjfData(provider, 'portfolioitem/feature', null),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(2);
    expect(result.current.items[0].FormattedID).toBe('F1');
    expect(result.current.error).toBeNull();
  });

  it('passes itemType and extraQuery through to fetchItems', async () => {
    const provider = makeProvider();
    renderHook(() =>
      useWsjfData(provider, 'portfolioitem/epic', '(State = "In-Progress")'),
    );

    await waitFor(() =>
      expect(provider.fetchItems).toHaveBeenCalledWith(
        'portfolioitem/epic',
        '(State = "In-Progress")',
      ),
    );
  });

  it('surfaces errors and clears loading', async () => {
    const provider = makeErrorProvider('Connection refused');
    const { result } = renderHook(() =>
      useWsjfData(provider, 'portfolioitem/feature', null),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Connection refused');
    expect(result.current.items).toHaveLength(0);
  });

  it('uses generic error message for non-Error rejections', async () => {
    const provider: WsjfDataProvider = {
      fetchItems: vi.fn().mockRejectedValue('oops'),
      updateItem: vi.fn(),
    };
    const { result } = renderHook(() =>
      useWsjfData(provider, 'portfolioitem/feature', null),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Failed to load items');
  });

  it('refresh() re-invokes fetchItems', async () => {
    const provider = makeProvider();
    const { result } = renderHook(() =>
      useWsjfData(provider, 'portfolioitem/feature', null),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(provider.fetchItems).toHaveBeenCalledTimes(1);

    act(() => { result.current.refresh(); });

    await waitFor(() => expect(provider.fetchItems).toHaveBeenCalledTimes(2));
  });

  it('refresh() resets error on retry', async () => {
    let callCount = 0;
    const provider: WsjfDataProvider = {
      fetchItems: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.reject(new Error('fail'));
        return Promise.resolve([ITEM_A]);
      }),
      updateItem: vi.fn(),
    };

    const { result } = renderHook(() =>
      useWsjfData(provider, 'portfolioitem/feature', null),
    );

    await waitFor(() => expect(result.current.error).toBe('fail'));

    act(() => { result.current.refresh(); });

    await waitFor(() => expect(result.current.error).toBeNull());
    expect(result.current.items).toHaveLength(1);
  });

  it('re-fetches when itemType changes', async () => {
    const provider = makeProvider();
    let itemType = 'portfolioitem/feature';
    const { result, rerender } = renderHook(() =>
      useWsjfData(provider, itemType, null),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(provider.fetchItems).toHaveBeenCalledTimes(1);

    itemType = 'portfolioitem/epic';
    rerender();

    await waitFor(() => expect(provider.fetchItems).toHaveBeenCalledTimes(2));
    expect(provider.fetchItems).toHaveBeenLastCalledWith('portfolioitem/epic', null);
  });
});
