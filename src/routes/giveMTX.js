import express from "express";
import path from "path";
const app = express.Router();
import { dirname } from 'dirname-filename-esm';
const __dirname = dirname(import.meta);
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import Profile from '../model/profiles.js';
import User from '../model/user.js';
import log from "../utilities/structs/log.js";
import createClient from '../tokenManager/tokenCreation.js';
import { env } from "process";

const WEBHOOK_FOR_LOGGING = process.env.WEBHOOK_FOR_MANUAL_VBUCKS;

app.get('/GiveVbucks', async function(req, res) {
    try {
        let playerName = req.query.playerName;
        let vbucks = parseInt(req.query.vbucks, 10);
        const authkey = req.query.authkey;

        if (!vbucks || isNaN(vbucks) || vbucks <= 0) {
            return res.status(400).json({ error: 'Invalid amount of V-Bucks' });
        }

        if (vbucks > 50000) {
            return res.status(400).json({ error: 'Limit reached. This is a sus amount of vbucks...' });
        }

        if (authkey === process.env.VBUCKS_SECRET_KEY) {
            if (!playerName) {
                return res.status(400).json({ error: 'playerName is required' });
            }

            let user = await User.findOne({ username_lower: playerName.toLowerCase() }).lean();

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            let profile = await Profile.findOne({ accountId: user.accountId });

            if (!profile.profiles.common_core.items['Currency:MtxPurchased']) {
                profile.profiles.common_core.items['Currency:MtxPurchased'] = { quantity: 0 };
            }

            let initialQuantity = profile.profiles.common_core.items['Currency:MtxPurchased'].quantity;
            initialQuantity = parseInt(initialQuantity, 10);

            let newQuantity = initialQuantity + vbucks;
            profile.profiles.common_core.items['Currency:MtxPurchased'].quantity = newQuantity;
            profile.markModified('profiles.common_core.items.Currency:MtxPurchased');

            let result = await profile.save();

            axios.post("http://127.0.0.1:3551/fortnite/api/game/v3/profile/*/client/emptygift", {
                offerId: "e406693aa12adbc8b04ba7e6409c8ab3d598e8c3",
                currency: "MtxCurrency",
                currencySubType: "",
                expectedTotalPrice: "0",
                gameContext: "",
                receiverAccountIds: [user.accountId],
                giftWrapTemplateId: "GiftBox:gb_makegood",
                personalMessage: "Your personal message here",
                accountId: user.accountId,
                playerName: playerName
            })
            .then(function(response) {
            })
            .catch(function(error) {
                console.log(error);
                return res.status(404).json({ error: 'Something went wrong' });
            });

            log.backend(`User ${user.username} has been given ${vbucks} V-Bucks.`);

            await axios.post(WEBHOOK_FOR_LOGGING, {
                embeds: [{
                    title: "Manual V-Bucks Log",
                    description: `**${user.username}** was given V-Bucks.`,
                    fields: [
                        { name: "Username:", value: user.username, inline: false },
                        { name: "MTX Added:", value: vbucks.toString(), inline: true },
                        { name: "IP Address:", value: req.ip, inline: true }
                    ],
                    color: 0x7b68ee,
                    timestamp: new Date()
                }]
            });

            return res.status(200).json({ success: 'Command successfully executed.' });
        } else {
            return res.status(404).json({ error: 'Invalid authkey' });
        }
    } catch (error) {
        console.log("INTERNAL ERROR: Addvbucks", error);
        return res.status(404).json({ error: 'Internal error' });
    }
});

export default app;