import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/app/AppHeader";
import { ModelSelector } from "@/components/app/ModelSelector";
import { PromptInput, ContentType } from "@/components/app/PromptInput";
import { ResponsePanel, ModelResponse } from "@/components/app/ResponsePanel";
import { HistorySidebar } from "@/components/app/HistorySidebar";
import { motion } from "framer-motion";
import { api, AIModel } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ComparatorApp() {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gpt"]);
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("code");
  const [template, setTemplate] = useState("custom");
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { usage, refreshUsage } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle payment success/cancel from Stripe redirect
  useEffect(() => {
    const upgrade = searchParams.get('upgrade');
    const sessionId = searchParams.get('session_id');

    if (upgrade === 'success' && sessionId) {
      api.verifyPaymentSession(sessionId)
        .then(() => {
          toast({
            title: "🎉 Upgrade successful!",
            description: "Your subscription has been upgraded. Enjoy unlimited comparisons!",
          });
          refreshUsage();
          window.location.href = '/app';
        })
        .catch((error) => {
          toast({
            title: "Verification failed",
            description: error instanceof Error ? error.message : "Could not verify payment",
            variant: "destructive",
          });
        });
      setSearchParams({});
    } else if (upgrade === 'cancelled') {
      toast({
        title: "Upgrade cancelled",
        description: "Your subscription was not changed.",
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, toast, refreshUsage]);

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

    if (usage && usage.remaining !== null && usage.remaining <= 0) {
      toast({
        title: "Quota exceeded",
        description: "You've reached your daily comparison limit. Upgrade to Pro for unlimited comparisons.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
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

      const mappedResponses: ModelResponse[] = result.responses.map((r) => ({
        modelId: r.model,
        content: r.content || r.errorMessage || "No response",
        responseTime: r.responseTimeMs / 1000,
        status: r.status === "success" ? "success" : "error",
      }));

      setResponses(mappedResponses);
      await refreshUsage();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI responses",
        variant: "destructive",
      });
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

  const handleSelectHistory = useCallback(async (id: string) => {
    try {
      const result = await api.getHistoryItem(id);
      setPrompt(result.prompt.content);
      setContentType(result.prompt.contentType);
      setSelectedModels(result.responses.map(r => r.model));
      setResponses(result.responses.map(r => ({
        modelId: r.model,
        content: r.content || r.errorMessage || "No response",
        responseTime: r.responseTimeMs / 1000,
        status: r.status === "success" ? "success" : "error",
      })));
      setSidebarOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load history item",
        variant: "destructive",
      });
    }
  }, [toast]);

  const canSubmit = prompt.trim().length > 0 && selectedModels.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      <HistorySidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSelectHistory={handleSelectHistory}
      />
      
      <main className={cn(
        "flex-1 container mx-auto px-4 py-6 flex flex-col gap-6 transition-all duration-300",
        sidebarOpen && "ml-72"
      )}>
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

        <section className="flex-1 flex flex-col min-h-[400px]">
          <ResponsePanel responses={responses} contentType={contentType} />
        </section>
      </main>
    </div>
  );
}
