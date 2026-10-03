import React, { useState } from 'react';
import { TdsAnalysisResult, ApplicableAct } from '../types/tax';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, FileCheck2, Scale, Calendar, Landmark, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  tdsResult: TdsAnalysisResult;
  priorPayments: number;
  onPriorPaymentsChange: (amount: number) => void;
  transporterDeclaration: boolean;
  onTransporterDeclarationChange: (val: boolean) => void;
  onCaOverride?: (newStatus: 'YES' | 'NO' | 'REVIEW REQUIRED', remarks: string) => void;
  applyTdsOnCumulative?: boolean;
  onApplyTdsOnCumulativeChange?: (val: boolean) => void;
  invoiceSubtotal?: number;
  savedFyInvoicesCount?: number;
  onSyncPriorFromSaved?: () => void;
}

export const TdsResultPanel: React.FC<Props> = ({
  tdsResult,
  priorPayments,
  onPriorPaymentsChange,
  transporterDeclaration,
  onTransporterDeclarationChange,
  onCaOverride,
  applyTdsOnCumulative,
  onApplyTdsOnCumulativeChange,
  invoiceSubtotal,
  savedFyInvoicesCount,
  onSyncPriorFromSaved,
}) => {
  const [showComparisonTable, setShowComparisonTable] = useState(true);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState(tdsResult.tdsApplicable);
  const [overrideRemarks, setOverrideRemarks] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'YES':
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
            <CheckCircle2 className="w-4 h-4 text-rose-600" />
            <span>TDS APPLICABLE: YES</span>
          </span>
        );
      case 'NO':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>TDS NOT APPLICABLE</span>
          </span>
        );
    }
  };

  const handleSaveOverride = () => {
    if (onCaOverride) {
      onCaOverride(overrideStatus as any, overrideRemarks);
    }
    setIsOverrideModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">TDS Applicability & Statutory Provision Analysis</h2>
            <p className="text-xs text-slate-300">
              Evaluated under {tdsResult.applicableAct} (Independent from GST)
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(tdsResult.tdsApplicable)}
          <button
            onClick={() => setIsOverrideModalOpen(true)}
            className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md border border-slate-700 transition-colors"
          >
            CA Override
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Operative Statutory Highlight Card */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl shadow-sm border border-slate-800">
          <div className="flex items-center justify-between mb-3 border-b border-slate-700/80 pb-2">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-emerald-400" />
              <span className="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
                Operative Statutory Provision Highlight
              </span>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {tdsResult.operativeAct}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <span className="text-xs text-slate-400 block mb-0.5">Operative Section / Provision</span>
              <p className="text-lg font-black text-white">
                {tdsResult.operativeSection}
                {tdsResult.operativeTableItem !== 'N/A' && (
                  <span className="text-sm font-semibold text-emerald-400 ml-2">
                    ({tdsResult.operativeTableItem})
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-300 mt-1 line-clamp-1">{tdsResult.natureOfPayment}</p>
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">Applicable TDS Rate</span>
              <p className="text-xl font-black text-emerald-400">
                {tdsResult.tdsRate}%
              </p>
              {tdsResult.higherRateApplied ? (
                <span className="text-[10px] text-amber-300">Higher Rate (Sec 206AA - No PAN)</span>
              ) : (
                <span className="text-[10px] text-slate-400">Standard Statutory Rate</span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 block mb-0.5">TDS Deductible Amount</span>
              <p className="text-2xl font-black text-white font-mono">
                ₹ {tdsResult.tdsAmount.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">
                Base: ₹ {tdsResult.tdsBase.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Timing & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-700/80 text-xs">
            <div>
              <span className="text-slate-400 block">Deduction Trigger Date:</span>
              <span className="font-semibold text-slate-200">{tdsResult.deductionDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Statutory Deposit Due Date:</span>
              <span className="font-semibold text-amber-400">{tdsResult.depositDueDate}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Threshold Evaluation:</span>
              <span className="font-semibold text-slate-200">
                ₹ {tdsResult.thresholdAmount.toLocaleString('en-IN')} ({tdsResult.thresholdStatus})
              </span>
            </div>
          </div>
        </div>

        {/* Reason & Citations Banner */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-start space-x-3">
          <Info className="w-5 h-5 text-slate-700 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-700 space-y-1">
            <p>
              <strong className="text-slate-900">Statutory Reason:</strong> {tdsResult.reason}
            </p>
            <p className="text-slate-500 font-mono">
              <strong>Legal Authority:</strong> {tdsResult.legalSource} | <strong>Ref:</strong> {tdsResult.sourceReference}
            </p>
            <p className="text-slate-500 italic">
              <strong>Act Determination:</strong> {tdsResult.actDeterminationReason}
            </p>
          </div>
        </div>

        {/* FINANCIAL YEAR AGGREGATE THRESHOLD BREACH ALERT & CA DEDUCTION OPTIONS */}
        {tdsResult.thresholdExceededDueToAggregate && (
          <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl space-y-3 text-xs text-amber-950 shadow-xs">
            <div className="flex items-center space-x-2 font-bold text-amber-900 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>FINANCIAL YEAR ({tdsResult.financialYear || 'FY'}) AGGREGATE THRESHOLD EXCEEDED • TDS IS APPLICABLE</span>
            </div>
            <p className="text-amber-900 font-medium">
              Although this individual invoice requirement (₹{(invoiceSubtotal || tdsResult.tdsBase).toLocaleString('en-IN')}) is below the single transaction threshold, multiple invoices issued in {tdsResult.financialYear || 'the Financial Year'} have crossed the statutory annual aggregate limit of <strong>₹{(tdsResult.aggregateThresholdAmount || 100000).toLocaleString('en-IN')}</strong>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white/80 p-3 rounded-lg border border-amber-200 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block font-sans">Prior FY Invoices:</span>
                <span className="font-bold text-slate-800">₹{(tdsResult.priorCumulativeInFy || priorPayments).toLocaleString('en-IN')}</span>
                {Boolean(savedFyInvoicesCount) && (
                  <span className="text-[10px] text-slate-400 block font-sans">({savedFyInvoicesCount} saved records)</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block font-sans">Current Invoice:</span>
                <span className="font-bold text-slate-800">₹{(invoiceSubtotal || tdsResult.tdsBase).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-sans">Total FY Aggregate:</span>
                <span className="font-bold text-rose-700">₹{(tdsResult.totalCumulativeInFy || (priorPayments + (invoiceSubtotal || 0))).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-sans">Statutory FY Limit:</span>
                <span className="font-bold text-slate-900">₹{(tdsResult.aggregateThresholdAmount || 100000).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* CA Options for TDS Calculation Base on Aggregate Breach */}
            <div className="pt-2 border-t border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="font-bold text-amber-950 block">Statutory Option for Deduction Base:</span>
                <span className="text-[11px] text-amber-800 block">
                  Select whether to deduct tax on current invoice value or cumulative un-deducted FY amount
                </span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onApplyTdsOnCumulativeChange?.(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    !applyTdsOnCumulative
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                  }`}
                >
                  Current Invoice (₹{Math.round((invoiceSubtotal || tdsResult.tdsBase) * (tdsResult.tdsRate / 100)).toLocaleString('en-IN')})
                </button>
                <button
                  type="button"
                  onClick={() => onApplyTdsOnCumulativeChange?.(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    applyTdsOnCumulative
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-amber-50'
                  }`}
                >
                  Cumulative FY (₹{(tdsResult.cumulativeTdsAmount || Math.round((tdsResult.totalCumulativeInFy || 0) * (tdsResult.tdsRate / 100))).toLocaleString('en-IN')})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIAL YEAR WITHIN LIMITS & HEADROOM TRACKING */}
        {!tdsResult.thresholdExceededDueToAggregate && tdsResult.tdsApplicable === 'NO' && (
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-start space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-emerald-900">
                  Financial Year ({tdsResult.financialYear || 'FY'}) Aggregate Limit Tracking: Within Statutory Limits
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded font-bold">
                  TDS NOT APPLICABLE
                </span>
              </div>
              <p className="text-emerald-800 text-[11px]">
                This invoice requirement is below single threshold, and total cumulative amount in {tdsResult.financialYear || 'this FY'} is{' '}
                <strong>₹{(tdsResult.totalCumulativeInFy || (priorPayments + (invoiceSubtotal || 0))).toLocaleString('en-IN')}</strong> against the statutory aggregate limit of{' '}
                <strong>₹{(tdsResult.aggregateThresholdAmount || 100000).toLocaleString('en-IN')}</strong>.
                {tdsResult.headroomRemainingInFy !== undefined && (
                  <span className="ml-1 font-semibold text-emerald-900">
                    (₹{tdsResult.headroomRemainingInFy.toLocaleString('en-IN')} headroom remaining before TDS triggers).
                  </span>
                )}
              </p>
              <p className="text-emerald-700 text-[10px] italic">
                Note: When future multiple invoices are issued to this vendor and the cumulative amount exceeds the ₹{(tdsResult.aggregateThresholdAmount || 100000).toLocaleString('en-IN')} threshold, the system will automatically indicate that the threshold is exceeded and TDS is applicable.
              </p>
            </div>
          </div>
        )}

        {/* Statutory Conditions & Threshold Adjustments */}
        <div className="p-4 bg-amber-50/40 rounded-lg border border-amber-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
              Financial Year Aggregate Threshold & Provisos
            </h4>
            {onSyncPriorFromSaved && (
              <button
                type="button"
                onClick={onSyncPriorFromSaved}
                className="text-[11px] text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer"
              >
                Auto-Calculate from Saved Records ({savedFyInvoicesCount || 0} invoices)
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Prior Cumulative Amount Paid/Credited to this Vendor in FY (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={priorPayments || ''}
                onChange={e => onPriorPaymentsChange(Number(e.target.value) || 0)}
                placeholder="0 (Auto-calculated from saved FY records or enter manually)"
                className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Automatically calculated from saved historical invoices in this Financial Year. You can also adjust manually.
              </p>
            </div>

            <div className="flex flex-col justify-center">
              <label className="flex items-center space-x-2 text-slate-700 cursor-pointer p-2 bg-white rounded-md border border-slate-200">
                <input
                  type="checkbox"
                  checked={transporterDeclaration}
                  onChange={e => onTransporterDeclarationChange(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span className="font-semibold text-xs">
                  Transporter owns ≤ 10 goods carriages with PAN declaration (Sec 194C(6) / Sec 393 Table 1 Item 3 proviso)
                </span>
              </label>
              <p className="text-[11px] text-slate-500 mt-1 pl-1">
                If checked and valid PAN is furnished, TDS rate is reduced to NIL (0%).
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Income-tax Act, 1961 vs Income-tax Act, 2025 Comparison Table (Prompt Section 17) */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowComparisonTable(!showComparisonTable)}
            className="w-full px-4 py-3 bg-slate-100 hover:bg-slate-200/70 text-slate-800 text-xs font-bold flex items-center justify-between transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-slate-700" />
              <span>MANDATORY STATUTORY COMPARISON: Income-tax Act, 1961 vs Income-tax Act, 2025</span>
            </div>
            {showComparisonTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showComparisonTable && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="py-2.5 px-4 w-1/4 border-r border-slate-700">Particular</th>
                    <th className="py-2.5 px-4 w-3/8 border-r border-slate-700">
                      Income-tax Act, 1961
                      {tdsResult.operativeAct === 'Income-tax Act, 1961' && (
                        <span className="ml-2 text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-bold">
                          OPERATIVE
                        </span>
                      )}
                    </th>
                    <th className="py-2.5 px-4 w-3/8">
                      Income-tax Act, 2025
                      {tdsResult.operativeAct === 'Income-tax Act, 2025' && (
                        <span className="ml-2 text-[10px] bg-emerald-400 text-slate-950 px-1.5 py-0.5 rounded font-bold">
                          OPERATIVE
                        </span>
                      )}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {tdsResult.comparison.map((row, idx) => (
                    <tr
                      key={row.particular}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}
                    >
                      <td className="py-2 px-4 font-semibold text-slate-900 border-r border-slate-200">
                        {row.particular}
                      </td>
                      <td className={`py-2 px-4 text-slate-700 border-r border-slate-200 ${tdsResult.operativeAct === 'Income-tax Act, 1961' ? 'bg-amber-50/40 font-medium' : ''}`}>
                        {row.act1961}
                      </td>
                      <td className={`py-2 px-4 text-slate-700 ${tdsResult.operativeAct === 'Income-tax Act, 2025' ? 'bg-emerald-50/50 font-medium' : ''}`}>
                        {row.act2025}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CA Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Chartered Accountant TDS Override</h3>
            <p className="text-xs text-slate-600 mb-4">
              Override the statutory TDS decision with formal CA audit workpaper remarks.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Applicability Status</label>
                <select
                  value={overrideStatus}
                  onChange={e => setOverrideStatus(e.target.value as any)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                >
                  <option value="YES">YES (Deductible)</option>
                  <option value="NO">NO (Not Applicable / Exempt)</option>
                  <option value="REVIEW REQUIRED">REVIEW REQUIRED</option>
                  <option value="INSUFFICIENT INFORMATION">INSUFFICIENT INFORMATION</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">CA Technical Remarks / Justification</label>
                <textarea
                  rows={3}
                  value={overrideRemarks}
                  onChange={e => setOverrideRemarks(e.target.value)}
                  placeholder="Enter legal rationale (e.g. Valid Lower Deduction Certificate under Sec 197 / Sec 395 verified)..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setIsOverrideModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveOverride}
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                >
                  Apply Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
