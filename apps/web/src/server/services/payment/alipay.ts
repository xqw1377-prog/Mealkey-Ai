import crypto from "crypto";

function normalizePem(raw: string, type: "PRIVATE KEY" | "PUBLIC KEY" | "RSA PRIVATE KEY"): string {
  const trimmed = raw.trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
}

function getAlipayConfig() {
  const appId = process.env.ALIPAY_APP_ID?.trim();
  const privateKeyRaw = process.env.ALIPAY_PRIVATE_KEY?.trim();
  const publicKeyRaw = process.env.ALIPAY_PUBLIC_KEY?.trim();

  if (!appId || !privateKeyRaw || !publicKeyRaw) {
    return null;
  }

  const baseUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  return {
    appId,
    privateKey: normalizePem(privateKeyRaw, "PRIVATE KEY"),
    publicKey: normalizePem(publicKeyRaw, "PUBLIC KEY"),
    gateway: (process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do").trim(),
    notifyUrl: process.env.ALIPAY_NOTIFY_URL?.trim() || `${baseUrl}/api/billing/notify/alipay`,
    returnUrl: process.env.ALIPAY_RETURN_URL?.trim() || `${baseUrl}/billing`,
  };
}

export function isAlipayConfigured(): boolean {
  return getAlipayConfig() !== null;
}

function centsToYuan(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}

function buildSignContent(params: Record<string, string>): string {
  return Object.keys(params)
    .filter((key) => key !== "sign" && key !== "sign_type" && params[key] !== undefined && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

function signParams(params: Record<string, string>, privateKey: string): string {
  const content = buildSignContent(params);
  return crypto.createSign("RSA-SHA256").update(content, "utf8").sign(privateKey, "base64");
}

function verifyParams(params: Record<string, string>, publicKey: string): boolean {
  const sign = params.sign;
  if (!sign) return false;
  const content = buildSignContent(params);
  return crypto.createVerify("RSA-SHA256").update(content, "utf8").verify(publicKey, sign, "base64");
}

export function createAlipayPagePay(input: {
  orderNo: string;
  subject: string;
  amountCents: number;
  notifyUrl?: string;
  returnUrl?: string;
}): { payUrl: string } {
  const config = getAlipayConfig();
  if (!config) {
    throw new Error("未配置支付宝支付");
  }

  const bizContent = JSON.stringify({
    out_trade_no: input.orderNo,
    product_code: "FAST_INSTANT_TRADE_PAY",
    total_amount: centsToYuan(input.amountCents),
    subject: input.subject.slice(0, 256),
  });

  const params: Record<string, string> = {
    app_id: config.appId,
    method: "alipay.trade.page.pay",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    version: "1.0",
    notify_url: input.notifyUrl || config.notifyUrl,
    return_url: input.returnUrl || config.returnUrl,
    biz_content: bizContent,
  };

  params.sign = signParams(params, config.privateKey);

  const query = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  return { payUrl: `${config.gateway}?${query}` };
}

export type ChannelTradeQueryResult =
  | { status: "paid"; tradeNo: string }
  | { status: "unpaid" }
  | { status: "closed" }
  | { status: "unknown"; detail: string };

/**
 * 按商户订单号查单：alipay.trade.query
 */
export async function queryAlipayOrderByOutTradeNo(
  orderNo: string,
): Promise<ChannelTradeQueryResult> {
  const config = getAlipayConfig();
  if (!config) {
    return { status: "unknown", detail: "支付宝未配置" };
  }

  const params: Record<string, string> = {
    app_id: config.appId,
    method: "alipay.trade.query",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    version: "1.0",
    biz_content: JSON.stringify({ out_trade_no: orderNo }),
  };
  params.sign = signParams(params, config.privateKey);

  const body = Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");

  let response: Response;
  try {
    response = await fetch(config.gateway, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
      body,
    });
  } catch (error) {
    return {
      status: "unknown",
      detail: `支付宝查单网络失败：${(error as Error).message || "unknown"}`,
    };
  }

  const text = await response.text();
  let payload: {
    alipay_trade_query_response?: {
      code?: string;
      msg?: string;
      sub_code?: string;
      sub_msg?: string;
      trade_status?: string;
      trade_no?: string;
    };
  } = {};
  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    return { status: "unknown", detail: `支付宝查单响应无效：${text.slice(0, 120)}` };
  }

  const data = payload.alipay_trade_query_response;
  if (!data) {
    return { status: "unknown", detail: "支付宝查单缺少 response" };
  }

  if (data.sub_code === "ACQ.TRADE_NOT_EXIST") {
    return { status: "unpaid" };
  }

  if (data.code !== "10000") {
    return {
      status: "unknown",
      detail: data.sub_msg || data.msg || data.sub_code || data.code || "query_failed",
    };
  }

  const status = (data.trade_status || "").toUpperCase();
  if (status === "TRADE_SUCCESS" || status === "TRADE_FINISHED") {
    return { status: "paid", tradeNo: data.trade_no || "" };
  }
  if (status === "TRADE_CLOSED") {
    return { status: "closed" };
  }
  if (status === "WAIT_BUYER_PAY" || !status) {
    return { status: "unpaid" };
  }

  return { status: "unknown", detail: `未识别 trade_status=${status}` };
}

export function verifyAlipayNotify(
  params: Record<string, string>,
): { orderNo: string; tradeNo: string; success: boolean } {
  const config = getAlipayConfig();
  if (!config) {
    throw new Error("未配置支付宝支付");
  }

  if (!verifyParams(params, config.publicKey)) {
    throw new Error("支付宝回调验签失败");
  }

  const orderNo = params.out_trade_no || "";
  const tradeNo = params.trade_no || "";
  const success = params.trade_status === "TRADE_SUCCESS" || params.trade_status === "TRADE_FINISHED";

  if (!orderNo) {
    throw new Error("支付宝回调缺少商户订单号");
  }

  return { orderNo, tradeNo, success };
}
