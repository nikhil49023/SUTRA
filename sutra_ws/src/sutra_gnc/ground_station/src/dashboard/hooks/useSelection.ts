import { useState, useEffect } from 'react';
import { SelectionManager, type SelectionState } from '../integration/SelectionManager';

export function useSelection() {
  const [selection, setSelection] = useState<SelectionState>(SelectionManager.getSelection());

  useEffect(() => {
    const unsub = SelectionManager.subscribe((newSel) => setSelection({ ...newSel }));
    return unsub;
  }, []);

  return {
    selection,
    select: SelectionManager.select.bind(SelectionManager),
    clear: SelectionManager.clear.bind(SelectionManager)
  };
}
