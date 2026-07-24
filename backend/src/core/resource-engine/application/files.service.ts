import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { PrismaService } from '@/shared/infrastructure/database/prisma.service';
import { CoreEngineService } from '@/core/engine/application/core-engine.service';
import { RequestContext } from '@/core/engine/middleware/request-context.middleware';

export class RegisterFileDto {
  @ApiProperty({ example: 'field-photo.jpg' })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 204800 })
  @IsNumber()
  sizeBytes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Parent resource id' })
  @IsOptional()
  @IsString()
  parentResourceId?: string;
}

export type FileContentResult = {
  buffer: Buffer;
  mimeType: string;
  filename: string;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly storageRoot: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
    private readonly config: ConfigService,
  ) {
    this.storageRoot =
      this.config.get<string>('FILE_STORAGE_ROOT') ??
      join(process.cwd(), 'storage', 'files');
  }

  async register(
    organizationId: string,
    dto: RegisterFileDto,
    userId: string,
    ctx?: RequestContext,
  ) {
    const fileData = {
      filename: dto.filename,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      storageKey: dto.storageKey ?? `pending/${dto.filename}`,
      parentResourceId: dto.parentResourceId,
      contentAvailable: false,
      ...(dto.metadata ?? {}),
    };

    const resource = await this.prisma.resource.create({
      data: {
        organizationId,
        resourceType: 'file',
        data: fileData as object,
        attributes: fileData as object,
        metadata: (dto.metadata ?? {}) as object,
        parentId: dto.parentResourceId,
        syncStatus: 'pending',
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await this.core.emitFileUploaded(
      organizationId,
      resource.id,
      {
        resourceId: resource.id,
        ...fileData,
      },
      {
        ctx: { ...ctx, userId, organizationId },
        newValues: fileData,
      },
    );

    return resource;
  }

  async saveContent(
    organizationId: string,
    resourceId: string,
    file: { buffer: Buffer; mimetype?: string; originalname?: string; size?: number },
    userId: string,
  ) {
    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId, organizationId, deletedAt: null },
    });
    if (!resource || resource.resourceType !== 'file') {
      throw new NotFoundException('Archivo no encontrado');
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Archivo vacío');
    }

    const data = (resource.data ?? {}) as Record<string, unknown>;
    const filename = String(file.originalname || data.filename || `${resourceId}.bin`);
    const mimeType = String(file.mimetype || data.mimeType || 'application/octet-stream');
    const storageKey = `org/${organizationId}/files/${resourceId}/${filename}`;
    const absPath = join(this.storageRoot, storageKey);

    await mkdir(dirname(absPath), { recursive: true });
    await writeFile(absPath, file.buffer);

    const nextData = {
      ...data,
      filename,
      mimeType,
      sizeBytes: file.size ?? file.buffer.length,
      storageKey,
      contentAvailable: true,
      storedAt: new Date().toISOString(),
    };

    const updated = await this.prisma.resource.update({
      where: { id: resourceId },
      data: {
        data: nextData as object,
        attributes: nextData as object,
        syncStatus: 'synced',
        updatedBy: userId,
      },
    });

    this.logger.log(`Stored file content for ${resourceId} (${file.buffer.length} bytes)`);
    return updated;
  }

  async getContent(organizationId: string, resourceId: string): Promise<FileContentResult> {
    const resource = await this.prisma.resource.findFirst({
      where: { id: resourceId, organizationId, deletedAt: null },
    });
    if (!resource || resource.resourceType !== 'file') {
      throw new NotFoundException('Archivo no encontrado');
    }

    const data = (resource.data ?? {}) as Record<string, unknown>;
    const storageKey = String(data.storageKey ?? '');
    if (!storageKey || storageKey.startsWith('local://') || storageKey.startsWith('pending/')) {
      throw new NotFoundException(
        'El archivo aún no tiene contenido en el servidor. Re-sincronice desde la app de campo.',
      );
    }

    const absPath = join(this.storageRoot, storageKey);
    try {
      await access(absPath);
    } catch {
      throw new NotFoundException('Contenido del archivo no encontrado en almacenamiento');
    }

    const buffer = await readFile(absPath);
    return {
      buffer,
      mimeType: String(data.mimeType ?? 'application/octet-stream'),
      filename: String(data.filename ?? resourceId),
    };
  }

  hasStoredContent(resource: { data?: unknown }): boolean {
    const data = (resource.data ?? {}) as Record<string, unknown>;
    const key = String(data.storageKey ?? '');
    return Boolean(data.contentAvailable) && !!key && !key.startsWith('local://');
  }
}
