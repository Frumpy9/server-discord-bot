const { EmbedBuilder } = require('discord.js');
const { getMapImage, getStatsPage } = require('./maps');

function createNotifier({ client, db, getLogChannel, getAvatarUrl }) {
  return async function notifyUsers(mapName, serverInfo) {
    const users = await db.getUsersFollowingMap(mapName);
    if (!users.length) {
      return;
    }

    const serverName = serverInfo?.name ?? serverInfo?.config?.nick ?? 'unknown server';
    const serverIp = serverInfo?.fullIP ?? serverInfo?.config?.ip ?? 'unknown IP';
    const playerSummary = serverInfo
      ? `${serverInfo.numPlayers ?? 'unknown'} (${serverInfo.numBots ?? 'unknown'}) / ${serverInfo.maxPlayers ?? 'unknown'}`
      : 'unknown';

    const stats = getStatsPage(mapName);
    const image = getMapImage(mapName);
    const avatarUrl = getAvatarUrl();

    for (const entry of users) {
      try {
        const user = await client.users.fetch(entry.discord_id);
        const embed = new EmbedBuilder()
          .setTitle(`${mapName} is now on ${serverName}`)
          .setDescription(`**__Players:__** ${playerSummary}`)
          .setColor(0x79b210)
          .setTimestamp(Date.now());

        if (avatarUrl) {
          embed.setFooter({ text: 'Last Updated', iconURL: avatarUrl });
        } else {
          embed.setFooter({ text: 'Last Updated' });
        }

        if (stats) {
          embed.setURL(stats);
        }

        if (image) {
          embed.setImage(image);
        }

        await user.send({
          content: `${mapName} is now on ${serverName}!\nsteam://connect/${serverIp}`,
          embeds: [embed]
        });

        const logChannel = getLogChannel();
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle('Notification sent')
            .setColor(0x79b210)
            .setTimestamp(Date.now())
            .setDescription(`${user} was notified for ${mapName} on ${serverName}.`)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL());

          await logChannel.send({ embeds: [logEmbed] });
        }
      } catch (error) {
        const logChannel = getLogChannel();
        if (logChannel) {
          const failureEmbed = new EmbedBuilder()
            .setTitle('Notification failed')
            .setColor(0xc0392b)
            .setTimestamp(Date.now())
            .setDescription(`Unable to DM <@${entry.discord_id}> about ${mapName} on ${serverName}.`);

          if (stats) {
            failureEmbed.setURL(stats);
          }

          if (image) {
            failureEmbed.setImage(image);
          }

          await logChannel.send({
            content: `<@${entry.discord_id}>\n${mapName} is now on ${serverName}!\nsteam://connect/${serverIp}`,
            embeds: [failureEmbed]
          });
        }
      }
    }
  };
}

module.exports = createNotifier;
