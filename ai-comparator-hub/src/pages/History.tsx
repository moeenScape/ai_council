import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare, Clock, Trash2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api, ChatSession, AIModel } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MODEL_COLORS: Record<AIModel, string> = {
  gpt: "bg-gpt/20 text-gpt",
  claude: "bg-claude/20 text-claude",
  grok: "bg-grok/20 text-grok",
};

export default function HistoryPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async (pageNum = 1) => {
    try {
      const result = await api.getSessions(pageNum, 20);
      if (pageNum === 1) {
        setSessions(result.sessions);
      } else {
        setSessions(prev => [...prev, ...result.sessions]);
      }
      setHasMore(result.hasMore);
      setPage(pageNum);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load history",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast({
        title: "Deleted",
        description: "Chat session deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return "Today";
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group sessions by date
  const groupedSessions = filteredSessions.reduce((groups, session) => {
    const date = formatDate(session.lastActivityAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, ChatSession[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/app")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to App
        </Button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Chat History</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No chat history</h3>
              <p className="text-muted-foreground text-center">
                Start a new conversation to see it here
              </p>
              <Button onClick={() => navigate("/app")} className="mt-4">
                Start Chatting
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedSessions).map(([date, dateSessions]) => (
              <div key={date}>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {date}
                </h2>
                <div className="space-y-2">
                  {dateSessions.map((session) => (
                    <Card
                      key={session.id}
                      className="cursor-pointer hover:bg-secondary/50 transition-colors group"
                      onClick={() => navigate(`/app?session=${session.id}`)}
                    >
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{session.title}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(session.lastActivityAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={(e) => handleDelete(session.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => loadSessions(page + 1)}
              >
                Load More
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
