const { getOrderStatus, fetchGuarantee, revalidateAddress, removeOrder, formatOrderStatus } = require('../api/api');

class OrderCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async order(senderName, args, ws) {
        try {
            if (args.length !== 2) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\nUse: !2 /order <order_id>!', ws);
                return;
            }
            const orderInfo = await getOrderStatus(args[1]);
            await this.bot.safeSendMessage(senderName, 
                '!2 Order Status!\nOrder ID: `' + args[1] + '`\n' +
                formatOrderStatus(orderInfo), ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /order: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async fetchGuarantee(senderName, args, ws) {
        try {
            if (args.length !== 2) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\nUse: !2 /fetch_guarantee <order_id>!', ws);
                return;
            }
            await fetchGuarantee(args[1]);
            await this.bot.safeSendMessage(senderName, 
                '!2 Letter of Guarantee for Order ' + args[1] + '!\n' +
                `Link: https://exch.cx/order/${args[1]}/fetch_guarantee\n` +
                `Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/${args[1]}/fetch_guarantee`, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /fetch_guarantee: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async revalidateAddress(senderName, args, ws) {
        try {
            if (args.length !== 3) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\nUse: !2 /revalidate_address <order_id> <to_address>!', ws);
                return;
            }
            const result = await revalidateAddress(args[1], args[2]);
            if (result.result) {
                const orderInfo = await getOrderStatus(args[1]);
                await this.bot.safeSendMessage(senderName, 
                    '!2 Address Updated for Order ' + args[1] + '!\n\n' +
                    'Updated Order Status:\n' +
                    formatOrderStatus(orderInfo), ws);
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
                    '!1 ⚠️ Invalid Format!\nUse: !2 /remove_order <order_id>!', ws);
                return;
            }
            const result = await removeOrder(args[1]);
            await this.bot.safeSendMessage(senderName, 
                result.result 
                    ? `!2 Order ${args[1]} Removed Successfully!`
                    : `!1 ⚠️ Error: ${result.error}!`, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /remove_order: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = OrderCommands;