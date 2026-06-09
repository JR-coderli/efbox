const fs = require('fs');
const path = require('path');


const logFile = path.join(__dirname, '../logs', 'out.log');


function writeLog(message) {
  const logMessage = `[${new Date().toLocaleString('zh-CN', { hour12: false })}] ${message}\n`;


  fs.appendFile(logFile, logMessage, (err) => {
    if (err) {
      console.error('写入日志失败:', err);
    }
  });
}

module.exports = writeLog;