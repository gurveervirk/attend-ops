import { toast } from 'sonner';

const API_URL = 'http://localhost:8000';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export async function fetchWithAuth<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = localStorage.getItem('token');

    if (!token && !endpoint.includes('/token')) {
      // Redirect to login if no token is found
      window.location.href = '/login';
      return { error: 'Authentication required' };
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login?session=expired';
      return { error: 'Session expired. Please login again.' };
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || 'An error occurred');
    }

    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    toast.error(message);
    console.error('API error:', error);
    return { error: message };
  }
}

// Add these types for the trends endpoint
export interface TrendResult {
  team_id?: number;
  team_name?: string;
  employee_id?: number;
  employee_name?: string;
  status: string;
  count: number;
  percentage: number;
  earliest_date?: string;
  latest_date?: string;
}

export interface TrendParams {
  start_date: string;
  end_date: string;
  group_by?: 'team' | 'employee' | 'status';
  employee_id?: number;
  team_id?: number;
  status?: string;
}

// Auth APIs
export const authApi = {
  login: async (email: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    return fetchWithAuth<{ access_token: string; token_type: string; role: string }>('/token', {
      method: 'POST',
      body: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
  }
};

// Employee APIs
export const employeeApi = {
  getAll: () => fetchWithAuth<any[]>('/employees/'),
  getById: (id: string) => fetchWithAuth<any>(`/employees/${id}`),
  create: (data: any) => fetchWithAuth('/employees/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: any) => fetchWithAuth(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => fetchWithAuth(`/employees/${id}`, {
    method: 'DELETE'
  })
};

// Team APIs
export const teamApi = {
  getAll: () => fetchWithAuth<any[]>('/teams/'),
  getById: (id: string) => fetchWithAuth<any>(`/teams/${id}`),
  create: (data: any) => fetchWithAuth('/teams/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: any) => fetchWithAuth(`/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => fetchWithAuth(`/teams/${id}`, {
    method: 'DELETE'
  })
};

// Attendance APIs
export const attendanceApi = {
  getAll: () => fetchWithAuth<any[]>('/attendance/'),
  getById: (id: string) => fetchWithAuth<any>(`/attendance/${id}`),
  getByEmployeeId: (employeeId: string) =>
    fetchWithAuth<any[]>(`/attendance/employee/${employeeId}`),
  getByTeamId: (teamId: string) =>
    fetchWithAuth<any[]>(`/attendance/team/${teamId}`),
  create: (data: any) => fetchWithAuth('/attendance/', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: any) => fetchWithAuth(`/attendance/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => fetchWithAuth(`/attendance/${id}`, {
    method: 'DELETE'
  }),
  getSummary: () => fetchWithAuth<any>('/summarize_attendance/'),

  // Add the trends endpoint
  getTrends: async (params: TrendParams) => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('start_date', params.start_date);
      queryParams.append('end_date', params.end_date);

      if (params.group_by) {
        queryParams.append('group_by', params.group_by);
      }

      if (params.employee_id) {
        queryParams.append('employee_id', params.employee_id.toString());
      }

      if (params.team_id) {
        queryParams.append('team_id', params.team_id.toString());
      }

      if (params.status) {
        queryParams.append('status', params.status);
      }

      const response = await fetchWithAuth<TrendResult[]>(`/trends/?${queryParams.toString()}`, {
        method: 'GET',
      });

      return response;
    } catch (error) {
      console.error('Error fetching trends:', error);
      return { error: 'Failed to fetch trends data', data: null };
    }
  }
};

// AI Chat API
export const chatApi = {
  sendMessage: (message: string) =>
    fetchWithAuth<{ response: string }>('/chat/', {
      method: 'POST',
      body: JSON.stringify({ message })
    })
};
