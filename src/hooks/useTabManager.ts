 
import { useState, useEffect } from 'react';

export function useTabManager() {
  const [activeTab, setActiveTab] = useState('ham-aistudio');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set([
    'browser', 'ham-aistudio', 'memory', 'terminal', 'ai', 'private-source', 'tasks', 'settings', 'omni'
  ]));

  useEffect(() => {
    setVisitedTabs(prev => {
      const newSet = new Set(prev);
      newSet.add(activeTab);
      return newSet;
    });
  }, [activeTab]);

  return { activeTab, setActiveTab, visitedTabs };
}
