import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
    summary: 'Register file as Resource + FileUploaded event',
    description: 'Creates a file-type Resource. MinIO upload integration comes in next phase.',
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
}
