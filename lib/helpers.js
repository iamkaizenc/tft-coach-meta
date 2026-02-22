/**
 * Helper definitions for mapping CDragon IDs/paths to public image URLs.
 * 
 * CommunityDragon structures URLs like:
 * https://raw.communitydragon.org/latest/game/assets/...
 */

const CDRAGON_BASE = 'https://raw.communitydragon.org/latest/game/';

export function getCdragonImageUrl(internalPath) {
    if (!internalPath) return null;

    // E.g. "ASSETS/Characters/TFT14_Ahri/HUD/TFT14_Ahri_Square.TFT_Set14.png"
    // Needs to be lowercased and .png ext ensured
    let mappedPath = internalPath.toLowerCase();

    // Bazı pathler .dds ile biter ama cdragon web sunucusu .png olarak servis eder
    if (mappedPath.endsWith('.dds')) {
        mappedPath = mappedPath.replace('.dds', '.png');
    }

    return `${CDRAGON_BASE}${mappedPath}`;
}

/**
 * Parses generic static item/augment/unit icons from cdRagon
 */
export function getItemIconUrl(iconPath) {
    return getCdragonImageUrl(iconPath);
}

export function getAugmentIconUrl(iconPath) {
    return getCdragonImageUrl(iconPath);
}

export function getChampionIconUrl(iconPath) {
    return getCdragonImageUrl(iconPath);
}
