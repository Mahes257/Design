import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Info,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings as SettingsIcon,
  Trash2,
} from 'lucide-react';
import {
  Breadcrumb,
  Button,
  Input,
  Modal,
  PageHeader,
  PageLayout,
  Select,
  Textarea,
} from '../../components/common';
import ManageColumns from '../../components/common/ManageColumns';
import useTableColumnVisibility from '../../hooks/useTableColumnVisibility';
import { useSettings } from '../../context/SettingsContext';
import {
  CONFIGURABLE_CATEGORIES,
  SETTINGS_BY_KEY,
  SETTINGS_CATEGORIES,
  fieldOptions,
  formatFieldValue,
  getCategoryDefaults,
} from '../../data/settingsData';

const SETTINGS_BASE = '/settings';

function toDateLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function categoryPath(category, edit = false) {
  if (!category || category.type === 'overview') return SETTINGS_BASE;
  return `${SETTINGS_BASE}/${category.key}${edit ? '/edit' : ''}`;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeRowId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildDocumentNumber(config, document) {
  if (!document) return '—';
  const separator = config.separator || '-';
  const prefix = [config.globalPrefix, document.prefix].filter(Boolean).join(separator);
  const parts = [prefix];
  if (config.includeYear) parts.push(String(new Date().getFullYear()));
  parts.push(String(document.nextNumber ?? 1).padStart(Number(document.padding) || 4, '0'));
  if (document.suffix) parts.push(document.suffix);
  return parts.join(separator);
}

/* ==========================================================================
   Settings workspace — the vertical settings menu plus the selected page.
   The route owns three distinct states: overview, category view and edit.
   ========================================================================== */
export default function SettingsModulePage() {
  const { pathname, state: locationState } = useLocation();
  const navigate = useNavigate();
  const {
    values,
    meta,
    configurableCount,
    refresh,
    resetAll,
  } = useSettings();
  const [resetAllOpen, setResetAllOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const segments = pathname.split('/').filter(Boolean);
  const sectionKey = segments[1] || 'overview';
  const isEdit = segments[2] === 'edit';
  const category = SETTINGS_BY_KEY[sectionKey];

  useEffect(() => {
    setNotice('');
  }, [pathname]);

  if (!category || segments.length > 3 || (segments[2] && segments[2] !== 'edit')) {
    return <Navigate to={SETTINGS_BASE} replace />;
  }

  const isOverview = category.type === 'overview';
  if (isOverview && isEdit) return <Navigate to={SETTINGS_BASE} replace />;

  const config = values[category.key];
  const categoryMeta = meta[category.key];
  const saveFlash = !isOverview && !isEdit && locationState?.savedCategory === category.key;

  const crumbs = isOverview
    ? [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Settings' },
      ]
    : [
        { label: 'Dashboard', to: '/dashboard' },
        { label: 'Settings', to: SETTINGS_BASE },
        { label: category.label, ...(isEdit ? { to: categoryPath(category) } : {}) },
        ...(isEdit ? [{ label: 'Edit' }] : []),
      ];

  const handleRefresh = () => {
    refresh();
    setNotice('Settings refreshed from the saved browser configuration.');
  };

  return (
    <PageLayout
      breadcrumb={<Breadcrumb items={crumbs} />}
      header={
        <PageHeader
          icon={SettingsIcon}
          title="Mechanical Design Settings"
          subtitle="Configure engineering rules, approvals, finance, documents and organisation preferences."
          actions={
            isOverview ? (
              <>
                <Button variant="ghost" icon={RefreshCw} onClick={handleRefresh}>
                  Refresh
                </Button>
                <Button variant="secondary" icon={RotateCcw} onClick={() => setResetAllOpen(true)}>
                  Reset all
                </Button>
              </>
            ) : null
          }
        />
      }
      tabs={
        <div className="settings-module-tab-row">
          <span className="settings-module-tab">
            <SettingsIcon aria-hidden="true" />
            Settings
          </span>
        </div>
      }
    >
      {notice && (
        <div className="settings-flash settings-flash-page" role="status">
          <Info aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <div className="settings-workspace">
        <aside className="settings-nav-panel">
          <nav className="settings-nav" aria-label="Settings sections">
            {SETTINGS_CATEGORIES.map((item) => {
              const Icon = item.icon;
              const active = item.key === category.key;
              return (
                <Link
                  key={item.key}
                  to={categoryPath(item)}
                  className={`settings-nav-item${active ? ' is-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon aria-hidden="true" style={{ color: active ? '#075e54' : item.tone }} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="settings-main">
          <div className="settings-mobile-nav">
            <label htmlFor="settings-mobile-section">Settings section</label>
            <select
              id="settings-mobile-section"
              value={category.key}
              onChange={(event) => {
                const next = SETTINGS_BY_KEY[event.target.value];
                navigate(categoryPath(next));
              }}
            >
              {SETTINGS_CATEGORIES.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {isOverview && (
            <SettingsOverview
              values={values}
              meta={meta}
              configurableCount={configurableCount}
            />
          )}

          {!isOverview && !isEdit && (
            <SettingsView
              key={category.key}
              category={category}
              config={config}
              meta={categoryMeta}
              saved={Boolean(saveFlash)}
            />
          )}

          {!isOverview && isEdit && (
            <SettingsEditor
              key={category.key}
              category={category}
              config={config}
            />
          )}
        </div>
      </div>

      <Modal
        open={resetAllOpen}
        onClose={() => setResetAllOpen(false)}
        title="Reset all settings?"
        subtitle="This restores every configuration category to its default values."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetAllOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={RotateCcw}
              onClick={() => {
                resetAll();
                setResetAllOpen(false);
                setNotice('All settings have been restored to their default values.');
              }}
            >
              Reset all settings
            </Button>
          </>
        }
      >
        <p className="settings-modal-copy">
          Your current configuration values will be replaced. This only affects the local browser
          configuration used by this prototype.
        </p>
      </Modal>
    </PageLayout>
  );
}

/* ==========================================================================
   Overview — configuration health, quick access cards and recent updates.
   ========================================================================== */
function SettingsOverview({ values, meta, configurableCount }) {
  const recentlyUpdated = useMemo(
    () =>
      [...CONFIGURABLE_CATEGORIES]
        .sort((left, right) => {
          const leftTime = new Date(meta[left.key]?.updatedAt || 0).getTime();
          const rightTime = new Date(meta[right.key]?.updatedAt || 0).getTime();
          return rightTime - leftTime;
        })
        .slice(0, 3),
    [meta],
  );

  return (
    <section className="settings-panel settings-overview">
      <div className="settings-health">
        <div className="settings-health-copy">
          <h2>Configuration Health</h2>
          <p>{configurableCount} of {configurableCount} sections configured</p>
        </div>
        <strong className="settings-health-value">100%</strong>
        <div className="settings-health-track" aria-hidden="true">
          <span />
        </div>
      </div>

      <div className="settings-overview-grid">
        {CONFIGURABLE_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const summary = category.summary ? category.summary(values[category.key]) : category.description;
          return (
            <Link
              key={category.key}
              to={categoryPath(category)}
              className="settings-overview-card"
            >
              <span className="settings-overview-icon" style={{ color: category.tone }}>
                <Icon aria-hidden="true" />
              </span>
              <span className="settings-overview-body">
                <span className="settings-overview-title-row">
                  <strong>{category.label}</strong>
                  <ChevronRight aria-hidden="true" />
                </span>
                <span className="settings-overview-summary">{summary}</span>
                <span className="settings-status">
                  <Check aria-hidden="true" />
                  Configured
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="settings-recent">
        <div className="settings-recent-heading">
          <h3>Recently updated</h3>
          <p>Local configuration activity in this browser.</p>
        </div>
        <div className="settings-recent-list">
          {recentlyUpdated.map((category) => {
            const Icon = category.icon;
            return (
              <Link key={category.key} to={categoryPath(category)} className="settings-recent-item">
                <span className="settings-recent-icon">
                  <Icon aria-hidden="true" style={{ color: category.tone }} />
                </span>
                <span>
                  <strong>{category.label}</strong>
                  <small>
                    Updated {toDateLabel(meta[category.key]?.updatedAt)} · {meta[category.key]?.updatedBy || 'Design Admin'}
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   View page — every configured value is rendered in meaningful sections.
   ========================================================================== */
function SettingsView({ category, config, meta, saved }) {
  const Icon = category.icon;

  return (
    <article className="settings-panel">
      <header className="settings-panel-header">
        <div className="settings-panel-heading">
          <span className="settings-category-icon" style={{ color: category.tone }}>
            <Icon aria-hidden="true" />
          </span>
          <div>
            <h2>{category.label}</h2>
            <p>{category.description}</p>
            <div className="settings-panel-meta">
              <span className="settings-status">
                <Check aria-hidden="true" />
                Configured
              </span>
              <span>Last updated {toDateLabel(meta?.updatedAt)}</span>
              <span>{meta?.updatedBy || 'Design Admin'}</span>
            </div>
          </div>
        </div>
        <div className="settings-panel-actions">
          <Link to={SETTINGS_BASE} className="btn-secondary settings-link-btn">
            <ArrowLeft aria-hidden="true" />
            All settings
          </Link>
          <Link to={categoryPath(category, true)} className="erp-btn-primary settings-link-btn">
            <Pencil aria-hidden="true" />
            Edit configuration
          </Link>
        </div>
      </header>

      {saved && (
        <div className="settings-flash" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>{category.label} configuration saved.</span>
        </div>
      )}

      <div className="settings-summary-strip">
        <Info aria-hidden="true" />
        <span>{category.summary ? category.summary(config) : category.description}</span>
      </div>

      <div className="settings-view-sections">
        {category.sections.map((section) => (
          <section key={section.key} className="settings-view-section">
            <div className="settings-section-heading">
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>
            <dl className="settings-values">
              {section.fields.map((field) => {
                const value = config[field.key];
                const wide =
                  field.wide ||
                  field.type === 'textarea' ||
                  (typeof value === 'string' && value.length > 72);
                return (
                  <div key={field.key} className={`settings-value${wide ? ' is-wide' : ''}`}>
                    <dt>{field.label}</dt>
                    <dd>
                      {field.type === 'toggle' ? (
                        <span className={`settings-value-toggle${value ? ' is-on' : ''}`}>
                          {value ? 'Enabled' : 'Disabled'}
                        </span>
                      ) : (
                        formatFieldValue(field, value)
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>

      {category.list && (
                <SettingsListSection
          category={category}
          list={category.list}
          rows={config[category.list.key] || []}
          config={config}
        />
      )}
    </article>
  );
}

/* ==========================================================================
   Read-only list section with search and active-state filtering.
   ========================================================================== */
function SettingsListSection({ category, list, rows, config }) {
  const [query, setQuery] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const hasActiveField = list.fields.some((field) => field.key === 'active');
  const isNumbering = category.key === 'document-numbering';
  const listColumns = useTableColumnVisibility(
    `settings.list.${category.key}.${list.key}`,
    [
      { key: '__row', label: '#' },
      ...list.fields.map((field) => ({ key: field.key, label: field.label })),
      ...(isNumbering ? [{ key: '__sample', label: 'Sample number' }] : []),
    ],
    { mandatory: ['__row'] },
  );

  const filteredRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (activeOnly && hasActiveField && !row.active) return false;
      if (!search) return true;
      return list.fields
        .map((field) => formatFieldValue(field, row[field.key]))
        .join(' ')
        .toLowerCase()
        .includes(search);
    });
  }, [rows, query, activeOnly, hasActiveField, list.fields]);

  return (
    <section className="settings-list-section">
      <div className="settings-list-heading">
        <div className="settings-section-heading">
          <h3>{list.title}</h3>
          <p>{list.description}</p>
        </div>
        <span className="settings-count">
          {filteredRows.length} of {rows.length}
        </span>
      </div>

      <div className="settings-list-toolbar">
        <label className="settings-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${list.title.toLowerCase()}...`}
            aria-label={`Search ${list.title}`}
          />
        </label>
        {hasActiveField && (
          <label className="settings-check-label">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(event) => setActiveOnly(event.target.checked)}
            />
            Active only
          </label>
        )}
      </div>

      {filteredRows.length === 0 ? (
        <div className="settings-list-empty">
          <Search aria-hidden="true" />
          <strong>No matching records</strong>
          <span>Try a different search or clear the active-only filter.</span>
        </div>
      ) : (
        <>
        <ManageColumns {...listColumns.managerProps} />
        <div className="settings-table-wrap">
          <table className="settings-table">
            <thead>
              <tr>
                <th>#</th>
                {list.fields
                  .filter((field) => listColumns.isVisible(field.key))
                  .map((field) => (
                    <th key={field.key}>{field.label}</th>
                  ))}
                {isNumbering && listColumns.isVisible('__sample') && <th>Sample number</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={row.id || index}>
                  <td className="settings-row-number">{index + 1}</td>
                  {list.fields.filter((field) => listColumns.isVisible(field.key)).map((field) => {
                    const value = row[field.key];
                    return (
                      <td key={field.key}>
                        {field.key === 'active' ? (
                          <span className={`settings-status${value ? '' : ' is-muted'}`}>
                            {value ? <Check aria-hidden="true" /> : null}
                            {value ? 'Active' : 'Inactive'}
                          </span>
                        ) : field.type === 'checkbox' ? (
                          <span className={`settings-permission${value ? ' is-on' : ''}`}>
                            {value ? 'Allowed' : 'No'}
                          </span>
                        ) : field.type === 'textarea' ? (
                          <span className="settings-table-text">{value}</span>
                        ) : (
                          formatFieldValue(field, value)
                        )}
                      </td>
                    );
                  })}
                  {isNumbering && listColumns.isVisible('__sample') && (
                    <td>
                      <code className="settings-code-inline">
                        {buildDocumentNumber(config, row)}
                      </code>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </section>
  );
}

/* ==========================================================================
   Edit page — category-specific fields, list editor, validation and actions.
   ========================================================================== */
function SettingsEditor({ category, config }) {
  const navigate = useNavigate();
  const { saveCategory } = useSettings();
  const [draft, setDraft] = useState(() => deepClone(config));
  const [errors, setErrors] = useState({});
  const [resetOpen, setResetOpen] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(config), [draft, config]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const setField = (key, value) => {
    setResetNotice(false);
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const setListRow = (listKey, rowId, fieldKey, value) => {
    setResetNotice(false);
    setDraft((previous) => ({
      ...previous,
      [listKey]: previous[listKey].map((row) =>
        row.id === rowId ? { ...row, [fieldKey]: value } : row,
      ),
    }));
    setErrors((previous) => {
      const errorKey = `${listKey}.${rowId}.${fieldKey}`;
      if (!previous[errorKey]) return previous;
      const next = { ...previous };
      delete next[errorKey];
      return next;
    });
  };

  const addListRow = (list) => {
    const newRow = { id: makeRowId() };
    list.fields.forEach((field) => {
      newRow[field.key] = field.default ?? (field.type === 'toggle' || field.type === 'checkbox' ? false : '');
    });
    setDraft((previous) => ({ ...previous, [list.key]: [...previous[list.key], newRow] }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[list.key];
      return next;
    });
  };

  const removeListRow = (listKey, rowId) => {
    setDraft((previous) => ({
      ...previous,
      [listKey]: previous[listKey].filter((row) => row.id !== rowId),
    }));
  };

  const moveListRow = (listKey, rowId, direction) => {
    setDraft((previous) => {
      const list = [...previous[listKey]];
      const index = list.findIndex((row) => row.id === rowId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= list.length) return previous;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...previous, [listKey]: list };
    });
  };

  const leaveEditor = () => {
    if (
      dirty &&
      !window.confirm('Discard the unsaved changes and return to the settings view?')
    ) {
      return;
    }
    navigate(categoryPath(category));
  };

  const handleSave = (event) => {
    event.preventDefault();
    const normalized = normalizeDraft(category, draft);
    const nextErrors = validateDraft(category, normalized);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    saveCategory(category.key, normalized);
    navigate(categoryPath(category), {
      state: { savedCategory: category.key, savedAt: Date.now() },
    });
  };

  const Icon = category.icon;
  const errorCount = Object.keys(errors).length;

  return (
    <article className="settings-panel settings-editor">
      <header className="settings-panel-header">
        <div className="settings-panel-heading">
          <span className="settings-category-icon" style={{ color: category.tone }}>
            <Icon aria-hidden="true" />
          </span>
          <div>
            <h2>Configure {category.label}</h2>
            <p>{category.description}</p>
            <div className="settings-panel-meta">
              <span className={`settings-draft-badge${dirty ? ' is-dirty' : ''}`}>
                {dirty ? 'Unsaved changes' : 'Saved configuration'}
              </span>
            </div>
          </div>
        </div>
        <div className="settings-panel-actions">
          <button type="button" className="settings-back-link" onClick={leaveEditor}>
            <ArrowLeft aria-hidden="true" />
            Back to view
          </button>
        </div>
      </header>

      <form onSubmit={handleSave} noValidate>
        {errorCount > 0 && (
          <div className="settings-error-banner" role="alert">
            <CircleAlert aria-hidden="true" />
            <span>
              {errorCount} field{errorCount === 1 ? ' needs' : 's need'} attention. Review the
              highlighted inputs before saving.
            </span>
          </div>
        )}

        {resetNotice && (
          <div className="settings-flash" role="status">
            <Info aria-hidden="true" />
            <span>Defaults restored in the editor. Choose Save changes to apply them.</span>
          </div>
        )}

        {category.sections.map((section) => (
          <section key={section.key} className="settings-editor-section">
            <div className="settings-section-heading">
              <h3>{section.title}</h3>
              <p>{section.description}</p>
            </div>
            <div className="settings-form-grid">
              {section.fields.map((field) => (
                <SettingsField
                  key={field.key}
                  field={field}
                  value={draft[field.key]}
                  error={errors[field.key]}
                  onChange={(value) => setField(field.key, value)}
                />
              ))}
            </div>
          </section>
        ))}

        {category.list && (
          <SettingsListEditor
            list={category.list}
            rows={draft[category.list.key] || []}
            errors={errors}
            onAdd={() => addListRow(category.list)}
            onRemove={(rowId) => removeListRow(category.list.key, rowId)}
            onMove={(rowId, direction) => moveListRow(category.list.key, rowId, direction)}
            onChange={(rowId, fieldKey, value) =>
              setListRow(category.list.key, rowId, fieldKey, value)
            }
            listError={errors[category.list.key]}
          />
        )}

        {category.key === 'document-numbering' && (
          <NumberingPreview config={draft} />
        )}

        <footer className="settings-form-footer">
          <div className="settings-form-footer-copy">
            <span className={`settings-draft-dot${dirty ? ' is-dirty' : ''}`} aria-hidden="true" />
            {dirty ? 'Unsaved changes are kept in this editor until you save.' : 'No unsaved changes.'}
            <small>Configuration is stored locally in this browser.</small>
          </div>
          <div className="settings-form-actions">
            <Button variant="ghost" type="button" onClick={leaveEditor}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              type="button"
              icon={RotateCcw}
              onClick={() => setResetOpen(true)}
            >
              Reset to defaults
            </Button>
            <Button type="submit" icon={Save}>
              Save changes
            </Button>
          </div>
        </footer>
      </form>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={`Reset ${category.label}?`}
        subtitle="Only this configuration section will be restored."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              icon={RotateCcw}
              onClick={() => {
                setDraft(getCategoryDefaults(category.key));
                setErrors({});
                setResetNotice(true);
                setResetOpen(false);
              }}
            >
              Reset section
            </Button>
          </>
        }
      >
        <p className="settings-modal-copy">
          The editor will be filled with the default values for this section. Nothing is saved until
          you choose <strong>Save changes</strong>.
        </p>
      </Modal>
    </article>
  );
}

/* ==========================================================================
   Field renderer — standard inputs, selectors, text areas and switches.
   ========================================================================== */
function SettingsField({ field, value, error, onChange }) {
  const id = `settings-field-${field.key}`;
  const wide = field.wide || field.type === 'textarea';
  const errorId = `${id}-error`;

  if (field.type === 'toggle') {
    return (
      <div className={`settings-field is-wide settings-toggle-field${error ? ' has-error' : ''}`}>
        <label className="settings-switch">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
          <span className="settings-switch-track" aria-hidden="true">
            <span />
          </span>
          <span>
            <strong>{field.label}</strong>
            {field.hint && <small>{field.hint}</small>}
          </span>
        </label>
        {error && (
          <span className="settings-inline-error" id={errorId}>
            {error}
          </span>
        )}
      </div>
    );
  }

  const shared = {
    id,
    label: field.label,
    hint: field.hint,
    required: field.required,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
    className: error ? 'is-invalid' : '',
  };

  return (
    <div className={`settings-field${wide ? ' is-wide' : ''}${error ? ' has-error' : ''}`}>
      {field.type === 'select' ? (
        <Select
          {...shared}
          options={fieldOptions(field)}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : field.type === 'textarea' ? (
        <Textarea
          {...shared}
          rows={3}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          {...shared}
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          min={field.min}
          max={field.max}
          step={field.step}
          placeholder={field.placeholder}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {error && (
        <span className="settings-inline-error" id={errorId}>
          {error}
        </span>
      )}
    </div>
  );
}

/* ==========================================================================
   Editable list — table fields, add/remove and sequence reordering.
   ========================================================================== */
function SettingsListEditor({ list, rows, errors, onAdd, onRemove, onMove, onChange, listError }) {
  const listColumns = useTableColumnVisibility(
    `settings.editor.${list.key}`,
    [
      { key: '__row', label: list.reorder ? 'Sequence' : '#' },
      ...list.fields.map((field) => ({ key: field.key, label: field.label })),
      { key: '__actions', label: 'Actions' },
    ],
    { mandatory: ['__row', '__actions'] },
  );
  return (
    <section className="settings-editor-section settings-list-editor">
      <div className="settings-section-heading settings-list-heading">
        <div>
          <h3>{list.title}</h3>
          <p>{list.description}</p>
        </div>
        <span className="settings-count">{rows.length} configured</span>
      </div>

      {listError && <p className="settings-inline-error">{listError}</p>}

      <ManageColumns {...listColumns.managerProps} />
      <div className="settings-table-wrap settings-table-editor-wrap">
        <table className="settings-table settings-table-editor">
          <thead>
            <tr>
              <th>{list.reorder ? 'Sequence' : '#'}</th>
              {list.fields
                .filter((field) => listColumns.isVisible(field.key))
                .map((field) => (
                  <th key={field.key}>{field.label}</th>
                ))}
              <th className="settings-table-actions-heading">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={listColumns.visibleCount + 1} className="settings-table-empty">
                  No entries yet. Add the first {list.itemLabel.toLowerCase()}.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.id}>
                  <td className="settings-row-number">
                    <span>{list.reorder ? index + 1 : index + 1}</span>
                    {list.reorder && (
                      <span className="settings-row-order">
                        <button
                          type="button"
                          className="settings-row-action"
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={() => onMove(row.id, -1)}
                        >
                          <ArrowUp aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="settings-row-action"
                          aria-label="Move down"
                          disabled={index === rows.length - 1}
                          onClick={() => onMove(row.id, 1)}
                        >
                          <ArrowDown aria-hidden="true" />
                        </button>
                      </span>
                    )}
                  </td>
                  {list.fields.filter((field) => listColumns.isVisible(field.key)).map((field) => {
                    const error = errors[`${list.key}.${row.id}.${field.key}`];
                    const fieldId = `${list.key}-${row.id}-${field.key}`;
                    if (field.type === 'checkbox') {
                      return (
                        <td key={field.key}>
                          <label className="settings-row-check">
                            <input
                              id={fieldId}
                              type="checkbox"
                              checked={Boolean(row[field.key])}
                              onChange={(event) => onChange(row.id, field.key, event.target.checked)}
                              aria-label={`${field.label} for row ${index + 1}`}
                            />
                            <span>{row[field.key] ? 'Yes' : 'No'}</span>
                          </label>
                        </td>
                      );
                    }
                    if (field.type === 'select') {
                      return (
                        <td key={field.key}>
                          <select
                            id={fieldId}
                            className={`settings-row-input settings-row-select${error ? ' is-invalid' : ''}`}
                            value={row[field.key] ?? ''}
                            onChange={(event) => onChange(row.id, field.key, event.target.value)}
                            aria-invalid={Boolean(error)}
                            aria-label={field.label}
                          >
                            {fieldOptions(field).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {error && <span className="settings-row-error">{error}</span>}
                        </td>
                      );
                    }
                    if (field.type === 'textarea') {
                      return (
                        <td key={field.key}>
                          <textarea
                            id={fieldId}
                            rows={2}
                            className={`settings-row-input settings-row-textarea${error ? ' is-invalid' : ''}`}
                            value={row[field.key] ?? ''}
                            onChange={(event) => onChange(row.id, field.key, event.target.value)}
                            aria-invalid={Boolean(error)}
                            aria-label={field.label}
                          />
                          {error && <span className="settings-row-error">{error}</span>}
                        </td>
                      );
                    }
                    return (
                      <td key={field.key}>
                        <input
                          id={fieldId}
                          type={
                            field.type === 'number'
                              ? 'number'
                              : field.type === 'date'
                                ? 'date'
                                : 'text'
                          }
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          className={`settings-row-input${error ? ' is-invalid' : ''}`}
                          value={row[field.key] ?? ''}
                          placeholder={field.placeholder}
                          onChange={(event) => onChange(row.id, field.key, event.target.value)}
                          aria-invalid={Boolean(error)}
                          aria-label={field.label}
                        />
                        {error && <span className="settings-row-error">{error}</span>}
                      </td>
                    );
                  })}
                  <td>
                    <button
                      type="button"
                      className="settings-row-action is-danger"
                      aria-label={`Remove ${list.itemLabel.toLowerCase()} ${index + 1}`}
                      title={`Remove ${list.itemLabel.toLowerCase()}`}
                      onClick={() => onRemove(row.id)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Button variant="secondary" size="sm" icon={Plus} type="button" onClick={onAdd}>
        {list.addLabel}
      </Button>
    </section>
  );
}

/* ==========================================================================
   Document numbering live preview.
   ========================================================================== */
function NumberingPreview({ config }) {
  const documents = (config.documents || []).slice(0, 3);

  return (
    <section className="settings-editor-section settings-numbering-preview">
      <div className="settings-section-heading">
        <h3>Preview Generated Number</h3>
        <p>Preview uses the next sequence for each document type. Values update as you edit.</p>
      </div>
      {documents.length === 0 ? (
        <p className="settings-modal-copy">Add a document type to preview a generated number.</p>
      ) : (
        <div className="settings-number-grid">
          {documents.map((document) => (
            <div key={document.id} className="settings-number-item">
              <span>{document.label}</span>
              <code>{buildDocumentNumber(config, document)}</code>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ==========================================================================
   Normalisation and validation.
   ========================================================================== */
function normalizeDraft(category, draft) {
  const next = deepClone(draft);

  category.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'number' && next[field.key] !== '' && next[field.key] !== null) {
        next[field.key] = Number(next[field.key]);
      }
    });
  });

  if (category.list) {
    next[category.list.key] = (next[category.list.key] || []).map((row) => {
      const copy = { ...row };
      category.list.fields.forEach((field) => {
        if (field.type === 'number' && copy[field.key] !== '' && copy[field.key] !== null) {
          copy[field.key] = Number(copy[field.key]);
        }
      });
      return copy;
    });
  }

  return next;
}

function validateField(field, value) {
  if (field.required && (value === undefined || value === null || String(value).trim() === '')) {
    return `${field.label} is required.`;
  }
  if (field.type === 'number' && value !== undefined && value !== null && value !== '') {
    const number = Number(value);
    if (!Number.isFinite(number)) return 'Enter a valid number.';
    if (field.min !== undefined && number < field.min) return `Must be at least ${field.min}.`;
    if (field.max !== undefined && number > field.max) return `Must be ${field.max} or less.`;
  }
  return null;
}

function validateDraft(category, draft) {
  const errors = {};

  category.sections.forEach((section) => {
    section.fields.forEach((field) => {
      const message = validateField(field, draft[field.key]);
      if (message) errors[field.key] = message;
    });
  });

  if (category.list) {
    const rows = draft[category.list.key] || [];
    if (rows.length === 0) errors[category.list.key] = `Add at least one ${category.list.itemLabel.toLowerCase()}.`;
    rows.forEach((row) => {
      category.list.fields.forEach((field) => {
        const message = validateField(field, row[field.key]);
        if (message) errors[`${category.list.key}.${row.id}.${field.key}`] = message;
      });
    });
  }

  if (category.key === 'approval-matrix') {
    if (Number(draft.autoApproveBelow) >= Number(draft.twoLevelAbove)) {
      errors.autoApproveBelow = 'Auto-approve threshold must be below the two-level threshold.';
    }
    if (Number(draft.twoLevelAbove) > Number(draft.financeApprovalAbove)) {
      errors.financeApprovalAbove = 'Finance approval threshold must be above the two-level threshold.';
    }
  }

  if (category.key === 'budget-control') {
    if (Number(draft.warningThreshold) >= Number(draft.criticalThreshold)) {
      errors.warningThreshold = 'Warning threshold must be below the critical threshold.';
    }
  }

  return errors;
}
