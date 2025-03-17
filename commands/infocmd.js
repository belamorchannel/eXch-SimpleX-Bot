const { getRates, formatRates, getReserves, formatReserves, getVolume, formatVolume, getStatus, formatStatus } = require('../api/api');

class InfoCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async rates(senderName, args, ws) {
        try {
            const rates = await getRates('dynamic');
            const formattedRates = formatRates(rates);
            const ratesMessage = 
                '!2 Exchange Rates!\n\n' +
                'Current Rates (Dynamic):\n' +
                formattedRates;
            await this.bot.safeSendMessage(senderName, ratesMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /rates: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async reserves(senderName, args, ws) {
        try {
            const reserves = await getReserves();
            const formattedReserves = formatReserves(reserves);
            const reservesMessage = 
                '!2 Currency Reserves!\n\n' +
                'Available Reserves:\n' +
                formattedReserves;
            await this.bot.safeSendMessage(senderName, reservesMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /reserves: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async volume(senderName, args, ws) {
        try {
            const volume = await getVolume();
            const formattedVolume = formatVolume(volume);
            const volumeMessage = 
                '!2 24-Hour Trading Volume!\n\n' +
                'Trading Activity:\n' +
                formattedVolume;
            await this.bot.safeSendMessage(senderName, volumeMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /volume: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async status(senderName, args, ws) {
        try {
            const status = await getStatus();
            const formattedStatus = formatStatus(status);
            const statusMessage = 
                '!2 Network Status!\n\n' +
                'Current Network Conditions:\n' +
                formattedStatus;
            await this.bot.safeSendMessage(senderName, statusMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /status: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = InfoCommands;