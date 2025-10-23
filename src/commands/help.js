const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = ({ state }) => ({
  data: new SlashCommandBuilder().setName('help').setDescription('Display available commands.'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('Server Bot Commands')
      .setColor(0x79b210)
      .setDescription(
        [
          '`/players [server]` — Show players on a server or list all servers.',
          '`/map [server-or-map]` — Show the current map for a server or a map preview.',
          '`/follow <map>` — Receive a DM when a map goes live.',
          '`/unfollow <map|all>` — Stop receiving map notifications.',
          '`/listfollows` — View the maps you are following.'
        ].join('\n')
      )
      .setTimestamp(Date.now());

    if (state.avatarUrl) {
      embed.setFooter({ text: 'Last Updated', iconURL: state.avatarUrl });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});
