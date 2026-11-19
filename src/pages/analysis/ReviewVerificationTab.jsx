import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  History,
  Newspaper,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import {
  Button,
  DataTable,
  EmptyState,
  KpiGrid,
  Modal,
  Pagination,
  SearchInput,
  Select,
  StatCard,
  StatusBadge,
  Toolbar,
} from '../../components/common';
import { useAnalysis } from '../../context/AnalysisContext';
import { useProjects } from '../../context/ProjectsContext';
import {
  ANALYSIS_REVIEWERS,
  REVIEW_DECISIONS,
  REVIEW_VIEWS,
  formatDate,
  projectName,
  reviewsForView,
  statusTone,
} from '../../data/analysisData';
import { Toast, useToast } from './analysisUi';

const PAGE_SIZE_OPTIONS = [5, 10, 25];

const VIEW_HINTS = {
  pending: 'Submitted analyses waiting for a reviewer to pick them up.',
  assigned: 'Reviews currently assigned to you as the signed-in technical reviewer.',
  verification: 'Assigned and under-review records that are actively being verified.',
  changes: 'Reviews returned to the engineer for more evidence.',
  verified: 'Analyses whose evidence has been accepted.',
  history: 'Every review record with its status changes preserved.',
};

export default function ReviewVerificationTab() {
  const navigate = useNavigate();
  const { reviews, analyses, reviewerPersona, recordReviewDecision, reassignReviewer } = useAnalysis();
  const { projects } = useProjects();
  const { toast, showToast, clearToast } = useToast();

  const [view, setView] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [decisionTarget, setDecisionTarget] = useState(null);
  const [decisionType, setDecisionType] = useState('Approve');
  const [decisionComments, setDecisionComments] = useState('');
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignForm, setReassignForm] = useState({ reviewer: '', comments: '' });

  const rows = useMemo(() => {
    const analysisById = new Map(analyses.map((analysis) => [analysis.id, analysis]));
    return reviews.map((review) => {
      const analysis = analysisById.get(review.analysisId);
      return {
        ...review,
        analysisTitle: analysis?.title || review.analysisId,
        analysisType: analysis?.analysisType || '—',
        projectId: analysis?.projectId || '',
        projectName: projectName(projects, analysis?.projectId),
        category: analysis?.category,
      };
    });
  }, [reviews, analyses, projects]);

  const kpis = useMemo(() => {
    const pending = reviews.filter((review) => review.status === 'Pending Review').length;
    const assigned = reviews.filter(
      (review) =>
        review.reviewer === reviewerPersona &&
        ['Pending Review', 'Assigned', 'Under Review'].includes(review.status),
    ).length;
    const changes = reviews.filter((review) => review.status === 'Changes Requested').length;
    const verified = reviews.filter((review) => review.status === 'Verified').length;
    return [
      { key: 'pending', label: 'Pending Reviews', value: String(pending), sub: 'Awaiting a reviewer', icon: ClipboardCheck, tone: 'orange' },
      { key: 'assigned', label: 'Assigned to Me', value: String(assigned), sub: reviewerPersona, icon: UserCheck, tone: 'blue' },
      { key: 'changes', label: 'Changes Requested', value: String(changes), sub: 'Returned to the engineer', icon: RotateCcw, tone: 'red' },
      { key: 'verified', label: 'Verified Analyses', value: String(verified), sub: 'Evidence accepted', icon: ShieldCheck, tone: 'emerald' },
    ];
  }, [reviews, reviewerPersona]);

  const viewRows = useMemo(() => reviewsForView(rows, view), [rows, view]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return viewRows;
    return viewRows.filter((row) =>
      [
        row.id,
        row.analysisId,
        row.analysisTitle,
        row.projectName,
        row.analysisType,
        row.submittedBy,
        row.reviewer,
        row.status,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [viewRows, search]);

  const totalCount = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageInfo = `Showing ${totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0}-${Math.min(
    currentPage * pageSize,
    totalCount,
  )} of ${totalCount}`;

  const columns = [
    { key: 'id', label: 'Review ID', width: 96, render: (row) => <span className="cell-id">{row.id}</span> },
    { key: 'analysisId', label: 'Analysis ID', width: 96, render: (row) => <span className="cell-id">{row.analysisId}</span> },
    {
      key: 'analysisTitle',
      label: 'Analysis Title',
      width: 158,
      render: (row) => (
        <span className="cell-strong cell-clamp" title={row.analysisTitle}>
          {row.analysisTitle}
        </span>
      ),
    },
    {
      key: 'projectName',
      label: 'Project',
      width: 112,
      render: (row) => (
        <span className="cell-project">
          <span className="cell-id">{row.projectId}</span>
          <span className="cell-muted">{row.projectName}</span>
        </span>
      ),
    },
    {
      key: 'analysisType',
      label: 'Analysis Type',
      width: 118,
      render: (row) => <span className="cell-muted cell-clamp">{row.analysisType}</span>,
    },
    { key: 'submittedBy', label: 'Submitted By', width: 92 },
    { key: 'reviewer', label: 'Reviewer', width: 88 },
    {
      key: 'submittedDate',
      label: 'Submitted',
      width: 84,
      render: (row) => <span className="cell-muted">{formatDate(row.submittedDate)}</span>,
    },
    {
      key: 'status',
      label: 'Review Status',
      width: 104,
      render: (row) => <StatusBadge status={row.status} tone={statusTone(row.status)} />,
    },
  ];

  const openDecision = (row, type) => {
    setDecisionTarget(row);
    setDecisionType(type);
    setDecisionComments('');
  };

  const submitDecision = () => {
    const result = recordReviewDecision(decisionTarget.id, {
      decision: decisionType,
      comments: decisionComments,
      by: reviewerPersona,
    });
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`${decisionTarget.id} recorded as ${result.status}.`);
    setDecisionTarget(null);
  };

  const submitReassign = () => {
    if (!reassignForm.reviewer) return;
    reassignReviewer(reassignTarget.id, reassignForm.reviewer, reviewerPersona, reassignForm.comments);
    showToast(`${reassignTarget.id} reassigned to ${reassignForm.reviewer}.`);
    setReassignTarget(null);
  };

  return (
    <>
      <KpiGrid>
        {kpis.map((kpi) => (
          <StatCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            tone={kpi.tone}
          />
        ))}
      </KpiGrid>

      <div className="mech-domain-bar is-segmented" role="group" aria-label="Review queues">
        {REVIEW_VIEWS.map((entry) => {
          const count = reviewsForView(rows, entry.key).length;
          return (
            <button
              key={entry.key}
              type="button"
              className={`mech-domain-chip${view === entry.key ? ' is-active' : ''}`}
              aria-pressed={view === entry.key}
              onClick={() => {
                setView(entry.key);
                setPage(1);
              }}
            >
              {entry.label}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      <p className="anl-view-hint">{VIEW_HINTS[view]}</p>

      <Toolbar
        left={
          <Button
            variant="ghost"
            icon={RefreshCw}
            onClick={() => {
              setSearch('');
              setPage(1);
              setView('pending');
            }}
          >
            Refresh
          </Button>
        }
        right={
          <SearchInput
            id="review-search"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search review, analysis, reviewer..."
            ariaLabel="Search reviews"
          />
        }
        count={pageInfo}
      />

      <section className="table-card">
        <DataTable
          columns={columns}
          rows={pageRows}
          className="mech-register-table"
          recordHref={(row) => `/analysis/review/${row.id}`}
          onRowClick={(row) => navigate(`/analysis/review/${row.id}`)}
          rowActions={(row) => [
            { key: 'view', label: 'Open review', icon: Eye },
            ...(row.status !== 'Verified' && row.status !== 'Cancelled'
              ? [
                  { key: 'approve', label: 'Approve', icon: CheckCircle2 },
                  { key: 'return', label: 'Return for correction', icon: RotateCcw },
                  { key: 'hold', label: 'Hold', icon: Newspaper },
                  { key: 'reject', label: 'Reject', icon: X },
                  { key: 'reassign', label: 'Reassign reviewer', icon: Users },
                ]
              : []),
            { key: 'history', label: 'Review history', icon: History },
          ]}
          onRowAction={(key, row) => {
            if (key === 'view' || key === 'history')
              navigate(`/analysis/review/${row.id}`);
            if (key === 'approve') openDecision(row, 'Approve');
            if (key === 'return') openDecision(row, 'Return for Correction');
            if (key === 'hold') openDecision(row, 'Hold');
            if (key === 'reject') openDecision(row, 'Reject');
            if (key === 'reassign') {
              setReassignTarget(row);
              setReassignForm({ reviewer: row.reviewer, comments: '' });
            }
          }}
          ariaLabel="Review register"
          emptyContent={
            <EmptyState
              icon={Search}
              title="Nothing in this queue"
              message={VIEW_HINTS[view]}
              action={
                <Button variant="ghost" icon={ChevronRight} onClick={() => setView('history')}>
                  Open Review History
                </Button>
              }
            />
          }
        />
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          pageInfo={pageInfo}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </section>

      <p className="mech-footnote">
        Signing in as <strong>{reviewerPersona}</strong> (demonstration reviewer). Verification records
        the reviewer's decision and comments; it does not release a design or validate simulation
        results.
      </p>

      <Modal
        open={Boolean(decisionTarget)}
        onClose={() => setDecisionTarget(null)}
        title="Review Decision"
        subtitle={decisionTarget ? `${decisionTarget.id} · ${decisionTarget.analysisTitle}` : undefined}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDecisionTarget(null)}>
              Cancel
            </Button>
            <Button
              icon={decisionType === 'Approve' ? CheckCircle2 : Send}
              disabled={decisionType !== 'Approve' && !decisionComments.trim()}
              onClick={submitDecision}
            >
              {`Record ${decisionType}`}
            </Button>
          </>
        }
      >
        {decisionTarget && (
          <>
            <div className="form-grid">
              <Select
                id="review-decision"
                label="Decision"
                options={REVIEW_DECISIONS.map((entry) => ({ value: entry.value, label: entry.label }))}
                value={decisionType}
                onChange={(event) => setDecisionType(event.target.value)}
              />
              <div className="form-field">
                <span className="form-label">Reviewer</span>
                <span className="form-static">{reviewerPersona}</span>
              </div>
              <div className="form-grid-full">
                <div className="form-field">
                  <label className="form-label" htmlFor="review-decision-comments">
                    Reviewer Comments {decisionType !== 'Approve' && '*'}
                  </label>
                  <textarea
                    id="review-decision-comments"
                    className="form-input"
                    rows={3}
                    placeholder="What was checked? For changes or rejection, state exactly what is required."
                    value={decisionComments}
                    onChange={(event) => setDecisionComments(event.target.value)}
                  />
                </div>
              </div>
            </div>
            <p className="dash-modal-note">
              The decision updates the review and the linked analysis status, and is appended to the
              review history. Draft analyses cannot be verified because they never enter this queue.
            </p>
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(reassignTarget)}
        onClose={() => setReassignTarget(null)}
        title="Reassign Reviewer"
        subtitle={reassignTarget ? `${reassignTarget.id} · ${reassignTarget.analysisTitle}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReassignTarget(null)}>
              Cancel
            </Button>
            <Button icon={Users} disabled={!reassignForm.reviewer} onClick={submitReassign}>
              Reassign
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <div className="form-grid-full">
            <Select
              id="reassign-reviewer"
              label="New Reviewer"
              options={ANALYSIS_REVIEWERS.map((reviewer) => ({ value: reviewer, label: reviewer }))}
              value={reassignForm.reviewer}
              onChange={(event) => setReassignForm((p) => ({ ...p, reviewer: event.target.value }))}
            />
          </div>
          <div className="form-grid-full">
            <div className="form-field">
              <label className="form-label" htmlFor="reassign-comments">
                Reason
              </label>
              <textarea
                id="reassign-comments"
                className="form-input"
                rows={2}
                placeholder="Why is the review moving?"
                value={reassignForm.comments}
                onChange={(event) => setReassignForm((p) => ({ ...p, comments: event.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={clearToast} />
    </>
  );
}
