import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

export type AIModel = {
  id: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
};

export const AI_MODELS: AIModel[] = [
  {
    id: "gpt",
    name: "GPT-4",
    description: "Best for complex reasoning and code generation",
    color: "text-gpt",
    bgColor: "bg-gpt/20",
  },
  {
    id: "claude",
    name: "Claude 3",
    description: "Excellent for analysis and long-form content",
    color: "text-claude",
    bgColor: "bg-claude/20",
  },
  {
    id: "grok",
    name: "Grok",
    description: "Great for real-time information and wit",
    color: "text-grok",
    bgColor: "bg-grok/20",
  },
];

interface ModelSelectorProps {
  selectedModels: string[];
  onToggleModel: (modelId: string) => void;
}

export function ModelSelector({ selectedModels, onToggleModel }: ModelSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">Select Models</Label>
        <span className="text-xs text-muted-foreground">(1-3)</span>
      </div>
      
      <div className="flex flex-wrap gap-3">
        {AI_MODELS.map((model) => {
          const isSelected = selectedModels.includes(model.id);
          const isDisabled = !isSelected && selectedModels.length >= 3;
          
          return (
            <Tooltip key={model.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => !isDisabled && onToggleModel(model.id)}
                  disabled={isDisabled}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200",
                    isSelected
                      ? `${model.bgColor} ${model.color} border-current`
                      : "border-border hover:border-muted-foreground/50",
                    isDisabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    className={cn(
                      "border-current",
                      isSelected && `${model.color}`
                    )}
                  />
                  <span className="font-medium">{model.name}</span>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{model.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
