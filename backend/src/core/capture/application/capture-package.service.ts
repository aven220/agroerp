import { createHash, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { FormDefinitionSchema } from '@agroerp/shared';
import { FormsService } from '@/core/forms/application/forms.service';
import type {
  CapturePackage,
  CapturePackageAssignment,
  CapturePackageForm,
  CaptureVersionCheck,
} from '../domain';
import { CaptureAssignmentService } from './capture-assignment.service';
import { CaptureCatalogService } from './capture-catalog.service';
import { CaptureQueryService } from './capture-query.service';

@Injectable()
export class CapturePackageService {
  constructor(
    private readonly forms: FormsService,
    private readonly query: CaptureQueryService,
    private readonly assignments: CaptureAssignmentService,
    private readonly catalogs: CaptureCatalogService,
  ) {}

  async buildMobilePackage(
    organizationId: string,
    userId: string,
  ): Promise<CapturePackage> {
    const [bootstrap, userAssignments] = await Promise.all([
      this.forms.bootstrap(organizationId),
      this.assignments.getAssignmentsForUser(organizationId, userId),
    ]);

    const assignmentByFormId = new Map(
      userAssignments.map((a) => [a.formId, a]),
    );

    const assignedFormIds = new Set(userAssignments.map((a) => a.formId));
    const formsToInclude =
      assignedFormIds.size > 0
        ? bootstrap.forms.filter((f) => assignedFormIds.has(f.id))
        : bootstrap.forms;

    const packageForms: CapturePackageForm[] = [];
    for (const summary of formsToInclude) {
      const detail = await this.query.getFormDefinition(organizationId, summary.id);
      const schema = detail.schema as FormDefinitionSchema;
      const settings = schema.settings ?? {};
      const assignment = assignmentByFormId.get(summary.id);

      packageForms.push({
        ...detail,
        assignment: assignment
          ? this.mapAssignment(assignment)
          : undefined,
        offline: {
          offlineCapable: settings.offlineCapable !== false,
          allowDraft: settings.allowDraft !== false,
          requireGps: settings.requireGps === true,
          geofence: settings.geofence,
        },
        requiredCatalogKeys: this.catalogs.extractCatalogKeysFromSchemas([
          detail.schema,
        ]),
      });
    }

    const catalogKeys = this.catalogs.extractCatalogKeysFromSchemas(
      packageForms.map((f) => f.schema),
    );

    const packageAssignments: CapturePackageAssignment[] = userAssignments.map(
      (a) => this.mapAssignment(a),
    );

    const generatedAt = new Date().toISOString();
    const packageVersion = this.computePackageVersion(
      packageForms,
      catalogKeys,
      packageAssignments.length,
    );

    return {
      packageId: randomUUID(),
      packageVersion,
      generatedAt,
      organizationId,
      userId,
      assignments: packageAssignments,
      forms: packageForms,
      catalogKeys,
      offline: {
        syncRecommendedIntervalMinutes: 15,
        maxSubmissionsPerSync: 100,
      },
    };
  }

  async checkVersion(
    organizationId: string,
    userId: string,
    clientPackageVersion?: string,
  ): Promise<CaptureVersionCheck> {
    const [bootstrap, userAssignments] = await Promise.all([
      this.forms.bootstrap(organizationId),
      this.assignments.getAssignmentsForUser(organizationId, userId),
    ]);

    const assignedFormIds = new Set(userAssignments.map((a) => a.formId));
    const relevantForms =
      assignedFormIds.size > 0
        ? bootstrap.forms.filter((f) => assignedFormIds.has(f.id))
        : bootstrap.forms;

    const formEntries = relevantForms.map((f) => ({
      formId: f.id,
      formKey: f.formKey,
      version: f.version,
      status: f.status,
      updatedAt: f.publishedAt?.toISOString() ?? '',
      publishedAt: f.publishedAt?.toISOString() ?? null,
    }));

    const catalogKeys = this.catalogs.extractCatalogKeysFromSchemas(
      relevantForms.map((f) => f.schema),
    );

    const packageVersion = this.computePackageVersion(
      relevantForms.map((f) => ({
        formId: f.id,
        formKey: f.formKey,
        version: f.version,
        schema: f.schema,
      })),
      catalogKeys,
      userAssignments.length,
    );

    const hasChanges = clientPackageVersion
      ? clientPackageVersion !== packageVersion
      : true;

    return {
      packageVersion,
      serverTime: new Date().toISOString(),
      hasChanges,
      pendingAssignments: userAssignments.length,
      forms: formEntries,
      catalogsChanged: hasChanges,
    };
  }

  private mapAssignment(assignment: {
    id: string;
    formId: string;
    status: string;
    dueAt: Date | null;
    contextType: string | null;
    contextId: string | null;
    assignedAt: Date;
  }): CapturePackageAssignment {
    return {
      assignmentId: assignment.id,
      formId: assignment.formId,
      status: assignment.status,
      dueAt: assignment.dueAt?.toISOString() ?? null,
      contextType: assignment.contextType,
      contextId: assignment.contextId,
      assignedAt: assignment.assignedAt.toISOString(),
    };
  }

  private computePackageVersion(
    forms: Array<{ formId?: string; id?: string; formKey: string; version: number; schema?: unknown }>,
    catalogKeys: string[],
    assignmentCount: number,
  ): string {
    const payload = JSON.stringify({
      forms: forms.map((f) => ({
        id: f.formId ?? f.id,
        formKey: f.formKey,
        version: f.version,
      })),
      catalogKeys,
      assignmentCount,
      catalogRegistryVersion: '1.0.0',
    });
    return createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }
}
