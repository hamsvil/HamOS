 
/* eslint-disable no-useless-catch */
/* eslint-disable no-control-regex */
import { Content, FunctionCall, GoogleGenAI } from "@google/genai";
import { ProjectData, ChatMessageData } from "../types";
import { webLlmService } from "../../../services/webLlmService";
import { kaggleLlmService } from "../../../services/kaggleLlmService";
import { intentRouterService } from "../../../services/intentRouterService";
import { geminiKeyManager } from "../../../services/geminiKeyManager";
import { safeStorage } from "../../../utils/storage";
import { githubMemoryService } from "../../../services/githubMemoryService";
import { getFileContext } from "../utils/fileContextUtils";
import {
  buildSystemInstruction,
  compressHistory,
} from "../../../utils/aiGenerationUtils";
import { getToolsForMode } from "../../../services/hamEngine/cortex/toolRegistry";
import {
  HamMode,
  ToolkitType,
} from "../../../services/hamEngine/cortex/types";
import { ToolHandlers } from "../../../services/hamEngine/cortex/toolHandlers";
import { useProjectStore } from "../../../store/projectStore";
import { generateHamEngineContent } from "./useAiGeneration/HamEngineGenerator";

interface UseAiGenerationPart1Props {
  setIsLoading: (loading: boolean) => void;
  setProgress: (progress: { percent: number; status: string }) => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  isLocalMode: boolean;
  localLlmReady: boolean;
  setLocalLlmReady: (ready: boolean) => void;
  allInstructions: string;
}

export const useAiGeneration_Part1 = (props: UseAiGenerationPart1Props) => {
  const {
    setIsLoading,
    setProgress,
    abortControllerRef,
    isLocalMode,
    localLlmReady,
    setLocalLlmReady,
    allInstructions
  } = props;

  const generateResponse = async (
    userMsg: string,
    history: ChatMessageData[],
    projectContext: ProjectData | null,
    onChunk: (text: string) => void,
    instructionOverride?: string,
    projectType: string = "web",
    systemInstructionOverride?: string,
    skipMemorySave?: boolean,
    signal?: AbortSignal,
  ) => {
    setIsLoading(true);
    if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
        abortControllerRef.current = new AbortController();
    }
    const currentAbortController = abortControllerRef.current;
    const activeSignal = signal || currentAbortController.signal;

    try {
      if (userMsg.toLowerCase().trim() === "githam") {
        onChunk("Mengakses memori global dari GitHub...\n\n");
        const memory = await githubMemoryService.loadMemory();
        if (memory && memory.projects.length > 0) {
          let projectList =
            "Daftar Proyek yang Tersimpan di Global Memory:\n\n";
          memory.projects.forEach((p, index) => {
            projectList += `${index + 1}. **${p.name}** (ID: ${p.id})\n   - Ringkasan: ${p.summary}\n   - Terakhir Diperbarui: ${new Date(p.lastUpdated).toLocaleString()}\n\n`;
          });
          onChunk(projectList);
          return projectList;
        } else {
          const msg = "Memori global kosong atau tidak dapat diakses.";
          onChunk(msg);
          return msg;
        }
      }

      if (isLocalMode) {
        try {
          if (!localLlmReady) {
            setProgress({
              percent: 10,
              status: "Initializing Local Engine...",
            });
            await webLlmService.init(undefined, (p: number, t: string) =>
              setProgress({ percent: p, status: t }),
            );
            setLocalLlmReady(true);
          }

          const response = await webLlmService.generate(
            userMsg,
            undefined,
            onChunk,
          );
          return response;
        } catch (e) {
          console.warn("Local LLM failed, falling back to Cloud Model", e);
          onChunk(
            "\n[SYSTEM: Local Engine failed. Falling back to Cloud Node...]\n",
          );
        }
      }

      const storeState = useProjectStore.getState();
      const selectedModel = (storeState.uiState as any).aiConfig?.model || (storeState.uiState as any).activeModel || safeStorage.getItem("ham_ai_model") || "ham-engine-collaborator";

      let fileContents = "";
      if (projectContext && projectContext.files.length > 0) {
        setProgress({ percent: 15, status: "Classifying Intent..." });
        const intent = await intentRouterService.classifyIntent(
          userMsg,
          projectContext,
        );

        if (intent.type === "SIMPLE") {
          setProgress({ percent: 20, status: "Loading Relevant Files..." });
          fileContents = await getFileContext(
            projectContext,
            intent.relevantFiles,
          );
        } else {
          setProgress({
            percent: 20,
            status: "Loading Full Project Context...",
          });
          fileContents = await getFileContext(projectContext);
        }
      }

      const aiMode = (safeStorage.getItem("ham_ai_mode") as HamMode) || "deep";
      const activeToolkit =
        (safeStorage.getItem("ham_ai_toolkit") as ToolkitType) || "base";
      const functionDeclarations = getToolsForMode(aiMode, activeToolkit);
      const tools = functionDeclarations.length > 0 ? [
        {
          functionDeclarations,
        },
      ] : undefined;

      if (selectedModel === "ham-engine-collaborator") {
        return await generateHamEngineContent({
          userMsg,
          history,
          projectContext,
          projectType,
          fileContents,
          allInstructions,
          instructionOverride,
          systemInstructionOverride,
          onChunk,
          abortSignal: activeSignal,
        });
      }

      if (selectedModel === "kaggle-llm") {
        const systemInstruction = buildSystemInstruction(
          projectContext,
          projectType,
          fileContents,
          allInstructions,
          instructionOverride,
          systemInstructionOverride,
          true,
        );

        const sanitizedUserMsg = userMsg.replace(
          /[\x00-\x09\x0B-\x1F\x7F]/g,
          "",
        );
        const injectedUserMsg = systemInstructionOverride
          ? sanitizedUserMsg
          : `${sanitizedUserMsg}\n\n[SYSTEM REMINDER: Apply HAM ENGINE APEX V4.0 COGNITIVE ARCHITECTURE. If the user is just talking, asking a question, or telling you to stop, JUST ANSWER NORMALLY without any XML tags. ONLY use <thought>, <step>, <code path="...">, or <edit path="..."> if you actually need to modify files. Maximize efficiency and zero redundancy.]`;

        const compressed = compressHistory(history);
        const historyForKaggle: { role: string; content: string }[] =
          compressed.map((c) => ({
            role: c.role === "model" ? "ai" : "user",
            content: (c.parts[0] as any).text,
          }));

        try {
          const response = await kaggleLlmService.generate(
            injectedUserMsg,
            systemInstruction,
            historyForKaggle,
            onChunk,
            abortControllerRef.current?.signal,
          );
          return response;
        } catch (e: any) {
          if (
            !abortControllerRef.current ||
            abortControllerRef.current.signal.aborted
          )
            throw new Error("cancelled", { cause: e });
          const err = e as Error;
          if (err.message && err.message.includes("Endpoint not configured")) {
            onChunk(
              "⚠️ **Kaggle Endpoint belum diatur.**\n\nSilakan buka **Settings**, pilih 'Kaggle / Custom LLM', dan masukkan URL Ngrok Anda.",
            );
            return "ENDPOINT_NOT_CONFIGURED";
          }
          throw e;
        }
      } else {
        let client: ReturnType<typeof geminiKeyManager.getClient>;
        try {
          client = geminiKeyManager.getClient();
        } catch (e: any) {
          const err = e as Error & { code?: string };
          if (err.code === "NO_API_KEY") {
            onChunk(
              "⚠️ **API Key Ham Engine belum diatur.**\n\nSilakan buka **Settings** dan masukkan API Key Anda untuk menggunakan mode Cloud.",
            );
            setIsLoading(false);
            return "NO_API_KEY";
          }
          throw e;
        }

        const systemInstruction = buildSystemInstruction(
          projectContext,
          projectType,
          fileContents,
          allInstructions,
          instructionOverride,
          systemInstructionOverride,
          false,
        );

        const contents = compressHistory(history);

        const sanitizedUserMsg = userMsg.replace(
          /[\x00-\x09\x0B-\x1F\x7F]/g,
          "",
        );
        const injectedUserMsg = systemInstructionOverride
          ? sanitizedUserMsg
          : `${sanitizedUserMsg}\n\n[SYSTEM REMINDER: Apply HAM ENGINE APEX V4.0 COGNITIVE ARCHITECTURE. If the user is just talking, asking a question, or telling you to stop, JUST ANSWER NORMALLY without any XML tags. ONLY use <thought>, <step>, <code path="...">, or <edit path="..."> if you actually need to modify files. Maximize efficiency and zero redundancy.]`;

        if (
          contents.length > 0 &&
          contents[contents.length - 1].role === "user"
        ) {
          const lastPart = contents[contents.length - 1].parts[0];
          if ('text' in lastPart) {
            lastPart.text += `\n\n${injectedUserMsg}`;
          }
        } else {
          contents.push({ role: "user", parts: [{ text: injectedUserMsg }] });
        }

        let fullText = "";
        let currentContents: Content[] = [...contents];
        let isFunctionCall = true;
        let loopCount = 0;
        let currentFileContents = fileContents;

        while (isFunctionCall && loopCount < 5) {
          isFunctionCall = false;
          loopCount++;
          
          // Finding 9: Refresh context if we've already done an iteration (meaning files might have changed)
          if (loopCount > 1) {
            currentFileContents = await getFileContext(projectContext);
          }

          const currentSystemInstruction = buildSystemInstruction(
            projectContext,
            projectType,
            currentFileContents,
            allInstructions,
            instructionOverride,
            systemInstructionOverride,
            false,
          );

          let iterationText = "";
          let chunkFunctionCalls: FunctionCall[] = [];

          try {
            const aiMode = safeStorage.getItem("ham_ai_mode") || "deep";
            let model = safeStorage.getItem("ham_ai_model");
            
            // Auto-upgrade old models
            if (model === "gemini-2.5-flash" || model === "gemini-2.5-flash") {
              model = "gemini-2.5-flash";
            } else if (model === "gemini-2.5-pro" || model === "gemini-2.5-pro") {
              model = "gemini-2.5-pro";
            } else if (model === "gemini-2.5-flash-lite" || model === "gemini-2.5-flash-preview-02-05") {
              model = "gemini-2.5-flash";
            }

            if (
              !model ||
              model === "ham-engine-collaborator" ||
              model === "kaggle-llm" ||
              model === "ham-engine-v2"
            ) {
              if (aiMode === "thinking") model = "gemini-2.5-flash";
              else if (aiMode === "fast")
                model = "gemini-2.5-flash";
              else model = "gemini-2.5-pro";
            }

            const { AiWorkerService } = await import('../../../services/aiWorkerService');

            await AiWorkerService.generateStream({
              model,
              contents: currentContents,
              config: {
                systemInstruction: currentSystemInstruction,
                tools,
              },
              fallbackProviders: ['anthropic', 'openai']
            }, (chunkText, groundingMetadata, fnCalls) => {
              if (activeSignal.aborted) {
                throw new Error("cancelled");
              }
              if (chunkText) {
                fullText += chunkText;
                iterationText += chunkText;
                onChunk(fullText);
              }
              if (fnCalls && fnCalls.length > 0) {
                chunkFunctionCalls = fnCalls;
              }
            });
          } catch (e: any) {
            if (activeSignal.aborted)
              throw new Error("cancelled", { cause: e });
            throw e;
          }

          if (chunkFunctionCalls.length > 0) {
            isFunctionCall = true;
            const functionResponses = [];
            for (const call of chunkFunctionCalls) {
              const name = call.name;
              const args = call.args;
              let result: Record<string, any> = {};
              try {
                result = await ToolHandlers.executeTool(name as any, args);
                // Sanitize result: limit size to 5000 characters
                if (result && typeof result === 'object' && JSON.stringify(result).length > 5000) {
                    result = { error: 'Result too large, please refine tool parameters.' };
                }
              } catch (e: any) {
                const err = e as Error;
                result = { error: err.message };
              }
              functionResponses.push({
                name,
                response: result,
              });
            }

            const modelParts: any[] = [];
            if (iterationText) {
              modelParts.push({ text: iterationText });
            }
            modelParts.push(
              ...chunkFunctionCalls.map((fc) => ({ functionCall: fc })),
            );

            currentContents.push({
              role: "model",
              parts: modelParts,
            });

            currentContents.push({
              role: "user",
              parts: functionResponses.map((fr) => ({
                functionResponse: {
                  name: fr.name,
                  response: fr.response,
                },
              })),
            });
          }
        }

        if (projectContext && fullText.length > 50 && !skipMemorySave) {
          const summaryPrompt = `Buatkan ringkasan singkat (maksimal 2 kalimat) tentang apa yang baru saja dilakukan atau dibahas dalam proyek ini berdasarkan percakapan terakhir: User: ${userMsg}, AI: ${fullText.substring(0, 500)}...`;

        client.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }]
        })
          .catch((e: any) => {
            const err = e as Error & { status?: number };
            if (err.status === 404 || err.message?.includes("404")) {
              return client.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }]
              });
            }
            throw e;
          })
          .then((summaryResponse: any) => {
            const summary = summaryResponse.text || "Pembaruan proyek.";
            githubMemoryService
              .saveMemory(projectContext, summary)
              .catch(console.error);
          })
          .catch((e: any) => {
            console.error("Failed to generate summary for memory", e);
          });
        }

        return fullText;
      }
    } catch (e) {
      throw e;
    } finally {
      if (abortControllerRef.current === currentAbortController) {
        setIsLoading(false);
        setProgress({ percent: 0, status: "" });
        abortControllerRef.current = null;
      }
    }
  };

  return { generateResponse };
};
