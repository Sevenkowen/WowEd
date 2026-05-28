export interface PopoverPosition {
  top: number
  left: number
  width: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function positionBelowAnchor(
  anchor: DOMRect,
  width: number,
  heightEstimate: number,
  gap = 4,
): PopoverPosition {
  let left = anchor.left + anchor.width / 2 - width / 2
  let top = anchor.bottom + gap
  const maxLeft = Math.max(8, window.innerWidth - width - 8)
  left = clamp(left, 8, maxLeft)
  if (top + heightEstimate > window.innerHeight - 8) {
    top = Math.max(8, anchor.top - gap - heightEstimate)
  }
  return { top, left, width }
}

export function positionBesideAnchor(
  anchor: DOMRect,
  width: number,
  heightEstimate: number,
  gap = 8,
): PopoverPosition {
  let left = anchor.right + gap
  let top = anchor.top
  if (left + width > window.innerWidth - 8) {
    left = Math.max(8, anchor.left - gap - width)
  }
  top = clamp(top, 8, Math.max(8, window.innerHeight - heightEstimate - 8))
  return { top, left, width }
}
