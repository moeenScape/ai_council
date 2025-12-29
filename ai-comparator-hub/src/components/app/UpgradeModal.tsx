import { useState } from "react";
import { Check, Crown, Loader2, Zap, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeSuccess: () => void;
  currentTier: string;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "10 comparisons per day",
      "Up to 2 models per comparison",
      "7-day history retention",
      "Basic support",
    ],
    disabled: true,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "per month",
    features: [
      "Unlimited comparisons",
      "Up to 3 models per comparison",
      "Unlimited history retention",
      "Priority support",
      "Export results",
    ],
    popular: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$49",
    period: "per month",
    features: [
      "Everything in Pro",
      "Up to 10 team members",
      "Team collaboration",
      "Admin dashboard",
      "API access",
      "Dedicated support",
    ],
  },
];

export function UpgradeModal({ isOpen, onClose, onUpgradeSuccess, currentTier }: UpgradeModalProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [useTestMode, setUseTestMode] = useState(false);
  const { toast } = useToast();

  const handleStripeCheckout = async (tier: "pro" | "team") => {
    setIsLoading(tier);
    try {
      const { url } = await api.createCheckoutSession(tier);
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Could not start checkout",
        variant: "destructive",
      });
      setIsLoading(null);
    }
  };

  const handleTestUpgrade = async (tier: "pro" | "team") => {
    setIsLoading(tier);
    try {
      const result = await api.upgradeSubscription(tier);
      toast({
        title: "Upgrade successful!",
        description: result.message,
      });
      onUpgradeSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Upgrade failed",
        description: error instanceof Error ? error.message : "Could not upgrade subscription",
        variant: "destructive",
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleUpgrade = (tier: "pro" | "team") => {
    if (useTestMode) {
      handleTestUpgrade(tier);
    } else {
      handleStripeCheckout(tier);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Crown className="h-6 w-6 text-primary" />
            Upgrade Your Plan
          </DialogTitle>
          <DialogDescription>
            Get more comparisons and features with a premium plan
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === currentTier;
            const isUpgrade = !plan.disabled && plan.id !== "free" && plan.id !== currentTier;
            
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-xl border p-5 transition-all",
                  plan.popular && "border-primary shadow-lg shadow-primary/10",
                  isCurrent && "bg-secondary/30",
                  !plan.disabled && !isCurrent && "hover:border-primary/50"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-4">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">/{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : isUpgrade ? (
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full"
                    onClick={() => handleUpgrade(plan.id as "pro" | "team")}
                    disabled={isLoading !== null}
                  >
                    {isLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : useTestMode ? (
                      <Zap className="h-4 w-4 mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    {useTestMode ? `Upgrade to ${plan.name}` : `Subscribe to ${plan.name}`}
                  </Button>
                ) : (
                  <Button variant="ghost" className="w-full" disabled>
                    {plan.disabled ? "Free Forever" : "Downgrade"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {useTestMode 
              ? "Test mode: No payment required" 
              : "Secure payment powered by Stripe"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseTestMode(!useTestMode)}
            className="text-xs"
          >
            {useTestMode ? "Use Stripe Payment" : "Use Test Mode"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
