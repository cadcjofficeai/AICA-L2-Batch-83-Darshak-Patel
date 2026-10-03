/**
 * GST Input Tax Credit (ITC) Statutory Rules Master
 * Grounded in:
 * - Central Goods and Services Tax Act, 2017 (CGST Act)
 * - Section 16: Eligibility and conditions for taking credit
 * - Section 17: Apportionment of credit and blocked credits (Subsections 1, 2, 3, 4, 5)
 * - CGST Rules 36, 42, 43
 * - Relevant CBIC Circulars (e.g. Circular 172/04/2022-GST on Sec 17(5) perquisites and statutory obligations)
 */

export interface BlockedCreditRule {
  clause: string;
  category: string;
  description: string;
  blockedDetails: string;
  statutoryExceptions: string[];
  conditionalQuestions?: {
    key: string;
    question: string;
    ifTrue: 'Eligible' | 'Not Eligible';
    explanation: string;
  }[];
  legalProvision: string;
}

export const SECTION_17_5_BLOCKED_RULES: BlockedCreditRule[] = [
  {
    clause: '17(5)(a)',
    category: 'Motor Vehicles for Persons',
    description: 'Motor vehicles for transportation of persons having approved seating capacity of not more than 13 persons (including the driver)',
    blockedDetails: 'ITC is blocked on purchase, lease, or hire of passenger motor vehicles (cars, sedans, SUVs, small vans) having <= 13 seats.',
    statutoryExceptions: [
      'Used for further supply of such motor vehicles (motor vehicle dealers/distributors)',
      'Used for transportation of passengers (commercial passenger transport, taxi services, bus operators)',
      'Used for imparting training on driving such motor vehicles (driving schools)'
    ],
    conditionalQuestions: [
      {
        key: 'motor_vehicle_business_use',
        question: 'Is the vehicle used specifically for further taxable supply of vehicles, passenger transportation service, or driving school training?',
        ifTrue: 'Eligible',
        explanation: 'Statutory exception under Section 17(5)(a)(A)/(B)/(C) applies.'
      }
    ],
    legalProvision: 'Section 17(5)(a) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(ab)',
    category: 'Motor Vehicle Servicing, Insurance & Repairs',
    description: 'Services of general insurance, servicing, repair and maintenance relating to motor vehicles, vessels or aircraft',
    blockedDetails: 'ITC is blocked if relating to motor vehicles, vessels, or aircraft whose own credit is blocked under clause (a) or (aa).',
    statutoryExceptions: [
      'Received by a manufacturer of such motor vehicles, vessels or aircraft',
      'Received by a person supplying general insurance services in respect of such motor vehicles, vessels or aircraft',
      'Where the motor vehicle/vessel/aircraft itself is eligible for ITC (e.g. >13 seating capacity, commercial transport, goods carriage)'
    ],
    conditionalQuestions: [
      {
        key: 'servicing_for_eligible_vehicle',
        question: 'Does the repair, servicing, or insurance relate to a goods carriage, a vehicle with >13 seats, or an otherwise eligible vehicle?',
        ifTrue: 'Eligible',
        explanation: 'ITC is eligible because the underlying vehicle is not blocked under Section 17(5)(a).'
      }
    ],
    legalProvision: 'Section 17(5)(ab) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(b)(i)',
    category: 'Food, Beverages, Catering, Health & Personal Services',
    description: 'Food and beverages, outdoor catering, beauty treatment, health services, cosmetic and plastic surgery, life insurance and health insurance',
    blockedDetails: 'ITC blocked on food, staff catering, dining, executive health checkups, cosmetic surgery, and personal insurance.',
    statutoryExceptions: [
      'Inward supply of goods/services used for making an outward taxable supply of the same category of goods or services or as an element of a taxable composite or mixed supply',
      'Obligatory for an employer to provide to its employees under any law for the time being in force (e.g. mandatory statutory canteen under Factories Act, mandatory mediclaim under statutory directive/MHA order)'
    ],
    conditionalQuestions: [
      {
        key: 'statutory_obligation_catering_insurance',
        question: 'Is providing this service (e.g. canteen/mediclaim) mandatory by law/statutory order for the employer (e.g. Factories Act, 1948 s. 46)?',
        ifTrue: 'Eligible',
        explanation: 'Proviso to Section 17(5)(b) allows ITC where it is legally obligatory for employer to provide under any law.'
      },
      {
        key: 'same_category_outward_supply',
        question: 'Is this inward supply used directly to provide an outward taxable supply of the same category (e.g. sub-contracted catering)?',
        ifTrue: 'Eligible',
        explanation: 'Sub-clause (i) exception applies for outward taxable supply of the same category.'
      }
    ],
    legalProvision: 'Section 17(5)(b)(i) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(b)(ii)',
    category: 'Club & Fitness Memberships',
    description: 'Membership of a club, health and fitness centre',
    blockedDetails: 'ITC blocked on gym memberships, golf/recreational club subscriptions, and fitness center fees for directors/employees.',
    statutoryExceptions: [],
    legalProvision: 'Section 17(5)(b)(ii) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(b)(iii)',
    category: 'Travel Benefits to Employees',
    description: 'Travel benefits extended to employees on vacation such as leave or home travel concession (LTC/LTA)',
    blockedDetails: 'ITC blocked on holiday packages, personal tour packages, and vacation tickets provided to employees.',
    statutoryExceptions: [
      'Official business travel (air tickets, hotel accommodation for client meetings/business visits) is NOT blocked under 17(5)(b)(iii) as it is in the course of business under Section 16(1).'
    ],
    conditionalQuestions: [
      {
        key: 'official_business_travel',
        question: 'Is this travel expense strictly for official client/business travel (NOT personal vacation/LTC)?',
        ifTrue: 'Eligible',
        explanation: 'Official business travel is governed by Section 16(1) and is NOT blocked by Section 17(5)(b)(iii).'
      }
    ],
    legalProvision: 'Section 17(5)(b)(iii) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(c)',
    category: 'Works Contract for Immovable Property',
    description: 'Works contract services supplied for construction of an immovable property (other than plant and machinery)',
    blockedDetails: 'ITC blocked on civil contracts, structural renovation, factory building construction, office interior civil works capitalized to immovable property.',
    statutoryExceptions: [
      'Works contract services for Plant and Machinery (including apparatus, equipment, and machinery fixed to earth by foundation or structural support)',
      'Inward works contract service used as an input service for further supply of works contract service (sub-contractor to main works contractor)'
    ],
    conditionalQuestions: [
      {
        key: 'works_contract_plant_machinery',
        question: 'Is the works contract service specifically for installation/foundation/erection of "Plant and Machinery"?',
        ifTrue: 'Eligible',
        explanation: 'Section 17(5)(c) expressly excludes Plant and Machinery from blocked credit.'
      },
      {
        key: 'works_contract_subcontractor',
        question: 'Is the client a works contractor utilizing this service for making an outward taxable works contract supply?',
        ifTrue: 'Eligible',
        explanation: 'Statutory exception for input works contract service for outward works contract supply.'
      }
    ],
    legalProvision: 'Section 17(5)(c) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(d)',
    category: 'Goods/Services for Construction on Own Account',
    description: 'Goods or services or both received by a taxable person for construction of an immovable property (other than plant or machinery) on his own account including when used in course or furtherance of business',
    blockedDetails: 'ITC blocked on cement, steel, bricks, paints, architect services, civil engineering services capitalized to building/immovable property.',
    statutoryExceptions: [
      'Construction of Plant and Machinery (apparatus, equipment, pipeline outside factory not covered)',
      'Repairs/maintenance/renovation charged to revenue (profit and loss account) and NOT capitalized to immovable property asset account'
    ],
    conditionalQuestions: [
      {
        key: 'construction_charged_to_pnl',
        question: 'Are the goods/services charged to revenue (P&L account as repairs/maintenance) and NOT capitalized as immovable property?',
        ifTrue: 'Eligible',
        explanation: 'Explanation to Section 17(5)(d) states "construction" includes reconstruction/renovation only to the extent of capitalization to said immovable property.'
      },
      {
        key: 'construction_plant_machinery',
        question: 'Are the goods or services for construction/installation of Plant and Machinery?',
        ifTrue: 'Eligible',
        explanation: 'Plant and Machinery is specifically carved out from Section 17(5)(d).'
      }
    ],
    legalProvision: 'Section 17(5)(d) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(e)',
    category: 'Composition Levy Tax',
    description: 'Goods or services or both on which tax has been paid under section 10 (Composition scheme)',
    blockedDetails: 'No ITC is available on purchases from composition dealers (who are not legally allowed to collect GST from recipients).',
    statutoryExceptions: [],
    legalProvision: 'Section 17(5)(e) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(g)',
    category: 'Personal Consumption',
    description: 'Goods or services or both used for personal consumption',
    blockedDetails: 'ITC blocked on any expense incurred for personal use of proprietor, partners, directors, or employees not related to business furtherance.',
    statutoryExceptions: [],
    legalProvision: 'Section 17(5)(g) of the CGST Act, 2017'
  },
  {
    clause: '17(5)(h)',
    category: 'Goods Lost, Stolen, Destroyed, Written Off or Gifted',
    description: 'Goods lost, stolen, destroyed, written off or disposed of by way of gift or free samples',
    blockedDetails: 'ITC must be reversed or is blocked on inventory written off, damaged goods, promotional gifts, free samples given to dealers/customers.',
    statutoryExceptions: [
      'Buy-one-get-one offers or volume discounts given as commercial terms (Circular No. 92/11/2019-GST)'
    ],
    legalProvision: 'Section 17(5)(h) of the CGST Act, 2017'
  }
];

/**
 * Keyword and HSN/SAC Heuristic Detector for GST ITC Classification
 * Uses strict word-boundary matching and SAC code classification
 */
export function identifyPotentialBlockedCategory(description: string, hsnSac: string): BlockedCreditRule | null {
  const desc = (description || '').toLowerCase();
  const code = (hsnSac || '').trim();

  // 0. Whitelist standard professional and business services (Section 16(1) eligible)
  // 9983: Professional, technical and consultancy services
  // 9982: Legal and accounting services
  // 9984: Telecommunications and IT services
  // 9985: Support services (security, office admin)
  // 9986: Support to agriculture, mining, manufacturing
  // 9972: Real estate commercial lease/rent
  // 9965: Goods transport agency / Freight
  if (
    code.startsWith('9983') ||
    code.startsWith('9982') ||
    code.startsWith('9984') ||
    code.startsWith('9985') ||
    code.startsWith('9986') ||
    code.startsWith('9972') ||
    code.startsWith('9965') ||
    code.startsWith('9981')
  ) {
    // If it's expressly consultancy, IT, legal, audit, professional services - NOT BLOCKED
    if (!/\b(catering|restaurant|buffet|canteen|gym|club\s*membership)\b/i.test(desc)) {
      return null;
    }
  }

  // General business terms that should never be blocked
  if (/\b(consultancy|consulting|advisory|professional|legal|audit|software|devops|hosting|cloud|saas|maintenance|freight|courier)\b/i.test(desc)) {
    if (!/\b(catering|buffet|canteen|gym|club\s*membership|holiday\s*package|vacation)\b/i.test(desc)) {
      return null;
    }
  }

  // 1. Motor vehicle purchase (Clause 17(5)(a): Passenger motor vehicles seating capacity <= 13)
  if (
    code.startsWith('8703') ||
    /\b(passenger\s*car|motor\s*car|sedan|suv|hatchback|luxury\s*car|personal\s*car)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(a)') || null;
  }

  // 1b. Servicing / insurance of personal motor cars (Clause 17(5)(ab))
  if (
    (code === '998729' || code === '997134') ||
    /\b(car\s*insurance|car\s*servicing|motor\s*car\s*repair|car\s*maintenance|vehicle\s*servicing)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(ab)') || null;
  }

  // 2. Food & beverages, catering, personal health insurance (Clause 17(5)(b)(i))
  if (
    code.startsWith('9963') ||
    code === '997133' ||
    /\b(catering|canteen|food\s*and\s*beverages|outdoor\s*catering|restaurant\s*expense|buffet|lunch\s*expense|dinner\s*expense|health\s*insurance\s*for\s*employees|mediclaim\s*policy)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(b)(i)') || null;
  }

  // 3. Club / Gym membership (Clause 17(5)(b)(ii))
  if (
    /\b(club\s*membership|gym\s*membership|fitness\s*centre|fitness\s*club|recreational\s*club)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(b)(ii)') || null;
  }

  // 4. Employee personal vacation travel / LTC (Clause 17(5)(b)(iii))
  // Strict regex: must be full words 'lta' or 'ltc' or 'leave travel' or 'vacation tour'
  if (
    /\b(leave\s*travel\s*concession|leave\s*travel\s*allowance|\bltc\b|\blta\b|vacation\s*tour|holiday\s*package)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(b)(iii)') || null;
  }

  // 5. Civil works contract for building / immovable property (Clause 17(5)(c))
  if (
    code.startsWith('9954') ||
    /\b(civil\s*construction|building\s*construction|office\s*civil\s*works|structural\s*renovation)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(c)') || null;
  }

  // 6. Construction material for immovable property on own account (Clause 17(5)(d))
  if (
    code.startsWith('2523') || // Cement
    code.startsWith('7214') || // Steel bars
    /\b(cement\s*bags|ready\s*mix\s*concrete|\brmc\b|tmt\s*steel\s*bars|building\s*bricks)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(d)') || null;
  }

  // 7. Free samples / promotional gifts (Clause 17(5)(h))
  if (
    /\b(free\s*samples?|promotional\s*gifts?|complimentary\s*gifts?|goods\s*written\s*off)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(h)') || null;
  }

  // 8. Personal Consumption (Clause 17(5)(g))
  if (
    /\b(personal[-\s]*use|personal[-\s]*consumption|personal[-\s]*effects?|personal[-\s]*expense|non[-\s]*business[-\s]*use)\b/i.test(desc)
  ) {
    return SECTION_17_5_BLOCKED_RULES.find(r => r.clause === '17(5)(g)') || null;
  }

  return null;
}
