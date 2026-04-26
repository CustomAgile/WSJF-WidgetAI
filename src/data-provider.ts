/** Copyright (c) 2026 Custom Agile LLC. All rights reserved. */

import type { RallyContext } from '@customagile/widget-ai/types/rally-context';
import { wsapiQuery, wsapiUpdate } from '@customagile/widget-ai/data/wsapi';
import type { ArtifactTypeKey } from '@customagile/widget-ai/types/rally-registry';
import type { WsjfDataProvider, WsjfItem } from './types';

const FETCH_FIELDS =
  'ObjectID,FormattedID,Name,RROEValue,UserBusinessValue,TimeCriticality,JobSize,WSJFScore,PortfolioItemTypeName,State,Owner';

function mapItems(results: Record<string, unknown>[]): WsjfItem[] {
  return results.map((r) => {
    const state = r.State as { _refObjectName?: string } | string | null | undefined;
    const owner = r.Owner as { _refObjectName?: string } | null | undefined;
    return {
      ObjectID: r.ObjectID as number,
      FormattedID: r.FormattedID as string,
      Name: (r.Name as string) ?? '',
      RROEValue: (r.RROEValue as number | null) ?? null,
      UserBusinessValue: (r.UserBusinessValue as number | null) ?? null,
      TimeCriticality: (r.TimeCriticality as number | null) ?? null,
      JobSize: (r.JobSize as number | null) ?? null,
      WSJFScore: (r.WSJFScore as number | null) ?? null,
      PortfolioItemTypeName: (r.PortfolioItemTypeName as string) ?? '',
      State: typeof state === 'string' ? state : (state?._refObjectName ?? null),
      OwnerName: owner?._refObjectName ?? null,
    };
  });
}

export function createRallyProvider(ctx: RallyContext): WsjfDataProvider {
  return {
    async fetchItems(itemType, extraQuery) {
      const workspaceRef =
        typeof ctx.GlobalScope.Workspace === 'string'
          ? ctx.GlobalScope.Workspace
          : ctx.GlobalScope.Workspace._ref;

      const projectRef =
        typeof ctx.GlobalScope.Project === 'string'
          ? ctx.GlobalScope.Project
          : ctx.GlobalScope.Project._ref;

      const results = await wsapiQuery(itemType as ArtifactTypeKey, {
        fetch: FETCH_FIELDS,
        query: extraQuery ?? '',
        workspace: workspaceRef || undefined,
        project: projectRef || undefined,
        projectScopeDown: ctx.GlobalScope.ProjectScopeDown,
        order: 'WSJFScore DESC',
        pagesize: 200,
      });

      return mapItems(results as Record<string, unknown>[]);
    },

    async updateItem(itemType, oid, fields) {
      await wsapiUpdate(itemType as ArtifactTypeKey, oid, fields as never);
    },
  };
}
