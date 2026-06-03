/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Calculates Simple Moving Average (SMA) for an array of prices.
 */
export function calculateSMA(prices: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      sma.push(Number((sum / period).toFixed(8)));
    }
  }
  return sma;
}

/**
 * Calculates Exponential Moving Average (EMA) for an array of prices.
 */
export function calculateEMA(prices: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = [];
  if (prices.length === 0) return [];

  const k = 2 / (period + 1);
  
  // Calculate SMA for first valid entry to initialize EMA
  let preSma = 0;
  for (let idx = 0; idx < period && idx < prices.length; idx++) {
    preSma += prices[idx];
  }
  const initialEmaValue = preSma / Math.min(period, prices.length);

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      // Warmup phase
      ema.push(null);
    } else if (i === period - 1) {
      ema.push(Number(initialEmaValue.toFixed(8)));
    } else {
      const prevEma = ema[i - 1];
      if (prevEma === null) {
        ema.push(null);
      } else {
        const nextEma = prices[i] * k + prevEma * (1 - k);
        ema.push(Number(nextEma.toFixed(8)));
      }
    }
  }
  return ema;
}

/**
 * Calculates Relative Strength Index (RSI) for a series of prices.
 */
export function calculateRSI(prices: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = [];
  if (prices.length <= period) {
    return Array(prices.length).fill(null);
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  // To match the indexing of prices (which has size changes.length + 1)
  // prices[0] corresponds to rsi index 0 (which has no change, so it's null)
  rsi.push(null);

  let avgGain = 0;
  let avgLoss = 0;

  // Calculate first average gain/loss
  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Fill nulls for pre-period
  for (let i = 1; i < period; i++) {
    rsi.push(null);
  }

  // Calculate first RSI value corresponding to prices[period] (which uses changes from index 0 to period-1)
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let firstRsiValue = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  rsi.push(Number(firstRsiValue.toFixed(2)));

  // Calculate smoothing subsequent RSI values
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    // Wilder's smoothing technique
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsiValue = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
    rsi.push(Number(rsiValue.toFixed(2)));
  }

  return rsi;
}

/**
 * Calculates MACD (Moving Average Convergence Divergence)
 */
export interface MacdOutput {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MacdOutput {
  const len = prices.length;
  const macdLineArr: (number | null)[] = [];
  const signalLineArr: (number | null)[] = [];
  const histogramArr: (number | null)[] = [];

  const fastEma = calculateEMA(prices, fastPeriod);
  const slowEma = calculateEMA(prices, slowPeriod);

  // Calculate MACD Line = Fast EMA - Slow EMA
  for (let i = 0; i < len; i++) {
    const f = fastEma[i];
    const s = slowEma[i];
    if (f === null || s === null) {
      macdLineArr.push(null);
    } else {
      macdLineArr.push(Number((f - s).toFixed(8)));
    }
  }

  // Calculate Signal Line = EMA of MACD Line (over signalPeriod)
  // To use calculateEMA, we filter nulls or process properly.
  // Let's implement a secondary EMA specifically for the MACD line series:
  const firstValidIndex = slowPeriod - 1;
  const macdFromValid = macdLineArr.slice(firstValidIndex) as number[];
  const macdLineEma = calculateEMA(macdFromValid, signalPeriod);

  // Map back to the original array sizing with padded nulls
  for (let i = 0; i < len; i++) {
    if (i < firstValidIndex + signalPeriod - 1) {
      signalLineArr.push(null);
      histogramArr.push(null);
    } else {
      const macdVal = macdLineArr[i];
      // Index in macdLineEma is offset by firstValidIndex
      const sigVal = macdLineEma[i - firstValidIndex];
      signalLineArr.push(sigVal);

      if (macdVal !== null && sigVal !== null) {
        histogramArr.push(Number((macdVal - sigVal).toFixed(8)));
      } else {
        histogramArr.push(null);
      }
    }
  }

  return {
    macdLine: macdLineArr,
    signalLine: signalLineArr,
    histogram: histogramArr,
  };
}

/**
 * Evaluate buy/sell signals based on technical rules
 */
export function evaluateIndicators(
  prices: number[],
  smas: (number | null)[],
  emas: (number | null)[],
  rsis: (number | null)[],
  macdLines: (number | null)[],
  signalLines: (number | null)[],
  histograms: (number | null)[],
  rsiOversold: number = 30,
  rsiOverbought: number = 70,
  useSmaFilter: boolean = true,
  useMacdFilter: boolean = true
) {
  const lastIndex = prices.length - 1;
  const price = prices[lastIndex];

  const rsi = rsis[lastIndex];
  const sma = smas[lastIndex];
  const ema = emas[lastIndex];
  const macdHist = histograms[lastIndex];
  const macdLine = macdLines[lastIndex];
  const signalLine = signalLines[lastIndex];

  const reasons: string[] = [];
  let isBuy = false;
  let isSell = false;
  let isStrongBuy = false;
  let isStrongSell = false;

  // 1. RSI Checks
  if (rsi !== null) {
    if (rsi < rsiOversold) {
      isBuy = true;
      reasons.push(`RSI em região de sobrevenda (${rsi} < ${rsiOversold}) - indicação de reversão autista.`);
      if (rsi < rsiOversold - 5) {
        isStrongBuy = true;
      }
    } else if (rsi > rsiOverbought) {
      isSell = true;
      reasons.push(`RSI em região de sobrecompra (${rsi} > ${rsiOverbought}) - indicação de fadiga de preço.`);
      if (rsi > rsiOverbought + 5) {
        isStrongSell = true;
      }
    } else {
      reasons.push(`RSI neutro (${rsi}).`);
    }
  }

  // 2. Trend filters (SMA & EMA)
  if (sma !== null && ema !== null) {
    const distToSma = ((price - sma) / sma) * 100;
    if (price > sma) {
      reasons.push(`Preço acima da Média Móvel SMA-20 (${distToSma.toFixed(2)}% acima) - Tendência macro de alta.`);
      // If we are looking for a buy, verify price remains above averages (standard trend confirmation)
    } else {
      reasons.push(`Preço abaixo da Média Móvel SMA-20 (${Math.abs(distToSma).toFixed(2)}% abaixo) - Tendência macro de baixa.`);
    }

    if (ema !== null && prices[lastIndex - 1] !== undefined) {
      const prevEma = emas[lastIndex - 1];
      if (prevEma !== null) {
        if (ema > prevEma && price > ema) {
          reasons.push(`Média Curta EMA-20 inclinada para cima, com preço acima - Momento comprador ativo.`);
          if (rsi !== null && rsi < 45) {
            isBuy = true; // pullbacks near EMA in uptrend
            reasons.push(`Sinal de Pullback na média: Preço estável e RSI seguro.`);
          }
        }
      }
    }
  }

  // 3. MACD Filters
  if (macdHist !== null && macdLine !== null && signalLine !== null) {
    const prevHist = histograms[lastIndex - 1];
    
    if (macdHist > 0) {
      reasons.push(`MACD Histograma positivo (${macdHist.toFixed(6)}) - Momento comprador acelerando.`);
      if (prevHist !== null && prevHist < 0) {
        isBuy = true;
        reasons.push(`Cruzamento de Alta do MACD (Histograma cruzou acima de zero) - Sinal Técnico Confirmado.`);
      }
    } else {
      reasons.push(`MACD Histograma negativo (${macdHist.toFixed(6)}) - Momento vendedor dominando.`);
      if (prevHist !== null && prevHist > 0) {
        isSell = true;
        reasons.push(`Cruzamento de Baixa do MACD (Histograma cruzou abaixo de zero) - Sinal Técnico Confirmado.`);
      }
    }
  }

  // Combine Signals
  let type: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL' = 'HOLD';

  if (isStrongBuy && (!useSmaFilter || price >= (sma || 0))) {
    type = 'STRONG_BUY';
  } else if (isBuy) {
    // If we have a general EMA or RSI buy
    if (useSmaFilter && sma !== null && price < sma) {
      // Rejected due to SMA trend filter
      reasons.push(`Sinal de compra enfraquecido porque o preço está abaixo da Média SMA-20.`);
      type = 'HOLD';
    } else {
      type = 'BUY';
    }
  } else if (isStrongSell) {
    type = 'STRONG_SELL';
  } else if (isSell) {
    type = 'SELL';
  }

  return {
    type,
    reasons,
    indicatorValues: {
      rsi,
      price,
      sma,
      ema,
      macdHist,
    },
  };
}
