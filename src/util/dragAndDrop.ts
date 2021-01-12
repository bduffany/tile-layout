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

import { eventListener } from './dispose';
import WeakBiMap from './WeakBiMap';
import uuid from './uuid';

const DEBUG = false;

class DebugElement {
  static instances = new WeakMap<HTMLElement, DebugElement>();
  static fadeOutDuration = 200;
  static logPersistence = 300;

  private logs: {
    text: string;
    color: string;
    timestamp: number;
    id: string;
  }[] = [];
  private fadeTimeout: any;
  private outline: HTMLDivElement = document.createElement('div');

  constructor(element: HTMLElement) {
    DebugElement.instances.set(element, this);
    Object.assign(this.outline.style, {
      position: 'fixed',
      boxSizing: 'border-box',
      borderRadius: '4px',
      transition: `opacity ${DebugElement.fadeOutDuration}ms`,
      zIndex: 1_000_000,
      pointerEvents: 'none',
      fontWeight: 'bold',
      textShadow: '0 0 3px rgba(0, 0, 0, 0.9)',
      boxShadow: '0 6px 12px rgba(0, 0, 0, 0.5) inset',
      fontFamily: 'monospace',
      fontSize: 10,
    });
    this.fit(element);
    document.body.appendChild(this.outline);
  }

  static forTarget(element: HTMLElement): DebugElement {
    if (DebugElement.instances.has(element)) {
      const existing = DebugElement.instances.get(element)!;
      existing.fit(element);
      return existing;
    }

    return new DebugElement(element);
  }

  private fit(target: HTMLElement) {
    const { x: left, y: top, height, width } = target.getBoundingClientRect();
    Object.assign(this.outline.style, {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
    });
  }

  log(text: string, color: string) {
    if (this.fadeTimeout) {
      clearTimeout(this.fadeTimeout);
    }
    Object.assign(this.outline.style, {
      border: `1px solid ${color}`,
      color,
      opacity: '1',
    });
    this.fadeTimeout = setTimeout(() => {
      this.outline.style.opacity = '0';
    }, 200);
    text = text || '?';

    const lastEntry = this.logs[this.logs.length - 1];
    if (lastEntry && lastEntry.text === text && lastEntry.color === color) {
      lastEntry.timestamp = window.performance.now();
    } else {
      const id = 'L' + uuid();
      this.logs.push({
        text,
        color,
        timestamp: window.performance.now(),
        id,
      });
      const logLine = document.createElement('div');
      logLine.innerText = text;
      logLine.style.color = color;
      logLine.id = id;
      this.outline.prepend(logLine);
    }
    this.pruneLogs();
  }

  private pruneLogs() {
    const now = window.performance.now();
    this.logs = this.logs.filter((entry) => {
      if (now - entry.timestamp > DebugElement.logPersistence) {
        this.outline.querySelector(`#${entry.id}`)!.remove();
        return false;
      } else {
        return true;
      }
    });
  }
}

function debugEvent({ type, target }: any, { color = 'orange' } = {}) {
  if (DEBUG) {
    DebugElement.forTarget(target).log(type, color);
  }
}

let cancelNextDrag = false;
let isMouseOutsideWindow = false;
document.addEventListener('mouseleave', (e) => {
  isMouseOutsideWindow = true;
  console.log('mouseleave');
});
document.addEventListener('dragleave', () => {
  isMouseOutsideWindow = true;
});
document.addEventListener('dragenter', () => {
  isMouseOutsideWindow = false;
});
document.addEventListener('mouseenter', (e) => {
  isMouseOutsideWindow = false;
});
window.addEventListener('mouseup', () => {
  cancelNextDrag = false;
});

export function preventNextDrag() {
  cancelNextDrag = true;
}

function hoveredDropzoneElement(e: DragEvent) {
  // console.log({ x: e.clientX, y: e.clientY });
  if (isMouseOutsideWindow) return null;
  const [hoveredElement] = document.elementsFromPoint(e.clientX, e.clientY);
  return closestDropzoneAncestor(hoveredElement as Element);
}

function hoveredDropzoneComponent(e: DragEvent) {
  if (isMouseOutsideWindow) return null;
  return componentDropzoneId
    .inverse()
    .get(hoveredDropzoneElement(e)?.dataset['dropzoneId'] || '');
}

let draggedComponent: React.Component | null = null;

function onDragStart(
  this: React.Component & DraggableReactCallbacks,
  e: DragEvent
) {
  if (cancelNextDrag) {
    e.preventDefault();
    cancelNextDrag = false;
  }

  // TODO: Figure out why this happens
  if (!(e.target as HTMLElement).dataset) return;

  debugEvent(e);

  draggedComponent = this;
  e.target!.dispatchEvent(
    new CustomEvent('dragAndDrop:beginDrag', { bubbles: true })
  );

  e.stopPropagation();
  this.setState({ isDragging: true });

  e.dataTransfer!.setData(
    'text',
    (e.target as HTMLElement).dataset['draggableId'] as string
  );
  if (this.onDragStart) {
    this.onDragStart(e);
  }
}
function onDrag(this: React.Component & DraggableReactCallbacks, e: DragEvent) {
  debugEvent(e);

  e.stopPropagation();
  if (this.onDrag) {
    this.onDrag(e);
  }

  // setTimeout(() => {
  //   const hoveredDropzone = hoveredDropzoneComponent(e);
  //   if (hoveredDropzone) {
  //     debugEvent(
  //       { target: hoveredDropzoneElement(e), type: 'synthetic:dragOver' },
  //       { color: 'cyan' }
  //     );
  //     onDragOver.call(hoveredDropzone, e, { synthetic: true });
  //   }
  // });
}
function onDragEnd(
  this: React.Component & DraggableReactCallbacks,
  e: DragEvent
) {
  debugEvent(e);

  if (draggedComponent) {
    draggedComponent = null;
    e.target?.dispatchEvent(
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

export type DraggableReactCallbacks = {
  onDrag?: (e: DragEvent) => any;
  onDragStart?: (e: DragEvent) => any;
  onDragEnd?: (e: DragEvent) => any;
};

const componentDraggableId = new WeakBiMap<React.Component, string>();
const componentDropzoneId = new WeakBiMap<React.Component, string>();

export function draggable(
  draggable: React.Component & DraggableReactCallbacks
): {
  draggable: true;
  'data-draggable-id': string;
} {
  let draggableId = componentDraggableId.get(draggable);
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
  e: DragEvent
) {
  debugEvent(e);

  e.stopPropagation();

  if (!draggedComponent) return;

  this.setState({ isDraggingOver: true });
  if (this.onDragEnter) {
    this.onDragEnter(e);
  }
}
function onDragOver(
  this: React.Component & DropzoneReactCallbacks,
  e: DragEvent,
  { synthetic = false } = {}
) {
  if (!synthetic) {
    debugEvent(e);
    // Let it be known that this element is a dropzone.
    e.stopPropagation();
    e.preventDefault();
  }

  if (!draggedComponent) return;

  this.setState({ isDraggingOver: true });
  if (this.onDragOver) {
    this.onDragOver(e);
  }
}
function onDrop(this: React.Component & DropzoneReactCallbacks, e: DragEvent) {
  debugEvent(e);

  e.stopPropagation();

  if (!draggedComponent) return;

  draggedComponent = null;
  e.target!.dispatchEvent(
    new CustomEvent('dragAndDrop:endDrag', { bubbles: true })
  );

  this.setState({ isDraggingOver: false });
  if (this.onDrop) {
    this.onDrop(e);
  }
}
function onDragLeave(
  this: React.Component & DropzoneReactCallbacks,
  e: DragEvent
) {
  debugEvent(e);

  // setTimeout allows isMouseInsideWindow to update.
  setTimeout(() => {
    // Only invoke dragLeave if the drag has actually left the dropzone element.
    const dropzone = hoveredDropzoneElement(e);
    if (
      !dropzone ||
      dropzone.dataset['dropzoneId'] !== componentDropzoneId.get(this)
    ) {
      console.debug('onDragLeave', this);
      this.setState({ isDraggingOver: false });
      e.stopPropagation();
      if (this.onDragLeave) {
        this.onDragLeave(e);
      }
    }
  });
}

export type DropzoneState = {
  isDraggingOver?: boolean;
};

export type DropzoneReactCallbacks = {
  onDragEnter?: (e: DragEvent) => any;
  onDragOver?: (e: DragEvent) => any;
  onDragLeave?: (e: DragEvent) => any;
  onDrop?: (e: DragEvent) => any;
};

export function dropzone(dropzone: React.Component & DropzoneReactCallbacks) {
  let dropzoneId = componentDropzoneId.get(dropzone);
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
  e: DragEvent
): T {
  const draggableId = e.dataTransfer!.getData('text');
  if (process.env.NODE_ENV === 'development' && !draggableId) {
    throw new Error('Drag event is missing draggableId in dataTransfer');
  }
  return componentDraggableId.inverse().get(draggableId!) as T;
}

export function droppedElement(e: React.DragEvent): HTMLElement {
  const draggableId = e.dataTransfer!.getData('text');
  return document.querySelector(
    `[data-draggable-id="${draggableId}"]`
  ) as HTMLElement;
}
