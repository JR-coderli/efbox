
function addDayToDay(date, days) {
  date.setDate(date.getDate() + days)
  

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}



function addDaysToDateStr(dateStr, days) {
  const [datePart, timePart] = dateStr.split(' ')
  const [y, m, d] = datePart.split('-').map(Number)
  let date = new Date(y, m - 1, d) // 只用于计算日期，不用于显示

  date.setDate(date.getDate() + days)

  const newY = date.getFullYear()
  const newM = String(date.getMonth() + 1).padStart(2, "0")
  const newD = String(date.getDate()).padStart(2, "0")





  return `${newY}-${newM}-${newD}`
}

module.exports = {
  addDayToDay,
  addDaysToDateStr
}