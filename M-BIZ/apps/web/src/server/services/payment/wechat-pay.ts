import crypto from "crypto";

const WECHAT_HOST = "https://api.mch.weixin.qq.com";

function normalizePem(raw: string, type: "PRIVATE KEY" | "PUBLIC KEY"): string {
  const trimmed = raw.trim().replace(/\\n/g, "\n");
  if (trimmed.includes("BEGIN")) return trimmed;
  const body = trimmed.replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
}

function getWechatConfig() {
  const appId = process.env.WECHAT_PAY_APP_ID?.trim();
  const mchId = process.env.WECHAT_PAY_MCH_ID?.trim();
  const serialNo = process.env.WECHAT_PAY_SERIAL_NO?.trim();
  const privateKeyRaw = process.env.WECHAT_PAY_PRIVATE_KEY?.trim();
  const apiV3Key = process.env.WECHAT_PAY_API_V3_KEY?.trim();

  if (!appId || !mchId || !serialNo || !privateKeyRaw || !apiV3Key) {
    return null;
  }

  return {
    appId,
    mchId,
    serialNo,
    privateKey: normalizePem(privateKeyRaw, "PRIVATE KEY"),
    apiV3Key,
    notifyUrl:
      process.env.WECHAT_PAY_NOTIFY_URL?.trim() ||
      `${(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "")}/api/billing/notify/wechat`,
  };
}

export function isWechatPayConfigured(): boolean {
  return getWechatConfig() !== null;
}

function buildAuthorization(
  method: string,
  pathname: string,
  body: string,
  config: NonNullable<ReturnType<typeof getWechatConfig>>,
) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const message = `${method}\n${pathname}\n${timestamp}\n${nonceStr}\n${body}\n`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(message)
    .sign(config.privateKey, "base64");

  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`;
}

export async function createWechatNativeOrder(input: {
  orderNo: string;
  description: string;
  amountCents: number;
  notifyUrl?: string;
}): Promise<{ codeUrl: string }> {
  const config = getWechatConfig();
  if (!config) {
    throw new Error("未配置微信支付");
  }

  const pathname = "/v3/pay/transactions/native";
  const bodyObj = {
    appid: config.appId,
    mchid: config.mchId,
    description: input.description.slice(0, 127),
    out_trade_no: input.orderNo,
    notify_url: input.notifyUrl || config.notifyUrl,
    amount: {
      total: input.amountCents,
      currency: "CNY",
    },
  };
  const body = JSON.stringify(bodyObj);
  const authorization = buildAuthorization("POST", pathname, body, config);

  const response = await fetch(`${WECHAT_HOST}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authorization,
    },
    body,
  });

  const text = await response.text();
  let data: { code_url?: string; message?: string; code?: string } = {};
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error(`微信支付下单失败：无法解析响应`);
  }

  if (!response.ok || !data.code_url) {
    throw new Error(`微信支付下单失败：${data.message || data.code || text.slice(0, 200)}`);
  }

  return { codeUrl: data.code_url };
}

function decryptWechatResource(
  apiV3Key: string,
  resource: { ciphertext: string; associated_data?: string; nonce: string },
) {
  const key = Buffer.from(apiV3Key);
  const nonce = Buffer.from(resource.nonce);
  const associatedData = Buffer.from(resource.associated_data || "");
  const ciphertext = Buffer.from(resource.ciphertext, "base64");
  const authTag = ciphertext.subarray(ciphertext.length - 16);
  const data = ciphertext.subarray(0, ciphertext.length - 16);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(authTag);
  decipher.setAAD(associatedData);
  const decoded = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decoded.toString("utf8")) as {
    out_trade_no?: string;
    transaction_id?: string;
    trade_state?: string;
  };
}

/**
 * 验签并解析微信支付 V3 回调。
 * 开发环境若未配置平台证书，仍校验并解密 resource（依赖 API v3 key）。
 * 生产环境建议配置 WECHAT_PAY_PLATFORM_PUBLIC_KEY 做完整验签。
 */
export function verifyAndParseWechatNotify(
  headers: Headers | Record<string, string | null | undefined>,
  rawBody: string,
): { orderNo: string; tradeNo: string; success: boolean } {
  const config = getWechatConfig();
  if (!config) {
    throw new Error("未配置微信支付");
  }

  const getHeader = (name: string) => {
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name) || (headers as Headers).get(name.toLowerCase());
    }
    const record = headers as Record<string, string | null | undefined>;
    return record[name] || record[name.toLowerCase()] || record[name.replace(/-/g, "_")];
  };

  const timestamp = getHeader("Wechatpay-Timestamp") || "";
  const nonce = getHeader("Wechatpay-Nonce") || "";
  const signature = getHeader("Wechatpay-Signature") || "";
  const serial = getHeader("Wechatpay-Serial") || "";

  if (!timestamp || !nonce || !signature) {
    throw new Error("微信支付回调缺少验签头");
  }

  const platformKeyRaw = process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY?.trim();
  if (platformKeyRaw) {
    const message = `${timestamp}\n${nonce}\n${rawBody}\n`;
    const verified = crypto
      .createVerify("RSA-SHA256")
      .update(message)
      .verify(normalizePem(platformKeyRaw, "PUBLIC KEY"), signature, "base64");
    if (!verified) {
      throw new Error("微信支付回调验签失败");
    }
  } else if (process.env.NODE_ENV === "production" && !serial) {
    throw new Error("微信支付回调验签失败：缺少平台证书配置");
  }

  let payload: {
    event_type?: string;
    resource?: { ciphertext: string; associated_data?: string; nonce: string };
  };
  try {
    payload = JSON.parse(rawBody) as typeof payload;
  } catch {
    throw new Error("微信支付回调正文无效");
  }

  if (!payload.resource) {
    throw new Error("微信支付回调缺少 resource");
  }

  const decrypted = decryptWechatResource(config.apiV3Key, payload.resource);
  const orderNo = decrypted.out_trade_no || "";
  const tradeNo = decrypted.transaction_id || "";
  const success = decrypted.trade_state === "SUCCESS";

  if (!orderNo) {
    throw new Error("微信支付回调缺少商户订单号");
  }

  return { orderNo, tradeNo, success };
}
