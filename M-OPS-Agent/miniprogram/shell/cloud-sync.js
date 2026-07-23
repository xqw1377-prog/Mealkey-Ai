/**
 * Shell · Brain 云同步队列（有 brainApiUrl 则推送；否则本机 + pending）
 */
const QUEUE_KEY = "mk_shell_brain_sync_queue";
const config = require("./config.js");

function loadQueue() {
  try {
    return wx.getStorageSync(QUEUE_KEY) || [];
  } catch (e) {
    return [];
  }
}

function saveQueue(q) {
  try {
    wx.setStorageSync(QUEUE_KEY, (q || []).slice(0, 40));
  } catch (e) {}
}

function enqueue(event, payload) {
  const q = loadQueue();
  q.unshift({
    id: "sync_" + Date.now().toString(36),
    event: event,
    payload: payload,
    at: new Date().toISOString(),
    tries: 0,
  });
  saveQueue(q);
  flush().catch(function () {});
  return q[0];
}

function flush() {
  const api = config.cfg().brainApiUrl;
  const q = loadQueue();
  if (!api || !q.length || typeof wx === "undefined" || !wx.request) {
    return Promise.resolve({ ok: true, mode: "local", pending: q.length });
  }
  const base = String(api).replace(/\/?$/, "");
  const next = q[0];
  return new Promise(function (resolve) {
    wx.request({
      url: base + "/brain/sync",
      method: "POST",
      data: next,
      timeout: 8000,
      success: function () {
        saveQueue(q.slice(1));
        resolve({ ok: true, mode: "cloud", pending: q.length - 1 });
      },
      fail: function () {
        next.tries = (next.tries || 0) + 1;
        q[0] = next;
        saveQueue(q);
        resolve({ ok: false, mode: "queued", pending: q.length });
      },
    });
  });
}

function pendingCount() {
  return loadQueue().length;
}

module.exports = {
  enqueue: enqueue,
  flush: flush,
  pendingCount: pendingCount,
  loadQueue: loadQueue,
};
