import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Sparkles, Box, MessageCircle, ShoppingBag, ArrowRight, Zap, BookOpen, 
    BarChart3, DollarSign, Code, Layers, PlusCircle, ChevronDown, Bot, PlayCircle, UserCircle, Loader2
} from './icons';

// This is a workaround for a TypeScript issue with framer-motion's props.
const MotionDiv = motion.div as any;
const MotionHeader = motion.header as any;

interface LandingPageProps {
  onLogin: () => void;
  onSignup: () => void;
  onViewLegal: (type: 'privacy' | 'terms') => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onSignup, onViewLegal }) => {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 overflow-x-hidden">
      <Header onLogin={onLogin} onSignup={onSignup} />

      <main>
        <HeroSection onSignup={onSignup} />
        <HowItWorksSection />
        <FeaturesSection />
        <InteractiveDemoSection />
        <UseCasesSection />
        <FAQSection />
        <FinalCTA onSignup={onSignup} />
      </main>

      <Footer onViewLegal={onViewLegal} />
    </div>
  );
};

const Header: React.FC<{onLogin: () => void, onSignup: () => void}> = ({ onLogin, onSignup }) => {
    useEffect(() => {
        const navLinks = document.querySelectorAll('header nav a[href^="#"]');

        const handleClick = (e: Event) => {
            e.preventDefault();
            const targetId = (e.currentTarget as HTMLAnchorElement).getAttribute('href')?.substring(1);
            if (!targetId) return;
            
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                const headerOffset = 80; // Height of the fixed header
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        };

        navLinks.forEach(link => {
            link.addEventListener('click', handleClick as EventListener);
        });

        return () => {
            navLinks.forEach(link => {
                link.removeEventListener('click', handleClick as EventListener);
            });
        };
    }, []);

    return (
        <MotionHeader 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800"
        >
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
              <a href="#" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h1 className="font-bold text-xl">SuperModel AI</h1>
              </a>
              <nav className="hidden md:flex items-center space-x-8">
                <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a>
                <a href="#demo" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Demo</a>
                <a href="#use-cases" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Use Cases</a>
                <a href="#faq" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</a>
              </nav>
              <div className="flex items-center space-x-4">
                <button onClick={onLogin} className="hidden sm:block text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Log In
                </button>
                <button onClick={onSignup} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors flex items-center gap-2">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </MotionHeader>
    );
};

const HeroSection: React.FC<{onSignup: () => void}> = ({ onSignup }) => (
    <section className="relative pt-40 pb-24 text-center">
         <div
            className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-slate-900 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"></div>

        <div className="container mx-auto px-6">
            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-400 mb-6">
                The Modular AI Platform for Developers & Creators.
              </h1>
              <p className="max-w-3xl mx-auto text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10">
                Start with a powerful core AI, then enhance its capabilities with specialized "Skill Packs" from our community marketplace. Build the exact tool you need, for any task.
              </p>
              <button onClick={onSignup} className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105">
                Start Building for Free
              </button>
            </MotionDiv>
          </div>
    </section>
);

const HowItWorksSection = () => {
    const steps = [
        { icon: Sparkles, title: 'Core Intelligence', description: 'Begin with the powerful Gemini 2.5 Flash model, ready for any general task.' },
        { icon: Layers, title: 'Enhance with Skills', description: 'Browse the marketplace to install specialized skills for coding, writing, analysis, and more.' },
        { icon: MessageCircle, title: 'Integrate & Chat', description: 'Your customized AI seamlessly uses the right skills in our advanced chat interface.' },
        { icon: PlusCircle, title: 'Build & Share', description: 'Use our Creator Toolkit to build, test, and publish your own skills on the marketplace.' },
    ];
    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold">A Transparent Development Process</h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">Understand exactly how your AI gets its power.</p>
                </div>
                <div className="grid md:grid-cols-4 gap-8">
                    {steps.map((step, i) => (
                        <MotionDiv 
                            key={step.title}
                            className="text-center p-6"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.5 }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                <step.icon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400">{step.description}</p>
                        </MotionDiv>
                    ))}
                </div>
            </div>
        </section>
    )
};

const FeaturesSection = () => {
    const features = [
        { icon: Box, title: "Modular Skill Architecture", description: "Isolate capabilities into reusable Skill Packs. Activate only what you need for a cleaner, more focused AI." },
        { icon: ShoppingBag, title: "Open Marketplace", description: "Discover, install, and share skills built by a community of developers. Find the perfect tool for any project." },
        { icon: Code, title: "Interactive Code Execution", description: "Generate and preview live, runnable frontend components directly in the chat for rapid prototyping." },
        { icon: MessageCircle, title: "Advanced Chat Interface", description: "Manage conversation history, share sessions with a public link, and interact with a rich, responsive UI." },
        { icon: BarChart3, title: "Usage Analytics", description: "Keep track of your token usage and costs with a clear, detailed analytics dashboard." },
        { icon: DollarSign, title: "Creator Toolkit", description: "Build, publish, and monetize your own AI skills. Our platform provides the tools to bring your ideas to life." },
    ];

    return (
         <section id="features" className="py-24 bg-white dark:bg-slate-900">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold">Everything You Need to Build Smarter</h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">A platform designed for power, flexibility, and control.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, i) => <FeatureCard key={feature.title} i={i} {...feature} />)}
                </div>
            </div>
        </section>
    )
};

const FeatureCard: React.FC<{ icon: React.ElementType, title: string, description: string, i: number }> = ({ icon: Icon, title, description, i }) => (
    <MotionDiv 
        className="p-8 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5, delay: i * 0.1 }}
    >
        <div className="inline-flex items-center justify-center w-12 h-12 mb-5 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 rounded-xl">
            <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400">{description}</p>
    </MotionDiv>
);

const demoScenarios = {
    'Generate an interactive component': {
        skill: "JavaScript Pro",
        response: `Of course. Here is a modern, interactive "Contact Us" form built with vanilla HTML, CSS, and JavaScript.

\`\`\`html
<div id="contact-form-container">
  <h2>Contact Us</h2>
  <form id="contact-form">
    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" id="name" required />
    </div>
    <div class="form-group">
      <label for="email">Email</label>
      <input type="email" id="email" required />
    </div>
    <div class="form-group">
      <label for="message">Message</label>
      <textarea id="message" rows="4" required></textarea>
    </div>
    <button type="submit">Send Message</button>
  </form>
</div>
\`\`\`

\`\`\`css
/* Basic styling for the form */
#contact-form-container {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  font-family: sans-serif;
}
.form-group {
  margin-bottom: 1.5rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
}
input, textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  transition: box-shadow 0.2s;
  box-sizing: border-box; /* Ensures padding doesn't affect width */
}
input:focus, textarea:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
}
button {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 8px;
  background-color: #2563eb;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}
button:hover {
    background-color: #1d4ed8;
}
\`\`\`

\`\`\`javascript
const form = document.getElementById('contact-form');
const container = document.getElementById('contact-form-container');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('name');
  const name = nameInput ? nameInput.value : 'friend';

  // Clear the form
  form.style.display = 'none';
  
  // Show a success message
  const successMessage = document.createElement('p');
  successMessage.textContent = \`Thank you, \${name}! Your message has been sent.\`;
  successMessage.style.textAlign = 'center';
  successMessage.style.color = '#166534';
  container.appendChild(successMessage);
});
\`\`\``
    },
    'Write marketing copy': {
        skill: "Content Creator Pro",
        response: `Here are three distinct variations for marketing copy, each targeting a slightly different angle for the SuperModel AI platform.

**Option 1: The Developer-Centric Angle (Direct & Feature-focused)**

**Headline:** Stop Building Monolithic AI. Start Composing Intelligence.
**Body:** Tired of wrestling with one-size-fits-all AI? SuperModel gives you the power of modularity. Start with a powerful Gemini core, then bolt on specialized skills for any task—from a Python code reviewer to a SQL data analyst. Activate only what you need, for a faster, cleaner, and more cost-effective workflow.
**Call-to-Action:** Build Your Custom AI Free

**Option 2: The Creator Economy Angle (Empowering & Visionary)**

**Headline:** Don't Just Use AI. Create It.
**Body:** The future of AI is you. SuperModel AI isn't just a tool; it's a platform. Our Creator Toolkit gives you everything you need to build, test, and monetize your own unique AI skills on our open marketplace. If you can imagine a new AI capability, you can build it here.
**Call-to-Action:** Become a Creator Today

**Option 3: The Efficiency & Productivity Angle (Benefit-focused)**

**Headline:** The Right AI for Every Task, Instantly.
**Body:** Why use a generic chatbot for specialized work? With SuperModel AI, you can instantly equip your AI with the exact skills you need. Draft marketing copy, generate complex code, or analyze data with purpose-built Skill Packs. It's the smarter, faster way to get from idea to execution.
**Call-to-Action:** Upgrade Your Workflow`
    },
    'Review code for bugs': {
        skill: "Code Reviewer",
        response: `Certainly. I've analyzed the provided JavaScript snippet. Here is my review:

**Summary:**
The code has a critical bug that will cause an infinite loop and crash the browser tab. It also uses an outdated method for DOM manipulation and could be improved for clarity and performance.

**Original Code:**
\`\`\`javascript
// Goal: Create 10 buttons and add them to the page
const container = document.getElementById('btn-container');
for (var i = 0; i < 10; i++); {
  const btn = document.createElement('button');
  btn.innerHTML = 'Button ' + i;
  container.appendChild(btn);
}
\`\`\`

**Issues Found:**

1.  **Critical Bug (Infinite Loop):** There is a semicolon \`;\` immediately after the \`for\` loop's parenthesis. This terminates the loop statement, causing the following block \`{...}\` to execute only once, but with \`i\` already at its final value (10). The loop itself runs empty 10 times, doing nothing. The code *appears* to work due to a typo, but it is fundamentally broken. If the semicolon were removed, it would reveal another bug: the loop would never end because \`i\` is not incremented inside a block controlled by the loop condition.
    
2.  **Performance:** Appending to the DOM in a loop (\`container.appendChild\`) can be inefficient as it causes multiple "reflows" of the page. It's better to create all elements in memory first and append them in a single operation.

**Refactored & Recommended Code:**
\`\`\`javascript
// Goal: Create 10 buttons and add them to the page
const container = document.getElementById('btn-container');

// Use a DocumentFragment for performance. This is a memory-only
// container that we can build up before adding to the real DOM.
const fragment = document.createDocumentFragment();

for (let i = 0; i < 10; i++) {
  const btn = document.createElement('button');
  // Use textContent instead of innerHTML for better security and performance
  btn.textContent = \`Button \${i + 1}\`; 
  fragment.appendChild(btn);
}

// Append all buttons to the real DOM in a single operation.
container.appendChild(fragment);
\`\`\``,
    },
    'Optimize a Python function': {
        skill: "Python Code Expert",
        response: `I'd be happy to optimize that Python function. The original version is inefficient for large lists due to repeated string concatenation.

**Original (Inefficient) Code:**
\`\`\`python
def process_items_inefficient(items):
    """
    Processes a list of items into a single,
    comma-separated string.
    This version is inefficient due to creating
    a new string in every loop iteration.
    """
    result_string = ""
    for item in items:
        result_string += str(item) + ", "
    # Remove the trailing comma and space
    return result_string[:-2]
\`\`\`

**Analysis:**
The primary issue is the use of \`+=\` for strings inside a loop. In Python, strings are immutable. This means each time you do \`result_string += ...\`, a *new* string is created in memory, and the contents of the old string and the new part are copied over. For a list with 'n' items, this results in O(n²) complexity, which is very slow for large inputs.

**Optimized Code:**
\`\`\`python
def process_items_efficient(items):
    """
    Processes a list of items into a single,
    comma-separated string efficiently.
    This version uses the str.join() method,
    which is highly optimized for this task.
    """
    # Use a generator expression within join() for memory efficiency
    return ", ".join(str(item) for item in items)
\`\`\`

**Why it's better:**
1.  **Performance:** The \`str.join()\` method is implemented in C and is highly optimized. It calculates the final required memory for the string just once, then iterates through the list and copies each item. This gives it a time complexity of O(n), which is significantly faster.
2.  **Readability:** The optimized version is more concise and idiomatic in Python. It clearly expresses the intent: "join these items with a comma."`
    },
    'Explain a statistical concept': {
        skill: "Data Analyst",
        response: `Let's break down one of the most common yet misunderstood concepts in statistics: the **p-value**.

**Simple Analogy: A Courtroom**
Imagine a defendant is on trial. The principle is "innocent until proven guilty."
-   The **Null Hypothesis (H₀)** is the default assumption: "The defendant is innocent."
-   The **Alternative Hypothesis (H₁)** is what you're trying to prove: "The defendant is guilty."
-   The **evidence** is your collected data.

The **p-value** is the probability of seeing the collected evidence (or even more extreme evidence) *if the defendant were actually innocent (i.e., if the null hypothesis were true)*.

**What does a p-value tell you?**
-   **Low p-value (e.g., < 0.05):** This means the evidence you collected is very unlikely to have happened by random chance if the defendant was innocent. It's a "surprising" result. This gives you strong reason to **reject the null hypothesis** ("innocent") in favor of the alternative ("guilty").
-   **High p-value (e.g., > 0.05):** This means the evidence you collected is quite plausible, or not surprising, if the defendant were innocent. It's not a strong enough result to convict. You **fail to reject the null hypothesis**.

**Crucial Misconception:**
The p-value is NOT the probability that the null hypothesis is true. A p-value of 0.03 does not mean there's a 3% chance the defendant is innocent. It means there's a 3% chance you'd see your evidence if they were innocent.`
    },
    'Outline a business presentation': {
        skill: "Presentation Designer",
        response: `Here is a professional 8-slide outline for a "Q3 Launch Strategy" presentation, designed for clarity and impact.

### Slide 1: Title Slide
- **Title:** Project Phoenix: Q3 Launch Strategy
- **Subtitle:** A New Era of User Engagement
- **Presenter Name & Date**

### Slide 2: The Problem
- **Headline:** The Market is Shifting
- **Key Point 1:** Current user growth has plateaued by 15% quarter-over-quarter.
- **Key Point 2:** Competitor X has captured a new, younger demographic we are missing.
- **Visual:** A simple line chart showing the slowing growth rate.

### Slide 3: The Opportunity
- **Headline:** Untapped Potential in the Creator Segment
- **Key Point 1:** Market research identifies a $50M addressable market in mid-tier content creators.
- **Key Point 2:** This segment values customization and monetization tools, which are currently underserved.
- **Visual:** A Venn diagram showing market segments.

### Slide 4: Our Solution: Project Phoenix
- **Headline:** The All-in-One Platform for Creators
- **Key Feature 1:** Modular design for ultimate customization.
- **Key Feature 2:** Integrated monetization via our Skill Pack marketplace.
- **Key Feature 3:** Advanced analytics to track engagement.
- **Visual:** A clean, 3-column layout with icons for each feature.

### Slide 5: Go-to-Market Strategy
- **Headline:** A Phased, High-Impact Launch
- **Phase 1 (July):** Influencer outreach & beta program.
- **Phase 2 (August):** Content marketing push & strategic partnerships.
- **Phase 3 (September):** Public launch with promotional offers.

### Slide 6: Financial Projections
- **Headline:** A Clear Path to Profitability
- **Metric 1:** Target 5,000 new creator sign-ups in Q3.
- **Metric 2:** Projected Customer Acquisition Cost (CAC) of $25.
- **Metric 3:** Projected Lifetime Value (LTV) of $150.
- **Visual:** A simple bar chart showing projected sign-ups vs. goals.

### Slide 7: The Team
- **Headline:** The Experts Behind the Vision
- **Photos & Titles:** Briefly introduce the key leads on the project (e.g., Product Lead, Engineering Lead, Marketing Lead).

### Slide 8: Next Steps & Q&A
- **Headline:** Questions?
- **Next Step 1:** Finalize budget by June 15th.
- **Next Step 2:** Begin influencer outreach by July 1st.
- **Contact Info:** yourname@example.com`
    }
};

const InteractiveDemoSection = () => {
    const [activePrompt, setActivePrompt] = useState<string | null>(null);
    const [aiResponse, setAiResponse] = useState('');
    const [displayedResponse, setDisplayedResponse] = useState('');
    const [demoState, setDemoState] = useState<'idle' | 'thinking' | 'typing' | 'done'>('idle');
    const isBusy = demoState === 'thinking' || demoState === 'typing';

    useEffect(() => {
        if (demoState !== 'typing') return;

        setDisplayedResponse('');
        let i = 0;
        const intervalId = setInterval(() => {
            setDisplayedResponse(aiResponse.substring(0, i));
            i++;
            if (i > aiResponse.length) {
                clearInterval(intervalId);
                setDemoState('done');
            }
        }, 15);

        return () => clearInterval(intervalId);
    }, [demoState, aiResponse]);

    const handlePromptClick = (prompt: string) => {
        if (isBusy) return;
        const scenario = demoScenarios[prompt as keyof typeof demoScenarios];
        setActivePrompt(prompt);
        setAiResponse(scenario.response);
        setDemoState('thinking');

        setTimeout(() => {
            setDemoState('typing');
        }, 1500);
    };
    
    const renderResponse = (text: string) => {
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```')) {
                const code = part.replace(/```(?:html|css|javascript|js|python)?\n?/g, '').replace(/```/g, '');
                return (
                    <pre key={index} className="bg-slate-800 dark:bg-black/50 text-white p-4 rounded-md my-4 font-mono text-sm overflow-x-auto">
                        <code>{code}</code>
                    </pre>
                );
            }
             if (part.startsWith('**') || part.startsWith('###')) {
                return <p key={index} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{__html: part.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/### (.*)/g, '<h3 class="font-semibold text-lg mt-4 mb-2">$1</h3>')}}></p>
            }
            return <p key={index} className="whitespace-pre-wrap">{part}</p>;
        });
    };

    return (
        <section id="demo" className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold">Experience It Live. No Signup Required.</h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">Select a prompt below to see the SuperModel AI in action.</p>
                </div>
                <div className="max-w-6xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-4 sm:p-6 lg:p-8">
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                             <h3 className="text-lg font-semibold mb-4 text-slate-700 dark:text-slate-200">Try one of these:</h3>
                             <div className="space-y-3">
                                {Object.keys(demoScenarios).map(prompt => (
                                    <button
                                        key={prompt}
                                        onClick={() => handlePromptClick(prompt)}
                                        disabled={isBusy}
                                        className="w-full text-left p-4 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-wait text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                    >
                                        <div className="flex items-start gap-3">
                                            <PlayCircle className="w-5 h-5 mt-0.5 text-slate-400 flex-shrink-0" />
                                            <span className="font-medium">{prompt}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 h-[450px] lg:h-[600px] flex flex-col">
                            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                                {demoState === 'idle' && (
                                    <div className="h-full flex items-center justify-center">
                                        <div className="text-center text-slate-500 dark:text-slate-400">
                                            <Bot className="w-12 h-12 mx-auto mb-4" />
                                            <p>AI response will appear here...</p>
                                        </div>
                                    </div>
                                )}
                                {activePrompt && (
                                    <div className="flex items-start gap-3 justify-end">
                                        <div className="max-w-xl p-3 rounded-2xl bg-blue-600 text-white rounded-br-lg">
                                            <p>{activePrompt}</p>
                                        </div>
                                        <UserCircle className="w-8 h-8 text-slate-400 flex-shrink-0" />
                                    </div>
                                )}
                                {demoState === 'thinking' && (
                                    <div className="flex items-start gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600">
                                            <div className="flex space-x-1.5">
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {(demoState === 'typing' || demoState === 'done') && (
                                    <div className="flex items-start gap-3 justify-start">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="max-w-xl p-3 rounded-2xl bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-bl-lg">
                                            {renderResponse(displayedResponse)}
                                            {demoState === 'typing' && <span className="streaming-cursor" />}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                <input type="text" placeholder="Select a prompt above to begin..." disabled className="w-full p-2.5 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-lg cursor-not-allowed" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};


const UseCasesSection = () => (
     <section id="use-cases" className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold">Built for Real-World Application</h2>
                <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">See how SuperModel AI accelerates workflows for every role.</p>
            </div>
            <div className="grid lg:grid-cols-3 gap-8">
                <UseCaseCard
                    role="For Developers"
                    title="Rapid Prototyping"
                    description="Instantly generate and test frontend components. Go from prompt to live preview in seconds."
                    prompt="Create a responsive pricing table with a monthly/yearly toggle."
                />
                 <UseCaseCard
                    role="For Writers"
                    title="Content Generation"
                    description="Brainstorm, outline, and draft articles or marketing copy with SEO-aware skills."
                    prompt="Brainstorm 5 blog post ideas about the future of renewable energy."
                />
                 <UseCaseCard
                    role="For Creators"
                    title="Custom Skill Development"
                    description="Build and deploy a new skill that adds a unique capability, like summarizing legal documents."
                    prompt="[system] New Skill: LegalEase. Description: Summarizes legal text..."
                />
            </div>
        </div>
    </section>
);

const UseCaseCard: React.FC<{role: string, title: string, description: string, prompt: string}> = ({ role, title, description, prompt }) => (
    <MotionDiv 
        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
        whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'}}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.5 }}
    >
        <div className="p-8">
            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-2">{role}</p>
            <h3 className="text-2xl font-bold mb-3">{title}</h3>
            <p className="text-slate-600 dark:text-slate-400">{description}</p>
        </div>
        <div className="bg-slate-50/50 dark:bg-slate-800/50 p-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Example Prompt</p>
            <code className="text-sm text-slate-700 dark:text-slate-300 font-mono bg-slate-200/50 dark:bg-slate-700/50 p-3 rounded-md block">
                {prompt}
            </code>
        </div>
    </MotionDiv>
);

const FAQSection = () => {
    const faqs = [
        { q: "What is SuperModel AI?", a: "SuperModel AI is a modular chat platform that allows you to customize your AI's capabilities by installing 'Skill Packs'. Instead of a one-size-fits-all solution, you can build a specialized assistant tailored to your specific needs." },
        { q: "What are Skill Packs?", a: "Skill Packs are add-ons that give the AI new abilities. For example, the 'Python Code Expert' skill pack trains the AI to be a world-class Python developer, while the 'Content Creator Pro' skill pack turns it into an expert copywriter. You can activate multiple skills at once." },
        { q: "Can I build and sell my own Skill Packs?", a: "Yes! SuperModel AI is designed for creators. We provide a straightforward toolkit for you to build, test, and publish your own skills on our marketplace. You can offer them for free or set a price and receive payouts via Stripe." },
        { q: "What AI models do you use?", a: "Our core platform is built on Google's powerful and efficient 'gemini-2.5-flash' model. However, Skill Packs can be configured to use different models or even connect to local models, providing ultimate flexibility." },
        { q: "Is my data secure?", a: "Security is our top priority. Your conversations are protected with end-to-end encryption. We use Supabase for our backend, which enforces strict Row-Level Security, ensuring that you are the only one who can access your data." },
        { q: "How is pricing calculated?", a: "The platform itself is free to use. Costs are based on the token usage of the Skill Packs you activate. Each skill has a transparent cost-per-token, which you can monitor in your analytics dashboard. We also have a marketplace for premium, one-time purchase skills." },
    ];
    return (
         <section id="faq" className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="container mx-auto px-6 max-w-3xl">
                 <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold">Frequently Asked Questions</h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 mt-4">Have questions? We have answers.</p>
                </div>
                <div className="space-y-4">
                    {faqs.map(faq => <FAQItem key={faq.q} question={faq.q} answer={faq.a} />)}
                </div>
            </div>
        </section>
    )
};

const FAQItem: React.FC<{question: string, answer: string}> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left py-2">
                <h3 className="text-lg font-semibold">{question}</h3>
                <MotionDiv animate={{ rotate: isOpen ? 180 : 0 }}>
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                </MotionDiv>
            </button>
            <AnimatePresence>
            {isOpen && (
                <MotionDiv
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    <p className="pt-3 text-slate-600 dark:text-slate-400">
                        {answer}
                    </p>
                </MotionDiv>
            )}
            </AnimatePresence>
        </div>
    )
};

const FinalCTA: React.FC<{onSignup: () => void}> = ({ onSignup }) => (
    <section className="py-24 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6 text-center">
            <MotionDiv
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Build Your SuperModel?</h2>
                <p className="max-w-xl mx-auto text-lg text-slate-600 dark:text-slate-400 mb-8">
                    Sign up today and get free access to our core AI and a selection of powerful Skill Packs.
                </p>
                <button onClick={onSignup} className="px-8 py-4 bg-blue-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105">
                    Sign Up Free, No Credit Card Required
                </button>
            </MotionDiv>
        </div>
    </section>
);


const Footer: React.FC<{onViewLegal: (type: 'privacy' | 'terms') => void}> = ({ onViewLegal }) => (
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-6 text-center">
          <p className="text-slate-500 dark:text-slate-400">&copy; {new Date().getFullYear()} SuperModel AI. All rights reserved.</p>
          <div className="mt-4 flex justify-center items-center gap-6 text-sm">
            <button onClick={() => onViewLegal('privacy')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-500">
                <BookOpen className="w-4 h-4"/> Privacy Policy
            </button>
             <button onClick={() => onViewLegal('terms')} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-blue-500">
                <BookOpen className="w-4 h-4"/> Terms of Service
            </button>
          </div>
        </div>
      </footer>
);

export default LandingPage;