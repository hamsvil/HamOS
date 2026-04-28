 
import { AgentActivity } from '../types';

export interface AgentState {
    isProcessing: boolean;
    currentAction: string | null;
    agentActivities: AgentActivity[];
    input: string;
    timer: number;
    progress: number;
}

export type AgentAction = 
    | { type: 'SET_PROCESSING'; payload: boolean }
    | { type: 'SET_ACTION'; payload: string | null }
    | { type: 'ADD_ACTIVITY'; payload: AgentActivity }
    | { type: 'UPDATE_ACTIVITY'; payload: { id: string; updates: Partial<AgentActivity> } }
    | { type: 'SET_INPUT'; payload: string }
    | { type: 'RESTORE_STATE'; payload: AgentState }
    | { type: 'CLEAR_ACTIVITIES' }
    | { type: 'SET_TIMER'; payload: number }
    | { type: 'INCREMENT_TIMER' }
    | { type: 'SET_PROGRESS'; payload: number };

export const agentReducer = (state: AgentState, action: AgentAction): AgentState => {
    switch (action.type) {
        case 'SET_PROCESSING':
            return { ...state, isProcessing: action.payload };
        case 'SET_ACTION':
            return { ...state, currentAction: action.payload };
        case 'ADD_ACTIVITY': {
            const existingIndex = state.agentActivities.findIndex(a => a.id === action.payload.id);
            if (existingIndex !== -1) {
                const newActivities = [...state.agentActivities];
                newActivities[existingIndex] = action.payload;
                return { ...state, agentActivities: newActivities };
            }
            return { ...state, agentActivities: [...state.agentActivities, action.payload] };
        }
        case 'UPDATE_ACTIVITY': {
            const activities = [...state.agentActivities];
            const index = activities.findIndex(a => a.id === action.payload.id);
            if (index !== -1) {
                activities[index] = { ...activities[index], ...action.payload.updates };
            }
            return { ...state, agentActivities: activities };
        }
        case 'SET_INPUT':
            return { ...state, input: action.payload };
        case 'RESTORE_STATE':
            return action.payload;
        case 'CLEAR_ACTIVITIES':
            return { ...state, agentActivities: [] };
        case 'SET_TIMER':
            return { ...state, timer: action.payload };
        case 'INCREMENT_TIMER':
            return { ...state, timer: state.timer + 1 };
        case 'SET_PROGRESS':
            return { ...state, progress: action.payload };
        default:
            return state;
    }
};

export const INITIAL_STATE: AgentState = {
    isProcessing: false,
    currentAction: null,
    agentActivities: [],
    input: '',
    timer: 0,
    progress: 0
};
