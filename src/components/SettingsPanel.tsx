import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Settings, Calendar, Palette, Plus, X, Eye, EyeOff } from 'lucide-react';

export interface ConditionalFormattingRule {
  id: string;
  column: string; // Now supports any column from CSV
  operator: '<' | '>' | '>=' | '<=' | '=';
  value: number;
  color: string;
  backgroundColor: string;
  isActive: boolean;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface SettingsData {
  dateRange: DateRange;
  conditionalRules: ConditionalFormattingRule[];
  visibleColumns?: string[];
}

export interface HiddenTable {
  id: string;
  game: string;
  country: string;
  platform: string;
  publisher: string;
}

interface SettingsPanelProps {
  settings: SettingsData;
  onSettingsChange: (settings: SettingsData) => void;
  isOpen: boolean;
  onToggle: () => void;
  hiddenTables?: HiddenTable[];
  onTableVisibilityChange?: (tableId: string, isHidden: boolean) => void;
  availableColumns?: string[];
}

const COLOR_PRESETS = [
  { name: 'Yeşil', color: '#16a34a', backgroundColor: '#dcfce7' },
  { name: 'Kırmızı', color: '#dc2626', backgroundColor: '#fee2e2' },
  { name: 'Sarı', color: '#ca8a04', backgroundColor: '#fef3c7' },
  { name: 'Mavi', color: '#2563eb', backgroundColor: '#dbeafe' },
  { name: 'Mor', color: '#9333ea', backgroundColor: '#f3e8ff' },
  { name: 'Turuncu', color: '#ea580c', backgroundColor: '#fed7aa' },
  { name: 'Pembe', color: '#db2777', backgroundColor: '#fce7f3' },
  { name: 'Gri', color: '#6b7280', backgroundColor: '#f3f4f6' },
];

// Column labels for dynamic support
const COLUMN_LABELS: Record<string, string> = {
  installs: 'Install',
  roas_d0: 'D0',
  roas_d1: 'D1',
  roas_d2: 'D2',
  roas_d3: 'D3',
  roas_d4: 'D4',
  roas_d5: 'D5',
  roas_d6: 'D6',
  roas_d7: 'D7',
  roas_d14: 'D14',
  roas_d21: 'D21',
  roas_d30: 'D30',
  roas_d45: 'D45',
  roas_d60: 'D60',
  retention_rate_d1: 'Ret D1',
  retention_rate_d7: 'Ret D7',
  retention_rate_d14: 'Ret D14',
  retention_rate_d30: 'Ret D30',
  ecpi: 'eCPI',
  adjust_cost: 'Cost',
  ad_revenue: 'Revenue',
  gross_profit: 'Profit',
};

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSettingsChange,
  isOpen,
  onToggle,
  hiddenTables = [],
  onTableVisibilityChange,
  availableColumns = [],
}) => {
  const [newRule, setNewRule] = useState<Partial<ConditionalFormattingRule>>({
    column: 'installs',
    operator: '>',
    value: 100,
    color: COLOR_PRESETS[0].color,
    backgroundColor: COLOR_PRESETS[0].backgroundColor,
    isActive: true,
  });

  const [editingRule, setEditingRule] = useState<string | null>(null);

  const handleDateRangeChange = (field: 'startDate' | 'endDate', value: string) => {
    onSettingsChange({
      ...settings,
      dateRange: {
        ...settings.dateRange,
        [field]: value,
      },
    });
  };

  const setDatePreset = (preset: string) => {
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    let startDate = '';
    
    switch (preset) {
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        break;
      case 'last7':
        const week = new Date(today);
        week.setDate(week.getDate() - 7);
        startDate = week.toISOString().split('T')[0];
        break;
      case 'last14':
        const twoWeeks = new Date(today);
        twoWeeks.setDate(twoWeeks.getDate() - 14);
        startDate = twoWeeks.toISOString().split('T')[0];
        break;
      case 'last21':
        const threeWeeks = new Date(today);
        threeWeeks.setDate(threeWeeks.getDate() - 21);
        startDate = threeWeeks.toISOString().split('T')[0];
        break;
      case 'last30':
        const month = new Date(today);
        month.setDate(month.getDate() - 30);
        startDate = month.toISOString().split('T')[0];
        break;
    }
    
    onSettingsChange({
      ...settings,
      dateRange: {
        startDate,
        endDate,
      },
    });
  };

  const addConditionalRule = () => {
    const rule: ConditionalFormattingRule = {
      id: Date.now().toString(),
      column: newRule.column as ConditionalFormattingRule['column'],
      operator: newRule.operator as ConditionalFormattingRule['operator'],
      value: newRule.value || 0,
      color: newRule.color || COLOR_PRESETS[0].color,
      backgroundColor: newRule.backgroundColor || COLOR_PRESETS[0].backgroundColor,
      isActive: true,
    };

    onSettingsChange({
      ...settings,
      conditionalRules: [...settings.conditionalRules, rule],
    });

    // Reset the form
    setNewRule({
      column: 'installs',
      operator: '>',
      value: 100,
      color: COLOR_PRESETS[0].color,
      backgroundColor: COLOR_PRESETS[0].backgroundColor,
      isActive: true,
    });
  };

  const removeConditionalRule = (ruleId: string) => {
    onSettingsChange({
      ...settings,
      conditionalRules: settings.conditionalRules.filter(rule => rule.id !== ruleId),
    });
  };

  const toggleRuleActive = (ruleId: string) => {
    onSettingsChange({
      ...settings,
      conditionalRules: settings.conditionalRules.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      ),
    });
  };

  const startEditingRule = (rule: ConditionalFormattingRule) => {
    setEditingRule(rule.id);
    setNewRule({
      column: rule.column,
      operator: rule.operator,
      value: rule.value,
      color: rule.color,
      backgroundColor: rule.backgroundColor,
      isActive: rule.isActive,
    });
  };

  const updateExistingRule = () => {
    if (!editingRule) return;
    
    const updatedRule: ConditionalFormattingRule = {
      id: editingRule,
      column: newRule.column as ConditionalFormattingRule['column'],
      operator: newRule.operator as ConditionalFormattingRule['operator'],
      value: newRule.value || 0,
      color: newRule.color || COLOR_PRESETS[0].color,
      backgroundColor: newRule.backgroundColor || COLOR_PRESETS[0].backgroundColor,
      isActive: true,
    };

    onSettingsChange({
      ...settings,
      conditionalRules: settings.conditionalRules.map(rule =>
        rule.id === editingRule ? updatedRule : rule
      ),
    });

    // Reset editing state
    setEditingRule(null);
    setNewRule({
      column: 'installs',
      operator: '>',
      value: 100,
      color: COLOR_PRESETS[0].color,
      backgroundColor: COLOR_PRESETS[0].backgroundColor,
      isActive: true,
    });
  };

  const cancelEditing = () => {
    setEditingRule(null);
    setNewRule({
      column: 'installs',
      operator: '>',
      value: 100,
      color: COLOR_PRESETS[0].color,
      backgroundColor: COLOR_PRESETS[0].backgroundColor,
      isActive: true,
    });
  };

  const selectColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setNewRule({
      ...newRule,
      color: preset.color,
      backgroundColor: preset.backgroundColor,
    });
  };

  // Column visibility management
  const handleColumnToggle = (column: string) => {
    const currentColumns = settings.visibleColumns || ['installs', 'roas_d0', 'roas_d7'];
    const newColumns = currentColumns.includes(column)
      ? currentColumns.filter(col => col !== column)
      : [...currentColumns, column];
    
    onSettingsChange({
      ...settings,
      visibleColumns: newColumns,
    });
  };

  // Get column label for display
  const getColumnLabel = (column: string): string => {
    const columnLabels: Record<string, string> = {
      installs: 'Install Sayısı',
      roas_d0: 'ROAS D0',
      roas_d1: 'ROAS D1',
      roas_d2: 'ROAS D2',
      roas_d3: 'ROAS D3',
      roas_d4: 'ROAS D4',
      roas_d5: 'ROAS D5',
      roas_d6: 'ROAS D6',
      roas_d7: 'ROAS D7',
      roas_d14: 'ROAS D14',
      roas_d21: 'ROAS D21',
      roas_d30: 'ROAS D30',
      roas_d45: 'ROAS D45',
      roas_d60: 'ROAS D60',
      retention_rate_d1: 'Retention D1',
      retention_rate_d7: 'Retention D7',
      retention_rate_d14: 'Retention D14',
      retention_rate_d30: 'Retention D30',
      ecpi: 'eCPI',
      adjust_cost: 'Maliyet',
      ad_revenue: 'Reklam Geliri',
      gross_profit: 'Brüt Kar',
    };
    return columnLabels[column] || column;
  };

  if (!isOpen) {
    return (
      <div className="mb-4">
        <Button 
          variant="outline" 
          onClick={onToggle}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Ayarlar
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Dashboard Ayarları
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Range Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Label className="text-base font-medium">Zaman Aralığı</Label>
          </div>
          
          {/* Date Presets */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDatePreset('yesterday')}
              className="text-xs"
            >
              Dün
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDatePreset('last7')}
              className="text-xs"
            >
              Son 7 Gün
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDatePreset('last14')}
              className="text-xs"
            >
              Son 14 Gün
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDatePreset('last21')}
              className="text-xs"
            >
              Son 21 Gün
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDatePreset('last30')}
              className="text-xs"
            >
              Son 30 Gün
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Başlangıç Tarihi</Label>
              <Input
                id="startDate"
                type="date"
                value={settings.dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                className="dark:bg-background dark:text-foreground dark:border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Bitiş Tarihi</Label>
              <Input
                id="endDate"
                type="date"
                value={settings.dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                className="dark:bg-background dark:text-foreground dark:border-border"
              />
            </div>
          </div>
        </div>

        {/* Conditional Formatting Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <Label className="text-base font-medium">Koşullu Biçimlendirme</Label>
          </div>

          {/* Existing Rules */}
          {settings.conditionalRules.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Mevcut Kurallar</Label>
              <div className="space-y-2">
                {settings.conditionalRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{
                          backgroundColor: rule.backgroundColor,
                          borderColor: rule.color,
                        }}
                      />
                      <span className="text-sm">
                        {COLUMN_LABELS[rule.column] || rule.column} {rule.operator} {rule.value}
                      </span>
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditingRule(rule)}
                      >
                        Düzenle
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRuleActive(rule.id)}
                      >
                        {rule.isActive ? "Devre Dışı" : "Etkinleştir"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeConditionalRule(rule.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Rule */}
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {editingRule ? "Kural Düzenle" : "Yeni Kural Ekle"}
              </Label>
              {editingRule && (
                <Button variant="ghost" size="sm" onClick={cancelEditing}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Sütun</Label>
                <Select
                  value={newRule.column}
                  onValueChange={(value) => setNewRule({ ...newRule, column: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns.map(column => (
                      <SelectItem key={column} value={column}>
                        {getColumnLabel(column)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Operatör</Label>
                <Select
                  value={newRule.operator}
                  onValueChange={(value) => setNewRule({ ...newRule, operator: value as ConditionalFormattingRule['operator'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=">">&gt; (Büyüktür)</SelectItem>
                    <SelectItem value=">=">&gt;= (Büyük Eşittir)</SelectItem>
                    <SelectItem value="<">&lt; (Küçüktür)</SelectItem>
                    <SelectItem value="<=">&lt;= (Küçük Eşittir)</SelectItem>
                    <SelectItem value="=">=  (Eşittir)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Değer</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newRule.value || ''}
                  onChange={(e) => setNewRule({ ...newRule, value: parseFloat(e.target.value) || 0 })}
                  placeholder="Değer girin"
                />
              </div>

              <div className="space-y-2">
                <Label>Renk</Label>
                <div
                  className="h-10 w-full border rounded cursor-pointer flex items-center justify-center"
                  style={{
                    backgroundColor: newRule.backgroundColor,
                    color: newRule.color,
                  }}
                >
                  Önizleme
                </div>
              </div>
            </div>

            {/* Color Presets */}
            <div className="space-y-2">
              <Label className="text-sm">Renk Paleti</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset, index) => (
                  <button
                    key={index}
                    className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                    style={{
                      backgroundColor: preset.backgroundColor,
                      borderColor: preset.color,
                    }}
                    onClick={() => selectColorPreset(preset)}
                    title={preset.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={editingRule ? updateExistingRule : addConditionalRule} 
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingRule ? "Güncelle" : "Kural Ekle"}
              </Button>
              {editingRule && (
                <Button variant="outline" onClick={cancelEditing}>
                  İptal
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Column Visibility Management */}
        {availableColumns.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <Label className="text-base font-medium">Tablo Sütunları</Label>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableColumns.map((column) => {
                const isVisible = (settings.visibleColumns || ['installs', 'roas_d0', 'roas_d7']).includes(column);
                return (
                  <div
                    key={column}
                    className={`flex items-center justify-between p-2 border rounded cursor-pointer transition-colors ${
                      isVisible ? 'bg-primary/10 border-primary' : 'bg-muted/20 hover:bg-muted/30'
                    }`}
                    onClick={() => handleColumnToggle(column)}
                  >
                    <span className="text-sm font-medium">{getColumnLabel(column)}</span>
                    {isVisible ? (
                      <Eye className="h-3 w-3 text-primary" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Tıklayarak sütunları göster/gizle yapabilirsiniz. Seçilen sütunlar tablolarda görünür olacaktır.
            </p>
          </div>
        )}

        {/* Hidden Tables Management */}
        {hiddenTables && hiddenTables.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <Label className="text-base font-medium">Gizli Tablolar ({hiddenTables.length})</Label>
            </div>
            
            <div className="space-y-2">
              {hiddenTables.map((table) => (
                <div
                  key={table.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/20"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{table.game}</div>
                    <div className="text-sm text-muted-foreground">
                      {table.country} • {table.platform} • {table.publisher}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onTableVisibilityChange?.(table.id, false)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Göster
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SettingsPanel;
