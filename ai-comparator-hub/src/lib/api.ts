// API Client for AI Comparator Hub Backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Types matching backend
export type SubscriptionTier = 'free' | 'pro' | 'team';
export type ContentType = 'code' | 'text' | 'speech' | 'summary' | 'email' | 'other';
export type AIModel = 'gpt' | 'claude' | 'grok';
export type ResponseStatus = 'success' | 'error' | 'timeout';

export interface UsageStats {
  used: number;
  limit: number | null;
  remaining: number | null;
  resetAt: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    subscriptionTier: SubscriptionTier;
  };
  usage: UsageStats;
}

export interface ComparisonResult {
  id: string;
  prompt: {
    content: string;
    contentType: ContentType;
  };
  responses: {
    model: AIModel;
    content: string;
    responseTimeMs: number;
    status: ResponseStatus;
    errorMessage?: string;
  }[];
  createdAt: string;
}

export interface HistoryItem {
  id: string;
  prompt: {
    content: string;
    contentType: ContentType;
  };
  models: AIModel[];
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  type: string;
  message: string;
  details?: Record<string, unknown>;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle token refresh on 401
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        // Retry the request with new token
        (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
        if (!retryResponse.ok) {
          const error = await retryResponse.json();
          throw new Error(error.error?.message || 'Request failed');
        }
        return retryResponse.json();
      } else {
        this.clearTokens();
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Request failed');
    }

    return response.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      this.setTokens(data.data.accessToken, data.data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // Auth endpoints
  async signup(email: string, password: string): Promise<AuthResult> {
    const response = await this.request<{ success: boolean; data: AuthResult }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const response = await this.request<{ success: boolean; data: AuthResult }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data;
  }

  logout() {
    this.clearTokens();
  }

  // Prompt endpoints
  async submitPrompt(
    content: string,
    contentType: ContentType,
    models: AIModel[]
  ): Promise<ComparisonResult> {
    const response = await this.request<{ success: boolean; data: ComparisonResult }>('/prompts', {
      method: 'POST',
      body: JSON.stringify({ content, contentType, models }),
    });
    return response.data;
  }

  async getComparison(id: string): Promise<ComparisonResult> {
    const response = await this.request<{ success: boolean; data: ComparisonResult }>(`/prompts/${id}`);
    return response.data;
  }

  // History endpoints
  async getHistory(page = 1, limit = 10): Promise<PaginatedResponse<HistoryItem>> {
    const response = await this.request<{ success: boolean; data: PaginatedResponse<HistoryItem> }>(
      `/history?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async getHistoryItem(id: string): Promise<ComparisonResult> {
    const response = await this.request<{ success: boolean; data: ComparisonResult }>(`/history/${id}`);
    return response.data;
  }

  // Usage endpoints
  async getUsage(): Promise<UsageStats> {
    const response = await this.request<{ success: boolean; data: UsageStats }>('/usage');
    return response.data;
  }

  async getSubscription(): Promise<{ tier: SubscriptionTier; limits: Record<string, unknown> }> {
    const response = await this.request<{ success: boolean; data: { tier: SubscriptionTier; limits: Record<string, unknown> } }>('/subscription');
    return response.data;
  }

  async upgradeSubscription(tier: 'pro' | 'team'): Promise<{ tier: SubscriptionTier; message: string }> {
    const response = await this.request<{ success: boolean; data: { tier: SubscriptionTier }; message: string }>('/subscription/upgrade', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
    return { tier: response.data.tier, message: response.message };
  }

  // Payment endpoints
  async createCheckoutSession(tier: 'pro' | 'team'): Promise<{ sessionId: string; url: string }> {
    const response = await this.request<{ success: boolean; data: { sessionId: string; url: string } }>('/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
    return response.data;
  }

  async verifyPaymentSession(sessionId: string): Promise<void> {
    await this.request('/payments/verify-session', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });
  }

  // Profile endpoints
  async getProfile(): Promise<UserProfile> {
    const response = await this.request<{ success: boolean; data: UserProfile }>('/profile');
    return response.data;
  }

  async updateProfile(updates: { displayName?: string; avatarUrl?: string }): Promise<UserProfile> {
    const response = await this.request<{ success: boolean; data: UserProfile }>('/profile', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return response.data;
  }

  async updateTheme(theme: Theme): Promise<{ theme: Theme }> {
    const response = await this.request<{ success: boolean; data: { theme: Theme } }>('/profile/theme', {
      method: 'PATCH',
      body: JSON.stringify({ theme }),
    });
    return response.data;
  }

  // Session endpoints
  async getSessions(page = 1, limit = 50): Promise<{ sessions: ChatSession[]; total: number; hasMore: boolean }> {
    const response = await this.request<{ success: boolean; data: ChatSession[]; pagination: { total: number; hasMore: boolean } }>(
      `/sessions?page=${page}&limit=${limit}`
    );
    return { sessions: response.data, total: response.pagination.total, hasMore: response.pagination.hasMore };
  }

  async createSession(title?: string): Promise<ChatSession> {
    const response = await this.request<{ success: boolean; data: ChatSession }>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return response.data;
  }

  async getSession(id: string): Promise<SessionWithMessages> {
    const response = await this.request<{ success: boolean; data: SessionWithMessages }>(`/sessions/${id}`);
    return response.data;
  }

  async sendMessage(
    sessionId: string,
    content: string,
    contentType: ContentType,
    models: AIModel[]
  ): Promise<ChatMessageWithResponses> {
    const response = await this.request<{ success: boolean; data: ChatMessageWithResponses }>(`/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, contentType, models }),
    });
    return response.data;
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<ChatSession> {
    const response = await this.request<{ success: boolean; data: ChatSession }>(`/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    return response.data;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.request(`/sessions/${sessionId}`, { method: 'DELETE' });
  }
}

// Additional types
export type Theme = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  theme: Theme;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  lastActivityAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  contentType: ContentType;
  models: AIModel[];
  createdAt: string;
}

export interface ChatMessageWithResponses extends ChatMessage {
  responses: {
    model: AIModel;
    content: string;
    responseTimeMs: number;
    status: ResponseStatus;
    errorMessage?: string;
  }[];
}

export interface SessionWithMessages {
  session: ChatSession;
  messages: ChatMessageWithResponses[];
}

export const api = new ApiClient();
