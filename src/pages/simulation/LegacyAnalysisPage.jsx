import { Activity, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, PageHeader, PageLayout } from '../../components/common';
import { DASHBOARD } from '../../config/navigation';
import AnalysisRegisterTab from '../analysis/AnalysisRegisterTab';
import ReviewVerificationTab from '../analysis/ReviewVerificationTab';
import ValidationReportsTab from '../analysis/ValidationReportsTab';

/**
 * Preserved Engineering Analysis registers.
 *
 * These registers pre-date Module 06's two-tab workspace. Their records and
 * detail routes are kept fully accessible from this page instead of being
 * deleted; the module's own tab bar stays limited to the two current tabs.
 */
export default function LegacyAnalysisPage({ mode = 'register' }) {
  const navigate = useNavigate();
  const isReview = mode === 'review';
  const isReports = mode === 'reports';
  const title = isReview
    ? 'Review & Verification (preserved)'
    : isReports
      ? 'Validation Reports archive (preserved)'
      : 'Analysis Register (preserved)';

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: DASHBOARD.path },
            { label: 'Simulation & Design Validation', to: '/engineering-analysis' },
            { label: `${title} · archive` },
          ]}
        />
      }
      header={
        <PageHeader
          icon={Activity}
          title={title}
          subtitle="Engineering analysis records created before Module 06 moved to the simulation workspace remain available here."
          actions={
            <>
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => navigate('/engineering-analysis')}
              >
                Simulation Workspace
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  navigate(
                    isReview
                      ? '/engineering-analysis/register'
                      : isReports
                        ? '/engineering-analysis/legacy-reports'
                        : '/engineering-analysis/review',
                  )
                }
              >
                {isReview
                  ? 'Open Analysis Register'
                  : isReports
                    ? 'Refresh Reports'
                    : 'Open Review & Verification'}
              </Button>
              <Button variant="secondary" onClick={() => navigate('/engineering-analysis/register')}>
                Analysis Register
              </Button>
            </>
          }
        />
      }
    >
      {isReview ? (
        <ReviewVerificationTab />
      ) : isReports ? (
        <ValidationReportsTab />
      ) : (
        <AnalysisRegisterTab />
      )}
    </PageLayout>
  );
}
