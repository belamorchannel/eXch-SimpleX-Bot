const { getUserOrders, clearUserOrders } = require('../database/db');

class UserOrdersCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async myOrders(senderName, args, ws) {
        try {
            const orders = await getUserOrders(senderName);
            if (orders.length === 0) {
                await this.bot.safeSendMessage(senderName, 
                    'No Orders Found!\nStart an exchange with /exchange <from> <to> <address>.', ws);
                return;
            }

            let message = 'Your Orders:\n\n';
            for (const order of orders) {
                message += '*' + order.orderId + '* - ' + order.state + '\n';
            }
            await this.bot.safeSendMessage(senderName, message, ws);
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `Error in /myorders: ${error.message}\nContact support@exch.cx`, ws);
        }
    }

    async clearOrders(senderName, args, ws) {
        try {
            const changes = await clearUserOrders(senderName);
            if (changes === 0) {
                await this.bot.safeSendMessage(senderName, 
                    'No Orders to Clear!\nStart an exchange with /exchange <from> <to> <address>.', ws);
            } else {
                await this.bot.safeSendMessage(senderName, 
                    `Cleared ${changes} Order(s) Successfully!`, ws);
            }
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `Error in /clearorders: ${error.message}\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = UserOrdersCommands;