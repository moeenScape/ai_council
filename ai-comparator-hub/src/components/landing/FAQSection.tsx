import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is AI Council?",
    answer: "AI Council is a platform that lets you compare responses from multiple AI models side by side. Submit any prompt and instantly see how GPT-4, Claude, and Grok respond, helping you find the best AI for your specific needs.",
  },
  {
    question: "Which AI models are supported?",
    answer: "We currently support GPT-4 (OpenAI), Claude (Anthropic), and Grok (xAI). You can compare responses from any combination of these models simultaneously.",
  },
  {
    question: "Is there a free plan?",
    answer: "Yes! Our free plan includes 10 comparisons per day, which is perfect for trying out the service. You can compare up to 3 AI models per prompt and access your chat history.",
  },
  {
    question: "How does the Pro plan differ from Free?",
    answer: "The Pro plan offers unlimited comparisons, priority response times, extended chat history retention, and access to advanced features like export options and API access.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use industry-standard encryption for all data in transit and at rest. Your prompts and conversations are private and never used to train AI models. You can delete your data at any time.",
  },
  {
    question: "Can I use AI Council for code generation?",
    answer: "Yes! AI Council is great for comparing code solutions. You can select 'Code' as your content type, and responses will be formatted with syntax highlighting. Compare how different AIs approach the same coding problem.",
  },
  {
    question: "How are chat sessions organized?",
    answer: "Like ChatGPT, your conversations are organized into sessions. Each session maintains context, so you can have ongoing conversations. You can create new chats anytime and access your full history from the sidebar.",
  },
  {
    question: "Do you offer team plans?",
    answer: "Yes, our Team plan is designed for organizations. It includes everything in Pro plus team management, shared workspaces, usage analytics, and priority support.",
  },
];

function FAQItemCard({ item, isOpen, onToggle, index }: { item: FAQItem; isOpen: boolean; onToggle: () => void; index: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="border border-border/50 rounded-2xl overflow-hidden bg-card/30 backdrop-blur-sm hover:bg-card/50 hover:border-primary/30 transition-all duration-300 shadow-lg"
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between text-left group"
      >
        <span className="font-medium pr-4 group-hover:text-primary transition-colors">{item.question}</span>
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
          isOpen ? "bg-primary text-primary-foreground rotate-180" : "bg-secondary/50 text-muted-foreground"
        )}>
          <ChevronDown className="h-4 w-4" />
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 100, 0],
            y: [0, -50, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, -80, 0],
            y: [0, 60, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
          className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-500/15 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4,
          }}
          className="absolute -bottom-20 left-1/3 w-72 h-72 bg-cyan-500/15 rounded-full blur-[100px]"
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Floating Decorative Elements */}
      <motion.div
        animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 left-[10%] hidden lg:block"
      >
        <div className="glass-panel p-3 rounded-xl opacity-60">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute top-40 right-[15%] hidden lg:block"
      >
        <div className="glass-panel p-3 rounded-xl opacity-60">
          <Sparkles className="h-5 w-5 text-purple-400" />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-32 left-[20%] hidden lg:block"
      >
        <div className="h-3 w-3 rounded-full bg-cyan-400/60" />
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        className="absolute bottom-40 right-[25%] hidden lg:block"
      >
        <div className="h-2 w-2 rounded-full bg-primary/60" />
      </motion.div>

      <div className="container px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6"
          >
            <HelpCircle className="h-4 w-4" />
            FAQ
          </motion.div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            Frequently Asked{" "}
            <span className="gradient-text">Questions</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Everything you need to know about AI Council. Can't find what you're looking for? 
            Feel free to contact our support team.
          </p>
        </motion.div>

        {/* FAQ Grid */}
        <div className="max-w-3xl mx-auto">
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <FAQItemCard
                key={index}
                item={faq}
                index={index}
                isOpen={openIndex === index}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-16"
        >
          <div className="glass-panel inline-block px-8 py-6 rounded-2xl">
            <p className="text-muted-foreground mb-4">
              Still have questions?
            </p>
            <a
              href="mailto:support@aicouncil.app"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Contact our support team
              <span>→</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
