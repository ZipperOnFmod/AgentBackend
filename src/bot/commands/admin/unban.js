import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import Users from '../../../model/user.js';
import functions from "../../../utilities/structs/functions.js";

export const data = new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a users account')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('The user who is banned')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .setDMPermission(false);
export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser('user');
    const targetUser = await Users.findOne({ username_lower: user.username.toLowerCase() });

    if (!targetUser) {
        await interaction.editReply({ content: "User doesn't exist." });
        return;
    }

    if (targetUser.banned == false) {
        await interaction.editReply({ content: "User is not banned." });
        return;
    }

    // Update user's banned status
    await targetUser.updateOne({ $set: { banned: false } });

    // Remove tokens if they exist
    let refreshTokenIndex = global.refreshTokens.findIndex(i => i.accountId == targetUser.accountId);
    if (refreshTokenIndex !== -1) {
        global.refreshTokens.splice(refreshTokenIndex, 1);
    }

    let accessTokenIndex = global.accessTokens.findIndex(i => i.accountId == targetUser.accountId);
    if (accessTokenIndex !== -1) {
        global.accessTokens.splice(accessTokenIndex, 1);
        let xmppClient = global.Clients.find(client => client.accountId == targetUser.accountId);
        if (xmppClient) {
            xmppClient.client.close();
        }
        await functions.UpdateTokens(); // Assuming this function updates tokens globally
    }

    // Send a text message notification
    await interaction.editReply({ content: `User ${user.username} has been unbanned.` });

    // Optionally, send a direct message to the user
    try {
        await user.send(`Account has been unbanned.`);
    } catch (error) {
        console.error(`Failed to send DM to user ${user.username}:`, error);
    }
}