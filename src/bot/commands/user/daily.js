import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';
import axios from "axios";

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your Daily V-bucks');

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await Users.findOne({ discordId: interaction.user.id });
    if (!user)
        return interaction.editReply({ content: "You are not registered!" });

    if (user.lastDaily && Date.now() - new Date(user.lastDaily).getTime() < 24 * 60 * 60 * 1000) {
        const timeLeft = 24 - Math.floor((Date.now() - new Date(user.lastDaily).getTime()) / (1000 * 60 * 60));
        return interaction.editReply({
            content: `You cannot claim V-bucks yet. Cooldown remaining: ${timeLeft} hours.`,
        });
    }

    const guild = interaction.guild;
    const member = await guild.members.fetch(interaction.user.id);

    const regularVbucks = 250;
    const boosterVbucks = 500;

    const boosterRoleId = '1141318916925292554';
    const isBooster = member.roles.cache.has(boosterRoleId);

    const vbucks = isBooster ? boosterVbucks : regularVbucks;

    const profile = await Profiles.findOneAndUpdate(
        { accountId: user.accountId },
        { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': vbucks } }
    );

    if (!profile)
        return interaction.editReply({ content: "That user does not own an account" });

    const newQuantity = profile.profiles.common_core.items["Currency:MtxPurchased"].quantity + vbucks;

    const embed = new EmbedBuilder()
        .setTitle("V-bucks claimed")
        .setDescription(`Successfully claimed ${vbucks} V-bucks for the day. Come back in 24 hours for your next claim.\nUpdated Amount of V-bucks: ${newQuantity}`)
        .setColor("#9146FF")
        .setFooter({
            text: "Agent",
        })
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1244652970696638578/1247563429527420958/20240605_004705.jpg?ex=667ad97c&is=667987fc&hm=aeb98c08f433925c908cc31968b20e43ce1de324894f9b99440a0d968a6e51f8&');

    await interaction.editReply({ embeds: [embed] });
    await Users.updateOne({ discordId: interaction.user.id }, { $set: { lastDaily: new Date() } });

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
}
//# sourceMappingURL=daily.js.map