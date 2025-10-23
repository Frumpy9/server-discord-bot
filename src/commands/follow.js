const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStatsPage, getMapImage } = require('../lib/maps');

module.exports = ({ db, getLogChannel }) => ({
  data: new SlashCommandBuilder()
    .setName('follow')
    .setDescription('Follow a map and receive a DM when it goes live.')
    .addStringOption((option) => option.setName('map').setDescription('Map name').setRequired(true)),
  async execute(interaction) {
    const map = interaction.options.getString('map').toLowerCase();

    if (await db.isFollowingMap(interaction.user.id, map)) {
      await interaction.reply({ content: `You are already following ${map}.`, ephemeral: true });
      return;
    }

    await db.followMap(interaction.user.id, map);
    await interaction.reply({ content: `You will now be notified when ${map} goes live.`, ephemeral: true });

    const logChannel = getLogChannel();
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle('User Followed Map')
        .setColor(0x79b210)
        .setTimestamp(Date.now())
        .addFields(
          { name: 'User', value: interaction.user.toString(), inline: true },
          { name: 'Map', value: map, inline: true }
        )
        .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setThumbnail(interaction.user.displayAvatarURL());

      const stats = getStatsPage(map);
      if (stats) {
        embed.setURL(stats);
      }

      const image = getMapImage(map);
      if (image) {
        embed.setImage(image);
      }

      await logChannel.send({ embeds: [embed] });
    }
  }
});
