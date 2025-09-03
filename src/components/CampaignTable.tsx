import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CampaignData } from "@/types"

interface CampaignTableProps {
  campaigns: CampaignData[];
  title: string;
}

export function CampaignTable({ campaigns, title }: CampaignTableProps) {
  const getPlatform = (app: string) => {
    if (app.toLowerCase().includes('android')) return 'Android';
    if (app.toLowerCase().includes('ios')) return 'iOS';
    return 'Unknown';
  };

  const getPerformanceBadge = (roas: number) => {
    if (roas >= 0.5) return { variant: "default" as const, label: "Excellent" };
    if (roas >= 0.3) return { variant: "secondary" as const, label: "Good" };
    if (roas >= 0.1) return { variant: "outline" as const, label: "Average" };
    return { variant: "destructive" as const, label: "Poor" };
  };

  const getProfitBadge = (profit: number) => {
    if (profit > 100) return { variant: "default" as const, label: "High Profit" };
    if (profit > 0) return { variant: "secondary" as const, label: "Profitable" };
    if (profit > -50) return { variant: "outline" as const, label: "Low Loss" };
    return { variant: "destructive" as const, label: "High Loss" };
  };

  const getRetentionBadge = (retention: number) => {
    if (retention > 0.15) return { variant: "default" as const, label: "Excellent" };
    if (retention > 0.1) return { variant: "secondary" as const, label: "Good" };
    if (retention > 0.05) return { variant: "outline" as const, label: "Average" };
    return { variant: "destructive" as const, label: "Poor" };
  };

  // Check if we have detailed data
  const hasDetailedData = campaigns.length > 0 && campaigns.some(c => c.adjust_cost !== undefined);
  const hasRetentionData = campaigns.length > 0 && campaigns.some(c => c.retention_rate_d7 !== undefined);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>App</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Installs</TableHead>
              {hasDetailedData && <TableHead className="text-right">Cost</TableHead>}
              {hasDetailedData && <TableHead className="text-right">Revenue</TableHead>}
              {hasDetailedData && <TableHead className="text-right">Profit</TableHead>}
              {hasDetailedData && <TableHead className="text-right">eCPI</TableHead>}
              <TableHead className="text-right">ROAS D7</TableHead>
              <TableHead className="text-right">ROAS D30</TableHead>
              {hasRetentionData && <TableHead className="text-right">Retention D7</TableHead>}
              <TableHead>Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map((campaign, index) => {
              const platform = getPlatform(campaign.app);
              const badge = getPerformanceBadge(campaign.roas_d7);
              const profitBadge = hasDetailedData ? getProfitBadge(campaign.gross_profit || 0) : null;
              const retentionBadge = hasRetentionData ? getRetentionBadge(campaign.retention_rate_d7 || 0) : null;
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {campaign.app.replace(' Android', '').replace(' iOS', '')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{platform}</Badge>
                  </TableCell>
                  <TableCell>{campaign.day}</TableCell>
                  <TableCell className="text-right">{campaign.installs.toLocaleString()}</TableCell>
                  {hasDetailedData && (
                    <TableCell className="text-right font-mono">
                      ${(campaign.adjust_cost || 0).toLocaleString()}
                    </TableCell>
                  )}
                  {hasDetailedData && (
                    <TableCell className="text-right font-mono">
                      ${(campaign.ad_revenue || 0).toLocaleString()}
                    </TableCell>
                  )}
                  {hasDetailedData && (
                    <TableCell className={`text-right font-mono ${(campaign.gross_profit || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${(campaign.gross_profit || 0).toLocaleString()}
                    </TableCell>
                  )}
                  {hasDetailedData && (
                    <TableCell className="text-right font-mono">
                      ${(campaign.ecpi || 0).toFixed(2)}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono">
                    {campaign.roas_d7.toFixed(3)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {campaign.roas_d30 > 0 ? campaign.roas_d30.toFixed(3) : '-'}
                  </TableCell>
                  {hasRetentionData && (
                    <TableCell className="text-right font-mono">
                      {((campaign.retention_rate_d7 || 0) * 100).toFixed(1)}%
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                      {profitBadge && <Badge variant={profitBadge.variant} className="text-xs">{profitBadge.label}</Badge>}
                      {retentionBadge && <Badge variant={retentionBadge.variant} className="text-xs">{retentionBadge.label}</Badge>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
