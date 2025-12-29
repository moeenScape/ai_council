import { motion } from "framer-motion";
import { Code, FileText, Mic, Layers, Copy, Zap } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Multi-Model Comparison",
    description: "Compare responses from GPT, Claude, and Grok side by side. See how different AI models interpret your prompts.",
  },
  {
    icon: Code,
    title: "Code Analysis",
    description: "Get code solutions from multiple AIs. Compare syntax, efficiency, and approaches to find the best implementation.",
  },
  {
    icon: FileText,
    title: "Text & Summaries",
    description: "Generate content, summaries, and creative writing. Compare tone, accuracy, and style across models.",
  },
  {
    icon: Mic,
    title: "Speech & Transcription",
    description: "Test speech-to-text and voice prompts. Compare transcription accuracy and natural language understanding.",
  },
  {
    icon: Copy,
    title: "Copy & Export",
    description: "Instantly copy the best response or export your comparison history. Save favorites for future reference.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Parallel API calls ensure all responses arrive simultaneously. No waiting for sequential processing.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="container px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything you need to{" "}
            <span className="gradient-text">compare AI</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Powerful features designed for developers, writers, and anyone who wants to get the best AI output.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className="group h-full p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
                <div className="mb-4 inline-flex p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
