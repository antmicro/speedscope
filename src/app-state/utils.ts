/*
 * Copyright (c) 2025 Analog Devices, Inc.
 * Copyright (c) 2025 Antmicro <www.antmicro.com>
 *
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The module implementing helper functions for app-state.
 */

import { profileGroupAtom, metadataAtom } from ".";
import { Metadata } from "./profile-group"

/**
 * Extracts all loaded group names.
 */
export function getGroupNames(): string[] {
    const profiles = profileGroupAtom.get()?.profiles ?? [];
    const profileNames = profiles.map(p => p.profile.getGroupName());
    const metadataNames = metadataAtom.get()?.map(m => m.groupName ?? '') ?? [];

    const names = profileNames.concat(metadataNames).filter((name): name is string => Boolean(name));

    return Array.from(new Set(names));
}

/**
 * Finds all metadata associated with a given group name.
 */
export function getMetadataForGroup(groupName: string): Metadata[] {
    const metadata = metadataAtom.get();

    if (!metadata) {return [];}

    return metadata.filter(event => event.groupName === groupName);
}

/**
 * Returns all profile wrappers associated with a specific group name.
 */
export function getProfilesForGroup(groupName: string) {
    const profiles = profileGroupAtom.get()?.profiles ?? [];

    return profiles.filter(p => p.profile.getGroupName() === groupName);
}
