import React from 'react';
import { ClientProfile } from '../types/tax';
import { Building2, Edit3, FileText, History, Download } from 'lucide-react';

interface Props {
  client: ClientProfile;
  currentView: 'new-analysis' | 'previous-analyses' | 'summary';
  onViewChange: (view: 'new-analysis' | 'previous-analyses' | 'summary') => void;
  onEditClient: () => void;
  onExportClientSummary: () => void;
}

export const ClientDashboardBar: React.FC<Props> = ({
  client,
  currentView,
  onViewChange,
  onEditClient,
  onExportClientSummary,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
        {/* Top bar: Company Identity & Views */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">
                  {client.clientName}
                </h1>
                {client.tradeName && client.tradeName !== client.clientName && (
                  <span className="text-xs text-slate-500 font-medium">
                    ({client.tradeName})
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 tracking-wider uppercase">
                  {client.registrationStatus}
                </span>
              </div>

              {/* Sub-identity metadata: PAN, GSTIN, State */}
              <div className="flex items-center space-x-3 text-xs text-slate-600 mt-1 flex-wrap font-mono">
                <span>
                  <strong className="font-sans text-slate-400">PAN:</strong> {client.pan || 'N/A'}
                </span>
                <span>•</span>
                <span>
                  <strong className="font-sans text-slate-400">GSTIN:</strong> {client.gstin || 'Unregistered'}
                </span>
                <span>•</span>
                <span>
                  <strong className="font-sans text-slate-400">State:</strong> {client.stateCode ? `${client.stateCode} - ${client.stateName}` : 'N/A'}
                </span>
              </div>

              {/* Nature of Business */}
              <div className="flex items-center space-x-2 mt-2 flex-wrap text-xs">
                <span className="font-semibold text-slate-700">Nature of Business:</span>
                <div className="flex flex-wrap gap-1">
                  {client.natureOfBusiness.length > 0 ? (
                    client.natureOfBusiness.map(nature => (
                      <span
                        key={nature}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium"
                      >
                        {nature}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-[11px]">Not specified</span>
                  )}
                  {client.customNatureOfBusiness && (
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-medium">
                      {client.customNatureOfBusiness}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => onViewChange('new-analysis')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'new-analysis'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Analyze Invoice</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('previous-analyses')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all flex items-center space-x-1.5 cursor-pointer ${
                currentView === 'previous-analyses'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-500" />
              <span>Saved Analyses</span>
            </button>

            <button
              type="button"
              onClick={onEditClient}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit Profile</span>
            </button>

            <button
              type="button"
              onClick={onExportClientSummary}
              title="Export Profile JSON"
              className="p-1.5 text-slate-500 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
