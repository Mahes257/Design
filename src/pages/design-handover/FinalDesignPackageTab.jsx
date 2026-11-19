import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, FolderPlus, Lock, RotateCcw } from 'lucide-react';
import { Button, Input, StatusBadge, Textarea } from '../../components/common';
import { useDesignHandover } from '../../context/DesignHandoverContext';
import { PACKAGE_CATEGORIES, formatHandoverDate, packageCompleteness, selectedPackageItems } from '../../data/designHandoverData';
import { CategoryLabel, CompletenessBar, HandoverSelector, NoHandovers } from './designHandoverUi';

export default function FinalDesignPackageTab() {
  const navigate = useNavigate();
  const {
    handovers,
    getPackage,
    catalogsFor,
    createPackage,
    togglePackageItem,
    savePackageDetails,
    markPackagePrepared,
    reopenPackage,
  } = useDesignHandover();
  const [handoverId, setHandoverId] = useState(handovers[0]?.id || '');
  const [preparedBy, setPreparedBy] = useState('Design Admin');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (handoverId && handovers.some((row) => row.id === handoverId)) return;
    setHandoverId(handovers[0]?.id || '');
  }, [handovers, handoverId]);

  const handover = handovers.find((row) => row.id === handoverId) || null;
  const packageRecord = handover ? getPackage(handover.id) : null;
  const catalogs = useMemo(() => (handover ? catalogsFor(handover) : []), [handover, catalogsFor]);
  const completeness = packageCompleteness(packageRecord);

  useEffect(() => {
    if (!packageRecord) {
      setPreparedBy('Design Admin');
      setNotes('');
      return;
    }
    setPreparedBy(packageRecord.preparedBy || 'Design Admin');
    setNotes(packageRecord.notes || '');
  }, [packageRecord?.id]);

  if (handovers.length === 0) {
    return <NoHandovers message="Create a handover first. The package builder links only records that actually exist in the design application." />;
  }

  const handleCreate = () => {
    const result = createPackage(handover.id, { preparedBy });
    setFeedback(result.error ? { tone: 'error', text: result.error } : { tone: 'success', text: 'Final design package created. Link the actual source records below.' });
  };

  const handleToggle = (category, item) => {
    const result = togglePackageItem(handover.id, category.key, item);
    if (result.error) setFeedback({ tone: 'error', text: result.error });
    else setFeedback(null);
  };

  const handleSaveDetails = () => {
    const result = savePackageDetails(handover.id, { preparedBy, notes });
    setFeedback(result.error ? { tone: 'error', text: result.error } : { tone: 'success', text: 'Package details saved.' });
  };

  const handlePrepared = () => {
    const result = markPackagePrepared(handover.id);
    setFeedback(result.error ? { tone: 'error', text: result.error } : { tone: 'success', text: 'Package marked Prepared. Release validation now uses this package.' });
  };

  const handleReopen = () => {
    const result = reopenPackage(handover.id);
    setFeedback(result.error ? { tone: 'error', text: result.error } : { tone: 'success', text: 'Package reopened as Draft.' });
  };

  return (
    <div className="dh-tab-stack">
      <div className="dh-section-heading">
        <div>
          <h2>Final Design Package</h2>
          <p>Link the actual controlled records already held in the design modules. Documents are never duplicated or fabricated.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/design-handover/validation')}>Continue to Validation</Button>
      </div>

      <HandoverSelector handovers={handovers} value={handoverId} onChange={(id) => { setHandoverId(id); setFeedback(null); }} />
      {feedback && <div className={`dh-feedback is-${feedback.tone}`} role="status">{feedback.text}</div>}

      {!packageRecord ? (
        <div className="dh-package-empty">
          <div>
            <span className="dh-eyebrow">No package for {handover.id}</span>
            <h3>Create the final design package</h3>
            <p>Select a package owner, then link the approved design, drawings, CAD models, BOM, manufacturing records, reviews and approval evidence.</p>
          </div>
          <div className="dh-package-empty-form">
            <Input label="Prepared by" id="package-prepared-by" value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} />
            <Button icon={FolderPlus} onClick={handleCreate}>Create Package</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="dh-package-summary">
            <div className="dh-package-heading">
              <div>
                <span className="dh-eyebrow">Package summary</span>
                <h3>{packageRecord.id} <span>v{packageRecord.version}</span></h3>
                <p>{handover.projectId} · {handover.designId} Rev {handover.designRevision} · prepared {formatHandoverDate(packageRecord.preparedDate)}</p>
              </div>
              <StatusBadge status={packageRecord.status} />
            </div>
            <CompletenessBar packageRecord={packageRecord} />
            <div className="dh-package-actions">
              <Input label="Prepared by" id="package-owner" value={preparedBy} onChange={(event) => setPreparedBy(event.target.value)} disabled={packageRecord.status === 'Released'} />
              <Button variant="ghost" onClick={handleSaveDetails} disabled={packageRecord.status === 'Released'}>Save Details</Button>
              {packageRecord.status === 'Draft' && (
                <Button icon={Check} onClick={handlePrepared} disabled={completeness.missingMandatory.length > 0}>Mark Package Prepared</Button>
              )}
              {packageRecord.status === 'Prepared' && (
                <Button variant="secondary" icon={RotateCcw} onClick={handleReopen}>Reopen for Correction</Button>
              )}
              {packageRecord.status === 'Released' && (
                <span className="dh-locked-note"><Lock aria-hidden="true" /> Released package selections are locked.</span>
              )}
            </div>
            <Textarea label="Package notes" id="package-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} disabled={packageRecord.status === 'Released'} />
          </div>

          <div className="dh-category-grid">
            {catalogs.map((category) => {
              const selected = selectedPackageItems(packageRecord, category.key);
              const isMissing = category.mandatory && selected.length === 0;
              return (
                <details key={category.key} className={`dh-category ${isMissing ? 'is-missing' : selected.length ? 'is-linked' : ''}`} open={isMissing || selected.length > 0}>
                  <summary>
                    <CategoryLabel category={category} />
                    <span className="dh-category-count">{selected.length}/{category.sources.length}</span>
                  </summary>
                  <div className="dh-category-body">
                    <p className="dh-category-description">{category.description}</p>
                    <p className="dh-category-source">Source: {category.sourceModule} · {category.sourceRecordType}</p>
                    {category.sources.length === 0 ? (
                      <div className="dh-source-unavailable">No actual source record is available for this category in the selected project.</div>
                    ) : (
                      <ul className="dh-source-list">
                        {category.sources.map((item) => {
                          const checked = selected.some((entry) => entry.sourceId === item.sourceId);
                          return (
                            <li key={item.sourceId} className={checked ? 'is-checked' : ''}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={packageRecord.status === 'Released'}
                                  onChange={() => handleToggle(category, item)}
                                />
                                <span className="dh-source-text">
                                  <strong>{item.label}</strong>
                                  <span>{item.sourceModule}{item.revision ? ` · Rev ${item.revision}` : ''}{item.detail ? ` · ${item.detail}` : ''}</span>
                                </span>
                                <StatusBadge status={item.status} />
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {isMissing && <p className="dh-category-warning">Mandatory category not linked. This keeps the package incomplete.</p>}
                  </div>
                </details>
              );
            })}
          </div>

          <div className="dh-note-panel">
            <strong>Required-document checklist</strong>
            <div className="dh-checklist">
              {PACKAGE_CATEGORIES.map((category) => {
                const selected = selectedPackageItems(packageRecord, category.key);
                return (
                  <span key={category.key} className={selected.length ? 'is-complete' : category.mandatory ? 'is-missing' : ''}>
                    {selected.length ? <Check aria-hidden="true" /> : '○'} {category.label}
                  </span>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
