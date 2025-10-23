const {
  ActivityType,
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  REST,
  Routes
} = require('discord.js');
const path = require('path');

const config = require('../config.json');
const db = require('../db.js');
const createNotifier = require('./lib/notifications');
const ServerManager = require('./lib/serverManager');
const buildCommands = require('./commands');

const DEFAULT_INTERVAL = 90_000;
const DEFAULT_AVATAR = 'https://i.imgur.com/cBiDnMi.png';
const FALLBACK_USER_ID = '134088598684303360';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel, Partials.User]
});

const state = {
  avatarUrl: null,
  logChannel: null
};

const serverManager = new ServerManager(db);
const allowedDevs = Array.isArray(config.allowedDevs) && config.allowedDevs.length
  ? config.allowedDevs
  : [FALLBACK_USER_ID, '204729465564037120'];
const isDeveloper = (userId) => allowedDevs.includes(userId);
const getLogChannel = () => state.logChannel;
const notifier = createNotifier({
  client,
  db,
  getLogChannel,
  getAvatarUrl: () => state.avatarUrl
});

const context = {
  client,
  config,
  serverManager,
  db,
  state,
  isDeveloper,
  getLogChannel,
  notifier,
  requestRefresh: () => performRefresh()
};

const commands = buildCommands(context);
client.commands = new Collection();
for (const command of commands) {
  client.commands.set(command.data.name, command);
}

async function registerSlashCommands() {
  if (!config.clientId) {
    throw new Error('Missing clientId in configuration.');
  }

  const rest = new REST({ version: '10' }).setToken(config.token);
  const body = commands.map((command) => command.data.toJSON());

  if (Array.isArray(config.commandGuildIds) && config.commandGuildIds.length) {
    for (const guildId of config.commandGuildIds) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body });
    }
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body });
  }
}

async function resolveLogChannel() {
  if (!config.logging || !config.logging.enabled) {
    state.logChannel = null;
    return;
  }

  try {
    const guild = await client.guilds.fetch(config.logging.guildID);
    state.logChannel = await guild.channels.fetch(config.logging.channelID);
  } catch (error) {
    console.warn('Unable to resolve log channel:', error.message);
    state.logChannel = null;
  }
}

async function resolveAvatar() {
  try {
    const userId = allowedDevs[0] ?? FALLBACK_USER_ID;
    const user = await client.users.fetch(userId);
    state.avatarUrl = user.displayAvatarURL() || DEFAULT_AVATAR;
  } catch (error) {
    state.avatarUrl = DEFAULT_AVATAR;
  }
}

async function publishStatusEmbed() {
  if (!Array.isArray(config.embeds)) {
    return;
  }

  const embed = serverManager.buildStatusEmbed(state.avatarUrl);
  for (const entry of config.embeds) {
    if (!entry.channelID || !entry.messageID) {
      continue;
    }

    try {
      const channel = await client.channels.fetch(entry.channelID);
      const message = await channel.messages.fetch(entry.messageID);
      await message.edit({ content: '\u200e', embeds: [embed] });
    } catch (error) {
      console.warn(`Unable to update embed for channel ${entry.channelID}:`, error.message);
    }
  }
}

async function performRefresh() {
  const { changes } = await serverManager.refresh();
  await publishStatusEmbed();

  for (const change of changes) {
    try {
      await notifier(change.info.map, change.info);
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}

function applyPresence() {
  const presence = config.presence || { type: 'watching', name: 'Follow maps with /follow' };
  const type = String(presence.type || 'watching').toLowerCase();

  const typeMap = {
    playing: ActivityType.Playing,
    streaming: ActivityType.Streaming,
    listening: ActivityType.Listening,
    watching: ActivityType.Watching,
    competing: ActivityType.Competing
  };

  const activityType = typeMap[type] ?? ActivityType.Watching;
  client.user.setActivity(presence.name || 'Follow maps with /follow', { type: activityType });
}

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await resolveAvatar();
  await resolveLogChannel();
  applyPresence();

  try {
    await performRefresh();
  } catch (error) {
    console.error('Initial refresh failed:', error);
  }

  const interval = config.intervalMS ?? DEFAULT_INTERVAL;
  setInterval(() => {
    performRefresh().catch((error) => console.error('Scheduled refresh failed:', error));
  }, interval);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: 'There was an error executing that command.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error executing that command.', ephemeral: true });
    }
  }
});

client.on('guildMemberRemove', async (member) => {
  try {
    await db.unfollowAll(member.id);
  } catch (error) {
    console.error('Failed to clean up follows for departing member:', error);
  }
});

async function bootstrap() {
  try {
    const seedPath = path.resolve(__dirname, '..', 'servers.json');
    await db.ensureServerSeed(seedPath);
    await serverManager.reload();
    await registerSlashCommands();
    await client.login(config.token);
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

bootstrap();
