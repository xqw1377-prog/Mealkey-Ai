/** 微信内置浏览器（含企业微信） */
export function isWeChatBrowser(ua?: string): boolean {
  const value =
    ua ||
    (typeof navigator !== "undefined" ? navigator.userAgent : "") ||
    "";
  return /MicroMessenger/i.test(value);
}

/** 百度 App / 百度框等内置浏览器 */
export function isBaiduBrowser(ua?: string): boolean {
  const value =
    ua ||
    (typeof navigator !== "undefined" ? navigator.userAgent : "") ||
    "";
  return /baiduboxapp|baidubrowser|BDBrowser|BaiduHD|BaiduBrowser/i.test(
    value,
  );
}

/**
 * 注册/登录等关键流程：内置浏览器兼容差，宜引导系统浏览器。
 * 覆盖微信、百度 App 等。
 */
export function shouldGuideOpenInSystemBrowser(ua?: string): boolean {
  return isWeChatBrowser(ua) || isBaiduBrowser(ua);
}

/** 微信内是否更宜引导「浏览器打开」再扫码（Native 码） */
export function shouldGuideOpenInBrowserForWechatPay(ua?: string): boolean {
  return isWeChatBrowser(ua);
}

/** 微信内 Native 收款三步（产品文案） */
export function wechatPayOpenInBrowserSteps(): string[] {
  return [
    "点右上角 ··· → 在浏览器中打开",
    "在系统浏览器里打开本充值页",
    "用微信「扫一扫」扫页内二维码完成支付",
  ];
}

export function inAppBrowserGuideText(ua?: string): string {
  if (isWeChatBrowser(ua)) {
    return "微信里容易打不开下一步。点右上角 ··· → 在浏览器打开后再注册。";
  }
  if (isBaiduBrowser(ua)) {
    return "百度 App 里容易打不开下一步。请用 Safari / 系统浏览器打开本页再注册。";
  }
  return "当前浏览器兼容性较差。请用 Safari / 系统浏览器打开后再继续。";
}
