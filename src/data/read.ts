import { createServerFn } from '@tanstack/react-start'
import { isIP } from 'node:net'

function isPrivateIPv4(ip: string) {
  const parts = ip.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false

  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 0) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return false
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.trim().toLowerCase()
  if (!normalized) return true
  if (normalized === 'localhost') return true
  if (normalized.endsWith('.localhost')) return true
  if (normalized.endsWith('.local')) return true

  const ipVersion = isIP(normalized)
  if (ipVersion === 4) return isPrivateIPv4(normalized)
  if (ipVersion === 6) {
    if (normalized === '::' || normalized === '::1') return true
    if (normalized.startsWith('fe80:')) return true // link-local
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true // unique local
  }

  return false
}

function normalizeInputUrl(input: string) {
  const raw = input.trim()
  if (!raw) throw new Error('请输入 URL')

  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw)
    ? raw
    : `https://${raw}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    throw new Error('URL 格式不正确')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('只支持 http/https URL')
  }
  if (url.username || url.password) {
    throw new Error('不支持包含用户名/密码的 URL')
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error('出于安全原因，该地址不被允许')
  }

  return url
}

function buildJinaUrl(url: URL) {
  const href = url.href
  return `https://r.jina.ai/${href}`
}

export const readUrlText = createServerFn({ method: 'POST' })
  .inputValidator((d: string) => d)
  .handler(async ({ data }) => {
    const url = normalizeInputUrl(data)
    const jinaUrl = buildJinaUrl(url)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20_000)

    try {
      const res = await fetch(jinaUrl, {
        signal: controller.signal,
        headers: {
          accept: 'text/plain, text/markdown;q=0.9, */*;q=0.1',
        },
      })

      if (!res.ok) {
        throw new Error(`抓取失败（${res.status}）`)
      }

      const contentLength = Number(res.headers.get('content-length') ?? '0')
      if (contentLength && contentLength > 5_000_000) {
        throw new Error('内容过大，已拒绝返回')
      }

      const raw = await res.text()
      const cleaned = raw.replace(/\r\n/g, '\n').trim()

      const limit = 1_000_000
      const truncated = cleaned.length > limit
      const content = truncated
        ? `${cleaned.slice(0, limit)}\n\n[内容过长，已截断]`
        : cleaned

      return {
        sourceUrl: url.href,
        jinaUrl,
        content,
        truncated,
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('抓取超时，请稍后重试')
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  })

