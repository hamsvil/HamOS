import React from 'react';
import { Button } from '../../../components/ui/button';
import { Download } from 'lucide-react';
import { AgentResult } from '../../../services/agentObservability/AgentObservabilityService';

interface ResultExportButtonProps {
  results: AgentResult[];
  label?: string;
}

export const ResultExportButton: React.FC<ResultExportButtonProps> = ({ results, label = "Export All" }) => {
  const handleExport = () => {
    if (results.length === 0) return;
    const dataStr = JSON.stringify(results, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const fileName = `agent_results_${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', fileName);
    linkElement.click();
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={results.length === 0}>
      <Download size={14} className="mr-2" /> {label}
    </Button>
  );
};
