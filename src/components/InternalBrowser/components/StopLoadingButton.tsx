import React, { useState, useEffect } from 'react';
  import { Badge } from '../../ui/badge';

  export const StopLoadingButton: React.FC<{ id?: string }> = ({ id }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const timer = setTimeout(() => {
        setData({ status: 'active', lastUpdated: Date.now() });
        setLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    return (
      <div className="p-2 border border-slate-800 rounded bg-slate-900/50">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-slate-300">StopLoadingButton</span>
          <Badge variant="outline" className="text-[9px] h-3 px-1">
            {loading ? '...' : data?.status}
          </Badge>
        </div>
      </div>
    );
  };
  