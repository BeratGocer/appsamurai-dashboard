import { useCallback, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, X, CheckCircle, AlertCircle, User, Building } from "lucide-react"
import { parseCSV, isSameCampaign, mergeCampaignData } from '@/utils/csvParser'
import type { UploadedFile } from '@/types'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  uploadedFiles: UploadedFile[];
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  activeFileId: string | null;
  onFileReplace?: (fileId: string, updated: { name: string; size: number; data: UploadedFile['data'] }) => void;
  onFileUpdate?: (fileId: string, updated: { name: string; size: number; data: UploadedFile['data'] }) => void;
  availableCustomers?: string[];
  availableManagers?: string[];
}

export function FileUpload({ 
  onFileUpload, 
  uploadedFiles, 
  onFileSelect, 
  onFileDelete, 
  activeFileId,
  onFileReplace,
  onFileUpdate,
  availableCustomers,
  availableManagers,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [accountManager, setAccountManager] = useState('');
  const [matchingFile, setMatchingFile] = useState<UploadedFile | null>(null);
  const [showUpdateOptions, setShowUpdateOptions] = useState(false);
  const [newFileData, setNewFileData] = useState<UploadedFile['data'] | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newFileSize, setNewFileSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const replaceTargetIdRef = useRef<string | null>(null);

  // Collect unique existing names if not provided
  const existingCustomers = (availableCustomers && availableCustomers.length > 0)
    ? availableCustomers
    : Array.from(new Set(uploadedFiles.map(f => f.customerName).filter(Boolean))) as string[];
  const existingManagers = (availableManagers && availableManagers.length > 0)
    ? availableManagers
    : Array.from(new Set(uploadedFiles.map(f => f.accountManager).filter(Boolean))) as string[];

  const handleFiles = useCallback(async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    setMatchingFile(null);
    setShowUpdateOptions(false);

    try {
      const text = await file.text();
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Client-side CSV parsing
      const data = parseCSV(text);
      if (data.length === 0) throw new Error('CSV file appears to be empty or invalid');

      // Check if this matches an existing campaign
      const matchingExistingFile = uploadedFiles.find(existingFile => 
        isSameCampaign(existingFile.data, data)
      );

      setUploadProgress(100);
      
      if (matchingExistingFile && onFileUpdate) {
        // Show update options
        setMatchingFile(matchingExistingFile);
        setNewFileData(data);
        setNewFileName(file.name);
        setNewFileSize(file.size);
        setShowUpdateOptions(true);
        setUploading(false);
        setUploadProgress(0);
      } else {
        // Create new file
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const uploadedFile: UploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          uploadDate: new Date().toISOString(),
          data: data,
          isActive: true,
          customerName: customerName.trim() || undefined,
          accountManager: accountManager.trim() || undefined
        };

        setTimeout(() => {
          onFileUpload(uploadedFile);
          setUploading(false);
          setUploadProgress(0);
          setCustomerName('');
          setAccountManager('');
        }, 500);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onFileUpload, onFileUpdate, customerName, accountManager, uploadedFiles]);

  // Replace flow
  const handleReplaceChoose = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = replaceTargetIdRef.current;
    if (!file || !targetId || !onFileReplace) return;
    (async () => {
      try {
        const text = await file.text();
        const data = parseCSV(text);
        if (data.length === 0) throw new Error('CSV file appears to be empty or invalid');
        onFileReplace(targetId, { name: file.name, size: file.size, data });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      } finally {
        // reset input
        if (replaceInputRef.current) replaceInputRef.current.value = '';
        replaceTargetIdRef.current = null;
      }
    })();
  }, [onFileReplace]);

  // Handle update options
  const handleUpdateFile = useCallback(() => {
    if (!matchingFile || !newFileData || !onFileUpdate) return;
    
    const mergedData = mergeCampaignData(matchingFile.data, newFileData);
    
    onFileUpdate(matchingFile.id, {
      name: newFileName,
      size: newFileSize,
      data: mergedData
    });
    
    // Reset state
    setMatchingFile(null);
    setShowUpdateOptions(false);
    setNewFileData(null);
    setNewFileName('');
    setNewFileSize(0);
    setCustomerName('');
    setAccountManager('');
  }, [matchingFile, newFileData, newFileName, newFileSize, onFileUpdate]);

  const handleCreateNewFile = useCallback(() => {
    if (!newFileData) return;
    
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const uploadedFile: UploadedFile = {
      id: fileId,
      name: newFileName,
      size: newFileSize,
      uploadDate: new Date().toISOString(),
      data: newFileData,
      isActive: true,
      customerName: customerName.trim() || undefined,
      accountManager: accountManager.trim() || undefined
    };

    onFileUpload(uploadedFile);
    
    // Reset state
    setMatchingFile(null);
    setShowUpdateOptions(false);
    setNewFileData(null);
    setNewFileName('');
    setNewFileSize(0);
    setCustomerName('');
    setAccountManager('');
  }, [newFileData, newFileName, newFileSize, customerName, accountManager, onFileUpload]);

  const handleCancelUpdate = useCallback(() => {
    setMatchingFile(null);
    setShowUpdateOptions(false);
    setNewFileData(null);
    setNewFileName('');
    setNewFileSize(0);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Customer Information Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Name (Optional)
              </Label>
              {existingCustomers.length > 0 && (
                <Select onValueChange={(v) => setCustomerName(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select existing customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Existing Customers</SelectLabel>
                      {existingCustomers.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              <Input
                id="customerName"
                placeholder="Or type a new customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountManager" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Account Manager (Optional)
              </Label>
              {existingManagers.length > 0 && (
                <Select onValueChange={(v) => setAccountManager(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select existing manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Existing Managers</SelectLabel>
                      {existingManagers.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              <Input
                id="accountManager"
                placeholder="Or type a new manager name"
                value={accountManager}
                onChange={(e) => setAccountManager(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload CSV Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-6 w-6 text-primary animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-medium">Uploading file...</p>
                  <Progress value={uploadProgress} className="mt-2" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium">Drop your CSV files here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <Button variant="outline" onClick={handleButtonClick}>
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="hidden"
                />
                {/* hidden input for replace flow */}
                <input
                  ref={replaceInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleReplaceChoose}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Update Options */}
          {showUpdateOptions && matchingFile && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <div>
                    <strong>Benzer Kampanya Bulundu!</strong>
                    <p className="text-sm text-muted-foreground mt-1">
                      Yüklediğiniz dosya "{matchingFile.name}" dosyasıyla aynı kampanyaya ait görünüyor.
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={handleUpdateFile}
                      className="w-full"
                      variant="default"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mevcut Dosyayı Güncelle (Ayarları Korur)
                    </Button>
                    
                    <Button 
                      onClick={handleCreateNewFile}
                      className="w-full"
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Yeni Dosya Olarak Ekle
                    </Button>
                    
                    <Button 
                      onClick={handleCancelUpdate}
                      className="w-full"
                      variant="ghost"
                    >
                      <X className="h-4 w-4 mr-2" />
                      İptal Et
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <strong>Güncelle:</strong> Yeni verileri mevcut dosyaya ekler, KPI ayarları ve gizli tablolar korunur.<br/>
                    <strong>Yeni Dosya:</strong> Tamamen yeni bir dosya oluşturur.
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Uploaded Files ({uploadedFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    file.id === activeFileId 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>•</span>
                        <span>{file.data.length} records</span>
                        <span>•</span>
                        <span>{new Date(file.uploadDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {file.id === activeFileId && (
                      <Badge variant="default" className="ml-2">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {file.id !== activeFileId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onFileSelect(file.id)}
                      >
                        Select
                      </Button>
                    )}
                    {onFileReplace && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          replaceTargetIdRef.current = file.id;
                          replaceInputRef.current?.click();
                        }}
                      >
                        Replace
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFileDelete(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
