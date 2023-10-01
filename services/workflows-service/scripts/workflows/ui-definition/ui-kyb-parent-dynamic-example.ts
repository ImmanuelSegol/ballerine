import { Prisma, PrismaClient } from '@prisma/client';
import { personalInfoPage } from '../../../src/ui-definition/utils/collection-flow/personal-info-page';
import { businessInfoPage } from '../../../src/ui-definition/utils/collection-flow/business-info-page';
import { defintion } from '../../../src/ui-definition/utils/collection-flow/defintion-logic';

export const uiKybParentUiSchema = (workflowDefinitionId: string) =>
  ({
    uiContext: 'collection_flow',
    uiSchema: {
      elements: [personalInfoPage, businessInfoPage],
    },
    definition: defintion,
    workflowDefinitionId: workflowDefinitionId,
  } as const satisfies Prisma.UiDefinitionUncheckedCreateInput);

export const generateDynamicUiTest = async (
  prismaClient: PrismaClient,
  workflowDefinitionId: string,
  projectId?: string | null,
) => {
  return await prismaClient.uiDefinition.create({
    data: { ...uiKybParentUiSchema(workflowDefinitionId), ...{ projectId: projectId } },
  });
};
