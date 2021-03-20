import { DropRegion } from './util/geometry';
import { v4 as uuid } from 'uuid';

export type LayoutItemId = string;

// TODO: Restructure so that TileConfig and TileTabGroupConfig are disjoint,
// and TileGroupConfig's children are of type TileConfig | TileTabGroupConfig.

// NOTE: This tile layout is serializable, so it can be persisted.
export type TileLayoutConfig = TileGroupConfig | TileConfig;

/**
 * ActiveTabState maps each tab group to the index of the currently
 * active tab within the group.
 */
// TODO: rename to ActiveTabIndexes?
export type ActiveTabState = Record<LayoutItemId, number>;

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

export type ContainerType = 'tile' | 'tab';

export type ContentContainerId = {
  type: string;
  container: ContainerType;
  id: LayoutItemId;
};

export function contentContainerIdKey({
  type,
  container,
  id,
}: ContentContainerId) {
  if (!type || !container || !id) return null;
  return JSON.stringify([type, container, id]);
}

export type TileTabConfig = {
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

  tabs?: TileTabConfig[];
  tabStripPosition?: TabStripPosition;
};

export type TileTabGroupConfig = LayoutItem & {
  // TODO: Decide whether this "type" is needed
  type: string;

  tabs: TileTabConfig[];
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
): item is TileTabGroupConfig {
  return 'tabs' in item;
}

export function tileInstanceCount(
  layout: TileLayoutConfig | null,
  id: LayoutItemId
): number {
  if (layout === null) return 0;

  if (isGroup(layout)) {
    let sum = 0;
    for (const item of layout.items) {
      sum += tileInstanceCount(item, id);
    }
    return sum;
  }

  if (isTabGroup(layout)) {
    let sum = 0;
    for (const tab of layout.tabs) {
      sum += tileInstanceCount(tab, id);
    }
    return sum;
  }

  if (layout.id === id) {
    return 1;
  }

  return 0;
}

export function applyRemove(
  layout: TileLayoutConfig | null,
  id: LayoutItemId
): TileLayoutConfig | null {
  if (layout === null) {
    throw new Error('Cannot remove from an empty layout');
  }

  const removeResult = remove(id, layout);
  if (!removeResult) {
    throw new Error(`Could not remove item with ID: ${id}`);
  }
  [layout] = removeResult;
  layout = prune(layout);

  if (layout === null) return null;

  return { ...layout, weight: 1 };
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

  const removeResult = remove(fromId, layout);
  if (!removeResult) {
    throw new Error(`Could not find item with ID: ${toId}`);
  }
  let removed: TileGroupConfig | TileConfig | null;
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
  // Always ensure the root weight is 1.
  return { ...newLayout, weight: 1 };
}

export function getContentContainerIds(
  layout: TileLayoutConfig | null
): ContentContainerId[] {
  if (layout === null) return [];
  return populateContentContainerIds(layout, []);
}

function populateContentContainerIds(
  config: TileGroupConfig | TileConfig | TileTabGroupConfig,
  acc: ContentContainerId[]
): ContentContainerId[] {
  if (isGroup(config)) {
    for (const item of config.items) {
      populateContentContainerIds(item, acc);
    }
    return acc;
  }
  if (isTabGroup(config)) {
    for (const tab of config.tabs) {
      const { type, id } = tab;
      acc.push({ container: 'tab', type, id }, { container: 'tile', type, id });
    }
    return acc;
  }

  const tile = config as TileConfig;
  acc.push({
    container: 'tile',
    type: tile.type as string,
    id: tile.id as LayoutItemId,
  });

  return acc;
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
      // TODO: Actually split the weights.
      const splitWeight = tabGroup.weight || 1;
      const newTabGroup: TileTabGroupConfig = {
        id: uuid(),
        weight: splitWeight,
        type: tile.type as string,
        tabs: [tile as TileTabConfig],
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
        // This group is taking the tab group's place so it should have
        // the same weight.
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
    const tab: TileTabConfig = {
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

    if (item.id === toId && 'dropRegion' in dropTarget) {
      // TODO: Actually split the weights.
      const splitWeight = item.weight || 1;

      const newTabGroup: TileTabGroupConfig = {
        id: uuid(),
        weight: splitWeight,
        type: tile.type as string,
        tabs: [tile as TileTabConfig],
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
