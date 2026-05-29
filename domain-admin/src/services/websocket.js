/**
 * WebSocket 服务
 * 用于接收后端推送的截图完成等实时事件
 */
import { io } from 'socket.io-client'
import { WS_CONFIG } from './request/config'

let socket = null
const listeners = {
  'screenshot-ready': [],
  'screenshot-failed': []
}

/**
 * 初始化 WebSocket 连接
 */
export function initWebSocket() {
  if (socket) return socket


  socket = io(WS_CONFIG.url, {
    path: WS_CONFIG.path,
    transports: ['websocket', 'polling'],
    reconnection: true,



  })

  socket.on('connect', () => {
    console.log('[WebSocket] 已连接:', socket.id)
  })

  socket.on('disconnect', () => {
    console.log('[WebSocket] 已断开连接')
  })

  socket.on('connect_error', (error) => {
    console.error('[WebSocket] 连接错误:', error.message)
  })


  socket.on('screenshot-ready', (data) => {
    console.log('[WebSocket] 收到截图完成事件:', data)
    listeners['screenshot-ready'].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('[WebSocket] 回调执行失败:', error)
      }
    })
  })


  socket.on('screenshot-failed', (data) => {
    console.log('[WebSocket] 收到截图失败事件:', data)
    listeners['screenshot-failed'].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('[WebSocket] 回调执行失败:', error)
      }
    })
  })

  return socket
}

/**
 * 监听截图完成事件
 * @param {Function} callback - 回调函数
 */
export function onScreenshotReady(callback) {
  if (typeof callback === 'function') {
    listeners['screenshot-ready'].push(callback)
  }
}

/**
 * 监听截图失败事件
 * @param {Function} callback - 回调函数
 */
export function onScreenshotFailed(callback) {
  if (typeof callback === 'function') {
    listeners['screenshot-failed'].push(callback)
  }
}

/**
 * 移除监听器
 * @param {string} event - 事件名称
 * @param {Function} callback - 回调函数
 */
export function offScreenshot(event, callback) {
  if (listeners[event]) {
    const index = listeners[event].indexOf(callback)
    if (index > -1) {
      listeners[event].splice(index, 1)
    }
  }
}

/**
 * 断开 WebSocket 连接
 */
export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * 获取当前 socket 实例
 */
export function getSocket() {
  return socket
}
