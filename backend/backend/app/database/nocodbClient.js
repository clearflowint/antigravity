// backend/app/database/nocodbClient.js
// NocoDB v2 API Client with Enforced Tenant Isolation & Idempotent Global_ID Upserts
import axios from 'axios';
import { config } from '../config.js';
import { saasStore } from './store.js';

class NocoDBClient {
  constructor() {
    this.baseUrl = config.nocodb.baseUrl?.replace(/\/+$/, '');
    this.apiToken = config.nocodb.apiToken;
    this.tables = config.nocodb.tables;
    this.isConfigured = Boolean(
      this.baseUrl &&
      this.apiToken &&
      !this.baseUrl.includes('your-domain.com') &&
      !this.baseUrl.includes('example.com') &&
      !this.apiToken.includes('your_nocodb')
    );

    if (this.isConfigured) {
      this.http = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'xc-token': this.apiToken,
          'Content-Type': 'application/json'
        },
        timeout: 8000
      });
    }
  }

  /**
   * Health check for NocoDB connection
   */
  async checkHealth() {
    if (!this.isConfigured) {
      return {
        connected: false,
        mode: 'LOCAL_PERSISTENT_STORE',
        reason: 'NOCODB_BASE_URL or NOCODB_API_TOKEN not provided in .env'
      };
    }
    try {
      const resp = await this.http.get('/api/v2/meta/bases');
      return {
        connected: true,
        mode: 'NOCODB_CLOUD_RELATIONAL',
        basesCount: resp.data?.list?.length || 0
      };
    } catch (err) {
      return {
        connected: false,
        mode: 'LOCAL_PERSISTENT_STORE_FALLBACK',
        error: err.message
      };
    }
  }

  /**
   * Safe Tenant-Isolated Query: Injects where=(Tenant_ID,eq,[Tenant_ID])
   */
  async findRecords(tableName, tenantId, filters = '') {
    if (!this.isConfigured) {
      // Local Store fallback
      if (tableName === this.tables.chittis) return saasStore.getGroups(tenantId);
      if (tableName === this.tables.shares) return saasStore.getShares(tenantId, filters);
      return [];
    }

    try {
      const tenantFilter = `(Tenant_ID,eq,${tenantId})`;
      const combinedWhere = filters ? `(${tenantFilter}~and${filters})` : tenantFilter;
      const resp = await this.http.get(`/api/v2/tables/${tableName}/records`, {
        params: { where: combinedWhere, limit: 100 }
      });
      return resp.data?.list || [];
    } catch (err) {
      console.warn(`[NocoDBClient] Query failed for ${tableName}, falling back to store:`, err.message);
      if (tableName === this.tables.chittis) return saasStore.getGroups(tenantId);
      return [];
    }
  }

  /**
   * Idempotent Record Write by Global_ID
   */
  async upsertRecord(tableName, record) {
    if (!record.Tenant_ID) {
      throw new Error('Tenant_ID is mandatory for all NocoDB writes');
    }
    if (!record.Global_ID) {
      throw new Error('Global_ID (UUID) is mandatory for all NocoDB writes');
    }

    // Always mirror in local store immediately for instant consistent reads
    saasStore.upsertRecord(tableName, record);

    if (!this.isConfigured) {
      return { record, destination: 'LOCAL_STORE' };
    }

    try {
      // Check if record exists in NocoDB by Global_ID
      const checkResp = await this.http.get(`/api/v2/tables/${tableName}/records`, {
        params: {
          where: `((Tenant_ID,eq,${record.Tenant_ID})~and(Global_ID,eq,${record.Global_ID}))`,
          limit: 1
        }
      });

      const existing = checkResp.data?.list?.[0];
      if (existing) {
        // PATCH existing record
        const patchResp = await this.http.patch(`/api/v2/tables/${tableName}/records`, {
          Id: existing.Id,
          ...record
        });
        return { record: patchResp.data, operation: 'PATCH', destination: 'NOCODB' };
      } else {
        // POST new record
        const postResp = await this.http.post(`/api/v2/tables/${tableName}/records`, record);
        return { record: postResp.data, operation: 'POST', destination: 'NOCODB' };
      }
    } catch (err) {
      console.warn(`[NocoDBClient] Upsert failed for ${tableName}:`, err.message);
      // Even if NocoDB network call fails, local store is intact
      return { record, error: err.message, destination: 'LOCAL_STORE_BUFFERED' };
    }
  }

  /**
   * Bulk Insert / Batching for Shares
   */
  async bulkInsert(tableName, records) {
    records.forEach((r) => saasStore.upsertRecord(tableName, r));

    if (!this.isConfigured) {
      return { count: records.length, destination: 'LOCAL_STORE' };
    }

    try {
      const resp = await this.http.post(`/api/v2/tables/${tableName}/records`, records);
      return { data: resp.data, destination: 'NOCODB' };
    } catch (err) {
      console.warn(`[NocoDBClient] Bulk insert failed for ${tableName}:`, err.message);
      return { count: records.length, error: err.message, destination: 'LOCAL_STORE_BUFFERED' };
    }
  }
}

export const nocodbClient = new NocoDBClient();
