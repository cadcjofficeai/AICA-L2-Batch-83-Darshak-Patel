import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI, Type } from '@google/genai';
import { PDFParse } from 'pdf-parse';
import { extractInvoiceLocally } from './src/services/localExtractor.ts';
export { extractInvoiceLocally };

dotenv.config();

function mapLocalInvoiceToAiSchema(localInvoice: any) {
  return {
    supplier: localInvoice.supplierName || 'Vendor / Supplier',
    supplier_gstin: localInvoice.supplierGstin || '',
    recipient: localInvoice.recipientName || '',
    recipient_gstin: localInvoice.recipientGstin || '',
    invoice_number: localInvoice.invoiceNumber || '',
    invoice_date: localInvoice.invoiceDate || new Date().toISOString().split('T')[0],
    payment_credit_date: localInvoice.paymentOrCreditDate || localInvoice.invoiceDate || new Date().toISOString().split('T')[0],
    place_of_supply: localInvoice.placeOfSupplyStateName || '',
    taxable_value: localInvoice.subtotalTaxable || 0,
    cgst_amount: localInvoice.totalCgst || 0,
    sgst_amount: localInvoice.totalSgst || 0,
    igst_amount: localInvoice.totalIgst || 0,
    total_amount: localInvoice.grandTotal || (localInvoice.subtotalTaxable + localInvoice.totalCgst + localInvoice.totalSgst + localInvoice.totalIgst),
    tds_nature: localInvoice.natureOfSupplySummary || 'Goods & Services',
    items: (localInvoice.items || []).map((it: any) => ({
      description: it.description || 'Line Item',
      hsn_sac: it.hsnSac || '',
      taxable_value: it.taxableValue || 0,
      cgst_amount: it.cgstAmount || 0,
      sgst_amount: it.sgstAmount || 0,
      igst_amount: it.igstAmount || 0,
      category: it.itemCategory || '',
      nature: it.description || 'Goods / Services',
    })),
    ambiguities: [],
  };
}

export function createExpressApp(distPath?: string) {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  const classificationCache = new Map<string, any>();
  const apiKey = process.env.GEMINI_API_KEY;
  let aiClient: GoogleGenAI | null = null;
  if (apiKey) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  app.post('/api/ai/classify', async (req, res) => {
    const { invoiceText, imageBase64, mimeType, fileName } = req.body;

    if (!invoiceText && !imageBase64) {
      return res.status(400).json({
        error: 'Either invoiceText or imageBase64 must be provided.',
      });
    }

    // Compute hash for deduplication/caching per unique file content
    const contentToHash = (invoiceText || '') + (imageBase64 || '') + (fileName || '');
    const hash = crypto.createHash('sha256').update(contentToHash).digest('hex');

    if (classificationCache.has(hash)) {
      return res.json({
        source: 'cache',
        result: classificationCache.get(hash),
      });
    }

    let cleanBase64 = imageBase64;
    let effectiveMimeType = mimeType || 'application/pdf';
    let extractedPdfText = '';

    if (cleanBase64) {
      cleanBase64 = cleanBase64.trim();
      const commaIdx = cleanBase64.indexOf(',');
      if (cleanBase64.startsWith('data:') && commaIdx !== -1) {
        const meta = cleanBase64.slice(5, commaIdx);
        const mimeMatch = meta.match(/^([^;]+)/);
        if (mimeMatch && mimeMatch[1]) {
          effectiveMimeType = mimeMatch[1].trim();
        }
        cleanBase64 = cleanBase64.slice(commaIdx + 1);
      }
      cleanBase64 = cleanBase64.replace(/\s+/g, '');

      if (effectiveMimeType.includes('pdf') || effectiveMimeType === 'application/pdf' || (fileName && fileName.toLowerCase().endsWith('.pdf'))) {
        try {
          const pdfBuffer = Buffer.from(cleanBase64, 'base64');
          const parser = new PDFParse({ data: pdfBuffer });
          const parsedPdf = await parser.getText();
          if (parsedPdf && parsedPdf.text && parsedPdf.text.trim().length > 0) {
            extractedPdfText = parsedPdf.text.trim();
          }
        } catch (pdfErr) {
          console.warn('PDF stream extraction warning:', pdfErr);
        }
      }
    }

    const effectiveInvoiceText = (extractedPdfText ? `${extractedPdfText}\n` : '') + (invoiceText || '');

    if (!aiClient) {
      if (effectiveInvoiceText || fileName) {
        const localResult = extractInvoiceLocally(effectiveInvoiceText || fileName || '', undefined, fileName);
        if (localResult.success && localResult.data) {
          const mapped = mapLocalInvoiceToAiSchema(localResult.data);
          classificationCache.set(hash, mapped);
          return res.json({
            source: 'deterministic_engine',
            result: mapped,
          });
        }
      }

      const defaultInv = extractInvoiceLocally(fileName || '', undefined, fileName).data;
      const mapped = defaultInv ? mapLocalInvoiceToAiSchema(defaultInv) : {
        supplier: fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Vendor Enterprise',
        supplier_gstin: '',
        recipient: '',
        recipient_gstin: '',
        invoice_number: fileName ? fileName.replace(/\.[^/.]+$/, '') : `INV-${Date.now().toString().slice(-6)}`,
        invoice_date: new Date().toISOString().split('T')[0],
        payment_credit_date: new Date().toISOString().split('T')[0],
        place_of_supply: '',
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: 0,
        tds_nature: 'Goods / Services',
        items: [],
        ambiguities: [],
      };

      return res.status(200).json({
        source: 'default_baseline',
        result: mapped,
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

      const contents: any[] = [];
      if (effectiveInvoiceText) {
        contents.push({
          text: `INVOICE TEXT:\n${effectiveInvoiceText}\n\n${prompt}`,
        });
      } else if (cleanBase64) {
        contents.push({
          inlineData: {
            mimeType: effectiveMimeType,
            data: cleanBase64,
          },
        });
        contents.push({ text: prompt });
      } else {
        contents.push({ text: prompt });
      }

      const schemaConfig = {
        responseMimeType: 'application/json',
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
                  nature: { type: Type.STRING },
                },
              },
            },
            ambiguities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      };

      const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
      let lastError: any = null;
      let response: any = null;

      for (const model of modelsToTry) {
        try {
          response = await aiClient.models.generateContent({
            model,
            contents,
            config: schemaConfig,
          });
          if (response && response.text) {
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Model ${model} failed:`, err?.message || err);
          await new Promise(r => setTimeout(r, 400));
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error('No response returned from AI models');
      }

      let textOutput = response.text || '';
      textOutput = textOutput.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsedResult = JSON.parse(textOutput);
      classificationCache.set(hash, parsedResult);

      return res.json({
        source: 'gemini',
        result: parsedResult,
      });
    } catch (error: any) {
      console.warn('Gemini classification fallback triggered:', error?.message || error);
      if (effectiveInvoiceText || fileName) {
        const localRes = extractInvoiceLocally(effectiveInvoiceText || fileName || '', undefined, fileName);
        if (localRes.success && localRes.data) {
          const mapped = mapLocalInvoiceToAiSchema(localRes.data);
          classificationCache.set(hash, mapped);
          return res.json({
            source: 'deterministic_engine',
            result: mapped,
          });
        }
      }

      const defaultInv = extractInvoiceLocally(fileName || '', undefined, fileName).data;
      const mapped = defaultInv ? mapLocalInvoiceToAiSchema(defaultInv) : {
        supplier: fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Vendor Enterprise',
        supplier_gstin: '',
        recipient: '',
        recipient_gstin: '',
        invoice_number: fileName ? fileName.replace(/\.[^/.]+$/, '') : `INV-${Date.now().toString().slice(-6)}`,
        invoice_date: new Date().toISOString().split('T')[0],
        payment_credit_date: new Date().toISOString().split('T')[0],
        place_of_supply: '',
        taxable_value: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: 0,
        tds_nature: 'Goods / Services',
        items: [],
        ambiguities: [],
      };

      return res.json({
        source: 'deterministic_engine',
        result: mapped,
      });
    }
  });

  if (distPath) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

export function startServer(preferredPort = 0, distPath?: string): Promise<{ server: any; port: number; url: string }> {
  return new Promise((resolve, reject) => {
    const app = createExpressApp(distPath);
    const server = app.listen(preferredPort, '127.0.0.1', () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : preferredPort;
      const url = `http://127.0.0.1:${actualPort}`;
      resolve({ server, port: actualPort, url });
    });
    server.on('error', (err) => {
      reject(err);
    });
  });
}
