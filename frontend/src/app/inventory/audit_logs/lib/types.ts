export interface AuditLog {
  audit_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  reason_code?: string;
  user_id?: string;
  employee_id?: string;
  created_at: string;
  before_json?: Record<string, any>;
  after_json?: Record<string, any>;
}

export interface AuditLogParams {
  page?: number;
  per_page?: number;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  actor_id?: string;
  date_from?: string;
  date_to?: string;
}

