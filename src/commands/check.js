const { SlashCommandBuilder } = require('discord.js');

module.exports = ({ serverManager, state, isDeveloper }) => ({
  data: new SlashCommandBuilder()
    .setName('check')
    .setDescription('Query a server by IP address.')
    .addStringOption((option) => option.setName('address').setDescription('IP address with optional port').setRequired(true)),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: 'This command is restricted to bot developers.', ephemeral: true });
      return;
    }

    const address = interaction.options.getString('address');
    const result = await serverManager.probe(address);

    if (!result.online) {
      await interaction.reply({ content: 'The server is unavailable.', ephemeral: true });
      return;
    }

    const embed = serverManager.buildPlayerListEmbed(result, state.avatarUrl);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});
