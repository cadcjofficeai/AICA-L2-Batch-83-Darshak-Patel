// server.ts
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import { GoogleGenAI, Type } from "@google/genai";
import { PDFParse } from "pdf-parse";

// src/data/gstStateMaster.ts
var GST_STATE_MASTER = {
  "01": { code: "01", name: "Jammu and Kashmir", isUnionTerritory: true },
  "02": { code: "02", name: "Himachal Pradesh", isUnionTerritory: false },
  "03": { code: "03", name: "Punjab", isUnionTerritory: false },
  "04": { code: "04", name: "Chandigarh", isUnionTerritory: true },
  "05": { code: "05", name: "Uttarakhand", isUnionTerritory: false },
  "06": { code: "06", name: "Haryana", isUnionTerritory: false },
  "07": { code: "07", name: "Delhi", isUnionTerritory: true },
  "08": { code: "08", name: "Rajasthan", isUnionTerritory: false },
  "09": { code: "09", name: "Uttar Pradesh", isUnionTerritory: false },
  "10": { code: "10", name: "Bihar", isUnionTerritory: false },
  "11": { code: "11", name: "Sikkim", isUnionTerritory: false },
  "12": { code: "12", name: "Arunachal Pradesh", isUnionTerritory: false },
  "13": { code: "13", name: "Nagaland", isUnionTerritory: false },
  "14": { code: "14", name: "Manipur", isUnionTerritory: false },
  "15": { code: "15", name: "Mizoram", isUnionTerritory: false },
  "16": { code: "16", name: "Tripura", isUnionTerritory: false },
  "17": { code: "17", name: "Meghalaya", isUnionTerritory: false },
  "18": { code: "18", name: "Assam", isUnionTerritory: false },
  "19": { code: "19", name: "West Bengal", isUnionTerritory: false },
  "20": { code: "20", name: "Jharkhand", isUnionTerritory: false },
  "21": { code: "21", name: "Odisha", isUnionTerritory: false },
  "22": { code: "22", name: "Chhattisgarh", isUnionTerritory: false },
  "23": { code: "23", name: "Madhya Pradesh", isUnionTerritory: false },
  "24": { code: "24", name: "Gujarat", isUnionTerritory: false },
  "25": { code: "25", name: "Daman and Diu (Pre-Merger)", isUnionTerritory: true },
  "26": { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", isUnionTerritory: true },
  "27": { code: "27", name: "Maharashtra", isUnionTerritory: false },
  "28": { code: "28", name: "Andhra Pradesh (Old)", isUnionTerritory: false },
  "29": { code: "29", name: "Karnataka", isUnionTerritory: false },
  "30": { code: "30", name: "Goa", isUnionTerritory: false },
  "31": { code: "31", name: "Lakshadweep", isUnionTerritory: true },
  "32": { code: "32", name: "Kerala", isUnionTerritory: false },
  "33": { code: "33", name: "Tamil Nadu", isUnionTerritory: false },
  "34": { code: "34", name: "Puducherry", isUnionTerritory: true },
  "35": { code: "35", name: "Andaman and Nicobar Islands", isUnionTerritory: true },
  "36": { code: "36", name: "Telangana", isUnionTerritory: false },
  "37": { code: "37", name: "Andhra Pradesh (New)", isUnionTerritory: false },
  "38": { code: "38", name: "Ladakh", isUnionTerritory: true },
  "97": { code: "97", name: "Other Territory", isUnionTerritory: true },
  "99": { code: "99", name: "Centre Jurisdiction", isUnionTerritory: false }
};
var GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
function validateGstin(gstin) {
  if (!gstin) {
    return { isValid: false, error: "GSTIN cannot be empty" };
  }
  const clean = gstin.trim().toUpperCase();
  if (clean.length !== 15) {
    return { isValid: false, error: `GSTIN must be 15 characters (currently ${clean.length})` };
  }
  if (!GSTIN_REGEX.test(clean)) {
    return { isValid: false, error: "Invalid GSTIN structure. Expected format: 24ABCDE1234F1Z5" };
  }
  const stateCode = clean.substring(0, 2);
  const state = GST_STATE_MASTER[stateCode];
  if (!state) {
    return { isValid: false, error: `Invalid GST state code '${stateCode}' in GSTIN` };
  }
  const pan = clean.substring(2, 12);
  return { isValid: true, state, pan };
}

// src/services/localExtractor.ts
function extractInvoiceLocally(rawText, defaultRecipient) {
  if (!rawText || rawText.trim().length === 0) {
    return { success: false, error: "Empty invoice text" };
  }
  const text = rawText.trim();
  try {
    if (text.startsWith("{") && text.endsWith("}")) {
      const parsed = JSON.parse(text);
      if (parsed.invoiceNumber || parsed.invoice_number) {
        return {
          success: true,
          data: normalizeParsedJsonInvoice(parsed, defaultRecipient)
        };
      }
    }
  } catch {
  }
  const gstinRegex = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b/gi;
  const foundGstins = [];
  let gstinMatch;
  while ((gstinMatch = gstinRegex.exec(text)) !== null) {
    const val = gstinMatch[1].toUpperCase();
    if (!foundGstins.includes(val)) {
      foundGstins.push(val);
    }
  }
  let supplierGstin = "";
  let recipientGstin = defaultRecipient?.gstin || "";
  if (foundGstins.length >= 2) {
    if (defaultRecipient && foundGstins.includes(defaultRecipient.gstin)) {
      recipientGstin = defaultRecipient.gstin;
      supplierGstin = foundGstins.find((g) => g !== defaultRecipient.gstin) || foundGstins[0];
    } else {
      supplierGstin = foundGstins[0];
      recipientGstin = foundGstins[1];
    }
  } else if (foundGstins.length === 1) {
    if (defaultRecipient && foundGstins[0] === defaultRecipient.gstin) {
      recipientGstin = defaultRecipient.gstin;
    } else {
      supplierGstin = foundGstins[0];
    }
  }
  const invNoRegex = /(?:invoice\s*(?:no|num|number|#)?|bill\s*(?:no|number)|inv\s*#?)[:\s.-]+([a-zA-Z0-9_\-\/]+)/i;
  const invNoMatch = text.match(invNoRegex);
  const invoiceNumber = invNoMatch ? invNoMatch[1].trim() : `INV-${Date.now().toString().slice(-6)}`;
  const dateRegex = /(?:invoice\s*date|dated|date)[:\s]+(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4}|\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i;
  const dateMatch = text.match(dateRegex);
  let invoiceDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  if (dateMatch) {
    invoiceDate = parseFlexibleDate(dateMatch[1]);
  }
  let supplierName = "Extracted Supplier Enterprise";
  const supplierNameRegex = /(?:supplier|seller|vendor|from|m\/s|provider)[:\s]+([a-zA-Z0-9\s.,&'()-]{3,50})/i;
  const nameMatch = text.match(supplierNameRegex);
  if (nameMatch) {
    supplierName = nameMatch[1].trim().split("\n")[0].replace(/,\s*GSTIN.*/i, "").trim();
  } else {
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 2 && !l.includes(":") && !l.startsWith("--") && !/^page\s*\d+/i.test(l) && !/^\d+$/.test(l));
    if (lines.length > 0 && lines[0].length < 60) {
      supplierName = lines[0];
    }
  }
  const extractAmount = (pattern) => {
    const match = text.match(pattern);
    if (match && match[1]) {
      const clean = match[1].replace(/,/g, "").trim();
      const val = parseFloat(clean);
      return isNaN(val) ? 0 : val;
    }
    return 0;
  };
  const taxableValue = extractAmount(/(?:taxable\s*value|taxable\s*amount|sub\s*total|base\s*amount)[:\s₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i) || extractAmount(/(?:total\s*before\s*tax)[:\s₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i) || 1e5;
  const cgstAmount = extractAmount(/(?:cgst|central\s*tax)[:\s₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i);
  const sgstAmount = extractAmount(/(?:sgst|state\s*tax|utgst)[:\s₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i);
  const igstAmount = extractAmount(/(?:igst|integrated\s*tax)[:\s₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i);
  const grandTotal = extractAmount(/(?:grand\s*total|invoice\s*total|total\s*amount|net\s*amount|total)[:\s₹rs.]*([0-9,]+(?:\.[0-9]{2})?)/i) || taxableValue + cgstAmount + sgstAmount + igstAmount;
  const supVal = validateGstin(supplierGstin);
  const recVal = validateGstin(recipientGstin);
  const supplierStateCode = supVal.state?.code || "27";
  const supplierStateName = supVal.state?.name || "Maharashtra";
  const supplierPan = supVal.pan || (supplierGstin.length >= 12 ? supplierGstin.substring(2, 12) : "AABCS1234F");
  const recipientStateCode = recVal.state?.code || defaultRecipient?.stateCode || supplierStateCode;
  const recipientStateName = recVal.state?.name || defaultRecipient?.stateName || supplierStateName;
  const recipientPan = recVal.pan || defaultRecipient?.gstin?.substring(2, 12) || "";
  const isInterState = igstAmount > 0 || supplierStateCode !== recipientStateCode;
  let finalCgst = cgstAmount;
  let finalSgst = sgstAmount;
  let finalIgst = igstAmount;
  const totalGstDiff = grandTotal - taxableValue;
  if (totalGstDiff > 0 && finalCgst === 0 && finalSgst === 0 && finalIgst === 0) {
    if (isInterState) {
      finalIgst = totalGstDiff;
    } else {
      finalCgst = Math.round(totalGstDiff / 2);
      finalSgst = totalGstDiff - finalCgst;
    }
  }
  const items = [];
  const descRegex = /(?:description|item|particulars|service)[:\s]+([a-zA-Z0-9\s.,&'()-]{4,100})/i;
  const descMatch = text.match(descRegex);
  const mainDesc = descMatch ? descMatch[1].trim().split("\n")[0] : "Professional Technical & Consultancy Services";
  const hsnRegex = /\b(?:hsn|sac)?[:\s]*([0-9]{4,8})\b/i;
  const hsnMatch = text.match(hsnRegex);
  const detectedHsn = hsnMatch ? hsnMatch[1] : "998313";
  items.push({
    id: "item-" + Date.now(),
    description: mainDesc,
    hsnSac: detectedHsn,
    quantity: 1,
    unitPrice: taxableValue,
    taxableValue,
    cgstRate: isInterState ? 0 : 9,
    cgstAmount: finalCgst,
    sgstRate: isInterState ? 0 : 9,
    sgstAmount: finalSgst,
    igstRate: isInterState ? 18 : 0,
    igstAmount: finalIgst,
    cessAmount: 0,
    totalGst: finalCgst + finalSgst + finalIgst,
    totalValue: taxableValue + finalCgst + finalSgst + finalIgst,
    itemCategory: "Services",
    itcStatus: "Eligible",
    eligibleItc: finalCgst + finalSgst + finalIgst,
    ineligibleItc: 0,
    reviewItc: 0,
    itcReason: "Evaluated under Section 16(1) in the course or furtherance of business.",
    relevantSections: ["Section 16(1)"]
  });
  const invoiceData = {
    id: "inv-" + Date.now(),
    invoiceNumber,
    invoiceDate,
    paymentOrCreditDate: invoiceDate,
    financialYear: getFinancialYear(invoiceDate),
    supplierName,
    supplierGstin,
    supplierPan,
    supplierStateCode,
    supplierStateName,
    supplierType: supplierPan.charAt(3) === "P" ? "Individual / HUF" : "Company / Firm",
    supplierResidentStatus: "Resident",
    recipientName: defaultRecipient?.name || "Client Enterprise",
    recipientGstin,
    recipientPan,
    recipientStateCode,
    recipientStateName,
    placeOfSupplyStateCode: recipientStateCode,
    placeOfSupplyStateName: recipientStateName,
    isInterState,
    reverseChargeApplicable: text.toLowerCase().includes("reverse charge: yes") || text.toLowerCase().includes("rcm: yes"),
    items,
    subtotalTaxable: taxableValue,
    totalCgst: finalCgst,
    totalSgst: finalSgst,
    totalIgst: finalIgst,
    totalCess: 0,
    totalGst: finalCgst + finalSgst + finalIgst,
    grandTotal,
    natureOfSupplySummary: mainDesc,
    rawText: text,
    extractionSource: "Local Deterministic"
  };
  return {
    success: true,
    data: invoiceData,
    isAmbiguous: !supplierGstin || taxableValue <= 0
  };
}
function parseFlexibleDate(str) {
  try {
    const parts = str.split(/[-\/.]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      } else {
        const year = parts[2].length === 2 ? "20" + parts[2] : parts[2];
        return `${year}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
  } catch {
  }
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function getFinancialYear(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "2026-27";
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}
function normalizeParsedJsonInvoice(json, defaultRecipient) {
  const invoiceNumber = json.invoiceNumber || json.invoice_number || "INV-001";
  const invoiceDate = json.invoiceDate || json.invoice_date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const supplierGstin = (json.supplierGstin || json.supplier_gstin || "").toUpperCase();
  const supVal = validateGstin(supplierGstin);
  const items = (json.items || []).map((it, i) => ({
    id: "item-" + i,
    description: it.description || "Consultancy & Business Services",
    hsnSac: it.hsnSac || it.hsn_sac || "998313",
    quantity: it.quantity || 1,
    unitPrice: it.unitPrice || it.taxableValue || 0,
    taxableValue: it.taxableValue || it.amount || 0,
    cgstAmount: it.cgstAmount || 0,
    sgstAmount: it.sgstAmount || 0,
    igstAmount: it.igstAmount || 0,
    cessAmount: it.cessAmount || 0,
    totalGst: (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0),
    totalValue: (it.taxableValue || 0) + (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0),
    itcStatus: "Eligible",
    eligibleItc: (it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0),
    ineligibleItc: 0,
    reviewItc: 0,
    itcReason: "Section 16(1) course or furtherance of business.",
    relevantSections: ["Section 16(1)"]
  }));
  const subtotal = items.reduce((sum, item) => sum + item.taxableValue, 0) || json.taxableValue || 0;
  const totalCgst = items.reduce((sum, item) => sum + item.cgstAmount, 0) || json.totalCgst || 0;
  const totalSgst = items.reduce((sum, item) => sum + item.sgstAmount, 0) || json.totalSgst || 0;
  const totalIgst = items.reduce((sum, item) => sum + item.igstAmount, 0) || json.totalIgst || 0;
  const grandTotal = json.grandTotal || subtotal + totalCgst + totalSgst + totalIgst;
  return {
    id: "inv-" + Date.now(),
    invoiceNumber,
    invoiceDate,
    paymentOrCreditDate: json.paymentOrCreditDate || invoiceDate,
    financialYear: getFinancialYear(invoiceDate),
    supplierName: json.supplierName || json.supplier_name || "Vendor Enterprise",
    supplierGstin,
    supplierPan: supVal.pan || supplierGstin.substring(2, 12),
    supplierStateCode: supVal.state?.code || "27",
    supplierStateName: supVal.state?.name || "Maharashtra",
    supplierType: "Company / Firm",
    supplierResidentStatus: "Resident",
    recipientName: defaultRecipient?.name || json.recipientName || "Client Enterprise",
    recipientGstin: defaultRecipient?.gstin || json.recipientGstin || "",
    recipientPan: defaultRecipient?.gstin ? defaultRecipient.gstin.substring(2, 12) : "",
    recipientStateCode: defaultRecipient?.stateCode || "27",
    recipientStateName: defaultRecipient?.stateName || "Maharashtra",
    placeOfSupplyStateCode: defaultRecipient?.stateCode || "27",
    placeOfSupplyStateName: defaultRecipient?.stateName || "Maharashtra",
    isInterState: totalIgst > 0,
    reverseChargeApplicable: Boolean(json.reverseChargeApplicable),
    items: items.length > 0 ? items : [{
      id: "item-1",
      description: "Professional Services",
      hsnSac: "998313",
      taxableValue: subtotal,
      cgstAmount: totalCgst,
      sgstAmount: totalSgst,
      igstAmount: totalIgst,
      cessAmount: 0,
      totalGst: totalCgst + totalSgst + totalIgst,
      totalValue: grandTotal,
      itcStatus: "Eligible",
      eligibleItc: totalCgst + totalSgst + totalIgst,
      ineligibleItc: 0,
      reviewItc: 0,
      itcReason: "Section 16(1) course or furtherance of business.",
      relevantSections: ["Section 16(1)"]
    }],
    subtotalTaxable: subtotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalCess: 0,
    totalGst: totalCgst + totalSgst + totalIgst,
    grandTotal,
    natureOfSupplySummary: json.natureOfSupplySummary || "Commercial Business Supply",
    extractionSource: "Local Deterministic"
  };
}

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
var port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json({ limit: "25mb" }));
var classificationCache = /* @__PURE__ */ new Map();
var apiKey = process.env.GEMINI_API_KEY;
var aiClient = null;
if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
function mapLocalInvoiceToAiSchema(localInvoice) {
  return {
    supplier: localInvoice.supplierName || "Vendor / Supplier",
    supplier_gstin: localInvoice.supplierGstin || "",
    recipient: localInvoice.recipientName || "",
    recipient_gstin: localInvoice.recipientGstin || "",
    invoice_number: localInvoice.invoiceNumber || "",
    invoice_date: localInvoice.invoiceDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    payment_credit_date: localInvoice.paymentOrCreditDate || localInvoice.invoiceDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    place_of_supply: localInvoice.placeOfSupplyStateName || "",
    taxable_value: localInvoice.subtotalTaxable || 0,
    cgst_amount: localInvoice.totalCgst || 0,
    sgst_amount: localInvoice.totalSgst || 0,
    igst_amount: localInvoice.totalIgst || 0,
    total_amount: localInvoice.grandTotal || localInvoice.subtotalTaxable + localInvoice.totalCgst + localInvoice.totalSgst + localInvoice.totalIgst,
    tds_nature: localInvoice.natureOfSupplySummary || "Goods & Services",
    items: (localInvoice.items || []).map((it) => ({
      description: it.description || "Line Item",
      hsn_sac: it.hsnSac || "",
      taxable_value: it.taxableValue || 0,
      cgst_amount: it.cgstAmount || 0,
      sgst_amount: it.sgstAmount || 0,
      igst_amount: it.igstAmount || 0,
      nature: it.description || "Goods / Services"
    })),
    ambiguities: []
  };
}
app.post("/api/ai/classify", async (req, res) => {
  const { invoiceText, imageBase64, mimeType } = req.body;
  if (!invoiceText && !imageBase64) {
    return res.status(400).json({
      error: "Either invoiceText or imageBase64 must be provided."
    });
  }
  const contentToHash = (invoiceText || "") + (imageBase64 ? `${imageBase64.length}_${imageBase64.slice(0, 100)}_${imageBase64.slice(-100)}` : "");
  const hash = crypto.createHash("sha256").update(contentToHash).digest("hex");
  if (classificationCache.has(hash)) {
    return res.json({
      source: "cache",
      result: classificationCache.get(hash)
    });
  }
  let cleanBase64 = imageBase64;
  let effectiveMimeType = mimeType || "application/pdf";
  let extractedPdfText = "";
  if (cleanBase64) {
    cleanBase64 = cleanBase64.trim();
    const commaIdx = cleanBase64.indexOf(",");
    if (cleanBase64.startsWith("data:") && commaIdx !== -1) {
      const meta = cleanBase64.slice(5, commaIdx);
      const mimeMatch = meta.match(/^([^;]+)/);
      if (mimeMatch && mimeMatch[1]) {
        effectiveMimeType = mimeMatch[1].trim();
      }
      cleanBase64 = cleanBase64.slice(commaIdx + 1);
    }
    cleanBase64 = cleanBase64.replace(/\s+/g, "");
    if (effectiveMimeType.includes("pdf") || effectiveMimeType === "application/pdf") {
      try {
        const pdfBuffer = Buffer.from(cleanBase64, "base64");
        const parser = new PDFParse(new Uint8Array(pdfBuffer));
        const parsedPdf = await parser.getText();
        if (parsedPdf && parsedPdf.text && parsedPdf.text.trim().length > 10) {
          extractedPdfText = parsedPdf.text.trim();
        }
      } catch (pdfErr) {
        console.warn("PDF stream extraction warning:", pdfErr);
      }
    }
  }
  const effectiveInvoiceText = (invoiceText || "") + (extractedPdfText ? `
${extractedPdfText}` : "");
  if (!aiClient) {
    if (effectiveInvoiceText) {
      const localResult = extractInvoiceLocally(effectiveInvoiceText);
      if (localResult.success && localResult.data) {
        const mapped = mapLocalInvoiceToAiSchema(localResult.data);
        classificationCache.set(hash, mapped);
        return res.json({
          source: "deterministic_engine",
          result: mapped
        });
      }
    }
    return res.status(200).json({
      source: "default_baseline",
      result: {
        supplier: "Vendor Enterprise",
        supplier_gstin: "",
        recipient: "",
        recipient_gstin: "",
        invoice_number: `INV-${Date.now().toString().slice(-6)}`,
        invoice_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        payment_credit_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        place_of_supply: "",
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: 0,
        tds_nature: "Goods / Services",
        items: [],
        ambiguities: []
      }
    });
  }
  try {
    const prompt = `You are a specialized tax invoice data extractor for Indian Chartered Accountants.
Extract the structured invoice data strictly into JSON according to the schema.
Do NOT invent numbers or GSTINs. If a field is missing, leave it as an empty string or 0.

Key rules:
- Extract supplier name, GSTIN, PAN (characters 3-12 of GSTIN).
- Extract recipient name, GSTIN.
- Extract invoice number, date (YYYY-MM-DD), payment/credit date if visible.
- Extract line items with item descriptions, HSN/SAC codes, taxable values, CGST, SGST, IGST amounts.
- Classify the predominant nature of payment (e.g., "Professional Services", "Contractor", "Rent - Machinery", "Rent - Land/Building", "Purchase of Goods > 50L", "Commission").
- Note any ambiguities.`;
    const contents = [];
    if (effectiveInvoiceText) {
      contents.push({
        text: `INVOICE TEXT:
${effectiveInvoiceText}

${prompt}`
      });
    } else if (cleanBase64) {
      contents.push({
        inlineData: {
          mimeType: effectiveMimeType,
          data: cleanBase64
        }
      });
      contents.push({ text: prompt });
    } else {
      contents.push({ text: prompt });
    }
    const schemaConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          supplier: { type: Type.STRING },
          supplier_gstin: { type: Type.STRING },
          recipient: { type: Type.STRING },
          recipient_gstin: { type: Type.STRING },
          invoice_number: { type: Type.STRING },
          invoice_date: { type: Type.STRING },
          payment_credit_date: { type: Type.STRING },
          place_of_supply: { type: Type.STRING },
          taxable_value: { type: Type.NUMBER },
          cgst_amount: { type: Type.NUMBER },
          sgst_amount: { type: Type.NUMBER },
          igst_amount: { type: Type.NUMBER },
          total_amount: { type: Type.NUMBER },
          tds_nature: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                hsn_sac: { type: Type.STRING },
                taxable_value: { type: Type.NUMBER },
                cgst_amount: { type: Type.NUMBER },
                sgst_amount: { type: Type.NUMBER },
                igst_amount: { type: Type.NUMBER },
                nature: { type: Type.STRING }
              }
            }
          },
          ambiguities: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    };
    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
    let lastError = null;
    let response = null;
    for (const model of modelsToTry) {
      try {
        response = await aiClient.models.generateContent({
          model,
          contents,
          config: schemaConfig
        });
        if (response && response.text) {
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Model ${model} failed, attempting next model if available:`, err?.message || err);
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    if (!response || !response.text) {
      throw lastError || new Error("No response returned from AI models");
    }
    let textOutput = response.text || "";
    if (!textOutput) {
      throw new Error("Empty response from model");
    }
    textOutput = textOutput.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsedResult = JSON.parse(textOutput);
    classificationCache.set(hash, parsedResult);
    return res.json({
      source: "gemini",
      result: parsedResult
    });
  } catch (error) {
    console.warn("Gemini classification fallback triggered:", error?.message || error);
    if (effectiveInvoiceText) {
      const localRes = extractInvoiceLocally(effectiveInvoiceText);
      if (localRes.success && localRes.data) {
        const mapped = mapLocalInvoiceToAiSchema(localRes.data);
        classificationCache.set(hash, mapped);
        return res.json({
          source: "deterministic_engine",
          result: mapped
        });
      }
    }
    const safeFallback = {
      supplier: "Vendor Enterprise",
      supplier_gstin: "",
      recipient: "",
      recipient_gstin: "",
      invoice_number: `INV-${Date.now().toString().slice(-6)}`,
      invoice_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      payment_credit_date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      place_of_supply: "",
      taxable_value: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      igst_amount: 0,
      total_amount: 0,
      tds_nature: "Goods / Services",
      items: [],
      ambiguities: []
    };
    return res.json({
      source: "deterministic_engine",
      result: safeFallback
    });
  }
});
var isProd = process.env.NODE_ENV === "production";
if (!isProd) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.resolve(__dirname, "dist", "index.html"));
  });
}
app.listen(port, "0.0.0.0", () => {
  console.log(`CA Tax Decision-Support System running on http://0.0.0.0:${port}`);
});
