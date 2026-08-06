import { Rect, Vec2 } from '../lib/math'

export const liveViewportProxy = {
  isLiveMode: false,
  configSpaceViewportRect: Rect.empty,
  logicalSpaceViewportSize: Vec2.zero,
  autoPanToRight: true,
  /*
   * Set once the user changes the viewport width by hand.
   */
  hasUserZoomed: false,
}

/*
 * Records a manual viewport change.
 */
export function markLiveUserInteraction(requestedViewport: Rect) {
  const previousWidth = liveViewportProxy.configSpaceViewportRect.width()

  if (
    previousWidth > 0 &&
    Math.abs(requestedViewport.width() - previousWidth) / previousWidth > 1e-6
  ) {
    liveViewportProxy.hasUserZoomed = true
  }

  liveViewportProxy.autoPanToRight = false
}
