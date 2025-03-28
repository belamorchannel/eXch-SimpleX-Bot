const { sendSupportMessage, getSupportMessages, formatSupportMessages } = require('../api/api');

class SupportCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async supportMessage(senderName, args, ws) {
        try {
            if (args.length < 3) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\nUse: !2 /support_message <order_id> <message>!', ws);
                return;
            }
            const result = await sendSupportMessage(args[1], args.slice(2).join(' '));
            await this.bot.safeSendMessage(senderName, 
                result.result 
                    ? `!2 Support Message Sent for Order ${args[1]}!\nCheck replies with !2 /support_messages ${args[1]}!`
                    : `!1 ⚠️ Error: ${result.error}!`, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /support_message: ${error.message}!\nContact support@exch.net`, ws);
        }
    }

    async supportMessages(senderName, args, ws) {
        try {
            if (args.length !== 2) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\nUse: !2 /support_messages <order_id>!', ws);
                return;
            }
            const messages = await getSupportMessages(args[1]);
            await this.bot.safeSendMessage(senderName, 
                '!2 Support Chat!\nOrder ID: `' + args[1] + '`\n' +
                formatSupportMessages(messages), ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /support_messages: ${error.message}!\nContact support@exch.net`, ws);
        }
    }
}

module.exports = SupportCommands;
