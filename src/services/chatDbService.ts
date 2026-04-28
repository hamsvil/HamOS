/* eslint-disable no-useless-assignment */
import { getReactiveDb } from '../db/reactiveDb';
import { ChatMessage, FileAttachment } from '../types/ai';
import { generateUUID } from '../utils/uuid';

export const initChatDB = async () => {
  return await getReactiveDb();
};

export const saveChatSession = async (id: string, title: string) => {
    const db = await getReactiveDb();
    if (db) {
        await db.chat_sessions.upsert({
            id,
            title,
            timestamp: Date.now()
        });
    }
};

export const getChatSessions = async () => {
    const db = await getReactiveDb();
    if (!db) return [];
    const sessions = await db.chat_sessions.find().sort({ timestamp: 'desc' }).exec();
    return sessions.map(s => s.toJSON());
};

export const deleteChatSession = async (id: string) => {
    const db = await getReactiveDb();
    if (db) {
        await db.chat_sessions.find({ selector: { id } }).remove();
        await db.chats.find({ selector: { sessionId: id } }).remove();
    }
};

export const saveChatMessage = async (
    sessionId: string,
    role: 'user' | 'ai',
    content: string,
    image?: string,
    audio?: string,
    video?: string,
    files?: FileAttachment[],
    timestampOverride?: number
) => {
    const db = await getReactiveDb();
    if (db) {
        const id = generateUUID();
        const doc: any = {
            id,
            sessionId,
            role,
            content,
            timestamp: timestampOverride || Date.now()
        };
        if (image !== undefined) doc.image = image;
        if (audio !== undefined) doc.audio = audio;
        if (video !== undefined) doc.video = video;
        if (files !== undefined) doc.files = files;
        
        await db.chats.insert(doc);
        return id;
    }
};

export const getChatMessages = async (sessionId: string) => {
    const db = await getReactiveDb();
    if (!db) return [];
    const messages = await db.chats.find({ selector: { sessionId } }).sort({ timestamp: 'asc' }).exec();
    return messages.map(m => m.toJSON());
};

export const clearChatMessages = async (sessionId: string) => {
    const db = await getReactiveDb();
    if (db) {
        await db.chats.find({ selector: { sessionId } }).remove();
    }
};

export const saveCheckpoint = async (sessionId: string, history: ChatMessage[]) => {
    const db = await getReactiveDb();
    if (!db) return;

    const snapshotData = history.map(({ id, sessionId, ...rest }) => rest); 
    
    await db.chat_checkpoints.insert({
        id: generateUUID(),
        sessionId,
        timestamp: Date.now(),
        snapshot: snapshotData
    });

    const checkpoints = await db.chat_checkpoints
        .find({ selector: { sessionId } })
        .sort({ timestamp: 'desc' })
        .exec();

    if (checkpoints.length > 10) {
        const toDelete = checkpoints.slice(10);
        for (const cp of toDelete) {
            await cp.remove();
        }
    }
};

export const getCheckpoints = async (sessionId: string) => {
    const db = await getReactiveDb();
    if (!db) return [];
    const cps = await db.chat_checkpoints
        .find({ selector: { sessionId } })
        .sort({ timestamp: 'desc' })
        .exec();
    return cps.map(cp => cp.toJSON());
};

export const restoreCheckpoint = async (sessionId: string, snapshot: ChatMessage[]) => {
    const db = await getReactiveDb();
    if (!db) return false;

    try {
        await db.chats.find({ selector: { sessionId } }).remove();
        await db.chats.bulkInsert(snapshot.map(msg => ({ ...msg, sessionId, id: generateUUID() })));
        return true;
    } catch (e) {
        console.error('Restore failed:', e);
        return false;
    }
};
