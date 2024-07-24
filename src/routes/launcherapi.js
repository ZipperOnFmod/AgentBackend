import express from "express";
import path from "path";
const app = express.Router();
import { dirname } from 'dirname-filename-esm';
const __dirname = dirname(import.meta);
import axios from 'axios';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import User from '../model/user.js';
import Profile from '../model/profiles.js';
app.post("/launcher/api", async (req, res) => {
    const { authkey, email, password } = req.query;
    if (!email)
        return res.status(400).send('No email provided.');
    if (!authkey)
        return res.status(400).send('No authkey provided.');
    if (!password)
        return res.status(400).send('No password provided.');
    const authkeyStr = authkey;
    const emailStr = email;
    const passwordStr = password;
    if (authkeyStr === process.env.LOGIN_AUTHKEY) {
        try {
            // Retrieve user data from the database
            const user = await User.findOne({ email: emailStr });
            const skin = user ? await Profile.findOne({ accountId: user.accountId }) : null;
            if (user && skin && await bcrypt.compare(passwordStr, user.password)) {
                const username = user.username;
                const favouriteCharacter = skin?.profiles?.athena?.stats?.attributes?.favorite_character;
                if (favouriteCharacter) {
                    const prefixToRemove = 'AthenaCharacter:';
                    const cleanedCharacter = favouriteCharacter.replace(prefixToRemove, ''); // Remove "AthenaCharacter:"
                    return res.status(200).send(`Login successful for user: ${username}, ${cleanedCharacter}`);
                }
                else {
                    return res.status(200).send(`Login successful for user: ${username}, CID_001_ATHENA_COMMANDO_F_DEFAULT`);
                }
            }
            else {
                // Invalid login credentials
                return res.status(401).send('Invalid login credentials');
            }
        }
        catch (err) {
            console.error('Error while validating login:', err);
            return res.status(500).send('Error while validating login.');
        }
    }
    else {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        ip = (ip ?? "").toString().replace('::ffff:', '');
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();
        const embeds = [
            {
                title: "Unauthorized API Request",
                color: 15548997,
                description: "Unauthorized Launcher API request from: " + ip + "\nAt: " + date + " " + time + "\nWith key: " + authkey + "\nFor user: " + email + "\nWith value: " + password + ".",
            },
        ];
        const data = JSON.stringify({ embeds });
        const config_axios = {
            method: "POST",
            url: process.env.WEBHOOK_URL,
            headers: { "Content-Type": "application/json" },
            data: data,
        };
        axios(config_axios)
            .catch((error) => {
            console.error('Error sending Discord webhook:', error.message);
        });
        return res.status(401).send('Unauthorized');
    }
});
app.get("/launcher/api", async (req, res) => {
    const { authkey, email, password } = req.query;
    if (!email)
        return res.status(400).send('No email provided.');
    if (!authkey)
        return res.status(400).send('No authkey provided.');
    if (!password)
        return res.status(400).send('No password provided.');
    const authkeyStr = authkey;
    const emailStr = email;
    const passwordStr = password;
    if (authkeyStr === process.env.LOGIN_AUTHKEY) {
        try {
            // Retrieve user data from the database
            const user = await User.findOne({ email: emailStr });
            const skin = user ? await Profile.findOne({ accountId: user.accountId }) : null;
            const hashedPassword = await bcrypt.hash(passwordStr, 10);
            if (user && skin && await bcrypt.compare(hashedPassword, user.password)) {
                // Successful login
                const username = user.username;
                const favouriteCharacter = skin?.profiles?.athena?.stats?.attributes?.favorite_character;
                if (favouriteCharacter) {
                    const prefixToRemove = 'AthenaCharacter:';
                    const cleanedCharacter = favouriteCharacter.replace(prefixToRemove, ''); // Remove "AthenaCharacter:"
                    return res.status(200).send(`Login successful for user: ${username}, ${cleanedCharacter}`);
                }
                else {
                    return res.status(200).send(`Login successful for user: ${username}, CID_001_ATHENA_COMMANDO_F_DEFAULT`);
                }
            }
            else {
                // Invalid login credentials
                return res.status(401).send('Invalid login credentials');
            }
        }
        catch (err) {
            console.error('Error while validating login:', err);
            return res.status(500).send('Error while validating login.');
        }
    }
    else {
        let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        ip = (ip ?? "").toString().replace('::ffff:', '');
        const date = new Date().toLocaleDateString();
        const time = new Date().toLocaleTimeString();
        const embeds = [
            {
                title: "Unauthorized API Request",
                color: 15548997,
                description: "Unauthorized Launcher API request from: " + ip + "\nAt: " + date + " " + time + "\nWith key: " + authkey + "\nFor user: " + email + "\nWith value: " + password + ".",
            },
        ];
        const data = JSON.stringify({ embeds });
        const config_axios = {
            method: "POST",
            url: process.env.WEBHOOK_URL,
            headers: { "Content-Type": "application/json" },
            data: data,
        };
        axios(config_axios)
            .catch((error) => {
            console.error('Error sending Discord webhook:', error.message);
        });
        return res.status(401).send('Unauthorized');
    }
});
export default app;
//# sourceMappingURL=launcherapi.js.map