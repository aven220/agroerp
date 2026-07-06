import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard, RequirePermissions } from '@/shared/infrastructure/guards/permissions.guard';
import { CurrentUser } from '@/shared/presentation/decorators/current-user.decorator';
import { HcmCenterService } from '../application/hcm-center.service';
import { HcmOrgService } from '../application/hcm-org.service';
import { HcmEmployeeService } from '../application/hcm-employee.service';
import { HcmContractService } from '../application/hcm-contract.service';
import { HcmDocumentService } from '../application/hcm-document.service';
import { HcmAuditService } from '../application/hcm-audit.service';
import {
  HcmAreaDto,
  HcmAuthorizedUpdateDto,
  HcmBranchDto,
  HcmBulkImportDto,
  HcmCompanyDto,
  HcmContractDto,
  HcmDepartmentDto,
  HcmDependentDto,
  HcmDocumentUploadDto,
  HcmEmergencyContactDto,
  HcmEmployeeDto,
  HcmPositionDto,
  HcmRenewContractDto,
  HcmStatusChangeDto,
  HcmTerminateContractDto,
  HcmTransferDto,
} from './hcm.dto';
import type { HcmContractStatus, HcmContractType, HcmEmploymentStatus } from '@prisma/client';

@ApiTags('HCM — Talento Humano')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('hcm')
export class HcmController {
  constructor(
    private readonly center: HcmCenterService,
    private readonly org: HcmOrgService,
    private readonly employees: HcmEmployeeService,
    private readonly contracts: HcmContractService,
    private readonly documents: HcmDocumentService,
    private readonly auditService: HcmAuditService,
  ) {}

  @Get('center')
  @RequirePermissions('hcm:read')
  hcmCenter(@CurrentUser() user: { organizationId: string }) {
    return this.center.center(user.organizationId);
  }

  @Post('seed')
  @RequirePermissions('hcm:config')
  seed(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.center.seed(user.organizationId, user.id);
  }

  @Get('org/hierarchy')
  @RequirePermissions('hcm:read')
  hierarchy(@CurrentUser() user: { organizationId: string }) {
    return this.org.hierarchy(user.organizationId);
  }

  @Post('org/seed')
  @RequirePermissions('hcm:config')
  seedOrg(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.org.seed(user.organizationId, user.id);
  }

  @Post('org/chart/rebuild')
  @RequirePermissions('hcm:org')
  rebuildChart(@CurrentUser() user: { id: string; organizationId: string }) {
    return this.org.rebuildOrgChart(user.organizationId, user.id);
  }

  @Get('org/companies')
  @RequirePermissions('hcm:read')
  listCompanies(@CurrentUser() user: { organizationId: string }) {
    return this.org.listCompanies(user.organizationId);
  }

  @Post('org/companies')
  @RequirePermissions('hcm:org')
  upsertCompany(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmCompanyDto) {
    return this.org.upsertCompany(user.organizationId, user.id, dto);
  }

  @Post('org/branches')
  @RequirePermissions('hcm:org')
  upsertBranch(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmBranchDto) {
    return this.org.upsertBranch(user.organizationId, user.id, dto);
  }

  @Post('org/areas')
  @RequirePermissions('hcm:org')
  upsertArea(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmAreaDto) {
    return this.org.upsertArea(user.organizationId, user.id, dto);
  }

  @Post('org/departments')
  @RequirePermissions('hcm:org')
  upsertDepartment(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmDepartmentDto) {
    return this.org.upsertDepartment(user.organizationId, user.id, dto);
  }

  @Post('org/positions')
  @RequirePermissions('hcm:org')
  upsertPosition(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmPositionDto) {
    return this.org.upsertPosition(user.organizationId, user.id, dto);
  }

  @Get('employees')
  @RequirePermissions('hcm:read')
  listEmployees(
    @CurrentUser() user: { organizationId: string },
    @Query('status') status?: HcmEmploymentStatus,
    @Query('companyKey') companyKey?: string,
    @Query('departmentKey') departmentKey?: string,
    @Query('q') q?: string,
  ) {
    return this.employees.list(user.organizationId, { status, companyKey, departmentKey, q });
  }

  @Get('employees/search')
  @RequirePermissions('hcm:read')
  searchEmployees(@CurrentUser() user: { organizationId: string }, @Query('q') q: string) {
    return this.employees.search(user.organizationId, q);
  }

  @Get('employees/:employeeKey')
  @RequirePermissions('hcm:read')
  getEmployee(@CurrentUser() user: { organizationId: string }, @Param('employeeKey') employeeKey: string) {
    return this.employees.get(user.organizationId, employeeKey);
  }

  @Post('employees')
  @RequirePermissions('hcm:employee')
  createEmployee(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmEmployeeDto) {
    return this.employees.create(user.organizationId, user.id, dto);
  }

  @Put('employees/:employeeKey')
  @RequirePermissions('hcm:employee')
  updateEmployee(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('employeeKey') employeeKey: string,
    @Body() dto: Partial<HcmEmployeeDto>,
  ) {
    return this.employees.update(user.organizationId, employeeKey, user.id, dto);
  }

  @Post('employees/:employeeKey/transfer')
  @RequirePermissions('hcm:employee')
  transferEmployee(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('employeeKey') employeeKey: string,
    @Body() dto: HcmTransferDto,
  ) {
    return this.employees.transfer(user.organizationId, employeeKey, user.id, dto);
  }

  @Post('employees/:employeeKey/status')
  @RequirePermissions('hcm:employee')
  changeStatus(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('employeeKey') employeeKey: string,
    @Body() dto: HcmStatusChangeDto,
  ) {
    return this.employees.changeStatus(user.organizationId, employeeKey, user.id, dto.status, dto.effectiveDate, dto.notes);
  }

  @Post('employees/:employeeKey/dependents')
  @RequirePermissions('hcm:employee')
  addDependent(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('employeeKey') employeeKey: string,
    @Body() dto: HcmDependentDto,
  ) {
    return this.employees.addDependent(user.organizationId, employeeKey, user.id, dto);
  }

  @Post('employees/:employeeKey/contacts')
  @RequirePermissions('hcm:employee')
  addContact(@CurrentUser() user: { organizationId: string }, @Param('employeeKey') employeeKey: string, @Body() dto: HcmEmergencyContactDto) {
    return this.employees.addEmergencyContact(user.organizationId, employeeKey, dto);
  }

  @Put('employees/:employeeKey/authorized')
  @RequirePermissions('hcm:read')
  updateAuthorized(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('employeeKey') employeeKey: string,
    @Body() dto: HcmAuthorizedUpdateDto,
  ) {
    return this.employees.updateAuthorizedFields(user.organizationId, employeeKey, user.id, dto);
  }

  @Post('employees/import')
  @RequirePermissions('hcm:import')
  bulkImport(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmBulkImportDto) {
    return this.employees.bulkImport(user.organizationId, user.id, dto.rows as never);
  }

  @Get('contracts')
  @RequirePermissions('hcm:read')
  listContracts(
    @CurrentUser() user: { organizationId: string },
    @Query('employeeKey') employeeKey?: string,
    @Query('status') status?: HcmContractStatus,
    @Query('contractType') contractType?: HcmContractType,
  ) {
    return this.contracts.list(user.organizationId, { employeeKey, status, contractType });
  }

  @Get('contracts/:contractKey')
  @RequirePermissions('hcm:read')
  getContract(@CurrentUser() user: { organizationId: string }, @Param('contractKey') contractKey: string) {
    return this.contracts.get(user.organizationId, contractKey);
  }

  @Post('contracts')
  @RequirePermissions('hcm:contract')
  createContract(@CurrentUser() user: { id: string; organizationId: string }, @Body() dto: HcmContractDto) {
    return this.contracts.create(user.organizationId, user.id, dto);
  }

  @Post('contracts/:contractKey/renew')
  @RequirePermissions('hcm:contract')
  renewContract(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('contractKey') contractKey: string,
    @Body() dto: HcmRenewContractDto,
  ) {
    return this.contracts.renew(user.organizationId, contractKey, user.id, dto);
  }

  @Post('contracts/:contractKey/terminate')
  @RequirePermissions('hcm:contract')
  terminateContract(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('contractKey') contractKey: string,
    @Body() dto: HcmTerminateContractDto,
  ) {
    return this.contracts.terminate(user.organizationId, contractKey, user.id, dto);
  }

  @Get('documents')
  @RequirePermissions('hcm:read')
  listDocuments(@CurrentUser() user: { organizationId: string }, @Query('employeeKey') employeeKey?: string) {
    return this.documents.list(user.organizationId, employeeKey);
  }

  @Get('documents/:documentKey')
  @RequirePermissions('hcm:read')
  getDocument(@CurrentUser() user: { organizationId: string }, @Param('documentKey') documentKey: string) {
    return this.documents.get(user.organizationId, documentKey);
  }

  @Post('employees/:employeeKey/documents')
  @RequirePermissions('hcm:document')
  uploadDocument(
    @CurrentUser() user: { id: string; organizationId: string },
    @Param('employeeKey') employeeKey: string,
    @Body() dto: HcmDocumentUploadDto,
  ) {
    return this.documents.upload(user.organizationId, employeeKey, user.id, dto);
  }

  @Get('documents/:documentKey/versions')
  @RequirePermissions('hcm:read')
  listVersions(@CurrentUser() user: { organizationId: string }, @Param('documentKey') documentKey: string) {
    return this.documents.listVersions(user.organizationId, documentKey);
  }

  @Get('audit')
  @RequirePermissions('hcm:audit')
  auditLogs(@CurrentUser() user: { organizationId: string }, @Query('entityType') entityType?: string) {
    return this.auditService.findAll(user.organizationId, entityType);
  }

  @Get('mobile/sync')
  @RequirePermissions('hcm:read')
  mobileSync(@CurrentUser() user: { organizationId: string }) {
    return this.center.mobileSync(user.organizationId);
  }
}
