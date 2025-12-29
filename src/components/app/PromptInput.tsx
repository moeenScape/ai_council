import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

export type ContentType = "code" | "text" | "speech" | "summary" | "email" | "other";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "code", label: "Code" },
  { value: "text", label: "Text" },
  { value: "speech", label: "Speech" },
  { value: "summary", label: "Summary" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];

const PROMPT_TEMPLATES = [
  { value: "custom", label: "Custom Prompt" },
  { value: "explain", label: "Explain this code" },
  { value: "review", label: "Review and improve" },
  { value: "summarize", label: "Summarize text" },
  { value: "translate", label: "Translate content" },
];

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  contentType: ContentType;
  onContentTypeChange: (value: ContentType) => void;
  template: string;
  onTemplateChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  canSubmit: boolean;
}

export function PromptInput({
  prompt,
  onPromptChange,
  contentType,
  onContentTypeChange,
  template,
  onTemplateChange,
  onSubmit,
  isLoading,
  canSubmit,
}: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit && !isLoading) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Options Row */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Content Type</Label>
          <Select value={contentType} onValueChange={(v) => onContentTypeChange(v as ContentType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Template</Label>
          <Select value={template} onValueChange={onTemplateChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROMPT_TEMPLATES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Prompt Area */}
      <div className="relative">
        <Textarea
          placeholder="Enter your prompt here... (Cmd/Ctrl + Enter to submit)"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          className="resize-none pr-24 text-base"
        />
        <Button
          onClick={onSubmit}
          disabled={!canSubmit || isLoading}
          variant="hero"
          size="sm"
          className="absolute bottom-3 right-3"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Run
        </Button>
      </div>
    </div>
  );
}
