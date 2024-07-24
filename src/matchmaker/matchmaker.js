import functions from "../utilities/structs/functions.js";
class matchmaker {
    static clients = 0;
    async server(ws, req) {
        const ticketId = functions.MakeID();
        const matchId = functions.MakeID();
        const sessionId = functions.MakeID();
        Connecting();
        Waiting(matchmaker.clients);
        Queued(matchmaker.clients);
        matchmaker.clients++;
        SessionAssignment();
        Join();
        async function Connecting() {
            //console.log(`Connecting. TicketId: ${ticketId}`);
            // Send a "Connecting" status update to the client
            ws.send(JSON.stringify({
                payload: {
                    state: "Connecting",
                },
                name: "StatusUpdate",
            }));
        }
        async function Waiting(players) {
            //console.log(`Waiting.`);
            // Send a "Waiting" status update to the client with the total number of players
            ws.send(JSON.stringify({
                payload: {
                    totalPlayers: players,
                    connectedPlayers: players,
                    state: "Waiting",
                },
                name: "StatusUpdate",
            }));
        }
        async function Queued(players) {
            ws.send(JSON.stringify({
                payload: {
                    ticketId: ticketId,
                    queuedPlayers: players,
                    estimatedWaitSec: 3,
                    status: {},
                    state: "Queued",
                },
                name: "StatusUpdate",
            }));
        }
        async function SessionAssignment() {
            ws.send(JSON.stringify({
                payload: {
                    matchId: matchId,
                    state: "SessionAssignment",
                },
                name: "StatusUpdate",
            }));
        }
        async function Join() {
            ws.send(JSON.stringify({
                payload: {
                    matchId: matchId,
                    sessionId: sessionId,
                    joinDelaySec: 1,
                },
                name: "Play",
            }));
        }
    }
}
export default new matchmaker();
//# sourceMappingURL=matchmaker.js.map