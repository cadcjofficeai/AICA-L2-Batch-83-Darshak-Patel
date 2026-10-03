import React, { useState } from 'react';
import { ClientProfile } from '../types/tax';
import { Search, Plus, Building2, MapPin, CreditCard, ArrowRight, ShieldCheck } from 'lucide-react';

interface Props {
  clients: ClientProfile[];
  onSelectClient: (client: ClientProfile) => void;
  onAddNewClient: () => void;
}

export const ClientSelectionScreen: React.FC<Props> = ({
  clients,
  onSelectClient,
  onAddNewClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('');

  const filteredClients = clients.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.clientName.toLowerCase().includes(q) ||
      c.gstin.toLowerCase().includes(q) ||
      c.pan.toLowerCase().includes(q) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(q)) ||
      c.natureOfBusiness.some(n => n.toLowerCase().includes(q));

    const matchesState = !filterState || c.stateCode === filterState;

    return matchesQuery && matchesState;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-slate-900 text-white rounded-full text-xs font-semibold tracking-wide uppercase mb-3">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>CA Decision-Support System • Rule-First Architecture</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          TDS & GST ITC Applicability Analyzer
        </h1>
        <p className="mt-2 text-base text-slate-600 max-w-2xl mx-auto">
          Income-tax Act, 1961 vs 2025 (Section 393) comparative statutory analysis & CGST Sections 16, 17, 17(5) decision engine.
        </p>
      </div>

      {/* Main Selection Card */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden mb-8">
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Client Selection & Workspace</h2>
            <p className="text-xs text-slate-300">
              Select a saved client profile or add a new client to begin invoice analysis.
            </p>
          </div>
          <button
            onClick={onAddNewClient}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-lg shadow-sm transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Client</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Client Name, Trade Name, GSTIN (15 digits), or PAN (10 digits)..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
            <div>
              <select
                value={filterState}
                onChange={e => setFilterState(e.target.value)}
                className="w-full py-2 px-3 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="">All States / Jurisdictions</option>
                {Array.from(new Set(clients.map(c => `${c.stateCode}::${c.stateName}`))).map(str => {
                  const [code, name] = str.split('::');
                  return (
                    <option key={code} value={code}>
                      {code} - {name}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Client List */}
        <div className="p-6">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-700">No matching clients found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                No saved client matches your search filter. You can add a new client or clear the search criteria.
              </p>
              <button
                onClick={onAddNewClient}
                className="mt-4 inline-flex items-center space-x-1.5 text-xs font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-md transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Client</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => onSelectClient(client)}
                  className="group relative p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-900 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs group-hover:bg-slate-900 group-hover:text-white transition-colors">
                          {client.clientName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 group-hover:text-slate-900 transition-colors line-clamp-1">
                            {client.clientName}
                          </h4>
                          {client.tradeName && (
                            <p className="text-xs text-slate-500">Trade: {client.tradeName}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {client.registrationStatus}
                      </span>
                    </div>

                    {/* Tax Codes */}
                    <div className="grid grid-cols-2 gap-2 mt-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">GSTIN</span>
                        <span className="font-semibold text-slate-800">{client.gstin || 'Unregistered'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-sans">PAN</span>
                        <span className="font-semibold text-slate-800">{client.pan}</span>
                      </div>
                    </div>

                    {/* State & Nature */}
                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
                        <span>State: <strong className="text-slate-800">{client.stateCode} - {client.stateName}</strong></span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {client.natureOfBusiness.map(nature => (
                          <span
                            key={nature}
                            className="inline-block text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-medium"
                          >
                            {nature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="text-[11px] text-slate-400">Snapshot v{client.version}</span>
                    <span className="inline-flex items-center text-xs font-bold text-slate-900 group-hover:translate-x-0.5 transition-transform">
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
