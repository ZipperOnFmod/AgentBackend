import express from "express";
const app = express.Router();
import Profile from "../model/profiles.js";
import User from "../model/user.js";

app.get("/IsBanned", async (req, res) => {
    const { authkey, username } = req.query;
    if (!username)
        return res.status(400).send('No username provided.');
    if (!authkey)
        return res.status(400).send('No authkey provided.');
        
    const lowerUsername = username.toLowerCase();
    
    if (authkey === process.env.AUTHKEY) {
        try {
            const user = await User.findOne({ username_lower: lowerUsername });
            if (user) 
            {
                if (user.banned) 
                {
                    res.send("True");
                } else {
                    res.send("False");
                }
            } else {
                res.send("User not found.");
            }
        } catch (ex) {
            res.status(500).send("Something went wrong");
            console.error(ex);
        }
    } else {
        res.status(401).send("Invalid authkey.");
    }
});

export default app;
