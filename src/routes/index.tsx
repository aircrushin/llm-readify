import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useRef, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, Sparkles } from 'lucide-react'

import { readUrlText } from '../data/read'

export const Route = createFileRoute('/')({ component: App })

function App() {
  const [urlInput, setUrlInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{
    sourceUrl: string
    jinaUrl: string
    content: string
    truncated: boolean
  } | null>(null)

  const outputRef = useRef<HTMLTextAreaElement | null>(null)

  const canSubmit = useMemo(() => urlInput.trim().length > 0, [urlInput])

  async function onRead() {
    setError(null)
    setIsLoading(true)
    setResult(null)
    setCopied(false)
    try {
      const data = await readUrlText({ data: urlInput })
      setResult(data)
      queueMicrotask(() => outputRef.current?.focus())
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取失败')
    } finally {
      setIsLoading(false)
    }
  }

  async function onCopy() {
    if (!result?.content) return
    try {
      await navigator.clipboard.writeText(result.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      outputRef.current?.select()
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-linear-to-br from-cyan-500/15 via-teal-500/10 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 -right-20 h-[500px] w-[500px] rounded-full bg-linear-to-tl from-violet-500/10 via-fuchsia-500/5 to-transparent blur-3xl" />
        <div className="absolute left-0 top-1/2 h-[400px] w-[400px] -translate-y-1/2 rounded-full bg-linear-to-r from-emerald-500/5 to-transparent blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-12 md:py-20">
        {/* Header */}
        <header className="mb-10 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-sm text-cyan-300">
            <Sparkles className="h-4 w-4" />
            <span>LLM Readify</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
            网页 → 纯文本
          </h1>
          <p className="mt-3 text-base text-white/50">
            输入 URL，提取纯文本内容，一键复制
          </p>
        </header>

        {/* Main Card */}
        <section className="flex-1">
          <div className="rounded-2xl border border-white/8 bg-white/2 p-6 shadow-2xl shadow-black/30 backdrop-blur-sm">
            {/* Input Area */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  id="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && canSubmit && !isLoading) onRead()
                  }}
                  placeholder="输入网址，例如 example.com/article"
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                  className="glow-focus w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3.5 text-[15px] text-white placeholder:text-white/25 outline-none transition-all focus:border-cyan-500/40"
                />
              </div>

              <button
                onClick={onRead}
                disabled={!canSubmit || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-teal-500 px-6 py-3.5 text-[15px] font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:shadow-cyan-500/30 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>读取中...</span>
                  </>
                ) : (
                  <span>提取文本</span>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {/* Output Area */}
            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-white/60">输出内容</h2>
                <div className="flex items-center gap-2">
                  {result?.sourceUrl && (
                    <a
                      href={result.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>源链接</span>
                    </a>
                  )}
                  <button
                    onClick={onCopy}
                    disabled={!result?.content}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-all disabled:cursor-not-allowed disabled:opacity-30 ${
                      copied
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                        : 'border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>复制</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-xl border border-white/6 bg-black/50">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                      <span className="text-sm text-white/60">正在提取内容...</span>
                    </div>
                  </div>
                )}
                <textarea
                  ref={outputRef}
                  readOnly
                  value={result?.content ?? ''}
                  placeholder="提取的文本内容将显示在这里..."
                  className="custom-scrollbar h-[380px] w-full resize-none bg-transparent px-4 py-4 font-mono text-[13px] leading-relaxed text-white/80 placeholder:text-white/15 outline-none"
                />
              </div>

              {/* Footer info */}
              {result?.sourceUrl ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/40">
                  <span>来源:</span>
                  <span className="max-w-[400px] truncate rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-white/60">
                    {result.sourceUrl}
                  </span>
                  {result.truncated && (
                    <span className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-200">
                      内容已截断
                    </span>
                  )}
                </div>
              ) : (
                <p className="mt-4 text-center text-xs text-white/30">
                  支持直接输入域名，会自动添加 https://
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-10 text-center text-xs text-white/25">
          <p>
            Powered by{' '}
            <a
              href="https://prompt-minder.com"
              target="_blank"
              rel="noreferrer noopener"
              className="text-white/40 underline decoration-white/20 underline-offset-2 hover:text-white/60"
            >
              Prompt Minder
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
