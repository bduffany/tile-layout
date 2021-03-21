import React from 'react';
import {
  ActiveTabState,
  applyAppend,
  applyDrop,
  applyRemove,
  ContentContainerId,
  contentContainerIdKey,
  DropTarget,
  getContentContainerIds,
  isGroup,
  isTabGroup,
  LayoutItemId,
  TileConfig,
  TileGroupConfig,
  tileInstanceCount,
  TileLayoutConfig,
  TileTabGroupConfig,
} from './layout';
import css from './TileLayout.module.css';
import { DropRegion, getDropRegion } from './util/geometry';
import { v4 as uuid } from 'uuid';
import DragController, { DragControllerEvent } from './util/DragController';
import { classNames } from './util/dom';
import {
  beginDrag,
  draggable,
  DraggableState,
  dragListeners,
  dropListeners,
  droppedComponent,
  dropzone,
  DropzoneState,
  endDrag,
  preventNextDrag,
} from './util/dragAndDrop';
import DebugValue from './util/DebugValue';
import { disposeAll, DisposeFns, eventListener } from './util/dispose';
import { HorizontalScrollbar } from './util/Scrollbar';
import { ContentHost, ContentHostRegistry, ContentOutlet } from './content';
import namespace from './util/namespace';
import { customEventFactory } from './util/events';
import IRegistry from './util/Registry';

const defineEvent = namespace('TileLayout').wrap(customEventFactory);

export const borderDragStart = defineEvent('borderDragStart');
export const borderDrag = defineEvent('borderDrag');
export const borderDragEnd = defineEvent('borderDragEnd');

export type TileContentComponentProps = {
  id: LayoutItemId;
};

export type TileContentComponent = React.ComponentType<TileContentComponentProps>;

export type TileContentComponents = Record<string, TileContentComponent>;

export type TabContentComponentProps = {
  id: LayoutItemId;
};

export type TabContentComponent = React.ComponentType<TabContentComponentProps>;

export type TabContentComponents = Record<string, TabContentComponent>;

export type TileLayoutProps = JSX.IntrinsicElements['div'] & {
  tileComponents: TileContentComponents;
  tabComponents?: TabContentComponents;
  layout: TileLayoutConfig | null;
  activeTabState?: ActiveTabState;
  onLayoutChange?: (layout: TileLayoutConfig | null) => void;
  onActiveTabStateChange?: (state: ActiveTabState) => void;
  onDoubleClickTabStrip?: (tabStrip: ITabStrip) => void;
};

type TileLayoutContextValue = TileLayout;

export const TileLayoutContext = React.createContext<TileLayoutContextValue>(
  (null as unknown) as TileLayoutContextValue
);

type TileLayoutState = {
  layout: TileLayoutConfig | null;
  isDraggingDescendant: boolean;
};

type DraggableComponent = TabStrip | Tab;
type IDropzoneComponent = TabStrip | Tab | Tile;

/**
 * <code>TileLayout</code> renders content as draggable tiles, similar to the
 * layout of VS Code.
 *
 * **Concepts**
 *
 * _Tile_: A tile is a rectangular region on the screen which displays a single
 * React component, or multiple React components (using _tabs_).
 *
 * _Tab strip_: A tab strip can be rendered inside a tile. It controls which
 * content is currently displayed in the tile. Tab strips can be oriented
 * vertically or horizontally.
 *
 * _Tile type_: Tile type can be thought of as "component name". For example,
 * a tile with type `"editor"` might correspond to `<EditorComponent>` which
 * renders a code editor.
 *
 * _TileLayoutConfig_: This config defines the current layout of tiles.
 *
 * **Props**:
 *
 * _layout_: Layout defines
 * ```tsx
 * <TileLayout>
 *   <Tile tileId={todoList.listId} />
 * </TileLayout>
 * ```
 */
export default class TileLayout extends React.Component<
  TileLayoutProps,
  TileLayoutState
> {
  state: TileLayoutState;

  tilesById = new Map<LayoutItemId, Tile>();
  tabsById = new Map<LayoutItemId, Tab>();

  private disposeFns: Function[] = [];
  private rootRef = React.createRef<HTMLDivElement>();
  private contentHostRegistry = new ContentHostRegistry();

  activeTabState: ActiveTabState;

  constructor(props: TileLayoutProps) {
    super(props);
    this.state = {
      layout: {
        ...props.layout,
        id: props.layout?.id || uuid(),
      },
      isDraggingDescendant: false,
    };
    this.activeTabState = props.activeTabState || {};
  }

  /** Causes the tab for the given component type to re-render. */
  updateTab(type: string, id: LayoutItemId) {
    const tabContentHost = this.contentHostRegistry.values.get(
      contentContainerIdKey({ type, id, container: 'tab' })!
    );
    tabContentHost?.forceUpdate();
  }

  notifyActiveTabIndex(id: LayoutItemId, index: number) {
    const oldIndex = this.activeTabState[id];
    this.activeTabState[id] = index;
    if (this.props.onActiveTabStateChange && oldIndex !== index) {
      this.props.onActiveTabStateChange(this.activeTabState);
    }
  }

  componentDidMount() {
    this.disposeFns.push(
      eventListener(
        this.rootRef.current!,
        beginDrag.type,
        this.onDescendantDragStart.bind(this)
      ),
      eventListener(
        this.rootRef.current!,
        endDrag.type,
        this.onDescendantDragEnd.bind(this)
      ),
      eventListener(
        this.rootRef.current!,
        borderDragEnd.type,
        this.onBorderDragEnd.bind(this)
      )
    );
  }

  private onBorderDragEnd() {
    if (this.props.onLayoutChange) {
      this.props.onLayoutChange(this.props.layout);
    }
  }

  shouldComponentUpdate(prevProps: TileLayoutProps) {
    if (
      prevProps.layout !== this.props.layout &&
      this.state.layout === this.props.layout
    ) {
      // User passed in new layout, but it already matches the state,
      // which is ultimately what gets rendered.
      return false;
    }
    return true;
  }

  componentDidUpdate(prevProps: TileLayoutProps, prevState: TileLayoutState) {
    if (prevProps.tileComponents !== this.props.tileComponents) {
      // TODO: Would it hurt to allow this prop to change?
      console.error(
        'TileLayout `tileComponents` prop changed. TileLayout does not currently support changing the component configuration.' +
          ' Use a global constant, `useMemo`, or a readonly instance field to avoid changing the value of this prop.'
      );
    }

    if (this.props.onLayoutChange && prevState.layout !== this.state.layout) {
      this.props.onLayoutChange(this.state.layout);
      console.log('onLayoutChange');
    }
  }

  componentWillUnmount() {
    for (const dispose of this.disposeFns) {
      dispose();
    }
  }

  private onDescendantDragStart() {
    this.setState({ isDraggingDescendant: true });
  }

  private onDescendantDragEnd() {
    this.setState({ isDraggingDescendant: false });
  }

  closeTab(id: LayoutItemId) {
    const layout = applyRemove(this.state.layout, id);

    this.setState({ layout });

    // TODO: focus previous tab in the tab group
  }

  registerTile(tile: Tile) {
    this.tilesById.set(tile.props.config.id!, tile);
  }

  unregisterTile(tile: Tile) {
    this.tilesById.delete(tile.props.config.id!);
  }

  registerTab(tab: Tab) {
    this.tabsById.set(tab.props.config.id!, tab);
  }

  unregisterTab(tab: Tab) {
    this.tabsById.set(tab.props.config.id!, tab);
  }

  appendTile(tabGroupId: LayoutItemId, tile: TileConfig) {
    const layout = applyAppend(this.state.layout, tabGroupId, tile);
    this.setState({ layout });
    setTimeout(() => {
      this.focusTab(tile.id!);
    });
  }

  handleDrop(e: DragEvent, to: IDropzoneComponent) {
    const from = droppedComponent<DraggableComponent>(e);
    if (!from) {
      throw new Error('Could not determine dropped component from event');
    }
    const fromId = from.props.config.id!;
    let toId = to.props.config.id!;

    let dropTarget: DropTarget;

    // TODO: Handle `if (from instanceof TabStrip)` -- (dragging all tabs)

    if (to instanceof TabStrip) {
      dropTarget = { tabIndex: -1 };
    } else if (to instanceof Tab) {
      dropTarget = { tabIndex: to.props.index };
      // When dropping a tab onto another tab, we actually want to drop
      // within the parent tab group.
      toId = to.props.parentTile.props.config.id!;
    } else {
      // to instanceof Tile

      if (!(to instanceof Tile)) {
        if (process.env.NODE_ENV === 'development') {
          throw new Error(`Unrecognized drop target component type: ${to}`);
        }
        return;
      }
      dropTarget = {
        dropRegion: getDropRegion(
          to.rootRef.current!.getBoundingClientRect(),
          e
        ),
      };
      if (dropTarget.dropRegion === 'cover') {
        // If tab is already contained in this tab group, don't
        // insert at all.
        // TODO: remove the tab from the source, if it's not the same
        // as the dest, meaning that two identical tab instances are
        // merged.
        const toConfig = to.props.config;
        if (isTabGroup(toConfig)) {
          for (const tab of toConfig.tabs) {
            if (tab.id === fromId) return;
          }
        }

        let tabIndex = -1;
        if (to.state.activeTabIndex !== undefined) {
          tabIndex = to.state.activeTabIndex + 1;
        }

        // TODO: Insert after the currently active tab, instead of at
        // the end.
        dropTarget = { tabIndex };
      }
    }

    const layout = applyDrop(this.state.layout, fromId, toId, dropTarget);

    this.setState({ layout });

    setTimeout(() => {
      this.focusTab(fromId);
    });
  }

  private focusTab(id: LayoutItemId) {
    const parent = this.parentTileOf(id);
    if (!parent) {
      console.warn(`Could not find parent tile of tile ${id}`);
      return;
    }
    parent.focusChildTab(id);
  }

  private parentTileOf(id: LayoutItemId) {
    for (const tile of Array.from(this.tilesById.values())) {
      if (isTabGroup(tile.props.config)) {
        // tile.props.config.tabs.some((tab) => tab.id === id)
        for (const tab of tile.props.config.tabs) {
          if (tab.id === id) {
            return tile;
          }
        }
      }
    }
    return null;
  }

  render() {
    if (!this.state.layout) {
      // TODO: Think about how to handle empty layouts
      return <></>;
    }

    const { tileComponents, tabComponents } = this.props;

    const contentContainerIds = getContentContainerIds(this.props.layout);

    return (
      <TileLayoutContext.Provider value={this}>
        {/* TODO: Better performance: only render visible content on the first render.
            Then render contents as they are requested, e.g. by clicking a tab. (?) */}
        {contentContainerIds.map((containerId) => (
          <ContentHost
            key={contentContainerIdKey(containerId)}
            registry={this.contentHostRegistry}
            components={
              containerId.container === 'tab' ? tabComponents! : tileComponents
            }
            {...containerId}
          />
        ))}
        <DebugValue label="layout" value={this.state.layout} />
        <div
          className={classNames(
            css.tileLayout,
            this.state.isDraggingDescendant && css.draggingDescendant
          )}
          ref={this.rootRef}
        >
          <Tile layout={this} config={this.state.layout} />
        </div>
      </TileLayoutContext.Provider>
    );
  }
}

// Omitting the "id" prop to avoid confusion with `config.id`.
type TileProps = Omit<JSX.IntrinsicElements['div'], 'id'> & {
  layout: TileLayout;
  config: TileConfig | TileGroupConfig;
  parent?: Tile;
};

const DROP_REGION_CLASSES: Record<DropRegion, string> = {
  cover: '',
  top: css.top,
  left: css.left,
  bottom: css.bottom,
  right: css.right,
};

type TileState = DraggableState &
  DropzoneState & {
    dropRegionClass?: string;
    activeTabIndex?: number;
  };

/**
 * The Tile component renders a TileGroupConfig, TileConfig, or TileTabGroupConfig.
 */
// TODO: Break these up into separate components?
class Tile extends React.Component<TileProps, TileState> {
  state: TileState = {};

  rootRef = React.createRef<HTMLDivElement>();

  private borderDragController = new DragController();
  private disposers: DisposeFns = [];

  dropzoneRef = React.createRef<HTMLDivElement>();
  dropzone: HTMLDivElement | null = null;
  private dropzoneDisposers: DisposeFns = [];

  constructor(props: TileProps) {
    super(props);
    const { config } = props;
    if (isTabGroup(config) && config.id! in this.props.layout.activeTabState) {
      this.state.activeTabIndex = this.props.layout.activeTabState[config.id!];
    }
  }

  componentDidMount() {
    this.props.layout.registerTile(this);

    this.updateDropzoneListeners();
    this.updateActiveTabIndex();
  }

  componentDidUpdate() {
    this.updateDropzoneListeners();
    this.updateActiveTabIndex();
  }

  setActiveTabIndex(index: number) {
    this.setState({ activeTabIndex: index });
    this.props.layout.notifyActiveTabIndex(this.props.config.id!, index);
  }

  private updateActiveTabIndex() {
    if (isTabGroup(this.props.config)) {
      if (this.state.activeTabIndex === undefined) {
        this.setActiveTabIndex(0);
      } else if (this.state.activeTabIndex >= this.props.config.tabs.length) {
        this.setActiveTabIndex(this.props.config.tabs.length - 1);
      }
    }
  }

  updateDropzoneListeners() {
    if (this.dropzoneRef.current === this.dropzone) return;
    disposeAll(this.dropzoneDisposers);
    this.dropzone = this.dropzoneRef.current;
    this.dropzoneDisposers = this.dropzone
      ? dropListeners(this, this.dropzone)
      : [];
  }

  componentWillUnmount() {
    this.props.layout.unregisterTile(this);
    this.borderDragController.dispose();
    disposeAll(this.disposers);
    disposeAll(this.dropzoneDisposers);
  }

  focusChildTab(id: LayoutItemId) {
    const config = this.props.config;
    if (!isTabGroup(config)) {
      throw new Error(
        'Cannot focus a child tab of a Tile that is not a tab group'
      );
    }
    for (let i = 0; i < config.tabs.length; i++) {
      if (config.tabs[i].id === id) {
        this.setActiveTabIndex(i);
        return;
      }
    }
    throw new Error(`Tab ${id} not found in this tab group.`);
  }

  onDragOver(e: DragEvent) {
    const dropRegion = getDropRegion(
      this.dropzoneRef.current!.getBoundingClientRect(),
      e
    );
    const dropRegionClass = DROP_REGION_CLASSES[dropRegion];
    if (dropRegionClass !== this.state.dropRegionClass) {
      this.setState({ dropRegionClass });
    }
  }

  onDrop(e: DragEvent) {
    console.debug('Tile::onDrop');
    this.props.layout.handleDrop(e, this);
  }

  private lengthsAtDragStartPx = { a: 0, b: 0 };

  private onBorderMouseDown(e: React.MouseEvent) {
    const config = this.props.config as TileGroupConfig;
    const controllerDragStart = this.borderDragController.getDragStartHandler(
      this.onDragBorder.bind(this),
      this.onReleaseBorder.bind(this),
      config.direction === 'row' ? 'ew-resize' : 'ns-resize'
    );
    const [a, b] = config.items;
    const containerA = this.props.layout.tilesById.get(a.id!)!.rootRef.current!;
    const containerB = this.props.layout.tilesById.get(b.id!)!.rootRef.current!;

    // Record initial sizes of the two tiles so we can later calculate the weights.
    if (config.direction === 'row') {
      this.lengthsAtDragStartPx = {
        a: containerA.clientWidth,
        b: containerB.clientWidth,
      };
    } else {
      this.lengthsAtDragStartPx = {
        a: containerA.clientHeight,
        b: containerB.clientHeight,
      };
    }

    controllerDragStart(e.nativeEvent);

    this.rootRef.current!.dispatchEvent(borderDragStart());
  }

  private onDragBorder({
    mouseEvent: mouse,
    dragStartPosition: start,
  }: DragControllerEvent) {
    const config = this.props.config as TileGroupConfig;
    const netDragPx =
      config.direction === 'row' ? mouse.x - start.x : mouse.y - start.y;

    const newLengths = {
      a: this.lengthsAtDragStartPx.a + netDragPx,
      b: this.lengthsAtDragStartPx.b - netDragPx,
    };

    const [a, b] = config.items;
    // Note: these assignments don't cause React re-renders.
    // TODO: Put bounds on weight deltas
    a.weight = newLengths.a;
    b.weight = newLengths.b;

    // Assign weights to children with manual DOM mutation for smoothness.
    const tileA = this.props.layout.tilesById.get(a.id!)!;
    const tileB = this.props.layout.tilesById.get(b.id!)!;
    tileA.rootRef.current!.style.flexGrow = String(a.weight);
    tileB.rootRef.current!.style.flexGrow = String(b.weight);

    this.rootRef.current!.dispatchEvent(borderDrag());
  }

  private onReleaseBorder() {
    this.rootRef.current!.dispatchEvent(borderDragEnd());
  }

  render() {
    const parentDirection = (this.props.parent?.props.config as TileGroupConfig)
      ?.direction;
    const config = this.props.config;

    const style: React.CSSProperties = {};
    const classes: (string | undefined)[] = [];

    if ('weight' in config) {
      style.flexGrow = config.weight || 1;
    } else if ('size' in config) {
      if (parentDirection === 'column') {
        style.height = config.size;
      } else {
        style.width = config.size;
      }
    } else {
      // No size specified.
      style.flexGrow = 1;
    }

    // Groups recursively render tiles.
    if (isGroup(config)) {
      return (
        <div
          ref={this.rootRef}
          className={classNames(
            css.tileGroup,
            config.direction === 'row' ? css.row : css.column,
            ...classes
          )}
          style={{
            flexDirection: config.direction,
            ...style,
          }}
        >
          {config.items.map((item, i) => (
            <React.Fragment key={item.id}>
              <Tile
                layout={this.props.layout}
                parent={this}
                config={item}
              ></Tile>
              {i < config.items.length - 1 && (
                <div
                  onMouseDown={this.onBorderMouseDown.bind(this)}
                  className={classNames(
                    css.tileBorder,
                    config.direction === 'row' ? css.vertical : css.horizontal
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }

    // Tab groups render a tab strip and a single visible tile below it.
    if (isTabGroup(config)) {
      // TODO: Render tab strip using `tabStripRenderer`.
      return (
        <TileLayoutContext.Consumer>
          {(layout) => {
            if (
              process.env.NODE_ENV === 'development' &&
              !layout.props.tabComponents
            ) {
              throw new Error(
                'Attempted to render tabs without providing `tabComponents`.'
              );
            }

            let activeTabIndex = this.state.activeTabIndex || 0;
            if (activeTabIndex >= config.tabs.length) {
              activeTabIndex = config.tabs.length - 1;
            }
            const tab = config.tabs[activeTabIndex];

            return (
              <>
                <div
                  ref={this.rootRef}
                  className={classNames(css.tileTabGroup, ...classes)}
                  style={style}
                >
                  {/* TODO: Render custom tab strip here instead? */}
                  {/* TODO: Handle vertical vs. horizontal orientation */}
                  <TabStrip layout={this.props.layout} config={config}>
                    {config.tabs.map((tab, i) => {
                      return (
                        <Tab
                          layout={this.props.layout}
                          key={tab.id}
                          parentTile={this}
                          config={tab}
                          index={i}
                          isActive={i === activeTabIndex}
                        />
                      );
                    })}
                  </TabStrip>
                  <div
                    className={classNames(
                      css.tile,
                      this.state.dropRegionClass,
                      this.state.isDraggingOver && css.draggingOtherTileOver
                    )}
                    ref={this.dropzoneRef}
                    {...dropzone(this)}
                  >
                    <ContentOutlet
                      key={tab.id}
                      container="tile"
                      type={tab.type}
                      id={tab.id}
                    />
                  </div>
                </div>
              </>
            );
          }}
        </TileLayoutContext.Consumer>
      );
    }

    // Render tile directly (no tabs).
    // TODO: Either delete this or make sure it works.
    // No tests for this currently.

    const tile = this.props.config as TileConfig;
    return (
      <TileLayoutContext.Consumer>
        {(layout) => {
          const components = layout.props.tileComponents;
          const Component = components[tile.type as string];
          const content = <Component id={tile.id as any} />;

          if (!content) return null;

          // TODO: find a cleaner solution here
          this.dropzoneRef = this.rootRef;
          return (
            <div
              ref={this.rootRef}
              className={classNames(
                css.tile,
                this.state.dropRegionClass,
                this.state.isDraggingOver && css.draggingOtherTileOver
              )}
              style={style}
              {...dropzone(this)}
            >
              <ContentOutlet
                container="tile"
                type={tile.type as string}
                id={tile.id as LayoutItemId}
              />
            </div>
          );
        }}
      </TileLayoutContext.Consumer>
    );
  }
}

type TabProps = {
  layout: TileLayout;
  parentTile: Tile;
  config: TileConfig;
  index: number;
  isActive: boolean;
};

type TabState = DraggableState & DropzoneState;

type TabContextValue = Tab;

export const TabContext = React.createContext<TabContextValue>(
  (null as unknown) as any
);

class Tab extends React.Component<TabProps, TabState> {
  state: TabState = {};

  rootRef = React.createRef<HTMLDivElement>();

  private disposers: DisposeFns = [];

  private dragAndDropDisposers: DisposeFns = [];
  private root: HTMLDivElement | null = null;

  componentDidMount() {
    this.props.layout.registerTab(this);

    // Using native event listeners instead of React synthetic events because
    // React doesn't bubble synthetic events that occur within the user-rendered
    // tab, which is not part of the component subtree.
    this.disposers.push(
      eventListener(
        this.rootRef.current!,
        'mousedown',
        this.onMouseDown.bind(this)
      )
    );

    this.updateDragAndDropListeners();
  }

  componentDidUpdate() {
    this.updateDragAndDropListeners();
  }

  componentWillUnmount() {
    this.props.layout.unregisterTab(this);

    disposeAll(this.disposers);
    disposeAll(this.dragAndDropDisposers);
  }

  updateDragAndDropListeners() {
    if (this.rootRef.current === this.root) return;
    disposeAll(this.dragAndDropDisposers);
    this.root = this.rootRef.current;
    this.dragAndDropDisposers = this.root
      ? [...dropListeners(this, this.root), ...dragListeners(this, this.root)]
      : [];
  }

  onDrop(e: DragEvent) {
    this.props.layout.handleDrop(e, this);
  }

  private onMouseDown() {
    this.props.parentTile.setActiveTabIndex(this.props.index);
  }

  render() {
    const { config: tab, isActive } = this.props;

    return (
      <div
        ref={this.rootRef}
        className={classNames(
          'TileLayout__Tab',
          isActive && 'TileLayout__Tab--active',
          css.tabContainer,
          isActive && css.activeTab,
          this.state.isDraggingOver && css.draggingOtherTileOver
        )}
        {...draggable(this)}
        {...dropzone(this)}
      >
        <ContentOutlet
          key={tab.id}
          container="tab"
          type={tab.type!}
          id={tab.id!}
        />
      </div>
    );
  }
}

// Omitting "id" to avoid confusion with `props.config.id`.
type TabStripProps = Omit<JSX.IntrinsicElements['div'], 'id'> & {
  layout: TileLayout;
  config: TileTabGroupConfig;
};

type TabStripState = DraggableState & DropzoneState;

export interface ITabStrip {
  append(tile: TileLayoutConfig): void;
}

class TabStrip
  extends React.Component<TabStripProps, TabStripState>
  implements ITabStrip {
  static contextType = TileLayoutContext;
  context!: React.ContextType<typeof TileLayoutContext>;

  state: TabStripState = {};

  private rootRef = React.createRef<HTMLDivElement>();
  private root: HTMLDivElement | null = null;
  private disposers: DisposeFns = [];
  private dropzoneDisposers: DisposeFns = [];
  private scrollingElementRef = React.createRef<HTMLDivElement>();
  private scrollbarRef = React.createRef<HorizontalScrollbar>();

  componentDidMount() {
    this.updateDropzoneListeners();

    this.scrollbarRef.current!.setScrollingElement(
      this.scrollingElementRef.current!
    );
    this.scrollbarRef.current!.update();
    // TODO: See if we can remove this. It (hackily) solves the problem
    // that the scrollbar isn't rendered correctly on the first render.
    setTimeout(() => {
      this.scrollbarRef.current!.update();
    });
  }

  componentDidUpdate() {
    this.updateDropzoneListeners();
    this.scrollbarRef.current!.update();
  }

  componentWillUnmount() {
    disposeAll(this.disposers);
    disposeAll(this.dropzoneDisposers);
  }

  private updateDropzoneListeners() {
    if (this.rootRef.current === this.root) return;
    disposeAll(this.dropzoneDisposers);
    this.root = this.rootRef.current;
    this.dropzoneDisposers = this.root ? dropListeners(this, this.root) : [];
  }

  onDrop(e: DragEvent) {
    this.props.layout.handleDrop(e, this);
  }

  onDoubleClick() {
    this.props.layout.props.onDoubleClickTabStrip?.(this);
  }

  append(tile: TileConfig) {
    // TODO: Validate.
    this.props.layout.appendTile(this.props.config.id!, tile);
  }

  render() {
    return (
      <div
        ref={this.rootRef}
        onDoubleClick={this.onDoubleClick.bind(this)}
        className={classNames(
          css.tabStrip,
          css.tileDragHandle,
          this.state.isDraggingOver && css.draggingOtherTileOver,
          this.props.className
        )}
        // TODO: Allow dragging tab strips, which should drag all tabs at once,
        // like in VS Code.
        // {...draggable(this)}
        {...dropzone(this)}
      >
        <div className={css.tabStripTabs} ref={this.scrollingElementRef}>
          {this.props.children}
        </div>
        <HorizontalScrollbar ref={this.scrollbarRef} />
      </div>
    );
  }
}

export type TabCloseButtonProps<
  T extends keyof JSX.IntrinsicElements
> = JSX.IntrinsicElements[T] & {
  as?: T;
  confirm?:
    | ((id: LayoutItemId) => boolean | Promise<boolean>)
    | null
    | undefined;
  // TODO: see if we can make this optional. Traverse up the DOM to find the
  // tab ID on the DOM element (as a data- attribute).
  tabId: LayoutItemId;
};

/**
 * Wrapper component for creating a close button within a tab renderer.
 *
 * ## Typical usage
 *
 * By default, the `TabCloseButton` renders a `<button>` element, so you
 * only need to provide the contents of that button, as well as any
 * styling:
 *
 * ```tsx
 * <TabCloseButton className={css.myButton}><MyCloseIcon /></TabCloseButton>
 * ```
 *
 * ## Using a custom button
 *
 * If you'd rather use your own button, you can use a `div` wrapper element
 * instead:
 *
 * ```tsx
 * <TabCloseButton as="div" className={css.myButtonWrapper}>
 *   <MyCloseButton />
 * </TabCloseButton>
 * ```
 * Click events from `<MyCustomButton />` will bubble up to `<TabCloseButton />`
 * and close the tab, unless you cancel bubbling using `e.stopPropagation()`.
 *
 * ## Confirming deletion
 *
 * If you want to intercept the click and run a check to confirm that the tab
 * should be closed, use the `confirm` function prop:
 *
 * ```tsx
 * async function confirmClose(id: string): Promise<boolean> {
 *   return await showConfirmationDialog('Are you sure you want to close?')
 * }
 * const MyCloseButton = () => <TabCloseButton confirm={confirmClose} />
 * ```
 *
 * The confirmation function is only run if there are no other clones of
 * this tab (tabs with the same ID) currently open.
 */
export function TabCloseButton<T extends keyof JSX.IntrinsicElements>({
  as,
  confirm,
  tabId,
  className,
  onClick,
  ...props
}: TabCloseButtonProps<T>) {
  const layout = React.useContext(TileLayoutContext);
  const ref = React.useRef<any>(null);

  React.useEffect(() => {
    if (!ref.current) return;

    // Using native events because canceling propagation here doesn't
    // actually stop propagation to the parent tab, since we're using
    // native events for the parent tab.
    const onMouseDown = (e: MouseEvent) => {
      e.stopPropagation();
      preventNextDrag();
    };

    const el = ref.current;
    el.addEventListener('mousedown', onMouseDown);
    return () => el.removeEventListener('mousedown', onMouseDown);
  });

  const onClick_ = React.useCallback(
    async (e: React.MouseEvent) => {
      if (onClick) {
        onClick(e as any);
        if (e.nativeEvent.cancelBubble) return;
      }
      if (
        confirm &&
        tileInstanceCount(layout.props.layout, tabId) === 1 &&
        !(await confirm(tabId))
      ) {
        return;
      }
      layout.closeTab(tabId);
    },
    [confirm, onClick, tabId, layout]
  );
  return React.createElement((as || 'button') as string, {
    ref,
    className,
    ...props,
    onClick: onClick_,
  });
}
