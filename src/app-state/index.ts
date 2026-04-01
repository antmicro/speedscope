import {Atom} from '../lib/atom'
import {ViewMode} from '../lib/view-mode'
import {getHashParams, HashParams} from '../lib/hash-params'
import {ProfileGroupAtom, Metadata} from './profile-group'
import { VNode } from 'preact'
import { HoveredPoint } from '../lib/utils'

// True if recursion should be flattened when viewing flamegraphs
export const flattenRecursionAtom = new Atom<boolean>(false, 'flattenRecursion')

// The query used in top-level views
//
// An empty string indicates that the search is open by no filter is applied.
// searchIsActive is stored separately, because we may choose to persist the
// query even when the search input is closed.
export const searchIsActiveAtom = new Atom<boolean>(false, 'searchIsActive')
export const searchQueryAtom = new Atom<string>('', 'searchQueryAtom')

// Which top-level view should be displayed
export const viewModeAtom = new Atom<ViewMode>(ViewMode.CHRONO_FLAME_CHART, 'viewMode')

// The top-level profile group from which most other data will be derived
export const profileGroupAtom = new ProfileGroupAtom(null, 'profileGroup')

// Parameters defined by the URL encoded k=v pairs after the # in the URL
const hashParams = getHashParams()
export const hashParamsAtom = new Atom<HashParams>(hashParams, 'hashParams')

// The <canvas> element used for WebGL
export const glCanvasAtom = new Atom<HTMLCanvasElement | null>(null, 'glCanvas')

// True when a file drag is currently active. Used to indicate that the
// application is a valid drop target.
export const dragActiveAtom = new Atom<boolean>(false, 'dragActive')

// True when the application is currently in a loading state. Used to
// display a loading progress bar.

// Speedscope is usable both from a local HTML file being served
// from a file:// URL, and via websites. In the case of file:// URLs,
// however, XHR will be unavailable to fetching files in adjacent directories.
const protocol = window.location.protocol
export const canUseXHR = protocol === 'http:' || protocol === 'https:'
export const isImmediatelyLoading = (canUseXHR && hashParams.profileURLs != null) || (!canUseXHR && hashParams.localProfilePath != null)
export const loadingAtom = new Atom<boolean>(isImmediatelyLoading, 'loading')

export const loadingCallbacksAtom = new Atom<{onstart?: () => void, onabort?: () => void}>({}, 'loadingCallbacks')

// True when the application is an error state, e.g. because the profile
// imported was invalid.
export const errorAtom = new Atom<boolean>(false, 'error')

// Stores the metadata of loaded profile
export const metadataAtom = new Atom<Metadata[] | null>(null, 'metadata');

// Stores the loaded TEF files
export const rawTefEventsAtom = new Atom<Record<string, any>[]>([]);

// Type for the function that returns Element with a welcome message
type WelcomeMessageFunc = (divClass: string, pClass: string, aClass: string, browseButton: VNode<HTMLButtonElement>) => VNode<HTMLDivElement>
export type CustomWelcomeMessage = {
  // Default message when no profile is loaded
  default?: WelcomeMessageFunc
}

export const customWelcomeMessagesAtom = new Atom<CustomWelcomeMessage>({}, 'welcomeMessage')

// The optional toolbar config - undefined fields fall back to the default behavior
interface ToolbarConfig {
  // The title of toolbar, displayed when no profile is loaded
  title?: string,
  // Whether importing with drag&drop should be enabled
  dragImport?: boolean,
  // Whether documents title should be altered when trace is loaded
  changeDocumentTile?: boolean
}

// The state indicating whether loaded profile contains only metadata
export const metadataOnlyProfileAtom = new Atom<boolean>(false, 'metadataOnlyProfile');

// The toolbar configuration allowing to change title or disable buttons
export const toolbarConfigAtom = new Atom<ToolbarConfig>({}, 'toolbarConfig')

// The coordinates of hovered point
export const timestampHoveredAtom = new Atom<HoveredPoint | null>(null, 'timestampHovered');

// Id of focused flamegraph
export const focusedPanelAtom = new Atom<string | null>(null, 'focusedPanel')

export enum SortField {
  SYMBOL_NAME,
  SELF,
  TOTAL,
}

export enum SortDirection {
  ASCENDING,
  DESCENDING,
}

export interface SortMethod {
  field: SortField
  direction: SortDirection
}

// The table sorting method using for the sandwich view, specifying the column
// to sort by, and the direction to sort that column.
export const tableSortMethodAtom = new Atom<SortMethod>(
  {
    field: SortField.SELF,
    direction: SortDirection.DESCENDING,
  },
  'tableSortMethod',
)
