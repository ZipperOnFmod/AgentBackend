import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';
import axios from "axios";

export const data = new SlashCommandBuilder()
    .setName('weekly')
    .setDescription('Agent+ Subscribers Can Use This Command For 1K V-Bucks Weekly');

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await Users.findOne({ discordId: interaction.user.id, Agentplus: true });
    if (!user)
        return interaction.editReply({ content: "You are not registered or do not have Agent+!" });

    if (user.Agentplusreward && Date.now() - new Date(user.Agentplusreward).getTime() < 7 * 24 * 60 * 60 * 1000) {
        const timeLeft = 7 * 24 - Math.floor((Date.now() - new Date(user.Agentplusreward).getTime()) / (1000 * 60 * 60));
        const daysLeft = Math.floor(timeLeft / 24);
        const hoursLeft = timeLeft % 24;
        return interaction.editReply({
            content: `You cannot claim V-bucks yet. Cooldown remaining: ${daysLeft} days and ${hoursLeft} hours.`,
        });
    }

    const regularVbucks = 1000;

    const profile = await Profiles.findOneAndUpdate(
        { accountId: user.accountId },
        { $inc: { 'profiles.common_core.items.Currency:MtxPurchased.quantity': regularVbucks } }
    );

    if (!profile)
        return interaction.editReply({ content: "That user does not own an account" });

    const newQuantity = profile.profiles.common_core.items["Currency:MtxPurchased"].quantity + regularVbucks;

    const embed = new EmbedBuilder()
        .setTitle("Agent+ V-Bucks claimed")
        .setDescription(`Successfully claimed ${regularVbucks} V-bucks for the week. Come back in 7 days for your next claim.\nUpdated Amount of V-bucks: ${newQuantity}`)
        .setColor("#9146FF")
        .setFooter({
            text: "Agent",
        })
        .setTimestamp()
        .setImage('https://cdn.discordapp.com/attachments/1244652970696638578/1247563429527420958/20240605_004705.jpg?ex=667ad97c&is=667987fc&hm=aeb98c08f433925c908cc31968b20e43ce1de324894f9b99440a0d968a6e51f8&');

    await interaction.editReply({ embeds: [embed] });
    await Users.updateOne({ discordId: interaction.user.id }, { $set: { Agentplusreward: new Date() } });

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
//# sourceMappingURL=weekly.js.map
