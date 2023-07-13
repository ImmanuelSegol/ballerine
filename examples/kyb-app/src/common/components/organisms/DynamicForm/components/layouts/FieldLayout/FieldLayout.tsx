import { ErrorsList } from '@app/common/components/organisms/DynamicForm/components/molecules/ErrorsList';
import { Label } from '@ballerine/ui';
import { FieldTemplateProps, ValidatorType } from '@rjsf/utils';

export const FieldLayout = ({
  id,
  label,
  children,
  displayLabel,
  rawErrors,
}: FieldTemplateProps) => {
  return (
    <div className="flex flex-col gap-2 pb-2 pt-2">
      <div>{displayLabel ? <Label htmlFor={id}>{label}</Label> : null}</div>
      <div>{children}</div>
      {rawErrors ? <ErrorsList errors={rawErrors} className="capitalize" /> : null}
    </div>
  );
};
