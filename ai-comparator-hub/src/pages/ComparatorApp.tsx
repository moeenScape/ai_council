import { useState, useCallback } from "react";
import { AppHeader } from "@/components/app/AppHeader";
import { ModelSelector } from "@/components/app/ModelSelector";
import { PromptInput, ContentType } from "@/components/app/PromptInput";
import { ResponsePanel, ModelResponse } from "@/components/app/ResponsePanel";
import { motion } from "framer-motion";
import { api, AIModel } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function ComparatorApp() {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gpt", "claude"]);
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("code");
  const [template, setTemplate] = useState("custom");
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { usage, refreshUsage } = useAuth();
  const { toast } = useToast();

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

    // Check quota
    if (usage && usage.remaining !== null && usage.remaining <= 0) {
      toast({
        title: "Quota exceeded",
        description: "You've reached your daily comparison limit. Upgrade to Pro for unlimited comparisons.",
        variant: "destructive",
      });
      return;
    }

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

    try {
      const result = await api.submitPrompt(
        prompt,
        contentType,
        selectedModels as AIModel[]
      );

      // Map API response to component format
      const mappedResponses: ModelResponse[] = result.responses.map((r) => ({
        modelId: r.model,
        content: r.content || r.errorMessage || "No response",
        responseTime: r.responseTimeMs / 1000,
        status: r.status === "success" ? "success" : "error",
      }));

      setResponses(mappedResponses);
      
      // Refresh usage stats
      await refreshUsage();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI responses",
        variant: "destructive",
      });
      
      // Set error state for all models
      setResponses(
        selectedModels.map((modelId) => ({
          modelId,
          content: error instanceof Error ? error.message : "Request failed",
          responseTime: 0,
          status: "error" as const,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [prompt, selectedModels, contentType, usage, refreshUsage, toast]);

  const canSubmit = prompt.trim().length > 0 && selectedModels.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      <main className="flex-1 container mx-auto px-4 py-6 flex flex-col gap-6">
        {/* Usage indicator */}
        {usage && (
          <div className="text-sm text-muted-foreground text-right">
            {usage.limit !== null ? (
              <span>
                {usage.remaining} / {usage.limit} comparisons remaining today
              </span>
            ) : (
              <span className="text-primary">Unlimited comparisons</span>
            )}
          </div>
        )}

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
          <ResponsePanel responses={responses} contentType={contentType} />
        </section>
      </main>
    </div>
  );
}
