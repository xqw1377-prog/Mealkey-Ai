/** 读微信聊天/本地选中的文本文件（csv/txt） */
function readChosenTextFile(filePath) {
  return new Promise(function (resolve, reject) {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath: filePath,
      encoding: "utf8",
      success: function (res) {
        resolve(String(res.data || ""));
      },
      fail: function (err) {
        reject(err || new Error("读文件失败"));
      },
    });
  });
}

/**
 * @param {"daily"|"dish"|"menu"} kind
 * @returns {Promise<string>}
 */
function pickTextFile(kind) {
  return new Promise(function (resolve, reject) {
    if (!wx.chooseMessageFile) {
      reject(new Error("当前基础库不支持选文件，请改用粘贴"));
      return;
    }
    wx.chooseMessageFile({
      count: 1,
      type: "file",
      extension: ["csv", "txt", "CSV", "TXT"],
      success: function (res) {
        const file = (res.tempFiles || [])[0];
        if (!file || !file.path) {
          reject(new Error("未选择文件"));
          return;
        }
        readChosenTextFile(file.path)
          .then(resolve)
          .catch(reject);
      },
      fail: function (err) {
        if (err && err.errMsg && err.errMsg.indexOf("cancel") >= 0) {
          reject(new Error("cancel"));
          return;
        }
        reject(err || new Error("选文件失败"));
      },
    });
  });
}

module.exports = {
  pickTextFile: pickTextFile,
  readChosenTextFile: readChosenTextFile,
};
