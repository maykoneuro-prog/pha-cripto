/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Candle } from '../types';

interface ChartProps {
  candles: Candle[];
  smas: (number | null)[];
  emas: (number | null)[];
  rsis: (number | null)[];
  symbol: string;
}

export default function CandlestickChart({ candles, smas, emas, rsis, symbol }: ChartProps) {
  if (candles.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-500 font-mono">
        Aguardando dados de telemetria da Binance...
      </div>
    );
  }

  // Subset of latest 25 candles for readability on mobile screen simulator
  const maxCandles = 24;
  const recentCandles = candles.slice(-maxCandles);
  const recentSmas = smas.slice(-maxCandles);
  const recentEmas = emas.slice(-maxCandles);
  const recentRsis = rsis.slice(-maxCandles);

  // Calculate Price domain bounds
  let highPrice = Math.max(...recentCandles.map((c) => c.high));
  let lowPrice = Math.min(...recentCandles.map((c) => c.low));

  // Factor in SMAs and EMAs inside the price bounds if they exist
  recentSmas.forEach((val) => {
    if (val !== null) {
      if (val > highPrice) highPrice = val;
      if (val < lowPrice) lowPrice = val;
    }
  });
  recentEmas.forEach((val) => {
    if (val !== null) {
      if (val > highPrice) highPrice = val;
      if (val < lowPrice) lowPrice = val;
    }
  });

  const priceRange = highPrice - lowPrice;
  const pad = priceRange * 0.08 || 1;
  const yMin = lowPrice - pad;
  const yMax = highPrice + pad;

  const width = 320;
  const priceChartHeight = 110;
  const indicatorChartHeight = 40;
  const gap = 12;

  // Helper coordinate getters
  const getX = (index: number) => {
    const spacing = width / maxCandles;
    return index * spacing + spacing / 2;
  };

  const getY = (price: number) => {
    return priceChartHeight - ((price - yMin) / (yMax - yMin)) * priceChartHeight;
  };

  const getRsiY = (rsi: number) => {
    const minRsi = 0;
    const maxRsi = 100;
    return indicatorChartHeight - ((rsi - minRsi) / (maxRsi - minRsi)) * indicatorChartHeight;
  };

  // Generate paths for indicator lines
  const smaPoints: string[] = [];
  const emaPoints: string[] = [];
  const rsiPoints: string[] = [];

  recentSmas.forEach((val, idx) => {
    if (val !== null) {
      smaPoints.push(`${getX(idx)},${getY(val)}`);
    }
  });

  recentEmas.forEach((val, idx) => {
    if (val !== null) {
      emaPoints.push(`${getX(idx)},${getY(val)}`);
    }
  });

  recentRsis.forEach((val, idx) => {
    if (val !== null) {
      rsiPoints.push(`${getX(idx)},${getRsiY(val)}`);
    }
  });

  return (
    <div className="flex flex-col space-y-2 bg-[#111] p-3 rounded-none border border-[#1a1a1a]">
      {/* Header Info */}
      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono uppercase tracking-wider font-bold">
        <span className="text-white font-black">{symbol} - 1h</span>
        <div className="flex space-x-2.5">
          <span className="text-sky-400">SMA(20)</span>
          <span className="text-amber-500">EMA(20)</span>
          <span className="text-[#00ff66]">RSI(14)</span>
        </div>
      </div>

      {/* Main Candlestick and Moving Average SVG */}
      <div className="relative">
        <svg width="100%" height={priceChartHeight} viewBox={`0 0 ${width} ${priceChartHeight}`} className="overflow-visible">
          {/* Horizontal grid lines */}
          <line x1="0" y1={getY((yMax + yMin) / 2)} x2={width} y2={getY((yMax + yMin) / 2)} stroke="#1f2937" strokeDasharray="2,2" />
          <line x1="0" y1={getY(yMax)} x2={width} y2={getY(yMax)} stroke="#111827" strokeDasharray="2,2" />
          <line x1="0" y1={getY(yMin)} x2={width} y2={getY(yMin)} stroke="#111827" strokeDasharray="2,2" />

          {/* Candle drawings */}
          {recentCandles.map((candle, idx) => {
            const cx = getX(idx);
            const cyHigh = getY(candle.high);
            const cyLow = getY(candle.low);
            const cyOpen = getY(candle.open);
            const cyClose = getY(candle.close);

            const isGreen = candle.close >= candle.open;
            const strokeColor = isGreen ? '#22c55e' : '#ef4444';
            const fillColor = isGreen ? '#22c55e' : '#ef4444';

            const candleW = width / maxCandles - 3;

            return (
              <g key={`c-${idx}`}>
                {/* Wick shadow line */}
                <line x1={cx} y1={cyHigh} x2={cx} y2={cyLow} stroke={strokeColor} strokeWidth={1} />
                {/* Body rectangular piece */}
                <rect
                  x={cx - candleW / 2}
                  y={Math.min(cyOpen, cyClose)}
                  width={candleW}
                  height={Math.max(Math.abs(cyOpen - cyClose), 1.5)}
                  fill={fillColor}
                  rx={1}
                />
              </g>
            );
          })}

          {/* SMA line series */}
          {smaPoints.length > 1 && (
            <path d={`M ${smaPoints.join(' L ')}`} fill="none" stroke="#38bdf8" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* EMA line series */}
          {emaPoints.length > 1 && (
            <path d={`M ${emaPoints.join(' L ')}`} fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>

        {/* Labels overlay */}
        <div className="absolute right-1 top-0 text-[8px] text-gray-500 font-mono">
          Max: ${highPrice >= 1 ? highPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }) : highPrice.toFixed(6)}
        </div>
        <div className="absolute right-1 bottom-0 text-[8px] text-gray-500 font-mono">
          Min: ${lowPrice >= 1 ? lowPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }) : lowPrice.toFixed(6)}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#1a1a1a] border-dashed my-2" />

      {/* Real-time Secondary RSI Panel */}
      <div className="relative">
        <svg width="100%" height={indicatorChartHeight} viewBox={`0 0 ${width} ${indicatorChartHeight}`} className="overflow-visible">
          {/* Overbought line at 70 */}
          <line x1="0" y1={getRsiY(70)} x2={width} y2={getRsiY(70)} stroke="#ef4444" strokeWidth={1} strokeOpacity={0.6} strokeDasharray="3,3" />
          {/* Oversold line at 30 */}
          <line x1="0" y1={getRsiY(30)} x2={width} y2={getRsiY(30)} stroke="#00ff66" strokeWidth={1} strokeOpacity={0.6} strokeDasharray="3,3" />
          {/* Middle line at 50 */}
          <line x1="0" y1={getRsiY(50)} x2={width} y2={getRsiY(50)} stroke="#374151" strokeWidth={0.5} strokeDasharray="2,2" />

          {/* RSI Wave Line */}
          {rsiPoints.length > 1 && (
            <path d={`M ${rsiPoints.join(' L ')}`} fill="none" stroke="#00ff66" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
        <div className="absolute left-1 top-0 text-[7px] text-red-500 font-mono">SOBRECOMPRA (70)</div>
        <div className="absolute left-1 bottom-0 text-[7px] text-[#00ff66] font-mono">SOBREVENDA (30)</div>
        <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-[#00ff66] font-mono font-bold">
          RSI: {recentRsis[recentRsis.length - 1] ?? 'N/A'}
        </div>
      </div>
    </div>
  );
}
