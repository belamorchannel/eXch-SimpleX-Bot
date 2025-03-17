const { requestRefund, confirmRefund } = require('../api/api');

class RefundCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async refund(senderName, args, ws) {
        try {
            if (args.length !== 2) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /refund <order_id>!', ws);
                return;
            }
            const refundResult = await requestRefund(args[1]);
            const refundMessage = refundResult.result 
                ? `!2 Refund Requested for Order ${args[1]}!\n` +
                  'Check status with !2 /order ' + args[1] + '!'
                : `!1 ⚠️ Error: ${refundResult.error}!`;
            await this.bot.safeSendMessage(senderName, refundMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /refund: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async refundConfirm(senderName, args, ws) {
        try {
            if (args.length !== 3) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /refund_confirm <order_id> <refund_address>!', ws);
                return;
            }
            const confirmResult = await confirmRefund(args[1], args[2]);
            const confirmMessage = confirmResult.result 
                ? `!2 Refund Confirmed for Order ${args[1]}!\n` +
                  'Check status with !2 /order ' + args[1] + '!'
                : `!1 ⚠️ Error: ${confirmResult.error}!`;
            await this.bot.safeSendMessage(senderName, confirmMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /refund_confirm: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = RefundCommands;