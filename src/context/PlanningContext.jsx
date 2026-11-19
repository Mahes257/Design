import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  DESIGN_PLANS,
  DESIGN_TASKS,
  MILESTONES,
  nextMilestoneId as nextMilestoneIdFor,
  nextPlanId,
  nextTaskId,
  normalizePlan,
} from '../data/planningData';
import { DESIGNS } from '../data/mechanicalData';

/** Existing tasks without a design link fall back to the project's design. */
function normalizeTask(task, plans = []) {
  const linkedDesign =
    DESIGNS.find((design) => design.id === task.designId) ||
    DESIGNS.find((design) => design.projectId === task.projectId);
  const plan = plans.find((row) => row.id === task.planId) ||
    plans.find((row) => row.projectId === task.projectId);
  return {
    ...task,
    designId: task.designId ?? linkedDesign?.id ?? '',
    planId: task.planId ?? plan?.id ?? '',
    dependencies: task.dependencies || [],
    supportingTeam: task.supportingTeam || '',
    completionNotes: task.completionNotes || '',
    attachments: task.attachments || [],
    comments: task.comments || [],
  };
}

/**
 * Design Planning state — plans, their tasks and design milestones.
 *
 * Everything is mirrored into localStorage so refreshes keep created plans,
 * task edits, milestone updates and drafts. Frontend mock data only.
 */
const PlanningContext = createContext(null);
const STORAGE_KEY = 'md-planning-state-v1';

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.plans) || !Array.isArray(parsed?.tasks)) return null;
    const plans = parsed.plans.map(normalizePlan);
    return {
      plans,
      tasks: parsed.tasks.map((task) => normalizeTask(task, plans)),
      milestones: Array.isArray(parsed.milestones) ? parsed.milestones : MILESTONES,
    };
  } catch {
    return null;
  }
}

const persistedState = loadPersistedState();

export function PlanningProvider({ children }) {
  const [plans, setPlans] = useState(() => (persistedState?.plans || DESIGN_PLANS).map(normalizePlan));
  const [tasks, setTasks] = useState(() =>
    persistedState?.tasks || DESIGN_TASKS.map((task) => normalizeTask(task, DESIGN_PLANS)),
  );
  const [milestones, setMilestones] = useState(() => persistedState?.milestones || MILESTONES);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ plans, tasks, milestones }));
    } catch {
      // Storage unavailable or full — the current session still works in memory.
    }
  }, [plans, tasks, milestones]);

  const value = useMemo(
    () => ({
      plans,
      tasks,
      milestones,
      nextPlanId: () => nextPlanId(plans),
      nextTaskId: () => nextTaskId(tasks),
      nextMilestoneId: () => nextMilestoneIdFor(milestones),

      plansForProject: (projectId) => plans.filter((plan) => plan.projectId === projectId),
      planForProject: (projectId) => plans.find((plan) => plan.projectId === projectId) || null,
      planById: (id) => plans.find((plan) => plan.id === id) || null,
      milestonesForPlan: (planId) => milestones.filter((row) => row.planId === planId),

      addPlan: (plan) => setPlans((previous) => [normalizePlan(plan), ...previous]),
      updatePlan: (id, patch) =>
        setPlans((previous) =>
          previous.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan)),
        ),
      removePlan: (id) => {
        setPlans((previous) => previous.filter((plan) => plan.id !== id));
        setMilestones((previous) => previous.filter((row) => row.planId !== id));
      },

      addTask: (task) => setTasks((previous) => [normalizeTask(task, plans), ...previous]),
      updateTask: (id, patch) =>
        setTasks((previous) =>
          previous.map((task) => (task.id === id ? { ...task, ...patch } : task)),
        ),
      removeTask: (id) => setTasks((previous) => previous.filter((task) => task.id !== id)),

      addMilestone: (milestone) => setMilestones((previous) => [milestone, ...previous]),
      updateMilestone: (id, patch) =>
        setMilestones((previous) =>
          previous.map((row) => (row.id === id ? { ...row, ...patch } : row)),
        ),
      removeMilestone: (id) =>
        setMilestones((previous) => previous.filter((row) => row.id !== id)),
    }),
    [plans, tasks, milestones],
  );

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>;
}

export function usePlanning() {
  const context = useContext(PlanningContext);
  if (!context) throw new Error('usePlanning must be used inside a PlanningProvider');
  return context;
}
