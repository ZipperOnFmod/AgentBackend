import express from "express";
import path from "path";
import axios from 'axios';
const app = express.Router();
import { dirname } from 'dirname-filename-esm';
const __dirname = dirname(import.meta);
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import Profile from '../model/profiles.js';
import User from '../model/user.js';
import log from "../utilities/structs/log.js";
const VBUCKSKEY = process.env.VBUCKS_SECRET_KEY;
const WEBHOOK_FOR_LOGGING = process.env.WEBHOOK_FOR_XP;

const sendDiscordEmbed = async (username, addValue, reason, newQuantity, newLevel, newBookLevel) => {
    await axios.post(WEBHOOK_FOR_LOGGING, {
        embeds: [{
            title: "XP Log",
            description: `**${username}** received **XP**.`,
            fields: [
                { name: "Username", value: username, inline: false },
                { name: "XP Added", value: addValue.toString(), inline: true },
                { name: "New XP Quantity", value: newQuantity.toString(), inline: true },
                { name: "New Level", value: newLevel.toString(), inline: true }
            ],
            color: 0x7b68ee,
            timestamp: new Date()
        }]
    });
}

app.get("/addxp", async (req, res) => {
    const { authkey, username, addValue, reason } = req.query;
    if (!authkey) return res.status(400).send('No authkey provided.');
    if (!username) return res.status(400).send('No username provided.');
    if (!addValue) return res.status(400).send('No addValue provided.');
    if (!reason) return res.status(400).send('No reason provided.');

    const lowerUsername = username.toLowerCase();
    if (authkey == VBUCKSKEY) {
        try {
            if (parseInt(addValue) > 999999) {
                return res.status(401).send('You have exceeded the amount of XP per request');
            } else {
                const user = await User.findOne({ username_lower: lowerUsername });
                if (user) {
                    const multiplier = user.donator ? 1.5 : 1;
                    const filter = { accountId: user.accountId };
                    const xpToAdd = parseInt(addValue) * multiplier;
                    const update = {
                        $inc: {
                            'profiles.athena.stats.attributes.xp': xpToAdd,
                            'profiles.athena.stats.attributes.book_xp': xpToAdd,
                        },
                    };
                    const options = { new: true };
                    const updatedProfile = await Profile.findOneAndUpdate(filter, update, options);
                    if (updatedProfile) {
                        let newQuantity = updatedProfile.profiles.athena.stats.attributes.xp;
                        
                        const currentLevel = updatedProfile.profiles.athena.stats.attributes.level;
                        let levelThreshold;
                        
                        if (currentLevel >= 350) {
                            levelThreshold = 0;
                        } else if (currentLevel === 1) {
                            levelThreshold = 10000;
                        } else if (currentLevel >= 2 && currentLevel <= 8) {
                            levelThreshold = currentLevel * 10000;
                        } else if (currentLevel >= 9 && currentLevel <= 99) {
                            levelThreshold = 80000;
                        } else if (currentLevel === 100) {
                            levelThreshold = 50000;
                        } else if (currentLevel >= 101) {
                            levelThreshold = 50000 + (currentLevel - 101) * 250 + 250;
                        }

                        const xpDifference = newQuantity - levelThreshold;
                        if (xpDifference >= 0) {
                            newQuantity = xpDifference % levelThreshold;
                            const levelUpdate = {
                                $inc: {
                                    'profiles.athena.stats.attributes.level': 1,
                                    'profiles.athena.stats.attributes.book_level': 1,
                                    'profiles.athena.stats.attributes.accountLevel': 1,
                                    'profiles.athena.stats.attributes.season_num': 1
                                },
                                $set: {
                                    'profiles.athena.stats.attributes.xp': newQuantity,
                                    'profiles.athena.stats.attributes.book_xp': newQuantity
                                },
                            };
                            await Profile.findOneAndUpdate(filter, levelUpdate);
                        }
                        log.backend(`${user.username} has received XP.`);
                        const finalUpdatedProfile = await Profile.findOne(filter);
                        if (finalUpdatedProfile) {
                            const newLevel = finalUpdatedProfile.profiles.athena.stats.attributes.level;
                            const newBookLevel = finalUpdatedProfile.profiles.athena.stats.attributes.book_level;

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
                                console.error('Error while sending gift:', error);
                            }

                            await sendDiscordEmbed(lowerUsername, addValue, reason, newQuantity, newLevel, newBookLevel);
                            return res.status(200).json({ quantity: newQuantity, level: newLevel, book_level: newBookLevel });
                        } else {
                            return res.status(404).send('Profile not found.');
                        }
                    } else {
                        return res.status(404).send('Profile not found or item not found.');
                    }
                } else {
                    return res.status(404).send('User not found.');
                }
            }
        } catch (err) {
            console.error('Error while updating data:', err);
            return res.status(500).send('Error while updating data.');
        }
    } else {
        res.status(404).send("Unauthorized access");
    }
});

export default app;
//# sourceMappingURL=addxp.js.map
