const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs-extra')
const path = require('path')
const { URL } = require('url')


function getHash(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}

class CrawlerService {
  constructor(outputDir = './crawler_output') {
    this.outputDir = outputDir
    this.downloadedUrls = new Set()
    this.urlToLocalPath = new Map()


    this.typeCategories = {
      '.css': 'css',
      '.js': 'js',
      '.png': 'picture',
      '.jpg': 'picture',
      '.jpeg': 'picture',
      '.gif': 'picture',
      '.svg': 'picture',
      '.webp': 'picture',
      '.ico': 'picture',
      '.bmp': 'picture',






      '.mp4': 'media',
      '.webm': 'media',
      '.mp3': 'media',
      '.wav': 'media',
      '.ogg': 'media'
    }
  }

  /**
   * 根据文件扩展名获取分类文件夹
   */
  getCategory(url) {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname.toLowerCase()

    for (const [ext, category] of Object.entries(this.typeCategories)) {
      if (pathname.endsWith(ext)) {
        return category
      }
    }


    if (pathname.includes('/image/') || pathname.includes('/img/') ||
      pathname.includes('/picture/') || pathname.includes('/media/')) {
      return 'picture'
    }

    return 'other'
  }

  /**
   * 生成本地文件名
   * 优先保持原始文件名，保留路径结构以便于维护
   */
  generateLocalFileName(url, category) {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname
    const basename = path.basename(pathname)

    const ext = path.extname(pathname) || ''
    const nameWithoutExt = path.basename(pathname, ext)



    if (nameWithoutExt.length > 50 || /[^a-zA-Z0-9._-]/.test(nameWithoutExt)) {
      return getHash(url) + ext
    }

    return basename
  }

  /**
   * 根据原始 URL 路径生成本地相对路径
   * 保持原始目录结构，例如: /css/day.css -> static/css/day.css
   */
  generateLocalPath(url, category) {
    const urlObj = new URL(url)
    const pathname = urlObj.pathname


    const pathSegments = pathname.split('/').filter(p => p)


    const fileName = pathSegments[pathSegments.length - 1] || 'index'


    const staticIndex = pathSegments.findIndex(seg => seg.toLowerCase() === 'static')

    if (staticIndex !== -1 && staticIndex < pathSegments.length - 1) {


      const subPath = pathSegments.slice(staticIndex).join('/')
      return `./${subPath}`
    }



    if (pathSegments.length > 1) {

      const resourceDirs = ['css', 'js', 'img', 'images', 'picture', 'font', 'fonts', 'media']
      const foundResourceDir = pathSegments.find(seg => resourceDirs.includes(seg.toLowerCase()))

      if (foundResourceDir) {

        const resourceDirIndex = pathSegments.findIndex(seg => seg.toLowerCase() === foundResourceDir.toLowerCase())
        const subPath = pathSegments.slice(resourceDirIndex).join('/')
        return `./static/${subPath}`
      }
    }


    const fileNameSanitized = this.generateLocalFileName(url, category)
    return `./static/${category}/${fileNameSanitized}`
  }

  /**
   * 开始爬取
   * @param {string} url - 要爬取的URL
   * @param {function} onProgress - 进度回调
   * @param {string} taskFolder - 可选的任务文件夹名（如果传入则使用，否则自动生成）
   */
  async start(url, onProgress, taskFolder = null) {
    const baseUrl = url


    if (!taskFolder) {
      const now = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      const timestamp = `${pad(now.getFullYear() % 100)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
      const domainName = new URL(baseUrl).hostname.replace(/[^a-zA-Z0-9]/g, '_')
      taskFolder = `${timestamp}_${domainName}`
    }

    const projectDir = path.join(this.outputDir, taskFolder)
    const staticDir = path.join(projectDir, 'static')

    this.projectDir = projectDir
    this.staticDir = staticDir
    this.baseUrl = baseUrl
    this.taskFolder = taskFolder

    onProgress({ status: 'initializing', message: '正在初始化...' })


    await fs.ensureDir(staticDir)

    onProgress({ status: 'downloading', message: '正在下载主页面...', progress: 10 })


    const html = await this.downloadPage(baseUrl)

    if (!html) {
      throw new Error('无法下载主页面')
    }


    const htmlWithoutBom = this.removeBom(html)

    onProgress({ status: 'processing', message: '正在解析资源...', progress: 30 })


    const processedHtml = await this.processHtml(htmlWithoutBom, baseUrl, onProgress)


    const indexPath = path.join(projectDir, 'index.html')
    await fs.writeFile(indexPath, processedHtml)

    return {
      taskFolder,
      indexPath,
      staticDir,
      fileCount: this.downloadedUrls.size
    }
  }

  /**
   * 下载页面内容
   */
  async downloadPage(url) {
    try {
      console.log(`[Crawler] 开始下载页面: ${url}`)
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': this.baseUrl || url,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br'
        },
        timeout: 30000,  // 增加到30秒超时
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      })

      const contentType = response.headers['content-type'] || ''
      console.log(`[Crawler] 下载成功: ${url}, Content-Type: ${contentType}, 大小: ${response.data?.length || 0} bytes`)

      if (contentType.includes('application/json')) {
        return response.data.toString('utf-8')
      } else if (contentType.includes('text/html')) {
        return response.data.toString('utf-8')
      } else {
        return response.data
      }
    } catch (error) {
      console.error(`[Crawler] 下载失败：${url}`)
      console.error(`[Crawler] 错误信息: ${error.message}`)
      console.error(`[Crawler] 错误详情:`, error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers
      } : error)
      return null
    }
  }

  /**
   * 处理HTML：下载静态资源并替换URL（并行下载优化）
   */
  async processHtml(html, pageUrl, onProgress) {
    const $ = cheerio.load(html)
    const baseUrlObj = new URL(pageUrl)

    const resourceMap = {
      'link': 'href',
      'script': 'src',
      'img': 'src',
      'source': 'src'
    }


    const downloadTasks = []
    const elementUpdates = []


    this.cleanupUnwantedElements($)

    for (const [tag, attr] of Object.entries(resourceMap)) {
      const elements = $(tag)

      for (let i = 0; i < elements.length; i++) {
        const element = elements[i]
        const originalUrl = $(element).attr(attr)

        if (!originalUrl || this.shouldSkipUrl(originalUrl)) {
          continue
        }

        try {
          const absoluteUrl = new URL(originalUrl, baseUrlObj).href
          downloadTasks.push({ url: absoluteUrl, element, attr })
        } catch (error) {

        }
      }
    }


    const jsJsonUrls = this.extractJsonUrlsFromJs(html)
    for (const jsonUrl of jsJsonUrls) {
      try {
        const absoluteUrl = new URL(jsonUrl, baseUrlObj).href
        downloadTasks.push({ url: absoluteUrl, originalUrl: jsonUrl, element: null, attr: null, isJsonFile: true })
      } catch (error) {

      }
    }


    const jsImageUrls = this.extractImageUrlsFromJs(html)
    for (const imageUrl of jsImageUrls) {
      try {
        const absoluteUrl = new URL(imageUrl, baseUrlObj).href
        downloadTasks.push({ url: absoluteUrl, element: null, attr: null })
      } catch (error) {

      }
    }


    const inlineStyleImages = this.extractInlineStyleImages($, baseUrlObj)
    for (const { url, element, originalUrl } of inlineStyleImages) {
      downloadTasks.push({ url, element, originalUrl, attr: null, isInlineStyle: true })
    }


    const styleTagImages = this.extractStyleTagImages($, baseUrlObj)
    for (const { url, styleElement, originalUrl } of styleTagImages) {
      downloadTasks.push({ url, styleElement, originalUrl, attr: null, isStyleTagImage: true })
    }


    const htmlPageLinks = this.extractHtmlPageLinks($, baseUrlObj)
    for (const { url, element } of htmlPageLinks) {
      downloadTasks.push({ url, element, attr: 'href', isHtmlPage: true })
    }

    const totalCount = downloadTasks.length
    let processedCount = 0


    const jsonUrlMappings = new Map()

    const updateProgress = () => {
      const progress = 30 + Math.floor((processedCount / totalCount) * 60)
      onProgress({ status: 'downloading_resources', message: `正在下载资源 ${processedCount}/${totalCount}...`, progress })
    }


    const CONCURRENCY = 10
    for (let i = 0; i < downloadTasks.length; i += CONCURRENCY) {
      const batch = downloadTasks.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map(async (task) => {
          try {
            if (task.isJsonFile) {

              const localPath = await this.downloadJsonFile(task.url)
              if (localPath) {
                jsonUrlMappings.set(task.originalUrl, localPath)
              }
              return { ...task, localPath, success: !!localPath }
            } else if (task.isHtmlPage) {

              const localPath = await this.downloadHtmlPage(task.url, onProgress)
              return { ...task, localPath, success: !!localPath }
            } else if (task.isInlineStyle) {

              const localPath = await this.downloadResource(task.url)
              return { ...task, localPath, success: !!localPath }
            } else if (task.isStyleTagImage) {

              const localPath = await this.downloadStyleTagImage(task.url)
              return { ...task, localPath, success: !!localPath }
            } else {
              const localPath = await this.downloadResource(task.url)
              if (localPath && task.element) {
                return { ...task, localPath, success: true }
              }
              return { ...task, localPath: null, success: false }
            }
          } catch (error) {
            return { ...task, localPath: null, success: false }
          }
        })
      )


      for (const result of results) {
        if (result.success && result.localPath) {
          if (result.isInlineStyle) {

            const currentStyle = $(result.element).attr('style') || ''
            const originalUrl = result.originalUrl
            if (!originalUrl) {
              processedCount++
              continue
            }

            const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const urlRegex = new RegExp(`url\\(\\s*(['"]?)${escapedUrl}\\1\\s*\\)`, 'gi')
            const newStyle = currentStyle.replace(urlRegex, `url("${result.localPath}")`)
            $(result.element).attr('style', newStyle)
          } else if (result.element) {

            let finalPath = result.localPath
            if (result.isHtmlPage && !finalPath.startsWith('./')) {
              finalPath = './' + finalPath
            }
            if (result.attr) {
              $(result.element).attr(result.attr, finalPath)
            }
          }
        }
        processedCount++
      }


      const styleTagUpdates = new Map() // styleElement -> [{ originalUrl, localPath }]
      for (const result of results) {
        if (result.success && result.localPath && result.isStyleTagImage && result.styleElement) {
          if (!styleTagUpdates.has(result.styleElement)) {
            styleTagUpdates.set(result.styleElement, [])
          }
          styleTagUpdates.get(result.styleElement).push({
            originalUrl: result.originalUrl,
            localPath: result.localPath
          })
        }
      }


      for (const [styleElement, updates] of styleTagUpdates.entries()) {
        let styleContent = $(styleElement).html() || ''
        for (const { originalUrl, localPath } of updates) {
          if (!originalUrl) {
            console.log('警告: originalUrl 为空，跳过', { localPath })
            continue
          }
          const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const urlRegex = new RegExp(`url\\(\\s*(['"]?)${escapedUrl}\\1\\s*\\)`, 'gi')
          styleContent = styleContent.replace(urlRegex, `url("${localPath}")`)
        }
        $(styleElement).html(styleContent)
      }

      updateProgress()
    }


    let processedHtml = $.html()
    for (const [originalUrl, localPath] of jsonUrlMappings.entries()) {
      if (!originalUrl) {
        console.log('警告: JSON URL 映射中 originalUrl 为空，跳过')
        continue
      }

      const escapedUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const regex = new RegExp(`(["'\`])${escapedUrl}\\1`, 'g')
      processedHtml = processedHtml.replace(regex, `$1${localPath}$1`)
    }

    updateProgress()
    return processedHtml
  }

  /**
   * 从 JavaScript 代码中提取 JSON 文件 URL
   * 匹配模式: messages: "./xxx.json", data: "xxx.json" 等
   */
  extractJsonUrlsFromJs(html) {
    const jsonUrls = new Set()


    const patterns = [

      /(["'])([a-zA-Z0-9_\-\/\.]+\.json)\1/g,

      /`([^`]+\.json)`/g,

      /fetch\(\s*["']([^"']+\.json)["']\s*\)/g,

      /import\s+.*?\s+from\s+["']([^"']+\.json)["']/g,

      /["']([^"']+\.json)["']/g,
    ]

    for (const pattern of patterns) {

      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1] || match[2]
        if (url && url.endsWith('.json')) {
          jsonUrls.add(url)
        }
      }
    }

    return Array.from(jsonUrls)
  }

  /**
   * 从 JavaScript 代码中提取图片 URL
   * 匹配模式: avatar: "./imgs/comment1.jpeg", image: "xxx.png" 等
   */
  extractImageUrlsFromJs(html) {
    const imageUrls = new Set()
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']



    const patterns = [

      /(["'])([a-zA-Z0-9_\-\/\.]+\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))\1/gi,

      /:\s*([a-zA-Z0-9_\-\/\.]+\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))/gi,
    ]

    for (const pattern of patterns) {
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1] || match[2]
        if (url) {
          const lowerUrl = url.toLowerCase()
          if (imageExtensions.some(ext => lowerUrl.endsWith(ext))) {
            imageUrls.add(url)
          }
        }
      }
    }

    return Array.from(imageUrls)
  }

  /**
   * 提取内联样式中的图片引用
   * 例如: style="background-image: url(static/image/xxx.png)"
   * 返回格式: [{ url: 'xxx', element: cheerioElement }]
   */
  extractInlineStyleImages($, baseUrlObj) {
    const results = []
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']


    $('*[style]').each((i, elem) => {
      const style = $(elem).attr('style')
      if (!style) return



      const urlRegex = /url\(\s*(['"]?)([^'"()]+\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))\1\s*\)/gi

      let match
      while ((match = urlRegex.exec(style)) !== null) {
        const imageUrl = match[2]
        if (imageUrl) {
          const lowerUrl = imageUrl.toLowerCase()
          if (imageExtensions.some(ext => lowerUrl.endsWith(ext))) {
            try {
              const absoluteUrl = new URL(imageUrl, baseUrlObj).href
              results.push({ url: absoluteUrl, element: elem, originalUrl: imageUrl })
            } catch (error) {

            }
          }
        }
      }
    })

    return results
  }

  /**
   * 提取 <style> 标签中的图片引用（CSS 背景图片）
   * 返回格式: [{ url: 'xxx', styleElement: cheerioElement, originalUrl: 'xxx' }]
   */
  extractStyleTagImages($, baseUrlObj) {
    const results = []
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']
    const seenUrls = new Set() // 避免重复


    $('style').each((i, elem) => {
      const styleContent = $(elem).html()
      if (!styleContent) return


      const urlRegex = /url\(\s*(['"]?)([^'"()]+\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))\1\s*\)/gi

      let match
      while ((match = urlRegex.exec(styleContent)) !== null) {
        const imageUrl = match[2]
        if (imageUrl) {

          if (imageUrl.startsWith('data:') || imageUrl.startsWith('#')) continue

          const lowerUrl = imageUrl.toLowerCase()
          if (imageExtensions.some(ext => lowerUrl.endsWith(ext))) {
            try {
              const absoluteUrl = new URL(imageUrl, baseUrlObj).href

              if (!seenUrls.has(absoluteUrl)) {
                seenUrls.add(absoluteUrl)
                results.push({ url: absoluteUrl, styleElement: elem, originalUrl: imageUrl })
              }
            } catch (error) {

            }
          }
        }
      }
    })

    return results
  }

  /**
   * 提取同级的 HTML 页面链接（免责声明等）
   * 返回格式: [{ url: 'xxx', element: cheerioElement }]
   */
  extractHtmlPageLinks($, baseUrlObj) {
    const htmlLinks = []
    const basePath = baseUrlObj.pathname


    $('a[href]').each((i, elem) => {
      const href = $(elem).attr('href')
      if (!href || this.shouldSkipUrl(href)) {
        return
      }

      try {
        const url = new URL(href, baseUrlObj)


        if (url.hostname === baseUrlObj.hostname) {
          const urlPath = url.pathname


          const isHtmlFile = urlPath.endsWith('.html') || urlPath.endsWith('.htm')


          const isInSameDirectory = this.isInSameDirectory(basePath, urlPath)

          if (isHtmlFile && isInSameDirectory) {
            htmlLinks.push({ url: url.href, element: elem })
          }
        }
      } catch (error) {

      }
    })

    return htmlLinks
  }

  /**
   * 判断两个路径是否在同一目录
   */
  isInSameDirectory(basePath, targetPath) {

    const baseDir = basePath.substring(0, basePath.lastIndexOf('/')) || '/'
    const targetDir = targetPath.substring(0, targetPath.lastIndexOf('/')) || '/'


    const targetDepth = (targetPath.match(/\//g) || []).length
    const baseDepth = (basePath.match(/\//g) || []).length


    return targetDepth <= baseDepth + 1
  }

  /**
   * 下载 JSON 文件到项目根目录，并处理其中的 HTML 图片引用
   */
  async downloadJsonFile(url) {
    if (this.downloadedUrls.has(url)) {
      return this.urlToLocalPath.get(url)
    }

    this.downloadedUrls.add(url)

    try {
      const urlObj = new URL(url)
      const fileName = path.basename(urlObj.pathname)
      const localPath = path.join(this.projectDir, fileName)
      const relativePath = `./${fileName}`

      this.urlToLocalPath.set(url, relativePath)

      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': this.baseUrl,
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      })

      if (response.data && response.data.length > 0) {
        let jsonContent = response.data.toString('utf-8')


        const baseUrlObj = new URL(url)
        jsonContent = await this.processJsonImages(jsonContent, baseUrlObj)

        await fs.writeFile(localPath, jsonContent)
        return relativePath
      }
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * 处理 JSON 文件中的 HTML 图片引用
   */
  async processJsonImages(jsonContent, baseUrlObj) {

    const imgRegex = /<img[^>]+src=['"]([^'"()]+\.(png|jpg|jpeg|gif|svg|webp|ico|bmp))['"][^>]*>/gi
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']

    let match

    while ((match = imgRegex.exec(jsonContent)) !== null) {
      const originalUrl = match[1]


      if (originalUrl.startsWith('data:')) continue

      const lowerUrl = originalUrl.toLowerCase()
      if (!imageExtensions.some(ext => lowerUrl.endsWith(ext))) continue

      try {
        const absoluteUrl = new URL(originalUrl, baseUrlObj).href


        const localPath = await this.downloadStyleTagImage(absoluteUrl)

        if (localPath) {

          jsonContent = jsonContent.replace(match[0], match[0].replace(originalUrl, localPath))
        }
      } catch (error) {

      }
    }

    return jsonContent
  }

  /**
   * 下载 HTML 页面到项目根目录
   */
  async downloadHtmlPage(url, onProgress) {
    if (this.downloadedUrls.has(url)) {
      return this.urlToLocalPath.get(url)
    }

    this.downloadedUrls.add(url)

    try {
      const urlObj = new URL(url)
      const fileName = path.basename(urlObj.pathname) || 'page.html'
      const localPath = path.join(this.projectDir, fileName)
      const relativePath = `./${fileName}`

      this.urlToLocalPath.set(url, relativePath)


      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': this.baseUrl,
        },
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      })

      if (!response.data || response.data.length === 0) {
        return null
      }


      let html = response.data.toString('utf-8')
      html = this.removeBom(html)


      const processedHtml = await this.processSubPageResources(html, url)

      await fs.writeFile(localPath, processedHtml)
      return relativePath
    } catch (error) {
      return null
    }
  }

  /**
   * 处理子页面中的静态资源
   */
  async processSubPageResources(html, pageUrl) {
    const $ = cheerio.load(html)
    const baseUrlObj = new URL(pageUrl)


    this.cleanupUnwantedElements($)

    const resourceMap = {
      'link': 'href',
      'script': 'src',
      'img': 'src'
    }

    for (const [tag, attr] of Object.entries(resourceMap)) {
      $(tag).each((i, elem) => {
        const originalUrl = $(elem).attr(attr)
        if (!originalUrl || this.shouldSkipUrl(originalUrl)) {
          return
        }

        try {
          const absoluteUrl = new URL(originalUrl, baseUrlObj).href



        } catch (error) {

        }
      })
    }

    return $.html()
  }

  /**
   * 移除 UTF-8 BOM (Byte Order Mark)
   * BOM 是文件开头的 EF BB BF 三个字节
   */
  removeBom(str) {

    if (str && str.charCodeAt(0) === 0xFEFF) {
      return str.slice(1)
    }

    if (str && str.startsWith('\uFEFF')) {
      return str.slice(1)
    }

    if (str && str.length > 0) {

      const buffer = Buffer.from(str, 'utf8')
      if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        return str.substring(1)  // 移除 BOM 字符
      }
    }
    return str
  }

  /**
   * 判断是否应该跳过这个URL
   */
  shouldSkipUrl(url) {
    if (!url) return true
    if (url.startsWith('data:')) return true
    if (url.startsWith('javascript:')) return true
    if (url.startsWith('#')) return true
    return false
  }

  /**
   * 清理不需要的元素（追踪代码、外部代理等）
   */
  cleanupUnwantedElements($) {

    $('base').each((i, elem) => {
      const baseHtml = $.html(elem)
      const commentedBase = `<!-- ${baseHtml} -->`
      $(elem).replaceWith(commentedBase)
    })


    $('meta[http-equiv="delegate-ch"]').remove()


    $('noscript').each((i, elem) => {
      const content = $(elem).html()
      if (content && content.includes('pentlyconger.com')) {
        $(elem).remove()
      }
    })


    $('script').each((i, elem) => {
      const scriptContent = $(elem).html() || ''


      if (scriptContent.includes('clickflare') ||
          scriptContent.includes('window.clickflare')) {
        $(elem).remove()
      }

      if ((scriptContent.includes('ads.reward-hunt.com') || scriptContent.includes('reward-hunt')) &&
          !scriptContent.includes('chatSettings') &&
          !scriptContent.includes('thriveLink') &&
          !scriptContent.includes('redirectLink')) {
        $(elem).remove()
      }
    })


    $('style').each((i, elem) => {
      const styleContent = $(elem).html() || ''
      if (styleContent.includes('.dtpcnt')) {
        $(elem).remove()
      }
    })
  }

  /**
   * 下载单个静态资源
   */
  async downloadResource(url) {
    if (this.downloadedUrls.has(url)) {
      return this.urlToLocalPath.get(url)
    }

    this.downloadedUrls.add(url)

    try {
      const category = this.getCategory(url)
      const relativePath = this.generateLocalPath(url, category)


      const pathWithoutDot = relativePath.replace(/^\.\//, '')
      const localPath = path.join(this.projectDir, pathWithoutDot)
      const localDir = path.dirname(localPath)


      await fs.ensureDir(localDir)

      this.urlToLocalPath.set(url, relativePath)

      let content
      try {

        let acceptHeader = 'image/webp,image/apng,image/*,*/*;q=0.8'
        if (category === 'css') {
          acceptHeader = 'text/css,*/*;q=0.1'
        } else if (category === 'js') {
          acceptHeader = 'application/javascript,text/javascript,*/*;q=0.1'
        }

        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': this.baseUrl,
            'Accept': acceptHeader
          },
          timeout: 10000,  // 10秒超时，加快失败响应
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        })

        if (!response.data || response.data.length === 0) {
          console.log(`下载失败（空内容）: ${url}`)
          return null
        }

        content = response.data
      } catch (err) {
        console.log(`下载失败: ${url} - ${err.message}`)
        return null
      }


      if (category === 'css') {
        const cssContent = content.toString('utf-8')
        const processedCss = await this.processCss(cssContent, url)
        await fs.writeFile(localPath, processedCss)
      } else if (category === 'js') {

        const jsContent = content.toString('utf-8')
        const processedJs = await this.processImportMetaUrl(jsContent, url)
        await fs.writeFile(localPath, processedJs)
      } else {
        await fs.writeFile(localPath, content)
      }

      return relativePath
    } catch (error) {
      return null
    }
  }

  /**
   * 处理 CSS 中的 url() 引用（并行下载优化）
   */
  async processCss(css, cssUrl) {
    const baseUrlObj = new URL(cssUrl)
    const urlRegex = /url\(\s*(['"]?)([^'")\s]+)\1\s*\)/g

    const matches = [...css.matchAll(urlRegex)]
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp']




    const downloadTasks = []

    for (const match of matches) {
      const fullMatch = match[0]
      const quote = match[1] || ''
      const resourceUrl = match[2]

      if (resourceUrl.startsWith('data:') || resourceUrl.startsWith('#')) {
        continue
      }

      const lowerUrl = resourceUrl.toLowerCase()


      const isFont = false // 强制设为 false，不下载字体
      const isImage = imageExts.some(ext => lowerUrl.endsWith(ext))

      if (!isFont && !isImage) {
        continue
      }

      try {
        const absoluteUrl = new URL(resourceUrl, baseUrlObj).href
        downloadTasks.push({ fullMatch, quote, url: absoluteUrl, isFont })
      } catch (error) {

      }
    }


    const results = await Promise.all(downloadTasks.map(async (task) => {
      try {
        if (task.isFont) {



          return { fullMatch: task.fullMatch, quote: task.quote, path: null, success: false }
        } else {
          const imagePath = await this.downloadImageForCss(task.url)
          return { fullMatch: task.fullMatch, quote: task.quote, path: imagePath, success: !!imagePath }
        }
      } catch (error) {
        return { fullMatch: task.fullMatch, quote: task.quote, path: null, success: false }
      }
    }))


    let processedCss = css
    for (const result of results) {
      if (result.success) {
        const newUrl = `url(${result.quote}${result.path}${result.quote})`
        processedCss = processedCss.replace(result.fullMatch, newUrl)
      }
    }

    return processedCss
  }

  /**
   * 处理 JS 中的 import.meta.url 引用（Vite 打包特性）
   * 例如: new URL("image.png", import.meta.url).href
   */
  async processImportMetaUrl(js, jsUrl) {
    const baseUrlObj = new URL(jsUrl)


    const importMetaRegex = /new URL\s*\(\s*(['"])([^'")]+)\1\s*,\s*import\.meta\.url\s*\)\.href/g

    let processedJs = js
    const matches = [...js.matchAll(importMetaRegex)]

    for (const match of matches) {
      const fullMatch = match[0]
      const quote = match[1]
      const imageName = match[2]


      if (!/\.(png|jpg|jpeg|gif|svg|webp|ico|bmp)$/i.test(imageName)) {
        continue
      }

      try {

        const imageUrl = new URL(imageName, baseUrlObj).href


        const imageFileName = this.generateLocalFileName(imageUrl, 'picture')
        const imageDir = path.join(this.staticDir, 'picture')
        await fs.ensureDir(imageDir)

        const imagePath = path.join(imageDir, imageFileName)
        const relativePath = `./static/picture/${imageFileName}`


        if (!this.downloadedUrls.has(imageUrl)) {
          this.downloadedUrls.add(imageUrl)
          this.urlToLocalPath.set(imageUrl, relativePath)

          try {
            const response = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': this.baseUrl
              },
              timeout: 10000,
              maxRedirects: 5
            })

            if (response.data && response.data.length > 0) {
              await fs.writeFile(imagePath, response.data)
            }
          } catch (err) {

          }
        }


        processedJs = processedJs.replace(fullMatch, `"${relativePath}"`)
      } catch (error) {

      }
    }

    return processedJs
  }

  /**
   * 为 CSS 下载图片
   */
  async downloadImageForCss(url) {
    if (this.downloadedUrls.has(url)) {
      const existingPath = this.urlToLocalPath.get(url)
      if (existingPath) {



        const pathWithoutStatic = existingPath.replace(/^\.\/static\//, '')
        return '../' + pathWithoutStatic
      }
    }

    this.downloadedUrls.add(url)

    try {
      const relativePath = this.generateLocalPath(url, 'picture')


      const pathWithoutDot = relativePath.replace(/^\.\//, '')
      const localPath = path.join(this.projectDir, pathWithoutDot)
      const localDir = path.dirname(localPath)

      await fs.ensureDir(localDir)

      this.urlToLocalPath.set(url, relativePath)

      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': this.baseUrl,
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
          },
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        })

        if (!response.data || response.data.length === 0) {
          return null
        }

        await fs.writeFile(localPath, response.data)
      } catch (err) {
        return null
      }



      const pathWithoutStatic = relativePath.replace(/^\.\/static\//, '')
      return '../' + pathWithoutStatic
    } catch (error) {
      return null
    }
  }

  /**
   * 下载 <style> 标签中的图片（保存到 static/image/ 文件夹）
   * 返回相对于 HTML 文件的路径，如: static/image/xxx.png
   */
  async downloadStyleTagImage(url) {

    if (this.downloadedUrls.has(url)) {
      const existingPath = this.urlToLocalPath.get(url)
      if (existingPath) {
        return existingPath
      }
    }

    this.downloadedUrls.add(url)

    try {
      const urlObj = new URL(url)
      const ext = path.extname(urlObj.pathname) || '.png'
      const fileName = this.generateLocalFileName(url, 'image')


      const imageDir = path.join(this.staticDir, 'image')
      await fs.ensureDir(imageDir)

      const localPath = path.join(imageDir, fileName)
      const relativePath = `./static/image/${fileName}`


      this.urlToLocalPath.set(url, relativePath)


      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': this.baseUrl,
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
          },
          timeout: 10000,
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        })

        if (!response.data || response.data.length === 0) {
          return null
        }

        await fs.writeFile(localPath, response.data)
      } catch (err) {
        return null
      }


      return relativePath
    } catch (error) {
      return null
    }
  }

  /**
   * 为 CSS 下载字体文件
   */
  async downloadFontForCss(url) {
    if (this.downloadedUrls.has(url)) {
      const existingPath = this.urlToLocalPath.get(url)
      if (existingPath) {

        const pathWithoutStatic = existingPath.replace(/^\.\/static\//, '')
        return '../' + pathWithoutStatic.substring(pathWithoutStatic.indexOf('/') + 1)
      }
    }

    this.downloadedUrls.add(url)

    try {
      const relativePath = this.generateLocalPath(url, 'font')


      const pathWithoutDot = relativePath.replace(/^\.\//, '')
      const localPath = path.join(this.projectDir, pathWithoutDot)
      const localDir = path.dirname(localPath)

      await fs.ensureDir(localDir)

      this.urlToLocalPath.set(url, relativePath)

      try {
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': this.baseUrl
          },
          timeout: 30000,
          maxRedirects: 5,
          validateStatus: (status) => status < 400
        })

        if (!response.data || response.data.length === 0) {
          return null
        }

        await fs.writeFile(localPath, response.data)
      } catch (err) {
        return null
      }


      const pathWithoutStatic = relativePath.replace(/^\.\/static\//, '')
      return '../' + pathWithoutStatic.substring(pathWithoutStatic.indexOf('/') + 1)
    } catch (error) {
      return null
    }
  }

  /**
   * 获取任务文件夹路径
   */
  getTaskFolderPath(taskFolder) {
    return path.join(this.outputDir, taskFolder)
  }

  /**
   * 删除任务文件夹
   */
  async deleteTaskFolder(taskFolder) {
    const folderPath = this.getTaskFolderPath(taskFolder)
    await fs.remove(folderPath)
  }
}

module.exports = CrawlerService
