const { getRates, formatRates, getReserves, formatReserves, getStatus, formatStatus } = require('../api/api');

class InfoCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async rates(senderName, args, ws) {
        try {
            const rates = await getRates('dynamic');
            if (!rates || Object.keys(rates).length === 0) {
                throw new Error('No rates data received from API');
            }
            const formattedRates = formatRates(rates);
            await this.bot.safeSendMessage(senderName, 
                '!2 Exchange Rates!\n\n' +
                'Current Rates (Dynamic):\n' +
                formattedRates, ws);
        } catch (error) {
            console.error(`Error in /rates for ${senderName}:`, error.message);
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /rates: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async reserves(senderName, args, ws) {
        try {
            const reserves = await getReserves();
            if (!reserves || Object.keys(reserves).length === 0) {
                throw new Error('No reserves data received from API');
            }
            const formattedReserves = formatReserves(reserves);
            await this.bot.safeSendMessage(senderName, 
                '!2 Currency Reserves!\n\n' +
                'Available Reserves:\n' +
                formattedReserves, ws);
        } catch (error) {
            console.error(`Error in /reserves for ${senderName}:`, error.message);
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /reserves: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async status(senderName, args, ws) {
        try {
            const status = await getStatus();
            if (!status) {
                throw new Error('Status data unavailable');
            }
            const formattedStatus = formatStatus(status);
            await this.bot.safeSendMessage(senderName, 
                '!2 Network Status!\n\n' +
                'Current Network Conditions:\n' +
                formattedStatus, ws);
        } catch (error) {
            console.error(`Error in /status for ${senderName}:`, error.message);
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /status: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = InfoCommands;
