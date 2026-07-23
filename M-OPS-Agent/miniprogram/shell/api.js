/**
 * Shell 对外 API（Agent 只应依赖这一层）
 */
const auth = require("./auth.js");
const brain = require("./brain.js");
const wallet = require("./wallet.js");
const mealkeyCta = require("./mealkey-cta.js");
const nav = require("./nav.js");
const referral = require("./referral.js");
const cloudSync = require("./cloud-sync.js");

module.exports = {
  auth: auth,
  brain: brain,
  wallet: wallet,
  nav: nav,
  referral: referral,
  cloudSync: cloudSync,
  promptEnterBrain: mealkeyCta.promptEnterBrain,
  getBrainUrl: mealkeyCta.getBrainUrl,
};
