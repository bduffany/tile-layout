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
import { eventListener } from './dispose';
import WeakBiMap from './WeakBiMap';

function hoveredDropzoneElement(e: React.DragEvent) {
  const [hoveredElement] = document.elementsFromPoint(e.clientX, e.clientY);
  return closestDropzoneAncestor(hoveredElement as Element);
}

function hoveredDropzoneComponent(e: React.DragEvent) {
  return componentDropzoneId.getKey(
    hoveredDropzoneElement(e)?.dataset['dropzoneId'] || ''
  );
}

let draggedComponent: React.Component | null = null;

function onDragStart(
  this: React.Component & DraggableReactCallbacks,
  e: React.DragEvent<any>
) {
  draggedComponent = this;
  e.target.dispatchEvent(
    new CustomEvent('dragAndDrop:beginDrag', { bubbles: true })
  );

  e.stopPropagation();
  this.setState({ isDragging: true });
  e.dataTransfer.setData(
    'text',
    (e.target as HTMLElement).dataset['draggableId'] as string
  );
  if (this.onDragStart) {
    this.onDragStart(e);
  }
}
function onDrag(
  this: React.Component & DraggableReactCallbacks,
  e: React.DragEvent<any>
) {
  e.stopPropagation();
  if (this.onDrag) {
    this.onDrag(e);
  }

  const hoveredDropzone = hoveredDropzoneComponent(e);
  if (hoveredDropzone) {
    onDragOver.call(hoveredDropzone, e);
  }
}
function onDragEnd(
  this: React.Component & DraggableReactCallbacks,
  e: React.DragEvent<any>
) {
  console.debug('onDrop', this, e.nativeEvent);

  if (draggedComponent) {
    draggedComponent = null;
    e.target.dispatchEvent(
      new CustomEvent('dragAndDrop:endDrag', { bubbles: true })
    );
  }

  this.setState({ isDragging: false });
  e.stopPropagation();
  if (this.onDragEnd) {
    this.onDragEnd(e);
  }
}

export type DraggableState = {
  isDragging?: boolean;
};

export type DraggableReactCallbacks = Pick<
  JSX.IntrinsicElements['div'],
  'onDrag' | 'onDragStart' | 'onDragEnd'
>;

const componentDraggableId = new WeakBiMap<React.Component, string>();
const componentDropzoneId = new WeakBiMap<React.Component, string>();

export function draggable(
  draggable: React.Component & DraggableReactCallbacks
): {
  draggable: true;
  'data-draggable-id': string;
} & DraggableReactCallbacks {
  let draggableId = componentDraggableId.getValue(draggable);
  if (!draggableId) {
    draggableId = `draggable__${uuid()}`;
    componentDraggableId.set(draggable, draggableId);
  }

  return {
    draggable: true,
    'data-draggable-id': draggableId,
  };
}

export function dragListeners(
  draggable: React.Component & DraggableReactCallbacks,
  el: HTMLElement
) {
  return [
    eventListener(el, 'dragstart', onDragStart.bind(draggable)),
    eventListener(el, 'drag', onDrag.bind(draggable)),
    eventListener(el, 'dragend', onDragEnd.bind(draggable)),
  ];
}

function closestAncestorMatching(
  predicate: (el: Element) => boolean,
  el: Element | null
) {
  while (el && !predicate(el)) {
    el = el.parentElement;
  }
  return el;
}
const closestDropzoneAncestor = closestAncestorMatching.bind(null, (el) =>
  Boolean(el instanceof HTMLElement && el.dataset['dropzoneId'])
) as (el: Element | null) => HTMLElement | null;

function onDragEnter(
  this: React.Component & DropzoneReactCallbacks,
  e: React.DragEvent<any>
) {
  e.stopPropagation();

  if (!draggedComponent) return;

  this.setState({ isDraggingOver: true });
  if (this.onDragEnter) {
    this.onDragEnter(e);
  }
}
function onDragOver(
  this: React.Component & DropzoneReactCallbacks,
  e: React.DragEvent<any>
) {
  // Let it be known that this element is a dropzone.
  e.stopPropagation();
  e.preventDefault();

  if (!draggedComponent) return;

  this.setState({ isDraggingOver: true });
  if (this.onDragOver) {
    this.onDragOver(e);
  }
}
function onDrop(
  this: React.Component & DropzoneReactCallbacks,
  e: React.DragEvent<any>
) {
  e.stopPropagation();

  if (!draggedComponent) return;

  draggedComponent = null;
  e.target.dispatchEvent(
    new CustomEvent('dragAndDrop:endDrag', { bubbles: true })
  );

  this.setState({ isDraggingOver: false });
  if (this.onDrop) {
    this.onDrop(e);
  }
}
function onDragLeave(
  this: React.Component & DropzoneReactCallbacks,
  e: React.DragEvent<any>
) {
  // Only invoke dragLeave if the drag has actually left the dropzone element.
  const dropzone = hoveredDropzoneElement(e);
  if (
    !dropzone ||
    dropzone.dataset['dropzoneId'] !== componentDropzoneId.getValue(this)
  ) {
    this.setState({ isDraggingOver: false });
    e.stopPropagation();
    if (this.onDragLeave) {
      this.onDragLeave(e);
    }
  }
}

export type DropzoneState = {
  isDraggingOver?: boolean;
};

type IntrinsicElement = JSX.IntrinsicElements[keyof JSX.IntrinsicElements];

export type DropzoneReactCallbacks<
  T extends IntrinsicElement = JSX.IntrinsicElements['div']
> = Pick<T, 'onDragEnter' | 'onDragOver' | 'onDragLeave' | 'onDrop'>;

export function dropzone(dropzone: React.Component & DropzoneReactCallbacks) {
  let dropzoneId = componentDropzoneId.getValue(dropzone);
  if (!dropzoneId) {
    dropzoneId = `droppable__${uuid()}`;
    componentDropzoneId.set(dropzone, dropzoneId);
  }

  return {
    'data-dropzone-id': dropzoneId,
  };
}

export function dropListeners(
  dropzone: React.Component & DropzoneReactCallbacks,
  el: Element
) {
  return [
    eventListener(el, 'dragenter', onDragEnter.bind(dropzone)),
    eventListener(el, 'dragover', onDragOver.bind(dropzone)),
    eventListener(el, 'dragleave', onDragLeave.bind(dropzone)),
    eventListener(el, 'drop', onDrop.bind(dropzone)),
  ];
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
