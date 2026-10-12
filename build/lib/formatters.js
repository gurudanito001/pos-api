"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidNigerianPhone = isValidNigerianPhone;
exports.normalizeNigerianPhone = normalizeNigerianPhone;
exports.maskPhone = maskPhone;
exports.formatTime = formatTime;
exports.formatDateStr = formatDateStr;
exports.formatRelativeTime = formatRelativeTime;
exports.generateReceiptNumber = generateReceiptNumber;
exports.buildReceiptShareMessage = buildReceiptShareMessage;
function isValidNigerianPhone(phone) {
    const cleaned = phone.replace(/\s+/g, '');
    return /^(\+?234|0)[789][01]\d{8}$/.test(cleaned);
}
function normalizeNigerianPhone(phone) {
    const cleaned = phone.replace(/\s+/g, '');
    if (cleaned.startsWith('+234')) {
        return cleaned;
    }
    if (cleaned.startsWith('234')) {
        return `+${cleaned}`;
    }
    if (cleaned.startsWith('0')) {
        return `+234${cleaned.slice(1)}`;
    }
    return `+234${cleaned}`;
}
function maskPhone(phone) {
    const normalized = normalizeNigerianPhone(phone);
    // Example: +2348031234567 -> +234 803 *** 4567
    if (normalized.length >= 14) {
        const country = normalized.slice(0, 4); // +234
        const network = normalized.slice(4, 7); // 803
        const last4 = normalized.slice(-4); // 4567
        return `${country} ${network} *** ${last4}`;
    }
    return normalized;
}
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Africa/Lagos',
    });
}
function formatDateStr(date) {
    const now = new Date();
    const time = formatTime(date);
    const isToday = date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayStr = `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
    if (isToday) {
        return `Today, ${time} (${dayStr})`;
    }
    if (isYesterday) {
        return `Yesterday, ${time} (${dayStr})`;
    }
    return `${dayStr}, ${time}`;
}
function formatRelativeTime(date) {
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMinutes < 1)
        return 'Just now';
    if (diffMinutes < 60)
        return `${diffMinutes} minutes ago`;
    if (diffHours === 1)
        return '1 hour ago';
    if (diffHours < 24)
        return `${diffHours} hours ago`;
    if (diffDays === 1)
        return 'Yesterday';
    if (diffDays < 7)
        return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
let receiptCounter = Math.floor(Math.random() * 400) + 100;
function generateReceiptNumber() {
    receiptCounter += 1;
    return `#RCP-${receiptCounter}`;
}
function buildReceiptShareMessage(shopName, shopAddress, receiptNumber, totalAmount) {
    const addressPart = shopAddress ? `\n${shopAddress}` : '';
    const formattedAmount = totalAmount.toLocaleString('en-NG');
    return `${shopName}${addressPart}\nReceipt ${receiptNumber}\nTotal: ₦${formattedAmount}\nThank you for your business!`;
}
