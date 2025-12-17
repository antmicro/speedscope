import { profileGroupAtom } from ".";

/**
 * Extracts all loaded group names.
 */
export function getGroupNames(): string[] {
    const profiles = profileGroupAtom.get()?.profiles ?? [];

    const names = profiles
        .map(p => p.profile.getGroupName())
        .filter((name): name is string => Boolean(name));

    return Array.from(new Set(names));
}
