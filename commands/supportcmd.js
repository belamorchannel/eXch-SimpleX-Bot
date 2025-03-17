const { sendSupportMessage, getSupportMessages, formatSupportMessages } = require('../api/api');

class SupportCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async supportMessage(senderName, args, ws) {
        try {
            if (args.length < 3) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /support_message <order_id> <message>!', ws);
                return;
            }
            const result = await sendSupportMessage(args[1], args.slice(2).join(' '));
            const supportMessage = result.result 
                ? `!2 Support Message Sent for Order ${args[1]}!\n` +
                  'Check replies with !2 /support_messages ' + args[1] + '!'
                : `!1 ⚠️ Error: ${result.error}!`;
            await this.bot.safeSendMessage(senderName, supportMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /support_message: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async supportMessages(senderName, args, ws) {
        try {
            if (args.length !== 2) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /support_messages <order_id>!', ws);
                return;
            }
            const messages = await getSupportMessages(args[1]);
            const formattedMessages = formatSupportMessages(messages);
            const messagesMessage = 
                '!2 Support Chat!\n' +
                'Order ID: `' + args[1] + '`\n' +
                formattedMessages;
            await this.bot.safeSendMessage(senderName, messagesMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /support_messages: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = SupportCommands;