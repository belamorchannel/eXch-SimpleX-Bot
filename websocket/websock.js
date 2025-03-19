const WebSocket = require('ws');
const net = require('net');

function waitForPort(port, timeout = 60000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkPort = () => {
            const socket = new net.Socket();
            socket
                .setTimeout(1000)
                .on('connect', () => {
                    socket.destroy();
                    resolve(true);
                })
                .on('timeout', () => {
                    socket.destroy();
                    if (Date.now() - startTime > timeout) reject(new Error(`Port ${port} not available after ${timeout}ms`));
                    else setTimeout(checkPort, 1000);
                })
                .on('error', () => {
                    if (Date.now() - startTime > timeout) reject(new Error(`Port ${port} not available after ${timeout}ms`));
                    else setTimeout(checkPort, 1000);
                })
                .connect(port, '127.0.0.1');
        };
        checkPort();
    });
}

function sendMessage(senderName, messageContent, ws) {
    return new Promise((resolve, reject) => {
        const corrId = "id" + Math.round(Math.random() * 999999);

        const escapedName = senderName.includes(' ') ? `'${senderName}'` : senderName;
        const cmd = `@${escapedName} ${messageContent}`;
        const message = JSON.stringify({ corrId, cmd });
        console.log(`Sending: ${message}`);
        ws.send(message, (error) => {
            error ? reject(error) : resolve();
        });
    });
}

function sendImage(senderName, filePath, ws) {
    return new Promise((resolve, reject) => {
        const corrId = "id" + Math.round(Math.random() * 999999);

        const escapedName = senderName.includes(' ') ? `'${senderName}'` : senderName;
        const cmd = `/img @${escapedName} ${filePath}`;
        const message = JSON.stringify({ corrId, cmd });
        console.log(`Sending: ${message}`);
        ws.send(message, (error) => {
            error ? reject(error) : resolve();
        });
    });
}

function subscribeToEvents(ws) {
    const corrId = "id" + Math.round(Math.random() * 999999);
    ws.send(JSON.stringify({ corrId, cmd: '/subscribe on' }));
}

function getInvitationLink(ws) {
    const corrId = "id" + Math.round(Math.random() * 999999);
    ws.send(JSON.stringify({ corrId, cmd: '/connect' }));
}

function connectWebSocket(port, messageHandler) {
    let ws = new WebSocket(`ws://localhost:${port}`);

    ws.on('open', () => {
        console.log('WebSocket connected');
        subscribeToEvents(ws);
        getInvitationLink(ws);
    });

    ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        messageHandler(response, ws);
    });

    ws.on('error', (error) => console.error('WebSocket error:', error.message));
    ws.on('close', () => {
        console.log('WebSocket closed, reconnecting...');
        setTimeout(() => connectWebSocket(port, messageHandler), 5000);
    });

    return ws;
}

module.exports = { waitForPort, sendMessage, sendImage, connectWebSocket };
