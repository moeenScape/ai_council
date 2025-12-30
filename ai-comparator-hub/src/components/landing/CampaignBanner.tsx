import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function CampaignBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="relative overflow-hidden"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-primary to-pink-500 animate-gradient" />
        
        {/* Dot pattern overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
        
        <div className="relative container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 py-2.5 text-white text-sm">
            {/* Sparkle icon */}
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-4 w-4 text-yellow-300" />
            </motion.div>
            
            {/* Banner text */}
            <span className="font-medium">
              <span className="hidden sm:inline">🎉 </span>
              <strong className="text-yellow-300">BLACK FRIDAY SALE</strong>
              <span className="mx-2">—</span>
              Get <strong className="text-yellow-300">20% OFF</strong> Pro Plan
            </span>
            
            {/* CTA */}
            <Link
              to="/signup"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm font-medium transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              Claim Now
            </Link>

            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              className="absolute right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
