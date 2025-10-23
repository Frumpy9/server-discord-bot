const { SlashCommandBuilder } = require('discord.js');

function normalizeIdentifier(identifier) {
  return identifier.trim().replace(/\s+/g, '_');
}

module.exports = ({ db, serverManager, isDeveloper, requestRefresh }) => ({
  data: new SlashCommandBuilder()
    .setName('removeserver')
    .setDescription('Remove a server from the tracked list.')
    .addStringOption((option) =>
      option.setName('id').setDescription('Identifier of the server to remove').setRequired(true)
    ),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const rawId = interaction.options.getString('id', true);
    const normalizedId = normalizeIdentifier(rawId);

    try {
      if (!(await db.hasServer(normalizedId))) {
        await interaction.editReply({ content: `No server with the id \`${normalizedId}\` exists.` });
        return;
      }

      await db.removeServer(normalizedId);
      await serverManager.reload();

      let refreshError = null;
      try {
        await requestRefresh();
      } catch (error) {
        refreshError = error;
        console.error('Failed to refresh after removing server:', error);
      }

      if (refreshError) {
        await interaction.editReply({
          content: `Server \`${normalizedId}\` removed, but refreshing the status failed: ${refreshError.message}`
        });
      } else {
        await interaction.editReply({
          content: `Server \`${normalizedId}\` was removed and the status has been refreshed.`
        });
      }
    } catch (error) {
      console.error('Unable to remove server:', error);
      await interaction.editReply({ content: 'Unable to remove the server. Please check the logs for more information.' });
    }
  }
});
