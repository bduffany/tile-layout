/**
 * This file contains utilities for working with the HTML Drag and Drop API.
 *
 * All utilities assume that you DON'T want drag and drop events to propagate
 * to parents.
 *
 * For example, if you have a dropzone nested inside another dropzone, then
 * the `dragenter` event of the child dropzone isn't propagated to the parent
 * dropzone.
 */

import { v4 as uuid } from 'uuid';
import { composeEventHandlers } from './dom';
import WeakBiMap from './WeakBiMap';

function onDragStart(this: React.Component, e: React.DragEvent) {
  this.setState({ isDragging: true });
  e.stopPropagation();
  e.dataTransfer.setData(
    'text',
    (e.target as HTMLElement).dataset['draggableId'] as string
  );
}
function onDrag(this: React.Component, e: React.DragEvent) {
  e.stopPropagation();
}
function onDragEnd(this: React.Component, e: React.DragEvent) {
  this.setState({ isDragging: false });
  e.stopPropagation();
}

export type DraggableState = {
  isDragging?: boolean;
};

export type IDraggableReactCallbacks = Pick<
  JSX.IntrinsicElements['div'],
  'onDrag' | 'onDragStart' | 'onDragEnd'
>;

const componentDraggableId = new WeakBiMap<React.Component, string>();

export function draggable(
  draggable: React.Component & IDraggableReactCallbacks
): {
  draggable: true;
  'data-draggable-id': string;
} & IDraggableReactCallbacks {
  let draggableId = componentDraggableId.getValue(draggable);
  if (!draggableId) {
    draggableId = `draggable__${uuid()}`;
    componentDraggableId.set(draggable, draggableId);
  }

  return {
    draggable: true,
    'data-draggable-id': draggableId,
    onDragStart: composeEventHandlers(
      onDragStart.bind(draggable),
      draggable?.onDragStart?.bind(draggable)
    ),
    onDrag: composeEventHandlers(
      onDrag.bind(draggable),
      draggable?.onDrag?.bind(draggable)
    ),
    onDragEnd: composeEventHandlers(
      onDragEnd.bind(draggable),
      draggable?.onDragEnd?.bind(draggable)
    ),
  };
}

function onDragEnter(this: React.Component, e: React.DragEvent) {
  this.setState({ isDraggingOver: true });
  e.stopPropagation();
}
function onDragOver(this: React.Component, e: React.DragEvent) {
  e.stopPropagation();
  e.preventDefault();
}
function onDrop(this: React.Component, e: React.DragEvent) {
  this.setState({ isDraggingOver: false });
  e.stopPropagation();
}
function onDragLeave(this: React.Component, e: React.DragEvent) {
  this.setState({ isDraggingOver: false });
  e.stopPropagation();
}

export type DropzoneState = {
  isDraggingOver?: boolean;
};

export type DropzoneReactCallbacks = Pick<
  JSX.IntrinsicElements['div'],
  'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop'
>;

export function dropzone(dropzone: React.Component & DropzoneReactCallbacks) {
  return {
    onDragEnter: composeEventHandlers(
      onDragEnter.bind(dropzone),
      dropzone?.onDragEnter?.bind(dropzone)
    ),
    onDragOver: composeEventHandlers(
      onDragOver.bind(dropzone),
      dropzone?.onDragOver?.bind(dropzone)
    ),
    onDragLeave: composeEventHandlers(
      onDragLeave.bind(dropzone),
      dropzone?.onDragLeave?.bind(dropzone)
    ),
    onDrop: composeEventHandlers(
      onDrop.bind(dropzone),
      dropzone?.onDrop?.bind(dropzone)
    ),
  };
}

/**
 * Returns the component containing the element that was dropped as part of
 * this drop event.
 *
 * Returns undefined if the dropped element was not created using the props
 * returned by `draggable` above.
 */
export function droppedComponent<T extends React.Component = React.Component>(
  e: React.DragEvent
): T {
  const draggableId = e.dataTransfer.getData('text');
  if (process.env.NODE_ENV === 'development' && !draggableId) {
    throw new Error('Drag event is missing draggableId in dataTransfer');
  }
  return componentDraggableId.getKey(draggableId) as T;
}

export function droppedElement(e: React.DragEvent): HTMLElement {
  const draggableId = e.dataTransfer.getData('text');
  return document.querySelector(
    `[data-draggable-id="${draggableId}"]`
  ) as HTMLElement;
}
