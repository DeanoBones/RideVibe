const express = require('express');
const WebSocket = require('ws');
const app = express();
const server = app.listen(process.env.PORT || 3000);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const players = {};
const gridSize = 100;
const halfGrid = gridSize / 2;

wss.on('connection', (ws) => {
    const id = Date.now();
    players[id] = { 
        id, 
        position: { x: 0, y: 0, z: 0 }, 
        rotation: 0, 
        color: 0x00ffff // Default cyan
    };
    ws.send(JSON.stringify({ type: 'init', id, players }));

    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'newPlayer', player: players[id] }));
        }
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'update') {
            players[id] = { 
                id, 
                position: data.position, 
                rotation: data.rotation, 
                newTrail: data.newTrail, 
                spawnTime: data.spawnTime, 
                color: data.color || players[id].color 
            };
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update', player: players[id] }));
                }
            });
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