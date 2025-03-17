require('dotenv').config();
const { startClient } = require('./client/cli');
const { connectWebSocket } = require('./websocket/websock');
const Bot = require('./main/bot');

async function startBot() {
    console.log('Starting..');
    try {
        await startClient(process.env.PORT);
        console.log('SimpleX CLI started');

        let ws;
        const bot = new Bot(ws);
        ws = connectWebSocket(process.env.PORT, (response, ws) => bot.handleMessage(response, ws));
    } catch (error) {
        console.error('Failed to start SimpleX CLI:', error.message);
        process.exit(1);
    }
}

startBot();