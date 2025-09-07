import type { CampaignData, KPICardConfig, KPIValue, AvailableColumn, GameCountryPublisherGroup } from '@/types';
// import { parseCampaignNetwork } from './csvParser';

// Get available columns from campaign data
export function getAvailableColumns(data: CampaignData[]): AvailableColumn[] {
  if (data.length === 0) return [];
  
  const sampleRow = data[0];
  const columns: AvailableColumn[] = [];
  
  // Get all numeric columns that can be used in KPIs
  Object.entries(sampleRow).forEach(([key, value]) => {
    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)))) {
      columns.push({
        key,
        label: getColumnDisplayName(key),
        type: 'number',
        description: getColumnDescription(key),
        sampleValue: value
      });
    } else if (key === 'day' || key.toLowerCase().includes('date')) {
      columns.push({
        key,
        label: getColumnDisplayName(key),
        type: 'date',
        description: getColumnDescription(key),
        sampleValue: value
      });
    } else if (typeof value === 'string') {
      columns.push({
        key,
        label: getColumnDisplayName(key),
        type: 'text',
        description: getColumnDescription(key),
        sampleValue: value
      });
    }
  });
  
  return columns.sort((a, b) => a.label.localeCompare(b.label));
}

// Get human-readable column names
function getColumnDisplayName(key: string): string {
  const displayNames: Record<string, string> = {
    'installs': 'Installs',
    'roas_d7': 'ROAS D7',
    'roas_d30': 'ROAS D30',
    'roas_d1': 'ROAS D1',
    'roas_d0': 'ROAS D0',
    'roas_d14': 'ROAS D14',
    'roas_d21': 'ROAS D21',
    'roas_d45': 'ROAS D45',
    'adjust_cost': 'Cost',
    'ad_revenue': 'Ad Revenue',
    'gross_profit': 'Gross Profit',
    'ecpi': 'eCPI',
    'retention_rate_d1': 'D1 Retention Rate',
    'retention_rate_d7': 'D7 Retention Rate',
    'retention_rate_d14': 'D14 Retention Rate',
    'retention_rate_d30': 'D30 Retention Rate',
    'app': 'App Name',
    'campaign_network': 'Campaign Network',
    'adgroup_network': 'Ad Group Network',
    'day': 'Date'
  };
  
  return displayNames[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Get column descriptions
function getColumnDescription(key: string): string {
  const descriptions: Record<string, string> = {
    'installs': 'Total number of app installations',
    'roas_d7': '7-day return on ad spend',
    'roas_d30': '30-day return on ad spend',
    'roas_d1': '1-day return on ad spend',
    'adjust_cost': 'Advertising cost tracked by Adjust',
    'ad_revenue': 'Revenue generated from advertisements',
    'gross_profit': 'Gross profit after costs',
    'ecpi': 'Effective cost per install',
    'retention_rate_d1': 'Percentage of users retained after 1 day',
    'retention_rate_d7': 'Percentage of users retained after 7 days'
  };
  
  return descriptions[key] || `Data from ${key} column`;
}

// Calculate KPI value based on configuration, excluding hidden tables
export function calculateKPIValue(
  data: CampaignData[], 
  config: KPICardConfig, 
  hiddenTables?: Set<string>,
  gameGroups?: GameCountryPublisherGroup[],
  selectedGame?: string | null
): KPIValue {
  
  // Filter out data from hidden tables if hiddenTables is provided
  let filteredData = data;
  
  if (hiddenTables && hiddenTables.size > 0 && gameGroups) {
    // Use the gameGroups dailyData directly instead of trying to match with raw data
    const visibleData: CampaignData[] = [];
    
    gameGroups.forEach(group => {
      // If a specific game is selected, only process that game's groups
      if (selectedGame && group.game !== selectedGame) {
        return;
      }
      
      const tableId = `${group.game}-${group.country}-${group.platform}-${group.publisher}`;
      if (!hiddenTables.has(tableId)) {
        // This group is visible, add its data
        visibleData.push(...group.dailyData);
      }
    });
    
    filteredData = visibleData;
  } else if (selectedGame) {
    // If no hidden tables but game is selected, filter raw data
    filteredData = filteredData.filter(row => row.app === selectedGame);
  }
  
  const validData = filteredData.filter(row => {
    const value = row[config.column as keyof CampaignData];
    return value !== undefined && value !== null && !isNaN(Number(value));
  });
  
  if (validData.length === 0) {
    return {
      raw: 0,
      formatted: formatKPIValue(0, config.format, config.decimalPlaces),
      trend: 'neutral'
    };
  }
  
  let rawValue = 0;
  
  switch (config.calculationType) {
    case 'sum':
      rawValue = validData.reduce((sum, row) => {
        const value = row[config.column as keyof CampaignData];
        return sum + Number(value);
      }, 0);
      break;
      
    case 'average':
      const total = validData.reduce((sum, row) => {
        const value = row[config.column as keyof CampaignData];
        return sum + Number(value);
      }, 0);
      rawValue = total / validData.length;
      break;
      
    case 'count':
      rawValue = validData.length;
      break;
      
    case 'min':
      rawValue = Math.min(...validData.map(row => Number(row[config.column as keyof CampaignData])));
      break;
      
    case 'max':
      rawValue = Math.max(...validData.map(row => Number(row[config.column as keyof CampaignData])));
      break;
      
    default:
      rawValue = 0;
  }
  
  // Calculate trend (simple logic - can be enhanced)
  const trend = calculateTrend(rawValue, config.column);
  
  return {
    raw: rawValue,
    formatted: formatKPIValue(rawValue, config.format, config.decimalPlaces),
    trend
  };
}

// Format KPI value based on format type
function formatKPIValue(value: number, format: string, decimalPlaces: number = 2): string {
  if (isNaN(value) || !isFinite(value)) {
    return '0';
  }
  
  switch (format) {
    case 'currency':
      return `$${value.toLocaleString(undefined, {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces
      })}`;
      
    case 'percentage':
      return `${(value * 100).toFixed(decimalPlaces)}%`;
      
    case 'decimal':
      return value.toFixed(decimalPlaces);
      
    case 'number':
    default:
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimalPlaces
      });
  }
}

// Simple trend calculation
function calculateTrend(value: number, column: string): 'up' | 'down' | 'neutral' {
  // This is a simple implementation - in a real scenario you'd want to compare
  // with previous periods or have threshold-based logic
  
  if (column.includes('roas') || column.includes('revenue') || column.includes('profit')) {
    return value > 0.5 ? 'up' : value > 0.2 ? 'neutral' : 'down';
  }
  
  if (column.includes('cost') || column.includes('ecpi')) {
    return value < 2 ? 'up' : value < 5 ? 'neutral' : 'down';
  }
  
  if (column.includes('retention')) {
    return value > 0.3 ? 'up' : value > 0.1 ? 'neutral' : 'down';
  }
  
  return 'neutral';
}

// Get default KPI configurations for a new file
export function getDefaultKPIConfigs(): KPICardConfig[] {
  return [
    {
      id: 'kpi-1',
      title: 'Average Daily Install',
      column: 'installs',
      calculationType: 'average',
      format: 'number',
      decimalPlaces: 0,
      isVisible: true,
      order: 1,
      description: 'Günlük ortalama install sayısı',
      badge: 'Daily Avg'
    },
    {
      id: 'kpi-2',
      title: 'Average Daily D0 ROAS',
      column: 'roas_d0',
      calculationType: 'average',
      format: 'percentage',
      decimalPlaces: 1,
      isVisible: true,
      order: 2,
      description: 'Günlük ortalama D0 ROAS',
      badge: 'D0 ROAS'
    },
    {
      id: 'kpi-3',
      title: 'Last 7 Days Total Cost',
      column: 'adjust_cost',
      calculationType: 'sum',
      format: 'currency',
      decimalPlaces: 0,
      isVisible: true,
      order: 3,
      description: 'Son yedi günün harcama toplamı',
      badge: '7 Days'
    },
    {
      id: 'kpi-4',
      title: 'Average Daily Cost',
      column: 'adjust_cost',
      calculationType: 'average',
      format: 'currency',
      decimalPlaces: 0,
      isVisible: true,
      order: 4,
      description: 'Günlük ortalama harcama',
      badge: 'Daily Avg'
    }
  ];
}

// Save KPI settings to localStorage
export function saveKPISettings(fileId: string, configs: KPICardConfig[]): void {
  const settings = {
    fileId,
    configs,
    lastUpdated: new Date().toISOString()
  };
  
  localStorage.setItem(`kpi-settings-${fileId}`, JSON.stringify(settings));
}

// Load KPI settings from localStorage
export function loadKPISettings(fileId: string): KPICardConfig[] {
  try {
    const saved = localStorage.getItem(`kpi-settings-${fileId}`);
    if (saved) {
      const settings = JSON.parse(saved);
      return settings.configs || getDefaultKPIConfigs();
    }
  } catch (error) {
    console.error('Failed to load KPI settings:', error);
  }
  
  return getDefaultKPIConfigs();
}
