/**
 * Console domain types.
 *
 * Panels are declarative: a section is a list of panel definitions, each with a
 * default grid width (1..12) and pixel height that the workspace layout engine
 * packs into a tidy default, after which the operator may drag/resize freely.
 */

export type Tone =
  | 'allow' | 'ok' | 'nominal' | 'verified' | 'executed' | 'online'
  | 'review' | 'pending' | 'degraded' | 'awaiting' | 'idle'
  | 'deny' | 'blocked' | 'critical' | 'failed'
  | 'cyan' | 'executing' | 'authorised' | 'live' | 'stepup';

export type Cell =
  | { t: 'text'; v: string }
  | { t: 'mut'; v: string }
  | { t: 'num'; v: string }
  | { t: 'chip'; tone: Tone; v: string }
  | { t: 'quota'; pct: number; warn?: boolean };

export interface RowsBody {
  kind: 'rows';
  cols: string;
  rows: Cell[][];
}

export interface QuotaRow { label: string; pct: number; value: string; warn?: boolean }
export interface QuotasBody {
  kind: 'quotas';
  rows: QuotaRow[];
}

export type KpiFormat = 'money' | 'int' | 'pct2';
export interface KpiTile {
  id: string;
  label: string;
  value: number;
  unit?: string;
  accent?: boolean;
  fmt: KpiFormat;
  deltaDir: 'up' | 'down';
  deltaLabel: string;
}
export interface KpisBody {
  kind: 'kpis';
  tiles: KpiTile[];
}

export interface GaugeBody {
  kind: 'gauge';
  value: number;
  label: string;
  sub: string;
}

export interface StreamLine { ts: string; actor: string; text: string; tone: Tone; code: string }
export interface StreamBody {
  kind: 'stream';
  cols: string;
  seed: StreamLine[];
  live?: boolean;
}

export interface ThreeBody { kind: 'three' }

export type PanelBody =
  | RowsBody
  | QuotasBody
  | KpisBody
  | GaugeBody
  | StreamBody
  | ThreeBody;

export interface PanelDef {
  id: string;
  title: string;
  meta?: string;
  /** default column span, 1..12 */
  w: number;
  /** default pixel height */
  h: number;
  body: PanelBody;
}

export interface SectionDef {
  key: string;
  title: string;
  panels: PanelDef[];
}

export interface Rect { x: number; y: number; w: number; h: number }
export type Layout = Record<string, Rect>;
