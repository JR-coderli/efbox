const axios = require('axios')
const logReplacementEvent = require('./replacementLog')


async function getUrlsFromApi() {
  try {
    const res = await axios.post(process.env.API_BASE_URL + '/domains/import_list', {
      offset: 0,
      size: 200
    });
    const data = res?.data?.data
    const list = data?.list || [];
    const allCount = data?.allCount ?? 0  // 重要域名总数


    const urls = list
      .filter(item => item.landing_page_url)  // 过滤掉没有 URL 的
      .map(item => ({
        id: item.id,
        url: item.landing_page_url,
        // 数据库当前状态: 供检测循环判断"本轮正常但库里仍是异常"时立即恢复(不依赖进程内存,
        // 进程重启后的第一轮就能把历史遗留的 不可访问/危险 状态改回来)
        is_accessible: item.is_accessible,
        is_safe: item.is_safe
      }))


    // ok 且 fetchedCount >= allCount 表示本轮已把全部重要域名拉全,
    // 调用方可据此安全清理"已移出监控"的域名计数
    return { urls, allCount, fetchedCount: list.length, ok: true }
  } catch (err) {

    return { urls: [], allCount: 0, fetchedCount: 0, ok: false }
  }
}


// 上报"最后检测时间"—— 每轮检测完成时打点, 服务端记当前时间到 system_config。
// 前端域名检测页据此展示最后检测时间; 时间长期不推进 = 检测脚本没在跑。
// 失败只打日志, 不影响检测主流程。
async function reportLastCheck() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.post(`${baseUrl}/domains/internal/report_last_check`, {}, { timeout: 10000 })
    return res?.data?.code === 0
  } catch (err) {
    console.log(`❌ 上报最后检测时间失败: ${err.message}`)
    return false
  }
}


// 两侧替换终态裁决（兜底）：Clickflare 侧是异步队列，ef 侧先完成触发的裁决会因对侧"还在跑"
// 而等待且无人再触发。这里轮询裁决接口直到有终态结论（继承成功 / 放弃 / 超时）。
// 幂等：两侧都已成功时立即继承；任一侧失败立即放弃。失败只打日志。
// 只裁决本轮(replacementDomain)记录；unusedSides 传"本轮已实时核实未使用"的一侧，
// 该侧直接通过——历史轮次的 failed/partial 记录不再永久封杀该域名的 purpose 继承。
// 返回: 'success'=两侧替换全部成功(含幂等"已是目标值") / 其他=未成功或超时
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function resolvePurposeInherit(dangerousDomain, { intervalMs = 10000, timeoutMs = 5 * 60 * 1000, replacementDomain = null, unusedSides = [] } = {}) {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
  const startAt = Date.now()
  let lastMessage = ''
  while (Date.now() - startAt < timeoutMs) {
    try {
      const res = await axios.post(`${baseUrl}/domain-purpose-inherit/resolve`, {
        dangerous_domain: dangerousDomain,
        replacement_domain: replacementDomain || undefined,
        unused_sides: unusedSides
      }, { timeout: 15000 })
      const data = res?.data?.data || {}
      lastMessage = res?.data?.message || ''
      // success=true: 继承完成（含幂等"已是目标值"）
      if (res?.data?.code === 0 && data?.success === true) {
        console.log(`[替换流程] purpose 继承完成: ${dangerousDomain} — ${lastMessage}`)
        return 'success'
      }
      // message 含"等待"→ 两侧还没都到终态，继续轮询；其他（失败/放弃/无记录）为终态结论，停
      if (!String(lastMessage).includes('等待')) {
        console.log(`[替换流程] purpose 继承未执行(终态): ${dangerousDomain} — ${lastMessage}`)
        return 'terminal'
      }
    } catch (err) {
      console.log(`❌ 裁决 purpose 继承失败: ${err.message}`)
      return 'error'
    }
    await sleep(intervalMs)
  }
  console.log(`[替换流程] purpose 继承裁决超时(${Math.round(timeoutMs / 60000)}分钟): ${dangerousDomain} — ${lastMessage}`)
  return 'timeout'
}


// 将域名降级为非重要域名 (is_important = 0)
// 供检测脚本在域名连续多轮异常后调用, 降级后该域名会移出 import_list 监控范围
async function setDomainNotImportant(id) {  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const apiUrl = `${baseUrl}/domains/internal/is_important/${id}/0`

    await axios.patch(apiUrl)
    return true
  } catch (err) {
    console.log(`❌ 降级域名为非重要失败 id=${id}: ${err.message}`)
    return false
  }
}


async function updateDomainStatus(id, isAccessible, isSafe, url, round) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const apiUrl = `${baseUrl}/domains/internal/is_normal/${id}`

    await axios.patch(apiUrl, {
      is_accessible: isAccessible,
      is_safe: isSafe,
    })




    if ((isSafe === 0 || isAccessible === 0) && url) {
      const domain = extractDomain(url)
      // 已替换成功的域名：不再重复走完整替换流程，改为复核替换是否真正生效——
      // 生效(两侧已不使用)则静默；未生效(或被人为换回)则用同一备用域名重新替换并通知。
      // 替换失败过的域名不在 notifiedReplaced 中，下一轮仍会照常走完整流程重试。
      // ⚠️ 不 await：替换/复核流程含数据同步与裁决轮询(最长约 5-6 分钟)，若在这里等待会阻塞本轮收尾，
      // 导致预警(电话/飞书/邮件)等到替换结束才发。两个流程内部都自捕获错误，不会产生未处理 rejection。
      if (domain && notifiedReplaced.has(domain)) {
        enqueueReplacementFlow(domain, () => verifyReplacementOutcome(domain, notifiedReplaced.get(domain).replacementDomain, round))
      } else if (domain) {
        enqueueReplacementFlow(domain, () => runAutoReplacement(domain, isAccessible, isSafe, round))
      }
    }
  } catch (err) {
    console.log(`❌ 更新域名状态失败 id=${id}: ${err.message}`);
  }
}

/**
 * 自动替换后台流程（从 updateDomainStatus 拆出，后台执行不阻塞调用方）：
 * 选备用 → 两侧替换 → 轮询裁决 purpose 继承 → 两侧成功后发飞书"替换完成"通知并把域名加入静默集合。
 * 整个函数体 try/catch，任何失败只打日志不上抛。
 * 时长上限约 6 分钟（< 15 分钟检测间隔），跨轮不会堆积重叠。
 */
// 侧结果转用户可读文案(替换过程日志 detail 用, 面向人而不是面向程序)
function sideResultText(sideName, r) {
  if (r?.status === 'replaced') return `${sideName} 已替换 ${r.affectedCount} 条 Lander`
  if (r?.status === 'unused') return `${sideName} 未使用该域名，无需替换`
  return `${sideName} 替换未成功（接口失败或数据无法核实）`
}

async function runAutoReplacement(domain, isAccessible, isSafe, round) {
  let flowReachedSides = false  // 是否已进入两侧替换阶段(finally 里据此决定是否后置同步)
  try {
    console.log(`[替换流程] 检测到异常域名 ${domain} (is_accessible=${isAccessible} is_safe=${isSafe})，开始查询备用域名`)
    logReplacementEvent(domain, 'replace_start',
      `检测到异常：${!isAccessible ? '域名不可访问' : ''}${!isAccessible && !isSafe ? '，且' : ''}${!isSafe ? '被标记为危险' : ''}`, round)
    // 一次检测事件只查询一次备用域名，两边共用同一个结果，
    // 保证 Clickflare / ef-tracker 替换到同一个备用域名上（避免两侧各自查询时备用池中途变化导致分歧）
    const replacementDomain = await getReplacementDomain(domain)
    if (!replacementDomain) {
      console.log(`[替换流程] 无法获取替换域名(备用池不满足条件或危险域名purpose无s编号), 跳过替换操作: ${domain}`)
      logReplacementEvent(domain, 'backup_selected', '未找到可用的备用域名（备用池不满足条件，或该域名的用途没有 s 编号）', round)
      return
    }
    logReplacementEvent(domain, 'backup_selected', `已选定备用域名：${replacementDomain}`, round)
    console.log(`[替换流程] ${domain} -> ${replacementDomain}，开始两侧替换`)
    // 替换前先同步 Clickflare 数据(ef-tracker 数据在本地库, 无需同步):
    // checkLanderExists 查的是本地镜像, 不同步就可能拿旧数据把"实际在用"判成"未使用"。
    // 同步失败时返回 false, Clickflare 侧的"未使用"结论将不被信任(见 replaceDangerousDomain)
    const dataSynced = await syncLandersBeforeReplace()
    logReplacementEvent(domain, 'sync', dataSynced ? 'Clickflare 数据同步成功（替换前）' : 'Clickflare 数据同步失败（替换前），暂用现有数据判断', round)
    // 两边独立替换、互不影响：Clickflare 没在用不影响 ef-tracker 侧替换，反之亦然
    const cfResult = await replaceDangerousDomain(domain, replacementDomain, { dataSynced })      // Clickflare 侧
    const efResult = await replaceEfTrackerDomain(domain, replacementDomain)      // ef-tracker 侧
    flowReachedSides = true
    logReplacementEvent(domain, 'cf_result', sideResultText('Clickflare', cfResult), round)
    logReplacementEvent(domain, 'ef_result', sideResultText('ef-tracker', efResult), round)

    // 两侧都确认未使用该域名：没有任何 Lander 需要换。此时必须直接结束——
    // 若继续走裁决会执行 purpose 继承，把备用域名的标签"转正"，为一个没人使用的坑位
    // 白白消耗备用池；且实际什么都没换，也不能发"替换成功"通知(会误导 + 域名被静默)。
    // 改发人工核实提醒：未使用可能是真的废弃，也可能是 Lander 数据没同步导致的误判。
    if (cfResult.status === 'unused' && efResult.status === 'unused') {
      console.log(`[替换流程] ${domain} 两侧系统均未使用该域名, 无需替换; 跳过 purpose 继承, 不消耗备用 ${replacementDomain}`)
      logReplacementEvent(domain, 'both_unused', `两个系统都未使用该域名，已跳过替换（备用 ${replacementDomain} 未消耗）`, round)
      logReplacementEvent(domain, 'notice', '已发送飞书通知：域名异常·无需替换', round)
      notifiedUnused.add(domain)
      sendFeishuText(
        `【域名异常·无需替换】${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n` +
        `- ${domain} 检测异常, 但 Clickflare 与 ef-tracker 均未使用该域名, 已跳过替换(备用域名未消耗)\n` +
        `- 若该域名已废弃, 请将其移出监控列表; 若怀疑数据未同步, 请先同步 Lander 数据再看下一轮检测结果`
      )
      return
    }

    // 本轮已实时核实"未使用该域名"的一侧（查询成功且确认无记录），裁决时直接通过，
    // 避免 cf_lander_url_replacements 里历史轮次的 failed/partial 记录误伤本轮判决
    const unusedSides = [
      ...(cfResult.status === 'unused' ? ['clickflare'] : []),
      ...(efResult.status === 'unused' ? ['eftracker'] : [])
    ]
    console.log(`[替换流程] ${domain} -> ${replacementDomain} 两侧替换请求已发出，开始兜底裁决 purpose 继承(轮询至两侧终态)`)
    // 兜底：轮询直到两侧都到终态，决定是否把备用域名 purpose 改为危险域名的(s1-备用 -> s1-LP)。
    // 任一侧失败则保持原状；两侧成功才继承。不阻塞太久(默认5分钟超时)，超时留给下次检测再裁决。
    const verdict = await resolvePurposeInherit(domain, { replacementDomain, unusedSides })
    // 两侧替换全部成功 → 飞书普通消息通知用户(不打电话不发邮件)，并停止该域名后续预警。
    // 记录 replacementDomain 供后续轮次的"替换复核"使用(未生效时用同一备用重试)
    if (verdict === 'success') {
      notifiedReplaced.set(domain, { replacementDomain })
      logReplacementEvent(domain, 'verdict', '替换全部成功，备用域名的标签已转为正式用途', round)
      sendReplacementSuccessNotice(domain, replacementDomain, { cfResult, efResult })
      logReplacementEvent(domain, 'notice', '已发送飞书通知：域名替换完成', round)
    } else {
      // 替换未完全成功(一侧失败 / 部分成功 / 超时) → 同样通知, 说明两侧各自结果和后续动作
      console.log(`[替换流程] ${domain} 替换未完全成功(verdict=${verdict}), 已发通知, 下一轮将自动重试`)
      logReplacementEvent(domain, 'verdict', verdict === 'timeout'
        ? '等待两侧替换结果超时（任务可能仍在后台执行，下一轮会继续确认）'
        : '替换未完全成功，下一轮将用同一备用域名自动重试', round)
      sendFeishuText(
        `【替换未完全成功】${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n` +
        `- ${domain} -> ${replacementDomain}\n` +
        `${buildSideResultText('Clickflare 侧', cfResult)}\n` +
        `${buildSideResultText('ef-tracker 侧', efResult)}\n` +
        `- 15 分钟后下一轮会自动用同一备用域名补替未成功的部分(已成功的不会重复替换)；连续 3 轮仍未成功将停止重试，请到替换记录页人工核查`
      )
      logReplacementEvent(domain, 'notice', '已发送飞书通知：替换未完全成功', round)
    }

  } catch (err) {
    console.log(`❌ 替换危险域名失败: ${err.message}`)
  } finally {
    // 只要进入过两侧替换阶段, 无论成功/换一半/失败/中途异常, 都把 Clickflare 数据再同步一次:
    // 让本地镜像尽快回到与线上一致(含"换了一半"的中间态), 下一轮据此只补剩余部分, 不会从头重换。
    // 即使这次同步失败也无妨——下一轮流程开头还有一次"替换前"同步兜底。
    if (flowReachedSides) {
      const ok = await syncLandersBeforeReplace('替换后')
      logReplacementEvent(domain, 'sync', ok ? 'Clickflare 数据同步成功（替换后）' : 'Clickflare 数据同步失败（替换后），下一轮开头会再次同步', round)
    }
  }
}


// 三态返回：'exists' = 在用 / 'not_used' = 确认未使用 / 'error' = 查询失败(网络等，使用情况未知)
// ⚠️ 查询失败绝不能当"未使用"返回——否则 Clickflare 侧会静默跳过替换，裁决也会放行，
// 备用域名可能在一侧还挂着危险域名时就被标成 s1-LP
async function checkLanderExists(domain) {
  try {
    const landerApiUrl = process.env.API_BASE_URL || 'https://efbox.work/api'

    const res = await axios.get(`${landerApiUrl}/public/lander/list`, {
      headers: {
        'api-key': 'Ln5QpO8fQ6ZAJxFvuSQs9foeCliIYMAe4AcS6VQd'
      },
      params: {
        url: domain,
        size: 1  // 只需要知道是否存在, 所以只查询1条
      },
      timeout: 10000  // 10秒超时
    })


    const exists = Array.isArray(res.data) && res.data.length > 0
    if (!exists) {
      console.log(`⚠️  Lander 列表中未找到域名 ${domain} 的记录`)
    }
    return exists ? 'exists' : 'not_used'
  } catch (err) {
    console.log(`❌ 查询 Lander 列表失败(使用情况未知, 本轮不当作"未使用"): ${err.message}`)
    return 'error'
  }
}


async function getReplacementDomain(dangerousDomain) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.get(`${baseUrl}/domains/replacement/${dangerousDomain}`)

    if (res?.data?.code === 0) {
      const data = res.data.data

      return data.replacementDomain
    } else {
      console.log(`⚠️  ${res?.data?.message || '无法获取替换域名'}`)
      return null
    }
  } catch (err) {
    console.log(`❌ 获取替换域名失败: ${err.message}`)
    return null
  }
}


// dataSynced: 调用方传入"Clickflare 数据是否刚同步成功"。同步失败时旧镜像的"未使用"
// 不可信——若据此跳过, 真实在用的 Lander 将永远不被替换; 按"无法核实"(failed)处理,
// 完整流程的裁决会等待超时、复核流程会保持静默, 都留给下一轮重试(下一轮会重新尝试同步)。
async function replaceDangerousDomain(domain, replacementDomain, { dataSynced = true } = {}) {
  try {

    const landerState = await checkLanderExists(domain)
    if (landerState === 'not_used') {
      if (!dataSynced) {
        console.log(`❌ Clickflare 数据未同步成功, 旧镜像显示的"未使用"不可信, ${domain} 本轮按无法核实处理`)
        return { status: 'failed', affectedCount: 0 }
      }
      console.log(`域名 ${domain} 在 Lander 列表中不存在, 跳过替换操作`)
      return { status: 'unused', affectedCount: 0 }
    }
    if (landerState === 'error') {
      // 查询失败 = 使用情况未知：不能当 unused（裁决会放行），也不能盲发替换请求。
      // 按 failed 返回：不进 unusedSides → 裁决侧等不到本轮记录会一直"等待"→超时，下一轮重试
      console.log(`❌ 无法核实域名 ${domain} 的 Lander 使用情况, 本轮跳过 Clickflare 侧替换, 等下一轮重试`)
      return { status: 'failed', affectedCount: 0 }
    }


    // replacementDomain 由调用方统一查询传入（与 ef-tracker 侧共用同一个备用域名）
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const url = `${baseUrl}/lander-replacement/replace`

    const res = await axios.post(url, {
      domain: domain,
      replacement_domain: replacementDomain,
      workspace_type: "all"
    }, { timeout: 30000 })  // 该接口只创建替换任务(异步执行), 正常秒级返回

    if (res?.data?.code === 0) {
      const data = res.data.data


      console.log(`域名 ${domain} 替换任务已启动: 影响 ${data.affectedCount} 条 Lander`)
      return { status: 'replaced', affectedCount: data.affectedCount }
    } else {
      console.log(`❌ 替换失败: ${res?.data?.message || '未知错误'}`)
      return { status: 'failed', affectedCount: 0 }
    }
  } catch (err) {
    console.log(`❌ 替换接口调用失败: ${err.message}`)
    return { status: 'failed', affectedCount: 0 }
  }
}


// 替换 ef-tracker 系统(ab_landers)中的危险域名。
// 后端会先预演判断对方是否在用该域名: 没在用不产生替换记录, 在用则批量替换并记录(target_system='eftracker')。
// 与 Clickflare 侧的 replaceDangerousDomain 相互独立, 各自判断各自记录。
// replacementDomain 由调用方统一查询传入（与 Clickflare 侧共用同一个备用域名）。
// 网络层失败(如 socket hang up / 超时)重试 3 次(间隔 5s): 这类故障不代表替换没发生,
// 但拿不到响应只能按失败处理; ef-replace 幂等(在用才替换), 重试安全——若上次实际已成功,
// 重试会返回"未使用"即确认完成。3 次都失败返回 failed, 由"替换未完全成功"通知兜底。
async function replaceEfTrackerDomain(domain, replacementDomain) {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
  const maxAttempts = 3

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await axios.post(`${baseUrl}/lander-replacement/ef-replace`, {
        domain: domain,
        replacement_domain: replacementDomain
      }, { timeout: 120000 })

      if (res?.data?.code === 0) {
        const affected = res.data.data?.affectedCount ?? 0
        console.log(`域名 ${domain} ef-tracker 替换完成: 影响 ${affected} 条 Lander`)
        return { status: 'replaced', affectedCount: affected }
      }
      // code!==0 多数是"未使用该域名, 跳过替换"的正常情况, 不重试直接返回
      console.log(`ℹ️  ef-tracker 侧: ${res?.data?.message || '跳过替换'}`)
      const msg = String(res?.data?.message || '')
      return { status: msg.includes('未使用') ? 'unused' : 'failed', affectedCount: 0 }
    } catch (err) {
      const reason = err?.code || err.message
      if (attempt < maxAttempts) {
        console.log(`❌ ef-tracker 替换接口调用失败(${reason}), 5s 后重试(${attempt}/${maxAttempts}): ${domain}`)
        await sleep(5000)
      } else {
        console.log(`❌ ef-tracker 替换接口重试 ${maxAttempts} 次仍失败(${reason}): ${domain}`)
        return { status: 'failed', affectedCount: 0 }
      }
    }
  }
}


// 替换成功后的复核(替换后、域名 3 轮降级移出监控前, 每轮异常都会触发, 即最多复核 2 轮):
//   重新检查两侧是否还在使用危险域名——
//   - 两侧都已不使用 → 替换生效(或重试已生效), 保持静默, 不发任何消息;
//   - 任一侧仍在使用(替换未真正生效 / 被人为换回) → 用同一备用域名再次替换(replaceXxx 内部
//     自带"在用才替换, 未使用不动作"的预检), 并发飞书通知说明本次结果;
//   - 查询/替换失败(failed) → 也通知(状态显示"替换未确认"), 交给下一轮复核或人工。
// 复核给了"人为把 lander 换回危险域名"在 30 分钟内自动纠正的机会。
async function verifyReplacementOutcome(dangerousDomain, replacementDomain, round) {
  try {
    console.log(`[替换复核] ${dangerousDomain} 仍异常, 复核替换是否生效(备用: ${replacementDomain})`)
    logReplacementEvent(dangerousDomain, 'verify_start', `开始复核替换是否生效（使用的备用：${replacementDomain}）`, round)
    const dataSynced = await syncLandersBeforeReplace('复核前')
    const cfResult = await replaceDangerousDomain(dangerousDomain, replacementDomain, { dataSynced })
    const efResult = await replaceEfTrackerDomain(dangerousDomain, replacementDomain)

    // 两侧都干净地确认"未使用" → 替换保持生效, 静默
    if (cfResult.status === 'unused' && efResult.status === 'unused') {
      console.log(`[替换复核] ${dangerousDomain} 两侧均已不使用, 替换保持生效, 静默`)
      logReplacementEvent(dangerousDomain, 'verify_result', '复核通过：两个系统均已不使用该域名，替换保持生效', round)
      return
    }
    logReplacementEvent(dangerousDomain, 'verify_result', `复核发现仍有系统在使用该域名，已用同一备用重新替换（${sideResultText('Clickflare', cfResult)}；${sideResultText('ef-tracker', efResult)}）`, round)
    logReplacementEvent(dangerousDomain, 'notice', '已发送飞书通知：替换复核·已重新处理', round)

    // 有任一侧仍在使用(已重新替换)或状态不明 → 发通知让人知道
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    console.log(`[替换复核] ${dangerousDomain} 替换未完全生效或状态异常, 已处理: cf=${cfResult.status} ef=${efResult.status}`)
    sendFeishuText(
      `【替换复核·已重新处理】${time}\n` +
      `上一轮替换未完全生效(或域名被换回), 已用同一备用域名重新替换:\n` +
      `- ${dangerousDomain} -> ${replacementDomain}\n` +
      `${buildSideResultText('Clickflare 侧', cfResult)}\n` +
      `${buildSideResultText('ef-tracker 侧', efResult)}`
    )
    // 复核产生了替换动作: 同步一次, 保持镜像干净
    await syncLandersBeforeReplace('复核替换后')
  } catch (err) {
    console.log(`❌ [替换复核] ${dangerousDomain} 复核失败: ${err.message}`)
  }
}


function extractDomain(url) {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch (err) {
    console.log(`解析URL失败: ${url}`)
    return null
  }
}

// 同步 Clickflare 数据到本地库。stage 标记同步时机(替换前/替换后/复核前...), 只影响日志文案。
// 替换前同步: 让"是否使用该域名"的判断基于最新数据(自动同步关闭时本地 cf_landers 是旧镜像,
//   拿旧数据判断会把"实际在用"误判成"未使用"而跳过替换——2026-09-23 kervalix 事件)。
// 替换后同步: 无论替换成功/一半/失败, 让本地镜像尽快回到与线上一致的状态, 避免脏数据
//   影响后续轮次的判断。替换任务内部虽有 final_sync, 但任务失败/中断时不一定执行。
// 处理器会等同步完成才返回(正在进行中的同步会自动排队等结果)。
// 同步失败不阻塞调用方流程, 只打警告。
async function syncLandersBeforeReplace(stage = '替换前') {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
  try {
    const res = await axios.post(`${baseUrl}/lander/internal/sync`, {}, { timeout: 120000 })
    if (res?.data?.code === 0) {
      const d = res.data.data || {}
      console.log(`[替换流程] Clickflare 数据已同步(${stage}, 耗时 ${d.duration ?? '?'}s)`)
      return true
    }
    console.log(`⚠️ [替换流程] Clickflare 数据同步返回异常(${stage}): ${res?.data?.message || '未知'}`)
    return false
  } catch (err) {
    console.log(`⚠️ [替换流程] Clickflare 数据同步失败(${stage}, ${err.message})`)
    return false
  }
}


// 触发飞书电话加急通知 (异常告警时与预警邮件一起发出)
// 接收人 open_id 通过环境变量 FEISHU_ALERT_OPEN_ID 配置, 支持逗号分隔多个; 未配置则跳过
async function triggerUrgentPhoneCall(text) {
  const raw = process.env.FEISHU_ALERT_OPEN_ID
  if (!raw) {
    console.log('⚠️ 未配置 FEISHU_ALERT_OPEN_ID, 跳过电话加急通知')
    return false
  }

  const openIds = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (!openIds.length) return false

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
  for (const receiveId of openIds) {
    try {
      await axios.post(`${baseUrl}/feishu/send/urgent-phone`, { receiveId, text })
    } catch (err) {
      console.log(`❌ 电话加急通知失败 (${receiveId}): ${err.message}`)
    }
  }
  return true
}


// 发送飞书普通文本消息(不发邮件、不打电话)
// 接收人 open_id 通过环境变量 FEISHU_ALERT_OPEN_ID 配置(与电话加急同一份), 支持逗号分隔多个; 未配置则跳过
async function sendFeishuText(text) {
  const raw = process.env.FEISHU_ALERT_OPEN_ID
  if (!raw) {
    console.log('⚠️ 未配置 FEISHU_ALERT_OPEN_ID, 跳过飞书文本消息')
    return false
  }

  const openIds = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (!openIds.length) return false

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
  for (const receiveId of openIds) {
    try {
      await axios.post(`${baseUrl}/feishu/send/text`, { receiveId, text })
    } catch (err) {
      console.log(`❌ 飞书文本消息发送失败 (${receiveId}): ${err.message}`)
    }
  }
  return true
}


// 拉取域名清单日报数据(每日 8 点第二封邮件用)
// 返回 { backup: [...], inUse: [...], mislabelBackup: [备用被启用超24h仍未改标签的域名] }
async function getDailyReportList() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.get(`${baseUrl}/domains/internal/daily_report_list`, { timeout: 15000 })
    if (res?.data?.code === 0) {
      return { ok: true, ...res.data.data }
    }
    console.log(`⚠️ 域名清单日报数据返回异常: ${res?.data?.message || '未知错误'}`)
    return { ok: false, backup: [], inUse: [], mislabelBackup: [] }
  } catch (err) {
    console.log(`❌ 拉取域名清单日报数据失败: ${err.message}`)
    return { ok: false, backup: [], inUse: [], mislabelBackup: [] }
  }
}


// 已替换成功并通知过飞书的域名映射(内存态): domain -> { replacementDomain }。
// 域名替换成功后加入: 之后该域名即使仍异常也不再发预警(电话/普通消息都不发),
// 后续轮次转为"替换复核"(verifyReplacementOutcome): 替换生效则静默, 未生效则用同一备用重试。
// 脚本重启后映射清空——彼时域名通常已被降级移出监控或已恢复; 即使仍在监控中,
// 重新走一遍流程(两侧未使用分支不会消耗备用)也是合理兜底。
const notifiedReplaced = new Map()

// 本进程内出现过"两侧系统均未使用"结论的域名集合(内存态)。
// 用于自动降级通知时区分措辞: 未使用的域名移出监控属清理, 不应说"未替换成功"造成误导。
// 域名恢复正常时由 index.js 清除; 重启清空(降级前的窗口内信息足够)。
const notifiedUnused = new Set()

// ===== 替换/复核流程串行队列 =====
// 同一轮多个域名同时异常时, 流程逐个执行而不是并发:
// 并发的备用池查询会把同一个备用域名分配给多个域名(2026-09-29 测试日志中
// tapsweetwish 与 quicksala2 同时拿到 baidu.com 即此情况)。串行后, 前一个流程
// 成功时备用已转正移出池子, 后一个自然选到下一个备用。
// 同时按域名去重: 上一轮该域名的流程还没跑完时, 本轮不再重复入队(下一轮检测会再处理)。
// 正常一个流程约 3-5 分钟(含裁决轮询), 两三个域名排队仍在 15 分钟轮次内; 告警不受影响
// (告警由检测循环直接发, 不经过这个队列)。
const inFlightReplacements = new Set()
let replacementQueue = Promise.resolve()
function enqueueReplacementFlow(domain, task) {
  if (inFlightReplacements.has(domain)) {
    console.log(`[替换流程] ${domain} 上一次流程仍在执行, 本轮跳过, 下一轮检测会再处理`)
    return
  }
  inFlightReplacements.add(domain)
  replacementQueue = replacementQueue.then(async () => {
    try {
      await task()
    } catch (err) {
      console.log(`❌ 替换队列任务异常(${domain}): ${err.message}`)
    } finally {
      inFlightReplacements.delete(domain)
    }
  })
}

// 拉取备用域名池数量(口径与后端选备用一致: 安全+可访问+在监控中的备用域名)
async function getBackupPoolCount() {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const res = await axios.get(`${baseUrl}/domains/internal/backup_pool_count`, { timeout: 10000 })
    if (res?.data?.code === 0 && res?.data?.data) {
      return res.data.data  // { availableCount, totalCount }
    }
    console.log(`⚠️ 备用域名数量接口返回异常: ${res?.data?.message || '未知错误'}`)
    return null
  } catch (err) {
    console.log(`❌ 拉取备用域名数量失败: ${err.message}`)
    return null
  }
}

// 替换成功后的飞书普通消息通知(不打电话、不发邮件):
// 内容 = 被替换域名 -> 替换域名 + 各系统替换明细(哪侧替换了/哪侧未使用/影响条数)
//       + 备用池分类数量提醒(按 s 编号逐类展示; 拉取失败时不带这部分, 不阻塞通知)
// sides: { cfResult, efResult } —— 两侧替换函数的结构化返回 { status: replaced|unused|failed, affectedCount }
function buildSideResultText(sideName, result) {
  if (result?.status === 'replaced') {
    return `- ${sideName}：已替换完毕（影响 ${result.affectedCount} 条 Lander）`
  }
  if (result?.status === 'unused') {
    return `- ${sideName}：未使用该域名，无需替换`
  }
  return `- ${sideName}：替换未确认（${result?.status || '无结果'}，请到替换记录页核查）`
}

async function sendReplacementSuccessNotice(dangerousDomain, replacementDomain, { cfResult, efResult } = {}) {
  try {
    const time = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    const lines = [
      `【域名替换完成】${time}`,
      `危险域名已自动替换成功：`,
      `- ${dangerousDomain} -> ${replacementDomain}`,
      buildSideResultText('Clickflare 侧', cfResult),
      buildSideResultText('ef-tracker 侧', efResult)
    ]
    const pool = await getBackupPoolCount()
    if (pool) {
      const catLines = (pool.categories || []).map(c =>
        `- ${c.category}-备用域名：可用 ${c.availableCount} 个（共 ${c.totalCount} 个）`)
      lines.push(``,
        `- 备用域名池：当前可用 ${pool.availableCount} 个（备用总数 ${pool.totalCount} 个）`,
        ...(catLines.length ? catLines : ['- 暂无分类备用域名']),
        `[提醒] 请及时注册新域名补充备用池，保持备用域名数量充足`)
    }
    await sendFeishuText(lines.join('\n'))
    console.log(`[替换流程] ✅ 替换成功通知已发送: ${dangerousDomain} -> ${replacementDomain}`)
  } catch (err) {
    console.log(`❌ 发送替换成功通知失败: ${err.message}`)
  }
}

module.exports = {
  getUrlsFromApi,
  updateDomainStatus,
  setDomainNotImportant,
  triggerUrgentPhoneCall,
  sendFeishuText,
  replaceDangerousDomain,
  replaceEfTrackerDomain,
  getDailyReportList,
  reportLastCheck,
  resolvePurposeInherit,
  notifiedReplaced,
  notifiedUnused
}
