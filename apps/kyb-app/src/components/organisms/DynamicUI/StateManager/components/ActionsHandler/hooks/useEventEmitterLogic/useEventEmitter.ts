import { usePageResolverContext } from '@/components/organisms/DynamicUI/PageResolver/hooks/usePageResolverContext';
import { useActionsHandlerContext } from '@/components/organisms/DynamicUI/StateManager/components/ActionsHandler/hooks/useActionsHandlerContext';
import { getDispatchableActions } from '@/components/organisms/DynamicUI/StateManager/components/ActionsHandler/hooks/useEventEmitterLogic/helpers/getDispatchableActions';
import { getTriggeredActions } from '@/components/organisms/DynamicUI/StateManager/components/ActionsHandler/hooks/useEventEmitterLogic/helpers/getTriggeredActions';
import { useActionDispatcher } from '@/components/organisms/DynamicUI/StateManager/components/ActionsHandler/hooks/useEventEmitterLogic/hooks/useActionDispatcher';
import { UIEventType } from '@/components/organisms/DynamicUI/StateManager/components/ActionsHandler/hooks/useEventEmitterLogic/types';
import { useStateManagerContext } from '@/components/organisms/DynamicUI/StateManager/components/StateProvider';
import { useDynamicUIContext } from '@/components/organisms/DynamicUI/hooks/useDynamicUIContext';
import { UIElementDefinition } from '@/domains/collection-flow';
import { AnyObject } from '@ballerine/ui';
import { useCallback } from 'react';

export const useEventEmitterLogic = (elementDefinition: UIElementDefinition<AnyObject>) => {
  const { actions, dispatchAction } = useActionsHandlerContext();
  const { stateApi } = useStateManagerContext();
  const { state } = useDynamicUIContext();
  const { getDispatch } = useActionDispatcher(actions, dispatchAction);
  const { currentPage } = usePageResolverContext();

  const emitEvent = useCallback(
    (type: UIEventType) => {
      const triggeredActions = getTriggeredActions(
        { type, elementName: elementDefinition.name },
        actions,
      );

      const dispatchableActions = getDispatchableActions(
        stateApi.getContext(),
        triggeredActions,
        elementDefinition,
        state,
        currentPage!,
      );

      dispatchableActions.forEach(action => {
        const dispatch = getDispatch(action);
        if (!dispatch) {
          console.warn(`Action dispatcher not found for ${JSON.stringify(action)}`);
          return;
        }

        dispatch(action);
      });
    },
    [elementDefinition, actions, stateApi, state, currentPage, getDispatch],
  );

  return emitEvent;
};
