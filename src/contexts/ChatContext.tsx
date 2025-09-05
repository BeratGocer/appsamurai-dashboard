import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

interface ChatContextType {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  isMinimized: boolean
  setIsMinimized: (minimized: boolean) => void
  messages: ChatMessage[]
  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  input: string
  setInput: (input: string) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  // Navigation functions
  onNavigateToOverview?: () => void
  onSelectGame?: (game: string) => void
  onFocusPublisher?: (publisher: string) => void
  getTodayContext?: () => any
  setNavigationFunctions: (functions: {
    onNavigateToOverview?: () => void
    onSelectGame?: (game: string) => void
    onFocusPublisher?: (publisher: string) => void
    getTodayContext?: () => any
  }) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [navigationFunctions, setNavigationFunctions] = useState<{
    onNavigateToOverview?: () => void
    onSelectGame?: (game: string) => void
    onFocusPublisher?: (publisher: string) => void
    getTodayContext?: () => any
  }>({})

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message])
  }

  const value: ChatContextType = {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    messages,
    setMessages,
    addMessage,
    input,
    setInput,
    loading,
    setLoading,
    onNavigateToOverview: navigationFunctions.onNavigateToOverview,
    onSelectGame: navigationFunctions.onSelectGame,
    onFocusPublisher: navigationFunctions.onFocusPublisher,
    getTodayContext: navigationFunctions.getTodayContext,
    setNavigationFunctions
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
