import Asteria from '../../../utilities/asteriasdk/index.js';
import { SlashCommandBuilder, PermissionFlagsBits, WebhookClient } from 'discord.js';
import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'dirname-filename-esm';
import destr from 'destr';
import axios from "axios";
import dotenv from 'dotenv';

dotenv.config();

const __dirname = dirname(import.meta);
const asteria = new Asteria({
    collectAnonStats: true,
    throwErrors: true,
});

const skinOptions = {
    frozen: ['CID_293_Athena_Commando_M_RavenWinter', 'CID_294_Athena_Commando_F_RedKnightWinter', 'CID_295_Athena_Commando_M_CupidWinter', 'BID_166_RavenWinterMale', 'BID_167_RedKnightWinterFemale', 'BID_168_CupidWinterMale'],
    icon: ['CID_474_Athena_Commando_M_Lasagna', 'CID_333_Athena_Commando_M_Squishy', 'BID_310_Lasagna', 'Pickaxe_ID_235_Lasagna', 'Pickaxe_ID_154_Squishy', 'Pickaxe_ID_249_Squishy1H', 'Glider_ID_118_Squishy', 'EID_SquishyDance', 'EID_LasagnaDance', 'EID_SquishyMedley', 'EID_LasagnaFlex', 'SPID_084_Festivus', 'MusicPack_027_LasagnaDope', 'MusicPack_026_LasagnaChill', 'LSID_117_Squishy', 'CID_761_Athena_Commando_M_CycloneSpace', 'CID_703_Athena_Commando_M_Cyclone', 'CID_605_Athena_Commando_M_TourBus', 'BID_520_CycloneUniverse', 'BID_468_Cyclone', 'BID_402_TourBus', 'Pickaxe_ID_359_CycloneMale', 'Pickaxe_ID_302_TourBus1H', 'Glider_ID_196_CycloneMale', 'EID_CycloneHeadBang', 'EID_TourBus', 'EID_Cyclone', 'EID_KingEagle', 'EID_KitchenNavigator', 'EID_JellyFrog', 'EID_IndigoApple', 'SPID_195_Cyclone', 'Wrap_210_Thermal', 'LSID_231_CycloneBraid', 'LSID_214_CycloneA', 'LSID_215_CycloneB'],
    Agent: ['CID_175_Athena_Commando_M_Celestial', 'BID_138_Celestial', 'Glider_ID_090_Celestial', 'Pickaxe_ID_116_Celestial', 'Trails_ID_075_Celestial', 'SPID_066_Llamalaxy'],
};

export const data = new SlashCommandBuilder()
    .setName('donator')
    .setDescription('Give user a donation perk.')
    .addUserOption(option => 
        option.setName('user')
            .setDescription('The donator.')
            .setRequired(true)
    )
    .addStringOption(option =>
        option.setName('tier')
            .setDescription('Select the reward tier')
            .setRequired(true)
            .addChoices(
                { name: 'Frozen Tier', value: 'frozen' },
                { name: 'Icon Tier', value: 'icon' },
                { name: 'Agent+ (SOON)', value: 'Agent' }
            )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ADMINISTRATOR)
    .setDMPermission(false);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const selectedUser = interaction.options.getUser('user');
    const selectedUserId = selectedUser.id;
    const user = await Users.findOne({ discordId: selectedUserId });

    if (!user) {
        return interaction.editReply({ content: "The user does not have an account registered." });
    }

    const profile = await Profiles.findOne({ accountId: user.accountId });
    if (!profile) {
        return interaction.editReply({ content: "The user does not have an account registered." });
    }

    const tier = interaction.options.getString('tier');
    const presetItems = skinOptions[tier];

    try {
        const filePath = path.join(__dirname, "../../../profiles/allathena.json");
        const file = fs.readFileSync(filePath);
        const jsonFile = destr(file.toString());
        const items = jsonFile.items;

        let foundItems = [];
        for (const itemName of presetItems) {
            let found = false;
            for (const key of Object.keys(items)) {
                const [type, id] = key.split(":");
                if (id === itemName) {
                    if (profile.profiles.athena.items[key]) {
                        return await interaction.editReply({ content: `Already Claimed` });
                    }
                    found = true;
                    foundItems.push({ key, item: items[key] });
                    break;
                }
            }
            if (!found) {
                return await interaction.editReply({ content: `Could not find the item ${itemName}` });
            }
        }

        let updateData = {};
        for (const foundItem of foundItems) {
            updateData[`profiles.athena.items.${foundItem.key}`] = foundItem.item;
        }

        if (tier === 'frozen') {
            updateData['frozentier'] = true;
        }

        if (tier === 'icon') {
            updateData['icontier'] = true;
        }

        if (tier === 'Agent') {
            updateData['Agentplus'] = true;
        }
        
        const dmMessage = `You have successfully claimed the ${tier === 'frozen' ? 'Frozen Tier' : tier === 'icon' ? 'Icon Tier' : 'Agent+'} rewards.`;
        await selectedUser.send(dmMessage);
        
        await Profiles.findOneAndUpdate({ accountId: user.accountId }, {
            $set: updateData,
        }, { new: true }).catch(async (err) => {
            console.error("Error updating profile: ", err);
            return await interaction.editReply({ content: "An error occurred while adding the items" });
        });

        // Send the response to the interaction
        await interaction.editReply({ content: "Donator Rewards Claimed." });

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
            color: 3447003,
            title: "Donator Reward Claimed",
            fields: [
                { name: "Discord ID", value: selectedUserId, inline: false },
                { name: "Username", value: selectedUser.username, inline: true },
                { name: "Tier", value: tier, inline: true },
            ],
            timestamp: new Date(),
        };

        const webhookClient = new WebhookClient({ url: process.env.WEBHOOK_FOR_REWARDS });
        await webhookClient.send({ embeds: [logEmbed] });

    } catch (err) {
        console.error("Error processing request: ", err);
        return await interaction.editReply({ content: "An error occurred while processing the request" });
    }
}