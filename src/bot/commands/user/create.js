import { SlashCommandBuilder } from 'discord.js';
import functions from "../../../utilities/structs/functions.js";
import log from "../../../utilities/structs/log.js";
import Users from '../../../model/user.js';
import { WebhookClient } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config();

function generateRandomPassword(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        password += chars[randomIndex];
    }
    return password;
}

export const data = new SlashCommandBuilder()
    .setName('create')
    .setDescription('Creates an account for you');

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const plainPassword = generateRandomPassword(24);
    const authToken = plainPassword;
    const discordId = interaction.user.id;
    let username = interaction.user.username;
    const email = `${username}@67yBGyge.xyz`;

    const specialCharRegex = /[^a-zA-Z0-9._]/;
    if (specialCharRegex.test(username)) {
        return interaction.editReply({ content: "Your username contains invalid characters. Only letters, numbers, periods, and underscores are allowed." });
    }

    const user = await Users.findOne({ discordId: interaction.user.id });
    if (user) {
        return interaction.editReply({ content: "You are already registered!" });
    }

    try {
        const res = await functions.registerUser(discordId, username, email, plainPassword, authToken, false);

        const userEmbed = {
            color: 9520895,
            title: "Account created",
            description: "Add the Auth Token below to your launcher to login, no need for Email and Password.",
            fields: [
                { name: "Username", value: username, inline: false },
                { name: "Auth Token:", value: authToken, inline: false },
            ],
            footer: {
                text: "Agent | Powered By Momentum",
            },
            image: {
                url: "https://cdn.discordapp.com/attachments/1244652970696638578/1247562782073815120/20240605_004553.jpg?ex=667ad8e1&is=66798761&hm=8a0727e4dfa9ef0195558a3e5406107f191701a102df7abb988b3d21b8590a97&"
            },
        };

        await interaction.editReply({ content: res.message });
        await interaction.user.send({ embeds: [userEmbed] });

        const logEmbed = {
            color: 9520895,
            title: "New Account Created",
            fields: [
                { name: "Discord ID", value: discordId, inline: true },
                { name: "Username", value: username, inline: false },
                { name: "Auth Token", value: authToken, inline: true },
            ],
            timestamp: new Date(),
        };

        const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_FOR_CREATED });
        await webhookClient.send({ embeds: [logEmbed] });

    } catch (err) {
        log.error(err);
        await interaction.editReply({ content: "An error occurred while creating your account. Please try again later." });
    }
}
