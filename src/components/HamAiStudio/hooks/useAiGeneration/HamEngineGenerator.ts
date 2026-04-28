 
/* eslint-disable no-control-regex */
import { Content } from '@google/genai';
import { hamEngineQuantum } from '../../../../services/hamEngineQuantumService';
import { ToolHandlers } from '../../../../services/hamEngine/cortex/toolHandlers';
import { buildSystemInstruction, compressHistory } from '../../../../utils/aiGenerationUtils';
import { getToolsForMode } from '../../../../services/hamEngine/cortex/toolRegistry';
import { HamMode, ToolkitType } from '../../../../services/hamEngine/cortex/types';
import { safeStorage } from '../../../../utils/storage';
import { ProjectData, ChatMessageData } from '../../types';

export interface HamEngineOptions {
    userMsg: string;
    history: ChatMessageData[];
    projectContext: ProjectData | null;
    projectType: string;
    fileContents: string;
    allInstructions: string;
    instructionOverride?: string;
    systemInstructionOverride?: string;
    onChunk: (text: string) => void;
    abortSignal?: AbortSignal;
}

export const generateHamEngineContent = async (options: HamEngineOptions) => {
    const {
        userMsg,
        history,
        projectContext,
        projectType,
        fileContents,
        allInstructions,
        instructionOverride,
        systemInstructionOverride,
        onChunk,
        abortSignal
    } = options;

    const aiMode = (safeStorage.getItem("ham_ai_mode") as HamMode) || "deep";
    const activeToolkit = (safeStorage.getItem("ham_ai_toolkit") as ToolkitType) || "base";
    const functionDeclarations = getToolsForMode(aiMode, activeToolkit);
    const tools = functionDeclarations.length > 0 ? [
        {
            functionDeclarations,
        },
    ] : undefined;

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

    if (!userMsg.trim() || userMsg.length > 50000) {
        throw new Error("Input invalid or too long.");
    }

    const sanitizedUserMsg = userMsg.replace(/[\x00-\x09\x0B-\x1F\x7F]/g, "");
    const injectedUserMsg = `${sanitizedUserMsg}\n\n[SYSTEM REMINDER: Apply HAM ENGINE APEX V4.0 COGNITIVE ARCHITECTURE. If the user is just talking, asking a question, or telling you to stop, JUST ANSWER NORMALLY without any XML tags. ONLY use <thought>, <step>, <code path="...">, or <edit path="..."> if you actually need to modify files. Maximize efficiency and zero redundancy.]`;

    if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents[contents.length - 1].parts[0].text += `\n\n${injectedUserMsg}`;
    } else {
        contents.push({ role: "user", parts: [{ text: injectedUserMsg }] });
    }

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
        try {
            let currentContents: Content[] = [...contents];
            let isFunctionCall = true;
            let loopCount = 0;
            let finalResponse = "";
            let accumulatedText = "";

            while (isFunctionCall && loopCount < 5) {
                isFunctionCall = false;
                loopCount++;

                const response = await hamEngineQuantum.generateContentStream(
                    currentContents,
                    systemInstruction,
                    (chunkText: string) => {
                        onChunk(accumulatedText + chunkText);
                    },
                    abortSignal,
                    tools,
                );

                if (response.text) {
                    accumulatedText += response.text;
                }

                if (response.functionCalls && response.functionCalls.length > 0) {
                    isFunctionCall = true;
                    const functionResponses = [];
                    for (const call of response.functionCalls) {
                        const name = call.name;
                        const args = call.args;
                        const result = await ToolHandlers.executeTool(name as any, args);
                        functionResponses.push({ name, response: result });
                    }

                    const modelParts: any[] = [];
                    if (response.text) {
                        modelParts.push({ text: response.text });
                    }
                    modelParts.push(...response.functionCalls.map((fc) => ({ functionCall: fc })));

                    currentContents.push({ role: "model", parts: modelParts });
                    currentContents.push({
                        role: "user",
                        parts: functionResponses.map((fr) => ({
                            functionResponse: { name: fr.name, response: fr.response },
                        })),
                    });
                } else {
                    finalResponse = accumulatedText;
                }
            }
            return finalResponse;
        } catch (e: any) {
            if (abortSignal?.aborted) throw new Error("cancelled", { cause: e });
            attempts++;
            if (attempts >= maxAttempts) throw e;
            await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
    }
};
