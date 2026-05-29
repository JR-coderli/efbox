const path = require('path');
const dotenv = require('dotenv');


function loadEnv() {
  const result = dotenv.config({
    path: path.join(__dirname, '..', '..', '.env'),
    quiet: true
  });

  if (result.error) {
    console.log(".env 文件加载失败")
  }
}

module.exports = loadEnv;
