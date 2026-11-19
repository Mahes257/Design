import { ArrowLeft, FolderPlus, Link2 } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb, Button, PageHeader, PageLayout, StatusBadge } from '../../components/common';
import { useProjects } from '../../context/ProjectsContext';
import NewProjectForm from './NewProjectForm';

/**
 * Create / continue a Project — dedicated full-page route.
 *
 * `/projects/new-project` creates a blank project. `/projects/new-project/:projectId`
 * opens the project (typically a request-converted Draft) so the same record is
 * reviewed and promoted instead of creating a second one.
 */
export default function NewProjectPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { projects } = useProjects();

  const project = projectId ? projects.find((row) => row.id === projectId) : null;
  if (projectId && !project) return <Navigate to="/projects" replace />;

  const editing = Boolean(project);
  const draft = editing && project.status === 'Draft';

  return (
    <PageLayout
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Project Management', to: '/projects' },
            { label: 'Projects', to: '/projects' },
            { label: draft ? `Continue Draft · ${project.id}` : editing ? `Edit ${project.id}` : 'Create Project' },
          ]}
        />
      }
      header={
        <PageHeader
          icon={FolderPlus}
          title={draft ? 'Continue Project Draft' : editing ? 'Edit Project' : 'Create Project'}
          subtitle={
            editing
              ? `${project.id} · ${project.name} · created from ${project.sourceRequestId || 'a manual project entry'}`
              : 'Register a new mechanical engineering project, define its scope, assign the team, capture CPR details and configure deliverables.'
          }
          actions={
            <>
              {editing && <StatusBadge status={project.status} />}
              {project?.sourceRequestId && (
                <Button
                  variant="ghost"
                  icon={Link2}
                  onClick={() => navigate(`/customer-sales/requests/${project.sourceRequestId}`)}
                >
                  {project.sourceRequestId}
                </Button>
              )}
              <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/projects')}>
                Back to Projects
              </Button>
            </>
          }
        />
      }
    >
      <NewProjectForm project={project} />
    </PageLayout>
  );
}
