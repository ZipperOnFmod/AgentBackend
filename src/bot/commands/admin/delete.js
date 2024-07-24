import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';
import log from '../../../utilities/structs/log.js';
import axios from 'axios';

export const data = new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Deletes a user\'s account')
    .addUserOption(option => option.setName('user')
        .setDescription('The user whose account you want to delete')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ADMINISTRATOR)
    .setDMPermission(false);

export async function execute(interaction) {
    const user = interaction.options.getUser('user');
    const admin = interaction.user;

    const deleteAccount = await Users.deleteOne({ discordId: user.id }).lean();
    // @ts-expect-error
    if (deleteAccount.username == null) {
        await interaction.reply({ content: "User Account Deleted", ephemeral: true });

        // Logging to the webhook
        const webhookURL = process.env.WEBHOOK_FOR_DELETED;
        if (!webhookURL) {
            console.error('WEBHOOK_FOR_DELETED is not defined in the environment variables.');
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("Account Deleted")
            .addFields(
                { name: "User", value: `${user.username}#${user.discriminator}`, inline: true },
                { name: "Deleted by", value: `${admin.username}#${admin.discriminator}`, inline: true },
            )
            .setColor("#7b68ee")
            .setTimestamp();

        try {
            await axios.post(webhookURL, {
                embeds: [embed],
            });
            log.xmpp(`User ${user.username} deleted by admin`);
        } catch (error) {
            console.error('Error logging to the webhook:', error);
        }

        return;
    }
    // @ts-expect-error
    await Profiles.deleteOne({ accountId: deleteAccount.discordId }).lean();
    const embed = new EmbedBuilder()
        .setTitle("Account Deleted")
        .addFields(
            { name: "User", value: `${user.username}#${user.discriminator}`, inline: true },
            { name: "Deleted by", value: `${admin.username}#${admin.discriminator}`, inline: true },
            { name: "Reason", value: reason }
        )
        .setColor("#7b68ee")
        .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
    await interaction.options.getUser('user').send({ content: "Your account has been deleted by an administrator" });
}

//# sourceMappingURL=delete.js.map