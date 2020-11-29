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

  private onMouseUp() {
    this.dispose();
  }

  private onMouseMove(onDrag: DragListener, e: MouseEvent) {
    onDrag({ dragStartPosition: this.dragStartPosition, mouseEvent: e });
  }

  getDragStartHandler(onDrag: DragListener) {
    return (e: MouseEvent) => {
      e.preventDefault();
      this.dispose();
      this.dragStartPosition = { x: e.clientX, y: e.clientY };
      window.addEventListener(
        'mousemove',
        (this.mouseMoveListener = (e: MouseEvent) =>
          this.onMouseMove(onDrag, e))
      );
      window.addEventListener(
        'mouseup',
        (this.mouseUpListener = this.onMouseUp.bind(this))
      );
    };
  }
}
