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


    const params = [
      `%${existing_domain ?? ''}%`,
      `%${landing_page_url ?? ''}%`,
    ];


    let whereClause = `
      existing_domain LIKE ?
      AND landing_page_url LIKE ?
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


    const params = [
      `%${existing_domain ?? ''}%`,
      `%${landing_page_url ?? ''}%`,
    ];


    let whereClause = `
      existing_domain LIKE ?
      AND landing_page_url LIKE ?
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

    return { backup, inUse }
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
}

module.exports = new DomainsService()