const { SlashCommandBuilder, codeBlock } = require('discord.js');

module.exports = ({ isDeveloper }) => ({
  data: new SlashCommandBuilder().setName('memory').setDescription('Display process memory usage.'),
  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: 'This command is restricted to bot developers.', ephemeral: true });
      return;
    }

    const usage = process.memoryUsage();
    const lines = Object.entries(usage).map(([key, value]) => `${key}: ${(value / 1024 / 1024).toFixed(2)} MB`);

    await interaction.reply({ content: codeBlock(lines.join('\n')), ephemeral: true });
  }
});
