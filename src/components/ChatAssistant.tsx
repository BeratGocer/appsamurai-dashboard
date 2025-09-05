import React from 'react'
import { MessageSquare, Send } from 'lucide-react'

interface ChatAssistantProps {
  onNavigateToOverview?: () => void
  onSelectGame?: (game: string) => void
  onFocusPublisher?: (publisher: string) => void
  getTodayContext?: () => any
}

export default function ChatAssistant({ onNavigateToOverview, onSelectGame, onFocusPublisher }: ChatAssistantProps) {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [history, setHistory] = React.useState<Array<{ role: 'user' | 'assistant'; text: string }>>([])

  const parseIntent = (text: string) => {
    const lower = text.toLowerCase()
    const gameMatch = lower.match(/([a-z0-9\s]+) bugün|([a-z0-9\s]+) dünkü|([a-z0-9\s]+) performans/i)
    const extracted = gameMatch?.[1]?.trim() || gameMatch?.[2]?.trim() || gameMatch?.[3]?.trim() || ''
    const cleanedGame = extracted ? extracted.replace(/bugün|dünkü|performans|nasıl|gösterdi/g, '').trim() : ''
    const publisherMatch = text.match(/([A-Z]{3}_|TBSDK|SFT_|SDA_)/)
    return { game: cleanedGame || undefined, publisher: publisherMatch?.[1] }
  }

  const handleSend = async () => {
    if (!input.trim() || loading) return
    const userText = input.trim()
    setHistory(h => [...h, { role: 'user', text: userText }])
    setInput('')
    setLoading(true)

    const intent = parseIntent(userText)
    onNavigateToOverview?.()
    if (intent.game) onSelectGame?.(intent.game.replace(/\s+/g, ' ').trim())
    if (intent.publisher) onFocusPublisher?.(intent.publisher)

    try {
      // Simple local response for frontend-only mode
      const reply = `Merhaba! "${userText}" mesajınızı aldım. Şu anda frontend-only modda çalışıyoruz.`
      setHistory(h => [...h, { role: 'assistant', text: reply }])
    } catch (e) {
      setHistory(h => [...h, { role: 'assistant', text: 'Üzgünüm, şu an cevap oluşturulamadı.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!open && (
        <button
          className="rounded-full w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
          onClick={() => setOpen(true)}
          title="Yardımcı"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}
      {open && (
        <div className="w-[340px] h-[480px] bg-card border rounded-xl shadow-xl flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <div className="font-semibold">Yardımcı</div>
            <button className="text-sm opacity-70 hover:opacity-100" onClick={() => setOpen(false)}>Kapat</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {history.length === 0 && (
              <div className="text-sm text-muted-foreground">Örnek: "Crayzlabs bugün nasıl performans gösterdi?"</div>
            )}
            {history.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-3 py-2 rounded-lg text-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-muted-foreground">Yazılıyor...</div>
            )}
          </div>
          <div className="p-3 border-t flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Mesaj yazın..."
              className="flex-1 px-3 py-2 border rounded-md bg-background"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50"
              title="Gönder"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}


