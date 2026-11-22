import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Info, X } from 'lucide-react';
import materialMapData from '../maps/materialMap.json';
import type { MaterialsData } from '../types';
import {
  DUST_OF_AZOTH_KEY,
  DREAM_SOLVENT_KEY,
  DUST_RATES,
  GEM_TIER_LABELS,
  getFamilyGemKeys,
  getGemFamilyAndTier,
  getGemKey,
  getConvertibleSourceGems,
  getConvertibleSourceWeeklyDrops,
  getOwnedMaterialCount,
  calculateConversion,
  applyConversionToMaterials,
  type GemFamilyKey,
  type GemTier,
  type MaterialMapItem,
} from '../utils/conversionHelpers';
import './ConvertMaterialModal.css';

const materialMap = materialMapData as Record<string, MaterialMapItem>;

export type ConvertModalContext =
  | { mode: 'dust'; gemFamily: GemFamilyKey; familyName: string }
  | { mode: 'solvent'; bossName: string; drops: string[] };

interface ConvertMaterialModalProps {
  isOpen: boolean;
  context: ConvertModalContext | null;
  materials: MaterialsData | null;
  onClose: () => void;
  onConvert: (updatedMaterials: MaterialsData) => void;
  setHoveredItem: (item: { key: string; data: MaterialMapItem } | null) => void;
  setMousePos: (pos: { x: number; y: number }) => void;
}

function getMaterialIconUrl(key: string): string {
  const entry = materialMap[key];
  if (entry?.localExt) {
    return `${import.meta.env.BASE_URL}icons/${entry.id}${entry.localExt}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(entry?.name || key)}&background=random&color=fff&rounded=true&font-size=0.33`;
}

function isPointerOutsideRect(e: PointerEvent, el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

export const ConvertMaterialModal: React.FC<ConvertMaterialModalProps> = ({
  isOpen,
  context,
  materials,
  onClose,
  onConvert,
  setHoveredItem,
  setMousePos,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pickerDialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pickerTitleId = useId();
  const rateTooltipId = useId();
  const disabledTooltipId = useId();

  // Top selection:
  // - In dust mode: optional GemTier filter/target ('gemstone' | 'chunk' | 'fragment' | 'sliver' | null)
  // - In solvent mode: selected target weekly boss drop key (string | null)
  const [selectedTopKey, setSelectedTopKey] = useState<string | null>(null);
  // Left "?" slot selected source material key
  const [selectedSourceKey, setSelectedSourceKey] = useState<string | null>(null);
  // Desired conversion quantity (right-side input)
  const [convertAmountStr, setConvertAmountStr] = useState<string>('0');
  // Draft inventory overrides (so inline inventory edits persist while interacting inside the modal)
  const [draftInventories, setDraftInventories] = useState<Record<string, string>>({});
  // Source picker sub-dialog open state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  // Info ("i") rate tooltip state (WCAG 1.4.13 hoverable + focusable + click toggletip)
  const [isRateTooltipOpen, setIsRateTooltipOpen] = useState(false);
  // Disabled Convert button hover tooltip ("Not enough materials")
  const [isInsufficientHovered, setIsInsufficientHovered] = useState(false);

  const catalystKey = context?.mode === 'dust' ? DUST_OF_AZOTH_KEY : DREAM_SOLVENT_KEY;

  // Reset modal internal state whenever opened for a new context
  useEffect(() => {
    if (!isOpen || !context) return;
    setSelectedTopKey(null);
    setSelectedSourceKey(null);
    setConvertAmountStr('0');
    setDraftInventories({});
    setIsPickerOpen(false);
    setIsRateTooltipOpen(false);
    setIsInsufficientHovered(false);
    setHoveredItem(null);
  }, [isOpen, context, setHoveredItem]);

  // Manage native main <dialog> lifecycle + Safari light-dismiss fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && context) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, context]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      setHoveredItem(null);
      setIsPickerOpen(false);
      onClose();
    };

    dialog.addEventListener('close', handleClose);

    // Fallback light-dismiss when native closedby="any" is unsupported (e.g. Safari)
    let cleanupPointerFallback: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isPointerOutsideRect(e, dialog);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isPointerOutsideRect(e, dialog)) {
          dialog.close();
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupPointerFallback = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupPointerFallback?.();
    };
  }, [onClose, setHoveredItem]);

  // Manage nested source picker <dialog> lifecycle + Safari light-dismiss fallback
  useEffect(() => {
    const picker = pickerDialogRef.current;
    if (!picker) return;

    if (isPickerOpen) {
      if (!picker.open) {
        picker.showModal();
      }
    } else if (picker.open) {
      picker.close();
    }
  }, [isPickerOpen]);

  useEffect(() => {
    const picker = pickerDialogRef.current;
    if (!picker) return;

    const handleClose = () => {
      setHoveredItem(null);
      setIsPickerOpen(false);
    };

    picker.addEventListener('close', handleClose);

    let cleanupPointerFallback: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = isPointerOutsideRect(e, picker);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && isPointerOutsideRect(e, picker)) {
          picker.close();
        }
        pressedOutside = false;
      };
      picker.addEventListener('pointerdown', onPointerDown);
      picker.addEventListener('pointerup', onPointerUp);
      cleanupPointerFallback = () => {
        picker.removeEventListener('pointerdown', onPointerDown);
        picker.removeEventListener('pointerup', onPointerUp);
      };
    }

    return () => {
      picker.removeEventListener('close', handleClose);
      cleanupPointerFallback?.();
    };
  }, [setHoveredItem]);

  // Allow Escape to dismiss the "i" rate tooltip cleanly without closing the modal
  useEffect(() => {
    if (!isRateTooltipOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setIsRateTooltipOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isRateTooltipOpen]);

  const topItems = useMemo(() => {
    if (!context) return [];
    if (context.mode === 'dust') {
      return getFamilyGemKeys(context.gemFamily);
    }
    return context.drops;
  }, [context]);

  // Active target key on the right of "->"
  const activeTargetKey = useMemo<string | null>(() => {
    if (!context) return null;
    if (context.mode === 'dust') {
      if (selectedSourceKey) {
        const sourceInfo = getGemFamilyAndTier(selectedSourceKey);
        if (sourceInfo) {
          return getGemKey(context.gemFamily, sourceInfo.tier);
        }
      }
      return selectedTopKey;
    }
    // Solvent mode: target is strictly whatever top weekly boss drop is selected
    return selectedTopKey;
  }, [context, selectedSourceKey, selectedTopKey]);

  // Active Dust/Solvent rate per unit
  const catalystRatePerUnit = useMemo(() => {
    if (!context) return 1;
    if (context.mode === 'solvent') return 1;
    const tierSource = activeTargetKey ? getGemFamilyAndTier(activeTargetKey) : null;
    return tierSource ? DUST_RATES[tierSource.tier] : 1;
  }, [context, activeTargetKey]);

  const getDraftInventoryStr = (key: string): string => {
    if (key in draftInventories) {
      return draftInventories[key];
    }
    return String(getOwnedMaterialCount(materials, key));
  };

  const getEffectiveInventory = (key: string): number => {
    const raw = getDraftInventoryStr(key);
    const parsed = parseInt(raw, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  };

  const handleInventoryInputChange = (key: string, value: string) => {
    if (value === '') {
      setDraftInventories((prev) => ({ ...prev, [key]: '' }));
      return;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    setDraftInventories((prev) => ({ ...prev, [key]: String(Math.max(0, parsed)) }));
  };

  const handleConvertAmountChange = (value: string) => {
    if (value === '') {
      setConvertAmountStr('');
      return;
    }
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    setConvertAmountStr(String(Math.max(0, parsed)));
  };

  const parsedConvertAmount = useMemo(() => {
    const parsed = parseInt(convertAmountStr, 10);
    return Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
  }, [convertAmountStr]);

  const sourceInventory = selectedSourceKey ? getEffectiveInventory(selectedSourceKey) : 0;
  const catalystInventory = getEffectiveInventory(catalystKey);
  const targetInventory = activeTargetKey ? getEffectiveInventory(activeTargetKey) : 0;

  const calc = useMemo(
    () =>
      calculateConversion({
        sourceKey: selectedSourceKey,
        targetKey: activeTargetKey,
        sourceInventory,
        catalystInventory,
        convertAmount: parsedConvertAmount,
        catalystRatePerUnit,
      }),
    [
      selectedSourceKey,
      activeTargetKey,
      sourceInventory,
      catalystInventory,
      parsedConvertAmount,
      catalystRatePerUnit,
    ]
  );

  // Handlers for clicking top strip icons
  const handleTopItemClick = (itemKey: string) => {
    if (!context) return;

    if (selectedTopKey === itemKey) {
      // Unselect currently selected top icon
      setSelectedTopKey(null);
      if (context.mode === 'solvent') {
        // In solvent mode, unselecting the top target disables "?" and resets source & input
        setSelectedSourceKey(null);
        setConvertAmountStr('0');
      }
      return;
    }

    setSelectedTopKey(itemKey);

    if (context.mode === 'dust') {
      // If a source stone was already chosen, update it to match the newly selected tier
      if (selectedSourceKey) {
        const prevSource = getGemFamilyAndTier(selectedSourceKey);
        const newTop = getGemFamilyAndTier(itemKey);
        if (prevSource && newTop) {
          setSelectedSourceKey(getGemKey(prevSource.family, newTop.tier));
        }
      }
    } else {
      // Solvent mode: if the new target matches the current source, clear the source
      if (selectedSourceKey && selectedSourceKey.toLowerCase() === itemKey.toLowerCase()) {
        setSelectedSourceKey(null);
        setConvertAmountStr('0');
      }
    }
  };

  const isSourceSlotClickable =
    context?.mode === 'dust' || (context?.mode === 'solvent' && selectedTopKey !== null);

  const handleOpenPicker = () => {
    if (!isSourceSlotClickable) return;
    setHoveredItem(null);
    setIsPickerOpen(true);
  };

  const handleSelectSource = (sourceKey: string) => {
    setSelectedSourceKey(sourceKey);
    setHoveredItem(null);
    setIsPickerOpen(false);
  };

  const handleConfirmConvert = () => {
    if (!calc.canConvert || !selectedSourceKey || !activeTargetKey) return;

    const updated = applyConversionToMaterials(materials, {
      sourceKey: selectedSourceKey,
      catalystKey,
      targetKey: activeTargetKey,
      sourceBaseInventory: sourceInventory,
      catalystBaseInventory: catalystInventory,
      targetBaseInventory: targetInventory,
      sourceCost: calc.sourceCost,
      catalystCost: calc.catalystCost,
      convertAmount: parsedConvertAmount,
    });

    onConvert(updated);
    dialogRef.current?.close();
  };

  const showMaterialTooltip = (key: string, e: React.MouseEvent<HTMLElement>) => {
    const entry = materialMap[key];
    if (!entry) return;
    setHoveredItem({ key, data: entry });
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: rect.right + 12, y: rect.top });
  };

  const hideMaterialTooltip = () => setHoveredItem(null);

  // Source picker options
  const dustPickerGroups = useMemo(() => {
    if (!context || context.mode !== 'dust') return [];
    const topInfo = selectedTopKey ? getGemFamilyAndTier(selectedTopKey) : null;
    const filterTier: GemTier | null = topInfo ? topInfo.tier : null;
    return getConvertibleSourceGems(context.gemFamily, filterTier);
  }, [context, selectedTopKey]);

  const solventPickerDrops = useMemo(() => {
    if (!context || context.mode !== 'solvent' || !selectedTopKey) return [];
    return getConvertibleSourceWeeklyDrops(context.drops, selectedTopKey);
  }, [context, selectedTopKey]);

  const modalTitle = !context
    ? ''
    : context.mode === 'dust'
      ? `Converting ${context.familyName}`
      : `Converting ${context.bossName}`;

  const defaultGrayedTargetGemKey =
    context?.mode === 'dust' ? getGemKey(context.gemFamily, 'gemstone') : null;

  const showInsufficientTooltip =
    !calc.canConvert &&
    parsedConvertAmount > 0 &&
    !calc.hasEnoughMaterials;

  const isSourceSelected = selectedSourceKey !== null;
  const sourceEntry = selectedSourceKey ? materialMap[selectedSourceKey] : null;
  const catalystEntry = materialMap[catalystKey];
  const targetEntry = activeTargetKey ? materialMap[activeTargetKey] : null;

  return (
    <>
      <dialog
        ref={dialogRef}
        className="convert-dialog"
        aria-labelledby={titleId}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        {context && (
          <>
            {/* Header */}
            <div className="convert-modal-header">
              <div className="convert-modal-title-group">
                <h2 id={titleId}>{modalTitle}</h2>
              </div>

              <div className="convert-header-actions">
                {context.mode === 'dust' && (
                  <div
                    className="convert-info-wrapper"
                    onMouseEnter={() => setIsRateTooltipOpen(true)}
                    onMouseLeave={() => setIsRateTooltipOpen(false)}
                  >
                    <button
                      type="button"
                      className="convert-info-btn"
                      aria-label="Dust of Azoth conversion rates"
                      aria-expanded={isRateTooltipOpen}
                      aria-describedby={isRateTooltipOpen ? rateTooltipId : undefined}
                      onFocus={() => setIsRateTooltipOpen(true)}
                      onBlur={(e) => {
                        if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
                          setIsRateTooltipOpen(false);
                        }
                      }}
                      onClick={() => setIsRateTooltipOpen((prev) => !prev)}
                    >
                      <Info size={16} />
                    </button>

                    {isRateTooltipOpen && (
                      <div
                        id={rateTooltipId}
                        role="tooltip"
                        className="convert-rate-popover"
                      >
                        <div className="convert-rate-popover-title">
                          Dust of Azoth Rates (1 : 1)
                        </div>
                        <ul className="convert-rate-list">
                          <li>
                            <span className="convert-rate-tier">{GEM_TIER_LABELS.sliver}</span>
                            <span className="convert-rate-value">{DUST_RATES.sliver} Dust</span>
                          </li>
                          <li>
                            <span className="convert-rate-tier">{GEM_TIER_LABELS.fragment}</span>
                            <span className="convert-rate-value">{DUST_RATES.fragment} Dust</span>
                          </li>
                          <li>
                            <span className="convert-rate-tier">{GEM_TIER_LABELS.chunk}</span>
                            <span className="convert-rate-value">{DUST_RATES.chunk} Dust</span>
                          </li>
                          <li>
                            <span className="convert-rate-tier">{GEM_TIER_LABELS.gemstone}</span>
                            <span className="convert-rate-value">{DUST_RATES.gemstone} Dust</span>
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="modal-close-btn"
                  aria-label="Close conversion dialog"
                  onClick={() => dialogRef.current?.close()}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="convert-modal-body">
              {/* Top Center Icons Strip */}
              <div className="convert-top-strip">
                {topItems.map((key) => {
                  const entry = materialMap[key];
                  const rarity = entry?.rarity || 1;
                  const isSelected = selectedTopKey === key;
                  const count = getEffectiveInventory(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      className={`convert-top-item ${isSelected ? 'selected' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => handleTopItemClick(key)}
                      onMouseEnter={(e) => showMaterialTooltip(key, e)}
                      onMouseLeave={hideMaterialTooltip}
                    >
                      <div className={`convert-top-icon-box bg-rarity-${rarity}`}>
                        <img
                          src={getMaterialIconUrl(key)}
                          alt={entry?.name || key}
                        />
                      </div>
                      <span className="convert-top-count">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Middle Conversion Flow */}
              <div className="convert-equation-panel">
                <div className="convert-equation-grid">
                  {/* ROW 1: Icons */}
                  <div className="convert-row-label" aria-hidden="true" />

                  {/* Source Slot ("?" or selected material) */}
                  <button
                    type="button"
                    className={`convert-slot-icon ${
                      isSourceSlotClickable ? 'clickable' : 'disabled-slot'
                    } ${isSourceSelected ? `has-selection bg-rarity-${sourceEntry?.rarity || 1}` : ''}`}
                    disabled={!isSourceSlotClickable}
                    onClick={handleOpenPicker}
                    title={
                      !isSourceSlotClickable
                        ? 'Select a target material above first'
                        : isSourceSelected
                          ? 'Click to change source material'
                          : 'Click to choose source material'
                    }
                    aria-label={
                      isSourceSelected
                        ? `Source material: ${sourceEntry?.name || selectedSourceKey}. Click to change.`
                        : 'Select source material'
                    }
                    onMouseEnter={(e) => {
                      if (selectedSourceKey) showMaterialTooltip(selectedSourceKey, e);
                    }}
                    onMouseLeave={hideMaterialTooltip}
                  >
                    {selectedSourceKey ? (
                      <img
                        src={getMaterialIconUrl(selectedSourceKey)}
                        alt={sourceEntry?.name || selectedSourceKey}
                      />
                    ) : (
                      <span className="convert-question-mark">?</span>
                    )}
                  </button>

                  {/* Plus Operator */}
                  <span className="convert-operator" aria-hidden="true">
                    +
                  </span>

                  {/* Catalyst Slot (Dust of Azoth / Dream Solvent) - non-clickable */}
                  <div
                    className={`convert-slot-icon bg-rarity-${catalystEntry?.rarity || 2}`}
                    onMouseEnter={(e) => showMaterialTooltip(catalystKey, e)}
                    onMouseLeave={hideMaterialTooltip}
                  >
                    <img
                      src={getMaterialIconUrl(catalystKey)}
                      alt={catalystEntry?.name || catalystKey}
                    />
                  </div>

                  {/* Arrow Operator */}
                  <span className="convert-operator" aria-hidden="true">
                    <ArrowRight size={20} strokeWidth={2.75} />
                  </span>

                  {/* Target Slot - non-clickable */}
                  <div
                    className={`convert-slot-icon ${
                      activeTargetKey
                        ? `bg-rarity-${targetEntry?.rarity || 1}`
                        : context.mode === 'dust' && defaultGrayedTargetGemKey
                          ? `bg-rarity-${materialMap[defaultGrayedTargetGemKey]?.rarity || 5} grayed-out`
                          : 'grayed-out'
                    }`}
                    onMouseEnter={(e) => {
                      if (activeTargetKey) showMaterialTooltip(activeTargetKey, e);
                    }}
                    onMouseLeave={hideMaterialTooltip}
                  >
                    {activeTargetKey ? (
                      <img
                        src={getMaterialIconUrl(activeTargetKey)}
                        alt={targetEntry?.name || activeTargetKey}
                      />
                    ) : context.mode === 'dust' && defaultGrayedTargetGemKey ? (
                      <img
                        src={getMaterialIconUrl(defaultGrayedTargetGemKey)}
                        alt={context.familyName}
                      />
                    ) : (
                      <span className="convert-question-mark">?</span>
                    )}
                  </div>

                  {/* ROW 2: Inventory */}
                  <div className="convert-row-label">Inventory</div>

                  {/* Source Inventory: blank until "?" is selected; editable once selected */}
                  {isSourceSelected && selectedSourceKey ? (
                    <input
                      type="number"
                      min={0}
                      className="convert-cell-input"
                      aria-label={`${sourceEntry?.name || selectedSourceKey} inventory`}
                      value={getDraftInventoryStr(selectedSourceKey)}
                      onChange={(e) => handleInventoryInputChange(selectedSourceKey, e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  ) : (
                    <div className="convert-cell-empty" />
                  )}

                  <div aria-hidden="true" />

                  {/* Catalyst Inventory: ALWAYS editable */}
                  <input
                    type="number"
                    min={0}
                    className="convert-cell-input"
                    aria-label={`${catalystEntry?.name || catalystKey} inventory`}
                    value={getDraftInventoryStr(catalystKey)}
                    onChange={(e) => handleInventoryInputChange(catalystKey, e.target.value)}
                    onFocus={(e) => e.target.select()}
                  />

                  <div aria-hidden="true" />

                  {/* Target Inventory: non-editable until "?" is selected; editable once selected */}
                  {isSourceSelected && activeTargetKey ? (
                    <input
                      type="number"
                      min={0}
                      className="convert-cell-input"
                      aria-label={`${targetEntry?.name || activeTargetKey} inventory`}
                      value={getDraftInventoryStr(activeTargetKey)}
                      onChange={(e) => handleInventoryInputChange(activeTargetKey, e.target.value)}
                      onFocus={(e) => e.target.select()}
                    />
                  ) : activeTargetKey ? (
                    <div className="convert-cell-readonly">
                      {getEffectiveInventory(activeTargetKey)}
                    </div>
                  ) : (
                    <div className="convert-cell-empty" />
                  )}

                  {/* ROW 3: Cost / Input */}
                  <div className="convert-row-label">Cost / Input</div>

                  {/* Source Cost: blank until "?" is selected; read-only once selected */}
                  {isSourceSelected ? (
                    <div
                      className={`convert-cell-readonly ${
                        calc.insufficientSource ? 'insufficient' : ''
                      }`}
                    >
                      {calc.sourceCost}
                    </div>
                  ) : (
                    <div className="convert-cell-empty" />
                  )}

                  <div aria-hidden="true" />

                  {/* Catalyst Cost: ALWAYS read-only */}
                  <div
                    className={`convert-cell-readonly ${
                      calc.insufficientCatalyst
                        ? 'insufficient'
                        : !isSourceSelected
                          ? 'muted'
                          : ''
                    }`}
                  >
                    {isSourceSelected ? calc.catalystCost : 0}
                  </div>

                  <div aria-hidden="true" />

                  {/* Target Convert Input: non-editable until "?" is selected; drives calculation */}
                  {isSourceSelected && activeTargetKey ? (
                    <input
                      type="number"
                      min={0}
                      className="convert-cell-input target-amount-input"
                      aria-label="Amount to convert"
                      value={convertAmountStr}
                      onChange={(e) => handleConvertAmountChange(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                    />
                  ) : activeTargetKey ? (
                    <div className="convert-cell-readonly muted">0</div>
                  ) : (
                    <div className="convert-cell-empty" />
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="convert-modal-footer">
              <button
                type="button"
                className="convert-btn-cancel"
                onClick={() => dialogRef.current?.close()}
              >
                Cancel
              </button>

              <span
                className="convert-submit-wrapper"
                title={showInsufficientTooltip ? 'Not enough materials' : undefined}
                onMouseEnter={() => {
                  if (showInsufficientTooltip) setIsInsufficientHovered(true);
                }}
                onMouseLeave={() => setIsInsufficientHovered(false)}
              >
                <button
                  type="button"
                  className="convert-btn-submit"
                  disabled={!calc.canConvert}
                  aria-describedby={
                    showInsufficientTooltip && isInsufficientHovered
                      ? disabledTooltipId
                      : undefined
                  }
                  onClick={handleConfirmConvert}
                >
                  <ArrowLeftRight size={16} />
                  Convert
                </button>
                {showInsufficientTooltip && isInsufficientHovered && (
                  <div
                    id={disabledTooltipId}
                    role="tooltip"
                    className="convert-disabled-tooltip"
                  >
                    Not enough materials
                  </div>
                )}
              </span>
            </div>
          </>
        )}
      </dialog>

      {/* Nested Source Material Picker <dialog> */}
      <dialog
        ref={pickerDialogRef}
        className="convert-picker-dialog"
        aria-labelledby={pickerTitleId}
        {...({ closedby: 'any' } as Record<string, string>)}
      >
        {context && isPickerOpen && (
          <>
            <div className="convert-modal-header">
              <h2 id={pickerTitleId}>
                {context.mode === 'dust'
                  ? selectedTopKey
                    ? `Select ${GEM_TIER_LABELS[getGemFamilyAndTier(selectedTopKey)!.tier]} to Convert From`
                    : 'Select Elemental Stone to Convert From'
                  : 'Select Weekly Boss Material to Convert From'}
              </h2>
              <button
                type="button"
                className="modal-close-btn"
                aria-label="Close material selector"
                onClick={() => pickerDialogRef.current?.close()}
              >
                <X size={18} />
              </button>
            </div>

            <div className="convert-picker-body">
              {context.mode === 'dust' ? (
                selectedTopKey ? (
                  /* Filtered to 1 tier -> single row of the 6 other elements */
                  <div className="convert-picker-single-row">
                    {dustPickerGroups.map((group) => {
                      const key = group.keys[0];
                      const entry = materialMap[key];
                      const count = getEffectiveInventory(key);
                      const isCurrent = selectedSourceKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          className={`convert-picker-option ${count === 0 ? 'zero-stock' : ''} ${
                            isCurrent ? 'selected' : ''
                          }`}
                          onClick={() => handleSelectSource(key)}
                          onMouseEnter={(e) => showMaterialTooltip(key, e)}
                          onMouseLeave={hideMaterialTooltip}
                        >
                          <div className={`convert-picker-icon-box bg-rarity-${entry?.rarity || 1}`}>
                            <img src={getMaterialIconUrl(key)} alt={entry?.name || key} />
                          </div>
                          <span className="convert-picker-count">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Unfiltered -> all 6 other elemental families × 4 tiers */
                  <div className="convert-picker-gem-matrix">
                    {dustPickerGroups.map((group) => (
                      <div key={group.family} className="convert-picker-gem-row">
                        <span className="convert-picker-element-label">{group.element}</span>
                        {group.keys.map((key) => {
                          const entry = materialMap[key];
                          const count = getEffectiveInventory(key);
                          const isCurrent = selectedSourceKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              className={`convert-picker-option ${count === 0 ? 'zero-stock' : ''} ${
                                isCurrent ? 'selected' : ''
                              }`}
                              onClick={() => handleSelectSource(key)}
                              onMouseEnter={(e) => showMaterialTooltip(key, e)}
                              onMouseLeave={hideMaterialTooltip}
                            >
                              <div
                                className={`convert-picker-icon-box bg-rarity-${entry?.rarity || 1}`}
                              >
                                <img src={getMaterialIconUrl(key)} alt={entry?.name || key} />
                              </div>
                              <span className="convert-picker-count">{count}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Weekly boss -> only the 2 other drops from the same boss */
                <div className="convert-picker-single-row">
                  {solventPickerDrops.map((key) => {
                    const entry = materialMap[key];
                    const count = getEffectiveInventory(key);
                    const isCurrent = selectedSourceKey === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`convert-picker-option ${count === 0 ? 'zero-stock' : ''} ${
                          isCurrent ? 'selected' : ''
                        }`}
                        onClick={() => handleSelectSource(key)}
                        onMouseEnter={(e) => showMaterialTooltip(key, e)}
                        onMouseLeave={hideMaterialTooltip}
                      >
                        <div className={`convert-picker-icon-box bg-rarity-${entry?.rarity || 5}`}>
                          <img src={getMaterialIconUrl(key)} alt={entry?.name || key} />
                        </div>
                        <span className="convert-picker-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </dialog>
    </>
  );
};
