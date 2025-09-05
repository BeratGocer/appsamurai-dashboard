import { useState, useEffect, useMemo } from 'react';
import { EditableKPICard } from './EditableKPICard';
import { calculateKPIValue, loadKPISettings } from '@/utils/kpiUtils';
import type { CampaignData, KPICardConfig } from '@/types';

interface DynamicKPISectionProps {
  data: CampaignData[];
  activeFileId: string | null;
  hiddenTables?: Set<string>;
  gameGroups?: any[];
  isEditMode?: boolean;
  onEditModeToggle?: () => void;
}

export function DynamicKPISection({ 
  data, 
  activeFileId, 
  hiddenTables,
  gameGroups,
  isEditMode = false, 
  onEditModeToggle 
}: DynamicKPISectionProps) {
  const [kpiConfigs, setKpiConfigs] = useState<KPICardConfig[]>([]);


  // Load KPI settings when activeFileId changes
  useEffect(() => {
    if (activeFileId) {
      const configs = loadKPISettings(activeFileId);
      setKpiConfigs(configs);
    }
  }, [activeFileId]);


  // Calculate KPI values (excluding hidden tables)
  const kpiValues = useMemo(() => {
    return kpiConfigs.map(config => ({
      id: config.id,
      value: calculateKPIValue(data, config, hiddenTables, gameGroups)
    }));
  }, [data, kpiConfigs, hiddenTables, gameGroups]);

  // Get visible KPI configs sorted by order
  const visibleKPIConfigs = kpiConfigs
    .filter(config => config.isVisible)
    .sort((a, b) => a.order - b.order);

  // Handle KPI card edit
  const handleEditKPI = (_configId: string) => {
    // If in edit mode, clicking on a card should open settings focused on that card
    // Settings are now always visible when in edit mode
  };

  if (!activeFileId || data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Please select a file to view KPI cards</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* KPI Cards Grid */}
      {visibleKPIConfigs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {visibleKPIConfigs.map((config) => {
            const kpiValue = kpiValues.find(v => v.id === config.id);
            if (!kpiValue) return null;

            return (
              <EditableKPICard
                key={config.id}
                config={config}
                value={kpiValue.value}
                onEdit={() => handleEditKPI(config.id)}
                isEditMode={isEditMode}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {visibleKPIConfigs.length === 0 && (
        <div className="text-center py-8">
          <div className="bg-muted/20 rounded-lg p-6">
            <h3 className="font-medium mb-2">No KPI Cards Configured</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add KPI cards to display your campaign metrics
            </p>
            <button
              onClick={() => onEditModeToggle?.()}
              className="text-primary hover:underline text-sm font-medium"
            >
              Configure KPI Cards
            </button>
          </div>
        </div>
      )}

      {/* Edit Mode Info */}
      {isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">
                KPI Edit Mode
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Click on any KPI card to edit it, or use the settings panel to add new cards
              </p>
            </div>
            {onEditModeToggle && (
              <button
                onClick={onEditModeToggle}
                className="text-blue-700 dark:text-blue-300 hover:underline text-sm font-medium"
              >
                Exit Edit Mode
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
