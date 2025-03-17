const { getOrderStatus, fetchGuarantee, revalidateAddress, removeOrder, formatOrderStatus } = require('../api/api');

class OrderCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async order(senderName, args, ws) {
        try {
            if (args.length !== 2) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /order <order_id>!', ws);
                return;
            }
            const orderInfo = await getOrderStatus(args[1]);
            const formattedOrder = formatOrderStatus(orderInfo);
            const orderMessage = 
                '!2 Order Status!\n' +
                'Order ID: `' + args[1] + '`\n' +
                formattedOrder;
            await this.bot.safeSendMessage(senderName, orderMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /order: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async fetchGuarantee(senderName, args, ws) {
        try {
            if (args.length !== 2) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /fetch_guarantee <order_id>!', ws);
                return;
            }
            await fetchGuarantee(args[1]);
            const guaranteeMessage = 
                '!2 Letter of Guarantee for Order ' + args[1] + '!\n' +
                'Link: https://exch.cx/order/' + args[1] + '/fetch_guarantee\n' +
                'Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/' + args[1] + '/fetch_guarantee';
            await this.bot.safeSendMessage(senderName, guaranteeMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /fetch_guarantee: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async revalidateAddress(senderName, args, ws) {
        try {
            if (args.length !== 3) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /revalidate_address <order_id> <to_address>!', ws);
                return;
            }
            const result = await revalidateAddress(args[1], args[2]);
            if (result.result) {
                const orderInfo = await getOrderStatus(args[1]);
                const formattedOrder = formatOrderStatus(orderInfo);
                const revalidateMessage = 
                    '!2 Address Updated for Order ' + args[1] + '!\n\n' +
                    'Updated Order Status:\n' +
                    formattedOrder;
                await this.bot.safeSendMessage(senderName, revalidateMessage, ws);
            } else {
                await this.bot.safeSendMessage(senderName, `!1 ⚠️ Error: ${result.error}!`, ws);
            }
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /revalidate_address: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async removeOrder(senderName, args, ws) {
        try {
            if (args.length !== 2) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /remove_order <order_id>!', ws);
                return;
            }
            const result = await removeOrder(args[1]);
            const removeMessage = result.result 
                ? `!2 Order ${args[1]} Removed Successfully!`
                : `!1 ⚠️ Error: ${result.error}!`;
            await this.bot.safeSendMessage(senderName, removeMessage, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /remove_order: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = OrderCommands;