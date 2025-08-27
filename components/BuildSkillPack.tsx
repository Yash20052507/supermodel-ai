import React, { useState, useEffect } from 'react';
import type { Page, SkillPack, CustomProvider } from '../types.ts';
import { Save, ArrowLeft, Sparkles, Bot, Code, FileText, Plus, Trash2, Loader2, CheckCircle, AlertTriangle } from './icons.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { testSkillExecution } from '../services/apiService.ts';
import { useToast } from '../hooks/useToast.ts';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;
const MotionForm = motion.form as any;

type SkillPackCreationData = Omit<SkillPack, 'id' | 'version' | 'rating' | 'downloads' | 'isInstalled' | 'isActive' | 'icon' | 'tags' | 'average_rating' | 'review_count'>;

interface ApiKeys {
    google?: string;
    openai?: string;
    anthropic?: string;
}

interface BuildSkillPackProps {
  setCurrentPage: (page: Page) => void;
  createSkillPack: (data: SkillPackCreationData) => void;
  customProviders: CustomProvider[];
  apiKeys: ApiKeys;
}

const BuildSkillPack: React.FC<BuildSkillPackProps> = ({ setCurrentPage, createSkillPack, customProviders, apiKeys }) => {
  const [skillType, setSkillType] = useState<'prompt' | 'code-enhanced'>('prompt');
  const [tests, setTests] = useState<{ input: string; output: string; }[]>([]);
  const [skillPackData, setSkillPackData] = useState({
    name: "",
    description: "",
    category: "coding",
    prompt_template: "",
    system_instructions: "",
    author: "AI Explorer",
    provider: 'google',
    base_model: 'gemini-2.5-flash',
    cost_per_1k_tokens: 0.02,
    purchase_type: 'free' as 'free' | 'one-time',
    price: 0,
    preprocessing_code: `// The user's prompt is available as the 'prompt' variable.
// This script must return a string.
return prompt;`,
    postprocessing_code: `// The AI's raw response is available as the 'response' variable.
// This script must return a string.
return response;`,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (skillPackData.purchase_type === 'free') {
      setSkillPackData(prev => ({ ...prev, price: 0 }));
    }
  }, [skillPackData.purchase_type]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    if (e.target.type === 'number') {
        setSkillPackData(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
    } else {
        setSkillPackData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { id, value } = e.target;
    if (id === 'category') {
        setSkillPackData(prev => ({ ...prev, category: value }));
    } else if (id === 'provider') {
        const provider = value;
        let defaultModel = 'gemini-2.5-flash';
        if(provider === 'openai') defaultModel = 'gpt-4o';
        if(provider === 'anthropic') defaultModel = 'claude-3-5-sonnet-20240620';
        if(provider === 'local') defaultModel = 'llama3';
        // For custom providers, we don't have a default model, so user must enter it.
        if (!['google', 'openai', 'anthropic', 'local'].includes(provider)) {
            defaultModel = '';
        }

        setSkillPackData(prev => ({ ...prev, provider, base_model: defaultModel }));
    } else if (id === 'purchase_type') {
        setSkillPackData(prev => ({ ...prev, purchase_type: value as 'free' | 'one-time' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    if (!skillPackData.name || !skillPackData.description) {
      setError("Please fill in the Name and Description fields.");
      setIsSaving(false);
      return;
    }

    setTimeout(() => {
      try {
        const dataToCreate: SkillPackCreationData = {
            ...skillPackData,
            skill_type: skillType,
            lora_url: null,
            permissions: null,
            tests: tests,
        }
        
        // Don't include code if it's not a code-enhanced skill
        if(skillType === 'prompt') {
            delete (dataToCreate as Partial<SkillPackCreationData>).preprocessing_code;
            delete (dataToCreate as Partial<SkillPackCreationData>).postprocessing_code;
        }

        createSkillPack(dataToCreate);
        setSuccess(true);
        setTimeout(() => {
          setCurrentPage('marketplace');
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsSaving(false);
      }
    }, 1000);
  };
  
  const modelPlaceholders: { [key: string]: string } = {
      google: 'gemini-2.5-flash',
      openai: 'gpt-4o',
      anthropic: 'claude-3-5-sonnet-20240620',
      local: 'llama3'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <MotionDiv initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => setCurrentPage("marketplace")} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </button>
      </MotionDiv>

      <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-100">Build a New Skill Pack</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400">Craft your own custom AI capability.</p>
          </div>
        </div>
      </MotionDiv>

      <MotionForm onSubmit={handleSubmit} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Skill Pack Details
            </h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="font-medium text-slate-700 dark:text-slate-300">Skill Pack Name</label>
                <input id="name" type="text" value={skillPackData.name} onChange={handleInputChange} placeholder="e.g., Python Code Optimizer" required className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label htmlFor="category" className="font-medium text-slate-700 dark:text-slate-300">Category</label>
                <select id="category" value={skillPackData.category} onChange={handleSelectChange} className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="coding">Coding</option>
                  <option value="writing">Writing</option>
                  <option value="analysis">Analysis</option>
                  <option value="creative">Creative</option>
                  <option value="productivity">Productivity</option>
                  <option value="research">Research</option>
                  <option value="business">Business</option>
                  <option value="education">Education</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="font-medium text-slate-700 dark:text-slate-300">Description</label>
              <textarea id="description" value={skillPackData.description} onChange={handleInputChange} placeholder="Describe what this skill pack does..." required className="w-full min-h-[80px] p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="space-y-2">
                <label className="font-medium text-slate-700 dark:text-slate-300">Skill Type</label>
                <div className="flex p-1 rounded-lg bg-slate-100 dark:bg-slate-700/50">
                    <SkillTypeButton selected={skillType === 'prompt'} onClick={() => setSkillType('prompt')} icon={FileText}>Prompt-Based</SkillTypeButton>
                    <SkillTypeButton selected={skillType === 'code-enhanced'} onClick={() => setSkillType('code-enhanced')} icon={Code}>Code-Enhanced</SkillTypeButton>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {skillType === 'prompt'
                    ? 'A standard skill that relies on system instructions and prompt templates.'
                    : 'An advanced skill that can execute custom JavaScript to process prompts and responses.'}
                </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="prompt_template" className="font-medium text-slate-700 dark:text-slate-300">Prompt Template (Optional)</label>
              <textarea id="prompt_template" value={skillPackData.prompt_template} onChange={handleInputChange} rows={4} placeholder="Base prompt for the skill. e.g., 'You are a helpful assistant. The user wants you to...' " className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-slate-500 dark:text-slate-400">The core instruction for the AI. This is combined with system instructions.</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="system_instructions" className="font-medium text-slate-700 dark:text-slate-300">System Instructions (Optional)</label>
              <textarea id="system_instructions" value={skillPackData.system_instructions} onChange={handleInputChange} rows={4} placeholder="System-level instructions for the AI. e.g., 'Always respond in JSON format.' " className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Fine-tune the AI's behavior, personality, or output format.</p>
            </div>
            
            <AnimatePresence>
            {skillType === 'code-enhanced' && (
                <MotionDiv 
                    className="space-y-6"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '24px' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <CodeEditor
                        id="preprocessing_code"
                        label="Pre-processing Code"
                        description="JavaScript to execute on the user's prompt. Available as `prompt` variable. Must return a string."
                        value={skillPackData.preprocessing_code}
                        onChange={handleInputChange}
                    />
                    <CodeEditor
                        id="postprocessing_code"
                        label="Post-processing Code"
                        description="JavaScript to execute on the AI's response. Available as `response` variable. Must return a string."
                        value={skillPackData.postprocessing_code}
                        onChange={handleInputChange}
                    />
                </MotionDiv>
            )}
            </AnimatePresence>

            {/* Test Cases Section */}
            <TestCaseBuilder 
              tests={tests} 
              setTests={setTests} 
              skillPackData={skillPackData}
              skillType={skillType}
              apiKeys={apiKeys}
              customProviders={customProviders}
            />
             
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="provider" className="font-medium text-slate-700 dark:text-slate-300">AI Provider</label>
                <select id="provider" value={skillPackData.provider} onChange={handleSelectChange} className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="google">Google</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="local">Local (Ollama)</option>
                   {customProviders.length > 0 && (
                        <optgroup label="Custom Providers">
                            {customProviders.map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </optgroup>
                    )}
                </select>
              </div>
               <div className="space-y-2">
                <label htmlFor="base_model" className="font-medium text-slate-700 dark:text-slate-300">Base Model Name</label>
                <input id="base_model" type="text" value={skillPackData.base_model} onChange={handleInputChange} placeholder={modelPlaceholders[skillPackData.provider] || 'e.g., Llama-3-8B-Instruct'} required className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-2">
                <label htmlFor="cost_per_1k_tokens" className="font-medium text-slate-700 dark:text-slate-300">Cost / 1k Tokens (cents)</label>
                <input id="cost_per_1k_tokens" type="number" step="0.001" value={skillPackData.cost_per_1k_tokens} onChange={handleInputChange} placeholder="e.g., 0.02" required className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

             <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <h3 className="font-medium text-slate-800 dark:text-slate-200 mb-3">Monetization</h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label htmlFor="purchase_type" className="font-medium text-slate-700 dark:text-slate-300 text-sm">Purchase Type</label>
                        <select id="purchase_type" value={skillPackData.purchase_type} onChange={handleSelectChange} className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="free">Free</option>
                            <option value="one-time">One-Time Purchase</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label htmlFor="price" className="font-medium text-slate-700 dark:text-slate-300 text-sm">Price (USD)</label>
                        <input id="price" type="number" step="0.01" value={skillPackData.price} onChange={handleInputChange} placeholder="e.g., 10.00" required
                            disabled={skillPackData.purchase_type === 'free'}
                            className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed" />
                    </div>
                </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="author" className="font-medium text-slate-700 dark:text-slate-300">Author</label>
                  <input id="author" type="text" value={skillPackData.author} onChange={handleInputChange} placeholder="Your name or company name" className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="version" className="font-medium text-slate-700 dark:text-slate-300">Version</label>
                  <input id="version" type="text" value="1.0.0" readOnly className="w-full p-2 rounded-md border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700/50 cursor-not-allowed" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Initial version. Updates can be managed later.</p>
                </div>
            </div>


            {error && <p className="text-red-600 text-sm text-center">{error}</p>}
            {success && <p className="text-green-600 text-sm text-center">Skill Pack created successfully! Redirecting to Marketplace...</p>}
            
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={isSaving || success} className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-wait">
                <Save className="w-5 h-5" />
                {isSaving ? 'Saving...' : 'Create Skill Pack'}
              </button>
            </div>
          </div>
        </div>
      </MotionForm>
    </div>
  );
};

const SkillTypeButton: React.FC<{ selected: boolean, onClick: () => void, children: React.ReactNode, icon: React.ElementType }> = ({ selected, onClick, children, icon: Icon }) => (
    <button type="button" onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-md transition-colors ${selected ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-600/50'}`}>
        <Icon className="w-4 h-4" />
        {children}
    </button>
);

const CodeEditor: React.FC<{ id: string, label: string, description: string, value: string, onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void }> = ({ id, label, description, value, onChange }) => (
    <div className="space-y-2">
        <label htmlFor={id} className="font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <textarea 
            id={id} 
            value={value} 
            onChange={onChange} 
            rows={8} 
            className="w-full p-3 font-mono text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck="false"
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
);

type TestResult = { status: 'idle' | 'running' | 'passed' | 'failed'; actualOutput?: string; error?: string };
interface TestCaseBuilderProps {
  tests: { input: string; output: string }[];
  setTests: React.Dispatch<React.SetStateAction<{ input: string; output: string }[]>>;
  skillPackData: any;
  skillType: 'prompt' | 'code-enhanced';
  apiKeys: ApiKeys;
  customProviders: CustomProvider[];
}

const TestCaseBuilder: React.FC<TestCaseBuilderProps> = ({ tests, setTests, skillPackData, skillType, apiKeys, customProviders }) => {
    const [results, setResults] = useState<TestResult[]>([]);
    const { addToast } = useToast();
    const isTesting = results.some(r => r.status === 'running');

    useEffect(() => {
        setResults(Array(tests.length).fill({ status: 'idle' }));
    }, [tests.length]);

    const addTest = () => {
        setTests([...tests, { input: '', output: '' }]);
    };

    const updateTest = (index: number, field: 'input' | 'output', value: string) => {
        const newTests = [...tests];
        newTests[index][field] = value;
        setTests(newTests);
    };

    const removeTest = (index: number) => {
        setTests(tests.filter((_, i) => i !== index));
    };
    
    const runTests = async () => {
        setResults(tests.map(() => ({ status: 'running' })));
        
        const testPromises = tests.map((test): Promise<TestResult> =>
            testSkillExecution(
                { ...skillPackData, skill_type: skillType },
                test.input,
                apiKeys,
                customProviders
            ).then((actualOutput): TestResult => {
                const passed = actualOutput.trim() === test.output.trim();
                return { status: passed ? 'passed' : 'failed', actualOutput };
            }).catch((error): TestResult => ({
                status: 'failed',
                error: error instanceof Error ? error.message : 'An unknown error occurred'
            }))
        );

        const newResults = await Promise.all(testPromises);
        setResults(newResults);
        
        const passedCount = newResults.filter(r => r.status === 'passed').length;
        const failedCount = newResults.length - passedCount;
        addToast({
            type: failedCount > 0 ? 'warning' : 'success',
            title: 'Testing Complete',
            message: `${passedCount} passed, ${failedCount} failed.`
        });
    };

    const resultIcons = {
        running: <Loader2 className="w-4 h-4 animate-spin text-blue-500" />,
        passed: <CheckCircle className="w-4 h-4 text-green-500" />,
        failed: <AlertTriangle className="w-4 h-4 text-red-500" />,
        idle: null,
    };

    return (
        <div className="space-y-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-medium text-slate-800 dark:text-slate-200">Test Cases</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Define input/output pairs to test your skill's behavior.</p>
                </div>
                {tests.length > 0 && (
                    <button type="button" onClick={runTests} disabled={isTesting} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50">
                       {isTesting ? <><Loader2 className="w-4 h-4 animate-spin" /> Running...</> : 'Run Tests'}
                    </button>
                )}
            </div>
            {tests.map((test, index) => (
                <div key={index} className="p-3 border border-slate-300 dark:border-slate-600 rounded-md space-y-2 relative">
                    <div className="absolute top-2 right-2 flex items-center gap-2">
                        {results[index] && resultIcons[results[index].status]}
                        <button type="button" onClick={() => removeTest(index)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                    </div>
                    <textarea 
                        value={test.input}
                        onChange={(e) => updateTest(index, 'input', e.target.value)}
                        placeholder="Test Input..."
                        rows={2}
                        className="w-full p-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                     <textarea 
                        value={test.output}
                        onChange={(e) => updateTest(index, 'output', e.target.value)}
                        placeholder="Expected Output..."
                        rows={3}
                        className="w-full p-2 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <AnimatePresence>
                        {results[index]?.status === 'passed' && (
                            <MotionDiv
                                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-md"
                            >
                                <h4 className="text-xs font-bold text-green-700 dark:text-green-300">Test Passed! Actual Output:</h4>
                                <pre className="mt-1 text-xs whitespace-pre-wrap font-mono text-green-900 dark:text-green-200">{results[index].actualOutput}</pre>
                            </MotionDiv>
                        )}
                        {results[index]?.status === 'failed' && (
                            <MotionDiv
                                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-md"
                            >
                                <h4 className="text-xs font-bold text-red-800 dark:text-red-300">Expected Output:</h4>
                                <pre className="mt-1 text-xs whitespace-pre-wrap font-mono text-red-900 dark:text-red-200">{test.output}</pre>
                                <h4 className="mt-2 text-xs font-bold text-red-800 dark:text-red-300">Actual Output:</h4>
                                <pre className="mt-1 text-xs whitespace-pre-wrap font-mono text-red-900 dark:text-red-200">{results[index].actualOutput || 'No output was returned.'}</pre>
                                {results[index].error && (
                                    <>
                                        <h4 className="mt-2 text-xs font-bold text-red-800 dark:text-red-300">Error:</h4>
                                        <p className="mt-1 text-xs font-mono text-red-900 dark:text-red-200">{results[index].error}</p>
                                    </>
                                )}
                            </MotionDiv>
                        )}
                    </AnimatePresence>
                </div>
            ))}
            <button type="button" onClick={addTest} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg font-medium transition-colors text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                <Plus className="w-4 h-4"/> Add Test Case
            </button>
        </div>
    );
};


export default BuildSkillPack;