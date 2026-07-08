import { useMemo } from 'react';
import { WidgetShell } from '../../widget-platform/components/WidgetShell';
import {
  healthLevelAlertClass,
  recordHealthEngine,
} from '../engine/record-health.engine';
import { RECORD_HEALTH_LEVEL_LABELS } from '../contracts/record-health';
import type { UreRecordExplorerResponse } from '../../record-explorer/types';

interface RecordHealthWidgetProps {
  record: UreRecordExplorerResponse;
}

export function RecordHealthWidget({ record }: RecordHealthWidgetProps) {
  const health = useMemo(() => recordHealthEngine.evaluate(record), [record]);

  return (
    <WidgetShell title="Salud del registro" id="ure-record-health" className="ure-widget card">
      <div className="ure-kpi-row">
        <div className="kpi-card ure-kpi">
          <span className="ure-kpi-label">Porcentaje</span>
          <strong className="ure-kpi-value">{health.score}%</strong>
        </div>
        <div className="kpi-card ure-kpi">
          <span className="ure-kpi-label">Nivel</span>
          <strong className={`ure-kpi-value ${healthLevelAlertClass(health.level)}`}>
            {RECORD_HEALTH_LEVEL_LABELS[health.level]}
          </strong>
        </div>
        <div className="kpi-card ure-kpi">
          <span className="ure-kpi-label">Completadas</span>
          <strong className="ure-kpi-value">
            {health.completed}/{health.total}
          </strong>
        </div>
      </div>

      <ul className="ure-doc-list">
        {health.checks.map((check) => (
          <li key={check.id}>
            <span className={check.passed ? 'alert-success' : 'alert-warn'} aria-hidden="true">
              {check.passed ? '✓' : '!'}
            </span>
            <div>
              <strong>{check.title}</strong>
              <p className="ure-empty">{check.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </WidgetShell>
  );
}
