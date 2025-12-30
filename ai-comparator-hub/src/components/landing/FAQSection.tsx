import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
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

function FAQItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card/50 hover:bg-card/80 transition-colors">
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between text-left"
      >
        <span className="font-medium pr-4">{item.question}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-6 pb-5 text-muted-foreground">
              {item.answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-secondary/20">
      <div className="container px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about AI Council. Can't find what you're looking for? 
            Feel free to contact our support team.
          </p>
        </motion.div>

        {/* FAQ Grid */}
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                item={faq}
                isOpen={openIndex === index}
                onToggle={() => handleToggle(index)}
              />
            ))}
          </motion.div>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground mb-4">
            Still have questions?
          </p>
          <a
            href="mailto:support@aicouncil.app"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            Contact our support team →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
