export interface CampaignData {
  app: string;
  campaign_network: string;
  adgroup_network: string;
  day: string;
  installs: number;
  // Financial metrics
  ecpi?: number;
  cost?: number;
  all_revenue?: number;
  adjust_cost?: number;
  ad_revenue?: number;
  cohort_ad_revenue?: number;
  gross_profit?: number;
  roas?: number;
  roas_subscription?: number;
  subscrevnt_revenue?: number;
  // ROAS metrics by day
  roas_d0: number;
  roas_d1: number;
  roas_d2: number;
  roas_d3: number;
  roas_d4: number;
  roas_d5: number;
  roas_d6: number;
  roas_d7: number;
  roas_d14: number;
  roas_d21: number;
  roas_d30: number;
  roas_d45: number;
  roas_d60?: number;
  // Retention rates
  retention_rate_d1?: number;
  retention_rate_d2?: number;
  retention_rate_d3?: number;
  retention_rate_d4?: number;
  retention_rate_d5?: number;
  retention_rate_d6?: number;
  retention_rate_d7?: number;
  retention_rate_d12?: number;
  retention_rate_d14?: number;
  retention_rate_d21?: number;
  retention_rate_d30?: number;
  // Game completion events
  gamecomplete_1_events?: number;
  gamecomplete_10_events?: number;
  gamecomplete_25_events?: number;
  gamecomplete_50_events?: number;
  gamecomplete_100_events?: number;
  gamecomplete_150_events?: number;
  gamecomplete_200_events?: number;
  gamecomplete_250_events?: number;
  gamecomplete_300_events?: number;
  gamecomplete_500_events?: number;
}

export interface AppSummary {
  app: string;
  totalInstalls: number;
  avgRoasD7: number;
  avgRoasD30: number;
  lastUpdate: string;
  platforms: string[];
  // Enhanced metrics
  totalCost?: number;
  totalRevenue?: number;
  totalProfit?: number;
  avgEcpi?: number;
  avgRetentionD7?: number;
}

export interface FinancialMetrics {
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
  profitMargin: number;
  avgEcpi: number;
  avgRoas: number;
}

export interface RetentionMetrics {
  d1: number;
  d2: number;
  d3: number;
  d7: number;
  d14: number;
  d30: number;
}

export interface GameCompletionMetrics {
  level1: number;
  level10: number;
  level25: number;
  level50: number;
  level100: number;
  level150: number;
  level200: number;
  level250: number;
  level300: number;
  level500: number;
}

export interface ChartData {
  date: string;
  installs: number;
  roas_d7: number;
  roas_d30: number;
  app: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadDate: string;
  data: CampaignData[];
  isActive: boolean;
  customerName?: string;
  accountManager?: string;
}

export interface Customer {
  id: string;
  name: string;
  games: string[];
  accountManager: string;
  totalInstalls: number;
  avgRoasD7: number;
  avgRoasD30: number;
  lastUpdate: string;
}

export interface AccountManager {
  id: string;
  name: string;
  customers: string[];
  totalInstalls: number;
  avgRoasD7: number;
  avgRoasD30: number;
  lastUpdate: string;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  filters: {
    platforms: string[];
    countries: string[];
    adNetworks: string[];
  };
  columns: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  kpiCards: string[];
  charts: ChartConfig[];
  conditionalFormatting: ConditionalFormatRule[];
  customFormulas: CustomFormula[];
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  dataSource: string;
  xAxis: string;
  yAxis: string;
  filters: Record<string, any>;
}

export interface ConditionalFormatRule {
  id: string;
  column: string;
  condition: 'greater' | 'less' | 'equal' | 'between' | 'contains';
  value1: number | string;
  value2?: number | string;
  backgroundColor: string;
  textColor: string;
}

export interface CustomFormula {
  id: string;
  name: string;
  formula: string;
  targetColumn: string;
  description: string;
}

export interface FileUploadState {
  files: UploadedFile[];
  activeFileId: string | null;
  isUploading: boolean;
  uploadProgress: number;
}

export interface GameCountryPublisherGroup {
  game: string;
  country: string;
  platform: string;
  publisher: string;
  dailyData: Array<{
    date: string;
    installs: number;
    roas_d0: number;
    roas_d7: number;
    roas_d30: number;
    cost: number;
    revenue: number;
  }>;
}

// KPI Configuration Types
export interface KPICardConfig {
  id: string;
  title: string;
  column: string; // Column name from CSV data
  calculationType: 'sum' | 'average' | 'count' | 'min' | 'max';
  format: 'number' | 'percentage' | 'currency' | 'decimal';
  decimalPlaces?: number;
  isVisible: boolean;
  order: number;
  description?: string;
  badge?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface KPISettings {
  fileId: string;
  configs: KPICardConfig[];
  lastUpdated: string;
}

export interface AvailableColumn {
  key: string;
  label: string;
  type: 'number' | 'text' | 'date';
  description?: string;
  sampleValue?: any;
}

export interface KPIValue {
  raw: number;
  formatted: string;
  trend?: 'up' | 'down' | 'neutral';
}

export type KPICalculationType = 'sum' | 'average' | 'count' | 'min' | 'max';
export type KPIFormatType = 'number' | 'percentage' | 'currency' | 'decimal';