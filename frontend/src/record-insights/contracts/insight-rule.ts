import type { UreRecordExplorerResponse } from '../../record-explorer/types';
import type { Insight } from './insight';

export interface InsightRule {
  id: string;
  evaluate(record: UreRecordExplorerResponse): Insight[];
}
