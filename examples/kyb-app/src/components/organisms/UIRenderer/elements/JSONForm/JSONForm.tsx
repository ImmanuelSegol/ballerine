import { useStateManagerContext } from '@app/components/organisms/DynamicUI/StateManager/components/StateProvider';
import { createFormSchemaFromUIElements } from '@app/components/organisms/UIRenderer/elements/JSONForm/helpers/createFormSchemaFromUIElements';
import { createInitialFormData } from '@app/components/organisms/UIRenderer/elements/JSONForm/helpers/createInitialFormData';
import { withDynamicUIInterceptor } from '@app/components/organisms/UIRenderer/elements/JSONForm/hocs/withDynamicUIInterceptor/withDynamicUIInterceptor';
import { UIElementComponent } from '@app/components/organisms/UIRenderer/types';
import {
  TextInputAdapter,
  BooleanFieldAdapter,
  FileInputAdapter,
  DateInputAdater,
  PhoneInputAdapter,
  AutocompleteTextInputAdapter,
} from '@ballerine/ui';
import { DynamicForm } from '@ballerine/ui';
import { RJSFSchema, UiSchema } from '@rjsf/utils';
import { useCallback, useMemo, useState } from 'react';
import set from 'lodash/set';
import { AnyObject } from '../../../../../../../../packages/ui/dist';

export const fields = {
  // Component with suffix Field is an overriding of internal RSJV components
  StringField: withDynamicUIInterceptor(TextInputAdapter),
  BooleanField: withDynamicUIInterceptor(BooleanFieldAdapter),

  // Component with suffix Input is an extend of supported field types
  FileInput: withDynamicUIInterceptor(FileInputAdapter),
  DateInput: withDynamicUIInterceptor(DateInputAdater),
  PhoneInput: withDynamicUIInterceptor(PhoneInputAdapter),
  AutocompleteInput: withDynamicUIInterceptor(AutocompleteTextInputAdapter),
};

export interface JSONFormElementBaseParams {
  jsonFormDefinition: RJSFSchema;
  uiSchema?: UiSchema;
  label?: string;
  hint?: string;
}

export interface JSONFormElementParams {
  jsonFormDefinition?: { type?: string; required?: string[] };
}

export const JSONForm: UIElementComponent<JSONFormElementParams> = ({ definition, actions }) => {
  const { formSchema, uiSchema } = useMemo(
    () => createFormSchemaFromUIElements(definition),
    [definition],
  );
  const { stateApi } = useStateManagerContext();

  const { payload } = useStateManagerContext();
  const initialFormData = useMemo(
    () => createInitialFormData(definition, payload),
    [definition, payload],
  );

  const handleArrayInputChange = useCallback(
    (values: AnyObject[]) => {
      if (definition.options?.jsonFormDefinition?.type === 'array') {
        const prevContext = stateApi.getContext();
        set(prevContext, definition.valueDestination, values);

        stateApi.setContext(prevContext);
      }
    },
    [definition, stateApi],
  );

  const handleSubmit = useCallback(() => {}, []);

  return (
    <DynamicForm
      schema={formSchema}
      uiSchema={uiSchema}
      liveValidate
      fields={fields}
      formData={initialFormData}
      onChange={handleArrayInputChange}
      onSubmit={handleSubmit}
    />
  );
};
