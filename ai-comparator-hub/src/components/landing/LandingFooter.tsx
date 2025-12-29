import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/asset/logo_2.jpg" 
              alt="AI Council" 
              className="h-6 w-6 object-contain rounded"
            />
            <span className="font-semibold">AI Council</span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </nav>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            © 2024 AI Council. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
