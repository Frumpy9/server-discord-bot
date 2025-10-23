const { SlashCommandBuilder } = require('discord.js');
const { mapImageExists } = require('../lib/maps');

module.exports = ({ serverManager, state }) => ({
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Display the current map for a server or preview a map image.')
    .addStringOption((option) =>
      option.setName('target').setDescription('Server keyword/index or map name').setRequired(false)
    ),
  async execute(interaction) {
    if (!serverManager.isReady()) {
      await interaction.reply({ content: 'Server data is still loading. Please try again shortly.', ephemeral: true });
      return;
    }

    const input = interaction.options.getString('target');
    if (!input) {
      const embed = serverManager.buildServerListEmbed(state.avatarUrl);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const server = serverManager.findServer(input);
    if (server) {
      if (!server.online) {
        const offlineEmbed = serverManager.buildPlayerListEmbed(server, state.avatarUrl);
        await interaction.reply({ embeds: [offlineEmbed] });
        return;
      }

      const embed = serverManager.buildMapEmbed(server.map, server, state.avatarUrl);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    const mapName = input.toLowerCase();
    const exists = await mapImageExists(mapName);
    if (!exists) {
      await interaction.reply({ content: 'Please choose a valid server or map.', ephemeral: true });
      return;
    }

    const embed = serverManager.buildMapEmbed(mapName, null, state.avatarUrl);
    await interaction.reply({ embeds: [embed] });
  }
});
