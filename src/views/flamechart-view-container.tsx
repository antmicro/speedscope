import {h} from 'preact'
import {CanvasContext} from '../gl/canvas-context'
import {Flamechart} from '../lib/flamechart'
import {FlamechartRenderer, FlamechartRendererOptions} from '../gl/flamechart-renderer'
import {Frame, Profile, CallTreeNode} from '../lib/profile'
import {memoizeByShallowEquality} from '../lib/utils'
import {FlamechartView} from './flamechart-view'
import {
  createGetColorBucketForFrame,
  getCanvasContext,
  createGetCSSColorForFrame,
  getFrameToColorBucket,
} from '../app-state/getters'
import {Vec2, Rect} from '../lib/math'
import {memo, useCallback, useMemo, useEffect} from 'preact/compat'
import {ActiveProfileState} from '../app-state/active-profile-state'
import {FlamechartSearchContextProvider} from './flamechart-search-view'
import {Theme, useTheme} from './themes/theme'
import {FlamechartID, FlamechartViewState} from '../app-state/profile-group'
import {metadataOnlyProfileAtom} from '../app-state'
import {useAtom} from '../lib/atom'

interface FlamechartSetters {
  setLogicalSpaceViewportSize: (logicalSpaceViewportSize: Vec2) => void
  setConfigSpaceViewportRect: (configSpaceViewportRect: Rect) => void
  setNodeHover: (hover: {node: CallTreeNode; event: MouseEvent} | null) => void
  setSelectedNode: (node: CallTreeNode | null) => void
}

export function useFlamechartSetters(props: FlamechartViewContainerProps, id: FlamechartID): FlamechartSetters {
const {setNodeHover, setLogicalSpaceViewportSize, setConfigSpaceViewportRect, setSelectedNode} = props
  return {
    setNodeHover: useCallback(
      (hover: {node: CallTreeNode; event: MouseEvent} | null) => {
        setNodeHover(id, hover)
      },
      [id],
    ),
    setLogicalSpaceViewportSize: useCallback(
      (logicalSpaceViewportSize: Vec2) => {
        setLogicalSpaceViewportSize(id, logicalSpaceViewportSize)
      },
      [id],
    ),
    setConfigSpaceViewportRect: useCallback(
      (configSpaceViewportRect: Rect) => {
        setConfigSpaceViewportRect(id, configSpaceViewportRect)
      },
      [id],
    ),
    setSelectedNode: useCallback(
      (selectedNode: CallTreeNode | null) => {
        setSelectedNode(id, selectedNode)
      },
      [id],
    ),
  }
}

export type FlamechartViewProps = {
  theme: Theme
  canvasContext: CanvasContext
  flamechart: Flamechart
  flamechartRenderer: FlamechartRenderer
  renderInverted: boolean
  getCSSColorForFrame: (frame: Frame) => string
  enableTimestampPointer: boolean
  isFocused?: (ev: KeyboardEvent) => boolean
} & FlamechartSetters &
  FlamechartViewState

export const getChronoViewFlamechart = memoizeByShallowEquality(
  ({
    profile,
    getColorBucketForFrame,
  }: {
    profile: Profile
    getColorBucketForFrame: (frame: Frame) => number
  }): Flamechart => {
    return new Flamechart({
      getTotalWeight: profile.getTotalWeight.bind(profile),
      forEachCall: profile.forEachCall.bind(profile),
      formatValue: profile.formatValue.bind(profile),
      getColorBucketForFrame,
    })
  },
)

export const createMemoizedFlamechartRenderer = (options?: FlamechartRendererOptions) =>
  memoizeByShallowEquality(
    ({
      canvasContext,
      flamechart,
    }: {
      canvasContext: CanvasContext
      flamechart: Flamechart
    }): FlamechartRenderer => {
      return new FlamechartRenderer(
        canvasContext.gl,
        canvasContext.rowAtlas,
        flamechart,
        canvasContext.rectangleBatchRenderer,
        canvasContext.flamechartColorPassRenderer,
        options,
      )
    },
  )

const getChronoViewFlamechartRenderer = createMemoizedFlamechartRenderer()

export interface FlamechartViewContainerProps {
  activeProfileState: ActiveProfileState
  glCanvas: HTMLCanvasElement
  canvasContext?: CanvasContext
  flattenRecursion?: boolean
  setLogicalSpaceViewportSize: (id: FlamechartID, logicalSpaceViewportSize: Vec2) => void
  setConfigSpaceViewportRect: (id: FlamechartID, configSpaceViewportRect: Rect) => void
  setNodeHover: (id: FlamechartID, hover: {node: CallTreeNode; event: MouseEvent} | null) => void
  setSelectedNode: (id: FlamechartID, selectedNode: CallTreeNode | null) => void
  isFocused?: (ev: KeyboardEvent) => boolean
}

export const ChronoFlamechartView = memo((props: FlamechartViewContainerProps) => {
  const {activeProfileState, glCanvas, canvasContext: propsCanvasContext} = props
  const {profile, chronoViewState} = activeProfileState
  const metadataOnlySt = useAtom(metadataOnlyProfileAtom);

  const theme = useTheme()

  const canvasContext = propsCanvasContext ||  useMemo(
    () => (getCanvasContext({theme, canvas: glCanvas})),
      [theme, glCanvas],
  )
  const frameToColorBucket = getFrameToColorBucket(profile)
  const getColorBucketForFrame = createGetColorBucketForFrame(frameToColorBucket)
  const getCSSColorForFrame = createGetCSSColorForFrame({theme, frameToColorBucket})

  const flamechart = getChronoViewFlamechart({profile, getColorBucketForFrame})
  const flamechartRenderer = getChronoViewFlamechartRenderer({
    canvasContext,
    flamechart,
  })

  useEffect(() => {
    return () => {
      if (flamechartRenderer) {
        flamechartRenderer.free()
      }
    }
  }, [flamechartRenderer])

  const setters = useFlamechartSetters(props, FlamechartID.CHRONO)

  return (
    <FlamechartSearchContextProvider
      flamechart={flamechart}
      selectedNode={chronoViewState.selectedNode}
      setSelectedNode={setters.setSelectedNode}
      configSpaceViewportRect={chronoViewState.configSpaceViewportRect}
      setConfigSpaceViewportRect={setters.setConfigSpaceViewportRect}
    >
      <FlamechartView
        theme={theme}
        renderInverted={false}
        flamechart={flamechart}
        flamechartRenderer={flamechartRenderer}
        canvasContext={canvasContext}
        getCSSColorForFrame={getCSSColorForFrame}
        enableTimestampPointer={!metadataOnlySt}
        isFocused={props.isFocused}
        {...chronoViewState}
        {...setters}
      />
    </FlamechartSearchContextProvider>
  )
})

export const getLeftHeavyFlamechart = memoizeByShallowEquality(
  ({
    profile,
    getColorBucketForFrame,
  }: {
    profile: Profile
    getColorBucketForFrame: (frame: Frame) => number
  }): Flamechart => {
    return new Flamechart({
      getTotalWeight: profile.getTotalNonIdleWeight.bind(profile),
      forEachCall: profile.forEachCallGrouped.bind(profile),
      formatValue: profile.formatValue.bind(profile),
      getColorBucketForFrame,
    })
  },
)

const getLeftHeavyFlamechartRenderer = createMemoizedFlamechartRenderer()

export const LeftHeavyFlamechartView = memo((ownProps: FlamechartViewContainerProps) => {
  const {activeProfileState, glCanvas, canvasContext: propsCanvasContext} = ownProps

  const {profile, leftHeavyViewState} = activeProfileState

  const theme = useTheme()

  const canvasContext = propsCanvasContext || useMemo(
    () => (getCanvasContext({theme, canvas: glCanvas})),
      [theme, glCanvas],
  )
  const frameToColorBucket = getFrameToColorBucket(profile)
  const getColorBucketForFrame = createGetColorBucketForFrame(frameToColorBucket)
  const getCSSColorForFrame = createGetCSSColorForFrame({theme, frameToColorBucket})

  const flamechart = getLeftHeavyFlamechart({
    profile,
    getColorBucketForFrame,
  })
  const flamechartRenderer = getLeftHeavyFlamechartRenderer({
    canvasContext,
    flamechart,
  })

  useEffect(() => {
    return () => {
      if (flamechartRenderer) {
        flamechartRenderer.free()
      }
    }
  }, [flamechartRenderer])

  const setters = useFlamechartSetters(ownProps, FlamechartID.LEFT_HEAVY)

  return (
    <FlamechartSearchContextProvider
      flamechart={flamechart}
      selectedNode={leftHeavyViewState.selectedNode}
      setSelectedNode={setters.setSelectedNode}
      configSpaceViewportRect={leftHeavyViewState.configSpaceViewportRect}
      setConfigSpaceViewportRect={setters.setConfigSpaceViewportRect}
    >
      <FlamechartView
        theme={theme}
        renderInverted={false}
        flamechart={flamechart}
        flamechartRenderer={flamechartRenderer}
        canvasContext={canvasContext}
        getCSSColorForFrame={getCSSColorForFrame}
        enableTimestampPointer={false}
        {...leftHeavyViewState}
        {...setters}
      />
    </FlamechartSearchContextProvider>
  )
})
