import { useState, useCallback } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { ModelSelector } from "@/components/app/ModelSelector";
import { PromptInput, ContentType } from "@/components/app/PromptInput";
import { ResponsePanel, ModelResponse } from "@/components/app/ResponsePanel";
import { motion } from "framer-motion";

// Mock responses for demo
const MOCK_RESPONSES: Record<string, string> = {
  gpt: `Here's a comprehensive solution to your request:

1. **Analysis**: I've analyzed the prompt and identified the key requirements.

2. **Implementation**:
\`\`\`typescript
function processData(input: string): Result {
  const parsed = parseInput(input);
  const validated = validateData(parsed);
  return transformResult(validated);
}
\`\`\`

3. **Key Considerations**:
   - Error handling is implemented for edge cases
   - The solution is optimized for performance
   - Type safety is ensured throughout

4. **Next Steps**:
   - Add unit tests for the main function
   - Consider adding logging for debugging
   - Review for any security implications`,

  claude: `I'd be happy to help with your request. Let me provide a thoughtful analysis:

## Understanding the Problem

The core challenge here involves processing and transforming data efficiently while maintaining code quality.

## Proposed Solution

\`\`\`typescript
const solution = {
  step1: "Parse and validate input",
  step2: "Apply transformation logic",
  step3: "Return structured output"
};
\`\`\`

## Important Notes

1. This approach prioritizes readability and maintainability
2. The solution handles edge cases gracefully
3. Consider adding comprehensive error messages

Would you like me to elaborate on any specific aspect of this solution?`,

  grok: `Alright, let's break this down! 🚀

Here's what I'm thinking:

**The Quick Answer:**
Your request can be solved with a clean, efficient approach.

**The Code:**
\`\`\`typescript
// Simple, effective, gets the job done
const result = input
  .split('\\n')
  .map(line => processLine(line))
  .filter(Boolean)
  .join('\\n');
\`\`\`

**Pro Tips:**
- Keep it simple, don't over-engineer
- This handles 99% of use cases
- Add complexity only when needed

**Fun Fact:** This approach is about 40% faster than the traditional method. Science! 🔬`,
};

export default function ComparatorApp() {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gpt", "claude"]);
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("code");
  const [template, setTemplate] = useState("custom");
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggleModel = useCallback((modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, modelId];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;

    setIsLoading(true);
    
    // Initialize loading states
    setResponses(
      selectedModels.map((modelId) => ({
        modelId,
        content: "",
        responseTime: 0,
        status: "loading" as const,
      }))
    );

    // Simulate parallel API calls with varying response times
    const results = await Promise.all(
      selectedModels.map(async (modelId) => {
        const startTime = performance.now();
        // Simulate varying response times (1-3 seconds)
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));
        const endTime = performance.now();
        
        return {
          modelId,
          content: MOCK_RESPONSES[modelId] || "Response not available.",
          responseTime: (endTime - startTime) / 1000,
          status: "success" as const,
        };
      })
    );

    setResponses(results);
    setIsLoading(false);
  }, [prompt, selectedModels]);

  const canSubmit = prompt.trim().length > 0 && selectedModels.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Input Section */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6 p-6 rounded-xl border border-border bg-card"
        >
          <ModelSelector
            selectedModels={selectedModels}
            onToggleModel={handleToggleModel}
          />
          
          <PromptInput
            prompt={prompt}
            onPromptChange={setPrompt}
            contentType={contentType}
            onContentTypeChange={setContentType}
            template={template}
            onTemplateChange={setTemplate}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            canSubmit={canSubmit}
          />
        </motion.section>

        {/* Results Section */}
        <section className="flex-1 flex flex-col min-h-[400px]">
          <ResponsePanel responses={responses} />
        </section>
      </main>
    </div>
  );
}
