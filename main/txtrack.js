const { getOrderStatus } = require('../api/api');

class TransactionTracker {
    constructor(bot) {
        this.bot = bot;
        this.activeOrders = new Map();
        this.startTracking();
    }

    addOrder(user, orderId) {
        this.activeOrders.set(user, {
            orderId,
            startTime: Date.now(),
            lastState: 'CREATED'
        });
        console.log(`Started tracking order ${orderId} for user ${user}`);
    }

    removeOrder(user) {
        this.activeOrders.delete(user);
        console.log(`Stopped tracking orders for user ${user}`);
    }

    async startTracking() {
        setInterval(async () => {
            for (const [user, orderData] of this.activeOrders.entries()) {
                const { orderId, startTime, lastState } = orderData;
                try {
                    const elapsedTime = (Date.now() - startTime) / 1000 / 60;
                    const orderInfo = await getOrderStatus(orderId);

                    if (elapsedTime >= 30) {
                        if (orderInfo.state === 'AWAITING_INPUT' && !orderInfo.from_amount_received) {
                            await this.bot.safeSendMessage(user, 
                                `!1 ⚠️ Order ${orderId} Removed from Tracking!\n` +
                                `No funds received within 30 minutes.`, 
                                this.bot.ws
                            );
                            this.removeOrder(user);
                            console.log(`Order ${orderId} for user ${user} removed from tracking due to no funds received`);
                            continue;
                        }
                    }

                    if (orderInfo.state !== lastState) {
                        orderData.lastState = orderInfo.state;
                        switch (orderInfo.state) {
                            case 'CONFIRMING_INPUT':
                                if (orderInfo.from_amount_received) {
                                    await this.bot.safeSendMessage(user, 
                                        `!2 ✅ Order ${orderId} - Transaction Detected!\n` +
                                        `We have detected your transaction of ${orderInfo.from_amount_received || 'N/A'} ${orderInfo.from_currency || 'N/A'}. ` +
                                        `Awaiting network confirmation.`, 
                                        this.bot.ws
                                    );
                                    console.log(`Transaction detected for order ${orderId} for user ${user}`);
                                }
                                break;
                            case 'CONFIRMING_SEND':
                                if (orderInfo.to_amount) {
                                    await this.bot.safeSendMessage(user, 
                                        `!2 🚀 Order ${orderId} - Transaction Confirmed & Funds Sent!\n` +
                                        `The transaction has been confirmed. We are sending you ${orderInfo.to_amount || 'N/A'} ${orderInfo.to_currency || 'N/A'}. ` +
                                        `Awaiting final confirmation.`, 
                                        this.bot.ws
                                    );
                                    console.log(`Funds sent for order ${orderId} for user ${user}`);
                                }
                                break;
                            case 'COMPLETE':
                                if (orderInfo.transaction_id_sent) {
                                    await this.bot.safeSendMessage(user, 
                                        `!2 🎉 Order ${orderId} - Transaction Completed!\n` +
                                        `You have received ${orderInfo.to_amount || 'N/A'} ${orderInfo.to_currency || 'N/A'}! ` +
                                        `Transaction ID: ${orderInfo.transaction_id_sent || 'N/A'}.`, 
                                        this.bot.ws
                                    );
                                    console.log(`Exchange completed for order ${orderId} for user ${user}`);

                                    await this.bot.safeSendMessage(user, 
                                        `!2 Do you want to delete this order?!\n` +
                                        `Reply with "yes" to delete it or ignore this message.`, 
                                        this.bot.ws
                                    );
                                    this.bot.pendingTicketRemoval = this.bot.pendingTicketRemoval || new Map();
                                    this.bot.pendingTicketRemoval.set(user, orderId);
                                    console.log(`Order ${orderId} for user ${user} is pending ticket removal`);
                
                                }
                                this.removeOrder(user);
                                break;
                            case 'CANCELLED':
                            case 'REFUNDED':
                                await this.bot.safeSendMessage(user, 
                                    `!1 ⚠️ Order ${orderId} ${orderInfo.state}!\n` +
                                    `The order has been ${orderInfo.state.toLowerCase()}.`, 
                                    this.bot.ws
                                );
                                this.removeOrder(user);
                                console.log(`Order ${orderId} for user ${user} ${orderInfo.state.toLowerCase()}`);
                                break;
                            default:
                                console.log(`Order ${orderId} for user ${user} in state ${orderInfo.state}`);
                        }
                    }
                } catch (error) {
                    console.error(`Error tracking order ${orderId} for user ${user}:`, error.message);
                    await this.bot.safeSendMessage(user, 
                        `!1 ⚠️ Error Tracking Order ${orderId}: ${error.message}!\n` +
                        `Please check the order status manually with !2 /order ${orderId}!`, 
                        this.bot.ws
                    );
                }
            }
        }, 30000);
    }
}

module.exports = TransactionTracker;
