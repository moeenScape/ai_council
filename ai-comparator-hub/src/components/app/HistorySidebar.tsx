import { useState, useEffect } from "react";
import { History, ChevronRight, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { api, HistoryItem, AIModel } from "@/lib/api";

interface HistorySidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onSelectHistory: (id: string) => void;
}

const MODEL_COLORS: Record<AIModel, string> = {
  gpt: "bg-gpt/20 text-gpt",
  claude: "bg-claude/20 text-claude",
  grok: "bg-grok/20 text-grok",
};

export function HistorySidebar({ isOpen, onToggle, onSelectHistory }: HistorySidebarProps) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (isOpen && history.length === 0) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async (pageNum = 1) => {
    setIsLoading(true);
    try {
      const result = await api.getHistory(pageNum, 20);
      if (pageNum === 1) {
        setHistory(result.data);
      } else {
        setHistory(prev => [...prev, ...result.data]);
      }
      setHasMore(result.pagination.hasMore);
      setPage(pageNum);
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const truncatePrompt = (content: string, maxLength = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className={cn(
          "fixed left-0 top-1/2 -translate-y-1/2 z-40 rounded-l-none rounded-r-lg h-20 w-6 bg-card border border-l-0 border-border hover:bg-secondary transition-all",
          isOpen && "left-72"
        )}
      >
        <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-14 bottom-0 w-72 bg-card border-r border-border z-30 transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-2 p-4 border-b border-border">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Prompt History</h2>
        </div>

        <ScrollArea className="h-[calc(100%-60px)]">
          {isLoading && history.length === 0 ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No history yet</p>
              <p className="text-sm">Your comparisons will appear here</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectHistory(item.id)}
                  className="w-full text-left p-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                >
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {truncatePrompt(item.prompt.content)}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex gap-1">
                      {item.models.map((model) => (
                        <span
                          key={model}
                          className={cn("text-xs px-1.5 py-0.5 rounded", MODEL_COLORS[model])}
                        >
                          {model.toUpperCase()}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" />
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
              
              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => loadHistory(page + 1)}
                  disabled={isLoading}
                  className="w-full mt-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load more
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
}
