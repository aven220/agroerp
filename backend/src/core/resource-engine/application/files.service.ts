import { Injectable } from '@nestjs/common';
import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly core: CoreEngineService,
  ) {}

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
}
