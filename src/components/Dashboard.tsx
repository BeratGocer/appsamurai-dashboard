import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { ChevronDown, ChevronRight, Edit3 } from "lucide-react"
import { DynamicKPISection } from './DynamicKPISection'

import { FileUpload } from './FileUpload'
import { FileManager } from './FileManager'
import { Navbar } from './Navbar'
import { getCustomers, getAccountManagers, getGameCountryPublisherGroups, synchronizeGroupDates, generateFileDisplayName, getGamesFromData } from '@/utils/csvParser'


import type { GameCountryPublisherGroup } from '@/types'
import type { CampaignData, UploadedFile } from '@/types'
import { GameTables } from './GameTables'
import SettingsPanel, { type SettingsData } from './SettingsPanel'
import { SettingsInfo } from './SettingsInfo'
import ChatAssistant from './ChatAssistant'


interface DashboardProps {
  uploadedFiles: UploadedFile[];
  activeFileId: string | null;
  onFileUpload: (file: UploadedFile) => void;
  onFileSelect: (fileId: string) => void;
  onFileDelete: (fileId: string) => void;
  onShowUpload: () => void;
  onExportFiles: () => void;
  onImportFiles: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Dashboard({ 
  uploadedFiles, 
  activeFileId, 
  onFileUpload, 
  onFileSelect, 
  onFileDelete, 
  onShowUpload,
  onExportFiles,
  onImportFiles
}: DashboardProps) {
  const [data, setData] = useState<CampaignData[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [currentTab, setCurrentTab] = useState('files');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  // Removed search and filtering state - not needed for dashboard
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  
  // KPI edit mode state
  const [kpiEditMode, setKpiEditMode] = useState(false);
  
  // Settings state with per-file localStorage persistence
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<SettingsData>(() => {
    return {
      dateRange: {
        startDate: '',
        endDate: '',
      },
      conditionalRules: [],
    };
  });

  // Hidden tables state with per-file localStorage persistence
  const [hiddenTables, setHiddenTables] = useState<Set<string>>(new Set());
  const [focusPublisher, setFocusPublisher] = useState<string | null>(null);

  // Get settings key for current file
  const getSettingsKey = () => {
    return activeFileId ? `dashboard-settings-${activeFileId}` : 'dashboard-settings-default';
  };

  // Get hidden tables key for current file
  const getHiddenTablesKey = () => {
    return activeFileId ? `dashboard-hidden-tables-${activeFileId}` : 'dashboard-hidden-tables-default';
  };

  // Load settings for current file
  const loadFileSettings = (fileId: string | null) => {
    const settingsKey = fileId ? `dashboard-settings-${fileId}` : 'dashboard-settings-default';
    const saved = localStorage.getItem(settingsKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // If parsing fails, return default
      }
    }
    return {
      dateRange: {
        startDate: '',
        endDate: '',
      },
      conditionalRules: [],
    };
  };

  // Save settings to localStorage for current file
  const handleSettingsChange = (newSettings: SettingsData) => {
    setSettings(newSettings);
    const settingsKey = getSettingsKey();
    localStorage.setItem(settingsKey, JSON.stringify(newSettings));
  };

  // Hidden tables management
  const handleTableVisibilityChange = (tableId: string, isHidden: boolean) => {
    const newHiddenTables = new Set(hiddenTables);
    if (isHidden) {
      newHiddenTables.add(tableId);
    } else {
      newHiddenTables.delete(tableId);
    }
    setHiddenTables(newHiddenTables);
    
    // Save to localStorage
    const hiddenTablesKey = getHiddenTablesKey();
    localStorage.setItem(hiddenTablesKey, JSON.stringify(Array.from(newHiddenTables)));
  };

  const handleBulkHide = () => {
    const allTableIds = gameGroups.map(group => 
      `${group.game}-${group.country}-${group.platform}-${group.publisher}`
    );
    const newHiddenTables = new Set(allTableIds);
    setHiddenTables(newHiddenTables);
    
    // Save to localStorage
    const hiddenTablesKey = getHiddenTablesKey();
    localStorage.setItem(hiddenTablesKey, JSON.stringify(Array.from(newHiddenTables)));
  };

  const handleBulkShow = () => {
    setHiddenTables(new Set());
    
    // Save to localStorage
    const hiddenTablesKey = getHiddenTablesKey();
    localStorage.setItem(hiddenTablesKey, JSON.stringify([]));
  };



  // Filter data based on date range and selected game
  const filteredData = data.filter((row) => {
    // Date filtering
    if (settings.dateRange.startDate && settings.dateRange.endDate) {
      const rowDate = new Date(row.day);
      const startDate = new Date(settings.dateRange.startDate);
      const endDate = new Date(settings.dateRange.endDate);
      
      if (!(rowDate >= startDate && rowDate <= endDate)) {
        return false;
      }
    }
    
    // Game filtering - if a specific game is selected, only show that game's data
    if (selectedGame) {
      const gameNameFromRow = row.app.replace(' Android', '').replace(' iOS', '').trim();
      return gameNameFromRow === selectedGame;
    }
    
    return true;
  });

  // Get grouped data for game tables with filtered data
  const rawGameGroups = getGameCountryPublisherGroups(filteredData);

  // Apply date synchronization if date range is specified in settings
  const gameGroups = React.useMemo<GameCountryPublisherGroup[]>(() => {
    if (settings.dateRange.startDate && settings.dateRange.endDate) {
      return synchronizeGroupDates(rawGameGroups, settings.dateRange.startDate, settings.dateRange.endDate);
    }
    return synchronizeGroupDates(rawGameGroups); // Synchronize to overall date range
  }, [rawGameGroups, settings.dateRange.startDate, settings.dateRange.endDate]);

  // Toggle functions for accordion
  const toggleFileExpansion = (fileId: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(fileId)) {
      newExpanded.delete(fileId);
    } else {
      newExpanded.add(fileId);
    }
    setExpandedFiles(newExpanded);
  };

  const toggleCustomerExpansion = (customerId: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  const toggleManagerExpansion = (managerId: string) => {
    const newExpanded = new Set(expandedManagers);
    if (newExpanded.has(managerId)) {
      newExpanded.delete(managerId);
    } else {
      newExpanded.add(managerId);
    }
    setExpandedManagers(newExpanded);
  };



  // Navigate to dashboard with specific game filter
  const handleGameSelect = (fileId: string, gameName?: string) => {
    onFileSelect(fileId);
    if (gameName) {
      setSelectedGame(gameName);
    } else {
      setSelectedGame(null);
    }
    setCurrentTab('overview');
  };





  useEffect(() => {
    // Update data when active file changes
    const activeFile = uploadedFiles.find(f => f.id === activeFileId);
    if (activeFile) {
      setData(activeFile.data);
    } else {
      setData([]);
    }
    
    // Load settings for the new active file
    const fileSettings = loadFileSettings(activeFileId);
    setSettings(fileSettings);

    // Load hidden tables for current file
    const hiddenTablesKey = activeFileId ? `dashboard-hidden-tables-${activeFileId}` : 'dashboard-hidden-tables-default';
    const savedHiddenTables = localStorage.getItem(hiddenTablesKey);
    
    if (savedHiddenTables) {
      try {
        const parsed = JSON.parse(savedHiddenTables);
        setHiddenTables(new Set(parsed));
      } catch (error) {
        console.error('Failed to load hidden tables:', error);
        setHiddenTables(new Set());
      }
    } else {
      setHiddenTables(new Set());
    }
  }, [uploadedFiles, activeFileId]);

  // Show upload screen if requested
  if (showUpload) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">AppSamurai Dashboard</h1>
            <div className="flex items-center gap-2">
              {uploadedFiles.length > 0 && (
                <Button variant="outline" onClick={() => setShowUpload(false)}>
                  Back to Dashboard
                </Button>
              )}
            </div>
          </div>
          
          <FileUpload
            onFileUpload={onFileUpload}
            uploadedFiles={uploadedFiles}
            onFileSelect={onFileSelect}
            onFileDelete={onFileDelete}
            activeFileId={activeFileId}
            onFileReplace={undefined}
            availableCustomers={Array.from(new Set(uploadedFiles.map(f => f.customerName).filter(Boolean))) as string[]}
            availableManagers={Array.from(new Set(uploadedFiles.map(f => f.accountManager).filter(Boolean))) as string[]}
          />
        </div>
      </div>
    );
  }

  // Get customers and account managers from all uploaded files
  const customers = getCustomers(uploadedFiles);
  const accountManagers = getAccountManagers(uploadedFiles);

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        onBackToUpload={() => setShowUpload(true)}
        onShowUpload={onShowUpload}
        currentTab={currentTab}
        onTabChange={setCurrentTab}
      />
      
      <div className="container mx-auto p-6 space-y-6">

      {/* Settings Panel - Only show in overview tab */}
      {currentTab === 'overview' && (
        <SettingsPanel
          settings={settings}
          onSettingsChange={handleSettingsChange}
          isOpen={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
          hiddenTables={Array.from(hiddenTables).map(tableId => {
            const parts = tableId.split('-');
            const publisher = parts.slice(3).join('-'); // Handle publishers with hyphens
            return {
              id: tableId,
              game: parts[0],
              country: parts[1],
              platform: parts[2],
              publisher: publisher
            };
          })}
          onTableVisibilityChange={handleTableVisibilityChange}
          availableColumns={data.length > 0 ? Object.keys(data[0]).filter(key => 
            key.startsWith('roas_') || key.startsWith('retention_rate_') || 
            ['installs', 'ecpi', 'adjust_cost', 'ad_revenue', 'gross_profit'].includes(key)
          ) : []}
        />
      )}

      {/* Dynamic KPI Section - Only on overview (Dashboard) tab */}
      {currentTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Key Metrics</h2>
              {activeFileId && (
                <span className="text-sm text-muted-foreground">
                  ({uploadedFiles.find(f => f.id === activeFileId)?.name})
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKpiEditMode(!kpiEditMode)}
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              {kpiEditMode ? 'Exit Edit Mode' : 'Edit KPI Cards'}
            </Button>
          </div>

          <DynamicKPISection
            data={filteredData}
            activeFileId={activeFileId}
            hiddenTables={hiddenTables}
            gameGroups={gameGroups}
            isEditMode={kpiEditMode}
            onEditModeToggle={() => setKpiEditMode(!kpiEditMode)}
          />
        </div>
      )}

      {/* Search and filtering removed as requested */}

      {/* Tab Content */}
      {currentTab === 'files' && (
        <div className="space-y-4">
          <div className="bg-card p-6 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Uploaded Files ({uploadedFiles.length})</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onExportFiles}>
                  Export Files
                </Button>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={onImportFiles}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>Import Files</span>
                  </Button>
                </label>
                <Button onClick={onShowUpload}>
                  Upload New File
                </Button>
              </div>
            </div>
            
            <FileManager
              uploadedFiles={uploadedFiles}
              onFileSelect={onFileSelect}
              onFileDelete={onFileDelete}
              activeFileId={activeFileId}
              onViewGame={(fileId, gameName) => handleGameSelect(fileId, gameName)}
            />
          </div>
        </div>
      )}

      {currentTab === 'overview' && (
        <div className="space-y-6">
          {/* Game Filter Info - Show if a specific game is selected */}
          {selectedGame && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    Viewing Game: {selectedGame}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Dashboard is filtered to show only data for this game
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedGame(null)}
                  className="text-blue-700 dark:text-blue-300 border-blue-300"
                >
                  Show All Games
                </Button>
              </div>
            </div>
          )}
          
          {/* Game Tables */}
          <GameTables 
            groups={gameGroups} 
            conditionalRules={settings.conditionalRules.filter(rule => rule.isActive)}
            hiddenTables={hiddenTables}
            onTableVisibilityChange={handleTableVisibilityChange}
            onBulkHide={handleBulkHide}
            onBulkShow={handleBulkShow}
            visibleColumns={settings.visibleColumns || ['installs', 'roas_d0', 'roas_d7']}
            focusPublisher={focusPublisher}
          />

          {/* Floating Chat Assistant */}
          <ChatAssistant
            onNavigateToOverview={() => setCurrentTab('overview')}
            onSelectGame={(game) => setSelectedGame(game)}
            onFocusPublisher={(publisher) => setFocusPublisher(publisher)}
            getTodayContext={() => {
              const dates = gameGroups.flatMap(g => g.dailyData.map(d => d.date))
              if (dates.length === 0) return null
              const latest = [...dates].sort().at(-1) as string
              const rows = gameGroups.map(g => {
                const d = g.dailyData.find(x => x.date === latest)
                return d ? {
                  game: g.game,
                  country: g.country,
                  platform: g.platform,
                  publisher: g.publisher,
                  date: d.date,
                  installs: d.installs,
                  roas_d0: d.roas_d0,
                  roas_d7: d.roas_d7,
                  roas_d30: d.roas_d30,
                } : null
              }).filter(Boolean)
              return { date: latest, rows }
            }}
          />
        </div>
      )}

      {currentTab === 'customers' && (
        <div className="space-y-4">
          <div className="grid gap-6">
            <div className="bg-card p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Customer Overview</h3>
                {selectedCustomer && (
                  <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
                    Back to All Customers
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-muted p-4 rounded">
                  <div className="text-2xl font-bold">{customers.length}</div>
                  <div className="text-sm text-muted-foreground">Total Customers</div>
                </div>
                <div className="bg-muted p-4 rounded">
                  <div className="text-2xl font-bold">{customers.reduce((sum, c) => sum + c.totalInstalls, 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Installs</div>
                </div>
                <div className="bg-muted p-4 rounded">
                  <div className="text-2xl font-bold">{((customers.reduce((sum, c) => sum + c.avgRoasD7, 0) / Math.max(customers.length, 1)) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Avg ROAS D7</div>
                </div>
              </div>
            </div>
            
            {!selectedCustomer ? (
              <div className="space-y-2">
                {customers.map((customer) => (
                  <div key={customer.id} className="border rounded-lg bg-card">
                    {/* Accordion Header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
                      onClick={() => toggleCustomerExpansion(customer.id)}
                    >
                      <div className="flex items-center space-x-3">
                        {expandedCustomers.has(customer.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <h4 className="font-semibold">{customer.name}</h4>
                        <span className="text-sm text-muted-foreground">
                          ({customer.games.length} games, {customer.totalInstalls.toLocaleString()} installs)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(customer.id);
                        }}
                      >
                        View Files
                      </Button>
                    </div>
                    
                    {/* Accordion Content */}
                    {expandedCustomers.has(customer.id) && (
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-3">
                          <div className="text-center">
                            <div className="text-lg font-bold">{customer.games.length}</div>
                            <div className="text-sm text-muted-foreground">Games</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{customer.totalInstalls.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Total Installs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{(customer.avgRoasD7 * 100).toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Avg ROAS D7</div>
                    </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{(customer.avgRoasD30 * 100).toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Avg ROAS D30</div>
                    </div>
                    </div>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const customer = customers.find(c => c.id === selectedCustomer);
                  const customerFiles = uploadedFiles.filter(file => 
                    file.customerName?.toLowerCase().replace(/\s+/g, '-') === selectedCustomer
                  );
                  
                  return (
                    <div>
                      <h4 className="text-xl font-semibold mb-4">{customer?.name} - Files ({customerFiles.length})</h4>
                      <div className="space-y-2">
                        {customerFiles.map((file) => {
                          const fileDisplayName = generateFileDisplayName(file.customerName, file.data);
                          const fileGames = getGamesFromData(file.data);
                          
                          return (
                            <div key={file.id} className="border rounded-lg bg-card">
                              {/* File Accordion Header */}
                              <div 
                                className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between ${
                                  file.id === activeFileId ? 'bg-primary/5 border-primary' : ''
                                }`}
                                onClick={() => toggleFileExpansion(file.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  {expandedFiles.has(file.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <div>
                                    <h5 className="font-semibold">{fileDisplayName}</h5>
                                    <span className="text-xs text-muted-foreground">
                                      {file.data.length} records • {fileGames.length} games
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGameSelect(file.id);
                                  }}
                                >
                                  View All
                                </Button>
                              </div>
                              
                              {/* File Accordion Content - Games */}
                              {expandedFiles.has(file.id) && (
                                <div className="px-4 pb-4 border-t bg-muted/20">
                                  <div className="space-y-2 pt-3">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-medium">Games in this file:</span>
                                      <span className="text-xs text-muted-foreground">
                                        Upload: {new Date(file.uploadDate).toLocaleDateString()}
                                        {file.accountManager && ` • Manager: ${file.accountManager}`}
                                      </span>
                                    </div>
                                    
                                    {/* Games List */}
                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                      {fileGames.map((game) => (
                                        <Card key={`${file.id}-${game.name}`} className="bg-card border">
                                          <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex items-center justify-between">
                                              <span className="truncate">{game.name}</span>
                                              <div className="flex gap-1 ml-2">
                                                {game.platforms.map(platform => (
                                                  <span key={platform} className="text-[10px] bg-secondary px-1 rounded">
                                                    {platform}
                                                  </span>
                                                ))}
                                              </div>
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="pt-0">
                                            <div className="grid grid-cols-2 gap-2 items-end">
                                              <div className="text-center">
                                                <div className="text-xl font-semibold text-primary">
                                                  {game.totalInstalls.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Installs</div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-xl font-semibold text-purple-400">
                                                  {(game.avgRoasD7 * 100).toFixed(1)}%
                                                </div>
                                                <div className="text-xs text-muted-foreground">ROAS D7</div>
                                              </div>
                                            </div>
                                            <div className="mt-3 text-center text-xs text-muted-foreground">
                                              {game.dateRange.start} - {game.dateRange.end}
                                            </div>
                                          </CardContent>
                                          <CardFooter>
                                            <Button size="sm" className="w-full" onClick={() => handleGameSelect(file.id, game.name)}>
                                              View Game
                                            </Button>
                                          </CardFooter>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {currentTab === 'account-managers' && (
        <div className="space-y-4">
          <div className="grid gap-6">
            <div className="bg-card p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Account Manager Overview</h3>
                {selectedManager && (
                  <Button variant="outline" onClick={() => setSelectedManager(null)}>
                    Back to All Managers
                  </Button>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-muted p-4 rounded">
                  <div className="text-2xl font-bold">{accountManagers.length}</div>
                  <div className="text-sm text-muted-foreground">Total Account Managers</div>
                </div>
                <div className="bg-muted p-4 rounded">
                  <div className="text-2xl font-bold">{accountManagers.reduce((sum, am) => sum + am.totalInstalls, 0).toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Total Installs</div>
                </div>
                <div className="bg-muted p-4 rounded">
                  <div className="text-2xl font-bold">{((accountManagers.reduce((sum, am) => sum + am.avgRoasD7, 0) / Math.max(accountManagers.length, 1)) * 100).toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Avg ROAS D7</div>
                </div>
              </div>
            </div>
            
            {!selectedManager ? (
              <div className="space-y-2">
                {accountManagers.map((manager) => (
                  <div key={manager.id} className="border rounded-lg bg-card">
                    {/* Accordion Header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between"
                      onClick={() => toggleManagerExpansion(manager.id)}
                    >
                      <div className="flex items-center space-x-3">
                        {expandedManagers.has(manager.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <h4 className="font-semibold">{manager.name}</h4>
                        <span className="text-sm text-muted-foreground">
                          ({manager.customers.length} customers, {manager.totalInstalls.toLocaleString()} installs)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedManager(manager.id);
                        }}
                      >
                        View Files
                      </Button>
                    </div>
                    
                    {/* Accordion Content */}
                    {expandedManagers.has(manager.id) && (
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 pt-3">
                          <div className="text-center">
                            <div className="text-lg font-bold">{manager.customers.length}</div>
                            <div className="text-sm text-muted-foreground">Customers</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{manager.totalInstalls.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">Total Installs</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{(manager.avgRoasD7 * 100).toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Avg ROAS D7</div>
                    </div>
                          <div className="text-center">
                            <div className="text-lg font-bold">{(manager.avgRoasD30 * 100).toFixed(1)}%</div>
                            <div className="text-sm text-muted-foreground">Avg ROAS D30</div>
                    </div>
                    </div>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const manager = accountManagers.find(m => m.id === selectedManager);
                  const managerFiles = uploadedFiles.filter(file => 
                    file.accountManager?.toLowerCase().replace(/\s+/g, '-') === selectedManager
                  );
                  
                  return (
                    <div>
                      <h4 className="text-xl font-semibold mb-4">{manager?.name} - Files ({managerFiles.length})</h4>
                      <div className="space-y-2">
                        {managerFiles.map((file) => {
                          const fileDisplayName = generateFileDisplayName(file.customerName, file.data);
                          const fileGames = getGamesFromData(file.data);
                          
                          return (
                            <div key={file.id} className="border rounded-lg bg-card">
                              {/* File Accordion Header */}
                              <div 
                                className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between ${
                                  file.id === activeFileId ? 'bg-primary/5 border-primary' : ''
                                }`}
                                onClick={() => toggleFileExpansion(file.id)}
                              >
                                <div className="flex items-center space-x-3">
                                  {expandedFiles.has(file.id) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                  <div>
                                    <h5 className="font-semibold">{fileDisplayName}</h5>
                                    <span className="text-xs text-muted-foreground">
                                      {file.data.length} records • {fileGames.length} games
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGameSelect(file.id);
                                  }}
                                >
                                  View All
                                </Button>
                              </div>
                              
                              {/* File Accordion Content - Games */}
                              {expandedFiles.has(file.id) && (
                                <div className="px-4 pb-4 border-t bg-muted/20">
                                  <div className="space-y-2 pt-3">
                                    <div className="flex items-center justify-between mb-3">
                                      <span className="text-sm font-medium">Games in this file:</span>
                                      <span className="text-xs text-muted-foreground">
                                        Upload: {new Date(file.uploadDate).toLocaleDateString()}
                                        {file.customerName && ` • Customer: ${file.customerName}`}
                                      </span>
                                    </div>
                                    
                                    {/* Games List */}
                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                      {fileGames.map((game) => (
                                        <Card key={`${file.id}-${game.name}`} className="bg-card border">
                                          <CardHeader className="pb-2">
                                            <CardTitle className="text-base flex items-center justify-between">
                                              <span className="truncate">{game.name}</span>
                                              <div className="flex gap-1 ml-2">
                                                {game.platforms.map(platform => (
                                                  <span key={platform} className="text-[10px] bg-secondary px-1 rounded">
                                                    {platform}
                                                  </span>
                                                ))}
                                              </div>
                                            </CardTitle>
                                          </CardHeader>
                                          <CardContent className="pt-0">
                                            <div className="grid grid-cols-2 gap-2 items-end">
                                              <div className="text-center">
                                                <div className="text-xl font-semibold text-primary">
                                                  {game.totalInstalls.toLocaleString()}
                                                </div>
                                                <div className="text-xs text-muted-foreground">Installs</div>
                                              </div>
                                              <div className="text-center">
                                                <div className="text-xl font-semibold text-purple-400">
                                                  {(game.avgRoasD7 * 100).toFixed(1)}%
                                                </div>
                                                <div className="text-xs text-muted-foreground">ROAS D7</div>
                                              </div>
                                            </div>
                                            <div className="mt-3 text-center text-xs text-muted-foreground">
                                              {game.dateRange.start} - {game.dateRange.end}
                                            </div>
                                          </CardContent>
                                          <CardFooter>
                                            <Button size="sm" className="w-full" onClick={() => handleGameSelect(file.id, game.name)}>
                                              View Game
                                            </Button>
                                          </CardFooter>
                                        </Card>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}



      </div>
    </div>
  )
}