import { DropRegion } from './util/geometry';
import { v4 as uuid } from 'uuid';

export type LayoutItemId = string | number;

// TODO: Restructure so that TileConfig and TileTabGroupConfig are disjoint,
// and TileGroupConfig's children are of type TileConfig | TileTabGroupConfig.

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

export type TileTab = {
  id: LayoutItemId;
  type: string;
};

export type TabStripPosition = 'left' | 'top';

export type TileConfig = LayoutItem & {
  /**
   * Renderer type.
   *
   * For tabbed tiles, this will be empty.
   */
  // TODO: Rename `type` to something like `rendererKey` or `componentName`?
  type?: string;

  tabs?: TileTab[];
  tabStripPosition?: TabStripPosition;
};

export type TileTabGroup = LayoutItem & {
  // TODO: Decide whether this "type" is needed
  type: string;

  tabs: TileTab[];
};

export type DropTarget =
  | {
      dropRegion: DropRegion;
    }
  | {
      /** Index at which to place the dropped tab, or -1 to place at end of tab strip. */
      tabIndex: number;
    };

export function isGroup(
  item: TileConfig | TileGroupConfig
): item is TileGroupConfig {
  return 'items' in item;
}

export function isTabGroup(
  item: TileConfig | TileGroupConfig
): item is TileTabGroup {
  return 'tabs' in item;
}

export function applyDrop(
  layout: TileLayoutConfig | null,
  fromId: LayoutItemId,
  toId: LayoutItemId,
  dropTarget: DropTarget
): TileLayoutConfig | null {
  if (layout === null) {
    throw new Error('Cannot drag and drop within an empty layout');
  }

  // TODO: Pre-compute summary fields and/or use a balanced tree to make this
  // impl more efficient for large layouts.

  let removed: TileGroupConfig | TileConfig | null;
  const removeResult = remove(fromId, layout);
  if (!removeResult) {
    throw new Error(`Could not find item with ID: ${toId}`);
  }
  [layout, removed] = removeResult;

  let newLayout = insert(removed, toId, dropTarget, layout);
  if (!newLayout) {
    throw new Error(`Failed to insert: could not find ${toId}.`);
  }

  newLayout = prune(newLayout);
  if (newLayout === null) {
    return null;
  }

  console.log(newLayout);

  // Return a new object so React detects a change at the root level.
  return { ...newLayout };
}

function insert(
  tile: TileConfig,
  toId: LayoutItemId,
  dropTarget: DropTarget,
  group: TileLayoutConfig | null
): TileLayoutConfig | null {
  console.debug('insert from', tile.id, 'to', toId);

  if (group === null) {
    return tile;
  }

  // Cannot insert into plain content tiles.
  if (!isGroup(group) && !isTabGroup(group)) {
    return null;
  }

  if (isTabGroup(group)) {
    const tabGroup = group;
    if (group.id !== toId) {
      return null;
    }
    if ('dropRegion' in dropTarget) {
      // Split the weight across the new group and the item it's being dragged into.
      const splitWeight = (tabGroup.weight || 1) / 2;

      const newTabGroup: TileTabGroup = {
        id: uuid(),
        weight: splitWeight,
        type: tile.type as string,
        tabs: [tile as TileTab],
      };

      const dropRegion = dropTarget.dropRegion;
      const newItem = {
        ...tabGroup,
        weight: splitWeight,
      };

      const newGroup: TileGroupConfig = {
        id: uuid(),
        // TODO: Compute this based on the closest parent's gap?
        gap: 1,
        weight: tabGroup.weight,
        direction:
          dropRegion === 'left' || dropRegion === 'right' ? 'row' : 'column',
        items:
          dropRegion === 'bottom' || dropRegion === 'right'
            ? [newItem, newTabGroup]
            : [newTabGroup, newItem],
      };

      return newGroup;
    }
    let tabIndex = dropTarget.tabIndex;
    if (tabIndex === -1) {
      tabIndex += tabGroup.tabs.length + 1;
    }
    const newTabs = [...tabGroup.tabs];
    const tab: TileTab = {
      id: tile.id as LayoutItemId,
      type: tile.type as string,
    };
    newTabs.splice(tabIndex, 0, tab);

    return {
      ...tabGroup,
      tabs: newTabs,
    };
  }

  // Handle insertion into groups.

  for (let i = 0; i < group.items.length; i++) {
    const item = group.items[i];

    // Dragging an item into a
    if (item.id === toId && 'dropRegion' in dropTarget) {
      // Split the weight across the new group and the item it's being dragged into.
      const splitWeight = (item.weight || 1) / 2;

      const newTabGroup: TileTabGroup = {
        id: uuid(),
        weight: splitWeight,
        type: tile.type as string,
        tabs: [tile as TileTab],
      };

      const dropRegion = dropTarget.dropRegion;
      const newItem = {
        ...item,
        weight: splitWeight,
      };

      const newGroup: TileGroupConfig = {
        id: uuid(),
        // TODO: Compute this based on the closest parent's gap?
        gap: 1,
        weight: item.weight,
        direction:
          dropRegion === 'left' || dropRegion === 'right' ? 'row' : 'column',
        items:
          dropRegion === 'bottom' || dropRegion === 'right'
            ? [newItem, newTabGroup]
            : [newTabGroup, newItem],
      };
      group.items.splice(i, 1, newGroup);
      // Make the array different so that React detects a change.
      group.items = [...group.items];
      return group;
    }

    // Recurse on each group item. If the insert was successful, return a new group
    // object with the original item replaced by the updated item.
    const newItem = insert(tile, toId, dropTarget, item);
    if (newItem) {
      const items = [...group.items];
      items.splice(i, 1, newItem);
      return { ...group, items };
    }
  }

  return null;
}

function remove(
  id: LayoutItemId,
  group: TileLayoutConfig
): [layout: TileLayoutConfig, removed: TileConfig] | null {
  if (!isGroup(group) && !isTabGroup(group)) {
    return null;
  }

  if (isTabGroup(group)) {
    const tabGroup = group;
    for (let i = 0; i < tabGroup.tabs.length; i++) {
      const tab = tabGroup.tabs[i];
      if (tab.id !== id) continue;

      const tabs = [...tabGroup.tabs];
      const [removed] = tabs.splice(i, 1);
      return [{ ...tabGroup, tabs }, removed];
    }
    return null;
  }

  for (let i = 0; i < group.items.length; i++) {
    const item = group.items[i];
    if (item.id === id) {
      const removed = item;
      if (isGroup(removed)) {
        throw new Error('Attempted to remove a group.');
      }
      const items = [...group.items];
      items.splice(i, 1);
      return [{ ...group, items }, removed];
    }

    // Recurse on each item.
    const result = remove(id, item);
    if (result) {
      const [newItem, removed] = result;
      const items = [...group.items];
      items.splice(i, 1, newItem);
      return [{ ...group, items }, removed];
    }
  }

  return null;
}

function prune(config: TileLayoutConfig): TileLayoutConfig | null {
  if (!isGroup(config) && !isTabGroup(config)) {
    return config;
  }

  // Prune empty tab groups
  if (isTabGroup(config)) {
    if (!config.tabs.length) {
      return null;
    }
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
