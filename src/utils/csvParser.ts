import type { CampaignData, AppSummary, ChartData, FinancialMetrics, RetentionMetrics, GameCompletionMetrics, Customer, AccountManager } from '../types';

// Helper function to parse CSV line with proper quoted field handling
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

export function parseCSV(csvContent: string): CampaignData[] {
  const lines = csvContent.trim().split('\n');
  
  // Clean up first line if it has corrupted header
  let firstLine = lines[0];
  if (firstLine.startsWith('m app,')) {
    firstLine = firstLine.substring(2); // Remove 'm ' prefix
    lines[0] = firstLine;
  } else if (firstLine.startsWith('gönder app,')) {
    firstLine = firstLine.replace('gönder app,', 'app,'); // Fix corrupted header
    lines[0] = firstLine;
  } else if (firstLine.startsWith('gönderapp,')) {
    firstLine = firstLine.replace('gönderapp,', 'app,'); // Fix corrupted header without space
    lines[0] = firstLine;
  }
  
  const headers = parseCSVLine(firstLine);
  
  // Check format type based on headers
  const isDetailedFormat = headers.includes('ecpi') && headers.includes('adjust_cost');
  const isAzulaFormat = headers.includes('all_revenue') && !headers.includes('app');
  const isBusFrenzyFormat = headers.includes('all_revenue') && headers.includes('cost') && headers.includes('roas_d0');
  
  // Create a mapping function to find column indices with flexible matching
  const getColumnIndex = (columnName: string): number => {
    // Direct match first
    let index = headers.indexOf(columnName);
    if (index >= 0) return index;
    
    // Flexible matching for different formats
    if (columnName === 'app') {
      // Try 'm app', 'mobile app', 'app_name', etc.
      const appVariants = ['m app', 'mobile app', 'app_name', 'application'];
      for (const variant of appVariants) {
        index = headers.indexOf(variant);
        if (index >= 0) return index;
      }
    }
    
    return -1;
  };

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    
    if (isAzulaFormat) {
      // Parse Azula ROAS format: campaign_network,adgroup_network,day,installs,adjust_cost,all_revenue,roas,roas_d0,roas_d1,roas_d2,roas_d3,roas_d4,roas_d5,roas_d6,roas_d7
      const rawCampaignNetwork = values[0] || '';
      const rawAdgroupNetwork = values[1] || '';
      
      return {
        app: 'Azula', // Default app name for Azula format
        campaign_network: rawCampaignNetwork,
        adgroup_network: rawAdgroupNetwork,
        day: values[2] || '',
        installs: parseInt(values[3]) || 0,
        adjust_cost: parseFloat(values[4]) || 0,
        ad_revenue: parseFloat(values[5]) || 0, // Map all_revenue to ad_revenue
        roas: parseFloat(values[6]) || 0,
        roas_d0: parseFloat(values[7]) || 0,
        roas_d1: parseFloat(values[8]) || 0,
        roas_d2: parseFloat(values[9]) || 0,
        roas_d3: parseFloat(values[10]) || 0,
        roas_d4: parseFloat(values[11]) || 0,
        roas_d5: parseFloat(values[12]) || 0,
        roas_d6: parseFloat(values[13]) || 0,
        roas_d7: parseFloat(values[14]) || 0,
        // Set default values for missing fields
        roas_d14: 0,
        roas_d21: 0,
        roas_d30: 0,
        roas_d45: 0,
        ecpi: 0,
        cohort_ad_revenue: 0,
        gross_profit: parseFloat(values[5]) || 0, // Use all_revenue as gross_profit approximation
        roas_subscription: 0,
        subscrevnt_revenue: 0,
      };
    } else if (isBusFrenzyFormat) {
      // Parse BusFrenzy format: app,campaign_network,adgroup_network,day,installs,ecpi,cost,all_revenue,roas_d0,roas_d1,roas_d2,roas_d3,roas_d4,roas_d5,roas_d6,roas_d7,roas_d14,roas_d21,roas_d30,roas_d45
      const rawCampaignNetwork = values[1] || '';
      const rawAdgroupNetwork = values[2] || '';
      
      return {
        app: values[0] || '',
        campaign_network: rawCampaignNetwork,
        adgroup_network: rawAdgroupNetwork,
        day: values[3] || '',
        installs: parseInt(values[4]) || 0,
        ecpi: parseFloat(values[5]) || 0,
        adjust_cost: parseFloat(values[6]) || 0, // Map cost to adjust_cost
        ad_revenue: parseFloat(values[7]) || 0, // Map all_revenue to ad_revenue
        roas_d0: parseFloat(values[8]) || 0,
        roas_d1: parseFloat(values[9]) || 0,
        roas_d2: parseFloat(values[10]) || 0,
        roas_d3: parseFloat(values[11]) || 0,
        roas_d4: parseFloat(values[12]) || 0,
        roas_d5: parseFloat(values[13]) || 0,
        roas_d6: parseFloat(values[14]) || 0,
        roas_d7: parseFloat(values[15]) || 0,
        roas_d14: parseFloat(values[16]) || 0,
        roas_d21: parseFloat(values[17]) || 0,
        roas_d30: parseFloat(values[18]) || 0,
        roas_d45: parseFloat(values[19]) || 0,
        // Set default values for missing fields
        roas: parseFloat(values[15]) || 0, // Use roas_d7 as roas
        cohort_ad_revenue: 0,
        gross_profit: parseFloat(values[7]) || 0, // Use all_revenue as gross_profit approximation
        roas_subscription: 0,
        subscrevnt_revenue: 0,
      };
    } else if (isDetailedFormat) {
      // Parse detailed format with all fields
      const rawCampaignNetwork = values[1] || '';
      const rawAdgroupNetwork = values[2] || '';
      
      return {
        app: values[0] || '',
        campaign_network: rawCampaignNetwork,
        adgroup_network: rawAdgroupNetwork,
        day: values[3] || '',
        installs: parseInt(values[4]) || 0,
        // Financial metrics
        ecpi: parseFloat(values[5]) || 0,
        adjust_cost: parseFloat(values[6]) || 0,
        ad_revenue: parseFloat(values[7]) || 0,
        cohort_ad_revenue: parseFloat(values[8]) || 0,
        gross_profit: parseFloat(values[9]) || 0,
        roas: parseFloat(values[10]) || 0,
        roas_subscription: parseFloat(values[11]) || 0,
        subscrevnt_revenue: parseFloat(values[12]) || 0,
        // ROAS metrics by day
        roas_d0: parseFloat(values[13]) || 0,
        roas_d1: parseFloat(values[14]) || 0,
        roas_d2: parseFloat(values[15]) || 0,
        roas_d3: parseFloat(values[16]) || 0,
        roas_d4: parseFloat(values[17]) || 0,
        roas_d5: parseFloat(values[18]) || 0,
        roas_d6: parseFloat(values[19]) || 0,
        roas_d7: parseFloat(values[20]) || 0,
        roas_d14: parseFloat(values[21]) || 0,
        roas_d21: parseFloat(values[22]) || 0,
        roas_d30: parseFloat(values[23]) || 0,
        roas_d45: parseFloat(values[24]) || 0,
        // Retention rates
        retention_rate_d1: parseFloat(values[25]) || 0,
        retention_rate_d2: parseFloat(values[26]) || 0,
        retention_rate_d3: parseFloat(values[27]) || 0,
        retention_rate_d4: parseFloat(values[28]) || 0,
        retention_rate_d5: parseFloat(values[29]) || 0,
        retention_rate_d6: parseFloat(values[30]) || 0,
        retention_rate_d7: parseFloat(values[31]) || 0,
        retention_rate_d12: parseFloat(values[32]) || 0,
        retention_rate_d14: parseFloat(values[33]) || 0,
        retention_rate_d21: parseFloat(values[34]) || 0,
        retention_rate_d30: parseFloat(values[35]) || 0,
        // Game completion events
        gamecomplete_1_events: parseInt(values[36]) || 0,
        gamecomplete_10_events: parseInt(values[37]) || 0,
        gamecomplete_25_events: parseInt(values[38]) || 0,
        gamecomplete_50_events: parseInt(values[39]) || 0,
        gamecomplete_100_events: parseInt(values[40]) || 0,
        gamecomplete_150_events: parseInt(values[41]) || 0,
        gamecomplete_200_events: parseInt(values[42]) || 0,
        gamecomplete_250_events: parseInt(values[43]) || 0,
        gamecomplete_300_events: parseInt(values[44]) || 0,
        gamecomplete_500_events: parseInt(values[45]) || 0,
      };
    } else {
      // Dynamic parsing based on column headers - handles different column orders
      const appIndex = getColumnIndex('app');
      const campaignNetworkIndex = getColumnIndex('campaign_network');
      const adgroupNetworkIndex = getColumnIndex('adgroup_network');
      const dayIndex = getColumnIndex('day');
      const installsIndex = getColumnIndex('installs');
      const roasIndex = getColumnIndex('roas');
      
      // Financial metrics indices (may not exist in all formats)
      const adjustCostIndex = getColumnIndex('adjust_cost');
      const adRevenueIndex = getColumnIndex('ad_revenue');
      const ecpiIndex = getColumnIndex('ecpi');
      const grossProfitIndex = getColumnIndex('gross_profit');
      const cohortAdRevenueIndex = getColumnIndex('cohort_ad_revenue');
      const roasSubscriptionIndex = getColumnIndex('roas_subscription');
      const subscrevntRevenueIndex = getColumnIndex('subscrevnt_revenue');
      
      // ROAS indices
      const roasD0Index = getColumnIndex('roas_d0');
      const roasD1Index = getColumnIndex('roas_d1');
      const roasD2Index = getColumnIndex('roas_d2');
      const roasD3Index = getColumnIndex('roas_d3');
      const roasD4Index = getColumnIndex('roas_d4');
      const roasD5Index = getColumnIndex('roas_d5');
      const roasD6Index = getColumnIndex('roas_d6');
      const roasD7Index = getColumnIndex('roas_d7');
      const roasD14Index = getColumnIndex('roas_d14');
      const roasD21Index = getColumnIndex('roas_d21');
      const roasD30Index = getColumnIndex('roas_d30');
      const roasD45Index = getColumnIndex('roas_d45');
      
      // Retention rate indices
      const retentionD1Index = getColumnIndex('retention_rate_d1');
      const retentionD2Index = getColumnIndex('retention_rate_d2');
      const retentionD3Index = getColumnIndex('retention_rate_d3');
      const retentionD4Index = getColumnIndex('retention_rate_d4');
      const retentionD5Index = getColumnIndex('retention_rate_d5');
      const retentionD6Index = getColumnIndex('retention_rate_d6');
      const retentionD7Index = getColumnIndex('retention_rate_d7');
      const retentionD12Index = getColumnIndex('retention_rate_d12');
      const retentionD14Index = getColumnIndex('retention_rate_d14');
      const retentionD21Index = getColumnIndex('retention_rate_d21');
      const retentionD30Index = getColumnIndex('retention_rate_d30');
      
      const rawCampaignNetwork = campaignNetworkIndex >= 0 ? values[campaignNetworkIndex] || '' : '';
      const rawAdgroupNetwork = adgroupNetworkIndex >= 0 ? values[adgroupNetworkIndex] || '' : '';
      
      return {
        app: appIndex >= 0 ? values[appIndex] || '' : '',
        campaign_network: rawCampaignNetwork,
        adgroup_network: rawAdgroupNetwork,
        day: dayIndex >= 0 ? values[dayIndex] || '' : '',
        installs: installsIndex >= 0 ? parseInt(values[installsIndex]) || 0 : 0,
        roas: roasIndex >= 0 ? parseFloat(values[roasIndex]) || 0 : 0,
        
        // Financial metrics (use undefined if not present so hasDetailedData works correctly)
        adjust_cost: adjustCostIndex >= 0 ? parseFloat(values[adjustCostIndex]) || 0 : undefined,
        ad_revenue: adRevenueIndex >= 0 ? parseFloat(values[adRevenueIndex]) || 0 : undefined,
        ecpi: ecpiIndex >= 0 ? parseFloat(values[ecpiIndex]) || 0 : undefined,
        gross_profit: grossProfitIndex >= 0 ? parseFloat(values[grossProfitIndex]) || 0 : undefined,
        cohort_ad_revenue: cohortAdRevenueIndex >= 0 ? parseFloat(values[cohortAdRevenueIndex]) || 0 : undefined,
        roas_subscription: roasSubscriptionIndex >= 0 ? parseFloat(values[roasSubscriptionIndex]) || 0 : undefined,
        subscrevnt_revenue: subscrevntRevenueIndex >= 0 ? parseFloat(values[subscrevntRevenueIndex]) || 0 : undefined,
        
        // ROAS metrics by day
        roas_d0: roasD0Index >= 0 ? parseFloat(values[roasD0Index]) || 0 : 0,
        roas_d1: roasD1Index >= 0 ? parseFloat(values[roasD1Index]) || 0 : 0,
        roas_d2: roasD2Index >= 0 ? parseFloat(values[roasD2Index]) || 0 : 0,
        roas_d3: roasD3Index >= 0 ? parseFloat(values[roasD3Index]) || 0 : 0,
        roas_d4: roasD4Index >= 0 ? parseFloat(values[roasD4Index]) || 0 : 0,
        roas_d5: roasD5Index >= 0 ? parseFloat(values[roasD5Index]) || 0 : 0,
        roas_d6: roasD6Index >= 0 ? parseFloat(values[roasD6Index]) || 0 : 0,
        roas_d7: roasD7Index >= 0 ? parseFloat(values[roasD7Index]) || 0 : 0,
        roas_d14: roasD14Index >= 0 ? parseFloat(values[roasD14Index]) || 0 : 0,
        roas_d21: roasD21Index >= 0 ? parseFloat(values[roasD21Index]) || 0 : 0,
        roas_d30: roasD30Index >= 0 ? parseFloat(values[roasD30Index]) || 0 : 0,
        roas_d45: roasD45Index >= 0 ? parseFloat(values[roasD45Index]) || 0 : 0,
        
        // Retention rates (use undefined if not present)
        retention_rate_d1: retentionD1Index >= 0 ? parseFloat(values[retentionD1Index]) || 0 : undefined,
        retention_rate_d2: retentionD2Index >= 0 ? parseFloat(values[retentionD2Index]) || 0 : undefined,
        retention_rate_d3: retentionD3Index >= 0 ? parseFloat(values[retentionD3Index]) || 0 : undefined,
        retention_rate_d4: retentionD4Index >= 0 ? parseFloat(values[retentionD4Index]) || 0 : undefined,
        retention_rate_d5: retentionD5Index >= 0 ? parseFloat(values[retentionD5Index]) || 0 : undefined,
        retention_rate_d6: retentionD6Index >= 0 ? parseFloat(values[retentionD6Index]) || 0 : undefined,
        retention_rate_d7: retentionD7Index >= 0 ? parseFloat(values[retentionD7Index]) || 0 : undefined,
        retention_rate_d12: retentionD12Index >= 0 ? parseFloat(values[retentionD12Index]) || 0 : undefined,
        retention_rate_d14: retentionD14Index >= 0 ? parseFloat(values[retentionD14Index]) || 0 : undefined,
        retention_rate_d21: retentionD21Index >= 0 ? parseFloat(values[retentionD21Index]) || 0 : undefined,
        retention_rate_d30: retentionD30Index >= 0 ? parseFloat(values[retentionD30Index]) || 0 : undefined,
        
        // Game completion events (use undefined if not present)
        gamecomplete_1_events: undefined,
        gamecomplete_10_events: undefined,
        gamecomplete_25_events: undefined,
        gamecomplete_50_events: undefined,
        gamecomplete_100_events: undefined,
        gamecomplete_150_events: undefined,
        gamecomplete_200_events: undefined,
        gamecomplete_250_events: undefined,
        gamecomplete_300_events: undefined,
        gamecomplete_500_events: undefined,
      };
    }
  });
}

export function getAppSummaries(data: CampaignData[]): AppSummary[] {
  const appGroups = data.reduce((acc, row) => {
    if (!acc[row.app]) {
      acc[row.app] = [];
    }
    acc[row.app].push(row);
    return acc;
  }, {} as Record<string, CampaignData[]>);

  return Object.entries(appGroups).map(([app, rows]) => {
    const totalInstalls = rows.reduce((sum, row) => sum + row.installs, 0);
    const validRoasD7 = rows.filter(row => row.roas_d7 > 0);
    const validRoasD30 = rows.filter(row => row.roas_d30 > 0);
    
    const avgRoasD7 = validRoasD7.length > 0 
      ? validRoasD7.reduce((sum, row) => sum + row.roas_d7, 0) / validRoasD7.length 
      : 0;
    
    const avgRoasD30 = validRoasD30.length > 0 
      ? validRoasD30.reduce((sum, row) => sum + row.roas_d30, 0) / validRoasD30.length 
      : 0;

    const platforms = [...new Set(rows.map(row => {
      const platform = row.app.toLowerCase().includes('android') ? 'Android' : 
                      row.app.toLowerCase().includes('ios') ? 'iOS' : 'Unknown';
      return platform;
    }))];

    const dates = rows.map(row => new Date(row.day)).filter(date => !isNaN(date.getTime()));
    const lastUpdate = dates.length > 0 
      ? new Date(Math.max(...dates.map(date => date.getTime()))).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    // Enhanced metrics for detailed format
    const validFinancialData = rows.filter(row => row.adjust_cost !== undefined);
    const totalCost = validFinancialData.reduce((sum, row) => sum + (row.adjust_cost || 0), 0);
    const totalRevenue = validFinancialData.reduce((sum, row) => sum + (row.ad_revenue || 0), 0);
    const totalProfit = validFinancialData.reduce((sum, row) => sum + (row.gross_profit || 0), 0);
    const avgEcpi = validFinancialData.length > 0 
      ? validFinancialData.reduce((sum, row) => sum + (row.ecpi || 0), 0) / validFinancialData.length 
      : undefined;

    const validRetentionData = rows.filter(row => row.retention_rate_d7 !== undefined);
    const avgRetentionD7 = validRetentionData.length > 0 
      ? validRetentionData.reduce((sum, row) => sum + (row.retention_rate_d7 || 0), 0) / validRetentionData.length 
      : undefined;

    return {
      app: app.replace(' Android', '').replace(' iOS', ''),
      totalInstalls,
      avgRoasD7,
      avgRoasD30,
      lastUpdate,
      platforms,
      totalCost: validFinancialData.length > 0 ? totalCost : undefined,
      totalRevenue: validFinancialData.length > 0 ? totalRevenue : undefined,
      totalProfit: validFinancialData.length > 0 ? totalProfit : undefined,
      avgEcpi,
      avgRetentionD7,
    };
  });
}

export function getChartData(data: CampaignData[]): ChartData[] {
  return data.map(row => ({
    date: row.day,
    installs: row.installs,
    roas_d7: row.roas_d7,
    roas_d30: row.roas_d30,
    app: row.app.replace(' Android', '').replace(' iOS', ''),
  }));
}

export function getTopPerformingCampaigns(data: CampaignData[], limit = 10): CampaignData[] {
  return data
    .filter(row => row.roas_d7 > 0)
    .sort((a, b) => b.roas_d7 - a.roas_d7)
    .slice(0, limit);
}

export function getTotalMetrics(data: CampaignData[]) {
  const totalInstalls = data.reduce((sum, row) => sum + row.installs, 0);
  const validRoas = data.filter(row => row.roas_d7 > 0);
  const avgRoas = validRoas.length > 0 
    ? validRoas.reduce((sum, row) => sum + row.roas_d7, 0) / validRoas.length 
    : 0;
  
  const apps = [...new Set(data.map(row => row.app.replace(' Android', '').replace(' iOS', '')))];
  
  return {
    totalInstalls,
    avgRoas,
    totalApps: apps.length,
    totalCampaigns: data.length,
  };
}

export function getFinancialMetrics(data: CampaignData[]): FinancialMetrics {
  const validData = data.filter(row => row.adjust_cost !== undefined);
  
  const totalCost = validData.reduce((sum, row) => sum + (row.adjust_cost || 0), 0);
  const totalRevenue = validData.reduce((sum, row) => sum + (row.ad_revenue || 0), 0);
  const totalProfit = validData.reduce((sum, row) => sum + (row.gross_profit || 0), 0);
  const avgEcpi = validData.length > 0 
    ? validData.reduce((sum, row) => sum + (row.ecpi || 0), 0) / validData.length 
    : 0;
  const avgRoas = validData.length > 0 
    ? validData.reduce((sum, row) => sum + (row.roas || 0), 0) / validData.length 
    : 0;
  
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  
  return {
    totalCost,
    totalRevenue,
    totalProfit,
    profitMargin,
    avgEcpi,
    avgRoas,
  };
}

export function getRetentionMetrics(data: CampaignData[]): RetentionMetrics {
  const validData = data.filter(row => row.retention_rate_d1 !== undefined);
  
  if (validData.length === 0) {
    return { d1: 0, d2: 0, d3: 0, d7: 0, d14: 0, d30: 0 };
  }
  
  return {
    d1: validData.reduce((sum, row) => sum + (row.retention_rate_d1 || 0), 0) / validData.length,
    d2: validData.reduce((sum, row) => sum + (row.retention_rate_d2 || 0), 0) / validData.length,
    d3: validData.reduce((sum, row) => sum + (row.retention_rate_d3 || 0), 0) / validData.length,
    d7: validData.reduce((sum, row) => sum + (row.retention_rate_d7 || 0), 0) / validData.length,
    d14: validData.reduce((sum, row) => sum + (row.retention_rate_d14 || 0), 0) / validData.length,
    d30: validData.reduce((sum, row) => sum + (row.retention_rate_d30 || 0), 0) / validData.length,
  };
}

export function getGameCompletionMetrics(data: CampaignData[]): GameCompletionMetrics {
  const validData = data.filter(row => row.gamecomplete_1_events !== undefined);
  
  return {
    level1: validData.reduce((sum, row) => sum + (row.gamecomplete_1_events || 0), 0),
    level10: validData.reduce((sum, row) => sum + (row.gamecomplete_10_events || 0), 0),
    level25: validData.reduce((sum, row) => sum + (row.gamecomplete_25_events || 0), 0),
    level50: validData.reduce((sum, row) => sum + (row.gamecomplete_50_events || 0), 0),
    level100: validData.reduce((sum, row) => sum + (row.gamecomplete_100_events || 0), 0),
    level150: validData.reduce((sum, row) => sum + (row.gamecomplete_150_events || 0), 0),
    level200: validData.reduce((sum, row) => sum + (row.gamecomplete_200_events || 0), 0),
    level250: validData.reduce((sum, row) => sum + (row.gamecomplete_250_events || 0), 0),
    level300: validData.reduce((sum, row) => sum + (row.gamecomplete_300_events || 0), 0),
    level500: validData.reduce((sum, row) => sum + (row.gamecomplete_500_events || 0), 0),
  };
}

// Decode ad network codes from Adnetworkler.csv
export function decodeAdNetwork(code: string): string {
  if (!code) return code;
  
  const cleanCode = code.trim();
  
  // "creative=" ile gelen uzantıları at (ör: ABCcreative=xyz -> ABC)
  if (cleanCode.includes('creative=')) {
    const beforeCreative = cleanCode.split('creative=')[0];
    if (beforeCreative) {
      return decodeAdNetwork(beforeCreative); // Ön kısmı tekrar decode et
    }
  }
  
  // Handle comma-separated codes (e.g., "34631_5406,undefined" -> "34631_5406")
  if (cleanCode.includes(',')) {
    const firstPart = cleanCode.split(',')[0].trim();
    if (firstPart) {
      return decodeAdNetwork(firstPart); // Recursively decode the first part
    }
  }
  
  // Ayet Studios için özel durum - UFVCL ile başlayan tüm kodlar
  if (cleanCode.startsWith('UFVCL')) {
    return 'Ayet Studios';
  }
  
  // Esnek arama fonksiyonu - büyük küçük harf duyarsız
  const findMapping = (mappings: Record<string, string>, searchCode: string): string | null => {
    // Önce tam eşleşme ara (büyük küçük harf duyarsız)
    for (const [key, value] of Object.entries(mappings)) {
      if (key.toLowerCase() === searchCode.toLowerCase()) {
        return value;
      }
    }
    return null;
  };
  
  // S ile başlayan ad network kodları (Adnetworkler.csv'den)
  const sNetworkMappings: Record<string, string> = {
    'SCR': 'Copper',
    'SPE': 'Prime',
    'SFT': 'Fluent',
    'SDA': 'Dynata',
    'SAP': 'Ad it Up',
    'SKK': 'Klink',
    'STK': 'TNK',
    'SEA': 'Eneba',
    'TEST': 'Test',
    'SPL': 'Playwell',
    'SAN': 'AppsPrize',
    'SIE': 'Influence Mobile',
    'SAM': 'ATM',
    'SCE': 'Catbyte',
    'SEZ': 'Efez Games',
    'SJK': 'JumpTask API',
    'SWK': 'AppsPrize',
    'STR': 'TradeDoubler',
    'SBL': 'Buzzvil',
    'SAS': 'Ad for Us',
    'SMN': 'Mode Earn App',
    'SRY': 'Rewardy',
    'STS': 'TapChamps',
    'S2': 'Klink',
    'SAT': 'AppQwest',
    'SER': 'EmberFund',
    'Str': 'TradeDoubler'
  };
  
  // S network kodları için esnek arama
  const sNetworkResult = findMapping(sNetworkMappings, cleanCode);
  if (sNetworkResult) return sNetworkResult;
  
  // Base64 kodları (Adnetworkler.csv'den)
  const base64Mappings: Record<string, string> = {
    'NTG1': 'AppsPrize',
    'NTK2': 'AppsPrize',
    'NJM4': 'AppsPrize',
    'NJU2': 'AppsPrize',
    'NJEy': 'AppsPrize',
    'NTIX': 'AppsPrize',
    'NTK5': 'AppsPrize',
    'NDC2': 'AppsPrize',
    'NJI3': 'AppsPrize',
    'NDG1': 'AppsPrize',
    'MTE5': 'AppsPrize',
    'NJQY': 'AppsPrize',
    'NTI3': 'AppsPrize',
    'NJUZ': 'AppsPrize',
    'MJGX': 'AppsPrize',
    'MTQZ': 'AppsPrize',
    'OTG4': 'AppsPrize',
    'ODMX': 'AppsPrize',
    'OTK5': 'AppsPrize',
    'NZAZ': 'AppsPrize',
    'ODY0': 'AppsPrize',
    'ODYZ': 'AppsPrize',
    'OTAW': 'AppsPrize',
    'NTYY': 'AppsPrize',
    'ODKY': 'AppsPrize',
    'ODU5': 'AppsPrize',
    'NZZ2': 'AppsPrize',
    'MZIZ': 'AppsPrize',
    'NTNZ': 'AppsPrize',
    'NZZ1': 'AppsPrize',
    'LV9UVnNKZTY4WjZW': 'Ad It Up',
    'MTkwMzZ8': 'Fluent',
    'MTkxNDF8': 'Fluent',
    'e3N1Yl9hZmZ9': 'Test',
    'OTIwSkZrSHNEcm01': 'Copper',
    'OTlwSkZrSHNEcm01': 'Copper',
    'ZUpIY1o2eFJEa1Mw': 'Eneba',
    'WUpaY0xnb1A3QWNh': 'Prime',
    'dXhVZFNTSlBtVUFq': 'Influence Mobile',
    'QnN5MFBRaktvS1dq': 'Dynata',
    'Mnx8': 'Dynata',
    'OTA3OHx8': 'Dynata',
    'OTEzN3x8': 'Dynata',
    'MTkyODh8': 'Fluent',
    'ODk5N3x8': 'Dynata',
    'MjIzMnx8': 'Dynata',
    'MjEzOHx8': 'Dynata',
    'MjEyOHx8': 'Dynata',
    'OTAzMHx8': 'Dynata',
    'OTEwNnx8': 'Dynata',
    'OTEyOXx8': 'Dynata',
    'YWM0ZTQ3MzI2ZTZhNDA4MThhM2N8': 'Catbyte',
    'MXx8': 'Dynata',
    'MjQyM3x8': 'Dynata',
    'bDVneFQ0ZDV2Z2Jr': 'Klink',
    'clNkbFdocU8tY0JZ': 'Fluent',
    'MTI3NXx8': 'Dynata',
    'MTkyODZ8': 'Fluent',
    'MzV8': 'Dynata',
    'e3NvdXJjZX18': 'API Test',
    // Yeni eklenen ad network'ler
    'V1FtU1U2RTJjLWwx': 'Prodege Swagbucks iFrame',
    'Y2tkMmN3bzE4MDAwOWtnc2lkMGkxMWFrd3x8': 'Lootably',
    'Y2t0dWVxdWMxMDAwNDAxeDY2em1mYWd5Znx8': 'Lootably',
    'ZG5BU2hhUEFyeEE0': 'EmberFund',
    'Y2w2anJ4a244MDAyMDAxMzcxMjcyZWI5Znx8': 'Lootably',
    'MTUwOTh8': 'OfferToro',
    'MTYwMDh8': 'OfferToro',
    'MTI1Mjd8': 'OfferToro',
    'MTUwNTJ8': 'OfferToro',
    'Y2w4NXcydmNzMDAxM2AxM2JnM2ZlZDnbXx8': 'Lootably',
    'MnlKcVJENUphSGVB': 'Freecash iFrame',
    'Y2twMnhhOHpxMDA2azAxdDEwMzVsZWd1dXx8': 'Lootably',
    'MTE2MTF8': 'OfferToro',
    'NzIzMHx8': 'OfferToro',
    'MTA4MzB8': 'OfferToro',
    'Y2thZzBvODEzMDAwN3Z6c2ZlMjk3MHdmaXx8': 'Lootably',
    'Y2hwM2hvNWoyMDAyazAxeWNlNHA3Y296bHx8': 'Lootably',
    'Y2ttY2FudmJ3MDAwYjAxejM5bDNqaHRvNXx8': 'Lootably',
    'MTU2OTJ8': 'OfferToro',
    'bWhJWFFaRFp3U3RX': 'sMiles',
    'OTc0Nnx8': 'OfferToro',
    'MTI1NzI8': 'OfferToro',
    'MTQ5NTd8': 'OfferToro',
    'Y2xzbmlpYXZIMDAxOTAxemxsbTZ4ZDhhZnx8': 'Lootably',
    'OTg1NHx8': 'OfferToro',
    'Y2tlOHEwMjJhMDAzbmprc0U0aTB3MXY1cnx8': 'Lootably',
    'a3I3a2tYQnRDQlI1': 'Jumptask iFrame',
    // Yeni eklenen ad network kodları
    'aGNaOHZvZXNTOEE1': 'Freeward iFrame',
    'c01LNHJBVkJ3Sk9z': 'GG2U iFrame',
    'YzE3YTMzZjBkNTc3NGYzNzk1ZTB8': 'Catbyte',
    'VkY2ODg2QzNEVXpZ': 'Gamehag iFrame',
    'QUR0UXk4VGt0SEkz': 'Efez Games iFrame',
    'V3B4WmFRc29OZlp3': 'FireFaucet iFrame',
    'YzZiN2NiMGU5YjNjNDJmMDkyNmR8': 'Catbyte',
    'bGUtVmdJa09FWFZj': 'Playback Rewards',
    'MDAwYzliNGE5NGJiNGUyNjk2ZWN8': 'Catbyte',
    'NlU3ckxQaElyTWVU': 'Stepler iOS (Diamonds) for Production',
    'UDJGcTd6aTdrbGVa': 'Stepler iOS (Diamonds) for Staging',
    'b1J5WHpUbTZFRkdwRXBZd1ltclJVdTJ3WGNYZDVFQ3dhU2k5VzVySnYyZzRSUmoyQ21aZmhVczVZMXUwNDVQWTRMSUJiTmszQ0xIY2hDQ3RDTG5VdlZVSUtqQ05QdU5BX1dWVnVkcEp4U3RhbVFHN2MyNVlZdk8wa0pLUENMUHl8': 'Playwell',
    'ZlJTUG54Vll4SnYz': 'Prodege Inbox Dollar iFrame',
    'YjdhNTIyMzlhZDhmNGNmNWFlZjZ8': 'Catbyte',
    'NDk2M2MxNzBmZDBjNDgwNDg4YmN8': 'Catbyte',
    'NmZhOTVjZTlhZmVjNDdmMGIxNTJ8': 'Catbyte',
    'YjZkMY1OWQ0ZjczNDZhZDllZWV8': 'Catbyte',
    // Yeni eklenen ad network kodları (Adnetworkler.csv'den) - sadece yeni olanlar
    'd0dfRUxKVjEzZ1JC': 'Versemedia',
    'MTIzMjAx': 'Fyber',
    'OTEwXzI2OTQzM3x8': 'HangMyAds',
    'MTM1ODc2': 'Fyber',
    'MTA4MzMw': 'AdGate',
    'NGU3MjE3NWUyMDY0NDhYmJYjd8': 'Catbyte',
    'MTM1ODg2': 'Fyber',
    'MzRlNGY3MWEwNTJkNDhkNzlmNDB8': 'Catbyte',
    'YTE1NzkyOTdiNzhmNDZiZGFINWF8': 'Catbyte',
    'YmEzNmYwMmMyM2ZkNDRjMmFIMDd8': 'Catbyte',
    'YWl0YTRmZmUyYmQwNGIzZDllZjN8': 'Catbyte',
    'ODUyZmI4NWMzNjkzNGU0OGEyZjF8': 'Catbyte',
    'ZjZhMjM3NjQ5YzY0NGlxNGEyZDJ8': 'Catbyte',
    'YTlkYjUyODEyNjA5NDU4Y2I4MWN8': 'Catbyte',
    'MTM1NTQ2': 'Fyber',
    'MTM1MDUw': 'Fyber',
    'MTM1NDYw': 'Fyber',
    'MTM1MDc2': 'Fyber',
    // Son eklenen yeni kodlar (Adnetworkler.csv'den)
    'NmVZWVpkUGw5THpU': 'Hopi S2S',
    'YmY2Y2JiMGJmZGMyNDVmMGJmN2V8': 'Catbyte',
    // En son eklenen kodlar (Adnetworkler.csv'den)
    'ZjZhMjM3NjQ5YzY0NGIxNGEyZDJ8': 'Catbyte',
    'YWI0YTRmZmUyYmQwNGIzZDliZjN8': 'Catbyte',
    'Mzcx': 'OfferToro',
    'MWUyZTM4NWNiY2JkNGJjOThiY2J8': 'Catbyte',
    'MWUyZTM4NWNiY2JkNGJjOThi': 'Catbyte',
    'ODQ2ZTdjMjRiYTg4NDRlY2I0MDJ8': 'Catbyte',
    'NmUzMWUyMzhhNWNjNGYyNDg2MjV8': 'Catbyte',
    'NGU3MjE3NWUyMDY0NDhjYmJjYjd8': 'Catbyte',
    'ZTYzYWY2NGNjNGJjNGI2NDk0YjN8': 'Catbyte',
    'MzRlNGY3MWExNTJkNDhkNzlmNDB8': 'Catbyte',
    'YmEzNmYwMmMyM2ZkNDRjMmFlMDd8': 'Catbyte',
    'MTI4MzMw': 'AdGate',
    'YTE1NzkyOTdiNzhmNDZlZGFlNWF8': 'Catbyte',
    'MTM1ODUw': 'Fyber',
    'OTgyODZlNjJjOGZiNDAwOGFmMDl8': 'Catbyte',
    'YmYzY2JiMGJmZGMyNDVmMGJmN2V8': 'Catbyte',
    'ODU0OGM3ZjNlMmQ4NGU4NzliNjl8': 'Catbyte',
    'MmExODZlYzM5Y2Q4NDRiYjhmNzB8': 'Catbyte',
    'YzM1MDIxNjJkOWE3NDdiNzkwNzB8': 'Catbyte',
    // En son eklenen Catbyte kodları (Adnetworkler.csv'den)
    'ZmRhNzljMzE4MjI1NGI4OTgxM2F8': 'Catbyte',
    'ZTRjNGU3M2Q0MWZkNGI5OGFhZTN8': 'Catbyte',
    'ZmYzYWMxMTA5YWI5NGRmM2JjOWJ8': 'Catbyte',
    'YWYzYjE2ODNjNGQ2NDM4M2JhYTB8': 'Catbyte',
    'Zjg4NWE1YmY5NTVhNDM4M2FiZDR8': 'Catbyte',
    // Fyber ad network kodları
    'MTM1MTc0': 'Fyber',
    'MTIzNDUx': 'Fyber',
    'MTIzNDc4': 'Fyber',
    'MTIwNjUy': 'Fyber',
    'MTIzOTI1': 'Fyber',
    'MTIzNDk3': 'Fyber',
    'MTM3NzQ4': 'Fyber',
    'MTM3NDAy': 'Fyber',
    'MTM4MDAw': 'Fyber',
    'MTM1Njcy': 'Fyber',
    'MTM3MjIy': 'Fyber',
    'MTM3NDk2': 'Fyber',
    'MTM4MDg2': 'Fyber',
    'MTM4MDQ0': 'Fyber',
    'MTM4MDYw': 'Fyber',
    'MTM1NTAw': 'Fyber',
    'MTM1ODc0': 'Fyber',
    'MTM1ODYw': 'Fyber',
    'MTIzMTY3': 'Fyber',
    'MTM3NjI4': 'Fyber',
    'MTI0MDkx': 'Fyber',
    'MTIzNTQ4': 'Fyber',
    'MTIyMTA4': 'Fyber',
    'MTIyOTQ5': 'Fyber',
    'MTIzODMx': 'Fyber',
    'MTIzNDYx': 'Fyber',
    'MTIzOTIx': 'Fyber',
    // Yeni eklenen Base64 kodları
    'NTg1': 'AppsPrize',
    'NTk2': 'AppsPrize',
    'NjM4': 'AppsPrize',
    'NjU2': 'AppsPrize',
    'NjEy': 'AppsPrize',
    'NTIx': 'AppsPrize',
    'NTk5': 'AppsPrize',
    'NDc2': 'AppsPrize',
    'NjI3': 'AppsPrize',
    'NDg1': 'AppsPrize',
    'NjQy': 'AppsPrize',
    'NjUz': 'AppsPrize',
    'Mjgx': 'AppsPrize',
    'MTQz': 'AppsPrize',
    'OTg4': 'AppsPrize',
    'ODMx': 'AppsPrize',
    'OTk5': 'AppsPrize',
    'NzAz': 'AppsPrize',
    'ODYz': 'AppsPrize',
    'OTAw': 'AppsPrize',
    'NTYy': 'AppsPrize',
    'ODky': 'AppsPrize',
    'Nzc2': 'AppsPrize',
    'MzI5': 'AppsPrize',
    'NTcz': 'AppsPrize',
    'Nzc1': 'AppsPrize',
    'YjZkMjY1OWQ0ZjczNDZhZDliZWV8': 'Catbyte',
    'OXlOX2dVZTZPMVpT': 'Gaintplay API iFrame',
    'd3J4ZEsyNkFWZUtF': 'Fyber',
    'MTE5NTQ4': 'Fyber',
    'e3NYI19pZH18': 'AppsPrize',
    'cGhBMnhIRS1wMV9u': 'TradeDoubler',
    'NzQ4': 'AppsPrize',
    'ajRZSnpNT3lWaHFX': 'Prodege ySense iFrame',
    'NTg4': 'AppsPrize',
    'ODIz': 'AppsPrize',
    'YWl0YTRmZmUyYmQwNGlzZDIiZjN8': 'Catbyte',
    'NmVZVVpkUGw5THpU': 'Hopi S2S',
    'ZjZhMJM3NjQ5YzY0NGlxNGEyZDJ8': 'Catbyte',
    'NTI4': 'AppsPrize',
    'Nzcy': 'AppsPrize',
    'NmlyeERUX09FelhX': 'Macadam',
    'MWUyZTM4NWNlY2JkNGJjJ0Thi': 'Catbyte',
    'ODQ2ZTdlMjRiYTg4NDRlY2I0MDJ8': 'Catbyte',
    'MTIzNzg3': 'Fyber',
    'MTIzMDMz': 'Fyber',
    'M2NhNjlmYWZjNWJjNDI1NGFkZTR8': 'Catbyte',
    'MTIzNzc2': 'Fyber',
    'NU1OSlNZTnluU2Jz': 'Freecash API',
    'Nzcx': 'AppsPrize',
    'MTIzNDM5': 'Fyber',
    'ODE1': 'AppsPrize',
    'MTM1MTYy': 'Fyber',
    'MWUyZTM4NWNlY2JkNGJjJ0ThiY2J8': 'Catbyte',
    'OThjYzQ4ODM1NTg4NDZmYWFkNzJ8': 'Catbyte',
    'ODEz': 'AppsPrize',
    'MTAxNzY4': 'AdGate',
    'OTEwXzExNJE3Mnx8': 'HangMyAds',
    'OTEwXzE1NzM3Mnx8': 'HangMyAds',
    'OTEwXzI0MjI1NHx8': 'HangMyAds',
    'ODcxXzEwMTc2OHx8': 'HangMyAds',
    'OTEwXzIxNDk2NXx8': 'HangMyAds',
    'OTEwXzI0NDQ5M3x8': 'HangMyAds',
    'OTEwXzMxMjgx': 'HangMyAds',
    'OTEwXzMyMjM5NHx8': 'HangMyAds',
    'OTEwXzMyMjQ0N3x8': 'HangMyAds',
    'OTEwXzIzNjI1': 'HangMyAds',
    'OTEwXzIyMzAwM3x8': 'HangMyAds',
    'OTEwXzIzMTgzN3x8': 'HangMyAds',
    'OTEwXzExNjE3Mnx8': 'HangMyAds',
    'OTEwXzExODUyMnx8': 'HangMyAds',
    'OTEwXzI4MTAxNHx8': 'HangMyAds',
    'OTEwXzIwODA2MXx8': 'HangMyAds',
    'OTEwXzIxMjg3OHx8': 'HangMyAds',
    'OTEwXzMzMjZ8': 'HangMyAds',
    'OTEwXzMzODMyNHx8': 'HangMyAds',
    'YzE4YjYyZTFiOGEzNDljZmFhZWV8': 'Catbyte',
    'MTIyNjA0LUU3bmxBU3I5aXdUWmdWMjN8': 'Notik Offerwall',
    'NmUzMWUyMzhhNWNlNGYyNDg2MjV8': 'Catbyte',
    'MTM1MTE4': 'Fyber',
    'Njc1XzEyNTI3': 'HangMyAds',
    'Zmo3Q2Vta251dTR3': 'WalkTask iFrame',
    'MTM1NTg0': 'Fyber',
    'OWNmZDNjZDA3ZWYxNDEyZTkyOGF8': 'Catbyte',
    'Y2MzMGVkNzQtOTUyNC00ODNkLWE5MTItNGQyNjQ3ODg3NDk0': 'Catbyte',
    'MTIxMjc3': 'Fyber',
    'MTM1Mzcy': 'Fyber',
    'MTIzNzg4': 'Fyber',
    'NHk5Z01ONldCUTh5': 'Mode Earn App',
    'OXZLdzFhLUw1b3cxcnRkVENZd1RYYWtYODE4aXZ2a3gwUkFKbFM1Yk5rNnlvcmxLSmltcnFOZUN3OGtHQ0xMaHpSR3YwNWZDMGZ1OU5YSlBMSDBKZDd6YmdiOE1EbGdsNHZYVGNNR2pjT3VOLWxFOFRGSHk3UUZKMlVHTU1qTmp8': 'Playwell',
    'OXZLdzFhLUw1b3cxcnRkVENZd1RYYWtYODE4aXZ2a3gwUkFKbFM1Yk5rNnlvcmxLSmltcnFOZUN3OGtHQ0xMaHpSR3YwNWZDMGZ1OU5YSlBMSDBKZDEwZTNJQmVVcXhDeXdzdlFxempaRXR0TmtCcmZHektJbGtZcVA0Z29iNVh8': 'Playwell',
    'OXZLdzFhLUw1b3cxcnRkVENZd1RYYWtYODE4aXZ2a3gwUkFKbFM1Yk5rNnlvcmxLSmltcnFOZUN3OGtHQ0xMaHpSR3YwNWZDMGZ1OU5YSlBMSDBKZDMtT3BlZ2JQamdUWmJaazJmR0k1OHVEd2JSWkFoWHpyV0VTUmtZWll1cXN8': 'Playwell',
    'OXZLdzFhLUw1b3cxcnRkVENZd1RYYWtYODE4aXZ2a3gwUkFKbFM1Yk5rNnlvcmxLSmltcnFOZUN3OGtHQ0xMaHpSR3YwNWZDMGZ1OU5YSlBMSDBKZDRvZDA2cmF1N0RPNzNCd2NYN0lnWTQ0M1c5OFdoWnJaUGZwYVZoQUdQOVp8': 'Playwell',
    'OXZLdzFhLUw1b3cxcnRkVENZd1RYYWtYODE4aXZ2a3gwUkFKbFM1Yk5rNnlvcmxLSmltcnFOZUN3OGtHQ0xMaHpSR3YwNWZDMGZ1OU5YSlBMSDBKZHhaQ2JUcDZ3OW1lTVZ5M3JyVzIwNld4WThTZG1GYjB6Tm1aOFE5VDd1Vl98': 'Playwell',
    'OXZLdzFhLUw1b3cxcnRkVENZd1RYYWtYODE4aXZ2a3gwUkFKbFM1Yk5rNnlvcmxLSmltcnFOZUN3OGtHQ0xMaHpSR3YwNWZDMGZ1OU5YSlBMSDBKZHhzNFFYMXBhaVVCWG5BYkdlWHZtNnFOTlFpVHRkZ2M5MThYTV9fZTBNMWt8': 'Playwell',
    'OXZLdzFhLUw1b3cxcnRkVENZd1RYYWtYODE4aXZ2a3gwUkFKbFM1Yk5rNnlvcmxLSmltcnFOZUN3OGtHQ0xMaHpSR3YwNWZDMGZ1OU5YSlBMSDBKZHlnU3RpcURpNXFCN1VZV09QN3hibjJsY2RNdHlmOWRQbjI3Vm9YS05DNFV8': 'Playwell',
    'MTEwMjI2': 'Fyber',
    'MTI0MTYx': 'Fyber',
    'MTIxNzY4': 'Fyber',
    'MTIyMTAw': 'Fyber',
    'MTIyODM3': 'Fyber',
    'MTIzMTcx': 'Fyber',
    'MTM1Mzg0': 'Fyber',
    'MTM1NzMw': 'Fyber',
    'NGU3MjE3NWUyMDIY0NDhYmJYjd8': 'Catbyte',
    'MTM1ODg0': 'Fyber',
    'ZTY2YWY2NGNjNGJjNGI2NDk0YjN8': 'Catbyte',
    'MTIzNDQ0': 'Fyber',
    'MTIyNjgz': 'Fyber',
    'YmFINDNkM2JkNDI0NDc0NDhmZGJ8': 'Catbyte',
    'MTM3OTgw': 'Fyber',
    'MTIzMTAx': 'Fyber',
    'ZmM1MmJiNzA5ZjNiNDA3Y2IyMWJ8': 'Catbyte',
    'MTM3NzA4': 'Fyber',
    'ODU0OGM3ZjNiNmQ4NGU4NzliNjI8': 'Catbyte',
    'MmExODZiYzM5Y2Q4NDRiYjhmNzB8': 'Catbyte',
    'MTM3ODky': 'Fyber',
    'OTgyODZiNjJjOGZiNDAwOGFmMDI8': 'Catbyte',
    'MTIzNzc0': 'Fyber',
    'YmY2Y2JiMGJmZGM yNDVmMGJmN2V8': 'Catbyte',
    'Mzk0M19FOTNpXzJjZTRCc01TRGl8': 'HangMyAds',
    'YzM1MDIxNjJkOWE3NDdiNzk wNzB8': 'Catbyte',
    'NDU1Nl8xMDk0': 'HangMyAds',
    'e3N1Yl9pZH18': 'AppsPrize',
    'YXBwa2FybWF8': 'App Karma',
    'M2dtYTJVWHF1cVhv': 'MakeMoney',
    'MTI0Mzgz': 'AdGate',
    'SC01MkJnTGM3aXZr': 'PlayToWin',
    'ZTZhODEwNTBiMTUxNDhlZjk5ZTl8': 'Catbyte',
    'NjYw': 'AppsPrize'
    ,
    // Yeni eklenen kodlar (Adnetworkler.csv'den)
    'ZTYwYmEwZjE1ZjhhNDBkOTlhYzJ8': 'Catbyte',
    'MjFkNGRiZjExMjRjNDYyMGI2YzB8': 'Catbyte',
    'NmYxNTI0ZDExZDBiNGMxYjliM2N8': 'Catbyte',
    'NTQ3YWVjMjQ5MThlNDU1NThlOGR8': 'Catbyte',
    'Z0xOSkVKZm1hS0lm': 'Ad for Us',
    'dWZhOVBsUy1NXzRp': 'ATM',
    'MjI3OV80ODh8': 'HangMyAds',
    'MjI3OV80ODJ8': 'HangMyAds',
    'MjI3OV80ODV8': 'HangMyAds',
    'MjI3OV8xMDN8': 'HangMyAds',
    'MjI3OV8zMTN8': 'HangMyAds',
    // 'MTE2M182MjczN3x8': '', // Boş değerli eşleşme atlandı
    'MTM1NzQw': 'Fyber',
    'NTA4MF9vZmZlcndhbGxfMzI1': 'HangMyAds',
    'OTUzNDk3OTA4OGU4NDE1N2I0ZTN8': 'Catbyte',
    // Added from Adnetworkler.csv (2025-09-11)
    'MTE2M182MjczN3x8': 'HangMyAds',
    'MTIzNjc2': 'Fyber',
    'MTIzNjg4': 'Fyber',
    'MTIzODA1': 'Fyber',
    'MTM1MjE0': 'Fyber',
    'MTM1Mjk2': 'Fyber',
    'MTM1MzI4': 'Fyber',
    'MTM3NTg2': 'Fyber',
    'MTM3ODg2': 'Fyber',
    'MTM3ODk4': 'Fyber',
    'MTM4MDQw': 'Fyber',
    'MTM4MDY0': 'Fyber',
    'MTM4Mjc0': 'Fyber',
    'Nzc3': 'AppsPrize',
    'NzM2': 'AppsPrize',
    'MjA2YTY1MzZiMGI5NDBhYThlY2Z8': 'Catbyte',
    'MjY3YTRkY2Q4MGE5NGYwMDlhOTd8': 'Catbyte',
    'NmViMTJhODdjNDY0NGUxZDgxZTh8': 'Catbyte',
    'ZmNjYjUyNmJiNzNjNDA5Mzk0Y2R8': 'Catbyte',
    'ZmQ0MmMwZjhjNDVlNGRiNGJiYTN8': 'Catbyte',
    'NHZab2ZMNUkyOXNk': 'Stepler iOS (Points) for Staging'
  };
  
  // Base64 kodları için esnek arama
  const base64Result = findMapping(base64Mappings, cleanCode);
  if (base64Result) return base64Result;
  
  // PTSDK kodları (Adnetworkler.csv'den)
  const ptsdkMappings: Record<string, string> = {
    'PTSDK_H_NTG1': 'AppsPrize',
    'PTSDK_H_NTK2': 'AppsPrize',
    'PTSDK_H_NJM4': 'AppsPrize',
    'PTSDK_H_NJU2': 'AppsPrize',
    'PTSDK_H_NJEy': 'AppsPrize',
    'PTSDK_H_NTIX': 'AppsPrize',
    'PTSDK_H_NTK5': 'AppsPrize',
    'PTSDK_H_NDC2': 'AppsPrize',
    'PTSDK_H_NJI3': 'AppsPrize',
    'PTSDK_H_NDG1': 'AppsPrize',
    'PTSDK_H_MTE5': 'AppsPrize',
    'PTSDK_H_NJQY': 'AppsPrize',
    'PTSDK_H_NTI3': 'AppsPrize',
    'PTSDK_H_NJUZ': 'AppsPrize',
    'PTSDK_H_MJGX': 'AppsPrize',
    'PTSDK_H_MTQZ': 'AppsPrize',
    'PTSDK_H_OTG4': 'AppsPrize',
    'PTSDK_H_ODMX': 'AppsPrize',
    'PTSDK_H_OTK5': 'AppsPrize',
    'PTSDK_H_NZAZ': 'AppsPrize',
    'PTSDK_H_ODY0': 'AppsPrize',
    'PTSDK_H_ODYz': 'AppsPrize',
    'PTSDK_H_OTAW': 'AppsPrize',
    'PTSDK_H_NTYY': 'AppsPrize',
    'PTSDK_H_ODKY': 'AppsPrize',
    'PTSDK_H_ODU5': 'AppsPrize',
    'PTSDK_H_NZZ2': 'AppsPrize',
    'PTSDK_H_MZIZ': 'AppsPrize',
    'PTSDK_H_NTNZ': 'AppsPrize',
    'PTSDK_H_NZZ1': 'AppsPrize',
    'PTSDK_NTG4': 'AppsPrize',
    'PTSDK_NTI4': 'AppsPrize',
    'PTSDK_NZQ4': 'AppsPrize',
    'PTSDK_MJGX': 'AppsPrize',
    'PTSDK_MTE5': 'AppsPrize',
    'PTSDK_NDC2': 'AppsPrize',
    'PTSDK_NDG1': 'AppsPrize',
    'PTSDK_NJEy': 'AppsPrize',
    'PTSDK_NJI3': 'AppsPrize',
    'PTSDK_NJM4': 'AppsPrize',
    'PTSDK_NJQY': 'AppsPrize',
    'PTSDK_NJU2': 'AppsPrize',
    'PTSDK_NJUZ': 'AppsPrize',
    'PTSDK_NTG1': 'AppsPrize',
    'PTSDK_NTI3': 'AppsPrize',
    'PTSDK_NTIX': 'AppsPrize',
    'PTSDK_NTK2': 'AppsPrize',
    'PTSDK_NTK5': 'AppsPrize',
    'PTSDK_H_NTI4': 'AppsPrize',
    'PTSDK_H_NZQ4': 'AppsPrize',
    'PTSDK_H_NTG4': 'AppsPrize',
    // Yeni eklenen PTSDK kodları
    'PTSDK_H_NTg1': 'AppsPrize',
    'PTSDK_H_NTk2': 'AppsPrize',
    'PTSDK_H_NjM4': 'AppsPrize',
    'PTSDK_H_NjU2': 'AppsPrize',
    'PTSDK_H_NjEy': 'AppsPrize',
    'PTSDK_H_NTIx': 'AppsPrize',
    'PTSDK_H_NTk5': 'AppsPrize',
    'PTSDK_H_NDc2': 'AppsPrize',
    'PTSDK_H_NjI3': 'AppsPrize',
    'PTSDK_H_NDg1': 'AppsPrize',
    'PTSDK_H_NjQy': 'AppsPrize',
    'PTSDK_H_NjUz': 'AppsPrize',
    'PTSDK_H_Mjgx': 'AppsPrize',
    'PTSDK_H_MTQz': 'AppsPrize',
    'PTSDK_H_OTg4': 'AppsPrize',
    'PTSDK_H_ODMx': 'AppsPrize',
    'PTSDK_H_OTk5': 'AppsPrize',
    'PTSDK_H_NzAz': 'AppsPrize',
    'PTSDK_H_OTAw': 'AppsPrize',
    'PTSDK_H_NTYy': 'AppsPrize',
    'PTSDK_H_ODky': 'AppsPrize',
    'PTSDK_H_Nzc2': 'AppsPrize',
    'PTSDK_H_MzI5': 'AppsPrize',
    'PTSDK_H_NTcz': 'AppsPrize',
    'PTSDK_H_Nzc1': 'AppsPrize',
    'PTSDK_NTg4': 'AppsPrize',
    'PTSDK_NzQ4': 'AppsPrize',
    'PTSDK_Mjgx': 'AppsPrize',
    'PTSDK_NDc2': 'AppsPrize',
    'PTSDK_NDg1': 'AppsPrize',
    'PTSDK_NjEy': 'AppsPrize',
    'PTSDK_NjI3': 'AppsPrize',
    'PTSDK_NjM4': 'AppsPrize',
    'PTSDK_NjQy': 'AppsPrize',
    'PTSDK_NjU2': 'AppsPrize',
    'PTSDK_NjUz': 'AppsPrize',
    'PTSDK_NTg1': 'AppsPrize',
    'PTSDK_NTIx': 'AppsPrize',
    'PTSDK_NTk2': 'AppsPrize',
    'PTSDK_NTk5': 'AppsPrize',
    'PTSDK_H_NzQ4': 'AppsPrize',
    'PTSDK_H_NTg4': 'AppsPrize'
  };
  
  // Önce tam eşleşme kontrol et
  if (sNetworkMappings[cleanCode]) {
    return sNetworkMappings[cleanCode];
  }
  
  if (base64Mappings[cleanCode]) {
    return base64Mappings[cleanCode];
  }
  
  if (ptsdkMappings[cleanCode]) {
    return ptsdkMappings[cleanCode];
  }
  
  // Prefix kontrolü (S ile başlayanlar için)
  for (const [prefix, realName] of Object.entries(sNetworkMappings)) {
    if (cleanCode.startsWith(prefix + '_') || cleanCode.startsWith(prefix)) {
      return realName;
    }
  }
  
  // Suffix kontrolü (S ile başlayanlar için)
  for (const [suffix, realName] of Object.entries(sNetworkMappings)) {
    if (cleanCode.endsWith('_' + suffix) || cleanCode.endsWith(suffix)) {
      return realName;
    }
  }
  
  // PTSDK kodları için esnek arama
  const ptsdkResult = findMapping(ptsdkMappings, cleanCode);
  if (ptsdkResult) return ptsdkResult;
  
  // PTSDK prefix kontrolü
  if (cleanCode.startsWith('PTSDK_')) {
    return 'AppsPrize';
  }
  
  // Fluent için kapsamlı sayı kuralları - ÖNCE BUNLAR KONTROL EDİLMELİ
  // 0. Boşluklu formatları temizle (34631_ 206305 -> 34631_206305)
  if (/^\d+_\s+\d+$/.test(cleanCode)) {
    const cleanedCode = cleanCode.replace(/\s+/g, '');
    if (/^\d+_\d+$/.test(cleanedCode)) {
      return 'Fluent';
    }
  }
  
  // 1. Sayı + underscore (34631_, 45209_)
  if (/^\d+_$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 2. Sayı + underscore + sayı (34631_5406, 45209_5406) - ÖNEMLİ: Bu önce kontrol edilmeli
  if (/^\d+_\d+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 3. Sayı + underscore + metin (34631_dshop, 34631_rwc01)
  if (/^\d+_[a-zA-Z]/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 4. Sayı + underscore + karmaşık metin (34631_13821-207475-youtube)
  if (/^\d+_\d+-\d+-[a-zA-Z]+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 5. Sayı + underscore + BM/PSP formatı (45209_BM-207288, 45209_PSP-200540)
  if (/^\d+_[A-Z]+-\d+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 6. Sayı + underscore + reward formatı (45209_reward-205771)
  if (/^\d+_reward-\d+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // 7. Sadece sayılar (206305 gibi)
  if (/^\d+$/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // Karmaşık kodlar için parçalama (örn: ScR_OTlwSkZrSHNEcm01)
  // NOT: Bu kontrol Fluent kontrollerinden SONRA yapılmalı
  if (cleanCode.includes('_')) {
    const parts = cleanCode.split('_');
    
    // İlk parça S network kodu olabilir
    if (parts.length >= 2) {
      const firstPart = parts[0];
      const sNetworkResult = findMapping(sNetworkMappings, firstPart);
      if (sNetworkResult) {
        return sNetworkResult;
      }
      
      // İkinci parça base64 kodu olabilir
      const secondPart = parts[1];
      const base64Result = findMapping(base64Mappings, secondPart);
      if (base64Result) {
        return base64Result;
      }
    }
  }
  
  // OfferToro için pattern kuralları (Base64 sayı + pipe formatı)
  if (/^[A-Za-z0-9]+8$/.test(cleanCode) && cleanCode.length <= 10) {
    return 'OfferToro';
  }
  
  // Lootably için pattern kuralları (Y2 ile başlayan uzun base64 string'ler)
  if (/^Y2[a-zA-Z0-9]{30,}x8$/.test(cleanCode)) {
    return 'Lootably';
  }
  
  // Hiçbir eşleşme bulunamazsa orijinal kodu döndür
  return code;
}

// Parse campaign_network string to extract platform, country, and adnetwork
export function parseCampaignNetwork(campaignNetwork: string): {
  platform: string;
  country: string;
  adnetwork: string;
  campaignType: string;
  eventType: string;
  publisher: string;
  creativeFormat: string;
  targeting: string;
  audience: string;
  dateCode: string;
} {
  // Helper: normalize platform token with case-insensitive mapping; returns 'Android' | 'iOS' | null
  const normalizePlatformToken = (token: string): 'Android' | 'iOS' | null => {
    if (!token) return null;
    // Locale-agnostic lower; also normalize Turkish 'ı' -> 'i'
    const lower = token.trim().toLowerCase().replace(/ı/g, 'i');
    // iOS variants: only ios (no apple/iphone/ipad/appstore heuristics)
    if (lower === 'ios') return 'iOS';
    if (lower === 'ios ') return 'iOS';
    if (lower === 'ıos') return 'iOS';
    // Android variants: android/and/andr/aos + common typos
    if (lower === 'android' || lower === 'and' || lower === 'andr' || lower === 'aos') return 'Android';
    if (lower === 'andorid' || lower === 'anroid' || lower === 'andriod') return 'Android';
    return null;
  };

  // Helper: normalize country token with case-insensitive mapping and raw fallback
  const normalizeCountryToken = (token: string): { matched: boolean; value: string } => {
    const raw = (token || '').trim();
    if (!raw) return { matched: false, value: 'Unknown' };
    const upper = raw.toUpperCase();
    // Exclude known non-country tokens
    if (['CPA', 'CPI', 'CPE', 'CPM', 'CPC'].includes(upper)) {
      return { matched: false, value: 'Unknown' };
    }
    // Exclude ad network like tokens that can be mistaken as countries
    const adNetworkLikeTokens = new Set([
      'SCE','SFT','SPE','SDA','SAP','SKK','STK','SEA','SIE','SAM','SPL','SAN','SJK','SWK','STR','SBL','SAS','SMN','SRY','STS','S2','SAT','SER','SPK','SEZ',
      'PTSDK','TBSDK'
    ]);
    if (adNetworkLikeTokens.has(upper)) {
      return { matched: false, value: 'Unknown' };
    }
    // Exclude platform-like tokens (reported as appearing as country)
    const platformLikeTokens = new Set([
      'AND','ANDROID','IOS','AOS','ANDR','GP'
    ]);
    if (platformLikeTokens.has(upper)) {
      return { matched: false, value: 'Unknown' };
    }
    // CNTUS special handling
    if (upper.includes('CNTUS')) {
      return { matched: true, value: 'United States' };
    }
    // Comprehensive country mapping (ISO-2 and common aliases)
    const countryMapping: Record<string, string> = {
      'US': 'United States', 'USA': 'United States', 'UK': 'United Kingdom', 'GB': 'Great Britain',
      'TR': 'Turkey', 'DE': 'Germany', 'FR': 'France', 'KR': 'South Korea', 'JP': 'Japan',
      'CN': 'China', 'IN': 'India', 'BR': 'Brazil', 'RU': 'Russia', 'CA': 'Canada', 'AU': 'Australia',
      'MX': 'Mexico', 'NL': 'Netherlands', 'IT': 'Italy', 'ES': 'Spain', 'BE': 'Belgium',
      'CH': 'Switzerland', 'AT': 'Austria', 'SE': 'Sweden', 'NO': 'Norway', 'DK': 'Denmark',
      'FI': 'Finland', 'PL': 'Poland', 'CZ': 'Czech Republic', 'HU': 'Hungary', 'RO': 'Romania',
      'BG': 'Bulgaria', 'GR': 'Greece', 'PT': 'Portugal', 'IE': 'Ireland', 'LU': 'Luxembourg',
      'MT': 'Malta', 'CY': 'Cyprus', 'EE': 'Estonia', 'LV': 'Latvia', 'LT': 'Lithuania',
      'SI': 'Slovenia', 'SK': 'Slovakia', 'HR': 'Croatia', 'UA': 'Ukraine', 'BY': 'Belarus',
      'MD': 'Moldova', 'GE': 'Georgia', 'AM': 'Armenia', 'AZ': 'Azerbaijan', 'KZ': 'Kazakhstan',
      'UZ': 'Uzbekistan', 'KG': 'Kyrgyzstan', 'TJ': 'Tajikistan', 'TM': 'Turkmenistan',
      'AF': 'Afghanistan', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'NP': 'Nepal',
      'BT': 'Bhutan', 'MV': 'Maldives', 'TW': 'Taiwan', 'HK': 'Hong Kong', 'MO': 'Macau',
      'KP': 'North Korea', 'MN': 'Mongolia', 'TH': 'Thailand', 'VN': 'Vietnam', 'LA': 'Laos',
      'KH': 'Cambodia', 'MY': 'Malaysia', 'SG': 'Singapore', 'ID': 'Indonesia', 'PH': 'Philippines',
      'BN': 'Brunei', 'MM': 'Myanmar', 'TL': 'East Timor', 'NZ': 'New Zealand', 'FJ': 'Fiji',
      'PG': 'Papua New Guinea', 'SB': 'Solomon Islands', 'VU': 'Vanuatu', 'NC': 'New Caledonia',
      'PF': 'French Polynesia', 'WS': 'Samoa', 'TO': 'Tonga', 'KI': 'Kiribati', 'TV': 'Tuvalu',
      'NR': 'Nauru', 'PW': 'Palau', 'FM': 'Micronesia', 'MH': 'Marshall Islands', 'GT': 'Guatemala',
      'BZ': 'Belize', 'SV': 'El Salvador', 'HN': 'Honduras', 'NI': 'Nicaragua', 'CR': 'Costa Rica',
      'PA': 'Panama', 'CU': 'Cuba', 'JM': 'Jamaica', 'HT': 'Haiti', 'DO': 'Dominican Republic',
      'PR': 'Puerto Rico', 'TT': 'Trinidad and Tobago', 'BB': 'Barbados', 'LC': 'Saint Lucia',
      'VC': 'Saint Vincent and the Grenadines', 'GD': 'Grenada', 'AG': 'Antigua and Barbuda',
      'KN': 'Saint Kitts and Nevis', 'DM': 'Dominica', 'BS': 'Bahamas', 'AR': 'Argentina',
      'CL': 'Chile', 'UY': 'Uruguay', 'PY': 'Paraguay', 'BO': 'Bolivia', 'PE': 'Peru',
      'EC': 'Ecuador', 'CO': 'Colombia', 'VE': 'Venezuela', 'GY': 'Guyana', 'SR': 'Suriname',
      'GF': 'French Guiana', 'ZA': 'South Africa', 'EG': 'Egypt', 'LY': 'Libya', 'TN': 'Tunisia',
      'DZ': 'Algeria', 'MA': 'Morocco', 'SD': 'Sudan', 'SS': 'South Sudan', 'ET': 'Ethiopia',
      'ER': 'Eritrea', 'DJ': 'Djibouti', 'SO': 'Somalia', 'KE': 'Kenya', 'UG': 'Uganda',
      'TZ': 'Tanzania', 'RW': 'Rwanda', 'BI': 'Burundi', 'MW': 'Malawi', 'ZM': 'Zambia',
      'ZW': 'Zimbabwe', 'BW': 'Botswana', 'NA': 'Namibia', 'SZ': 'Eswatini', 'LS': 'Lesotho',
      'MG': 'Madagascar', 'MU': 'Mauritius', 'SC': 'Seychelles', 'KM': 'Comoros', 'YT': 'Mayotte',
      'RE': 'Réunion', 'MZ': 'Mozambique', 'AO': 'Angola', 'CD': 'Democratic Republic of the Congo',
      'CG': 'Republic of the Congo', 'CF': 'Central African Republic', 'TD': 'Chad', 'NE': 'Niger',
      'NG': 'Nigeria', 'BJ': 'Benin', 'TG': 'Togo', 'GH': 'Ghana', 'BF': 'Burkina Faso',
      'ML': 'Mali', 'SN': 'Senegal', 'GM': 'Gambia', 'GW': 'Guinea-Bissau', 'GN': 'Guinea',
      'SL': 'Sierra Leone', 'LR': 'Liberia', 'CI': 'Ivory Coast', 'MR': 'Mauritania',
      'CV': 'Cape Verde', 'ST': 'São Tomé and Príncipe', 'GQ': 'Equatorial Guinea', 'GA': 'Gabon',
      'CM': 'Cameroon', 'SA': 'Saudi Arabia', 'AE': 'United Arab Emirates', 'QA': 'Qatar',
      'BH': 'Bahrain', 'KW': 'Kuwait', 'OM': 'Oman', 'YE': 'Yemen', 'IQ': 'Iraq', 'SY': 'Syria',
      'LB': 'Lebanon', 'JO': 'Jordan', 'IL': 'Israel', 'PS': 'Palestine', 'IR': 'Iran',
      'IS': 'Iceland', 'GL': 'Greenland', 'FO': 'Faroe Islands', 'SJ': 'Svalbard and Jan Mayen',
      'AD': 'Andorra', 'MC': 'Monaco', 'SM': 'San Marino', 'VA': 'Vatican City', 'LI': 'Liechtenstein',
      'AL': 'Albania', 'MK': 'North Macedonia', 'RS': 'Serbia', 'ME': 'Montenegro',
      'BA': 'Bosnia and Herzegovina', 'XK': 'Kosovo',
      'EU': 'Europe', 'WW': 'Worldwide', 'ROW': 'Rest of World', 'GLOBAL': 'Global'
    };
    if (countryMapping[upper]) {
      return { matched: true, value: countryMapping[upper] };
    }
    // If it looks like a country code (2-3 letters), treat as country and return raw
    if (/^[A-Za-z]{2,3}$/.test(raw)) {
      return { matched: true, value: raw };
    }
    return { matched: false, value: 'Unknown' };
  };

  // First try the structured format with pipes (p:, g:, etc.)
  if (campaignNetwork.includes('|') && campaignNetwork.includes(':')) {
    const parts = campaignNetwork.split('|');
    const result = {
      platform: 'Unknown',
      country: 'No data',
      adnetwork: 'Unknown',
      campaignType: 'Unknown',
      eventType: 'Unknown',
      publisher: 'Unknown',
      creativeFormat: 'Unknown',
      targeting: 'Unknown',
      audience: 'Unknown',
      dateCode: 'Unknown'
    };

    parts.forEach(part => {
      const [key, value] = part.split(':');
      switch (key) {
        case 'p':
          {
            const plat = normalizePlatformToken(value || '');
            if (plat) result.platform = plat;
          }
          break;
        case 'g': {
          const norm = normalizeCountryToken(value || '');
          if (norm.matched) {
            result.country = norm.value;
          }
          break;
        }
        case 'a':
          result.adnetwork = decodeAdNetwork(value) || 'Unknown';
          break;
        case 'ct':
          result.campaignType = value || 'Unknown';
          break;
        case 'e':
          result.eventType = value || 'Unknown';
          break;
        case 's':
          result.publisher = value || 'Unknown';
          break;
        case 'cf':
          result.creativeFormat = value || 'Unknown';
          break;
        case 't':
          result.targeting = value || 'Unknown';
          break;
        case 'au':
          result.audience = value || 'Unknown';
          break;
        case 'd':
          result.dateCode = value || 'Unknown';
          break;
      }
    });

    return result;
  }

  // Handle different underscore formats intelligently
  const result = {
    platform: 'Unknown',
    country: 'No data',
    adnetwork: 'Unknown',
    campaignType: 'Unknown',
    eventType: 'Unknown',
    publisher: 'Unknown',
    creativeFormat: 'Unknown',
    targeting: 'Unknown',
    audience: 'Unknown',
    dateCode: 'Unknown'
  };

  // Handle special cases first - but don't return early, try to extract from app name
  if (campaignNetwork === 'unknown' || campaignNetwork === 'Unknown') {
    // Don't return early - let the function continue to try app name extraction
  }

  // Try both underscore and hyphen splitting
  let parts = campaignNetwork.split('_');
  if (parts.length < 2) {
    parts = campaignNetwork.split('-');
  }
  
  if (parts.length >= 2) {
    // Detect format by scanning ALL parts for known indicators
    let platformIndex = -1;
    let countryIndex = -1;
    let campaignTypeIndex = -1;
    
    // FIRST PASS: Find platform indicators in ANY position
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Platform detection - strict tokens only; ignore Google Play signals per requirement
      // Note: Do not read platform from the first part (likely game name)
      if (i > 0) {
        const plat = normalizePlatformToken(part);
        if (plat) {
          // If platform already set and differs, mark conflict by clearing to Unknown
          if (result.platform !== 'Unknown' && result.platform !== plat) {
            result.platform = 'Unknown';
            platformIndex = i;
          } else {
            result.platform = plat;
            platformIndex = i;
          }
        }
      }
      
      // Country detection - case-insensitive, only country-like tokens, raw fallback
      // CRITICAL: Country codes NEVER appear at the beginning of campaign network
      // Format is usually: GAME_PLATFORM_COUNTRY_ADNETWORK or PLATFORM_COUNTRY_ADNETWORK
      if (i > 0) {
        const norm = normalizeCountryToken(part);
        if (norm.matched) {
          result.country = norm.value;
          countryIndex = i;
        }
      }
      
      // Campaign type detection
      if (['CPA', 'CPI', 'CPE', 'CPM', 'CPC'].includes(part)) {
        result.campaignType = part;
        campaignTypeIndex = i;
      }
    }

    // If no strict platform found, pick a raw candidate to expose issues (exclude country/type/adnetwork)
    if (result.platform === 'Unknown') {
      for (let i = 1; i < parts.length; i++) {
        const token = parts[i];
        const plat = normalizePlatformToken(token);
        const countryNorm = normalizeCountryToken(token);
        const isType = ['CPA', 'CPI', 'CPE', 'CPM', 'CPC'].includes(token.toUpperCase());
        if (!plat && !countryNorm.matched && !isType) {
          result.platform = token; // raw token
          platformIndex = i;
          break;
        }
      }
    }

    // Extract ad network (usually the last part, but avoid known platform/country/type parts)
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      // If last part is not a known platform/country/type, use it as adnetwork
      if (!['AND', 'Android', 'iOS', 'IOS', 'US', 'UK', 'TR', 'DE', 'FR', 'CPA', 'CPI', 'CPE', 'CPM', 'CPC'].includes(lastPart)) {
        result.adnetwork = decodeAdNetwork(lastPart);
      } else {
        // Look for adnetwork in other positions
        for (let i = parts.length - 2; i >= 0; i--) {
          const part = parts[i];
          if (i !== platformIndex && i !== countryIndex && i !== campaignTypeIndex && 
              !['AppSa', 'App', parts[1]].includes(part)) { // Skip known prefixes and game names
            result.adnetwork = decodeAdNetwork(part);
            break;
          }
        }
      }
    }
  }

  // Ensure country falls back to "No data" if still empty/Unknown
  if (!result.country || result.country === 'Unknown') {
    result.country = 'No data';
  }
  return result;
}

// Get unique platforms from data
export function getUniquePlatforms(data: CampaignData[]): string[] {
  const platforms = data.map(row => {
    const parsed = parseCampaignNetwork(row.campaign_network);
    return parsed.platform;
  });
  return [...new Set(platforms)].filter(p => p !== 'Unknown');
}

// Get unique countries from data
export function getUniqueCountries(data: CampaignData[]): string[] {
  const countries = data.map(row => {
    const parsed = parseCampaignNetwork(row.campaign_network);
    return parsed.country;
  });
  return [...new Set(countries)].filter(c => c !== 'Unknown');
}

// Get unique adnetworks from data
export function getUniqueAdNetworks(data: CampaignData[]): string[] {
  const adnetworks = data.map(row => {
    const parsed = parseCampaignNetwork(row.campaign_network);
    return parsed.adnetwork;
  });
  return [...new Set(adnetworks)].filter(a => a !== 'Unknown');
}

// Get customers from uploaded files
export function getCustomers(files: { data: CampaignData[]; customerName?: string; accountManager?: string }[]): Customer[] {
  const customerMap = new Map<string, Customer>();

  files.forEach(file => {
    // Use "Unknown Customer" if customerName is not provided
    const customerName = file.customerName || 'Unknown Customer';
    const customerId = customerName.toLowerCase().replace(/\s+/g, '-');
    
    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        id: customerId,
        name: customerName,
        games: [],
        accountManager: file.accountManager || 'Unknown',
        totalInstalls: 0,
        avgRoasD7: 0,
        avgRoasD30: 0,
        lastUpdate: new Date().toISOString().split('T')[0]
      });
    }

    const customer = customerMap.get(customerId)!;
    
    // Add unique games
    const games = [...new Set(file.data.map(row => row.app.replace(' Android', '').replace(' iOS', '')))];
    customer.games = [...new Set([...customer.games, ...games])];
    
    // Add metrics
    customer.totalInstalls += file.data.reduce((sum, row) => sum + row.installs, 0);
    
    const validRoasD7 = file.data.filter(row => row.roas_d7 > 0);
    const validRoasD30 = file.data.filter(row => row.roas_d30 > 0);
    
    if (validRoasD7.length > 0) {
      const avgRoasD7 = validRoasD7.reduce((sum, row) => sum + row.roas_d7, 0) / validRoasD7.length;
      customer.avgRoasD7 = (customer.avgRoasD7 + avgRoasD7) / 2;
    }
    
    if (validRoasD30.length > 0) {
      const avgRoasD30 = validRoasD30.reduce((sum, row) => sum + row.roas_d30, 0) / validRoasD30.length;
      customer.avgRoasD30 = (customer.avgRoasD30 + avgRoasD30) / 2;
    }
  });

  return Array.from(customerMap.values());
}

// Get account managers from uploaded files
export function getAccountManagers(files: { data: CampaignData[]; customerName?: string; accountManager?: string }[]): AccountManager[] {
  const managerMap = new Map<string, AccountManager>();

  files.forEach(file => {
    // Use "Unknown Manager" if accountManager is not provided
    const accountManager = file.accountManager || 'Unknown Manager';
    const managerId = accountManager.toLowerCase().replace(/\s+/g, '-');
    
    if (!managerMap.has(managerId)) {
      managerMap.set(managerId, {
        id: managerId,
        name: accountManager,
        customers: [],
        totalInstalls: 0,
        avgRoasD7: 0,
        avgRoasD30: 0,
        lastUpdate: new Date().toISOString().split('T')[0]
      });
    }

    const manager = managerMap.get(managerId)!;
    
    // Add unique customers
    if (file.customerName && !manager.customers.includes(file.customerName)) {
      manager.customers.push(file.customerName);
    }
    
    // Add metrics
    manager.totalInstalls += file.data.reduce((sum, row) => sum + row.installs, 0);
    
    const validRoasD7 = file.data.filter(row => row.roas_d7 > 0);
    const validRoasD30 = file.data.filter(row => row.roas_d30 > 0);
    
    if (validRoasD7.length > 0) {
      const avgRoasD7 = validRoasD7.reduce((sum, row) => sum + row.roas_d7, 0) / validRoasD7.length;
      manager.avgRoasD7 = (manager.avgRoasD7 + avgRoasD7) / 2;
    }
    
    if (validRoasD30.length > 0) {
      const avgRoasD30 = validRoasD30.reduce((sum, row) => sum + row.roas_d30, 0) / validRoasD30.length;
      manager.avgRoasD30 = (manager.avgRoasD30 + avgRoasD30) / 2;
    }
  });

  return Array.from(managerMap.values());
}

// Extract game name from app string (A column)
export function extractGameName(app: string): string {
  // Remove platform suffixes to get clean game name
  return app.replace(/ Android$/, '').replace(/ iOS$/, '').trim();
}

// Extract platform from app string or campaign network
export function extractPlatform(app: string, campaignNetwork: string = ''): string {
  // Reuse normalizePlatformToken from parseCampaignNetwork scope by redefining here
  const normalizePlatformToken = (token: string): 'Android' | 'iOS' | null => {
    if (!token) return null;
    const lower = token.trim().toLowerCase().replace(/ı/g, 'i');
    if (lower === 'ios' || lower === 'ıos') return 'iOS';
    if (lower === 'android' || lower === 'and' || lower === 'andr' || lower === 'aos') return 'Android';
    if (lower === 'andorid' || lower === 'anroid' || lower === 'andriod') return 'Android';
    return null;
  };

  // First try to get platform from app name using strict tokens
  const appPlat = normalizePlatformToken(app);
  if (appPlat) return appPlat;
  
  // Use the improved parseCampaignNetwork function for consistency
  if (campaignNetwork && campaignNetwork !== 'unknown' && campaignNetwork !== 'Unknown') {
    const parsed = parseCampaignNetwork(campaignNetwork);
    if (parsed.platform !== 'Unknown') {
      return parsed.platform;
    }
  }
  
  // Try to extract platform from campaign network tokens (strict tokens only)
  const parts = campaignNetwork.split(/[_-]/);
  let found: 'Android' | 'iOS' | null = null;
  for (let i = 1; i < parts.length; i++) {
    const plat = normalizePlatformToken(parts[i]);
    if (plat) {
      if (found && found !== plat) {
        found = null; // conflict -> Unknown
        break;
      }
      found = plat;
    }
  }
  if (found) return found;

  // If still not found, return a raw candidate to expose issues
  for (let i = 1; i < parts.length; i++) {
    const token = parts[i];
    const plat = normalizePlatformToken(token);
    const upper = (token || '').trim().toUpperCase();
    const isType = ['CPA', 'CPI', 'CPE', 'CPM', 'CPC'].includes(upper);
    const platformLike = new Set(['AND','ANDROID','IOS','AOS','ANDR','GP']).has(upper);
    const isCountryLike = /^[A-Z]{2,3}$/.test(upper) && !platformLike;
    if (!plat && !isCountryLike && !isType) {
      return token; // raw
    }
  }
  
  // For unknown campaign networks, return Test as platform
  if (campaignNetwork === 'unknown' || campaignNetwork === 'Unknown') {
    return 'Test';
  }
  
  // If campaign network is unknown, try to infer from app name patterns
  if (app.includes('JewelQuest-Android') || app.includes('JewelQuest_Android')) return 'Android';
  if (app.includes('JewelQuest-iOS') || app.includes('JewelQuest_iOS')) return 'iOS';
  if (app.includes('WordSearch-Android') || app.includes('WordSearch_Android')) return 'Android';
  if (app.includes('WordSearch-iOS') || app.includes('WordSearch_iOS')) return 'iOS';
  
  // Try to extract platform from app name patterns with spaces and hyphens
  const appLower = app.toLowerCase();
  if (appLower.includes('jewel quest') && (appLower.includes('ios') || appLower.includes('android'))) {
    return appLower.includes('ios') ? 'iOS' : 'Android';
  }
  if (appLower.includes('word search') && (appLower.includes('ios') || appLower.includes('android'))) {
    return appLower.includes('ios') ? 'iOS' : 'Android';
  }
  
  // For specific games, try to infer platform from context
  if (appLower.includes('jewel quest') || appLower.includes('jewelquest')) {
    // If we can't determine platform from app name, check if there are any platform indicators
    if (appLower.includes('ios') || appLower.includes('iphone')) return 'iOS';
    if (appLower.includes('android') || appLower.includes('google')) return 'Android';
    
    // For unknown campaign networks, try to infer from game name patterns
    // Since we have both iOS and Android versions in the data, we need to make a decision
    // For now, let's default to iOS for Jewel Quest when unknown
    return 'iOS';
  }
  if (appLower.includes('word search') || appLower.includes('wordsearch')) {
    // If we can't determine platform from app name, check if there are any platform indicators
    if (appLower.includes('ios') || appLower.includes('iphone')) return 'iOS';
    if (appLower.includes('android') || appLower.includes('google')) return 'Android';
    
    // For unknown campaign networks, try to infer from game name patterns
    // Since we have both iOS and Android versions in the data, we need to make a decision
    // For now, let's default to Android for Word Search when unknown
    return 'Android';
  }
  
  return 'Unknown';
}


// Extract country from campaign network and format it nicely
export function extractCountryFromCampaign(campaignNetwork: string): string {
  // Use the improved parseCampaignNetwork function for consistency
  const parsed = parseCampaignNetwork(campaignNetwork);
  
  // Convert country codes to full names if needed
  const country = parsed.country;
  switch (country.toUpperCase()) {
    case 'US':
      return 'United States (US)';
    case 'UK':
      return 'United Kingdom (UK)';
    case 'GB':
      return 'Great Britain (GB)';
    case 'CA':
      return 'Canada (CA)';
    case 'AU':
      return 'Australia (AU)';
    case 'DE':
      return 'Germany (DE)';
    case 'FR':
      return 'France (FR)';
    case 'BR':
      return 'Brazil (BR)';
    case 'MX':
      return 'Mexico (MX)';
    case 'GLOBAL':
      return 'Global';
    default:
      return country === 'Unknown' ? 'No data' : country;
  }
}

// Group data for dashboard tables
export interface GameCountryPublisherGroup {
  game: string;
  country: string;
  platform: string;
  publisher: string;
  dailyData: Array<{
    date: string;
    installs: number;
    roas_d0: number;
    roas_d1?: number;
    roas_d2?: number;
    roas_d3?: number;
    roas_d4?: number;
    roas_d5?: number;
    roas_d6?: number;
    roas_d7: number;
    roas_d14?: number;
    roas_d21?: number;
    roas_d30: number;
    roas_d45?: number;
    roas_d60?: number;
    cost: number;
    revenue: number;
    ecpi?: number;
    adjust_cost?: number;
    ad_revenue?: number;
    gross_profit?: number;
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
  }>;
}

export function getGameCountryPublisherGroups(data: CampaignData[]): GameCountryPublisherGroup[] {
  const groups = new Map<string, GameCountryPublisherGroup>();
  
  const normalizePublisher = (publisherRaw: string): string => {
    if (!publisherRaw) return 'Unknown';
    
    // Decode ad network codes from adgroup_network
    return decodeAdNetwork(publisherRaw);
  };

  data.forEach(row => {
    // Extract game name from app column (A column)
    const game = extractGameName(row.app);
    
    // Parse campaign network to get platform, country, and publisher info
    const parsed = parseCampaignNetwork(row.campaign_network);
    
    // Enhanced platform detection - try multiple sources
    let platform = parsed.platform;
    if (platform === 'Unknown') {
      platform = extractPlatform(row.app, row.campaign_network);
    }
    
    // Additional fallback: try to extract from app name patterns
    if (platform === 'Unknown') {
      const appLower = row.app.toLowerCase();
      if (appLower.includes('android') || appLower.includes('jewelquest-android') || appLower.includes('wordsearch-android')) {
        platform = 'Android';
      } else if (appLower.includes('ios') || appLower.includes('jewelquest-ios') || appLower.includes('wordsearch-ios')) {
        platform = 'iOS';
      }
    }
    const country = parsed.country !== 'Unknown' ? parsed.country : extractCountryFromCampaign(row.campaign_network);
    
    // Publisher comes from raw adgroup_network
    const publisher = normalizePublisher(row.adgroup_network || 'Unknown');
    
    const key = `${game}-${country}-${platform}-${publisher}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        game,
        country,
        platform,
        publisher,
        dailyData: []
      });
    }

    const group = groups.get(key)!;
    // Merge by date with weighted averages (weight = installs)
    const existingIndex = group.dailyData.findIndex(d => d.date === row.day);
    if (existingIndex === -1) {
      group.dailyData.push({
        date: row.day,
        installs: row.installs,
        roas_d0: row.roas_d0 || 0,
        roas_d1: row.roas_d1 || 0,
        roas_d2: row.roas_d2 || 0,
        roas_d3: row.roas_d3 || 0,
        roas_d4: row.roas_d4 || 0,
        roas_d5: row.roas_d5 || 0,
        roas_d6: row.roas_d6 || 0,
        roas_d7: row.roas_d7 || 0,
        roas_d14: row.roas_d14 || 0,
        roas_d21: row.roas_d21 || 0,
        roas_d30: row.roas_d30 || 0,
        roas_d45: row.roas_d45 || 0,
        roas_d60: row.roas_d60 || 0,
        cost: row.cost || 0,
        revenue: row.all_revenue || 0,
        // Use eCPI directly from CSV (don't compute)
        ecpi: row.ecpi || 0,
        ...(row.adjust_cost !== undefined ? { adjust_cost: row.adjust_cost } : {}),
        ...(row.ad_revenue !== undefined ? { ad_revenue: row.ad_revenue } : {}),
        ...(row.retention_rate_d1 !== undefined ? { retention_rate_d1: row.retention_rate_d1 } : {}),
        ...(row.retention_rate_d2 !== undefined ? { retention_rate_d2: row.retention_rate_d2 } : {}),
        ...(row.retention_rate_d3 !== undefined ? { retention_rate_d3: row.retention_rate_d3 } : {}),
        ...(row.retention_rate_d4 !== undefined ? { retention_rate_d4: row.retention_rate_d4 } : {}),
        ...(row.retention_rate_d5 !== undefined ? { retention_rate_d5: row.retention_rate_d5 } : {}),
        ...(row.retention_rate_d6 !== undefined ? { retention_rate_d6: row.retention_rate_d6 } : {}),
        ...(row.retention_rate_d7 !== undefined ? { retention_rate_d7: row.retention_rate_d7 } : {}),
        ...(row.retention_rate_d12 !== undefined ? { retention_rate_d12: row.retention_rate_d12 } : {}),
        ...(row.retention_rate_d14 !== undefined ? { retention_rate_d14: row.retention_rate_d14 } : {}),
        ...(row.retention_rate_d21 !== undefined ? { retention_rate_d21: row.retention_rate_d21 } : {}),
        ...(row.retention_rate_d30 !== undefined ? { retention_rate_d30: row.retention_rate_d30 } : {}),
      } as typeof group.dailyData[0]);
    } else {
      const current = group.dailyData[existingIndex];
      const prevInstalls = current.installs || 0;
      const newInstalls = (row.installs || 0);
      const totalInstalls = prevInstalls + newInstalls;

      // Sum installs
      current.installs = totalInstalls;

      // Weighted average helper (by installs)
      const wavg = (prevVal: number, newVal: number) => {
        const a = isFinite(prevVal) ? prevVal : 0;
        const b = isFinite(newVal) ? newVal : 0;
        return totalInstalls > 0 ? ((a * prevInstalls) + (b * newInstalls)) / totalInstalls : 0;
      };

      // ROAS fields - all available ROAS columns
      current.roas_d0 = wavg(current.roas_d0 || 0, row.roas_d0 || 0);
      current.roas_d1 = wavg(current.roas_d1 || 0, row.roas_d1 || 0);
      current.roas_d2 = wavg(current.roas_d2 || 0, row.roas_d2 || 0);
      current.roas_d3 = wavg(current.roas_d3 || 0, row.roas_d3 || 0);
      current.roas_d4 = wavg(current.roas_d4 || 0, row.roas_d4 || 0);
      current.roas_d5 = wavg(current.roas_d5 || 0, row.roas_d5 || 0);
      current.roas_d6 = wavg(current.roas_d6 || 0, row.roas_d6 || 0);
      current.roas_d7 = wavg(current.roas_d7 || 0, row.roas_d7 || 0);
      current.roas_d14 = wavg(current.roas_d14 || 0, row.roas_d14 || 0);
      current.roas_d21 = wavg(current.roas_d21 || 0, row.roas_d21 || 0);
      current.roas_d30 = wavg(current.roas_d30 || 0, row.roas_d30 || 0);
      current.roas_d45 = wavg(current.roas_d45 || 0, row.roas_d45 || 0);
      current.roas_d60 = wavg(current.roas_d60 || 0, row.roas_d60 || 0);
      
      // Sum cost and revenue
      current.cost = (current.cost || 0) + (row.cost || 0);
      current.revenue = (current.revenue || 0) + (row.all_revenue || 0);

      // Retention rates (if present) - all available retention columns
      if (current.retention_rate_d1 !== undefined || row.retention_rate_d1 !== undefined) {
        current.retention_rate_d1 = wavg(current.retention_rate_d1 || 0, row.retention_rate_d1 || 0);
      }
      if (current.retention_rate_d2 !== undefined || row.retention_rate_d2 !== undefined) {
        current.retention_rate_d2 = wavg(current.retention_rate_d2 || 0, row.retention_rate_d2 || 0);
      }
      if (current.retention_rate_d3 !== undefined || row.retention_rate_d3 !== undefined) {
        current.retention_rate_d3 = wavg(current.retention_rate_d3 || 0, row.retention_rate_d3 || 0);
      }
      if (current.retention_rate_d4 !== undefined || row.retention_rate_d4 !== undefined) {
        current.retention_rate_d4 = wavg(current.retention_rate_d4 || 0, row.retention_rate_d4 || 0);
      }
      if (current.retention_rate_d5 !== undefined || row.retention_rate_d5 !== undefined) {
        current.retention_rate_d5 = wavg(current.retention_rate_d5 || 0, row.retention_rate_d5 || 0);
      }
      if (current.retention_rate_d6 !== undefined || row.retention_rate_d6 !== undefined) {
        current.retention_rate_d6 = wavg(current.retention_rate_d6 || 0, row.retention_rate_d6 || 0);
      }
      if (current.retention_rate_d7 !== undefined || row.retention_rate_d7 !== undefined) {
        current.retention_rate_d7 = wavg(current.retention_rate_d7 || 0, row.retention_rate_d7 || 0);
      }
      if (current.retention_rate_d12 !== undefined || row.retention_rate_d12 !== undefined) {
        current.retention_rate_d12 = wavg(current.retention_rate_d12 || 0, row.retention_rate_d12 || 0);
      }
      if (current.retention_rate_d14 !== undefined || row.retention_rate_d14 !== undefined) {
        current.retention_rate_d14 = wavg(current.retention_rate_d14 || 0, row.retention_rate_d14 || 0);
      }
      if (current.retention_rate_d21 !== undefined || row.retention_rate_d21 !== undefined) {
        current.retention_rate_d21 = wavg(current.retention_rate_d21 || 0, row.retention_rate_d21 || 0);
      }
      if (current.retention_rate_d30 !== undefined || row.retention_rate_d30 !== undefined) {
        current.retention_rate_d30 = wavg(current.retention_rate_d30 || 0, row.retention_rate_d30 || 0);
      }

      // Sum cost/revenue if present
      if (current.adjust_cost !== undefined || row.adjust_cost !== undefined) {
        current.adjust_cost = (current.adjust_cost || 0) + (row.adjust_cost || 0);
      }
      if (current.ad_revenue !== undefined || row.ad_revenue !== undefined) {
        current.ad_revenue = (current.ad_revenue || 0) + (row.ad_revenue || 0);
      }

      // Use weighted average for eCPI (don't recompute from cost/installs)
      if (current.ecpi !== undefined || row.ecpi !== undefined) {
        current.ecpi = wavg(current.ecpi || 0, row.ecpi || 0);
      }
    }
  });

  // Sort daily data by date within each group
  groups.forEach(group => {
    group.dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  return Array.from(groups.values()).sort((a, b) => {
    if (a.game !== b.game) return a.game.localeCompare(b.game);
    if (a.country !== b.country) return a.country.localeCompare(b.country);
    if (a.platform !== b.platform) return a.platform.localeCompare(b.platform);
    return a.publisher.localeCompare(b.publisher);
  });
}

// Generate display name for a file based on customer, games, and date range
export function generateFileDisplayName(
  customerName: string | undefined, 
  data: CampaignData[]
): string {
  if (data.length === 0) return 'Empty File';
  
  // Extract unique games
  const games = [...new Set(data.map(row => extractGameName(row.app)))];
  
  // Get date range
  const dates = data.map(row => new Date(row.day)).filter(date => !isNaN(date.getTime()));
  const startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
  const endDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
  
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const dateRange = `${formatDate(startDate)} to ${formatDate(endDate)}`;
  
  // Format: Customer Name - Games - Date Range
  const customerPart = customerName || 'Unknown Customer';
  const gamesPart = games.length > 3 
    ? `${games.slice(0, 3).join(', ')} +${games.length - 3} more`
    : games.join(', ');
  
  return `${customerPart} - ${gamesPart} (${dateRange})`;
}

// Get games from campaign data with their metrics
export function getGamesFromData(data: CampaignData[]): Array<{
  name: string;
  totalInstalls: number;
  avgRoasD7: number;
  avgRoasD30: number;
  dateRange: { start: string; end: string };
  platforms: string[];
}> {
  const gameGroups = new Map<string, CampaignData[]>();
  
  // Group data by game
  data.forEach(row => {
    const gameName = extractGameName(row.app);
    if (!gameGroups.has(gameName)) {
      gameGroups.set(gameName, []);
    }
    gameGroups.get(gameName)!.push(row);
  });
  
  // Calculate metrics for each game
  return Array.from(gameGroups.entries()).map(([gameName, gameData]) => {
    const totalInstalls = gameData.reduce((sum, row) => sum + row.installs, 0);
    
    const validRoasD7 = gameData.filter(row => row.roas_d7 > 0);
    const validRoasD30 = gameData.filter(row => row.roas_d30 > 0);
    
    const avgRoasD7 = validRoasD7.length > 0 
      ? validRoasD7.reduce((sum, row) => sum + row.roas_d7, 0) / validRoasD7.length 
      : 0;
    
    const avgRoasD30 = validRoasD30.length > 0 
      ? validRoasD30.reduce((sum, row) => sum + row.roas_d30, 0) / validRoasD30.length 
      : 0;
    
    // Get date range
    const dates = gameData.map(row => new Date(row.day)).filter(date => !isNaN(date.getTime()));
    const startDate = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : new Date();
    const endDate = dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : new Date();
    
    // Get platforms for this game
    const platforms = [...new Set(gameData.map(row => extractPlatform(row.app, row.campaign_network)))];
    
    return {
      name: gameName,
      totalInstalls,
      avgRoasD7,
      avgRoasD30,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      platforms: platforms.filter(p => p !== 'Unknown')
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// Generate unique campaign identifier for matching
export function generateCampaignId(data: CampaignData[]): string {
  if (data.length === 0) return '';
  
  // Get unique values from the data
  const games = [...new Set(data.map(row => extractGameName(row.app)))];
  const customers = [...new Set(data.map(row => {
    // Try to extract customer from campaign network or use a default
    const parsed = parseCampaignNetwork(row.campaign_network);
    return parsed.country || 'Global';
  }))];
  
  // Sort for consistent ID generation
  games.sort();
  customers.sort();
  
  // Create a unique identifier based on games and customers
  return `${games.join('|')}-${customers.join('|')}`;
}

// Check if two datasets represent the same campaign
export function isSameCampaign(existingData: CampaignData[], newData: CampaignData[]): boolean {
  const existingId = generateCampaignId(existingData);
  const newId = generateCampaignId(newData);
  
  // If IDs match, they're the same campaign
  if (existingId === newId && existingId !== '') {
    return true;
  }
  
  // Additional check: if they have overlapping games and similar structure
  const existingGames = new Set(existingData.map(row => extractGameName(row.app)));
  const newGames = new Set(newData.map(row => extractGameName(row.app)));
  
  // If more than 50% of games overlap, consider it the same campaign
  const overlap = [...existingGames].filter(game => newGames.has(game)).length;
  const totalGames = new Set([...existingGames, ...newGames]).size;
  
  return overlap / totalGames > 0.5;
}

// Merge campaign data while preserving date-based updates
export function mergeCampaignData(existingData: CampaignData[], newData: CampaignData[]): CampaignData[] {
  const existingMap = new Map<string, CampaignData>();
  
  // Create a map of existing data by unique key (app + campaign_network + adgroup_network + day)
  existingData.forEach(row => {
    const key = `${row.app}-${row.campaign_network}-${row.adgroup_network}-${row.day}`;
    existingMap.set(key, row);
  });
  
  // Process new data
  const mergedData: CampaignData[] = [];
  const processedKeys = new Set<string>();
  
  // Add all existing data first
  existingData.forEach(row => {
    const key = `${row.app}-${row.campaign_network}-${row.adgroup_network}-${row.day}`;
    mergedData.push(row);
    processedKeys.add(key);
  });
  
  // Add new data, replacing existing entries for the same day
  newData.forEach(row => {
    const key = `${row.app}-${row.campaign_network}-${row.adgroup_network}-${row.day}`;
    
    if (existingMap.has(key)) {
      // Replace existing entry with new data
      const index = mergedData.findIndex(item => 
        `${item.app}-${item.campaign_network}-${item.adgroup_network}-${item.day}` === key
      );
      if (index !== -1) {
        mergedData[index] = row;
      }
    } else {
      // Add new entry
      mergedData.push(row);
    }
    processedKeys.add(key);
  });
  
  return mergedData;
}

// Synchronize dates across all groups - ensures all tables have same date range
export function synchronizeGroupDates(groups: GameCountryPublisherGroup[], startDate?: string, endDate?: string): GameCountryPublisherGroup[] {
  if (groups.length === 0) return groups;

  // Find the date range to use
  let dateStart: Date;
  let dateEnd: Date;

  if (startDate && endDate) {
    // Use provided date range
    dateStart = new Date(startDate);
    dateEnd = new Date(endDate);
  } else {
    // Find overall date range from all groups
    const allDates = groups.flatMap(group => 
      group.dailyData.map(day => new Date(day.date))
    ).filter(date => !isNaN(date.getTime()));

    if (allDates.length === 0) return groups;

    dateStart = new Date(Math.min(...allDates.map(d => d.getTime())));
    dateEnd = new Date(Math.max(...allDates.map(d => d.getTime())));
  }

  // Generate all dates in the range
  const allDatesInRange: string[] = [];
  const current = new Date(dateStart);
  
  while (current <= dateEnd) {
    allDatesInRange.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  // Synchronize each group's data
  return groups.map(group => {
    const existingDataMap = new Map(
      group.dailyData.map(day => [day.date, day])
    );

    const synchronizedDailyData = allDatesInRange.map(date => {
      const existingData = existingDataMap.get(date);
      if (existingData) {
        return existingData;
      } else {
        // Create empty data for missing dates
        return {
          date,
          installs: 0,
          roas_d0: 0,
          roas_d1: 0,
          roas_d2: 0,
          roas_d3: 0,
          roas_d4: 0,
          roas_d5: 0,
          roas_d6: 0,
          roas_d7: 0,
          roas_d14: 0,
          roas_d21: 0,
          roas_d30: 0,
          roas_d45: 0,
          roas_d60: 0,
          cost: 0,
          revenue: 0,
          ecpi: 0,
          adjust_cost: 0,
          ad_revenue: 0,
          gross_profit: 0,
          retention_rate_d1: 0,
          retention_rate_d2: 0,
          retention_rate_d3: 0,
          retention_rate_d4: 0,
          retention_rate_d5: 0,
          retention_rate_d6: 0,
          retention_rate_d7: 0,
          retention_rate_d12: 0,
          retention_rate_d14: 0,
          retention_rate_d21: 0,
          retention_rate_d30: 0,
        } as typeof group.dailyData[0];
      }
    });

    return {
      ...group,
      dailyData: synchronizedDailyData
    };
  });
}

// Test function for ad network decoding
export function testAdNetworkDecoding(): void {
  console.log('=== Ad Network Decoding Test ===');
  
  // Test S ile başlayan kodlar
  const testCases = [
    'SPE', 'SFT', 'SDA', 'SCE', 'SPL', 'SAP', 'SKK', 'STK', 'SEA', 'SIE', 'SAM', 'SEZ', 'SJK', 'SWK', 'STR', 'SBL', 'SAS', 'SMN', 'SRY', 'STS', 'S2', 'SAT', 'SER',
    'SPE_', '_SPE', 'SPE_US', 'US_SPE', 'spe', 'Sft', 'sda',
    'NTG1', 'NTK2', 'NJM4', 'NJU2', 'NJEy', 'NTIX', 'NTK5', 'NDC2', 'NJI3', 'NDG1', 'MTE5', 'NJQY', 'NTI3', 'NJUZ', 'MJGX', 'MTQZ', 'OTG4', 'ODMX', 'OTK5', 'NZAZ', 'ODY0', 'ODYZ', 'OTAW', 'NTYY', 'ODKY', 'ODU5', 'NZZ2', 'MZIZ', 'NTNZ', 'NZZ1',
    'PTSDK_H_NTG1', 'PTSDK_H_NTK2', 'PTSDK_H_NJM4', 'PTSDK_H_NJU2', 'PTSDK_H_NJEy', 'PTSDK_H_NTIX', 'PTSDK_H_NTK5', 'PTSDK_H_NDC2', 'PTSDK_H_NJI3', 'PTSDK_H_NDG1', 'PTSDK_H_MTE5', 'PTSDK_H_NJQY', 'PTSDK_H_NTI3', 'PTSDK_H_NJUZ', 'PTSDK_H_MJGX', 'PTSDK_H_MTQZ', 'PTSDK_H_OTG4', 'PTSDK_H_ODMX', 'PTSDK_H_OTK5', 'PTSDK_H_NZAZ', 'PTSDK_H_ODY0', 'PTSDK_H_ODYz', 'PTSDK_H_OTAW', 'PTSDK_H_NTYY', 'PTSDK_H_ODKY', 'PTSDK_H_ODU5', 'PTSDK_H_NZZ2', 'PTSDK_H_MZIZ', 'PTSDK_H_NTNZ', 'PTSDK_H_NZZ1',
    'PTSDK_NTG4', 'PTSDK_NTI4', 'PTSDK_NZQ4', 'PTSDK_MJGX', 'PTSDK_MTE5', 'PTSDK_NDC2', 'PTSDK_NDG1', 'PTSDK_NJEy', 'PTSDK_NJI3', 'PTSDK_NJM4', 'PTSDK_NJQY', 'PTSDK_NJU2', 'PTSDK_NJUZ', 'PTSDK_NTG1', 'PTSDK_NTI3', 'PTSDK_NTIX', 'PTSDK_NTK2', 'PTSDK_NTK5', 'PTSDK_H_NTI4', 'PTSDK_H_NZQ4', 'PTSDK_H_NTG4',
    '34631_200222', '12345_67890', '99999_11111', '1_2', '123456_789012',
    'ScR_OTlwSkZrSHNEcm01', 'MTkwMzZ8', 'SPE_WUpaY0xnb1A3QWNh', 'SDA_MXx8', 'SDA_QnN5MFBRaktvS1dq', 'SDA_MjQyM3x8', 'SAP_LV9UVnNKZTY4WjZW', 'LV9UVnNKZTY4WjZW', 'SDA_ODk5N3x8', 'SDA_OTA3OHx8', 'SDA_OTAzMHx8',
    'SFT_34631_', 'SFT_34631_200452', 'SFT_34631_200540', 'SFT_34631_200789', 'SFT_34631_201946', 'SFT_34631_201979', 'SFT_34631_203279', 'SFT_34631_203540', 'SFT_34631_203571', 'SFT_34631_204147', 'SFT_34631_204590', 'SFT_34631_204685', 'SFT_34631_204935', 'SFT_34631_205117', 'SFT_34631_205192', 'SFT_34631_205841', 'SFT_34631_205907', 'SFT_34631_206305', 'SFT_34631_206599', 'SFT_34631_206636', 'SFT_34631_206791', 'SFT_34631_206811', 'SFT_34631_206814', 'SFT_34631_206948', 'SFT_34631_207364', 'SFT_34631_207460', 'SFT_34631_207475', 'SFT_34631_207553', 'SFT_34631_207555', 'SFT_34631_207576', 'SFT_34631_207608', 'SFT_34631_207632', 'SFT_34631_207657', 'SFT_34631_207675', 'SFT_34631_207691', 'SFT_34631_207733', 'SFT_34631_207746', 'SFT_34631_207754', 'SFT_34631_207793', 'SFT_34631_207888', 'SFT_34631_207930', 'SFT_34631_207962', 'SFT_34631_207983', 'SFT_34631_208098', 'SFT_34631_208110', 'SFT_34631_208129', 'SFT_34631_208179', 'SFT_34631_208198', 'SFT_34631_208231', 'SFT_34631_208237', 'SFT_34631_208243', 'SFT_34631_208253', 'SFT_34631_208281', 'SFT_34631_208358', 'SFT_34631_5406',
    'SFT_45209_', 'SFT_45209_191164', 'SFT_45209_200452', 'SFT_45209_200540', 'SFT_45209_201098', 'SFT_45209_201623', 'SFT_45209_201946', 'SFT_45209_202796', 'SFT_45209_203279', 'SFT_45209_203285', 'SFT_45209_203350', 'SFT_45209_203540', 'SFT_45209_204115', 'SFT_45209_204147', 'SFT_45209_204413', 'SFT_45209_204432', 'SFT_45209_204560', 'SFT_45209_204590', 'SFT_45209_204685', 'SFT_45209_204765', 'SFT_45209_204935', 'SFT_45209_204972', 'SFT_45209_204987', 'SFT_45209_205038', 'SFT_45209_205117', 'SFT_45209_205192', 'SFT_45209_205201', 'SFT_45209_205229', 'SFT_45209_205474', 'SFT_45209_205477', 'SFT_45209_205590', 'SFT_45209_205771', 'SFT_45209_205813', 'SFT_45209_205841', 'SFT_45209_205907', 'SFT_45209_206305', 'SFT_45209_206599', 'SFT_45209_206636', 'SFT_45209_206791', 'SFT_45209_206811', 'SFT_45209_206818', 'SFT_45209_206948', 'SFT_45209_207242', 'SFT_45209_207364', 'SFT_45209_207460', 'SFT_45209_207468', 'SFT_45209_207475', 'SFT_45209_207491', 'SFT_45209_207495', 'SFT_45209_207509', 'SFT_45209_207555', 'SFT_45209_207576', 'SFT_45209_207580', 'SFT_45209_207608', 'SFT_45209_207632', 'SFT_45209_207639', 'SFT_45209_207650', 'SFT_45209_207675', 'SFT_45209_207691', 'SFT_45209_207744', 'SFT_45209_207746', 'SFT_45209_207777', 'SFT_45209_207779', 'SFT_45209_207793', 'SFT_45209_207888', 'SFT_45209_207908', 'SFT_45209_207930', 'SFT_45209_207962', 'SFT_45209_207983', 'SFT_45209_208098', 'SFT_45209_208110', 'SFT_45209_208117', 'SFT_45209_208146', 'SFT_45209_208179', 'SFT_45209_208198', 'SFT_45209_208231', 'SFT_45209_208237', 'SFT_45209_208243', 'SFT_45209_208253', 'SFT_45209_208312', 'SFT_45209_208329', 'SFT_45209_208358', 'SFT_45209_300576', 'SFT_45209_4136', 'SFT_45209_5406', 'SFT_45209_5555',
    'SFT_49238_', 'SFT_49378_206305', 'SFT_49378_207689', 'SFT_49388_15182', 'SFT_49388_206305', 'SFT_49388_207861', 'SFT_49558_208162', 'SFT_49558_208163', 'SFT_49558_208165', 'SFT_49788_208005', 'SFT_MTkwMzZ8',
    'e3N1Yl9hZmZ9', 'OTIwSkZrSHNEcm01', 'OTlwSkZrSHNEcm01', 'ZUpIY1o2eFJEa1Mw', 'WUpaY0xnb1A3QWNh',
    'dXhVZFNTSlBtVUFq', 'QnN5MFBRaktvS1dq', 'Mnx8', 'OTA3OHx8', 'OTEzN3x8',
    'MTkyODh8', 'ODk5N3x8', 'MjIzMnx8', 'MjEzOHx8', 'MjEyOHx8', 'OTAzMHx8', 'OTEwNnx8', 'OTEyOXx8',
    'YWM0ZTQ3MzI2ZTZhNDA4MThhM2N8', 'MXx8', 'MjQyM3x8', 'bDVneFQ0ZDV2Z2Jr', 'clNkbFdocU8tY0JZ',
    'MTI3NXx8', 'MTkyODZ8', 'MzV8', 'e3NvdXJjZX18',
    'UNKNOWN_CODE', 'TEST123', 'RANDOM'
  ];
  
  testCases.forEach(code => {
    const decoded = decodeAdNetwork(code);
    console.log(`${code} → ${decoded}`);
  });
  
  console.log('=== Test Complete ===');
}
