import { EIH_CONNECTOR_PROTOCOLS, EIH_CONNECTOR_CATEGORIES, EIH_DATA_FORMATS } from '@agroerp/shared';

describe('EIH catalog completeness', () => {
  it('includes all connector protocols', () => {
    const required = [
      'rest', 'soap', 'graphql', 'grpc', 'sftp', 'ftp', 'email', 'database',
      'message_queue', 'flat_file', 'webhook', 'proprietary',
    ];
    for (const p of required) {
      expect(EIH_CONNECTOR_PROTOCOLS).toContain(p);
    }
  });

  it('includes enterprise connector categories', () => {
    const required = [
      'billing', 'tax_authority', 'bank', 'payment_gateway', 'external_erp',
      'crm', 'accounting', 'weather', 'satellite', 'maps', 'iot',
    ];
    for (const c of required) {
      expect(EIH_CONNECTOR_CATEGORIES).toContain(c);
    }
  });

  it('includes all data formats', () => {
    const required = ['json', 'xml', 'csv', 'excel', 'pdf', 'plain_text', 'geojson', 'protobuf'];
    for (const f of required) {
      expect(EIH_DATA_FORMATS).toContain(f);
    }
  });
});
