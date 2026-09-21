// app/database/schema.js
export const SAAS_TABLE_SCHEMAS = {
  Tenants: {
    tableName: 'Tenants',
    primaryKey: 'Tenant_ID'
  },
  Chitti_Groups: {
    tableName: 'Chitti_Groups',
    primaryKey: 'Global_ID'
  },
  Shares: {
    tableName: 'Shares',
    primaryKey: 'Global_ID'
  },
  Chitti_Cycles: {
    tableName: 'Chitti_Cycles',
    primaryKey: 'Global_ID'
  },
  Transactions: {
    tableName: 'Transactions',
    primaryKey: 'Global_ID'
  }
};
