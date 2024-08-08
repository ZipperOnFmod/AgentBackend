import mongoose from "mongoose";
import GameServer from "./schema.js";
import PlayerSch from './schemaplayers.js';
import MMCSch from './schemammc.js';
import fs from 'fs';
import crypto from "crypto";
import log from "../utilities/structs/log.js";

const BAN_FILE = './src/matchmaker/ip.json';

//let players = 0;
let playerCounts = [];
const HEARTBEAT_INTERVAL = 1500; // 1 second in ms
const BAN_THRESHOLD = 20; // Maximum number of connections.
const TIME_WINDOW = 5000; // Time window in milliseconds (5 seconds).

const ipConnectionMap = new Map();

let playersids = [];
global.knownsessionIds = [];
global.knownipsessions = [];
let lastPlaylist = "";
let lastRegion = "";
let lastCkey = "";

// ids maybe need to be changed...

//let json = RollSessionId();
RollSessionIdForIps(); // for ips

//global.sessionId = json[2];
//global.matchId = json[1];
//global.ticketId = json[0];
let ckey = "";

/*mongoose
  .connect(
    "mongodb://127.0.0.1/mms",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    log.mms_debug("[Mongoose] Connected");
  })
  .catch((err) => {
    log.mms(`[Mongoose] Failed -> ${err}`);
  });*/

async function Connecting(ws, ticketId, sessionId, matchId, region, playlist) {
  async function WsSendNormal() {
    ws.mmState = "lock";
    ws.send(
      JSON.stringify({
        payload: {
          state: "Connecting",
        },
        name: "StatusUpdate",
      })
    );
    log.mms_debug("Sent connecting");
    try {
      if (!playerCounts[ws.bucketId]) {
        playerCounts[ws.bucketId] = 0;
      }
      playerCounts[ws.bucketId]++;
      if (playerCounts[ws.bucketId] == -1) {
        playerCounts[ws.bucketId] = 1;
      }
      await GameServer.updateOne(
        { name: region },
        { $set: { playerCount: playerCounts[ws.bucketId] } }
      );
      log.mms_debug("Connecting to match " + matchId + " on " + region + " w/ playlist " + playlist + " and session " + sessionId);
      //log.mms("aa " + region + playlist + sessionId + matchId);
      // await WatchRegion(ws, ticketId, sessionId, matchId);
      //await WatchEU(ws, ticketId, sessionId, matchId);

      if (region == "OCE") {
        log.mms_debug('Checking OCE');
        await WatchOCE(ws, ticketId, sessionId, matchId, playlist);
      } else if (region == "EU") {
        log.mms_debug('Checking EU');
        await WatchEU(ws, ticketId, sessionId, matchId, playlist);
      } else {
        log.mms_debug('Bad region!');
      }

      //log.mms(`new players: ${players}`);
    } catch (error) {
      //console.error(`Error occurred while updating player count: ${error}`);
    }
    ws.mmState = "connecting";
  }
  async function WsSendCkey() {
    try {
      //let iv;
      //iv = setInterval(async () => {

      ws.mmState = "lock";
      ws.send(
        JSON.stringify({
          payload: {
            state: "Connecting",
          },
          name: "StatusUpdate",
        })
      );
      log.mms_debug("Sent connecting");
      ws.mmState = "connecting";
      //setTimeout(async () => {
      let iv;
      iv = setInterval(async () => {
        if (ws.mmState == "queued") {
          MMCSch.find({ code_lower: ckey })
            .then((documents) => {
              documents.forEach((doc) => {
                /*setTimeout(function () {
                SessionAssignment(ws, matchId, doc.IP, doc.Port);
              }, 100/*000* /);*/
              let iv2;
              iv2 = setInterval(() => {
                if (ws.mmState == "queued") {
                  clearInterval(iv2);
                  SessionAssignment(ws, matchId, doc.ip, doc.port);
                }
              }, 10);

              let iv3;
              /*setTimeout(function () {
                // aaa

                let ipsessionid = "";

                global.knownipsessions.forEach(session => {
                  if (session.ip == doc.IP && session.region == "NA" && session.playlist.toLowerCase() == playlist.toLowerCase()) {
                    //log.mms_debug('[EON-MMS]: Found region!');
                    ipsessionid = session.sessionId;
                  }
                });
                Join(ws, matchId, ipsessionid, doc.IP, doc.Port, "NA", playlist);
              }, 120 /*2000* /);*/
              iv3 = setInterval(function () {
                // aaa
                if (ws.mmState == "sessionAssignment") {
                  clearInterval(iv3);
                  ws.mmState = "lock";
                  let ipsessionid = "";

                  global.knownipsessions.forEach(session => {
                    if (session.ip == doc.ip) {
                      //log.mms_debug('[EON-MMS]: Found region!');
                      ipsessionid = session.sessionId;
                    }
                  });
                  Join(ws, matchId, sessionId, doc.ip, doc.port, "NA", "Playlist_DefaultSolo");
                }
              }, 10);

              clearInterval(iv);
              });
            });
          setTimeout(function () {
            //Queued(ws, ticketId);
          }, 1000);
        }
      }, /*HEARTBEAT_INTERVAL*/ 10);
      //});
    } catch {

    } finally {
    }
  }

  //setTimeout(ckey != "" ? WsSendCkey : WsSendNormal, /*600*/ 100);
  (ckey != "" ? WsSendCkey : WsSendNormal)();
}
function Waiting(ws) {
  let iv;
  function WsSend() {
    if (ws.mmState == "connecting") {
      clearInterval(iv);
      ws.mmState = "lock";
      ws.send(
        JSON.stringify({
          payload: {
            totalPlayers: playerCounts[ws.bucketId] ? playerCounts[ws.bucketId] : 0,
            connectedPlayers: playerCounts[ws.bucketId] ? playerCounts[ws.bucketId] : 0,
            state: "Waiting",
          },
          name: "StatusUpdate",
        })
      );
      ws.mmState = "waiting";
      log.mms_debug("Sent waiting");
    }
  }
  //setTimeout(WsSend, 200/*0*/);
  iv = setInterval(WsSend, 10);
}
function Queued(ws, ticketId, sessionId, matchId, force) {
  //log.mms('2: ' + online);
  //if (online == true) {
  //this.SessionAssignment(ws, matchId);
  //this.Join(ws, matchId, sessionId);
  //} else {
  //setTimeout(function () {
  let iv;
  iv = setInterval(() => {
    if (ws.mmState == "waiting" || (force && ws.mmState == "queued")) {
      clearInterval(iv);
      if (!force) ws.mmState = "lock";
      ws.send(
        JSON.stringify({
          payload: {
            ticketId: ticketId,
            queuedPlayers: ckey != "" ? 0 : parseInt(playerCounts[ws.bucketId] ? playerCounts[ws.bucketId] : 0),
            estimatedWaitSec: 1,
            status: {},
            state: "Queued",
          },
          name: "StatusUpdate",
        })
      );
      if (!force) ws.mmState = "queued";
      if (!force) {
        log.mms_debug("Sent queued");
        log.mms("Joined queue");
      }
    }
  }, /*2000*/ /*300*/ 10);
  //}
}

/*function Queued(ws, ticketId, sessionId, matchId) {
    function WsSend() {
        ws.send(JSON.stringify({
            "payload": {
                ticketId: ticketId,
                queuedPlayers: parseInt(players),
                estimatedWaitSec: 3,
                status: {},
                state: "Queued",
            },
            "name": "StatusUpdate"
        }))
    }
    setTimeout(WsSend, 2000);
}*/

async function SessionAssignment(ws, matchId, ip, port) {

  function WsSend() {
    ws.mmState = "lock";
    ws.send(
      JSON.stringify({
        payload: {
          matchId: matchId,
          state: "SessionAssignment",
        },
        name: "StatusUpdate",
      })
    );
    ws.mmState = "sessionAssignment";
    log.mms_debug("Sent sessionassignment");
  }
  WsSend();
}



async function Join(ws, matchId, sessionId, ip, port, region, playlist) {
  ws.mmState = "lock";
  log.mms(`joining ${ip}:${port}, match: ${matchId}, session: ${sessionId}`);
  //if (true) {

  let ipsessionid = "";

  global.knownipsessions.forEach(session => {
    //log.mms(session);
    if (session.ip == ip &&
      (ckey == "" ? session.region == region && session.playlist.toLowerCase() == playlist.toLowerCase() : true)) {
      //log.mms('[EON-MMS]: Found region!');
      ipsessionid = session.sessionId;
    }
  });
  
  global.knownipsessions.splice(global.knownipsessions.findIndex(s => s.sessionId == ipsessionid), 1);
  log.mms_debug('sessionid: ' + ipsessionid);
  let canMake = true;
  global.knownsessionIds.forEach(id => {
    if (id == sessionId) {
      canMake = false;
      log.mms_debug(`${sessionId} can not matchmake!`);
    }
  });

  let uniqueid = "";

  playersids.forEach(player => {
    if (player.ws == ws) {
      uniqueid = player.uniqueId;
    }
  });

  if (canMake == true) {
    log.mms_debug("Can matchmake");
    // playersids.push({ws: ws, uniqueId: uniqueId});
    let player = await PlayerSch.create({
      sessionId: ipsessionid,
      uniqueid: uniqueid,
      ticketId: ws.ticketId,
      ip: ip,
      port: port
    });

    player.save().catch((err) => {
      log.mms("error: " + err);
      //return res.json({ err: err });
    });
    global.knownsessionIds.push(ipsessionid);
  }

  function WsSend() {
    log.mms_debug("Sent join");
    ws.send(
      JSON.stringify({
        payload: {
          matchId: matchId,
          sessionId: ipsessionid,
          joinDelaySec: 0,
        },
        name: "Play",
      })
    );
    ws.mmState = "joined";
    //ws.terminate();
  }
  let online = false;
  WsSend();
}

// NA
async function WatchOCE(ws, ticketId, sessionId, matchId, playlist) {
  // wait
  let iv;
  iv = setInterval(async () => {
    if (ws.mmState == "queued") {
      GameServer.find({ region: "OCE" })
        .then((documents) => {
          documents.forEach((doc) => {
            if (doc.status == "online" && doc.playlist.toLowerCase() == playlist.toLowerCase() && (!doc.version || (doc.version == ws.version))) {
              /*setTimeout(function () {
                SessionAssignment(ws, matchId, doc.IP, doc.Port);
              }, 100/*000* /);*/
              let iv2;
              iv2 = setInterval(() => {
                if (ws.mmState == "queued") {
                  clearInterval(iv2);
                  SessionAssignment(ws, matchId, doc.IP, doc.Port);
                }
              }, 10);

              let iv3;
              /*setTimeout(function () {
                // aaa

                let ipsessionid = "";

                global.knownipsessions.forEach(session => {
                  if (session.ip == doc.IP && session.region == "NA" && session.playlist.toLowerCase() == playlist.toLowerCase()) {
                    //log.mms_debug('[EON-MMS]: Found region!');
                    ipsessionid = session.sessionId;
                  }
                });
                Join(ws, matchId, ipsessionid, doc.IP, doc.Port, "NA", playlist);
              }, 120 /*2000* /);*/
              iv3 = setInterval(function () {
                // aaa
                if (ws.mmState == "sessionAssignment") {
                  clearInterval(iv3);
                  let ipsessionid = "";

                  global.knownipsessions.forEach(session => {
                    if (session.ip == doc.IP && session.region == "OCE" && session.playlist.toLowerCase() == playlist.toLowerCase()) {
                      //log.mms_debug('[EON-MMS]: Found region!');
                      ipsessionid = session.sessionId;
                    }
                  });
                  Join(ws, matchId, sessionId, doc.IP, doc.Port, "OCE", playlist);
                }
              }, 10);
              clearInterval(iv);
            }
          });
        })
        .catch((err) => {
          console.error(err);
        });

      setTimeout(function () {
        //Queued(ws, ticketId);
      }, 1000);
    }
  }, /*HEARTBEAT_INTERVAL*/ 10);
}

async function WatchEU(ws, ticketId, sessionId, matchId, playlist) {
  // wait
  let iv;
  iv = setInterval(async () => {
    if (ws.mmState == "queued") {
      GameServer.find({ region: "EU" })
        .then((documents) => {
          documents.forEach((doc) => {
            if (doc.status == "online" && doc.playlist.toLowerCase() == playlist.toLowerCase() && (!doc.version || (doc.version == ws.version))) {
              /*setTimeout(function () {
                SessionAssignment(ws, matchId, doc.IP, doc.Port);
              }, 100/*000* /);*/
              let iv2;
              iv2 = setInterval(() => {
                if (ws.mmState == "queued") {
                  clearInterval(iv2);
                  SessionAssignment(ws, matchId, doc.IP, doc.Port);
                }
              }, 10);

              let iv3;
              /*setTimeout(function () {
                // aaa

                let ipsessionid = "";

                global.knownipsessions.forEach(session => {
                  if (session.ip == doc.IP && session.region == "EU" && session.playlist.toLowerCase() == playlist.toLowerCase()) {
                    //log.mms_debug('[EON-MMS]: Found region!');
                    ipsessionid = session.sessionId;
                  }
                });
                Join(ws, matchId, ipsessionid, doc.IP, doc.Port, "EU", playlist);
              }, 120 /*2000* /);*/
              iv3 = setInterval(function () {
                // aaa
                if (ws.mmState == "sessionAssignment") {
                  clearInterval(iv3);
                  ws.mmState = "lock";
                  let ipsessionid = "";

                  global.knownipsessions.forEach(session => {
                    if (session.ip == doc.IP && session.region == "EU" && session.playlist.toLowerCase() == playlist.toLowerCase()) {
                      //log.mms_debug('[EON-MMS]: Found region!');
                      ipsessionid = session.sessionId;
                    }
                  });
                  Join(ws, matchId, sessionId, doc.IP, doc.Port, "EU", playlist);
                }
              }, 10);
              clearInterval(iv);
            }
          });
        })
        .catch((err) => {
          console.error(err);
        });

      setTimeout(function () {
        //Queued(ws, ticketId);
      }, 1000);
    }
  }, /*HEARTBEAT_INTERVAL*/ 10);
}

// update this

async function WatchRegion(ws, ticketId, sessionId, matchId, region) {
  // wait
  let region1 = "";

  if (region == "OCE") {
    region1 = "OCE";
  } else {
    region1 = region;
  }

  if (region == "EU") {
    region1 = "EU";
  } else {
    region1 = region;
  }

  setInterval(async () => {
    //log.mms("aaa");
    GameServer.find({ region: region1 })
      .then((documents) => {
        documents.forEach((doc) => {
          if (doc.status == "online") {
            setTimeout(function () {
              SessionAssignment(ws, matchId);
            }, 1000);

            setTimeout(function () {
              Join(ws, matchId, sessionId);
            }, 2000);
          }
        });
      })
      .catch((err) => {
        console.error(err);
      });

    setTimeout(function () {
      Queued(ws, ticketId);
    }, 1000);
  }, HEARTBEAT_INTERVAL);
}

function BlockRiftEraKid(ws) {
  function WsSend() {
    ws.send(
      JSON.stringify({
        message: "Request was not for matchmaking!"
      })
    );
  }
  WsSend();
}

function loadBannedIPs() {
  try {
    const data = fs.readFileSync(BAN_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    // Handle file read errors or invalid JSON gracefully.
    console.error('Error reading banned IPs:', err);
    return [];
  }
}

function RollSessionId() {
  let ticketId = crypto
    .createHash("md5")
    .update(`1${Date.now()}`)
    .digest("hex");
  let matchId = crypto
    .createHash("md5")
    .update(`2${Date.now()}`)
    .digest("hex");
  let sessionId = crypto
    .createHash("md5")
    .update(`3${Date.now()}`)
    .digest("hex");

  return [ticketId, matchId, sessionId];
}

function CreateSessionId() {
  let sessionId = crypto
    .createHash("md5")
    .update(`3${Date.now()}`)
    .digest("hex");

  return sessionId;
}

function RollSessionIdForIps() {
  //global.knownipsessions = []; // clear it

  // OCE
  GameServer.find({ region: "OCE" })
    .then((documents) => {
      documents.forEach((doc) => {
        let IP = doc.IP;
        let Port = doc.Port;
        let uniqueSessionId = CreateSessionId();
        global.knownipsessions.push({ ip: IP, port: Port, sessionId: uniqueSessionId, region: "OCE", playlist: doc.playlist });
      });
    })
    .catch((err) => {
      console.error(err);
    });

  // EU
  GameServer.find({ region: "EU" })
    .then((documents) => {
      documents.forEach((doc) => {
        let IP = doc.IP;
        let Port = doc.Port;
        let uniqueSessionId = CreateSessionId();
        global.knownipsessions.push({ ip: IP, port: Port, sessionId: uniqueSessionId, region: "EU", playlist: doc.playlist });
      });
    })
    .catch((err) => {
      console.error(err);
    });
  MMCSch.find({})
    .then((documents) => {
      documents.forEach((doc) => {
        let IP = doc.ip;
        let Port = doc.port;
        let uniqueSessionId = CreateSessionId();
        global.knownipsessions.push({ ip: IP, port: Port, sessionId: uniqueSessionId, region: "OCE", playlist: "Playlist_DefaultSolo" });
      });
    })
    .catch((err) => {
      console.error(err);
    });

  log.mms_debug('Finished generating keys for all session ips!');
}

async function MMS(ws, req) {
  log.mms("Connected to matchmaker!");

  //log.mms('ip: ' + req.socket.remoteAddress);
  const clientIP = req.socket.remoteAddress;

  const bannedIPs = loadBannedIPs(); // Load banned IPs each time someone connects.

  // Check if the client's IP is banned.
  if (bannedIPs.includes(clientIP)) {
    //log.mms(`Blocked connection from banned IP: ${clientIP}`);
    ws.close(1000); // Close the WebSocket with a normal closure code.
    return;
  }

  // Check if the IP address has reached the connection threshold in the specified time window.
  const currentTime = Date.now();
  if (ipConnectionMap.has(clientIP)) {
    const connections = ipConnectionMap.get(clientIP).filter(time => currentTime - time < TIME_WINDOW);
    if (connections.length >= BAN_THRESHOLD) {
      log.mms(`Banning IP: ${clientIP}`);
      // Implement your banning logic here.
      bannedIPs.push(clientIP);
      fs.writeFileSync(BAN_FILE, JSON.stringify(bannedIPs), 'utf8');
      return;
    }
  }

  // Store the current connection timestamp for the IP.
  if (!ipConnectionMap.has(clientIP)) {
    ipConnectionMap.set(clientIP, []);
  }
  ipConnectionMap.get(clientIP).push(currentTime);



  if (req.socket.remoteAddress.includes("3.80.229.247")) {
    BlockRiftEraKid(ws);
    ws.close(1000); // Use 1000 for a normal closure.
    return;
  }

  // 3 line patch for now
  if (!req.headers.authorization || !req.headers.authorization.includes("Epic-Signed") || !req.headers.authorization.includes("mms-player")) {
    BlockRiftEraKid(ws);
    ws.close(1000); // Use 1000 for a normal closure.
    return;
  }


  ws.version = parseFloat(req.headers.authorization.split(" ")[2]);
  var f = req.headers.authorization.split(" ");
  f.splice(2, 1);
  req.headers.authorization = f.join(" ");

  
  log.mms_debug("auth " + JSON.stringify(req.headers.authorization));

  let uniqueId = crypto
    .createHash("md5")
    .update(`3${Date.now()}`)
    .digest("hex");

  //log.mms("lol");
  //log.mms(req.headers);
  //const customKey = req.attributes["player.option.customKey"] || "none";
  //const season = req.attributes["player.season"];
  let keytype = req.headers.authorization.split(" ")[2];
  let region, playlist;
  if (keytype == "account") {
    region = req.headers.authorization.split(" ")[3];
    playlist = req.headers.authorization.split(" ")[4];
    ckey = "";
    ws.bucketId = req.headers.authorization.split(" ")[5];
  } else if (keytype == "ckey") {
    ckey = req.headers.authorization.split(" ")[3].toLowerCase();
  }

  playersids.push({ ws: ws, uniqueId: uniqueId });

  // authorization: 'Epic-Signed mms-player EONMMS= OCE playlist_defaultsquad 12582667 FE47BACD0B913530',




  // this will be used later
  //playersids.push({ sessionId: sessionId, uniqueId: uniqueId, ws: ws, ip: "aaa", port: 0 });

  //log.mms("Season: " + season);
  //log.mms("Region: " + region);
  //log.mms("Cookies: " + playlist);
  ws.on("close", async () => {
    if (ckey != "") return;
    if (playerCounts[ws.bucketId]) {
      playerCounts[ws.bucketId]--;
      log.mms_debug("New player count: " + playerCounts[ws.bucketId]);
      await GameServer.updateOne(
        { name: region },
        { $set: { playerCount: playerCounts[ws.bucketId] } }
      );
    }
  });
  ws.on("message", (message) => {
    log.mms_debug("mm-message: " + message);
    Queued(ws, ws.ticketId, ws.sessionId, ws.matchId, true);
  });
  if (ws.protocol.toLowerCase() == "xmpp") return;
  // patch
  //if ((lastPlaylist != "" && lastPlaylist != playlist) || (lastRegion != "" && lastRegion != region)) {
  //if ((lastPlaylist != "" && lastPlaylist != playlist) || (lastRegion != "" && lastRegion != region) || lastCkey != ckey) {
    //global.knownipsessions = [];
    //global.knownsessionIds = [];
    let json = RollSessionId();
    RollSessionIdForIps();

    ws.sessionId = json[2];
    ws.matchId = json[1];
    ws.ticketId = json[0];
    //PlayerSch.collection.drop();
  //}
  if (ckey != "") {
    lastPlaylist = playlist;
    lastRegion = region;
  }
  await Connecting(ws, ws.ticketId, ws.sessionId, ws.matchId, region, playlist);
  Waiting(ws);
  Queued(ws, ws.ticketId, ws.sessionId, ws.matchId);
  //await ILikeBigBootyHoles();
  //await WatchNA(ws, this.ticketId, this.sessionId, this.matchId);
  //await this.Connecting(ws, this.ticketId, this.sessionId, this.matchId);
  //this.Waiting(ws);
  //this.Queued(ws, this.ticketId, this.sessionId, this.matchId);

  //if (online == true) {
  //SessionAssignment(ws, this.matchId);
  //Join(ws, this.matchId, this.sessionId);
  //}
}

export default MMS;