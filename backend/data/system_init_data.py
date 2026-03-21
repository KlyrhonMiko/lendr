# system_init_data.py

SYSTEM_CONFIGS = [
    # Inventory Item Types
    {"key": "electronics", "value": "Electronics", "category": "inventory_item_type", "description": "Electronic devices and components"},
    {"key": "tools", "value": "Tools", "category": "inventory_item_type", "description": "Hand tools and power tools"},
    {"key": "furniture", "value": "Furniture", "category": "inventory_item_type", "description": "Furniture and fixtures"},
    {"key": "cleaning_supplies", "value": "Cleaning Supplies", "category": "inventory_item_type", "description": "Cleaning supplies and materials"},
    {"key": "disposables", "value": "Disposables", "category": "inventory_item_type", "description": "Disposable items for single use"},
    {"key": "chemicals", "value": "Chemicals", "category": "inventory_item_type", "description": "Chemical products and solutions"},
    {"key": "pharmaceuticals", "value": "Pharmaceuticals", "category": "inventory_item_type", "description": "Pharmaceutical products and medications"},

    # Inventory Condition
    {"key": "good", "value": "Good", "category": "inventory_condition", "description": "Item is in good working condition"},
    {"key": "fair", "value": "Fair", "category": "inventory_condition", "description": "Item has minor wear but still functional"},
    {"key": "poor", "value": "Poor", "category": "inventory_condition", "description": "Item has significant damage but may still function"},
    {"key": "damaged", "value": "Damaged", "category": "inventory_condition", "description": "Item is damaged and not usable"},

    # Inventory Classification
    {"key": "equipment", "value": "Equipment", "category": "inventory_classification", "description": "Durable equipment for repeated use"},
    {"key": "consumable", "value": "Consumable", "category": "inventory_classification", "description": "Consumable items that are used up"},
    {"key": "perishable", "value": "Perishable", "category": "inventory_classification", "description": "Perishable items with expiration dates"},

    # Inventory Categories
    {"key": "administrative_office", "value": "Administrative & Office", "category": "inventory_category", "description": "General office supplies, furniture, and administrative support assets"},
    {"key": "operational_field", "value": "Operational & Field", "category": "inventory_category", "description": "Field operations, site equipment, and operational tools"},
    {"key": "it_communications", "value": "IT & Communications", "category": "inventory_category", "description": "IT infrastructure, networking, and communication systems"},
    {"key": "facility_maintenance", "value": "Facility & Maintenance", "category": "inventory_category", "description": "Building maintenance, facility management, and utility support"},
    {"key": "safety_security", "value": "Safety & Security", "category": "inventory_category", "description": "Health, safety, security gear, and protective equipment"},
    {"key": "laboratory_research", "value": "Laboratory & Research", "category": "inventory_category", "description": "Scientific research equipment and laboratory operations"},
    {"key": "marketing_events", "value": "Marketing & Events", "category": "inventory_category", "description": "Brand marketing materials and event staging support"},
    {"key": "logistics_supply", "value": "Logistics & Supply Chain", "category": "inventory_category", "description": "Warehouse, shipping, and logistics management assets"},
    {"key": "medical_clinical", "value": "Medical & Clinical", "category": "inventory_category", "description": "Clinical support and medical-related equipment"},

    # Inventory Units Status
    {"key": "available", "value": "Available", "category": "inventory_units_status", "description": "Unit is available for borrowing"},
    {"key": "borrowed", "value": "Borrowed", "category": "inventory_units_status", "description": "Unit is currently borrowed"},
    {"key": "maintenance", "value": "Maintenance", "category": "inventory_units_status", "description": "Unit is under maintenance"},
    {"key": "retired", "value": "Retired", "category": "inventory_units_status", "description": "Unit has been retired from service"},
    {"key": "consumed", "value": "Consumed", "category": "inventory_units_status", "description": "Unit has been consumed"},
    {"key": "expired", "value": "Expired", "category": "inventory_units_status", "description": "Unit has expired"},
    {"key": "discarded", "value": "Discarded", "category": "inventory_units_status", "description": "Unit has been discarded"},

    # Inventory Units Condition
    {"key": "excellent", "value": "Excellent", "category": "inventory_units_condition", "description": "Unit is in excellent condition"},
    {"key": "good", "value": "Good", "category": "inventory_units_condition", "description": "Unit is in good condition"},
    {"key": "fair", "value": "Fair", "category": "inventory_units_condition", "description": "Unit is in fair condition with minor wear"},
    {"key": "poor", "value": "Poor", "category": "inventory_units_condition", "description": "Unit is in poor condition with damage"},
    {"key": "unusable", "value": "Unusable", "category": "inventory_units_condition", "description": "Unit is unusable"},

    # Inventory Movement Types
    {"key": "manual_adjustment", "value": "Manual Adjustment", "category": "inventory_movements_movement_type", "description": "Manual stock adjustment"},
    {"key": "borrow_release", "value": "Borrow Release", "category": "inventory_movements_movement_type", "description": "Unit released for borrowing"},
    {"key": "borrow_return", "value": "Borrow Return", "category": "inventory_movements_movement_type", "description": "Unit returned from borrowing"},
    {"key": "procurement", "value": "Procurement", "category": "inventory_movements_movement_type", "description": "New unit procured"},
    {"key": "reversal", "value": "Reversal", "category": "inventory_movements_movement_type", "description": "Reversal of previous movement"},

    # Inventory Movement Reason Codes
    {"key": "manual_adjustment", "value": "Manual Adjustment", "category": "inventory_movements_reason_code", "description": "Manual stock adjustment"},
    {"key": "count_correction", "value": "Count Correction", "category": "inventory_movements_reason_code", "description": "Stock count correction"},
    {"key": "damage_writeoff", "value": "Damage / Write-off", "category": "inventory_movements_reason_code", "description": "Damaged stock write-off"},
    {"key": "loss_writeoff", "value": "Loss / Write-off", "category": "inventory_movements_reason_code", "description": "Lost stock write-off"},
    {"key": "procurement_correction", "value": "Procurement Correction", "category": "inventory_movements_reason_code", "description": "Procurement correction"},
    {"key": "return_correction", "value": "Return Correction", "category": "inventory_movements_reason_code", "description": "Borrow return correction"},
    {"key": "reversal_error", "value": "Reversal Error", "category": "inventory_movements_reason_code", "description": "Reversal due to incorrect ledger entry"},

    # Inventory Batch Status
    {"key": "healthy", "value": "11", "category": "inventory_batches_status", "description": "Stock level is healthy"},
    {"key": "low_stock", "value": "10", "category": "inventory_batches_status", "description": "Stock level is low (threshold)"},
    {"key": "out_of_stock", "value": "0", "category": "inventory_batches_status", "description": "Stock is depleted"},
    {"key": "near_expiry", "value": "7", "category": "inventory_batches_status", "description": "Batch is near expiration (days)"},
    {"key": "expired", "value": "0", "category": "inventory_batches_status", "description": "Batch has expired"},

    # Inventory Batch Condition
    {"key": "excellent", "value": "Excellent", "category": "inventory_batches_condition", "description": "Batch is in excellent condition"},
    {"key": "good", "value": "Good", "category": "inventory_batches_condition", "description": "Batch is in good condition"},
    {"key": "fair", "value": "Fair", "category": "inventory_batches_condition", "description": "Batch has minor issues"},
    {"key": "poor", "value": "Poor", "category": "inventory_batches_condition", "description": "Batch is in poor condition"},
    {"key": "unusable", "value": "Unusable", "category": "inventory_batches_condition", "description": "Batch is unusable"},

    # Weights
    {"key": "expired", "value": "100", "category": "inventory_units_status_weights", "description": "Weight for expired unit status"},
    {"key": "discarded", "value": "100", "category": "inventory_units_status_weights", "description": "Weight for discarded unit status"},
    {"key": "retired", "value": "100", "category": "inventory_units_status_weights", "description": "Weight for retired unit status"},
    {"key": "consumed", "value": "90", "category": "inventory_units_status_weights", "description": "Weight for consumed unit status"},
    {"key": "maintenance", "value": "80", "category": "inventory_units_status_weights", "description": "Weight for maintenance unit status"},
    {"key": "available", "value": "20", "category": "inventory_units_status_weights", "description": "Weight for available unit status"},
    {"key": "borrowed", "value": "20", "category": "inventory_units_status_weights", "description": "Weight for borrowed unit status"},

    {"key": "unusable", "value": "100", "category": "inventory_units_condition_weights", "description": "Weight for unusable unit condition"},
    {"key": "poor", "value": "80", "category": "inventory_units_condition_weights", "description": "Weight for poor unit condition"},
    {"key": "fair", "value": "30", "category": "inventory_units_condition_weights", "description": "Weight for fair unit condition"},
    {"key": "good", "value": "20", "category": "inventory_units_condition_weights", "description": "Weight for good unit condition"},
    {"key": "excellent", "value": "20", "category": "inventory_units_condition_weights", "description": "Weight for excellent unit condition"},

    {"key": "expired", "value": "100", "category": "inventory_batches_status_weights", "description": "Weight for expired batch status"},
    {"key": "near_expiry", "value": "60", "category": "inventory_batches_status_weights", "description": "Weight for near_expiry batch status"},
    {"key": "out_of_stock", "value": "50", "category": "inventory_batches_status_weights", "description": "Weight for out_of_stock batch status"},
    {"key": "low_stock", "value": "40", "category": "inventory_batches_status_weights", "description": "Weight for low_stock batch status"},
    {"key": "healthy", "value": "20", "category": "inventory_batches_status_weights", "description": "Weight for healthy batch status"},

    {"key": "unusable", "value": "100", "category": "inventory_batches_condition_weights", "description": "Weight for unusable batch condition"},
    {"key": "poor", "value": "80", "category": "inventory_batches_condition_weights", "description": "Weight for poor batch condition"},
    {"key": "fair", "value": "30", "category": "inventory_batches_condition_weights", "description": "Weight for fair batch condition"},
    {"key": "good", "value": "20", "category": "inventory_batches_condition_weights", "description": "Weight for good batch condition"},
    {"key": "excellent", "value": "20", "category": "inventory_batches_condition_weights", "description": "Weight for excellent batch condition"},

    # Borrow Request Workflow
    {"key": "pending", "value": "1", "category": "borrow_requests_status", "description": "Request awaiting approval"},
    {"key": "approved", "value": "2", "category": "borrow_requests_status", "description": "Request has been approved"},
    {"key": "sent_to_warehouse", "value": "3", "category": "borrow_requests_status", "description": "Request sent to warehouse for fulfillment"},
    {"key": "warehouse_approved", "value": "4", "category": "borrow_requests_status", "description": "Warehouse has approved and prepared items"},
    {"key": "released", "value": "5", "category": "borrow_requests_status", "description": "Items released to borrower"},
    {"key": "returned", "value": "6", "category": "borrow_requests_status", "description": "Items have been returned (terminal)"},
    {"key": "rejected", "value": "7", "category": "borrow_requests_status", "description": "Request rejected by approver (terminal)"},
    {"key": "warehouse_rejected", "value": "8", "category": "borrow_requests_status", "description": "Request rejected by warehouse (terminal)"},

    {"key": "standard", "value": "Standard", "category": "borrow_requests_approval_channel", "description": "Standard approval workflow"},
    {"key": "warehouse_manual", "value": "Warehouse Manual", "category": "borrow_requests_approval_channel", "description": "Manual warehouse approval"},
    {"key": "warehouse_shortage_auto", "value": "Warehouse Shortage Auto", "category": "borrow_requests_approval_channel", "description": "Automatic approval for warehouse shortage"},
    {"key": "warehouse_standard", "value": "Warehouse Standard", "category": "borrow_requests_approval_channel", "description": "Standard warehouse approval"},
    {"key": "warehouse_provisioned", "value": "Warehouse Pre-provisioned", "category": "borrow_requests_approval_channel", "description": "Pre-provisioned warehouse approval"},
    {"key": "emergency_bypass", "value": "Emergency Bypass", "category": "borrow_requests_approval_channel", "description": "Emergency bypass approval"},

    {"key": "inventory_manager", "value": "Inventory Manager", "category": "borrow_requests_request_channel", "description": "Request from inventory manager"},
    {"key": "borrower_portal", "value": "Borrower Portal", "category": "borrow_requests_request_channel", "description": "Request from borrower portal"},

    {"key": "created", "value": "Created", "category": "borrow_request_events_event_type", "description": "Request created"},
    {"key": "approved", "value": "Approved", "category": "borrow_request_events_event_type", "description": "Request approved"},
    {"key": "rejected", "value": "Rejected", "category": "borrow_request_events_event_type", "description": "Request rejected"},
    {"key": "reopened", "value": "Reopened", "category": "borrow_request_events_event_type", "description": "Request reopened"},
    {"key": "released", "value": "Released", "category": "borrow_request_events_event_type", "description": "Items released"},
    {"key": "returned", "value": "Returned", "category": "borrow_request_events_event_type", "description": "Items returned"},
    {"key": "sent_to_warehouse", "value": "Sent To Warehouse", "category": "borrow_request_events_event_type", "description": "Sent to warehouse"},
    {"key": "warehouse_approved", "value": "Warehouse Approved", "category": "borrow_request_events_event_type", "description": "Warehouse approved"},
    {"key": "warehouse_rejected", "value": "Warehouse Rejected", "category": "borrow_request_events_event_type", "description": "Warehouse rejected"},
    {"key": "units_assigned", "value": "Units Assigned", "category": "borrow_request_events_event_type", "description": "Units assigned"},
    {"key": "unit_assignment_skipped", "value": "Unit Assignment Skipped", "category": "borrow_request_events_event_type", "description": "Unit assignment skipped"},

    # Requested Items Status
    {"key": "pending", "value": "Pending", "category": "requested_items_status", "description": "Request pending procurement"},
    {"key": "procurement", "value": "Procurement", "category": "requested_items_status", "description": "Item is being procured"},
    {"key": "cancelled", "value": "Cancelled", "category": "requested_items_status", "description": "Procurement cancelled (terminal)"},
    {"key": "fulfilled", "value": "Fulfilled", "category": "requested_items_status", "description": "Item has been fulfilled (terminal)"},

    # Participants
    {"key": "witness", "value": "Witness", "category": "borrow_participants_role_in_request", "description": "Witness to the borrow transaction"},
    {"key": "approver", "value": "Approver of the borrow request", "category": "borrow_participants_role_in_request", "description": "Approver of the borrow request"},
    {"key": "recipient", "value": "Recipient", "category": "borrow_participants_role_in_request", "description": "Recipient of borrowed items"},

    # User Management
    {"key": "admin", "value": "ADMIN", "category": "users_role", "description": "Complete authority over user management, system configuration, and data overrides."},
    {"key": "inventory_manager", "value": "IVTM", "category": "users_role", "description": "Owns inventory lifecycle, borrowing workflow approvals, stock controls, and inventory configuration management."},
    {"key": "dispatch", "value": "DSPT", "category": "users_role", "description": "Operates release and return flow, validates units, and performs operational hand-offs."},
    {"key": "borrower", "value": "BRWR", "category": "users_role", "description": "Uses the borrower portal to submit borrowing requests and track assigned inventory usage."},
    {"key": "finance_manager", "value": "FINM", "category": "users_role", "description": "Monitors inventory performance, dashboard KPIs, and financial-impact configuration with read-heavy access."},
    {"key": "accountant", "value": "ACCT", "category": "users_role", "description": "Reconciles inventory movements, reviews anomalies, and performs audit-ledger verification."},
    {"key": "employee", "value": "EMPL", "category": "users_role", "description": "General staff with read access to inventory catalog and requested-items submission rights."},

    {"key": "day", "value": "Day", "category": "users_shift_type", "description": "Day shift (typically 8am-5pm)"},
    {"key": "night", "value": "Night", "category": "users_shift_type", "description": "Night shift (typically 5pm-2am)"},
    {"key": "morning", "value": "Morning", "category": "users_shift_type", "description": "Morning shift (typically 6am-2pm)"},
    {"key": "evening", "value": "Evening", "category": "users_shift_type", "description": "Evening shift (typically 2pm-10pm)"},

    # Backup & Audit Taxonomies
    {"key": "local", "value": "local", "category": "backup_runs_destination", "description": "Local filesystem destination"},
    {"key": "s3", "value": "s3", "category": "backup_runs_destination", "description": "Amazon S3 bucket destination"},
    {"key": "both", "value": "both", "category": "backup_runs_destination", "description": "Both local and S3 destinations"},

    {"key": "pending", "value": "Pending", "category": "backup_runs_status", "description": "Backup run pending"},
    {"key": "running", "value": "Running", "category": "backup_runs_status", "description": "Backup run in progress"},
    {"key": "completed", "value": "Completed", "category": "backup_runs_status", "description": "Backup run completed successfully"},
    {"key": "failed", "value": "Failed", "category": "backup_runs_status", "description": "Backup run failed"},

    {"key": "local", "value": "Local", "category": "backup_artifacts_target_type", "description": "Local filesystem backup"},
    {"key": "s3", "value": "S3", "category": "backup_artifacts_target_type", "description": "Amazon S3 bucket backup"},

    {"key": "inventory", "value": "Inventory", "category": "audit_logs_entity_type", "description": "Inventory item entity"},
    {"key": "inventory_unit", "value": "Inventory Unit", "category": "audit_logs_entity_type", "description": "Inventory unit entity"},
    {"key": "inventory_movement", "value": "Inventory Movement", "category": "audit_logs_entity_type", "description": "Inventory movement entity"},
    {"key": "borrow_request", "value": "Borrow Request", "category": "audit_logs_entity_type", "description": "Borrow request entity"},
    {"key": "requested_item", "value": "Requested Item", "category": "audit_logs_entity_type", "description": "Requested item entity"},
    {"key": "user", "value": "User", "category": "audit_logs_entity_type", "description": "User entity"},
    {"key": "system_setting", "value": "System Setting", "category": "audit_logs_entity_type", "description": "System configuration entity"},

    {"key": "create", "value": "Create", "category": "audit_logs_action", "description": "Entity created"},
    {"key": "update", "value": "Update", "category": "audit_logs_action", "description": "Entity updated"},
    {"key": "delete", "value": "Delete", "category": "audit_logs_action", "description": "Entity deleted"},
    {"key": "approve", "value": "Approve", "category": "audit_logs_action", "description": "Request approved"},
    {"key": "reject", "value": "Reject", "category": "audit_logs_action", "description": "Request rejected"},
    {"key": "release", "value": "Release", "category": "audit_logs_action", "description": "Items released"},
    {"key": "return", "value": "Return", "category": "audit_logs_action", "description": "Items returned"},
    {"key": "warehouse_approve", "value": "Warehouse Approve", "category": "audit_logs_action", "description": "Warehouse approval"},
    {"key": "warehouse_reject", "value": "Warehouse Reject", "category": "audit_logs_action", "description": "Warehouse rejection"},
    {"key": "assign", "value": "Assign", "category": "audit_logs_action", "description": "Units assigned"},
    {"key": "adjust_stock", "value": "Adjust Stock", "category": "audit_logs_action", "description": "Stock adjustment"},
    {"key": "transition", "value": "Transition", "category": "audit_logs_action", "description": "Status transition"},
]

RBAC_ROLES = [
    {
        "role": "inventory_manager",
        "display_name": "Inventory Manager",
        "systems": ["inventory"],
        "permissions": [
             "auth:session:manage", "inventory:items:manage", "inventory:items:view", "inventory:units:manage",
             "inventory:units:view", "inventory:movements:manage", "inventory:movements:view",
             "inventory:borrow_requests:manage", "inventory:warehouse:manage", "inventory:requested_items:manage",
             "inventory:dashboard:view", "inventory:audit:view", "inventory:borrower_portal:access", "inventory:config:manage",
        ],
    },
    {
        "role": "dispatch",
        "display_name": "Dispatch",
        "systems": ["inventory"],
        "permissions": [
            "auth:session:manage", "inventory:items:view", "inventory:units:view", "inventory:units:manage",
            "inventory:borrow_requests:manage", "inventory:borrower_portal:access",
        ],
    },
    {
        "role": "borrower",
        "display_name": "Borrower",
        "systems": ["inventory"],
        "permissions": [
            "auth:session:manage", "inventory:borrower_portal:access", "inventory:requested_items:manage", "inventory:items:view",
        ],
    },
    {
        "role": "employee",
        "display_name": "Employee",
        "systems": ["inventory"],
        "permissions": [
            "auth:session:manage", "inventory:items:view", "inventory:requested_items:manage", "inventory:borrower_portal:access",
        ],
    },
    {
        "role": "accountant",
        "display_name": "Accountant",
        "systems": ["inventory"],
        "permissions": [
            "auth:session:manage", "inventory:items:view", "inventory:movements:view", "inventory:audit:view", "inventory:dashboard:view",
        ],
    },
    {
        "role": "finance_manager",
        "display_name": "Finance Manager",
        "systems": ["inventory"],
        "permissions": [
            "auth:session:manage", "inventory:items:view", "inventory:movements:view", "inventory:requested_items:manage",
            "inventory:dashboard:view", "inventory:audit:view",
        ],
    },
]
