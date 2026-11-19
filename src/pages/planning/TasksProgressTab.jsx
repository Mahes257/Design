import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarRange, List, Plus } from 'lucide-react';
import { Button } from '../../components/common';
import DesignTasksTab from './DesignTasksTab';
import DesignScheduleTab from './DesignScheduleTab';

/**
 * Tasks & Progress — one section with a list view and a timeline view. Both
 * views operate on the same project-linked task records.
 */
export default function TasksProgressTab() {
  const navigate = useNavigate();
  const [view, setView] = useState('list');

  return (
    <>
      <div className="planning-view-bar">
        <div className="planning-view-switch" role="tablist" aria-label="Task view">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'list'}
            className={`planning-view-button${view === 'list' ? ' is-active' : ''}`}
            onClick={() => setView('list')}
          >
            <List aria-hidden="true" />
            List View
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'timeline'}
            className={`planning-view-button${view === 'timeline' ? ' is-active' : ''}`}
            onClick={() => setView('timeline')}
          >
            <CalendarRange aria-hidden="true" />
            Timeline View
          </button>
        </div>
        <Button icon={Plus} onClick={() => navigate('/design-planning/design-tasks/new')}>
          New Task
        </Button>
      </div>

      {view === 'list' ? <DesignTasksTab /> : <DesignScheduleTab />}
    </>
  );
}
