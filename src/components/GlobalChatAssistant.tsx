import { MessageSquare, Send, X, Minimize2, Maximize2 } from 'lucide-react'
import { apiChat } from '@/utils/api'
import { useChat } from '@/contexts/ChatContext'

export default function GlobalChatAssistant() {
  const {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    messages,
    addMessage,
    input,
    setInput,
    loading,
    setLoading,
    onNavigateToOverview,
    onSelectGame,
    onFocusPublisher,
    getTodayContext
  } = useChat()

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
    addMessage({ role: 'user', text: userText })
    setInput('')
    setLoading(true)

    const intent = parseIntent(userText)
    // Only navigate to overview if user asks for specific game data
    if (intent.game) {
      onNavigateToOverview?.()
      onSelectGame?.(intent.game.replace(/\s+/g, ' ').trim())
    }
    if (intent.publisher) onFocusPublisher?.(intent.publisher)

    try {
      const context = getTodayContext?.() || null
      const reply = await apiChat(userText, context)
      addMessage({ role: 'assistant', text: reply })
    } catch (e) {
      addMessage({ role: 'assistant', text: 'Üzgünüm, şu an cevap oluşturulamadı.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Chat Toggle Button - Fixed position */}
      {!isOpen && (
        <button
          className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          onClick={() => setIsOpen(true)}
          title="Yardımcı"
        >
          <MessageSquare className="w-5 h-5" />
        </button>
      )}

      {/* Minimized Chat Panel */}
      {isOpen && isMinimized && (
        <div className="fixed bottom-4 right-4 z-50 bg-card border rounded-lg shadow-xl">
          <div className="p-3 border-b flex items-center justify-between bg-primary/5">
            <div className="font-semibold text-sm">Yardımcı</div>
            <div className="flex items-center gap-1">
              <button 
                className="text-xs opacity-70 hover:opacity-100 p-1 rounded hover:bg-muted"
                onClick={() => setIsMinimized(false)}
                title="Genişlet"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button 
                className="text-xs opacity-70 hover:opacity-100 p-1 rounded hover:bg-muted"
                onClick={() => setIsOpen(false)}
                title="Kapat"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mesaj yazın..."
                className="flex-1 px-2 py-1 border rounded text-xs"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                title="Gönder"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Chat Panel - Takes up the right side of Dashboard */}
      {isOpen && !isMinimized && (
        <div className="fixed top-0 right-0 h-full w-80 md:w-96 bg-card border-l shadow-xl z-50 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between bg-primary/5">
            <div className="font-semibold text-lg">Yardımcı</div>
            <div className="flex items-center gap-1">
              <button 
                className="text-sm opacity-70 hover:opacity-100 p-1 rounded hover:bg-muted relative z-10"
                onClick={() => setIsMinimized(true)}
                title="Küçült"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button 
                className="text-sm opacity-70 hover:opacity-100 p-1 rounded hover:bg-muted"
                onClick={() => setIsOpen(false)}
                title="Kapat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8">
                <div className="mb-2">💬 Merhaba! Size nasıl yardımcı olabilirim?</div>
                <div className="text-xs">
                  Örnek: "Crayzlabs bugün nasıl performans gösterdi?"
                </div>
              </div>
            )}
            {messages.map((message, i) => (
              <div key={i} className={message.role === 'user' ? 'text-right' : 'text-left'}>
                <div className={`inline-block px-3 py-2 rounded-lg text-sm max-w-[80%] ${
                  message.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted'
                }`}>
                  {message.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full"></div>
                Yazılıyor...
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t bg-background">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Mesaj yazın..."
                className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                title="Gönder"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
