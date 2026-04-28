 
import { useState, useRef, useEffect, useMemo } from "react";
import { ProjectData, ChatMessageData } from "../types";
import { webLlmService } from "../../../services/webLlmService";
import { useAiGeneration_Part1 } from "./useAiGeneration_Part1";

// Modularized Hook: Handles AI Generation Logic
export function useAiGeneration() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [localLlmReady, setLocalLlmReady] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, status: "" });
  const [allInstructions, setAllInstructions] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setAllInstructions("");
  }, []);

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  const part1 = useAiGeneration_Part1({
    setIsLoading,
    setProgress,
    abortControllerRef,
    isLocalMode,
    localLlmReady,
    setLocalLlmReady,
    allInstructions
  });

  const generateResponse = part1.generateResponse;

  return {
    isLoading,
    isLocalMode,
    setIsLocalMode,
    localLlmReady,
    progress,
    cancelGeneration,
    generateResponse,
  };
}
