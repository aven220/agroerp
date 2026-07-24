import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService, RegisterFileDto } from '../application/files.service';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { AgroRequest } from '@/core/engine/middleware/request-context.middleware';

@ApiTags('Files (Resource)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('register')
  @RequirePermissions('resource:create')
  @ApiOperation({
    summary: 'Register file as Resource',
    description:
      'Creates a file-type Resource. Call POST /files/:id/content afterwards to upload bytes.',
  })
  register(
    @CurrentUser() user: { id: string; organizationId: string },
    @Body() dto: RegisterFileDto,
    @Req() req: AgroRequest,
  ) {
    return this.files.register(
      user.organizationId,
      dto,
      user.id,
      req.agroContext,
    );
  }

  @Post(':id/content')
  @RequirePermissions('resource:create')
  @UseInterceptors(
    FileInterceptor('file', {
      // Default Nest storage is memory (provides file.buffer)
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload binary content for a registered file resource' })
  uploadContent(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('id') id: string,
    @UploadedFile()
    file: {
      buffer: Buffer;
      mimetype?: string;
      originalname?: string;
      size?: number;
    },
  ) {
    return this.files.saveContent(user.organizationId, id, file, user.id);
  }

  @Get(':id/content')
  @RequirePermissions('resource:read')
  @ApiOperation({ summary: 'Download binary content of a file resource' })
  async downloadContent(
    @CurrentUser() user: { organizationId: string },
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const content = await this.files.getContent(user.organizationId, id);
    res.setHeader('Content-Type', content.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(content.filename)}"`,
    );
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(content.buffer);
  }
}
