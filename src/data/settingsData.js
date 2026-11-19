import {
  LayoutDashboard,
  ShieldCheck,
  ListChecks,
  Wallet,
  Scale,
  Landmark,
  BadgeIndianRupee,
  CreditCard,
  Hash,
  Package,
  Truck,
  FileText,
  ScrollText,
  Building2,
  ListOrdered,
  Workflow,
  Bell,
  Shield,
  Users,
} from 'lucide-react';

export const SETTINGS_STORAGE_KEY = 'md-settings-v1';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'SGD'];
const DOCUMENTS = [
  'Engineering Drawing',
  'BOM',
  'Design Package',
  'Assembly Drawing',
  'ECR / ECO',
];
const ROLE_OPTIONS = [
  'Design Engineer',
  'Senior Design Engineer',
  'Design Lead',
  'Department Head',
  'Engineering Manager',
  'Procurement Manager',
  'Quality Head',
  'Manufacturing Head',
  'Finance Controller',
  'Managing Director',
];
const DEPARTMENTS = [
  'Mechanical Design',
  'Design Engineering',
  'Analysis & Validation',
  'CAD & Documentation',
  'Manufacturing Engineering',
  'Quality',
  'Projects',
  'Management',
];

export function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function fieldOptions(field) {
  return (field.options || []).map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  );
}

export function formatFieldValue(field, value) {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'toggle') return value ? 'Enabled' : 'Disabled';
  if (field.format === 'currency') return formatCurrency(value);
  if (field.format === 'percent') return `${value}%`;
  if (field.format === 'days') return `${value} day${Number(value) === 1 ? '' : 's'}`;
  if (field.type === 'date') {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (field.type === 'select') {
    const match = fieldOptions(field).find((option) => String(option.value) === String(value));
    return match?.label ?? value;
  }
  return String(value);
}

/**
 * Settings categories in the reference order. Each category owns its own
 * sections, fields and optional editable list, so no two configuration pages
 * are the same generic form.
 */
export const SETTINGS_CATEGORIES = [
  {
    key: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    tone: '#0b7a68',
    description: 'A summary of engineering configuration across the design office.',
    type: 'overview',
  },
  {
    key: 'approval-matrix',
    label: 'Approval Matrix',
    icon: ShieldCheck,
    tone: '#7c3aed',
    description:
      'Configure approval levels, role mapping, amount thresholds and escalation for engineering documents.',
    sections: [
      {
        key: 'thresholds',
        title: 'Approval Thresholds',
        description: 'Amount bands that decide how many approval levels a document needs.',
        fields: [
          { key: 'autoApproveBelow', label: 'Auto-approve below', type: 'number', default: 50000, min: 0, required: true, format: 'currency', hint: 'Documents below this value need no approval.' },
          { key: 'twoLevelAbove', label: 'Two-level approval above', type: 'number', default: 250000, min: 0, required: true, format: 'currency' },
          { key: 'financeApprovalAbove', label: 'Finance approval above', type: 'number', default: 1000000, min: 0, required: true, format: 'currency' },
          { key: 'allowParallelApproval', label: 'Allow parallel approval', type: 'toggle', default: true, hint: 'Levels at the same threshold may approve simultaneously.' },
        ],
      },
      {
        key: 'mapping',
        title: 'Department / Role Mapping',
        description: 'Default owners for design and engineering approvals.',
        fields: [
          { key: 'departmentScope', label: 'Department scope', type: 'select', default: 'All design departments', options: ['All design departments', 'Mechanical Design', 'CAD & Documentation', 'Analysis & Validation'] },
          { key: 'departmentHeadRole', label: 'Department head role', type: 'select', default: 'Design Lead', options: ROLE_OPTIONS },
          { key: 'fallbackApprover', label: 'Fallback approver', type: 'select', default: 'Engineering Manager', options: ROLE_OPTIONS },
          { key: 'includeProjectOwner', label: 'Include project owner', type: 'toggle', default: true, hint: 'Add the project owner to the approval chain.' },
        ],
      },
      {
        key: 'sequence',
        title: 'Approval Sequence',
        description: 'How the configured levels are presented to approvers.',
        fields: [
          { key: 'sequenceMode', label: 'Sequence mode', type: 'select', default: 'Sequential', options: ['Sequential', 'Parallel', 'Conditional'] },
          { key: 'defaultSlaDays', label: 'Default approval SLA', type: 'number', default: 3, min: 1, max: 30, required: true, format: 'days' },
          { key: 'escalationDays', label: 'Escalate after', type: 'number', default: 2, min: 1, max: 30, required: true, format: 'days' },
          { key: 'allowDelegation', label: 'Allow delegation', type: 'toggle', default: true },
          { key: 'notifyOnEscalation', label: 'Notify on escalation', type: 'toggle', default: true },
        ],
      },
    ],
    list: {
      key: 'levels',
      title: 'Approval Levels',
      description: 'The order below is the approval sequence. Use the edit screen to reorder levels.',
      addLabel: 'Add Level',
      itemLabel: 'Level',
      reorder: true,
      fields: [
        { key: 'role', label: 'Approver role', type: 'select', default: 'Design Lead', options: ROLE_OPTIONS, required: true },
        { key: 'minAmount', label: 'Min amount', type: 'number', default: 0, min: 0, required: true, format: 'currency' },
        { key: 'maxAmount', label: 'Max amount', type: 'number', default: 50000, min: 0, required: true, format: 'currency', hint: 'Use 0 for no upper limit.' },
        { key: 'slaDays', label: 'SLA (days)', type: 'number', default: 2, min: 1, max: 30, required: true },
        { key: 'fallback', label: 'Fallback approver', type: 'text', default: '', placeholder: 'Optional' },
        { key: 'escalationDays', label: 'Escalation (days)', type: 'number', default: 3, min: 1, max: 30 },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'level-1', role: 'Department Head', minAmount: 0, maxAmount: 50000, slaDays: 2, fallback: 'Design Lead', escalationDays: 3, active: true },
        { id: 'level-2', role: 'Design Lead', minAmount: 50001, maxAmount: 250000, slaDays: 3, fallback: 'Engineering Manager', escalationDays: 4, active: true },
        { id: 'level-3', role: 'Finance Controller', minAmount: 250001, maxAmount: 1000000, slaDays: 4, fallback: 'Managing Director', escalationDays: 5, active: true },
        { id: 'level-4', role: 'Managing Director', minAmount: 1000001, maxAmount: 0, slaDays: 5, fallback: '', escalationDays: 7, active: true },
      ],
    },
    summary: (config) =>
      `${config.levels.filter((level) => level.active).length} levels · Auto-approve below ${formatCurrency(config.autoApproveBelow)}`,
  },
  {
    key: 'approval-rules',
    label: 'Approval Rules',
    icon: ListChecks,
    tone: '#0b7a68',
    description:
      'Define conditional approval rules, applicable engineering documents, priorities and routing behaviour.',
    sections: [
      {
        key: 'rule-overview',
        title: 'Rule Overview',
        description: 'Global controls for conditional approval routing.',
        fields: [
          { key: 'rulesEnabled', label: 'Enable approval rules', type: 'toggle', default: true },
          { key: 'defaultRouting', label: 'Default routing', type: 'select', default: 'Approval matrix', options: ['Approval matrix', 'Rule priority', 'Document owner'] },
          { key: 'stopOnRejection', label: 'Stop on rejection', type: 'toggle', default: true, hint: 'End the chain when any rule rejects the document.' },
          { key: 'maxActiveRules', label: 'Maximum active rules', type: 'number', default: 8, min: 1, max: 25, required: true },
        ],
      },
      {
        key: 'conditions',
        title: 'Conditions',
        description: 'Defaults used when a rule condition is evaluated.',
        fields: [
          { key: 'conditionMode', label: 'Condition match', type: 'select', default: 'All conditions', options: ['All conditions', 'Any condition'] },
          { key: 'conditionField', label: 'Default condition field', type: 'select', default: 'Document value', options: ['Document value', 'Project value', 'Part category', 'Revision type'] },
          { key: 'defaultCondition', label: 'Default condition note', type: 'textarea', default: 'Route to the department head when the design value exceeds the standard threshold.', wide: true },
        ],
      },
      {
        key: 'priority',
        title: 'Priority & Escalation',
        description: 'How conflicting rules and overdue approvals are handled.',
        fields: [
          { key: 'priorityOrder', label: 'Priority order', type: 'select', default: 'Highest priority first', options: ['Highest priority first', 'Lowest priority first', 'Most specific rule first'] },
          { key: 'escalationAfterDays', label: 'Escalate rule after', type: 'number', default: 3, min: 1, max: 30, format: 'days' },
          { key: 'notifyApprover', label: 'Notify approver on rule match', type: 'toggle', default: true },
          { key: 'notifyRequester', label: 'Notify requester on outcome', type: 'toggle', default: true },
        ],
      },
    ],
    list: {
      key: 'rules',
      title: 'Configured Rules',
      description: 'Rules are evaluated by priority. Each rule can be enabled or disabled independently.',
      addLabel: 'Add Rule',
      itemLabel: 'Rule',
      fields: [
        { key: 'name', label: 'Rule name', type: 'text', default: 'New approval rule', required: true },
        { key: 'document', label: 'Applicable document', type: 'select', default: 'Engineering Drawing', options: DOCUMENTS, required: true },
        { key: 'condition', label: 'Condition', type: 'text', default: 'Value exceeds standard threshold', required: true },
        { key: 'requirement', label: 'Approval requirement', type: 'select', default: 'Department head approval', options: ['Department head approval', 'Two-level approval', 'Engineering manager approval', 'Finance approval', 'Quality approval'] },
        { key: 'priority', label: 'Priority', type: 'select', default: 'Medium', options: ['High', 'Medium', 'Low'] },
        { key: 'active', label: 'Enabled', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'rule-1', name: 'High-value drawing release', document: 'Engineering Drawing', condition: 'Estimated design value above ₹2,50,000', requirement: 'Two-level approval', priority: 'High', active: true },
        { id: 'rule-2', name: 'BOM cost variance', document: 'BOM', condition: 'BOM exceeds approved cost estimate by 5%', requirement: 'Finance approval', priority: 'High', active: true },
        { id: 'rule-3', name: 'Manufacturing change', document: 'ECR / ECO', condition: 'Change affects a released manufacturing drawing', requirement: 'Engineering manager approval', priority: 'Medium', active: true },
        { id: 'rule-4', name: 'Client drawing issue', document: 'Design Package', condition: 'Package includes a client-facing drawing', requirement: 'Department head approval', priority: 'Low', active: true },
      ],
    },
    summary: (config) =>
      `${config.rules.filter((rule) => rule.active).length} enabled rules · ${config.priorityOrder.toLowerCase()}`,
  },
  {
    key: 'budget-control',
    label: 'Budget Control',
    icon: Wallet,
    tone: '#f59e0b',
    description:
      'Set project budget defaults, engineering cost limits, warning thresholds and budget control preferences.',
    sections: [
      {
        key: 'budget-config',
        title: 'Budget Configuration',
        description: 'The financial frame used for design projects and estimates.',
        fields: [
          { key: 'budgetControlEnabled', label: 'Enable budget control', type: 'toggle', default: true },
          { key: 'fiscalYear', label: 'Fiscal year', type: 'select', default: 'April 2026 – March 2027', options: ['April 2026 – March 2027', 'January 2026 – December 2026', 'April 2025 – March 2026'] },
          { key: 'currency', label: 'Budget currency', type: 'select', default: 'INR', options: CURRENCIES },
          { key: 'budgetPeriod', label: 'Default budget period', type: 'select', default: 'Project duration', options: ['Project duration', 'Monthly', 'Quarterly'] },
        ],
      },
      {
        key: 'project-budget',
        title: 'Project Budget Settings',
        description: 'Defaults applied to new mechanical design projects.',
        fields: [
          { key: 'defaultProjectBudget', label: 'Default project budget', type: 'number', default: 1500000, min: 0, required: true, format: 'currency' },
          { key: 'requireApprovedBudget', label: 'Require approved budget', type: 'toggle', default: true, hint: 'Block project design work until a budget is approved.' },
          { key: 'allowBudgetOverride', label: 'Allow budget override', type: 'toggle', default: false },
          { key: 'overrideRole', label: 'Override role', type: 'select', default: 'Finance Controller', options: ROLE_OPTIONS },
        ],
      },
      {
        key: 'engineering-limits',
        title: 'Engineering Budget Limits',
        description: 'Cost ceilings for the core engineering activities.',
        fields: [
          { key: 'engineeringMaterialLimit', label: 'Material & prototype limit', type: 'number', default: 600000, min: 0, format: 'currency' },
          { key: 'engineeringLabourLimit', label: 'Engineering labour limit', type: 'number', default: 450000, min: 0, format: 'currency' },
          { key: 'designCostPerHour', label: 'Maximum design cost per hour', type: 'number', default: 1800, min: 0, format: 'currency' },
          { key: 'analysisCostLimit', label: 'Analysis & validation limit', type: 'number', default: 150000, min: 0, format: 'currency' },
        ],
      },
      {
        key: 'thresholds',
        title: 'Cost Thresholds',
        description: 'Variance bands that trigger a warning or a block.',
        fields: [
          { key: 'warningThreshold', label: 'Warning threshold', type: 'number', default: 80, min: 1, max: 100, required: true, format: 'percent' },
          { key: 'criticalThreshold', label: 'Critical threshold', type: 'number', default: 95, min: 1, max: 100, required: true, format: 'percent' },
          { key: 'varianceTolerance', label: 'Cost variance tolerance', type: 'number', default: 5, min: 0, max: 50, required: true, format: 'percent' },
        ],
      },
      {
        key: 'warning-rules',
        title: 'Budget Warning Rules',
        description: 'Who is told, and what is blocked, as spend approaches the limit.',
        fields: [
          { key: 'warnAtCommitment', label: 'Warn at commitment', type: 'toggle', default: true },
          { key: 'blockOverrun', label: 'Block budget overrun', type: 'toggle', default: true },
          { key: 'notifyBudgetOwner', label: 'Notify budget owner', type: 'toggle', default: true },
          { key: 'notificationRole', label: 'Budget owner', type: 'select', default: 'Engineering Manager', options: ROLE_OPTIONS },
        ],
      },
    ],
    summary: (config) =>
      `Warning at ${config.warningThreshold}% · ${config.blockOverrun ? 'overrun blocked' : 'overrun allowed'} · ${config.currency}`,
  },
  {
    key: '3-way-matching',
    label: '3-Way Matching',
    icon: Scale,
    tone: '#8b5cf6',
    description:
      'Configure shared purchase-order, goods-receipt and invoice matching references, tolerances and exception handling.',
    sections: [
      {
        key: 'matching',
        title: 'Matching Configuration',
        description: 'The shared ERP reference used when design transfers reach procurement.',
        fields: [
          { key: 'matchingEnabled', label: 'Enable 3-way matching', type: 'toggle', default: true },
          { key: 'matchMode', label: 'Matching mode', type: 'select', default: 'Full match', options: ['Full match', 'Tolerance match', 'Manual review'] },
          { key: 'autoMatch', label: 'Automatic matching', type: 'toggle', default: true, hint: 'Match documents automatically when all references are present.' },
          { key: 'tolerancePercent', label: 'Default tolerance', type: 'number', default: 2, min: 0, max: 25, required: true, format: 'percent' },
        ],
      },
      {
        key: 'po-reference',
        title: 'Purchase Order Reference',
        description: 'How purchase orders are referenced on matched invoices.',
        fields: [
          { key: 'requirePO', label: 'Require purchase order', type: 'toggle', default: true },
          { key: 'poTolerance', label: 'PO value tolerance', type: 'number', default: 2, min: 0, max: 25, format: 'percent' },
          { key: 'allowPOAmendment', label: 'Allow amended PO reference', type: 'toggle', default: true },
        ],
      },
      {
        key: 'receipt-reference',
        title: 'Goods Receipt Reference',
        description: 'Receipt requirements for quantity and delivery validation.',
        fields: [
          { key: 'requireGRN', label: 'Require goods receipt', type: 'toggle', default: true },
          { key: 'grnTolerance', label: 'Quantity tolerance', type: 'number', default: 3, min: 0, max: 25, format: 'percent' },
          { key: 'partialReceiptAllowed', label: 'Allow partial receipts', type: 'toggle', default: true },
        ],
      },
      {
        key: 'invoice-reference',
        title: 'Invoice Reference',
        description: 'Invoice validation preferences for shared ERP documents.',
        fields: [
          { key: 'requireInvoice', label: 'Require invoice reference', type: 'toggle', default: true },
          { key: 'invoiceTolerance', label: 'Invoice value tolerance', type: 'number', default: 2, min: 0, max: 25, format: 'percent' },
          { key: 'duplicateInvoiceCheck', label: 'Check duplicate invoices', type: 'toggle', default: true },
        ],
      },
      {
        key: 'exceptions',
        title: 'Exception Handling',
        description: 'Where unmatched or out-of-tolerance documents are routed.',
        fields: [
          { key: 'exceptionQueue', label: 'Exception queue owner', type: 'select', default: 'Finance Controller', options: ROLE_OPTIONS },
          { key: 'notifyOnException', label: 'Notify on exception', type: 'toggle', default: true },
          { key: 'requireExceptionApproval', label: 'Require exception approval', type: 'toggle', default: true },
          { key: 'exceptionNote', label: 'Exception note', type: 'textarea', default: 'Exceptions are held for finance review and are not auto-posted.', wide: true },
        ],
      },
    ],
    summary: (config) =>
      `${config.matchMode} · ±${config.tolerancePercent}% tolerance · ${config.autoMatch ? 'auto-match on' : 'manual review'}`,
  },
  {
    key: 'tax-settings',
    label: 'Tax Settings',
    icon: Landmark,
    tone: '#2563eb',
    description:
      'Maintain tax categories, GST information, applicable rates and default tax preferences for design documents.',
    sections: [
      {
        key: 'tax-config',
        title: 'Tax Configuration',
        description: 'Core tax behaviour for estimates, invoices and document output.',
        fields: [
          { key: 'taxEnabled', label: 'Enable tax configuration', type: 'toggle', default: true },
          { key: 'defaultTaxCategory', label: 'Default tax category', type: 'select', default: 'GST – Services', options: ['GST – Services', 'GST – Goods', 'Exempt', 'Reverse charge'] },
          { key: 'pricesIncludeTax', label: 'Prices include tax', type: 'toggle', default: false },
          { key: 'calculationMode', label: 'Calculation mode', type: 'select', default: 'Line level', options: ['Line level', 'Document level', 'Both'] },
        ],
      },
      {
        key: 'gst',
        title: 'GST Configuration',
        description: 'Registered entity and filing defaults.',
        fields: [
          { key: 'gstin', label: 'GSTIN', type: 'text', default: '27AAMCA1234F1Z8', required: true },
          { key: 'stateCode', label: 'State code', type: 'text', default: '27 – Maharashtra', required: true },
          { key: 'filingFrequency', label: 'Filing frequency', type: 'select', default: 'Monthly', options: ['Monthly', 'Quarterly', 'Annually'] },
          { key: 'reverseCharge', label: 'Apply reverse charge by default', type: 'toggle', default: false },
        ],
      },
      {
        key: 'tax-defaults',
        title: 'Default Tax Preferences',
        description: 'Values pre-filled on new estimates and tax references.',
        fields: [
          { key: 'defaultGstRate', label: 'Default GST rate', type: 'number', default: 18, min: 0, max: 100, required: true, format: 'percent' },
          { key: 'defaultHsnCode', label: 'Default HSN / SAC code', type: 'text', default: '998873', required: true },
          { key: 'placeOfSupply', label: 'Place of supply', type: 'text', default: 'Maharashtra' },
          { key: 'taxRounding', label: 'Tax rounding', type: 'select', default: 'Nearest rupee', options: ['Nearest rupee', 'Two decimals', 'No rounding'] },
        ],
      },
    ],
    list: {
      key: 'rates',
      title: 'Applicable Tax Rates',
      description: 'Tax rates available for selection on engineering estimates and invoices.',
      addLabel: 'Add Tax Rate',
      itemLabel: 'Tax rate',
      fields: [
        { key: 'name', label: 'Tax name', type: 'text', default: 'New GST rate', required: true },
        { key: 'rate', label: 'Rate', type: 'number', default: 18, min: 0, max: 100, required: true, format: 'percent' },
        { key: 'type', label: 'Tax type', type: 'select', default: 'GST', options: ['GST', 'IGST', 'CGST + SGST', 'Exempt'] },
        { key: 'effectiveFrom', label: 'Effective from', type: 'date', default: '2026-04-01', required: true },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'tax-1', name: 'GST 5%', rate: 5, type: 'GST', effectiveFrom: '2026-04-01', active: true },
        { id: 'tax-2', name: 'GST 12%', rate: 12, type: 'GST', effectiveFrom: '2026-04-01', active: true },
        { id: 'tax-3', name: 'GST 18%', rate: 18, type: 'GST', effectiveFrom: '2026-04-01', active: true },
        { id: 'tax-4', name: 'GST 28%', rate: 28, type: 'GST', effectiveFrom: '2026-04-01', active: false },
        { id: 'tax-5', name: 'IGST 18%', rate: 18, type: 'IGST', effectiveFrom: '2026-04-01', active: true },
        { id: 'tax-6', name: 'Exempt – R&D services', rate: 0, type: 'Exempt', effectiveFrom: '2026-04-01', active: true },
        { id: 'tax-7', name: 'CGST + SGST 9% + 9%', rate: 18, type: 'CGST + SGST', effectiveFrom: '2026-04-01', active: true },
      ],
    },
    summary: (config) =>
      `${config.rates.filter((rate) => rate.active).length} active rates · Default ${config.defaultGstRate}% GST`,
  },
  {
    key: 'currency-exchange-rates',
    label: 'Currency & Exchange Rates',
    icon: BadgeIndianRupee,
    tone: '#0ea5e9',
    description:
      'Set the base currency, supported currencies, exchange-rate sources, effective dates and display preferences.',
    sections: [
      {
        key: 'base-currency',
        title: 'Base Currency',
        description: 'The reporting currency for estimates, budgets and dashboard values.',
        fields: [
          { key: 'baseCurrency', label: 'Base currency', type: 'select', default: 'INR', options: CURRENCIES, required: true },
          { key: 'locale', label: 'Number locale', type: 'select', default: 'en-IN', options: ['en-IN', 'en-US', 'en-GB'] },
          { key: 'decimalPlaces', label: 'Decimal places', type: 'number', default: 2, min: 0, max: 4, required: true },
        ],
      },
      {
        key: 'rate-config',
        title: 'Exchange Rate Configuration',
        description: 'How foreign-currency rates are maintained.',
        fields: [
          { key: 'rateSource', label: 'Rate source', type: 'select', default: 'Manual entry', options: ['Manual entry', 'Reserve Bank reference', 'ERP treasury feed'] },
          { key: 'updateFrequency', label: 'Update frequency', type: 'select', default: 'Monthly', options: ['Daily', 'Weekly', 'Monthly', 'Manual'] },
          { key: 'autoUpdate', label: 'Auto-update rates', type: 'toggle', default: false },
          { key: 'varianceAlert', label: 'Rate variance alert', type: 'number', default: 3, min: 0, max: 25, format: 'percent' },
        ],
      },
      {
        key: 'display',
        title: 'Currency Display Preferences',
        description: 'Formatting used across estimates, BOM costs and document output.',
        fields: [
          { key: 'symbolPosition', label: 'Symbol position', type: 'select', default: 'Before amount', options: ['Before amount', 'After amount'] },
          { key: 'thousandSeparator', label: 'Thousand separator', type: 'select', default: 'Indian (1,00,000)', options: ['Indian (1,00,000)', 'Western (100,000)'] },
          { key: 'showCurrencyCode', label: 'Show currency code', type: 'toggle', default: true },
          { key: 'roundTotals', label: 'Round displayed totals', type: 'toggle', default: true },
        ],
      },
    ],
    list: {
      key: 'rates',
      title: 'Supported Currencies & Rates',
      description: 'Each supported currency has one effective rate against the base currency.',
      addLabel: 'Add Currency',
      itemLabel: 'Currency',
      fields: [
        { key: 'currency', label: 'Currency', type: 'select', default: 'USD', options: CURRENCIES.filter((currency) => currency !== 'INR'), required: true },
        { key: 'name', label: 'Currency name', type: 'text', default: 'US Dollar', required: true },
        { key: 'rate', label: 'Rate to INR', type: 'number', default: 83.2, min: 0.0001, step: '0.0001', required: true },
        { key: 'effectiveDate', label: 'Effective date', type: 'date', default: '2026-04-01', required: true },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'fx-1', currency: 'USD', name: 'US Dollar', rate: 83.42, effectiveDate: '2026-04-01', active: true },
        { id: 'fx-2', currency: 'EUR', name: 'Euro', rate: 90.18, effectiveDate: '2026-04-01', active: true },
        { id: 'fx-3', currency: 'GBP', name: 'Pound Sterling', rate: 105.64, effectiveDate: '2026-04-01', active: true },
        { id: 'fx-4', currency: 'AED', name: 'UAE Dirham', rate: 22.71, effectiveDate: '2026-04-01', active: true },
        { id: 'fx-5', currency: 'JPY', name: 'Japanese Yen', rate: 0.56, effectiveDate: '2026-04-01', active: true },
        { id: 'fx-6', currency: 'SGD', name: 'Singapore Dollar', rate: 61.9, effectiveDate: '2026-03-15', active: false },
      ],
    },
    summary: (config) =>
      `Base ${config.baseCurrency} · ${config.rates.filter((rate) => rate.active).length} currencies configured`,
  },
  {
    key: 'payment-terms',
    label: 'Payment Terms',
    icon: CreditCard,
    tone: '#059669',
    description:
      'Maintain payment-term options, default due periods, advance-payment rules and credit-period settings.',
    sections: [
      {
        key: 'default-terms',
        title: 'Default Payment Terms',
        description: 'Applied to new design-service and prototype purchase records.',
        fields: [
          { key: 'defaultTerm', label: 'Default payment term', type: 'select', default: 'Net 30', options: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Advance 50% / Net 30'] },
          { key: 'creditDays', label: 'Default credit period', type: 'number', default: 30, min: 0, max: 180, required: true, format: 'days' },
          { key: 'advancePercent', label: 'Default advance', type: 'number', default: 30, min: 0, max: 100, format: 'percent' },
          { key: 'requireAdvance', label: 'Require advance payment', type: 'toggle', default: false },
        ],
      },
      {
        key: 'due-period',
        title: 'Payment Due Period',
        description: 'How due dates are calculated and adjusted.',
        fields: [
          { key: 'dueDateBasis', label: 'Due date basis', type: 'select', default: 'Invoice date', options: ['Invoice date', 'Goods receipt date', 'Milestone completion date'] },
          { key: 'graceDays', label: 'Grace period', type: 'number', default: 5, min: 0, max: 60, format: 'days' },
          { key: 'weekendAdjustment', label: 'Weekend adjustment', type: 'select', default: 'Next working day', options: ['None', 'Next working day', 'Previous working day'] },
          { key: 'lateFee', label: 'Late fee', type: 'number', default: 1.5, min: 0, max: 10, step: '0.1', format: 'percent' },
        ],
      },
      {
        key: 'advance',
        title: 'Advance Payment Configuration',
        description: 'Controls applied when a project or prototype order needs an advance.',
        fields: [
          { key: 'advanceRequired', label: 'Advance required above', type: 'number', default: 500000, min: 0, format: 'currency' },
          { key: 'advanceMode', label: 'Advance mode', type: 'select', default: 'Percentage', options: ['Percentage', 'Fixed amount'] },
          { key: 'advanceApproval', label: 'Advance approval role', type: 'select', default: 'Finance Controller', options: ROLE_OPTIONS },
          { key: 'notifyOnDue', label: 'Notify before due date', type: 'toggle', default: true },
        ],
      },
    ],
    list: {
      key: 'terms',
      title: 'Payment Term Options',
      description: 'The selectable terms available to project and procurement teams.',
      addLabel: 'Add Payment Term',
      itemLabel: 'Payment term',
      fields: [
        { key: 'name', label: 'Term name', type: 'text', default: 'Net 30', required: true },
        { key: 'dueDays', label: 'Due days', type: 'number', default: 30, min: 0, max: 180, required: true },
        { key: 'advancePercent', label: 'Advance %', type: 'number', default: 0, min: 0, max: 100 },
        { key: 'creditLimit', label: 'Credit limit', type: 'number', default: 1000000, min: 0, format: 'currency' },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'term-1', name: 'Advance 100%', dueDays: 0, advancePercent: 100, creditLimit: 0, active: true },
        { id: 'term-2', name: 'Advance 50% / Net 30', dueDays: 30, advancePercent: 50, creditLimit: 1500000, active: true },
        { id: 'term-3', name: 'Net 15', dueDays: 15, advancePercent: 0, creditLimit: 1000000, active: true },
        { id: 'term-4', name: 'Net 30', dueDays: 30, advancePercent: 0, creditLimit: 2500000, active: true },
        { id: 'term-5', name: 'Net 45', dueDays: 45, advancePercent: 0, creditLimit: 3000000, active: true },
        { id: 'term-6', name: 'Net 60', dueDays: 60, advancePercent: 0, creditLimit: 5000000, active: true },
        { id: 'term-7', name: 'Milestone based', dueDays: 30, advancePercent: 20, creditLimit: 5000000, active: false },
        { id: 'term-8', name: 'Retention 10% / Net 30', dueDays: 30, advancePercent: 0, creditLimit: 2000000, active: true },
      ],
    },
    summary: (config) =>
      `${config.terms.filter((term) => term.active).length} active terms · Default ${config.defaultTerm}`,
  },
  {
    key: 'hsn-sac',
    label: 'HSN / SAC',
    icon: Hash,
    tone: '#e11d48',
    description:
      'Maintain the HSN and SAC reference list used to classify engineering services, goods and prototype items.',
    sections: [
      {
        key: 'reference',
        title: 'Reference List Preferences',
        description: 'How codes are validated and offered during data entry.',
        fields: [
          { key: 'validationEnabled', label: 'Enable code validation', type: 'toggle', default: true },
          { key: 'defaultCategory', label: 'Default category', type: 'select', default: 'Engineering services', options: ['Engineering services', 'Machined parts', 'Fabricated assemblies', 'Prototype goods', 'Software & CAD'] },
          { key: 'allowCustomCodes', label: 'Allow custom codes', type: 'toggle', default: false },
          { key: 'requireDescription', label: 'Require description', type: 'toggle', default: true },
        ],
      },
      {
        key: 'classification',
        title: 'Tax Classification',
        description: 'Default classification applied to newly added reference codes.',
        fields: [
          { key: 'taxClassification', label: 'Default tax classification', type: 'select', default: 'GST 18%', options: ['GST 5%', 'GST 12%', 'GST 18%', 'GST 28%', 'Exempt'] },
          { key: 'autoSuggest', label: 'Auto-suggest codes', type: 'toggle', default: true },
          { key: 'classificationNote', label: 'Classification note', type: 'textarea', default: 'Engineering design services are classified under SAC 998873.', wide: true },
        ],
      },
      {
        key: 'search',
        title: 'Search & Filter Preferences',
        description: 'Defaults for the reference lookup experience.',
        fields: [
          { key: 'showInactive', label: 'Show inactive codes', type: 'toggle', default: false },
          { key: 'searchScope', label: 'Search scope', type: 'select', default: 'Code and description', options: ['Code only', 'Description only', 'Code and description'] },
          { key: 'rowsPerPage', label: 'Rows per page', type: 'select', default: '10', options: ['10', '25', '50'] },
        ],
      },
    ],
    list: {
      key: 'codes',
      title: 'HSN / SAC Reference List',
      description: 'Searchable codes used on engineering estimates and invoices.',
      addLabel: 'Add Reference Code',
      itemLabel: 'Reference code',
      searchable: true,
      fields: [
        { key: 'code', label: 'Code', type: 'text', default: '998873', required: true },
        { key: 'description', label: 'Description', type: 'text', default: 'Engineering design services', required: true },
        { key: 'category', label: 'Category', type: 'select', default: 'Engineering services', options: ['Engineering services', 'Machined parts', 'Fabricated assemblies', 'Prototype goods', 'Software & CAD'] },
        { key: 'taxClassification', label: 'Tax classification', type: 'select', default: 'GST 18%', options: ['GST 5%', 'GST 12%', 'GST 18%', 'GST 28%', 'Exempt'] },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'hsn-1', code: '998873', description: 'Engineering design and drafting services', category: 'Engineering services', taxClassification: 'GST 18%', active: true },
        { id: 'hsn-2', code: '998874', description: 'Engineering consultancy and technical review', category: 'Engineering services', taxClassification: 'GST 18%', active: true },
        { id: 'hsn-3', code: '998875', description: 'CAD modelling and simulation services', category: 'Software & CAD', taxClassification: 'GST 18%', active: true },
        { id: 'hsn-4', code: '73269099', description: 'Fabricated steel components, machined', category: 'Machined parts', taxClassification: 'GST 18%', active: true },
        { id: 'hsn-5', code: '84834000', description: 'Gears, gearboxes and transmission assemblies', category: 'Prototype goods', taxClassification: 'GST 18%', active: true },
        { id: 'hsn-6', code: '90278090', description: 'Prototype inspection and measurement instruments', category: 'Prototype goods', taxClassification: 'GST 12%', active: false },
      ],
    },
    summary: (config) =>
      `${config.codes.filter((code) => code.active).length} active codes · ${config.taxClassification} default`,
  },
  {
    key: 'items-products',
    label: 'Items / Products',
    icon: Package,
    tone: '#0891b2',
    description:
      'Configure engineering item categories, product classification, part numbering preferences, default units and material references.',
    sections: [
      {
        key: 'item-categories',
        title: 'Engineering Item Categories',
        description: 'Top-level categories used by design and BOM teams.',
        fields: [
          { key: 'defaultCategory', label: 'Default item category', type: 'select', default: 'Machined component', options: ['Machined component', 'Sheet metal part', 'Assembly', 'Standard component', 'Prototype'] },
          { key: 'categoryPrefix', label: 'Category prefix', type: 'text', default: 'MD', required: true },
          { key: 'allowSubcategories', label: 'Allow subcategories', type: 'toggle', default: true },
          { key: 'requireCategory', label: 'Require category on create', type: 'toggle', default: true },
        ],
      },
      {
        key: 'classification',
        title: 'Product Classification',
        description: 'Classification rules for new mechanical items.',
        fields: [
          { key: 'classificationScheme', label: 'Classification scheme', type: 'select', default: 'Mechanical function', options: ['Mechanical function', 'Material family', 'Manufacturing process', 'Custom'] },
          { key: 'defaultProductType', label: 'Default product type', type: 'select', default: 'Component', options: ['Component', 'Sub-assembly', 'Assembly', 'Product'] },
          { key: 'requireMaterialGrade', label: 'Require material grade', type: 'toggle', default: true },
        ],
      },
      {
        key: 'part-categories',
        title: 'Part Categories',
        description: 'Part-level defaults aligned with Module 05 without duplicating its register.',
        fields: [
          { key: 'partPrefix', label: 'Part prefix', type: 'text', default: 'PT', required: true },
          { key: 'defaultPartCategory', label: 'Default part category', type: 'select', default: 'Machined', options: ['Machined', 'Fabricated', 'Cast', 'Purchased standard', '3D printed'] },
          { key: 'revisionOnCreate', label: 'Start revision numbering on create', type: 'toggle', default: true },
        ],
      },
      {
        key: 'numbering',
        title: 'Item Numbering Preferences',
        description: 'Pattern used when a new design item is registered.',
        fields: [
          { key: 'itemNumberPattern', label: 'Item number pattern', type: 'text', default: 'MD-{CAT}-{SEQ}', required: true, hint: 'Use {CAT} for category and {SEQ} for the sequence.' },
          { key: 'sequenceDigits', label: 'Sequence digits', type: 'number', default: 4, min: 2, max: 8, required: true },
          { key: 'nextSequence', label: 'Next item sequence', type: 'number', default: 148, min: 1, required: true },
        ],
      },
      {
        key: 'units',
        title: 'Default Units',
        description: 'Units prefilled on new part and material references.',
        fields: [
          { key: 'defaultUnit', label: 'Default unit', type: 'select', default: 'Nos', options: ['Nos', 'kg', 'm', 'set', 'litre'] },
          { key: 'weightUnit', label: 'Weight unit', type: 'select', default: 'kg', options: ['kg', 'g', 'tonne'] },
          { key: 'dimensionUnit', label: 'Dimension unit', type: 'select', default: 'mm', options: ['mm', 'cm', 'm', 'inch'] },
        ],
      },
      {
        key: 'material-reference',
        title: 'Material / Item Reference Settings',
        description: 'How material references link to engineering items.',
        fields: [
          { key: 'requireMaterialCode', label: 'Require material code', type: 'toggle', default: true },
          { key: 'allowAlternateMaterials', label: 'Allow alternate materials', type: 'toggle', default: true },
          { key: 'referenceSource', label: 'Reference source', type: 'select', default: 'Material master', options: ['Material master', 'Manual entry', 'ERP shared reference'] },
        ],
      },
    ],
    summary: (config) =>
      `${config.defaultCategory} · ${config.defaultUnit} default unit · ${config.defaultPartCategory} parts`,
  },
  {
    key: 'logistics-defaults',
    label: 'Logistics Defaults',
    icon: Truck,
    tone: '#0d9488',
    description:
      'Set delivery terms, shipping, packaging and transport defaults, plus dispatch document preferences.',
    sections: [
      {
        key: 'delivery',
        title: 'Default Delivery Terms',
        description: 'Commercial delivery defaults for transferred design packages and prototypes.',
        fields: [
          { key: 'defaultIncoterm', label: 'Default Incoterm', type: 'select', default: 'FCA', options: ['EXW', 'FCA', 'FOB', 'CIF', 'DAP', 'DDP'] },
          { key: 'deliveryLeadDays', label: 'Default delivery lead time', type: 'number', default: 14, min: 0, max: 180, format: 'days' },
          { key: 'partShipmentAllowed', label: 'Allow part shipment', type: 'toggle', default: true },
          { key: 'deliveryNote', label: 'Delivery note', type: 'textarea', default: 'Delivery dates are confirmed after design release and manufacturing clearance.', wide: true },
        ],
      },
      {
        key: 'shipping',
        title: 'Shipping Preferences',
        description: 'Default carrier and freight behaviour.',
        fields: [
          { key: 'shippingMethod', label: 'Shipping method', type: 'select', default: 'Surface', options: ['Surface', 'Air', 'Courier', 'Customer pickup'] },
          { key: 'preferredCarrier', label: 'Preferred carrier', type: 'text', default: 'VRL Logistics' },
          { key: 'freightBasis', label: 'Freight basis', type: 'select', default: 'Prepaid', options: ['Prepaid', 'Collect', 'To be billed'] },
          { key: 'insuranceRequired', label: 'Transit insurance required', type: 'toggle', default: false },
        ],
      },
      {
        key: 'packaging',
        title: 'Packaging Defaults',
        description: 'Standard packaging for parts, assemblies and prototype shipments.',
        fields: [
          { key: 'packagingType', label: 'Packaging type', type: 'select', default: 'Returnable crate', options: ['Returnable crate', 'Wooden box', 'Carton', 'Pallet'] },
          { key: 'returnablePackaging', label: 'Use returnable packaging', type: 'toggle', default: true },
          { key: 'labelFormat', label: 'Dispatch label format', type: 'select', default: 'A6 thermal', options: ['A6 thermal', 'A5 sheet', 'Custom'] },
          { key: 'packingNote', label: 'Packing note', type: 'text', default: 'Tag with project, assembly and revision reference.' },
        ],
      },
      {
        key: 'transport',
        title: 'Transportation Preferences',
        description: 'Routing and consolidation defaults.',
        fields: [
          { key: 'transportMode', label: 'Preferred transport mode', type: 'select', default: 'Road', options: ['Road', 'Rail', 'Air', 'Sea'] },
          { key: 'routePreference', label: 'Route preference', type: 'select', default: 'Fastest', options: ['Fastest', 'Lowest cost', 'Consolidated'] },
          { key: 'consolidateShipments', label: 'Consolidate shipments', type: 'toggle', default: true },
          { key: 'mainStore', label: 'Default dispatch location', type: 'text', default: 'Main Store – Pune' },
        ],
      },
      {
        key: 'dispatch-docs',
        title: 'Dispatch Document Defaults',
        description: 'Documents generated with each dispatch.',
        fields: [
          { key: 'dispatchTemplate', label: 'Dispatch document template', type: 'select', default: 'Standard dispatch note', options: ['Standard dispatch note', 'Prototype dispatch note', 'Client delivery note'] },
          { key: 'requirePackingList', label: 'Require packing list', type: 'toggle', default: true },
          { key: 'requireEwayBill', label: 'Require e-way bill reference', type: 'toggle', default: true },
        ],
      },
    ],
    summary: (config) =>
      `${config.defaultIncoterm} · ${config.transportMode} · ${config.packagingType}`,
  },
  {
    key: 'pdf-document-defaults',
    label: 'PDF / Document Defaults',
    icon: FileText,
    tone: '#dc2626',
    description:
      'Control PDF page setup, headers, footers, branding, layout, fonts, export behaviour and drawing output defaults.',
    sections: [
      {
        key: 'page-layout',
        title: 'Page Layout',
        description: 'Base page setup for generated engineering documents.',
        fields: [
          { key: 'pageSize', label: 'Page size', type: 'select', default: 'A4', options: ['A4', 'A3', 'A2', 'A1', 'Letter'], required: true },
          { key: 'orientation', label: 'Orientation', type: 'select', default: 'Portrait', options: ['Portrait', 'Landscape'], required: true },
          { key: 'margins', label: 'Page margins', type: 'select', default: 'Standard (15 mm)', options: ['Narrow (8 mm)', 'Standard (15 mm)', 'Wide (25 mm)'] },
          { key: 'pageScale', label: 'Drawing scale', type: 'number', default: 100, min: 1, max: 200, format: 'percent' },
        ],
      },
      {
        key: 'header-footer',
        title: 'Header / Footer Configuration',
        description: 'Header and footer text used on PDF output.',
        fields: [
          { key: 'headerText', label: 'Header text', type: 'text', default: 'Aeromech Design Studio — Controlled Engineering Document' },
          { key: 'footerText', label: 'Footer text', type: 'text', default: 'Confidential · Uncontrolled when printed' },
          { key: 'showPageNumbers', label: 'Show page numbers', type: 'toggle', default: true },
          { key: 'showDocumentTitle', label: 'Show document title', type: 'toggle', default: true },
        ],
      },
      {
        key: 'logo',
        title: 'Company Logo Placeholder',
        description: 'Branding block reserved for the company logo.',
        fields: [
          { key: 'showLogo', label: 'Show company logo', type: 'toggle', default: true },
          { key: 'logoText', label: 'Logo placeholder text', type: 'text', default: 'AEROMECH DESIGN STUDIO' },
          { key: 'logoPosition', label: 'Logo position', type: 'select', default: 'Top left', options: ['Top left', 'Top centre', 'Top right'] },
        ],
      },
      {
        key: 'layout',
        title: 'Document Layout Preferences',
        description: 'Typography and document blocks.',
        fields: [
          { key: 'fontFamily', label: 'Default font', type: 'select', default: 'Inter', options: ['Inter', 'Arial', 'Helvetica', 'Roboto', 'Times New Roman'] },
          { key: 'fontSize', label: 'Body font size', type: 'number', default: 10, min: 7, max: 16, required: true },
          { key: 'lineSpacing', label: 'Line spacing', type: 'select', default: '1.4', options: ['1.0', '1.2', '1.4', '1.6'] },
          { key: 'showRevisionBlock', label: 'Show revision block', type: 'toggle', default: true },
          { key: 'showSignatureBlock', label: 'Show signature block', type: 'toggle', default: true },
        ],
      },
      {
        key: 'drawing-output',
        title: 'Drawing / Engineering Document Output',
        description: 'Defaults for drawings, BOM references and engineering releases.',
        fields: [
          { key: 'drawingOutputMode', label: 'Drawing output', type: 'select', default: 'Vector PDF', options: ['Vector PDF', 'Raster PDF', 'PDF + DXF package'] },
          { key: 'includeBomReference', label: 'Include BOM reference', type: 'toggle', default: true },
          { key: 'includeRevisionHistory', label: 'Include revision history', type: 'toggle', default: true },
          { key: 'watermarkDraft', label: 'Watermark draft documents', type: 'toggle', default: true },
          { key: 'watermarkText', label: 'Draft watermark text', type: 'text', default: 'DRAFT — NOT FOR MANUFACTURE' },
        ],
      },
      {
        key: 'export',
        title: 'PDF Export Preferences',
        description: 'File and compatibility options for exported PDFs.',
        fields: [
          { key: 'pdfCompression', label: 'PDF compression', type: 'select', default: 'Balanced', options: ['None', 'Balanced', 'Maximum'] },
          { key: 'embedFonts', label: 'Embed fonts', type: 'toggle', default: true },
          { key: 'exportBookmarks', label: 'Export bookmarks', type: 'toggle', default: true },
          { key: 'outputNamePattern', label: 'Default output name', type: 'text', default: '{Project}-{Document}-{Revision}', required: true },
        ],
      },
      {
        key: 'preview',
        title: 'Preview Configuration',
        description: 'How generated documents are previewed before download.',
        fields: [
          { key: 'previewBeforeExport', label: 'Preview before export', type: 'toggle', default: true },
          { key: 'previewPages', label: 'Pages in preview', type: 'number', default: 3, min: 1, max: 20 },
          { key: 'previewZoom', label: 'Default preview zoom', type: 'select', default: 'Fit page', options: ['Fit page', 'Fit width', '100%'] },
        ],
      },
    ],
    summary: (config) =>
      `${config.pageSize} ${config.orientation.toLowerCase()} · ${config.fontFamily} ${config.fontSize}pt · ${config.footerText ? 'footer set' : 'no footer'}`,
  },
  {
    key: 'terms-conditions',
    label: 'Terms & Conditions',
    icon: ScrollText,
    tone: '#7c3aed',
    description:
      'Manage default terms, engineering document notes, drawing release terms and revision disclaimers.',
    sections: [
      {
        key: 'terms-overview',
        title: 'Terms Overview',
        description: 'Which terms are applied to generated engineering documents.',
        fields: [
          { key: 'enableDefaultTerms', label: 'Enable default terms', type: 'toggle', default: true },
          { key: 'defaultTermsSet', label: 'Default terms set', type: 'select', default: 'Engineering standard terms', options: ['Engineering standard terms', 'Client contract terms', 'Prototype release terms'] },
          { key: 'applyToDocuments', label: 'Apply to documents', type: 'select', default: 'All controlled documents', options: ['All controlled documents', 'Drawings only', 'Design packages only', 'Release notes only'] },
          { key: 'requireAcceptance', label: 'Require acceptance', type: 'toggle', default: true },
        ],
      },
      {
        key: 'engineering-terms',
        title: 'Engineering Document Terms',
        description: 'Standard clauses applied to drawings and design releases.',
        fields: [
          { key: 'drawingReleaseNote', label: 'Drawing release note', type: 'textarea', default: 'Released for manufacturing after engineering approval. Dimensions in millimetres unless stated otherwise.', wide: true },
          { key: 'revisionDisclaimer', label: 'Revision disclaimer', type: 'textarea', default: 'This revision supersedes all previous issues. Verify the revision before manufacture.', wide: true },
          { key: 'confidentialityNote', label: 'Confidentiality note', type: 'textarea', default: 'Proprietary and confidential. Do not reproduce without written authorisation.', wide: true },
        ],
      },
      {
        key: 'standard-notes',
        title: 'Standard Notes',
        description: 'Reusable footer notes and quality disclaimers.',
        fields: [
          { key: 'defaultFooterNote', label: 'Default footer note', type: 'textarea', default: 'Controlled document — verify the latest revision in the engineering register.', wide: true },
          { key: 'qualityDisclaimer', label: 'Quality disclaimer', type: 'textarea', default: 'Manufacturing tolerances and inspection requirements are defined on the released drawing.', wide: true },
          { key: 'retentionNote', label: 'Document retention note', type: 'text', default: 'Retain released design records for 10 years.' },
        ],
      },
    ],
    list: {
      key: 'templates',
      title: 'Terms Templates',
      description: 'Activate or retire term templates used across engineering documents.',
      addLabel: 'Add Terms Template',
      itemLabel: 'Terms template',
      fields: [
        { key: 'title', label: 'Title', type: 'text', default: 'New terms template', required: true },
        { key: 'scope', label: 'Scope', type: 'select', default: 'All controlled documents', options: ['All controlled documents', 'Drawings', 'Design packages', 'Release notes', 'Client documents'] },
        { key: 'content', label: 'Content', type: 'textarea', default: 'Enter the standard terms text here.', required: true },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'terms-1', title: 'Engineering standard terms', scope: 'All controlled documents', content: 'Released documents are controlled copies. Verify revision before manufacture.', active: true },
        { id: 'terms-2', title: 'Drawing release terms', scope: 'Drawings', content: 'Dimensions in millimetres. Do not scale the drawing. Refer to notes and BOM.', active: true },
        { id: 'terms-3', title: 'Design package terms', scope: 'Design packages', content: 'The design package is issued for review and is not approved for manufacture until release.', active: true },
        { id: 'terms-4', title: 'Prototype release terms', scope: 'Release notes', content: 'Prototype parts are for fit and function validation only. Production tooling is not released.', active: true },
        { id: 'terms-5', title: 'Client-specific NDA terms', scope: 'Client documents', content: 'Client confidentiality terms apply to all shared design data and drawings.', active: false },
      ],
    },
    summary: (config) =>
      `${config.templates.filter((template) => template.active).length} active templates · ${config.defaultTermsSet}`,
  },
  {
    key: 'company-organization',
    label: 'Company / Organization',
    icon: Building2,
    tone: '#2563eb',
    description:
      'Maintain company profile, registered address, contact details, departments, branding and organization preferences.',
    sections: [
      {
        key: 'profile',
        title: 'Company Profile',
        description: 'Legal entity details used on documents and reports.',
        fields: [
          { key: 'companyName', label: 'Company name', type: 'text', default: 'Aeromech Design Studio Pvt Ltd', required: true },
          { key: 'legalName', label: 'Legal name', type: 'text', default: 'Aeromech Design Studio Private Limited', required: true },
          { key: 'gstin', label: 'GSTIN', type: 'text', default: '27AAMCA1234F1Z8', required: true },
          { key: 'pan', label: 'PAN', type: 'text', default: 'AAMCA1234F', required: true },
          { key: 'cin', label: 'CIN', type: 'text', default: 'U74210PN2012PTC045678' },
          { key: 'website', label: 'Website', type: 'text', default: 'https://aeromechdesign.in' },
        ],
      },
      {
        key: 'organization',
        title: 'Organization Details',
        description: 'Business context and operating scale.',
        fields: [
          { key: 'industry', label: 'Industry', type: 'select', default: 'Mechanical engineering design', options: ['Mechanical engineering design', 'Product design', 'Manufacturing engineering', 'Engineering consultancy'] },
          { key: 'establishedYear', label: 'Established year', type: 'number', default: 2012, min: 1900, max: 2100 },
          { key: 'employeeCount', label: 'Employee count', type: 'select', default: '51–200', options: ['1–50', '51–200', '201–500', '500+'] },
          { key: 'businessUnits', label: 'Business units', type: 'text', default: 'Design · Analysis · Prototyping' },
        ],
      },
      {
        key: 'address',
        title: 'Address',
        description: 'Registered office used on controlled documents.',
        fields: [
          { key: 'registeredAddress', label: 'Registered address', type: 'textarea', default: 'Unit 4, MIDC Industrial Estate, Bhosari, Pune, Maharashtra 411026', wide: true, required: true },
          { key: 'city', label: 'City', type: 'text', default: 'Pune', required: true },
          { key: 'state', label: 'State', type: 'text', default: 'Maharashtra', required: true },
          { key: 'country', label: 'Country', type: 'text', default: 'India', required: true },
          { key: 'pin', label: 'PIN', type: 'text', default: '411026', required: true },
        ],
      },
      {
        key: 'contact',
        title: 'Contact Details',
        description: 'Primary contacts for engineering and document correspondence.',
        fields: [
          { key: 'email', label: 'Email', type: 'text', default: 'design@aeromechdesign.in', required: true },
          { key: 'phone', label: 'Phone', type: 'text', default: '+91 20 6712 8800' },
          { key: 'contactPerson', label: 'Contact person', type: 'text', default: 'Rajesh Kulkarni' },
          { key: 'designation', label: 'Designation', type: 'text', default: 'Engineering Director' },
        ],
      },
      {
        key: 'departments',
        title: 'Department Information',
        description: 'Engineering departments available for assignment and access mapping.',
        fields: [
          { key: 'engineeringDepartments', label: 'Engineering departments', type: 'textarea', default: 'Mechanical Design, Design Engineering, Analysis & Validation, CAD & Documentation, Manufacturing Engineering, Quality', wide: true },
          { key: 'defaultDepartment', label: 'Default department', type: 'select', default: 'Mechanical Design', options: DEPARTMENTS },
          { key: 'departmentHead', label: 'Default department head', type: 'text', default: 'Priya Deshmukh' },
        ],
      },
      {
        key: 'preferences',
        title: 'Organization Preferences',
        description: 'Regional and working-calendar defaults.',
        fields: [
          { key: 'fiscalYearStart', label: 'Fiscal year starts', type: 'select', default: 'April', options: ['January', 'April', 'July', 'October'] },
          { key: 'timeZone', label: 'Time zone', type: 'select', default: 'Asia/Kolkata (IST)', options: ['Asia/Kolkata (IST)', 'UTC', 'Asia/Dubai (GST)'] },
          { key: 'dateFormat', label: 'Date format', type: 'select', default: 'DD MMM YYYY', options: ['DD/MM/YYYY', 'DD MMM YYYY', 'MM/DD/YYYY'] },
          { key: 'workingDays', label: 'Working days', type: 'text', default: 'Monday – Saturday' },
        ],
      },
      {
        key: 'branding',
        title: 'Company Logo Placeholder',
        description: 'Logo displayed in the application and on document output.',
        fields: [
          { key: 'showCompanyLogo', label: 'Show company logo', type: 'toggle', default: true },
          { key: 'logoPlaceholder', label: 'Logo placeholder', type: 'text', default: 'AEROMECH' },
          { key: 'logoPosition', label: 'Logo position', type: 'select', default: 'Top left', options: ['Top left', 'Top centre', 'Top right'] },
        ],
      },
    ],
    summary: (config) =>
      `${config.companyName} · ${config.city}, ${config.state} · ${config.defaultDepartment}`,
  },
  {
    key: 'document-numbering',
    label: 'Document Numbering',
    icon: ListOrdered,
    tone: '#db2777',
    description:
      'Configure project, design, part, assembly, BOM, drawing, CAD and change-number formats with sequence previews.',
    sections: [
      {
        key: 'numbering-defaults',
        title: 'Numbering Preferences',
        description: 'Global controls for automatic document numbering.',
        fields: [
          { key: 'autoNumbering', label: 'Enable auto-numbering', type: 'toggle', default: true },
          { key: 'sequenceReset', label: 'Sequence reset', type: 'select', default: 'Never', options: ['Never', 'Annually', 'Quarterly'] },
          { key: 'allowManualOverride', label: 'Allow manual override', type: 'toggle', default: false },
          { key: 'globalPrefix', label: 'Global prefix', type: 'text', default: 'AMD' },
          { key: 'globalSuffix', label: 'Global suffix', type: 'text', default: '' },
          { key: 'separator', label: 'Separator', type: 'select', default: '-', options: ['-', '_', '/'] },
          { key: 'includeYear', label: 'Include year in number', type: 'toggle', default: true },
        ],
      },
      {
        key: 'revision',
        title: 'Revision Numbering',
        description: 'Revision identifiers used across drawings and assemblies.',
        fields: [
          { key: 'revisionScheme', label: 'Revision scheme', type: 'select', default: 'Alphabetic (A, B, C)', options: ['Alphabetic (A, B, C)', 'Numeric (01, 02)', 'Prefixed (R01, R02)'] },
          { key: 'revisionStart', label: 'Starting revision', type: 'text', default: 'A', required: true },
          { key: 'includeRevisionInFilename', label: 'Include revision in filename', type: 'toggle', default: true },
          { key: 'draftRevision', label: 'Working revision label', type: 'text', default: 'DRAFT' },
        ],
      },
      {
        key: 'prefix-suffix',
        title: 'Prefix / Suffix Configuration',
        description: 'Global portions applied before and after every sequence.',
        fields: [
          { key: 'prefixNote', label: 'Prefix note', type: 'text', default: 'Project and document codes use the AMD prefix by default.' },
          { key: 'sequencePadding', label: 'Default sequence padding', type: 'number', default: 4, min: 2, max: 8, required: true },
          { key: 'filenamePattern', label: 'Default filename pattern', type: 'text', default: '{Number}-{Revision}-{Title}', required: true },
        ],
      },
    ],
    list: {
      key: 'documents',
      title: 'Document Number Formats',
      description: 'Every controlled engineering document type and its next sequence.',
      addLabel: 'Add Document Type',
      itemLabel: 'Document type',
      fields: [
        { key: 'label', label: 'Document type', type: 'text', default: 'New document type', required: true },
        { key: 'prefix', label: 'Prefix', type: 'text', default: 'DOC', required: true },
        { key: 'padding', label: 'Sequence digits', type: 'number', default: 4, min: 2, max: 8, required: true },
        { key: 'nextNumber', label: 'Next number', type: 'number', default: 1, min: 1, required: true },
        { key: 'suffix', label: 'Suffix', type: 'text', default: '' },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'doc-1', label: 'Project', prefix: 'PRJ', padding: 3, nextNumber: 42, suffix: '', active: true },
        { id: 'doc-2', label: 'Design', prefix: 'DSN', padding: 4, nextNumber: 118, suffix: '', active: true },
        { id: 'doc-3', label: 'Part', prefix: 'PT', padding: 4, nextNumber: 148, suffix: '', active: true },
        { id: 'doc-4', label: 'Assembly', prefix: 'ASM', padding: 3, nextNumber: 56, suffix: '', active: true },
        { id: 'doc-5', label: 'BOM', prefix: 'BOM', padding: 4, nextNumber: 31, suffix: '', active: true },
        { id: 'doc-6', label: 'Drawing', prefix: 'DRG', padding: 4, nextNumber: 204, suffix: '', active: true },
        { id: 'doc-7', label: 'CAD Reference', prefix: 'CAD', padding: 4, nextNumber: 89, suffix: '', active: true },
        { id: 'doc-8', label: 'ECR / ECO', prefix: 'ECR', padding: 3, nextNumber: 18, suffix: '', active: true },
      ],
    },
    summary: (config) =>
      `${config.documents.length} sequences · ${config.documents.filter((document) => document.active).length} active · ${config.revisionScheme.split(' ')[0]} revisions`,
  },
  {
    key: 'workflow-settings',
    label: 'Workflow Settings',
    icon: Workflow,
    tone: '#8b5cf6',
    description:
      'Configure design review, engineering approval, manufacturing review, client approval and release workflows.',
    sections: [
      {
        key: 'engineering-workflow',
        title: 'Engineering Workflow',
        description: 'Core sequences used by engineering design reviews.',
        fields: [
          { key: 'designReviewSequence', label: 'Design review sequence', type: 'select', default: 'Designer → Design Lead → Engineering Manager', options: ['Designer → Design Lead', 'Designer → Design Lead → Engineering Manager', 'Designer → Peer Review → Design Lead', 'Parallel review'] },
          { key: 'engineeringApprovalSequence', label: 'Engineering approval sequence', type: 'select', default: 'Design Lead → Engineering Manager', options: ['Design Lead', 'Design Lead → Engineering Manager', 'Design Lead → Quality → Engineering Manager', 'Parallel approval'] },
          { key: 'manufacturingReviewSequence', label: 'Manufacturing review sequence', type: 'select', default: 'Manufacturing Engineer → Production Head', options: ['Manufacturing Engineer', 'Manufacturing Engineer → Production Head', 'Manufacturing Engineer → Quality → Production Head'] },
          { key: 'clientApprovalRequired', label: 'Client approval required', type: 'toggle', default: true },
        ],
      },
      {
        key: 'release-workflow',
        title: 'Engineering Release Workflow',
        description: 'Conditions for releasing drawings and design packages.',
        fields: [
          { key: 'requireAllApprovals', label: 'Require all approvals', type: 'toggle', default: true },
          { key: 'releaseGate', label: 'Release gate', type: 'select', default: 'Engineering + manufacturing review', options: ['Engineering approval only', 'Engineering + manufacturing review', 'Engineering + quality review', 'All configured approvals'] },
          { key: 'autoReleaseOnApproval', label: 'Auto-release on final approval', type: 'toggle', default: false },
          { key: 'notifyOnRelease', label: 'Notify on release', type: 'toggle', default: true },
        ],
      },
      {
        key: 'ecr-eco',
        title: 'ECR / ECO Workflow',
        description: 'Change-request and change-order routing.',
        fields: [
          { key: 'ecrApprovalSequence', label: 'ECR approval sequence', type: 'select', default: 'Engineering Manager → Quality Head', options: ['Engineering Manager', 'Engineering Manager → Quality Head', 'Engineering Manager → Finance → Managing Director', 'Parallel review'] },
          { key: 'ecoRequiresEcr', label: 'ECO requires approved ECR', type: 'toggle', default: true },
          { key: 'impactAssessment', label: 'Require impact assessment', type: 'toggle', default: true },
          { key: 'changeBoard', label: 'Change review board', type: 'text', default: 'Engineering Change Board' },
        ],
      },
      {
        key: 'status-config',
        title: 'Workflow Status Configuration',
        description: 'Status defaults and controls for workflow tasks.',
        fields: [
          { key: 'defaultStatus', label: 'Default status', type: 'select', default: 'Draft', options: ['Draft', 'In Review', 'Pending Approval', 'Released'] },
          { key: 'allowParallelStages', label: 'Allow parallel stages', type: 'toggle', default: true },
          { key: 'requireRejectionReason', label: 'Require rejection reason', type: 'toggle', default: true },
          { key: 'statusSlaDays', label: 'Default stage SLA', type: 'number', default: 5, min: 1, max: 30, format: 'days' },
        ],
      },
    ],
    summary: (config) =>
      `${config.requireAllApprovals ? 'All approvals' : 'Single approval'} · ${config.clientApprovalRequired ? 'client approval on' : 'internal only'} · ${config.defaultStatus}`,
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: Bell,
    tone: '#ea580c',
    description:
      'Choose approval, review, deadline, task, revision and release notifications, plus email and in-app delivery preferences.',
    sections: [
      {
        key: 'preferences',
        title: 'Notification Preferences',
        description: 'Global delivery defaults for engineering notifications.',
        fields: [
          { key: 'notificationsEnabled', label: 'Enable notifications', type: 'toggle', default: true },
          { key: 'defaultChannel', label: 'Default channel', type: 'select', default: 'In-app + email', options: ['In-app', 'Email', 'In-app + email'] },
          { key: 'digestFrequency', label: 'Digest frequency', type: 'select', default: 'Daily', options: ['Immediate', 'Daily', 'Weekly'] },
          { key: 'quietHoursStart', label: 'Quiet hours start', type: 'text', default: '20:00' },
          { key: 'quietHoursEnd', label: 'Quiet hours end', type: 'text', default: '08:00' },
        ],
      },
      {
        key: 'approvals',
        title: 'Approval Notifications',
        description: 'Messages sent during approval routing.',
        fields: [
          { key: 'approvalRequest', label: 'Approval requested', type: 'toggle', default: true },
          { key: 'approvalDecision', label: 'Approval decision', type: 'toggle', default: true },
          { key: 'approvalEscalation', label: 'Approval escalated', type: 'toggle', default: true },
          { key: 'approvalReminder', label: 'Approval reminder', type: 'toggle', default: true },
        ],
      },
      {
        key: 'reviews',
        title: 'Review Reminders',
        description: 'Reminders for design and manufacturing reviews.',
        fields: [
          { key: 'reviewReminderDays', label: 'Remind before review', type: 'number', default: 2, min: 0, max: 14, format: 'days' },
          { key: 'remindReviewer', label: 'Notify reviewer', type: 'toggle', default: true },
          { key: 'dailyReviewDigest', label: 'Daily review digest', type: 'toggle', default: true },
        ],
      },
      {
        key: 'deadlines',
        title: 'Project Deadline Alerts',
        description: 'Warning windows for project and design milestones.',
        fields: [
          { key: 'milestoneAlertDays', label: 'Milestone alert', type: 'number', default: 7, min: 1, max: 60, format: 'days' },
          { key: 'deadlineAlertDays', label: 'Deadline alert', type: 'number', default: 3, min: 1, max: 30, format: 'days' },
          { key: 'notifyProjectManager', label: 'Notify project manager', type: 'toggle', default: true },
        ],
      },
      {
        key: 'tasks',
        title: 'Design Task Notifications',
        description: 'Events for assigned and overdue design tasks.',
        fields: [
          { key: 'taskAssigned', label: 'Task assigned', type: 'toggle', default: true },
          { key: 'taskOverdue', label: 'Task overdue', type: 'toggle', default: true },
          { key: 'taskCompleted', label: 'Task completed', type: 'toggle', default: false },
        ],
      },
      {
        key: 'revisions',
        title: 'Revision / Release Notifications',
        description: 'Controlled-document revision and release alerts.',
        fields: [
          { key: 'revisionReleased', label: 'Revision released', type: 'toggle', default: true },
          { key: 'documentSuperseded', label: 'Document superseded', type: 'toggle', default: true },
          { key: 'releaseAcknowledged', label: 'Release acknowledged', type: 'toggle', default: false },
        ],
      },
      {
        key: 'channels',
        title: 'Email / In-app Preferences',
        description: 'Mock delivery configuration; no email is sent from this build.',
        fields: [
          { key: 'emailNotifications', label: 'Email notifications', type: 'toggle', default: true },
          { key: 'inAppNotifications', label: 'In-app notifications', type: 'toggle', default: true },
          { key: 'desktopNotifications', label: 'Browser notifications', type: 'toggle', default: false },
          { key: 'notificationEmail', label: 'Notification email', type: 'text', default: 'design.notifications@aeromechdesign.in' },
        ],
      },
    ],
    summary: (config) =>
      `${config.notificationsEnabled ? 'Notifications on' : 'Notifications off'} · ${config.defaultChannel} · ${config.digestFrequency} digest`,
  },
  {
    key: 'audit-security',
    label: 'Audit / Security',
    icon: Shield,
    tone: '#475569',
    description:
      'Configure audit tracking, session preferences, change history and document access tracking. This is mock configuration only.',
    sections: [
      {
        key: 'audit',
        title: 'Audit Configuration',
        description: 'What activity is recorded in the local configuration history.',
        fields: [
          { key: 'auditEnabled', label: 'Enable audit configuration', type: 'toggle', default: true },
          { key: 'retentionDays', label: 'Audit retention', type: 'number', default: 365, min: 30, max: 3650, required: true, format: 'days' },
          { key: 'exportEnabled', label: 'Allow audit export', type: 'toggle', default: true },
          { key: 'auditOwner', label: 'Audit owner', type: 'select', default: 'Quality Head', options: ROLE_OPTIONS },
        ],
      },
      {
        key: 'activity',
        title: 'Activity Tracking Preferences',
        description: 'Mock preferences for tracked user activity.',
        fields: [
          { key: 'trackLogins', label: 'Track logins', type: 'toggle', default: true },
          { key: 'trackDocumentViews', label: 'Track document views', type: 'toggle', default: true },
          { key: 'trackConfigChanges', label: 'Track configuration changes', type: 'toggle', default: true },
          { key: 'trackApprovals', label: 'Track approval actions', type: 'toggle', default: true },
        ],
      },
      {
        key: 'session',
        title: 'Login / Session Preferences',
        description: 'Frontend-only session policy placeholders; no authentication is enforced.',
        fields: [
          { key: 'sessionTimeout', label: 'Session timeout', type: 'number', default: 30, min: 5, max: 480, required: true, format: 'days' },
          { key: 'requireMfa', label: 'Require multi-factor sign-in', type: 'toggle', default: true },
          { key: 'maxLoginAttempts', label: 'Maximum login attempts', type: 'number', default: 5, min: 1, max: 20 },
          { key: 'passwordExpiryDays', label: 'Password expiry', type: 'number', default: 90, min: 30, max: 365, format: 'days' },
        ],
      },
      {
        key: 'history',
        title: 'Change History Preferences',
        description: 'How configuration and document change history is presented.',
        fields: [
          { key: 'historyRetentionDays', label: 'Change history retention', type: 'number', default: 730, min: 30, max: 3650, format: 'days' },
          { key: 'showFieldDiff', label: 'Show field-level differences', type: 'toggle', default: true },
          { key: 'exportHistory', label: 'Allow change history export', type: 'toggle', default: true },
        ],
      },
      {
        key: 'document-access',
        title: 'Document Access Tracking',
        description: 'Mock preferences for controlled document access.',
        fields: [
          { key: 'trackDownloads', label: 'Track downloads', type: 'toggle', default: true },
          { key: 'trackPrinting', label: 'Track printing', type: 'toggle', default: true },
          { key: 'watermarkDownloads', label: 'Watermark downloaded PDFs', type: 'toggle', default: false },
        ],
      },
      {
        key: 'policy',
        title: 'Security Policy Settings',
        description: 'Display-only policy preferences for the design workspace.',
        fields: [
          { key: 'strongPasswords', label: 'Enforce strong passwords', type: 'toggle', default: true },
          { key: 'externalSharing', label: 'Allow external document sharing', type: 'toggle', default: false },
          { key: 'ipRestriction', label: 'Restrict by IP range', type: 'toggle', default: false },
          { key: 'securityContact', label: 'Security contact', type: 'text', default: 'security@aeromechdesign.in' },
        ],
      },
    ],
    summary: (config) =>
      `${config.auditEnabled ? 'Audit on' : 'Audit off'} · ${config.retentionDays}-day retention · ${config.requireMfa ? 'MFA preferred' : 'MFA off'}`,
  },
  {
    key: 'access-management',
    label: 'Access Management',
    icon: Users,
    tone: '#7c3aed',
    description:
      'Configure engineering roles, department access mapping, module permissions and approval permissions. Mock configuration only.',
    sections: [
      {
        key: 'role-overview',
        title: 'Role Overview',
        description: 'Default role policy for engineering users.',
        fields: [
          { key: 'defaultRole', label: 'Default role', type: 'select', default: 'Design Engineer', options: ROLE_OPTIONS, required: true },
          { key: 'rolePolicy', label: 'Role assignment policy', type: 'select', default: 'Department based', options: ['Department based', 'Project based', 'Manual assignment'] },
          { key: 'allowCustomRoles', label: 'Allow custom roles', type: 'toggle', default: true },
        ],
      },
      {
        key: 'department-access',
        title: 'Department Access Mapping',
        description: 'How engineering departments map to workspace access.',
        fields: [
          { key: 'mappingMode', label: 'Mapping mode', type: 'select', default: 'Role and department', options: ['Role only', 'Department only', 'Role and department'] },
          { key: 'defaultDepartmentAccess', label: 'Default department access', type: 'select', default: 'Own department', options: ['Own department', 'All design departments', 'Project team'] },
          { key: 'crossDepartmentAccess', label: 'Allow cross-department access', type: 'toggle', default: true },
        ],
      },
      {
        key: 'module-access',
        title: 'Module Access Configuration',
        description: 'Default modules visible to engineering roles.',
        fields: [
          { key: 'defaultModules', label: 'Default modules', type: 'textarea', default: 'Projects, Design Planning, Mechanical Design, Drawing & CAD', wide: true },
          { key: 'restrictedModules', label: 'Restricted modules', type: 'textarea', default: 'Transfers, Reports & Analytics', wide: true },
          { key: 'roleReviewFrequency', label: 'Access review frequency', type: 'select', default: 'Quarterly', options: ['Monthly', 'Quarterly', 'Annually'] },
        ],
      },
      {
        key: 'permissions',
        title: 'Permission Defaults',
        description: 'Permission categories applied when a role is created.',
        fields: [
          { key: 'defaultView', label: 'Default view permission', type: 'toggle', default: true },
          { key: 'defaultEdit', label: 'Default edit permission', type: 'toggle', default: false },
          { key: 'defaultApproval', label: 'Default approval permission', type: 'toggle', default: false },
          { key: 'permissionNote', label: 'Permission note', type: 'text', default: 'Frontend mock only — these settings do not enforce backend authorization.' },
          { key: 'roleOwner', label: 'Role owner', type: 'select', default: 'Engineering Manager', options: ROLE_OPTIONS },
        ],
      },
    ],
    list: {
      key: 'roles',
      title: 'Engineering Roles',
      description: 'Role definitions, module access and approval permissions.',
      addLabel: 'Add Role',
      itemLabel: 'Role',
      fields: [
        { key: 'name', label: 'Role name', type: 'text', default: 'New engineering role', required: true },
        { key: 'department', label: 'Department', type: 'select', default: 'Mechanical Design', options: DEPARTMENTS, required: true },
        { key: 'scope', label: 'Access scope', type: 'select', default: 'Own projects', options: ['Own projects', 'Department', 'All projects'] },
        { key: 'view', label: 'View', type: 'checkbox', default: true },
        { key: 'edit', label: 'Edit', type: 'checkbox', default: false },
        { key: 'approve', label: 'Approve', type: 'checkbox', default: false },
        { key: 'active', label: 'Active', type: 'checkbox', default: true },
      ],
      rows: [
        { id: 'role-1', name: 'Design Engineer', department: 'Mechanical Design', scope: 'Own projects', view: true, edit: true, approve: false, active: true },
        { id: 'role-2', name: 'Senior Design Engineer', department: 'Design Engineering', scope: 'Department', view: true, edit: true, approve: false, active: true },
        { id: 'role-3', name: 'Design Lead', department: 'Mechanical Design', scope: 'Department', view: true, edit: true, approve: true, active: true },
        { id: 'role-4', name: 'Engineering Manager', department: 'Design Engineering', scope: 'All projects', view: true, edit: true, approve: true, active: true },
        { id: 'role-5', name: 'Quality Head', department: 'Quality', scope: 'All projects', view: true, edit: false, approve: true, active: true },
        { id: 'role-6', name: 'CAD Coordinator', department: 'CAD & Documentation', scope: 'Department', view: true, edit: true, approve: false, active: false },
      ],
    },
    summary: (config) =>
      `${config.roles.filter((role) => role.active).length} active roles · ${config.rolePolicy.toLowerCase()} access`,
  },
];

export const SETTINGS_BY_KEY = Object.fromEntries(
  SETTINGS_CATEGORIES.map((category) => [category.key, category]),
);

export const CONFIGURABLE_CATEGORIES = SETTINGS_CATEGORIES.filter(
  (category) => category.type !== 'overview',
);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function getCategoryDefaults(categoryKey) {
  const category = SETTINGS_BY_KEY[categoryKey];
  if (!category || category.type === 'overview') return {};
  const defaults = {};

  category.sections.forEach((section) => {
    section.fields.forEach((field) => {
      defaults[field.key] = field.default ?? (field.type === 'toggle' ? false : '');
    });
  });

  if (category.list) {
    defaults[category.list.key] = deepClone(category.list.rows || []);
  }

  return deepClone(defaults);
}

export function getDefaultSettings() {
  return Object.fromEntries(
    CONFIGURABLE_CATEGORIES.map((category) => [category.key, getCategoryDefaults(category.key)]),
  );
}

export function getDefaultMeta() {
  return Object.fromEntries(
    CONFIGURABLE_CATEGORIES.map((category) => [
      category.key,
      { updatedAt: '2026-11-08T10:30:00.000Z', updatedBy: 'Design Admin' },
    ]),
  );
}

export function mergeSettingsWithDefaults(savedValues = {}) {
  const defaults = getDefaultSettings();
  const merged = {};

  CONFIGURABLE_CATEGORIES.forEach((category) => {
    const categoryDefaults = defaults[category.key];
    const saved = savedValues?.[category.key];
    if (!saved || typeof saved !== 'object') {
      merged[category.key] = categoryDefaults;
      return;
    }

    const next = { ...categoryDefaults };
    Object.keys(categoryDefaults).forEach((key) => {
      if (saved[key] !== undefined) next[key] = saved[key];
    });
    merged[category.key] = next;
  });

  return merged;
}
