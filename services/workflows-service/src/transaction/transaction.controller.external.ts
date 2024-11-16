import { UseCustomerAuthGuard } from '@/common/decorators/use-customer-auth-guard.decorator';
import {
  TransactionCreateAltDto,
  TransactionCreateAltDtoWrapper,
  TransactionCreateDto,
} from '@/transaction/dtos/transaction-create.dto';
import { TransactionService } from '@/transaction/transaction.service';
import * as swagger from '@nestjs/swagger';

import { PrismaService } from '@/prisma/prisma.service';
import * as types from '@/types';

import { AppLoggerService } from '@/common/app-logger/app-logger.service';
import { CurrentProject } from '@/common/decorators/current-project.decorator';
import {
  Body,
  Controller,
  Get,
  ParseArrayPipe,
  Post,
  Query,
  Res,
  ValidationPipe,
} from '@nestjs/common';
import express from 'express';

import { AlertService } from '@/alert/alert.service';
import { BulkStatus, TExecutionDetails } from '@/alert/types';
import { TIME_UNITS } from '@/data-analytics/consts';
import { DataAnalyticsService } from '@/data-analytics/data-analytics.service';
import { InlineRule } from '@/data-analytics/types';
import * as errors from '@/errors';
import { exceptionValidationFactory } from '@/errors';
import { ProjectScopeService } from '@/project/project-scope.service';
import { BulkTransactionsCreatedDto } from '@/transaction/dtos/bulk-transactions-created.dto';
import {
  GetTransactionsByAlertDto,
  GetTransactionsDto,
} from '@/transaction/dtos/get-transactions.dto';
import { TransactionCreatedDto } from '@/transaction/dtos/transaction-created.dto';
import { PaymentMethod } from '@prisma/client';
import { isEmpty } from 'lodash';
import { TransactionEntityMapper } from './transaction.mapper';

@swagger.ApiBearerAuth()
@swagger.ApiTags('Transactions')
@Controller('external/transactions')
export class TransactionControllerExternal {
  constructor(
    protected readonly service: TransactionService,
    protected readonly scopeService: ProjectScopeService,
    protected readonly prisma: PrismaService,
    protected readonly logger: AppLoggerService,
    protected readonly alertService: AlertService,
    protected readonly dataAnalyticsService: DataAnalyticsService,
  ) {}

  @Post()
  @UseCustomerAuthGuard()
  @swagger.ApiCreatedResponse({ type: TransactionCreatedDto })
  @swagger.ApiForbiddenResponse()
  async create(
    @Body(
      new ValidationPipe({
        exceptionFactory: exceptionValidationFactory,
      }),
    )
    body: TransactionCreateDto,
    @Res() res: express.Response,
    @CurrentProject() currentProjectId: types.TProjectId,
  ) {
    const creationResponses = await this.service.createBulk({
      transactionsPayload: [body],
      projectId: currentProjectId,
    });
    const creationResponse = creationResponses[0]!;

    res.status(201).json(creationResponse);
  }

  @Post('/alt')
  @UseCustomerAuthGuard()
  @swagger.ApiCreatedResponse({ type: TransactionCreateAltDto })
  @swagger.ApiForbiddenResponse()
  async createAlt(
    @Body(
      new ValidationPipe({
        exceptionFactory: exceptionValidationFactory,
      }),
    )
    body: TransactionCreateAltDtoWrapper,
    @Res() res: express.Response,
    @CurrentProject() currentProjectId: types.TProjectId,
  ) {
    const tranformedPayload = TransactionEntityMapper.altDtoToOriginalDto(body.data);
    const creationResponses = await this.service.createBulk({
      transactionsPayload: [tranformedPayload],
      projectId: currentProjectId,
    });
    const creationResponse = creationResponses[0]!;

    res.status(201).json(creationResponse);
  }

  @Post('/alt/bulk')
  @UseCustomerAuthGuard()
  @swagger.ApiCreatedResponse({ type: [BulkTransactionsCreatedDto] })
  @swagger.ApiResponse({ type: [BulkTransactionsCreatedDto], status: 207 })
  @swagger.ApiNotFoundResponse({ type: errors.NotFoundException })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  @swagger.ApiBody({ type: () => [TransactionCreateAltDto] })
  async createAltBulk(
    @Body(
      new ParseArrayPipe({
        items: TransactionCreateAltDtoWrapper,
        exceptionFactory: exceptionValidationFactory,
      }),
    )
    body: TransactionCreateAltDtoWrapper[],
    @Res() res: express.Response,
    @CurrentProject() currentProjectId: types.TProjectId,
  ) {
    const tranformedPayload = body.map(({ data }) =>
      TransactionEntityMapper.altDtoToOriginalDto(data),
    );
    const creationResponses = await this.service.createBulk({
      transactionsPayload: tranformedPayload,
      projectId: currentProjectId,
    });

    let hasErrors = false;

    const response = creationResponses.map(creationResponse => {
      if ('errorMessage' in creationResponse) {
        hasErrors = true;

        return {
          status: BulkStatus.FAILED,
          error: creationResponse.errorMessage,
          data: {
            correlationId: creationResponse.correlationId,
          },
        };
      }

      return {
        status: BulkStatus.SUCCESS,
        data: creationResponse,
      };
    });

    res.status(hasErrors ? 207 : 201).json(response);
  }

  @Post('/bulk')
  @UseCustomerAuthGuard()
  @swagger.ApiCreatedResponse({ type: [BulkTransactionsCreatedDto] })
  @swagger.ApiResponse({ type: [BulkTransactionsCreatedDto], status: 207 })
  @swagger.ApiNotFoundResponse({ type: errors.NotFoundException })
  @swagger.ApiForbiddenResponse({ type: errors.ForbiddenException })
  @swagger.ApiBody({ type: () => [TransactionCreateDto] })
  async createBulk(
    @Body(
      new ParseArrayPipe({
        items: TransactionCreateDto,
        exceptionFactory: exceptionValidationFactory,
      }),
    )
    body: TransactionCreateDto[],
    @Res() res: express.Response,
    @CurrentProject() currentProjectId: types.TProjectId,
  ) {
    const creationResponses = await this.service.createBulk({
      transactionsPayload: body,
      projectId: currentProjectId,
    });

    let hasErrors = false;

    const response = creationResponses.map(creationResponse => {
      if ('errorMessage' in creationResponse) {
        hasErrors = true;

        return {
          status: BulkStatus.FAILED,
          error: creationResponse.errorMessage,
          data: {
            correlationId: creationResponse.correlationId,
          },
        };
      }

      return {
        status: BulkStatus.SUCCESS,
        data: creationResponse,
      };
    });

    res.status(hasErrors ? 207 : 201).json(response);
  }

  @Get('')
  // @UseGuards(CustomerAuthGuard)
  @swagger.ApiOkResponse({ description: 'Returns an array of transactions.' })
  @swagger.ApiQuery({ name: 'businessId', description: 'Filter by business ID.', required: false })
  @swagger.ApiQuery({
    name: 'counterpartyId',
    description: 'Filter by counterparty ID.',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'startDate',
    type: Date,
    description: 'Filter by transactions after or on this date.',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'endDate',
    type: Date,
    description: 'Filter by transactions before or on this date.',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'paymentMethod',
    description: 'Filter by payment method.',
    required: false,
    enum: PaymentMethod,
  })
  @swagger.ApiQuery({
    name: 'timeValue',
    type: 'number',
    description: 'Number of time units to filter on',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'timeUnit',
    type: 'enum',
    enum: Object.values(TIME_UNITS),
    description: 'The time unit used in conjunction with timeValue',
    required: false,
  })
  async getTransactions(
    @Query() getTransactionsParameters: GetTransactionsDto,
    @CurrentProject() projectId: types.TProjectId,
  ) {
    return this.service.getTransactionsV1(getTransactionsParameters, projectId, {
      include: {
        counterpartyBeneficiary: {
          select: {
            correlationId: true,
            business: {
              select: {
                correlationId: true,
                companyName: true,
              },
            },
            endUser: {
              select: {
                correlationId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        counterpartyOriginator: {
          select: {
            correlationId: true,
            business: {
              select: {
                correlationId: true,
                companyName: true,
              },
            },
            endUser: {
              select: {
                correlationId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  @Get('/by-alert')
  // @UseCustomerAuthGuard()
  @swagger.ApiOkResponse({ description: 'Returns an array of transactions.' })
  @swagger.ApiQuery({ name: 'businessId', description: 'Filter by business ID.', required: false })
  @swagger.ApiQuery({
    name: 'counterpartyId',
    description: 'Filter by counterparty ID.',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'startDate',
    type: Date,
    description: 'Filter by transactions after or on this date.',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'endDate',
    type: Date,
    description: 'Filter by transactions before or on this date.',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'paymentMethod',
    description: 'Filter by payment method.',
    required: false,
    enum: PaymentMethod,
  })
  @swagger.ApiQuery({
    name: 'timeValue',
    type: 'number',
    description: 'Number of time units to filter on',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'timeUnit',
    type: 'enum',
    enum: Object.values(TIME_UNITS),
    description: 'The time unit used in conjunction with timeValue',
    required: false,
  })
  @swagger.ApiQuery({
    name: 'alertId',
    description: 'Filter by alert ID.',
    required: true,
  })
  async getTransactionsByAlert(
    @Query() filters: GetTransactionsByAlertDto,
    @CurrentProject() projectId: types.TProjectId,
  ) {
    const alert = await this.alertService.getAlertWithDefinition(filters.alertId, projectId);

    if (!alert) {
      throw new errors.NotFoundException(`Alert with id ${filters.alertId} not found`);
    }

    if (!alert.alertDefinition) {
      throw new errors.NotFoundException(`Alert definition not found for alert ${alert.id}`);
    }

    // Backward compatability will be remove soon,
    if (isEmpty((alert.executionDetails as TExecutionDetails).filters)) {
      return this.getTransactionsByAlertV1({ filters, projectId });
    }

    return this.getTransactionsByAlertV2({ projectId, alert });
  }

  private getTransactionsByAlertV1({
    filters,
    projectId,
  }: {
    filters: GetTransactionsByAlertDto;
    projectId: string;
  }) {
    return this.service.getTransactionsV1(filters, projectId, {
      include: {
        counterpartyBeneficiary: {
          select: {
            correlationId: true,
            business: {
              select: {
                correlationId: true,
                companyName: true,
              },
            },
            endUser: {
              select: {
                correlationId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        counterpartyOriginator: {
          select: {
            correlationId: true,
            business: {
              select: {
                correlationId: true,
                companyName: true,
              },
            },
            endUser: {
              select: {
                correlationId: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private getTransactionsByAlertV2({
    projectId,
    alert,
  }: {
    projectId: string;
    alert: Awaited<ReturnType<AlertService['getAlertWithDefinition']>>;
  }) {
    if (alert) {
      return this.service.getTransactions(projectId, {
        where:
          alert.executionDetails.filters ||
          this.dataAnalyticsService.getInvestigationFilter(
            projectId,
            alert.alertDefinition.inlineRule as InlineRule,
            alert.executionDetails.subjects,
          ),
        include: {
          counterpartyBeneficiary: {
            select: {
              correlationId: true,
              business: {
                select: {
                  correlationId: true,
                  companyName: true,
                },
              },
              endUser: {
                select: {
                  correlationId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          counterpartyOriginator: {
            select: {
              correlationId: true,
              business: {
                select: {
                  correlationId: true,
                  companyName: true,
                },
              },
              endUser: {
                select: {
                  correlationId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }

    return [];
  }
}
