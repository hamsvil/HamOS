const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// In-memory queue for commands
const commandQueue = [];

// Endpoint for external systems to send commands to the agent
app.post('/api/command', (req, res) => {
    const { secret, command } = req.body;
    
    if (secret !== process.env.RELAY_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (!command) {
        return res.status(400).json({ error: 'Command is required' });
    }
    
    commandQueue.push(command);
    res.json({ status: 'Command queued', queueLength: commandQueue.length });
});

// Endpoint for the Android agent to poll for commands
app.get('/api/poll', (req, res) => {
    const { secret } = req.query;
    
    if (secret !== process.env.RELAY_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    
    if (commandQueue.length > 0) {
        const command = commandQueue.shift();
        res.json({ command });
    } else {
        res.json({ command: null });
    }
});

app.listen(port, () => {
    console.log(`Aeterna Relay Server listening on port ${port}`);
});
