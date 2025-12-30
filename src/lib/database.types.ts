export type UserRole = 'employee' | 'manager' | 'hr' | 'admin';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalStatus = 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  max_days_per_year: number | null;
  requires_document: boolean;
  is_active: boolean;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: LeaveStatus;
  document_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaveApproval {
  id: string;
  leave_request_id: string;
  approver_id: string;
  status: ApprovalStatus;
  comments: string | null;
  approved_at: string;
}

export interface LeaveRequestWithDetails extends LeaveRequest {
  employee: Profile;
  leave_type: LeaveType;
  approvals?: LeaveApproval[];
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      leave_types: {
        Row: LeaveType;
        Insert: Omit<LeaveType, 'id' | 'created_at'>;
        Update: Partial<Omit<LeaveType, 'id' | 'created_at'>>;
      };
      leave_requests: {
        Row: LeaveRequest;
        Insert: Omit<LeaveRequest, 'id' | 'created_at' | 'updated_at' | 'status'>;
        Update: Partial<Omit<LeaveRequest, 'id' | 'created_at'>>;
      };
      leave_approvals: {
        Row: LeaveApproval;
        Insert: Omit<LeaveApproval, 'id' | 'approved_at'>;
        Update: Partial<Omit<LeaveApproval, 'id' | 'approved_at'>>;
      };
    };
  };
}
