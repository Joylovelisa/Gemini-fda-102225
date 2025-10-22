import React, { useState, useContext, useEffect } from 'react';
import Card from './shared/Card';
import { usePdfProcessor } from '../hooks/usePdfProcessor';
import { AppContext } from '../state/AppContext';
import { Agent } from '../types';
import AgentConfigurator from './shared/AgentConfigurator';
import { runProvider } from '../services/geminiService';
import { ApiKeysContext } from '../App';

const initialChecklistItems = [
  { id: 1, text: "Device Description", checked: false },
  { id: 2, text: "Indications for Use", checked: false },
  { id: 3, text: "Predicate Comparison", checked: false },
];

const DEFAULT_NEW_AGENT: Agent = {
  name: "Doc Review Agent",
  desc: "An agent for analyzing this document.",
  provider: "openai",
  model: "gpt-4o-mini",
  system_prompt: "You are an expert FDA 510(k) reviewer. Analyze the following document excerpt for compliance gaps and key information based on the user's instructions.",
  params: { temperature: 0.2, max_tokens: 1500, top_p: 1.0 },
};

const DocumentReview: React.FC = () => {
  const [checklistItems, setChecklistItems] = useState(initialChecklistItems);
  const [reviewInstructions, setReviewInstructions] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('new');
  const [analysisResult, setAnalysisResult] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [showResults, setShowResults] = useState(false);


  const { state: appState, dispatch } = useContext(AppContext)!;
  const apiKeysContext = useContext(ApiKeysContext);

  const [activeAgentConfig, setActiveAgentConfig] = useState<Agent>(DEFAULT_NEW_AGENT);

  useEffect(() => {
    // Set initial agent config when agents are loaded
    if (appState.agents.length > 0) {
        const firstAgent = appState.agents[0];
        setSelectedAgentId(firstAgent.name);
        setActiveAgentConfig(JSON.parse(JSON.stringify(firstAgent)));
    } else {
        setSelectedAgentId('new');
        setActiveAgentConfig(DEFAULT_NEW_AGENT);
    }
  }, [appState.agents]);


  // FIX: Destructure setPagePreviews from usePdfProcessor to resolve "Cannot find name 'setPagePreviews'" error.
  const {
    file, setFile, pageSelection, setPageSelection, isProcessing, isRendering,
    error: pdfError, extractedText, pagePreviews, setPagePreviews, processFile, renderPreviews,
  } = usePdfProcessor();

  const handleAgentSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const agentName = e.target.value;
    setSelectedAgentId(agentName);
    if (agentName === 'new') {
        setActiveAgentConfig(DEFAULT_NEW_AGENT);
    } else {
        const selected = appState.agents.find(a => a.name === agentName);
        if (selected) {
            setActiveAgentConfig(JSON.parse(JSON.stringify(selected)));
        }
    }
  };

  const handleRunAnalysis = async () => {
    if (!extractedText.trim() || !apiKeysContext) return;
    setIsAnalyzing(true);
    setAnalysisError('');
    setAnalysisResult('');
    setShowResults(true); // Show results area immediately with loading state
    try {
        if (!apiKeysContext.isKeySet(activeAgentConfig.provider)) {
            throw new Error(`API Key for ${activeAgentConfig.provider} is not set.`);
        }
        
        const fullPrompt = `Review Instructions:\n${reviewInstructions}\n\nDocument Text:\n${extractedText}`;
        
        const output = await runProvider({ ...activeAgentConfig, id: 'doc_review', dependencies: [] }, fullPrompt, apiKeysContext.apiKeys);
        setAnalysisResult(output);

        if (selectedAgentId === 'new') {
            dispatch({ type: 'ADD_AGENT', payload: activeAgentConfig });
            // Future improvement: switch selection to the newly created agent
        }

    } catch (err: any) {
        setAnalysisError(err.message);
    } finally {
        setIsAnalyzing(false);
    }
  };


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
      setShowPreview(false);
      setPagePreviews([]); // Clear previous previews
    }
  };
  
  const handleProcessPages = () => {
      processFile();
  }

  const handleShowPreview = () => {
    const shouldShow = !showPreview;
    setShowPreview(shouldShow);
    if (shouldShow && file && pagePreviews.length === 0) {
        renderPreviews();
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Document Upload & Processing</h2>
           <div className="border-2 border-dashed border-[var(--color-border)] rounded-xl p-6 text-center bg-[var(--color-background-start)]">
            <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".pdf" />
            <label htmlFor="file-upload" className="cursor-pointer text-[var(--color-secondary)] font-semibold">
              <svg className="w-12 h-12 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
              <span>{file ? `Selected: ${file.name}` : 'Upload a PDF Document'}</span>
            </label>
            <p className="text-xs text-gray-500 mt-2">PDF up to 10MB</p>
          </div>
          {file && (
            <div className="mt-4 space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-grow">
                  <label htmlFor="page-selection" className="block text-sm font-medium text-[var(--color-text-secondary)]">Pages to Process (e.g., 1-5, 8, 11-12)</label>
                  <input type="text" id="page-selection" value={pageSelection} onChange={(e) => setPageSelection(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm" />
                </div>
                <button onClick={handleProcessPages} disabled={isProcessing} className="h-10 px-4 font-semibold text-white bg-[var(--color-primary)] rounded-md hover:bg-[var(--color-secondary)] transition-colors disabled:opacity-50">
                    {isProcessing ? 'Processing...' : 'Go'}
                </button>
                <button onClick={handleShowPreview} className="h-10 px-4 font-semibold text-[var(--color-primary)] border-2 border-[var(--color-primary)] rounded-md hover:bg-[var(--color-primary)] hover:text-white transition-colors">
                    {showPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>
              {showPreview && (
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text-secondary)]">Document Preview (First 5 pages)</h3>
                   {isRendering && <p className="text-sm text-center p-4">Rendering preview...</p>}
                   {pdfError && <p className="text-sm text-center p-4 text-red-600">{pdfError}</p>}
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {pagePreviews.map((src, i) => (
                      <div key={i} className="aspect-[7/9] border-2 border-[var(--color-border)] bg-white rounded-md flex items-center justify-center p-1 shadow-sm">
                        <img src={src} alt={`Page ${i + 1} preview`} className="max-w-full max-h-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
        
        {extractedText && (
            <Card>
                <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Agent Analysis</h2>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Select Agent</label>
                        <select
                            value={selectedAgentId}
                            onChange={handleAgentSelectionChange}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"
                        >
                            {appState.agents.map(agent => (
                                <option key={agent.name} value={agent.name}>{agent.name}</option>
                            ))}
                            <option value="new">+ Create New Agent for this Task</option>
                        </select>
                    </div>

                    <AgentConfigurator agent={activeAgentConfig} onAgentChange={setActiveAgentConfig} />
                    
                    <div>
                        <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Review Instructions (Context for Agent)</label>
                        <textarea
                            value={reviewInstructions}
                            onChange={(e) => setReviewInstructions(e.target.value)}
                            placeholder="e.g., 'Summarize the key findings in this text.' or 'Check for compliance with ISO 10993.'"
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)] sm:text-sm"
                        />
                    </div>
                    
                    <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="w-full px-4 py-2 font-semibold text-white bg-[var(--color-primary)] rounded-md hover:bg-[var(--color-secondary)] disabled:opacity-50">
                        {isAnalyzing ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Analyzing...
                            </span>
                        ) : 'Run Agent on Document'}
                    </button>
                    
                    {(analysisResult || analysisError || isAnalyzing) && showResults && (
                         <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-[var(--color-text-secondary)]">Analysis Result</h3>
                                <button onClick={() => setShowResults(false)} className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">Hide</button>
                            </div>
                            {isAnalyzing && (
                                <div className="text-center p-4 rounded-md bg-gray-100 border border-gray-300">
                                    <div className="flex items-center justify-center">
                                         <svg className="animate-spin mr-3 h-5 w-5 text-[var(--color-primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Agent is processing...</span>
                                    </div>
                                </div>
                            )}
                            {analysisError && <div className="p-2 text-sm text-red-700 bg-red-100 border border-red-300 rounded-md font-mono">{analysisError}</div>}
                            {!isAnalyzing && analysisResult && <div className="p-2 text-sm text-gray-800 bg-gray-100 border border-gray-300 rounded-md whitespace-pre-wrap">{analysisResult}</div>}
                        </div>
                    )}
                    {(analysisResult || analysisError) && !showResults && (
                        <button onClick={() => setShowResults(true)} className="w-full mt-4 text-sm font-semibold text-[var(--color-primary)] border-2 border-[var(--color-primary)] rounded-md py-2 hover:bg-[var(--color-primary)] hover:text-white transition-colors">
                            Show Results
                        </button>
                    )}
                </div>
            </Card>
        )}
      </div>

      <div>
        <Card>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">Compliance Checklist</h2>
          <div className="space-y-2">
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center space-x-2">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
                <span className="flex-grow">{item.text}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DocumentReview;