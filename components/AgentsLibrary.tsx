import React, { useState, useContext, useMemo } from 'react';
import Card from './shared/Card';
import { AppContext } from '../state/AppContext';
import { Agent, Provider } from '../types';
import AgentConfigurator from './shared/AgentConfigurator';
import { runProvider } from '../services/geminiService';
import { ApiKeysContext } from '../App';

const DEFAULT_NEW_AGENT: Agent = {
  name: "New Custom Agent",
  desc: "A new agent for a specific task.",
  provider: "openai",
  model: "gpt-4o-mini",
  system_prompt: "You are a helpful assistant.",
  params: { temperature: 0.5, max_tokens: 1024, top_p: 1.0 },
  category: "Custom"
};


// --- Modals ---
const CreateAgentModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { dispatch } = useContext(AppContext)!;
    const [newAgent, setNewAgent] = useState<Agent>(DEFAULT_NEW_AGENT);
    
    const handleSave = () => {
        dispatch({ type: 'ADD_AGENT', payload: newAgent });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Create New Agent</h2>
                <div className="overflow-y-auto pr-2 flex-grow">
                    <AgentConfigurator agent={newAgent} onAgentChange={setNewAgent} />
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[var(--color-border)]">
                    <button onClick={onClose} className="px-4 py-2 font-semibold text-[var(--color-text-secondary)] rounded-md">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 font-semibold text-white bg-[var(--color-primary)] rounded-md hover:bg-[var(--color-secondary)]">Save Agent</button>
                </div>
            </Card>
        </div>
    );
};

const TestAgentModal: React.FC<{ agent: Agent; onClose: () => void }> = ({ agent, onClose }) => {
    const [editableAgent, setEditableAgent] = useState<Agent>(JSON.parse(JSON.stringify(agent)));
    const [userPrompt, setUserPrompt] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const apiKeysContext = useContext(ApiKeysContext);

    const handleRunTest = async () => {
        if (!userPrompt.trim() || !apiKeysContext) return;
        setIsLoading(true);
        setError('');
        setResult('');
        try {
            if (!apiKeysContext.isKeySet(editableAgent.provider)) {
                 throw new Error(`API Key for ${editableAgent.provider} is not set.`);
            }
            const output = await runProvider({ ...editableAgent, id: 'test', dependencies: [] }, userPrompt, apiKeysContext.apiKeys);
            setResult(output);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Test Agent: {agent.name}</h2>
                <div className="overflow-y-auto pr-2 flex-grow space-y-4">
                    <AgentConfigurator agent={editableAgent} onAgentChange={setEditableAgent} />
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Test User Prompt</label>
                        <textarea
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"
                            placeholder="Enter a prompt to test this agent..."
                        />
                    </div>
                     <button onClick={handleRunTest} disabled={isLoading || !userPrompt.trim()} className="w-full px-4 py-2 font-semibold text-white bg-[var(--color-primary)] rounded-md hover:bg-[var(--color-secondary)] disabled:opacity-50">
                        {isLoading ? 'Executing...' : 'Go'}
                    </button>
                    {(result || error || isLoading) && (
                         <div className="mt-4">
                            <h3 className="font-semibold text-[var(--color-text-secondary)]">Result</h3>
                            {isLoading && <div className="text-center p-4">Running...</div>}
                            {error && <div className="p-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md font-mono">{error}</div>}
                            {result && <div className="p-2 text-sm text-gray-800 bg-gray-100 border border-gray-300 rounded-md whitespace-pre-wrap">{result}</div>}
                        </div>
                    )}
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t border-[var(--color-border)]">
                    <button onClick={onClose} className="px-4 py-2 font-semibold text-[var(--color-text-secondary)] rounded-md">Close</button>
                </div>
            </Card>
        </div>
    );
};


// --- Main Component ---
const AgentsLibrary: React.FC = () => {
  const { state } = useContext(AppContext)!;
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);

  const agentsByCategory = useMemo(() => {
    return state.agents.reduce((acc, agent) => {
      const category = agent.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(agent);
      return acc;
    }, {} as Record<string, Agent[]>);
  }, [state.agents]);

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Agent Library</h2>
          <button onClick={() => setIsCreateModalOpen(true)} className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-bold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-transform transform hover:scale-105">
            + Create Agent
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(agentsByCategory).map(([category, agents]) => (
            <details key={category} className="bg-[var(--color-background-start)] bg-opacity-50 rounded-lg open:shadow-lg transition-shadow" open>
              <summary className="p-4 font-semibold text-lg text-[var(--color-text-secondary)] cursor-pointer list-none flex justify-between items-center">
                {category}
                <span className="text-sm font-normal bg-[var(--color-background-end)] text-[var(--color-text-primary)] rounded-full px-2 py-0.5">{agents.length} agents</span>
              </summary>
              <div className="p-4 border-t border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 gap-4">
                {agents.map((agent) => (
                  <div key={agent.name} className="bg-[var(--color-card-bg-start)] p-4 rounded-md border border-[var(--color-border)] flex flex-col justify-between">
                    <div>
                        <h4 className="font-bold text-[var(--color-text-primary)]">{agent.name}</h4>
                        <p className="text-sm text-[var(--color-text-secondary)] mt-1">{agent.desc}</p>
                    </div>
                    <div className="mt-3 text-right">
                         <button onClick={() => setTestingAgent(agent)} className="text-sm font-semibold text-[var(--color-primary)] border-2 border-[var(--color-primary)] rounded-lg py-1 px-3 hover:bg-[var(--color-primary)] hover:text-white transition-colors">
                            Test Agent
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Card>
      {isCreateModalOpen && <CreateAgentModal onClose={() => setIsCreateModalOpen(false)} />}
      {testingAgent && <TestAgentModal agent={testingAgent} onClose={() => setTestingAgent(null)} />}
    </>
  );
};

export default AgentsLibrary;
