// Backend types
export interface BackendFile {
  id: string;
  name: string;
  size: number;
  upload_date: string;
  data: any[];
  customer_name?: string;
  account_manager?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
