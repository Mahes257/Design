import { useMemo, useState } from 'react';
import { CalendarRange, CheckCircle2, Flag, TriangleAlert } from 'lucide-react';
import { Button, Card, KpiGrid, Select, StatCard, StatusBadge } from '../../components/common';
import { usePlanning } from '../../context/PlanningContext';
import { useProjects } from '../../context/ProjectsContext';
import { TODAY, addDays, daysBetween, formatDate } from '../../data/projectData';
import {
  formatDate as formatPlanningDate,
  taskIsOverdue,
  taskStatusTone,
} from '../../data/planningData';

function barTone(task) {
  if (task.status === 'Completed') return 'green';
  if (task.status === 'Blocked') return 'red';
  if (task.status === 'Changes Requested') return 'orange';
  if (['In Progress', 'Submitted', 'Under Review'].includes(task.status)) return 'teal';
  return 'gray';
}

/* ==========================================================================
   Tasks & Progress timeline — Gantt-style view of project-linked tasks and
   milestones with dependencies, dates and progress.
   ========================================================================== */
export default function DesignScheduleTab() {
  const { tasks } = usePlanning();
  const { projects, milestones } = useProjects();

  const [projectId, setProjectId] = useState(projects[0]?.id || 'All');

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => projectId === 'All' || task.projectId === projectId)
        .slice()
        .sort((left, right) => String(left.start).localeCompare(String(right.start))),
    [tasks, projectId],
  );

  const visibleMilestones = useMemo(
    () =>
      milestones
        .filter((milestone) => projectId === 'All' || milestone.projectId === projectId)
        .slice()
        .sort((left, right) => String(left.planned).localeCompare(String(right.planned))),
    [milestones, projectId],
  );

  const timeline = useMemo(() => {
    const dates = [
      ...visibleTasks.flatMap((task) => [task.start, task.due]),
      ...visibleMilestones.map((milestone) => milestone.planned),
      TODAY,
    ].filter(Boolean);

    if (dates.length === 0) {
      return { start: TODAY, end: addDays(TODAY, 30), days: 31, ticks: [] };
    }

    const sorted = [...dates].sort();
    const start = addDays(sorted[0], -3);
    const end = addDays(sorted[sorted.length - 1], 5);
    const days = Math.max(7, daysBetween(start, end));

    const ticks = [];
    const step = Math.max(7, Math.ceil(days / 9 / 7) * 7);
    for (let offset = 0; offset <= days; offset += step) {
      ticks.push(addDays(start, offset));
    }

    return { start, end, days, ticks };
  }, [visibleTasks, visibleMilestones]);

  const offset = (isoDate) =>
    Math.min(100, Math.max(0, (daysBetween(timeline.start, isoDate) / timeline.days) * 100));
  const width = (start, end) =>
    Math.min(100, Math.max(1.5, ((daysBetween(start, end) + 1) / timeline.days) * 100));

  const completed = visibleTasks.filter((task) => task.status === 'Completed').length;
  const late = visibleTasks.filter(taskIsOverdue).length;
  const blocked = visibleTasks.filter((task) => task.status === 'Blocked').length;

  const kpis = [
    {
      key: 'tasks',
      label: 'Tasks in View',
      value: String(visibleTasks.length),
      sub: projectId === 'All' ? 'Across every project' : 'For the selected project',
      icon: CalendarRange,
      tone: 'teal',
    },
    {
      key: 'completed',
      label: 'Completed',
      value: String(completed),
      sub: 'Closed and accepted',
      icon: CheckCircle2,
      tone: 'emerald',
    },
    {
      key: 'late',
      label: 'Late Tasks',
      value: String(late),
      sub: 'Past due, not complete',
      icon: TriangleAlert,
      tone: 'red',
    },
    {
      key: 'milestones',
      label: 'Milestones',
      value: String(visibleMilestones.length),
      sub: blocked > 0 ? `${blocked} blocked task${blocked === 1 ? '' : 's'} in the plan` : 'Planned delivery gates',
      icon: Flag,
      tone: 'purple',
    },
  ];

  const dependencyRows = visibleTasks.filter((task) => task.dependencies.length > 0);
  const taskName = (id) => tasks.find((task) => task.id === id)?.name || id;

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

      <Card
        icon={CalendarRange}
        title="Task Timeline"
        subtitle={`${formatPlanningDate(timeline.start)} → ${formatPlanningDate(timeline.end)} · ${
          timeline.days
        } day window`}
        className="dash-section gantt-card"
        actions={
          <Select
            id="schedule-project"
            label=""
            options={[
              { value: 'All', label: 'All Projects' },
              ...projects.map((project) => ({
                value: project.id,
                label: `${project.id} · ${project.name}`,
              })),
            ]}
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          />
        }
      >
        {visibleTasks.length === 0 ? (
          <p className="scope-empty">No design tasks for the current project filter.</p>
        ) : (
          <div className="gantt">
            <div className="gantt-axis">
              <span className="gantt-axis-label">Task / Milestone</span>
              <div className="gantt-axis-track">
                {timeline.ticks.map((tick) => (
                  <span
                    key={tick}
                    className="gantt-tick"
                    style={{ left: `${offset(tick)}%` }}
                  >
                    {new Date(`${tick}T00:00:00`).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                ))}
              </div>
            </div>

            {visibleMilestones.length > 0 && (
              <div className="gantt-row gantt-milestone-row">
                <div className="gantt-label">
                  <span className="gantt-label-title">
                    <Flag aria-hidden="true" /> Milestones
                  </span>
                  <span className="gantt-label-meta">{visibleMilestones.length} delivery gates</span>
                </div>
                <div className="gantt-track">
                  {visibleMilestones.map((milestone) => (
                    <span
                      key={milestone.id}
                      className={`gantt-milestone tone-${milestone.status
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                      style={{ left: `${offset(milestone.planned)}%` }}
                      title={`${milestone.name} · ${formatDate(milestone.planned)} · ${milestone.status}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {visibleTasks.map((task) => {
              const barWidth = width(task.start, task.due);
              return (
              <div className="gantt-row" key={task.id}>
                <div className="gantt-label">
                  <span className="gantt-label-title" title={task.name}>
                    {task.name}
                  </span>
                  <span className="gantt-label-meta">
                    {task.id} · {task.projectId} · {task.engineer}
                    {task.dependencies.length > 0 && ` · after ${task.dependencies.join(', ')}`}
                  </span>
                </div>
                <div className="gantt-track">
                  <span
                    className={`gantt-bar tone-${barTone(task)}`}
                    style={{ left: `${offset(task.start)}%`, width: `${barWidth}%` }}
                    title={`${task.name} · ${formatDate(task.start)} → ${formatDate(task.due)} · ${task.status} · ${task.progress}%`}
                  >
                    <span className="gantt-bar-fill" style={{ width: `${task.progress}%` }} />
                    {barWidth > 8 && <span className="gantt-bar-label">{task.progress}%</span>}
                  </span>
                  {task.status === 'Blocked' && (
                    <span
                      className="gantt-flag"
                      style={{ left: `${offset(task.due)}%` }}
                      title="Blocked task"
                    >
                      !
                    </span>
                  )}
                </div>
              </div>
              );
            })}

            <div className="gantt-row gantt-today-row">
              <div className="gantt-label">
                <span className="gantt-label-title">Today</span>
                <span className="gantt-label-meta">{formatDate(TODAY)}</span>
              </div>
              <div className="gantt-track">
                <span className="gantt-today" style={{ left: `${offset(TODAY)}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="gantt-legend">
          <span className="gantt-legend-item">
            <span className="gantt-swatch tone-green" /> Completed
          </span>
          <span className="gantt-legend-item">
            <span className="gantt-swatch tone-teal" /> In progress / review
          </span>
          <span className="gantt-legend-item">
            <span className="gantt-swatch tone-orange" /> Changes requested
          </span>
          <span className="gantt-legend-item">
            <span className="gantt-swatch tone-red" /> Blocked
          </span>
          <span className="gantt-legend-item">
            <span className="gantt-swatch tone-gray" /> Not started / assigned
          </span>
          <span className="gantt-legend-item">
            <span className="gantt-swatch is-diamond" /> Milestone
          </span>
        </div>
      </Card>

      <Card
        icon={CalendarRange}
        title="Dependency Chains"
        subtitle="Tasks that cannot start until their predecessor is finished"
        className="dash-section"
      >
        {dependencyRows.length === 0 ? (
          <p className="scope-empty">No dependencies recorded for the current filter.</p>
        ) : (
          <ul className="dependency-list">
            {dependencyRows.map((task) => (
              <li key={task.id} className="dependency-row">
                <span className="dependency-task">
                  <span className="cell-id">{task.id}</span>
                  <span className="dependency-task-name">{task.name}</span>
                </span>
                <span className="dependency-after">
                  {task.dependencies.map((dependency) => (
                    <span key={dependency} className="dep-chip" title={taskName(dependency)}>
                      after {dependency}
                    </span>
                  ))}
                </span>
                <span className="dependency-dates">
                  {formatDate(task.start)} → {formatDate(task.due)}
                </span>
                <StatusBadge status={task.status} tone={taskStatusTone(task.status)} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="planning-footnote">
        <Button variant="ghost" size="sm" onClick={() => setProjectId('All')}>
          Show all projects
        </Button>
        Timeline dates are mock planning dates · bars scale to the visible window.
      </p>
    </>
  );
}
