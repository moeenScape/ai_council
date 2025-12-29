import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, MessageSquare, Trash2, Edit2, Check, X, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { api, ChatSession } from "@/lib/api";

interface ChatSidebarProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export function ChatSidebar({ currentSessionId, onSelectSession, onNewChat }: ChatSidebarProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const result = await api.getSessions(1, 50);
      setSessions(result.sessions);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        onNewChat();
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  const handleStartEdit = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleSaveEdit = async (sessionId: string) => {
    try {
      await api.updateSessionTitle(sessionId, editTitle);
      setSessions(prev =>
        prev.map(s => (s.id === sessionId ? { ...s, title: editTitle } : s))
      );
    } catch (error) {
      console.error("Failed to update title:", error);
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((groups, session) => {
    const date = formatDate(session.lastActivityAt);
    if (!groups[date]) groups[date] = [];
    groups[date].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  // Refresh sessions when a new one might be created
  useEffect(() => {
    if (currentSessionId && !sessions.find(s => s.id === currentSessionId)) {
      loadSessions();
    }
  }, [currentSessionId]);

  return (
    <div className="w-64 h-full bg-card border-r border-border flex flex-col">
      {/* New Chat Button */}
      <div className="p-3 border-b border-border">
        <Button onClick={onNewChat} className="w-full" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="p-2">
            {Object.entries(groupedSessions).map(([date, dateSessions]) => (
              <div key={date} className="mb-4">
                <p className="text-xs text-muted-foreground px-2 mb-1">{date}</p>
                {dateSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={cn(
                      "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors",
                      currentSessionId === session.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-secondary/50"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    
                    {editingId === session.id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="h-6 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(session.id);
                            if (e.key === "Escape") handleCancelEdit();
                          }}
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(session.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 truncate text-sm">{session.title}</span>
                        <div className="hidden group-hover:flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            onClick={(e) => handleStartEdit(session, e)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => handleDelete(session.id, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* View All History */}
      <div className="p-3 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => navigate("/history")}
        >
          <History className="h-4 w-4 mr-2" />
          View All History
        </Button>
      </div>
    </div>
  );
}
