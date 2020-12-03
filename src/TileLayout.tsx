import React from 'react';
import {
  applyDrop,
  DropTarget,
  isGroup,
  isTabGroup,
  LayoutItemId,
  TileConfig,
  TileGroupConfig,
  TileLayoutConfig,
  TileTabGroup,
} from './layout';
import css from './TileLayout.module.css';
import { DropRegion, getDropRegion } from './util/geometry';
import { v4 as uuid } from 'uuid';
import DragController, { DragControllerEvent } from './util/DragController';
import { classNames } from './util/dom';
import {
  draggable,
  DraggableState,
  droppedComponent,
  dropzone,
  DropzoneState,
} from './util/dragAndDrop';
import DebugValue from './util/DebugValue';

export type TileRenderer<T extends LayoutItemId = string> = (
  id: T
) => React.ReactChild;

export type TileRenderers<T extends LayoutItemId = string> = Record<
  string,
  TileRenderer<T>
>;

export type TabRenderer<T extends LayoutItemId = string> = (
  id: T
) => React.ReactChild;

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

const TileLayoutContext = React.createContext<TileLayoutContextValue>(
  (null as unknown) as TileLayoutContextValue
);

type TileLayoutState = {
  layout: TileLayoutConfig | null;
};

type DraggableComponent = TabStrip | Tab;
type IDropzoneComponent = TabStrip | Tab | Tile;

/**
 * <code>TileLayout</code> renders content as draggable tiles, similar to the
 * layout of a modern IDE.
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

  constructor(props: TileLayoutProps) {
    super(props);
    this.state = {
      layout: {
        ...props.layout,
        id: props.layout.id || uuid(),
      },
    };
  }

  registerTile(tile: Tile) {
    this.tilesById.set(tile.props.config.id as LayoutItemId, tile);
  }

  unregisterTile(tile: Tile) {
    this.tilesById.delete(tile.props.config.id as LayoutItemId);
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
  }

  render() {
    if (!this.state.layout) {
      // TODO: Think about how to handle empty layouts
      return <></>;
    }
    return (
      <TileLayoutContext.Provider value={this}>
        <DebugValue label="layout" value={this.state.layout} />
        <div className={classNames(css.tileLayout)}>
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

type TileContextValue = Tile;

const TileContext = React.createContext<TileContextValue>(
  (null as unknown) as any
);

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

  componentDidMount() {
    this.context.registerTile(this);
  }

  componentWillUnmount() {
    this.context.unregisterTile(this);
    this.borderDragController.dispose();
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
            const tabRenderers = layout.props.tabRenderers;
            if (process.env.NODE_ENV === 'development' && !tabRenderers) {
              throw new Error(
                'Attempted to render tabs without providing `tabRenderers`.'
              );
            }

            const activeTabIndex = this.state.activeTabIndex || 0;
            const tab = config.tabs[activeTabIndex];

            const renderers = layout.props.tileRenderers;
            const renderer = renderers[tab.type].bind(renderers);
            const content = renderer(tab.id as any);

            return (
              <TileContext.Provider value={this}>
                <div
                  ref={this.rootRef}
                  className={classNames(css.tileTabGroup, ...classes)}
                  style={style}
                  {...dropzone(this)}
                >
                  {/* TODO: Render custom tab strip here instead */}
                  {/* TODO: Handle vertical vs. horizontal orientation */}
                  <TabStrip className={css.tabStrip} config={config}>
                    {config.tabs.map((tab, i) => {
                      const tabRenderer = tabRenderers![tab.type].bind(
                        tabRenderers
                      );

                      return (
                        <Tab
                          key={tab.id}
                          parentTile={this}
                          config={tab}
                          index={i}
                          isActive={i === activeTabIndex}
                        >
                          {tabRenderer(tab.id as any)}
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
                  >
                    {content}
                  </div>
                </div>
              </TileContext.Provider>
            );
          }}
        </TileLayoutContext.Consumer>
      );
    }

    // TODO: Make sure this works

    const tile = this.props.config as TileConfig;
    return (
      <TileLayoutContext.Consumer>
        {(layout) => {
          const renderers = layout.props.tileRenderers;
          const renderer = renderers[tile.type as string].bind(renderers);
          const content = renderer(tile.id as any);
          if (!content) return null;

          return (
            <TileContext.Provider value={this}>
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
                {content}
              </div>
            </TileContext.Provider>
          );
        }}
      </TileLayoutContext.Consumer>
    );
  }
}

type TabProps = DraggableState &
  DropzoneState & {
    parentTile: Tile;
    config: TileConfig;
    index: number;
    isActive: boolean;
  };

class Tab extends React.Component<TabProps> {
  static contextType = TileLayoutContext;
  context!: React.ContextType<typeof TileLayoutContext>;

  rootRef = React.createRef<HTMLDivElement>();

  onDrop(e: React.DragEvent) {
    this.context!.handleDrop(e, this);
  }

  render() {
    const { children, isActive } = this.props;

    return (
      <div
        ref={this.rootRef}
        className={classNames(css.tabContainer, isActive && css.activeTab)}
        {...draggable(this)}
        {...dropzone(this)}
      >
        {children}
      </div>
    );
  }
}

// Omitting "id" to avoid confusion with `config.id`.
type TabStripProps = Omit<JSX.IntrinsicElements['div'], 'id'> & {
  config: TileTabGroup;
};

type TabStripState = DraggableState & DropzoneState;

class TabStrip extends React.Component<TabStripProps, TabStripState> {
  static contextType = TileLayoutContext;
  context!: React.ContextType<typeof TileLayoutContext>;

  state: TabStripState = {};

  rootRef = React.createRef<HTMLDivElement>();

  onDrop(e: React.DragEvent) {
    this.context!.handleDrop(e, this);
  }

  render() {
    return (
      <TileContext.Consumer>
        {(tile) => (
          <div
            ref={this.rootRef}
            className={classNames(
              css.tileDragHandle,
              this.state.isDraggingOver && css.draggingOtherTileOver,
              this.props.className
            )}
            {...draggable(this)}
            {...dropzone(this)}
          >
            {this.props.children}
          </div>
        )}
      </TileContext.Consumer>
    );
  }
}
