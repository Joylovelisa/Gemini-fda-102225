import React, { createContext, useReducer, Dispatch, ReactNode } from 'react';
import { AppState, AppAction, Agent } from '../types';
import { AGENTS } from '../constants';

const initialState: AppState = {
    agents: AGENTS,
    runLog: [],
    activityLog: [],
};

const appReducer = (state: AppState, action: AppAction): AppState => {
    switch (action.type) {
        case 'ADD_AGENT':
            // Avoid adding duplicates by name
            if (state.agents.some(agent => agent.name === action.payload.name)) {
                return state;
            }
            return {
                ...state,
                agents: [...state.agents, action.payload],
            };
        case 'ADD_RUN_LOG_ENTRY':
            return {
                ...state,
                runLog: [action.payload, ...state.runLog].slice(0, 50), // Keep last 50 logs
            };
        case 'ADD_ACTIVITY_LOG':
             return {
                ...state,
                activityLog: [action.payload, ...state.activityLog].slice(0, 20), // Keep last 20 activities
            };
        default:
            return state;
    }
};

export const AppContext = createContext<{
    state: AppState;
    dispatch: Dispatch<AppAction>;
} | null>(null);

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};
