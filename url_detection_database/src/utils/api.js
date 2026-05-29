const axios = require('axios')


async function getUrlsFromApi() {
  try {
    const res = await axios.post(process.env.API_BASE_URL + '/domains/import_list', {
      offset: 0,
      size: 100
    });
    const list = res?.data?.data?.list || [];


    const urls = list
      .filter(item => item.landing_page_url)  // 过滤掉没有 URL 的
      .map(item => ({
        id: item.id,
        url: item.landing_page_url
      }))


    return urls
  } catch (err) {

    return []
  }
}


async function updateDomainStatus(id, isAccessible, isSafe, url) {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const apiUrl = `${baseUrl}/domains/internal/is_normal/${id}`

    await axios.patch(apiUrl, {
      is_accessible: isAccessible,
      is_safe: isSafe,
    })




    if ((isSafe === 0 || isAccessible === 0) && url) {
      try {
        const domain = extractDomain(url)
        if (domain) {
          await replaceDangerousDomain(domain)
        }
      } catch (err) {
        console.log(`❌ 替换危险域名失败: ${err.message}`)
      }
    }
  } catch (err) {
    console.log(`❌ 更新域名状态失败 id=${id}: ${err.message}`);
  }
}


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
    if (exists) {

    } else {
      console.log(`⚠️  Lander 列表中未找到域名 ${domain} 的记录, 跳过替换操作`)
    }
    return exists
  } catch (err) {
    console.log(`❌ 查询 Lander 列表失败: ${err.message}`)

    return false
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


async function replaceDangerousDomain(domain) {
  try {

    const landerExists = await checkLanderExists(domain)
    if (!landerExists) {
      console.log(`域名 ${domain} 在 Lander 列表中不存在, 跳过替换操作`)
      return null
    }


    const replacementDomain = await getReplacementDomain(domain)
    if (!replacementDomain) {
      console.log(`无法获取替换域名, 跳过替换操作`)
      return null
    }

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:8001'
    const url = `${baseUrl}/lander-replacement/replace`

    const res = await axios.post(url, {
      domain: domain,
      replacement_domain: replacementDomain,
      workspace_type: "all"
    })

    if (res?.data?.code === 0) {
      const data = res.data.data


      console.log(`域名 ${domain} 替换任务已启动: 影响 ${data.affectedCount} 条 Lander`)
      return data
    } else {
      console.log(`❌ 替换失败: ${res?.data?.message || '未知错误'}`)
      return null
    }
  } catch (err) {
    console.log(`❌ 替换接口调用失败: ${err.message}`)
    return null
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

module.exports = {
  getUrlsFromApi,
  updateDomainStatus,
  replaceDangerousDomain
}
