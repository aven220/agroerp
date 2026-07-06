-- EIESDP — Enterprise IoT, Edge & Smart Devices Platform

CREATE TYPE "EiesdpDeviceType" AS ENUM (
  'electronic_scale', 'temperature_sensor', 'humidity_sensor', 'soil_sensor', 'ph_sensor',
  'weather_station', 'gps_tracker', 'rfid_reader', 'nfc_reader', 'ble_beacon', 'qr_scanner',
  'barcode_scanner', 'ip_camera', 'drone', 'industrial_controller', 'plc', 'actuator',
  'energy_meter', 'custom_driver'
);
CREATE TYPE "EiesdpDeviceStatus" AS ENUM ('registered', 'active', 'inactive', 'revoked', 'maintenance', 'offline');
CREATE TYPE "EiesdpProtocol" AS ENUM ('mqtt', 'http', 'https', 'tcp', 'udp', 'websocket', 'bluetooth', 'serial', 'usb', 'modbus', 'opcua');
CREATE TYPE "EiesdpTelemetryKind" AS ENUM ('reading', 'event', 'alarm', 'status', 'location');
CREATE TYPE "EiesdpAlertSeverity" AS ENUM ('info', 'warning', 'critical');
CREATE TYPE "EiesdpFirmwareStatus" AS ENUM ('available', 'deploying', 'deployed', 'failed');
CREATE TYPE "EiesdpEdgeGatewayStatus" AS ENUM ('online', 'offline', 'syncing');

CREATE TABLE "eiesdp_device_groups" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "group_key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_device_groups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_device_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eiesdp_device_groups_organization_id_group_key_key" ON "eiesdp_device_groups"("organization_id", "group_key");

CREATE TABLE "eiesdp_devices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "group_id" UUID,
  "device_key" VARCHAR(120) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "device_type" "EiesdpDeviceType" NOT NULL,
  "protocol" "EiesdpProtocol" NOT NULL DEFAULT 'mqtt',
  "status" "EiesdpDeviceStatus" NOT NULL DEFAULT 'registered',
  "serial_number" VARCHAR(100),
  "mac_address" VARCHAR(50),
  "firmware_version" VARCHAR(50),
  "driver_key" VARCHAR(100),
  "battery_level" INTEGER,
  "signal_quality" INTEGER,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "farm_id" UUID,
  "lot_id" UUID,
  "vehicle_id" VARCHAR(100),
  "collection_center_id" VARCHAR(100),
  "assigned_user_id" UUID,
  "certificate_thumbprint" VARCHAR(128),
  "auth_token_hash" VARCHAR(128),
  "mqtt_topic" VARCHAR(255),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "ai_readiness" JSONB NOT NULL DEFAULT '{}',
  "last_seen_at" TIMESTAMPTZ,
  "activated_at" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "created_by" UUID,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_devices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_devices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eiesdp_devices_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "eiesdp_device_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eiesdp_devices_organization_id_device_key_key" ON "eiesdp_devices"("organization_id", "device_key");
CREATE INDEX "eiesdp_devices_organization_id_status_device_type_idx" ON "eiesdp_devices"("organization_id", "status", "device_type");
CREATE INDEX "eiesdp_devices_organization_id_last_seen_at_idx" ON "eiesdp_devices"("organization_id", "last_seen_at");

CREATE TABLE "eiesdp_device_credentials" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "device_id" UUID NOT NULL,
  "credential_type" VARCHAR(50) NOT NULL,
  "public_key" TEXT,
  "secret_hash" VARCHAR(128),
  "expires_at" TIMESTAMPTZ,
  "rotated_at" TIMESTAMPTZ,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_device_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_device_credentials_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "eiesdp_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "eiesdp_device_credentials_device_id_is_active_idx" ON "eiesdp_device_credentials"("device_id", "is_active");

CREATE TABLE "eiesdp_digital_twins" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "device_id" UUID NOT NULL,
  "reported_state" JSONB NOT NULL DEFAULT '{}',
  "desired_state" JSONB NOT NULL DEFAULT '{}',
  "delta" JSONB NOT NULL DEFAULT '{}',
  "version" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_digital_twins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_digital_twins_device_id_key" UNIQUE ("device_id"),
  CONSTRAINT "eiesdp_digital_twins_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "eiesdp_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "eiesdp_telemetry_readings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "device_id" UUID NOT NULL,
  "device_key" VARCHAR(120) NOT NULL,
  "kind" "EiesdpTelemetryKind" NOT NULL DEFAULT 'reading',
  "metric_key" VARCHAR(100) NOT NULL,
  "value" DOUBLE PRECISION,
  "value_text" VARCHAR(255),
  "unit" VARCHAR(30),
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "battery_level" INTEGER,
  "signal_quality" INTEGER,
  "firmware_version" VARCHAR(50),
  "payload" JSONB NOT NULL DEFAULT '{}',
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_telemetry_readings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_telemetry_readings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eiesdp_telemetry_readings_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "eiesdp_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "eiesdp_telemetry_readings_organization_id_recorded_at_idx" ON "eiesdp_telemetry_readings"("organization_id", "recorded_at");
CREATE INDEX "eiesdp_telemetry_readings_device_id_recorded_at_idx" ON "eiesdp_telemetry_readings"("device_id", "recorded_at");
CREATE INDEX "eiesdp_telemetry_readings_metric_key_recorded_at_idx" ON "eiesdp_telemetry_readings"("metric_key", "recorded_at");

CREATE TABLE "eiesdp_device_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "device_id" UUID NOT NULL,
  "device_key" VARCHAR(120) NOT NULL,
  "kind" "EiesdpTelemetryKind" NOT NULL DEFAULT 'event',
  "event_type" VARCHAR(100) NOT NULL,
  "severity" "EiesdpAlertSeverity" NOT NULL DEFAULT 'info',
  "message" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "recorded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_device_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_device_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eiesdp_device_events_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "eiesdp_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "eiesdp_device_events_organization_id_recorded_at_idx" ON "eiesdp_device_events"("organization_id", "recorded_at");
CREATE INDEX "eiesdp_device_events_device_id_recorded_at_idx" ON "eiesdp_device_events"("device_id", "recorded_at");

CREATE TABLE "eiesdp_edge_gateways" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "gateway_key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "hostname" VARCHAR(255),
  "status" "EiesdpEdgeGatewayStatus" NOT NULL DEFAULT 'offline',
  "capacity" INTEGER NOT NULL DEFAULT 100,
  "local_rules" JSONB NOT NULL DEFAULT '[]',
  "buffer_size" INTEGER NOT NULL DEFAULT 1000,
  "last_sync_at" TIMESTAMPTZ,
  "last_heartbeat" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_edge_gateways_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_edge_gateways_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eiesdp_edge_gateways_organization_id_gateway_key_key" ON "eiesdp_edge_gateways"("organization_id", "gateway_key");

CREATE TABLE "eiesdp_edge_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "gateway_id" UUID NOT NULL,
  "rule_key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "conditions" JSONB NOT NULL DEFAULT '{}',
  "actions" JSONB NOT NULL DEFAULT '[]',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_edge_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_edge_rules_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "eiesdp_edge_gateways"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eiesdp_edge_rules_gateway_id_rule_key_key" ON "eiesdp_edge_rules"("gateway_id", "rule_key");

CREATE TABLE "eiesdp_edge_buffers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "gateway_id" UUID NOT NULL,
  "device_key" VARCHAR(120) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "synced" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_edge_buffers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_edge_buffers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "eiesdp_edge_buffers_gateway_id_fkey" FOREIGN KEY ("gateway_id") REFERENCES "eiesdp_edge_gateways"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "eiesdp_edge_buffers_organization_id_synced_created_at_idx" ON "eiesdp_edge_buffers"("organization_id", "synced", "created_at");

CREATE TABLE "eiesdp_firmware_releases" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "release_key" VARCHAR(100) NOT NULL,
  "device_type" "EiesdpDeviceType" NOT NULL,
  "version" VARCHAR(50) NOT NULL,
  "checksum" VARCHAR(128) NOT NULL,
  "download_url" VARCHAR(500),
  "release_notes" TEXT,
  "status" "EiesdpFirmwareStatus" NOT NULL DEFAULT 'available',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_firmware_releases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_firmware_releases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "eiesdp_firmware_releases_organization_id_release_key_key" ON "eiesdp_firmware_releases"("organization_id", "release_key");

CREATE TABLE "eiesdp_firmware_deployments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "release_id" UUID NOT NULL,
  "device_id" UUID NOT NULL,
  "status" "EiesdpFirmwareStatus" NOT NULL DEFAULT 'deploying',
  "scheduled_at" TIMESTAMPTZ,
  "deployed_at" TIMESTAMPTZ,
  "error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_firmware_deployments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_firmware_deployments_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "eiesdp_firmware_releases"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "eiesdp_firmware_deployments_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "eiesdp_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "eiesdp_firmware_deployments_device_id_created_at_idx" ON "eiesdp_firmware_deployments"("device_id", "created_at");

CREATE TABLE "eiesdp_device_drivers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "driver_key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "device_type" "EiesdpDeviceType" NOT NULL,
  "protocol" "EiesdpProtocol" NOT NULL,
  "config_schema" JSONB NOT NULL DEFAULT '{}',
  "handler_ref" VARCHAR(120) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_device_drivers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "eiesdp_device_drivers_driver_key_key" ON "eiesdp_device_drivers"("driver_key");

CREATE TABLE "eiesdp_alerts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "device_id" UUID,
  "device_key" VARCHAR(120),
  "alert_key" VARCHAR(100) NOT NULL,
  "severity" "EiesdpAlertSeverity" NOT NULL DEFAULT 'warning',
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "is_acknowledged" BOOLEAN NOT NULL DEFAULT false,
  "acknowledged_at" TIMESTAMPTZ,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_alerts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "eiesdp_alerts_organization_id_is_acknowledged_created_at_idx" ON "eiesdp_alerts"("organization_id", "is_acknowledged", "created_at");

CREATE TABLE "eiesdp_device_audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "device_key" VARCHAR(120) NOT NULL,
  "action" VARCHAR(80) NOT NULL,
  "details" JSONB NOT NULL DEFAULT '{}',
  "user_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "eiesdp_device_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "eiesdp_device_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "eiesdp_device_audit_logs_organization_id_created_at_idx" ON "eiesdp_device_audit_logs"("organization_id", "created_at");
