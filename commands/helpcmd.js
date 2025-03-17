class HelpCommand {
    constructor(bot) {
        this.bot = bot;
    }

    async execute(senderName, args, ws) {
        try {
            const helpMessage = 
                '!2 Commands Overview!\n\n' +
                'Exchange Actions\n' +
                '- !2 /rates! - _View current exchange rates_\n' +
                '- !2 /reserves! - _Check currency reserves_\n' +
                '- !2 /volume! - _See 24-hour trading volume_\n' +
                '- !2 /status! - _Check network status_\n' +
                '- !2 /exchange <from> <to> <address>! - _Start an exchange_\n\n' +
                'Order Management\n' +
                '- !2 /order <order_id>! - _Check order status_\n' +
                '- !2 /fetch_guarantee <order_id>! - _Download Letter of Guarantee_\n' +
                '- !2 /revalidate_address <order_id> <to_address>! - _Update recipient address_\n' +
                '- !2 /remove_order <order_id>! - _Delete a completed order_\n' +
                '- !2 /refund <order_id>! - _Request a refund_\n' +
                '- !2 /refund_confirm <order_id> <refund_address>! - _Confirm a refund_\n\n' +
                'Support\n' +
                '- !2 /support_message <order_id> <message>! - _Send a support message_\n' +
                '- !2 /support_messages <order_id>! - _View support chat_\n\n' +
                'Notes\n' +
                '- Supported Currencies: `BTC, BTCLN, DAI, DASH, ETH, LTC, USDC, USDT, XMR`\n' +
                '- Always verify addresses before sending.\n' +
                '- For assistance, email support@exch.cx';
            await this.bot.safeSendMessage(senderName, helpMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /help: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = HelpCommand;