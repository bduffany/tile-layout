import * as React from 'react';
import {
  ContentContainerId,
  contentContainerIdKey,
  TileTabGroupDirection,
} from './layout';
import { Inlet, Outlet } from './reparent';
import IRegistry from './util/Registry';

export type ComponentMap = Record<
  string,
  React.ComponentType<{
    id: string;
    // TODO: Decouple from Tile layout
    direction: TileTabGroupDirection;
  }>
>;

export type ContentHostProps = ContentContainerId & {
  direction: TileTabGroupDirection;

  registry?: IRegistry<ContentContainerId, ContentHost>;
  components: ComponentMap;
};

export class ContentHost extends React.PureComponent<ContentHostProps> {
  componentDidMount() {
    const { type, container, id } = this.props;
    this.props.registry?.register({ type, container, id }, this);
  }

  componentWillUnmount() {
    const { type, container, id } = this.props;
    this.props.registry?.unregister({ type, container, id });
  }

  render() {
    const { components, type, container, id, direction } = this.props;

    const ChildComponent = components[type];
    if (!ChildComponent) {
      throw new Error(
        `Could not find component "${type}". ` +
          `Check if "${type}" is present in the "components" and "tabComponents" props of <TileLayout />.`
      );
    }

    return (
      <Inlet id={contentContainerIdKey({ type, container, id })}>
        <ChildComponent id={id} direction={direction} />
      </Inlet>
    );
  }
}

export type ContentOutletProps = ContentContainerId;

export function ContentOutlet({ type, container, id }: ContentOutletProps) {
  const outletId = contentContainerIdKey({ type, container, id });
  return <Outlet id={outletId} />;
}

export class ContentHostRegistry
  implements IRegistry<ContentContainerId, ContentHost> {
  values = new Map<string, ContentHost>();

  register(id: ContentContainerId, value: ContentHost) {
    this.values.set(contentContainerIdKey(id)!, value);
  }

  unregister(id: ContentContainerId) {
    this.values.delete(contentContainerIdKey(id)!);
  }
}
