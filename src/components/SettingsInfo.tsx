
import { Badge } from './ui/badge';
import type { SettingsData } from './SettingsPanel';

interface SettingsInfoProps {
  settings: SettingsData;
}

const COLUMN_LABELS = {
  installs: 'Install',
  roas_d7: 'ROAS D7',
  roas_d30: 'ROAS D30',
};

const OPERATOR_LABELS = {
  '>': '>',
  '>=': '≥',
  '<': '<',
  '<=': '≤',
  '=': '=',
};

export function SettingsInfo({ settings }: SettingsInfoProps) {
  const activeRules = settings.conditionalRules.filter(rule => rule.isActive);
  
  if (activeRules.length === 0 && !settings.dateRange.startDate && !settings.dateRange.endDate) {
    return null;
  }

  return (
    <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-muted-foreground">Aktif Ayarlar:</span>
        
        {/* Date Range Info */}
        {(settings.dateRange.startDate || settings.dateRange.endDate) && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            📅 {settings.dateRange.startDate || '?'} - {settings.dateRange.endDate || '?'}
          </Badge>
        )}
        
        {/* Conditional Rules Info */}
        {activeRules.map((rule) => (
          <Badge 
            key={rule.id} 
            variant="outline" 
            className="border-2"
            style={{ 
              borderColor: rule.color, 
              backgroundColor: rule.backgroundColor,
              color: rule.color,
            }}
          >
            {COLUMN_LABELS[rule.column as keyof typeof COLUMN_LABELS]} {OPERATOR_LABELS[rule.operator]} {rule.value}
          </Badge>
        ))}
        
        {activeRules.length === 0 && (settings.dateRange.startDate || settings.dateRange.endDate) && (
          <span className="text-xs text-muted-foreground">Sadece tarih filtresi aktif</span>
        )}
      </div>
    </div>
  );
}
