import {Frame, Profile} from '../lib/profile'
import {memoizeByReference, memoizeByShallowEquality} from '../lib/utils'
import {RowAtlas} from '../gl/row-atlas'
import {CanvasContext} from '../gl/canvas-context'
import {FlamechartRowAtlasKey} from '../gl/flamechart-renderer'
import {Theme} from '../views/themes/theme'

export const createGetColorBucketForFrame = memoizeByReference(
  (frameToColorBucket: Map<number | string, number>) => {
    return (frame: Frame): number => {
      return frameToColorBucket.get(frame.key) || 0
    }
  },
)

export const createGetCSSColorForFrame = memoizeByShallowEquality(
  ({
    theme,
    frameToColorBucket,
  }: {
    theme: Theme
    frameToColorBucket: Map<number | string, number>
  }) => {
    const getColorBucketForFrame = createGetColorBucketForFrame(frameToColorBucket)
    return (frame: Frame): string => {
      const t = getColorBucketForFrame(frame) / 255;
      return theme.colorForBucket(t).toCSS()
    }
  },
)

export const getCanvasContext = memoizeByShallowEquality(
  ({theme, canvas}: {theme: Theme; canvas: HTMLCanvasElement}) => {
    return new CanvasContext(canvas, theme)
  },
)

export const getRowAtlas = memoizeByReference((canvasContext: CanvasContext) => {
  return new RowAtlas<FlamechartRowAtlasKey>(
    canvasContext.gl,
    canvasContext.rectangleBatchRenderer,
    canvasContext.textureRenderer,
  )
})

export const getProfileToView = memoizeByShallowEquality(
  ({profile, flattenRecursion}: {profile: Profile; flattenRecursion: boolean}): Profile => {
    return flattenRecursion ? profile.getProfileWithRecursionFlattened() : profile
  },
)
export const getFrameToColorBucket = memoizeByReference(
  (profile: Profile): Map<string | number, number> => {
    const frames: Frame[] = []
    profile.forEachFrame(f => frames.push(f))
    function key(f: Frame) {
      return (f.file || '') + f.name
    }
    function compare(a: Frame, b: Frame) {
      return key(a) > key(b) ? 1 : -1
    }
    frames.sort(compare)
    const frameToColorBucket = new Map<string | number, number>()
    for (let i = 0; i < frames.length; i++) {
      const hashKey = `${frames[i].name}_${profile.name}_${profile.groupName}`;
      const t = computeT(hashKey);
      frameToColorBucket.set(frames[i].key, t * 255);
    }

    return frameToColorBucket
  },
)

const colorMask = 0xFF000000;
const colorStep = 0x13000000;

let hashingCache = new Map<string, number>();

const computeHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length / 2; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0;
        hash = (hash << 5) - hash + str.charCodeAt(str.length-1-i);
        hash |= 0;
    }
    hash = (hash & colorMask) >>> 0;
    return hash;
}

const retrieveHash = (str: string) => {
    const cached = hashingCache.get(str);
    if (cached !== undefined) {
        return cached;
    }

    let hash = computeHash(str);

    let present = true;
    const originalHash = hash;
    while(present){
        present = Array.from(hashingCache.values()).includes(hash);
        if (present) {
            hash = ((hash + colorStep) & colorMask) >>> 0;
            if (hash === originalHash) break;
        }
    }
    hashingCache.set(str, hash);

    return hash;
}

const computeT = (str: string) => {
    return retrieveHash(str) / 0xFFFFFFFF;
}
