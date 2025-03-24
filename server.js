const express = require('express');
const { Server } = require('ws');
const app = express();
const PORT = process.env.PORT || 3000; // Render assigns PORT
const path = require('path');

// Serve the index.html at root path
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    console.log('Serving index.html from:', indexPath);  // Add this line for debugging
    res.sendFile(indexPath);
});


// Serve static files from 'public' folder
app.use(express.static('public'));

// Start HTTP server
const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// WebSocket server
const wss = new Server({ server });
let players = {};

wss.on('connection', (ws) => {
    const playerId = Date.now(); // Unique ID for each player
    players[playerId] = { 
        id: playerId, 
        position: { x: 0, y: 0, z: 0 }, 
        rotation: 0, 
        trail: [], 
        color: 0x00ffff // Default color
    };

    // Send initial state to new player
    ws.send(JSON.stringify({ type: 'init', id: playerId, players }));

    // Broadcast new player to others
    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'newPlayer', player: players[playerId] }));
        }
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'update') {
            players[playerId].position = data.position;
            players[playerId].rotation = data.rotation;
            players[playerId].trail = data.trail;
            players[playerId].color = data.color;

            // Broadcast update to others
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'update', player: players[playerId] }));
                }
            });
        }
    });

    ws.on('close', () => {
        delete players[playerId];
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'removePlayer', id: playerId }));
            }
        });
    });
});