import { ArrowLeft, FilePlus2 } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  PageHeader,
  PageLayout,
} from '../../components/common';
import { DASHBOARD } from '../../config/navigation';
import { useEnquiryRequests } from '../../context/EnquiryRequestContext';
import { LOCKED_STATUSES } from '../../data/enquiryRequestData';
import RequestForm from './RequestForm';

/** Full-page create / edit form for a single request (four-source form). */
export default function RequestFormPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { requests } = useEnquiryRequests();
  const record = requestId ? requests.find((row) => row.id === requestId) : null;

  if (requestId && !record) {
    return <Navigate to="/customer-sales" replace />;
  }

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: DASHBOARD.path },
            { label: 'Enquiry & Request Management', to: '/customer-sales' },
            { label: record ? `${record.id} · Edit Request` : 'Create Request' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={FilePlus2}
          title={record ? 'Edit Request' : 'Create Request'}
          subtitle={
            record
              ? `Update ${record.id} · ${record.source} · ${record.category}`
              : 'Capture a customer, R&D / PDE, service or inter-department requirement.'
          }
          actions={
            <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/customer-sales')}>
              Back to Register
            </Button>
          }
        />
      }
    >
      {record && LOCKED_STATUSES.includes(record.status) ? (
        <div className="card">
          <div className="er-blocker">
            <strong>This request is locked</strong>
            <p>
              {record.status} requests cannot be edited. Their information is retained as the
              workflow record.
            </p>
          </div>
        </div>
      ) : (
        <RequestForm
          record={record}
          onSaved={(id) =>
            navigate(record ? `/customer-sales/requests/${id}` : '/customer-sales')
          }
          onCancel={() => navigate('/customer-sales')}
        />
      )}
    </PageLayout>
  );
}
