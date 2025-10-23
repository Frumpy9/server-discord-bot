const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStatsPage } = require('../lib/maps');

module.exports = ({ db }) => ({
  data: new SlashCommandBuilder().setName('listfollows').setDescription('List all maps you are following.'),
  async execute(interaction) {
    const follows = await db.getUserFollows(interaction.user.id);
    if (!follows.length) {
      await interaction.reply({ content: 'You are not following any maps.', ephemeral: true });
      return;
    }

    const lines = follows.map((entry) => {
      const map = entry.map_name;
      const stats = getStatsPage(map);
      return stats ? `[${map}](${stats})` : map;
    });

    const embed = new EmbedBuilder()
      .setTitle('Maps you are following')
      .setColor(0x79b210)
      .setTimestamp(Date.now())
      .setDescription(lines.join('\n'));

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
});
