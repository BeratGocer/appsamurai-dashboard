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
function decodeAdNetwork(code: string): string {
  if (!code) return code;
  
  const cleanCode = code.trim().toUpperCase();
  
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
    'SEZ': 'Efez',
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
    'SER': 'EmberFund'
  };
  
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
    'MTkwMzZ8': 'Fluent'
  };
  
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
    'PTSDK_H_NTG4': 'AppsPrize'
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
  
  // PTSDK prefix kontrolü
  if (cleanCode.startsWith('PTSDK_')) {
    return 'AppsPrize';
  }
  
  // Sayı_sayı formatı kontrolü (örn: 34631_200222) - hepsi Fluent
  if (/^\d+_\d+$/.test(cleanCode)) {
    return 'Fluent';
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
      } else if (['AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY', 'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'].includes(part)) {
        // Use comprehensive country mapping
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
          'BA': 'Bosnia and Herzegovina', 'XK': 'Kosovo'
        };
        
        result.country = countryMapping[part.toUpperCase()] || part.toUpperCase();
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
    'UNKNOWN_CODE', 'TEST123', 'RANDOM'
  ];
  
  testCases.forEach(code => {
    const decoded = decodeAdNetwork(code);
    console.log(`${code} → ${decoded}`);
  });
  
  console.log('=== Test Complete ===');
}
