require('dotenv').config();
const { startClient } = require('./client/cli');
const { connectWebSocket } = require('./websocket/websock');
const Bot = require('./main/bot');

async function startBot() {
    console.log('Starting..');
    try {
        const cliProcess = await startClient(process.env.PORT);
        console.log('SimpleX CLI started');

        const bot = new Bot();
        connectWebSocket(process.env.PORT, (response, ws) => bot.handleMessage(response, ws));
    } catch (error) {
        console.error('Failed to start SimpleX CLI:', error.message);
        process.exit(1);
    }
}

startBot();