/** Copyright (c) 2026 Custom Agile LLC. All rights reserved. */

import { useState, useEffect, useCallback } from 'react';
import type { WsjfDataProvider, WsjfItem } from '../types';

export interface UseWsjfDataResult {
  items: WsjfItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWsjfData(
  data: WsjfDataProvider,
  itemType: string,
  extraQuery: string | null,
): UseWsjfDataResult {
  const [items, setItems] = useState<WsjfItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    data
      .fetchItems(itemType, extraQuery)
      .then((results) => {
        if (!cancelled) {
          setItems(results);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load items');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, itemType, extraQuery ?? '', tick]);

  return { items, loading, error, refresh };
}
