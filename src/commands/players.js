const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readFile } = require('fs/promises');
const path = require('path');

module.exports = ({ serverManager, state }) => ({
  data: new SlashCommandBuilder()
    .setName('players')
    .setDescription('Show the players on a server or list available servers.')
    .addStringOption((option) =>
      option.setName('server').setDescription('Server keyword or index').setRequired(false)
    ),
  async execute(interaction) {
    if (!serverManager.isReady()) {
      await interaction.reply({ content: 'Server data is still loading. Please try again shortly.', ephemeral: true });
      return;
    }

    const query = interaction.options.getString('server');

    if (!query) {
      const embed = serverManager.buildServerListEmbed(state.avatarUrl);
      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (query.toLowerCase() === 'frumpy') {
      const memePath = path.resolve(__dirname, '..', '..', 'meme.txt');
      const meme = await readFile(memePath, 'utf8');
      const embed = new EmbedBuilder()
        .setTitle('listen here')
        .setURL('https://www.youtube.com/watch?v=lPGipwoJiOM')
        .setColor(0x26bf7a)
        .setDescription(meme)
        .setTimestamp(Date.parse('4207-03-15T09:20:07.000Z'))
        .setImage('https://i.imgur.com/FHTK2WB.gif')
        .setAuthor({
          name: '( ͡° ͜ʖ ͡°)',
          iconURL:
            'https://media.discordapp.net/attachments/717611782813909083/724409223911440424/borger.jpg?width=676&height=676',
          url: 'https://mrdoob.com/#/157/spin_painter'
        });

      if (state.avatarUrl) {
        embed.setFooter({ text: 'ｆｒｕｍｐｙ７', iconURL: state.avatarUrl });
      } else {
        embed.setFooter({ text: 'ｆｒｕｍｐｙ７' });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const server = serverManager.findServer(query);
    if (!server) {
      await interaction.reply({ content: 'Please enter a valid server.', ephemeral: true });
      return;
    }

    const embed = serverManager.buildPlayerListEmbed(server, state.avatarUrl);
    await interaction.reply({ embeds: [embed] });
  }
});
