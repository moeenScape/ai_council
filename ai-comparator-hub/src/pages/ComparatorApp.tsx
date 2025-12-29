import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppHeader } from "@/components/app/AppHeader";
import { ModelSelector } from "@/components/app/ModelSelector";
import { PromptInput, ContentType } from "@/components/app/PromptInput";
import { ChatSidebar } from "@/components/app/ChatSidebar";
import { UpgradeModal } from "@/components/app/UpgradeModal";
import { api, AIModel, ChatMessageWithResponses } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Copy, Check, Clock, Loader2, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const MODEL_COLORS: Record<AIModel, { bg: string; text: string; name: string }> = {
  gpt: { bg: "bg-gpt/20", text: "text-gpt", name: "GPT-4" },
  claude: { bg: "bg-claude/20", text: "text-claude", name: "Claude" },
  grok: { bg: "bg-grok/20", text: "text-grok", name: "Grok" },
};

function MessageBubble({ message }: { message: ChatMessageWithResponses }) {
  const [copiedModel, setCopiedModel] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = async (model: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedModel(model);
    toast({ title: "Copied!", description: "Response copied to clipboard." });
    setTimeout(() => setCopiedModel(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <div className="flex items-center gap-2 mt-2 text-xs opacity-70">
            {message.models.map(m => (
              <span key={m} className="px-1.5 py-0.5 rounded bg-white/20">
                {m.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* AI responses */}
      <div className={cn(
        "grid gap-3",
        message.responses.length === 1 ? "grid-cols-1" :
        message.responses.length === 2 ? "grid-cols-1 md:grid-cols-2" :
        "grid-cols-1 md:grid-cols-3"
      )}>
        {message.responses.map((response) => {
          const colors = MODEL_COLORS[response.model];
          return (
            <div
              key={response.model}
              className={cn("rounded-xl border border-border overflow-hidden", colors.bg)}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                <span className={cn("font-medium text-sm", colors.text)}>
                  {colors.name}
                </span>
                <div className="flex items-center gap-2">
                  {response.status === "success" && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(response.responseTimeMs / 1000).toFixed(2)}s
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleCopy(response.model, response.content)}
                  >
                    {copiedModel === response.model ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="p-3">
                {response.status === "error" ? (
                  <p className="text-destructive text-sm">
                    {response.errorMessage || "Error getting response"}
                  </p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {response.content}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ComparatorApp() {
  const [selectedModels, setSelectedModels] = useState<string[]>(["gpt"]);
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState<ContentType>("code");
  const [template, setTemplate] = useState("custom");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageWithResponses[]>([]);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { usage, refreshUsage, user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle URL params
  useEffect(() => {
    const sessionId = searchParams.get('session');
    const upgrade = searchParams.get('upgrade');
    const paymentSessionId = searchParams.get('session_id');

    if (sessionId) {
      loadSession(sessionId);
      setSearchParams({});
    }

    if (upgrade === 'success' && paymentSessionId) {
      api.verifyPaymentSession(paymentSessionId)
        .then(() => {
          toast({
            title: "🎉 Upgrade successful!",
            description: "Your subscription has been upgraded!",
          });
          refreshUsage();
          window.location.href = '/app';
        })
        .catch(() => {
          toast({
            title: "Verification failed",
            description: "Could not verify payment",
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
    } else if (upgrade === 'open') {
      setUpgradeModalOpen(true);
      setSearchParams({});
    }
  }, [searchParams]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSession = async (sessionId: string) => {
    try {
      const data = await api.getSession(sessionId);
      setCurrentSessionId(sessionId);
      setMessages(data.messages);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load session",
        variant: "destructive",
      });
    }
  };

  const handleToggleModel = useCallback((modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, modelId];
    });
  }, []);

  const handleNewChat = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setPrompt("");
  }, []);

  const handleSelectSession = useCallback((sessionId: string) => {
    loadSession(sessionId);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || selectedModels.length === 0) return;

    if (usage && usage.remaining !== null && usage.remaining <= 0) {
      toast({
        title: "Quota exceeded",
        description: "Upgrade to Pro for unlimited comparisons.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const currentPrompt = prompt;
    setPrompt("");

    try {
      let sessionId = currentSessionId;

      // Create new session if needed
      if (!sessionId) {
        const session = await api.createSession();
        sessionId = session.id;
        setCurrentSessionId(sessionId);
      }

      // Add optimistic message
      const optimisticMessage: ChatMessageWithResponses = {
        id: 'temp-' + Date.now(),
        sessionId: sessionId,
        content: currentPrompt,
        contentType,
        models: selectedModels as AIModel[],
        createdAt: new Date().toISOString(),
        responses: selectedModels.map(m => ({
          model: m as AIModel,
          content: "",
          responseTimeMs: 0,
          status: "success" as const,
        })),
      };
      setMessages(prev => [...prev, optimisticMessage]);

      // Send message
      const message = await api.sendMessage(
        sessionId,
        currentPrompt,
        contentType,
        selectedModels as AIModel[]
      );

      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => 
        m.id === optimisticMessage.id ? message : m
      ));

      await refreshUsage();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      setPrompt(currentPrompt);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, selectedModels, contentType, currentSessionId, usage, refreshUsage, toast]);

  const canSubmit = prompt.trim().length > 0 && selectedModels.length > 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={cn(
          "transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0"
        )}>
          {sidebarOpen && (
            <ChatSidebar
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
            />
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toggle Sidebar Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-16 z-10"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <h2 className="text-2xl font-bold mb-2">AI Comparator</h2>
                  <p className="text-muted-foreground max-w-md">
                    Compare responses from GPT, Claude, and Grok side by side.
                    Select models and start chatting!
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))
              )}
              
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t border-border bg-background p-4">
            <div className="max-w-4xl mx-auto space-y-4">
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
            </div>
          </div>
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgradeSuccess={() => {
          refreshUsage();
          window.location.reload();
        }}
        currentTier={user?.subscriptionTier || 'free'}
      />
    </div>
  );
}
