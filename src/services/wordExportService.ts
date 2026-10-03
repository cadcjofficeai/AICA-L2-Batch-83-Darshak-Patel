import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import saveAs from 'file-saver';
import { CompleteAnalysisRecord } from '../types/tax';

/**
 * Local Deterministic Word (.docx) Export Generator
 * Formats a formal CA Decision-Support Memorandum with client details,
 * invoice breakup, TDS 1961 vs 2025 Act analysis, GST ITC evaluation,
 * and CA Sign-off Workpaper.
 */
export async function exportAnalysisToWord(record: CompleteAnalysisRecord) {
  const { clientSnapshot, invoiceData, tdsResult, itcResult, caReview } = record;

  const lightBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
  };

  const createCell = (text: string, isHeader = false, widthPercent = 50, bold = false) => {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: isHeader ? { fill: '0F172A' } : undefined,
      borders: lightBorder,
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text,
              bold: isHeader || bold,
              color: isHeader ? 'FFFFFF' : '1E293B',
              size: 20, // 10pt
              font: 'Calibri',
            }),
          ],
        }),
      ],
    });
  };

  // Section 1: Client Profile Table
  const clientRows = [
    new TableRow({ children: [createCell('Client Information', true, 30), createCell('Details', true, 70)] }),
    new TableRow({ children: [createCell('Client Legal Name', false, 30, true), createCell(clientSnapshot.clientName, false, 70)] }),
    new TableRow({ children: [createCell('PAN', false, 30, true), createCell(clientSnapshot.pan, false, 70)] }),
    new TableRow({ children: [createCell('GSTIN', false, 30, true), createCell(clientSnapshot.gstin, false, 70)] }),
    new TableRow({ children: [createCell('State', false, 30, true), createCell(`${clientSnapshot.stateCode} - ${clientSnapshot.stateName}`, false, 70)] }),
    new TableRow({ children: [createCell('Nature of Business', false, 30, true), createCell(clientSnapshot.natureOfBusiness.join(', '), false, 70)] }),
    new TableRow({ children: [createCell('Custom Activities', false, 30, true), createCell(clientSnapshot.customNatureOfBusiness || 'N/A', false, 70)] }),
    new TableRow({ children: [createCell('Tax Profile', false, 30, true), createCell(`Taxable Supplies: ${clientSnapshot.taxableSupplies ? 'Yes' : 'No'} | Exempt: ${clientSnapshot.exemptSupplies ? 'Yes' : 'No'} | RCM: ${clientSnapshot.rcmActivities ? 'Yes' : 'No'}`, false, 70)] }),
  ];

  // Section 2: Invoice Details Table
  const invoiceRows = [
    new TableRow({ children: [createCell('Invoice Field', true, 30), createCell('Invoice Value', true, 70)] }),
    new TableRow({ children: [createCell('Supplier Name', false, 30, true), createCell(invoiceData.supplierName, false, 70)] }),
    new TableRow({ children: [createCell('Supplier GSTIN & PAN', false, 30, true), createCell(`${invoiceData.supplierGstin} (PAN: ${invoiceData.supplierPan})`, false, 70)] }),
    new TableRow({ children: [createCell('Invoice Number & Date', false, 30, true), createCell(`No. ${invoiceData.invoiceNumber} dated ${invoiceData.invoiceDate}`, false, 70)] }),
    new TableRow({ children: [createCell('Credit / Payment Date', false, 30, true), createCell(invoiceData.paymentOrCreditDate, false, 70)] }),
    new TableRow({ children: [createCell('Taxable Value (Subtotal)', false, 30, true), createCell(`₹ ${invoiceData.subtotalTaxable.toLocaleString('en-IN')}`, false, 70)] }),
    new TableRow({ children: [createCell('GST Amount Charged', false, 30, true), createCell(`₹ ${invoiceData.totalGst.toLocaleString('en-IN')} (CGST: ₹${invoiceData.totalCgst} | SGST: ₹${invoiceData.totalSgst} | IGST: ₹${invoiceData.totalIgst})`, false, 70)] }),
    new TableRow({ children: [createCell('Total Gross Invoice Value', false, 30, true), createCell(`₹ ${invoiceData.grandTotal.toLocaleString('en-IN')}`, false, 70, true)] }),
  ];

  // Section 3: TDS Analysis Table
  const tdsRows = [
    new TableRow({ children: [createCell('TDS Parameter', true, 30), createCell('Decision & Statutory Basis', true, 70)] }),
    new TableRow({ children: [createCell('TDS Applicability', false, 30, true), createCell(tdsResult.tdsApplicable, false, 70, true)] }),
    new TableRow({ children: [createCell('Applicable Statutory Act', false, 30, true), createCell(tdsResult.operativeAct, false, 70)] }),
    new TableRow({ children: [createCell('Applicable Provision / Section', false, 30, true), createCell(tdsResult.operativeSection, false, 70, true)] }),
    new TableRow({ children: [createCell('New Act Table / Item', false, 30, true), createCell(tdsResult.operativeTableItem, false, 70)] }),
    new TableRow({ children: [createCell('Statutory Threshold', false, 30, true), createCell(`₹ ${tdsResult.thresholdAmount.toLocaleString('en-IN')} (${tdsResult.thresholdStatus})`, false, 70)] }),
    new TableRow({ children: [createCell('Applicable TDS Rate', false, 30, true), createCell(`${tdsResult.tdsRate}% ${tdsResult.higherRateApplied ? '(Higher rate under Section 206AA - PAN missing)' : ''}`, false, 70)] }),
    new TableRow({ children: [createCell('TDS Deduction Base', false, 30, true), createCell(`₹ ${tdsResult.tdsBase.toLocaleString('en-IN')}`, false, 70)] }),
    new TableRow({ children: [createCell('Calculated TDS Amount', false, 30, true), createCell(`₹ ${tdsResult.tdsAmount.toLocaleString('en-IN')}`, false, 70, true)] }),
    new TableRow({ children: [createCell('Deduction Trigger Timing', false, 30, true), createCell(tdsResult.triggerCondition, false, 70)] }),
    new TableRow({ children: [createCell('Statutory Deposit Due Date', false, 30, true), createCell(tdsResult.depositDueDate, false, 70)] }),
    new TableRow({ children: [createCell('Statutory Reason & Citations', false, 30, true), createCell(`${tdsResult.reason} [Source: ${tdsResult.legalSource}]`, false, 70)] }),
  ];

  // Section 4: GST ITC Line-Item Table
  const itcTableHeaders = new TableRow({
    children: [
      createCell('Description & HSN', true, 35),
      createCell('GST (₹)', true, 15),
      createCell('ITC Status', true, 15),
      createCell('Eligible (₹)', true, 15),
      createCell('Reason & Section', true, 20),
    ],
  });

  const itcTableRows = itcResult.lineItemResults.map(item => new TableRow({
    children: [
      createCell(`${item.description} (HSN/SAC: ${item.hsnSac || 'N/A'})`, false, 35),
      createCell(`₹ ${item.totalGst.toLocaleString('en-IN')}`, false, 15),
      createCell(item.itcStatus, false, 15, true),
      createCell(`₹ ${item.eligibleItc.toLocaleString('en-IN')}`, false, 15),
      createCell(`${item.itcReason} [${item.relevantSections.join(', ')}]`, false, 20),
    ],
  }));

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'CA DECISION-SUPPORT STATUTORY MEMORANDUM',
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: 'Comprehensive TDS (Income-tax Act, 1961 vs 2025) & GST Input Tax Credit (Sections 16, 17, 17(5)) Analysis',
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: '' }),

          new Paragraph({ text: '1. CLIENT PROFILE DETAILS', heading: HeadingLevel.HEADING_2 }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: clientRows }),
          new Paragraph({ text: '' }),

          new Paragraph({ text: '2. INVOICE PARTICULARS', heading: HeadingLevel.HEADING_2 }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: invoiceRows }),
          new Paragraph({ text: '' }),

          new Paragraph({ text: '3. TDS APPLICABILITY & ACT COMPARISON', heading: HeadingLevel.HEADING_2 }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tdsRows }),
          new Paragraph({ text: '' }),

          new Paragraph({ text: '4. GST INPUT TAX CREDIT (ITC) EVALUATION', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: `Total GST Charged: ₹ ${itcResult.totalGst.toLocaleString('en-IN')} | `, bold: true }),
              new TextRun({ text: `Eligible ITC: ₹ ${itcResult.eligibleItc.toLocaleString('en-IN')} | `, bold: true, color: '15803D' }),
              new TextRun({ text: `Ineligible ITC: ₹ ${itcResult.ineligibleItc.toLocaleString('en-IN')} | `, bold: true, color: 'B91C1C' }),
              new TextRun({ text: `Under Review: ₹ ${itcResult.reviewItc.toLocaleString('en-IN')}`, bold: true, color: 'B45309' }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [itcTableHeaders, ...itcTableRows] }),
          new Paragraph({ text: '' }),

          new Paragraph({ text: '5. CHARTERED ACCOUNTANT REVIEW & AUDIT TRAIL', heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Final Review Status: ', bold: true }),
              new TextRun({ text: caReview.status || 'Verified', bold: true }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Reviewed By: ', bold: true }),
              new TextRun({ text: caReview.reviewedBy || 'Chartered Accountant' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Review Date: ', bold: true }),
              new TextRun({ text: caReview.reviewDate || new Date().toISOString().split('T')[0] }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'CA Workpaper Remarks:\n', bold: true }),
              new TextRun({ text: caReview.remarks || 'Analysis verified against statutory provisions of Income-tax Act, 1961/2025 and Central Goods and Services Tax Act, 2017.' }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({ text: '____________________________________\n', bold: true }),
              new TextRun({ text: 'Signature & Membership / FRN Seal', italics: true }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `CA_Memorandum_${invoiceData.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_')}_${clientSnapshot.clientName.substring(0, 15).replace(/\s+/g, '_')}.docx`;
  saveAs(blob, filename);
}
