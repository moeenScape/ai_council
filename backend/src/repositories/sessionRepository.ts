import { query } from '../db/connection.js';
import { ChatSession, ChatMessage, AIModel, ContentType, ResponseStatus } from '../types/index.js';

interface SessionRow {
  id: string;
  user_id: string;
  title: string;
  last_activity_at: Date;
  created_at: Date;
}

interface MessageRow {
  id: string;
  session_id: string;
  user_id: string;
  content: string;
  content_type: ContentType;
  models: AIModel[];
  created_at: Date;
}

interface ResponseRow {
  id: string;
  message_id: string;
  model: AIModel;
  content: string;
  response_time_ms: number;
  status: ResponseStatus;
  error_message: string | null;
  created_at: Date;
}

function mapRowToSession(row: SessionRow): ChatSession {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
  };
}

function mapRowToMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    content: row.content,
    contentType: row.content_type,
    models: row.models,
    createdAt: row.created_at,
  };
}

// Session operations
export async function createSession(userId: string, title = 'New Chat'): Promise<ChatSession> {
  const result = await query<SessionRow>(
    `INSERT INTO chat_sessions (user_id, title)
     VALUES ($1, $2)
     RETURNING *`,
    [userId, title]
  );
  return mapRowToSession(result.rows[0]);
}

export async function getSessionById(sessionId: string): Promise<ChatSession | null> {
  const result = await query<SessionRow>(
    'SELECT * FROM chat_sessions WHERE id = $1',
    [sessionId]
  );
  return result.rows.length > 0 ? mapRowToSession(result.rows[0]) : null;
}

export async function getUserSessions(
  userId: string,
  limit = 50,
  offset = 0
): Promise<{ sessions: ChatSession[]; total: number }> {
  const countResult = await query<{ count: string }>(
    'SELECT COUNT(*) FROM chat_sessions WHERE user_id = $1',
    [userId]
  );
  
  const result = await query<SessionRow>(
    `SELECT * FROM chat_sessions 
     WHERE user_id = $1 
     ORDER BY last_activity_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  
  return {
    sessions: result.rows.map(mapRowToSession),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function updateSessionTitle(sessionId: string, title: string): Promise<ChatSession | null> {
  const result = await query<SessionRow>(
    `UPDATE chat_sessions 
     SET title = $2, last_activity_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [sessionId, title]
  );
  return result.rows.length > 0 ? mapRowToSession(result.rows[0]) : null;
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  await query(
    'UPDATE chat_sessions SET last_activity_at = NOW() WHERE id = $1',
    [sessionId]
  );
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM chat_sessions WHERE id = $1',
    [sessionId]
  );
  return (result.rowCount ?? 0) > 0;
}

// Message operations
export async function createMessage(
  sessionId: string,
  userId: string,
  content: string,
  contentType: ContentType,
  models: AIModel[]
): Promise<ChatMessage> {
  const result = await query<MessageRow>(
    `INSERT INTO chat_messages (session_id, user_id, content, content_type, models)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [sessionId, userId, content, contentType, models]
  );
  
  // Update session activity
  await updateSessionActivity(sessionId);
  
  return mapRowToMessage(result.rows[0]);
}

export async function getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
  const result = await query<MessageRow>(
    `SELECT * FROM chat_messages 
     WHERE session_id = $1 
     ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows.map(mapRowToMessage);
}

export async function getMessageById(messageId: string): Promise<ChatMessage | null> {
  const result = await query<MessageRow>(
    'SELECT * FROM chat_messages WHERE id = $1',
    [messageId]
  );
  return result.rows.length > 0 ? mapRowToMessage(result.rows[0]) : null;
}

// Response operations
export async function createResponse(
  messageId: string,
  model: AIModel,
  content: string,
  responseTimeMs: number,
  status: ResponseStatus,
  errorMessage?: string
): Promise<void> {
  await query(
    `INSERT INTO model_responses (message_id, model, content, response_time_ms, status, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [messageId, model, content, responseTimeMs, status, errorMessage || null]
  );
}

export async function getMessageResponses(messageId: string): Promise<ResponseRow[]> {
  const result = await query<ResponseRow>(
    'SELECT * FROM model_responses WHERE message_id = $1',
    [messageId]
  );
  return result.rows;
}

export async function getSessionWithMessages(sessionId: string) {
  const session = await getSessionById(sessionId);
  if (!session) return null;
  
  const messages = await getSessionMessages(sessionId);
  const messagesWithResponses = await Promise.all(
    messages.map(async (msg) => {
      const responses = await getMessageResponses(msg.id);
      return {
        ...msg,
        responses: responses.map(r => ({
          model: r.model,
          content: r.content,
          responseTimeMs: r.response_time_ms,
          status: r.status,
          errorMessage: r.error_message || undefined,
        })),
      };
    })
  );
  
  return { session, messages: messagesWithResponses };
}

// Auto-generate title from first message
export async function autoGenerateTitle(sessionId: string): Promise<void> {
  const messages = await getSessionMessages(sessionId);
  if (messages.length === 1) {
    const firstMessage = messages[0].content;
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 47) + '...'
      : firstMessage;
    await updateSessionTitle(sessionId, title);
  }
}
