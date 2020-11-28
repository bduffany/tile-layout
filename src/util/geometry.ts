const DROP_REGION_LENGTH_PX = 100;

export type DropRegion = 'cover' | 'top' | 'left' | 'bottom' | 'right';

export function getDropRegion(
  bounds: DOMRect,
  { clientX: x, clientY: y }: { clientX: number; clientY: number }
): DropRegion {
  if (y < bounds.y + DROP_REGION_LENGTH_PX) {
    return 'top';
  }
  if (y > bounds.y + bounds.height - DROP_REGION_LENGTH_PX) {
    return 'bottom';
  }
  if (x < bounds.x + DROP_REGION_LENGTH_PX) {
    return 'left';
  }
  if (x > bounds.x + bounds.width - DROP_REGION_LENGTH_PX) {
    return 'right';
  }

  return 'cover';
}
