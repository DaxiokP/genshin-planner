export const handleFilterToggle = (
  currentSelection: any[],
  allOptions: any[],
  clickedOption: any,
  setSelection: (vals: any[]) => void
) => {
  // Case 1: All options are currently selected -> isolate the clicked option
  if (currentSelection.length === allOptions.length) {
    setSelection([clickedOption]);
  }
  // Case 2: Only the clicked option is currently selected -> select all options again
  else if (currentSelection.length === 1 && currentSelection.includes(clickedOption)) {
    setSelection([...allOptions]);
  }
  // Case 3: Multiple options selected, click on an active one -> unselect it
  else if (currentSelection.includes(clickedOption)) {
    const next = currentSelection.filter(x => x !== clickedOption);
    if (next.length === 0) {
      setSelection([...allOptions]); // fallback to all selected to avoid 'no match'
    } else {
      setSelection(next);
    }
  }
  // Case 4: Click on an unselected option -> add it
  else {
    setSelection([...currentSelection, clickedOption]);
  }
};
