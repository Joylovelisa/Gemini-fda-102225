import React, { useState, useCallback, useContext, useMemo } from 'react';
import { AgentConfig, RunLogEntry, RunStatus, Provider } from '../types';
import { AGENTS, MODEL_OPTIONS } from '../constants';
import { runProvider } from '../services/geminiService';
import Card from './shared/Card';
import StatusChip from './shared/StatusChip';
import { ApiKeysContext } from '../App';
import DependencyGraph from './DependencyGraph';

// Helper to generate a unique ID
const generateUniqueId = () => `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const PromptRunner: React.FC = () => {
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>(() => [
    { ...JSON.parse(JSON.stringify(AGENTS[0])), id: generateUniqueId(), dependencies: [] }
  ]);
  const [userPrompt, setUserPrompt] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);
  const [currentRun, setCurrentRun] = useState<Map<string, RunLogEntry>>(new Map());
  
  const apiKeysContext = useContext(ApiKeysContext);

  const addAgent = () => {
    setAgentConfigs(prev => [...prev, { ...JSON.parse(JSON.stringify(AGENTS[0])), id: generateUniqueId(), dependencies: [] }]);
  };
  
  const removeAgent = (id: string) => {
    setAgentConfigs(prev => {
        const newConfigs = prev.filter(agent => agent.id !== id);
        // Also remove this agent ID from any other agent's dependencies
        return newConfigs.map(agent => ({
            ...agent,
            dependencies: agent.dependencies.filter(depId => depId !== id)
        }));
    });
  };

  const handleConfigChange = <K extends keyof AgentConfig>(id: string, field: K, value: AgentConfig[K]) => {
    setAgentConfigs(prev => prev.map(agent => {
        if (agent.id === id) {
            const updatedAgent = { ...agent };
            if (field === 'params') {
                updatedAgent.params = { ...updatedAgent.params, ...(value as object) };
            } else {
                updatedAgent[field] = value;
            }
             // If provider changes, reset model to the first available one for that provider
            if (field === 'provider') {
                updatedAgent.model = MODEL_OPTIONS[value as Provider][0];
            }
            return updatedAgent;
        }
        return agent;
    }));
  };
  
  const handleRun = useCallback(async () => {
    if (!userPrompt.trim() || isRunning || !apiKeysContext) return;

    const requiredKeys = new Set(agentConfigs.map(c => c.provider));
    if (Array.from(requiredKeys).some(p => !apiKeysContext.isKeySet(p))) {
        alert(`Missing API keys for required providers. Please set them in the sidebar.`);
        return;
    }

    setIsRunning(true);
    const initialRunState = new Map<string, RunLogEntry>();
    agentConfigs.forEach(config => {
      initialRunState.set(config.id, {
        agentId: config.id,
        agentName: `Agent ${agentConfigs.findIndex(a => a.id === config.id) + 1}: ${config.name}`,
        provider: config.provider,
        model: config.model,
        prompt: userPrompt,
        status: 'scheduled',
        elapsed_s: 0,
        timestamp: new Date().toISOString(),
      });
    });
    setCurrentRun(initialRunState);

    const runQueue = new Set(agentConfigs.map(a => a.id));
    const completedAgents = new Set<string>();
    const failedAgents = new Set<string>();

    while (runQueue.size > 0) {
        const readyToRunIds = Array.from(runQueue).filter(agentId => {
            const agent = agentConfigs.find(a => a.id === agentId);
            if (!agent) return false;
            // Ready if all dependencies are in the completedAgents set
            return agent.dependencies.every(depId => completedAgents.has(depId));
        });

        if (readyToRunIds.length === 0 && runQueue.size > 0) {
            // Circular dependency or unresolvable graph
            console.error("Execution stalled. Check for circular dependencies.");
            runQueue.forEach(agentId => {
                 setCurrentRun(prev => new Map(prev).set(agentId, {...prev.get(agentId)!, status: 'error', error: 'Circular dependency or stalled graph'}));
            });
            break;
        }

        const promises = readyToRunIds.map(async (agentId) => {
            runQueue.delete(agentId);
            const config = agentConfigs.find(a => a.id === agentId)!;

            setCurrentRun(prev => new Map(prev).set(agentId, {...prev.get(agentId)!, status: 'running'}));
            const startTime = performance.now();
            try {
                const output = await runProvider(config, userPrompt, apiKeysContext.apiKeys);
                const elapsed = (performance.now() - startTime) / 1000;
                setCurrentRun(prev => new Map(prev).set(agentId, {
                    ...prev.get(agentId)!,
                    status: 'success',
                    output,
                    elapsed_s: parseFloat(elapsed.toFixed(2)),
                }));
                completedAgents.add(agentId);
            } catch (error) {
                const elapsed = (performance.now() - startTime) / 1000;
                failedAgents.add(agentId);
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                setCurrentRun(prev => new Map(prev).set(agentId, {
                    ...prev.get(agentId)!,
                    status: 'error',
                    error: errorMessage,
                    elapsed_s: parseFloat(elapsed.toFixed(2)),
                }));
                // Mark dependents as skipped
                const dependentsToSkip = agentConfigs.filter(a => a.dependencies.includes(agentId));
                dependentsToSkip.forEach(dep => {
                     runQueue.delete(dep.id);
                     setCurrentRun(prev => new Map(prev).set(dep.id, {...prev.get(dep.id)!, status: 'skipped'}));
                });
            }
        });

        await Promise.all(promises);
    }
    
    setRunLog(prev => [...Array.from(currentRun.values()), ...prev]);
    setIsRunning(false);
  }, [agentConfigs, userPrompt, isRunning, apiKeysContext]);
  
  const currentRunArray = useMemo(() => Array.from(currentRun.values()), [currentRun]);
  const completedCount = currentRunArray.filter(e => e.status === 'success' || e.status === 'error' || e.status === 'skipped').length;
  const progress = agentConfigs.length > 0 ? (completedCount / agentConfigs.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Agent Workflow Configuration</h2>
            <button onClick={addAgent} className="px-4 py-2 font-semibold text-white bg-[var(--color-primary)] rounded-md hover:bg-[var(--color-secondary)] transition-colors">
                + Add Agent
            </button>
        </div>
      </Card>
      
      {agentConfigs.length > 0 && <DependencyGraph agents={agentConfigs} />}

      <div className="space-y-4">
        {agentConfigs.map((config, i) => (
          <details key={config.id} className="bg-white/80 backdrop-blur-sm border-2 border-[var(--color-border)] rounded-xl transition-shadow open:shadow-lg">
             <summary className="p-4 font-semibold text-lg text-[var(--color-text-secondary)] cursor-pointer list-none flex justify-between items-center">
              <span>Agent {i + 1}: <span className="capitalize font-bold">{config.name}</span></span>
              <button onClick={(e) => {e.preventDefault(); removeAgent(config.id);}} className="text-red-500 hover:text-red-700 font-bold text-lg px-2">&times;</button>
             </summary>
             <div className="p-4 border-t border-[var(--color-border)] grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Depends On (must complete first)</label>
                  <select
                    multiple
                    value={config.dependencies}
                    onChange={(e) => {
                        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                        handleConfigChange(config.id, 'dependencies', selectedIds);
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm h-24"
                    >
                    {agentConfigs.filter(a => a.id !== config.id).map((agent, agentIdx) => (
                        <option key={agent.id} value={agent.id}>Agent {agentIdx + 1}: {agent.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Agent Name</label>
                  <input type="text" value={config.name} onChange={(e) => handleConfigChange(config.id, 'name', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm" />
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <select value={config.provider} onChange={(e) => handleConfigChange(config.id, 'provider', e.target.value as Provider)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm capitalize">
                    {Object.keys(MODEL_OPTIONS).map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700">Model</label>
                  <select value={config.model} onChange={(e) => handleConfigChange(config.id, 'model', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm">
                    {MODEL_OPTIONS[config.provider].map(model => <option key={model} value={model}>{model}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700">System Prompt</label>
                 <textarea value={config.system_prompt} onChange={(e) => handleConfigChange(config.id, 'system_prompt', e.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"/>
                </div>
                {config.provider === 'grok' && (
                     <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
                        <input type="text" value={config.image_url || ''} onChange={(e) => handleConfigChange(config.id, 'image_url', e.target.value)} className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm" placeholder="https://.../image.png"/>
                    </div>
                )}
             </div>
          </details>
        ))}
      </div>

      <Card>
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">User Prompt</h2>
        <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)} placeholder="Enter the prompt to send to each agent..." rows={5}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"/>
        <button onClick={handleRun} disabled={isRunning || !userPrompt.trim()}
          className="mt-4 w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
            {isRunning ? 'Running Workflow...' : '🚀 Run Agent Workflow'}
        </button>
      </Card>
      
      {(isRunning || currentRun.size > 0) &&
        <Card>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Run Timeline</h2>
          <div className="w-full bg-[var(--color-background-end)] rounded-full h-4 mb-4 relative">
              <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] h-4 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
              <span className="absolute inset-0 text-center text-xs font-bold text-white flex items-center justify-center">{Math.round(progress)}% Complete</span>
          </div>
          <div className="space-y-3">
              {currentRunArray.map((entry) => (
                <div key={entry.agentId} className="flex items-center justify-between p-3 bg-[var(--color-background-start)] rounded-lg">
                  <div className="font-semibold">{entry.agentName}</div>
                  <StatusChip status={entry.status} />
                </div>
              ))}
          </div>
        </Card>
      }

      {currentRunArray.filter(e => e.status === 'success' || e.status === 'error').length > 0 &&
        <Card>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Results</h2>
          <div className="space-y-4">
            {currentRunArray.map((entry) => (entry.status === 'success' || entry.status === 'error') && (
              <details key={entry.agentId} className="bg-white rounded-lg" open>
                <summary className={`p-4 font-semibold text-lg list-none flex justify-between items-center cursor-pointer ${entry.status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
                  {entry.agentName} Result
                  <span className="text-xs font-normal">{entry.elapsed_s}s</span>
                </summary>
                <div className="p-4 border-t border-gray-200">
                  {entry.status === 'success' && <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.output}</p>}
                  {entry.status === 'error' && <p className="text-sm text-red-700 font-mono">{entry.error}</p>}
                </div>
              </details>
            ))}
          </div>
        </Card>
      }

      <Card className="mt-8">
        <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Follow-up Questions</h3>
        <ul className="list-disc list-inside space-y-2 text-sm text-[var(--color-text-secondary)]">
            <li><strong>Result Handling:</strong> For the new "Show/Hide" results feature, would you like to add a "Copy to Clipboard" button for the analysis text? Should we also add an option to export the result as a text or markdown file?</li>
            <li><strong>State Persistence:</strong> Currently, the editable checklist and review instructions are reset on page reload. Would you like this information to be saved in the browser's local storage so it persists between sessions for the same document?</li>
            <li><strong>Agent Chaining in Document Review:</strong> In the Document Review tab, we run one agent. Would you like the ability to chain agents here as well? For example, run an "Extractor Agent" first, and then feed its output into a "Summarizer Agent."</li>
            <li><strong>Model Cost Tracking:</strong> Since we are using live APIs, would it be useful to display an estimated cost for each agent run based on the model used and the number of tokens processed? We could show this next to the result.</li>
            <li><strong>Streaming Responses:</strong> For a more interactive experience, would you like the agent's response to be streamed into the results box word-by-word, rather than waiting for the full response to complete?</li>
            <li><strong>Custom Agent Saving:</strong> When a user modifies an agent's prompt in the Document Review tab, should we provide an option to "Save as New Agent" to their library?</li>
            <li><strong>Batch Document Processing:</strong> Is there a need to upload multiple documents and run the same review agent across all of them in a batch process, with a consolidated report at the end?</li>
            <li><strong>Knowledge Base Integration:</strong> For Q&A agents, would you like to enable them to search a specific knowledge base (e.g., a folder of regulatory guidance documents) in addition to the uploaded 510(k) file?</li>
            <li><strong>User Authentication & Roles:</strong> As the system grows, should we consider adding user accounts? This would allow for saving work, private agent libraries, and different roles (e.g., Reviewer, Manager).</li>
            <li><strong>Dashboard Customization:</strong> Should users be able to customize the dashboard by adding, removing, or rearranging the metric and chart widgets to fit their specific monitoring needs?</li>
        </ul>
      </Card>

    </div>
  );
};

export default PromptRunner;
