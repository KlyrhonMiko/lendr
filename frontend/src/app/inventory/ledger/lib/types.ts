export interface MovementLedgerParams {
  page?: number;
  per_page?: number;
  movement_type?: string;
  inventory_id?: string;
  reason_code?: string;
  reference_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface AnomalyDetail {
  ledger_balance: number;
  actual_balance: number;
  delta: number;
  movement_count: number;
}

export interface Anomaly {
  item_id: string;
  item_name: string;
  anomaly_type: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
  details: AnomalyDetail;
  detected_at: string;
}

// Minimal shape of a ledger movement row (many fields are optional depending on movement type).
export interface LedgerMovement {
  movement_id?: string;
  item_id?: string;
  item_name?: string;
  inventory_id?: string;
  qty_change: number;
  movement_type?: string;
  is_reversed?: boolean;
  note?: string;
  message?: string;
  occurred_at?: string;
  detected_at?: string;
  reference_id?: string;
  user_id?: string;
  actor_name?: string;
  actor_id?: string;
  // Some server responses use nested details (especially for anomalies, which are fetched separately).
  details?: Partial<{
    delta: number;
    ledger_balance: number;
    actual_balance: number;
    movement_count: number;
  }>;
}

