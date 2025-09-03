import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Eye, EyeOff, Edit3, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import type { KPICardConfig, AvailableColumn, KPICalculationType, KPIFormatType } from '@/types';

interface KPISettingsPanelProps {
  configs: KPICardConfig[];
  availableColumns: AvailableColumn[];
  onConfigsChange: (configs: KPICardConfig[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

interface EditingConfig extends KPICardConfig {
  isNew?: boolean;
}

export function KPISettingsPanel({ 
  configs, 
  availableColumns, 
  onConfigsChange, 
  isOpen, 
  onToggle 
}: KPISettingsPanelProps) {
  const [editingConfig, setEditingConfig] = useState<EditingConfig | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleEditConfig = (config: KPICardConfig) => {
    setEditingConfig({ ...config });
    setShowEditDialog(true);
  };

  const handleAddNewConfig = () => {
    const newConfig: EditingConfig = {
      id: `kpi-${Date.now()}`,
      title: 'New KPI',
      column: availableColumns[0]?.key || 'installs',
      calculationType: 'sum',
      format: 'number',
      decimalPlaces: 0,
      isVisible: true,
      order: Math.max(...configs.map(c => c.order), 0) + 1,
      isNew: true
    };
    setEditingConfig(newConfig);
    setShowEditDialog(true);
  };

  const handleSaveConfig = () => {
    if (!editingConfig) return;

    const { isNew, ...configToSave } = editingConfig;
    
    if (isNew) {
      onConfigsChange([...configs, configToSave]);
    } else {
      onConfigsChange(configs.map(c => c.id === configToSave.id ? configToSave : c));
    }
    
    setEditingConfig(null);
    setShowEditDialog(false);
  };

  const handleDeleteConfig = (configId: string) => {
    onConfigsChange(configs.filter(c => c.id !== configId));
  };

  const handleToggleVisibility = (configId: string) => {
    onConfigsChange(configs.map(c => 
      c.id === configId ? { ...c, isVisible: !c.isVisible } : c
    ));
  };

  const handleMoveConfig = (configId: string, direction: 'up' | 'down') => {
    const sortedConfigs = [...configs].sort((a, b) => a.order - b.order);
    const index = sortedConfigs.findIndex(c => c.id === configId);
    
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sortedConfigs.length - 1) return;
    
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap orders
    const updatedConfigs = [...configs];
    const configIndex = updatedConfigs.findIndex(c => c.id === configId);
    const targetConfigIndex = updatedConfigs.findIndex(c => c.id === sortedConfigs[targetIndex].id);
    
    if (configIndex !== -1 && targetConfigIndex !== -1) {
      const tempOrder = updatedConfigs[configIndex].order;
      updatedConfigs[configIndex].order = updatedConfigs[targetConfigIndex].order;
      updatedConfigs[targetConfigIndex].order = tempOrder;
    }
    
    onConfigsChange(updatedConfigs);
  };

  const visibleConfigs = configs.filter(c => c.isVisible).length;
  const totalConfigs = configs.length;

  return (
    <>
      {/* Settings Panel */}
      <Card className={`transition-all duration-300 ${isOpen ? 'shadow-lg' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle className="text-lg">KPI Settings</CardTitle>
              <Badge variant="outline">
                {visibleConfigs}/{totalConfigs} visible
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
            >
              {isOpen ? 'Hide' : 'Show'} Settings
            </Button>
          </div>
        </CardHeader>

        {isOpen && (
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Configure your dashboard KPI cards
              </p>
              <Button onClick={handleAddNewConfig} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add KPI
              </Button>
            </div>

            {/* KPI List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {configs
                .sort((a, b) => a.order - b.order)
                .map((config) => (
                  <div
                    key={config.id}
                    className={`p-3 border rounded-lg ${
                      config.isVisible ? 'bg-card' : 'bg-muted/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{config.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {config.calculationType}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {config.column}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {config.description || `${config.calculationType} of ${config.column}`}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        {/* Move buttons */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveConfig(config.id, 'up')}
                          className="p-1 h-7 w-7"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveConfig(config.id, 'down')}
                          className="p-1 h-7 w-7"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                        
                        {/* Visibility toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleVisibility(config.id)}
                          className="p-1 h-7 w-7"
                        >
                          {config.isVisible ? 
                            <Eye className="h-3 w-3" /> : 
                            <EyeOff className="h-3 w-3" />
                          }
                        </Button>
                        
                        {/* Edit button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditConfig(config)}
                          className="p-1 h-7 w-7"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                        
                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConfig(config.id)}
                          className="p-1 h-7 w-7 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
              {configs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No KPI cards configured yet.</p>
                  <Button onClick={handleAddNewConfig} className="mt-2" size="sm">
                    Add your first KPI
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingConfig?.isNew ? 'Add New KPI' : 'Edit KPI'}
            </DialogTitle>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editingConfig.title}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    title: e.target.value
                  })}
                  placeholder="Enter KPI title"
                />
              </div>

              {/* Column Selection */}
              <div className="space-y-2">
                <Label>Data Column</Label>
                <Select
                  value={editingConfig.column}
                  onValueChange={(value) => setEditingConfig({
                    ...editingConfig,
                    column: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableColumns
                      .filter(col => col.type === 'number')
                      .map((column) => (
                        <SelectItem key={column.key} value={column.key}>
                          <div>
                            <div className="font-medium">{column.label}</div>
                            {column.description && (
                              <div className="text-xs text-muted-foreground">
                                {column.description}
                              </div>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Calculation Type */}
              <div className="space-y-2">
                <Label>Calculation Type</Label>
                <Select
                  value={editingConfig.calculationType}
                  onValueChange={(value: KPICalculationType) => setEditingConfig({
                    ...editingConfig,
                    calculationType: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sum">Sum (Total)</SelectItem>
                    <SelectItem value="average">Average</SelectItem>
                    <SelectItem value="count">Count (Number of records)</SelectItem>
                    <SelectItem value="min">Minimum</SelectItem>
                    <SelectItem value="max">Maximum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Format Type */}
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={editingConfig.format}
                  onValueChange={(value: KPIFormatType) => setEditingConfig({
                    ...editingConfig,
                    format: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="currency">Currency ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="decimal">Decimal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Decimal Places */}
              <div className="space-y-2">
                <Label htmlFor="decimalPlaces">Decimal Places</Label>
                <Input
                  id="decimalPlaces"
                  type="number"
                  min="0"
                  max="4"
                  value={editingConfig.decimalPlaces || 0}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    decimalPlaces: parseInt(e.target.value) || 0
                  })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={editingConfig.description || ''}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    description: e.target.value
                  })}
                  placeholder="Brief description of this KPI"
                />
              </div>

              {/* Badge */}
              <div className="space-y-2">
                <Label htmlFor="badge">Badge (Optional)</Label>
                <Input
                  id="badge"
                  value={editingConfig.badge || ''}
                  onChange={(e) => setEditingConfig({
                    ...editingConfig,
                    badge: e.target.value
                  })}
                  placeholder="Badge text (e.g., Total, Avg)"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingConfig(null);
                    setShowEditDialog(false);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSaveConfig}>
                  {editingConfig.isNew ? 'Add KPI' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
