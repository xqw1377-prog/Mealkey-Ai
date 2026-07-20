/**
 * 按时段问候（客户端本地时区）
 */
export function greetingByHour(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 0 && h < 5) return "夜深了";
  if (h < 11) return "早上好";
  if (h < 14) return "中午好";
  if (h < 18) return "下午好";
  return "晚上好";
}
