import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  MILESTONES,
  PROJECTS,
  TEAM_MEMBERS,
  TODAY,
  addDays,
  nextProjectId,
} from '../data/projectData';
import { APP_USER } from '../constants/brand';

/**
 * Project workspace state.
 *
 * Projects, team assignments and milestones live above the module routes so tab
 * switches and the full-page create route keep every edit. Saved records are
 * mirrored into localStorage (`md-project-state-v1`) so a browser refresh — or
 * reopening the app — keeps created projects and drafts. Still frontend only:
 * nothing is sent to a server.
 */
const ProjectsContext = createContext(null);

const STORAGE_KEY = 'md-project-state-v1';

function auditValue(value) {
  if (value == null || value === '') return 'not set';
  if (Array.isArray(value)) return value.length ? value.join(', ') : 'none';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function auditChange(previous, value) {
  const before = auditValue(previous);
  const after = auditValue(value);
  if (before.length <= 80 && after.length <= 80) return `${before} → ${after}`;
  let common = 0;
  while (common < before.length && common < after.length && before[common] === after[common]) common += 1;
  const start = Math.max(0, common - 24);
  return `…${before.slice(start, start + 100)} → …${after.slice(start, start + 120)}`;
}

function describeProjectChanges(previous, patch) {
  return Object.entries(patch)
    .filter(([key, value]) => key !== 'history' && JSON.stringify(previous[key]) !== JSON.stringify(value))
    .map(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase());
      return `${label}: ${auditChange(previous[key], value)}`;
    })
    .join('; ');
}

function stamp() {
  return `${TODAY}T${new Date().toTimeString().slice(0, 8)}`;
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.projects) || parsed.projects.length === 0) return null;

    return {
      projects: parsed.projects,
      team: Array.isArray(parsed.team) ? parsed.team : TEAM_MEMBERS,
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : MILESTONES,
    };
  } catch {
    return null;
  }
}

const persistedState = loadPersistedState();

export function ProjectsProvider({ children }) {
  const [projects, setProjects] = useState(() => persistedState?.projects || PROJECTS);
  const [team, setTeam] = useState(() => persistedState?.team || TEAM_MEMBERS);
  const [milestones, setMilestones] = useState(() => persistedState?.milestones || MILESTONES);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, team, milestones }));
    } catch {
      // storage unavailable or full — the session still works in memory
    }
  }, [projects, team, milestones]);

  const value = useMemo(
    () => ({
      projects,
      team,
      milestones,
      nextProjectId: () => nextProjectId(projects),

      addProject: (project) => setProjects((previous) => [project, ...previous]),

      updateProject: (id, patch, { silent = false } = {}) =>
        setProjects((previous) =>
          previous.map((project) => {
            if (project.id !== id) return project;
            const detail = describeProjectChanges(project, patch);
            if (!detail) return project;
            if (silent) return { ...project, ...patch };
            const historyEntry = {
              id: `PAH-${id}-${(project.history?.length || 0) + 1}`,
              at: stamp(),
              by: APP_USER.name,
              action: 'Project updated',
              detail,
            };
            return { ...project, ...patch, history: [...(project.history || []), historyEntry] };
          }),
        ),

      /** Remove a project row. Callers enforce the Draft-only rule. */
      deleteProject: (id) =>
        setProjects((previous) => previous.filter((project) => project.id !== id)),

      projectForRequest: (requestId) =>
        projects.find((project) => project.sourceRequestId === requestId) || null,

      duplicateProject: (id) =>
        setProjects((previous) => {
          const source = previous.find((project) => project.id === id);
          if (!source) return previous;
          const copy = {
            ...source,
            id: nextProjectId(previous),
            name: `${source.name} (Copy)`,
            reference: `${source.reference}-C`,
            status: 'New Request',
            progress: 0,
            delayed: false,
            archived: false,
            start: TODAY,
            target: addDays(TODAY, 120),
            attachments: 0,
            attachmentFiles: [],
          };
          return [copy, ...previous];
        }),

      archiveProject: (id) =>
        setProjects((previous) =>
          previous.map((project) =>
            project.id === id ? { ...project, archived: true } : project,
          ),
        ),

      addMember: (member) => setTeam((previous) => [...previous, member]),

      updateMember: (id, patch) =>
        setTeam((previous) =>
          previous.map((member) => (member.id === id ? { ...member, ...patch } : member)),
        ),

      removeMember: (id) => setTeam((previous) => previous.filter((member) => member.id !== id)),

      addMilestone: (milestone) => setMilestones((previous) => [...previous, milestone]),

      updateMilestone: (id, patch) =>
        setMilestones((previous) =>
          previous.map((milestone) =>
            milestone.id === id ? { ...milestone, ...patch } : milestone,
          ),
        ),
    }),
    [projects, team, milestones],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects() {
  const context = useContext(ProjectsContext);
  if (!context) throw new Error('useProjects must be used inside a ProjectsProvider');
  return context;
}
