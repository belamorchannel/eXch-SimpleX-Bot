const { getRates, extractCurrencies, getOrderStatus } = require('../api/api');
const { sendMessage } = require('../websocket/websock');
const { addOrder, updateOrderState } = require('../database/db');

const HelpCommand = require('../commands/helpcmd');
const InfoCommands = require('../commands/infocmd');
const ExchangeCommands = require('../commands/exchangecmd');
const OrderCommands = require('../commands/ordercmd');
const RefundCommands = require('../commands/refundcmd');
const SupportCommands = require('../commands/supportcmd');
const UserOrdersCommands = require('../commands/userOrdersCmd');

class Bot {
    constructor() {
        this.connectedUsers = new Set();
        this.availableCurrencies = ['BTC', 'BTCLN', 'DAI', 'DASH', 'ETH', 'LTC', 'USDC', 'USDT', 'XMR'];
        this.activeExchanges = new Set();
        this.exchangePending = new Map();
        this.activeOrders = new Map();

        this.helpCommand = new HelpCommand(this);
        this.infoCommands = new InfoCommands(this);
        this.exchangeCommands = new ExchangeCommands(this);
        this.orderCommands = new OrderCommands(this);
        this.refundCommands = new RefundCommands(this);
        this.supportCommands = new SupportCommands(this);
        this.userOrdersCommands = new UserOrdersCommands(this);

        this.initializeCurrencies();
        this.startOrderMonitoring();
    }

    async initializeCurrencies() {
        try {
            const rates = await getRates('dynamic');
            this.availableCurrencies = extractCurrencies(rates).length ? extractCurrencies(rates) : this.availableCurrencies;
            console.log('Available currencies:', this.availableCurrencies);
        } catch (error) {
            console.error('Failed to initialize currencies:', error.message);
        }
    }

    startOrderMonitoring() {
        setInterval(async () => {
            for (const [orderId, { senderName, ws, lastState }] of this.activeOrders) {
                try {
                    const orderInfo = await getOrderStatus(orderId);
                    const currentState = orderInfo.state;

                    if (currentState !== lastState) {
                        console.log(`Order ${orderId} state changed from ${lastState} to ${currentState}`);
                        await this.sendStateUpdate(senderName, orderInfo, ws);
                        try {
                            await updateOrderState(orderId, currentState);
                            console.log(`Updated order ${orderId} state in DB to ${currentState}`);
                        } catch (dbError) {
                            console.error(`Failed to update order ${orderId} in DB: ${dbError.message}`);
                        }
                        this.activeOrders.set(orderId, { senderName, ws, lastState: currentState });
                    }

                    if (['COMPLETE', 'REFUNDED', 'CANCELLED'].includes(currentState)) {
                        this.activeOrders.delete(orderId);
                        console.log(`Order ${orderId} removed from active monitoring`);
                    }
                } catch (error) {
                    console.error(`Failed to check order ${orderId}: ${error.message}`);
                    await this.safeSendMessage(senderName, 
                        `!1 ⚠️ Error checking order ${orderId}: ${error.message}!\nContact support@exch.cx`, ws);
                    this.activeOrders.delete(orderId);
                }
            }
        }, 30000);
    }

    async sendStateUpdate(senderName, orderInfo, ws) {
        const stateMessages = {
            'CREATED': `!2 Order ${orderInfo.orderid} Created!\nPlease send funds to: ${orderInfo.from_addr}\nMin: ${orderInfo.min_input} ${orderInfo.from_currency}, Max: ${orderInfo.max_input} ${orderInfo.from_currency}`,
            'AWAITING_INPUT': `!2 Order ${orderInfo.orderid} Awaiting Input!\nSend funds to: ${orderInfo.from_addr}\nMin: ${orderInfo.min_input} ${orderInfo.from_currency}, Max: ${orderInfo.max_input} ${orderInfo.from_currency}`,
            'CONFIRMING_INPUT': `!2 Order ${orderInfo.orderid} Confirming Input!\nDeposit received: ${orderInfo.from_amount_received} ${orderInfo.from_currency}. Awaiting blockchain confirmation...`,
            'EXCHANGING': `!2 Order ${orderInfo.orderid} Exchanging!\nProcessing your exchange. This may take a few minutes...`,
            'FUNDED': `!2 Order ${orderInfo.orderid} Funded!\nDeposit confirmed: ${orderInfo.from_amount_received} ${orderInfo.from_currency}. Preparing to send ${orderInfo.to_amount} ${orderInfo.to_currency}...`,
            'BRIDGING': `!2 Order ${orderInfo.orderid} Bridging!\nTransferring funds between networks. This may take some time...`,
            'CONFIRMING_SEND': `!2 Order ${orderInfo.orderid} Confirming Send!\nSending ${orderInfo.to_amount} ${orderInfo.to_currency} to ${orderInfo.to_address}. Awaiting blockchain confirmation...`,
            'COMPLETE': `!2 Order ${orderInfo.orderid} Complete!\n${orderInfo.to_amount} ${orderInfo.to_currency} sent! Transaction ID: ${orderInfo.transaction_id_sent}\nLink: https://exch.cx/order/${orderInfo.orderid}`,
            'CANCELLED': `!1 ⚠️ Order ${orderInfo.orderid} Cancelled!\nReason: ${orderInfo.state_error || 'User cancelled'}. Contact support@exch.cx if needed.`,
            'REFUND_REQUEST': `!2 Order ${orderInfo.orderid} Refund Requested!\nPlease confirm refund with /refund_confirm ${orderInfo.orderid} <refund_address>`,
            'REFUND_PENDING': `!2 Order ${orderInfo.orderid} Refund Pending!\nProcessing your refund request...`,
            'CONFIRMING_REFUND': `!2 Order ${orderInfo.orderid} Confirming Refund!\nRefunding ${orderInfo.from_amount_received} ${orderInfo.from_currency}. Awaiting blockchain confirmation...`,
            'REFUNDED': `!2 Order ${orderInfo.orderid} Refunded!\n${orderInfo.from_amount_received} ${orderInfo.from_currency} sent to your refund address. Transaction ID: ${orderInfo.transaction_id_sent}`
        };

        const message = stateMessages[orderInfo.state] || `!1 ⚠️ Order ${orderInfo.orderid} in unknown state: ${orderInfo.state}\nContact support@exch.cx`;
        await this.safeSendMessage(senderName, message, ws);

        if (orderInfo.state_error) {
            await this.safeSendMessage(senderName, 
                `!1 ⚠️ Error: ${orderInfo.state_error} for Order ${orderInfo.orderid}!\nTake action if required.`, ws);
        }
    }

    isSystemMessage(text) {
        const systemMessagePatterns = [
            'contact deleted',
            'This conversation is protected by quantum resistant end-to-end encryption',
            'Disappearing messages:',
            'Full deletion:',
            'Message reactions:',
            'Voice messages:',
            'Audio/video calls:'
        ];
        return systemMessagePatterns.some(pattern => text.startsWith(pattern));
    }

    async handleMessage(response, ws) {
        if (response.resp?.type === 'subscriptionEnd') {
            console.log('Subscription ended, attempting to reconnect in 5 seconds...');
            setTimeout(() => {
                console.log('Reconnection attempt triggered');
            }, 5000);
            return;
        }

        if (response.resp?.type === 'profile') {
            const link = response.resp.invitationLink;
            if (link) console.log('Bot Invitation Link:', link);
        }

        if (response.resp?.type === 'contactRequest') {
            const contactName = response.resp.contact.localDisplayName;
            console.log(`New contact request from: ${contactName}`);
            await this.safeSendMessage(contactName, 'accept', ws);
            console.log(`Contact accepted: ${contactName}`);
        }

        if (response.resp?.type === 'newChatItems') {
            const item = response.resp.chatItems?.[0];
            if (!item || !item.chatItem) {
                console.log('Received newChatItems event with no valid chatItem:', JSON.stringify(response.resp, null, 2));
                return;
            }

            const chatItem = item.chatItem;
            if (chatItem.chatDir?.type === 'directRcv') {
                const senderName = item.chatInfo.contact?.localDisplayName;
                const itemText = chatItem.meta?.itemText || '';
                console.log(`Message from ${senderName}: ${itemText}`);

                if (this.isSystemMessage(itemText)) {
                    console.log(`Ignoring system message from ${senderName}: ${itemText}`);
                    if (!this.connectedUsers.has(senderName)) {
                        const welcomeMessage = 
                            'Welcome to eXch Bot\n\n' +
                            'Your gateway to secure crypto exchanges\n' +
                            'Use !2 /help! for commands or !2 /exchange <from> <to> <address>! to begin an exchange.';
                        await this.safeSendMessage(senderName, welcomeMessage, ws);
                        this.connectedUsers.add(senderName);
                    }
                } else {
                    await this.processCommand(senderName, itemText, ws);
                }
            } else {
                console.log('Received chat item is not a direct message:', JSON.stringify(chatItem, null, 2));
            }
        }
    }

    async safeSendMessage(senderName, message, ws) {
        try {
            if (!ws || typeof ws.send !== 'function') {
                throw new Error('WebSocket connection is not available or has been closed');
            }
            await sendMessage(senderName, message, ws);
        } catch (error) {
            console.error(`Failed to send message to ${senderName}:`, error.message);
            if (ws && typeof ws.send === 'function') {
                await sendMessage(senderName, 
                    `!1 ⚠️ Connection Error: ${error.message}!\nPlease try again or contact support@exch.cx`, ws);
            }
        }
    }

    async processCommand(senderName, text, ws) {
        if (this.exchangePending.has(senderName)) {
            const mode = text.trim().toLowerCase();
            await this.exchangeCommands.handleModeSelection(senderName, mode, ws);
            return;
        }

        if (!this.connectedUsers.has(senderName)) {
            const welcomeMessage = 
                'Welcome to eXch Bot\n\n' +
                'Your gateway to secure crypto exchanges\n' +
                'Use !2 /help! for commands or !2 /exchange <from> <to> <address>! to begin an exchange.';
            await this.safeSendMessage(senderName, welcomeMessage, ws);
            this.connectedUsers.add(senderName);
            return;
        }

        const parts = text.trim().split(' ');
        const command = parts[0].toLowerCase();
        const args = parts;

        if (command.startsWith('/')) {
            switch (command) {
                case '/help':
                    await this.helpCommand.execute(senderName, args, ws);
                    break;

                case '/rates':
                    await this.infoCommands.rates(senderName, args, ws);
                    break;

                case '/reserves':
                    await this.infoCommands.reserves(senderName, args, ws);
                    break;

                case '/volume':
                    await this.infoCommands.volume(senderName, args, ws);
                    break;

                case '/status':
                    await this.infoCommands.status(senderName, args, ws);
                    break;

                case '/exchange':
                    await this.exchangeCommands.exchange(senderName, args, ws);
                    break;

                case '/cancel':
                    await this.exchangeCommands.cancel(senderName, args, ws);
                    break;

                case '/order':
                    await this.orderCommands.order(senderName, args, ws);
                    break;

                case '/fetch_guarantee':
                    await this.orderCommands.fetchGuarantee(senderName, args, ws);
                    break;

                case '/revalidate_address':
                    await this.orderCommands.revalidateAddress(senderName, args, ws);
                    break;

                case '/remove_order':
                    await this.orderCommands.removeOrder(senderName, args, ws);
                    break;

                case '/refund':
                    await this.refundCommands.refund(senderName, args, ws);
                    break;

                case '/refund_confirm':
                    await this.refundCommands.refundConfirm(senderName, args, ws);
                    break;

                case '/support_message':
                    await this.supportCommands.supportMessage(senderName, args, ws);
                    break;

                case '/support_messages':
                    await this.supportCommands.supportMessages(senderName, args, ws);
                    break;

                case '/myorders':
                    await this.userOrdersCommands.myOrders(senderName, args, ws);
                    break;

                case '/clearorders':
                    await this.userOrdersCommands.clearOrders(senderName, args, ws);
                    break;

                default:
                    await this.safeSendMessage(senderName, 
                        '!1 ⚠️ Unknown Command!\n' +
                        'Use !2 /help! for a list of commands.', ws);
            }
        } else {
            await this.safeSendMessage(senderName, 
                '!1 ⚠️ Unknown Command!\n' +
                'Use !2 /help! for a list of commands.', ws);
        }
    }

    async sendDepositAddress(senderName, orderId, ws) {
        try {
            const orderInfo = await getOrderStatus(orderId);
            if (orderInfo.from_addr && orderInfo.from_addr !== '_GENERATING_') {
                await this.safeSendMessage(senderName, 
                    `!2 Deposit Address!\n` +
                    `${orderInfo.from_addr}`, ws);
                
                await this.safeSendMessage(senderName, 
                    '!2 Guarantee Letter Downloads!\n' +
                    'Link: https://exch.cx/order/' + orderId + '/guarantee\n' +
                    'Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/' + orderId + '/guarantee', ws);

                try {
                    await addOrder(senderName, orderId, orderInfo.state);
                    console.log(`Added order ${orderId} to DB`);
                } catch (dbError) {
                    console.error(`Failed to add order ${orderId} to DB: ${dbError.message}`);
                }

                if (!this.activeOrders.has(orderId)) {
                    this.activeOrders.set(orderId, { senderName, ws, lastState: orderInfo.state });
                }
            } else {
                await this.safeSendMessage(senderName, 
                    'Deposit Address is Generating...\n' +
                    'Check status with !2 /order ' + orderId + '!', ws);
            }
        } catch (error) {
            await this.safeSendMessage(senderName, 
                `!1 ⚠️ Error Fetching Address: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }
}

module.exports = Bot;