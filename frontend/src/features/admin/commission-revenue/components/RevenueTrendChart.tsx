import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  TrendPoint,
  RevenueForecast,
  TrendRange,
} from '../services/commission.service';
import { RangeToggle } from './RangeToggle';

interface RevenueTrendChartProps {
  trendPoints: TrendPoint[];
  forecast: RevenueForecast | undefined;
  range: TrendRange;
  onRangeChange: (range: TrendRange) => void;
}

const toNum = (v: string | undefined) => parseFloat(v ?? '0') || 0;

function compactMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(v >= 10_000 ? 0 : 1)}k`;
  return `$${v.toFixed(0)}`;
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(max)));
  return Math.ceil(max / exp) * exp;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function shortDate(date: string): string {
  if (date.length === 7 && /^\d{4}-\d{2}$/.test(date)) {
    const [year, month] = date.split('-');
    return `${MONTHS[parseInt(month, 10) - 1]} ${year}`;
  }
  if (date.length >= 10 && /^\d{4}-\d{2}-\d{2}$/.test(date.slice(0, 10))) {
    return date.slice(5, 10);
  }
  return date;
}

const seriesColor = {
  revenue: '#3b82f6',
  commission: '#8b5cf6',
  adFee: '#f59e0b',
  forecast: '#94a3b8',
} as const;

// [H] Revenue trend chart 窶・inline SVG (no chart dependency).
export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({
  trendPoints,
  forecast,
  range,
  onRangeChange,
}) => {
  const W = 600;
  const H = 300;
  const pad = { top: 14, right: 14, bottom: 52, left: 46 };
  const pw = W - pad.left - pad.right;
  const ph = H - pad.top - pad.bottom;

  const forecastPoints = forecast?.forecastPoints ?? [];
  const forecastNote = forecast?.note;

  const allValues = [
        ...trendPoints.map((p) => toNum(p.revenue)),
    ...trendPoints.map((p) => toNum(p.commission)),
    ...trendPoints.map((p) => toNum(p.adFee)),
    ...forecastPoints.map((p) => toNum(p.forecastRevenue)),
  ];
  const max = niceMax(Math.max(...allValues, 0));
  const y = (v: number) => pad.top + ph - (ph * v) / max;
  const totalCount = Math.max(trendPoints.length + forecastPoints.length, 1);
  const x = (i: number) => pad.left + (pw * i) / Math.max(totalCount - 1,1);

  const polyPts = (points: { x: number; y: number }[]) =>
    points.map((p) => `${p.x},${p.y}`).join(' ');


  const linePoints = (get: (p: TrendPoint) => string) =>
    trendPoints.map((p, i) => ({ x: x(i), y: y(toNum(get(p))) }));

  const forecastPointsXY = forecastPoints.map((p, i) => {
    const idx = trendPoints.length + i;
    const val = toNum(p.forecastRevenue);
    return { x: x(idx), y: y(val) };
  });
  const lastTrendPoint =
    trendPoints.length > 0 ? trendPoints[trendPoints.length - 1] : undefined;

  const renderSeries = (
    label: string,
    points: { x: number; y: number }[],
    color: string,
    dashed = false,
    width?: number,
  ) => (
    <g key={label}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={width ?? (dashed ? 1.5 : 2)}
        strokeDasharray={dashed ? '6 4' : '0'}
        points={polyPts(points)}
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={dashed ? 2 : 3} fill={color} />
      ))}
    </g>
  );

  const gridCount = 4;
type TickLabel = { index: number; label: string };
  const tickLabels: TickLabel[] = [];
  const totalPoints = trendPoints.length + forecastPoints.length;
  const maxLabels = Math.max(2, Math.floor(pw / 60)); // ~60px between labels
  const skip = Math.max(1, Math.ceil(trendPoints.length / maxLabels));

  if (trendPoints.length > 0) {
    for (let i = 0; i < trendPoints.length; i += skip) {
      tickLabels.push({ index: i, label: shortDate(trendPoints[i].date) });
    }
    // Always include last trend point
    const lastIdx = trendPoints.length - 1;
    if (tickLabels[tickLabels.length - 1]?.index !== lastIdx) {
      tickLabels.push({ index: lastIdx, label: shortDate(trendPoints[lastIdx].date) });
    }
  }
  if (forecastPoints.length > 0) {
    tickLabels.push({ index: trendPoints.length, label: shortDate(forecastPoints[0].date) });
  }

  const rotateLabels = totalPoints > 15;
    const isEmpty = trendPoints.length === 0 && forecastPoints.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
          <RangeToggle value={range} onChange={onRangeChange} />
        </div>
        <CardDescription className="text-xs">
          Revenue, Commission, and Ad Fee over the selected range.
          {forecastPoints.length > 0 && ' The AI forecast is shown as a dotted line.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                    <LegendItem series="Revenue" color={seriesColor.revenue} dot />
          <LegendItem series="Commission" color={seriesColor.commission} dot />
          <LegendItem series="Ad Fee" color={seriesColor.adFee} dot />
          {forecastPoints.length > 0 && (
            <LegendItem series="AI Forecast" color={seriesColor.forecast} dashed />
          )}
        </div>

        {isEmpty ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No trend data available.
          </p>
        ) : (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
            {Array.from({ length: gridCount + 1 }).map((_, i) => {
              const frac = i / gridCount;
              const vx = max * frac;
              const gy = y(vx);
              return (
                <g key={`grid-${i}`}>
                  <line
                    x1={pad.left}
                    y1={gy}
                    x2={pad.left + pw}
                    y2={gy}
                    stroke="currentColor"
                    strokeWidth={0.75}
                    strokeOpacity={0.5}
                  />
                  <text x={pad.left - 6} y={gy + 3} textAnchor="end" fontSize={9} fill="currentColor" opacity={0.6}>
                    {compactMoney(vx)}
                  </text>
                </g>
              );
            })}
            <line x1={pad.left} y1={ph + pad.top} x2={pad.left + pw} y2={ph + pad.top} stroke="currentColor" strokeWidth={0.75} strokeOpacity={0.4} />
                        {renderSeries('Revenue', linePoints((p) => p.revenue), seriesColor.revenue)}
            {renderSeries('Commission', linePoints((p) => p.commission), seriesColor.commission)}
            {renderSeries('Ad Fee', linePoints((p) => p.adFee), seriesColor.adFee)}
            {forecastPoints.length > 0 && lastTrendPoint && (
              <line
                x1={x(trendPoints.length - 1)}
                y1={y(toNum(lastTrendPoint.revenue))}
                x2={forecastPointsXY[0]?.x ?? x(trendPoints.length)}
                y2={forecastPointsXY[0]?.y ?? y(toNum(lastTrendPoint.revenue))}
                stroke={seriesColor.forecast}
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
            )}
            {forecastPoints.length > 0 && renderSeries('AI Forecast', forecastPointsXY, seriesColor.forecast, true)}
            {tickLabels.map((t) => (
              <text
                key={t.index}
                x={x(t.index)}
                y={H - 34}
                textAnchor={rotateLabels ? 'end' : 'middle'}
                fontSize={9}
                fill="currentColor"
                opacity={0.6}
                transform={rotateLabels ? `rotate(-35, ${x(t.index)}, ${H - 34})` : undefined}
              >
                {t.label}
              </text>
            ))}
            {forecastNote && (
              <text x={pad.left} y={H - 8} fontSize={10} fill="currentColor" opacity={0.55}>
                {forecastNote}
              </text>
            )}
          </svg>
        )}
      </CardContent>
    </Card>
  );
};

function LegendItem({
  series,
  color,
  dashed,
}: {
  series: string;
  color: string;
  dot?: boolean;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block h-2 w-4 rounded"
        style={{
          backgroundColor: color,
          backgroundImage: dashed
            ? 'repeating-linear-gradient(90deg, currentColor 0, currentColor 6px, transparent 6px, transparent 10px)'
            : undefined,
        }}
      />
      <span style={{ color }}>{series}</span>
    </span>
  );
}
