/**
 * Project-wise grouping for the CAD File Repository.
 *
 * Files are grouped by their stored `projectId` only — never by project name.
 * A file without a project id is collected under a single "unassigned" group
 * instead of being dropped or treated as its own project.
 */
import { canPreview } from '../../data/cadData';

export const UNASSIGNED_GROUP_KEY = 'unassigned';

function latestDate(files) {
  return files.reduce((latest, file) => {
    const value = file.uploadedAt || '';
    return value > latest ? value : latest;
  }, '');
}

export function buildProjectGroups(files, projects) {
  const groups = new Map();

  (files || []).forEach((file) => {
    const projectId = String(file.projectId || '').trim();
    const key = projectId || UNASSIGNED_GROUP_KEY;
    if (!groups.has(key)) {
      const project = projectId ? (projects || []).find((row) => row.id === projectId) : null;
      groups.set(key, {
        key,
        projectId,
        projectNumber: projectId || '—',
        name:
          project?.name ||
          (projectId ? projectId : 'Unassigned CAD Files'),
        customer: project?.customer || (projectId ? '' : '—'),
        projectStatus: project?.status || (projectId ? 'Project record unavailable' : 'Unassigned'),
        isUnassigned: !projectId,
        files: [],
        categorySet: new Set(),
      });
    }
    const group = groups.get(key);
    group.files.push(file);
    group.categorySet.add(file.category);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      id: group.projectId || UNASSIGNED_GROUP_KEY,
      fileCount: group.files.length,
      categories: [...group.categorySet].sort(),
      previewCount: group.files.filter((file) => canPreview(file)).length,
      lastUpdated: latestDate(group.files),
    }))
    .sort((left, right) => {
      if (left.isUnassigned) return 1;
      if (right.isUnassigned) return -1;
      return left.projectId.localeCompare(right.projectId);
    });
}

export function projectStatusTone(status) {
  const value = String(status || '').toLowerCase();
  if (/complete|closed|approved|released/.test(value)) return 'green';
  if (/hold|archive|cancel/.test(value)) return 'gray';
  if (/delay|risk|overdue/.test(value)) return 'red';
  if (/progress|review|design/.test(value)) return 'orange';
  if (/unassigned|unavailable/.test(value)) return 'gray';
  return 'blue';
}
