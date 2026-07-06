#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cmd = process.argv[2];
const arg = process.argv[3];

const TEMPLATE = {
  apiVersion: 'agroerp.platform/v1',
  pluginKey: 'vendor.example.plugin',
  name: 'Example Plugin',
  version: '1.0.0',
  vendor: 'AGROERP Partner',
  pluginType: 'business_module',
  minPlatformVersion: '1.0.0',
  dependencies: [],
  permissions: [{ key: 'plugin:example:read', description: 'Read example', scope: 'org' }],
  extensionPoints: [{ pointKey: 'core.dashboard.widgets', handler: 'example.widget' }],
  events: { subscribe: [], publish: [] },
  configSchema: { type: 'object', properties: {} },
};

function signManifest(manifest, secret) {
  const body = JSON.stringify({ ...manifest, signature: undefined });
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function validate(manifest) {
  const errors = [];
  if (!manifest.apiVersion?.startsWith('agroerp.')) errors.push('apiVersion inválido');
  if (!manifest.pluginKey) errors.push('pluginKey requerido');
  if (!manifest.name || !manifest.version || !manifest.vendor) errors.push('campos obligatorios');
  if (!manifest.pluginType) errors.push('pluginType requerido');
  return errors;
}

if (cmd === 'init') {
  const dir = arg || '.';
  const type = process.argv[4] || 'business_module';
  const manifest = { ...TEMPLATE, pluginType: type, pluginKey: `vendor.${type}.example` };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('manifest.json creado');
} else if (cmd === 'validate') {
  const file = arg || 'manifest.json';
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validate(manifest);
  if (errors.length) {
    console.error('ERRORES:', errors.join(', '));
    process.exit(1);
  }
  console.log('OK: manifest válido');
} else if (cmd === 'package') {
  const file = arg || 'manifest.json';
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validate(manifest);
  if (errors.length) {
    console.error('ERRORES:', errors.join(', '));
    process.exit(1);
  }
  const secret = process.env.EPPM_SIGNING_SECRET || 'agroerp-eppm-dev-secret';
  const signed = { ...manifest, signature: signManifest(manifest, secret) };
  const out = path.join(path.dirname(file), `${manifest.pluginKey.replace(/\./g, '-')}-${manifest.version}.plugin.json`);
  fs.writeFileSync(out, JSON.stringify(signed, null, 2));
  const checksum = crypto.createHash('sha256').update(JSON.stringify(signed)).digest('hex');
  console.log(JSON.stringify({ package: out, checksum, format: 'agroerp-plugin-v1' }));
} else {
  console.log('Uso: agroerp-plugin init [dir] [pluginType] | validate [manifest.json] | package [manifest.json]');
  process.exit(1);
}
