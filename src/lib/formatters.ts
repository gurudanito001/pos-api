export function isValidNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, '');
  return /^(\+?234|0)[789][01]\d{8}$/.test(cleaned);
}

export function normalizeNigerianPhone(phone: string): string {
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

export function maskPhone(phone: string): string {
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

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Africa/Lagos',
  });
}

export function formatDateStr(date: Date): string {
  const now = new Date();
  const time = formatTime(date);

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
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

export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

let receiptSeq = 1;
export function generateReceiptNumber(): string {
  const timeSuffix = Date.now().toString().slice(-4);
  receiptSeq = (receiptSeq + 1) % 999;
  return `#RCP-${timeSuffix}${receiptSeq}`;
}

export function buildReceiptShareMessage(
  shopName: string,
  shopAddress: string | null,
  receiptNumber: string,
  totalAmount: number,
): string {
  const addressPart = shopAddress ? `\n${shopAddress}` : '';
  const formattedAmount = totalAmount.toLocaleString('en-NG');
  return `${shopName}${addressPart}\nReceipt ${receiptNumber}\nTotal: ₦${formattedAmount}\nThank you for your business!`;
}
