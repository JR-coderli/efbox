const fetch = global.fetch


async function checkSafeBrowsing(urls) {
  const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${process.env.SAFE_BROWSING_API_KEY}`
  const body = {
    client: { clientId: "your-app", clientVersion: "1.0" },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urls.map(url => ({ url }))
    }
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    return data
  } catch (err) {
    console.error("Safe Browsing API 调用失败:", err)
    return {} 
  }
}

module.exports = checkSafeBrowsing