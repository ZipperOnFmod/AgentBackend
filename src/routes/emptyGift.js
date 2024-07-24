import express from "express";
const app = express.Router();
import Profile from "../model/profiles.js";
import User from "../model/user.js";
import profileManager from "../structs/profile.js";
import Friends from "../model/friends.js";
import functions from "../utilities/structs/functions.js";
import log from "../utilities/structs/log.js";
import error from "../utilities/structs/error.js";

app.post('/fortnite/api/game/v3/profile/*/client/emptygift', async (req, res) => { 
    const playerName = req.body.playerName;
    const playerLower = playerName.toLowerCase();
    const user = await User.findOne({ username_lower: playerLower });

    if (!user) {
        return error.createError(
            "errors.com.epicgames.user.not_found",
            "User not found.",
            undefined, 16027, undefined, 404, res
        );
    }

    const senderAccountId = user.accountId.toString();
    const profiles = await Profile.findOne({ accountId: senderAccountId });

    if (!await profileManager.validateProfile("common_core", profiles)) return error.createError(
        "errors.com.epicgames.modules.profiles.operation_forbidden",
        `Unable to find template configuration for profile ${"common_core"}`,
        ["common_core"], 12813, undefined, 403, res
    );

    let profile = profiles.profiles["common_core"];

    if ("common_core" != "common_core") {
        return error.createError(
            "errors.com.epicgames.modules.profiles.invalid_command",
            `GiftCatalogEntry is not valid on ${"common_core"} profile`,
            ["GiftCatalogEntry", "common_core"],
            12801,
            undefined,
            400,
            res
        );
    }

    const memory = functions.GetVersionInfo(req);

    let Notifications = [];
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let validGiftBoxes = [
        "GiftBox:gb_accountmergevbucks",
        "GiftBox:gb_accountmerge",
        "GiftBox:gb_battlepass",
        "GiftBox:gb_makegoodathena",
        "GiftBox:gb_makegood",
        "GiftBox:gb_seasonfirstwin"
    ];

    app.get("/accountRefresh", (req, res) => {
        res.send("Success");
    });

    let missingFields = checkFields(["offerId", "giftWrapTemplateId"], req.body);

    if (missingFields.fields.length > 0) return error.createError(
        "errors.com.epicgames.validation.validation_failed",
        `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`,
        [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res
    );

    if (typeof req.body.offerId != "string") return ValidationError("offerId", "a string", res);
    if (typeof req.body.giftWrapTemplateId != "string") return ValidationError("giftWrapTemplateId", "a string", res);
    if (typeof req.body.personalMessage != "string") return ValidationError("personalMessage", "a string", res);

    if (req.body.personalMessage.length > 100) return error.createError(
        "errors.com.epicgames.string.length_check",
        `The personalMessage you provided is longer than 100 characters, please make sure your personal message is less than 100 characters long and try again.`,
        undefined, 16027, undefined, 400, res
    );

    if (!validGiftBoxes.includes(req.body.giftWrapTemplateId)) return error.createError(
        "errors.com.epicgames.giftbox.invalid",
        `The giftbox you provided is invalid, please provide a valid giftbox and try again.`,
        undefined, 16027, undefined, 400, res
    );

    let sender = await Friends.findOne({ accountId: senderAccountId }).lean();

    const receiverUser = await User.findOne({ playerName: req.body.receiverPlayerName });

    if (!receiverUser) {
        return error.createError(
            "errors.com.epicgames.user.not_found",
            "Receiver user not found.",
            undefined, 16027, undefined, 404, res
        );
    }

    const receiverAccountId = senderAccountId;

    let receiverProfile = await Profile.findOne({ accountId: receiverAccountId });

    if (!receiverProfile) {
        return error.createError(
            "errors.com.epicgames.profile.not_found",
            "Receiver profile not found.",
            undefined, 16027, undefined, 404, res
        );
    }

    let athena = receiverProfile.profiles["athena"];
    let common_core = ((receiverAccountId == senderAccountId)
        ? profile
        : receiverProfile.profiles["common_core"]);

    athena.rvn += 1;
    athena.commandRevision += 1;
    athena.updated = new Date().toISOString();

    common_core.rvn += 1;
    common_core.commandRevision += 1;
    common_core.updated = new Date().toISOString();

    await receiverProfile.updateOne({
        $set: {
            [`profiles.athena`]: athena,
            [`profiles.common_core`]: common_core,
        },
    });

    global.giftReceived[receiverAccountId] = true;

    functions.sendXmppMessageToId(
        {
            type: "com.epicgames.gift.received",
            payload: {},
            timestamp: new Date().toISOString(),
        },
        receiverAccountId
    );

    if (ApplyProfileChanges.length > 0 && receiverAccountId !== senderAccountId) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();

        await profiles.updateOne({ $set: { [`profiles.${"common_core"}`]: profile } });
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        profileRevision: profile.rvn || 0,
        profileId: "common_core",
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});

function checkFields(fields, body) {
    let missingFields = { fields: [] };
    fields.forEach(field => {
        if (!body[field])
            missingFields.fields.push(field);
    });
    return missingFields;
}
function ValidationError(field, type, res) {
    return error.createError("errors.com.epicgames.validation.validation_failed", `Validation Failed. '${field}' is not ${type}.`, [field], 1040, undefined, 400, res);
}

export default app;