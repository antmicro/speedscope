import {ApplicationProps} from './application'
import {h, JSX, Fragment} from 'preact'
import {useCallback, useState, useEffect} from 'preact/hooks'
import {StyleSheet, css} from 'aphrodite'
import {Sizes, FontFamily, FontSize, Duration} from './style'
import {ProfileSelect} from './profile-select'
import {Profile} from '../lib/profile'
import {objectsHaveShallowEquality} from '../lib/utils'
import {colorSchemeToString, useTheme, withTheme} from './themes/theme'
import {ViewMode} from '../lib/view-mode'
import {toolbarConfigAtom, viewModeAtom} from '../app-state'
import {ProfileGroupState} from '../app-state/profile-group'
import {colorSchemeAtom} from '../app-state/color-scheme'
import {useAtom} from '../lib/atom'
import ChevronDownIcon from './icons/chevron-down'

interface ToolbarProps extends ApplicationProps {
  browseForFile(): void
  saveFile(): void
}

function useSetViewMode(setViewMode: (viewMode: ViewMode) => void, viewMode: ViewMode) {
  return useCallback(() => setViewMode(viewMode), [setViewMode, viewMode])
}

function ToolbarRightContent(props: ToolbarProps) {
  const style = getStyle(useTheme())
  const setChronoFlameChart = useSetViewMode(viewModeAtom.set, ViewMode.CHRONO_FLAME_CHART)
  const setLeftHeavyFlameGraph = useSetViewMode(viewModeAtom.set, ViewMode.LEFT_HEAVY_FLAME_GRAPH)
  const setSandwichView = useSetViewMode(viewModeAtom.set, ViewMode.SANDWICH_VIEW)

  if (!props.activeProfileState) return null

  return (
    <div className={css(style.toolbarLeft)}>
      <div
        className={css(
          style.toolbarTab,
          props.viewMode === ViewMode.CHRONO_FLAME_CHART && style.toolbarTabActive,
        )}
        onClick={setChronoFlameChart}
      >
        Time Order
      </div>
      <div
        className={css(
          style.toolbarTab,
          props.viewMode === ViewMode.LEFT_HEAVY_FLAME_GRAPH && style.toolbarTabActive,
        )}
        onClick={setLeftHeavyFlameGraph}
      >
        Left Heavy
      </div>
      <div
        className={css(
          style.toolbarTab,
          props.viewMode === ViewMode.SANDWICH_VIEW && style.toolbarTabActive,
        )}
        onClick={setSandwichView}
      >
        Sandwich
      </div>
    </div>
  )
}

const getCachedProfileList = (() => {
  // TODO(jlfwong): It would be nice to just implement this as useMemo, but if
  // we do that using profileGroup or profileGroup.profiles as the cache key,
  // then it will invalidate whenever *anything* changes, because
  // profileGroup.profiles is ProfileState[], which contains component state
  // information for each tab for each profile. So whenever any property in any
  // persisted view state changes for *any* view in *any* profile, the profiles
  // list will get re-generated.
  let cachedProfileList: Profile[] | null = null

  return (profileGroup: ProfileGroupState): Profile[] | null => {
    let nextProfileList = profileGroup?.profiles.map(p => p.profile) || null

    if (
      cachedProfileList === null ||
      (nextProfileList != null && !objectsHaveShallowEquality(cachedProfileList, nextProfileList))
    ) {
      cachedProfileList = nextProfileList
    }

    return cachedProfileList
  }
})()

function ToolbarLeftContent(props: ToolbarProps): JSX.Element {
  const style = getStyle(useTheme())

  const {activeProfileState, profileGroup} = props
  const profiles = getCachedProfileList(profileGroup)
  const [profileSelectShown, setProfileSelectShown] = useState(false)

  const openProfileSelect = useCallback(() => {
    setProfileSelectShown(true)
  }, [setProfileSelectShown])

  const closeProfileSelect = useCallback(() => {
    setProfileSelectShown(false)
  }, [setProfileSelectShown])

  useEffect(() => {
    const onWindowKeyPress = (ev: KeyboardEvent) => {
      if (ev.key === 't') {
        ev.preventDefault()
        setProfileSelectShown(true)
      }
    }
    window.addEventListener('keypress', onWindowKeyPress)
    return () => {
      window.removeEventListener('keypress', onWindowKeyPress)
    }
  }, [setProfileSelectShown])

  useEffect(() => {
    const onWindowKeyPress = (ev: KeyboardEvent) => {
      if (ev.key === 't') {
        ev.preventDefault()
        setProfileSelectShown(true)
      }
    }
    window.addEventListener('keypress', onWindowKeyPress)
    return () => {
      window.removeEventListener('keypress', onWindowKeyPress)
    }
  }, [setProfileSelectShown])

  if (activeProfileState && profileGroup && profiles) {
    if (profileGroup.profiles.length === 1) {
      return <Fragment>{activeProfileState.profile.getName()}</Fragment>
    } else {
      return (
        <div className={css(style.toolbarCenter)} onMouseLeave={closeProfileSelect}>
          <span className={css(style.toolbarProfileName)} onMouseOver={openProfileSelect}>
            {activeProfileState.profile.getName()}{' '}
            <span className={css(style.toolbarProfileIndex)}>
              ({activeProfileState.index + 1}/{profileGroup.profiles.length})
            </span>
            <ChevronDownIcon up={profileSelectShown} />
          </span>
          <div style={{display: profileSelectShown ? 'block' : 'none'}}>
            <ProfileSelect
              setProfileIndexToView={props.setProfileIndexToView}
              indexToView={profileGroup.indexToView}
              profiles={profiles}
              closeProfileSelect={closeProfileSelect}
              visible={profileSelectShown}
            />
          </div>
        </div>
      )
    }
  }
  return <Fragment>{useAtom(toolbarConfigAtom).title ?? '🔬speedscope'}</Fragment>
}

export function Toolbar(props: ToolbarProps) {
  const style = getStyle(useTheme())
  return (
    <div className={css(style.toolbar)}>
      <ToolbarLeftContent {...props} />
      <ToolbarRightContent {...props} />
    </div>
  )
}

const getStyle = withTheme(theme =>
  StyleSheet.create({
    toolbar: {
      height: Sizes.TOOLBAR_HEIGHT - 1,
      border: '1px solid var(--gray-750, #2D2D2D)',
      flexShrink: 0,
      background: theme.altBgPrimaryColor,
      color: theme.altFgPrimaryColor,
      textAlign: 'center',
      fontFamily: FontFamily.MONOSPACE,
      fontSize: FontSize.TITLE,
      lineHeight: `${Sizes.TOOLBAR_TAB_HEIGHT}px`,
      userSelect: 'none',
      padding: '2px 4px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    toolbarLeft: {
      height: 'fit-content',
      overflow: 'hidden',
      marginRight: 2,
      textAlign: 'center',
      border: '1px solid var(--gray-850, #242424)',
      borderRadius: '4px',
    },
    toolbarCenter: {
      padding: '2px 4px',
      height: '22px',
      textAlign: 'left',
    },
    toolbarProfileName: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: '7px',
    },
    toolbarRight: {
      height: Sizes.TOOLBAR_HEIGHT,
      overflow: 'hidden',
      position: 'absolute',
      top: 0,
      right: 0,
      marginRight: 2,
      textAlign: 'right',
    },
    toolbarProfileIndex: {
      color: theme.altFgSecondaryColor,
    },
    toolbarTab: {
      background: theme.altBgSecondaryColor,
      height: Sizes.TOOLBAR_TAB_HEIGHT,
      lineHeight: `${Sizes.TOOLBAR_TAB_HEIGHT}px`,
      display: 'inline-block',
      padding: '0px 8px',
      transition: `all ${Duration.HOVER_CHANGE} ease-in`,
      ':hover': {
        background: theme.selectionSecondaryColor,
      },
      ':not(:first-child)': {
        borderLeft: '1px solid var(--gray-850, #242424)',
      }
    },
    toolbarTabActive: {
      background: theme.selectionPrimaryColor,
      ':hover': {
        background: theme.selectionPrimaryColor,
      },
    },
    toolbarTabColorSchemeToggle: {
      display: 'inline-block',
      textAlign: 'center',
      minWidth: '50px',
    },
    emoji: {
      display: 'inline-block',
      verticalAlign: 'middle',
      paddingTop: '0px',
      marginRight: '0.3em',
    },
    noLinkStyle: {
      textDecoration: 'none',
      color: 'inherit',
    },
  }),
)
