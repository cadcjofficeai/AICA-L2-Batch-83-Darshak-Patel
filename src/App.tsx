/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ClientProfile, CompleteAnalysisRecord } from './types/tax';
import { storageService } from './services/storageService';
import { CompanyProfileSetup } from './components/CompanyProfileSetup';
import { ClientDashboardBar } from './components/ClientDashboardBar';
import { InvoiceAnalysisView } from './components/InvoiceAnalysisView';
import { PreviousAnalysesList } from './components/PreviousAnalysesList';
import { StatutoryReferenceModal } from './components/StatutoryReferenceModal';
import { BookOpen, Scale, Building2 } from 'lucide-react';

export default function App() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [currentView, setCurrentView] = useState<'new-analysis' | 'previous-analyses' | 'summary'>('new-analysis');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isStatutoryRefOpen, setIsStatutoryRefOpen] = useState(false);
  const [analyses, setAnalyses] = useState<CompleteAnalysisRecord[]>([]);

  // Selected Analysis Record (for viewing a saved historical record)
  const [activeAnalysisRecord, setActiveAnalysisRecord] = useState<CompleteAnalysisRecord | null>(null);

  // Load profile on startup (Zero prefilled data)
  useEffect(() => {
    const loadedProfile = storageService.getProfile();
    setProfile(loadedProfile);
    const loadedAnalyses = storageService.getAnalyses();
    setAnalyses(loadedAnalyses);
  }, []);

  // Save or update profile
  const handleSaveProfile = (profileData: any) => {
    const res = storageService.saveProfile(profileData);
    if (res.success && res.client) {
      setProfile(res.client);
      setIsEditingProfile(false);
    }
  };

  // Save invoice analysis record to history
  const handleSaveAnalysisRecord = (record: CompleteAnalysisRecord) => {
    storageService.saveAnalysis(record);
    setActiveAnalysisRecord(record);
    setAnalyses(storageService.getAnalyses());
  };

  // Delete an analysis record
  const handleDeleteAnalysis = (id: string) => {
    storageService.deleteAnalysis(id);
    setAnalyses(storageService.getAnalyses());
    if (activeAnalysisRecord?.id === id) {
      setActiveAnalysisRecord(null);
    }
  };

  // Delete batch of analysis records
  const handleDeleteBatchAnalyses = (ids: string[]) => {
    storageService.deleteBatchAnalyses(ids);
    setAnalyses(storageService.getAnalyses());
    if (activeAnalysisRecord && ids.includes(activeAnalysisRecord.id)) {
      setActiveAnalysisRecord(null);
    }
  };

  // Open an existing saved analysis
  const handleOpenExistingAnalysis = (record: CompleteAnalysisRecord) => {
    setActiveAnalysisRecord(record);
    setCurrentView('new-analysis');
  };

  // Export company profile JSON
  const handleExportSummary = () => {
    if (!profile) return;
    const clientBlob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(clientBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CompanyProfile_${profile.clientName.replace(/\s+/g, '_')}_v${profile.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-slate-900 selection:text-white">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-sm">
              CA
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                TDS Applicability & GST ITC Decision System
              </span>
              <span className="text-[10px] text-slate-400 block -mt-0.5 font-mono">
                Income-tax Act, 1961 vs 2025 (Sec 393) • CGST Sections 16, 17, 17(5)
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            {profile && (
              <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700">
                <span className="text-slate-400">Company:</span>
                <span className="font-semibold text-emerald-400 max-w-[200px] truncate">
                  {profile.clientName}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsStatutoryRefOpen(true)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Statutory Concordance</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {!profile ? (
          // Initial Screen when no profile exists: Clean Profile Setup with ZERO prefilled data
          <CompanyProfileSetup onSaveProfile={handleSaveProfile} />
        ) : (
          // Once Profile exists: Company Dashboard Bar & Invoice Workspace
          <>
            <ClientDashboardBar
              client={profile}
              currentView={currentView}
              onViewChange={view => {
                if (view === 'new-analysis') setActiveAnalysisRecord(null);
                setCurrentView(view);
              }}
              onEditClient={() => setIsEditingProfile(true)}
              onExportClientSummary={handleExportSummary}
            />

            <div className="mt-4">
              {currentView === 'new-analysis' && (
                <InvoiceAnalysisView
                  key={activeAnalysisRecord?.id || 'new-invoice-view'}
                  client={profile}
                  onSaveAnalysis={handleSaveAnalysisRecord}
                  initialRecord={activeAnalysisRecord}
                />
              )}

              {currentView === 'previous-analyses' && (
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
                  <PreviousAnalysesList
                    client={profile}
                    analyses={analyses}
                    onOpenAnalysis={handleOpenExistingAnalysis}
                    onDeleteAnalysis={handleDeleteAnalysis}
                    onDeleteBatchAnalyses={handleDeleteBatchAnalyses}
                    onBackToNewAnalysis={() => {
                      setActiveAnalysisRecord(null);
                      setCurrentView('new-analysis');
                    }}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Edit Profile Modal */}
      {isEditingProfile && profile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 p-4 overflow-y-auto flex items-center justify-center">
          <div className="w-full max-w-4xl my-8">
            <CompanyProfileSetup
              initialProfile={profile}
              onSaveProfile={handleSaveProfile}
              onCancel={() => setIsEditingProfile(false)}
            />
          </div>
        </div>
      )}

      {/* Statutory Reference Concordance Modal */}
      <StatutoryReferenceModal
        isOpen={isStatutoryRefOpen}
        onClose={() => setIsStatutoryRefOpen(false)}
      />
    </div>
  );
}
