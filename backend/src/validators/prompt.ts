import { z } from 'zod';
import { config } from '../config/index.js';

export const promptRequestSchema = z.object({
  content: z.string()
    .min(config.prompt.minLength, `Content must be at least ${config.prompt.minLength} character(s)`)
    .max(config.prompt.maxLength, `Content must not exceed ${config.prompt.maxLength} characters`),
  contentType: z.enum(['code', 'text', 'speech', 'summary', 'email', 'other']),
  models: z.array(z.enum(['gpt', 'claude', 'grok']))
    .min(config.prompt.minModels, `At least ${config.prompt.minModels} model must be selected`)
    .max(config.prompt.maxModels, `Maximum ${config.prompt.maxModels} models allowed`),
});

export type ValidatedPromptRequest = z.infer<typeof promptRequestSchema>;
