import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AI_MODELS } from "./ModelSelector";
import { useToast } from "@/hooks/use-toast";

export interface ModelResponse {
  modelId: string;
  content: string;
  responseTime: number;
  status: "loading" | "success" | "error";
}

interface ResponsePanelProps {
  responses: ModelResponse[];
}

export function ResponsePanel({ responses }: ResponsePanelProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (modelId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(modelId);
    toast({
      title: "Copied!",
      description: "Response copied to clipboard.",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (responses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-8">
        <div className="max-w-md">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold mb-2">Ready to Compare</h3>
          <p className="text-muted-foreground">
            Enter a prompt and select AI models to see their responses side by side.
          </p>
        </div>
      </div>
    );
  }

  const gridCols = responses.length === 1 ? "grid-cols-1" : responses.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3";

  return (
    <div className={cn("grid gap-4 flex-1", gridCols)}>
      {responses.map((response, index) => {
        const model = AI_MODELS.find((m) => m.id === response.modelId);
        if (!model) return null;

        return (
          <motion.div
            key={response.modelId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex flex-col rounded-xl border border-border bg-card overflow-hidden"
          >
            {/* Header */}
            <div className={cn("sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border", model.bgColor)}>
              <div className="flex items-center gap-3">
                <span className={cn("font-semibold", model.color)}>{model.name}</span>
                {response.status === "success" && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {response.responseTime.toFixed(2)}s
                  </div>
                )}
              </div>
              
              {response.status === "success" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(response.modelId, response.content)}
                  className="h-8 px-2"
                >
                  {copiedId === response.modelId ? (
                    <Check className="h-4 w-4 text-gpt" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-auto">
              {response.status === "loading" ? (
                <div className="space-y-3">
                  <div className="h-4 bg-secondary/50 rounded animate-pulse w-full" />
                  <div className="h-4 bg-secondary/50 rounded animate-pulse w-4/5" />
                  <div className="h-4 bg-secondary/50 rounded animate-pulse w-3/5" />
                  <div className="h-4 bg-secondary/50 rounded animate-pulse w-4/5" />
                  <div className="h-4 bg-secondary/50 rounded animate-pulse w-2/5" />
                </div>
              ) : response.status === "error" ? (
                <div className="text-destructive">
                  Error fetching response. Please try again.
                </div>
              ) : (
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                    {response.content}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
