import React, { useState } from 'react';
import { TDS_RULES_MASTER } from '../data/tdsRulesMaster';
import { SECTION_17_5_BLOCKED_RULES } from '../data/gstItcRulesMaster';
import { X, BookOpen, Scale, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const StatutoryReferenceModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState<'tds' | 'gst'>('tds');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl my-8 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Statutory Legal Master & Reference Concordance</h2>
              <p className="text-xs text-slate-300">
                Income-tax Act, 1961 vs 2025 (Section 393) & CGST Section 17(5) Directory
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-100 px-6">
          <button
            onClick={() => setTab('tds')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 cursor-pointer ${
              tab === 'tds'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-4 h-4 text-emerald-600" />
            <span>TDS Concordance (1961 vs 2025 Section 393)</span>
          </button>
          <button
            onClick={() => setTab('gst')}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center space-x-2 cursor-pointer ${
              tab === 'gst'
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>GST Section 17(5) Blocked Credits Directory</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {tab === 'tds' && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                <strong>Statutory Transition Principle:</strong> Payments or credits on or before 31 March 2026 are governed by the Income-tax Act, 1961. Transactions on or after 1 April 2026 are governed by Section 393 and Schedule XI Tables of the Income-tax Act, 2025.
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="py-2.5 px-3">Nature of Payment</th>
                      <th className="py-2.5 px-3">Act 1961 Section</th>
                      <th className="py-2.5 px-3">Act 2025 Provision</th>
                      <th className="py-2.5 px-3 text-right">Threshold</th>
                      <th className="py-2.5 px-3 text-center">Rate (Ind/Other)</th>
                      <th className="py-2.5 px-3">Key Provisos / Exceptions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {TDS_RULES_MASTER.map(rule => (
                      <tr key={rule.ruleId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {rule.natureOfPayment}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                          {rule.oldSection}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          {rule.newSection} ({rule.newTable} {rule.newTableItem})
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ₹ {rule.newSingleThreshold.toLocaleString('en-IN')}
                          {rule.newSingleThreshold !== rule.newAggregateThreshold && (
                            <span className="block text-[10px] text-slate-400">Agg: ₹{rule.newAggregateThreshold.toLocaleString('en-IN')}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-semibold">
                          {rule.newRateIndHuf}% / {rule.newRateOther}%
                          <span className="block text-[10px] text-rose-500 font-normal">No PAN: {rule.panConditionRate}%</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {rule.exceptions.slice(0, 2).join('; ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'gst' && (
            <div className="space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                <strong>Section 17(5) Blocked Credits:</strong> Inward supplies specifically blocked by statute notwithstanding Section 16(1), unless falling under strict statutory exceptions.
              </div>

              <div className="space-y-3">
                {SECTION_17_5_BLOCKED_RULES.map(rule => (
                  <div key={rule.clause} className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-slate-900 font-mono text-sm text-rose-700">
                        Clause {rule.clause} — {rule.category}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">{rule.legalProvision}</span>
                    </div>
                    <p className="text-slate-700 mb-2">{rule.description}</p>
                    <p className="text-slate-600 mb-2 italic bg-white p-2 rounded border border-slate-200">
                      <strong>Scope:</strong> {rule.blockedDetails}
                    </p>

                    {rule.statutoryExceptions.length > 0 && (
                      <div>
                        <span className="font-bold text-emerald-800 block mb-1">Statutory Exceptions (ITC Available):</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 pl-1">
                          {rule.statutoryExceptions.map((ex, i) => (
                            <li key={i}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
