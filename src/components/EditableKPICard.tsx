
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KPICardConfig, KPIValue } from '@/types';

interface EditableKPICardProps {
  config: KPICardConfig;
  value: KPIValue;
  onEdit?: () => void;
  isEditMode?: boolean;
  trendData?: Array<{ date: string; value: number }>; // Mini grafik için trend verisi
  trendPercentage?: number; // Trend yüzdesi
  trendPeriod?: string; // Trend periyodu (örn: "from last month")
}

export function EditableKPICard({ 
  config, 
  value, 
  onEdit, 
  isEditMode = false,
  trendData = [],
  trendPercentage,
  trendPeriod = "from last month"
}: EditableKPICardProps) {
  if (!config.isVisible) return null;

  const trendColor = {
    up: "text-green-600",
    down: "text-red-600",
    neutral: "text-gray-600"
  }[value.trend || "neutral"];

  const trendIcon = {
    up: "↗",
    down: "↘",
    neutral: "→"
  }[value.trend || "neutral"];

  // Mini grafik için SVG oluştur
  const renderMiniChart = () => {
    if (!trendData || trendData.length < 2) return null;

    const width = 60;
    const height = 30;
    const padding = 4;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Veri değerlerini normalize et
    const values = trendData.map(d => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // SVG path oluştur
    const points = trendData.map((point, index) => {
      const x = padding + (index / (trendData.length - 1)) * chartWidth;
      const y = padding + chartHeight - ((point.value - minValue) / valueRange) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    const pathData = `M ${points}`;

    return (
      <svg width={width} height={height} className="flex-shrink-0">
        <defs>
          <linearGradient id={`gradient-${config.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          d={pathData}
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          className={trendColor}
        />
        <path
          d={`${pathData} L ${points.split(' ').pop()?.split(',')[0]},${height - padding} L ${points.split(' ')[0].split(',')[0]},${height - padding} Z`}
          fill={`url(#gradient-${config.id})`}
          className={trendColor}
        />
      </svg>
    );
  };

  return (
    <Card 
      className={`h-full transition-all duration-200 ${
        isEditMode 
          ? 'cursor-pointer hover:shadow-lg hover:scale-105 border-dashed border-2' 
          : ''
      }`}
      onClick={isEditMode ? onEdit : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {config.title}
          {isEditMode && (
            <span className="ml-2 text-xs text-muted-foreground">
              (Click to edit)
            </span>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          {config.badge && <Badge variant="secondary">{config.badge}</Badge>}
          {isEditMode && (
            <Badge variant="outline" className="text-xs">
              {config.calculationType}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Ana metrik */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{value.formatted}</div>
            {value.trend && (
              <div className={`text-sm font-medium flex items-center gap-1 ${trendColor}`}>
                <span>{trendIcon}</span>
              </div>
            )}
          </div>

          {/* Trend bilgisi */}
          {trendPercentage !== undefined && (
            <div className="flex items-center justify-between">
              <div className={`text-sm font-medium flex items-center gap-1 ${trendColor}`}>
                <span>{trendIcon}</span>
                <span>{Math.abs(trendPercentage).toFixed(1)}%</span>
                <span className="text-muted-foreground text-xs">{trendPeriod}</span>
              </div>
              {renderMiniChart()}
            </div>
          )}

          {/* Açıklama */}
          {config.description && (
            <p className={`text-xs ${trendColor}`}>
              {config.description}
            </p>
          )}

          {/* Edit modu bilgileri */}
          {isEditMode && (
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              <div>Column: {config.column}</div>
              <div>Type: {config.calculationType}</div>
              <div>Format: {config.format}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
