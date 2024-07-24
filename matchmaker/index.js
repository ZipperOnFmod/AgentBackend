const { Server: WebSocket } = require("ws");
const crypto = require("crypto");

// Start listening websocket on port
const port = 20;
const wss = new WebSocket({ port: port });

wss.on('listening', () => {
    console.log(`Matchmaker started listening on port ${port}`);
});

wss.on('connection', async (ws) => {
    if (ws.protocol.toLowerCase().includes("xmpp")) {
        return ws.close();
    }

    // create hashes
    const ticketId = crypto.createHash('md5').update(`1${Date.now()}`).digest('hex');
    const matchId = crypto.createHash('md5').update(`2${Date.now()}`).digest('hex');
    const sessionId = crypto.createHash('md5').update(`3${Date.now()}`).digest('hex');

    // you can use setTimeout to send the websocket messages at certain times
    setTimeout(Connecting, 200/* Milliseconds */);
    setTimeout(Waiting, 1000); // 0.8 Seconds after Connecting
    setTimeout(Queued, 1000); // 1 Second after Waiting
    setTimeout(SessionAssignment, 1000); // 4 Seconds after Queued
    setTimeout(Join, 1000); // 2 Seconds after SessionAssignment

    function Connecting() {
        ws.send(JSON.stringify({
            "payload": {
                "state": "Connecting"
            },
            "name": "StatusUpdate"
        }));
    }

    function Waiting() {
        ws.send(JSON.stringify({
            "payload": {
                "totalPlayers": 1,
                "connectedPlayers": 1,
                "state": "Waiting"
            },
            "name": "StatusUpdate"
        }));
    }

    function Queued() {
        ws.send(JSON.stringify({
            "payload": {
                "ticketId": ticketId,
                "queuedPlayers": 999999,
                "estimatedWaitSec": 999999,
                "status": {},
                "state": "Queued"
            },
            "name": "StatusUpdate"
        }));
    }

    function SessionAssignment() {
        ws.send(JSON.stringify({
            "payload": {
                "matchId": matchId,
                "state": "SessionAssignment"
            },
            "name": "StatusUpdate"
        }));
    }

    function Join() {
        ws.send(JSON.stringify({
            "payload": {
                "matchId": matchId,
                "sessionId": sessionId,
                "joinDelaySec": 1
            },
            "name": "Play"
        }));
    }
});
