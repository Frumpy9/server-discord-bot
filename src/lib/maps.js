const { fetch } = require('undici');

const KZ_PREFIXES = ['bkz_', 'kz_', 'kzpro_', 'skz_', 'vnl_', 'xc_'];

function getStatsPage(mapName) {
  if (!mapName) {
    return null;
  }

  if (mapName.startsWith('surf_')) {
    return `https://snksrv.com/surfstats/?view=map&name=${mapName}`;
  }

  if (KZ_PREFIXES.some((prefix) => mapName.startsWith(prefix))) {
    return `https://snksrv.com/kzstats/#/maps/${mapName}/`;
  }

  if (mapName.startsWith('bhop')) {
    return `https://snksrv.com/bhopstats/index.php?map=${mapName}`;
  }

  return null;
}

function getMapImage(mapName) {
  if (!mapName) {
    return null;
  }

  if (mapName.startsWith('surf_') || mapName.startsWith('bhop_')) {
    return `https://bans.snksrv.com/images/maps/${mapName}.jpg`;
  }

  if (KZ_PREFIXES.some((prefix) => mapName.startsWith(prefix))) {
    return `https://raw.githubusercontent.com/KZGlobalTeam/map-images/public/images/${mapName}.jpg`;
  }

  return null;
}

function formatMapLink(mapName) {
  const stats = getStatsPage(mapName);
  if (!stats) {
    return mapName;
  }

  return `[${mapName}](${stats})`;
}

async function mapImageExists(mapName) {
  const imageUrl = getMapImage(mapName);
  if (!imageUrl) {
    return false;
  }

  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

module.exports = {
  formatMapLink,
  getMapImage,
  getStatsPage,
  mapImageExists,
  KZ_PREFIXES
};
