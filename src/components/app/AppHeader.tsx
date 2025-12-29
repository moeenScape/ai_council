import { Link, useNavigate } from "react-router-dom";
import { Sparkles, User, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppHeader() {
  const navigate = useNavigate();

  return (
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
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50 text-sm">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">
                <span className="text-foreground font-medium">7</span>/10 today
              </span>
            </div>

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
                <DropdownMenuItem className="flex flex-col items-start">
                  <span className="font-medium">Demo User</span>
                  <span className="text-xs text-muted-foreground">demo@example.com</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>History</DropdownMenuItem>
                <DropdownMenuItem>Upgrade to Pro</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/")}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
