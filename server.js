const express = require('express');
const WebSocket = require('ws');
const app = express();
const server = app.listen(process.env.PORT || 3000);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const players = {};

wss.on('connection', (ws) => {
    const id = Date.now();
    players[id] = { id };
    ws.send(JSON.stringify({ type: 'init', id }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'start') {
            players[id] = {
                id: data.id,
                position: data.position,
                rotation: data.rotation,
                color: data.color,
                speed: data.speed || 6
            };
            // Broadcast new player to all existing clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'start', ...players[id] }));
                }
            });
        } else if (data.type === 'update') {
            if (players[id]) {
                players[id] = {
                    id: data.id || id,
                    position: data.position,
                    rotation: data.rotation,
                    color: data.color || players[id].color,
                    speed: data.speed || players[id].speed
                };
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'update', ...players[id] }));
                    }
                });
            }
        } else if (data.type === 'getPlayers') {
            // Send current players to the newly connected client
            const currentPlayers = Object.values(players).filter(p => p.id !== id);
            ws.send(JSON.stringify({ type: 'currentPlayers', players: currentPlayers }));
        }
    });

    ws.on('close', () => {
        delete players[id];
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'removePlayer', id }));
            }
        });
    });
});