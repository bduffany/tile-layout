import React from 'react';
import { v4 as uuid } from 'uuid';
import { AnimatedValue } from './AnimatedValue';
import { AnimationLoop } from './AnimationLoop';
import { eventListener } from './dispose';
import css from './Scrollbar.module.css';
// TODO: decouple
import { borderDrag } from '../TileLayout';

export type ScrollEvent = {
  delta: number;
  animate: boolean;
};

export type HorizontalScrollbarProps = {
  onScroll?: (event: ScrollEvent) => any;
};

const preventDefaultOnDrag = (e: React.DragEvent<HTMLDivElement>) =>
  e.preventDefault();

function computeScrollBoundsFrom(el: HTMLElement) {
  return {
    scrollLeft: el!.scrollLeft,
    scrollLeftMax: Math.max(0, el!.scrollWidth - el!.clientWidth),
  };
}

export class HorizontalScrollbar extends React.Component<HorizontalScrollbarProps> {
  private scrollingElement: HTMLElement | null = null;
  private track: HTMLDivElement | null = null;
  private thumb: HTMLDivElement | null = null;

  private thumbWidth = 0;
  private scrollableWidth = 0;
  private thumbX = 0;
  private isScrolling = false;
  private minMouseX = 0;
  private maxMouseX = 0;
  private mouseX = 0;

  private animationLoop = new AnimationLoop(this.draw.bind(this));
  private scrollLeft = new AnimatedValue(0, { min: 0, max: 1 });

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
    this.scrollingElement = scrollingElement;
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
      eventListener(window, 'resize', this.onWindowResize.bind(this)),
      eventListener(window, 'mousemove', this.onWindowMouseMove.bind(this)),
      eventListener(window, 'mouseup', this.onWindowMouseUp.bind(this)),
      eventListener(window, 'keydown', this.onWindowKeyDown.bind(this)),
      // TODO: only listen to relevant borders
      eventListener(window, borderDrag.type, this.onResizeAnyTile.bind(this))
    );

    this.animationLoop.start();
  }

  private onWindowResize() {
    this.update();
  }

  private onResizeAnyTile() {
    this.update();
  }

  private setVisible(visible: boolean) {
    this.thumb!.classList.toggle(css.fadeOut, !visible);
  }

  private draw(dt: number) {
    this.scrollLeft.step(dt);
    if (this.scrollingElement) {
      this.scrollingElement.scrollLeft = this.scrollLeft.value;
    }
    if (this.scrollLeft.isAtTarget) {
      this.animationLoop.stop();
    } else {
      this.setVisible(true);
    }

    if (!this.track) return;

    if (this.scrollLeft.max <= 0) {
      this.track.setAttribute('hidden', '');
    } else {
      this.track.removeAttribute('hidden');
    }

    const trackClientWidth = this.track.clientWidth;
    this.scrollableWidth = this.scrollLeft.max + trackClientWidth;
    this.thumbWidth =
      (trackClientWidth / this.scrollableWidth) * trackClientWidth;
    this.thumbX =
      this.scrollLeft.max === 0
        ? 0
        : (this.scrollLeft.value / this.scrollLeft.max) *
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

  public update(values?: { scrollLeft: number; scrollLeftMax: number }) {
    if (!this.track) return;

    if (!values) {
      if (this.scrollingElement) {
        values = computeScrollBoundsFrom(this.scrollingElement);
      } else {
        return;
      }
    }

    const { scrollLeft, scrollLeftMax } = values;
    this.scrollLeft.max = scrollLeftMax;
    this.scrollLeft.target = scrollLeft;
    this.animationLoop.start();
  }

  public setScrollingElement(el: HTMLElement) {
    this.scrollingElement = el;
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
          this.scrollLeft.max,
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
    console.log('Wheel');
    if (e.deltaX || e.deltaY) {
      e.preventDefault();
      this.publishScrollEvent(e.deltaX || e.deltaY);
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
    } else {
      this.scrollLeft.target += delta;
      this.animationLoop.start();
    }
  }

  render() {
    return (
      <div
        className={css.horizontalScrollbarTrack}
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
          className={css.horizontalScrollbarThumb}
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
