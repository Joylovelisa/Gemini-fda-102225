import React, { useState, useEffect, createContext, useContext } from 'react';
import Dashboard from './components/Dashboard';
import AgentsLibrary from './components/AgentsLibrary';
import DocumentReview from './components/DocumentReview';
import PromptRunner from './components/PromptRunner';
import ThemeSelector from './components/ThemeSelector';
import { ShieldIcon, ChartBarIcon, BeakerIcon, DocumentTextIcon, PuzzlePieceIcon, KeyIcon, ChevronLeftIcon, ChevronRightIcon } from './components/icons/Icons';
import { THEME_OPTIONS } from './themes';
import { AppProvider } from './state/AppContext'; // Import AppProvider

// --- API Keys Context ---
interface ApiKeys {
  openai: string;
  gemini: string;
  grok: string;
}

interface ApiKeysContextType {
  apiKeys: ApiKeys;
  setApiKey: (provider: keyof ApiKeys, key: string) => void;
  isKeySet: (provider: keyof ApiKeys) => boolean;
}

export const ApiKeysContext = createContext<ApiKeysContextType | null>(null);

// --- API Key Manager Component ---
const ApiKeyManager: React.FC = () => {
    const context = useContext(ApiKeysContext);
    if (!context) return null;

    const { apiKeys, setApiKey, isKeySet } = context;

    const providers: (keyof ApiKeys)[] = ['openai', 'gemini', 'grok'];

    const getStatus = (provider: keyof ApiKeys) => {
        const envKeyExists = !!(process.env[`${provider.toUpperCase()}_API_KEY`]);
        if (envKeyExists) return <span className="text-xs text-green-400">Loaded from env</span>;
        if (isKeySet(provider)) return <span className="text-xs text-blue-400">Set in session</span>;
        return <span className="text-xs text-yellow-400">Not set</span>;
    };

    return (
        <div className="p-4 space-y-4 text-white">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <KeyIcon className="w-5 h-5" />
                API Key Management
            </h3>
            {providers.map(provider => (
                <div key={provider}>
                    <label htmlFor={`${provider}-key`} className="block text-sm font-medium capitalize flex justify-between items-center">
                        {provider} API Key
                        {getStatus(provider)}
                    </label>
                    <input
                        type="password"
                        id={`${provider}-key`}
                        value={apiKeys[provider]}
                        onChange={(e) => setApiKey(provider, e.target.value)}
                        placeholder={`Enter your ${provider} key`}
                        className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white text-sm focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                    />
                </div>
            ))}
            <p className="text-xs text-gray-400 mt-4">
                Keys loaded from environment variables are used by default. Keys entered here are stored for the current session and are not persisted.
            </p>
        </div>
    );
};


type Tab = 'dashboard' | 'agents' | 'review' | 'runner';

const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('app-theme') || 'hermes';
    }
    return 'hermes';
  });
  
  const [apiKeys, setApiKeys] = useState<ApiKeys>({
    openai: '',
    gemini: '',
    grok: '',
  });

  useEffect(() => {
    setApiKeys({
      openai: process.env.OPENAI_API_KEY || '',
      gemini: process.env.GEMINI_API_KEY || '',
      grok: process.env.XAI_API_KEY || '',
    });
  }, []);

  const setApiKey = (provider: keyof ApiKeys, key: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: key }));
  };

  const isKeySet = (provider: keyof ApiKeys) => !!apiKeys[provider];


  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-theme', theme);
      document.documentElement.className = '';
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'agents':
        return <AgentsLibrary />;
      case 'review':
        return <DocumentReview />;
      case 'runner':
        return <PromptRunner />;
      default:
        return <Dashboard />;
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: Tab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-background-start)] focus:ring-[var(--color-primary)] ${
        activeTab === tab
          ? 'bg-gradient-to-r from-[var(--color-tab-active-start)] to-[var(--color-tab-active-end)] text-[var(--color-text-on-primary)] shadow-lg'
          : 'bg-[var(--color-tab-inactive-bg)] text-[var(--color-tab-inactive-text)] hover:bg-opacity-80'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <ApiKeysContext.Provider value={{ apiKeys, setApiKey, isKeySet }}>
    <div className="flex min-h-screen bg-gradient-to-br from-[var(--color-body-bg-start)] to-[var(--color-body-bg-end)] font-sans text-[var(--color-text-primary)]">
      
        <aside className={`bg-gradient-to-b from-[var(--color-header-start)] to-[var(--color-header-end)] shadow-2xl transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
            <ApiKeyManager />
        </aside>

      <div className="flex-1 flex flex-col">
        <header className="bg-gradient-to-r from-[var(--color-header-start)] to-[var(--color-header-end)] p-4 shadow-2xl sticky top-0 z-50 flex items-center">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="mr-3 text-white p-2 rounded-full hover:bg-white/20 transition-colors">
                {isSidebarOpen ? <ChevronLeftIcon className="h-6 w-6" /> : <ChevronRightIcon className="h-6 w-6" />}
            </button>
            <div className="flex items-center gap-3">
              <ShieldIcon className="h-8 w-8 text-[var(--color-accent)]" />
              <div>
                <h1 className="text-xl font-bold text-white tracking-wider">FDA 510(k) Agentic Review</h1>
                <p className="text-xs text-[var(--color-text-on-primary)] opacity-70 italic">Intelligent Document Analysis & Compliance Verification</p>
              </div>
            </div>
            <div className="ml-auto">
              <ThemeSelector selectedTheme={theme} onThemeChange={setTheme} themes={THEME_OPTIONS} />
            </div>
        </header>
        
        <main className="flex-1 container mx-auto p-4 md:p-6 lg:p-8">
          <div className="bg-gradient-to-r from-[var(--color-background-start)] to-[var(--color-background-end)] rounded-xl p-2 mb-6 shadow-inner">
            <div className="flex flex-wrap items-center gap-2">
              <TabButton tab="dashboard" label="Dashboard" icon={<ChartBarIcon className="h-5 w-5" />} />
              <TabButton tab="agents" label="Agents Library" icon={<BeakerIcon className="h-5 w-5" />} />
              <TabButton tab="review" label="Document Review" icon={<DocumentTextIcon className="h-5 w-5" />} />
              <TabButton tab="runner" label="Prompt ID Runner" icon={<PuzzlePieceIcon className="h-5 w-5" />} />
            </div>
          </div>
          
          <div className="animate-fade-in">
            {renderTabContent()}
          </div>
        </main>
        
        <footer className="py-6 text-center text-sm text-[var(--color-text-secondary)]">
            <p><strong>Hermes Agentic Review System</strong></p>
            <p className="italic">Designed with Luxury & Performance Aesthetics</p>
        </footer>
      </div>
    </div>
    </ApiKeysContext.Provider>
  );
};

const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    )
}

export default App;
