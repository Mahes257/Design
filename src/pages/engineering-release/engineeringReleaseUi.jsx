export { Fact, Toast, useToast } from '../mechanical/mechanicalUi';
export { formatDate } from '../../data/projectData';

export function SectionNav({ sections, active, onChange, counts = {} }) {
  return (
    <div className="mech-domain-bar approvals-section-bar">
      {sections.map((section) => (
        <button
          key={section.key}
          type="button"
          className={`mech-domain-chip${active === section.key ? ' is-active' : ''}`}
          onClick={() => onChange(section.key)}
        >
          {section.label}
          {counts[section.key] != null && <span>{counts[section.key]}</span>}
        </button>
      ))}
    </div>
  );
}

export const WORKFLOW_STEPS = [
  { key: 'ecr', label: 'ECR' },
  { key: 'impact', label: 'Impact Assessment' },
  { key: 'ecr-decision', label: 'ECR Decision' },
  { key: 'eco-created', label: 'ECO Created' },
  { key: 'eco-review', label: 'ECO Review' },
  { key: 'eco-approved', label: 'ECO Approved' },
  { key: 'implementation', label: 'Change Implementation' },
  { key: 'revision', label: 'Revision Updated' },
  { key: 'closed', label: 'Change Closed' },
];

export function changeStepIndex(status) {
  if (['ECR Submitted', 'Draft'].includes(status)) return 0;
  if (status === 'Impact Assessment') return 1;
  if (['ECR Approved', 'ECR Rejected', 'Rejected'].includes(status)) return 2;
  if (status === 'ECO Created') return 3;
  if (['ECO Review', 'Pending ECO Approval'].includes(status)) return 4;
  if (['ECO Approved', 'ECO Rejected'].includes(status)) return 5;
  if (status === 'Change Implementation') return 6;
  if (status === 'Revision Updated') return 7;
  if (['Change Closed', 'Released'].includes(status)) return 8;
  return 0;
}

export function ChangeWorkflow({ change }) {
  const active = changeStepIndex(change?.status);
  return (
    <div className="approvals-workflow">
      <div className="approvals-workflow-track">
        {WORKFLOW_STEPS.map((step, index) => (
          <span
            key={step.key}
            className={`approvals-workflow-step${index === active ? ' is-active' : ''}${index < active ? ' is-complete' : ''}`}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {step.label}
          </span>
        ))}
      </div>
      <p>
        ECRs move through impact assessment and an explicit approving or rejecting decision before an ECO can be
        created. ECO review, implementation and controlled source revision creation remain separate actions; released
        BOM and drawing revisions are preserved rather than overwritten.
      </p>
    </div>
  );
}
