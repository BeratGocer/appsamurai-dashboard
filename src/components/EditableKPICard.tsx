
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { KPICardConfig, KPIValue } from '@/types';

interface EditableKPICardProps {
  config: KPICardConfig;
  value: KPIValue;
  onEdit?: () => void;
  isEditMode?: boolean;
}

export function EditableKPICard({ config, value, onEdit, isEditMode = false }: EditableKPICardProps) {
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
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold">{value.formatted}</div>
          {value.trend && (
            <div className={`text-sm font-medium flex items-center gap-1 ${trendColor}`}>
              <span>{trendIcon}</span>
            </div>
          )}
        </div>
        {config.description && (
          <p className={`text-xs mt-1 ${trendColor}`}>
            {config.description}
          </p>
        )}
        {isEditMode && (
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <div>Column: {config.column}</div>
            <div>Type: {config.calculationType}</div>
            <div>Format: {config.format}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
