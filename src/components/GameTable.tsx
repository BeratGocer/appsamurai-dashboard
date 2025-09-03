import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { parseCampaignNetwork, getUniquePlatforms, getUniqueAdNetworks } from '@/utils/csvParser'
import type { CampaignData } from '@/types'
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface GameTableProps {
  data: CampaignData[];
  title?: string;
}

interface DailyData {
  date: string;
  installs: number;
  roas_d0: number;
  roas_d7: number;
  roas_d14: number;
  roas_d30: number;
}

interface GameSummary {
  game: string;
  platform: string;
  adnetwork: string;
  country: string;
  dailyData: DailyData[];
  totalInstalls: number;
  avgRoasD0: number;
  avgRoasD7: number;
  avgRoasD14: number;
  avgRoasD30: number;
  trend: {
    installs: number;
    roasD0: number;
    roasD7: number;
    roasD14: number;
  };
}

export function GameTable({ data }: GameTableProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedAdNetwork, setSelectedAdNetwork] = useState<string | null>(null);

  // Get unique values for filters
  const platforms = getUniquePlatforms(data);
  // const countries = getUniqueCountries(data);
  const adNetworks = getUniqueAdNetworks(data);
  const games = [...new Set(data.map(row => row.app.replace(' Android', '').replace(' iOS', '')))];

  // Process data to create game summaries
  const gameSummaries = useMemo(() => {
    const gameMap = new Map<string, GameSummary>();

    data.forEach(row => {
      const parsed = parseCampaignNetwork(row.campaign_network);
      const gameName = row.app.replace(' Android', '').replace(' iOS', '');
      const key = `${gameName}-${parsed.platform}-${parsed.adnetwork}-${parsed.country}`;

      if (!gameMap.has(key)) {
        gameMap.set(key, {
          game: gameName,
          platform: parsed.platform,
          adnetwork: parsed.adnetwork,
          country: parsed.country,
          dailyData: [],
          totalInstalls: 0,
          avgRoasD0: 0,
          avgRoasD7: 0,
          avgRoasD14: 0,
          avgRoasD30: 0,
          trend: { installs: 0, roasD0: 0, roasD7: 0, roasD14: 0 }
        });
      }

      const summary = gameMap.get(key)!;
      summary.dailyData.push({
        date: row.day,
        installs: row.installs,
        roas_d0: row.roas_d0,
        roas_d7: row.roas_d7,
        roas_d14: row.roas_d14,
        roas_d30: row.roas_d30 || 0
      });
    });

    // Calculate averages and trends for each game
    gameMap.forEach(summary => {
      summary.dailyData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      summary.totalInstalls = summary.dailyData.reduce((sum, day) => sum + day.installs, 0);
      
      const validRoasD0 = summary.dailyData.filter(d => d.roas_d0 > 0);
      const validRoasD7 = summary.dailyData.filter(d => d.roas_d7 > 0);
      const validRoasD14 = summary.dailyData.filter(d => d.roas_d14 > 0);
      const validRoasD30 = summary.dailyData.filter(d => d.roas_d30 > 0);

      summary.avgRoasD0 = validRoasD0.length > 0 ? validRoasD0.reduce((sum, d) => sum + d.roas_d0, 0) / validRoasD0.length : 0;
      summary.avgRoasD7 = validRoasD7.length > 0 ? validRoasD7.reduce((sum, d) => sum + d.roas_d7, 0) / validRoasD7.length : 0;
      summary.avgRoasD14 = validRoasD14.length > 0 ? validRoasD14.reduce((sum, d) => sum + d.roas_d14, 0) / validRoasD14.length : 0;
      summary.avgRoasD30 = validRoasD30.length > 0 ? validRoasD30.reduce((sum, d) => sum + d.roas_d30, 0) / validRoasD30.length : 0;

      // Calculate trends (simple linear trend)
      if (summary.dailyData.length > 1) {
        const firstHalf = summary.dailyData.slice(0, Math.floor(summary.dailyData.length / 2));
        const secondHalf = summary.dailyData.slice(Math.floor(summary.dailyData.length / 2));
        
        const firstAvgInstalls = firstHalf.reduce((sum, d) => sum + d.installs, 0) / firstHalf.length;
        const secondAvgInstalls = secondHalf.reduce((sum, d) => sum + d.installs, 0) / secondHalf.length;
        summary.trend.installs = secondAvgInstalls - firstAvgInstalls;

        const firstAvgRoasD0 = firstHalf.reduce((sum, d) => sum + d.roas_d0, 0) / firstHalf.length;
        const secondAvgRoasD0 = secondHalf.reduce((sum, d) => sum + d.roas_d0, 0) / secondHalf.length;
        summary.trend.roasD0 = secondAvgRoasD0 - firstAvgRoasD0;

        const firstAvgRoasD7 = firstHalf.reduce((sum, d) => sum + d.roas_d7, 0) / firstHalf.length;
        const secondAvgRoasD7 = secondHalf.reduce((sum, d) => sum + d.roas_d7, 0) / secondHalf.length;
        summary.trend.roasD7 = secondAvgRoasD7 - firstAvgRoasD7;

        const firstAvgRoasD14 = firstHalf.reduce((sum, d) => sum + d.roas_d14, 0) / firstHalf.length;
        const secondAvgRoasD14 = secondHalf.reduce((sum, d) => sum + d.roas_d14, 0) / secondHalf.length;
        summary.trend.roasD14 = secondAvgRoasD14 - firstAvgRoasD14;
      }
    });

    // Sort by app + country + platform + adnetwork for proper grouping
    return Array.from(gameMap.values()).sort((a, b) => {
      // Primary: Game name
      if (a.game !== b.game) return a.game.localeCompare(b.game);
      // Secondary: Country 
      if (a.country !== b.country) return a.country.localeCompare(b.country);
      // Tertiary: Platform
      if (a.platform !== b.platform) return a.platform.localeCompare(b.platform);
      // Quaternary: AdNetwork - this creates the "different adnetworks" grouping
      return a.adnetwork.localeCompare(b.adnetwork);
    });
  }, [data]);

  // Filter summaries based on selections
  const filteredSummaries = useMemo(() => {
    return gameSummaries.filter(summary => {
      if (selectedGame && summary.game !== selectedGame) return false;
      if (selectedPlatform && summary.platform !== selectedPlatform) return false;
      if (selectedAdNetwork && summary.adnetwork !== selectedAdNetwork) return false;
      return true;
    });
  }, [gameSummaries, selectedGame, selectedPlatform, selectedAdNetwork]);

  const getRoasColor = (roas: number) => {
    if (roas >= 0.7) return 'text-green-600 bg-green-50';
    if (roas >= 0.4) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0.01) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < -0.01) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Game</label>
              <select 
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedGame || ''}
                onChange={(e) => setSelectedGame(e.target.value || null)}
              >
                <option value="">All Games</option>
                {games.map(game => (
                  <option key={game} value={game}>{game}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Platform</label>
              <select 
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedPlatform || ''}
                onChange={(e) => setSelectedPlatform(e.target.value || null)}
              >
                <option value="">All Platforms</option>
                {platforms.map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Ad Network</label>
              <select 
                className="w-full mt-1 p-2 border rounded-md"
                value={selectedAdNetwork || ''}
                onChange={(e) => setSelectedAdNetwork(e.target.value || null)}
              >
                <option value="">All Ad Networks</option>
                {adNetworks.map(adNetwork => (
                  <option key={adNetwork} value={adNetwork}>{adNetwork}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="text-sm">
                {filteredSummaries.length} combinations
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Game Tables */}
      {filteredSummaries.map((summary) => (
        <Card key={`${summary.game}-${summary.platform}-${summary.adnetwork}-${summary.country}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span>{summary.game}</span>
                <Badge variant="outline">{summary.platform}</Badge>
                <Badge variant="outline">{summary.adnetwork}</Badge>
                <Badge variant="outline">{summary.country}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {summary.dailyData.length} days of data
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-muted p-3 rounded">
                <div className="text-lg font-bold">{summary.totalInstalls.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Installs</div>
                <div className="flex items-center mt-1">
                  {getTrendIcon(summary.trend.installs)}
                  <span className="text-xs ml-1">{summary.trend.installs.toFixed(1)}</span>
                </div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className={`text-lg font-bold ${getRoasColor(summary.avgRoasD0)}`}>
                  {(summary.avgRoasD0 * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg D0 ROAS</div>
                <div className="flex items-center mt-1">
                  {getTrendIcon(summary.trend.roasD0)}
                  <span className="text-xs ml-1">{(summary.trend.roasD0 * 100).toFixed(2)}%</span>
                </div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className={`text-lg font-bold ${getRoasColor(summary.avgRoasD7)}`}>
                  {(summary.avgRoasD7 * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg D7 ROAS</div>
                <div className="flex items-center mt-1">
                  {getTrendIcon(summary.trend.roasD7)}
                  <span className="text-xs ml-1">{(summary.trend.roasD7 * 100).toFixed(2)}%</span>
                </div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className={`text-lg font-bold ${getRoasColor(summary.avgRoasD14)}`}>
                  {(summary.avgRoasD14 * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg D14 ROAS</div>
                <div className="flex items-center mt-1">
                  {getTrendIcon(summary.trend.roasD14)}
                  <span className="text-xs ml-1">{(summary.trend.roasD14 * 100).toFixed(2)}%</span>
                </div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className={`text-lg font-bold ${getRoasColor(summary.avgRoasD30)}`}>
                  {(summary.avgRoasD30 * 100).toFixed(2)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg D30 ROAS</div>
              </div>
              <div className="bg-muted p-3 rounded">
                <div className="text-lg font-bold">
                  {summary.dailyData.length > 0 ? 
                    new Date(summary.dailyData[summary.dailyData.length - 1].date).toLocaleDateString() : 
                    'N/A'
                  }
                </div>
                <div className="text-sm text-muted-foreground">Last Update</div>
              </div>
            </div>

            {/* Daily Data Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Installs</TableHead>
                  <TableHead>D0 ROAS</TableHead>
                  <TableHead>D7 ROAS</TableHead>
                  <TableHead>D14 ROAS</TableHead>
                  <TableHead>D30 ROAS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.dailyData.map((day) => (
                  <TableRow key={day.date}>
                    <TableCell>{new Date(day.date).toLocaleDateString()}</TableCell>
                    <TableCell>{day.installs.toLocaleString()}</TableCell>
                    <TableCell className={getRoasColor(day.roas_d0)}>
                      {(day.roas_d0 * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className={getRoasColor(day.roas_d7)}>
                      {(day.roas_d7 * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className={getRoasColor(day.roas_d14)}>
                      {(day.roas_d14 * 100).toFixed(2)}%
                    </TableCell>
                    <TableCell className={getRoasColor(day.roas_d30)}>
                      {(day.roas_d30 * 100).toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

