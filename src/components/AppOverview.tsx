import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { AppSummary } from "@/types"

interface AppOverviewProps {
  apps: AppSummary[];
}

export function AppOverview({ apps }: AppOverviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>App Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {apps.map((app, index) => (
            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">{app.app}</h3>
                  <div className="flex gap-1">
                    {app.platforms.map((platform) => (
                      <Badge key={platform} variant="outline" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Total Installs:</span> {app.totalInstalls.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Last Update:</span> {app.lastUpdate}
                  </div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="text-sm">
                  <span className="text-muted-foreground">ROAS D7:</span>
                  <span className="ml-2 font-semibold">{(app.avgRoasD7 * 100).toFixed(1)}%</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">ROAS D30:</span>
                  <span className="ml-2 font-semibold">{(app.avgRoasD30 * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
