const fs = require('fs')

function registerRouters(app) {

  const files = fs.readdirSync(__dirname) 



  for (const file of files) {
    if (!file.endsWith('.router.js')) continue // 如果该文件不是以 ".router.js"结尾的, 那么就跳过该文件。
    const router = require(`./${file}`)

    app.use(router.routes())
    app.use(router.allowedMethods())
  }
}

module.exports = registerRouters