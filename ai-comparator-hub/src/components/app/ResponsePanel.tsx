import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AI_MODELS } from "./ModelSelector";
import { useToast } from "@/hooks/use-toast";
import { ContentType } from "./PromptInput";

export interface ModelResponse {
  modelId: string;
  content: string;
  responseTime: number;
  status: "loading" | "success" | "error";
}

interface ResponsePanelProps {
  responses: ModelResponse[];
  contentType?: ContentType;
}

// Simple code block parser and highlighter
function parseContent(content: string, isCodeContent: boolean) {
  const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
  
  // Match code blocks with optional language
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    // Add code block
    parts.push({ type: 'code', content: match[2].trim(), language: match[1] || 'plaintext' });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    // If content type is code and no code blocks found, treat entire content as code
    if (isCodeContent && parts.length === 0) {
      parts.push({ type: 'code', content: remaining.trim(), language: 'plaintext' });
    } else {
      parts.push({ type: 'text', content: remaining });
    }
  }

  return parts;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: "Copied!", description: "Code copied to clipboard." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border bg-secondary/30">
      <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono">{language || 'code'}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm font-mono leading-relaxed">{code}</code>
      </pre>
    </div>
  );
}

function FormattedContent({ content, isCodeContent }: { content: string; isCodeContent: boolean }) {
  const parts = useMemo(() => parseContent(content, isCodeContent), [content, isCodeContent]);

  return (
    <div className="prose prose-invert prose-sm max-w-none">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return <CodeBlock key={index} code={part.content} language={part.language} />;
        }
        return (
          <div key={index} className="whitespace-pre-wrap text-sm leading-relaxed">
            {part.content}
          </div>
        );
      })}
    </div>
  );
}

export function ResponsePanel({ responses, contentType = 'text' }: ResponsePanelProps) {
  const { toast } = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isCodeContent = contentType === 'code';

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
                  {response.content || "Error fetching response. Please try again."}
                </div>
              ) : (
                <FormattedContent content={response.content} isCodeContent={isCodeContent} />
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
