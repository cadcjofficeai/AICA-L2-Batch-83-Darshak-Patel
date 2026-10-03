import React, { useState } from 'react';
import { CompleteAnalysisRecord } from '../types/tax';
import { FileSpreadsheet, FileText, CheckCircle2, Save, FileCheck, Building2 } from 'lucide-react';
import { exportAnalysisToExcel } from '../services/excelExportService';
import { exportAnalysisToWord } from '../services/wordExportService';

interface Props {
  currentRecord: CompleteAnalysisRecord;
  onSaveToHistory: (updatedRecord: CompleteAnalysisRecord) => void;
}

export const CaReviewAndExportBar: React.FC<Props> = ({
  currentRecord,
  onSaveToHistory,
}) => {
  const [internalNotes, setInternalNotes] = useState(
    currentRecord.caReview?.remarks || ''
  );
  const [isSaved, setIsSaved] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  const handleSave = () => {
    const updated: CompleteAnalysisRecord = {
      ...currentRecord,
      caReview: {
        status: 'Verified',
        reviewedBy: currentRecord.clientSnapshot.clientName,
        reviewDate: new Date().toISOString().split('T')[0],
        remarks: internalNotes.trim(),
      },
      updatedAt: new Date().toISOString(),
    };
    onSaveToHistory(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleExportExcel = () => {
    exportAnalysisToExcel(currentRecord);
  };

  const handleExportWord = async () => {
    try {
      setIsExportingWord(true);
      await exportAnalysisToWord(currentRecord);
    } catch (e) {
      console.error('Failed to export Word document:', e);
    } finally {
      setIsExportingWord(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-800 rounded-lg text-emerald-400">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">Tax Position & Export Deliverables</h3>
            <p className="text-xs text-slate-300">
              Download structured Excel & Word records or save to your company's analysis history
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORT TO EXCEL (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportWord}
            disabled={isExportingWord}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingWord ? 'Exporting...' : 'EXPORT TO WORD (.docx)'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`px-4 py-2 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer ${
              isSaved
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'SAVED TO HISTORY' : 'SAVE RECORD'}</span>
          </button>
        </div>
      </div>

      {/* Internal Accounting Remarks (Optional) */}
      <div className="p-5 bg-slate-50 border-t border-slate-200">
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Accounting / Voucher Remarks (Optional)
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={internalNotes}
            onChange={e => setInternalNotes(e.target.value)}
            placeholder="e.g., Payment voucher #PV-2026-441 | Approved for TDS deduction under 194J"
            className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
          />
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
          >
            Update Notes
          </button>
        </div>
      </div>
    </div>
  );
};
