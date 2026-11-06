import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document (ADMIN, EDITOR)' })
  @ApiCreatedResponse({ description: 'Document uploaded successfully' })
  async upload(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    const doc = await this.documentsService.upload(dto, file, req.user.id);
    return { success: true, message: 'Document uploaded successfully', data: doc };
  }

  @Get()
  @ApiOperation({ summary: 'List documents (ADMIN/EDITOR see all, VIEWER sees own)' })
  @ApiOkResponse({ description: 'Paginated documents' })
  async findAll(
    @Query() query: QueryDocumentsDto,
    @Request() req: { user: { id: string; role: string } },
  ) {
    const result = await this.documentsService.findPaginated(
      query,
      req.user.id,
      req.user.role,
    );
    return {
      success: true,
      data: {
        documents: result.documents,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  @ApiOkResponse()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string; role: string } },
  ) {
    const doc = await this.documentsService.findById(id, req.user.id, req.user.role);
    return { success: true, data: doc };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @ApiOperation({ summary: 'Update document metadata (ADMIN, EDITOR)' })
  @ApiOkResponse()
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @Request() req: { user: { id: string; role: string } },
  ) {
    const doc = await this.documentsService.update(id, dto, req.user.id, req.user.role);
    return { success: true, data: doc };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a document (ADMIN, EDITOR — own only for EDITOR)' })
  @ApiNoContentResponse()
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: { user: { id: string; role: string } },
  ): Promise<void> {
    return this.documentsService.remove(id, req.user.id, req.user.role);
  }
}
