/**
 * 日志工具
 * 统一的日志输出格式，支持 Dry Run 模式标记
 * 支持同时输出到控制台和文件
 * 支持内存缓存用于运行日志
 */
const { DRY_RUN } = require('./config.js').CONFIG
const fs = require('fs')
const path = require('path')

const LOG_LEVELS = {
  INFO: '[INFO]',
  SUCCESS: '[✅]',
  WARNING: '[⚠️]',
  ERROR: '[❌]',
  DRY_RUN: '[DRY RUN]',
  TASK: '[TASK]',
  CAMPAIGN: '[CAMPAIGN]',
  SOURCE: '[SOURCE]'
}


let logFileStream = null
let logFilePath = null
let logFileName = null


const runningLogsCache = []
const MAX_RUNNING_LOGS = 500 // 最多缓存 500 条日志

/**
 * 获取当前日志文件名
 */
function getLogFileName() {
  return logFileName
}

/**
 * 清空运行日志缓存
 */
function clearRunningLogs() {
  runningLogsCache.length = 0
}

/**
 * 获取运行日志缓存
 */
function getRunningLogs() {
  return runningLogsCache
}

/**
 * 初始化日志文件
 * @param {string} filename - 日志文件名（不含路径）
 */
function initLogFile(filename = null) {



  const moduleRoot = path.resolve(__dirname, '../..')
  const logsDir = path.join(moduleRoot, 'logs')

  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }


  if (!filename) {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const second = String(now.getSeconds()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}T${hour}-${minute}-${second}`
    filename = `pushnami-${dateStr}.log`
  }

  logFileName = filename
  logFilePath = path.join(logsDir, filename)


  logFileStream = fs.createWriteStream(logFilePath, { flags: 'a' })


  const separator = '\n' + '='.repeat(60) + '\n'
  logFileStream.write(separator + `新的运行开始: ${new Date().toLocaleString('zh-CN')}\n` + separator + '\n')

  return logFilePath
}

/**
 * 关闭日志文件
 */
function closeLogFile() {
  if (logFileStream) {
    logFileStream.write('\n' + '='.repeat(60) + '\n运行结束\n')
    logFileStream.end()
    logFileStream = null
  }
}

class Logger {
  constructor(prefix = '') {
    this.prefix = prefix
  }

  info(message, data = null) {
    this.log(LOG_LEVELS.INFO, message, data)
  }

  success(message, data = null) {
    this.log(LOG_LEVELS.SUCCESS, message, data)
  }

  warning(message, data = null) {
    this.log(LOG_LEVELS.WARNING, message, data)
  }

  error(message, data = null) {
    this.log(LOG_LEVELS.ERROR, message, data)
  }

  dryRun(message, data = null) {
    if (DRY_RUN) {
      this.log(LOG_LEVELS.DRY_RUN, message, data)
    }
  }

  task(message, data = null) {
    this.log(LOG_LEVELS.TASK, message, data)
  }

  campaign(message, data = null) {
    this.log(LOG_LEVELS.CAMPAIGN, message, data)
  }

  source(message, data = null) {
    this.log(LOG_LEVELS.SOURCE, message, data)
  }


  blank() {
    console.log('')
    if (logFileStream) {
      logFileStream.write('\n')
    }
  }

  log(level, message, data) {
    const timestamp = new Date().toLocaleString('zh-CN', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    let output = `${timestamp} ${level}`
    if (this.prefix) output += ` [${this.prefix}]`
    output += ` ${message}`


    console.log(output)


    if (logFileStream) {
      logFileStream.write(output + '\n')
    }


    const logEntry = {
      timestamp,
      level: level.trim(),
      prefix: this.prefix || null,
      message,
      data: data || null
    }
    runningLogsCache.push(logEntry)


    if (runningLogsCache.length > MAX_RUNNING_LOGS) {
      runningLogsCache.shift() // 移除最老的日志
    }

    if (data && typeof data === 'object') {
      const dataStr = JSON.stringify(data, null, 2)
      console.log(dataStr)
      if (logFileStream) {
        logFileStream.write(dataStr + '\n')
      }
    }
  }


  dryRunAction(action, details) {
    if (!DRY_RUN) return

    const lines = [
      '',
      '='.repeat(60),
      `${LOG_LEVELS.DRY_RUN} 模拟执行`,
      '='.repeat(60),
      `操作类型: ${action}`,
      '详细信息:'
    ]

    for (const [key, value] of Object.entries(details)) {
      lines.push(`  ${key}: ${value}`)
    }

    lines.push('⚠️  DRY RUN 模式：未实际执行操作')
    lines.push('='.repeat(60))
    lines.push('')

    const output = lines.join('\n')


    console.log(output)


    if (logFileStream) {
      logFileStream.write(output + '\n')
    }
  }
}


const logger = new Logger()
const createLogger = (prefix) => new Logger(prefix)

module.exports = {
  logger,
  createLogger,
  Logger,
  initLogFile,
  closeLogFile,
  getLogFileName,
  clearRunningLogs,
  getRunningLogs
}
