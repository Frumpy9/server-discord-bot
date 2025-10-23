const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const databasePath = path.resolve(__dirname, 'db.sqlite');
const db = new sqlite3.Database(databasePath);

db.serialize(() => {
  db.run(
    'CREATE TABLE IF NOT EXISTS players_follow (discord_id TEXT, map_name TEXT, UNIQUE(discord_id, map_name) ON CONFLICT REPLACE)'
  );
  db.run(
    'CREATE TABLE IF NOT EXISTS servers (id TEXT PRIMARY KEY, ip TEXT NOT NULL, nick TEXT NOT NULL, show INTEGER DEFAULT 1, keywords TEXT DEFAULT "[]")'
  );
});

function parseKeywords(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((keyword) => String(keyword)).filter((keyword) => keyword.trim() !== '');
    }
  } catch (error) {
    // fall through to string parsing below
  }

  return String(value)
    .split(',')
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

function serializeKeywords(keywords) {
  if (!Array.isArray(keywords)) {
    return '[]';
  }

  const normalized = keywords
    .map((keyword) => String(keyword).trim())
    .filter((keyword) => keyword.length > 0);

  return JSON.stringify(normalized);
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

async function followMap(discordId, mapName) {
  await run('INSERT INTO players_follow VALUES (?, ?)', [discordId, mapName]);
}

async function unfollowMap(discordId, mapName) {
  await run('DELETE FROM players_follow WHERE discord_id = ? AND map_name = ?', [discordId, mapName]);
}

function getFollowers(mapName) {
  return all('SELECT discord_id FROM players_follow WHERE map_name = ?', [mapName]);
}

function getAllFollows() {
  return all('SELECT * FROM players_follow');
}

function getUserFollows(discordId) {
  return all('SELECT map_name FROM players_follow WHERE discord_id = ?', [discordId]);
}

async function isFollowingMap(discordId, mapName) {
  const row = await get('SELECT 1 FROM players_follow WHERE discord_id = ? AND map_name = ?', [discordId, mapName]);
  return Boolean(row);
}

function getUsersFollowingMap(mapName) {
  return all('SELECT discord_id FROM players_follow WHERE map_name = ?', [mapName]);
}

async function hasMap(mapName) {
  const row = await get('SELECT 1 FROM players_follow WHERE map_name = ?', [mapName]);
  return Boolean(row);
}

async function unfollowAll(discordId) {
  await run('DELETE FROM players_follow WHERE discord_id = ?', [discordId]);
}

async function totalFollows() {
  const row = await get('SELECT COUNT(*) AS total FROM players_follow');
  return row ? row.total : 0;
}

async function addServer({ id, ip, nick, show = true, keywords = [] }) {
  const payload = [id, ip, nick, show ? 1 : 0, serializeKeywords(keywords)];
  await run('INSERT INTO servers (id, ip, nick, show, keywords) VALUES (?, ?, ?, ?, ?)', payload);
}

async function removeServer(id) {
  await run('DELETE FROM servers WHERE id = ?', [id]);
}

async function getServer(id) {
  const row = await get('SELECT * FROM servers WHERE id = ?', [id]);
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    ip: row.ip,
    nick: row.nick,
    show: row.show !== 0,
    keywords: parseKeywords(row.keywords)
  };
}

async function getServers() {
  const rows = await all('SELECT * FROM servers ORDER BY id COLLATE NOCASE');
  return rows.map((row) => ({
    id: row.id,
    ip: row.ip,
    nick: row.nick,
    show: row.show !== 0,
    keywords: parseKeywords(row.keywords)
  }));
}

async function hasServer(id) {
  const row = await get('SELECT 1 FROM servers WHERE id = ?', [id]);
  return Boolean(row);
}

async function ensureServerSeed(seedPath) {
  const countRow = await get('SELECT COUNT(*) AS total FROM servers');
  if (countRow?.total > 0) {
    return false;
  }

  if (!seedPath || !fs.existsSync(seedPath)) {
    return false;
  }

  let contents;
  try {
    contents = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  } catch (error) {
    return false;
  }

  const entries = Object.entries(contents || {});
  for (const [id, server] of entries) {
    if (!server || typeof server !== 'object') {
      continue;
    }

    const payload = {
      id,
      ip: server.ip,
      nick: server.nick || id,
      show: server.show !== false,
      keywords: Array.isArray(server.keywords) ? server.keywords : []
    };

    if (!payload.ip || !payload.nick) {
      continue;
    }

    try {
      await addServer(payload);
    } catch (error) {
      // Ignore duplicates or invalid records during seeding.
    }
  }

  return entries.length > 0;
}

module.exports = {
  followMap,
  unfollowMap,
  getFollowers,
  getAllFollows,
  getUserFollows,
  isFollowingMap,
  getUsersFollowingMap,
  hasMap,
  unfollowAll,
  totalFollows,
  addServer,
  removeServer,
  getServer,
  getServers,
  hasServer,
  ensureServerSeed
};
