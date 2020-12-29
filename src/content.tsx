import * as React from 'react';
import { ContentContainerId, contentContainerIdKey } from './layout';
import { Inlet, Outlet } from './reparent';
import { TabRenderers, TileRenderers } from './TileLayout';

export type ContentHostProps<T> = ContentContainerId & {
  renderers: T;
};

export class ContentHost<
  T extends TileRenderers | TabRenderers
> extends React.PureComponent<ContentHostProps<T>> {
  render() {
    const { renderers, type, container, id } = this.props;

    const renderer = renderers[type].bind(renderers);
    return (
      <Inlet
        id={contentContainerIdKey({ type, container, id })}
        data={id}
        renderer={renderer as any}
      />
    );
  }
}

export type ContentOutletProps = ContentContainerId;

export function ContentOutlet({ type, container, id }: ContentOutletProps) {
  const outletId = contentContainerIdKey({ type, container, id });
  return <Outlet id={outletId} />;
}
