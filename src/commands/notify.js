const { SlashCommandBuilder } = require('discord.js');

module.exports = ({ db, notifier, isDeveloper }) => ({
  data: new SlashCommandBuilder()
    .setName('testnotify')
    .setDescription('Send a test notification for a map to all followers.')
    .addStringOption((option) => option.setName('map').setDescription('Map name').setRequired(true)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: 'This command is restricted to bot developers.', ephemeral: true });
      return;
    }

    const map = interaction.options.getString('map').toLowerCase();
    if (!(await db.hasMap(map))) {
      await interaction.reply({ content: 'No one is following this map.', ephemeral: true });
      return;
    }

    await notifier(map, null);
    await interaction.reply({ content: `Notification dispatched for ${map}.`, ephemeral: true });
  }
});
