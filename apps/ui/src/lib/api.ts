import { authService } from './auth';
import { Transaction } from '@/types/portfolio';

// API configuration - will be replaced with actual values from CDK deployment
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://api.example.com'; // TODO: Replace with actual API Gateway URL

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export class ApiClient {
  private static instance: ApiClient;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = authService.getIdToken();

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const headers = await this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error:
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: 'Network error or server unavailable' };
    }
  }

  // Transaction API methods
  async getTransactions(): Promise<ApiResponse<Transaction[]>> {
    return this.makeRequest<Transaction[]>('/transactions');
  }

  async createTransaction(
    transaction: Omit<Transaction, 'id'>
  ): Promise<ApiResponse<Transaction>> {
    return this.makeRequest<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  }

  async updateTransaction(
    id: string,
    transaction: Partial<Transaction>
  ): Promise<ApiResponse<Transaction>> {
    return this.makeRequest<Transaction>(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(transaction),
    });
  }

  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = ApiClient.getInstance();
