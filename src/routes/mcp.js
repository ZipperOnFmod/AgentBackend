import express from "express";
const app = express.Router();
import Profile from "../model/profiles.js";
import User from "../model/user.js";
import profileManager from "../structs/profile.js";
import Friends from "../model/friends.js";
import functions from "../utilities/structs/functions.js";
import log from "../utilities/structs/log.js";
import error from "../utilities/structs/error.js";
import { verifyToken } from "../tokenManager/tokenVerify.js";
import jwt from 'jsonwebtoken';
import fs from "fs";
import { createRequire } from 'module';
import axios from "axios";
const require = createRequire(import.meta.url);
global.giftReceived = {};
global.codes = [
    "kxgu"
]

app.get("/affiliate/api/public/affiliates/slug/:slug", async (req, res) => {
    global.codes = JSON.parse(fs.readFileSync("responses/SAC.json").toString());
    var index;
    var slug = req.params.slug;
    if ((index = global.codes.findIndex(f => new RegExp(`^${f.code}$`, 'i').test(slug))) == -1) {
        return error.createError("errors.com.epicgames.sac.invalid", `Invalid code.`, [], 1000, undefined, 404, res);
    }
    var user = await User.findOne({ accountId: global.codes[index].accountId });
    if (!user) {
        return error.createError("errors.com.epicgames.sac.invalid", `Invalid code.`, [], 1000, undefined, 404, res);
    }

    res.status(200).json({
        id: user.accountId,
        slug: req.params.slug,
        displayName: user.username,
        status: "ACTIVE",
        verified: false,
    });
});
app.post("/fortnite/api/game/v2/profile/*/client/SetAffiliateName", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId }).cacheQuery();
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    if (req.query.profileId != "common_core")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `SetAffiliateName is not valid on ${req.query.profileId} profile`, ["SetAffiliateName", req.query.profileId], 12801, undefined, 400, res);
    const memory = functions.GetVersionInfo(req);
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    if (typeof req.body.affiliateName != "string")
        return ValidationError("affiliateName", "a string", res);

    profile.stats.attributes.mtx_affiliate = req.body.affiliateName;
    profile.stats.attributes.mtx_affiliate_set_time = new Date().toISOString();

    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "mtx_affiliate",
        "value": profile.stats.attributes.mtx_affiliate
    });
    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "mtx_affiliate_set_time",
        "value": profile.stats.attributes.mtx_affiliate_set_time
    });

    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } }).cacheQuery();
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});
app.post("/fortnite/api/game/v2/profile/*/client/SetReceiveGiftsEnabled", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    if (req.query.profileId != "common_core")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `SetReceiveGiftsEnabled is not valid on ${req.query.profileId} profile`, ["SetReceiveGiftsEnabled", req.query.profileId], 12801, undefined, 400, res);
    const memory = functions.GetVersionInfo(req);
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    if (typeof req.body.bReceiveGifts != "boolean")
        return ValidationError("bReceiveGifts", "a boolean", res);
    profile.stats.attributes.allowed_to_receive_gifts = req.body.bReceiveGifts;
    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "allowed_to_receive_gifts",
        "value": profile.stats.attributes.allowed_to_receive_gifts
    });
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});
app.post("/fortnite/api/game/v2/profile/*/client/GiftCatalogEntry", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    let athena = profiles?.profiles["athena"];
    if (req.query.profileId != "common_core")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `GiftCatalogEntry is not valid on ${req.query.profileId} profile`, ["GiftCatalogEntry", req.query.profileId], 12801, undefined, 400, res);
    const memory = functions.GetVersionInfo(req);
    let Notifications = [];
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn || 0;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let validGiftBoxes = [
        "GiftBox:gb_default",
        "GiftBox:gb_giftwrap1",
        "GiftBox:gb_giftwrap2",
        "GiftBox:gb_giftwrap3"
    ];
    let missingFields = checkFields(["offerId", "receiverAccountIds", "giftWrapTemplateId"], req.body);
    if (missingFields.fields.length > 0)
        return error.createError("errors.com.epicgames.validation.validation_failed", `The BattleBundle has been disabled on Agent. Purchase the other option!`, [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res);
    if (typeof req.body.offerId != "string")
        return ValidationError("offerId", "a string", res);
    if (!Array.isArray(req.body.receiverAccountIds))
        return ValidationError("receiverAccountIds", "an array", res);
    if (typeof req.body.giftWrapTemplateId != "string")
        return ValidationError("giftWrapTemplateId", "a string", res);
    if (typeof req.body.personalMessage != "string")
        return ValidationError("personalMessage", "a string", res);
    if (req.body.personalMessage.length > 100)
        return error.createError("errors.com.epicgames.string.length_check", `The personalMessage you provided is longer than 100 characters, please make sure your personal message is less than 100 characters long and try again.`, undefined, 16027, undefined, 400, res);
    if (!validGiftBoxes.includes(req.body.giftWrapTemplateId))
        return error.createError("errors.com.epicgames.giftbox.invalid", `The giftbox you provided is invalid, please provide a valid giftbox and try again.`, undefined, 16027, undefined, 400, res);
    if (req.body.receiverAccountIds.length < 1 || req.body.receiverAccountIds.length > 5)
        return error.createError("errors.com.epicgames.item.quantity.range_check", `You need to atleast gift to 1 person and can not gift to more than 5 people.`, undefined, 16027, undefined, 400, res);
    if (checkIfDuplicateExists(req.body.receiverAccountIds))
        return error.createError("errors.com.epicgames.array.duplicate_found", `There are duplicate accountIds in receiverAccountIds, please remove the duplicates and try again.`, undefined, 16027, undefined, 400, res);
    let sender = await Friends.findOne({ accountId: req.user.accountId }).lean()
    for (let receiverId of req.body.receiverAccountIds) {
        if (typeof receiverId != "string")
            return error.createError("errors.com.epicgames.array.invalid_string", `There is a non-string object inside receiverAccountIds, please provide a valid value and try again.`, undefined, 16027, undefined, 400, res);
        if (!sender?.list.accepted.find(i => i.accountId == receiverId) && receiverId != req.user.accountId)
            return error.createError("errors.com.epicgames.friends.no_relationship", `User ${req.user.accountId} is not friends with ${receiverId}`, [req.user.accountId, receiverId], 28004, undefined, 403, res);
    }
    if (!profile.items)
        profile.items = {};
    if (!athena.items)
        athena.items = {};
    let findOfferId = functions.getOfferID(req.body.offerId);
    if (!findOfferId)
        return error.createError("errors.com.epicgames.fortnite.id_invalid", `Offer ID (id: '${req.body.offerId}') not found`, [req.body.offerId], 16027, undefined, 400, res);
    switch (true) {
        case /^BR(Daily|Weekly)Storefront$/.test(findOfferId.name):
            if (findOfferId.offerId.prices[0].currencyType.toLowerCase() == "mtxcurrency") {
                let paid = false;
                let price = (findOfferId.offerId.prices[0].finalPrice) * req.body.receiverAccountIds.length;
                for (let key in profile.items) {
                    if (!profile.items[key].templateId.toLowerCase().startsWith("currency:mtx"))
                        continue;
                    let currencyPlatform = profile.items[key].attributes.platform;
                    if ((currencyPlatform.toLowerCase() != profile.stats.attributes.current_mtx_platform.toLowerCase()) && (currencyPlatform.toLowerCase() != "shared"))
                        continue;
                    if (profile.items[key].quantity < price)
                        return error.createError("errors.com.epicgames.currency.mtx.insufficient", `You can not afford this item (${price}), you only have ${profile.items[key].quantity}.`, [`${price}`, `${profile.items[key].quantity}`], 1040, undefined, 400, res);
                    profile.items[key].quantity -= price;
                    ApplyProfileChanges.push({
                        "changeType": "itemQuantityChanged",
                        "itemId": key,
                        "quantity": profile.items[key].quantity
                    });

                    paid = true;
                    break;
                }
                if (!paid && price > 0)
                    return error.createError("errors.com.epicgames.currency.mtx.insufficient", `You can not afford this item.`, [], 1040, undefined, 400, res);
                    if (/^BR(Daily|Weekly)Storefront$/.test(findOfferId.name)) {
                        global.codes = JSON.parse(fs.readFileSync("responses/SAC.json").toString());
                        var SAC = global.codes.findIndex(f => f.code.toLowerCase() == profile.stats.attributes.mtx_affiliate.toLowerCase());
                        if (SAC != -1) {
                            var code = global.codes[SAC].accountId;
                            var x = await Profile.findOne({ accountId: code })
                            var u = await User.findOne({ accountId: code })


                            var a = x?.profiles["common_core"];
                            a.items["Currency:MtxPurchased"].quantity += Math.floor((findOfferId.offerId.prices[0].finalPrice) * req.body.receiverAccountIds.length * .20);
                            await x?.updateOne({ $set: { [`profiles.common_core`]: a } })

                            await axios.post("http://127.0.0.1:3551/fortnite/api/game/v3/profile/*/client/emptygift", {
                                offerId: "e406693aa12adbc8b04ba7e6409c8ab3d598e8c3",
                                currency: "MtxCurrency",
                                currencySubType: "",
                                expectedTotalPrice: "0",
                                gameContext: "",
                                receiverAccountIds: [u.accountId],
                                giftWrapTemplateId: "GiftBox:gb_makegood",
                                personalMessage: "Your personal message here",
                                accountId: code,
                                playerName: u.username
                            });
                        }
                    }
            }
            for (let receiverId of req.body.receiverAccountIds) {
                const receiverProfiles = await Profile.findOne({ accountId: receiverId });
                let athena = receiverProfiles?.profiles["athena"];
                let common_core = receiverProfiles?.profiles["common_core"];
                if (!athena.items)
                    athena.items = {};
                if (!common_core.stats.attributes.allowed_to_receive_gifts)
                    return error.createError("errors.com.epicgames.user.gift_disabled", `User ${receiverId} has disabled receiving gifts.`, [receiverId], 28004, undefined, 403, res);
                for (let itemGrant of findOfferId.offerId.itemGrants) {
                    for (let itemId in athena.items) {
                        if (itemGrant.templateId.toLowerCase() == athena.items[itemId].templateId.toLowerCase())
                            return error.createError("errors.com.epicgames.modules.gamesubcatalog.purchase_not_allowed", `User ${receiverId} already owns this item.`, [receiverId], 28004, undefined, 403, res);
                    }
                }
            }
            for (let receiverId of req.body.receiverAccountIds) {
                const receiverProfiles = await Profile.findOne({ accountId: receiverId })
                let athena = receiverProfiles?.profiles["athena"];
                let common_core = ((receiverId == req.user.accountId) ? profile : receiverProfiles?.profiles["common_core"]);
                let giftBoxItemID = functions.MakeID();
                let giftBoxItem = {
                    "templateId": req.body.giftWrapTemplateId,
                    "attributes": {
                        "fromAccountId": req.user.accountId,
                        "lootList": [],
                        "params": {
                            "userMessage": req.body.personalMessage
                        },
                        "level": 1,
                        "giftedOn": new Date().toISOString()
                    },
                    "quantity": 1
                };
                if (!athena.items)
                    athena.items = {};
                if (!common_core.items)
                    common_core.items = {};
                for (let value of findOfferId.offerId.itemGrants) {
                    const ID = functions.MakeID();
                    const Item = {
                        "templateId": value.templateId,
                        "attributes": {
                            "item_seen": false,
                            "variants": [],
                        },
                        "quantity": 1
                    };
                    athena.items[ID] = Item;
                    giftBoxItem.attributes.lootList.push({
                        "itemType": Item.templateId,
                        "itemGuid": ID,
                        "itemProfile": "athena",
                        "quantity": 1
                    });
                }
                common_core.items[giftBoxItemID] = giftBoxItem;
                if (receiverId == req.user.accountId)
                    ApplyProfileChanges.push({
                        "changeType": "itemAdded",
                        "itemId": giftBoxItemID,
                        "item": common_core.items[giftBoxItemID]
                    });
                athena.rvn += 1;
                athena.commandRevision += 1;
                athena.updated = new Date().toISOString();
                common_core.rvn += 1;
                common_core.commandRevision += 1;
                common_core.updated = new Date().toISOString();
                await receiverProfiles?.updateOne({ $set: { [`profiles.athena`]: athena, [`profiles.common_core`]: common_core } })
                global.giftReceived[receiverId] = true;
                functions.sendXmppMessageToId({
                    type: "com.epicgames.gift.received",
                    payload: {},
                    timestamp: new Date().toISOString()
                }, receiverId);
            }
            break;
    }
    if (ApplyProfileChanges.length > 0 && !req.body.receiverAccountIds.includes(req.user.accountId)) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
});
app.post("/fortnite/api/game/v2/profile/*/client/RemoveGiftBox", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    if (req.query.profileId != "common_core" && req.query.profileId != "profile0")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `RemoveGiftBox is not valid on ${req.query.profileId} profile`, ["RemoveGiftBox", req.query.profileId], 12801, undefined, 400, res);
    const memory = functions.GetVersionInfo(req);
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    if (typeof req.body.giftBoxItemId == "string" && profile.items[req.body.giftBoxItemId]) {
        if (!profile.items[req.body.giftBoxItemId])
            return error.createError("errors.com.epicgames.fortnite.id_invalid", `Item (id: '${req.body.giftBoxItemId}') not found`, [req.body.giftBoxItemId], 16027, undefined, 400, res);
        if (!profile.items[req.body.giftBoxItemId].templateId.startsWith("GiftBox:"))
            return error.createError("errors.com.epicgames.fortnite.id_invalid", `The specified item id is not a giftbox.`, [req.body.giftBoxItemId], 16027, undefined, 400, res);
        delete profile.items[req.body.giftBoxItemId];
        ApplyProfileChanges.push({
            "changeType": "itemRemoved",
            "itemId": req.body.giftBoxItemId
        });
    }
    if (Array.isArray(req.body.giftBoxItemIds)) {
        for (let giftBoxItemId of req.body.giftBoxItemIds) {
            if (typeof giftBoxItemId != "string")
                continue;
            if (!profile.items[giftBoxItemId])
                continue;
            if (!profile.items[giftBoxItemId].templateId.startsWith("GiftBox:"))
                continue;
            delete profile.items[giftBoxItemId];
            ApplyProfileChanges.push({
                "changeType": "itemRemoved",
                "itemId": giftBoxItemId
            });
        }
    }
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        //        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});
app.post("/fortnite/api/game/v2/profile/*/client/PurchaseCatalogEntry", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId });
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    let athena = profiles?.profiles["athena"];
    if (req.query.profileId != "common_core" && req.query.profileId != "profile0")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `PurchaseCatalogEntry is not valid on ${req.query.profileId} profile`, ["PurchaseCatalogEntry", req.query.profileId], 12801, undefined, 400, res);
    let MultiUpdate = [{
            "profileRevision": athena.rvn || 0,
            "profileId": "athena",
            "profileChangesBaseRevision": athena.rvn || 0,
            "profileChanges": [],
            "profileCommandRevision": athena.commandRevision || 0,
        }];
    const memory = functions.GetVersionInfo(req);
    let Notifications = [];
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let missingFields = checkFields(["offerId"], req.body);
    var ItemExists = false;
    if (missingFields.fields.length > 0)
        return error.createError("errors.com.epicgames.validation.validation_failed", `The BattleBundle has been disabled on Agent. Purchase the other option!`, [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res);
    if (typeof req.body.offerId != "string")
        return ValidationError("offerId", "a string", res);
    if (typeof req.body.purchaseQuantity != "number")
        return ValidationError("purchaseQuantity", "a number", res);
    if (req.body.purchaseQuantity < 1)
        return error.createError("errors.com.epicgames.validation.validation_failed", `Validation Failed. 'purchaseQuantity' is less than 1.`, ['purchaseQuantity'], 1040, undefined, 400, res);
    if (!profile.items)
        profile.items = {};
    if (!athena.items)
        athena.items = {};
    let findOfferId = functions.getOfferID(req.body.offerId);
    if (!findOfferId)
        return error.createError("errors.com.epicgames.fortnite.id_invalid", `Offer ID (id: '${req.body.offerId}') not found`, [req.body.offerId], 16027, undefined, 400, res);
    var value = findOfferId;
        if (value.name.startsWith("BRSeason")) {
            if (!Number.isNaN(Number(value.name.split("BRSeason")[1]))) {
                var offer = /*value.catalogEntries.find(i => i.offerId == req.body.offerId)*/ findOfferId.offerId;

                if (offer) {
                    if (MultiUpdate.length == 0) {
                        MultiUpdate.push({
                            "profileRevision": athena.rvn || 0,
                            "profileId": "athena",
                            "profileChangesBaseRevision": athena.rvn || 0,
                            "profileChanges": [],
                            "profileCommandRevision": athena.commandRevision || 0,
                        })
                    }

                    var Season = value.name.split("BR")[1];
                    var BattlePass = require(`../../responses/Athena/BattlePass/${Season}.json`);

                    if (BattlePass) {
                        if (BattlePass.battlePassOfferId == offer.offerId || BattlePass.battleBundleOfferId == offer.offerId) {
                            var lootList = [];
                            var EndingTier = athena.stats.attributes.book_level;
                            athena.stats.attributes.book_purchased = true;

                            if (BattlePass.battleBundleOfferId == offer.offerId) {
                                athena.stats.attributes.book_level += 25;
                                if (athena.stats.attributes.book_level > 100) athena.stats.attributes.book_level = 100;
                                EndingTier = athena.stats.attributes.book_level;
                            }

                            for (var i = 0; i < EndingTier; i++) {
                                var FreeTier = BattlePass.freeRewards[i] || {};
                                var PaidTier = BattlePass.paidRewards[i] || {};

                                for (var item in FreeTier) {
                                    if (item.toLowerCase() == "token:athenaseasonxpboost") {
                                        athena.stats.attributes.season_match_boost += FreeTier[item];

                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "statModified",
                                            "name": "season_match_boost",
                                            "value": athena.stats.attributes.season_match_boost
                                        })
                                    }

                                    if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                                        athena.stats.attributes.season_friend_match_boost += FreeTier[item];

                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "statModified",
                                            "name": "season_friend_match_boost",
                                            "value": athena.stats.attributes.season_friend_match_boost
                                        })
                                    }

                                    if (item.toLowerCase().startsWith("currency:mtx")) {
                                        for (var key in profile.items) {
                                            if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                                if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                                    profile.items[key].quantity += FreeTier[item];
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    if (item.toLowerCase().startsWith("homebasebanner")) {
                                        for (var key in profile.items) {
                                            if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                                profile.items[key].attributes.item_seen = false;
                                                ItemExists = true;

                                                ApplyProfileChanges.push({
                                                    "changeType": "itemAttrChanged",
                                                    "itemId": key,
                                                    "attributeName": "item_seen",
                                                    "attributeValue": profile.items[key].attributes.item_seen
                                                })
                                            }
                                        }

                                        if (ItemExists == false) {
                                            var ItemID = functions.MakeID();
                                            var Item = {"templateId":item,"attributes":{"item_seen":false},"quantity":1};

                                            profile.items[ItemID] = Item;

                                            ApplyProfileChanges.push({
                                                "changeType": "itemAdded",
                                                "itemId": ItemID,
                                                "item": Item
                                            })
                                        }

                                        ItemExists = false;
                                    }

                                    if (item.toLowerCase().startsWith("athena")) {
                                        for (var key in athena.items) {
                                            if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                                athena.items[key].attributes.item_seen = false;
                                                ItemExists = true;

                                                MultiUpdate[0].profileChanges.push({
                                                    "changeType": "itemAttrChanged",
                                                    "itemId": key,
                                                    "attributeName": "item_seen",
                                                    "attributeValue": athena.items[key].attributes.item_seen
                                                })
                                            }
                                        }

                                        if (ItemExists == false) {
                                            var ItemID = functions.MakeID();
                                            var Item = {"templateId":item,"attributes":{"max_level_bonus":0,"level":1,"item_seen":false,"xp":0,"variants":[],"favorite":false},"quantity":FreeTier[item]}

                                            athena.items[ItemID] = Item;

                                            MultiUpdate[0].profileChanges.push({
                                                "changeType": "itemAdded",
                                                "itemId": ItemID,
                                                "item": Item
                                            })
                                        }

                                        ItemExists = false;
                                    }

                                    lootList.push({
                                        "itemType": item,
                                        "itemGuid": item,
                                        "quantity": FreeTier[item]
                                    })
                                }

                                for (var item in PaidTier) {
                                    if (item.toLowerCase() == "token:athenaseasonxpboost") {
                                        athena.stats.attributes.season_match_boost += PaidTier[item];

                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "statModified",
                                            "name": "season_match_boost",
                                            "value": athena.stats.attributes.season_match_boost
                                        })
                                    }

                                    if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                                        athena.stats.attributes.season_friend_match_boost += PaidTier[item];

                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "statModified",
                                            "name": "season_friend_match_boost",
                                            "value": athena.stats.attributes.season_friend_match_boost
                                        })
                                    }

                                    if (item.toLowerCase().startsWith("currency:mtx")) {
                                        for (var key in profile.items) {
                                            if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                                if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                                    ApplyProfileChanges.push({
                                                        "changeType": "itemQuantityChanged",
                                                        "itemId": key,
                                                        "quantity": profile.items[key].quantity
                                                    });
                                                    profile.items[key].quantity += PaidTier[item];
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    if (item.toLowerCase().startsWith("homebasebanner")) {
                                        for (var key in profile.items) {
                                            if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                                profile.items[key].attributes.item_seen = false;
                                                ItemExists = true;

                                                ApplyProfileChanges.push({
                                                    "changeType": "itemAttrChanged",
                                                    "itemId": key,
                                                    "attributeName": "item_seen",
                                                    "attributeValue": profile.items[key].attributes.item_seen
                                                })
                                            }
                                        }

                                        if (ItemExists == false) {
                                            var ItemID = functions.MakeID();
                                            var Item = {"templateId":item,"attributes":{"item_seen":false},"quantity":1};

                                            profile.items[ItemID] = Item;

                                            ApplyProfileChanges.push({
                                                "changeType": "itemAdded",
                                                "itemId": ItemID,
                                                "item": Item
                                            })
                                        }

                                        ItemExists = false;
                                    }

                                    if (item.toLowerCase().startsWith("athena")) {
                                        for (var key in athena.items) {
                                            if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                                athena.items[key].attributes.item_seen = false;
                                                ItemExists = true;

                                                MultiUpdate[0].profileChanges.push({
                                                    "changeType": "itemAttrChanged",
                                                    "itemId": key,
                                                    "attributeName": "item_seen",
                                                    "attributeValue": athena.items[key].attributes.item_seen
                                                })
                                            }
                                        }

                                        if (ItemExists == false) {
                                            var ItemID = functions.MakeID();
                                            var Item = {"templateId":item,"attributes":{"max_level_bonus":0,"level":1,"item_seen":false,"xp":0,"variants":[],"favorite":false},"quantity":PaidTier[item]}

                                            athena.items[ItemID] = Item;

                                            MultiUpdate[0].profileChanges.push({
                                                "changeType": "itemAdded",
                                                "itemId": ItemID,
                                                "item": Item
                                            })
                                        }

                                        ItemExists = false;
                                    }

                                    if (findOfferId.offerId.devName.endsWith(".SingleTier.01")) for (var key in profile.items) {
                                        if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                            if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                                profile.items[key].quantity -= 150;
                                                ApplyProfileChanges.push({
                                                    "changeType": "itemQuantityChanged",
                                                    "itemId": key,
                                                    "quantity": profile.items[key].quantity
                                                });
                                                break;
                                            }
                                        }
                                    }
                                    lootList.push({
                                        "itemType": item,
                                        "itemGuid": item,
                                        "quantity": PaidTier[item]
                                    });
                                }
                            }

                            var GiftBoxID = functions.MakeID();
                            var GiftBox = {"templateId":Number(Season.split("Season")[1]) <= 4 ? "GiftBox:gb_battlepass" : "GiftBox:gb_battlepasspurchased","attributes":{"max_level_bonus":0,"fromAccountId":"","lootList":lootList}}

                            /*if (Number(Season.split("Season")[1]) > 2) {
                                profile.items[GiftBoxID] = GiftBox;
                                
                                ApplyProfileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": GiftBoxID,
                                    "item": GiftBox
                                })
                            }*/

                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "book_purchased",
                                "value": athena.stats.attributes.book_purchased
                            })

                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "book_level",
                                "value": athena.stats.attributes.book_level
                            })

                            //AthenaModified = true;
                        }

                        if (BattlePass.tierOfferId == offer.offerId) {
                            var lootList = [];
                            var StartingTier = athena.stats.attributes.book_level;
                            var EndingTier;
                            athena.stats.attributes.book_level += req.body.purchaseQuantity || 1;
                            EndingTier = athena.stats.attributes.book_level;

                            for (var i = StartingTier; i < EndingTier; i++) {
                                var FreeTier = BattlePass.freeRewards[i] || {};
                                var PaidTier = BattlePass.paidRewards[i] || {};

                                for (var item in FreeTier) {
                                    if (item.toLowerCase() == "token:athenaseasonxpboost") {
                                        athena.stats.attributes.season_match_boost += FreeTier[item];

                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "statModified",
                                            "name": "season_match_boost",
                                            "value": athena.stats.attributes.season_match_boost
                                        })
                                    }

                                    if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                                        athena.stats.attributes.season_friend_match_boost += FreeTier[item];

                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "statModified",
                                            "name": "season_friend_match_boost",
                                            "value": athena.stats.attributes.season_friend_match_boost
                                        })
                                    }

                                    if (item.toLowerCase().startsWith("currency:mtx")) {
                                        for (var key in profile.items) {
                                            if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                                if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                                    profile.items[key].quantity += FreeTier[item];
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    if (item.toLowerCase().startsWith("homebasebanner")) {
                                        for (var key in profile.items) {
                                            if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                                profile.items[key].attributes.item_seen = false;
                                                ItemExists = true;

                                                ApplyProfileChanges.push({
                                                    "changeType": "itemAttrChanged",
                                                    "itemId": key,
                                                    "attributeName": "item_seen",
                                                    "attributeValue": profile.items[key].attributes.item_seen
                                                })
                                            }
                                        }

                                        if (ItemExists == false) {
                                            var ItemID = functions.MakeID();
                                            var Item = {"templateId":item,"attributes":{"item_seen":false},"quantity":1};

                                            profile.items[ItemID] = Item;

                                            ApplyProfileChanges.push({
                                                "changeType": "itemAdded",
                                                "itemId": ItemID,
                                                "item": Item
                                            })
                                        }

                                        ItemExists = false;
                                    }

                                    if (item.toLowerCase().startsWith("athena")) {
                                        for (var key in athena.items) {
                                            if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                                athena.items[key].attributes.item_seen = false;
                                                ItemExists = true;

                                                MultiUpdate[0].profileChanges.push({
                                                    "changeType": "itemAttrChanged",
                                                    "itemId": key,
                                                    "attributeName": "item_seen",
                                                    "attributeValue": athena.items[key].attributes.item_seen
                                                })
                                            }
                                        }

                                        if (ItemExists == false) {
                                            var ItemID = functions.MakeID();
                                            var Item = {"templateId":item,"attributes":{"max_level_bonus":0,"level":1,"item_seen":false,"xp":0,"variants":[],"favorite":false},"quantity":FreeTier[item]}

                                            athena.items[ItemID] = Item;

                                            MultiUpdate[0].profileChanges.push({
                                                "changeType": "itemAdded",
                                                "itemId": ItemID,
                                                "item": Item
                                            })
                                        }

                                        ItemExists = false;
                                    }

                                    lootList.push({
                                        "itemType": item,
                                        "itemGuid": item,
                                        "quantity": FreeTier[item]
                                    })
                                }

                                for (var item in PaidTier) {
                                    if (item.toLowerCase() == "token:athenaseasonxpboost") {
                                        athena.stats.attributes.season_match_boost += PaidTier[item];

                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "statModified",
                                            "name": "season_match_boost",
                                            "value": athena.stats.attributes.season_match_boost
                                        })
                                    }

                                    if (item.toLowerCase() == "token:athenaseasonfriendxpboost") {
                                        athena.stats.attributes.season_friend_match_boost += PaidTier[item];

                                        MultiUpdate[0].profileChanges.push({
                                            "changeType": "statModified",
                                            "name": "season_friend_match_boost",
                                            "value": athena.stats.attributes.season_friend_match_boost
                                        })
                                    }

                                    if (item.toLowerCase().startsWith("currency:mtx")) {
                                        for (var key in profile.items) {
                                            if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                                if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                                    profile.items[key].quantity += PaidTier[item];
                                                    ApplyProfileChanges.push({
                                                        "changeType": "itemQuantityChanged",
                                                        "itemId": key,
                                                        "quantity": profile.items[key].quantity
                                                    });
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    if (item.toLowerCase().startsWith("homebasebanner")) {
                                        for (var key in profile.items) {
                                            if (profile.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                                profile.items[key].attributes.item_seen = false;
                                                ItemExists = true;

                                                ApplyProfileChanges.push({
                                                    "changeType": "itemAttrChanged",
                                                    "itemId": key,
                                                    "attributeName": "item_seen",
                                                    "attributeValue": profile.items[key].attributes.item_seen
                                                })
                                            }
                                        }

                                        if (ItemExists == false) {
                                            var ItemID = functions.MakeID();
                                            var Item = {"templateId":item,"attributes":{"item_seen":false},"quantity":1};

                                            profile.items[ItemID] = Item;

                                            ApplyProfileChanges.push({
                                                "changeType": "itemAdded",
                                                "itemId": ItemID,
                                                "item": Item
                                            })
                                        }

                                        ItemExists = false;
                                    }

                                    if (item.toLowerCase().startsWith("athena")) {
                                        for (var key in athena.items) {
                                            if (athena.items[key].templateId.toLowerCase() == item.toLowerCase()) {
                                                athena.items[key].attributes.item_seen = false;
                                                ItemExists = true;

                                                MultiUpdate[0].profileChanges.push({
                                                    "changeType": "itemAttrChanged",
                                                    "itemId": key,
                                                    "attributeName": "item_seen",
                                                    "attributeValue": athena.items[key].attributes.item_seen
                                                })
                                            }
                                        }

                                        if (ItemExists == false) {
                                            var ItemID = functions.MakeID();
                                            var Item = {"templateId":item,"attributes":{"max_level_bonus":0,"level":1,"item_seen":false,"xp":0,"variants":[],"favorite":false},"quantity":PaidTier[item]}

                                            athena.items[ItemID] = Item;

                                            MultiUpdate[0].profileChanges.push({
                                                "changeType": "itemAdded",
                                                "itemId": ItemID,
                                                "item": Item
                                            })
                                        }

                                        ItemExists = false;
                                    }

                                    if (findOfferId.offerId.devName.endsWith(".SingleTier.01")) for (var key in profile.items) {
                                        if (profile.items[key].templateId.toLowerCase().startsWith("currency:mtx")) {
                                            if (profile.items[key].attributes.platform.toLowerCase() == profile.stats.attributes.current_mtx_platform.toLowerCase() || profile.items[key].attributes.platform.toLowerCase() == "shared") {
                                                profile.items[key].quantity -= 150;
                                                ApplyProfileChanges.push({
                                                    "changeType": "itemQuantityChanged",
                                                    "itemId": key,
                                                    "quantity": profile.items[key].quantity
                                                });
                                                break;
                                            }
                                        }
                                    }
                                    lootList.push({
                                        "itemType": item,
                                        "itemGuid": item,
                                        "quantity": PaidTier[item]
                                    })
                                }
                            }

                            var GiftBoxID = functions.MakeID();
                            var GiftBox = {"templateId":"GiftBox:gb_battlepass","attributes":{"max_level_bonus":0,"fromAccountId":"","lootList":lootList}}

                            /*if (Number(Season.split("Season")[1]) > 2) {
                                profile.items[GiftBoxID] = GiftBox;
                                
                                ApplyProfileChanges.push({
                                    "changeType": "itemAdded",
                                    "itemId": GiftBoxID,
                                    "item": GiftBox
                                })
                            }*/

                            MultiUpdate[0].profileChanges.push({
                                "changeType": "statModified",
                                "name": "book_level",
                                "value": athena.stats.attributes.book_level
                            })

                            //AthenaModified = true;
                        }
                    }
                }
            }
        }
            switch (true) {
                case /^BR(Daily|Weekly|Season)(Storefront|([0-9]{1,2}))$/.test(findOfferId.name):
                    Notifications.push({
                        "type": "CatalogPurchase",
                        "primary": true,
                        "lootResult": {
                            "items": []
                        }
                    });
                    for (let value of findOfferId.offerId.itemGrants) {
                        const ID = functions.MakeID();
                        for (let itemId in athena.items) {
                            if (value.templateId.toLowerCase() == athena.items[itemId].templateId.toLowerCase())
                                return error.createError("errors.com.epicgames.offer.already_owned", `You have already bought this item before.`, undefined, 1040, undefined, 400, res);
                        }
                        const Item = {
                            "templateId": value.templateId,
                            "attributes": {
                                "item_seen": false,
                                "variants": [],
                            },
                            "quantity": 1
                        };
                        athena.items[ID] = Item;
                        MultiUpdate[0].profileChanges.push({
                            "changeType": "itemAdded",
                            "itemId": ID,
                            "item": athena.items[ID]
                        });
                        Notifications[0].lootResult.items.push({
                            "itemType": Item.templateId,
                            "itemGuid": ID,
                            "itemProfile": "athena",
                            "quantity": 1
                        });
                    }
                    for (var p of findOfferId.offerId.prices) {
                        if (p.currencyType.toLowerCase() == "mtxcurrency") {
                            let paid = false;
                            for (let key in profile.items) {
                                if (findOfferId.offerId.devName.endsWith(".SingleTier.01")) {
                                    paid = true;
                                    continue;
                                };
                                if (!profile.items[key].templateId.toLowerCase().startsWith("currency:mtx"))
                                    continue;
                                let currencyPlatform = profile.items[key].attributes.platform;
                                if ((currencyPlatform.toLowerCase() != profile.stats.attributes.current_mtx_platform.toLowerCase()) && (currencyPlatform.toLowerCase() != "shared"))
                                    continue;
                                if (profile.items[key].quantity < p.finalPrice)
                                    return error.createError("errors.com.epicgames.currency.mtx.insufficient", `You can not afford this item (${findOfferId.offerId.prices[0].finalPrice}), you only have ${profile.items[key].quantity}.`, [`${findOfferId.offerId.prices[0].finalPrice}`, `${profile.items[key].quantity}`], 1040, undefined, 400, res);
                                profile.items[key].quantity -= p.finalPrice;
                                ApplyProfileChanges.push({
                                    "changeType": "itemQuantityChanged",
                                    "itemId": key,
                                    "quantity": profile.items[key].quantity
                                });
                                paid = true;
                                break;
                            }
                            if (!paid && p.finalPrice > 0)
                                return error.createError("errors.com.epicgames.currency.mtx.insufficient", `You can not afford this item (${findOfferId.offerId.prices[0].finalPrice}).`, [`${findOfferId.offerId.prices[0].finalPrice}`], 1040, undefined, 400, res);
                            if (/^BR(Daily|Weekly)Storefront$/i.test(findOfferId.name)) {
                                global.codes = JSON.parse(fs.readFileSync("responses/SAC.json").toString());
                                var SAC = global.codes.findIndex(f => {
                                    let affiliate = profile.stats?.attributes?.mtx_affiliate;
                                    return affiliate && new RegExp(`^${f.code}$`, 'i').test(affiliate);
                                });
                                if (SAC != -1) {
                                    var code = global.codes[SAC].accountId;
                                    var x = await Profile.findOne({ accountId: code });
                                    var u = await User.findOne({ accountId: code });
                                    var a = x?.profiles["common_core"];
                                    a.items["Currency:MtxPurchased"].quantity += Math.floor(p.finalPrice * .20);
                                    await x?.updateOne({ $set: { [`profiles.common_core`]: a } });

                                    await axios.post("http://127.0.0.1:3551/fortnite/api/game/v3/profile/*/client/emptygift", {
                                        offerId: "e406693aa12adbc8b04ba7e6409c8ab3d598e8c3",
                                        currency: "MtxCurrency",
                                        currencySubType: "",
                                        expectedTotalPrice: "0",
                                        gameContext: "",
                                        receiverAccountIds: [u.accountId],
                                        giftWrapTemplateId: "GiftBox:gb_makegood",
                                        personalMessage: "Your personal message here",
                                        accountId: code,
                                        playerName: u.username
                                    });
                                }
                            }
                        }
                    }
                    if (MultiUpdate[0].profileChanges.length > 0) {
                        athena.rvn += 1;
                        athena.commandRevision += 1;
                        athena.updated = new Date().toISOString();
                        MultiUpdate[0].profileRevision = athena.rvn;
                        MultiUpdate[0].profileCommandRevision = athena.commandRevision;
                    }
                    break;
            }
    
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        //        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile, [`profiles.athena`]: athena } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        notifications: Notifications,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        multiUpdate: MultiUpdate,
        responseVersion: 1
    });
    if (ApplyProfileChanges.length > 0 || MultiUpdate[0].length > 0) {
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile, [`profiles.athena`]: athena } });
    }
});
app.post("/fortnite/api/game/v2/profile/*/client/MarkItemSeen", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);
    if (req.query.profileId == "athena")
        profile.stats.attributes.season_num = memory.season;
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let missingFields = checkFields(["itemIds"], req.body);
    if (missingFields.fields.length > 0)
        return error.createError("errors.com.epicgames.validation.validation_failed", `The BattleBundle has been disabled on Agent. Purchase the other option!`, [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res);
    if (!Array.isArray(req.body.itemIds))
        return ValidationError("itemIds", "an array", res);
    if (!profile.items)
        profile.items = {};
    for (let i in req.body.itemIds) {
        if (!profile.items[req.body.itemIds[i]])
            continue;
        profile.items[req.body.itemIds[i]].attributes.item_seen = true;
        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.itemIds[i],
            "attributeName": "item_seen",
            "attributeValue": true
        });
    }
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        //        await profiles.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});
app.post("/fortnite/api/game/v2/profile/*/client/SetItemFavoriteStatusBatch", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    if (req.query.profileId != "athena")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `SetItemFavoriteStatusBatch is not valid on ${req.query.profileId} profile`, ["SetItemFavoriteStatusBatch", req.query.profileId], 12801, undefined, 400, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);
    if (req.query.profileId == "athena")
        profile.stats.attributes.season_num = memory.season;
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let missingFields = checkFields(["itemIds", "itemFavStatus"], req.body);
    if (missingFields.fields.length > 0)
        return error.createError("errors.com.epicgames.validation.validation_failed", `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`, [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res);
    if (!Array.isArray(req.body.itemIds))
        return ValidationError("itemIds", "an array", res);
    if (!Array.isArray(req.body.itemFavStatus))
        return ValidationError("itemFavStatus", "an array", res);
    if (!profile.items)
        profile.items = {};
    for (let i in req.body.itemIds) {
        if (!profile.items[req.body.itemIds[i]])
            continue;
        if (typeof req.body.itemFavStatus[i] != "boolean")
            continue;
        profile.items[req.body.itemIds[i]].attributes.favorite = req.body.itemFavStatus[i];
        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": req.body.itemIds[i],
            "attributeName": "favorite",
            "attributeValue": profile.items[req.body.itemIds[i]].attributes.favorite
        });
    }
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        //        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});
app.post("/fortnite/api/game/v2/profile/*/client/SetBattleRoyaleBanner", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    if (req.query.profileId != "athena")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `SetBattleRoyaleBanner is not valid on ${req.query.profileId} profile`, ["SetBattleRoyaleBanner", req.query.profileId], 12801, undefined, 400, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);
    if (req.query.profileId == "athena")
        profile.stats.attributes.season_num = memory.season;
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let missingFields = checkFields(["homebaseBannerIconId", "homebaseBannerColorId"], req.body);
    if (missingFields.fields.length > 0)
        return error.createError("errors.com.epicgames.validation.validation_failed", `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`, [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res);
    if (typeof req.body.homebaseBannerIconId != "string")
        return ValidationError("homebaseBannerIconId", "a string", res);
    if (typeof req.body.homebaseBannerColorId != "string")
        return ValidationError("homebaseBannerColorId", "a string", res);
    let bannerProfileId = memory.build < 3.5 ? "profile0" : "common_core";
    let HomebaseBannerIconID = "";
    let HomebaseBannerColorID = "";
    if (!profiles?.profiles[bannerProfileId].items) {
        if (profiles) {
            profiles.profiles[bannerProfileId].items = {};
        }
    }
    for (let itemId in profiles?.profiles[bannerProfileId].items) {
        let templateId = profiles?.profiles[bannerProfileId].items[itemId].templateId;
        if (templateId.toLowerCase() == `HomebaseBannerIcon:${req.body.homebaseBannerIconId}`.toLowerCase()) {
            HomebaseBannerIconID = itemId;
            continue;
        }
        if (templateId.toLowerCase() == `HomebaseBannerColor:${req.body.homebaseBannerColorId}`.toLowerCase()) {
            HomebaseBannerColorID = itemId;
            continue;
        }
        if (HomebaseBannerIconID && HomebaseBannerColorID)
            break;
    }
    if (!HomebaseBannerIconID)
        return error.createError("errors.com.epicgames.fortnite.item_not_found", `Banner template 'HomebaseBannerIcon:${req.body.homebaseBannerIconId}' not found in profile`, [`HomebaseBannerIcon:${req.body.homebaseBannerIconId}`], 16006, undefined, 400, res);
    if (!HomebaseBannerColorID)
        return error.createError("errors.com.epicgames.fortnite.item_not_found", `Banner template 'HomebaseBannerColor:${req.body.homebaseBannerColorId}' not found in profile`, [`HomebaseBannerColor:${req.body.homebaseBannerColorId}`], 16006, undefined, 400, res);
    if (!profile.items)
        profile.items = {};
    let activeLoadoutId = profile.stats.attributes.loadouts[profile.stats.attributes.active_loadout_index];
    profile.stats.attributes.banner_icon = req.body.homebaseBannerIconId;
    profile.stats.attributes.banner_color = req.body.homebaseBannerColorId;
    profile.items[activeLoadoutId].attributes.banner_icon_template = req.body.homebaseBannerIconId;
    profile.items[activeLoadoutId].attributes.banner_color_template = req.body.homebaseBannerColorId;
    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "banner_icon",
        "value": profile.stats.attributes.banner_icon
    });
    ApplyProfileChanges.push({
        "changeType": "statModified",
        "name": "banner_color",
        "value": profile.stats.attributes.banner_color
    });
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        //        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});
app.post("/fortnite/api/game/v2/profile/*/client/EquipBattleRoyaleCustomization", verifyToken, async (req, res) => {
    log.debug("Body: " + JSON.stringify(req.body));
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    if (req.query.profileId != "athena")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `EquipBattleRoyaleCustomization is not valid on ${req.query.profileId} profile`, ["EquipBattleRoyaleCustomization", req.query.profileId], 12801, undefined, 400, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);
    if (req.query.profileId == "athena")
        profile.stats.attributes.season_num = memory.season;
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let specialCosmetics = [
        "AthenaCharacter:cid_random",
        "AthenaBackpack:bid_random",
        "AthenaPickaxe:pickaxe_random",
        "AthenaGlider:glider_random",
        "AthenaSkyDiveContrail:trails_random",
        "AthenaItemWrap:wrap_random",
        "AthenaMusicPack:musicpack_random",
        "AthenaLoadingScreen:lsid_random"
    ];
    let missingFields = checkFields(["slotName"], req.body);
    if (missingFields.fields.length > 0)
        return error.createError("errors.com.epicgames.validation.validation_failed", `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`, [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res);
    if (typeof req.body.itemToSlot != "string")
        return ValidationError("itemToSlot", "a string", res);
    if (typeof req.body.indexWithinSlot != "number" && memory.season > 1)
        return ValidationError("indexWithinSlot", "a number", res);
    if (typeof req.body.slotName != "string")
        return ValidationError("slotName", "a string", res);
    if (!profile.items)
        profile.items = {};
    if (!profile.items[req.body.itemToSlot] && req.body.itemToSlot) {
        let item = req.body.itemToSlot;
        if (!specialCosmetics.includes(item)) {
            return error.createError("errors.com.epicgames.fortnite.id_invalid", `Item (id: '${req.body.itemToSlot}') not found`, [req.body.itemToSlot], 16027, undefined, 400, res);
        }
        else {
            if (!item.startsWith(`Athena${req.body.slotName}:`))
                return error.createError("errors.com.epicgames.fortnite.id_invalid", `Cannot slot item of type ${item.split(":")[0]} in slot of category ${req.body.slotName}`, [item.split(":")[0], req.body.slotName], 16027, undefined, 400, res);
        }
    }
    if (profile.items[req.body.itemToSlot]) {
        if (!profile.items[req.body.itemToSlot].templateId.startsWith(`Athena${req.body.slotName}:`))
            return error.createError("errors.com.epicgames.fortnite.id_invalid", `Cannot slot item of type ${profile.items[req.body.itemToSlot].templateId.split(":")[0]} in slot of category ${req.body.slotName}`, [profile.items[req.body.itemToSlot].templateId.split(":")[0], req.body.slotName], 16027, undefined, 400, res);
        let Variants = req.body.variantUpdates;
        if (Array.isArray(Variants)) {
            for (let i in Variants) {
                if (typeof Variants[i] != "object")
                    continue;
                if (!Variants[i].channel)
                    continue;
                if (!Variants[i].active)
                    continue;
                let index = profile.items[req.body.itemToSlot].attributes.variants.findIndex(x => x.channel == Variants[i].channel);
                var customSkin = /^([0-9a-f]{8,8})\-([0-9a-f]{4,4}-){3}[0-9a-f]{12,12}$/.test(req.body.itemToSlot);
                if (!customSkin && index == -1)
                    continue;
                if (!customSkin && !profile.items[req.body.itemToSlot].attributes.variants[index].owned.includes(Variants[i].active))
                    continue;
                if (customSkin && (index == -1 || !profile.items[req.body.itemToSlot].attributes.variants[index])) {
                    index = i;
                    profile.items[req.body.itemToSlot].attributes.variants[index] = Variants[i];
                    profile.items[req.body.itemToSlot].attributes.variants[index].owned.push(Variants[i].active);
                }
                profile.items[req.body.itemToSlot].attributes.variants[index].active = Variants[i].active;
            }
            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": req.body.itemToSlot,
                "attributeName": "variants",
                "attributeValue": profile.items[req.body.itemToSlot].attributes.variants
            });
        }
    }
    let slotNames = ["Character", "Backpack", "Pickaxe", "Glider", "SkyDiveContrail", "MusicPack", "LoadingScreen"];
    let activeLoadoutId = profile.stats.attributes.loadouts[profile.stats.attributes.active_loadout_index];
    let templateId = profile.items[req.body.itemToSlot] ? profile.items[req.body.itemToSlot].templateId : req.body.itemToSlot;
    switch (req.body.slotName) {
        case "Dance":
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName])
                break;
            if (typeof req.body.indexWithinSlot != "number")
                return ValidationError("indexWithinSlot", "a number", res);
            if (req.body.indexWithinSlot >= 0 && req.body.indexWithinSlot <= 5) {
                profile.stats.attributes.favorite_dance[req.body.indexWithinSlot] = req.body.itemToSlot;
                profile.items[activeLoadoutId].attributes.locker_slots_data.slots.Dance.items[req.body.indexWithinSlot] = templateId;
                ApplyProfileChanges.push({
                    "changeType": "statModified",
                    "name": "favorite_dance",
                    "value": profile.stats.attributes["favorite_dance"]
                });
            }
            break;
        case "ItemWrap":
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName])
                break;
            if (typeof req.body.indexWithinSlot != "number")
                return ValidationError("indexWithinSlot", "a number", res);
            switch (true) {
                case req.body.indexWithinSlot >= 0 && req.body.indexWithinSlot <= 7:
                    profile.stats.attributes.favorite_itemwraps[req.body.indexWithinSlot] = req.body.itemToSlot;
                    profile.items[activeLoadoutId].attributes.locker_slots_data.slots.ItemWrap.items[req.body.indexWithinSlot] = templateId;
                    ApplyProfileChanges.push({
                        "changeType": "statModified",
                        "name": "favorite_itemwraps",
                        "value": profile.stats.attributes["favorite_itemwraps"]
                    });
                    break;
                case req.body.indexWithinSlot == -1:
                    for (let i = 0; i < 7; i++) {
                        profile.stats.attributes.favorite_itemwraps[i] = req.body.itemToSlot;
                        profile.items[activeLoadoutId].attributes.locker_slots_data.slots.ItemWrap.items[i] = templateId;
                    }
                    ApplyProfileChanges.push({
                        "changeType": "statModified",
                        "name": "favorite_itemwraps",
                        "value": profile.stats.attributes["favorite_itemwraps"]
                    });
                    break;
            }
            break;
        default:
            if (!slotNames.includes(req.body.slotName))
                break;
            if (!profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName])
                break;
            if (req.body.slotName == "Pickaxe" || req.body.slotName == "Glider") {
                if (!req.body.itemToSlot)
                    return error.createError("errors.com.epicgames.fortnite.id_invalid", `${req.body.slotName} can not be empty.`, [req.body.slotName], 16027, undefined, 400, res);
            }
            profile.stats.attributes[(`favorite_${req.body.slotName}`).toLowerCase()] = req.body.itemToSlot;
            profile.items[activeLoadoutId].attributes.locker_slots_data.slots[req.body.slotName].items = [templateId];
            ApplyProfileChanges.push({
                "changeType": "statModified",
                "name": (`favorite_${req.body.slotName}`).toLowerCase(),
                "value": profile.stats.attributes[(`favorite_${req.body.slotName}`).toLowerCase()]
            });
            break;
    }
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        //        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});
app.post("/fortnite/api/game/v2/profile/*/client/SetCosmeticLockerBanner", verifyToken, async (req, res) => {
    let profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    if (req.query.profileId != "athena")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `SetCosmeticLockerBanner is not valid on ${req.query.profileId} profile`, ["SetCosmeticLockerBanner", req.query.profileId], 12801, undefined, 400, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);
    if (req.query.profileId == "athena")
        profile.stats.attributes.season_num = memory.season;
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let missingFields = checkFields(["bannerIconTemplateName", "bannerColorTemplateName", "lockerItem"], req.body);
    if (missingFields.fields.length > 0)
        return error.createError("errors.com.epicgames.validation.validation_failed", `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`, [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res);
    if (typeof req.body.lockerItem != "string")
        return ValidationError("lockerItem", "a string", res);
    if (typeof req.body.bannerIconTemplateName != "string")
        return ValidationError("bannerIconTemplateName", "a string", res);
    if (typeof req.body.bannerColorTemplateName != "string")
        return ValidationError("bannerColorTemplateName", "a string", res);
    if (!profile.items)
        profile.items = {};
    if (!profile.items[req.body.lockerItem])
        return error.createError("errors.com.epicgames.fortnite.id_invalid", `Item (id: '${req.body.lockerItem}') not found`, [req.body.lockerItem], 16027, undefined, 400, res);
    if (profile.items[req.body.lockerItem].templateId.toLowerCase() != "cosmeticlocker:cosmeticlocker_athena")
        return error.createError("errors.com.epicgames.fortnite.id_invalid", `lockerItem id is not a cosmeticlocker`, ["lockerItem"], 16027, undefined, 400, res);
    let bannerProfileId = "common_core";
    let HomebaseBannerIconID = "";
    let HomebaseBannerColorID = "";
    if (!profiles?.profiles[bannerProfileId].items) {
        if (profiles?.profiles[bannerProfileId]) {
            profiles.profiles[bannerProfileId].items = {};
        }
    }
    for (let itemId in profiles?.profiles[bannerProfileId].items) {
        let templateId = profiles?.profiles[bannerProfileId].items[itemId].templateId;
        if (templateId.toLowerCase() == `HomebaseBannerIcon:${req.body.bannerIconTemplateName}`.toLowerCase()) {
            HomebaseBannerIconID = itemId;
            continue;
        }
        if (templateId.toLowerCase() == `HomebaseBannerColor:${req.body.bannerColorTemplateName}`.toLowerCase()) {
            HomebaseBannerColorID = itemId;
            continue;
        }
        if (HomebaseBannerIconID && HomebaseBannerColorID)
            break;
    }
    if (!HomebaseBannerIconID)
        return error.createError("errors.com.epicgames.fortnite.item_not_found", `Banner template 'HomebaseBannerIcon:${req.body.bannerIconTemplateName}' not found in profile`, [`HomebaseBannerIcon:${req.body.bannerIconTemplateName}`], 16006, undefined, 400, res);
    if (!HomebaseBannerColorID)
        return error.createError("errors.com.epicgames.fortnite.item_not_found", `Banner template 'HomebaseBannerColor:${req.body.bannerColorTemplateName}' not found in profile`, [`HomebaseBannerColor:${req.body.bannerColorTemplateName}`], 16006, undefined, 400, res);
    profile.items[req.body.lockerItem].attributes.banner_icon_template = req.body.bannerIconTemplateName;
    profile.items[req.body.lockerItem].attributes.banner_color_template = req.body.bannerColorTemplateName;
    profile.stats.attributes.banner_icon = req.body.bannerIconTemplateName;
    profile.stats.attributes.banner_color = req.body.bannerColorTemplateName;
    ApplyProfileChanges.push({
        "changeType": "itemAttrChanged",
        "itemId": req.body.lockerItem,
        "attributeName": "banner_icon_template",
        "attributeValue": profile.items[req.body.lockerItem].attributes.banner_icon_template
    });
    ApplyProfileChanges.push({
        "changeType": "itemAttrChanged",
        "itemId": req.body.lockerItem,
        "attributeName": "banner_color_template",
        "attributeValue": profile.items[req.body.lockerItem].attributes.banner_color_template
    });
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        //        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});
app.post("/fortnite/api/game/v2/profile/*/client/SetCosmeticLockerSlot", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    if (req.query.profileId != "athena")
        return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `SetCosmeticLockerSlot is not valid on ${req.query.profileId} profile`, ["SetCosmeticLockerSlot", req.query.profileId], 12801, undefined, 400, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);
    if (req.query.profileId == "athena")
        profile.stats.attributes.season_num = memory.season;
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    let specialCosmetics = [
        "AthenaCharacter:cid_random",
        "AthenaBackpack:bid_random",
        "AthenaPickaxe:pickaxe_random",
        "AthenaGlider:glider_random",
        "AthenaSkyDiveContrail:trails_random",
        "AthenaItemWrap:wrap_random",
        "AthenaMusicPack:musicpack_random",
        "AthenaLoadingScreen:lsid_random"
    ];
    let missingFields = checkFields(["category", "lockerItem"], req.body);
    if (missingFields.fields.length > 0)
        return error.createError("errors.com.epicgames.validation.validation_failed", `Validation Failed. [${missingFields.fields.join(", ")}] field(s) is missing.`, [`[${missingFields.fields.join(", ")}]`], 1040, undefined, 400, res);
    if (typeof req.body.itemToSlot != "string")
        return ValidationError("itemToSlot", "a string", res);
    if (typeof req.body.slotIndex != "number")
        return ValidationError("slotIndex", "a number", res);
    if (typeof req.body.lockerItem != "string")
        return ValidationError("lockerItem", "a string", res);
    if (typeof req.body.category != "string")
        return ValidationError("category", "a string", res);
    if (!profile.items)
        profile.items = {};
    let itemToSlotID = "";
    if (req.body.itemToSlot) {
        for (let itemId in profile.items) {
            if (profile.items[itemId].templateId.toLowerCase() == req.body.itemToSlot.toLowerCase()) {
                itemToSlotID = itemId;
                break;
            }
            ;
        }
    }
    if (!profile.items[req.body.lockerItem])
        return error.createError("errors.com.epicgames.fortnite.id_invalid", `Item (id: '${req.body.lockerItem}') not found`, [req.body.lockerItem], 16027, undefined, 400, res);
    if (profile.items[req.body.lockerItem].templateId.toLowerCase() != "cosmeticlocker:cosmeticlocker_athena")
        return error.createError("errors.com.epicgames.fortnite.id_invalid", `lockerItem id is not a cosmeticlocker`, ["lockerItem"], 16027, undefined, 400, res);
    if (!profile.items[itemToSlotID] && req.body.itemToSlot) {
        let item = req.body.itemToSlot;
        if (!specialCosmetics.includes(item)) {
            return error.createError("errors.com.epicgames.fortnite.id_invalid", `Item (id: '${req.body.itemToSlot}') not found`, [req.body.itemToSlot], 16027, undefined, 400, res);
        }
        else {
            if (!item.startsWith(`Athena${req.body.category}:`))
                return error.createError("errors.com.epicgames.fortnite.id_invalid", `Cannot slot item of type ${item.split(":")[0]} in slot of category ${req.body.category}`, [item.split(":")[0], req.body.category], 16027, undefined, 400, res);
        }
    }
    if (profile.items[itemToSlotID]) {
        if (!profile.items[itemToSlotID].templateId.startsWith(`Athena${req.body.category}:`))
            return error.createError("errors.com.epicgames.fortnite.id_invalid", `Cannot slot item of type ${profile.items[itemToSlotID].templateId.split(":")[0]} in slot of category ${req.body.category}`, [profile.items[itemToSlotID].templateId.split(":")[0], req.body.category], 16027, undefined, 400, res);
        let Variants = req.body.variantUpdates;
        log.debug(Variants);
        log.debug(itemToSlotID);
        if (Array.isArray(Variants)) {
            for (let i in Variants) {
                if (typeof Variants[i] != "object")
                    continue;
                if (!Variants[i].channel)
                    continue;
                if (!Variants[i].active)
                    continue;
                let index = profile.items[itemToSlotID].attributes.variants.findIndex(x => x.channel == Variants[i].channel);
                if (Variants[i].channel.startsWith("RichColor") || Variants[i].channel.startsWith("Numeric")) {
                    if (index == -1) {
                        profile.items[itemToSlotID].attributes.variants.push(Variants[i]);
                        index = profile.items[itemToSlotID].attributes.variants.findIndex(x => x.channel == Variants[i].channel);
                    }
                    var a = profile.items[itemToSlotID].attributes.variants[index].owned.findIndex(x => x == Variants[i].active/*.replace("RichColor.", "")*/);
                    if (a == -1) {
                        profile.items[itemToSlotID].attributes.variants[index].owned.push(Variants[i].active/*.replace("RichColor.", "")*/);
                    }
                    Variants[i].active = Variants[i].active/*.replace("RichColor.", "")*/;
                } else {
                    Variants[i].active = Variants[i].active.replace("Color.", "");
                }
                if (index == -1)
                    continue;
                if (!profile.items[itemToSlotID].attributes.variants[index].owned.includes(Variants[i].active))
                    continue;
                    log.debug(`${profile.items[itemToSlotID].attributes.variants[index].active} -> ${Variants[i].active}`)
                profile.items[itemToSlotID].attributes.variants[index].active = Variants[i].active;
            }
            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": itemToSlotID,
                "attributeName": "variants",
                "attributeValue": profile.items[itemToSlotID].attributes.variants
            });
        }
    }
    switch (req.body.category) {
        case "Dance":
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category])
                break;
            if (req.body.slotIndex >= 0 && req.body.slotIndex <= 5) {
                profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.Dance.items[req.body.slotIndex] = req.body.itemToSlot;
                profile.stats.attributes.favorite_dance[req.body.slotIndex] = itemToSlotID || req.body.itemToSlot;
                ApplyProfileChanges.push({
                    "changeType": "itemAttrChanged",
                    "itemId": req.body.lockerItem,
                    "attributeName": "locker_slots_data",
                    "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
                });
            }
            break;
        case "ItemWrap":
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category])
                break;
            switch (true) {
                case req.body.slotIndex >= 0 && req.body.slotIndex <= 7:
                    profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.ItemWrap.items[req.body.slotIndex] = req.body.itemToSlot;
                    profile.stats.attributes.favorite_itemwraps[req.body.slotIndex] = itemToSlotID || req.body.itemToSlot;
                    ApplyProfileChanges.push({
                        "changeType": "itemAttrChanged",
                        "itemId": req.body.lockerItem,
                        "attributeName": "locker_slots_data",
                        "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
                    });
                    break;
                case req.body.slotIndex == -1:
                    for (let i = 0; i < 7; i++) {
                        profile.items[req.body.lockerItem].attributes.locker_slots_data.slots.ItemWrap.items[i] = req.body.itemToSlot;
                        profile.stats.attributes.favorite_itemwraps[i] = itemToSlotID || req.body.itemToSlot;
                    }
                    ApplyProfileChanges.push({
                        "changeType": "itemAttrChanged",
                        "itemId": req.body.lockerItem,
                        "attributeName": "locker_slots_data",
                        "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
                    });
                    break;
            }
            break;
        default:
            if (!profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category])
                break;
            if (req.body.category == "Pickaxe" || req.body.category == "Glider") {
                if (!req.body.itemToSlot)
                    return error.createError("errors.com.epicgames.fortnite.id_invalid", `${req.body.category} can not be empty.`, [req.body.category], 16027, undefined, 400, res);
            }
            profile.items[req.body.lockerItem].attributes.locker_slots_data.slots[req.body.category].items = [req.body.itemToSlot];
            profile.stats.attributes[(`favorite_${req.body.category}`).toLowerCase()] = itemToSlotID || req.body.itemToSlot;
            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": req.body.lockerItem,
                "attributeName": "locker_slots_data",
                "attributeValue": profile.items[req.body.lockerItem].attributes.locker_slots_data
            });
            break;
    }
    if (ApplyProfileChanges.length > 0) {
        profile.rvn += 1;
        profile.commandRevision += 1;
        profile.updated = new Date().toISOString();
        //        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } });
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        responseVersion: 1
    });
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});

app.post("/fortnite/api/game/v2/profile/*/client/AthenaPinQuest", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (profile.stats.attributes.hasOwnProperty("pinned_quest")) {
        profile.stats.attributes.pinned_quest = req.body.pinnedQuest || "";
        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "pinned_quest",
            "value": profile.stats.attributes.pinned_quest
        })

        //fs.writeFileSync(`./profiles/${req.query.profileId || "athena"}.json`, JSON.stringify(profile, null, 2));
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        "profileRevision": profile.rvn || 0,
        "profileId": req.query.profileId || "athena",
        "profileChangesBaseRevision": BaseRevision,
        "profileChanges": ApplyProfileChanges,
        "profileCommandRevision": profile.commandRevision || 0,
        "serverTime": new Date().toISOString(),
        "responseVersion": 1
    })
    res.end();
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});

// Set pinned STW quests
app.post("/fortnite/api/game/v2/profile/*/client/SetPinnedQuests", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (req.body.pinnedQuestIds) {
        profile.stats.attributes.client_settings.pinnedQuestInstances = req.body.pinnedQuestIds;
        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "client_settings",
            "value": profile.stats.attributes.client_settings
        })

        //fs.writeFileSync(`./profiles/${req.query.profileId || "campaign"}.json`, JSON.stringify(profile, null, 2));
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        "profileRevision": profile.rvn || 0,
        "profileId": req.query.profileId || "campaign",
        "profileChangesBaseRevision": BaseRevision,
        "profileChanges": ApplyProfileChanges,
        "profileCommandRevision": profile.commandRevision || 0,
        "serverTime": new Date().toISOString(),
        "responseVersion": 1
    })
    res.end();
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});

// Replace Daily Quests
app.post("/fortnite/api/game/v2/profile/*/client/FortRerollDailyQuest", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    //const profile = require(`./../profiles/${req.query.profileId || "athena"}.json`);
    var DailyQuestIDS = JSON.parse(JSON.stringify(require("../../responses/quests.json")));
    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var Notifications = [];
    var BaseRevision = profile.rvn || 0;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (req.query.profileId == "profile0" || req.query.profileId == "campaign") {
        DailyQuestIDS = DailyQuestIDS.SaveTheWorld.Daily
    }

    if (req.query.profileId == "athena") {
        DailyQuestIDS = DailyQuestIDS.BattleRoyale.Daily
    }

    const NewQuestID = functions.MakeID();
    var randomNumber = Math.floor(Math.random() * DailyQuestIDS.length);

    for (var key in profile.items) {
        while (DailyQuestIDS[randomNumber].templateId.toLowerCase() == profile.items[key].templateId.toLowerCase()) {
            randomNumber = Math.floor(Math.random() * DailyQuestIDS.length);
        }
    }

    if (req.body.questId && profile.stats.attributes.quest_manager.dailyQuestRerolls >= 1) {
        profile.stats.attributes.quest_manager.dailyQuestRerolls -= 1;

        delete profile.items[req.body.questId];

        profile.items[NewQuestID] = {
            "templateId": DailyQuestIDS[randomNumber].templateId,
            "attributes": {
                "creation_time": new Date().toISOString(),
                "level": -1,
                "item_seen": false,
                "playlists": [],
                "sent_new_notification": false,
                "challenge_bundle_id": "",
                "xp_reward_scalar": 1,
                "challenge_linked_quest_given": "",
                "quest_pool": "",
                "quest_state": "Active",
                "bucket": "",
                "last_state_change_time": new Date().toISOString(),
                "challenge_linked_quest_parent": "",
                "max_level_bonus": 0,
                "xp": 0,
                "quest_rarity": "uncommon",
                "favorite": false
            },
            "quantity": 1
        };

        for (var i in DailyQuestIDS[randomNumber].objectives) {
            profile.items[NewQuestID].attributes[`completion_${DailyQuestIDS[randomNumber].objectives[i].toLowerCase()}`] = 0
        }

        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        ApplyProfileChanges.push({
            "changeType": "statModified",
            "name": "quest_manager",
            "value": profile.stats.attributes.quest_manager
        })

        ApplyProfileChanges.push({
            "changeType": "itemAdded",
            "itemId": NewQuestID,
            "item": profile.items[NewQuestID]
        })

        ApplyProfileChanges.push({
            "changeType": "itemRemoved",
            "itemId": req.body.questId
        })

        Notifications.push({
            "type": "dailyQuestReroll",
            "primary": true,
            "newQuestId": DailyQuestIDS[randomNumber].templateId
        })

        //await Profile.findOneAndUpdate({ accountId: req.user.accountId }, { $set: profiles }, { upsert: true });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        "profileRevision": profile.rvn || 0,
        "profileId": req.query.profileId || "athena",
        "profileChangesBaseRevision": BaseRevision,
        "profileChanges": ApplyProfileChanges,
        "notifications": Notifications,
        "profileCommandRevision": profile.commandRevision || 0,
        "serverTime": new Date().toISOString(),
        "responseVersion": 1
    })
    res.end();
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});

// Mark New Quest Notification Sent
app.post("/fortnite/api/game/v2/profile/*/client/MarkNewQuestNotificationSent", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    if (req.body.itemIds) {
        for (var i in req.body.itemIds) {
            var id = req.body.itemIds[i];

            profile.items[id].attributes.sent_new_notification = true

            ApplyProfileChanges.push({
                "changeType": "itemAttrChanged",
                "itemId": id,
                "attributeName": "sent_new_notification",
                "attributeValue": true
            })
        }

        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        await Profile.findOneAndUpdate({ accountId: req.user.accountId }, { $set: profiles }, { upsert: true });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        "profileRevision": profile.rvn || 0,
        "profileId": req.query.profileId || "athena",
        "profileChangesBaseRevision": BaseRevision,
        "profileChanges": ApplyProfileChanges,
        "profileCommandRevision": profile.commandRevision || 0,
        "serverTime": new Date().toISOString(),
        "responseVersion": 1
    })
    res.end();
    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});

app.post("/fortnite/api/game/v2/profile/*/client/UpdateQuestClientObjectives", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    console.log(req.body);
    for (var adv of req.body.advance) {
        var s = adv.statName.split("_");
        if (!Number.isNaN(parseInt(s[s.length - 1]))) s.pop();
        var q = `S${memory.season}-Quest:${s.join("_")}`;
        //var i = Object.keys(profile.items).findIndex(f => f.toLowerCase() == q.toLowerCase());
        var n = Object.keys(profile.items).find(f => f.toLowerCase() == q.toLowerCase());
        //var v = Object.values(profile.items)[i];
        console.log(profile.items[n]);
        profile.items[n].attributes[`completion_${adv.statName}`] = adv.count;
        profile.items[n].attributes.last_state_change_time = new Date().toISOString();
        //if (v.attributes.xp == 0) v.attributes.xp == 40000;
        /*var attributes = profile.stats.attributes;
        let newXp = attributes.xp + v.attributes.xp;
        let newLevel = attributes.level;
        let removedXP = 0;
        let doingLoop = true;

        while (doingLoop) {
            const progressionReq = newLevel == 1 ? 10000 : 50000;

            if (newXp >= progressionReq) {
                newXp = newXp - progressionReq;
                removedXP += progressionReq;
                newLevel++;
            } else {
                doingLoop = false;
            }
        }

        profile.stats.attributes.xp = newXp;
        profile.stats.attributes.book_xp = newXp;
        profile.stats.attributes.level = newLevel;
        profile.stats.attributes.book_level = newLevel;*/

        //var e = Object.entries(profile.items);
        //e[i][1] = v;
        //profile.items = Object.fromEntries(e);
        

        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": n,
            "attributeName": `completion_${adv.statName}`,
            "attributeValue": profile.items[n].attributes[`completion_${adv.statName}`]
        });

        ApplyProfileChanges.push({
            "changeType": "itemAttrChanged",
            "itemId": n,
            "attributeName": "last_state_change_time",
            "attributeValue": profile.items[n].attributes.last_state_change_time
        });

        StatChanged = true;
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        //await Profile.findOneAndUpdate({ accountId: req.user.accountId }, { $set: profiles }, { upsert: true });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        "profileRevision": profile.rvn || 0,
        "profileId": req.query.profileId || "athena",
        "profileChangesBaseRevision": BaseRevision,
        "profileChanges": ApplyProfileChanges,
        "profileCommandRevision": profile.commandRevision || 0,
        "serverTime": new Date().toISOString(),
        "responseVersion": 1
    })
    res.end();

    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});

// Check for new quests
/*app.post("/fortnite/api/game/v2/profile/* /client/ClientQuestLogin", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    var QuestIDS = JSON.parse(JSON.stringify(require("../../responses/quests.json")));
    const memory = functions.GetVersionInfo(req);

    // do not change any of these or you will end up breaking it
    var ApplyProfileChanges = [];
    var BaseRevision = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    var QueryRevision = req.query.rvn || -1;
    var StatChanged = false;

    var QuestCount = 0;
    var ShouldGiveQuest = true;
    var DateFormat = (new Date().toISOString()).split("T")[0];
    var DailyQuestIDS;
    var SeasonQuestIDS;

    let config = {
        Profile: {
            bCompletedSeasonalQuests: false,
            bGrantFoundersPacks: false
        }
    }

    try {
        if (req.query.profileId == "profile0" || req.query.profileId == "campaign") {
            DailyQuestIDS = QuestIDS.SaveTheWorld.Daily

            if (QuestIDS.SaveTheWorld.hasOwnProperty(`Season${memory.season}`)) {
                SeasonQuestIDS = QuestIDS.SaveTheWorld[`Season${memory.season}`]
            }

            for (var key in profile.items) {
                if (profile.items[key].templateId.toLowerCase().startsWith("quest:daily")) {
                    QuestCount += 1;
                }
            }

            // Grant completed founder's pack quests.
            if (config.Profile.bGrantFoundersPacks == true) {
                var QuestsToGrant = [
                    "Quest:foundersquest_getrewards_0_1",
                    "Quest:foundersquest_getrewards_1_2",
                    "Quest:foundersquest_getrewards_2_3",
                    "Quest:foundersquest_getrewards_3_4",
                    "Quest:foundersquest_chooseherobundle",
                    "Quest:foundersquest_getrewards_4_5",
                    "Quest:foundersquest_herobundle_nochoice"
                ]

                for (var i in QuestsToGrant) {
                    var bSkipThisQuest = false;
                    for (var key in profile.items) {
                        if (profile.items[key].templateId.toLowerCase() == QuestsToGrant[i].toLowerCase()) {
                            bSkipThisQuest = true;
                        }
                    }
                    if (bSkipThisQuest == true) {
                        continue;
                    }

                    var ItemID = functions.MakeID();
                    var Item = {
                        "templateId": QuestsToGrant[i],
                        "attributes": {
                            "creation_time": "min",
                            "quest_state": "Completed",
                            "last_state_change_time": new Date().toISOString(),
                            "level": -1,
                            "sent_new_notification": true,
                            "quest_rarity": "uncommon",
                            "xp_reward_scalar": 1
                        },
                        "quantity": 1
                    }
                    profile.items[ItemID] = Item
                    ApplyProfileChanges.push({
                        "changeType": "itemAdded",
                        "itemId": ItemID,
                        "item": Item
                    })
                    StatChanged = true;
                }
            }
        }

        if (req.query.profileId == "athena") {
            DailyQuestIDS = QuestIDS.BattleRoyale.Daily

            if (QuestIDS.BattleRoyale.hasOwnProperty(`Season${memory.season}`)) {
                SeasonQuestIDS = QuestIDS.BattleRoyale[`Season${memory.season}`]
            }

            for (var key in profile.items) {
                if (profile.items[key].templateId.toLowerCase().startsWith("quest:athenadaily")) {
                    QuestCount += 1;
                }
            }
        }

        if (profile.stats.attributes.hasOwnProperty("quest_manager")) {
            if (profile.stats.attributes.quest_manager.hasOwnProperty("dailyLoginInterval")) {
                if (profile.stats.attributes.quest_manager.dailyLoginInterval.includes("T")) {
                    var DailyLoginDate = (profile.stats.attributes.quest_manager.dailyLoginInterval).split("T")[0];

                    if (DailyLoginDate == DateFormat) {
                        ShouldGiveQuest = false;
                    } else {
                        ShouldGiveQuest = true;
                        if (profile.stats.attributes.quest_manager.dailyQuestRerolls <= 0) {
                            profile.stats.attributes.quest_manager.dailyQuestRerolls += 1;
                        }
                    }
                }
            }
        }

        if (QuestCount < 3 && ShouldGiveQuest == true) {
            const NewQuestID = functions.MakeID();
            var randomNumber = Math.floor(Math.random() * DailyQuestIDS.length);

            for (var key in profile.items) {
                while (DailyQuestIDS[randomNumber].templateId.toLowerCase() == profile.items[key].templateId.toLowerCase()) {
                    randomNumber = Math.floor(Math.random() * DailyQuestIDS.length);
                }
            }

            profile.items[NewQuestID] = {
                "templateId": DailyQuestIDS[randomNumber].templateId,
                "attributes": {
                    "creation_time": new Date().toISOString(),
                    "level": -1,
                    "item_seen": false,
                    "playlists": [],
                    "sent_new_notification": false,
                    "challenge_bundle_id": "",
                    "xp_reward_scalar": 1,
                    "challenge_linked_quest_given": "",
                    "quest_pool": "",
                    "quest_state": "Active",
                    "bucket": "",
                    "last_state_change_time": new Date().toISOString(),
                    "challenge_linked_quest_parent": "",
                    "max_level_bonus": 0,
                    "xp": 40000,
                    "quest_rarity": "uncommon",
                    "favorite": false
                },
                "quantity": 1
            };

            for (var i in DailyQuestIDS[randomNumber].objectives) {
                profile.items[NewQuestID].attributes[`completion_${DailyQuestIDS[randomNumber].objectives[i].toLowerCase()}`] = 0
            }

            profile.stats.attributes.quest_manager.dailyLoginInterval = new Date().toISOString();

            ApplyProfileChanges.push({
                "changeType": "itemAdded",
                "itemId": NewQuestID,
                "item": profile.items[NewQuestID]
            })

            ApplyProfileChanges.push({
                "changeType": "statModified",
                "name": "quest_manager",
                "value": profile.stats.attributes.quest_manager
            })

            StatChanged = true;
        }
    } catch (err) {}

    /*for (var key in profile.items) {
        if (key.split("")[0] == "S" && (Number.isInteger(Number(key.split("")[1]))) && (key.split("")[2] == "-" || (Number.isInteger(Number(key.split("")[2])) && key.split("")[3] == "-"))) {
            if (!key.startsWith(`S${memory.season}-`)) {
                delete profile.items[key];

                ApplyProfileChanges.push({
                    "changeType": "itemRemoved",
                    "itemId": key
                })

                StatChanged = true;
            }
        }
    }* /

    if (SeasonQuestIDS) {
        if (req.query.profileId == "athena") {
            for (var ChallengeBundleSchedule in SeasonQuestIDS.ChallengeBundleSchedules) {
                ChallengeBundleSchedule = SeasonQuestIDS.ChallengeBundleSchedules[ChallengeBundleSchedule];
                if (profile.items.hasOwnProperty(ChallengeBundleSchedule.itemGuid)) {
                    /*ApplyProfileChanges.push({
                        "changeType": "itemRemoved",
                        "itemId": ChallengeBundleSchedule.itemGuid
                    })* /
                    continue;
                }

                profile.items[ChallengeBundleSchedule.itemGuid] = {
                    "templateId": ChallengeBundleSchedule.templateId,
                    "attributes": {
                        "unlock_epoch": new Date().toISOString(),
                        "max_level_bonus": 0,
                        "level": 1,
                        "item_seen": true,
                        "xp": 40000,
                        "favorite": false,
                        "granted_bundles": ChallengeBundleSchedule.granted_bundles
                    },
                    "quantity": 1
                }

                ApplyProfileChanges.push({
                    "changeType": "itemAdded",
                    "itemId": ChallengeBundleSchedule.itemGuid,
                    "item": profile.items[ChallengeBundleSchedule.itemGuid]
                })

                StatChanged = true;
            }

            for (var ChallengeBundle in SeasonQuestIDS.ChallengeBundles) {
                ChallengeBundle = SeasonQuestIDS.ChallengeBundles[ChallengeBundle];
                if (profile.items.hasOwnProperty(ChallengeBundle.itemGuid)) {
                    /*ApplyProfileChanges.push({
                        "changeType": "itemRemoved",
                        "itemId": ChallengeBundle.itemGuid
                    })* /
                    continue;
                }

                if (config.Profile.bCompletedSeasonalQuests == true && ChallengeBundle.hasOwnProperty("questStages")) {
                    ChallengeBundle.grantedquestinstanceids = ChallengeBundle.grantedquestinstanceids.concat(ChallengeBundle.questStages);
                }

                profile.items[ChallengeBundle.itemGuid] = {
                    "templateId": ChallengeBundle.templateId,
                    "attributes": {
                        "has_unlock_by_completion": false,
                        "num_quests_completed": 0,
                        "level": 0,
                        "grantedquestinstanceids": ChallengeBundle.grantedquestinstanceids,
                        "item_seen": true,
                        "max_allowed_bundle_level": 0,
                        "num_granted_bundle_quests": 0,
                        "max_level_bonus": 0,
                        "challenge_bundle_schedule_id": ChallengeBundle.challenge_bundle_schedule_id,
                        "num_progress_quests_completed": 0,
                        "xp": 40000,
                        "favorite": false
                    },
                    "quantity": 1
                }

                profile.items[ChallengeBundle.itemGuid].attributes.num_granted_bundle_quests = ChallengeBundle.grantedquestinstanceids.length;

                if (config.Profile.bCompletedSeasonalQuests == true) {
                    profile.items[ChallengeBundle.itemGuid].attributes.num_quests_completed = ChallengeBundle.grantedquestinstanceids.length;
                    profile.items[ChallengeBundle.itemGuid].attributes.num_progress_quests_completed = ChallengeBundle.grantedquestinstanceids.length;
                }

                ApplyProfileChanges.push({
                    "changeType": "itemAdded",
                    "itemId": ChallengeBundle.itemGuid,
                    "item": profile.items[ChallengeBundle.itemGuid]
                })

                StatChanged = true;
            }
        }

        for (var Quest in SeasonQuestIDS.Quests) {
            Quest = SeasonQuestIDS.Quests[Quest];
            if (profile.items.hasOwnProperty(Quest.itemGuid)) {
                /*ApplyProfileChanges.push({
                    "changeType": "itemRemoved",
                    "itemId": Quest.itemGuid
                })* /
                continue;
            }

            profile.items[Quest.itemGuid] = {
                "templateId": Quest.templateId,
                "attributes": {
                    "creation_time": new Date().toISOString(),
                    "level": -1,
                    "item_seen": true,
                    "playlists": [],
                    "sent_new_notification": true,
                    "challenge_bundle_id": Quest.challenge_bundle_id || "",
                    "xp_reward_scalar": 1,
                    "challenge_linked_quest_given": "",
                    "quest_pool": "",
                    "quest_state": "Active",
                    "bucket": "",
                    "last_state_change_time": new Date().toISOString(),
                    "challenge_linked_quest_parent": "",
                    "max_level_bonus": 0,
                    "xp": 40000,
                    "quest_rarity": "uncommon",
                    "favorite": false
                },
                "quantity": 1
            }

            if (config.Profile.bCompletedSeasonalQuests == true) {
                profile.items[Quest.itemGuid].attributes.quest_state = "Claimed";
            }

            for (var i in Quest.objectives) {
                if (config.Profile.bCompletedSeasonalQuests == true) {
                    profile.items[Quest.itemGuid].attributes[`completion_${Quest.objectives[i].name.toLowerCase()}`] = Quest.objectives[i].count;
                } else {
                    profile.items[Quest.itemGuid].attributes[`completion_${Quest.objectives[i].name.toLowerCase()}`] = 0;
                }
            }

            ApplyProfileChanges.push({
                "changeType": "itemAdded",
                "itemId": Quest.itemGuid,
                "item": profile.items[Quest.itemGuid]
            })

            StatChanged = true;
        }
    }

    if (StatChanged == true) {
        profile.rvn += 1;
        profile.commandRevision += 1;

        //await Profile.findOneAndUpdate({ accountId: req.user.accountId }, { $set: profiles }, { upsert: true });
    }

    // this doesn't work properly on version v12.20 and above but whatever
    if (QueryRevision != BaseRevision) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }

    res.json({
        "profileRevision": profile.rvn || 0,
        "profileId": req.query.profileId || "athena",
        "profileChangesBaseRevision": BaseRevision,
        "profileChanges": ApplyProfileChanges,
        "profileCommandRevision": profile.commandRevision || 0,
        "serverTime": new Date().toISOString(),
        "responseVersion": 1
    })
    res.end();

    console.log(ApplyProfileChanges);

    if (ApplyProfileChanges.length > 0)
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
});*/

app.post("/fortnite/api/game/v2/profile/*/client/:operation", verifyToken, async (req, res) => {
    const profiles = await Profile.findOne({ accountId: req.user.accountId })
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    if (profile.rvn == profile.commandRevision) {
        profile.rvn += 1;
        if (req.query.profileId == "athena") {
            if (!profile.stats.attributes.last_applied_loadout)
                profile.stats.attributes.last_applied_loadout = profile.stats.attributes.loadouts[0];
        }
        await profiles?.updateOne({ $set: { [`profiles.${req.query.profileId}`]: profile } })
    }
    const memory = functions.GetVersionInfo(req);
    if (req.query.profileId == "athena")
        profile.stats.attributes.season_num = memory.season;
    let MultiUpdate = [];
    if ((req.query.profileId == "common_core") && global.giftReceived[req.user.accountId]) {
        global.giftReceived[req.user.accountId] = false;
        let athena = profiles?.profiles["athena"];
        MultiUpdate = [{
                "profileRevision": athena.rvn || 0,
                "profileId": "athena",
                "profileChangesBaseRevision": athena.rvn || 0,
                "profileChanges": [{
                        "changeType": "fullProfileUpdate",
                        "profile": athena
                    }],
                "profileCommandRevision": athena.commandRevision || 0,
            }];
    }
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    switch (req.params.operation) {
        case "QueryProfile": break;
        case "ClientQuestLogin": break;
        case "RefreshExpeditions": break;
        case "GetMcpTimeForLogin": break;
        case "IncrementNamedCounterStat": break;
        case "SetHardcoreModifier": break;
        case "SetMtxPlatform": break;
        case "BulkEquipBattleRoyaleCustomization": break;
        case "ClaimMfaEnabled":
            if (profile.stats.attributes.mfa_enabled)
                return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", "MFA already enabled", [], 12813, undefined, 403, res);
            break;
        case "CopyCosmeticLoadout":
            try {
                log.debug(JSON.stringify(req.body));
                if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
                    return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
                const profileDocument = profiles;
                profile = profileDocument?.profiles[req.query.profileId];
                let item;
                if (req.body.sourceIndex == 0) {
                    item = profile.items[`momentum${req.body.targetIndex - 1}-loadout`];
                    if (!item) {
                        profile.items[`momentum${req.body.targetIndex - 1}-loadout`] = profile.items["sandbox_loadout"];
                    } /*else {
                        let n = item.attributes["locker_name"];
                        profile.items[`momentum${req.body.targetIndex - 1}-loadout`] = profile.items["sandbox_loadout"];
                        profile.items[`momentum${req.body.targetIndex - 1}-loadout`].attributes["locker_name"] = n;
                    }*/
                    var item2 = profile.items[`momentum${req.body.targetIndex - 1}-loadout`];
                    if (req.body.optNewNameForTarget != "") profile.items[`momentum${req.body.targetIndex - 1}-loadout`].attributes["locker_name"] = req.body.optNewNameForTarget;
                    profile.stats.attributes.loadouts[req.body.targetIndex] = `momentum${req.body.targetIndex - 1}-loadout`;
                    profile.stats.attributes["active_loadout_index"] = req.body.targetIndex;
                    profile.stats.attributes["last_applied_loadout"] = `momentum${req.body.targetIndex - 1}-loadout`;
                    profile.items["sandbox_loadout"].attributes["locker_slots_data"] = item2.attributes["locker_slots_data"];
                }
                else {
                    item = profile.items[`momentum${req.body.sourceIndex - 1}-loadout`];
                    if (!item)
                        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Locker item {0} not found`, [req.query.profileId], 12813, undefined, 403, res);
                    profile.stats.attributes["active_loadout_index"] = req.body.sourceIndex;
                    profile.stats.attributes["last_applied_loadout"] = `momentum${req.body.sourceIndex - 1}-loadout`;
                    profile.items["sandbox_loadout"].attributes["locker_slots_data"] = item.attributes["locker_slots_data"];
                    let n = item.attributes["locker_name"];
                    profile.items[`momentum${req.body.sourceIndex - 1}-loadout`] = profile.items["sandbox_loadout"];
                    profile.items[`momentum${req.body.sourceIndex - 1}-loadout`].attributes["locker_name"] = n;
                }
                if (profileDocument?.profiles[req.query.profileId]) {
                    profileDocument.profiles[req.query.profileId].rvn += 1;
                    profile.rvn = profileDocument.profiles[req.query.profileId].rvn;
                }
                profile.updated = new Date().toISOString();
                if (profileDocument && profileDocument.profiles[req.query.profileId]) {
                    profileDocument.profiles[req.query.profileId].commandRevision =
                        (profileDocument.profiles[req.query.profileId].commandRevision || 0) + 1;
                }
                await Profile.findOneAndUpdate({ accountId: req.user.accountId }, { $set: profiles }, { upsert: true })
            }
            catch (err) {
                console.log(err);
            }
            break;
        case "DeleteCosmeticLoadout":
            try {
                if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
                        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
                const profileDocument = profiles;
                profile = profileDocument?.profiles[req.query.profileId];
                log.debug(JSON.stringify(req.body));
                if (req.body.fallbackLoadoutIndex != -1) {
                    item = profile.items[`momentum${fallbackLoadoutIndex - 1}-loadout`];
                    if (!item)
                        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Locker item {0} not found`, [req.query.profileId], 12813, undefined, 403, res);
                    profile.stats.attributes["active_loadout_index"] = fallbackLoadoutIndex;
                    profile.stats.attributes["last_applied_loadout"] = `momentum${fallbackLoadoutIndex - 1}-loadout`;
                    profile.items["sandbox_loadout"].attributes["locker_slots_data"] = item.attributes["locker_slots_data"];
                    let n = item.attributes["locker_name"];
                    profile.items[`momentum${fallbackLoadoutIndex - 1}-loadout`] = profile.items["sandbox_loadout"];
                    profile.items[`momentum${fallbackLoadoutIndex - 1}-loadout`].attributes["locker_name"] = n;
                }
                
                var it = Object.entries(profile.items);
                profile.items = Object.fromEntries(it);
                profile.stats.attributes.loadouts.splice(req.body.index);

                if (profileDocument?.profiles[req.query.profileId]) {
                    profileDocument.profiles[req.query.profileId].rvn += 1;
                    profile.rvn = profileDocument.profiles[req.query.profileId].rvn;
                }
                profile.updated = new Date().toISOString();
                if (profileDocument && profileDocument.profiles[req.query.profileId]) {
                    profileDocument.profiles[req.query.profileId].commandRevision =
                        (profileDocument.profiles[req.query.profileId].commandRevision || 0) + 1;
                }
                await Profile.findOneAndUpdate({ accountId: req.user.accountId }, { $set: profiles }, { upsert: true })
            } catch (err) {
                log.error(err.toString());
            }
            break;
        case "SetCosmeticLockerName":
            try {
                if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
                    return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
                const profileDocument = profiles;
                profile = profileDocument?.profiles[req.query.profileId];
                const item2 = profile.items[req.body.lockerItem];
                if (!item2)
                    return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Locker item {0} not found`, [req.query.profileId], 12813, undefined, 403, res);
                if (typeof req.body.name === "string" && item2.attributes.locker_name != req.body.name) {
                    let attrItem = profile.items[req.body.lockerItem];
                    let attrName = "locker_name";
                    if (!item2) {
                        return;
                    }
                    if (!item2.attributes) {
                        item2.attributes = {};
                    }
                    item2.attributes[attrName] = req.body.name;
                    if (ApplyProfileChanges != null) {
                        ApplyProfileChanges.push({
                            "changeType": "itemAttrChanged",
                            "itemId": req.body.lockerItem,
                            "itemName": item2.templateId,
                            "item": item2
                        });
                    }
                }
                if (profileDocument?.profiles[req.query.profileId]) {
                    profileDocument.profiles[req.query.profileId].rvn += 1;
                    profile.rvn = profileDocument.profiles[req.query.profileId].rvn;
                }
                profile.updated = new Date().toISOString();
                if (profileDocument && profileDocument.profiles[req.query.profileId]) {
                    profileDocument.profiles[req.query.profileId].commandRevision =
                        (profileDocument.profiles[req.query.profileId].commandRevision || 0) + 1;
                }
                await Profile.findOneAndUpdate({ accountId: req.user.accountId }, { $set: profiles }, { upsert: true })
            } catch (err) {
                log.error(err.toString());
            }
            break;
        default:
            error.createError("errors.com.epicgames.fortnite.operation_not_found", `Operation ${req.params.operation} not valid`, [req.params.operation], 16035, undefined, 404, res);
            return;
    }
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        multiUpdate: MultiUpdate,
        responseVersion: 1
    });
});

app.post("/fortnite/api/game/v3/profile/*/client/emptygift", async (req, res) => {
    const playerName = req.body.playerName;
    const user = await User.findOne({ username: playerName })

    if (!user) {
        return error.createError(
            "errors.com.epicgames.user.not_found",
            "User not found.",
            undefined, 16027, undefined, 404, res
        );
    }

    const senderAccountId = user.accountId.toString();
    const profiles = await Profile.findOne({ accountId: senderAccountId })

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

    let sender = await Friends.findOne({ accountId: senderAccountId }).lean()

    const receiverUser = await User.findOne({ playerName: req.body.receiverPlayerName })

    if (!receiverUser) {
        return error.createError(
            "errors.com.epicgames.user.not_found",
            "Receiver user not found.",
            undefined, 16027, undefined, 404, res
        );
    }

    const receiverAccountId = senderAccountId;

    let receiverProfile = await Profile.findOne({ accountId: receiverAccountId })

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
    })

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

        await profiles.updateOne({ $set: { [`profiles.${"common_core"}`]: profile } })
    }

    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
            "changeType": "fullProfileUpdate",
            "profile": profile
        }];
    }
    log.backend("EmptyGift sent to " + user.username + "!");
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

app.post("/fortnite/api/game/v2/profile/:accountId/dedicated_server/:operation", async (req, res) => {
    log.debug("dedicated_server for " + req.params.accountId);
    const profiles = await Profile.findOne({ accountId: req.params.accountId }).lean()
    if (!profiles)
        return res.status(404).json({});
    if (!(await profileManager.validateProfile(req.query.profileId, profiles)))
        return error.createError("errors.com.epicgames.modules.profiles.operation_forbidden", `Unable to find template configuration for profile ${req.query.profileId}`, [req.query.profileId], 12813, undefined, 403, res);
    let profile = profiles?.profiles[req.query.profileId];
    //if (req.query.profileId != "athena")
    //    return error.createError("errors.com.epicgames.modules.profiles.invalid_command", `dedicated_server is not valid on ${req.query.profileId} profile`, ["dedicated_server", req.query.profileId], 12801, undefined, 400, res);
    const memory = functions.GetVersionInfo(req);
    let ApplyProfileChanges = [];
    let BaseRevision = profile.rvn;
    let ProfileRevisionCheck = (memory.build >= 12.20) ? profile.commandRevision : profile.rvn;
    let QueryRevision = req.query.rvn || -1;
    if (QueryRevision != ProfileRevisionCheck) {
        ApplyProfileChanges = [{
                "changeType": "fullProfileUpdate",
                "profile": profile
            }];
    }
    res.json({
        profileRevision: profile.rvn || 0,
        profileId: req.query.profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,
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
function checkIfDuplicateExists(arr) {
    return new Set(arr).size !== arr.length;
}
export default app;
//# sourceMappingURL=mcp.js.map