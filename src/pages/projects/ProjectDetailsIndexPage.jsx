import { Navigate } from 'react-router-dom';
import { useProjects } from '../../context/ProjectsContext';

/**
 * Project Details & Progress lands on a project workspace. If the user has
 * already opened a project, return to that project; otherwise open the first
 * active project in the register.
 */
export default function ProjectDetailsIndexPage() {
  const { projects } = useProjects();
  const lastProjectId = sessionStorage.getItem('md-last-project-id');
  const target =
    projects.find((project) => project.id === lastProjectId && !project.archived) ||
    projects.find((project) => !project.archived) ||
    projects[0];

  return target ? (
    <Navigate to={`/projects/all-projects/${target.id}`} replace />
  ) : (
    <Navigate to="/projects" replace />
  );
}
