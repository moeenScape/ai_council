import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, User, Zap, LogOut, Settings, History, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { UpgradeModal } from "./UpgradeModal";

export function AppHeader() {
  const navigate = useNavigate();
  const { user, usage, logout, refreshUsage } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleUpgradeSuccess = async () => {
    await refreshUsage();
    // Force page reload to get new user data
    window.location.reload();
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link to="/app" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/30 blur-lg group-hover:bg-primary/50 transition-all" />
                <Sparkles className="relative h-6 w-6 text-primary" />
              </div>
              <span className="text-lg font-bold tracking-tight">
                AI<span className="gradient-text">Comparator</span>
              </span>
            </Link>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              {/* Usage Indicator */}
              {usage && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">
                    {usage.limit !== null ? (
                      <>
                        <span className="text-foreground font-medium">{usage.remaining}</span>/{usage.limit} today
                      </>
                    ) : (
                      <span className="text-primary font-medium">Unlimited</span>
                    )}
                  </span>
                </div>
              )}

              {/* Tier Badge */}
              {user?.subscriptionTier && user.subscriptionTier !== 'free' && (
                <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium">
                  <Crown className="h-3 w-3" />
                  {user.subscriptionTier.toUpperCase()}
                </div>
              )}

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="flex flex-col items-start cursor-default">
                    <span className="font-medium">{user?.email || 'User'}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {user?.subscriptionTier || 'free'} plan
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <History className="h-4 w-4 mr-2" />
                    History
                  </DropdownMenuItem>
                  {user?.subscriptionTier === 'free' && (
                    <DropdownMenuItem 
                      className="text-primary"
                      onClick={() => setUpgradeModalOpen(true)}
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgradeSuccess={handleUpgradeSuccess}
        currentTier={user?.subscriptionTier || 'free'}
      />
    </>
  );
}
