import {h} from 'preact'
import {getCanvasContext} from '../app-state/getters'
import {memo, useMemo} from 'preact/compat'
import {useActiveProfileState} from '../app-state/active-profile-state'
import {useTheme} from './themes/theme'
import {
  dragActiveAtom,
  errorAtom,
  flattenRecursionAtom,
  glCanvasAtom,
  hashParamsAtom,
  loadingAtom,
  viewModeAtom,
  customWelcomeMessagesAtom,
  profileGroupAtom,
} from '../app-state'
import {useAtom} from '../lib/atom'
import {ProfileSearchContextProvider} from './search-view'
import {Application, ApplicationProps} from './application'

export const ApplicationContainer = memo((props: Partial<ApplicationProps>) => {
  const canvas = useAtom(glCanvasAtom)
  const theme = useTheme()
  const canvasContext = useMemo(
    () => (canvas ? getCanvasContext({theme, canvas}) : null),
    [theme, canvas],
  )

  const activeProfileState = useActiveProfileState()
  const profileGroup = useAtom(profileGroupAtom)
  return (
    <ProfileSearchContextProvider activeProfileState={props.activeProfileState ?? activeProfileState ?? null}>
      <Application
        activeProfileState={activeProfileState}
        canvasContext={canvasContext}
        setGLCanvas={glCanvasAtom.set}
        setLoading={loadingAtom.set}
        setError={errorAtom.set}
        setDragActive={dragActiveAtom.set}
        setViewMode={viewModeAtom.set}
        setFlattenRecursion={flattenRecursionAtom.set}
        setProfileGroup={profileGroupAtom.setProfileGroup}
        setProfileIndexToView={profileGroupAtom.setProfileIndexToView}
        setSelectedNode={profileGroupAtom.setSelectedNode}
        setSelectedFrame={profileGroupAtom.setSelectedFrame}
        setConfigSpaceViewportRect={profileGroupAtom.setConfigSpaceViewportRect}
        setFlamechartHoveredNode={profileGroupAtom.setFlamechartHoveredNode}
        setLogicalSpaceViewportSize={profileGroupAtom.setLogicalSpaceViewportSize}
        profileGroup={profileGroup}
        theme={theme}
        flattenRecursion={useAtom(flattenRecursionAtom)}
        viewMode={useAtom(viewModeAtom)}
        hashParams={useAtom(hashParamsAtom)}
        glCanvas={canvas}
        dragActive={useAtom(dragActiveAtom)}
        loading={useAtom(loadingAtom)}
        error={useAtom(errorAtom)}
        customWelcomeMessage={useAtom(customWelcomeMessagesAtom)}
        {...props}
      />
    </ProfileSearchContextProvider>
  )
})
