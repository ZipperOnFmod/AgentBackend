import Asteria from '../../../utilities/asteriasdk/index.js';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Users from '../../../model/user.js';
import Profiles from '../../../model/profiles.js';
import fs from 'fs';
import path from 'path';
import { dirname } from 'dirname-filename-esm';
import destr from 'destr';

const __dirname = dirname(import.meta);
const asteria = new Asteria({
    collectAnonStats: true,
    throwErrors: true,
});

const boosterRoleId = '1141318916925292554'; // Replace with your actual booster role ID

export const data = new SlashCommandBuilder()
    .setName('boost-rewards')
    .setDescription('Claim the IKONIK Pack.')
    .setDMPermission(false);

export async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Check if user has the booster role
    const member = interaction.member;
    if (!member.roles.cache.has(boosterRoleId)) {
        return interaction.editReply({ content: "Only boosters can claim this item, boost the server and try again." });
    }

    const selectedUser = interaction.user; // Use interaction user automatically
    const selectedUserId = selectedUser.id;
    const user = await Users.findOne({ discordId: selectedUserId });
    if (!user)
        return interaction.editReply({ content: "You do not have an account registered." });
    const profile = await Profiles.findOne({ accountId: user.accountId });
    if (!profile)
        return interaction.editReply({ content: "You do not have an account registered." });

    // Check if user has already claimed boost rewards
    if (user.boostrewards) {
        return interaction.editReply({ content: "You have already claimed the boost rewards." });
    }

    const presetItems = ['CID_313_Athena_Commando_M_KpopFashion', 'EID_KPopDance03']; // Replace with actual item names or IDs

    try {
        const file = fs.readFileSync(path.join(__dirname, "../../../profiles/allathena.json"));
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

        // Update MongoDB to mark boostrewards as claimed
        await Users.findOneAndUpdate({ discordId: selectedUserId }, {
            $set: {
                boostrewards: true
            }
        });

        await Profiles.findOneAndUpdate({ accountId: user.accountId }, {
            $set: updateData,
        }, { new: true }).catch(async (err) => {
            console.log(err);
            return await interaction.editReply({ content: "An error occurred while adding the items" });
        });

        await interaction.editReply({ content: "Boost rewards claimed." });
    } catch (err) {
        console.log(err);
        return await interaction.editReply({ content: "An error occurred while processing the request" });
    }
}
//# sourceMappingURL=boost-rewards.js.map