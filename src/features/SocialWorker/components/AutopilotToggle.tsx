import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useSocialWorkerStore } from "../../../store/socialWorkerStore";

export const AutopilotToggle = () => {
  const [active, setActive] = useState(false);
  const { settings, updateSettings } = useSocialWorkerStore();

  useEffect(() => {
    console.log("AutopilotToggle mounted");
  }, []);

  const handleAction = () => {
    setActive(!active);
    console.log("AutopilotToggle action triggered");
  };

  return (
    <Card className="p-4 bg-[var(--bg-secondary)] border-[var(--border-color)] shadow-sm">
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-sm font-bold text-[var(--text-primary)]">AutopilotToggle</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <p className="text-[10px] text-[var(--text-secondary)] mb-3 leading-tight">
          Module managing utopilot oggle. Provides real-time state and functional handlers.
        </p>
        <Button 
          variant={active ? "default" : "outline"} 
          size="sm" 
          onClick={handleAction}
          className="w-full h-8 text-xs font-semibold"
        >
          {active ? "Active" : "Perform Action"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default AutopilotToggle;
