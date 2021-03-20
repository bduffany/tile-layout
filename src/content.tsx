import * as React from 'react';
import { ContentContainerId, contentContainerIdKey } from './layout';
import { Inlet, Outlet } from './reparent';
import IRegistry from './util/Registry';

export type ComponentMap = Record<string, React.ComponentType<{ id: string }>>;

export type ContentHostProps = ContentContainerId & {
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
    const { components, type, container, id } = this.props;

    const ChildComponent = components[type];
    if (!ChildComponent) {
      throw new Error(
        `Could not find component "${type}". ` +
          `Probably, there is a missing entry for "${type}" in the "components" or "tabComponents" prop of <TileLayout />.`
      );
    }

    return (
      <Inlet id={contentContainerIdKey({ type, container, id })}>
        <ChildComponent id={id} />
      </Inlet>
    );
  }
}

export type ContentOutletProps = ContentContainerId;

export function ContentOutlet({ type, container, id }: ContentOutletProps) {
  const outletId = contentContainerIdKey({ type, container, id });
  return <Outlet id={outletId} />;
}
