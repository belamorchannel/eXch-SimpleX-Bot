const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;
const AFFILIATE_ID = process.env.AFFILIATE_ID;

if (!API_BASE_URL) {
    throw new Error('API_BASE_URL must be set in the .env file');
}

const addressPatterns = {
    BTC: /^(?:[13][a-km-zA-HJ-NP-Z1-9]{25,34}|bc1[a-z0-9]{39,59})$/,
    BTCLN: /^ln[a-z0-9]{20,}$/,
    ETH: /^0x[a-fA-F0-9]{40}$/,
    DAI: /^0x[a-fA-F0-9]{40}$/,
    USDC: /^0x[a-fA-F0-9]{40}$/,
    USDT: /^0x[a-fA-F0-9]{40}$/,
    LTC: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
    DASH: /^X[1-9A-HJ-NP-Za-km-z]{33}$/,
    XMR: /^[48][0-9AB][1-9A-HJ-NP-Za-km-z]{93}$/
};

function validateAddress(currency, address) {
    const pattern = addressPatterns[currency] || /.*/;
    return pattern.test(address.trim());
}

async function getRates(rateMode = 'dynamic') {
    try {
        const response = await axios.get(`${API_BASE_URL}/rates`, {
            params: { rate_mode: rateMode, api_key: API_KEY },
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to fetch rates: ${error.message}`);
    }
}

async function getReserves() {
    try {
        const rates = await getRates('dynamic');
        const reserves = {};
        for (const [pair, info] of Object.entries(rates)) {
            const [, toCurrency] = pair.split('_');
            reserves[toCurrency] = Math.max(reserves[toCurrency] || 0, info.reserve);
        }
        return reserves;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to fetch reserves: ${error.message}`);
    }
}

async function getPairInfo(fromCurrency, toCurrency, rateMode = 'dynamic') {
    try {
        const rates = await getRates(rateMode);
        const pairKey = `${fromCurrency}_${toCurrency}`;
        if (!rates[pairKey]) {
            throw new Error(`Pair ${fromCurrency} to ${toCurrency} not supported`);
        }
        return {
            rate: parseFloat(rates[pairKey].rate),
            reserve: parseFloat(rates[pairKey].reserve),
            fee: parseFloat(rates[pairKey].svc_fee)
        };
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to fetch pair info: ${error.message}`);
    }
}

async function getVolume() {
    try {
        const response = await axios.get(`${API_BASE_URL}/volume`, {
            params: { api_key: API_KEY },
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        console.warn('API /volume unavailable:', error.message);
        return null;
    }
}

async function getStatus() {
    try {
        const response = await axios.get(`${API_BASE_URL}/status`, {
            params: { api_key: API_KEY },
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        console.warn('API /status unavailable:', error.message);
        return null;
    }
}

async function createExchange(fromCurrency, toCurrency, toAddress, amount, options = {}) {
    const { refundAddress = '', rateMode = 'dynamic', feeOption = 'f', ref = AFFILIATE_ID } = options;
    try {
        const response = await axios.post(`${API_BASE_URL}/create`, new URLSearchParams({
            from_currency: fromCurrency,
            to_currency: toCurrency,
            to_address: toAddress,
            amount: amount,
            refund_address: refundAddress,
            rate_mode: rateMode,
            fee_option: feeOption,
            ref,
            api_key: API_KEY
        }), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest' 
            }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to create exchange: ${error.message}`);
    }
}

async function getOrderStatus(orderId) {
    const maxRetries = 3;
    const retryDelay = 2000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const response = await axios.get(`${API_BASE_URL}/order`, {
                params: { orderid: orderId, api_key: API_KEY },
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                timeout: 10000
            });
            if (response.data.error) throw new Error(response.data.error);
            return response.data;
        } catch (error) {
            console.error(`Attempt ${attempt} failed for order ${orderId}: ${error.message}`);
            if (attempt === maxRetries) {
                throw new Error(error.response?.data?.error || `Failed to fetch order status: ${error.message}`);
            }
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
}

async function fetchGuarantee(orderId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/order/fetch_guarantee`, {
            params: { orderid: orderId, api_key: API_KEY },
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
            responseType: 'arraybuffer'
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to fetch guarantee: ${error.message}`);
    }
}

async function requestRefund(orderId) {
    try {
        const response = await axios.post(`${API_BASE_URL}/order/refund`, new URLSearchParams({
            orderid: orderId,
            api_key: API_KEY
        }), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest' 
            }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to request refund: ${error.message}`);
    }
}

async function confirmRefund(orderId, refundAddress) {
    try {
        const response = await axios.post(`${API_BASE_URL}/order/refund_confirm`, new URLSearchParams({
            orderid: orderId,
            refund_address: refundAddress,
            api_key: API_KEY
        }), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest' 
            }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to confirm refund: ${error.message}`);
    }
}

async function revalidateAddress(orderId, toAddress) {
    try {
        const response = await axios.post(`${API_BASE_URL}/order/revalidate_address`, new URLSearchParams({
            orderid: orderId,
            to_address: toAddress,
            api_key: API_KEY
        }), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest' 
            }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to revalidate address: ${error.message}`);
    }
}

async function removeOrder(orderId) {
    try {
        const response = await axios.post(`${API_BASE_URL}/order/remove`, new URLSearchParams({
            orderid: orderId,
            api_key: API_KEY
        }), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest' 
            }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to remove order: ${error.message}`);
    }
}

async function sendSupportMessage(orderId, message) {
    try {
        const response = await axios.post(`${API_BASE_URL}/order/support_message`, new URLSearchParams({
            orderid: orderId,
            supportmessage: message,
            api_key: API_KEY
        }), {
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest' 
            }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to send support message: ${error.message}`);
    }
}

async function getSupportMessages(orderId) {
    try {
        const response = await axios.get(`${API_BASE_URL}/order/support_messages`, {
            params: { orderid: orderId, api_key: API_KEY },
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        if (response.data.error) throw new Error(response.data.error);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || `Failed to fetch support messages: ${error.message}`);
    }
}

function formatRates(data) {
    let response = '💱 Exchange Rates\n\n';
    for (const [pair, info] of Object.entries(data)) {
        const [from, to] = pair.split('_');
        response += `${from} → ${to}: ${parseFloat(info.rate).toLocaleString('en-US', { maximumFractionDigits: 8 })}\n`;
    }
    return response.trim();
}

function formatReserves(data) {
    let response = '📦 Currency Reserves\n\n';
    for (const [currency, reserve] of Object.entries(data)) {
        response += `${currency}: ${parseFloat(reserve).toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    }
    return response.trim();
}

function formatVolume(data) {
    if (!data) return '📊 24-Hour Volume Unavailable\nContact support@exch.cx for assistance.';
    let response = '📊 24-Hour Volume\n\n';
    for (const [currency, volume] of Object.entries(data)) {
        response += `${currency}: ${parseFloat(volume).toLocaleString('en-US', { maximumFractionDigits: 2 })}\n`;
    }
    return response.trim();
}

function formatStatus(data) {
    if (!data) return '🌐 Network Status Unavailable\nContact support@exch.cx for assistance.';
    let response = '🌐 Network Status\n\n';
    for (const [network, info] of Object.entries(data)) {
        let line = `${network}: ${info.status === 'online' ? 'Online ✅' : 'Offline ❌'}`;
        if (info.aggregated_balance) line += ` | Balance: ${parseFloat(info.aggregated_balance).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
        response += line + '\n';
    }
    return response.trim();
}

function formatOrderStatus(orderInfo) {
    const svcFeePercent = parseFloat(orderInfo.svc_fee || 0).toFixed(2);
    const networkFee = orderInfo.network_fee || '0';
    const toAmount = orderInfo.to_amount || 'Pending';

    let response = 'ℹ️ Order Details\n\n' +
        `Order ID: ${orderInfo.orderid}\n` +
        `Status: ${orderInfo.state}${orderInfo.state_error ? ` (Error: ${orderInfo.state_error})` : ''}\n` +
        `Pair: ${orderInfo.from_currency} → ${orderInfo.to_currency}\n` +
        `Rate: 1 ${orderInfo.from_currency} = ${parseFloat(orderInfo.rate || 0).toFixed(8)} ${orderInfo.to_currency}\n` +
        `Rate Mode: ${orderInfo.rate_mode || 'N/A'} (${(parseFloat(orderInfo.rate_mode_fee || 0) * 100).toFixed(1)}%)\n` +
        `Sending: ${orderInfo.from_currency} | Received: ${orderInfo.from_amount_received || 'Pending'}\n` +
        `Receiving: ${orderInfo.to_currency} | To Receive: ${toAmount}\n` +
        `Service Fee: ${svcFeePercent}%\n` +
        `Network Fee: ${networkFee} ${orderInfo.to_currency}\n` +
        `Recipient Address: ${orderInfo.to_addr || 'Not set'}\n` +
        `Deposit Address: ${orderInfo.from_addr || 'Generating...'}\n` +
        `Link: https://exch.cx/order/${orderInfo.orderid}\n` +
        `Tor Link: http://hszyoqwrcp7cxlxnqmovp6vjvmnwj33g4wviuxqzq47emieaxjaperyd.onion/order/${orderInfo.orderid}\n`;

    if (orderInfo.state_error === 'TO_ADDRESS_INVALID') {
        response += `\n🔧 Invalid address detected. Use /revalidate_address ${orderInfo.orderid} <new_address> to update.`;
    }
    if (orderInfo.refund_available) {
        response += `\n🔙 Refund available! Use /refund ${orderInfo.orderid} to request.`;
    }
    if (orderInfo.from_addr && (orderInfo.min_input || orderInfo.max_input)) {
        const minInput = orderInfo.min_input || 'Not available yet';
        const maxInput = orderInfo.max_input || 'Not available yet';
        response += `\n💸 Send ${orderInfo.from_currency} to: ${orderInfo.from_addr}\nMin: ${minInput} ${orderInfo.from_currency} Max: ${maxInput} ${orderInfo.from_currency}`;
    }
    return response.trim();
}

function formatSupportMessages(messages) {
    let response = '💬 Support Chat\n\n';
    if (!Array.isArray(messages) || messages.length === 0) {
        return response + 'No messages yet. Start a chat with /support_message <order_id> <message>.';
    }
    for (const msg of messages) {
        response += `[${new Date(msg.timestamp).toLocaleString()}] ${msg.sender}: ${msg.message}\n`;
    }
    return response.trim();
}

function extractCurrencies(rates) {
    const currencies = new Set();
    for (const pair of Object.keys(rates)) {
        const [from, to] = pair.split('_');
        currencies.add(from);
        currencies.add(to);
    }
    return Array.from(currencies).sort();
}

module.exports = { 
    getRates, formatRates, getReserves, formatReserves, getVolume, formatVolume,
    getStatus, formatStatus, createExchange, getOrderStatus, fetchGuarantee,
    requestRefund, confirmRefund, revalidateAddress, removeOrder,
    sendSupportMessage, getSupportMessages, validateAddress, getPairInfo,
    formatOrderStatus, formatSupportMessages, extractCurrencies
};