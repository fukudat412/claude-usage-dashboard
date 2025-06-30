// Common types for the Claude Usage Dashboard application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface UsageDataPoint {
  timestamp: string;
  tokens: number;
  cost: number;
  session?: string;
}

export interface UsageData {
  daily: UsageDataPoint[];
  monthly: UsageDataPoint[];
  total: {
    tokens: number;
    cost: number;
    sessions: number;
  };
  summary?: any;
  mcpLogs?: McpLogEntry[];
  todos?: any[];
  vsCodeLogs?: any[];
  dailyUsage?: any[];
  monthlyUsage?: any[];
}

export interface McpLogEntry {
  file: string;
  filePath: string;
  timestamp: Date;
  size: number;
  entries: number;
  sessionId?: string;
  error?: string;
}

export interface McpToolUsage {
  name: string;
  count: number;
  sessionCount: number;
  firstUsed: string;
  lastUsed: string;
}

export interface McpSessionDetail {
  sessionId: string;
  tools: Record<string, number>;
  startTime: string;
  endTime: string;
  cwd?: string;
  file: string;
}

export interface McpToolUsageStats {
  totalCalls: number;
  uniqueTools: number;
  tools: McpToolUsage[];
  sessions: McpSessionDetail[];
}

export interface ChartDataPoint {
  date: string;
  month?: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  cost: number;
  sessions: number;
  [key: string]: any;
}

export interface FilterOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  sessionId?: string;
  minTokens?: number;
  maxTokens?: number;
}

export interface SessionInfo {
  id: string;
  type: 'main' | 'subsession';
  status: 'active' | 'pending' | 'completed' | 'failed' | 'disconnected';
  task?: string;
  parentSessionId?: string;
  createdAt: string;
  lastActivity: string;
  response?: any;
  startTime?: string;
  endTime?: string;
  totalTokens?: number;
  totalCost?: number;
}

// Component prop types
export interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  className?: string;
}

export interface UsageChartProps {
  data: ChartDataPoint[];
  type: 'daily' | 'monthly';
  loading?: boolean;
}

export interface DataTableProps {
  data: any[];
  columns: TableColumn[];
  loading?: boolean;
  onRowClick?: (row: any) => void;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

export interface FilterPanelProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  loading?: boolean;
}

// Hook return types
export interface UseUsageDataReturn {
  usageData: UsageData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseChartDataReturn {
  chartData: ChartDataPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export interface UseSocketReturn {
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback?: (data: any) => void) => void;
}

// Error types
export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// Configuration types
export interface ClaudePaths {
  usageLogs: string;
  mcpLogs: string;
  projects: string;
}

export interface PricingConfig {
  inputTokenPrice: number;
  outputTokenPrice: number;
  currency: string;
}

// Express types for server-side
export interface CustomRequest extends Express.Request {
  user?: any;
  session?: any;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  statusCode: number;
  timestamp: string;
}