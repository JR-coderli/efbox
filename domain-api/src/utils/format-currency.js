// 将金额格式化为货币字符串：正数 -> $100.00，负数 -> -$100.00（避免出现 $-100.00 这样的错误格式）
// 用于发票 docx 模板渲染（模板里已去掉写死的 $ 前缀，由本函数统一带出符号）
function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (isNaN(num)) return ''
  if (num < 0) {
    return `-$${Math.abs(num).toFixed(2)}`
  }
  return `$${num.toFixed(2)}`
}

module.exports = formatCurrency
