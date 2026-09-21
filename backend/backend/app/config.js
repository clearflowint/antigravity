// backend/app/config.js
// Configuration for Multi-Tenant SaaS and NocoDB Integration
import fs from 'fs';
import path from 'path';

// Load .env if present using native Node 20+ feature
try {
  if (typeof process.loadEnvFile === 'function') {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
} catch (e) {
  // Ignore if .env does not exist
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  backendPort: parseInt(process.env.BACKEND_PORT || '8000', 10),

  // Tenant Configuration
  tenancy: {
    headerName: 'x-tenant-id',
    defaultTenantId: 'TNT-840192', // Default Chit Operator Tenant ID
    defaultManagerId: '840192'
  },

  // NocoDB Connection Settings (Configured via .env)
  nocodb: {
    baseUrl: process.env.NOCODB_BASE_URL || '',
    apiToken: process.env.NOCODB_API_TOKEN || '',
    baseId: process.env.NOCODB_BASE_ID || '',
    tables: {
      tenants: process.env.NOCODB_TABLE_TENANTS || 'Tenants',
      managers: process.env.NOCODB_TABLE_MANAGERS || 'Managers',
      chittis: process.env.NOCODB_TABLE_CHITTIS || 'Chitti_Groups',
      shares: process.env.NOCODB_TABLE_SHARES || 'Shares',
      cycles: process.env.NOCODB_TABLE_CYCLES || 'Chitti_Cycles',
      transactions: process.env.NOCODB_TABLE_TRANSACTIONS || 'Transactions',
      outbox: process.env.NOCODB_TABLE_OUTBOX || 'Outbox_Jobs'
    }
  }
};
