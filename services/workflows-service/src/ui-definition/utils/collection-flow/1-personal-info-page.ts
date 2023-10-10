const validationSchema = {
  type: 'object',
  properties: {
    entity: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          required: ['additionalInfo'],
          properties: {
            additionalInfo: {
              type: 'object',
              required: ['mainRepresentative'],
              properties: {
                mainRepresentative: {
                  type: 'object',
                  required: ['phone', 'dateOfBirth', 'firstName', 'lastName', 'additionalInfo'],
                  properties: {
                    phone: {
                      type: 'string',
                      pattern: '^[+]?[0-9]{10,15}$',
                    },
                    dateOfBirth: {
                      type: 'string',
                    },
                    jobTitle: {
                      type: 'string',
                      minLength: 3,
                    },
                    firstName: {
                      type: 'string',
                      minLength: 2,
                      errorMessage: {
                        minLength: 'Mimimum length is 2.',
                      }
                    },
                    lastName: {
                      type: 'string',
                      minLength: 2,
                    },
                    additionalInfo: {
                      type: 'object',
                      required: ['jobTitle'],
                      properties: {
                        jobTitle: {
                          type: 'string',
                          minLength: 2,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  required: ['entity'],
};

export const PersonalInfoPage = {
  type: 'page',
  name: 'Personal details',
  number: 1,
  stateName: 'personal_details',
  pageValidator: {
    type: 'json-schema',
    value: validationSchema
  },
  elements: [
    {
      type: 'mainContainer',
      elements: [
        {
          type: 'collection-flow-head',
        },
        {
          type: 'container',
          elements: [
            {
              type: 'h1',
              options: {
                text: 'Personal information',
              },
            },
          ],
        },
        {
          type: 'json-form',
          valueDestination: 'entity.data.additionalInfo.mainRepresentative',
          name: 'json-form:personal-information',
          availableOn: [
            {
              type: 'json-schema',
              value: validationSchema,
            },
          ],
          elements: [
            {
              name: 'first-name-input',
              type: 'json-form:text',
              valueDestination: 'entity.data.additionalInfo.mainRepresentative.firstName',
              options: {
                label: 'Name',
                hint: 'First Name',
                jsonFormDefinition: {
                  type: 'string',
                },
              },
            },
            {
              name: 'last-name-input',
              type: 'json-form:text',
              valueDestination: 'entity.data.additionalInfo.mainRepresentative.lastName',
              options: {
                hint: 'Last Name',
                jsonFormDefinition: {
                  type: 'string',
                },
              },
            },
            {
              name: 'job-title-input',
              type: 'json-form:text',
              valueDestination:
                'entity.data.additionalInfo.mainRepresentative.additionalInfo.jobTitle',
              options: {
                label: 'Title',
                hint: 'CEO / Manager / Partner',
                jsonFormDefinition: {
                  type: 'string',
                },
              },
            },
            {
              name: 'date-of-birth-input',
              type: 'json-form:date',
              valueDestination: 'entity.data.additionalInfo.mainRepresentative.dateOfBirth',
              options: {
                label: 'Date of Birth',
                hint: 'DD/MM/YYYY',
                jsonFormDefinition: {
                  type: 'string',
                },
                uiSchema: {
                  'ui:field': 'DateInput',
                  'ui:label': true,
                },
              },
            },
            {
              name: 'phone-number-input',
              type: 'international-phone-number',
              valueDestination: 'entity.data.additionalInfo.mainRepresentative.phone',
              options: {
                label: 'Phone number',
                jsonFormDefinition: {
                  type: 'string',
                },
                uiSchema: {
                  'ui:field': 'PhoneInput',
                  'ui:label': true,
                },
              },
            },
          ],
        },
        {
          name: 'next-page-button',
          type: 'json-form:button',
          options: {
            uiDefinition: {
              classNames: ['align-right', 'padding-top-10'],
            },
            text: 'Continue',
          },
          availableOn: [
            {
              type: 'json-schema',
              value: validationSchema,
            },
          ],
        },
      ],
    },
  ],
  actions: [
    {
      type: 'definitionPlugin',
      params: {
        pluginName: 'update_end_user',
      },
      dispatchOn: {
        uiEvents: [{ event: 'onClick', uiElementName: 'next-page-button' }],
        rules: [
          {
            type: 'json-schema',
            value: validationSchema,
          },
        ],
      },
    },
    {
      type: 'definitionEvent',
      params: {
        eventName: 'NEXT',
      },
      dispatchOn: {
        uiEvents: [{ event: 'onClick', uiElementName: 'next-page-button' }],
        rules: [
          {
            type: 'json-schema',
            value: validationSchema,
          },
        ],
      },
    },
  ],
};
