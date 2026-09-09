const connection = require('../app/database')
const axios = require('axios')


const SAFE_BROWSING_API_KEY = process.env.SAFE_BROWSING_API_KEY || 'AIzaSyD9vj6yRGGHqFsmD10BuwcgkooNoV8-XP0'

class DomainsService {

  async create(domains_info) {

    const {
      existing_domain = '',
      landing_page_url = '',
      is_important = '1',
      is_accessible = '1',
      is_safe = '1',
      purpose = null,
      remark = null
    } = domains_info


    const statement = 'INSERT INTO `domains` (existing_domain, landing_page_url, is_important, is_accessible, is_safe, purpose, remark) VALUES (?, ?, ?, ?, ?, ?, ?);'


    try {
      const [result] = await connection.execute(statement, [existing_domain, landing_page_url, is_important, is_accessible, is_safe, purpose, remark])
      return result
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return { error: '域名已存在' }
      }
    }
  }


  async normal_list(offset, size, createAtStart, createAtEnd, existing_domain, landing_page_url, is_normal) {


    // 域名搜索：除子串匹配外，把搜索词剥掉一级子域（pro.quicksala2.com → quicksala2.com）
    // 再 OR 匹配，使搜索子域名时也能命中其主域记录；两级以上子域递归剥到主域为止
    // 落地页地址同样参与模糊匹配（如搜 pro2.genvirop.com 命中 landing_page_url=https://pro2.genvirop.com）
    const domainConditions = ['existing_domain LIKE ?', 'landing_page_url LIKE ?']
    const domainParams = [`%${existing_domain ?? ''}%`, `%${existing_domain ?? ''}%`]
    let stripped = String(existing_domain ?? '').trim()
    while (stripped.includes('.')) {
      stripped = stripped.slice(stripped.indexOf('.') + 1)
      domainConditions.push('existing_domain LIKE ?')
      domainParams.push(`%${stripped}%`)
    }

    const params = [
      ...domainParams,
    ];


    // 搜索条件：域名(含子域剥离) 或 落地页地址，任一命中即可（搜索词只需要满足一个字段）
    let whereClause = `
      (${domainConditions.join(' OR ')})
    `;


    if (is_normal !== undefined && is_normal !== null) {
      whereClause += ` AND is_normal = ?`;
      params.push(is_normal); // 插入 is_normal 参数
    }


    if (createAtStart && createAtEnd) {
      whereClause += ` AND createAt BETWEEN ? AND ?`
      params.push(createAtStart); // 插入 createAtStart 参数
      params.push(createAtEnd); // 插入 createAtEnd 参数
    }


    const params2 = [...params]
    params.push(size, offset)
    

    const sql1 = `
      SELECT *
      FROM domains
      WHERE ${whereClause}
      AND is_important = 0
      ORDER BY updateAt DESC, id DESC
      LIMIT ? OFFSET ?;
    `;



    const sql2 = `
      SELECT COUNT(*) AS noLimitSizeCount
      FROM domains
      WHERE ${whereClause}
      AND is_important = 0;
    `
 


    const [entireResult] = await connection.execute(sql1, params); // 条件查询的数据
    const entireTotalCount = entireResult.length; // 条件查询的数据的数量 (有条件)


    const [noLimitOffsetResult] = await connection.execute(sql2, params2);
    const noLimitOffsetCount = noLimitOffsetResult[0].noLimitSizeCount // (无limit、offset)

    return [entireResult, entireTotalCount, noLimitOffsetCount];
  }



  async import_list(offset, size, createAtStart, createAtEnd, existing_domain, landing_page_url, is_normal) {


    // 与 normal_list 相同的子域剥离搜索：搜子域名时也命中主域记录
    const domainConditions = ['existing_domain LIKE ?']
    const domainParams = [`%${existing_domain ?? ''}%`]
    let stripped = String(existing_domain ?? '').trim()
    while (stripped.includes('.')) {
      stripped = stripped.slice(stripped.indexOf('.') + 1)
      domainConditions.push('existing_domain LIKE ?')
      domainParams.push(`%${stripped}%`)
    }

    const params = [
      ...domainParams,
    ];


    // 搜索条件：域名(含子域剥离) 或 落地页地址，任一命中即可（搜索词只需要满足一个字段）
    let whereClause = `
      (${domainConditions.join(' OR ')})
    `;


    if (is_normal !== undefined && is_normal !== null) {
      whereClause += ` AND is_normal = ?`;
      params.push(is_normal); // 插入 is_normal 参数
    }


    if (createAtStart && createAtEnd) {
      whereClause += ` AND createAt BETWEEN ? AND ?`
      params.push(createAtStart); // 插入 createAtStart 参数
      params.push(createAtEnd); // 插入 createAtEnd 参数
    }


    const params2 = [...params]
    params.push(size, offset)
    

    const sql1 = `
      SELECT *
      FROM domains
      WHERE ${whereClause}
      AND is_important = 1
      ORDER BY id DESC
      LIMIT ? OFFSET ?;
    `;


    const sql2 = `
      SELECT COUNT(*) AS noLimitSizeCount
      FROM domains
      WHERE ${whereClause}
      AND is_important = 1;
    `

 


    const [entireResult] = await connection.execute(sql1, params); // 条件查询的数据
    const entireTotalCount = entireResult.length; // 条件查询的数据的数量 (有条件)


    const [noLimitOffsetResult] = await connection.execute(sql2, params2);
    const noLimitOffsetCount = noLimitOffsetResult[0].noLimitSizeCount // (无limit、offset)

    return [entireResult, entireTotalCount, noLimitOffsetCount];
  }
  


  async remove(id) {
    const statement = 'DELETE FROM `domains` WHERE id = ?;'
    await connection.execute(statement, [id])
  }

  /**
   * 域名清单日报数据(供 url_detection_database 每日 8 点第二封邮件):
   * - backup: 备用域名(purpose 含"备用"),带每个域名被启用过的次数
   *           (出现在 cf_lander_url_replacements.replacement_domain 的次数)
   * - inUse:  当前实际在用的域名 = Clickflare 落地页列表(cf_landers.url 提取域名)
   *           ∪ ef-tracker 落地页列表(/query/landers 全量 url 提取域名),
   *           purpose 从 domains 表按域名匹配补上(没登记的显示"-"),
   *           updateAt 取该域名最后一次被替换记录的时间(没有则"-")
   */
  async dailyReportList() {
    // 备用域名 + 被替换启用次数(LEFT JOIN 聚合,没被用过计 0)
    // 注: cf_lander_url_replacements 是 utf8mb4_0900_ai_ci、domains 是 utf8mb4_general_ci,
    // JOIN 比较需显式统一排序规则,否则 Illegal mix of collations (本地库踩过的坑)
    const [backup] = await connection.execute(
      `SELECT d.id, d.purpose, d.landing_page_url,
              IFNULL(r.used_count, 0) AS used_count
       FROM domains d
       LEFT JOIN (
         SELECT replacement_domain, COUNT(*) AS used_count
         FROM cf_lander_url_replacements
         GROUP BY replacement_domain
       ) r ON r.replacement_domain COLLATE utf8mb4_general_ci = d.existing_domain
       WHERE d.purpose LIKE '%备用%'
       ORDER BY d.id ASC`
    )

    // 备用域名被启用后"标签迟迟未改"清单(供飞书普通消息提醒):
    // 条件 = purpose 仍含"备用" + 最近一次被替换启用发生在 24 小时之前(留足人工改标签时间,避免刚换完就误报)
    const [mislabelBackup] = await connection.execute(
      `SELECT d.existing_domain, d.purpose, MAX(t.updated_at) AS last_used_at
       FROM domains d
       INNER JOIN cf_lander_url_replacements t
         ON t.replacement_domain COLLATE utf8mb4_general_ci = d.existing_domain
       WHERE d.purpose LIKE '%备用%'
         AND t.updated_at < NOW() - INTERVAL 24 HOUR
       GROUP BY d.existing_domain, d.purpose
       ORDER BY last_used_at DESC`
    )

    // 1) Clickflare 侧:本地同步表 cf_landers 的全部 url
    const [cfRows] = await connection.execute(
      `SELECT url FROM cf_landers WHERE url <> ''`
    )
    const cfUrls = cfRows.map(r => r.url)

    // 2) ef-tracker 侧:调对方 /query/landers 全量分页拉 url
    const efUrls = []
    try {
      const efTrackerConfig = require('../config/ef-tracker')
      const axios = require('axios')
      const size = 100
      let page = 1
      let pages = 1
      do {
        const res = await axios.get(`${efTrackerConfig.baseURL}/query/landers`, {
          params: { page, size },
          timeout: 15000
        })
        const list = res?.data?.list || []
        for (const item of list) {
          if (item.url) efUrls.push(item.url)
        }
        pages = res?.data?.pages || Math.ceil((res?.data?.total || 0) / size) || 1
        page++
      } while (page <= pages)
    } catch (err) {
      console.log('[域名清单日报] 拉取 ef-tracker 落地页列表失败:', err.message)
    }

    // 3) 提取域名去重,合并来源标记
    const domainMap = new Map() // domain -> { sources: Set }
    const extractDomain = (url) => {
      try {
        return new URL(url).hostname
      } catch {
        return null
      }
    }
    for (const url of cfUrls) {
      const d = extractDomain(url)
      if (d) {
        if (!domainMap.has(d)) domainMap.set(d, { sources: new Set() })
        domainMap.get(d).sources.add('clickflare')
      }
    }
    for (const url of efUrls) {
      const d = extractDomain(url)
      if (d) {
        if (!domainMap.has(d)) domainMap.set(d, { sources: new Set() })
        domainMap.get(d).sources.add('eftracker')
      }
    }

    // 4) 用 domains 表补 purpose;用替换记录表补最近更新时间
    const domains = [...domainMap.keys()]
    const purposeMap = new Map()
    const updateTimeMap = new Map()
    if (domains.length > 0) {
      const placeholders = domains.map(() => '?').join(',')
      const [dRows] = await connection.execute(
        `SELECT existing_domain, purpose FROM domains WHERE existing_domain IN (${placeholders})`,
        domains
      )
      for (const r of dRows) purposeMap.set(r.existing_domain, r.purpose)

      const [tRows] = await connection.execute(
        `SELECT replacement_domain AS domain, MAX(updated_at) AS last_time
         FROM cf_lander_url_replacements
         WHERE replacement_domain COLLATE utf8mb4_general_ci IN (${placeholders})
         GROUP BY replacement_domain`,
        domains
      )
      for (const r of tRows) updateTimeMap.set(r.domain, r.last_time)
    }

    const inUse = domains.map(d => ({
      domain: d,
      purpose: purposeMap.get(d) || '',
      sources: [...domainMap.get(d).sources].join(' + '),
      updateAt: updateTimeMap.get(d) || null
    })).sort((a, b) => String(b.updateAt || '').localeCompare(String(a.updateAt || '')))

    return { backup, inUse, mislabelBackup }
  }


  /**
   * Clickflare 域名覆盖对比：cf_landers（本地已同步的 Clickflare lander 表）提取全部域名，
   * 对照 domains 检测表，找出未纳入检测的域名。
   * 只读 cf_landers —— 不触碰任何同步/写入逻辑。
   */
  async coverageList() {
    // 1) Clickflare 侧：只读查询 cf_landers 全部 url（lander-sync 定时任务维护的本地镜像）
    const [rows] = await connection.execute(
      `SELECT url FROM cf_landers WHERE url <> ''`
    )

    // 2) ef-tracker 侧：分页全量拉 /query/landers 的 url（只读对方接口，拉取失败不阻塞 Clickflare 侧对比）
    const efUrls = []
    let efError = false
    try {
      const efTrackerConfig = require('../config/ef-tracker')
      const axios = require('axios')
      const size = 100
      let page = 1
      let pages = 1
      do {
        const res = await axios.get(`${efTrackerConfig.baseURL}/query/landers`, {
          params: { page, size },
          timeout: 15000
        })
        const list = res?.data?.list || []
        for (const item of list) {
          if (item.url) efUrls.push(item.url)
        }
        pages = res?.data?.pages || Math.ceil((res?.data?.total || 0) / size) || 1
        page++
      } while (page <= pages)
    } catch (err) {
      efError = true
      console.log('[域名覆盖对比] 拉取 ef-tracker 落地页列表失败:', err.message)
    }

    // 3) 提取 hostname 去重 + 按域名计数 lander 条数 + 记来源 + 记示例地址（域名 origin，预填落地页地址用）
    const domainCount = new Map() // domain -> lander 数（两侧合计）
    const sampleUrlMap = new Map() // domain -> 协议+域名（如 https://pro.xxx.com，不带路径）
    const sourceMap = new Map()   // domain -> Set('clickflare' | 'eftracker')
    const addUrl = (url, source) => {
      try {
        const u = new URL(url)
        domainCount.set(u.hostname, (domainCount.get(u.hostname) || 0) + 1)
        if (!sampleUrlMap.has(u.hostname)) sampleUrlMap.set(u.hostname, u.origin)
        if (!sourceMap.has(u.hostname)) sourceMap.set(u.hostname, new Set())
        sourceMap.get(u.hostname).add(source)
      } catch {
        // 非法 URL 跳过
      }
    }
    for (const r of rows) addUrl(r.url, 'clickflare')
    for (const url of efUrls) addUrl(url, 'eftracker')

    const domains = [...domainCount.keys()]

    // 4) 对照 domains 检测表
    //    existing_domain 存的是主域（genvirop.com），系统用的是子域（pro2.genvirop.com），
    //    精确匹配对不上 → 除了按 existing_domain 精确匹配，还要按 landing_page_url 的主机名匹配
    //    （落地页地址如 https://pro2.genvirop.com 的 hostname 与在用子域一致时即算纳入检测）
    const detectionMap = new Map() // domain -> { purpose, is_important }
    if (domains.length > 0) {
      // 一次性把 domains 表全量查出来（existing_domain + landing_page_url），在 JS 里做主机名匹配，
      // 避免对每个在用域名发一条 SQL
      const [allRows] = await connection.execute(
        `SELECT existing_domain, landing_page_url, purpose, is_important FROM domains`
      )

      // 建两个索引：主域 -> 记录；落地页主机名 -> 记录
      const byExistingDomain = new Map()
      const byLandingHost = new Map()
      for (const d of allRows) {
        if (d.existing_domain) byExistingDomain.set(d.existing_domain, { purpose: d.purpose, is_important: d.is_important })
        if (d.landing_page_url) {
          try {
            const host = new URL(d.landing_page_url).hostname
            if (host && !byLandingHost.has(host)) {
              byLandingHost.set(host, { purpose: d.purpose, is_important: d.is_important })
            }
          } catch {
            // 非法落地页地址跳过
          }
        }
      }

      for (const d of domains) {
        // 优先按 existing_domain 精确匹配（主域口径）；不中则按落地页主机名匹配（子域口径）
        const hit = byExistingDomain.get(d) || byLandingHost.get(d)
        if (hit) detectionMap.set(d, hit)
      }
    }

    // 5) 组装：未覆盖优先，同组按域名字母序
    const list = domains.map((d) => {
      const hit = detectionMap.get(d)
      return {
        domain: d,
        lander_count: domainCount.get(d),
        sources: [...sourceMap.get(d)],      // 使用该域名的系统 ['clickflare'] / ['eftracker'] / 两侧
        sample_url: sampleUrlMap.get(d) || '', // 域名 origin（前端预填落地页地址用）
        in_detection: !!hit,               // 是否已登记在 domains 表
        is_important: hit ? hit.is_important : null, // 1=检测中 0=已登记但非重要 null=未登记
        purpose: hit ? hit.purpose : ''
      }
    }).sort((a, b) => {
      if (a.in_detection !== b.in_detection) return a.in_detection ? 1 : -1 // 未覆盖排前面
      return a.domain.localeCompare(b.domain)
    })

    const covered = list.filter((x) => x.in_detection).length
    return {
      list,
      summary: {
        total: list.length,          // 两侧在用域名总数（去重后）
        covered,                     // 已纳入 domains 表
        uncovered: list.length - covered // 未纳入（页面重点展示）
      },
      ef_error: efError // ef-tracker 拉取失败标记（前端提示，Clickflare 侧对比不受影响）
    }
  }

  async update(domainId, existing_domain, landing_page_url, is_important, is_normal, purpose, remark) {

    const updates = [];
    const values = [];


    if (existing_domain !== undefined) {
      updates.push('existing_domain = ?');
      values.push(existing_domain);
    }
    if (landing_page_url !== undefined) {
      updates.push('landing_page_url = ?');
      values.push(landing_page_url);
    }
    if (is_important !== undefined) {
      updates.push('is_important = ?');
      values.push(is_important);
    }
    if (is_normal !== undefined) {
      updates.push('is_normal = ?');
      values.push(is_normal);
    }
    if (purpose !== undefined) {
      updates.push('purpose = ?');
      values.push(purpose);
    }
    if (remark !== undefined) {
      updates.push('remark = ?');
      values.push(remark);
    }


    if (updates.length === 0) {
      console.log('No fields to update.');
      return null;
    }


    const updateFields = updates.join(', ');
    const sql = `UPDATE domains SET ${updateFields} WHERE id = ?;`;
    values.push(domainId);

    try {
      const [result] = await connection.execute(sql, values);
      return result;
    } catch (error) {
      console.error('Update failed:', error);
      // existing_domain 有 UNIQUE 索引：改成已存在的域名 → ER_DUP_ENTRY。
      // 转成业务错误返回（与 create 的"域名已存在"一致），而不是抛出去把请求搞挂
      if (error.code === 'ER_DUP_ENTRY') {
        return { error: '域名已存在，不能修改为重复的域名' }
      }
      throw error;
    }
  }


  async updateIsImportant(id, isImportant) {
    const statement = `
    UPDATE domains
    SET is_important = ?
    WHERE id = ?;
    `
    await connection.execute(statement, [isImportant, id])
  }
  

  async updateIsNormal(id, is_accessible, is_safe) {
    const statement = `
    UPDATE domains
    SET is_accessible = ?, is_safe = ?
    WHERE id = ?;
    `
    await connection.execute(statement, [is_accessible, is_safe, id])
  }


  async updateRemark(id, remark) {
    const statement = `
    UPDATE domains
    SET remark = ?
    WHERE id = ?;
    `
    await connection.execute(statement, [remark, id])
  }


  async checkDomainExists(existing_domain) {
    const statement = 'SELECT COUNT(*) AS count FROM `domains` WHERE existing_domain = ?;'
    const [result] = await connection.execute(statement, [existing_domain])
    return result[0].count > 0
  }


  async checkAccessible(url) {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true // 不抛出错误，返回所有状态码
      })
      return response.status >= 200 && response.status < 400
    } catch (error) {
      console.log('可访问性检测失败:', error.message)
      return false
    }
  }


  async checkSafeBrowsing(urls) {
    if (!SAFE_BROWSING_API_KEY) {
      console.warn('Google Safe Browsing API Key 未配置')
      return { matches: [] }
    }

    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`
    const body = {
      client: { clientId: "domain-system", clientVersion: "1.0" },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: urls.map(url => ({ url }))
      }
    }

    try {
      const response = await axios.post(endpoint, body, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000
      })
      return response.data
    } catch (error) {
      console.error('Safe Browsing API 调用失败:', error.message)
      return { matches: [] }
    }
  }


  async checkDomain(url) {

    const [accessible, safeData] = await Promise.all([
      this.checkAccessible(url),
      this.checkSafeBrowsing([url])
    ])


    const isDanger = safeData.matches?.some(m => m.threat.url === url) || false

    return {
      url,
      accessible,
      isDanger,
      isSafe: !isDanger,
      threatTypes: isDanger ? safeData.matches.map(m => m.threat.threatType) : []
    }
  }


  async getReplacementDomain(dangerousDomain) {
    try {

      const [dangerousRecords] = await connection.execute(
        `SELECT id, existing_domain, purpose FROM domains WHERE landing_page_url LIKE ?`,
        [`%${dangerousDomain}%`]
      )

      if (dangerousRecords.length === 0) {
        return {
          success: false,
          message: `危险域名 ${dangerousDomain} 在 domains 表中不存在，跳过替换`
        }
      }

      const dangerousPurpose = dangerousRecords[0].purpose


      if (!dangerousPurpose) {
        return {
          success: false,
          message: `危险域名 ${dangerousDomain} 的 purpose 字段为空，跳过替换`
        }
      }



      const purposeLower = dangerousPurpose.toLowerCase()


      const purposeMatch = purposeLower.match(/\b[s](\d+)\b/g)

      if (!purposeMatch || purposeMatch.length === 0) {
        return {
          success: false,
          message: `危险域名 ${dangerousDomain} 的 purpose "${dangerousPurpose}" 不包含 s 开头的编号（如 s1, s2），跳过替换`
        }
      }



      for (const match of purposeMatch) {
        const sNumber = match // 如 "s1", "s2"
        const backupPurpose = `${sNumber}-备用`

        // 备用域名必须同时满足：
        //   is_safe = 1       —— 未被 Google Safe Browsing 标记为危险
        //   is_accessible = 1 —— HTTP 探测可达（服务器没宕机、域名没被墙）
        //   is_important = 1  —— 已纳入监控范围（检测脚本会持续更新它的状态，
        //                       避免选入"从未被检测"的候选导致状态字段过期失真）
        // 任一条件不满足的候选都会被 SQL 直接排除，
        // 因此 LIMIT 1 返回的就是第一个"既安全又能打开且在监控中"的备用域名；
        // 若该 s 编号下所有备用候选都挂了，replacementRecords 为空，继续尝试下一个 s 编号，
        // 全部 s 编号都找不到可用备用时，外层会返回 success:false，跳过整个替换。
        const [replacementRecords] = await connection.execute(
          `SELECT landing_page_url, purpose FROM domains WHERE purpose LIKE ? AND is_safe = 1 AND is_accessible = 1 AND is_important = 1 ORDER BY id ASC LIMIT 1`,
          [`%${backupPurpose}%`]
        )

        if (replacementRecords.length > 0) {
          const selected = replacementRecords[0]
          let replacementDomain = selected.landing_page_url


          try {
            const urlObj = new URL(replacementDomain)
            replacementDomain = urlObj.hostname
          } catch (e) {

          }
          console.log(`危险域名 ${dangerousDomain} (purpose: ${dangerousPurpose}) -> 替换域名 ${replacementDomain} (purpose: ${selected.purpose})`)

          return {
            success: true,
            dangerousDomain,
            dangerousPurpose,
            replacementDomain,
            replacementPurpose: selected.purpose
          }
        }
      }


      const sNumbers = purposeMatch.map(m => m).join(', ')
      return {
        success: false,
        message: `未找到符合条件的备用域名（要求 is_important=1、is_safe=1、is_accessible=1，purpose 含 "${sNumbers}-备用"），跳过替换`
      }
    } catch (error) {
      console.error('查询替换域名失败:', error)
      return {
        success: false,
        message: `查询替换域名失败: ${error.message}`
      }
    }
  }

  /**
   * 统计备用域名池当前"可用"数量（口径与 getReplacementDomain 选备用完全一致：
   * is_safe=1、is_accessible=1、is_important=1 且 purpose 含"备用"）。
   * 供检测脚本在替换成功后提醒用户剩余备用数、及时注册补充。
   * 同时返回总备用数（只看 purpose 含"备用"，不看健康状态），便于对比。
   */
  async getBackupPoolCount() {
    try {
      const [rows] = await connection.execute(
        `SELECT
           SUM(CASE WHEN is_safe = 1 AND is_accessible = 1 AND is_important = 1 THEN 1 ELSE 0 END) AS available_count,
           COUNT(*) AS total_count
         FROM domains
         WHERE purpose LIKE '%备用%'`
      )
      return {
        success: true,
        availableCount: Number(rows[0]?.available_count) || 0,
        totalCount: Number(rows[0]?.total_count) || 0
      }
    } catch (error) {
      console.error('统计备用域名数量失败:', error)
      return { success: false, availableCount: 0, totalCount: 0, message: error.message }
    }
  }
}

module.exports = new DomainsService()