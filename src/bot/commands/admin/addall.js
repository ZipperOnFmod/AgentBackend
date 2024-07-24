import path from "path";
import fs from "fs";
import { dirname } from 'dirname-filename-esm';
import { SlashCommandBuilder, PermissionFlagsBits, WebhookClient } from 'discord.js';
import axios from "axios";
import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';
import destr from "destr";
import dotenv from 'dotenv';

dotenv.config();

export const data = new SlashCommandBuilder()
    .setName('full-locker')
    .setDescription('Give a player all items in fortnite!')
    .addUserOption(option => option.setName('user')
        .setDescription('The user who donated.')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ADMINISTRATOR)
    .setDMPermission(false);

export async function execute(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });
        const __dirname = dirname(import.meta);
        const selectedUser = interaction.options.getUser('user');
        const selectedUserId = selectedUser?.id;
        const user = await Users.findOne({ discordId: selectedUserId });
        if (!user) {
            await interaction.editReply("That user does not own an account");
            return;
        }
        const profile = await Profiles.findOne({ accountId: user.accountId });
        if (!profile) {
            await interaction.editReply("That user does not have a profile");
            return;
        }
        const allItems = destr(fs.readFileSync(path.join(__dirname, "../../../profiles/allathena.json"), 'utf8'));
        if (!allItems) {
            await interaction.editReply("Failed to parse allathena.json");
            return;
        }
        await Users.findOneAndUpdate({ discordId: interaction.options.getUser('user')?.id }, { $set: { full_locker: !user.full_locker } });
        const existingProfile = await Profiles.findOne({ accountId: user.accountId });
        if (existingProfile) {
            // Update the existing profile
            await Profiles.findOneAndUpdate({ accountId: user.accountId }, { $set: { "profiles.athena.items": allItems.items } }, { new: true });
        } else {
            // Create a new profile if it doesn't exist
            const newProfile = new Profiles({
                accountId: user.accountId,
                profiles: {
                    athena: {
                        items: allItems.items,
                    },
                },
            });
            await newProfile.save();
        }
        await interaction.editReply("Player Now Has Full Locker");

        // Send a direct message to the user
        const dmMessage = `Full Locker received`;
        await selectedUser.send(dmMessage);

        // Make the axios post request
        try {
            await axios.post("http://127.0.0.1:3551/fortnite/api/game/v3/profile/*/client/emptygift", {
                offerId: "e406693aa12adbc8b04ba7e6409c8ab3d598e8c3",
                currency: "MtxCurrency",
                currencySubType: "",
                expectedTotalPrice: "0",
                gameContext: "",
                receiverAccountIds: [user.accountId],
                giftWrapTemplateId: "GiftBox:gb_makegood",
                personalMessage: "Your personal message here",
                accountId: user.accountId,
                playerName: user.username
            });
        } catch (error) {
            console.error('Failed to send gift:', error);
        }

        // Log the action to the webhook
        const logEmbed = {
            color: 9520895,
            title: "Full Locker Granted",
            fields: [
                { name: "Granted By", value: interaction.user.tag, inline: true },
                { name: "Granted To", value: selectedUser.tag, inline: true },
                { name: "User ID", value: selectedUserId, inline: false },
            ],
            timestamp: new Date(),
        };

        const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_FOR_ALLC });
        await webhookClient.send({ embeds: [logEmbed] });

    } catch (error) {
        console.error("Error:", error);
        await interaction.editReply("An error occurred while processing the command.");
    }
}