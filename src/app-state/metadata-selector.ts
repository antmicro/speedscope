import { metadataAtom  } from ".";
import { Metadata } from "./profile-group";

/**
 * Finds all metadata assosiated with a given group name.
 */
export function getMetadataForGroup(groupName: string): Metadata[] {
    const metadata = metadataAtom.get();

    if (!metadata) {return [];}

    return metadata.flat().filter(event => event.groupName === groupName);
}
