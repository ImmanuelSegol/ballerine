import { usePageResolverContext } from '@/components/organisms/DynamicUI/PageResolver/hooks/usePageResolverContext';
import { useStateManagerContext } from '@/components/organisms/DynamicUI/StateManager/components/StateProvider';
import { useDynamicUIContext } from '@/components/organisms/DynamicUI/hooks/useDynamicUIContext';
import { UIState } from '@/components/organisms/DynamicUI/hooks/useUIStateLogic/types';
import {
  getDocumentElementByDocumentError,
  getElementByValueDestination,
} from '@/components/organisms/UIRenderer/elements/SubmitButton/helpers';
import { useUIElementHandlers } from '@/components/organisms/UIRenderer/hooks/useUIElementHandlers';
import { useUIElementState } from '@/components/organisms/UIRenderer/hooks/useUIElementState';
import { UIElementComponent } from '@/components/organisms/UIRenderer/types';
import { useValidator } from '@/components/providers/Validator/hooks/useValidator';
import { UIPage } from '@/domains/collection-flow';
import { useFlowTracking } from '@/hooks/useFlowTracking';
import { Button } from '@ballerine/ui';
import { useCallback, useMemo } from 'react';

export const SubmitButton: UIElementComponent<{ text: string }> = ({ definition }) => {
  const { helpers } = useDynamicUIContext();
  const { onClickHandler } = useUIElementHandlers(definition);
  const { state } = useDynamicUIContext();
  const { state: uiElementState } = useUIElementState(definition);
  const { currentPage, pages } = usePageResolverContext();
  const { isPluginLoading, payload } = useStateManagerContext();
  const { errors, validate } = useValidator();
  console.log({ vALIDATION_ERRORS: errors });
  const isValid = useMemo(() => !Object.values(errors).length, [errors]);

  console.log({ CONTEXT: payload });

  const setPageElementsTouched = useCallback(
    (page: UIPage, state: UIState) => {
      const nextState: UIState = {
        ...state,
        elements: {
          ...state.elements,
        },
      };

      Object.keys(errors).forEach(valueDestination => {
        // Loking for element with matching valueDestination
        // For non-array documents valueDestination is document-error-${id} which is generated by documents validator.
        const element =
          getElementByValueDestination(valueDestination, page) ||
          getDocumentElementByDocumentError(valueDestination, page);

        // Checking valueDestination for Array values
        const elementIndex = valueDestination.match(/\[(\d+)\]/)?.[1];

        if (!element) return;

        const elementName = `${element.name}${elementIndex ? `[${elementIndex}]` : ''}`;
        nextState.elements[elementName] = {
          ...nextState.elements[elementName],
          isTouched: true,
        };
      });

      helpers.overrideState(nextState);
    },
    [helpers, errors],
  );

  const { trackFinish } = useFlowTracking();

  const handleClick = useCallback(() => {
    setPageElementsTouched(
      // @ts-ignore
      currentPage,
      state,
    );
    validate();
    // onClickHandler();

    const isFinishPage = currentPage?.name === pages.at(-1)?.name;

    if (isFinishPage && isValid) {
      trackFinish();
    }
  }, [
    currentPage,
    pages,
    state,
    isValid,
    setPageElementsTouched,
    onClickHandler,
    trackFinish,
    validate,
  ]);

  return (
    <Button
      variant="secondary"
      onClick={handleClick}
      disabled={state.isLoading || uiElementState.isLoading || isPluginLoading}
      data-testid={definition.name}
    >
      {definition.options.text || 'Submit'}
    </Button>
  );
};
