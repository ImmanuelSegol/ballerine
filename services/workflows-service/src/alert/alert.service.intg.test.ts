import { PrismaService } from '@/prisma/prisma.service';
import {
  AlertDefinition,
  Counterparty,
  Customer,
  PaymentMethod,
  Project,
  TransactionRecordType,
} from '@prisma/client';
import { tearDownDatabase } from '@/test/helpers/database-helper';
import { createCustomer } from '@/test/helpers/create-customer';
import { faker } from '@faker-js/faker';
import { createProject } from '@/test/helpers/create-project';
import { TransactionFactory } from '@/transaction/test-utils/transaction-factory';
import { AlertService } from '@/alert/alert.service';
import { commonTestingModules } from '@/test/helpers/nest-app-helper';
import { DataAnalyticsService } from '@/data-analytics/data-analytics.service';
import { ProjectScopeService } from '@/project/project-scope.service';
import { Test } from '@nestjs/testing';
import { AlertRepository } from '@/alert/alert.repository';
import { AlertDefinitionRepository } from '@/alert-definition/alert-definition.repository';
import {
  TRANSACTIONS_ALERT_DEFINITIONS,
  getAlertDefinitionCreateData,
} from '../../scripts/alerts/generate-alerts';

describe('AlertService', () => {
  let prismaService: PrismaService;
  let alertService: AlertService;
  let customer: Customer;
  let project: Project;
  let transactionFactory: TransactionFactory;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: commonTestingModules,
      providers: [
        DataAnalyticsService,
        ProjectScopeService,
        AlertRepository,
        AlertDefinitionRepository,
        AlertService,
        TransactionFactory,
      ],
    }).compile();

    prismaService = module.get(PrismaService);

    alertService = module.get(AlertService);

    transactionFactory = module.get(TransactionFactory);
  });

  beforeEach(async () => {
    await prismaService.$executeRaw`TRUNCATE TABLE "public"."Alert" CASCADE;`;
    await prismaService.$executeRaw`TRUNCATE TABLE "public"."AlertDefinition" CASCADE;`;
    await prismaService.$executeRaw`TRUNCATE TABLE "public"."TransactionRecord" CASCADE;`;

    customer = await createCustomer(
      prismaService,
      faker.datatype.uuid(),
      faker.datatype.uuid(),
      '',
      '',
      'webhook-shared-secret',
    );

    project = await createProject(prismaService, customer, faker.datatype.uuid());
  });

  afterAll(tearDownDatabase);

  describe('checkAllAlerts', () => {
    let baseTransactionFactory: TransactionFactory;

    beforeEach(() => {
      baseTransactionFactory = transactionFactory
        .project(project)
        .paymentMethod(PaymentMethod.credit_card)
        .withEndUserBeneficiary()
        .transactionDate(faker.date.recent(6));
    });

    describe('Rule: CHVC_C', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(
            {
              label: 'CHVC_C',
              ...TRANSACTIONS_ALERT_DEFINITIONS.CHVC_C,
            },
            project,
          ),
        });
      });

      it('When there are more than or equal to 15 chargeback transactions, an alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .count(15)
          .create({
            transactionType: TransactionRecordType.chargeback,
          });
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .count(14)
          .create({
            transactionType: TransactionRecordType.chargeback,
          });

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          business1Transactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When there are less than 15 chargeback transactions, no alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .count(14)
          .create({
            transactionType: TransactionRecordType.chargeback,
          });
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .count(14)
          .create({
            transactionType: TransactionRecordType.chargeback,
          });

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: SHCAC_C', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(
            {
              label: 'SHCAC_C',
              ...TRANSACTIONS_ALERT_DEFINITIONS.SHCAC_C,
            },
            project,
          ),
        });
      });

      it('When the sum of chargebacks amount is greater than 5000, an alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .amount(100)
          .count(51)
          .create({
            transactionType: TransactionRecordType.chargeback,
          });
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .amount(100)
          .count(49)
          .create({
            transactionType: TransactionRecordType.chargeback,
          });

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          business1Transactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When the sum of chargebacks amount is less than 5000, no alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .amount(100)
          .count(49)
          .create({
            transactionType: TransactionRecordType.chargeback,
          });
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .amount(100)
          .count(49)
          .create({
            transactionType: TransactionRecordType.chargeback,
          });

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: CHCR_C', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(
            {
              label: 'CHCR_C',
              ...TRANSACTIONS_ALERT_DEFINITIONS.CHCR_C,
            },
            project,
          ),
        });
      });

      it('When there are more than or equal to 15 refund transactions, an alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .count(15)
          .create({
            transactionType: TransactionRecordType.refund,
          });
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .count(14)
          .create({
            transactionType: TransactionRecordType.refund,
          });

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          business1Transactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When there are less than 15 refund transactions, no alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .count(14)
          .create({
            transactionType: TransactionRecordType.refund,
          });
        const business2Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .count(14)
          .create({
            transactionType: TransactionRecordType.refund,
          });

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: SHCAR_C', () => {
      let alertDefinition: AlertDefinition;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(
            {
              label: 'SHCAR_C',
              ...TRANSACTIONS_ALERT_DEFINITIONS.SHCAR_C,
            },
            project,
          ),
        });
      });

      it('When the sum of refunds amount is greater than 5000, an alert should be created', async () => {
        // Arrange
        const business1Transactions = await baseTransactionFactory
          .withBusinessOriginator()
          .amount(1000)
          .count(11)
          .create({
            transactionType: TransactionRecordType.refund,
          });

        await baseTransactionFactory.withBusinessOriginator().amount(10).count(12).create({
          transactionType: TransactionRecordType.refund,
        });

        await baseTransactionFactory.withBusinessOriginator().amount(5001).count(13).create({
          transactionType: TransactionRecordType.chargeback,
        });

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);

        expect(alerts[0] as any).toMatchObject({
          executionDetails: { executionRow: { transactionCount: '11' } },
        });

        expect(alerts[0] as any).toMatchObject({
          executionDetails: { executionRow: { totalAmount: 1000 * 11 } },
        });

        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          business1Transactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When the sum of refunds amount is less than 5000, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory.withBusinessOriginator().amount(100).count(49).create({
          transactionType: TransactionRecordType.refund,
        });

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });

    describe('Rule: HPC', () => {
      let alertDefinition: AlertDefinition;
      let counteryparty: Counterparty;

      beforeEach(async () => {
        alertDefinition = await prismaService.alertDefinition.create({
          data: getAlertDefinitionCreateData(
            {
              label: 'HPC',
              ...TRANSACTIONS_ALERT_DEFINITIONS.HPC,
            },
            project,
          ),
        });
        const correlationId = faker.datatype.uuid();
        counteryparty = await prismaService.counterparty.create({
          data: {
            project: { connect: { id: project.id } },
            correlationId: correlationId,
            business: {
              create: {
                correlationId: correlationId,
                companyName: faker.company.name(),
                registrationNumber: faker.datatype.uuid(),
                mccCode: faker.datatype.number({ min: 1000, max: 9999 }),
                businessType: faker.lorem.word(),
                project: { connect: { id: project.id } },
              },
            },
          },
        });
      });

      it('When there are >=3 chargeback transactions and they are >=50% of the total transactions, an alert should be created', async () => {
        // Arrange

        const chargebackTransactions = await baseTransactionFactory
          .type(TransactionRecordType.chargeback)
          .withCounterpartyOriginator(counteryparty.id)
          .count(3)
          .create();
        await baseTransactionFactory
          .type(TransactionRecordType.payment)
          .withCounterpartyOriginator(counteryparty.id)
          .count(3)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(1);
        expect(alerts[0]?.alertDefinitionId).toEqual(alertDefinition.id);
        expect(alerts[0]?.counterpartyId).toEqual(
          chargebackTransactions[0]?.counterpartyOriginatorId,
        );
      });

      it('When there are >=3 chargeback transactions and they are <50% of the total transactions, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .type(TransactionRecordType.chargeback)
          .withCounterpartyOriginator(counteryparty.id)
          .count(3)
          .create();
        await baseTransactionFactory
          .type(TransactionRecordType.payment)
          .withCounterpartyOriginator(counteryparty.id)
          .count(4)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });

      it('When there are <3 chargeback transactions and they are >=50% of the total transactions, no alert should be created', async () => {
        // Arrange
        await baseTransactionFactory
          .type(TransactionRecordType.chargeback)
          .withCounterpartyOriginator(counteryparty.id)
          .count(2)
          .create();
        await baseTransactionFactory
          .type(TransactionRecordType.payment)
          .withCounterpartyOriginator(counteryparty.id)
          .count(2)
          .create();

        // Act
        await alertService.checkAllAlerts();

        // Assert
        const alerts = await prismaService.alert.findMany();
        expect(alerts).toHaveLength(0);
      });
    });
  });
});
