



export const TIMEOUT = 10000



























const ENV = 'dev' // 'dev' | 'prod'

export const BASE_URL =
  ENV === 'prod'
    ? 'https://efbox.work/api'
    : 'http://localhost:8001'

export const LP_API_URL =
  ENV == 'prod'
    ? 'http://8.134.108.134:8001'
    : 'http://localhost:8002'

export const WS_CONFIG = {
  url:
    ENV === 'prod'
      ? 'https://efbox.work'
      : 'http://localhost:8001',

  path:
    ENV === 'prod'
      ? '/api/socket.io'
      : '/socket.io'
}

