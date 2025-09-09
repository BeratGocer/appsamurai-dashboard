import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Dashboard } from './components/Dashboard'
import { FileUpload } from './components/FileUpload'
import { ThemeToggle } from './components/ThemeToggle'
import { ChatProvider } from './contexts/ChatContext'
import GlobalChatAssistant from './components/GlobalChatAssistant'
import type { UploadedFile } from './types'
import { listFiles, getFile, deleteFile } from '@/utils/api'


function App() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [showUploadPage, setShowUploadPage] = useState(false)


  // Backend-first data loading - always sync with backend
  useEffect(() => {
    (async () => {
      try {
        console.log('Loading files from backend...')
        const resp = await listFiles()
        if (resp.files && resp.files.length > 0) {
          const detailed: UploadedFile[] = []
          for (const f of resp.files) {
            try {
              const d = await getFile(f.id)
              const rows = Array.isArray((d as any).data) ? (d as any).data : []
              // Validate rows: require string app field to avoid runtime errors downstream
              const validRows = rows.filter((r: any) => r && typeof r.app === 'string' && r.app.length > 0)
              if (validRows.length === 0) {
                continue
              }
              detailed.push({
                id: d.id,
                name: d.name,
                size: Number(d.size),
                uploadDate: d.upload_date,
                data: validRows as any,
                isActive: false,
                customerName: (d as any).customer_name || undefined,
                accountManager: (d as any).account_manager || undefined,
              })
            } catch (e) {
              // skip broken file
              console.warn('Skipping invalid file from backend', f.id, e)
            }
          }
          if (detailed.length > 0) {
            detailed[0].isActive = true
            setUploadedFiles(detailed)
            setActiveFileId(detailed[0].id)
            // Only cache active file ID for UI state
            localStorage.setItem('appsamurai-active-file-id', detailed[0].id)
          }
        } else {
          // No files in backend, clear local state
          setUploadedFiles([])
          setActiveFileId(null)
          localStorage.removeItem('appsamurai-active-file-id')
        }
      } catch (err) {
        console.error('Backend sync failed:', err)
        // No fallback - backend is required
        setUploadedFiles([])
        setActiveFileId(null)
      }
    })()
  }, [])

  const handleFileUpload = async (file: UploadedFile) => {
    // File is already uploaded to backend in FileUpload component
    // Just update frontend state
    const updatedFiles = uploadedFiles.map(f => ({ ...f, isActive: false }))
    const newFiles = [...updatedFiles, file]
    setUploadedFiles(newFiles)
    setActiveFileId(file.id)
    setShowUploadPage(false) // Return to dashboard after upload
    
    // Save only active file ID to localStorage
    localStorage.setItem('appsamurai-active-file-id', file.id)
  }

  const handleFileSelect = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId)
    if (file) {
      // Deactivate all files first
      const updatedFiles = uploadedFiles.map(f => ({ ...f, isActive: f.id === fileId }))
      setUploadedFiles(updatedFiles)
      setActiveFileId(fileId)
      
      // Save only active file ID to localStorage
      localStorage.setItem('appsamurai-active-file-id', fileId)
    }
  }

  const handleFileDelete = async (fileId: string) => {
    try {
      // First delete from backend (source of truth)
      await deleteFile(fileId)
      console.log('Backend delete successful for file:', fileId)
      
      // Only update frontend after successful backend deletion
      const updatedFiles = uploadedFiles.filter(f => f.id !== fileId)
      setUploadedFiles(updatedFiles)
      
      let newActiveFileId = activeFileId;
      
      if (fileId === activeFileId) {
        if (updatedFiles.length > 0) {
          const newActiveFile = updatedFiles[0]
          newActiveFile.isActive = true
          newActiveFileId = newActiveFile.id;
          setActiveFileId(newActiveFile.id)
        } else {
          newActiveFileId = null;
          setActiveFileId(null)
        }
      }
      
      // Update localStorage after successful backend deletion
      if (newActiveFileId) {
        localStorage.setItem('appsamurai-active-file-id', newActiveFileId)
      } else {
        localStorage.removeItem('appsamurai-active-file-id')
      }

      // Settings are now managed by backend, no localStorage cleanup needed
      
    } catch (backendError) {
      console.error('Backend delete failed:', backendError)
      // Don't update frontend if backend deletion failed
      alert('Dosya silinemedi. Lütfen tekrar deneyin.')
    }
  }

  // Replace existing file's data while preserving settings by keeping the same id
  const handleFileReplace = async (fileId: string, updated: { name: string; size: number; data: UploadedFile['data'] }) => {
    const updatedFiles = uploadedFiles.map(f => {
      if (f.id !== fileId) return f
      return {
        ...f,
        name: updated.name,
        size: updated.size,
        uploadDate: new Date().toISOString(),
        data: updated.data,
      }
    })
    setUploadedFiles(updatedFiles)
    // keep active selection as is
  }

  // Update existing file's data while preserving settings and merging new data
  const handleFileUpdate = async (fileId: string, updated: { name: string; size: number; data: UploadedFile['data'] }) => {
    const updatedFiles = uploadedFiles.map(f => {
      if (f.id !== fileId) return f
      return {
        ...f,
        name: updated.name,
        size: updated.size,
        uploadDate: new Date().toISOString(),
        data: updated.data,
      }
    })
    setUploadedFiles(updatedFiles)
    // keep active selection as is
  }

  const handleShowUpload = () => {
    setShowUploadPage(true)
  }

  // Export all files to JSON
  const handleExportFiles = () => {
    const exportData = {
      files: uploadedFiles,
      activeFileId,
      exportDate: new Date().toISOString(),
      version: '1.0'
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `appsamurai-files-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Import files from JSON
  const handleImportFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string)
        if (importData.files && Array.isArray(importData.files)) {
          setUploadedFiles(importData.files)
          if (importData.activeFileId && importData.files.some((f: UploadedFile) => f.id === importData.activeFileId)) {
            setActiveFileId(importData.activeFileId)
          } else if (importData.files.length > 0) {
            setActiveFileId(importData.files[0].id)
          }
          
          // Save only active file ID to localStorage
          if (importData.activeFileId) {
            localStorage.setItem('appsamurai-active-file-id', importData.activeFileId)
          }
        }
      } catch (error) {
        console.error('Import failed:', error)
        alert('Dosya import edilemedi. Geçerli bir JSON dosyası olduğundan emin olun.')
      }
    }
    reader.readAsText(file)
    
    // Reset input
    event.target.value = ''
  }

  // Show file upload screen if requested
  if (showUploadPage) {
    return (
      <ChatProvider>
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">AppSamurai Dashboard</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowUploadPage(false)}>
                Back to Dashboard
              </Button>
              <ThemeToggle />
            </div>
          </div>
          
          <FileUpload
            onFileUpload={handleFileUpload}
            uploadedFiles={uploadedFiles}
            onFileSelect={handleFileSelect}
            onFileDelete={handleFileDelete}
            activeFileId={activeFileId}
            onFileReplace={handleFileReplace}
            onFileUpdate={handleFileUpdate}
            availableCustomers={Array.from(new Set(uploadedFiles.map(f => f.customerName).filter(Boolean))) as string[]}
            availableManagers={Array.from(new Set(uploadedFiles.map(f => f.accountManager).filter(Boolean))) as string[]}
          />
        </div>
        <GlobalChatAssistant />
      </ChatProvider>
    )
  }

  // Show dashboard as default (homepage)
  return (
    <ChatProvider>
      <Dashboard 
        uploadedFiles={uploadedFiles}
        activeFileId={activeFileId}
        onFileUpload={handleFileUpload}
        onFileSelect={(fileId: string) => {
          handleFileSelect(fileId);
          // Auto-navigate to overview tab when file is selected
          // This will be handled inside Dashboard component
        }}
        onFileDelete={handleFileDelete}
        onFileUpdate={handleFileUpdate}
        onShowUpload={handleShowUpload}
        onExportFiles={handleExportFiles}
        onImportFiles={handleImportFiles}
      />
      <GlobalChatAssistant />
    </ChatProvider>
  )
}

export default App
