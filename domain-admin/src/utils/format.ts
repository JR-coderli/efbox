import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

export function formatUTC(
  utcString: string,
  format: string = 'YYYY-MM-DD HH:mm:ss'
) {
  const resultTime = dayjs.utc(utcString).format(format)
  return resultTime
}

export function formatUTC2(
  utcString: string,
  format: string = 'YYYY-MM-DD HH:mm:ss'
) {
  const resultTime = dayjs.utc(utcString).utcOffset(8).format(format) // utcOffset(8)的作用是在原有时间的基础上增加8个小时
  return resultTime
}
