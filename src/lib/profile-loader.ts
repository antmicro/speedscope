/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 * Copyright (c) 2025-2026 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {CallTreeProfileBuilder, type Profile, type ProfileGroup, type SymbolRemapper} from './profile'

import {importJavaScriptSourceMapSymbolRemapper} from '../lib/js-source-map'
import {importEmscriptenSymbolMap as importEmscriptenSymbolRemapper} from '../lib/emscripten'
import {canUseXHR, loadingCallbacksAtom, metadataOnlyProfileAtom, toolbarConfigAtom} from '../app-state'
import type {HashParams} from './hash-params'
import type {Metadata, ProfileGroupState} from '../app-state/profile-group'
import type {ViewMode} from './view-mode'
import type {Trace} from '../import/trace-event.ts'
import {saveToFile} from './file-format'
import {rawTefEventsAtom} from '../app-state'

const importModule = import('../import')
import exampleProfileURL from '../../sample/profiles/stackcollapse/perf-vertx-stacks-01-collapsed-all.txt'

async function importProfilesFromText(
  fileName: string,
  contents: string,
): Promise<ProfileGroup | null> {
  return (await importModule).importProfileGroupFromText(fileName, contents)
}

export async function importProfilesFromBase64(
  fileName: string,
  contents: string,
): Promise<ProfileGroup | null> {
  return (await importModule).importProfileGroupFromBase64(fileName, contents)
}

async function importProfilesFromArrayBuffer(
  fileName: string,
  contents: ArrayBuffer,
): Promise<ProfileGroup | null> {
  return (await importModule).importProfilesFromArrayBuffer(fileName, contents)
}

export async function importProfilesFromRaw(
  fileName: string,
  rawData: Trace,
): Promise<ProfileGroup | null> {
  return (await importModule).importProfileGroupFromRaw(fileName, rawData)
}

async function importProfilesFromFile(file: File): Promise<ProfileGroup | null> {
  return (await importModule).importProfilesFromFile(file)
}

async function importFromFileSystemDirectoryEntry(entry: FileSystemDirectoryEntry) {
  return (await importModule).importFromFileSystemDirectoryEntry(entry)
}

function isFileSystemDirectoryEntry(entry: FileSystemEntry): entry is FileSystemDirectoryEntry {
  return entry != null && entry.isDirectory
}

export interface ProfileLoaderState {
  setLoading: (loading: boolean) => void
  setError: (error: boolean) => void
  setProfileGroup: (profileGroup: ProfileGroup) => void
  setDragActive: (dragActive: boolean) => void
  setViewMode: (viewMode: ViewMode) => void
  profileGroup: ProfileGroupState
  hashParams: HashParams
}

export class ProfileLoader {
  /** Information whether the hash params were already processed and loaded */
  static hashParamLoaded: boolean = false

  constructor(
    public state: ProfileLoaderState,
  ) {}

  /**
   * Wraps loader with state callbacks.
   */
  private async _setProfileGroup(loader: () => Promise<ProfileGroup | null>) {
    this.state.setError(false)
    this.state.setLoading(true)
    const profileGroup = await loader()
    if (profileGroup) {
      if (profileGroup.profiles.length === 0) {
        // Profile with only metadata loaded - creates artificial empty profile
        const timestamps =
          profileGroup
            .metadata
            ?.map(v => v.ts)
            .filter(Boolean) ?? []
        const maxTs = Math.max(...(timestamps.length ? timestamps : [1]))
        metadataOnlyProfileAtom.set(true)
        const p = new CallTreeProfileBuilder(maxTs)
        const frameInfo = {key: 'no_trace', name: ''}
        p.enterFrame(frameInfo, 0)
        p.leaveFrame(frameInfo, maxTs)
        const profile = p.build()
        profile.setGroupName(profileGroup.name)
        profileGroup.profiles.push(profile)
      } else {
        metadataOnlyProfileAtom.set(false)
      }

      if (this.state.hashParams.viewMode) {
        this.state.setViewMode(this.state.hashParams.viewMode)
      }

      if (toolbarConfigAtom.get()?.changeDocumentTile ?? true) {
        document.title = `${profileGroup.name} - speedscope`
      }

      this.state.setProfileGroup(profileGroup)
      this.state.setLoading(false)
    } else {
      const emptyGroup = { name: '', indexToView: 0, profiles: [], metadata: []}
      this.state.setProfileGroup(emptyGroup)
      this.state.setLoading(false)
      this.state.setError(true)
    }
  }

  private async _loadProfile(loader: () => Promise<ProfileGroup | null>) {
    await new Promise(resolve => setTimeout(resolve, 0))

    console.time('import')

    let profileGroup: ProfileGroup | null = null
    try {
      profileGroup = await loader()
    } catch (e) {
      console.error('Failed to load format', e)
      alert('Failed to load format!')
      return null
    }

    // TODO(jlfwong): Make these into nicer overlays
    if (profileGroup == null) {
      alert('Unrecognized format! See documentation about supported formats.')
      return null
    } else if (profileGroup.profiles.length === 0 && (profileGroup.metadata?.length ?? 0) === 0) {
      alert("Successfully imported profile, but it's empty!")
      return null
    }

    for (let profile of profileGroup.profiles) {
      await profile.demangle()
    }

    // Set group name
    const groupName = profileGroup.name || "Unknown profile"
    profileGroup.metadata?.forEach((metadata) => metadata.groupName = groupName)
    profileGroup.profiles.forEach((profile) => profile.setGroupName(groupName))

    if (this.state.hashParams.title) {
      profileGroup = {
        ...profileGroup,
        name: this.state.hashParams.title,
      }
    }

    const indexToView = profileGroup.profiles.findIndex((profile) => profile.getName().startsWith("main ("))
    if (indexToView !== -1) {
      profileGroup = {
        ...profileGroup,
        indexToView,
      }
    }

    console.timeEnd('import')
    return profileGroup
  }

  private async _loadFromFile(file: File) {
    return this._loadProfile(async () => {
      const profiles = await importProfilesFromFile(file)
      if (profiles) {
        for (let profile of profiles.profiles) {
          if (!profile.getName()) {
            profile.setName(file.name)
          }
        }
        return profiles
      }

      if (this.state.profileGroup) {
        // If a profile is already loaded, it's possible the file being imported is
        // a symbol map. If that's the case, we want to parse it, and apply the symbol
        // mapping to the already loaded profile. This can be use to take an opaque
        // profile and make it readable.
        const reader = new FileReader()
        const fileContentsPromise = new Promise<string>(resolve => {
          reader.addEventListener('loadend', () => {
            if (typeof reader.result !== 'string') {
              throw new Error('Expected reader.result to be a string')
            }
            resolve(reader.result)
          })
        })
        reader.readAsText(file)
        const fileContents = await fileContentsPromise

        let symbolRemapper: SymbolRemapper | null = null

        const emscriptenSymbolRemapper = importEmscriptenSymbolRemapper(fileContents)
        if (emscriptenSymbolRemapper) {
          console.log('Importing as emscripten symbol map')
          symbolRemapper = emscriptenSymbolRemapper
        }

        const jsSourceMapRemapper = await importJavaScriptSourceMapSymbolRemapper(
          fileContents,
          file.name,
        )
        if (!symbolRemapper && jsSourceMapRemapper) {
          console.log('Importing as JavaScript source map')
          symbolRemapper = jsSourceMapRemapper
        }

        if (symbolRemapper != null) {
          return {
            name: this.state.profileGroup.name || 'profile',
            indexToView: this.state.profileGroup.indexToView,
            profiles: this.state.profileGroup.profiles.map(profileState => {
              // We do a shallow clone here to invalidate certain caches keyed
              // on a reference to the profile group under the assumption that
              // profiles are immutable. Symbol remapping is (at time of
              // writing) the only exception to that immutability.
              const p = profileState.profile.shallowClone()
              p.remapSymbols(symbolRemapper!)
              return p
            }),
          }
        }
      }

      return null
    })
  }

  private _isTefFormat(parsedJson: any): boolean {
    return (
      Array.isArray(parsedJson) &&
      parsedJson.length > 0 &&
      typeof parsedJson[0] === 'object' &&
      parsedJson[0] !== null &&
      ('ph' in parsedJson[0] || 'name' in parsedJson[0])
    )
  }

  private async mergeProfileGroups(maybeProfileGroups: (ProfileGroup | null)[]) {
    if (maybeProfileGroups.some((profile) => !profile)) return null
    const profileGroups = maybeProfileGroups as ProfileGroup[]
    return {
      name: profileGroups.map((group) => group.name).join("_"),
      // Find first non-zero indexToView
      indexToView: profileGroups.map((group) => group.indexToView).find((i) => i != 0) ?? 0,
      profiles: profileGroups.reduce((acc: Profile[], group) => [...acc, ...group.profiles], []),
      metadata: profileGroups.reduce((acc: Metadata[], group) => [...acc, ...group.metadata ?? []], []),
    }
  }

  private async _loadFromFiles(fileList: FileList) {
    const files = Array.from(fileList)
    if (!files.length) {
      console.warn("No files provided")
      return
    }

    let mergedRawEvents: Record<string, any>[] = [];
    for (const file of files) {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (this._isTefFormat(parsed)) {
          mergedRawEvents = mergedRawEvents.concat(parsed);
        }
      } catch (e) {
        console.warn(`Skipping TEF merge for ${file.name}: not valid JSON.`);
      }
    }
    rawTefEventsAtom.set(mergedRawEvents);

    return this._setProfileGroup(async () => {
      const profileGroups = await Promise.all(files.map((file) => this._loadFromFile(file)))
      return this.mergeProfileGroups(profileGroups)
    })
  }

  async loadProfile(loader: () => Promise<ProfileGroup | null>) {
    return this._setProfileGroup(() => this._loadProfile(loader))
  }

  async loadFromFile(file: File) {
    let rawEvents: Record<string, any>[] = [];

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (this._isTefFormat(parsed)) {
        rawEvents = parsed;
      }
    } catch (e) {
      console.warn(`Problem loading ${file.name}: not valid JSON.`);
    }

    rawTefEventsAtom.set(rawEvents);
    return this._setProfileGroup(() => this._loadFromFile(file))
  }

  loadExample = () => {
    this.loadProfile(async () => {
      const filename = 'perf-vertx-stacks-01-collapsed-all.txt'
      const data = await fetch(exampleProfileURL).then(resp => resp.text())
      return await importProfilesFromText(filename, data)
    })
  }

  private checkDragImportEnabled() {
    return toolbarConfigAtom.get().dragImport ?? true
  }

  onDrop = (ev: DragEvent) => {
    if (!this.checkDragImportEnabled()) {
      return
    }
    this.state.setDragActive(false)
    ev.preventDefault()

    this.loadDropFile(ev)
  }

  async loadDropFile(ev: DragEvent) {
    if (!ev.dataTransfer) return
    const items = ev.dataTransfer.items
    const files = ev.dataTransfer.files
    const firstItem = items[0]

    if (items.length > 0 && 'webkitGetAsEntry' in firstItem) {
      const webkitEntry: FileSystemEntry | null = firstItem.webkitGetAsEntry()

      // Instrument.app file format is actually a directory.
      console.log(firstItem, webkitEntry)
      if (
        webkitEntry &&
        isFileSystemDirectoryEntry(webkitEntry) &&
        webkitEntry.name.endsWith('.trace')
      ) {
        console.log('Importing as Instruments.app .trace file')
        const webkitDirectoryEntry: FileSystemDirectoryEntry = webkitEntry
        this.loadProfile(async () => {
          return await importFromFileSystemDirectoryEntry(webkitDirectoryEntry)
        })
        return
      }
    } else if (!firstItem) {
      console.warn("Drag&drop has not provided any items")
    }

    return this._loadFromFiles(files)
  }

  onDragOver = (ev: DragEvent) => {
    if (!this.checkDragImportEnabled()) {
      return
    }
    this.state.setDragActive(true)
    ev.preventDefault()
  }

  onDragLeave = (ev: DragEvent) => {
    if (!this.checkDragImportEnabled()) {
      return
    }
    this.state.setDragActive(false)
    ev.preventDefault()
  }

  saveSpeedscopeFile = () => {
    if (this.state.profileGroup) {
      const {name, indexToView, profiles} = this.state.profileGroup
      const profileGroup: ProfileGroup = {
        name,
        indexToView,
        profiles: profiles.map(p => p.profile),
      }
      saveToFile(profileGroup)
    }
  }

  saveTEFFile = () => {
    const rawEvents = rawTefEventsAtom.get();

    const jsonString = JSON.stringify(rawEvents, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "exported.tef";
    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  browseForFile = (onstart?: () => void, onabort?: () => void) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    const callbacks = loadingCallbacksAtom.get()
    if (callbacks.onabort || onabort) {
      input.addEventListener('cancel', (_e) => {
        if (onabort) { onabort() }
        if (callbacks.onabort) { callbacks.onabort() }
      })
    }
    input.addEventListener('change', (e) => {
      this.onFileSelect(e)
      if (onstart) {onstart()}
      if (callbacks.onstart) {callbacks.onstart()}
    })
    input.click()
  }

  onWindowKeyDown = async (ev: KeyboardEvent) => {
    // This has to be handled on key down in order to prevent the default
    // page save action.
    if (ev.key === 's' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault()
      this.saveSpeedscopeFile()
    } else if (ev.key === 'o' && (ev.ctrlKey || ev.metaKey)) {
      ev.preventDefault()
      this.browseForFile()
    }
  }

  onDocumentPaste = (ev: Event) => {
    if (document.activeElement != null && document.activeElement.nodeName === 'INPUT') return

    ev.preventDefault()
    ev.stopPropagation()

    const clipboardData = (ev as ClipboardEvent).clipboardData
    if (!clipboardData) return
    const pasted = clipboardData.getData('text')

    let rawEvents: Record<string, any>[] = [];
    try {
      const parsed = JSON.parse(pasted);
      if (this._isTefFormat(parsed)) {
        rawEvents = parsed;
      }
    } catch (e) {
      console.warn(`Problem loading ${file.name}: not valid JSON.`);
    }
    rawTefEventsAtom.set(rawEvents);

    this.loadProfile(async () => {
      return await importProfilesFromText('From Clipboard', pasted)
    })
  }

  maybeLoadHashParamProfile = async () => {
    if (ProfileLoader.hashParamLoaded) {
      return
    }
    const {profileURLs} = this.state.hashParams
    if (profileURLs && profileURLs.length > 0) {
      if (!canUseXHR) {
        alert(
          `Cannot load a profile URL when loading from "${window.location.protocol}" URL protocol`,
        )
        return
      }
      await this._setProfileGroup(async () => {
        let mergedRawEvents: Record<string, any>[] = [];
        const profileGroups = await Promise.all(profileURLs.map(async (profileURL) => {
          return this._loadProfile(async () => {
              const response: Response = await fetch(profileURL)

              try {
                const text = await response.clone().text();
                const parsed = JSON.parse(text);
                if (this._isTefFormat(parsed)) {
                  mergedRawEvents = mergedRawEvents.concat(parsed);
                }
              } catch (e) {
                console.warn(`Problem checking TEF for URL ${profileURL}`);
              }
              let filename = new URL(profileURL, window.location.href).pathname
              if (filename.includes('/')) {
                filename = filename.slice(filename.lastIndexOf('/') + 1)
              }
              return importProfilesFromArrayBuffer(filename, await response.arrayBuffer())
          })
        }))

        rawTefEventsAtom.set(mergedRawEvents);
        return this.mergeProfileGroups(profileGroups)
      })
    } else if (this.state.hashParams.localProfilePath) {
      // There isn't good cross-browser support for XHR of local files, even from
      // other local files. To work around this restriction, we load the local profile
      // as a JavaScript file which will invoke a global function.
      ;(window as any)['speedscope'] = {
        loadFileFromBase64: (filename: string, base64source: string) => {
          this.loadProfile(() => importProfilesFromBase64(filename, base64source))
        },
      }

      const script = document.createElement('script')
      script.src = `file:///${this.state.hashParams.localProfilePath}`
      document.head.appendChild(script)
    }
    ProfileLoader.hashParamLoaded = true
  }

  onFileSelect = (ev: Event) => {
    const files = (ev.target as HTMLInputElement).files
    if (!files || files.length === 0) return
    return this._loadFromFiles(files)
  }
}
