import '../../assets/reset.css'
import '../../assets/source-code-pro.css'

import {createRef, h} from 'preact'
import {StyleSheet, css} from 'aphrodite'

import {FontFamily, FontSize, Duration} from './style'
import {ActiveProfileState} from '../app-state/active-profile-state'
import {LeftHeavyFlamechartView, ChronoFlamechartView} from './flamechart-view-container'
import {CanvasContext} from '../gl/canvas-context'
import {Toolbar} from './toolbar'
import {Theme, withTheme} from './themes/theme'
import {ViewMode} from '../lib/view-mode'
import {canUseXHR, CustomWelcomeMessage, metadataOnlyProfileAtom} from '../app-state'
import {StatelessComponent} from '../lib/preact-helpers'
import {SandwichViewContainer} from './sandwich-view'
import {useAtom} from '../lib/atom'
import {ProfileLoader, ProfileLoaderState} from '../lib/profile-loader'

const importModule = import('../import')

// Force eager loading of a few code-split modules.
//
// We put them all in one place so we can directly control the relative priority
// of these.
importModule.then(() => {})
import('../lib/demangle').then(() => {})
import('source-map').then(() => {})

interface GLCanvasProps {
  canvasContext: CanvasContext | null
  theme: Theme
  setGLCanvas: (canvas: HTMLCanvasElement | null) => void
}
export class GLCanvas extends StatelessComponent<GLCanvasProps> {
  private canvas: HTMLCanvasElement | null = null

  private ref = (canvas: Element | null) => {
    if (canvas instanceof HTMLCanvasElement) {
      this.canvas = canvas
    } else {
      this.canvas = null
    }

    this.props.setGLCanvas(this.canvas)
  }

  private container: HTMLElement | null = null
  private containerRef = (container: Element | null) => {
    if (container instanceof HTMLElement) {
      this.container = container
    } else {
      this.container = null
    }
  }

  private maybeResize = () => {
    if (!this.container) return
    if (!this.props.canvasContext) return

    let {width, height} = this.container.getBoundingClientRect()

    const widthInAppUnits = width
    const heightInAppUnits = height
    const widthInPixels = width * window.devicePixelRatio
    const heightInPixels = height * window.devicePixelRatio

    this.props.canvasContext.gl.resize(
      widthInPixels,
      heightInPixels,
      widthInAppUnits,
      heightInAppUnits,
    )
  }

  onWindowResize = () => {
    if (this.props.canvasContext) {
      this.props.canvasContext.requestFrame()
    }
  }
  componentWillReceiveProps(nextProps: GLCanvasProps) {
    if (this.props.canvasContext !== nextProps.canvasContext) {
      if (this.props.canvasContext) {
        this.props.canvasContext.removeBeforeFrameHandler(this.maybeResize)
      }
      if (nextProps.canvasContext) {
        nextProps.canvasContext.addBeforeFrameHandler(this.maybeResize)
        nextProps.canvasContext.requestFrame()
      }
    }
  }
  componentDidMount() {
    window.addEventListener('resize', this.onWindowResize)
  }
  componentWillUnmount() {
    if (this.props.canvasContext) {
      this.props.canvasContext.removeBeforeFrameHandler(this.maybeResize)
    }
    window.removeEventListener('resize', this.onWindowResize)
  }
  render() {
    const style = getStyle(this.props.theme)
    return (
      <div ref={this.containerRef} className={css(style.glCanvasView)}>
        <canvas ref={this.ref} width={1} height={1} />
      </div>
    )
  }
}

export interface ApplicationProps extends ProfileLoaderState {
  setGLCanvas: (canvas: HTMLCanvasElement | null) => void
  setProfileIndexToView: (profileIndex: number) => void
  setFlattenRecursion: (flattenRecursion: boolean) => void
  activeProfileState: ActiveProfileState | null
  canvasContext: CanvasContext | null
  theme: Theme
  flattenRecursion: boolean
  viewMode: ViewMode
  dragActive: boolean
  loading: boolean
  glCanvas: HTMLCanvasElement | null
  error: boolean
  customWelcomeMessage: CustomWelcomeMessage
}

export class Application extends StatelessComponent<ApplicationProps> {
  glCanvasRef = createRef<GLCanvas>()

  loader = new ProfileLoader(this.props)

  getStyle(): ReturnType<typeof getStyle> {
    return getStyle(this.props.theme)
  }

  onWindowKeyDown = this.loader.onWindowKeyDown

  onDocumentPaste = this.loader.onDocumentPaste

  maybeLoadHashParamProfile = this.loader.maybeLoadHashParamProfile

  onFileSelect = this.loader.onFileSelect

  loadExample = this.loader.loadExample

  onDrop = this.loader.onDrop

  onDragOver = this.loader.onDragOver

  onDragLeave = this.loader.onDragLeave

  saveFile = this.loader.saveFile

  browseForFile = this.loader.browseForFile

  onWindowKeyPress = async (ev: KeyboardEvent) => {
    if (ev.key === '1') {
      this.props.setViewMode(ViewMode.CHRONO_FLAME_CHART)
    } else if (ev.key === '2') {
      this.props.setViewMode(ViewMode.LEFT_HEAVY_FLAME_GRAPH)
    } else if (ev.key === '3') {
      this.props.setViewMode(ViewMode.SANDWICH_VIEW)
    } else if (ev.key === 'r') {
      const {flattenRecursion} = this.props
      this.props.setFlattenRecursion(!flattenRecursion)
    } else if (ev.key === 'n') {
      if (this.props.activeProfileState) {
        this.props.setProfileIndexToView(this.props.activeProfileState.index + 1)
      }
    } else if (ev.key === 'p') {
      if (this.props.activeProfileState) {
        this.props.setProfileIndexToView(this.props.activeProfileState.index - 1)
      }
    }
  }

  componentDidMount() {
    window.addEventListener('keydown', this.onWindowKeyDown)
    window.addEventListener('keypress', this.onWindowKeyPress)
    document.addEventListener('paste', this.onDocumentPaste)
    this.maybeLoadHashParamProfile()
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this.onWindowKeyDown)
    window.removeEventListener('keypress', this.onWindowKeyPress)
    document.removeEventListener('paste', this.onDocumentPaste)
  }

  redrawCanvas = () => {
    this.glCanvasRef.current?.onWindowResize()
  }

  renderLanding() {
    const style = this.getStyle()

    const browseButton = (
      <div className={css(style.browseButtonContainer)}>
        <input
          type="file"
          name="file"
          id="file"
          onChange={this.onFileSelect}
          className={css(style.hide)}
        />
        <label for="file" className={css(style.browseButton)} tabIndex={0}>
          Browse
        </label>
      </div>
    )

    return (
      <div className={css(style.landingContainer)}>
        {((this.props.customWelcomeMessage.default) ?
            // Use custom welcome message
            this.props.customWelcomeMessage.default(css(style.landingMessage), css(style.landingP), css(style.link), browseButton)
            :
            // Use default welcome message
            <div className={css(style.landingMessage)}>
              <p className={css(style.landingP)}>
                👋 Hi there! Welcome to 🔬speedscope, an interactive{' '}
                <a
                  className={css(style.link)}
                  href="http://www.brendangregg.com/FlameGraphs/cpuflamegraphs.html"
                >
                  flamegraph
                </a>{' '}
                visualizer. Use it to help you make your software faster.
              </p>
              {canUseXHR ? (
                <p className={css(style.landingP)}>
                  Drag and drop a profile file onto this window to get started, click the big blue
                  button below to browse for a profile to explore, or{' '}
                  <a tabIndex={0} className={css(style.link)} onClick={this.loadExample}>
                    click here
                  </a>{' '}
                  to load an example profile.
                </p>
              ) : (
                <p className={css(style.landingP)}>
                  Drag and drop a profile file onto this window to get started, or click the big blue
                  button below to browse for a profile to explore.
                </p>
              )}
              {browseButton}

              <p className={css(style.landingP)}>
                See the{' '}
                <a
                  className={css(style.link)}
                  href="https://github.com/jlfwong/speedscope#usage"
                  target="_blank"
                >
                  documentation
                </a>{' '}
                for information about supported file formats, keyboard shortcuts, and how to navigate
                around the profile.
              </p>

              <p className={css(style.landingP)}>
                speedscope is open source. Please{' '}
                <a
                  className={css(style.link)}
                  target="_blank"
                  href="https://github.com/jlfwong/speedscope/issues"
                >
                  report any issues on GitHub
                </a>
                .
              </p>
            </div>
          )
        }
      </div>
    )
  }

  renderError() {
    const style = this.getStyle()

    return (
      <div className={css(style.error)}>
        <div>😿 Something went wrong.</div>
        <div>Check the JS console for more details.</div>
      </div>
    )
  }

  renderLoadingBar() {
    const style = this.getStyle()
    return <div className={css(style.loading)} />
  }

  renderContent() {
    const {viewMode, activeProfileState, error, loading, glCanvas} = this.props

    if (error) {
      return this.renderError()
    }

    if (loading) {
      return this.renderLoadingBar()
    }

    if (!activeProfileState || !glCanvas) {
      return this.renderLanding()
    }

    switch (viewMode) {
      case ViewMode.CHRONO_FLAME_CHART: {
        return <ChronoFlamechartView activeProfileState={activeProfileState} glCanvas={glCanvas} />
      }
      case ViewMode.LEFT_HEAVY_FLAME_GRAPH: {
        return (
          <LeftHeavyFlamechartView activeProfileState={activeProfileState} glCanvas={glCanvas} />
        )
      }
      case ViewMode.SANDWICH_VIEW: {
        return <SandwichViewContainer activeProfileState={activeProfileState} glCanvas={glCanvas} />
      }
    }
  }

  render() {
    const style = this.getStyle()
    const transparent = useAtom(metadataOnlyProfileAtom)
    return (
      <div
        onDrop={this.onDrop}
        onDragOver={this.onDragOver}
        onDragLeave={this.onDragLeave}
        className={css(style.root, this.props.dragActive && style.dragTargetRoot)}
      >
        <GLCanvas
          ref={this.glCanvasRef}
          setGLCanvas={this.props.setGLCanvas}
          canvasContext={this.props.canvasContext}
          theme={this.props.theme}
        />
        <Toolbar
          saveFile={this.saveFile}
          browseForFile={this.browseForFile}
          {...(this.props as ApplicationProps)}
        />
        <div className={css(style.contentContainer)}>{this.renderContent()}</div>
        {this.props.dragActive && <div className={css(style.dragTarget)} />}
        {transparent && <div className={css(style.noTraceWatermark)}>
          <h1 className={css(style.watermarkH1)}>NO TRACE</h1>
          <p className={css(style.watermarkP)}>This TEF does not come with any trace</p>
        </div>}
      </div>
    )
  }
}

const getStyle = withTheme(theme =>
  StyleSheet.create({
    glCanvasView: {
      // WebGL canvas is assumed to be placed at the top of the view
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: -1,
    },
    error: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
    },
    loading: {
      height: 3,
      marginBottom: -3,
      background: theme.selectionPrimaryColor,
      transformOrigin: '0% 50%',
      animationName: [
        {
          from: {
            transform: `scaleX(0)`,
          },
          to: {
            transform: `scaleX(1)`,
          },
        },
      ],
      animationTimingFunction: 'cubic-bezier(0, 1, 0, 1)',
      animationDuration: '30s',
    },
    root: {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      fontFamily: FontFamily.MONOSPACE,
      lineHeight: '20px',
      color: theme.fgPrimaryColor,
    },
    dragTargetRoot: {
      cursor: 'copy',
    },
    dragTarget: {
      boxSizing: 'border-box',
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      border: `5px dashed ${theme.selectionPrimaryColor}`,
      pointerEvents: 'none',
    },
    contentContainer: {
      position: 'relative',
      display: 'flex',
      overflow: 'hidden',
      flexDirection: 'column',
      flex: 1,
    },
    landingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
    },
    landingMessage: {
      maxWidth: 600,
    },
    landingP: {
      marginBottom: 16,
    },
    hide: {
      display: 'none',
    },
    browseButtonContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    browseButton: {
      marginBottom: 16,
      height: 72,
      flex: 1,
      maxWidth: 256,
      textAlign: 'center',
      fontSize: FontSize.BIG_BUTTON,
      lineHeight: '72px',
      background: theme.selectionPrimaryColor,
      color: theme.altFgPrimaryColor,
      transition: `all ${Duration.HOVER_CHANGE} ease-in`,
      ':hover': {
        background: theme.selectionSecondaryColor,
      },
    },
    link: {
      color: theme.selectionPrimaryColor,
      cursor: 'pointer',
      textDecoration: 'none',
      transition: `all ${Duration.HOVER_CHANGE} ease-in`,
      ':hover': {
        color: theme.selectionSecondaryColor,
      },
    },
    noTraceWatermark: {
      backgroundColor: "transparent",
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.5,
      display: 'flex',
      flexDirection: 'column',
      gap: '1.1rem',
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center',
      'user-select': 'none',
      '-webki-user-select': 'none',
      '-ms-user-select': 'none',
    },
    watermarkH1: {
      fontSize: '7.5em',
      lineHeight: '6rem',
    },
    watermarkP: {
      fontSize: '1.4em',
    },
  }),
)
