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
                speed: data.speed || 6,
                jumped: data.jumped || false // Include jumped, default to false
            };
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
                    speed: data.speed || players[id].speed,
                    newTrail: data.newTrail,
                    jumped: data.jumped !== undefined ? data.jumped : players[id].jumped // Preserve jumped state
                };
                wss.clients.forEach(client => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ 
                            type: 'update', 
                            ...players[id],
                            spawnTime: data.spawnTime // Include spawnTime for consistency
                        }));
                    }
                });
            }
        } else if (data.type === 'getPlayers') {
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