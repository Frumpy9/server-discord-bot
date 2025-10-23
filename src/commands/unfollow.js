const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStatsPage, getMapImage } = require('../lib/maps');

module.exports = ({ db, getLogChannel }) => ({
  data: new SlashCommandBuilder()
    .setName('unfollow')
    .setDescription('Stop following a map or clear all follows.')
    .addStringOption((option) => option.setName('map').setDescription('Map name or "all"').setRequired(true)),
  async execute(interaction) {
    const map = interaction.options.getString('map').toLowerCase();

    if (map === 'all') {
      await db.unfollowAll(interaction.user.id);
      await interaction.reply({ content: 'You are no longer following any maps.', ephemeral: true });
      await logAction(getLogChannel(), interaction, 'all');
      return;
    }

    if (!(await db.isFollowingMap(interaction.user.id, map))) {
      await interaction.reply({ content: 'You are not following this map. Use `/listfollows` to view tracked maps.', ephemeral: true });
      return;
    }

    await db.unfollowMap(interaction.user.id, map);
    await interaction.reply({ content: `You are no longer following ${map}.`, ephemeral: true });
    await logAction(getLogChannel(), interaction, map);
  }
});

async function logAction(channel, interaction, map) {
  if (!channel) {
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle('User Unfollowed Map')
    .setColor(0x79b210)
    .setTimestamp(Date.now())
    .addFields(
      { name: 'User', value: interaction.user.toString(), inline: true },
      { name: 'Map', value: map, inline: true }
    )
    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
    .setThumbnail(interaction.user.displayAvatarURL());

  if (map !== 'all') {
    const stats = getStatsPage(map);
    if (stats) {
      embed.setURL(stats);
    }

    const image = getMapImage(map);
    if (image) {
      embed.setImage(image);
    }
  }

  await channel.send({ embeds: [embed] });
}
