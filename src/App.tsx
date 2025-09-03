import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Dashboard } from './components/Dashboard'
import { FileUpload } from './components/FileUpload'
import { ThemeToggle } from './components/ThemeToggle'
import type { UploadedFile } from './types'
import { apiGetFiles, apiGetGroups } from './utils/api'
import type { CampaignData } from './types'

function App() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [showUploadPage, setShowUploadPage] = useState(false)

  // Load data from backend on startup
  useEffect(() => {
    const loadFilesFromBackend = async () => {
      try {
        const backendFiles = await apiGetFiles();
        console.log('App: Loaded files from backend:', backendFiles);
        
        // Convert backend files to frontend format
        const convertedFiles: UploadedFile[] = await Promise.all(
          backendFiles.map(async (backendFile) => {
            try {
              // Load groups data for each file
              const groups = await apiGetGroups(backendFile.id);
              
              // Convert groups back to campaign data format
              const campaignData: CampaignData[] = groups.flatMap(group => 
                group.dailyData.map(day => ({
                  app: group.game,
                  campaign_network: `${group.platform}_${group.country}`,
                  adgroup_network: group.publisher,
                  day: day.date,
                  installs: day.installs,
                  ecpi: (day as any).ecpi,
                  adjust_cost: (day as any).adjust_cost,
                  ad_revenue: (day as any).ad_revenue,
                  roas_d0: (day as any).roas_d0 || 0,
                  roas_d1: 0,
                  roas_d2: 0,
                  roas_d3: 0,
                  roas_d4: 0,
                  roas_d5: 0,
                  roas_d6: 0,
                  roas_d7: day.roas_d7 || 0,
                  roas_d14: 0,
                  roas_d21: 0,
                  roas_d30: day.roas_d30 || 0,
                  roas_d45: (day as any).roas_d45 || 0,
                }))
              );
              
              return {
                id: backendFile.id,
                name: backendFile.name,
                size: Number(backendFile.size),
                uploadDate: backendFile.uploadedAt,
                data: campaignData,
                isActive: false,
                customerName: backendFile.customerName || undefined,
                accountManager: backendFile.accountManager || undefined
              };
            } catch (error) {
              console.error(`Failed to load groups for file ${backendFile.id}:`, error);
              return {
                id: backendFile.id,
                name: backendFile.name,
                size: Number(backendFile.size),
                uploadDate: backendFile.uploadedAt,
                data: [],
                isActive: false,
                customerName: backendFile.customerName || undefined,
                accountManager: backendFile.accountManager || undefined
              };
            }
          })
        );
        
        // Set all files at once
        console.log('Setting uploaded files:', convertedFiles);
        setUploadedFiles(convertedFiles);
        
        // Set first file as active if available
        if (convertedFiles.length > 0) {
          console.log('Setting active file ID:', convertedFiles[0].id);
          setActiveFileId(convertedFiles[0].id);
        }
        
      } catch (error) {
        console.error('Failed to load files from backend:', error);
        // Fallback to localStorage if backend fails
        const savedFiles = localStorage.getItem('appsamurai-uploaded-files');
        const savedActiveFileId = localStorage.getItem('appsamurai-active-file-id');
        
        if (savedFiles) {
          try {
            const files = JSON.parse(savedFiles) as UploadedFile[];
            setUploadedFiles(files);
            if (savedActiveFileId && files.some((f: UploadedFile) => f.id === savedActiveFileId)) {
              setActiveFileId(savedActiveFileId);
            } else if (files.length > 0) {
              setActiveFileId(files[0].id);
            }
          } catch (error) {
            console.error('Failed to load saved files:', error);
          }
        }
      }
    };
    
    loadFilesFromBackend();
  }, [])

  const handleFileUpload = async (file: UploadedFile) => {
    // Deactivate all other files
    const updatedFiles = uploadedFiles.map(f => ({ ...f, isActive: false }))
    
    // Add new file as active
    const newFiles = [...updatedFiles, file]
    setUploadedFiles(newFiles)
    setActiveFileId(file.id)
    setShowUploadPage(false) // Return to dashboard after upload
    
    // Save to localStorage with full data
    localStorage.setItem('appsamurai-uploaded-files', JSON.stringify(newFiles))
    localStorage.setItem('appsamurai-active-file-id', file.id)
  }

  const handleFileSelect = async (fileId: string) => {
    const file = uploadedFiles.find(f => f.id === fileId)
    if (file) {
      // Deactivate all files first
      const updatedFiles = uploadedFiles.map(f => ({ ...f, isActive: f.id === fileId }))
      setUploadedFiles(updatedFiles)
      setActiveFileId(fileId)
      
      // Save to localStorage with full data
      localStorage.setItem('appsamurai-uploaded-files', JSON.stringify(updatedFiles))
      localStorage.setItem('appsamurai-active-file-id', fileId)
    }
  }

  const handleFileDelete = async (fileId: string) => {
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
    
    // Save to localStorage with full data
    localStorage.setItem('appsamurai-uploaded-files', JSON.stringify(updatedFiles))
    if (newActiveFileId) {
      localStorage.setItem('appsamurai-active-file-id', newActiveFileId)
    } else {
      localStorage.removeItem('appsamurai-active-file-id')
    }

    // Clean up per-file dashboard settings to avoid stale persistence
    localStorage.removeItem(`dashboard-settings-${fileId}`)
    localStorage.removeItem(`dashboard-hidden-tables-${fileId}`)
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
    localStorage.setItem('appsamurai-uploaded-files', JSON.stringify(updatedFiles))
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
          if (importData.activeFileId && importData.files.some((f: any) => f.id === importData.activeFileId)) {
            setActiveFileId(importData.activeFileId)
          } else if (importData.files.length > 0) {
            setActiveFileId(importData.files[0].id)
          }
          
          // Save to localStorage
          localStorage.setItem('appsamurai-uploaded-files', JSON.stringify(importData.files))
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
          availableCustomers={Array.from(new Set(uploadedFiles.map(f => f.customerName).filter(Boolean))) as string[]}
          availableManagers={Array.from(new Set(uploadedFiles.map(f => f.accountManager).filter(Boolean))) as string[]}
        />
      </div>
    )
  }

  // Show dashboard as default (homepage)
  return (
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
      onShowUpload={handleShowUpload}
      onExportFiles={handleExportFiles}
      onImportFiles={handleImportFiles}
    />
  )
}

export default App
