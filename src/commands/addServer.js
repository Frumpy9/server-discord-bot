const { SlashCommandBuilder } = require('discord.js');

function normalizeIdentifier(identifier) {
  return identifier.trim().replace(/\s+/g, '_');
}

function validateIdentifier(identifier) {
  return /^[A-Za-z0-9_-]+$/.test(identifier);
}

function parseKeywords(input) {
  if (!input) {
    return [];
  }

  return input
    .split(',')
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 0);
}

module.exports = ({ db, serverManager, isDeveloper, requestRefresh }) => ({
  data: new SlashCommandBuilder()
    .setName('addserver')
    .setDescription('Add a server to the tracked list.')
    .addStringOption((option) =>
      option.setName('id').setDescription('Unique identifier (letters, numbers, dashes, underscores)').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('ip').setDescription('Server address in the form host:port').setRequired(true)
    )
    .addStringOption((option) => option.setName('nickname').setDescription('Display name').setRequired(true))
    .addBooleanOption((option) =>
      option.setName('show').setDescription('Whether the server should appear in the public embed').setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('keywords')
        .setDescription('Comma separated keywords for quick lookups (optional)')
        .setRequired(false)
    ),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const rawId = interaction.options.getString('id', true);
    const normalizedId = normalizeIdentifier(rawId);

    if (!validateIdentifier(normalizedId)) {
      await interaction.editReply({
        content: 'The server id may only contain letters, numbers, underscores, and dashes.'
      });
      return;
    }

    const ip = interaction.options.getString('ip', true).trim();
    if (!ip.includes(':')) {
      await interaction.editReply({ content: 'Please provide an IP in the form host:port.' });
      return;
    }

    const nickname = interaction.options.getString('nickname', true).trim();
    const show = interaction.options.getBoolean('show');
    const keywordsInput = interaction.options.getString('keywords');
    const keywords = parseKeywords(keywordsInput);

    try {
      if (await db.hasServer(normalizedId)) {
        await interaction.editReply({ content: `A server with the id \`${normalizedId}\` already exists.` });
        return;
      }

      await db.addServer({ id: normalizedId, ip, nick: nickname, show: show !== false, keywords });
      await serverManager.reload();

      let refreshError = null;
      try {
        await requestRefresh();
      } catch (error) {
        refreshError = error;
        console.error('Failed to refresh after adding server:', error);
      }

      if (refreshError) {
        await interaction.editReply({
          content: `Server \`${normalizedId}\` added, but refreshing the status failed: ${refreshError.message}`
        });
      } else {
        await interaction.editReply({
          content: `Server \`${normalizedId}\` (${nickname}) was added and the status has been refreshed.`
        });
      }
    } catch (error) {
      console.error('Unable to add server:', error);
      await interaction.editReply({ content: 'Unable to add the server. Please check the logs for more information.' });
    }
  }
});
