 
 
import React from 'react';
import { AgentAction } from './useAgenticAiState';
import { useProjectStore } from '../../../store/projectStore';
import { vfs } from '../../../services/vfsService';

export const buildExecutionBatches = (acts: { name: string, parameters?: Record<string, unknown> }[]) => {
    // PROTOKOL: Strict File Creation Ordering (Anti-Blank Screen & Dependency First)
    const sortedActs = [...acts].sort((a, b) => {
        if (a.name === 'write_file' && b.name === 'write_file') {
            const pathA = (a.parameters?.path as string || a.parameters?.TargetFile as string || '').toLowerCase();
            const pathB = (b.parameters?.path as string || b.parameters?.TargetFile as string || '').toLowerCase();
            
            const getWeight = (p: string) => {
                if (p.includes('package.json') || p.includes('build.gradle') || p.includes('settings.gradle')) return 1;
                if (p.includes('vite.config') || p.includes('tsconfig') || p.includes('androidmanifest.xml')) return 2;
                if (p.includes('index.html') || p.includes('main.tsx') || p.includes('mainactivity')) return 3;
                if (p.includes('app.tsx') || p.includes('app.jsx')) return 4;
                return 5;
            };
            return getWeight(pathA) - getWeight(pathB);
        }
        return 0; // Preserve original order for non-write_file actions
    });

    const batches: { name: string, parameters?: Record<string, unknown> }[][] = [];
    let currentBatch: { name: string, parameters?: Record<string, unknown> }[] = [];
    const lockedFiles = new Set<string>();
    let globalLock = false;

    for (const action of sortedActs) {
        const commandParam = action.parameters?.command as string | undefined;
        const isGlobal = action.name === 'run_command' && (commandParam?.includes('npm install') || commandParam?.includes('npm i ') || commandParam?.includes('npm run'));
        const isPassive = ['read_file', 'list_files'].includes(action.name) || (action.name === 'run_command' && !isGlobal);
        const targetFile = action.parameters?.path as string || action.parameters?.TargetFile as string || action.parameters?.file_path as string;

        if (isGlobal) {
            if (currentBatch.length > 0) {
                batches.push(currentBatch);
                currentBatch = [];
                lockedFiles.clear();
            }
            batches.push([action]);
            globalLock = true;
        } else if (isPassive) {
            if (globalLock) {
                if (currentBatch.length > 0) {
                    batches.push(currentBatch);
                }
                currentBatch = [];
                lockedFiles.clear();
                globalLock = false;
            }
            currentBatch.push(action);
        } else {
            // Active file modification
            if (globalLock || (targetFile && lockedFiles.has(targetFile))) {
                if (currentBatch.length > 0) {
                    batches.push(currentBatch);
                }
                currentBatch = [action];
                lockedFiles.clear();
                if (targetFile) lockedFiles.add(targetFile);
                globalLock = false;
            } else {
                currentBatch.push(action);
                if (targetFile) lockedFiles.add(targetFile);
            }
        }
    }
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }
    return batches;
};

export const processStreamingChunk = (
    chunk: string, 
    projectState: any, 
    lastHistoryUpdate: React.MutableRefObject<number>,
    abortControllerRef: React.MutableRefObject<AbortController | null>
) => {
    if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
    
    // Throttle updates to 100ms
    const now = Date.now();
    if (now - lastHistoryUpdate.current < 100) return;
    lastHistoryUpdate.current = now;
    
    // Streaming XML Parsing Logic
    const openTags: string[] = [];
    const tagRegex = /<\/?(thought|action|final_answer)[^>]*>/g;
    let match;
    while ((match = tagRegex.exec(chunk)) !== null) {
        if (match[0].startsWith('</')) {
            openTags.pop();
        } else {
            openTags.push(match[1]);
        }
    }
    const currentOpenTag = openTags[openTags.length - 1];

    projectState.setHistory((prev: any) => {
        const newHistory = [...prev];
        const lastMsg = newHistory[newHistory.length - 1];
        if (lastMsg && lastMsg.role === 'ai') {
            if (currentOpenTag === 'final_answer' || chunk.includes('<final_answer>')) {
                const finalParts = chunk.split('<final_answer>');
                const finalContent = finalParts[finalParts.length - 1].split('</final_answer>')[0];
                lastMsg.content = finalContent || 'Writing final answer...';
            } else if (currentOpenTag === 'action') {
                const actionParts = chunk.split('<action');
                const lastAction = actionParts[actionParts.length - 1];
                const nameMatch = lastAction.match(/name="([^"]+)"/);
                const actionName = nameMatch ? nameMatch[1] : '...';
                lastMsg.content = `Executing action: ${actionName}`;
            } else if (currentOpenTag === 'thought') {
                const thoughtParts = chunk.split('<thought>');
                const lastThought = thoughtParts[thoughtParts.length - 1];
                lastMsg.content = `Thinking: ${lastThought.substring(0, 150)}...`;
            } else {
                // No open tags. Show the text outside of tags, or 'Processing...' if empty.
                const textWithoutTags = chunk.replace(/<[^>]*>?/gm, '').trim();
                lastMsg.content = textWithoutTags || 'Processing...';
            }
        }
        return newHistory;
    });
};
