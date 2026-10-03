import React, { useState } from 'react';
import { CompleteAnalysisRecord, ClientProfile } from '../types/tax';
import { FileSpreadsheet, FileText, Eye, Trash2, History, AlertCircle, ArrowLeft, CheckSquare, Square, Scale, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { exportAnalysisToExcel } from '../services/excelExportService';
import { exportAnalysisToWord } from '../services/wordExportService';
import { storageService } from '../services/storageService';

interface Props {
  client: ClientProfile;
  analyses: CompleteAnalysisRecord[];
  onOpenAnalysis: (record: CompleteAnalysisRecord) => void;
  onDeleteAnalysis: (id: string) => void;
  onDeleteBatchAnalyses?: (ids: string[]) => void;
  onBackToNewAnalysis: () => void;
}

export const PreviousAnalysesList: React.FC<Props> = ({
  client,
  analyses,
  onOpenAnalysis,
  onDeleteAnalysis,
  onDeleteBatchAnalyses,
  onBackToNewAnalysis,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isFySummaryOpen, setIsFySummaryOpen] = useState(false);

  const toggleSelectRecord = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === analyses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(analyses.map(a => a.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} selected invoice analyses? This cannot be undone.`)) {
      if (onDeleteBatchAnalyses) {
        onDeleteBatchAnalyses(selectedIds);
      } else {
        selectedIds.forEach(id => onDeleteAnalysis(id));
      }
      setSelectedIds([]);
    }
  };

  const handleBulkExportExcel = () => {
    const selected = analyses.filter(a => selectedIds.includes(a.id));
    selected.forEach((record, index) => {
      setTimeout(() => {
        exportAnalysisToExcel(record);
      }, index * 200);
    });
  };

  // Group analyses by Vendor & Financial Year for the FY Aggregate Limit Summary
  const vendorFySummaryList = React.useMemo(() => {
    const map = new Map<string, {
      vendorName: string;
      vendorGstin: string;
      vendorPan: string;
      financialYear: string;
      invoicesCount: number;
      totalTaxable: number;
      totalGrandTotal: number;
      totalTds: number;
      isThresholdExceeded: boolean;
      nature: string;
    }>();

    analyses.forEach(rec => {
      const inv = rec.invoiceData;
      const fy = inv.financialYear || storageService.getFinancialYear(inv.paymentOrCreditDate || inv.invoiceDate);
      const vendorKey = (inv.supplierPan || inv.supplierGstin || inv.supplierName || 'Unknown').trim().toUpperCase() + '_' + fy;

      const existing = map.get(vendorKey) || {
        vendorName: inv.supplierName || 'Unnamed Vendor',
        vendorGstin: inv.supplierGstin || '',
        vendorPan: inv.supplierPan || '',
        financialYear: fy,
        invoicesCount: 0,
        totalTaxable: 0,
        totalGrandTotal: 0,
        totalTds: 0,
        isThresholdExceeded: false,
        nature: inv.natureOfSupplySummary || 'Goods / Services',
      };

      existing.invoicesCount += 1;
      existing.totalTaxable += (inv.subtotalTaxable || 0);
      existing.totalGrandTotal += (inv.grandTotal || 0);
      existing.totalTds += (rec.tdsResult?.tdsAmount || 0);
      if (rec.tdsResult?.thresholdStatus === 'Exceeded' || rec.tdsResult?.thresholdExceededDueToAggregate) {
        existing.isThresholdExceeded = true;
      }

      map.set(vendorKey, existing);
    });

    return Array.from(map.values());
  }, [analyses]);

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Saved Invoice Analyses & FY Aggregate Tracker</h2>
            <p className="text-xs text-slate-300">
              Historical records and financial year cumulative aggregate limits for {client.clientName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {analyses.length > 0 && (
            <button
              onClick={() => setIsFySummaryOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-md border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>FY Aggregate Limits</span>
            </button>
          )}

          <button
            onClick={onBackToNewAnalysis}
            className="text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>New Invoice Analysis</span>
          </button>
        </div>
      </div>

      {/* Multi-Invoice Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-emerald-950 font-bold">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>{selectedIds.length} of {analyses.length} Invoices Selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleBulkExportExcel}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Selected ({selectedIds.length})</span>
            </button>

            <button
              type="button"
              onClick={handleBulkDelete}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-md flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2 py-1 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="p-6">
        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700">No saved analyses yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Analyses saved for {client.clientName} will appear here with TDS & GST ITC decisions, financial year aggregate tracking, and instant Excel/Word exports.
            </p>
            <button
              onClick={onBackToNewAnalysis}
              className="mt-4 px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Analyze First Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === analyses.length && analyses.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded text-slate-900 cursor-pointer"
                      title="Select all invoices"
                    />
                  </th>
                  <th className="py-3 px-3">Invoice Details</th>
                  <th className="py-3 px-3">Financial Year</th>
                  <th className="py-3 px-3">Supplier & GSTIN</th>
                  <th className="py-3 px-3 text-center">TDS Result</th>
                  <th className="py-3 px-3 text-right">TDS Amount</th>
                  <th className="py-3 px-3 text-center">ITC Status</th>
                  <th className="py-3 px-3 text-right">Eligible ITC</th>
                  <th className="py-3 px-3">Analyzed Date</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {analyses.map(record => {
                  const isSelected = selectedIds.includes(record.id);
                  const fy = record.invoiceData.financialYear || storageService.getFinancialYear(record.invoiceData.paymentOrCreditDate || record.invoiceData.invoiceDate);
                  const isAggregateBreach = record.tdsResult?.thresholdExceededDueToAggregate;

                  return (
                    <tr
                      key={record.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRecord(record.id)}
                          className="rounded text-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900 font-mono">{record.invoiceData.invoiceNumber || 'No-Number'}</p>
                        <span className="text-[11px] text-slate-500">{record.invoiceData.invoiceDate}</span>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700 text-[10px]">
                          {fy}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-medium text-slate-800 line-clamp-1">{record.invoiceData.supplierName}</p>
                        <span className="text-[11px] font-mono text-slate-500">{record.invoiceData.supplierGstin || 'No GSTIN'}</span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              record.tdsResult.tdsApplicable === 'YES'
                                ? 'bg-rose-100 text-rose-800'
                                : record.tdsResult.tdsApplicable === 'NO'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {record.tdsResult.tdsApplicable}
                          </span>
                          {isAggregateBreach && (
                            <span className="text-[9px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded" title="Threshold exceeded due to multiple invoices aggregate in FY">
                              FY Limit Exceeded
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                        ₹ {record.tdsResult.tdsAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            record.itcResult.overallStatus === 'Eligible'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.itcResult.overallStatus === 'Not Eligible'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {record.itcResult.overallStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                        ₹ {record.itcResult.eligibleItc.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {new Date(record.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onOpenAnalysis(record)}
                            title="Open & View Analysis"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => exportAnalysisToExcel(record)}
                            title="Export to Excel (.xlsx)"
                            className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => exportAnalysisToWord(record)}
                            title="Export to Word (.docx)"
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete analysis record for Invoice ${record.invoiceData.invoiceNumber}?`)) {
                                onDeleteAnalysis(record.id);
                              }
                            }}
                            title="Delete Record"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FY AGGREGATE LIMITS SUMMARY MODAL */}
      {isFySummaryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Scale className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold">Financial Year Vendor Aggregate Limits Summary</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFySummaryOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <p className="text-slate-600">
                This table summarizes the total aggregate invoice value issued to each vendor within each Financial Year across your saved records, ensuring statutory TDS aggregate limits (Sec 194C ₹1,00,000, Sec 194Q ₹50,00,000, Sec 194J ₹30,000) are accurately tracked.
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3">Vendor / Supplier</th>
                      <th className="py-2.5 px-3">Financial Year</th>
                      <th className="py-2.5 px-3 text-center">Invoices</th>
                      <th className="py-2.5 px-3 text-right">Total Taxable Value</th>
                      <th className="py-2.5 px-3 text-right">Total TDS Deducted</th>
                      <th className="py-2.5 px-3 text-center">Threshold Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {vendorFySummaryList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.vendorName}
                          {item.vendorPan && <span className="block font-mono text-[10px] text-slate-500">PAN: {item.vendorPan}</span>}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {item.financialYear}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold">
                          {item.invoicesCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹ {item.totalTaxable.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          ₹ {item.totalTds.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isThresholdExceeded ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Limit Exceeded</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Within Limit</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsFySummaryOpen(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
