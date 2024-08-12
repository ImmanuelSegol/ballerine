import { useDynamicUIContext } from '@/components/organisms/DynamicUI/hooks/useDynamicUIContext';
import { UIElementState } from '@/components/organisms/DynamicUI/hooks/useUIStateLogic/hooks/useUIElementsStateLogic/types';
import { UIElementDefinition } from '@/domains/collection-flow';
import { useMemo } from 'react';

export const useUIElementState = (definition: UIElementDefinition) => {
  const { state, helpers } = useDynamicUIContext();

  const elementState: UIElementState = useMemo(() => {
    return (
      state.elements[definition.name] || {
        isLoading: false,
        isCompleted: false,
        isTouched: false,
      }
    );
  }, [definition.name, state.elements]);

  return {
    state: elementState,
    setState: helpers.setUIElementState,
  };
};
