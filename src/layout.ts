import { DropRegion } from './util/geometry';
import { v4 as uuid } from 'uuid';

export type LayoutItemId = string | number;

// NOTE: This tile layout is serializable, so it can be persisted.
export type TileLayoutConfig = TileGroupConfig | TileConfig;

export type LayoutItem = {
  id?: LayoutItemId;
  weight?: number;
  size?: number;
};

export type TileGroupDirection = 'row' | 'column';

export type TileGroupConfig = LayoutItem & {
  /** Direction of tile layout. */
  direction: TileGroupDirection;
  /** Width of gap between tiles in this group. */
  gap?: number;
  /** Items in this group. */
  items: (TileGroupConfig | TileConfig)[];
};

export type TileConfig = LayoutItem & {
  // TODO: Rename `type` to `renderer` or `component`.
  type: string;
};

export function isGroup(
  item: TileConfig | TileGroupConfig
): item is TileGroupConfig {
  return 'items' in item;
}

export function applyDrop(
  layout: TileLayoutConfig | null,
  fromId: LayoutItemId,
  toId: LayoutItemId,
  dropRegion: DropRegion
): TileLayoutConfig | null {
  if (layout === null) {
    throw new Error('Cannot drag and drop within an empty layout');
  }

  // TODO: Pre-compute summary fields and/or use a balanced tree to make this
  // impl more efficient for large layouts.

  const removed = remove(fromId, layout);
  if (!removed) {
    throw new Error(`Could not find item with ID: ${toId}`);
  }

  let newLayout = insert(removed, toId, dropRegion, layout);
  if (!newLayout) {
    throw new Error(`Failed to insert: could not find ${toId}.`);
  }

  newLayout = prune(newLayout);
  if (newLayout === null) {
    return null;
  }

  // Return a new object so React detects a change at the root level.
  return { ...newLayout };
}

function insert(
  tile: TileConfig,
  toId: LayoutItemId,
  dropRegion: DropRegion,
  group: TileLayoutConfig
): TileLayoutConfig | null {
  if (!isGroup(group)) {
    return null;
  }

  for (let i = 0; i < group.items.length; i++) {
    const item = group.items[i];
    if (item.id === toId) {
      const newGroup: TileGroupConfig = {
        id: uuid(),
        // TODO: Compute this based on the closest parent?
        gap: 1,
        direction:
          dropRegion === 'left' || dropRegion === 'right' ? 'row' : 'column',
        items:
          dropRegion === 'bottom' || dropRegion === 'right'
            ? [item, tile]
            : [tile, item],
      };
      group.items.splice(i, 1, newGroup);
      // Make the array different so that React detects a change.
      group.items = [...group.items];
      return group;
    } else if (isGroup(item)) {
      const success = Boolean(insert(tile, toId, dropRegion, item));
      if (success) {
        // Make the array different so that React detects a change.
        group.items = [...group.items];
        return group;
      }
    }
  }

  return null;
}

function remove(id: LayoutItemId, group: TileLayoutConfig): TileConfig | null {
  if (!isGroup(group)) {
    return null;
  }

  for (let i = 0; i < group.items.length; i++) {
    const item = group.items[i];
    if (item.id === id) {
      const removed = item;
      if (isGroup(removed)) {
        throw new Error('Attempted to remove a group.');
      }
      group.items.splice(i, 1);
      // Make the array different so that React detects a change.
      group.items = [...group.items];
      return removed;
    } else if (isGroup(item)) {
      const removed = remove(id, item);
      if (removed) {
        // Make the array different so that React detects a change.
        group.items = [...group.items];
        return removed;
      }
    }
  }

  return null;
}

function prune(config: TileLayoutConfig): TileLayoutConfig | null {
  if (!isGroup(config)) {
    return config;
  }

  let group = config;
  let items = [...group.items] as (TileLayoutConfig | null)[];
  let changed = false;
  for (let i = 0; i < items.length; i++) {
    const item = group.items[i];
    const pruned = prune(item);
    if (item !== pruned) {
      items[i] = pruned;
      changed = true;
    }
  }
  const newItems = items.filter(Boolean) as TileLayoutConfig[];
  if (changed) {
    group = { ...group, items: newItems };
  }
  if (group.items.length === 0) {
    return null;
  }
  if (group.items.length === 1) {
    return group.items[0];
  }

  return group;
}
