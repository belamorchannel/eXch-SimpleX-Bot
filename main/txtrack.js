const { getOrderStatus } = require('../api/api');

class TransactionTracker {
    constructor(bot) {
        this.bot = bot;
        this.activeOrders = new Map(); // Map of user -> { orderId, startTime, lastState }
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
                    const elapsedTime = (Date.now() - startTime) / 1000 / 60; // Time in minutes
                    const orderInfo = await getOrderStatus(orderId);

                    // Check for inactivity (no deposit within 30 minutes)
                    if (elapsedTime >= 30) {
                        if (orderInfo.state === 'AWAITING_INPUT' && !orderInfo.from_amount_received) {
                            // Notify user and remove from tracking
                            await this.bot.safeSendMessage(user, 
                                `!1 ⚠️ Order ${orderId} Removed from Tracking!\n` +
                                `No funds received within 30 minutes.\n` +
                                `You can still track the order manually via the links below:\n` +
                                `Link: https://exch.cx/order/${orderId}\n` +
                                `Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/${orderId}`, 
                                this.bot.ws
                            );
                            this.removeOrder(user);
                            console.log(`Order ${orderId} for user ${user} removed from tracking due to no funds received`);
                            continue;
                        }
                    }

                    // Track order progress
                    if (orderInfo.state !== lastState) {
                        orderData.lastState = orderInfo.state;
                        switch (orderInfo.state) {
                            case 'AWAITING_INPUT':
                                if (orderInfo.from_amount_received) {
                                    await this.bot.safeSendMessage(user, 
                                        `!2 Order ${orderId} Update!\n` +
                                        `Deposit Detected: ${orderInfo.from_amount_received} ${orderInfo.from_currency}\n` +
                                        `Awaiting confirmation...`, 
                                        this.bot.ws
                                    );
                                    console.log(`Deposit detected for order ${orderId} for user ${user}`);
                                }
                                break;
                            case 'CONFIRMING_INPUT':
                                await this.bot.safeSendMessage(user, 
                                    `!2 Order ${orderId} Update!\n` +
                                    `Deposit Confirmed!\n` +
                                    `Processing exchange...`, 
                                    this.bot.ws
                                );
                                console.log(`Deposit confirmed for order ${orderId} for user ${user}`);
                                break;
                            case 'EXCHANGING':
                            case 'FUNDED':
                            case 'BRIDGING':
                                await this.bot.safeSendMessage(user, 
                                    `!2 Order ${orderId} Update!\n` +
                                    `Funds Received!\n` +
                                    `Sending transaction...`, 
                                    this.bot.ws
                                );
                                console.log(`Funds received, sending transaction for order ${orderId} for user ${user}`);
                                break;
                            case 'CONFIRMING_SEND':
                                await this.bot.safeSendMessage(user, 
                                    `!2 Order ${orderId} Update!\n` +
                                    `Transaction Sent!\n` +
                                    `Awaiting final confirmation...`, 
                                    this.bot.ws
                                );
                                console.log(`Transaction sent for order ${orderId} for user ${user}`);
                                break;
                            case 'COMPLETE':
                                await this.bot.safeSendMessage(user, 
                                    `!2 Order ${orderId} Update!\n` +
                                    `Exchange Completed Successfully!\n` +
                                    `Check your wallet for ${orderInfo.to_amount} ${orderInfo.to_currency}.\n` +
                                    `Transaction ID: ${orderInfo.transaction_id_sent || 'N/A'}\n` +
                                    `Link: https://exch.cx/order/${orderId}\n` +
                                    `Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/${orderId}`, 
                                    this.bot.ws
                                );
                                console.log(`Exchange completed for order ${orderId} for user ${user}`);
                                this.removeOrder(user);
                                break;
                            case 'CANCELLED':
                            case 'REFUNDED':
                                await this.bot.safeSendMessage(user, 
                                    `!1 ⚠️ Order ${orderId} ${orderInfo.state}!\n` +
                                    `The order has been ${orderInfo.state.toLowerCase()}.\n` +
                                    `Link: https://exch.cx/order/${orderId}\n` +
                                    `Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/${orderId}`, 
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
        }, 30000); // Check every 30 seconds
    }
}

module.exports = TransactionTracker;