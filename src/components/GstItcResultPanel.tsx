import React, { useState } from 'react';
import { GstItcAnalysisResult, InvoiceLineItem } from '../types/tax';
import { CheckCircle2, XCircle, ShieldCheck, Edit3 } from 'lucide-react';

interface Props {
  itcResult: GstItcAnalysisResult;
  onAnswerQuestion?: (itemId: string, questionKey: string, answer: boolean) => void;
  onItemOverride?: (itemId: string, newStatus: string, remarks: string) => void;
}

export const GstItcResultPanel: React.FC<Props> = ({
  itcResult,
  onItemOverride,
}) => {
  const [editingItem, setEditingItem] = useState<InvoiceLineItem | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<string>('Eligible');
  const [overrideRemarks, setOverrideRemarks] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Eligible':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>100% ELIGIBLE ITC</span>
          </span>
        );
      case 'Partially Eligible':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>PARTIALLY ELIGIBLE ITC</span>
          </span>
        );
      case 'Not Eligible':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>NOT ELIGIBLE (BLOCKED CREDIT)</span>
          </span>
        );
    }
  };

  const handleOpenOverride = (item: InvoiceLineItem) => {
    setEditingItem(item);
    setOverrideStatus(item.itcStatus);
    setOverrideRemarks(item.caOverride?.remarks || '');
  };

  const handleSaveItemOverride = () => {
    if (editingItem && onItemOverride) {
      onItemOverride(editingItem.id, overrideStatus, overrideRemarks);
    }
    setEditingItem(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">GST Input Tax Credit (ITC) Statutory Determination</h2>
            <p className="text-xs text-slate-300">
              Deterministic Statutory Evaluation under CGST Sections 16, 17(1)/(2) & 17(5)
            </p>
          </div>
        </div>
        <div>{getStatusBadge(itcResult.overallStatus)}</div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metric Cards Banner: Definitive Tax Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Inward GST
            </span>
            <p className="text-2xl font-black text-slate-900 font-mono">
              ₹ {itcResult.totalGst.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-slate-500">Gross GST charged on invoice</span>
          </div>

          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block mb-1">
              Eligible Input Tax Credit (ITC)
            </span>
            <p className="text-2xl font-black text-emerald-700 font-mono">
              ₹ {itcResult.eligibleItc.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-emerald-700 font-medium">Claim in Form GSTR-3B (Table 4A)</span>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block mb-1">
              Ineligible / Blocked Credit
            </span>
            <p className="text-2xl font-black text-rose-700 font-mono">
              ₹ {itcResult.ineligibleItc.toLocaleString('en-IN')}
            </p>
            <span className="text-[11px] text-rose-700 font-medium">Report in Form GSTR-3B (Table 4B)</span>
          </div>
        </div>

        {/* Statutory Summary Reason */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
          <div className="flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-900 font-medium leading-relaxed">
                <strong>Statutory Position:</strong> {itcResult.summaryReason}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600">Governing Provisions:</span>
            {itcResult.relevantProvisions.map(prov => (
              <span
                key={prov}
                className="px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-300 font-mono text-[10px] font-semibold"
              >
                {prov}
              </span>
            ))}
          </div>
        </div>

        {/* Item-Wise Breakdown Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Line-Item Statutory ITC Breakdown ({itcResult.lineItemResults.length} Items)
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Zero manual verification required • Evaluated deterministically
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold">
                  <th className="py-3 px-3 w-1/3">Description & HSN/SAC</th>
                  <th className="py-3 px-3 text-right">Taxable Value</th>
                  <th className="py-3 px-3 text-right">GST Amount</th>
                  <th className="py-3 px-3 text-center">ITC Status</th>
                  <th className="py-3 px-3 text-right">Eligible ITC</th>
                  <th className="py-3 px-3 text-right">Ineligible ITC</th>
                  <th className="py-3 px-3">Statutory Basis & Legal Section</th>
                  <th className="py-3 px-2 text-center">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {itcResult.lineItemResults.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className="py-3 px-3">
                      <p className="font-bold text-slate-900 leading-tight">{item.description}</p>
                      <span className="font-mono text-[10px] text-slate-500 font-medium">
                        HSN/SAC: {item.hsnSac || 'Not Specified'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-800 font-medium">
                      ₹ {item.taxableValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      ₹ {item.totalGst.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                          item.itcStatus === 'Eligible'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.itcStatus === 'Not Eligible'
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {item.itcStatus === 'Eligible' ? 'ELIGIBLE' : item.itcStatus === 'Not Eligible' ? 'BLOCKED' : 'PARTIAL'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-700 font-black text-sm">
                      ₹ {item.eligibleItc.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-rose-700 font-bold">
                      ₹ {item.ineligibleItc.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      <p className="leading-snug text-[11px] font-medium">{item.itcReason}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.relevantSections.map(sec => (
                          <span key={sec} className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-slate-700 font-mono font-semibold">
                            {sec}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <button
                        onClick={() => handleOpenOverride(item)}
                        title="Manually adjust line-item classification"
                        className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 cursor-pointer inline-flex items-center"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Item Override Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-200">
              Adjust Line-Item ITC Classification
            </h3>
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-slate-800">{editingItem.description}</p>
              <p className="text-slate-500 font-mono">GST Amount: ₹ {editingItem.totalGst.toLocaleString('en-IN')}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Override Status</label>
              <select
                value={overrideStatus}
                onChange={e => setOverrideStatus(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="Eligible">Eligible (Full ITC Claim)</option>
                <option value="Not Eligible">Not Eligible (Blocked under Sec 17(5))</option>
                <option value="Partially Eligible">Partially Eligible (Rule 42)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Statutory Justification</label>
              <textarea
                rows={2}
                value={overrideRemarks}
                onChange={e => setOverrideRemarks(e.target.value)}
                placeholder="Enter justification for overriding default statutory classification..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItemOverride}
                className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                Apply Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
