import * as XLSX from 'xlsx';
import saveAs from 'file-saver';
import { CompleteAnalysisRecord } from '../types/tax';

/**
 * Local Deterministic Excel (.xlsx) Export Generator
 * Creates a 5-sheet workbook adhering strictly to CA Decision-Support requirements:
 * Sheet 1 - Client Profile
 * Sheet 2 - Invoice Details
 * Sheet 3 - TDS Analysis (1961 vs 2025 comparison)
 * Sheet 4 - GST ITC Analysis (Item-wise Section 16/17/17(5))
 * Sheet 5 - Statutory Tax Summary & CA Sign-off
 */
export function exportAnalysisToExcel(record: CompleteAnalysisRecord) {
  const { clientSnapshot, invoiceData, tdsResult, itcResult, caReview } = record;
  const wb = XLSX.utils.book_new();

  // SHEET 1: CLIENT PROFILE
  const clientData = [
    ['CA DECISION-SUPPORT SYSTEM - CLIENT PROFILE WORKPAPER'],
    ['Generated On', new Date().toLocaleString('en-IN')],
    [],
    ['Field', 'Value'],
    ['Client Name', clientSnapshot.clientName],
    ['Legal Name', clientSnapshot.legalName],
    ['Trade Name', clientSnapshot.tradeName || 'N/A'],
    ['PAN', clientSnapshot.pan],
    ['GSTIN', clientSnapshot.gstin],
    ['State Code & Name', `${clientSnapshot.stateCode} - ${clientSnapshot.stateName}`],
    ['Registration Status', clientSnapshot.registrationStatus],
    ['Mobile Number', clientSnapshot.mobile || 'N/A'],
    ['Email Address', clientSnapshot.email || 'N/A'],
    ['Registered Address', clientSnapshot.address || 'N/A'],
    ['Mandatory Nature of Business', clientSnapshot.natureOfBusiness.join(', ')],
    ['Custom Business Nature', clientSnapshot.customNatureOfBusiness || 'N/A'],
    ['Main Business Activity', clientSnapshot.mainBusinessActivity || 'N/A'],
    ['Other Business Activities', clientSnapshot.otherBusinessActivities?.join(', ') || 'None'],
    ['Taxable Supplies Profile', clientSnapshot.taxableSupplies ? 'Yes' : 'No'],
    ['Exempt Supplies Profile', clientSnapshot.exemptSupplies ? 'Yes' : 'No'],
    ['Export / Zero-Rated Supplies', clientSnapshot.exportSupplies ? 'Yes' : 'No'],
    ['Reverse Charge Mechanism (RCM)', clientSnapshot.rcmActivities ? 'Yes' : 'No'],
    ['Capital Goods Usage', clientSnapshot.capitalGoodsUsage ? 'Yes' : 'No'],
    ['Profile Snapshot Version', `v${clientSnapshot.version}`]
  ];
  const wsClient = XLSX.utils.aoa_to_sheet(clientData);
  wsClient['!cols'] = [{ wch: 32 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsClient, 'Client Profile');

  // SHEET 2: INVOICE DETAILS
  const invoiceHeaders = ['Item #', 'Description', 'HSN/SAC', 'Qty', 'Unit Price (₹)', 'Taxable Value (₹)', 'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Cess (₹)', 'Total GST (₹)', 'Line Total (₹)'];
  const invoiceRows = invoiceData.items.map((item, idx) => [
    idx + 1,
    item.description,
    item.hsnSac || 'N/A',
    item.quantity || 1,
    item.unitPrice || item.taxableValue,
    item.taxableValue,
    item.cgstAmount,
    item.sgstAmount,
    item.igstAmount,
    item.cessAmount,
    item.totalGst,
    item.totalValue
  ]);

  const invoiceSheetData = [
    ['INVOICE PARTICULARS & TAX BREAKUP'],
    ['Invoice Number', invoiceData.invoiceNumber, '', 'Invoice Date', invoiceData.invoiceDate],
    ['Credit / Payment Date', invoiceData.paymentOrCreditDate, '', 'Financial Year', invoiceData.financialYear],
    ['Supplier Name', invoiceData.supplierName, '', 'Supplier GSTIN', invoiceData.supplierGstin],
    ['Supplier PAN', invoiceData.supplierPan, '', 'Supplier State', `${invoiceData.supplierStateCode} - ${invoiceData.supplierStateName}`],
    ['Recipient Name', invoiceData.recipientName, '', 'Recipient GSTIN', invoiceData.recipientGstin],
    ['Place of Supply', `${invoiceData.placeOfSupplyStateCode} - ${invoiceData.placeOfSupplyStateName}`, '', 'Supply Type', invoiceData.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'],
    ['Nature of Payment / Supply', invoiceData.natureOfSupplySummary],
    [],
    invoiceHeaders,
    ...invoiceRows,
    [],
    ['TOTALS', '', '', '', '', invoiceData.subtotalTaxable, invoiceData.totalCgst, invoiceData.totalSgst, invoiceData.totalIgst, invoiceData.totalCess, invoiceData.totalGst, invoiceData.grandTotal]
  ];
  const wsInvoice = XLSX.utils.aoa_to_sheet(invoiceSheetData);
  wsInvoice['!cols'] = [{ wch: 8 }, { wch: 45 }, { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsInvoice, 'Invoice Details');

  // SHEET 3: TDS ANALYSIS (1961 vs 2025 COMPARISON)
  const tdsComparisonRows = tdsResult.comparison.map(c => [c.particular, c.act1961, c.act2025]);
  const tdsSheetData = [
    ['TDS APPLICABILITY & STATUTORY COMPARISON MEMORANDUM'],
    ['TDS Applicability Status', tdsResult.tdsApplicable],
    ['Operative Statutory Act', tdsResult.operativeAct],
    ['Operative Provision / Section', tdsResult.operativeSection],
    ['Operative Table / Item', tdsResult.operativeTableItem],
    ['Nature of Payment', tdsResult.natureOfPayment],
    ['Tax Deduction Base (₹)', tdsResult.tdsBase],
    ['Statutory TDS Rate (%)', `${tdsResult.tdsRate}%`],
    ['TDS Amount Deductible (₹)', tdsResult.tdsAmount],
    ['Statutory Threshold (₹)', tdsResult.thresholdAmount],
    ['Threshold Evaluation', tdsResult.thresholdStatus],
    ['Trigger Timing', tdsResult.triggerCondition],
    ['Deduction Date', tdsResult.deductionDate],
    ['Deposit Due Date', tdsResult.depositDueDate],
    ['Statutory Reason', tdsResult.reason],
    ['Primary Legal Citation', tdsResult.legalSource],
    ['Source Reference', tdsResult.sourceReference],
    [],
    ['INCOME-TAX ACT, 1961 VS INCOME-TAX ACT, 2025 STATUTORY MAPPING'],
    ['Particular', 'Income-tax Act, 1961', 'Income-tax Act, 2025'],
    ...tdsComparisonRows
  ];
  const wsTds = XLSX.utils.aoa_to_sheet(tdsSheetData);
  wsTds['!cols'] = [{ wch: 32 }, { wch: 45 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsTds, 'TDS Analysis');

  // SHEET 4: GST ITC ANALYSIS
  const itcHeaders = ['Item #', 'Description', 'HSN/SAC', 'GST Amount (₹)', 'ITC Status', 'Eligible ITC (₹)', 'Ineligible ITC (₹)', 'Under Review (₹)', 'Statutory Reason', 'Relevant Sections'];
  const itcRows = itcResult.lineItemResults.map((item, idx) => [
    idx + 1,
    item.description,
    item.hsnSac || 'N/A',
    item.totalGst,
    item.itcStatus,
    item.eligibleItc,
    item.ineligibleItc,
    item.reviewItc,
    item.itcReason,
    item.relevantSections.join(', ')
  ]);

  const itcSheetData = [
    ['GST INPUT TAX CREDIT (ITC) ELIGIBILITY EVALUATION (SECTIONS 16, 17, 17(5))'],
    ['Overall ITC Status', itcResult.overallStatus],
    ['Total GST Charged (₹)', itcResult.totalGst],
    ['Eligible ITC (₹)', itcResult.eligibleItc],
    ['Ineligible / Blocked ITC (₹)', itcResult.ineligibleItc],
    ['ITC Requiring Verification (₹)', itcResult.reviewItc],
    ['Summary Statutory Reason', itcResult.summaryReason],
    ['Relevant GST Provisions', itcResult.relevantProvisions.join(' | ')],
    ['Blocked Categories Detected', itcResult.blockedCreditsSummary.join('; ') || 'None'],
    [],
    itcHeaders,
    ...itcRows,
    [],
    ['TOTALS', '', '', itcResult.totalGst, '', itcResult.eligibleItc, itcResult.ineligibleItc, itcResult.reviewItc, '', '']
  ];
  const wsItc = XLSX.utils.aoa_to_sheet(itcSheetData);
  wsItc['!cols'] = [{ wch: 8 }, { wch: 40 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 55 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsItc, 'GST ITC Analysis');

  // SHEET 5: SUMMARY & CA SIGN-OFF
  const summarySheetData = [
    ['CHARTERED ACCOUNTANT STATUTORY DECISION-SUPPORT SUMMARY'],
    ['Client Name', clientSnapshot.clientName],
    ['Client GSTIN', clientSnapshot.gstin],
    ['Invoice Number', invoiceData.invoiceNumber],
    ['Invoice Date', invoiceData.invoiceDate],
    [],
    ['EXECUTIVE TAX POSITION SUMMARY'],
    ['Metric', 'Amount (₹) / Status'],
    ['Total Invoice Value (Gross)', invoiceData.grandTotal],
    ['Taxable Base Value', invoiceData.subtotalTaxable],
    ['Total GST Charged', invoiceData.totalGst],
    ['TDS Applicable?', tdsResult.tdsApplicable],
    ['Operative TDS Act & Section', `${tdsResult.operativeAct}: ${tdsResult.operativeSection} (${tdsResult.operativeTableItem})`],
    ['TDS Deductible Amount', tdsResult.tdsAmount],
    ['TDS Deposit Due Date', tdsResult.depositDueDate],
    ['Net Payable to Vendor (Invoice - TDS)', invoiceData.grandTotal - tdsResult.tdsAmount],
    ['GST ITC Overall Status', itcResult.overallStatus],
    ['Eligible Input Tax Credit', itcResult.eligibleItc],
    ['Ineligible / Blocked Input Tax Credit', itcResult.ineligibleItc],
    ['ITC Requiring CA Verification', itcResult.reviewItc],
    [],
    ['CHARTERED ACCOUNTANT AUDIT & REVIEW SIGN-OFF'],
    ['CA Review Status', caReview.status],
    ['Reviewed By (CA Name / Membership)', caReview.reviewedBy || 'CA Reviewer'],
    ['Review Date', caReview.reviewDate || new Date().toISOString().split('T')[0]],
    ['CA Workpaper Remarks', caReview.remarks || 'Analysis verified against statutory provisions of Income-tax Act and CGST Act.']
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
  wsSummary['!cols'] = [{ wch: 42 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Generate buffer and trigger browser download
  const wbOut = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbOut], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `CA_Analysis_${invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${clientSnapshot.clientName.substring(0, 15).replace(/\s+/g, '_')}.xlsx`;
  saveAs(blob, filename);
}
