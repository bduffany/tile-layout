import React from 'react';
import {
  applyDrop,
  contentContainerIdKey,
  DropTarget,
  getContentContainerIds,
  isGroup,
  isTabGroup,
  LayoutItemId,
  TileConfig,
  TileGroupConfig,
  TileLayoutConfig,
  TileTabGroupConfig,
} from './layout';
import css from './TileLayout.module.css';
import { DropRegion, getDropRegion } from './util/geometry';
import { v4 as uuid } from 'uuid';
import DragController, { DragControllerEvent } from './util/DragController';
import { classNames } from './util/dom';
import {
  draggable,
  DraggableState,
  dragListeners,
  dropListeners,
  droppedComponent,
  dropzone,
  DropzoneState,
} from './util/dragAndDrop';
import DebugValue from './util/DebugValue';
import { disposeAll, DisposeFns, eventListener } from './util/dispose';
import { HorizontalScrollbar } from './util/Scrollbar';
import { ContentHost, ContentOutlet } from './content';

export type TileRenderer<T extends LayoutItemId = string> = (
  id: T
) => React.ReactNode;

export type TileRenderers<T extends LayoutItemId = string> = Record<
  string,
  TileRenderer<T>
>;

export type TabRenderer<T extends LayoutItemId = string> = (
  id: T
) => React.ReactNode;

export type TabRenderers<T extends LayoutItemId = string> = Record<
  string,
  TabRenderer<T>
>;

export type TileLayoutProps = JSX.IntrinsicElements['div'] & {
  tileRenderers: TileRenderers;
  tabRenderers?: TabRenderers;
  layout: TileLayoutConfig;
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

  private disposeFns: Function[] = [];
  private rootRef = React.createRef<HTMLDivElement>();

  constructor(props: TileLayoutProps) {
    super(props);
    this.state = {
      layout: {
        ...props.layout,
        id: props.layout.id || uuid(),
      },
      isDraggingDescendant: false,
    };
  }

  componentDidMount() {
    this.disposeFns.push(
      eventListener(
        this.rootRef.current!,
        'dragAndDrop:beginDrag',
        this.onDescendantDragStart.bind(this)
      ),
      eventListener(
        this.rootRef.current!,
        'dragAndDrop:endDrag',
        this.onDescendantDragEnd.bind(this)
      )
    );
  }

  componentDidUpdate(prevProps: TileLayoutProps) {
    if (prevProps.tileRenderers !== this.props.tileRenderers) {
      // TODO: Would it hurt to allow this prop to change?
      console.error(
        'TileLayout `renderers` prop changed. TileLayout does not currently support changing the renderer configuration.' +
          ' Use a global constant, `useMemo`, or a readonly instance field to avoid changing the value of this prop.'
      );
    }
  }

  componentWillUnmount() {
    for (const dispose of this.disposeFns) {
      dispose();
    }
  }

  private onDescendantDragStart() {
    console.log('onDescendantDragStart');
    this.setState({ isDraggingDescendant: true });
  }

  private onDescendantDragEnd() {
    console.log('onDescendantDragEnd');
    this.setState({ isDraggingDescendant: false });
  }

  registerTile(tile: Tile) {
    this.tilesById.set(tile.props.config.id as LayoutItemId, tile);
  }

  unregisterTile(tile: Tile) {
    this.tilesById.delete(tile.props.config.id as LayoutItemId);
  }

  handleDrop(e: React.DragEvent, to: IDropzoneComponent) {
    const from = droppedComponent<DraggableComponent>(e);
    if (!from) {
      throw new Error('Could not determine dropped component from event');
    }
    const fromId = from.props.config.id!;
    let toId = to.props.config.id!;

    let dropTarget: DropTarget;

    // TODO: Handle `from instanceof TabStrip` (dragging all tabs)

    if (to instanceof TabStrip) {
      dropTarget = { tabIndex: -1 };
    } else if (to instanceof Tab) {
      dropTarget = { tabIndex: to.props.index };
      // When dropping a tab onto another tab, we actually want to drop
      // within the parent tab group.
      toId = to.props.parentTile.props.config.id!;
    } else {
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
        // When dropping a tab onto the center of a tile, we actually want
        // top drop within the parent tab group.
        dropTarget = {
          tabIndex: -1,
        };
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

    console.log(
      'draggingDescendantClass:',
      this.state.isDraggingDescendant && css.draggingDescendant
    );

    const { tileRenderers, tabRenderers } = this.props;

    return (
      <TileLayoutContext.Provider value={this}>
        {/* TODO: Better memory management. Only render visible content on the first render.
            Then render contents as they are requested, e.g. by clicking a tab. (?) */}
        {getContentContainerIds(this.props.layout).map((containerId) => (
          <ContentHost
            key={contentContainerIdKey(containerId)}
            renderers={
              containerId.container === 'tab' ? tabRenderers! : tileRenderers
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
          <Tile config={this.state.layout} />
        </div>
      </TileLayoutContext.Provider>
    );
  }
}

// Omitting the "id" prop to avoid confusion with `config.id`.
type TileProps = Omit<JSX.IntrinsicElements['div'], 'id'> & {
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
class Tile extends React.Component<TileProps, TileState> {
  static contextType = TileLayoutContext;
  context!: React.ContextType<typeof TileLayoutContext>;

  state: TileState = {};

  rootRef = React.createRef<HTMLDivElement>();

  private borderDragController = new DragController();
  private disposers: DisposeFns = [];

  componentDidMount() {
    this.context.registerTile(this);
    if (this.rootRef.current) {
      this.disposers.push(...dropListeners(this, this.rootRef.current!));
    }
  }

  componentDidUpdate() {
    if (
      isTabGroup(this.props.config) &&
      (this.state.activeTabIndex || 0) >= this.props.config.tabs.length
    ) {
      this.setState({ activeTabIndex: this.props.config.tabs.length - 1 });
    }
  }

  componentWillUnmount() {
    this.context.unregisterTile(this);
    this.borderDragController.dispose();
    disposeAll(this.disposers);
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
        this.setState({ activeTabIndex: i });
        return;
      }
    }
    throw new Error(`Tab ${id} not found in this tab group.`);
  }

  onDragOver(e: React.DragEvent) {
    const dropRegion = getDropRegion(
      this.rootRef.current!.getBoundingClientRect(),
      e
    );
    const dropRegionClass = DROP_REGION_CLASSES[dropRegion];
    if (dropRegionClass !== this.state.dropRegionClass) {
      this.setState({ dropRegionClass });
    }
  }

  onDrop(e: React.DragEvent) {
    this.context!.handleDrop(e, this);
  }

  private lengthsAtDragStartPx = { a: 0, b: 0 };

  private onBorderMouseDown(e: React.MouseEvent) {
    const controllerDragStart = this.borderDragController.getDragStartHandler(
      this.onDragBorder.bind(this)
    );
    const config = this.props.config as TileGroupConfig;
    const [a, b] = config.items;
    const containerA = this.context.tilesById.get(a.id!)!.rootRef.current!;
    const containerB = this.context.tilesById.get(b.id!)!.rootRef.current!;

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
    const tileA = this.context.tilesById.get(a.id!)!;
    const tileB = this.context.tilesById.get(b.id!)!;
    tileA.rootRef.current!.style.flexGrow = String(a.weight);
    tileB.rootRef.current!.style.flexGrow = String(b.weight);
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
              <Tile parent={this} config={item}></Tile>
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

    if (isTabGroup(config)) {
      // TODO: Render tab strip using `tabStripRenderer`.
      return (
        <TileLayoutContext.Consumer>
          {(layout) => {
            if (
              process.env.NODE_ENV === 'development' &&
              !layout.props.tabRenderers
            ) {
              throw new Error(
                'Attempted to render tabs without providing `tabRenderers`.'
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
                  <TabStrip className={css.tabStrip} config={config}>
                    {config.tabs.map((tab, i) => {
                      return (
                        <Tab
                          key={tab.id}
                          parentTile={this}
                          config={tab}
                          index={i}
                          isActive={i === activeTabIndex}
                        >
                          <ContentOutlet
                            key={tab.id}
                            container="tab"
                            type={tab.type}
                            id={tab.id}
                          />
                        </Tab>
                      );
                    })}
                  </TabStrip>
                  <div
                    className={classNames(
                      css.tile,
                      this.state.dropRegionClass,
                      this.state.isDraggingOver && css.draggingOtherTileOver
                    )}
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
          const renderers = layout.props.tileRenderers;
          const renderer = renderers[tile.type as string].bind(renderers);
          const content = renderer(tile.id as any);

          if (!content) return null;

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

  static contextType = TileLayoutContext;
  context!: React.ContextType<typeof TileLayoutContext>;

  rootRef = React.createRef<HTMLDivElement>();

  private disposers: DisposeFns = [];

  componentDidMount() {
    // Using native event listeners instead of React synthetic events because
    // React doesn't bubble synthetic events that occur within the user-rendered
    // tab, which is not part of the component subtree.
    this.disposers.push(
      eventListener(this.rootRef.current!, 'click', this.onClick.bind(this)),
      ...dragListeners(this, this.rootRef.current!),
      ...dropListeners(this, this.rootRef.current!)
    );
  }

  componentWillUnmount() {
    disposeAll(this.disposers);
  }

  onDrop(e: React.DragEvent) {
    this.context!.handleDrop(e, this);
  }

  private onClick() {
    this.props.parentTile.setState({ activeTabIndex: this.props.index });
  }

  render() {
    const { children, isActive } = this.props;

    return (
      <div
        ref={this.rootRef}
        className={classNames(
          css.tabContainer,
          isActive && css.activeTab,
          this.state.isDraggingOver && css.draggingOtherTileOver
        )}
        {...draggable(this)}
        {...dropzone(this)}
      >
        {children}
      </div>
    );
  }
}

// Omitting "id" to avoid confusion with `props.config.id`.
type TabStripProps = Omit<JSX.IntrinsicElements['div'], 'id'> & {
  config: TileTabGroupConfig;
};

type TabStripState = DraggableState & DropzoneState;

class TabStrip extends React.Component<TabStripProps, TabStripState> {
  static contextType = TileLayoutContext;
  context!: React.ContextType<typeof TileLayoutContext>;

  state: TabStripState = {};

  rootRef = React.createRef<HTMLDivElement>();
  private disposers: DisposeFns = [];

  componentDidMount() {
    this.disposers.push(...dropListeners(this, this.rootRef.current!));
  }

  componentWillUnmount() {
    disposeAll(this.disposers);
  }

  onDrop(e: React.DragEvent) {
    this.context!.handleDrop(e, this);
  }

  render() {
    return (
      <div
        ref={this.rootRef}
        className={classNames(
          css.tileDragHandle,
          this.state.isDraggingOver && css.draggingOtherTileOver,
          this.props.className
        )}
        // {...draggable(this)}
        {...dropzone(this)}
      >
        <div className={css.tabStripTabs}>{this.props.children}</div>
        <HorizontalScrollbar />
      </div>
    );
  }
}
