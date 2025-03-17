const { createExchange, getOrderStatus, validateAddress, getPairInfo } = require('../api/api');

class ExchangeCommands {
    constructor(bot) {
        this.bot = bot;
    }

    async exchange(senderName, args, ws) {
        try {
            if (args.length !== 4) {
                const currencyList = this.bot.availableCurrencies.join(', ');
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Format!\n' +
                    'Use: !2 /exchange <from> <to> <address>!\n' +
                    `Example: /exchange BTC ETH 0x123...\n` +
                    `Available Currencies: ${currencyList}`, ws);
                return;
            }

            const fromCurrency = args[1].toUpperCase();
            const toCurrency = args[2].toUpperCase();
            const toAddress = args[3].trim();

            if (!this.bot.availableCurrencies.includes(fromCurrency)) {
                await this.bot.safeSendMessage(senderName, 
                    `!1 ⚠️ Invalid From Currency: ${fromCurrency}!\n` +
                    `Available Currencies: ${this.bot.availableCurrencies.join(', ')}`, ws);
                return;
            }
            if (!this.bot.availableCurrencies.includes(toCurrency)) {
                await this.bot.safeSendMessage(senderName, 
                    `!1 ⚠️ Invalid To Currency: ${toCurrency}!\n` +
                    `Available Currencies: ${this.bot.availableCurrencies.join(', ')}`, ws);
                return;
            }
            if (!validateAddress(toCurrency, toAddress)) {
                await this.bot.safeSendMessage(senderName, `!1 ⚠️ Invalid Address Format for ${toCurrency}!`, ws);
                return;
            }

            const flatInfo = await getPairInfo(fromCurrency, toCurrency, 'flat');
            const dynamicInfo = await getPairInfo(fromCurrency, toCurrency, 'dynamic');

            const modeMessage = 
                '!2 Select Exchange Mode!\n' +
                `Pair: ${fromCurrency} → ${toCurrency}\n\n` +
                `Flat Mode:\n` +
                `Rate: 1 ${fromCurrency} = ${flatInfo.rate.toFixed(8)} ${toCurrency}\n` +
                `Service Fee: ${flatInfo.fee.toFixed(2)}%\n\n` +
                `Dynamic Mode:\n` +
                `Rate: 1 ${fromCurrency} = ${dynamicInfo.rate.toFixed(8)} ${toCurrency}\n` +
                `Service Fee: ${dynamicInfo.fee.toFixed(2)}%\n\n` +
                `Currency Reserve: ${flatInfo.reserve.toFixed(2)} ${toCurrency}\n\n` +
                `Reply with "flat" or "dynamic" to proceed.`;

            await this.bot.safeSendMessage(senderName, modeMessage, ws);
            this.bot.exchangePending.set(senderName, { fromCurrency, toCurrency, toAddress });
        } catch (error) {
            await this.bot.safeSendMessage(senderName, 
                `!1 ⚠️ Error in /exchange: ${error.message}!\nContact support@exch.cx`, ws);
        }
    }

    async handleModeSelection(senderName, mode, ws) {
        try {
            if (!this.bot.exchangePending.has(senderName)) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ No Pending Exchange!\nUse !2 /exchange <from> <to> <address>! to start.', ws);
                return;
            }

            const pending = this.bot.exchangePending.get(senderName);
            const { fromCurrency, toCurrency, toAddress } = pending;

            if (mode !== 'flat' && mode !== 'dynamic') {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Mode!\nPlease reply with "flat" or "dynamic".', ws);
                return;
            }

            const feeOption = mode === 'flat' ? 'f' : 'd';
            const result = await createExchange(fromCurrency, toCurrency, toAddress, 0.001, { 
                refundAddress: '', rateMode: mode, feeOption: feeOption 
            });
            const orderId = result.orderid;

            if (this.bot.activeExchanges.has(orderId)) {
                await this.bot.safeSendMessage(senderName, `!1 ⚠️ Order ${orderId} is already being processed!`, ws);
                this.bot.exchangePending.delete(senderName);
                return;
            }
            this.bot.activeExchanges.add(orderId);

            let orderInfo = await getOrderStatus(orderId);
            let attempts = 0;
            const maxAttempts = 5;
            const delay = 3000;

            while ((!orderInfo.from_addr || !orderInfo.min_input || !orderInfo.max_input) && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, delay));
                orderInfo = await getOrderStatus(orderId);
                attempts++;
            }

            const minInput = orderInfo.min_input || 'Not available yet';
            const maxInput = orderInfo.max_input || 'Not available yet';
            const rate = parseFloat(orderInfo.rate || 0);
            const fee = parseFloat(orderInfo.svc_fee || 0);

            const exchangeMessage = 
                `!2 Exchange Created Successfully!\n` +
                `Order ID: \`${orderId}\`\n` +
                `Pair: ${fromCurrency} → ${toCurrency}\n` +
                `Mode: ${mode}\n` +
                `Rate: 1 ${fromCurrency} = ${rate.toFixed(8)} ${toCurrency}\n` +
                `Service Fee: ${fee.toFixed(2)}%\n` +
                `!3 SEND ANY AMOUNT IN THIS RANGE!\n` +
                `Min: ${minInput} ${fromCurrency}\n` +
                `Max: ${maxInput} ${fromCurrency}\n` +
                `Recipient Address: \`${toAddress}\`\n` +
                `Link: https://exch.cx/order/${orderId}\n` +
                `Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/${orderId}\n` +
                `_Deposit address will be generated in 5-15 seconds._`;

            await this.bot.safeSendMessage(senderName, exchangeMessage, ws);
            await new Promise(resolve => setTimeout(resolve, 15000));
            await this.bot.sendDepositAddress(senderName, orderId, ws);

            // Add the order to transaction tracking
            this.bot.transactionTracker.addOrder(senderName, orderId);

            this.bot.activeExchanges.delete(orderId);
            this.bot.exchangePending.delete(senderName);
        } catch (error) {
            if (error.message.includes('TO_ADDRESS_INVALID')) {
                await this.bot.safeSendMessage(senderName, 
                    '!1 ⚠️ Invalid Address!\nUse !2 /revalidate_address <order_id> <new_address>! to update.', ws);
            } else {
                await this.bot.safeSendMessage(senderName, 
                    `!1 ⚠️ Error in Mode Selection: ${error.message}!\nContact support@exch.cx`, ws);
            }
            this.bot.exchangePending.delete(senderName);
        }
    }
}

module.exports = ExchangeCommands;