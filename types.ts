export type Provider = 'gemini' | 'openai' | 'grok';

export interface AgentParams {
  temperature: number;
  max_tokens: number;
  top_p: number;
}

export interface Agent {
  name: string;
  desc: string;
  provider: Provider;
  model: string;
  system_prompt: string;
  params: AgentParams;
  category?: string;
  template_id?: string;
}

export interface AgentConfig extends Agent {
  id: string; // Unique identifier for dependency tracking
  dependencies: string[]; // Array of agent IDs this agent depends on
  pmpt_id?: string;
  image_url?: string;
}

export type RunStatus = 'scheduled' | 'running' | 'success' | 'error' | 'skipped';

export interface RunLogEntry {
  agentId: string;
  agentName: string;
  provider: Provider;
  model: string;
  prompt: string;
  output?: string;
  error?: string;
  elapsed_s: number;
  timestamp: string;
  status: RunStatus;
}

// New types for AppContext
export interface AppState {
    agents: Agent[];
    runLog: RunLogEntry[];
    activityLog: string[];
}

export type AppAction =
    | { type: 'ADD_AGENT'; payload: Agent }
    | { type: 'ADD_RUN_LOG_ENTRY'; payload: RunLogEntry }
    | { type: 'ADD_ACTIVITY_LOG'; payload: string };
