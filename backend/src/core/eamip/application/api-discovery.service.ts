import { Injectable } from '@nestjs/common';

export interface DiscoveredService {
  moduleRef: string;
  name: string;
  basePath: string;
  domain: string;
  endpoints: Array<{ method: string; path: string; description?: string }>;
}

@Injectable()
export class ApiDiscoveryService {
  private readonly catalog: DiscoveredService[] = [
    {
      moduleRef: 'prm',
      name: 'Productores',
      basePath: '/api/v1/prm',
      domain: 'prm',
      endpoints: [
        { method: 'GET', path: '/producers', description: 'Listar productores' },
        { method: 'POST', path: '/producers', description: 'Crear productor' },
        { method: 'GET', path: '/producers/:id', description: 'Detalle productor' },
      ],
    },
    {
      moduleRef: 'ftip',
      name: 'Fincas',
      basePath: '/api/v1/ftip',
      domain: 'ftip',
      endpoints: [
        { method: 'GET', path: '/farms', description: 'Listar fincas' },
        { method: 'POST', path: '/farms', description: 'Crear finca' },
      ],
    },
    {
      moduleRef: 'fmdt',
      name: 'Lotes',
      basePath: '/api/v1/fmdt',
      domain: 'fmdt',
      endpoints: [
        { method: 'GET', path: '/lots', description: 'Listar lotes' },
        { method: 'POST', path: '/lots', description: 'Crear lote' },
      ],
    },
    {
      moduleRef: 'forms',
      name: 'Formularios',
      basePath: '/api/v1/forms',
      domain: 'forms',
      endpoints: [
        { method: 'GET', path: '/definitions', description: 'Listar formularios' },
        { method: 'POST', path: '/submissions', description: 'Enviar formulario' },
      ],
    },
    {
      moduleRef: 'workflows',
      name: 'Procesos BPM',
      basePath: '/api/v1/workflows',
      domain: 'workflows',
      endpoints: [
        { method: 'GET', path: '/instances', description: 'Instancias de proceso' },
        { method: 'GET', path: '/inbox', description: 'Bandeja de tareas' },
      ],
    },
    {
      moduleRef: 'gis',
      name: 'GIS',
      basePath: '/api/v1/gis',
      domain: 'gis',
      endpoints: [
        { method: 'GET', path: '/layers', description: 'Capas GIS' },
        { method: 'POST', path: '/spatial/query', description: 'Consulta espacial' },
      ],
    },
    {
      moduleRef: 'ebiap',
      name: 'Business Intelligence',
      basePath: '/api/v1/ebiap',
      domain: 'analytics',
      endpoints: [
        { method: 'GET', path: '/center', description: 'Centro BI' },
        { method: 'GET', path: '/dashboards', description: 'Dashboards' },
      ],
    },
    {
      moduleRef: 'eaidsp',
      name: 'Inteligencia Artificial',
      basePath: '/api/v1/eaidsp',
      domain: 'ai',
      endpoints: [
        { method: 'POST', path: '/chat', description: 'Chat IA' },
        { method: 'GET', path: '/copilots', description: 'Copilotos' },
      ],
    },
    {
      moduleRef: 'eneac',
      name: 'Notificaciones',
      basePath: '/api/v1/eneac',
      domain: 'notifications',
      endpoints: [
        { method: 'GET', path: '/messages', description: 'Mensajes' },
        { method: 'GET', path: '/events', description: 'Eventos' },
      ],
    },
    {
      moduleRef: 'eamip',
      name: 'API Management',
      basePath: '/api/v1/eamip',
      domain: 'core',
      endpoints: [
        { method: 'GET', path: '/center', description: 'Centro de APIs' },
        { method: 'GET', path: '/catalog', description: 'Catálogo' },
      ],
    },
  ];

  discover(): DiscoveredService[] {
    return this.catalog;
  }

  findByModule(moduleRef: string): DiscoveredService | undefined {
    return this.catalog.find((s) => s.moduleRef === moduleRef);
  }
}
