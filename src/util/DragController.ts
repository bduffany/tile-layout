type MouseEventListener = (e: MouseEvent) => any;

export type DragControllerEvent = {
  mouseEvent: MouseEvent;
  dragStartPosition: { x: number; y: number };
};
export type DragListener = (dragEvent: DragControllerEvent) => any;

export default class DragController {
  private dragStartPosition = { x: 0, y: 0 };

  private mouseMoveListener: MouseEventListener | null = null;
  private mouseUpListener: MouseEventListener | null = null;
  private cursorOverlay: HTMLDivElement | null = null;

  dispose() {
    if (this.mouseMoveListener) {
      window.removeEventListener('mousemove', this.mouseMoveListener);
      this.mouseMoveListener = null;
    }
    if (this.mouseUpListener) {
      window.removeEventListener('mouseup', this.mouseUpListener);
      this.mouseUpListener = null;
    }
  }

  private onMouseUp(e: MouseEvent, onDragEnd: DragListener) {
    this.dispose();
    onDragEnd({ dragStartPosition: this.dragStartPosition, mouseEvent: e });
    this.clearCursor();
  }

  private onMouseMove(onDrag: DragListener, e: MouseEvent) {
    onDrag({ dragStartPosition: this.dragStartPosition, mouseEvent: e });
  }

  private setCursor(cursor: string) {
    if (!this.cursorOverlay) {
      this.cursorOverlay = document.createElement('div');
      Object.assign(this.cursorOverlay.style, {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        zIndex: 0x7fffffff,
      });
    }
    this.cursorOverlay.style.cursor = cursor;
    document.body.append(this.cursorOverlay);
  }

  private clearCursor() {
    this.cursorOverlay?.remove();
  }

  getDragStartHandler(
    onDrag: DragListener,
    onDragEnd: DragListener,
    cursor: string
  ) {
    return (e: MouseEvent) => {
      e.preventDefault();
      this.dispose();
      this.dragStartPosition = { x: e.clientX, y: e.clientY };
      this.setCursor(cursor);
      window.addEventListener(
        'mousemove',
        (this.mouseMoveListener = (e: MouseEvent) =>
          this.onMouseMove(onDrag, e))
      );
      window.addEventListener(
        'mouseup',
        (this.mouseUpListener = (e: MouseEvent) => this.onMouseUp(e, onDragEnd))
      );
    };
  }
}
