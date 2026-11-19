import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calculator,
  FileText,
  ListChecks,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Card,
  EmptyState,
  PageLayout,
  StatusBadge,
  ViewPageBanner,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useMechanical } from '../../context/MechanicalContext';
import { useProjects } from '../../context/ProjectsContext';
import { formatDate } from '../../data/projectData';
import { linkedRecordLabel, statusTone } from '../../data/mechanicalData';
import { ActivityList, Fact } from './mechanicalUi';

export default function CalculationDetailPage() {
  const { calcId } = useParams();
  const navigate = useNavigate();
  const { calculations, parts, assemblies, designs } = useMechanical();
  const { projects } = useProjects();
  const inputColumns = useTableColumnVisibility('/mechanical-design/design-calculations/:calcId#inputs', [
    { key: 'parameter', label: 'Parameter' },
    { key: 'value', label: 'Value' },
    { key: 'unit', label: 'Unit' },
  ]);
  const resultColumns = useTableColumnVisibility('/mechanical-design/design-calculations/:calcId#results', [
    { key: 'result', label: 'Result' },
    { key: 'value', label: 'Value' },
    { key: 'unit', label: 'Unit' },
  ]);

  const calculation = calculations.find((row) => row.id === calcId);

  if (!calculation) {
    return <Navigate to="/mechanical-design/design-calculations" replace />;
  }

  const project = projects.find((row) => row.id === calculation.projectId);

  return (
    <PageLayout className="vpb-page">
      <ViewPageBanner
        icon={Calculator}
        eyebrow={calculation.id}
        title={calculation.title}
        subtitle={`${calculation.calcType} · Rev ${calculation.revision} · ${project?.name || calculation.projectId}`}
        breadcrumbs={
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Mechanical Engineering Design', to: '/mechanical-design' },
              { label: 'Design Calculations', to: '/mechanical-design/design-calculations' },
              { label: calculation.id },
            ]}
          />
        }
        chips={
          <>
            <StatusBadge
              status={calculation.verificationStatus}
              tone={statusTone(calculation.verificationStatus)}
            />
            <span className="chip">{calculation.calcType}</span>
            <span className="chip">Rev {calculation.revision}</span>
          </>
        }
        meta={[
          ['Calculation Title', calculation.title],
          ['Engineering Domain', calculation.domain],
          ['Linked Record', `${calculation.linkedType} · ${calculation.linkedId}`],
          ['Prepared By', calculation.preparedBy],
          ['Verified By', calculation.verifiedBy],
          ['Calculation Date', formatDate(calculation.calcDate)],
        ]}
        actions={
          <>
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate('/mechanical-design/design-calculations')}
              >
                Back to Calculations
              </Button>
              <Button
                icon={Pencil}
                onClick={() =>
                  navigate(`/mechanical-design/design-calculations/${calculation.id}/edit`)
                }
              >
                Edit Calculation
              </Button>
          </>
        }
      />
      <div className="mech-detail-stack">
        <Card title="1. Calculation Information" icon={Calculator}>
          <div className="fact-grid">
            <Fact label="Calculation ID">{calculation.id}</Fact>
            <Fact label="Calculation Type">{calculation.calcType}</Fact>
            <Fact label="Engineering Domain">{calculation.domain}</Fact>
            <Fact label="Revision">Rev {calculation.revision}</Fact>
            <Fact label="Calculation Date">{formatDate(calculation.calcDate)}</Fact>
            <Fact label="Prepared By">{calculation.preparedBy}</Fact>
            <Fact label="Verified By">{calculation.verifiedBy}</Fact>
            <Fact label="Verification Status">{calculation.verificationStatus}</Fact>
            <Fact label="Result Units">{calculation.resultUnits}</Fact>
          </div>
          <div className="mech-detail-sections">
            <section>
              <h3>Description</h3>
              <p>{calculation.description || 'No description recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="2. Project & Component References" icon={ListChecks}>
          <div className="fact-grid">
            <Fact label="Project">
              {calculation.projectId} · {project?.name}
            </Fact>
            <Fact label="Customer">{project?.customer}</Fact>
            <Fact label="Linked Record">
              {linkedRecordLabel(calculation, parts, assemblies, designs)}
            </Fact>
            <Fact label="Reference Type">{calculation.linkedType}</Fact>
          </div>
        </Card>

        <Card title="3. Input Parameters" icon={Calculator}>
          {calculation.inputs?.length ? (
            <>
            <ManageColumns {...inputColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table mech-detail-table" aria-label="Calculation inputs">
                <thead>
                  <tr>
                    {inputColumns.isVisible('parameter') && <th scope="col">Parameter</th>}
                    {inputColumns.isVisible('value') && <th scope="col">Value</th>}
                    {inputColumns.isVisible('unit') && <th scope="col">Unit</th>}
                  </tr>
                </thead>
                <tbody>
                  {calculation.inputs.map((row) => (
                    <tr key={row.key}>
                      {inputColumns.isVisible('parameter') && <td className="cell-strong">{row.label}</td>}
                      {inputColumns.isVisible('value') && <td>{row.value}</td>}
                      {inputColumns.isVisible('unit') && <td className="cell-muted">{row.unit || '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <EmptyState icon={Calculator} title="No inputs recorded" message="Add input parameters from the edit form." />
          )}
        </Card>

        <Card title="4. Units & Assumptions" icon={ShieldCheck}>
          <div className="mech-detail-sections">
            <section>
              <h3>Units</h3>
              <p>
                Inputs carry their own units; result units: {calculation.resultUnits || 'not stated'}.
              </p>
            </section>
            <section>
              <h3>Assumptions</h3>
              <p>{calculation.assumptions || 'No assumptions recorded.'}</p>
            </section>
          </div>
        </Card>

        <Card title="5. Formula / Method" icon={FileText}>
          <p className="mech-detail-pre">{calculation.formulaRef || 'No method reference recorded.'}</p>
        </Card>

        <Card title="6. Results" icon={Calculator}>
          {calculation.results?.length ? (
            <>
            <ManageColumns {...resultColumns.managerProps} />
            <div className="table-wrap">
              <table className="data-table mech-detail-table" aria-label="Calculation results">
                <thead>
                  <tr>
                    {resultColumns.isVisible('result') && <th scope="col">Result</th>}
                    {resultColumns.isVisible('value') && <th scope="col">Value</th>}
                    {resultColumns.isVisible('unit') && <th scope="col">Unit</th>}
                  </tr>
                </thead>
                <tbody>
                  {calculation.results.map((row) => (
                    <tr key={row.key}>
                      {resultColumns.isVisible('result') && <td className="cell-strong">{row.label}</td>}
                      {resultColumns.isVisible('value') && <td>{row.value}</td>}
                      {resultColumns.isVisible('unit') && <td className="cell-muted">{row.unit || '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          ) : (
            <EmptyState icon={Calculator} title="No results recorded" message="Add result rows from the edit form." />
          )}
        </Card>

        <Card title="7. Engineer Notes" icon={FileText}>
          <p className="mech-detail-pre">{calculation.notes || 'No engineer notes recorded.'}</p>
        </Card>

        <Card title="8. Supporting Attachments" icon={FileText}>
          {(calculation.attachments || []).length === 0 ? (
            <p className="dash-modal-note">No attachments recorded for this calculation.</p>
          ) : (
            <ul className="mech-document-list">
              {calculation.attachments.map((attachment) => (
                <li key={attachment.name}>
                  <FileText aria-hidden="true" />
                  <span>{attachment.name}</span>
                  <span className="cell-muted">
                    {Math.max(1, Math.round(attachment.size / 1024))} KB
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="9. Verification History" icon={ShieldCheck}>
          {(calculation.verification || []).length === 0 ? (
            <p className="dash-modal-note">
              Not submitted for verification yet. Decisions are recorded from the calculation
              register.
            </p>
          ) : (
            <ActivityList
              activity={calculation.verification.map((entry, index) => ({
                id: `${entry.date}-${index}`,
                label: entry.decision,
                detail: entry.comment,
                by: entry.by,
                at: entry.date,
              }))}
            />
          )}
        </Card>

        <Card title="10. Revision History" icon={ListChecks}>
          <ActivityList
            activity={(calculation.revisions || []).map((entry) => ({
              id: `${entry.revision}-${entry.date}`,
              label: `Rev ${entry.revision}`,
              detail: entry.note,
              by: entry.by,
              at: entry.date,
            }))}
          />
        </Card>

        <p className="mech-footnote">
          This register records engineering calculations for review. It does not compute results or
          replace dedicated engineering calculation and simulation software.
        </p>
      </div>
    </PageLayout>
  );
}
