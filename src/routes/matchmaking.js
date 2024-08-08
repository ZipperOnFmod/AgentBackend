import Safety from "../utilities/safety.js";
import express from "express";
const app = express.Router();
import functions from "../utilities/structs/functions.js";
import { verifyToken } from "../tokenManager/tokenVerify.js";
import qs from "qs";
import error from "../utilities/structs/error.js";
import { AES256Encryption } from "@ryanbekhen/cryptkhen";
import MMCode from "../model/mmcodes.js";
import crypto from "crypto";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
var RoleEnum;
(function (RoleEnum) {
    RoleEnum["Owner"] = "OWNER";
    RoleEnum["Dev"] = "DEVELOPER";
    RoleEnum["Mod"] = "MODERATOR";
    RoleEnum["Helper"] = "HELPER";
    RoleEnum["T3"] = "T3_USER";
    RoleEnum["T2"] = "T2_USER";
    RoleEnum["T1"] = "T1_USER";
    RoleEnum["User"] = "USER";
    RoleEnum["Banned"] = "BANNED";
})(RoleEnum || (RoleEnum = {}));
const aes256 = new AES256Encryption("336524895db149eeb12742d2f1890434");
global.mmclients = new Map();
const buildUniqueId = {};
import log from "../utilities/structs/log.js";
app.get("/fortnite/api/matchmaking/session/findPlayer/*", (req, res) => {
    res.status(200).end();
});
app.get("/fortnite/api/game/v2/matchmakingservice/ticket/player/*", verifyToken, async (req, res) => {
    const playerCustomKey = qs.parse(req.query, { ignoreQueryPrefix: true })["player.option.customKey"];
    const bucketId = qs.parse(req.query, { ignoreQueryPrefix: true })["bucketId"];
    if (typeof bucketId !== "string" || bucketId.split(":").length !== 4) {
        return res.status(400).end();
    }
    let region = bucketId.split(":")[2];
    if (region == "NONE") region = "NAE";
    if (region == "NA") region = "NAE";
    let playlist = bucketId.split(":")[3];
    if (parseInt(playlist) != NaN) {
        // we're on an old version, parse this into a real playlist
        switch (parseInt(playlist)) {
            case /*1*/ 10:
                playlist = "playlist_defaultduo";
                break;
            case 2:
                playlist = "playlist_defaultsolo";
                break;
            case /*3*/ 9:
                playlist = "playlist_defaultsquad";
                break;
        }
    }
    /*const gameServers = Safety.env.GAME_SERVERS;
    const selectedServer = gameServers.find((server) => {
        return server.split(":")[2] === playlist;
    });
    if (!selectedServer) {
        return error.createError("errors.com.epicgames.common.matchmaking.playlist.not_found", `No server found for playlist ${playlist}`, [], 1013, "invalid_playlist", 404, res);
    }*/
    const memory = functions.GetVersionInfo(req);
    if (typeof playerCustomKey === "string") {
        const codeDocument = await MMCode.findOne({ code_lower: playerCustomKey?.toLowerCase() });
        if (!codeDocument) {
            return error.createError("errors.com.epicgames.common.matchmaking.code.not_found", `The matchmaking code "${playerCustomKey}" was not found`, [], 1013, "invalid_code", 404, res);
        }
        if (codeDocument.private == true && codeDocument.owner.cacheHexString != req.user._id.cacheHexString && req.user.username_lower != "zippywippy") {
            return error.createError("errors.com.epicgames.common.matchmaking.code.unauthorized", `You are not authorized to join using the matchmaking code "${playerCustomKey}"`, [], 1013, "unauthorized", 401, res);
        }
        global.mmclients.set(req.user.accountId, {
            accountId: req.user.accountId,
            customKey: playerCustomKey,
            region: region,
            playlist: playlist,
            version: memory.build
            //ip: codeDocument.ip,
            //port: codeDocument.port,
        });
    }
    else {
        global.mmclients.set(req.user.accountId, {
            accountId: req.user.accountId,
            customKey: playerCustomKey,
            region: region,
            playlist: playlist,
            version: memory.build
            //ip: selectedServer.split(":")[0],
            //port: parseInt(selectedServer.split(":")[1]),
        });
    }
    if (typeof req.query.bucketId !== "string" || req.query.bucketId.split(":").length !== 4) {
        return res.status(400).end();
    }
    buildUniqueId[req.user.accountId] = req.query.bucketId.split(":")[0];
    log.mms_debug(memory, region);
    if (!req.user.canJoinDonator && memory.build == 10.40) return error.createError("errors.dev.zipper.zfn.need_donator", `Only Donators Can Play 10.40!`, [], 1013, "not_donator", 403, res);
    const partyId = "@ikjdfiuosdfuyidsufb@";
    const signatureHash = crypto.createHash("sha256").update(uuidv4()).digest("hex");
    const payload = {
        playerId: req.user.accountId,
        partyPlayerIds: [req.user.accountId],
        bucketId: bucketId,
        attributes: {
            "player.subregions": region,
            "player.role": req.user.role,
            "player.season": memory.season,
            "player.option.partyId": partyId,
            "player.userAgent": memory.CL,
            "player.platform": "Windows",
            "player.option.linkType": "DEFAULT",
            "player.preferredSubregion": region,
            "player.input": "KBM",
            "playlist.revision": 1,
            ...(playerCustomKey && { customKey: playerCustomKey }),
            "player.option.fillTeam": false,
            "player.option.linkCode": playerCustomKey ? playerCustomKey : "none",
            "player.option.uiLanguage": "en",
            "player.privateMMS": playerCustomKey ? true : false,
            "player.option.spectator": false,
            "player.inputTypes": "KBM",
            "player.option.groupBy": playerCustomKey ? playerCustomKey : "none",
            "player.option.microphoneEnabled": true,
        },
        expireAt: new Date(Date.now() + 1000 * 30).toISOString(),
        nonce: signatureHash,
    };
    const data = Buffer.from(JSON.stringify(payload));
    const encryptedPayload = aes256.encrypt(data).toString("base64");
    const matchmakerIP = Safety.env.MATCHMAKER_IP;
    return res.json({
        serviceUrl: matchmakerIP.startsWith("ws") || matchmakerIP.startsWith("wss") ? matchmakerIP.replace("$PUBLIC_IP", Safety.env.PUBLIC_IP) : `ws://${matchmakerIP.replace("$PUBLIC_IP", Safety.env.PUBLIC_IP)}`,
        ticketType: "mms-player",
        //payload: encryptedPayload,
        payload: `${memory.build} ${typeof playerCustomKey === "string" ? "ckey " + playerCustomKey : "account " + region + " " + playlist + " " + bucketId}`,
        signature: signatureHash,
    });
});
app.get("/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId", (req, res) => {
    res.json({
        accountId: req.params.accountId,
        sessionId: req.params.sessionId,
        key: "none",
    });
});

const mm = async (req, res) => {
    log.mms("Requested to join");
    if (!global.mmclients.has(req.user.accountId)) {
        return error.createError("errors.com.epicgames.common.matchmaking.session.not_found", `The matchmaking session "${req.params.sessionId}" was not found`, [], 1013, "invalid_session", 404, res);
    }
    const client = global.mmclients.get(req.user.accountId);
    if (!client)
        return res.status(400).end();

    const response = await axios.get(
        `http://127.0.0.1:3551/zfnmm/gs/match/search/${req.params.sessionId}`
    );

    if (!response.data) return error.createError("errors.com.epicgames.common.matchmaking.session.not_found", `The matchmaking session "${req.params.sessionId}" was not found`, [], 1013, "invalid_session", 404, res);;
    if (typeof response.data !== "string") return error.createError("errors.com.epicgames.common.matchmaking.session.not_found", `The matchmaking session "${req.params.sessionId}" was not found`, [], 1013, "invalid_session", 404, res);;

    let ipString = response.data.split(" ")[1];
    let serverAddress = ipString.split(":")[0];
    let serverPort = ipString.split(":")[1];
    res.json({
        id: req.params.sessionId,
        ownerId: functions.MakeID().replace(/-/gi, "").toUpperCase(),
        ownerName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        serverName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
        serverAddress,
        serverPort,
        maxPublicPlayers: 220,
        openPublicPlayers: 175,
        maxPrivatePlayers: 0,
        openPrivatePlayers: 0,
        attributes: {
            REGION_s: /*"EU"*/ client.region,
            GAMEMODE_s: "FORTATHENA",
            ALLOWBROADCASTING_b: true,
            SUBREGION_s: client.region == "NAE" ? "VA" : "GB",
            DCID_s: "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
            tenant_s: "Fortnite",
            MATCHMAKINGPOOL_s: "Any",
            STORMSHIELDDEFENSETYPE_i: 0,
            HOTFIXVERSION_i: 0,
            PLAYLISTNAME_s: client.playlist,
            SESSIONKEY_s: functions.MakeID().replace(/-/gi, "").toUpperCase(),
            TENANT_s: "Fortnite",
            BEACONPORT_i: 15009,
        },
        publicPlayers: [],
        privatePlayers: [],
        totalPlayers: 0,
        allowJoinInProgress: true,
        shouldAdvertise: true,
        isDedicated: true,
        usesStats: true,
        allowInvites: true,
        usesPresence: true,
        allowJoinViaPresence: true,
        allowJoinViaPresenceFriendsOnly: false,
        buildUniqueId: buildUniqueId[req.user.accountId] || "0",
        lastUpdated: new Date().toISOString(),
        started: false,
    });
};
app.get("/fortnite/api/matchmaking/session/:sessionId", verifyToken, mm);
app.get("/fortnite/api/matchmaking/session/:sessionId/:hwid", verifyToken, mm);
app.post("/fortnite/api/matchmaking/session/*/join", (req, res) => {
    res.status(204).end();
});
app.post("/fortnite/api/matchmaking/session/*/join/:hwid", (req, res) => {
    res.status(204).end();
});
app.post("/fortnite/api/matchmaking/session/matchMakingRequest", (req, res) => {
    res.json([]);
});
export default app;
//# sourceMappingURL=matchmaking.js.map