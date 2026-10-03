import { ClientProfile, CompleteAnalysisRecord } from '../types/tax';
import { validateGstin } from '../data/gstStateMaster';

const STORAGE_KEYS = {
  PROFILE: 'client_company_profile_v2',
  ANALYSES: 'client_invoice_analyses_v2',
};

// Clean up legacy prefilled caches if present
try {
  localStorage.removeItem('ca_analyzer_clients_v1');
  localStorage.removeItem('ca_analyzer_audit_logs_v1');
} catch {
  // ignore
}

export const storageService = {
  // SINGLE CLIENT/COMPANY PROFILE MANAGEMENT (Zero prefilled data)
  getProfile(): ClientProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (!data) return null;
      return JSON.parse(data) as ClientProfile;
    } catch (e) {
      console.error('Failed to read profile from localStorage:', e);
      return null;
    }
  },

  hasProfile(): boolean {
    return this.getProfile() !== null;
  },

  saveProfile(client: Omit<ClientProfile, 'id' | 'createdAt' | 'updatedAt' | 'version'> & { id?: string }): {
    success: boolean;
    client?: ClientProfile;
    error?: string;
  } {
    try {
      // Auto-validate GSTIN and state if GSTIN present
      let stateCode = client.stateCode;
      let stateName = client.stateName;
      let pan = client.pan;

      if (client.gstin && client.gstin.trim()) {
        const val = validateGstin(client.gstin);
        if (!val.isValid) {
          return { success: false, error: val.error || 'Invalid GSTIN' };
        }
        if (val.state) {
          stateCode = val.state.code;
          stateName = val.state.name;
        }
        if (val.pan && !pan) {
          pan = val.pan;
        }
      }

      const now = new Date().toISOString();
      const current = this.getProfile();

      const savedClient: ClientProfile = {
        ...client,
        id: current?.id || 'client-profile-main',
        pan: pan || '',
        stateCode: stateCode || '',
        stateName: stateName || '',
        createdAt: current?.createdAt || now,
        updatedAt: now,
        version: (current?.version || 0) + 1,
      };

      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(savedClient));
      return { success: true, client: savedClient };
    } catch (e: any) {
      console.error('Error saving profile:', e);
      return { success: false, error: e?.message || 'Failed to save profile' };
    }
  },

  deleteProfile(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      return true;
    } catch (e) {
      console.error('Error deleting profile:', e);
      return false;
    }
  },

  // Helper for existing components expecting getClients()
  getClients(): ClientProfile[] {
    const p = this.getProfile();
    return p ? [p] : [];
  },

  getClientById(id: string): ClientProfile | null {
    const p = this.getProfile();
    if (p && (p.id === id || id === 'current')) return p;
    return null;
  },

  saveClient(client: any) {
    return this.saveProfile(client);
  },

  // INVOICE ANALYSES MANAGEMENT
  getAnalyses(): CompleteAnalysisRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ANALYSES);
      return data ? (JSON.parse(data) as CompleteAnalysisRecord[]) : [];
    } catch (e) {
      console.error('Failed to read analyses:', e);
      return [];
    }
  },

  getAnalysesForClient(_clientId?: string): CompleteAnalysisRecord[] {
    return this.getAnalyses();
  },

  getAnalysisById(id: string): CompleteAnalysisRecord | null {
    const list = this.getAnalyses();
    return list.find(a => a.id === id) || null;
  },

  saveAnalysis(record: CompleteAnalysisRecord): boolean {
    try {
      const list = this.getAnalyses();
      const existingIdx = list.findIndex(a => a.id === record.id);
      if (existingIdx >= 0) {
        list[existingIdx] = record;
      } else {
        list.unshift(record);
      }
      localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Failed to save analysis record:', e);
      return false;
    }
  },

  deleteAnalysis(id: string): boolean {
    try {
      const list = this.getAnalyses().filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Failed to delete analysis:', e);
      return false;
    }
  },

  deleteBatchAnalyses(ids: string[]): boolean {
    try {
      const idSet = new Set(ids);
      const list = this.getAnalyses().filter(a => !idSet.has(a.id));
      localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Failed to delete batch analyses:', e);
      return false;
    }
  },

  saveBatchAnalyses(records: CompleteAnalysisRecord[]): boolean {
    try {
      const list = this.getAnalyses();
      for (const record of records) {
        const existingIdx = list.findIndex(a => a.id === record.id);
        if (existingIdx >= 0) {
          list[existingIdx] = record;
        } else {
          list.unshift(record);
        }
      }
      localStorage.setItem(STORAGE_KEYS.ANALYSES, JSON.stringify(list));
      return true;
    } catch (e) {
      console.error('Failed to save batch analyses:', e);
      return false;
    }
  },

  // FINANCIAL YEAR & VENDOR AGGREGATE LIMIT UTILITIES
  getFinancialYear(dateStr?: string): string {
    if (!dateStr || !dateStr.trim()) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0 is January, 3 is April
      return month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '2026-27';
    const year = d.getFullYear();
    const month = d.getMonth();
    return month >= 3 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
  },

  getVendorFySummary(
    vendor: { pan?: string; gstin?: string; name?: string },
    targetFy?: string,
    excludeInvoiceId?: string
  ): {
    financialYear: string;
    cumulativeTaxableAmount: number;
    cumulativeGrandTotal: number;
    cumulativeTdsDeducted: number;
    invoiceCount: number;
    invoices: Array<{
      id: string;
      invoiceNumber: string;
      invoiceDate: string;
      taxableValue: number;
      grandTotal: number;
      tdsApplicable: string;
      tdsAmount: number;
      natureOfSupply: string;
    }>;
  } {
    const defaultFy = targetFy || this.getFinancialYear();
    const vPan = (vendor.pan || '').trim().toUpperCase();
    const vGstin = (vendor.gstin || '').trim().toUpperCase();
    const vName = (vendor.name || '').trim().toLowerCase();

    if (!vPan && !vGstin && !vName) {
      return {
        financialYear: defaultFy,
        cumulativeTaxableAmount: 0,
        cumulativeGrandTotal: 0,
        cumulativeTdsDeducted: 0,
        invoiceCount: 0,
        invoices: [],
      };
    }

    const allAnalyses = this.getAnalyses();
    const matchingRecords = allAnalyses.filter(rec => {
      if (excludeInvoiceId && rec.id === excludeInvoiceId) return false;

      // Match Financial Year
      const invDate = rec.invoiceData.paymentOrCreditDate || rec.invoiceData.invoiceDate;
      const recFy = rec.invoiceData.financialYear || this.getFinancialYear(invDate);
      if (recFy !== defaultFy) return false;

      // Match Vendor
      const recPan = (rec.invoiceData.supplierPan || '').trim().toUpperCase();
      const recGstin = (rec.invoiceData.supplierGstin || '').trim().toUpperCase();
      const recName = (rec.invoiceData.supplierName || '').trim().toLowerCase();

      if (vPan && recPan && vPan === recPan) return true;
      if (vGstin && recGstin && vGstin === recGstin) return true;
      if (vName && recName && (vName === recName || vName.includes(recName) || recName.includes(vName))) return true;

      return false;
    });

    const cumulativeTaxableAmount = matchingRecords.reduce((sum, r) => sum + (r.invoiceData.subtotalTaxable || 0), 0);
    const cumulativeGrandTotal = matchingRecords.reduce((sum, r) => sum + (r.invoiceData.grandTotal || 0), 0);
    const cumulativeTdsDeducted = matchingRecords.reduce((sum, r) => sum + (r.tdsResult?.tdsAmount || 0), 0);

    const invoices = matchingRecords.map(r => ({
      id: r.id,
      invoiceNumber: r.invoiceData.invoiceNumber || 'No-Number',
      invoiceDate: r.invoiceData.invoiceDate || '',
      taxableValue: r.invoiceData.subtotalTaxable || 0,
      grandTotal: r.invoiceData.grandTotal || 0,
      tdsApplicable: r.tdsResult?.tdsApplicable || 'NO',
      tdsAmount: r.tdsResult?.tdsAmount || 0,
      natureOfSupply: r.invoiceData.natureOfSupplySummary || '',
    }));

    return {
      financialYear: defaultFy,
      cumulativeTaxableAmount,
      cumulativeGrandTotal,
      cumulativeTdsDeducted,
      invoiceCount: matchingRecords.length,
      invoices,
    };
  },

  clearAllAnalyses(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEYS.ANALYSES);
      return true;
    } catch (e) {
      console.error('Failed to clear analyses:', e);
      return false;
    }
  },
};
