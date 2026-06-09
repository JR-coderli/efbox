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

        const [replacementRecords] = await connection.execute(
          `SELECT landing_page_url FROM domains WHERE purpose LIKE ? AND is_safe = 1 LIMIT 1`,
          [`%${backupPurpose}%`]
        )

        if (replacementRecords.length > 0) {
          let replacementDomain = replacementRecords[0].landing_page_url


          try {
            const urlObj = new URL(replacementDomain)
            replacementDomain = urlObj.hostname
          } catch (e) {

          }
          console.log(`危险域名 ${dangerousDomain} (purpose: ${dangerousPurpose}) -> 替换域名 ${replacementDomain} (purpose: ${backupPurpose})`)

          return {
            success: true,
            dangerousDomain,
            dangerousPurpose,
            replacementDomain,
            replacementPurpose: backupPurpose
          }
        }
      }


      const sNumbers = purposeMatch.map(m => m).join(', ')
      return {
        success: false,
        message: `未找到包含 "${sNumbers}-备用" 的替换域名，跳过替换`
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