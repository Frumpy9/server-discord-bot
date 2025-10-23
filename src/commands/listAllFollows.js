const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getStatsPage } = require('../lib/maps');

module.exports = ({ db, isDeveloper }) => ({
  data: new SlashCommandBuilder().setName('listallfollows').setDescription('List every map follow in the database.'),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: 'This command is restricted to bot developers.', ephemeral: true });
      return;
    }

    const follows = await db.getAllFollows();
    if (!follows.length) {
      await interaction.reply({ content: 'No users are currently following any maps.', ephemeral: true });
      return;
    }

    follows.sort((a, b) => a.discord_id.localeCompare(b.discord_id));

    const lines = follows.map((follow) => {
      const stats = getStatsPage(follow.map_name);
      const mapText = stats ? `[${follow.map_name}](${stats})` : follow.map_name;
      return `<@${follow.discord_id}>: ${mapText}`;
    });

    const chunks = [];
    let current = '';
    for (const line of lines) {
      if ((current + line + '\n').length > 4000) {
        chunks.push(current);
        current = '';
      }
      current += `${line}\n`;
    }
    if (current) {
      chunks.push(current);
    }

    await interaction.reply({ content: 'Sending follow list...', ephemeral: true });
    for (const chunk of chunks) {
      const embed = new EmbedBuilder()
        .setTitle('Tracked map follows')
        .setColor(0x79b210)
        .setTimestamp(Date.now())
        .setDescription(chunk.trim());

      await interaction.followUp({ embeds: [embed], ephemeral: true });
    }
  }
});
