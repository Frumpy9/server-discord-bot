const { SlashCommandBuilder } = require('discord.js');

module.exports = ({ db, isDeveloper }) => ({
  data: new SlashCommandBuilder()
    .setName('removeuser')
    .setDescription('Remove all follows for a user.')
    .addUserOption((option) => option.setName('user').setDescription('User to clear follows for').setRequired(true)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: 'This command is restricted to bot developers.', ephemeral: true });
      return;
    }

    const target = interaction.options.getUser('user', true);
    await db.unfollowAll(target.id);
    await interaction.reply({ content: `Removed all map follows for ${target}.`, ephemeral: true });
  }
});
