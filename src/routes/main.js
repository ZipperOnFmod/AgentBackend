import { createRequire } from "module";
const require = createRequire(import.meta.url);
const express = require('express')
const app = express.Router();
import path from "path";
import fs from "fs";
import Users from '../model/user.js';
import Profiles from '../model/profiles.js';
import { dirname } from 'dirname-filename-esm';
const __dirname = dirname(import.meta);
app.post("/fortnite/api/game/v2/chat/*/*/*/pc", (req, res) => {
    let resp = { "GlobalChatRooms": [{ "roomName": "lawinserverglobal" }] };
    res.json(resp);
});
app.post("/fortnite/api/game/v2/tryPlayOnPlatform/account/*", (req, res) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(true);
});
app.get("/launcher/api/public/distributionpoints/", (req, res) => {
    res.json({
        "distributions": [
            "https://download.epicgames.com/",
            "https://download2.epicgames.com/",
            "https://download3.epicgames.com/",
            "https://download4.epicgames.com/",
            "https://epicgames-download1.akamaized.net/"
        ]
    });
});
app.get("/launcher/api/public/assets/*", async (req, res) => {
    res.json({
        "appName": "FortniteContentBuilds",
        "labelName": "LawinServer",
        "buildVersion": "++Fortnite+Release-20.00-CL-19458861-Windows",
        "catalogItemId": "5cb97847cee34581afdbc445400e2f77",
        "expires": "9999-12-31T23:59:59.999Z",
        "items": {
            "MANIFEST": {
                "signature": "LawinServer",
                "distribution": "https://lawinserver.ol.epicgames.com/",
                "path": "Builds/Fortnite/Content/CloudDir/LawinServer.manifest",
                "hash": "55bb954f5596cadbe03693e1c06ca73368d427f3",
                "additionalDistributions": []
            },
            "CHUNKS": {
                "signature": "LawinServer",
                "distribution": "https://lawinserver.ol.epicgames.com/",
                "path": "Builds/Fortnite/Content/CloudDir/LawinServer.manifest",
                "additionalDistributions": []
            }
        },
        "assetId": "FortniteContentBuilds"
    });
});
app.get("/Builds/Fortnite/Content/CloudDir/*.manifest", async (req, res) => {
    res.set("Content-Type", "application/octet-stream");
    const manifest = fs.readFileSync(path.join(__dirname, "../../../", "responses", "CloudDir", "LawinServer.manifest"));
    res.status(200).send(manifest).end();
});
app.get("/Builds/Fortnite/Content/CloudDir/*.chunk", async (req, res) => {
    res.set("Content-Type", "application/octet-stream");
    const chunk = fs.readFileSync(path.join(__dirname, "../../../", "responses", "CloudDir", "LawinServer.chunk"));
    res.status(200).send(chunk).end();
});
app.get("/Builds/Fortnite/Content/CloudDir/*.ini", async (req, res) => {
    const ini = fs.readFileSync(path.join(__dirname, "../../../", "responses", "CloudDir", "Full.ini"));
    res.status(200).send(ini).end();
});
app.get("/waitingroom/api/waitingroom", (req, res) => {
    res.status(204);
    res.end();
});
app.get("/socialban/api/public/v1/*", (req, res) => {
    res.json({
        "bans": [],
        "warnings": []
    });
});
app.get("/fortnite/api/game/v2/events/tournamentandhistory/*", async (req, res) => {
    const tournamentandhistory = require("../../responses/Athena/Tournament/tournamentandhistory.json");

    res.json(tournamentandhistory)
});
app.get("/fortnite/api/statsv2/account/:accountId", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});
app.get("/statsproxy/api/statsv2/account/:accountId", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});
app.get("/fortnite/api/stats/accountId/:accountId/bulk/window/alltime", (req, res) => {
    res.json({
        "startTime": 0,
        "endTime": 0,
        "stats": {},
        "accountId": req.params.accountId
    });
});
app.post("/fortnite/api/feedback/*", (req, res) => {
    res.status(200);
    res.end();
});
app.post("/fortnite/api/statsv2/query", (req, res) => {
    res.json([]);
});
app.post("/statsproxy/api/statsv2/query", (req, res) => {
    res.json([]);
});
app.post("/fortnite/api/game/v2/events/v2/setSubgroup/*", (req, res) => {
    res.status(204);
    res.end();
});
app.get("/fortnite/api/game/v2/enabled_features", (req, res) => {
    res.json([]);
});
app.get("/api/v1/events/Fortnite/download/*", (req, res) => {
    const tournament = require("../../responses/Athena/Tournament/tournament.json");

    res.json(tournament)
});
app.post("/api/v1/assets/Fortnite/*/*", async (req, res) => {
    /*if (req.body.hasOwnProperty("FortCreativeDiscoverySurface") && req.body.FortCreativeDiscoverySurface == 0) {
        const discovery_api_assets = require("../../responses/Athena/Discovery/discovery_api_assets.json");
        res.json(discovery_api_assets)
    }
    else {*/
    res.json({
        "FortCreativeDiscoverySurface": {
            "meta": {
                "promotion": req.body.FortCreativeDiscoverySurface || 0
            },
            "assets": {}
        }
    });
}
/*}*/ );
app.get("/fortnite/api/game/v2/twitch/*", (req, res) => {
    res.status(200);
    res.end();
});
app.get("/fortnite/api/game/v2/world/info", (req, res) => {
    res.json({});
});
app.post("/fortnite/api/game/v2/chat/*/recommendGeneralChatRooms/pc", (req, res) => {
    res.json({});
});
app.get("/fortnite/api/receipts/v1/account/*/receipts", (req, res) => {
    res.json([]);
});
app.get("/fortnite/api/game/v2/leaderboards/cohort/*", (req, res) => {
    res.json([]);
});
app.post("/datarouter/api/v1/public/data", (req, res) => {
    res.status(204);
    res.end();
});
app.get("/api/v1/events/Fortnite/:eventId/history/:accountId", async (req, res) => {
    var history = require("../../../responses/Athena/Tournament/history.json");
    history[0].scoreKey.eventId = req.params.eventId;
    history[0].teamId = req.params.accountId;
    history[0].teamAccountIds.push(req.params.accountId);

    res.json(history)
});
app.get("/api/v1/leaderboards/Fortnite/:eventId/:eventWindowId/:accountId", async (req, res) => {
    var leaderboards = require("../../../responses/Athena/Tournament/leaderboard.json");
    var heroNames = require("../../../responses/Campaign/heroNames.json");
    heroNames = heroNames.sort(() => Math.random() - 0.5);
    heroNames.unshift(req.params.accountId);

    leaderboards.eventId = req.params.eventId;
    leaderboards.eventWindowId = req.params.eventWindowId;

    var entryTemplate = leaderboards.entryTemplate;
    var sessionHistoryTemplate = leaderboards.sessionHistoryTemplate;

    for (var i = 0; i < heroNames.length; i++) {
        var entry = { ...entryTemplate };
        entry.eventId = req.params.eventId;
        entry.eventWindowId = req.params.eventWindowId;

        entry.teamAccountIds = [heroNames[i]];
        entry.teamId = heroNames[i];

        entry.pointsEarned = entry.score = 69 - i;
        var splittedPoints = Math.floor(Math.random() * entry.pointsEarned);
        entry.pointBreakdown = {
            "PLACEMENT_STAT_INDEX:13": {
                "timesAchieved": 13,
                "pointsEarned": splittedPoints
            },
            "TEAM_ELIMS_STAT_INDEX:37": {
                "timesAchieved": 13,
                "pointsEarned": entry.pointsEarned - splittedPoints
            }
        };
        entry.rank = i + 1;

        leaderboards.entries.push(entry)
    }

    res.json(leaderboards)
})
//VBUCKS
// Apply the checkHeader middleware to all the routes
app.post("/backend/incKills"), async (req, res) => {}
app.post("/backend/incWins"), async (req, res) => {}
app.post("/backend/incTop5"), async (req, res) => {}
app.post("/backend/incTop10"), async (req, res) => {}
app.post("/backend/incXP"), async (req, res) => {}

app.get("/backend/incWins", async (req, res) => {
  if (req.headers["user-agent"] != undefined) {
    console.log(
      "User tried hijacking Server! Goofy: ",
      req.socket.remoteAddress
    );
    res.send("You are not authorized!");
    return res.status(404).end();
  }
  const user = await User.findOne({ username: req.params.name });

  if (!user) {
    res.send("invalid");
    res.end();
    return;
  }

    await User.updateOne({ username: req.params.name }, { $inc: { kills: 1 } });
    await Profiles.updateOne(
        { accountId: user.accountId },
        {
            $inc: {
                "profiles.common_core.items.Currency:MtxPurchased.quantity": 200,
            },
        }
    );

    res.send("done");
    console.log(`Vbucks sent to ${user.username} for Win`);
});

app.get("/backend/incXP", async (req, res) => {
  if (req.headers["user-agent"] != undefined) {
    console.log(
      "User tried hijacking Server! Goofy: ",
      req.socket.remoteAddress
    );
    res.send("You are not authorized!");
    return res.status(404).end();
  }
  if (req.headers["vbuckssecureheader"] != requiredHeader) {
    console.log(
      "User tried hijacking Server! Goofy: ",
      req.socket.remoteAddress
    );
    res.send("You are not authorized!");
    return res.status(404).end();
  }
  const user = await User.findOne({ username: req.params.name });

  if (!user) {
    res.send("invalid");
    res.end();
    return;
  }

  await User.updateOne({ username: req.params.name }, { $inc: { wins: 1 } });
  await Profiles.updateOne(
    { accountId: user.accountId },
    {
      $inc: {
        "profiles.athena.stats.attributes.xp": 10000,
      },
    }
  );
  res.send("done");
  console.log(`XP sent to ${user.username}`)
});

app.get("/backend/incKills", async (req, res) => {
  if (req.headers["authkey"] == "2108ZFN"){
    console.log(req.headers["name"])
    const user = await Users.findOne({ username: req.headers["name"] });

    if (!user) {
        res.send("invalid");
        return;
    }

    await Users.updateOne({ username: req.params.name }, { $inc: { kills: 1 } });
    await Profiles.updateOne(
      { accountId: user.accountId },
      {$inc: {"profiles.common_core.items.Currency:MtxPurchased.quantity": 50,},}
    );

    res.send("done");
    console.log(`Vbucks sent to ${user.username} for kill`);
  } else {
    res.send("Invalid authkey")
  }
});

  app.get("/backend/incTop5", async (req, res) => {
    if (req.headers["user-agent"] != undefined) {
      console.log(
        "User tried hijacking Server: ",
        req.socket.remoteAddress
      );
      res.send("You are not authorized!");
      return res.status(404).end();
    }
    if (req.headers["vbuckssecureheader"] != requiredHeader) {
      console.log(
        "User tried hijacking Server! Goofy: ",
        req.socket.remoteAddress
      );
      res.send("You are not authorized!");
      return res.status(404).end();
    }
    const user = await User.findOne({ username: req.params.name });
  
    if (!user) {
      res.send("invalid");
      res.end();
      return;
    }
  
    await User.updateOne({ username: req.params.name }, { $inc: { top5: 1 } });
    await Profiles.updateOne(
      { accountId: user.accountId },
      {
        $inc: {
          "profiles.common_core.items.Currency:MtxPurchased.quantity": 60,
        },
      }
    );
    res.send("done");
    console.log("Player got a top5 Vbucks given to " + user.username);
  });

  app.get("/backend/incTop10", async (req, res) => {
    if (req.headers["user-agent"] != undefined) {
      console.log(
        "User tried hijacking Server: ",
        req.socket.remoteAddress
      );
      res.send("You are not authorized!");
      return res.status(404).end();
    }
    if (req.headers["vbuckssecureheader"] != requiredHeader) {
      console.log(
        "User tried hijacking Server! Goofy: ",
        req.socket.remoteAddress
      );
      res.send("You are not authorized!");
      return res.status(404).end();
    }
    const user = await User.findOne({ username: req.params.name });
  
    if (!user) {
      res.send("invalid");
      res.end();
      return;
    }

app.get("/api/v1/events/Fortnite/download/*", async (req, res) => {
    res.json({})
    const tournament = require("../../responses/Athena/Tournament/tournament.json");

    res.json(tournament)
})

app.get("/api/v1/events/Fortnite/:eventId/history/:accountId", async (req, res) => {
    var history = require("../../responses/Athena/Tournament/history.json");
    history[0].scoreKey.eventId = req.params.eventId;
    history[0].teamId = req.params.accountId;
    history[0].teamAccountIds.push(req.params.accountId);

    res.json(history)
})

app.get("/api/v1/leaderboards/Fortnite/:eventId/:eventWindowId/:accountId", async (req, res) => {
    var leaderboards = require("./../responses/Athena/Tournament/leaderboard.json");
    var heroNames = require("./../responses/Campaign/heroNames.json");
    heroNames = heroNames.sort(() => Math.random() - 0.5);
    heroNames.unshift(req.params.accountId);

    leaderboards.eventId = req.params.eventId;
    leaderboards.eventWindowId = req.params.eventWindowId;

    var entryTemplate = leaderboards.entryTemplate;
    var sessionHistoryTemplate = leaderboards.sessionHistoryTemplate;

    for (var i = 0; i < heroNames.length; i++) {
        var entry = { ...entryTemplate };
        entry.eventId = req.params.eventId;
        entry.eventWindowId = req.params.eventWindowId;

        entry.teamAccountIds = [heroNames[i]];
        entry.teamId = heroNames[i];

        entry.pointsEarned = entry.score = 69 - i;
        var splittedPoints = Math.floor(Math.random() * entry.pointsEarned);
        entry.pointBreakdown = {
            "PLACEMENT_STAT_INDEX:13": {
                "timesAchieved": 13,
                "pointsEarned": splittedPoints
            },
            "TEAM_ELIMS_STAT_INDEX:37": {
                "timesAchieved": 13,
                "pointsEarned": entry.pointsEarned - splittedPoints
            }
        };
        entry.rank = i + 1;

        leaderboards.entries.push(entry)
    }

    res.json(leaderboards)
})
  
    await User.updateOne({ username: req.params.name }, { $inc: { top10: 1 } });
    await Profiles.updateOne(
      { accountId: user.accountId },
      {
        $inc: {
          "profiles.common_core.items.Currency:MtxPurchased.quantity": 40,
        },
      }
    );
    res.send("done");
    console.log("Player got a top10 Vbucks given to " + user.username);
  });

export default app;
//# sourceMappingURL=main.js.map