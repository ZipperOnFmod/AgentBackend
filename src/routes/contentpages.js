import { createRequire } from "module";
const require = createRequire(
    import.meta.url);
import express from "express";
const app = express.Router();
import functions from "../utilities/structs/functions.js";

app.get("/content/api/pages/fortnite-game/spark-tracks", async (req, res) => {
    const sparkTracks = require("../../responses/Athena/sparkTracks.json");

    res.json(sparkTracks)
})

app.get("/content/api/pages/*", async (req, res) => {
    const contentpages = functions.getContentPages(req);

    res.json(contentpages)
})

app.post("/api/v1/fortnite-br/surfaces/motd/target", async (req, res) => {
    const motdTarget = JSON.parse(fs.readFileSync(path.join(__dirname, "../../responses/motd.json"), "utf8"));

    var Language = "en";

    if (req.body.language) {
        if (req.body.language.includes("-") && req.body.language != "es-419" && req.body.language != "pt-BR") {
            Language = req.body.language.split("-")[0];
        } else {
            Language = req.body.language;
        }
    }

    try {
        motdTarget.contentItems.forEach(item => {
            item.contentFields.title = item.contentFields.title[Language];
            item.contentFields.body = item.contentFields.body[Language];
        })
    } catch (err) { }

    res.json(motdTarget)
})
export default app;