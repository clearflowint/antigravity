// backend/app/middleware/tenantContext.js
// Intercepts every incoming request, validates identity, and injects Tenant_ID
import { config } from '../config.js';
import { saasStore } from '../database/store.js';

export function extractTenantContext(req) {
  const headerTenant = req.headers?.[config.tenancy.headerName.toLowerCase()];
  const queryTenant = req.query?.tenant_id;
  const tenantId = (headerTenant || queryTenant || config.tenancy.defaultTenantId).toString().trim();

  // Validate or fetch tenant
  let tenant = saasStore.getTenant(tenantId);
  if (!tenant) {
    // If tenant doesn't exist yet, auto-provision for the tenant partition
    tenant = {
      Global_ID: crypto.randomUUID(),
      Tenant_ID: tenantId,
      Manager_ID: tenantId.replace(/^TNT-/, '').slice(0, 6) || config.tenancy.defaultManagerId,
      Company_Name: `Chit Fund Manager (${tenantId})`,
      Email: 'manager@clearflow.app',
      Phone: '+91 98000 00000',
      Status: 'Active',
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString()
    };
    saasStore.upsertRecord('Tenants', tenant);
  }

  return {
    tenantId,
    tenant,
    managerId: tenant.Manager_ID
  };
}
