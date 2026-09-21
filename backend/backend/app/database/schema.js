// backend/app/database/schema.js
// Multi-Tenant SaaS Database Architecture Specification
// Strict Tenant Isolation: Every table enforces Tenant_ID & Global_ID (UUID)

export const SAAS_TABLE_SCHEMAS = {
  Tenants: {
    tableName: 'Tenants',
    description: 'Chit fund management company or operator tenant partitions',
    primaryKey: 'Tenant_ID',
    columns: [
      { name: 'Global_ID', type: 'UUID', required: true, unique: true, description: 'Universal cross-system UUID' },
      { name: 'Tenant_ID', type: 'String(32)', required: true, unique: true, index: true, description: 'Tenant identifier (e.g., TNT-840192)' },
      { name: 'Company_Name', type: 'String(128)', required: true },
      { name: 'Manager_ID', type: 'String(6)', required: true, unique: true, description: '6-digit unique manager code' },
      { name: 'Email', type: 'String(128)', required: true },
      { name: 'Phone', type: 'String(32)', required: true },
      { name: 'Status', type: 'Enum(Active, Suspended, Trial)', default: 'Active' },
      { name: 'Created_At', type: 'DateTime', required: true },
      { name: 'Updated_At', type: 'DateTime', required: true }
    ],
    indexes: ['Global_ID', 'Tenant_ID', 'Manager_ID']
  },

  Chitti_Groups: {
    tableName: 'Chitti_Groups',
    description: 'Community chit fund circles partitioned by Tenant_ID',
    primaryKey: 'Global_ID',
    columns: [
      { name: 'Global_ID', type: 'UUID', required: true, unique: true, description: 'Universal record UUID' },
      { name: 'Tenant_ID', type: 'String(32)', required: true, index: true, description: 'Foreign Key to Tenants' },
      { name: 'Chitti_ID', type: 'String(6)', required: true, index: true, description: '6-digit unique circle code' },
      { name: 'Manager_ID', type: 'String(6)', required: true, description: '6-digit manager code' },
      { name: 'Chitti_Name', type: 'String(128)', required: true },
      { name: 'Rule_Template', type: 'String(64)', default: 'Incremental Model V1' },
      { name: 'Total_Members', type: 'Integer', required: true, description: 'Total shares S' },
      { name: 'Total_Months', type: 'Integer', required: true, description: 'Total duration M' },
      { name: 'Undrawn_Due', type: 'Decimal(12,2)', required: true, description: 'Monthly payment for non-prized shares' },
      { name: 'Drawn_Due', type: 'Decimal(12,2)', required: true, description: 'Monthly payment for prized shares' },
      { name: 'Monthly_Commission', type: 'Decimal(12,2)', required: true, description: 'Foreman monthly commission C' },
      { name: 'Current_Month', type: 'Integer', default: 1 },
      { name: 'Cycle_Start_Date', type: 'Date', required: true },
      { name: 'Cycle_Anchor_Day', type: 'Integer', default: 10 },
      { name: 'Frequency', type: 'String(32)', default: 'Monthly' },
      { name: 'Status', type: 'Enum(Active, Completed, Draft)', default: 'Active' },
      { name: 'Created_At', type: 'DateTime', required: true },
      { name: 'Updated_At', type: 'DateTime', required: true }
    ],
    indexes: ['Global_ID', 'Tenant_ID', 'Chitti_ID', ['Tenant_ID', 'Chitti_ID']]
  },

  Shares: {
    tableName: 'Shares',
    description: 'Individual member shares within a circle, strictly isolated by Tenant_ID',
    primaryKey: 'Global_ID',
    columns: [
      { name: 'Global_ID', type: 'UUID', required: true, unique: true },
      { name: 'Tenant_ID', type: 'String(32)', required: true, index: true },
      { name: 'Chitti_ID', type: 'String(6)', required: true, index: true },
      { name: 'Share_ID', type: 'String(6)', required: true, index: true, description: '6-digit unique share code' },
      { name: 'Share_Number', type: 'Integer', required: true, description: 'Sequential roster number 1..S' },
      { name: 'Member_Name', type: 'String(128)', required: true },
      { name: 'Phone_Number', type: 'String(32)', required: true },
      { name: 'Draw_Status', type: 'Enum(Undrawn, Drawn)', default: 'Undrawn' },
      { name: 'Month_Drawn', type: 'Integer', nullable: true, description: 'Month in which share won the auction/draw' },
      { name: 'Advance_Credit', type: 'Decimal(12,2)', default: 0, description: 'Excess payment advance reserve balance' },
      { name: 'Created_At', type: 'DateTime', required: true },
      { name: 'Updated_At', type: 'DateTime', required: true }
    ],
    indexes: ['Global_ID', 'Tenant_ID', 'Chitti_ID', 'Share_ID', ['Tenant_ID', 'Chitti_ID', 'Share_ID']]
  },

  Chitti_Cycles: {
    tableName: 'Chitti_Cycles',
    description: 'Monthly auction and pool reconciliation ledger',
    primaryKey: 'Global_ID',
    columns: [
      { name: 'Global_ID', type: 'UUID', required: true, unique: true },
      { name: 'Tenant_ID', type: 'String(32)', required: true, index: true },
      { name: 'Chitti_ID', type: 'String(6)', required: true, index: true },
      { name: 'Month_Number', type: 'Integer', required: true },
      { name: 'Gross_Pool', type: 'Decimal(12,2)', required: true },
      { name: 'Monthly_Commission', type: 'Decimal(12,2)', required: true },
      { name: 'Net_Payout', type: 'Decimal(12,2)', required: true },
      { name: 'Winner_Share_ID', type: 'String(6)', nullable: true },
      { name: 'Status', type: 'Enum(Scheduled, Active, Reconciled)', default: 'Active' },
      { name: 'Reconciled_At', type: 'DateTime', nullable: true },
      { name: 'Created_At', type: 'DateTime', required: true }
    ],
    indexes: ['Global_ID', 'Tenant_ID', ['Tenant_ID', 'Chitti_ID', 'Month_Number']]
  },

  Transactions: {
    tableName: 'Transactions',
    description: 'Member installment payment ledger entries with Smart Over/Under settlement',
    primaryKey: 'Global_ID',
    columns: [
      { name: 'Global_ID', type: 'UUID', required: true, unique: true },
      { name: 'Tenant_ID', type: 'String(32)', required: true, index: true },
      { name: 'Chitti_ID', type: 'String(6)', required: true, index: true },
      { name: 'Trans_ID', type: 'String(64)', required: true, index: true },
      { name: 'Share_ID', type: 'String(6)', required: true, index: true },
      { name: 'Month_Number', type: 'Integer', required: true },
      { name: 'Draw_Status', type: 'Enum(Drawn, Undrawn)', required: true },
      { name: 'Amount_Due', type: 'Decimal(12,2)', required: true },
      { name: 'Amount_Paid', type: 'Decimal(12,2)', default: 0 },
      { name: 'Pending_Dues', type: 'Decimal(12,2)', default: 0 },
      { name: 'Payment_Status', type: 'Enum(Verified, Partial, Pending)', default: 'Pending' },
      { name: 'Payment_Mode', type: 'Enum(UPI, Cash, Advance Credit, Bank Transfer)', default: 'UPI' },
      { name: 'Payment_Date', type: 'Date', nullable: true },
      { name: 'Payment_Ref', type: 'String(64)', nullable: true },
      { name: 'Entry_Type', type: 'Enum(Credit, Debit)', default: 'Credit' },
      { name: 'Created_At', type: 'DateTime', required: true },
      { name: 'Updated_At', type: 'DateTime', required: true }
    ],
    indexes: [
      'Global_ID',
      'Tenant_ID',
      ['Tenant_ID', 'Chitti_ID', 'Month_Number'],
      ['Tenant_ID', 'Chitti_ID', 'Share_ID', 'Month_Number']
    ]
  },

  Outbox_Jobs: {
    tableName: 'Outbox_Jobs',
    description: 'Shock-absorber queue & audit trail of buffered mutations dispatched to NocoDB',
    primaryKey: 'Job_ID',
    columns: [
      { name: 'Job_ID', type: 'UUID', required: true, unique: true },
      { name: 'Tenant_ID', type: 'String(32)', required: true, index: true },
      { name: 'Global_ID', type: 'UUID', required: true, index: true },
      { name: 'Entity_Type', type: 'String(64)', required: true },
      { name: 'Operation', type: 'Enum(CREATE_CHITTI, CREATE_SHARES, RECORD_PAYMENT, UPDATE_DRAW, UPDATE_CONTACT, DELETE_CHITTI)', required: true },
      { name: 'Payload', type: 'JSON', required: true },
      { name: 'Status', type: 'Enum(QUEUED, PROCESSING, COMPLETED, FAILED)', default: 'QUEUED' },
      { name: 'Attempts', type: 'Integer', default: 0 },
      { name: 'Error_Message', type: 'String(512)', nullable: true },
      { name: 'Created_At', type: 'DateTime', required: true },
      { name: 'Processed_At', type: 'DateTime', nullable: true }
    ],
    indexes: ['Job_ID', 'Tenant_ID', 'Status', 'Created_At']
  }
};
