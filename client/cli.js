require('dotenv').config();
const { spawn } = require('child_process');
const net = require('net');

const SIMPLEX_PATH = process.env.SIMPLEX_PATH;
const SIMPLEX_DB = process.env.SIMPLEX_DB;
const PORT = process.env.PORT;

function checkPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') resolve(true);
        });
        server.once('listening', () => {
            server.close();
            resolve(false);
        });
        server.listen(port);
    });
}

function startClient(port = PORT) {
    return new Promise((resolve, reject) => {
        const quotedPath = `"${SIMPLEX_PATH}"`;
        const quotedDb = `"${SIMPLEX_DB}"`;
        console.log(`Starting SimpleX CLI on port ${port}...`);
        const cliProcess = spawn(quotedPath, ['-d', quotedDb, '-p', port.toString()], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: true
        });

        cliProcess.stdout.on('data', (data) => console.log(`CLI: ${data.toString()}`));
        cliProcess.stderr.on('data', (data) => console.error(`CLI Error: ${data.toString()}`));
        cliProcess.on('error', (error) => reject(error));
        cliProcess.on('close', (code) => {
            console.log(`CLI exited with code ${code}`);
            code === 0 ? resolve(cliProcess) : reject(new Error(`CLI exited with code ${code}`));
        });

        setTimeout(() => resolve(cliProcess), 1000);
    });
}

module.exports = { startClient, checkPortInUse };