import React from 'react';
import {
  applyDrop,
  isGroup,
  LayoutItemId,
  TileConfig,
  TileGroupConfig,
  TileGroupDirection,
  TileLayoutConfig,
} from './layout';
import css from './TileLayout.module.css';
import DebugValue from './util/DebugValue';
import { DropRegion, getDropRegion } from './util/geometry';
import { v4 as uuid } from 'uuid';
import DragController, { DragControllerEvent } from './util/DragController';

export type TileRenderer<T extends LayoutItemId = string> = (
  id: T
) => React.ReactChild;

export type TileRenderers<T extends LayoutItemId = string> = Record<
  string,
  TileRenderer<T>
>;

export type TileLayoutProps = JSX.IntrinsicElements['div'] & {
  renderers: TileRenderers;
  layout: TileLayoutConfig;
};

type TileLayoutContextValue = TileLayout;

const TileLayoutContext = React.createContext<TileLayoutContextValue>(
  (null as unknown) as TileLayoutContextValue
);

type TileLayoutState = {
  layout: TileLayoutConfig | null;
  draggingTileId?: LayoutItemId;
  draggingOverTileId?: LayoutItemId;
};

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
  private tilesByElement = new Map<Element, Tile>();

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
    this.tilesByElement.set(tile.rootRef.current!, tile);
  }

  unregisterTile(tile: Tile) {
    this.tilesById.delete(tile.props.config.id as LayoutItemId);
    this.tilesByElement.delete(tile.rootRef.current!);
  }

  onDrag(e: React.DragEvent) {
    if (!this.state.draggingTileId) {
      console.error(`Bad state: draggingTileId is null inside onDrag handler.`);
      return;
    }

    // TODO: Use dragover instead
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    let tileDraggingOver: Tile | null = null;
    for (const element of elements) {
      if (this.tilesByElement.has(element)) {
        tileDraggingOver = this.tilesByElement.get(element)!;
        break;
      }
    }

    // Handle dragging over this tile, or no tile.
    if (
      !tileDraggingOver ||
      tileDraggingOver.props.config.id === this.state.draggingTileId
    ) {
      if (this.state.draggingOverTileId) {
        this.tilesById
          .get(this.state.draggingOverTileId)!
          .onDragOtherTileLeave(e);
        this.setState({ draggingOverTileId: undefined });
      }
      return;
    }

    if (
      tileDraggingOver &&
      this.state.draggingTileId !== tileDraggingOver.props.config.id &&
      this.state.draggingOverTileId !== tileDraggingOver.props.config.id
    ) {
      tileDraggingOver.onDragOtherTileEnter(e);
      this.setState({ draggingOverTileId: tileDraggingOver.props.config.id });
    }

    // Update tile being dragged over
    if (tileDraggingOver) {
      tileDraggingOver.onDragOtherTile(e);
    }
  }

  onDragEnd(e: React.DragEvent) {
    const { draggingTileId, draggingOverTileId } = this.state;

    if (
      draggingTileId &&
      draggingOverTileId &&
      draggingTileId !== draggingOverTileId
    ) {
      this.drop(
        e,
        this.tilesById.get(draggingTileId)!,
        this.tilesById.get(draggingOverTileId)!
      );
    }

    this.setState({ draggingTileId: undefined, draggingOverTileId: undefined });
  }

  private drop(e: React.DragEvent, from: Tile, to: Tile) {
    const fromId = from.props.config.id!;
    const toId = to.props.config.id!;

    const dropRegion = getDropRegion(
      to.rootRef.current!.getBoundingClientRect(),
      e
    );

    const layout = applyDrop(this.state.layout, fromId, toId, dropRegion);

    this.setState({ layout });
  }

  componentDidUpdate(prevProps: TileLayoutProps) {
    if (prevProps.renderers !== this.props.renderers) {
      // TODO: Would it hurt to allow this prop to change?
      console.error(
        'TileLayout `renderers` prop changed. TileLayout does not currently support changing the renderer configuration.' +
          ' Use a global constant, `useMemo`, or a readonly instance field to avoid changing the value of this prop.'
      );
    }
  }

  render() {
    if (!this.state.layout) {
      // TODO: Handle empty layouts better
      return <></>;
    }
    return (
      <TileLayoutContext.Provider value={this}>
        <div
          className={classNames(
            css.tileLayout,
            this.state.draggingTileId && css.dragging
          )}
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

type TileState = {
  isDragging?: boolean;
  isDraggingOtherTileOver?: boolean;
  dropRegionClass?: string;
};

class Tile extends React.Component<TileProps, TileState> {
  static contextType = TileLayoutContext;
  context!: React.ContextType<typeof TileLayoutContext>;

  state: TileState = {};

  rootRef = React.createRef<HTMLDivElement>();

  private borderDragController = new DragController();

  constructor(props: TileProps) {
    super(props);
  }

  onDragOtherTileEnter(e: React.DragEvent) {
    this.setState({ isDraggingOtherTileOver: true });
  }

  onDragOtherTileLeave(e: React.DragEvent) {
    this.setState({ isDraggingOtherTileOver: false });
  }

  onDragOtherTile(e: React.DragEvent) {
    const dropRegion = getDropRegion(
      this.rootRef.current!.getBoundingClientRect(),
      e
    );
    const dropRegionClass = DROP_REGION_CLASSES[dropRegion];
    if (dropRegionClass !== this.state.dropRegionClass) {
      this.setState({ dropRegionClass });
    }
  }

  componentDidMount() {
    this.context.registerTile(this);
  }

  componentWillUnmount() {
    this.context.unregisterTile(this);
    this.borderDragController.dispose();
  }

  onDragStart(e: React.DragEvent) {
    this.context.setState({ draggingTileId: this.props.config.id });
    this.setState({ isDragging: true });
  }

  onDrag(e: React.DragEvent) {
    this.context.onDrag(e);
  }

  onDragEnd(e: React.DragEvent) {
    this.context.onDragEnd(e);
    this.setState({ isDragging: false });
  }

  onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  onDrop(e: React.DragEvent) {
    this.setState({ isDraggingOtherTileOver: false });
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
    const classes: (string | undefined)[] = [this.state.dropRegionClass];

    if ('weight' in config) {
      style.flexGrow = config.weight;
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

    if (this.state.isDragging) {
      classes.push(css.dragging);
    }
    if (this.state.isDraggingOtherTileOver) {
      classes.push(css.draggingOtherTileOver);
    }

    const props: JSX.IntrinsicElements['div'] = {
      onDragOver: chainEventHandlers(
        this.onDragOver.bind(this),
        this.props.onDragOver
      ),
      onDrop: chainEventHandlers(this.onDrop.bind(this), this.props.onDrop),
    };

    const debugValue = <></>;

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
          {...props}
        >
          {debugValue}
          {config.items.map((item, i) => (
            <React.Fragment key={item.id}>
              <Tile key={item.id} parent={this} config={item}></Tile>
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

    const tile = this.props.config as TileConfig;
    return (
      <TileLayoutContext.Consumer>
        {(layout) => {
          const renderers = layout.props.renderers;
          const renderer = renderers[tile.type].bind(renderers);
          const content = renderer(tile.id as any);
          if (!content) return null;

          return (
            <TileContext.Provider value={this}>
              {debugValue}
              <div
                ref={this.rootRef}
                className={classNames(css.tile, ...classes)}
                style={style}
                {...props}
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

type TileDragHandleState = {
  isDragging?: boolean;
};

export class TileDragHandle extends React.Component<
  JSX.IntrinsicElements['div'],
  TileDragHandleState
> {
  state = {};

  onDragStart() {
    this.setState({ isDragging: true });
  }

  onDrag() {}

  onDragEnd() {
    this.setState({ isDragging: false });
  }

  render() {
    return (
      <TileContext.Consumer>
        {(tile) => (
          <div
            draggable
            className={classNames(css.tileDragHandle, this.props.className)}
            onDragStart={chainEventHandlers(
              tile.onDragStart.bind(tile),
              this.onDragStart.bind(this),
              this.props.onDragStart
            )}
            onDrag={chainEventHandlers(
              tile.onDrag.bind(tile),
              this.onDrag.bind(this),
              this.props.onDrag
            )}
            onDragEnd={chainEventHandlers(
              tile.onDragEnd.bind(tile),
              this.onDragEnd.bind(this),
              this.props.onDragEnd
            )}
          >
            {this.props.children}
          </div>
        )}
      </TileContext.Consumer>
    );
  }
}

function classNames(
  ...values: (string | boolean | number | undefined | null)[]
) {
  return values.filter(Boolean).join(' ');
}

function chainEventHandlers<T = Element, E extends Event = Event>(
  ...handlers: (
    | React.EventHandler<React.SyntheticEvent<T, E>>
    | undefined
    | null
  )[]
): React.EventHandler<React.SyntheticEvent<T, E>> {
  const chain = handlers.filter(Boolean).reverse() as React.EventHandler<
    React.SyntheticEvent<T, E>
  >[];
  return (e) => {
    for (const handler of chain) {
      handler(e);
      if (e.isPropagationStopped()) {
        return;
      }
    }
  };
}
