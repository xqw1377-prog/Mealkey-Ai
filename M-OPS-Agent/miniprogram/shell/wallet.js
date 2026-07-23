/**
 * Shell · Token 钱包（欢迎金 + 扣减 + 裂变入账；首价值不硬挡）
 */
const WALLET_KEY = "mk_shell_wallet";
const WELCOME_GRANT = 500;

function loadWallet() {
  try {
    return wx.getStorageSync(WALLET_KEY) || null;
  } catch (e) {
    return null;
  }
}

function saveWallet(w) {
  try {
    wx.setStorageSync(WALLET_KEY, w);
  } catch (e) {
    console.warn("[shell] wallet save fail", e);
  }
  try {
    const app = getApp();
    if (app && app.globalData) app.globalData.wallet = w;
  } catch (e) {}
}

function ensureWallet() {
  let w = loadWallet();
  if (w) return w;
  w = {
    balance: WELCOME_GRANT,
    welcomeGranted: true,
    ledger: [
      {
        at: new Date().toISOString(),
        delta: WELCOME_GRANT,
        reason: "welcome",
        note: "新用户欢迎 Token",
      },
    ],
  };
  saveWallet(w);
  return w;
}

function getBalance() {
  return ensureWallet().balance;
}

function credit(amount, meta) {
  meta = meta || {};
  const n = Number(amount) || 0;
  if (n <= 0) return ensureWallet();
  const w = ensureWallet();
  w.balance += n;
  w.ledger.unshift({
    at: new Date().toISOString(),
    delta: n,
    reason: meta.reason || "credit",
    note: meta.note || "入账",
    sku: meta.sku || "",
  });
  w.ledger = w.ledger.slice(0, 80);
  saveWallet(w);
  return w;
}

/**
 * @returns {{ ok: boolean, soft: boolean, balance: number, message: string }}
 */
function charge(sku, opts) {
  opts = opts || {};
  const w = ensureWallet();
  const cost = Number((sku && sku.tokenCost) || 0);
  const blockFirstValue = !!opts.blockFirstValue;
  if (cost <= 0) {
    return { ok: true, soft: false, balance: w.balance, message: "免费" };
  }
  if (w.balance >= cost) {
    w.balance -= cost;
    w.ledger.unshift({
      at: new Date().toISOString(),
      delta: -cost,
      reason: "charge",
      sku: sku.sku || "",
      note: sku.title || "",
    });
    w.ledger = w.ledger.slice(0, 80);
    saveWallet(w);
    return {
      ok: true,
      soft: false,
      balance: w.balance,
      message: "已扣 " + cost + " Token",
    };
  }
  if (!blockFirstValue) {
    w.ledger.unshift({
      at: new Date().toISOString(),
      delta: 0,
      reason: "soft_grant",
      sku: sku.sku || "",
      note: "首价值软放行（余额不足）",
    });
    saveWallet(w);
    return {
      ok: true,
      soft: true,
      balance: w.balance,
      message: "欢迎额度/软放行：首价值不受阻",
    };
  }
  return {
    ok: false,
    soft: false,
    balance: w.balance,
    message: "Token 不足",
  };
}

module.exports = {
  WELCOME_GRANT: WELCOME_GRANT,
  ensureWallet: ensureWallet,
  getBalance: getBalance,
  charge: charge,
  credit: credit,
  loadWallet: loadWallet,
};
