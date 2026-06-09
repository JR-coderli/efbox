const fetch = global.fetch; // Node 18+ 内置 fetch
const delay = require('./delay'); // 延迟函数


async function checkAccessibleOnce(url) {
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow" });
    console.log(res.url, 'res')
    return res.ok;
  } catch (err) {
    console.log(err.code, url, 'err')
    return false;
  }
}


async function checkAccessible(url, retries = 1, delayMs = 10000) {
  let attempt = 0;
  while (attempt <= retries) {
    const ok = await checkAccessibleOnce(url);
    if (ok) return true;

    if (attempt < retries) {

      await delay(delayMs);
    }
    attempt++;
  }
  return false;
}

module.exports = checkAccessible