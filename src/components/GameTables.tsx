import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ChevronDown, ChevronRight, Eye, EyeOff, Settings, Edit3, RefreshCw } from 'lucide-react';
import type { GameCountryPublisherGroup } from '@/types'
import type { ConditionalFormattingRule } from './SettingsPanel'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GameTablesProps {
  groups: GameCountryPublisherGroup[];
  conditionalRules?: ConditionalFormattingRule[];
  hiddenTables?: Set<string>;
  onTableVisibilityChange?: (tableId: string, isHidden: boolean) => void;
  onBulkHide?: () => void;
  onBulkShow?: () => void;
  visibleColumns?: string[];
  focusPublisher?: string | null;
  dateRange?: { startDate: string; endDate: string } | null;
  // New props for settings and KPI functionality
  showSettings?: boolean;
  onToggleSettings?: () => void;
  kpiEditMode?: boolean;
  onToggleKpiEdit?: () => void;
  // Available columns for dynamic sorting
  availableColumns?: string[];
  // Refresh functionality
  onRefreshData?: () => void;
}

// Type helper for dynamic column-safe access on daily rows
type DailyDataRow = GameCountryPublisherGroup['dailyData'][number] & Record<string, number | string | undefined>;

type SortCriteria = 'volume' | 'roas_d0' | 'roas_d1' | 'roas_d2' | 'roas_d3' | 'roas_d4' | 'roas_d5' | 'roas_d6' | 'roas_d7' | 'roas_d14' | 'roas_d21' | 'roas_d30' | 'roas_d45' | 'roas_d60' | 'cost' | 'revenue' | 'alphabetical';

interface SortableTableItemProps {
  group: GameCountryPublisherGroup;
  isExpanded: boolean;
  onToggle: () => void;
  conditionalRules: ConditionalFormattingRule[];
  isHidden?: boolean;
  onVisibilityChange?: (isHidden: boolean) => void;
  visibleColumns?: string[];
}

interface SortableHeaderItemProps {
  game: string;
  country: string;
  platform: string;
  campaignCount: number;
  totalVolume: number;
  dateRange?: { startDate: string; endDate: string } | null;
  sortCriteria: SortCriteria;
  totalValue: number;
}

function SortableHeaderItem({ game, country, platform, campaignCount, totalVolume, dateRange, sortCriteria, totalValue }: SortableHeaderItemProps) {
  const groupKey = `${game}-${country}-${platform}`;
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
    attributes,
    listeners,
    setActivatorNodeRef,
  } = useSortable({ id: groupKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex-shrink-0 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="bg-muted hover:bg-muted/80 p-4 rounded-lg border mb-4 min-w-[320px] cursor-default transition-colors shadow-sm">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="p-1 rounded hover:bg-muted/70 text-muted-foreground cursor-grab active:cursor-grabbing relative z-10"
            title="Sürükle"
            aria-label="Sürükle"
          >
            <span className="inline-block w-4 h-4 bg-current mask-[url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\"><path fill=\"%23000\" d=\"M9 6h2V4H9v2zm4 0h2V4h-2v2zM9 13h2v-2H9v2zm4 0h2v-2h-2v2zM9 20h2v-2H9v2zm4 0h2v-2h-2v2z\"/></svg>')]" />
          </button>
          <div>
            <h3 className="text-lg font-semibold whitespace-nowrap">
              {game}
            </h3>
            <p className="text-sm text-muted-foreground">
              {(platform && platform !== 'Unknown') ? platform : 'Unknown'} - {country}
            </p>
            <p className="text-xs text-muted-foreground">
              {campaignCount} farklı adnetwork/publisher
            </p>
            <p className="text-xs font-semibold text-blue-600">
              {sortCriteria === 'volume' && `${totalVolume.toLocaleString()} install`}
              {sortCriteria.startsWith('roas_') && `${(totalValue * 100).toFixed(1)}% ROAS D${sortCriteria.replace('roas_', '')}`}
              {sortCriteria === 'cost' && `$${totalValue.toLocaleString()} harcama`}
              {sortCriteria === 'revenue' && `$${totalValue.toLocaleString()} gelir`}
              {sortCriteria === 'alphabetical' && 'Alfabetik sıralama'}
              {dateRange ? ' (seçili tarih aralığı)' : ' (son 7 gün)'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableTableItem({ group, isExpanded, onToggle, conditionalRules, onVisibilityChange, visibleColumns = ['installs', 'roas_d0', 'roas_d7'] }: SortableTableItemProps) {
  const {
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `${group.game}-${group.country}-${group.platform}-${group.publisher}` 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatROAS = (roas: number): string => {
    return `${(roas * 100).toFixed(2)}%`;
  };

  // Get column label for display - shorter labels for compact view
  const getColumnLabel = (column: string): string => {
    const columnLabels: Record<string, string> = {
      installs: 'Install',
      roas_d0: 'D0',
      roas_d1: 'D1',
      roas_d2: 'D2',
      roas_d3: 'D3',
      roas_d4: 'D4',
      roas_d5: 'D5',
      roas_d6: 'D6',
      roas_d7: 'D7',
      roas_d14: 'D14',
      roas_d21: 'D21',
      roas_d30: 'D30',
      roas_d45: 'D45',
      roas_d60: 'D60',
      retention_rate_d1: 'Ret D1',
      retention_rate_d7: 'Ret D7',
      retention_rate_d14: 'Ret D14',
      retention_rate_d30: 'Ret D30',
      ecpi: 'eCPI',
      cost: 'Maliyet',
      all_revenue: 'Gelir',
      adjust_cost: 'Cost',
      ad_revenue: 'Revenue',
      gross_profit: 'Profit',
    };
    return columnLabels[column] || column;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Invalid Date';
    
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    // Shorter date format for compact table
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Conditional formatting function
  const getCellStyle = (value: number, column: string) => {
    if (!conditionalRules || conditionalRules.length === 0) return {};

    const matchingRule = conditionalRules.find(rule => {
      if (rule.column !== column || !rule.isActive) return false;

      const compareValue = value;
      
      switch (rule.operator) {
        case '>':
          return compareValue > rule.value;
        case '>=':
          return compareValue >= rule.value;
        case '<':
          return compareValue < rule.value;
        case '<=':
          return compareValue <= rule.value;
        case '=':
          return Math.abs(compareValue - rule.value) < 0.001;
        default:
          return false;
      }
    });

    if (matchingRule) {
      return {
        color: matchingRule.color,
        backgroundColor: matchingRule.backgroundColor,
        fontWeight: '700',
        borderRadius: '3px',
        padding: '1px 3px',
        display: 'inline-block',
      };
    }

    return {};
  };

  // Calculate summary statistics - Dynamic based on actual data days
  // Dynamic average daily installs - exclude days with 0 installs
  const validInstallDays = group.dailyData.filter(day => day.installs > 0);
  const averageDailyInstalls = validInstallDays.length > 0 
    ? validInstallDays.reduce((sum, day) => sum + day.installs, 0) / validInstallDays.length 
    : 0;
  
  // Dynamic D0 ROAS average - exclude days with 0 ROAS
  const validD0Roas = group.dailyData.filter(day => day.roas_d0 > 0);
  const avgD0Roas = validD0Roas.length > 0 
    ? validD0Roas.reduce((sum, day) => sum + day.roas_d0, 0) / validD0Roas.length 
    : 0;

  // Dynamic D7 ROAS average - exclude days with 0 ROAS
  const validD7Roas = group.dailyData.filter(day => day.roas_d7 > 0);
  const avgD7Roas = validD7Roas.length > 0 
    ? validD7Roas.reduce((sum, day) => sum + day.roas_d7, 0) / validD7Roas.length 
    : 0;

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`${isDragging ? 'opacity-50' : ''} h-full`}
    >
      <Card className="hover:shadow-lg transition-all duration-200 h-full flex flex-col border-2 bg-card/95">
        <CardHeader className="pb-3 cursor-pointer flex-shrink-0" onClick={onToggle}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="min-w-0 flex-1">
                <CardTitle className="card-title-fixed mb-3 truncate">{group.game}</CardTitle>
                <div className="card-content-fixed text-muted-foreground space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block">Ülke:</span>
                      <span className="font-semibold truncate block">{group.country}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Platform:</span>
                      <span className="font-semibold block">{group.platform}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Publisher:</span>
                    <span className="font-semibold truncate block">{group.publisher}</span>
                  </div>
                  
                  {/* Summary stats in collapsed view */}
                  <div className="mt-3 pt-2 border-t space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block">Average D0 ROAS:</span>
                        <span className="font-bold text-blue-600 block">
                          {formatROAS(avgD0Roas)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Average D7 ROAS:</span>
                        <span className="font-bold text-green-600 block">
                          {formatROAS(avgD7Roas)}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground block">Average Daily Install:</span>
                        <span className="font-bold text-purple-600 block">
                          {averageDailyInstalls.toFixed(0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Valid Days:</span>
                        <span className="font-bold block">
                          {validInstallDays.length}/{group.dailyData.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onVisibilityChange?.(true);
                }}
                title="Tabloyu gizle"
              >
                <EyeOff className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {isExpanded && (
          <CardContent className="pt-0 flex-1 flex flex-col">
            <div className="rounded-md border overflow-hidden flex-1">
              <Table className="w-full" style={{ minWidth: `${Math.max(400, (visibleColumns.length + 1) * 90)}px` }}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center table-header-fixed px-2 whitespace-nowrap w-20">Tarih</TableHead>
                    {visibleColumns.map(column => (
                      <TableHead key={column} className="text-center table-header-fixed px-2 whitespace-nowrap min-w-[70px]">
                        {getColumnLabel(column)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.dailyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={visibleColumns.length + 1} className="text-center text-muted-foreground text-sm py-6">
                        Bu grup için veri bulunamadı
                      </TableCell>
                    </TableRow>
                  ) : (
                    group.dailyData.map((dayData, dayIndex) => (
                      <TableRow key={`${group.game}-${group.country}-${group.publisher}-${dayIndex}`} className="hover:bg-muted/30">
                        <TableCell className="font-medium table-cell-fixed text-center py-2 px-2 whitespace-nowrap w-20">
                          {formatDate(dayData.date)}
                        </TableCell>
                        {visibleColumns.map(column => {
                          const value = (dayData as DailyDataRow)[column];
                          let formattedValue = '';
                          
                          // Sütun tipine göre formatla
                          if (column.startsWith('roas_') || column.startsWith('retention_rate_')) {
                            // ROAS ve retention değerleri için yüzde formatı
                            formattedValue = formatROAS(typeof value === 'number' ? value : Number(value ?? 0));
                          } else if (column === 'ecpi' || column === 'cost' || column === 'all_revenue' || 
                                     column === 'adjust_cost' || column === 'ad_revenue' || column === 'gross_profit') {
                            // Para birimi ve eCPI için sayı formatı
                            formattedValue = typeof value === 'number' ? value.toFixed(2) : '0.00';
                          } else if (column === 'installs') {
                            // Install sayısı için binlik ayırıcı
                            formattedValue = typeof value === 'number' ? value.toLocaleString() : '0';
                          } else {
                            // Diğer sayısal değerler için genel format
                            formattedValue = typeof value === 'number' ? value.toLocaleString() : value || '0';
                          }
                          
                          return (
                            <TableCell key={column} className="font-mono table-cell-fixed text-center py-2 px-2 whitespace-nowrap min-w-[70px]">
                              <span 
                                className="transition-all duration-200"
                                style={getCellStyle((typeof value === 'number' ? value : 0) || 0, column)}
                              >
                                {formattedValue}
                              </span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
                </Table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export function GameTables({ 
  groups, 
  conditionalRules = [], 
  hiddenTables = new Set(),
  onTableVisibilityChange,
  onBulkHide,
  onBulkShow,
  visibleColumns = ['installs', 'roas_d0', 'roas_d7'],
  focusPublisher = null,
  dateRange = null,
  // Removed unused: showSettings (rendering handled by parent per rules)
  onToggleSettings,
  kpiEditMode = false,
  onToggleKpiEdit,
  // Removed unused: availableColumns (not used in this component)
  onRefreshData,
}: GameTablesProps) {
  // DnD Sensors for React 19 compatibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // State for expanded tables
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  
  // State for app-country-platform group order
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  
  // State for sorting criteria
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>('volume');

  // Generate dynamic sorting options based on visible columns from settings
  const getSortingOptions = () => {
    const options = [
      { value: 'volume', label: 'Hacim (Install)' },
      { value: 'alphabetical', label: 'Alfabetik' }
    ];

    // Add ROAS options based on visible columns only
    const roasColumns = visibleColumns.filter(col => col.startsWith('roas_'));
    roasColumns.forEach(col => {
      const day = col.replace('roas_', '');
      options.push({
        value: col as SortCriteria,
        label: `ROAS D${day}`
      });
    });

    // Add cost and revenue if visible
    if (visibleColumns.includes('adjust_cost')) {
      options.push({ value: 'cost', label: 'Harcama' });
    }
    if (visibleColumns.includes('ad_revenue')) {
      options.push({ value: 'revenue', label: 'Gelir' });
    }

    return options;
  };
  
  // State for custom sort mode (when user drags & drops)
  const [isCustomSortMode, setIsCustomSortMode] = useState(false);
  
  // State for table order
  const [sortedGroups, setSortedGroups] = useState(() => {
    // Smart sorting: group by platform+country, then by publisher
    const sorted = [...groups].sort((a, b) => {
      // First sort by platform + country
      const aKey = `${a.platform}-${a.country}`;
      const bKey = `${b.platform}-${b.country}`;
      
      if (aKey !== bKey) {
        return aKey.localeCompare(bKey);
      }
      
      // Then by publisher within same platform+country
      return a.publisher.localeCompare(b.publisher);
    });
    
    return sorted;
  });

  // Calculate total volume (installs) for a group - last 7 days or date range
  const calculateGroupVolume = React.useCallback((group: GameCountryPublisherGroup): number => {
    let relevantData = group.dailyData;
    
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      // Use specified date range
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      relevantData = group.dailyData.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= startDate && dayDate <= endDate;
      });
    } else {
      // Use last 7 days if no date range specified
      const sortedData = [...group.dailyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      relevantData = sortedData.slice(-7);
    }
    
    return relevantData.reduce((sum, day) => sum + day.installs, 0);
  }, [dateRange]);

  // Calculate total volume for app+country+platform group - last 7 days only
  const calculateAppCountryPlatformVolume = React.useCallback((groups: GameCountryPublisherGroup[]): number => {
    return groups.reduce((sum, group) => sum + calculateGroupVolume(group), 0);
  }, [calculateGroupVolume]);

  // Calculate average ROAS for a group
  const calculateGroupRoas = React.useCallback((group: GameCountryPublisherGroup, roasType: keyof DailyDataRow): number => {
    let relevantData = group.dailyData;
    
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      relevantData = group.dailyData.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= startDate && dayDate <= endDate;
      });
    } else {
      const sortedData = [...group.dailyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      relevantData = sortedData.slice(-7);
    }
    
    const validRoas = relevantData.filter(day => Number((day as DailyDataRow)[roasType] ?? 0) > 0);
    return validRoas.length > 0
      ? validRoas.reduce((sum, day) => sum + Number((day as DailyDataRow)[roasType] ?? 0), 0) / validRoas.length
      : 0;
  }, [dateRange]);

  // Calculate total cost for a group
  const calculateGroupCost = React.useCallback((group: GameCountryPublisherGroup): number => {
    let relevantData = group.dailyData;
    
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      relevantData = group.dailyData.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= startDate && dayDate <= endDate;
      });
    } else {
      const sortedData = [...group.dailyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      relevantData = sortedData.slice(-7);
    }
    
    return relevantData.reduce((sum, day) => sum + (day.cost || 0), 0);
  }, [dateRange]);

  // Calculate total revenue for a group
  const calculateGroupRevenue = React.useCallback((group: GameCountryPublisherGroup): number => {
    let relevantData = group.dailyData;
    
    if (dateRange && dateRange.startDate && dateRange.endDate) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      relevantData = group.dailyData.filter(day => {
        const dayDate = new Date(day.date);
        return dayDate >= startDate && dayDate <= endDate;
      });
    } else {
      const sortedData = [...group.dailyData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      relevantData = sortedData.slice(-7);
    }
    
    return relevantData.reduce((sum, day) => sum + (day.revenue || 0), 0);
  }, [dateRange]);

  // Calculate group value based on sort criteria
  const calculateGroupValue = React.useCallback((group: GameCountryPublisherGroup, criteria: SortCriteria): number => {
    switch (criteria) {
      case 'volume':
        return calculateGroupVolume(group);
      case 'roas_d0':
      case 'roas_d1':
      case 'roas_d2':
      case 'roas_d3':
      case 'roas_d4':
      case 'roas_d5':
      case 'roas_d6':
      case 'roas_d7':
      case 'roas_d14':
      case 'roas_d21':
      case 'roas_d30':
      case 'roas_d45':
      case 'roas_d60':
        return calculateGroupRoas(group, criteria);
      case 'cost':
        return calculateGroupCost(group);
      case 'revenue':
        return calculateGroupRevenue(group);
      default:
        return 0;
    }
  }, [calculateGroupVolume, calculateGroupRoas, calculateGroupCost, calculateGroupRevenue]);

  // Calculate app+country+platform group value based on sort criteria
  const calculateAppCountryPlatformValue = React.useCallback((groups: GameCountryPublisherGroup[], criteria: SortCriteria): number => {
    switch (criteria) {
      case 'volume':
        return calculateAppCountryPlatformVolume(groups);
      case 'roas_d0':
      case 'roas_d1':
      case 'roas_d2':
      case 'roas_d3':
      case 'roas_d4':
      case 'roas_d5':
      case 'roas_d6':
      case 'roas_d7':
      case 'roas_d14':
      case 'roas_d21':
      case 'roas_d30':
      case 'roas_d45':
      case 'roas_d60':
        return groups.reduce((sum, group) => sum + calculateGroupRoas(group, criteria), 0) / groups.length;
      case 'cost':
        return groups.reduce((sum, group) => sum + calculateGroupCost(group), 0);
      case 'revenue':
        return groups.reduce((sum, group) => sum + calculateGroupRevenue(group), 0);
      default:
        return 0;
    }
  }, [calculateAppCountryPlatformVolume, calculateGroupRoas, calculateGroupCost, calculateGroupRevenue]);

  // Group tables by APP + COUNTRY + PLATFORM (same app, same country, same platform, different adnetworks)
  const appCountryPlatformGroups = React.useMemo(() => {
    const grouped = new Map<string, GameCountryPublisherGroup[]>();
    
    groups.forEach(group => {
      // KEY: APP + COUNTRY + PLATFORM (same group)
      const key = `${group.game}-${group.country}-${group.platform}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(group);
    });
    
    // Sort each group's publishers/adnetworks by selected criteria (highest first)
    // (same app+country+platform, different adnetworks side by side)
    grouped.forEach(groupArray => {
      groupArray.sort((a, b) => {
        if (sortCriteria === 'alphabetical') {
          return a.publisher.localeCompare(b.publisher);
        }
        
        const valueA = calculateGroupValue(a, sortCriteria);
        const valueB = calculateGroupValue(b, sortCriteria);
        return valueB - valueA; // Highest value first
      });
    });
    
    // Convert to array and sort by app -> country -> platform
    const groupEntries = Array.from(grouped.entries()).map(([key, groups]) => {
      const [game, country, platform] = key.split('-');
      return {
        groupKey: key,
        game,
        country, 
        platform,
        groups
      };
    });
    
    // Apply custom order if exists and custom sort mode is active (for drag & drop)
    if (groupOrder.length > 0 && isCustomSortMode) {
      const orderMap = new Map(groupOrder.map((key, index) => [key, index]));
      groupEntries.sort((a, b) => {
        const aOrder = orderMap.get(a.groupKey) ?? 999;
        const bOrder = orderMap.get(b.groupKey) ?? 999;
        if (aOrder !== bOrder) return aOrder - bOrder;
        // Fallback to alphabetical
        if (a.game !== b.game) return a.game.localeCompare(b.game);
        if (a.country !== b.country) return a.country.localeCompare(b.country);
        return a.platform.localeCompare(b.platform);
      });
    } else {
      // Sort by selected criteria (highest first), then by app -> country -> platform
      groupEntries.sort((a, b) => {
        if (sortCriteria === 'alphabetical') {
          if (a.game !== b.game) return a.game.localeCompare(b.game);
          if (a.country !== b.country) return a.country.localeCompare(b.country);
          return a.platform.localeCompare(b.platform);
        }
        
        const valueA = calculateAppCountryPlatformValue(a.groups, sortCriteria);
        const valueB = calculateAppCountryPlatformValue(b.groups, sortCriteria);
        
        // Always sort by value first (highest first)
        if (valueA !== valueB) {
          return valueB - valueA; // Highest value first
        }
        
        // If values are equal, fall back to alphabetical
        if (a.game !== b.game) return a.game.localeCompare(b.game);
        if (a.country !== b.country) return a.country.localeCompare(b.country);
        return a.platform.localeCompare(b.platform);
      });
    }
    
    return groupEntries;
  }, [groups, sortCriteria, isCustomSortMode, groupOrder, calculateAppCountryPlatformValue, calculateGroupValue]);

  // Initialize group order when groups change
  React.useEffect(() => {
    setGroupOrder(prevOrder => {
      const currentKeys = new Set(appCountryPlatformGroups.map(g => g.groupKey));
      const existingOrder = prevOrder.filter(key => currentKeys.has(key));
      const newKeys = appCountryPlatformGroups
        .map(g => g.groupKey)
        .filter(key => !prevOrder.includes(key));
      
      if (newKeys.length > 0 || existingOrder.length !== prevOrder.length) {
        const newOrder = [...existingOrder, ...newKeys];
        console.log('Initializing group order:', newOrder);
        return newOrder;
      }
      return prevOrder;
    });
  }, [appCountryPlatformGroups]);

  // Update sorted groups when groups change - sort by selected criteria
  React.useEffect(() => {
    const sorted = [...groups].sort((a, b) => {
      const aKey = `${a.platform}-${a.country}`;
      const bKey = `${b.platform}-${b.country}`;
      
      if (aKey !== bKey) {
        return aKey.localeCompare(bKey);
      }
      
      // Within same platform+country, sort by selected criteria (highest first)
      if (sortCriteria === 'alphabetical') {
        return a.publisher.localeCompare(b.publisher);
      }
      
      const valueA = calculateGroupValue(a, sortCriteria);
      const valueB = calculateGroupValue(b, sortCriteria);
      return valueB - valueA;
    });
    setSortedGroups(sorted);
  }, [groups, sortCriteria, calculateGroupValue]);

  const toggleTable = (groupId: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedTables(newExpanded);
  };

  // Expand and scroll to the first table matching focusPublisher
  React.useEffect(() => {
    if (!focusPublisher) return
    // Expand matching tables
    const match = sortedGroups.find(g => g.publisher && g.publisher.toLowerCase().includes(focusPublisher.toLowerCase()))
    if (!match) return
    const id = `${match.game}-${match.country}-${match.platform}-${match.publisher}`
    setExpandedTables(prev => new Set(prev).add(id))
    // Scroll into view
    const el = document.getElementById(`table-${id}`)
    if (el && 'scrollIntoView' in el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [focusPublisher, sortedGroups])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log('Drag end:', { activeId: active.id, overId: over?.id });

    if (active.id !== over?.id && over?.id) {
      // Check if it's a group header drag (has 2 dashes: app-country-platform)
      if (typeof active.id === 'string' && (active.id.match(/-/g) || []).length === 2) {
        console.log('Group header drag detected');
        const oldIndex = groupOrder.indexOf(active.id as string);
        const newIndex = groupOrder.indexOf(over.id as string);
        
        console.log('Indices:', { oldIndex, newIndex, groupOrder });
        
        if (oldIndex !== -1 && newIndex !== -1) {
          setGroupOrder((items) => {
            const newOrder = arrayMove(items, oldIndex, newIndex);
            console.log('New group order:', newOrder);
            return newOrder;
          });
          // Activate custom sort mode when user drags & drops
          setIsCustomSortMode(true);
        }
      } else {
        // Handle table item drag (has 3 dashes: game-country-platform-publisher)
        const oldIndex = sortedGroups.findIndex(group => 
          `${group.game}-${group.country}-${group.platform}-${group.publisher}` === active.id
        );
        const newIndex = sortedGroups.findIndex(group => 
          `${group.game}-${group.country}-${group.platform}-${group.publisher}` === over.id
        );

        if (oldIndex !== -1 && newIndex !== -1) {
          setSortedGroups((items) => arrayMove(items, oldIndex, newIndex));
          // Activate custom sort mode when user drags & drops
          setIsCustomSortMode(true);
        }
      }
    }
  };

  const visibleGroups = sortedGroups.filter(group => {
    const groupId = `${group.game}-${group.country}-${group.platform}-${group.publisher}`;
    return !hiddenTables.has(groupId);
  });

  const hiddenCount = sortedGroups.length - visibleGroups.length;

  if (groups.length === 0) {
    return (
      <div className="bg-card p-8 rounded-lg border text-center">
        <p className="text-muted-foreground">Henüz veri yüklenmedi. Lütfen bir CSV dosyası yükleyin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Performans Tabloları</h2>
            <p className="text-muted-foreground">
              ({visibleGroups.length} görünen, {hiddenCount} gizli)
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sıralama:</span>
              <Select value={isCustomSortMode ? 'custom' : sortCriteria} onValueChange={(value: SortCriteria | 'custom') => {
                if (value === 'custom') {
                  // Keep custom sort mode
                  return;
                }
                setSortCriteria(value as SortCriteria);
                setIsCustomSortMode(false);
                setGroupOrder([]); // Reset custom order
              }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSortingOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                  {isCustomSortMode && <SelectItem value="custom">Özel Sıralama</SelectItem>}
                </SelectContent>
              </Select>
              {isCustomSortMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCustomSortMode(false);
                    setGroupOrder([]);
                    setSortCriteria('volume');
                  }}
                  className="text-xs"
                >
                  Sıfırla
                </Button>
              )}
            </div>
            
            {/* Settings and Edit KPI Cards buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshData}
                className="flex items-center gap-2"
                title="Verileri yenile"
              >
                <RefreshCw className="h-4 w-4" />
                Yenile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleSettings}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Ayarlar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleKpiEdit}
                className="flex items-center gap-2"
              >
                <Edit3 className="h-4 w-4" />
                {kpiEditMode ? 'Exit Edit Mode' : 'Edit KPI Cards'}
              </Button>
            </div>
            {hiddenCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkShow}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Tümünü Göster ({hiddenCount})
              </Button>
            )}
            {visibleGroups.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBulkHide}
                className="flex items-center gap-2"
              >
                <EyeOff className="h-4 w-4" />
                Tümünü Gizle
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* App+Country+Platform Headers - Horizontal Scrollable */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-lg font-semibold">App+Ülke+Platform Grupları</h3>
          <p className="text-sm text-muted-foreground">← → Kaydırarak sırayı değiştirebilirsiniz</p>
        </div>
        <div className="overflow-x-auto pb-4 scroll-smooth">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext 
              items={appCountryPlatformGroups.map(g => g.groupKey)}
              strategy={horizontalListSortingStrategy}
            >
              <div className="flex gap-4 min-w-max">
                {appCountryPlatformGroups.map(({ groupKey, game, country, platform, groups: groupTables }) => {
                  const visibleGroupTables = groupTables.filter(group => {
                    const groupId = `${group.game}-${group.country}-${group.platform}-${group.publisher}`;
                    return !hiddenTables.has(groupId);
                  });

                  if (visibleGroupTables.length === 0) return null;

                  const totalVolume = calculateAppCountryPlatformVolume(visibleGroupTables);
                  const totalValue = calculateAppCountryPlatformValue(visibleGroupTables, sortCriteria);
                  
                  return (
                    <SortableHeaderItem
                      key={groupKey}
                      game={game}
                      country={country}
                      platform={platform}
                      campaignCount={visibleGroupTables.length}
                      totalVolume={totalVolume}
                      dateRange={dateRange}
                      sortCriteria={sortCriteria}
                      totalValue={totalValue}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
        
      </div>

      {/* App+Country+Platform Grouped Tables - Horizontal Scrollable */}
      <div className="space-y-8">
        {appCountryPlatformGroups.map(({ groupKey, game, country, platform, groups: groupTables }) => {
          const visibleGroupTables = groupTables.filter(group => {
            const groupId = `${group.game}-${group.country}-${group.platform}-${group.publisher}`;
            return !hiddenTables.has(groupId);
          });

          if (visibleGroupTables.length === 0) return null;

          // Get all different publishers/adnetworks for this app+country+platform
          const adnetworkPublishers = visibleGroupTables.map(g => g.publisher);
          const totalVolume = calculateAppCountryPlatformVolume(visibleGroupTables);

          return (
            <div key={groupKey} className="space-y-4">
              {/* Section Header with scroll indicator */}
              <div className="bg-primary/5 p-4 rounded-lg border-l-4 border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {game}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {(platform && platform !== 'Unknown') ? platform : 'Unknown'} - {country}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {visibleGroupTables.length} farklı adnetwork/publisher: {adnetworkPublishers.join(', ')}
                    </p>
                    <p className="text-sm font-bold text-blue-600">
                      Toplam Hacim: {totalVolume.toLocaleString()} install
                      {dateRange ? ' (seçili tarih aralığı)' : ' (son 7 gün)'}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground bg-background/80 px-3 py-2 rounded-full border">
                    ← → Kaydırarak görüntüle
                  </div>
                </div>
              </div>
              
              {/* Horizontal Scrollable Tables Container */}
              <div className="relative">
                <div className="overflow-x-auto pb-4 scroll-smooth">
                  <div className="flex gap-6 min-w-max min-h-[600px] items-stretch py-2">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={visibleGroupTables.map(group => 
                          `${group.game}-${group.country}-${group.platform}-${group.publisher}`
                        )}
                        strategy={verticalListSortingStrategy}
                      >
                        {visibleGroupTables.map((group) => {
                          const groupId = `${group.game}-${group.country}-${group.platform}-${group.publisher}`;
                          const isExpanded = expandedTables.has(groupId);
                          
                          return (
                            <div id={`table-${groupId}`} key={groupId} className="flex-shrink-0 h-full" style={{ minWidth: `${Math.max(400, (visibleColumns.length + 1) * 90)}px` }}>
                              <SortableTableItem
                                group={group}
                                isExpanded={isExpanded}
                                onToggle={() => toggleTable(groupId)}
                                conditionalRules={conditionalRules}
                                isHidden={hiddenTables.has(groupId)}
                                onVisibilityChange={(isHidden) => onTableVisibilityChange?.(groupId, isHidden)}
                                visibleColumns={visibleColumns}
                              />
                            </div>
                          );
                        })}
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
                
                
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}