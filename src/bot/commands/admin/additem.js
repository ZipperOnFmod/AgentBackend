import Asteria from '../../../utilities/asteriasdk/index.js';
import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, WebhookClient } from 'discord.js';
import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'dirname-filename-esm';
import destr from 'destr';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(import.meta);
const asteria = new Asteria({
    collectAnonStats: true,
    throwErrors: true,
});

export const data = new SlashCommandBuilder()
    .setName('givecosmetic')
    .setDescription('Allows you to give a user any cosmetic.')
    .addUserOption(option => option.setName('user')
        .setDescription('The user you want to give the cosmetic to')
        .setRequired(true))
    .addStringOption(option => option.setName('cosmeticname')
        .setDescription('The name of the cosmetic you want to give')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ADMINISTRATOR)
    .setDMPermission(false);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const selectedUser = interaction.options.getUser('user');
    const selectedUserId = selectedUser.id;
    const user = await Users.findOne({ discordId: selectedUserId });
    if (!user) {
        return interaction.editReply({ content: "That user does not own an account" });
    }

    const profile = await Profiles.findOne({ accountId: user.accountId });
    if (!profile) {
        return interaction.editReply({ content: "That user does not own an account" });
    }

    const cosmeticname = interaction.options.getString('cosmeticname');
    try {
        await fetch(`https://fortnite-api.com/v2/cosmetics/br/search?name=${cosmeticname}`).then(res => res.json()).then(async (json) => {
            const cosmeticFromAPI = json.data;
            if (!cosmeticFromAPI) {
                return await interaction.editReply({ content: "Could not find the cosmetic" });
            }

            const cosmeticimage = cosmeticFromAPI.images.icon;
            const regex = /^(?:[A-Z][a-z]*\b\s*)+$/;
            if (!regex.test(cosmeticname)) {
                return await interaction.editReply({ content: "Please check for correct casing. E.g 'renegade raider' is wrong, but 'Renegade Raider' is correct." });
            }

            let cosmetic = {};
            const file = fs.readFileSync(path.join(__dirname, "../../../profiles/allathena.json"));
            const jsonFile = destr(file.toString());
            const items = jsonFile.items;
            let foundcosmeticname = "";
            let found = false;

            for (const key of Object.keys(items)) {
                const [type, id] = key.split(":");
                if (id === cosmeticFromAPI.id) {
                    foundcosmeticname = key;
                    if (profile.profiles.athena.items[key]) {
                        return await interaction.editReply({ content: "That user already has that cosmetic" });
                    }
                    found = true;
                    cosmetic = items[key];
                    break;
                }
            }

            if (!found) {
                return await interaction.editReply({ content: `Could not find the cosmetic ${cosmeticname}` });
            }

            await Profiles.findOneAndUpdate({ accountId: user.accountId }, {
                $set: {
                    [`profiles.athena.items.${foundcosmeticname}`]: cosmetic,
                },
            }, { new: true }).catch(async (err) => {
                console.log(err);
                return await interaction.editReply({ content: "An error occurred while adding the cosmetic" });
            });

            const dmMessage = `[${cosmeticname}](${cosmeticimage}) was added to your account.`;
            await selectedUser.send(dmMessage);

            const embed = new EmbedBuilder()
                .setTitle("Cosmetic added")
                .setDescription(cosmeticname + " was added to account.")
                .setThumbnail(cosmeticimage)
                .setColor("#9146FF")
                .setFooter({
                    text: "Agent",
                })
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });

            // Log to the webhook
            const logEmbed = new EmbedBuilder()
                .setColor("#9146FF")
                .setTitle("Cosmetic Granted")
                .setDescription(`[${cosmeticname}](${cosmeticimage}) was granted.`)
                .addFields(
                    { name: "Granted By", value: interaction.user.tag, inline: true },
                    { name: "Granted To", value: selectedUser.tag, inline: true },
                    { name: "User ID", value: selectedUserId, inline: false }
                )
                .setThumbnail(cosmeticimage)
                .setTimestamp();

            const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_FOR_GRANTED });
            await webhookClient.send({ embeds: [logEmbed] });
        });
    } catch (err) {
        console.log(err);
        await interaction.editReply({ content: "An error occurred while adding the cosmetic" });
    }
}