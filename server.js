const express = require('express');
const WebSocket = require('ws');
const app = express();
const server = app.listen(process.env.PORT || 3000);
const wss = new WebSocket.Server({ server });

app.use(express.static('public'));

const players = {};

wss.on('connection', (ws) => {
    const id = Date.now();
    players[id] = { id, position: { x: 0, y: 0, z: 0 }, rotation: 0, color: 0x00ffff };
    ws.send(JSON.stringify({ type: 'init', id, players }));

    wss.clients.forEach(client => {
        if (client !== ws) client.send(JSON.stringify({ type: 'newPlayer', player: players[id] }));
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
                color: data.color 
            };
            wss.clients.forEach(client => {
                if (client !== ws) client.send(JSON.stringify({ type: 'update', player: players[id] }));
            });
        }
    });

    ws.on('close', () => {
        delete players[id];
        wss.clients.forEach(client => client.send(JSON.stringify({ type: 'removePlayer', id })));
    });
});