/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  TrendingUp, 
  Smartphone, 
  Terminal, 
  AlertCircle, 
  ShieldCheck, 
  HelpCircle,
  Code
} from 'lucide-react';
import { Candle, AlertSettings, SignalEvaluator, LogMessage, HistoricalAlert } from './types';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, evaluateIndicators } from './utils/indicators';
import AndroidSimulator from './components/AndroidSimulator';
import AndroidDevConsole from './components/AndroidDevConsole';

export default function App() {
  // 1. App Common States
  const [symbol, setSymbol] = useState<string>('PHAUSDT');
  const [candles, setCandles] = useState<Candle[]>([]);
  
  // Math indicator results
  const [smas, setSmas] = useState<(number | null)[]>([]);
  const [emas, setEmas] = useState<(number | null)[]>([]);
  const [rsis, setRsis] = useState<(number | null)[]>([]);
  const [macd, setMacd] = useState<{
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
  }>({ macdLine: [], signalLine: [], histogram: [] });

  const [price, setPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [currentSignal, setCurrentSignal] = useState<SignalEvaluator | null>(null);

  // Settings
  const [settings, setSettings] = useState<AlertSettings>({
    symbol: 'PHAUSDT',
    rsiOversold: 30,
    rsiOverbought: 70,
    useSmaFilter: true,
    useMacdFilter: true,
    pushActive: true,
    sensitivity: 'normal'
  });

  // Historical alerts list
  const [historicalAlerts, setHistoricalAlerts] = useState<HistoricalAlert[]>([]);

  // Logcat Logger queues
  const [logs, setLogs] = useState<LogMessage[]>([]);

  // Logger ref helper
  const logKotlinEvent = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const newLog: LogMessage = {
      id: Math.random().toString(36).substring(4),
      time: Date.now(),
      text,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 80)); // maintain max 80 lines
  };

  // 2. Local seed sequence mimic on layout boot
  useEffect(() => {
    logKotlinEvent('Gradle: Inicializando build daemon do Android Gradle Wrapper...', 'info');
    setTimeout(() => {
      logKotlinEvent('Gradle: Compilação APK gerada com sucesso :app [debug].', 'success');
      logKotlinEvent('Android Emulator: Inicializando Pixel virtualizado na API 34...', 'info');
    }, 1200);

    setTimeout(() => {
      logKotlinEvent('Kotlin VM: Injetando RetrofitClient de Binance API.', 'info');
      logKotlinEvent('com.crypto.alert: Canal de notificações [crypto_trading_alerts] criado via NotificationManager nativo.', 'success');
      logKotlinEvent('com.crypto.alert: Ativando monitoramento reativo do par BTCUSDT com coroutine Job ativa.', 'info');
    }, 2800);
  }, []);

  // Update chosen symbol in settings trigger
  useEffect(() => {
    setSymbol(settings.symbol);
    logKotlinEvent(`ViewModel mudou símbolo alvo de análise para: ${settings.symbol}`, 'info');
  }, [settings.symbol]);

  // Synthetic PHA Coin Simulator engine reference
  const phaPriceRef = useRef<number>(0.2245);
  const phaHistoryRef = useRef<Candle[]>([]);

  // Initial Seed for PHA simulated history
  const seedPhaHistory = () => {
    const historicalLength = 100;
    const items: Candle[] = [];
    let curPrice = 0.2245;
    let baseTime = Date.now() - (historicalLength * 60 * 1000); // ticks every min for simulation

    for (let i = 0; i < historicalLength; i++) {
      const open = curPrice;
      const change = (Math.random() - 0.495) * 0.003; // neutral to tiny uptrend bias
      const close = curPrice + change;
      const high = Math.max(open, close) + Math.random() * 0.001;
      const low = Math.min(open, close) - Math.random() * 0.001;
      const volume = Math.floor(10000 + Math.random() * 80000);

      items.push({
        time: baseTime + (i * 60 * 1000),
        open: Number(open.toFixed(6)),
        high: Number(high.toFixed(6)),
        low: Number(low.toFixed(6)),
        close: Number(close.toFixed(6)),
        volume
      });
      curPrice = close;
    }
    phaPriceRef.current = curPrice;
    phaHistoryRef.current = items;
    return items;
  };

  // Main Polling effect - runs every 10 seconds to collect telemetry
  useEffect(() => {
    let active = true;
    let intervalId: any;

    const queryData = async () => {
      if (symbol === 'PHAUSDT') {
        // Run synthetic simulation frame for PHA
        if (phaHistoryRef.current.length === 0) {
          seedPhaHistory();
        }

        // tick slightly up or down to update current live candles
        const lastIndex = phaHistoryRef.current.length - 1;
        const lastCandle = { ...phaHistoryRef.current[lastIndex] };
        
        const tick = (Math.random() - 0.5) * 0.0015;
        const lastClose = lastCandle.close;
        const newClose = Number((lastClose + tick).toFixed(6));
        
        lastCandle.close = newClose;
        if (newClose > lastCandle.high) lastCandle.high = newClose;
        if (newClose < lastCandle.low) lastCandle.low = newClose;
        
        phaHistoryRef.current[lastIndex] = lastCandle;

        // Occasionally push a newly formed simulated candle (every 10 seconds for speed)
        if (Math.random() > 0.6) {
          const nextPrice = newClose;
          const nextCandle: Candle = {
            time: Date.now(),
            open: nextPrice,
            high: nextPrice + Math.random() * 0.001,
            low: nextPrice - Math.random() * 0.001,
            close: nextPrice + (Math.random() - 0.5) * 0.0012,
            volume: Math.floor(12000 + Math.random() * 95000)
          };
          phaHistoryRef.current.push(nextCandle);
          phaHistoryRef.current = phaHistoryRef.current.slice(-100); // keep max 100 bounds
          phaPriceRef.current = nextCandle.close;
        }

        if (!active) return;
        
        const cl = [...phaHistoryRef.current];
        const prices = cl.map(c => c.close);
        const currentP = prices[prices.length - 1];
        
        // Mock a simple price change ticker ratio
        const firstPrice = phaHistoryRef.current[0].close;
        const chg = ((currentP - firstPrice) / firstPrice) * 100;

        setCandles(cl);
        setPrice(currentP);
        setPriceChange(chg);
        
        // Calculate indicators
        const smaResults = calculateSMA(prices, 20);
        const emaResults = calculateEMA(prices, 20);
        const rsiResults = calculateRSI(prices, 14);
        const macdResults = calculateMACD(prices);

        setSmas(smaResults);
        setEmas(emaResults);
        setRsis(rsiResults);
        setMacd(macdResults);

        // Evaluate Signal
        const signalResult = evaluateIndicators(
          prices,
          smaResults,
          emaResults,
          rsiResults,
          macdResults.macdLine,
          macdResults.signalLine,
          macdResults.histogram,
          settings.rsiOversold,
          settings.rsiOverbought,
          settings.useSmaFilter,
          settings.useMacdFilter
        );

        setCurrentSignal(signalResult);
        logKotlinEvent(`[Simulação MOCK PHA] Dados de rascunho de velas simulados. Preço Atual: $${currentP.toFixed(5)} USDT. RSI: ${rsiResults[rsiResults.length-1]?.toFixed(2) ?? 'N/A'}. Sinal: ${signalResult.type}`, 'info');

      } else {
        // Query live Binance historical data using full-stack API proxy gateway
        try {
          const proxyUrl = `/api/binance/klines?symbol=${symbol}&interval=1h&limit=100`;
          
          const res = await fetch(proxyUrl);
          if (!res.ok) {
            throw new Error(`Servidor proxy Binance retornou erro http: ${res.status}`);
          }
          const rawData = await res.json();
          
          if (!active) return;

          // Format array: each array is [openTime, open, high, low, close, volume, ...]
          const parsedCandles: Candle[] = rawData.map((item: any) => ({
            time: Number(item[0]),
            open: Number(item[1]),
            high: Number(item[2]),
            low: Number(item[3]),
            close: Number(item[4]),
            volume: Number(item[5])
          }));

          const prices = parsedCandles.map(c => c.close);
          const currentP = prices[prices.length - 1];

          // 24h calculation
          const firstPrice = parsedCandles[0].close;
          const chg = ((currentP - firstPrice) / firstPrice) * 100;

          setCandles(parsedCandles);
          setPrice(currentP);
          setPriceChange(chg);

          // Calculate indicators mathematically
          const smaResults = calculateSMA(prices, 20);
          const emaResults = calculateEMA(prices, 20);
          const rsiResults = calculateRSI(prices, 14);
          const macdResults = calculateMACD(prices);

          setSmas(smaResults);
          setEmas(emaResults);
          setRsis(rsiResults);
          setMacd(macdResults);

          // Evaluate indicators triggers
          const signalResult = evaluateIndicators(
            prices,
            smaResults,
            emaResults,
            rsiResults,
            macdResults.macdLine,
            macdResults.signalLine,
            macdResults.histogram,
            settings.rsiOversold,
            settings.rsiOverbought,
            settings.useSmaFilter,
            settings.useMacdFilter
          );

          setCurrentSignal(signalResult);
          logKotlinEvent(`[Retrofit Coroutine] Sucesso ao ler Binance API (${symbol}). Preço: $${currentP.toLocaleString('en-US')} | RSI: ${rsiResults[rsiResults.length-1]?.toFixed(2) ?? 'Calculando'} | MACD: ${macdResults.histogram[macdResults.histogram.length - 1]?.toFixed(6) ?? 'Calculando'}.`, 'info');

        } catch (error: any) {
          console.error(error);
          logKotlinEvent(`[Retrofit Error]: Falha ao buscar dados da Binance para ${symbol}: ${error.message}`, 'error');
        }
      }
    };

    queryData();
    // Run loop every 10 seconds
    intervalId = setInterval(queryData, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [symbol, settings.rsiOversold, settings.rsiOverbought, settings.useSmaFilter, settings.useMacdFilter]);

  const clearLogs = () => {
    setLogs([]);
    logKotlinEvent('Console do Logcat reinicializado.', 'info');
  };

  const addHistoricalAlert = (alert: HistoricalAlert) => {
    setHistoricalAlerts(prev => [alert, ...prev].slice(0, 40));
  };

  return (
    <main id="app-root" className="min-h-screen bg-[#050505] text-white flex flex-col font-sans select-none antialiased border-4 border-[#1a1a1a]">
      {/* Bold Typography Header */}
      <header id="main-header" className="p-8 pb-6 flex flex-col md:flex-row justify-between items-end border-b border-[#1a1a1a] gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.2em] text-[#666] font-semibold mb-2">Android Engine VM Monitor</div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none font-display">
            {symbol.slice(0, -4)}<span className="text-[#00ff66]">/</span>{symbol.slice(-4)}
          </h1>
        </div>
        <div className="text-left md:text-right w-full md:w-auto">
          <div className="text-[12px] uppercase tracking-[0.2em] text-[#666] font-semibold mb-2">Current Spot Price</div>
          <div className="text-4xl md:text-6xl font-black tracking-tighter leading-none tabular-nums font-display">
            {price >= 1 ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price.toFixed(6)}
            <span className={`text-xl font-bold ml-2 align-top ${priceChange >= 0 ? 'text-[#00ff66]' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>
      </header>

      {/* Main Double Splitted Container Dashboard */}
      <div id="main-content-grid" className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Simulated Android Phone (4 columns grid) */}
        <div id="phone-column" className="md:col-span-5 lg:col-span-4 flex flex-col items-center">
          <button className="hidden">Settings</button>
          <div className="sticky top-6">
            <AndroidSimulator
              candles={candles}
              smas={smas}
              emas={emas}
              rsis={rsis}
              macd={macd}
              symbol={symbol}
              price={price}
              priceChange={priceChange}
              currentSignal={currentSignal}
              settings={settings}
              updateSettings={setSettings}
              historicalAlerts={historicalAlerts}
              addHistoricalAlert={addHistoricalAlert}
              logKotlinEvent={logKotlinEvent}
            />
          </div>
        </div>

        {/* Right column: Developer Studio (7 / 8 columns grid) */}
        <div id="developer-column" className="md:col-span-7 lg:col-span-8 flex flex-col space-y-6 h-full">
          
          <div className="bg-[#111111] border-l-4 border-[#00ff66] p-6 shadow-none font-sans">
            <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-[#1a1a1a]">
              <Code className="w-5 h-5 text-[#00ff66]" />
              <h2 className="text-xs uppercase font-bold tracking-[0.1em] text-white">Visão Geral da Arquitetura Android Nativa</h2>
            </div>
            
            <p className="text-[11.5px] text-gray-400 leading-relaxed mb-4">
              Para reproduzir este comportamento nativamente no Android os passos de arquitetura seguem o padrão recomendado pelo Google, unindo a infraestrutura do <strong>FCM (Firebase Cloud Messaging)</strong> e a precisão do ciclo de vida usando <strong>MVVM</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-[11px] font-sans">
              <div className="p-4 bg-[#050505] border border-[#1a1a1a] flex items-start space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-[#00ff66] shrink-0" />
                <div>
                  <strong className="text-white block uppercase tracking-wide font-bold">Kotlin Coroutines</strong>
                  <span className="text-gray-400 mt-1 block leading-normal">
                    Evita travar a Thread Principal ao realizar pesquisas de klines em background.
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#050505] border border-[#1a1a1a] flex items-start space-x-2.5">
                <TrendingUp className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <strong className="text-white block uppercase tracking-wide font-bold">Arquitetura MVVM</strong>
                  <span className="text-gray-400 mt-1 block leading-normal">
                    ViewModel desacoplado consumindo via Retrofit, alimentando a interface Jetpack Compose via StateFlow.
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#050505] border border-[#1a1a1a] flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <strong className="text-white block uppercase tracking-wide font-bold">Alertas Push</strong>
                  <span className="text-gray-400 mt-1 block leading-normal">
                    Uso do NotificationManager nativo para acionar alarmes acoplado a um Job de polling recorrente.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <AndroidDevConsole
            logs={logs}
            clearLogs={clearLogs}
            activeSymbol={symbol}
          />

        </div>

      </div>

      {/* Styled Footer */}
      <footer id="app-footer" className="h-12 border-t border-[#1a1a1a] flex items-center px-8 justify-between text-[10px] uppercase tracking-widest font-bold text-[#444] font-display bg-[#050505]">
        <div>API STATUS: CONNECTED • BINANCE CLOUD</div>
        <div className="flex gap-6">
          <span>LATENCY: 14MS</span>
          <span>UPTIME: 99.98%</span>
          <span>V1.0.4-STABLE</span>
        </div>
      </footer>
    </main>
  );
}

