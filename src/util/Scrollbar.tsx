import React from 'react';
import { v4 as uuid } from 'uuid';
import { eventListener } from './dispose';
import css from './Scrollbar.module.css';

export type ScrollEvent = {
  delta: number;
  animate: boolean;
};

export type HorizontalScrollbarProps = {
  onScroll?: (event: ScrollEvent) => any;
};

const preventDefaultOnDrag = (e: React.DragEvent<HTMLDivElement>) =>
  e.preventDefault();

export class HorizontalScrollbar extends React.Component<HorizontalScrollbarProps> {
  private track: HTMLDivElement | null = null;
  private thumb: HTMLDivElement | null = null;

  private scrollLeft = 0;
  private scrollLeftMax = 0;
  private thumbWidth = 0;
  private scrollableWidth = 0;
  private thumbX = 0;
  private isScrolling = false;
  private minMouseX = 0;
  private maxMouseX = 0;
  private mouseX = 0;

  // Single scroll event here avoids creating too many objects.
  private scrollEvent: ScrollEvent = { delta: 0, animate: false };

  private trackRef = React.createRef<HTMLDivElement>();
  private thumbRef = React.createRef<HTMLDivElement>();

  private disposeFns: Function[] = [];

  componentDidMount() {
    this.track = this.trackRef.current;
    this.thumb = this.thumbRef.current;
    const scrollingElement = this.track!.parentElement!;
    if (!scrollingElement.id) {
      scrollingElement.id = uuid();
    }
    this.thumb!.setAttribute('aria-controls', scrollingElement.id);

    this.disposeFns.push(
      eventListener(
        scrollingElement,
        'mouseenter',
        this.onMouseEnterScrollingElement.bind(this)
      ),
      eventListener(
        scrollingElement,
        'mouseleave',
        this.onMouseLeaveScrollingElement.bind(this)
      ),
      eventListener(
        scrollingElement,
        'wheel',
        this.onWheelScrollingElement.bind(this)
      ),
      eventListener(window, 'mousemove', this.onWindowMouseMove.bind(this)),
      eventListener(window, 'mouseup', this.onWindowMouseUp.bind(this)),
      eventListener(window, 'keydown', this.onWindowKeyDown.bind(this))
    );
  }

  public update({
    scrollLeft,
    scrollLeftMax,
  }: {
    scrollLeft: number;
    scrollLeftMax: number;
  }) {
    if (!this.track) return;

    this.scrollLeft = scrollLeft;
    this.scrollLeftMax = scrollLeftMax;
    const trackClientWidth = this.track.clientWidth;
    this.scrollableWidth = this.scrollLeftMax + trackClientWidth;
    this.thumbWidth =
      (trackClientWidth / this.scrollableWidth) * trackClientWidth;
    this.thumbX =
      scrollLeftMax === 0
        ? 0
        : (this.scrollLeft / this.scrollLeftMax) *
          (trackClientWidth - this.thumbWidth);

    this.thumb!.style.left = `${this.thumbX}px`;
    this.thumb!.style.width = `${this.thumbWidth}px`;

    this.track.setAttribute(
      'aria-valuenow',
      String(
        Math.round(
          this.thumbX === 0
            ? 0
            : (100 * this.thumbX) / (trackClientWidth - this.thumbWidth)
        )
      )
    );
  }

  private onThumbMouseDown(e: React.MouseEvent) {
    if (e.buttons & 1) {
      this.isScrolling = true;
      const thumb = this.thumb!.getBoundingClientRect();
      const track = this.track!.getBoundingClientRect();
      this.minMouseX = e.clientX - (thumb.x - track.x);
      this.maxMouseX =
        e.clientX + (track.x + track.width - (thumb.x + thumb.width));
    }
    this.updateMouse(e.nativeEvent);
  }

  private onWindowMouseMove(e: MouseEvent) {
    if (!this.isScrolling) return;
    if (!(e.buttons & 1)) {
      this.isScrolling = false;
      return;
    }

    const lastX = this.mouseX;
    this.updateMouse(e);
    const deltaX = this.mouseX - lastX;

    if (deltaX !== 0 && this.track!.clientWidth - this.thumbWidth !== 0) {
      this.publishScrollEvent(
        (deltaX / (this.track!.clientWidth - this.thumbWidth)) *
          this.scrollLeftMax,
        false
      );
    }
  }
  private onWindowMouseUp(e: MouseEvent) {
    this.updateMouse(e);
    this.isScrolling = false;
  }
  private updateMouse(e: MouseEvent) {
    this.mouseX = Math.min(this.maxMouseX, Math.max(this.minMouseX, e.clientX));
  }

  private isMouseInside = false;
  private onMouseEnterScrollingElement() {
    this.isMouseInside = true;
  }
  private onMouseLeaveScrollingElement() {
    this.isMouseInside = false;
  }
  private onWheelScrollingElement(e: WheelEvent) {
    if (e.deltaX) {
      e.preventDefault();
      this.publishScrollEvent(e.deltaX);
    } else if (e.shiftKey && e.deltaY) {
      e.preventDefault();
      this.publishScrollEvent(e.deltaY);
    }
  }
  private onWindowKeyDown(e: KeyboardEvent) {
    if (!this.isMouseInside || e.ctrlKey || e.shiftKey) return;

    if (e.which === 39 || e.which === 37) {
      e.preventDefault();
      const dir = e.which - 38;
      this.publishScrollEvent(40 * dir);
    }
  }

  private publishScrollEvent(delta: number, animate: boolean = true) {
    this.scrollEvent.delta = delta;
    this.scrollEvent.animate = animate;
    if (this.props.onScroll) {
      this.props.onScroll(this.scrollEvent);
    }
  }

  render() {
    return (
      <div
        className={css.horizontalScrollTrack}
        ref={this.trackRef}
        onDragStart={preventDefaultOnDrag}
        role="scrollbar"
        // This is set to the parent element's ID on mount
        aria-controls=""
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        <div
          className={css.horizontalScrollThumb}
          ref={this.thumbRef}
          onMouseDown={this.onThumbMouseDown.bind(this)}
        />
      </div>
    );
  }

  componentWillUnmount() {
    for (const dispose of this.disposeFns) {
      dispose();
    }
  }
}
