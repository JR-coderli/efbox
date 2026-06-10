export const TIMEOUT = 10000

const ENV = import.meta.env.VITE_ENV || 'dev'

export const BASE_URL =
  ENV === 'prod'
    ? import.meta.env.VITE_BASE_URL_PROD || 'https://efbox.work/api'
    : import.meta.env.VITE_BASE_URL_DEV || 'http://localhost:8001'

export const LP_API_URL =
  ENV === 'prod'
    ? import.meta.env.VITE_LP_API_URL_PROD || 'http://8.134.108.134:8001'
    : import.meta.env.VITE_LP_API_URL_DEV || 'http://localhost:8002'

export const WS_CONFIG = {
  url:
    ENV === 'prod'
      ? import.meta.env.VITE_WS_URL_PROD || 'https://efbox.work'
      : import.meta.env.VITE_WS_URL_DEV || 'http://localhost:8001',

  path:
    ENV === 'prod'
      ? import.meta.env.VITE_WS_PATH_PROD || '/api/socket.io'
      : import.meta.env.VITE_WS_PATH_DEV || '/socket.io'
}

