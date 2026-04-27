/**
 * 全局格式化工具函数
 * 提取自各 View 中重复使用的格式化逻辑
 */

/** 将数字格式化为带万/亿的字符串 */
export const formatNum = (num: number): string => {
  if (!num && num !== 0) return '0'
  if (num >= 100000000) return (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return (num / 10000).toFixed(2) + '万'
  return num.toString()
}

/** 将秒数格式化为 mm:ss */
export const formatMsTime = (sec: number): string => {
  if (!sec) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 将秒数格式化为小时（保留1位小数） */
export const formatHours = (sec: number): string => (sec / 3600).toFixed(1)

/** 将时间戳格式化为日期时间字符串 */
export const formatDate = (ts: number): string => {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 将秒数格式化为 m:ss 显示 */
export const formatTime = (seconds: number): string => {
  if (isNaN(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
