import type { Session, SkillPack, Message, TaskProgress, SessionTemplate } from './types';

// NOTE: Sample data has been removed and is now being fetched from Supabase.
export const sampleSessions: Session[] = [];

export const sampleSkillPacks: SkillPack[] = [];

export const sampleMessagesBySession: Record<string, Message[]> = {};

export const sampleTasks: TaskProgress[] = [];

export const sampleSessionTemplates: SessionTemplate[] = [
    {
        id: 'template-1',
        name: 'Code Debugger',
        description: 'Load Python and Code Reviewer skills to find and fix bugs fast.',
        icon: '🐞',
        skillPackIds: ['68415a52-ced4-4aeb-b1aa-01f000000001', '68415a52-ced4-4aeb-b1aa-01f000000006'],
        initialPrompt: 'Here is my Python code, can you help me find the bug?\n\n```python\n# Paste your code here\n```'
    },
    {
        id: 'template-2',
        name: 'Blog Post Ideas',
        description: 'Brainstorm engaging and SEO-friendly blog post titles and outlines.',
        icon: '💡',
        skillPackIds: ['68415a52-ced4-4aeb-b1aa-01f000000002'],
        initialPrompt: 'Brainstorm 5 blog post ideas about the future of renewable energy. For each idea, provide a catchy title and a 3-point outline.'
    },
    {
        id: 'template-3',
        name: 'Frontend Builder',
        description: 'Generate HTML, CSS, and JS for a new web component.',
        icon: '✨',
        skillPackIds: ['68415a52-ced4-4aeb-b1aa-01f000000004'],
        initialPrompt: 'Create a responsive pricing table component with three tiers: Basic, Pro, and Enterprise. Include a toggle for monthly/yearly pricing.'
    }
];
