const { EmbedBuilder, escapeMarkdown } = require('discord.js');
const Gamedig = require('gamedig');
const { formatMapLink, getMapImage, getStatsPage } = require('./maps');

class ServerManager {
  constructor(db) {
    this.db = db;
    this.servers = {};
    this.data = {};
    this.previousMaps = new Map();
    this.loaded = false;
  }

  async reload() {
    const records = await this.db.getServers();
    const nextServers = {};
    for (const record of records) {
      nextServers[record.id] = {
        id: record.id,
        ip: record.ip,
        nick: record.nick,
        show: Boolean(record.show),
        keywords: Array.isArray(record.keywords) ? record.keywords : []
      };
    }

    const nextKeys = new Set(Object.keys(nextServers));
    for (const key of Array.from(this.previousMaps.keys())) {
      if (!nextKeys.has(key)) {
        this.previousMaps.delete(key);
      }
    }

    this.servers = nextServers;
    this.loaded = true;
  }

  async ensureServers() {
    if (!this.loaded) {
      await this.reload();
    }
  }

  async refresh() {
    await this.ensureServers();

    const nextData = {};
    const entries = Object.entries(this.servers);
    let index = 1;

    for (const [key, server] of entries) {
      nextData[key] = await this.queryServer(server, index);
      index += 1;
    }

    this.data = nextData;

    const changes = [];
    for (const [key, info] of Object.entries(nextData)) {
      const currentMap = info.online ? info.map : null;
      const previousMap = this.previousMaps.get(key) ?? null;

      if (info.online && previousMap && previousMap !== currentMap) {
        changes.push({ key, info });
      }

      if (currentMap) {
        this.previousMaps.set(key, currentMap);
      } else {
        this.previousMaps.delete(key);
      }
    }

    return { changes };
  }

  async queryServer(server, index) {
    const [host, port = '27015'] = server.ip.split(':');
    try {
      const result = await Gamedig.query({
        type: 'csgo',
        host,
        port,
        maxAttempts: 4
      });

      const numPlayers = result.raw.numplayers - result.raw.numbots;
      return {
        online: true,
        name: server.nick,
        index,
        map: result.map,
        maxPlayers: result.maxplayers,
        players: result.players,
        bots: result.bots,
        numPlayers,
        numBots: result.raw.numbots,
        fullIP: result.connect,
        show: server.show !== false,
        keywords: this.createKeywords(server, index),
        config: { ...server }
      };
    } catch (error) {
      return {
        online: false,
        name: server.nick,
        index,
        show: server.show !== false,
        keywords: this.createKeywords(server, index),
        players: [],
        bots: [],
        config: { ...server }
      };
    }
  }

  createKeywords(server, index) {
    const keywords = new Set();
    if (Array.isArray(server.keywords)) {
      for (const keyword of server.keywords) {
        keywords.add(String(keyword).toLowerCase());
      }
    }

    keywords.add(String(index));
    keywords.add(server.nick.toLowerCase());
    keywords.add(server.id.toLowerCase());

    return Array.from(keywords);
  }

  isReady() {
    if (!this.loaded) {
      return false;
    }

    if (Object.keys(this.servers).length === 0) {
      return true;
    }

    return Object.keys(this.data).length > 0;
  }

  findServer(keyword) {
    if (!keyword) {
      return null;
    }

    const normalized = String(keyword).toLowerCase();
    return Object.values(this.data).find((server) => server.keywords.includes(normalized));
  }

  buildStatusEmbed(avatarUrl) {
    const embed = new EmbedBuilder()
      .setTitle('Server List')
      .setDescription('This list is updated automatically.')
      .setColor(0x79b210)
      .setTimestamp(Date.now());

    if (avatarUrl) {
      embed.setFooter({ text: 'Last Updated', iconURL: avatarUrl });
    } else {
      embed.setFooter({ text: 'Last Updated' });
    }

    let hasFields = false;
    for (const server of Object.values(this.data)) {
      if (!server.show) {
        continue;
      }

      if (!server.online) {
        embed.addFields({
          name: server.name,
          value: '**Server is not available.**',
          inline: true
        });
        hasFields = true;
        continue;
      }

      embed.addFields({
        name: server.name,
        value: `**__Players:__** ${server.numPlayers} (${server.numBots}) / ${server.maxPlayers}\n**__Map:__** ${formatMapLink(server.map)}\n**__IP:__** ${server.fullIP}`,
        inline: true
      });
      hasFields = true;
    }

    if (!hasFields) {
      embed.addFields({ name: 'No servers configured', value: 'Use /addserver to add a server to the list.', inline: false });
    }

    return embed;
  }

  buildServerListEmbed(avatarUrl) {
    const embed = new EmbedBuilder()
      .setTitle('Please specify the server you want to inspect.')
      .setColor(0x79b210)
      .setTimestamp(Date.now());

    if (avatarUrl) {
      embed.setFooter({ text: 'Last Updated', iconURL: avatarUrl });
    } else {
      embed.setFooter({ text: 'Last Updated' });
    }

    const lines = Object.values(this.data).map((server) => {
      if (server.online) {
        return `${server.index}: **__${server.name}__**: ${server.numPlayers} (${server.numBots}) / ${server.maxPlayers} on ${formatMapLink(server.map)}`;
      }

      return `${server.index}: **__${server.name}__**: is currently unavailable.`;
    });

    if (lines.length === 0) {
      embed.setDescription('No servers are currently configured.');
    } else {
      embed.setDescription(lines.join('\n'));
    }
    return embed;
  }

  buildPlayerListEmbed(server, avatarUrl) {
    const embed = new EmbedBuilder().setColor(0x79b210).setTimestamp(Date.now());

    if (avatarUrl) {
      embed.setFooter({ text: 'Last Updated', iconURL: avatarUrl });
    } else {
      embed.setFooter({ text: 'Last Updated' });
    }

    if (!server.online) {
      return embed
        .setTitle(`${server.name} is currently unavailable.`)
        .setImage('https://i.imgur.com/WnS0Biz.png');
    }

    const title = `${server.numPlayers} (${server.numBots}) / ${server.maxPlayers} players connected to ${server.name} on ${server.map}`;
    embed.setTitle(escapeMarkdown(title));

    const playerNames = [];
    for (const player of server.players) {
      if (!player?.name) {
        continue;
      }

      playerNames.push(escapeMarkdown(player.name.replace(/`/g, "'")));
    }

    for (const bot of server.bots) {
      if (!bot?.name) {
        continue;
      }

      playerNames.push(escapeMarkdown(bot.name.replace(/`/g, "'")));
    }

    const description = playerNames.length ? playerNames.join('\n') : 'No players connected.';
    embed.setDescription(description);

    const mapImage = getMapImage(server.map);
    if (mapImage) {
      embed.setImage(mapImage);
    }

    return embed;
  }

  buildMapEmbed(mapName, server, avatarUrl) {
    const embed = new EmbedBuilder().setColor(0x79b210).setTimestamp(Date.now());

    if (avatarUrl) {
      embed.setFooter({ text: 'Last Updated', iconURL: avatarUrl });
    } else {
      embed.setFooter({ text: 'Last Updated' });
    }

    const stats = getStatsPage(mapName);
    if (stats) {
      embed.setURL(stats);
    }

    const image = getMapImage(mapName);
    if (image) {
      embed.setImage(image);
    }

    if (server) {
      const title = `${server.name} is currently on ${mapName}`;
      embed.setTitle(escapeMarkdown(title));
    } else {
      embed.setTitle(escapeMarkdown(`${mapName} stats`));
    }

    return embed;
  }

  async probe(address) {
    const [host, port = '27015'] = address.split(':');
    return this.queryServer(
      {
        ip: `${host}:${port}`,
        nick: 'Custom Server',
        show: true,
        keywords: []
      },
      0
    );
  }
}

module.exports = ServerManager;
