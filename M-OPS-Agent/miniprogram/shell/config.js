/**
 * Shell 可配置端点（无后端时全部本机降级）
 */
function getAppSafe() {
  try {
    return getApp();
  } catch (e) {
    return null;
  }
}

function cfg() {
  const g = (getAppSafe() && getAppSafe().globalData) || {};
  return {
    /** 可选：POST { code } → { openid, unionid, userId } */
    authApiUrl: g.authApiUrl || "",
    /** 可选：Brain 云同步 POST/GET */
    brainApiUrl: g.brainApiUrl || "",
    /** 可选：远程能力市场 JSON */
    marketplaceUrl: g.marketplaceUrl || "",
    /** 本地打包的远程清单（开发用） */
    marketplaceLocalPath: g.marketplaceLocalPath || "",
    mealkeyOsUrl: g.mealkeyOsUrl || "https://mealkey.app",
  };
}

module.exports = {
  cfg: cfg,
};
