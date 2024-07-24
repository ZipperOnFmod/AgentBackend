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

const WEBHOOK_FOR_LOGGING = process.env.WEBHOOK_FOR_VBUCKS;

app.get('/WinVbucks', async function(req, res) {
    try {
        let playerName = req.query.playerName;
        let vbucks = "250";
        const authkey = req.query.authkey;

        if (vbucks > 1000) {
            return res.status(400).json({ error: 'limit reached.' });
        }

        if (authkey == process.env.VBUCKS_SECRET_KEY) {
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

            if (isNaN(vbucks)) {
                console.log("Not a number?");
                return res.status(404).json({ error: 'Vbucks is not a number' });
            }

            vbucks = parseInt(vbucks, 10);
            initialQuantity = parseInt(initialQuantity, 10);

            let newQuantity = initialQuantity + vbucks;

            profile.profiles.common_core.items['Currency:MtxPurchased'].quantity = newQuantity;

            profile.markModified('profiles.common_core.items.Currency:MtxPurchased');

            let result = await profile.save();
            
            const filter = { accountId: user.accountId };
            const update = { $inc: {'profiles.athena.stats.attributes.lifetime_wins': 1 }
            }; // Apply multiplier
            const options = {
              new: true
            };

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

            log.backend(`${user.username} has recieved Win Vbucks.`);

            await axios.post(WEBHOOK_FOR_VBUCKS, {
                embeds: [{
                    title: "Vbucks Log",
                    description: `**${user.username}** recieved vbucks for **Win**.`,
                    fields: [
                        { name: "Username:", value: user.username, inline: false },
                        { name: "MTX Added:", value: vbucks.toString(), inline: true },
                        { name: "Wallet:", value: newQuantity.toString(), inline: true }
                    ],
                    color: 0x7b68ee,
                    timestamp: new Date()
                }]
            });

            return res.status(200).json({ success: 'Command successfully executed.' });
        } else {
            return res.status(404).json({ error: 'invalid authkey' });
        }
    } catch (error) {
        console.log("INTERNAL ERROR: Addvbucks", error);
        return res.status(404).json({ error: 'internal error' });
    }
});

export default app;