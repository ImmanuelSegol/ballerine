import {useParams} from 'react-router-dom';
import {
  useEntityWithWorkflowQuery
} from '../../../../domains/entities/hooks/queries/useEntityWithWorkflowQuery/useEntityWithWorkflowQuery';
import {
  useStorageFilesQuery
} from '../../../../domains/storage/hooks/queries/useStorageFilesQuery/useStorageFilesQuery';
import {useFilterEntity} from '../../../../domains/entities/hooks/useFilterEntity/useFilterEntity';
import {
  useUpdateWorkflowByIdMutation
} from '../../../../domains/workflows/hooks/mutations/useUpdateWorkflowByIdMutation/useUpdateWorkflowByIdMutation';
import {useCaseState} from '../../components/Case/hooks/useCaseState/useCaseState';
import {
  useAuthenticatedUserQuery
} from '../../../../domains/auth/hooks/queries/useAuthenticatedUserQuery/useAuthenticatedUserQuery';
import {toStartCase} from '../../../../common/utils/to-start-case/to-start-case';
import {components} from './components';
import {getDocumentsByCountry} from '@ballerine/common';
import {
  composePickableCategoryType,
  convertSnakeCaseToTitleCase,
  extractCountryCodeFromEntity,
  isExistingSchemaForDocument,
  omit
} from "./utils";

export const useEntity = () => {
  const { entityId } = useParams();
  const { data: entity, isLoading } = useEntityWithWorkflowQuery(entityId);
  const docsData = useStorageFilesQuery(
    entity?.workflow?.workflowContext?.machineContext?.documents?.flatMap(({ pages }) =>
      pages?.map(({ ballerineFileId }) => ballerineFileId),
    ),
  );

  const results = [];
  entity?.workflow?.workflowContext?.machineContext?.documents?.forEach((document, docIndex) => {
    document?.pages.forEach((page, pageIndex) => {
      if (!results[docIndex]) {
        results[docIndex] = [];
      }
      results[docIndex][pageIndex] = docsData.shift().data;
    });
  });
  const filterEntity = useFilterEntity();
  const selectedEntity = {
    id: entityId,
    fullName: filterEntity === 'individuals' ? entity?.fullName : entity?.companyName,
    avatarUrl: entity?.avatarUrl,
    workflow: entity?.workflow,
  };

  const issuerCountryCode = extractCountryCodeFromEntity(entity);
  const documentsSchema = issuerCountryCode && getDocumentsByCountry(issuerCountryCode);

  const octetToFileType = (base64: string, fileType: string) =>
    base64?.replace(/application\/octet-stream/gi, fileType);
  const { mutate: mutateUpdateWorkflowById, isLoading: isLoadingUpdateWorkflowById } =
    useUpdateWorkflowByIdMutation({
      workflowId: entity?.workflow?.runtimeDataId,
    });
  const { data: session } = useAuthenticatedUserQuery();
  const caseState = useCaseState(session?.user, entity?.workflow);
  const contextEntity = entity?.workflow?.workflowContext?.machineContext?.entity;
  const contextDocuments = entity?.workflow?.workflowContext?.machineContext?.documents;
  const tasks = contextEntity
    ? [
        ...(contextDocuments?.map(
          (
            { id, type: docType, category, issuer, properties, propertiesSchema, decision },
            docIndex,
          ) => {
            const additionProperties =
              isExistingSchemaForDocument(documentsSchema) &&
              composePickableCategoryType(category, docType, documentsSchema);

            return [
              {
                id: 'header',
                type: 'container',
                value: [
                  {
                    type: 'heading',
                    value: `${convertSnakeCaseToTitleCase(
                      category,
                    )} - ${convertSnakeCaseToTitleCase(docType)}`,
                  },
                  {
                    id: 'actions',
                    type: 'container',
                    value: [
                      {
                        type: 'callToAction',
                        value: 'Reject',
                        data: {
                          id,
                          disabled: Boolean(decision),
                          approvalStatus: 'rejected',
                        },
                      },
                      {
                        type: 'callToAction',
                        value: 'Approve',
                        data: {
                          id,
                          disabled: Boolean(decision),
                          approvalStatus: 'approved',
                        },
                      },
                    ],
                  },
                ],
              },
              {
                type: 'container',
                value: [
                  {
                    id: 'decision',
                    type: 'details',
                    value: {
                      id,
                      title: `${category} - ${docType}`,
                      data: Object.entries(
                        {
                          ...additionProperties,
                          ...propertiesSchema?.properties,
                        } ?? {},
                      )?.map(
                        ([
                          title,
                          { type, format, pattern, isEditable = true, dropdownOptions, value },
                        ]) => {
                          const fieldValue = value || (properties?.[title] ?? '');

                          return {
                            title,
                            value: fieldValue,
                            type,
                            format,
                            pattern,
                            isEditable: caseState.writeEnabled && isEditable,
                            dropdownOptions,
                          };
                        },
                      ),
                    },
                  },
                  {
                    type: 'details',
                    value: {
                      id,
                      title: 'Decision',
                      data: Object.entries(decision ?? {}).map(([title, value]) => ({
                        title,
                        value,
                      })),
                    },
                  },
                ],
              },
              {
                type: 'multiDocuments',
                value: {
                  isLoading: docsData?.some(({ isLoading }) => isLoading),
                  data:
                    contextDocuments?.[docIndex]?.pages?.map(
                      ({ type, metadata, data }, pageIndex) => ({
                        title: `${category} - ${docType}${
                          metadata?.side ? ` - ${metadata?.side}` : ''
                        }`,
                        imageUrl:
                          type === 'pdf'
                            ? octetToFileType(results[docIndex][pageIndex], `application/${type}`)
                            : results[docIndex][pageIndex],
                        fileType: type,
                      }),
                    ) ?? [],
                },
              },
            ];
          },
        ) ?? []),
        [
          {
            id: 'entity-details',
            type: 'details',
            value: {
              title: `${toStartCase(contextEntity?.type)} Information`,
              data: [
                ...Object.entries(omit(contextEntity?.data, 'additionalInfo') ?? {}),
                ...Object.entries(contextEntity?.data?.additionalInfo ?? {}),
              ]?.map(([title, value]) => ({
                title,
                value,
                type: 'string',
                isEditable: false,
              })),
            },
          },
        ],
      ]
    : [];

  return {
    selectedEntity,
    components,
    tasks,
    isLoading,
  };
};
