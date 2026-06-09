require('dotenv').config()

/**
 * 配置管理
 * 从环境变量加载配置，并提供统一的访问接口
 */
const NODE_ENV = process.env.NODE_ENV || 'development'
const isDev = NODE_ENV === 'development'
const PREFIX = isDev ? 'DEV' : 'PROD'
const DRY_RUN = process.env.DRY_RUN === 'true'
const TEST_MODE = process.env.TEST_MODE === 'true'


const CONFIG = {

  NODE_ENV,
  isDev,
  DRY_RUN,
  TEST_MODE,


  login: {
    url: process.env[`${PREFIX}_LOGIN_URL`],
    username: process.env[`${PREFIX}_USERNAME`],
    password: process.env[`${PREFIX}_PASSWORD`]
  },


  browser: {
    chromePath: process.env[`${PREFIX}_CHROME_PATH`],
    headless: process.env[`${PREFIX}_HEADLESS`] === 'true',
    windowSize: process.env[`${PREFIX}_WINDOW_SIZE`] || '1280,800'
  },


  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
    timeout: parseInt(process.env.API_TIMEOUT || '10000')
  },


  tasks: {
    bidAdjust: process.env.TASK_BID_ADJUST === 'true',
    block: process.env.TASK_BLOCK === 'true',
    budgetBoost: process.env.TASK_BUDGET_BOOST === 'true'
  },


  bidAdjust: {
    rules: [

      { condition: 'cpa >= 7', action: 0.10 },
      { condition: 'cpa >= 5 && cpa < 7', action: 0.12 },
      { condition: 'cpa >= 4 && cpa < 5', action: 0.15 },

      { condition: 'cpa < 2.8', action: 0.18 },
      { condition: 'cpa >= 2.8 && cpa < 4', action: 0.16 }
    ],

    intervalMinutes: parseInt(process.env.BID_ADJUST_INTERVAL || '180'),

    cooldownMinutes: parseInt(process.env.BID_ADJUST_COOLDOWN || '100')
  },


  block: {
    threshold: parseFloat(process.env.BLOCK_THRESHOLD || '15'), // CPA >= $15

    intervalMinutes: parseInt(process.env.BLOCK_INTERVAL || '1440'),

    cooldownMinutes: parseInt(process.env.BLOCK_COOLDOWN || '1440')
  },


  budgetBoost: {
    spendThreshold: parseFloat(process.env.BUDGET_BOOST_SPEND_THRESHOLD || '0.5'), // Total Spend >= Daily Spend Limit * 50%

    intervalMinutes: parseInt(process.env.BUDGET_BOOST_INTERVAL || '1440'),

    cooldownMinutes: parseInt(process.env.BUDGET_BOOST_COOLDOWN || '1440'),
    multiplier: parseFloat(process.env.BUDGET_BOOST_MULTIPLIER || '2') // Daily Spend Limit = 当前值 * 2
  }
}


function validateConfig() {
  const requiredVars = [`${PREFIX}_LOGIN_URL`, `${PREFIX}_USERNAME`, `${PREFIX}_PASSWORD`, `${PREFIX}_CHROME_PATH`]
  const missingVars = requiredVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missingVars.join(', ')}`)
  }

  console.log('='.repeat(60))
  console.log('【配置加载】')
  console.log(`环境模式: ${NODE_ENV}`)
  console.log(`DRY RUN 模式: ${DRY_RUN ? '✅ 开启' : '❌ 关闭'}`)
  console.log(`TEST MODE 测试模式: ${TEST_MODE ? '✅ 开启(复选框)' : '❌ 关闭(真实修改)'}`)
  console.log(`任务开关:`)
  console.log(`  - Bid 调整: ${CONFIG.tasks.bidAdjust ? '✅' : '❌'}`)
  console.log(`  - Block: ${CONFIG.tasks.block ? '✅' : '❌'}`)
  console.log(`  - Budget 放量: ${CONFIG.tasks.budgetBoost ? '✅' : '❌'}`)
  console.log('='.repeat(60))
}

module.exports = { CONFIG, validateConfig, DRY_RUN, TEST_MODE }
