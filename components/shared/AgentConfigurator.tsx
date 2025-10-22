import React from 'react';
import { Agent, Provider } from '../../types';
import { MODEL_OPTIONS } from '../../constants';

interface AgentConfiguratorProps {
    agent: Agent;
    onAgentChange: (agent: Agent) => void;
}

const AgentConfigurator: React.FC<AgentConfiguratorProps> = ({ agent, onAgentChange }) => {
    
    const handleFieldChange = <K extends keyof Agent>(field: K, value: Agent[K]) => {
        const updatedAgent = { ...agent, [field]: value };

        // If provider changes, reset model to the first available one for that provider
        if (field === 'provider') {
            updatedAgent.model = MODEL_OPTIONS[value as Provider][0];
        }
        
        onAgentChange(updatedAgent);
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Agent Name</label>
                    <input
                        type="text"
                        value={agent.name}
                        onChange={(e) => handleFieldChange('name', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
                    <input
                        type="text"
                        value={agent.desc}
                        onChange={(e) => handleFieldChange('desc', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Provider</label>
                    <select
                        value={agent.provider}
                        onChange={(e) => handleFieldChange('provider', e.target.value as Provider)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm capitalize"
                    >
                        {Object.keys(MODEL_OPTIONS).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Model</label>
                    <select
                        value={agent.model}
                        onChange={(e) => handleFieldChange('model', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"
                    >
                        {MODEL_OPTIONS[agent.provider].map(model => <option key={model} value={model}>{model}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">System Prompt</label>
                <textarea
                    value={agent.system_prompt}
                    onChange={(e) => handleFieldChange('system_prompt', e.target.value)}
                    rows={8}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"
                />
            </div>
        </div>
    );
};

export default AgentConfigurator;
