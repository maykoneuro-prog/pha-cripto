/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma: number | null;
  ema: number | null;
  rsi: number | null;
  macd: {
    macdLine: number | null;
    signalLine: number | null;
    histogram: number | null;
  };
}

export type SignalType = 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';

export interface SignalEvaluator {
  type: SignalType;
  reasons: string[];
  indicatorValues: {
    rsi: number | null;
    price: number;
    sma: number | null;
    ema: number | null;
    macdHist: number | null;
  };
}

export interface AlertSettings {
  symbol: string;
  rsiOversold: number;
  rsiOverbought: number;
  useSmaFilter: boolean;
  useMacdFilter: boolean;
  pushActive: boolean;
  sensitivity: 'low' | 'normal' | 'high';
}

export interface Trade {
  id: string;
  type: 'COMPRA' | 'VENDA';
  price: number;
  time: number;
  amount: number;
  totalUsdt: number;
  balanceUsdt: number;
  profitPercent?: number;
}

export interface LogMessage {
  id: string;
  time: number;
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'kotlin';
}

export interface HistoricalAlert {
  id: string;
  symbol: string;
  type: 'COMPRA' | 'VENDA';
  price: number;
  time: number;
  indicators: string;
  reason: string;
}
