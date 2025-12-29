import { query } from '../db/connection.js';
import { Prompt, ModelResponse, ContentType, AIModel, ResponseStatus } from '../types/index.js';

interface PromptRow {
  id: string;
  user_id: string;
  content: string;
  content_type: ContentType;
  created_at: Date;
}

interface ModelResponseRow {
  id: string;
  prompt_id: string;
  model: AIModel;
  content: string | null;
  response_time_ms: number;
  status: ResponseStatus;
  error_message: string | null;
  created_at: Date;
}

function mapRowToPrompt(row: PromptRow): Prompt {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    contentType: row.content_type,
    createdAt: row.created_at,
  };
}

function mapRowToModelResponse(row: ModelResponseRow): ModelResponse {
  return {
    id: row.id,
    promptId: row.prompt_id,
    model: row.model,
    content: row.content || '',
    responseTimeMs: row.response_time_ms,
    status: row.status,
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Create a new prompt
 */
export async function createPrompt(
  userId: string,
  content: string,
  contentType: ContentType
): Promise<Prompt> {
  const result = await query<PromptRow>(
    `INSERT INTO prompts (user_id, content, content_type)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, content, contentType]
  );
  return mapRowToPrompt(result.rows[0]);
}

/**
 * Get a prompt by ID
 */
export async function getPromptById(id: string): Promise<Prompt | null> {
  const result = await query<PromptRow>(
    'SELECT * FROM prompts WHERE id = $1',
    [id]
  );
  return result.rows.length > 0 ? mapRowToPrompt(result.rows[0]) : null;
}

/**
 * Get a prompt by ID with user ownership check
 */
export async function getPromptByIdAndUser(
  id: string,
  userId: string
): Promise<Prompt | null> {
  const result = await query<PromptRow>(
    'SELECT * FROM prompts WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return result.rows.length > 0 ? mapRowToPrompt(result.rows[0]) : null;
}

/**
 * Create model responses for a prompt
 */
export async function createModelResponses(
  promptId: string,
  responses: Array<{
    model: AIModel;
    content: string;
    responseTimeMs: number;
    status: ResponseStatus;
    errorMessage?: string;
  }>
): Promise<ModelResponse[]> {
  const results: ModelResponse[] = [];
  
  for (const response of responses) {
    const result = await query<ModelResponseRow>(
      `INSERT INTO model_responses (prompt_id, model, content, response_time_ms, status, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        promptId,
        response.model,
        response.content,
        response.responseTimeMs,
        response.status,
        response.errorMessage || null,
      ]
    );
    results.push(mapRowToModelResponse(result.rows[0]));
  }
  
  return results;
}

/**
 * Get model responses for a prompt
 */
export async function getModelResponsesByPromptId(
  promptId: string
): Promise<ModelResponse[]> {
  const result = await query<ModelResponseRow>(
    'SELECT * FROM model_responses WHERE prompt_id = $1 ORDER BY created_at',
    [promptId]
  );
  return result.rows.map(mapRowToModelResponse);
}

/**
 * Get prompts for a user with pagination
 */
export async function getPromptsByUser(
  userId: string,
  limit: number,
  offset: number,
  retentionDays?: number | null
): Promise<{ prompts: Prompt[]; total: number }> {
  let whereClause = 'WHERE user_id = $1';
  const params: (string | number)[] = [userId];
  
  if (retentionDays !== null && retentionDays !== undefined) {
    whereClause += ` AND created_at > NOW() - INTERVAL '${retentionDays} days'`;
  }
  
  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM prompts ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);
  
  // Get prompts
  const result = await query<PromptRow>(
    `SELECT * FROM prompts ${whereClause}
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [...params, limit, offset]
  );
  
  return {
    prompts: result.rows.map(mapRowToPrompt),
    total,
  };
}
