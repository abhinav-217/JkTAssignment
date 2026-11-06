import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiAcceptedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { IngestionService } from './ingestion.service';
import { TriggerIngestionDto } from './dto/trigger-ingestion.dto';
import { QueryIngestionDto } from './dto/query-ingestion.dto';

@ApiTags('Ingestion')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ingestion')
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * POST /ingestion — Trigger ingestion for a document.
   * Returns 202 Accepted immediately; processing is asynchronous.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Trigger document ingestion (ADMIN, EDITOR)' })
  @ApiAcceptedResponse({ description: 'Ingestion job queued' })
  async trigger(
    @Body() dto: TriggerIngestionDto,
    @Request() req: { user: { id: string } },
  ) {
    const job = await this.ingestionService.trigger(dto, req.user.id);
    return {
      success: true,
      message: 'Ingestion job queued. Processing is asynchronous.',
      data: { jobId: job.id, status: job.status },
    };
  }

  /**
   * GET /ingestion — List all ingestion jobs (ADMIN).
   */
  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List ingestion jobs with pagination (ADMIN)' })
  @ApiOkResponse({ description: 'Paginated ingestion jobs' })
  async findAll(@Query() query: QueryIngestionDto) {
    const result = await this.ingestionService.findPaginated(query);
    return {
      success: true,
      data: {
        jobs: result.jobs,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    };
  }

  /**
   * GET /ingestion/:id — Get a specific job's status.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get ingestion job status by ID' })
  @ApiOkResponse()
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const job = await this.ingestionService.findById(id);
    return { success: true, data: job };
  }

  /**
   * DELETE /ingestion/:id — Cancel a QUEUED job (ADMIN).
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancel a queued ingestion job (ADMIN)' })
  @ApiOkResponse()
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const job = await this.ingestionService.cancel(id);
    return { success: true, message: 'Ingestion job cancelled', data: job };
  }
}
