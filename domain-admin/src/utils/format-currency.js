// 将金额格式化为货币字符串：正数 -> $100，负数 -> -$100（避免出现 $-100 这样的错误格式）
function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '$0'
  const num = Number(value)
  if (isNaN(num)) return `$${value}`
  if (num < 0) {
    return `-$${String(value).replace(/^-/, '')}`
  }
  return `$${value}`
}

export default formatCurrency
