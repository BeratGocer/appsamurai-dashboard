import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Folder, FileText, Calendar, User, Building, ChevronDown, ChevronRight, Eye, Download, Trash2 } from "lucide-react";
import type { UploadedFile, CampaignData } from '@/types';

interface FileManagerProps {
  uploadedFiles: UploadedFile[];
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  activeFileId: string | null;
}

interface GameSummary {
  name: string;
  platforms: string[];
  totalInstalls: number;
  avgRoasD7: number;
  avgRoasD30: number;
  dateRange: {
    start: string;
    end: string;
  };
}

export function FileManager({ 
  uploadedFiles, 
  onFileSelect, 
  onFileDelete, 
  activeFileId 
}: FileManagerProps) {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Dosya verilerini analiz et ve oyun özetlerini oluştur
  const getGameSummaries = (file: UploadedFile): GameSummary[] => {
    const gameMap = new Map<string, {
      installs: number[];
      roasD7: number[];
      roasD30: number[];
      platforms: Set<string>;
      dates: string[];
    }>();

    file.data.forEach(record => {
      const gameName = record.app.replace(' Android', '').replace(' iOS', '');
      const platform = record.app.includes('Android') ? 'Android' : 'iOS';
      
      if (!gameMap.has(gameName)) {
        gameMap.set(gameName, {
          installs: [],
          roasD7: [],
          roasD30: [],
          platforms: new Set(),
          dates: []
        });
      }

      const game = gameMap.get(gameName)!;
      game.installs.push(record.installs);
      game.roasD7.push(record.roas_d7);
      game.roasD30.push(record.roas_d30);
      game.platforms.add(platform);
      game.dates.push(record.day);
    });

    return Array.from(gameMap.entries()).map(([name, data]) => {
      const totalInstalls = data.installs.reduce((sum, val) => sum + val, 0);
      const avgRoasD7 = data.roasD7.reduce((sum, val) => sum + val, 0) / data.roasD7.length;
      const avgRoasD30 = data.roasD30.reduce((sum, val) => sum + val, 0) / data.roasD30.length;
      
      const sortedDates = data.dates.sort();
      const dateRange = {
        start: sortedDates[0],
        end: sortedDates[sortedDates.length - 1]
      };

      return {
        name,
        platforms: Array.from(data.platforms),
        totalInstalls,
        avgRoasD7,
        avgRoasD30,
        dateRange
      };
    });
  };

  // Dosya adını formatla
  const formatFileName = (file: UploadedFile): string => {
    const gameSummaries = getGameSummaries(file);
    const dateRange = gameSummaries.length > 0 ? gameSummaries[0].dateRange : null;
    
    let fileName = '';
    
    if (file.customerName && file.accountManager) {
      fileName = `${file.customerName} - ${file.accountManager}`;
    } else if (file.customerName) {
      fileName = file.customerName;
    } else if (file.accountManager) {
      fileName = file.accountManager;
    } else {
      fileName = 'Unknown';
    }

    if (dateRange) {
      const startDate = new Date(dateRange.start).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const endDate = new Date(dateRange.end).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      fileName += ` (${startDate} to ${endDate})`;
    }

    return fileName;
  };

  // Dosyayı genişlet/daralt
  const toggleFileExpansion = (fileId: string) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // Tarih formatla
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (uploadedFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Uploaded Files (0)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No files uploaded yet</p>
            <p className="text-sm">Upload CSV files to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="h-5 w-5" />
          Uploaded Files ({uploadedFiles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {uploadedFiles.map((file) => {
            const gameSummaries = getGameSummaries(file);
            const isExpanded = expandedFiles.has(file.id);
            const isActive = file.id === activeFileId;

            return (
              <div key={file.id} className="space-y-3">
                {/* Ana dosya kartı */}
                <Card className={`transition-all duration-200 ${
                  isActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:bg-muted/50'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFileExpansion(file.id)}
                          className="p-1 h-6 w-6"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            {formatFileName(file)}
                          </h3>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {file.customerName && (
                              <div className="flex items-center gap-1">
                                <Building className="h-3 w-3" />
                                <span>{file.customerName}</span>
                              </div>
                            )}
                            {file.accountManager && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{file.accountManager}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(file.uploadDate)}</span>
                            </div>
                            <span>•</span>
                            <span>{file.data.length} records</span>
                            <span>•</span>
                            <span>{gameSummaries.length} games</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Badge variant="default" className="bg-green-600">
                            Active
                          </Badge>
                        )}
                        
                        {!isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onFileSelect(file.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View All
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onFileDelete(file.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Genişletilmiş oyun kartları */}
                {isExpanded && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                    {gameSummaries.map((game, index) => (
                      <Card key={index} className="border-l-4 border-primary">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Oyun başlığı */}
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-base">{game.name}</h4>
                              <div className="flex gap-1">
                                {game.platforms.map(platform => (
                                  <Badge key={platform} variant="secondary" className="text-xs">
                                    {platform}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            {/* Metrikler */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">
                                  {game.totalInstalls.toLocaleString()}
                                </div>
                                <div className="text-xs text-muted-foreground">Installs</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">
                                  {(game.avgRoasD7 * 100).toFixed(1)}%
                                </div>
                                <div className="text-xs text-muted-foreground">ROAS D7</div>
                              </div>
                            </div>

                            {/* Tarih aralığı */}
                            <div className="text-xs text-muted-foreground text-center">
                              {formatDate(game.dateRange.start)} - {formatDate(game.dateRange.end)}
                            </div>

                            {/* View Game butonu */}
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => onFileSelect(file.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Game
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
