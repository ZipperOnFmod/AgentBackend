import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import Users from '../../../model/user.js';
import functions from "../../../utilities/structs/functions.js";

export const data = new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user\'s account')
    .addUserOption(option => option.setName('user')
        .setDescription('The user whose account you want to ban')
        .setRequired(true))
    .addStringOption(option => option.setName('reason')
        .setDescription('The reason for banning the account')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const reason = interaction.options.getString('reason');
    const targetUser = await Users.findOne({ username_lower: interaction.options.getUser('user')?.username.toLowerCase() });

    if (!targetUser) {
        await interaction.editReply({ content: "User doesn't exist." });
        return;
    }

    if (targetUser.banned) {
        await interaction.editReply({ content: "User is already banned." });
        return;
    }

    await targetUser.updateOne({ $set: { banned: true } });

    let refreshTokenIndex = global.refreshTokens.findIndex(i => i.accountId === targetUser.accountId);
    if (refreshTokenIndex !== -1) {
        global.refreshTokens.splice(refreshTokenIndex, 1);
    }

    let accessTokenIndex = global.accessTokens.findIndex(i => i.accountId === targetUser.accountId);
    if (accessTokenIndex !== -1) {
        global.accessTokens.splice(accessTokenIndex, 1);

        let xmppClient = global.Clients.find(client => client.accountId === targetUser.accountId);
        if (xmppClient) {
            xmppClient.client.close();
        }
    }

    // Update tokens if necessary
    if (accessTokenIndex !== -1 || refreshTokenIndex !== -1) {
        await functions.UpdateTokens();
    }

    const embed = new EmbedBuilder()
        .setTitle("Account banned")
        .setDescription(`User **${interaction.options.getUser('user')?.username}** has been banned from Agent`)
        .addFields({
            name: "Ban Reason:",
            value: reason,
        })
        .setColor("#9146FF")
        .setFooter({
            text: "Agent",
        })
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1244652970696638578/1247563106788573316/20240605_004954.jpg?ex=667ad92f&is=667987af&hm=bc269993c024d940ea4e1bbe43d5e5ab9dc490f9b5fb74f50e36e24e875cf1ba&');

    const channelId = '1255425099310563349';
    const channel = await interaction.client.channels.fetch(channelId);

    await channel.send({ embeds: [embed] });
    await interaction.editReply({ content: "The user has been banned, embed sent globally." });

    await interaction.options.getUser('user')?.send({ content: "Your account has been banned." });
}