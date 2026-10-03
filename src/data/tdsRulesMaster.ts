import { TdsRule } from '../types/tax';

/**
 * Version-Controlled TDS Master Database
 * Cross-references Income-tax Act, 1961 vs Income-tax Act, 2025 (Section 393 Tables & Items)
 * Updated as per Finance Acts and statutory provisions.
 */

export const TDS_RULES_MASTER: TdsRule[] = [
  {
    ruleId: 'TDS_194C_CONTRACT',
    natureOfPayment: 'Payment to Contractors / Sub-contractors (Works, Advertising, Transport, Catering)',
    
    // Act 1961
    oldSection: 'Section 194C',
    oldDescription: 'Payments to contractors and sub-contractors for carrying out any work (including supply of labour)',
    oldSingleThreshold: 30000,
    oldAggregateThreshold: 100000,
    oldRateIndHuf: 1.0,
    oldRateOther: 2.0,
    oldBase: 'Taxable invoice value (excluding GST if shown separately as per Circular No. 23/2017)',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 3',
    newDescription: 'Sums paid to resident contractors/sub-contractors for works contracts, advertising, telecasting, carriage of goods/passengers (other than railways), catering',
    newSingleThreshold: 30000,
    newAggregateThreshold: 100000,
    newRateIndHuf: 1.0,
    newRateOther: 2.0,
    newBase: 'Gross amount payable excluding GST charged separately',

    panConditionRate: 20.0, // Section 206AA
    exceptions: [
      'Transport contractors owning 10 or fewer goods carriages at any time during FY who furnish PAN with declaration (Section 194C(6) / Section 393 Table 1 Item 3 proviso)',
      'Payments by Individual/HUF exclusively for personal use (Section 194C(4))',
      'Single contract <= ₹30,000 AND aggregate payments in FY <= ₹1,00,000'
    ],
    specialConditions: [
      'Manufacturing or supplying a product according to requirement or specification of a customer using materials purchased from such customer (Job-work/contract manufacturing)',
      'Sub-contracting is covered at identical rates'
    ],
    triggerTiming: 'Earlier of credit of sum to payee account (even if suspense account) or payment in cash/cheque/draft',
    depositDueRule: '7th of subsequent month (30th April for tax deducted in March)',
    legalSource: 'Income-tax Act, 1961 s. 194C / Income-tax Act, 2025 s. 393 Table 1 Item 3; CBDT Circular 23/2017',
    sourceReference: 'CBDT Master Circular on TDS / Income-tax Code 2025 Sch. XI',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194J_PROFESSIONAL',
    natureOfPayment: 'Fees for Professional Services (Legal, Medical, Engineering, Architectural, Accountancy, Technical Consultancy)',
    
    // Act 1961
    oldSection: 'Section 194J(1)(a)',
    oldDescription: 'Fees for professional services rendered by specified professions',
    oldSingleThreshold: 30000,
    oldAggregateThreshold: 30000,
    oldRateIndHuf: 10.0,
    oldRateOther: 10.0,
    oldBase: 'Taxable professional fees excluding GST separately invoiced',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 10',
    newDescription: 'Fees for professional services paid to a resident',
    newSingleThreshold: 30000,
    newAggregateThreshold: 30000,
    newRateIndHuf: 10.0,
    newRateOther: 10.0,
    newBase: 'Gross sum payable excluding GST charged separately',

    panConditionRate: 20.0,
    exceptions: [
      'Aggregate payment during FY does not exceed ₹30,000',
      'Individual or HUF carrying on business whose turnover <= ₹1 Cr (or profession <= ₹50 Lakhs) in preceding FY'
    ],
    specialConditions: [
      'Includes CA, Advocate, Architect, Engineer, Doctor, Interior Decorator, Authorized Representative, Film Artist, Company Secretary, IT Professional'
    ],
    triggerTiming: 'Earlier of credit to payee account or payment',
    depositDueRule: '7th of subsequent month (30th April for March)',
    legalSource: 'Income-tax Act, 1961 s. 194J(1)(a) / Income-tax Act, 2025 s. 393 Table 1 Item 10',
    sourceReference: 'CBDT Notification No. 138/2021 & Circular 23/2017',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194J_TECHNICAL_FTS',
    natureOfPayment: 'Fees for Technical Services (FTS) / IT Software Development / Call Centre Services',
    
    // Act 1961
    oldSection: 'Section 194J(1)(b)',
    oldDescription: 'Fees for technical services (other than professional services) and call center operator charges',
    oldSingleThreshold: 30000,
    oldAggregateThreshold: 30000,
    oldRateIndHuf: 2.0,
    oldRateOther: 2.0,
    oldBase: 'Taxable fee value excluding GST',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 10(b)',
    newDescription: 'Fees for technical services paid to a resident',
    newSingleThreshold: 30000,
    newAggregateThreshold: 30000,
    newRateIndHuf: 2.0,
    newRateOther: 2.0,
    newBase: 'Gross sum payable excluding GST charged separately',

    panConditionRate: 20.0,
    exceptions: [
      'Aggregate payment during FY does not exceed ₹30,000'
    ],
    specialConditions: [
      'Reduced rate of 2% enacted to alleviate working capital strain on IT/tech services and call centers'
    ],
    triggerTiming: 'Earlier of credit or payment',
    depositDueRule: '7th of subsequent month (30th April for March)',
    legalSource: 'Finance Act 2020 amendment to s. 194J(1); Income-tax Act, 2025 s. 393 Table 1 Item 10(b)',
    sourceReference: 'CBDT Circular No. 23/2017',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194I_RENT_PLANT_MACHINERY',
    natureOfPayment: 'Rent for Plant, Machinery or Equipment',
    
    // Act 1961
    oldSection: 'Section 194I(a)',
    oldDescription: 'Rent for use of any machinery or plant or equipment',
    oldSingleThreshold: 240000,
    oldAggregateThreshold: 240000,
    oldRateIndHuf: 2.0,
    oldRateOther: 2.0,
    oldBase: 'Rent amount excluding GST',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 8(a)',
    newDescription: 'Rent paid for the use of any plant, machinery or equipment',
    newSingleThreshold: 240000,
    newAggregateThreshold: 240000,
    newRateIndHuf: 2.0,
    newRateOther: 2.0,
    newBase: 'Rent excluding GST separately charged',

    panConditionRate: 20.0,
    exceptions: [
      'Aggregate rent credited or paid in FY <= ₹2,40,000',
      'Payee is a Real Estate Investment Trust (REIT) or Business Trust qualifying under specified exemptions'
    ],
    specialConditions: [
      'Applicable even if the payee is not the owner of the equipment (e.g. sub-lease/hire)'
    ],
    triggerTiming: 'Earlier of credit to payee account or payment',
    depositDueRule: '7th of subsequent month (30th April for March)',
    legalSource: 'Income-tax Act, 1961 s. 194I(a) / Income-tax Act, 2025 s. 393 Table 1 Item 8(a)',
    sourceReference: 'CBDT Circular No. 23/2017',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194I_RENT_LAND_BUILDING',
    natureOfPayment: 'Rent for Land, Building (Commercial/Office/Warehouse) or Furniture/Fittings',
    
    // Act 1961
    oldSection: 'Section 194I(b)',
    oldDescription: 'Rent for the use of any land or building (including factory building) or land appurtenant thereto or furniture or fittings',
    oldSingleThreshold: 240000,
    oldAggregateThreshold: 240000,
    oldRateIndHuf: 10.0,
    oldRateOther: 10.0,
    oldBase: 'Taxable rent excluding GST separately invoiced',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 8(b)',
    newDescription: 'Rent paid for the use of land or building or furniture or fittings',
    newSingleThreshold: 240000,
    newAggregateThreshold: 240000,
    newRateIndHuf: 10.0,
    newRateOther: 10.0,
    newBase: 'Rent excluding GST',

    panConditionRate: 20.0,
    exceptions: [
      'Aggregate rent in FY <= ₹2,40,000',
      'Individual/HUF payer not liable to tax audit in preceding FY (governed by 194-IB if rent > ₹50,000/month)'
    ],
    specialConditions: [
      'Includes office spaces, commercial premises, warehouses, lease rentals, cold storage facilities'
    ],
    triggerTiming: 'Earlier of credit or payment',
    depositDueRule: '7th of subsequent month (30th April for March)',
    legalSource: 'Income-tax Act, 1961 s. 194I(b) / Income-tax Act, 2025 s. 393 Table 1 Item 8(b)',
    sourceReference: 'CBDT Circular No. 23/2017 & 04/2008',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194Q_PURCHASE_GOODS',
    natureOfPayment: 'Purchase of Goods exceeding ₹50 Lakhs (by buyer with turnover > ₹10 Cr)',
    
    // Act 1961
    oldSection: 'Section 194Q',
    oldDescription: 'Deduction of tax at source on payment of a certain sum for purchase of goods exceeding ₹50,00,000',
    oldSingleThreshold: 5000000,
    oldAggregateThreshold: 5000000,
    oldRateIndHuf: 0.1,
    oldRateOther: 0.1,
    oldBase: 'Amount paid or payable for purchase of goods in excess of ₹50,00,000 (excluding GST if tax deducted at time of credit)',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 16',
    newDescription: 'Payment for purchase of goods to a resident seller exceeding ₹50 Lakhs by eligible buyer',
    newSingleThreshold: 5000000,
    newAggregateThreshold: 5000000,
    newRateIndHuf: 0.1,
    newRateOther: 0.1,
    newBase: 'Value exceeding ₹50 Lakhs threshold in the financial year',

    panConditionRate: 5.0, // Special proviso under Section 206AA for 194Q: 5% instead of 20%
    exceptions: [
      'Buyer total sales/gross turnover in immediately preceding FY does not exceed ₹10 Crore',
      'Transaction on which tax is deductible under any other provision of the Act',
      'Transaction on which tax is collectible under Section 206C other than 206C(1H) (194Q takes precedence over 206C(1H))'
    ],
    specialConditions: [
      'TDS applicable only on the value in excess of ₹50,00,000 in the financial year',
      'If PAN is not provided, rate is 5% under Section 206AA proviso'
    ],
    triggerTiming: 'Earlier of credit to seller account or payment',
    depositDueRule: '7th of subsequent month (30th April for March)',
    legalSource: 'Income-tax Act, 1961 s. 194Q / Income-tax Act, 2025 s. 393 Table 1 Item 16',
    sourceReference: 'CBDT Circular No. 13 of 2021 & Guidelines on 194Q',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194H_COMMISSION',
    natureOfPayment: 'Commission or Brokerage',
    
    // Act 1961
    oldSection: 'Section 194H',
    oldDescription: 'Commission or brokerage paid to a resident (other than insurance commission)',
    oldSingleThreshold: 15000,
    oldAggregateThreshold: 15000,
    oldRateIndHuf: 2.0, // Reduced from 5% to 2% by Finance Act 2024 w.e.f. 01.10.2024
    oldRateOther: 2.0,
    oldBase: 'Commission or brokerage amount excluding GST',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 7',
    newDescription: 'Commission or brokerage paid to resident',
    newSingleThreshold: 15000,
    newAggregateThreshold: 15000,
    newRateIndHuf: 2.0,
    newRateOther: 2.0,
    newBase: 'Commission or brokerage excluding GST',

    panConditionRate: 20.0,
    exceptions: [
      'Aggregate commission during the financial year does not exceed ₹15,000',
      'Underwriting commission or brokerage on public issue of shares/securities'
    ],
    specialConditions: [
      'Finance Act 2024 rationalized the TDS rate from 5% down to 2% effective 1st October 2024'
    ],
    triggerTiming: 'Earlier of credit or payment',
    depositDueRule: '7th of subsequent month (30th April for March)',
    legalSource: 'Income-tax Act, 1961 s. 194H (amended by FA 2024) / Income-tax Act, 2025 s. 393 Table 1 Item 7',
    sourceReference: 'Finance (No. 2) Act, 2024 & CBDT Circular 23/2017',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194R_PERQUISITE',
    natureOfPayment: 'Benefit or Perquisite in respect of Business or Profession',
    
    // Act 1961
    oldSection: 'Section 194R',
    oldDescription: 'Deduction of tax on benefit or perquisite in respect of business or profession',
    oldSingleThreshold: 20000,
    oldAggregateThreshold: 20000,
    oldRateIndHuf: 10.0,
    oldRateOther: 10.0,
    oldBase: 'Value or aggregate of value of such benefit or perquisite',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 17',
    newDescription: 'Benefit or perquisite arising from business or exercise of profession',
    newSingleThreshold: 20000,
    newAggregateThreshold: 20000,
    newRateIndHuf: 10.0,
    newRateOther: 10.0,
    newBase: 'Value of benefit/perquisite',

    panConditionRate: 20.0,
    exceptions: [
      'Aggregate value of benefit/perquisite does not exceed ₹20,000 during FY',
      'Individual/HUF whose business turnover <= ₹1 Cr (or profession <= ₹50 Lakhs) in preceding FY'
    ],
    specialConditions: [
      'Applicable whether the benefit is in cash, kind, or partly in cash and partly in kind',
      'Incentives, dealer conferences, foreign trips, free products provided to influencers/dealers'
    ],
    triggerTiming: 'Before releasing the benefit or perquisite',
    depositDueRule: '7th of subsequent month (30th April for March)',
    legalSource: 'Income-tax Act, 1961 s. 194R / Income-tax Act, 2025 s. 393 Table 1 Item 17',
    sourceReference: 'CBDT Circular No. 12/2022 & Circular No. 18/2022',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194A_INTEREST',
    natureOfPayment: 'Interest other than Interest on Securities (Loans, Advances, Deposits)',
    
    // Act 1961
    oldSection: 'Section 194A',
    oldDescription: 'Interest other than interest on securities',
    oldSingleThreshold: 5000, // ₹40,000/50,000 for banks, ₹5,000 for others
    oldAggregateThreshold: 5000,
    oldRateIndHuf: 10.0,
    oldRateOther: 10.0,
    oldBase: 'Gross interest payable',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 1',
    newDescription: 'Interest other than interest on securities paid to resident',
    newSingleThreshold: 5000,
    newAggregateThreshold: 5000,
    newRateIndHuf: 10.0,
    newRateOther: 10.0,
    newBase: 'Gross interest',

    panConditionRate: 20.0,
    exceptions: [
      'Interest credited or paid by firm to its partner',
      'Interest paid by co-operative society to member',
      'Aggregate interest <= ₹5,000 (or ₹40,000/₹50,000 in case of banking company/post office)'
    ],
    specialConditions: [
      'Form 15G/15H declaration validity where applicable'
    ],
    triggerTiming: 'Earlier of credit or payment',
    depositDueRule: '7th of subsequent month (30th April for March)',
    legalSource: 'Income-tax Act, 1961 s. 194A / Income-tax Act, 2025 s. 393 Table 1 Item 1',
    sourceReference: 'CBDT Master Circular on TDS',
    lastVerified: '2026-04-01'
  },
  {
    ruleId: 'TDS_194IA_IMMOVABLE_PROP',
    natureOfPayment: 'Transfer of Immovable Property (other than agricultural land)',
    
    // Act 1961
    oldSection: 'Section 194-IA',
    oldDescription: 'Payment on transfer of certain immovable property other than agricultural land',
    oldSingleThreshold: 5000000,
    oldAggregateThreshold: 5000000,
    oldRateIndHuf: 1.0,
    oldRateOther: 1.0,
    oldBase: 'Consideration for transfer of immovable property or stamp duty value, whichever is higher',

    // Act 2025
    newSection: 'Section 393',
    newTable: 'Table 1',
    newTableItem: 'Item 9',
    newDescription: 'Consideration for transfer of immovable property',
    newSingleThreshold: 5000000,
    newAggregateThreshold: 5000000,
    newRateIndHuf: 1.0,
    newRateOther: 1.0,
    newBase: 'Higher of consideration or stamp duty value',

    panConditionRate: 20.0,
    exceptions: [
      'Total consideration and stamp duty value are both less than ₹50 Lakhs',
      'Agricultural land in non-urban area'
    ],
    specialConditions: [
      'Challan-cum-return in Form 26QB required within 30 days from end of month'
    ],
    triggerTiming: 'Earlier of credit or payment',
    depositDueRule: '30 days from the end of the month in which deduction is made (Form 26QB)',
    legalSource: 'Income-tax Act, 1961 s. 194-IA / Income-tax Act, 2025 s. 393 Table 1 Item 9',
    sourceReference: 'Finance Act amendments & Form 26QB guidelines',
    lastVerified: '2026-04-01'
  }
];

/**
 * Transition Rule:
 * Payment or credit on or before 31 March 2026 -> Income-tax Act, 1961
 * Payment or credit on or after 1 April 2026 -> Income-tax Act, 2025
 */
export const ACT_TRANSITION_DATE = '2026-04-01';

export function determineApplicableAct(paymentOrCreditDateStr: string): {
  act: 'Income-tax Act, 1961' | 'Income-tax Act, 2025';
  reason: string;
} {
  if (!paymentOrCreditDateStr) {
    return {
      act: 'Income-tax Act, 2025',
      reason: 'Current statutory period (post 1 April 2026) applied by default.'
    };
  }

  // Parse YYYY-MM-DD
  const date = new Date(paymentOrCreditDateStr);
  const transition = new Date(ACT_TRANSITION_DATE);

  if (isNaN(date.getTime())) {
    return {
      act: 'Income-tax Act, 2025',
      reason: 'Invalid date supplied; using current Income-tax Act, 2025.'
    };
  }

  if (date < transition) {
    return {
      act: 'Income-tax Act, 1961',
      reason: `Transaction credit/payment date (${paymentOrCreditDateStr}) falls on or before 31 March 2026; therefore governed by the Income-tax Act, 1961.`
    };
  } else {
    return {
      act: 'Income-tax Act, 2025',
      reason: `Transaction credit/payment date (${paymentOrCreditDateStr}) falls on or after 1 April 2026; therefore governed by the operative provisions of the Income-tax Act, 2025 (Section 393).`
    };
  }
}
