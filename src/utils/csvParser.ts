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
        campaign_network: decodeAdNetwork(rawCampaignNetwork),
        adgroup_network: decodeAdNetwork(rawAdgroupNetwork),
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
        campaign_network: decodeAdNetwork(rawCampaignNetwork),
        adgroup_network: decodeAdNetwork(rawAdgroupNetwork),
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
        campaign_network: decodeAdNetwork(rawCampaignNetwork),
        adgroup_network: decodeAdNetwork(rawAdgroupNetwork),
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
        campaign_network: decodeAdNetwork(rawCampaignNetwork),
        adgroup_network: decodeAdNetwork(rawAdgroupNetwork),
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
  // First try the structured format with pipes (p:, g:, etc.)
  if (campaignNetwork.includes('|') && campaignNetwork.includes(':')) {
    const parts = campaignNetwork.split('|');
    const result = {
      platform: 'Unknown',
      country: 'Unknown',
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
          result.platform = value || 'Unknown';
          break;
        case 'g':
          result.country = value || 'Unknown';
          break;
        case 'a':
          result.adnetwork = value || 'Unknown';
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
    country: 'Global',
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
      
      // Platform detection - look for platform indicators (flexible)
      if (part === 'AND' || part === 'Android' || part.toLowerCase() === 'andr') {
        result.platform = 'Android';
        platformIndex = i;
      } else if (part === 'iOS' || part === 'IOS') {
        result.platform = 'iOS';
        platformIndex = i;
      } else if (part === 'GP') {  // Google Play = Android
        result.platform = 'Android';
        platformIndex = i;
      }
      
      // Special handling for game names that might contain platform info
      if (part.includes('Android')) {
        result.platform = 'Android';
        platformIndex = i;
      } else if (part.includes('iOS') || part.includes('IOS')) {
        result.platform = 'iOS';
        platformIndex = i;
      }
      
      // Country detection - handle both direct codes and CNTUS format
      if (part.includes('CNTUS')) {
        result.country = 'US';
        countryIndex = i;
      } else if (['US', 'USA', 'UK', 'GB', 'TR', 'DE', 'FR', 'KR', 'JP', 'CN', 'IN', 'BR', 'RU', 'CA', 'AU', 'MX', 'NL', 'IT', 'ES', 'BE', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'PL', 'CZ', 'HU', 'RO', 'BG', 'GR', 'PT', 'IE', 'LU', 'MT', 'CY', 'EE', 'LV', 'LT', 'SI', 'SK', 'HR', 'UA', 'BY', 'MD', 'GE', 'AM', 'AZ', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'AF', 'PK', 'BD', 'LK', 'NP', 'BT', 'MV', 'TW', 'HK', 'MO', 'KP', 'MN', 'TH', 'VN', 'LA', 'KH', 'MY', 'SG', 'ID', 'PH', 'BN', 'MM', 'TL', 'NZ', 'FJ', 'PG', 'SB', 'VU', 'NC', 'PF', 'WS', 'TO', 'KI', 'TV', 'NR', 'PW', 'FM', 'MH', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA', 'CU', 'JM', 'HT', 'DO', 'PR', 'TT', 'BB', 'LC', 'VC', 'GD', 'AG', 'KN', 'DM', 'BS', 'AR', 'CL', 'UY', 'PY', 'BO', 'PE', 'EC', 'CO', 'VE', 'GY', 'SR', 'GF', 'ZA', 'EG', 'LY', 'TN', 'DZ', 'MA', 'SD', 'SS', 'ET', 'ER', 'DJ', 'SO', 'KE', 'UG', 'TZ', 'RW', 'BI', 'MW', 'ZM', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'MG', 'MU', 'SC', 'KM', 'YT', 'RE', 'MZ', 'AO', 'CD', 'CG', 'CF', 'TD', 'NE', 'NG', 'BJ', 'TG', 'GH', 'BF', 'ML', 'SN', 'GM', 'GW', 'GN', 'SL', 'LR', 'CI', 'MR', 'CV', 'ST', 'GQ', 'GA', 'CM', 'SA', 'AE', 'QA', 'BH', 'KW', 'OM', 'YE', 'IQ', 'SY', 'LB', 'JO', 'IL', 'PS', 'IR', 'IS', 'GL', 'FO', 'SJ', 'AD', 'MC', 'SM', 'VA', 'LI', 'AL', 'MK', 'RS', 'ME', 'BA', 'XK'].includes(part)) {
        switch (part.toUpperCase()) {
          case 'US':
          case 'USA':
            result.country = 'US';
            break;
          case 'UK':
          case 'GB':
            result.country = 'UK';
            break;
          case 'TR':
            result.country = 'Turkey';
            break;
          case 'DE':
            result.country = 'Germany';
            break;
          case 'FR':
            result.country = 'France';
            break;
          case 'KR':
            result.country = 'Korea';
            break;
          case 'JP':
            result.country = 'Japan';
            break;
          case 'CN':
            result.country = 'China';
            break;
          case 'IN':
            result.country = 'India';
            break;
          case 'BR':
            result.country = 'Brazil';
            break;
          case 'RU':
            result.country = 'Russia';
            break;
          case 'CA':
            result.country = 'Canada';
            break;
          case 'AU':
            result.country = 'Australia';
            break;
          case 'MX':
            result.country = 'Mexico';
            break;
          case 'NL':
            result.country = 'Netherlands';
            break;
          case 'IT':
            result.country = 'Italy';
            break;
          case 'ES':
            result.country = 'Spain';
            break;
          case 'BE':
            result.country = 'Belgium';
            break;
          case 'CH':
            result.country = 'Switzerland';
            break;
          case 'AT':
            result.country = 'Austria';
            break;
          case 'SE':
            result.country = 'Sweden';
            break;
          case 'NO':
            result.country = 'Norway';
            break;
          case 'DK':
            result.country = 'Denmark';
            break;
          case 'FI':
            result.country = 'Finland';
            break;
          case 'PL':
            result.country = 'Poland';
            break;
          case 'CZ':
            result.country = 'Czech Republic';
            break;
          case 'HU':
            result.country = 'Hungary';
            break;
          case 'RO':
            result.country = 'Romania';
            break;
          case 'BG':
            result.country = 'Bulgaria';
            break;
          case 'GR':
            result.country = 'Greece';
            break;
          case 'PT':
            result.country = 'Portugal';
            break;
          case 'IE':
            result.country = 'Ireland';
            break;
          case 'LU':
            result.country = 'Luxembourg';
            break;
          case 'MT':
            result.country = 'Malta';
            break;
          case 'CY':
            result.country = 'Cyprus';
            break;
          case 'EE':
            result.country = 'Estonia';
            break;
          case 'LV':
            result.country = 'Latvia';
            break;
          case 'LT':
            result.country = 'Lithuania';
            break;
          case 'SI':
            result.country = 'Slovenia';
            break;
          case 'SK':
            result.country = 'Slovakia';
            break;
          case 'HR':
            result.country = 'Croatia';
            break;
          case 'UA':
            result.country = 'Ukraine';
            break;
          case 'BY':
            result.country = 'Belarus';
            break;
          case 'MD':
            result.country = 'Moldova';
            break;
          case 'GE':
            result.country = 'Georgia';
            break;
          case 'AM':
            result.country = 'Armenia';
            break;
          case 'AZ':
            result.country = 'Azerbaijan';
            break;
          case 'KZ':
            result.country = 'Kazakhstan';
            break;
          case 'UZ':
            result.country = 'Uzbekistan';
            break;
          case 'KG':
            result.country = 'Kyrgyzstan';
            break;
          case 'TJ':
            result.country = 'Tajikistan';
            break;
          case 'TM':
            result.country = 'Turkmenistan';
            break;
          case 'AF':
            result.country = 'Afghanistan';
            break;
          case 'PK':
            result.country = 'Pakistan';
            break;
          case 'BD':
            result.country = 'Bangladesh';
            break;
          case 'LK':
            result.country = 'Sri Lanka';
            break;
          case 'NP':
            result.country = 'Nepal';
            break;
          case 'BT':
            result.country = 'Bhutan';
            break;
          case 'MV':
            result.country = 'Maldives';
            break;
          case 'TW':
            result.country = 'Taiwan';
            break;
          case 'HK':
            result.country = 'Hong Kong';
            break;
          case 'MO':
            result.country = 'Macau';
            break;
          case 'KP':
            result.country = 'North Korea';
            break;
          case 'MN':
            result.country = 'Mongolia';
            break;
          case 'TH':
            result.country = 'Thailand';
            break;
          case 'VN':
            result.country = 'Vietnam';
            break;
          case 'LA':
            result.country = 'Laos';
            break;
          case 'KH':
            result.country = 'Cambodia';
            break;
          case 'MY':
            result.country = 'Malaysia';
            break;
          case 'SG':
            result.country = 'Singapore';
            break;
          case 'ID':
            result.country = 'Indonesia';
            break;
          case 'PH':
            result.country = 'Philippines';
            break;
          case 'BN':
            result.country = 'Brunei';
            break;
          case 'MM':
            result.country = 'Myanmar';
            break;
          case 'TL':
            result.country = 'East Timor';
            break;
          case 'NZ':
            result.country = 'New Zealand';
            break;
          case 'FJ':
            result.country = 'Fiji';
            break;
          case 'PG':
            result.country = 'Papua New Guinea';
            break;
          case 'SB':
            result.country = 'Solomon Islands';
            break;
          case 'VU':
            result.country = 'Vanuatu';
            break;
          case 'NC':
            result.country = 'New Caledonia';
            break;
          case 'PF':
            result.country = 'French Polynesia';
            break;
          case 'WS':
            result.country = 'Samoa';
            break;
          case 'TO':
            result.country = 'Tonga';
            break;
          case 'KI':
            result.country = 'Kiribati';
            break;
          case 'TV':
            result.country = 'Tuvalu';
            break;
          case 'NR':
            result.country = 'Nauru';
            break;
          case 'PW':
            result.country = 'Palau';
            break;
          case 'FM':
            result.country = 'Micronesia';
            break;
          case 'MH':
            result.country = 'Marshall Islands';
            break;
          case 'GT':
            result.country = 'Guatemala';
            break;
          case 'BZ':
            result.country = 'Belize';
            break;
          case 'SV':
            result.country = 'El Salvador';
            break;
          case 'HN':
            result.country = 'Honduras';
            break;
          case 'NI':
            result.country = 'Nicaragua';
            break;
          case 'CR':
            result.country = 'Costa Rica';
            break;
          case 'PA':
            result.country = 'Panama';
            break;
          case 'CU':
            result.country = 'Cuba';
            break;
          case 'JM':
            result.country = 'Jamaica';
            break;
          case 'HT':
            result.country = 'Haiti';
            break;
          case 'DO':
            result.country = 'Dominican Republic';
            break;
          case 'PR':
            result.country = 'Puerto Rico';
            break;
          case 'TT':
            result.country = 'Trinidad and Tobago';
            break;
          case 'BB':
            result.country = 'Barbados';
            break;
          case 'LC':
            result.country = 'Saint Lucia';
            break;
          case 'VC':
            result.country = 'Saint Vincent and the Grenadines';
            break;
          case 'GD':
            result.country = 'Grenada';
            break;
          case 'AG':
            result.country = 'Antigua and Barbuda';
            break;
          case 'KN':
            result.country = 'Saint Kitts and Nevis';
            break;
          case 'DM':
            result.country = 'Dominica';
            break;
          case 'BS':
            result.country = 'Bahamas';
            break;
          case 'AR':
            result.country = 'Argentina';
            break;
          case 'CL':
            result.country = 'Chile';
            break;
          case 'UY':
            result.country = 'Uruguay';
            break;
          case 'PY':
            result.country = 'Paraguay';
            break;
          case 'BO':
            result.country = 'Bolivia';
            break;
          case 'PE':
            result.country = 'Peru';
            break;
          case 'EC':
            result.country = 'Ecuador';
            break;
          case 'CO':
            result.country = 'Colombia';
            break;
          case 'VE':
            result.country = 'Venezuela';
            break;
          case 'GY':
            result.country = 'Guyana';
            break;
          case 'SR':
            result.country = 'Suriname';
            break;
          case 'GF':
            result.country = 'French Guiana';
            break;
          case 'ZA':
            result.country = 'South Africa';
            break;
          case 'EG':
            result.country = 'Egypt';
            break;
          case 'LY':
            result.country = 'Libya';
            break;
          case 'TN':
            result.country = 'Tunisia';
            break;
          case 'DZ':
            result.country = 'Algeria';
            break;
          case 'MA':
            result.country = 'Morocco';
            break;
          case 'SD':
            result.country = 'Sudan';
            break;
          case 'SS':
            result.country = 'South Sudan';
            break;
          case 'ET':
            result.country = 'Ethiopia';
            break;
          case 'ER':
            result.country = 'Eritrea';
            break;
          case 'DJ':
            result.country = 'Djibouti';
            break;
          case 'SO':
            result.country = 'Somalia';
            break;
          case 'KE':
            result.country = 'Kenya';
            break;
          case 'UG':
            result.country = 'Uganda';
            break;
          case 'TZ':
            result.country = 'Tanzania';
            break;
          case 'RW':
            result.country = 'Rwanda';
            break;
          case 'BI':
            result.country = 'Burundi';
            break;
          case 'MW':
            result.country = 'Malawi';
            break;
          case 'ZM':
            result.country = 'Zambia';
            break;
          case 'ZW':
            result.country = 'Zimbabwe';
            break;
          case 'BW':
            result.country = 'Botswana';
            break;
          case 'NA':
            result.country = 'Namibia';
            break;
          case 'SZ':
            result.country = 'Eswatini';
            break;
          case 'LS':
            result.country = 'Lesotho';
            break;
          case 'MG':
            result.country = 'Madagascar';
            break;
          case 'MU':
            result.country = 'Mauritius';
            break;
          case 'SC':
            result.country = 'Seychelles';
            break;
          case 'KM':
            result.country = 'Comoros';
            break;
          case 'YT':
            result.country = 'Mayotte';
            break;
          case 'RE':
            result.country = 'Réunion';
            break;
          case 'MZ':
            result.country = 'Mozambique';
            break;
          case 'AO':
            result.country = 'Angola';
            break;
          case 'CD':
            result.country = 'Democratic Republic of the Congo';
            break;
          case 'CG':
            result.country = 'Republic of the Congo';
            break;
          case 'CF':
            result.country = 'Central African Republic';
            break;
          case 'TD':
            result.country = 'Chad';
            break;
          case 'NE':
            result.country = 'Niger';
            break;
          case 'NG':
            result.country = 'Nigeria';
            break;
          case 'BJ':
            result.country = 'Benin';
            break;
          case 'TG':
            result.country = 'Togo';
            break;
          case 'GH':
            result.country = 'Ghana';
            break;
          case 'BF':
            result.country = 'Burkina Faso';
            break;
          case 'ML':
            result.country = 'Mali';
            break;
          case 'SN':
            result.country = 'Senegal';
            break;
          case 'GM':
            result.country = 'Gambia';
            break;
          case 'GW':
            result.country = 'Guinea-Bissau';
            break;
          case 'GN':
            result.country = 'Guinea';
            break;
          case 'SL':
            result.country = 'Sierra Leone';
            break;
          case 'LR':
            result.country = 'Liberia';
            break;
          case 'CI':
            result.country = 'Ivory Coast';
            break;
          case 'MR':
            result.country = 'Mauritania';
            break;
          case 'CV':
            result.country = 'Cape Verde';
            break;
          case 'ST':
            result.country = 'São Tomé and Príncipe';
            break;
          case 'GQ':
            result.country = 'Equatorial Guinea';
            break;
          case 'GA':
            result.country = 'Gabon';
            break;
          case 'CM':
            result.country = 'Cameroon';
            break;
          case 'SA':
            result.country = 'Saudi Arabia';
            break;
          case 'AE':
            result.country = 'United Arab Emirates';
            break;
          case 'QA':
            result.country = 'Qatar';
            break;
          case 'BH':
            result.country = 'Bahrain';
            break;
          case 'KW':
            result.country = 'Kuwait';
            break;
          case 'OM':
            result.country = 'Oman';
            break;
          case 'YE':
            result.country = 'Yemen';
            break;
          case 'IQ':
            result.country = 'Iraq';
            break;
          case 'SY':
            result.country = 'Syria';
            break;
          case 'LB':
            result.country = 'Lebanon';
            break;
          case 'JO':
            result.country = 'Jordan';
            break;
          case 'IL':
            result.country = 'Israel';
            break;
          case 'PS':
            result.country = 'Palestine';
            break;
          case 'IR':
            result.country = 'Iran';
            break;
          case 'IS':
            result.country = 'Iceland';
            break;
          case 'GL':
            result.country = 'Greenland';
            break;
          case 'FO':
            result.country = 'Faroe Islands';
            break;
          case 'SJ':
            result.country = 'Svalbard and Jan Mayen';
            break;
          case 'AD':
            result.country = 'Andorra';
            break;
          case 'MC':
            result.country = 'Monaco';
            break;
          case 'SM':
            result.country = 'San Marino';
            break;
          case 'VA':
            result.country = 'Vatican City';
            break;
          case 'LI':
            result.country = 'Liechtenstein';
            break;
          case 'AL':
            result.country = 'Albania';
            break;
          case 'MK':
            result.country = 'North Macedonia';
            break;
          case 'RS':
            result.country = 'Serbia';
            break;
          case 'ME':
            result.country = 'Montenegro';
            break;
          case 'BA':
            result.country = 'Bosnia and Herzegovina';
            break;
          case 'XK':
            result.country = 'Kosovo';
            break;
        }
        countryIndex = i;
      }
      
      // Campaign type detection
      if (['CPA', 'CPI', 'CPE', 'CPM', 'CPC'].includes(part)) {
        result.campaignType = part;
        campaignTypeIndex = i;
      }
    }

    // Extract ad network (usually the last part, but avoid known platform/country/type parts)
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      // If last part is not a known platform/country/type, use it as adnetwork
      if (!['AND', 'iOS', 'GP', 'US', 'UK', 'TR', 'DE', 'FR', 'CPA', 'CPI', 'CPE', 'CPM', 'CPC'].includes(lastPart)) {
        result.adnetwork = lastPart;
      } else {
        // Look for adnetwork in other positions
        for (let i = parts.length - 2; i >= 0; i--) {
          const part = parts[i];
          if (i !== platformIndex && i !== countryIndex && i !== campaignTypeIndex && 
              !['AppSa', 'App', parts[1]].includes(part)) { // Skip known prefixes and game names
            result.adnetwork = part;
            break;
          }
        }
      }
    }
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
  // First try to get platform from app name
  if (app.toLowerCase().includes('android')) return 'Android';
  if (app.toLowerCase().includes('ios')) return 'iOS';
  
  // Use the improved parseCampaignNetwork function for consistency
  if (campaignNetwork && campaignNetwork !== 'unknown' && campaignNetwork !== 'Unknown') {
    const parsed = parseCampaignNetwork(campaignNetwork);
    if (parsed.platform !== 'Unknown') {
      return parsed.platform;
    }
  }
  
  // Try to extract platform from campaign network patterns
  if (campaignNetwork.includes('-iOS-')) return 'iOS';
  if (campaignNetwork.includes('-Android-')) return 'Android';
  
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

// Global array to track undecoded codes
let undecodedCodes: string[] = [];

// Function to get undecoded codes for debugging
export function getUndecodedCodes(): string[] {
  return [...undecodedCodes];
}

// Function to clear undecoded codes
export function clearUndecodedCodes(): void {
  undecodedCodes = [];
}

// Decode ad network codes using the latest Adnetworks.csv mapping
export function decodeAdNetwork(encryptedCode: string): string {
  if (!encryptedCode || encryptedCode.toLowerCase() === 'unknown') return 'Unknown';
  
  // Clean up the input - remove ,undefined and other artifacts
  let cleanCode = encryptedCode.trim();
  if (cleanCode.includes(',undefined')) {
    cleanCode = cleanCode.split(',undefined')[0];
  }
  if (cleanCode.includes(',')) {
    cleanCode = cleanCode.split(',')[0];
  }
  
  // Handle special cases first
  if (cleanCode === 'unknown') return 'Test';
  if (cleanCode === 'test') return 'Test';
  
  // Ad network mapping from Adnetworks.csv - ONLY S CODES + TEST + PTSDK_ADVN
  const adNetworkMap: Record<string, string> = {
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
    'PTSDK_ADVN': 'AppsPrize',
    'SIE': 'Influence Mobile',
    'SAM': 'ATM',
    'SCE': 'Catbyte',
    'SEZ': 'Efez',
    'SJK': 'JumpTask API',
    'SWK': 'AppsPrize',
    'SBL': 'Buzzvil',
    'SAS': 'Ad for Us',
    'SMN': 'Mode Earn App',
    'SRY': 'Rewardy',
    'STS': 'TapChamps',
    'SAT': 'AppQwest'
  };
  
  // Special case: SFT_ prefix should always map to Fluent
  if (cleanCode.startsWith('SFT_')) {
    return 'Fluent';
  }
  
  // Special case: SIE_ prefix should always map to Influence Mobile
  if (cleanCode.startsWith('SIE_')) {
    return 'Influence Mobile';
  }
  
  // Special case: dX prefix should always map to Influence Mobile
  if (cleanCode.startsWith('dX')) {
    return 'Influence Mobile';
  }
  
  // Special case: MT prefix should always map to Fluent
  if (cleanCode.startsWith('MT')) {
    return 'Fluent';
  }
  
  // Special case: Numeric patterns like "48591_208110", "34631_", "34631_206305", etc. should map to Fluent
  if (/^\d+_/.test(cleanCode)) {
    return 'Fluent';
  }
  
  // Special case: str_ prefix should always map to TradeDoubler
  if (cleanCode.startsWith('str_')) {
    return 'TradeDoubler';
  }
  
  // Prefix-based decoding for base64 codes
  const prefixMappings: Record<string, string> = {
    'aj': 'Prodege ySense iFrame',
    'OW': 'Catbyte',
    'Nj': 'AppsPrize',
    'cG': 'TradeDoubler',
    'd0': 'Versemedia',
    'd3': 'Fyber',
    'Zl': 'Prodege Inbox Dollar iFrame',
    'S2': 'Klink',
    'SAT': 'AppQwest'
  };
  
  // Check for prefix matches
  for (const [prefix, adNetwork] of Object.entries(prefixMappings)) {
    if (cleanCode.startsWith(prefix)) {
      return adNetwork;
    }
  }
  
  // NEW: Check for ad network suffixes in campaign names
  // This handles cases like "BTA_US_CPI_W_A25_SCE" where SCE is the ad network
  const suffixMappings: Record<string, string> = {
    'SCE': 'Catbyte',
    'SFT': 'Fluent',
    'SPE': 'Prime',
    'SDA': 'Dynata',
    'SAP': 'Ad it Up',
    'SKK': 'Klink',
    'STK': 'TNK',
    'SEA': 'Eneba',
    'SIE': 'Influence Mobile',
    'SAM': 'ATM',
    'TBSDK': 'TBSDK',
    'SPL': 'Playwell',
    'PTSDK': 'AppsPrize'
  };
  
  // Check if the code ends with any known ad network suffix
  for (const [suffix, realName] of Object.entries(suffixMappings)) {
    if (cleanCode.endsWith(`_${suffix}`) || cleanCode.endsWith(suffix)) {
      return realName;
    }
  }
  
  // Extract prefix and match
  for (const [prefix, realName] of Object.entries(adNetworkMap)) {
    if (cleanCode.startsWith(prefix)) {
      return realName;
    }
  }
  
  // Track undecoded codes for debugging
  if (!undecodedCodes.includes(cleanCode)) {
    undecodedCodes.push(cleanCode);
  }
  
  // Return original if no match found
  return cleanCode;
}

// Decode publisher codes from adgroup_network (C column) - keep unrecognized codes as-is
export function decodePublisherCode(adgroupNetwork: string): string {
  if (!adgroupNetwork || adgroupNetwork.toLowerCase() === 'unknown') return 'Unknown';
  
  // Clean up the input - remove ,undefined and other artifacts
  let cleanCode = adgroupNetwork.trim();
  if (cleanCode.includes(',undefined')) {
    cleanCode = cleanCode.split(',undefined')[0];
  }
  if (cleanCode.includes(',')) {
    cleanCode = cleanCode.split(',')[0];
  }
  
  const code = cleanCode.toUpperCase();
  
  // Known publisher mappings - only decode what we're sure about
  const knownMappings: Record<string, string> = {
    // Base64 decoded mappings
    'VGVzdA==': 'Test',
    'QWQgaXQgdXA=': 'Ad it up', 
    'Q29wcGVy': 'Copper',
    'RHluYXRh': 'Dynata',
    'SXJvblNvdXJjZQ==': 'IronSource',
    'VW5pdHk=': 'Unity',
    'QWRNb2I=': 'AdMob',
    'RmFjZWJvb2s=': 'Facebook',
    'QXBwTG92aW4=': 'AppLovin',
    
    // Direct codes
    'TEST': 'Test',
    'UNKNOWN': 'Unknown',
    
    // Specific SFT codes that appear in the data
    'SFT_34631_5406': 'Fluent',
    'SFT_45209_5406': 'Fluent'
  };

  // Check direct mappings first
  if (knownMappings[code] || knownMappings[adgroupNetwork]) {
    return knownMappings[code] || knownMappings[adgroupNetwork];
  }

  // Special case: SFT_ prefix should always map to Fluent
  if (cleanCode.startsWith('SFT_')) {
    return 'Fluent';
  }
  
  // Special case: dX prefix should always map to Influence Mobile
  if (cleanCode.startsWith('dX')) {
    return 'Influence Mobile';
  }
  
  // Special case: MT prefix should always map to Fluent
  if (cleanCode.startsWith('MT')) {
    return 'Fluent';
  }
  
  // Handle prefix formats like SFT_, SPE_, SAP_, LV9U_
  if (cleanCode.includes('_')) {
    const parts = cleanCode.split('_');
    const prefix = parts[0];
    
    // Known prefix mappings - map to actual decoded names from Adnetworks.csv
    const knownPrefixes: Record<string, string> = {
      'SFT': 'Fluent',  // SFT maps to Fluent according to Adnetworks.csv
      'SPE': 'Prime',   // SPE maps to Prime according to Adnetworks.csv
      'SAP': 'Ad it Up', // SAP maps to Ad it Up according to Adnetworks.csv
      'SDA': 'Dynata',  // SDA maps to Dynata according to Adnetworks.csv
      'SKK': 'Klink',   // SKK maps to Klink according to Adnetworks.csv
      'STK': 'TNK',     // STK maps to TNK according to Adnetworks.csv
      'SEA': 'Eneba',   // SEA maps to Eneba according to Adnetworks.csv
      'SIE': 'Influence Mobile', // SIE maps to Influence Mobile according to Adnetworks.csv
      'MT': 'Fluent'    // MT maps to Fluent according to Adnetworks.csv
    };
    
    if (knownPrefixes[prefix]) {
      return knownPrefixes[prefix];
    }
  }

  // Try base64 decoding only for clear base64 patterns
  if (adgroupNetwork.length > 8 && /^[A-Za-z0-9+/]+=*$/.test(adgroupNetwork)) {
    try {
      const decoded = atob(adgroupNetwork);
      if (decoded && decoded.length > 0 && /^[a-zA-Z0-9\s\-_.]+$/.test(decoded)) {
        return decoded;
      }
    } catch {
      // Base64 decode failed, keep original
    }
  }
  
  // IMPORTANT: Keep unrecognized codes as-is (this is what user wants)
  return cleanCode;
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
      return country === 'Unknown' ? 'Global' : country;
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
    
    // Handle decoded ad network names - normalize case for consistency
    const decodedAdNetworks = ['Copper', 'Prime', 'Fluent', 'Dynata', 'Ad it Up', 'Klink', 'TNK', 'Eneba', 'Test', 'Playwell', 'AppsPrize', 'Ayet Studios', 'EmberFund', 'Lootably', 'RePocket', 'Ad for Us', 'Buzzvil', 'TapChamps', 'ATM', 'Poikey', 'Rewardy', 'Hopi S2S', 'Mode Earn App', 'Influence Mobile', 'Catbyte', 'Efez', 'sMiles', 'Jumptask iFrame', 'JumpTask API', 'Prodege Swagbucks iFrame', 'TradeDoubler', 'catbyte', 'Versemedia', 'Prodege Inbox Dollar iFrame', 'Fyber', 'Prodege ySense iFrame'];
    
    // Case-insensitive matching for known ad networks
    const normalizedInput = publisherRaw.toLowerCase();
    const matchedNetwork = decodedAdNetworks.find(network => 
      network.toLowerCase() === normalizedInput
    );
    
    if (matchedNetwork) {
      return matchedNetwork; // Return the properly capitalized version
    }
    
    // Handle prefix patterns for raw codes - but check if the prefix itself can be decoded
    const match = publisherRaw.match(/^([A-Za-z]{3})_/);
    if (match) {
      const prefix = match[1];
      const decodedPrefix = decodeAdNetwork(prefix);
      // If the prefix itself decodes to a known ad network, return the decoded name
      if (decodedAdNetworks.includes(decodedPrefix)) {
        return decodedPrefix;
      }
      return `${prefix}_`;
    }
    
    return publisherRaw;
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
    
    // Publisher comes from decoded adgroup_network, then normalized by known prefixes (e.g., SFT_, SDA_) to combine tables
    const decodedAdgroupNetwork = decodeAdNetwork(row.adgroup_network || 'Unknown');
    const publisher = normalizePublisher(decodedAdgroupNetwork);
    
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
