import { Rect, Vec2 } from '../lib/math'

export const liveViewportProxy = {
  isLiveMode: false,
  configSpaceViewportRect: Rect.empty,
  logicalSpaceViewportSize: Vec2.zero,
  autoPanToRight: true,
}
