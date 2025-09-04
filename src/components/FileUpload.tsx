import { useCallback, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, X, CheckCircle, AlertCircle, User, Building } from "lucide-react"
import { parseCSV } from '@/utils/csvParser'
import type { UploadedFile } from '@/types'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiInitFile, apiIngestCsv, apiDeleteFile } from '@/utils/api'

interface FileUploadProps {
  onFileUpload: (file: UploadedFile) => void;
  uploadedFiles: UploadedFile[];
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  activeFileId: string | null;
  onFileReplace?: (fileId: string, updated: { name: string; size: number; data: UploadedFile['data'] }) => void;
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
  availableCustomers,
  availableManagers,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [accountManager, setAccountManager] = useState('');
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

    // Customer name and account manager are now optional
    // No validation required

    setUploading(true);
    setUploadProgress(0);
    setError(null);

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

      // Initialize file on backend
      const { fileId } = await apiInitFile({
        name: file.name,
        size: file.size,
        customerName: customerName.trim() || undefined,
        accountManager: accountManager.trim() || undefined
      });

      // Upload CSV data to backend in chunks to avoid 413
      const headerEnd = text.indexOf('\n');
      const header = headerEnd >= 0 ? text.slice(0, headerEnd) : '';
      const body = headerEnd >= 0 ? text.slice(headerEnd + 1) : text;
      const chunkSize = 150_000; // Reduced to ~150KB chunks for better reliability
      let offset = 0;
      let first = true;
      let totalChunks = 0;
      let successfulChunks = 0;
      
      while (offset < body.length) {
        const next = Math.min(offset + chunkSize, body.length);
        // slice on newline boundary to avoid splitting rows
        let chunk = body.slice(offset, next);
        const lastNewline = chunk.lastIndexOf('\n');
        if (lastNewline !== -1 && next < body.length) {
          chunk = chunk.slice(0, lastNewline);
          offset += lastNewline + 1;
        } else {
          offset = next;
        }
        
        if (chunk.trim()) { // Only send non-empty chunks
          const payload = header ? `${header}\n${chunk}` : chunk;
          try {
            await apiIngestCsv(fileId, payload, { append: !first });
            successfulChunks++;
            totalChunks++;
          } catch (error) {
            console.error(`Chunk ${totalChunks + 1} failed:`, error);
            // Continue with next chunk instead of failing completely
            totalChunks++;
          }
          first = false;
          // advance progress superficially
          setUploadProgress(p => Math.min(90, p + (90 / Math.ceil(body.length / chunkSize))));
        }
      }

      if (successfulChunks === 0) {
        throw new Error('No chunks were successfully uploaded');
      }

      // Client-side CSV parsing for immediate display
      const data = parseCSV(text);
      if (data.length === 0) throw new Error('CSV file appears to be empty or invalid');

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

      setUploadProgress(100);
      setTimeout(() => {
        onFileUpload(uploadedFile);
        setUploading(false);
        setUploadProgress(0);
        setCustomerName('');
        setAccountManager('');
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      setUploading(false);
      setUploadProgress(0);
    }
  }, [onFileUpload, customerName, accountManager]);

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
                      onClick={async () => {
                        try {
                          // Delete from backend
                          await apiDeleteFile(file.id);
                          // Delete from frontend
                          onFileDelete(file.id);
                        } catch (error) {
                          console.error('Failed to delete file:', error);
                          // Still delete from frontend even if backend fails
                          onFileDelete(file.id);
                        }
                      }}
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
