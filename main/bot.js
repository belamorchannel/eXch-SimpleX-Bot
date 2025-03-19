const { getRates, extractCurrencies, getOrderStatus } = require('../api/api');
const { sendMessage, sendImage } = require('../websocket/websock');
const TransactionTracker = require('./txtrack');
const AntiSpam = require('../protection/antispam');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');

const HelpCommand = require('../commands/helpcmd');
const InfoCommands = require('../commands/infocmd');
const ExchangeCommands = require('../commands/exchangecmd');
const OrderCommands = require('../commands/ordercmd');
const RefundCommands = require('../commands/refundcmd');
const SupportCommands = require('../commands/supportcmd');

class Bot {
    constructor(ws) {
        this.ws = ws;
        this.connectedUsers = new Set();
        this.availableCurrencies = ['BTC', 'BTCLN', 'DAI', 'DASH', 'ETH', 'LTC', 'USDC', 'USDT', 'XMR'];
        this.activeExchanges = new Set();
        this.exchangePending = new Map();

        this.helpCommand = new HelpCommand(this);
        this.infoCommands = new InfoCommands(this);
        this.exchangeCommands = new ExchangeCommands(this);
        this.orderCommands = new OrderCommands(this);
        this.refundCommands = new RefundCommands(this);
        this.supportCommands = new SupportCommands(this);

        this.transactionTracker = new TransactionTracker(this);
        this.antiSpam = new AntiSpam(5000);

        this.initializeCurrencies();
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

    isSystemMessage(text) {
        const systemMessagePatterns = [
            'contact deleted',
            'This conversation is protected by quantum resistant end-to-end encryption',
            'Disappearing messages:',
            'Full deletion:',
            'Message reactions:',
            'Voice messages:',
            'Audio/video calls:',
            'Profile updated',
            'updated profile',
            'Notification:',
            'System:',
            /^\[.*\]\s*Contact\s/
        ];
        return systemMessagePatterns.some(pattern => {
            if (typeof pattern === 'string') {
                return pattern === 'updated profile' ? text === pattern : text.startsWith(pattern);
            } else if (pattern instanceof RegExp) {
                return pattern.test(text);
            }
            return false;
        });
    }

    async handleMessage(response, ws) {
        this.ws = ws;
        if (response.resp?.type === 'subscriptionEnd') {
            console.log('Subscription ended, attempting to reconnect in 5 seconds...');
            return;
        }

        if (response.resp?.type === 'profile') {
            const link = response.resp.invitationLink;
            if (link) console.log('Bot Invitation Link:', link);
        }

        if (response.resp?.type === 'contactRequest') {
            const contact = response.resp.contact;
            const contactName = contact.localDisplayName;
            const contactId = contact.contactId;
            console.log(`New contact request from: ${contactName} (ID: ${contactId})`);
            await this.safeSendMessage(contactName, 'accept', ws);
            console.log(`Contact accepted: ${contactName}`);
            if (!this.connectedUsers.has(contactId)) {
                await this.helpCommand.execute(contactName, ['/help'], ws);
                this.connectedUsers.add(contactId);
            }
        }

        if (response.resp?.type === 'newChatItems') {
            const item = response.resp.chatItems?.[0];
            if (!item || !item.chatItem || response.resp.chatItems.length === 0) {
                console.log('Ignoring newChatItems event with no valid chatItem:', JSON.stringify(response.resp, null, 2));
                return;
            }

            const chatItem = item.chatItem;
            if (chatItem.chatDir?.type === 'directRcv') {
                const senderContact = item.chatInfo.contact;
                const senderName = senderContact.localDisplayName;
                const senderId = senderContact.contactId;
                const itemText = chatItem.meta?.itemText || '';
                console.log(`Message from ${senderName} (ID: ${senderId}): ${itemText}`);

                if (!this.connectedUsers.has(senderId)) {
                    console.log(`New user detected: ${senderName} (ID: ${senderId}), sending /help`);
                    await this.helpCommand.execute(senderName, ['/help'], ws);
                    this.connectedUsers.add(senderId);
                }

                if (this.isSystemMessage(itemText)) {
                    console.log(`Ignoring system message/notification from ${senderName}: ${itemText}`);
                    return;
                }

                await this.processCommand(senderName, itemText, ws);
            }
        }
    }

    async safeSendMessage(senderName, message, ws) {
        try {
            if (!ws || typeof ws.send !== 'function') {
                throw new Error('WebSocket connection is not available or has been closed');
            }
            console.log(`Sending to ${senderName}: ${message}`);
            if (senderName.includes(' ')) {
                console.warn(`Warning: Username "${senderName}" contains a space, messages may not be delivered due to SimpleX CLI limitation.`);
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

    async sendImage(senderName, filePath, ws) {
        try {
            if (!ws || typeof ws.send !== 'function') {
                throw new Error('WebSocket connection is not available or has been closed');
            }
            console.log(`Sending image to ${senderName}: ${filePath}`);
            if (senderName.includes(' ')) {
                console.warn(`Warning: Username "${senderName}" contains a space, image may not be delivered due to SimpleX CLI limitation.`);
            }
            await sendImage(senderName, filePath, ws);
        } catch (error) {
            console.error(`Failed to send image to ${senderName}:`, error.message);
            if (ws && typeof ws.send === 'function') {
                await sendMessage(senderName, 
                    `!1 ⚠️ Error Sending QR Code: ${error.message}!\nContact support@exch.cx`, ws);
            }
        }
    }

    async sendDepositAddress(senderName, orderId, ws) {
        try {
            const orderInfo = await getOrderStatus(orderId);
            if (orderInfo.from_addr && orderInfo.from_addr !== '_GENERATING_') {
                await this.safeSendMessage(senderName, 
                    `!2 Deposit Address!\n${orderInfo.from_addr}`, ws);

                // Генерация QR-кода в папке main
                const qrPath = path.join(__dirname, `${orderId}.jpg`);
                await QRCode.toFile(qrPath, orderInfo.from_addr, {
                    type: 'jpg',
                    errorCorrectionLevel: 'H',
                    width: 300
                });

                await this.sendImage(senderName, qrPath, ws);

                setTimeout(async () => {
                    try {
                        await fs.unlink(qrPath);
                        console.log(`QR code ${qrPath} deleted after 60 seconds`);
                    } catch (deleteError) {
                        console.error(`Failed to delete QR code ${qrPath}:`, deleteError.message);
                    }
                }, 60000);

                await this.safeSendMessage(senderName, 
                    '!2 Guarantee Letter Downloads!\n' +
                    `Link: https://exch.cx/order/${orderId}/fetch_guarantee\n` +
                    `Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/${orderId}/fetch_guarantee`, ws);
            } else {
                await this.safeSendMessage(senderName, 
                    'Deposit Address is Generating...\nCheck status with !2 /order ' + orderId + '!', ws);
            }
        } catch (error) {
            await this.safeSendMessage(senderName, 
                `!1 ⚠️ Error Fetching Address or Generating QR: ${error.message}!\nContact support@exch.cx`, ws);
            console.error(`Error in sendDepositAddress for ${senderName}:`, error);
        }
    }

    async processCommand(senderName, text, ws) {
        const spamCheck = this.antiSpam.canExecute(senderName);
        if (!spamCheck.allowed) {
            await this.safeSendMessage(senderName, spamCheck.message, ws);
            return;
        }

        if (this.exchangePending.has(senderName)) {
            const mode = text.trim().toLowerCase();
            await this.exchangeCommands.handleModeSelection(senderName, mode, ws);
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
                default:
                    await this.safeSendMessage(senderName, 
                        '!1 ⚠️ Unknown Command!\nUse !2 /help! for a list of commands.', ws);
            }
        } else {
            await this.safeSendMessage(senderName, 
                '!1 ⚠️ Unknown Command!\nUse !2 /help! for a list of commands.', ws);
        }
    }
}

module.exports = Bot;