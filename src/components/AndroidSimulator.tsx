/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Settings2, 
  TrendingUp, 
  Bell, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  Clock, 
  ShieldCheck, 
  History, 
  BrainCircuit, 
  LineChart, 
  Cpu, 
  Play, 
  Square,
  RefreshCw,
  TrendingDown,
  Moon
} from 'lucide-react';
import { Candle, AlertSettings, SignalEvaluator, Trade, HistoricalAlert } from '../types';
import CandlestickChart from './CandlestickChart';

interface SimulatorProps {
  candles: Candle[];
  smas: (number | null)[];
  emas: (number | null)[];
  rsis: (number | null)[];
  macd: {
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
  };
  symbol: string;
  price: number;
  priceChange: number;
  currentSignal: SignalEvaluator | null;
  settings: AlertSettings;
  updateSettings: (s: AlertSettings) => void;
  historicalAlerts: HistoricalAlert[];
  addHistoricalAlert: (alert: HistoricalAlert) => void;
  logKotlinEvent: (text: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export interface UserDecision {
  id: string;
  time: number;
  symbol: string;
  signalType: 'BUY' | 'SELL';
  actionTaken: 'COMPREI' | 'VENDI';
  price: number;
  rsi: number | null;
  macd: number | null;
}

export default function AndroidSimulator({
  candles,
  smas,
  emas,
  rsis,
  macd,
  symbol,
  price,
  priceChange,
  currentSignal,
  settings,
  updateSettings,
  historicalAlerts,
  addHistoricalAlert,
  logKotlinEvent
}: SimulatorProps) {

  // Local persistent state for learning with user feedback data
  const [userDecisions, setUserDecisions] = useState<UserDecision[]>(() => {
    try {
      const saved = localStorage.getItem('user_trading_decisions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('user_trading_decisions', JSON.stringify(userDecisions));
    } catch (e) {
      console.error(e);
    }
  }, [userDecisions]);

  // Feedback Statistics
  const buyDecisions = userDecisions.filter(d => d.actionTaken === 'COMPREI');
  const sellDecisions = userDecisions.filter(d => d.actionTaken === 'VENDI');
  
  const avgRsiBuy = buyDecisions.length > 0 
    ? Number((buyDecisions.reduce((acc, d) => acc + (d.rsi || 0), 0) / buyDecisions.length).toFixed(1)) 
    : null;
    
  const avgRsiSell = sellDecisions.length > 0 
    ? Number((sellDecisions.reduce((acc, d) => acc + (d.rsi || 0), 0) / sellDecisions.length).toFixed(1)) 
    : null;

  const handleApplyCalibration = () => {
    if (!avgRsiBuy && !avgRsiSell) return;
    const newSettings = { ...settings };
    if (avgRsiBuy) {
      newSettings.rsiOversold = Math.max(10, Math.min(60, Math.round(avgRsiBuy)));
    }
    if (avgRsiSell) {
      newSettings.rsiOverbought = Math.max(40, Math.min(90, Math.round(avgRsiSell)));
    }
    updateSettings(newSettings);
    logKotlinEvent(`[AdaptadorNeural] Calibração de sinal aplicada com sucesso! Novo RSI Compra: ${newSettings.rsiOversold} | Novo RSI Venda: ${newSettings.rsiOverbought}`, 'success');
  };
  
  // Tab states
  const [activeTab, setActiveTab] = useState<'dash' | 'config' | 'bot' | 'ia'>('dash');
  
  // Notification toast states on the simulated phone
  const [activeNotification, setActiveNotification] = useState<{
    title: string;
    body: string;
    type: 'BUY' | 'SELL';
  } | null>(null);

  const notificationTimeoutRef = useRef<any>(null);

  const handleUserFeedback = (action: 'COMPREI' | 'VENDI') => {
    if (!activeNotification) return;

    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }

    const currentRsi = currentSignal?.indicatorValues.rsi;
    const currentMacd = currentSignal?.indicatorValues.macdHist;

    const newDecision: UserDecision = {
      id: Math.random().toString(36).substring(4),
      time: Date.now(),
      symbol,
      signalType: activeNotification.type,
      actionTaken: action,
      price,
      rsi: currentRsi !== undefined ? currentRsi : null,
      macd: currentMacd !== undefined ? currentMacd : null
    };

    setUserDecisions(prev => [newDecision, ...prev]);
    setActiveNotification(null); // dismiss toast

    // Log the event as native Android JVM feedback
    logKotlinEvent(`[FeedLearning] Aprendizado: Usuário confirmou "${action}" para o spot a $${price.toLocaleString('en-US')}.`, 'success');

    // Trigger simulated trade to maintain portfolio synchronization
    if (action === 'COMPREI') {
      executeSimulatedTrade('COMPRA');
    } else {
      executeSimulatedTrade('VENDA');
    }
  };
  
  // Audio toggle
  const [isMuted, setIsMuted] = useState(true);
  
  // Local active backtest balance tracking
  const [botRunning, setBotRunning] = useState(false);
  const [balanceUsdt, setBalanceUsdt] = useState(10000);
  const [cryptoHoldings, setCryptoHoldings] = useState(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [lastNotificationSignal, setLastNotificationSignal] = useState<string>('HOLD');
  
  // IA Advisor States
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Clock state inside smartphone status bar
  const [simulatedTime, setSimulatedTime] = useState('12:00');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setSimulatedTime(`${hrs}:${mins}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 10000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Synthesizer for Android notification chime
  const playNotificationChime = (type: 'BUY' | 'SELL') => {
    if (isMuted) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'BUY') {
        // High-pitch friendly ascending synth
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880.00, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      } else {
        // Warning descending pulse chimes
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440.00, ctx.currentTime); // A4
        osc.frequency.exponentialRampToValueAtTime(293.66, ctx.currentTime + 0.2); // D4
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn('Audio synthesis deferred: waiting for user interact token.', e);
    }
  };

  // Monitor signal changes for Android Push Notification Simulation
  useEffect(() => {
    if (!currentSignal) return;
    const currentSignalType = currentSignal.type;
    
    if (currentSignalType !== lastNotificationSignal) {
      setLastNotificationSignal(currentSignalType);
      
      if (currentSignalType === 'BUY' || currentSignalType === 'STRONG_BUY') {
        triggerNotification(
          '🔔 Oportunidade de COMPRA', 
          `Sinais positivos indicados no par ${symbol}. RSI com valor ${currentSignal.indicatorValues.rsi ?? 'N/A'}.`,
          'BUY'
        );
        logKotlinEvent(`[AlertService] Disparando Notificação Push Android na Fila do FCM: COMPRA ${symbol} a $${price}`, 'success');
        
        // Add to alert history
        addHistoricalAlert({
          id: Math.random().toString(36).substring(4),
          symbol,
          type: 'COMPRA',
          price,
          time: Date.now(),
          indicators: `RSI: ${currentSignal.indicatorValues.rsi?.toFixed(1) ?? 'N/A'} | MACD: ${currentSignal.indicatorValues.macdHist?.toFixed(6) ?? 'N/A'}`,
          reason: currentSignal.reasons[0] || 'Gatilho técnico do RSI / Médias Móveis.'
        });

        // Trigger bot trade if bot is automated
        if (botRunning && balanceUsdt > 10) {
          executeSimulatedTrade('COMPRA');
        }
      } 
      else if (currentSignalType === 'SELL' || currentSignalType === 'STRONG_SELL') {
        triggerNotification(
          '⚠️ Alerta de VENDA', 
          `Topo identificado ou correção em curso no par ${symbol}. Recomenda-se realizar lucros.`,
          'SELL'
        );
        logKotlinEvent(`[AlertService] Disparando Notificação Push Android na Fila do FCM: VENDA ${symbol} a $${price}`, 'warning');
        
        // Add to alert history
        addHistoricalAlert({
          id: Math.random().toString(36).substring(4),
          symbol,
          type: 'VENDA',
          price,
          time: Date.now(),
          indicators: `RSI: ${currentSignal.indicatorValues.rsi?.toFixed(1) ?? 'N/A'} | MACD: ${currentSignal.indicatorValues.macdHist?.toFixed(6) ?? 'N/A'}`,
          reason: currentSignal.reasons[0] || 'Pressão vendedora ou sobrecompra identificada.'
        });

        // Trigger bot trade if bot is automated
        if (botRunning && cryptoHoldings > 0) {
          executeSimulatedTrade('VENDA');
        }
      }
    }
  }, [currentSignal]);

  const triggerNotification = (title: string, body: string, type: 'BUY' | 'SELL') => {
    if (!settings.pushActive) return;
    setActiveNotification({ title, body, type });
    playNotificationChime(type);
    
    // Clear any pending dismissal
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
    }
    
    // Auto collapse after 16 seconds (giving enough time to choose Comprou / Vendeu feedback inputs)
    notificationTimeoutRef.current = setTimeout(() => {
      setActiveNotification(null);
    }, 16000);
  };

  // Automated/Manual Trade execution
  const executeSimulatedTrade = (type: 'COMPRA' | 'VENDA') => {
    if (type === 'COMPRA') {
      if (balanceUsdt < 10) return;
      const fee = balanceUsdt * 0.001; // 0.1% Binance fee
      const investValue = balanceUsdt - fee;
      const buyAmount = investValue / price;
      
      const newTrade: Trade = {
        id: Math.random().toString(36).substring(4),
        type: 'COMPRA',
        price,
        time: Date.now(),
        amount: buyAmount,
        totalUsdt: investValue,
        balanceUsdt: 0
      };

      setCryptoHoldings(buyAmount);
      setBalanceUsdt(0);
      setTrades(prev => [newTrade, ...prev]);
      logKotlinEvent(`[SimulationEngine] Compra efetuada para ${symbol}: Adquiriu ${buyAmount.toFixed(5)} tokens a $${price}`, 'success');
    } else {
      if (cryptoHoldings <= 0) return;
      const revenue = cryptoHoldings * price;
      const fee = revenue * 0.001;
      const netRevenue = revenue - fee;
      
      const buyTrade = trades.find(t => t.type === 'COMPRA'); // Find matching purchase price for profit calculation
      let profitPercent = 0;
      if (buyTrade) {
        profitPercent = ((price - buyTrade.price) / buyTrade.price) * 100;
      }

      const newTrade: Trade = {
        id: Math.random().toString(36).substring(4),
        type: 'VENDA',
        price,
        time: Date.now(),
        amount: cryptoHoldings,
        totalUsdt: netRevenue,
        balanceUsdt: netRevenue,
        profitPercent: Number(profitPercent.toFixed(2))
      };

      setBalanceUsdt(netRevenue);
      setCryptoHoldings(0);
      setTrades(prev => [newTrade, ...prev]);
      logKotlinEvent(`[SimulationEngine] Venda efetuada para ${symbol}: Liquidou ${cryptoHoldings.toFixed(5)} tokens de PHA a $${price}. Retorno de $${netRevenue.toFixed(2)} USDT (${profitPercent > 0 ? '+' : ''}${profitPercent.toFixed(2)}%)`, 'success');
    }
  };

  // Trigger Gemini API Server-side Market analysis Forecast
  const requestGeminiForecast = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError('');
    setAiAnalysis('');
    
    logKotlinEvent('[Retrofit/Gemini] Iniciando requisição de previsão de IA com modelo gemini-3.5-flash', 'info');
    
    try {
      const payload = {
        symbol,
        price,
        rsi: currentSignal?.indicatorValues.rsi,
        sma: currentSignal?.indicatorValues.sma,
        ema: currentSignal?.indicatorValues.ema,
        macdHist: currentSignal?.indicatorValues.macdHist,
        signal: currentSignal?.type || 'HOLD',
        trend: priceChange >= 0 ? 'ALTA (BULLISH)' : 'BAIXA (BEARISH)',
        userDecisions
      };

      const response = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Erro inesperado do servidor de IA.');
      }
      
      setAiAnalysis(data.forecast);
      logKotlinEvent('[Retrofit/Gemini] Previsão de IA técnica recebida com sucesso da API do Gemini!', 'success');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message);
      logKotlinEvent(`[Gemini Error] Falha de conexão: ${err.message}`, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Helper parser for Gemini Markdown Blocks to React HTML elegantly
  const renderMarkdownText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      let trimmed = line.trim();
      // Handle Heading 1 / 2
      if (trimmed.startsWith('## ')) {
        return <h3 key={idx} className="text-sm font-bold text-sky-450 mt-4 mb-2 first:mt-0">{trimmed.replace('##', '')}</h3>;
      }
      if (trimmed.startsWith('### ')) {
        return <h4 key={idx} className="text-xs font-bold text-sky-300 mt-3 mb-1">{trimmed.replace('###', '')}</h4>;
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <p key={idx} className="text-xs font-semibold text-gray-200 mt-2">{trimmed.replaceAll('**', '')}</p>;
      }
      // Handle bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const content = trimmed.substring(2);
        // Replace bold markdown matches inside bullet
        const formatted = content.split('**').map((part, pIdx) => {
          return pIdx % 2 === 1 ? <strong key={pIdx} className="text-amber-400 font-semibold">{part}</strong> : part;
        });
        return <li key={idx} className="text-[11px] text-gray-300 ml-4 list-disc mt-1">{formatted}</li>;
      }
      
      // Parse inline bolding **word**
      if (trimmed === '') return <div key={idx} className="h-2" />;
      
      const formattedLine = line.split('**').map((part, pIdx) => {
        return pIdx % 2 === 1 ? <strong key={pIdx} className="text-green-400 font-semibold">{part}</strong> : part;
      });

      return <p key={idx} className="text-[11px] text-gray-300 leading-relaxed mt-1">{formattedLine}</p>;
    });
  };

  // Portfolio Statistics calculations
  const totalValueUsdt = balanceUsdt + (cryptoHoldings * price);
  const profitPercentage = ((totalValueUsdt - 10000) / 10000) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* Sound Device Controller */}
      <div className="w-full max-w-[340px] flex justify-between items-center bg-[#111] border border-[#1a1a1a] rounded-none px-4 py-2.5 mb-3 text-xs">
        <span className="text-gray-400 font-sans flex items-center gap-1.5 font-medium uppercase tracking-wider text-[9px]">
          <Moon className="w-3.5 h-3.5 text-[#00ff66]" />
          Dispositivo Android Virtual
        </span>
        <button
          onClick={() => {
            setIsMuted(!isMuted);
            logKotlinEvent(`Audível do Simulador Android: ${isMuted ? 'ATIVADO' : 'MUTADO'}`, 'info');
          }}
          className={`px-3 py-1 bg-black border text-[9px] uppercase tracking-widest font-mono transition duration-150 rounded-none ${
            isMuted 
              ? 'text-gray-500 border-[#1a1a1a] hover:bg-[#111]' 
              : 'text-[#00ff66] border-[#00ff66] hover:bg-[#00ff66]/10'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 mr-1 inline" /> : <Volume2 className="w-3.5 h-3.5 mr-1 inline" />}
          {isMuted ? 'Muted' : 'Sound ON'}
        </button>
      </div>

      {/* Outer Pixel Smartphone Frame Wrapper */}
      <div className="relative w-[340px] h-[670px] bg-[#050505] rounded-none border-[12px] border-[#1a1a1a] shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden">
        
        {/* Notch Speaker and Camera */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1a1a1a] rounded-b-md z-50 flex items-center justify-center space-x-1">
          <div className="w-1.5 h-1.5 bg-black border border-gray-800" /> {/* Camera lens */}
          <div className="w-12 h-1 bg-black" /> {/* Speaker bar */}
        </div>

        {/* Status Bar */}
        <div className="h-7 bg-[#050505] px-6 pt-1 flex justify-between items-center z-40 text-[10px] text-gray-500 select-none font-sans font-medium border-b border-[#1a1a1a]/40">
          <span className="text-gray-400 font-bold">{simulatedTime}</span>
          <div className="flex items-center space-x-1.5">
            {/* Real-time indicator state icons */}
            <span className="text-[9px] text-[#00ff66] border border-[#00ff66]/30 px-1 py-[1px] rounded bg-[#00ff66]/10 uppercase tracking-wide scale-90 font-mono">
              FCM Active
            </span>
            <span>📶</span>
            <span>🔋 98%</span>
          </div>
        </div>

        {/* Floating Simulated Android Push Notification Toast */}
        {activeNotification && (
          <div className="absolute top-8 left-3 right-3 bg-black border-2 border-[#1a1a1a] rounded-none shadow-xl p-3.5 z-50 flex flex-col space-y-2.5 animate-bounce font-sans">
            <div className="flex items-start space-x-2.5">
              <div className={`p-2 rounded-none mt-0.5 ${activeNotification.type === 'BUY' ? 'bg-[#00ff66]/15 text-[#00ff66]' : 'bg-red-950/20 text-red-500'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{activeNotification.title}</span>
                  <span className="text-[9px] text-[#00ff66] font-mono animate-pulse">agora</span>
                </div>
                <p className="text-[11px] text-gray-450 leading-snug mt-1 break-words">{activeNotification.body}</p>
              </div>
            </div>

            {/* Interactive Feedback buttons to let the app learn */}
            <div className="flex items-center justify-end space-x-2 border-t border-[#121212] pt-2">
              <button
                onClick={() => {
                  if (notificationTimeoutRef.current) {
                    clearTimeout(notificationTimeoutRef.current);
                  }
                  setActiveNotification(null);
                }}
                className="px-2.5 py-1 text-gray-500 hover:text-gray-350 transition font-mono uppercase tracking-wider text-[9px] hover:bg-white/5"
              >
                Ignorar
              </button>
              {activeNotification.type === 'BUY' ? (
                <button
                  onClick={() => handleUserFeedback('COMPREI')}
                  className="bg-[#00ff66] text-black hover:bg-[#00ff66]/90 transition px-3 py-1 font-sans uppercase tracking-wider text-[9.5px] font-black shrink-0"
                >
                  🟢 Comprei!
                </button>
              ) : (
                <button
                  onClick={() => handleUserFeedback('VENDI')}
                  className="bg-red-600 text-white hover:bg-red-500 transition px-3 py-1 font-sans uppercase tracking-wider text-[9.5px] font-black shrink-0"
                >
                  🔴 Vendi!
                </button>
              )}
            </div>
          </div>
        )}

        {/* Interactive App Screen Space */}
        <div className="flex-1 flex flex-col bg-[#050505] overflow-y-auto overflow-x-hidden scrollbar-none pb-12">
          
          {/* App Header Bar */}
          <div className="bg-[#111] p-4 border-b border-[#1a1a1a] flex justify-between items-center px-5">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-[#00ff66] font-semibold font-mono">Binance Observer</span>
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 font-display">
                <Cpu className="w-4 h-4 text-[#00ff66]" />
                CryptoViewModel
              </h1>
            </div>
            
            {/* Status light of alerts running background */}
            <div className="flex items-center space-x-1.5 bg-black px-2.5 py-1 border border-[#1a1a1a]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff66] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff66]"></span>
              </span>
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest font-bold">MONITOR</span>
            </div>
          </div>

          {/* MAIN CONTENT AREA BY TAB */}
          <div className="flex-1 p-3.5 space-y-3">
            
            {activeTab === 'dash' && (
              <>
                {/* 1. Live Price & Volume Panel */}
                <div className="bg-[#111] p-4 rounded-none border border-[#1a1a1a] shadow-none">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-gray-500 font-mono tracking-wider">PREÇO SPOT BINANCE</span>
                      <div className="text-2xl font-black text-white tracking-tight flex items-baseline gap-1 mt-0.5 font-display">
                        ${price >= 1 ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : price.toFixed(6)}
                        <span className="text-xs text-[#00ff66] font-mono font-medium">USDT</span>
                      </div>
                    </div>
                    <span className={`text-[10.5px] px-2 py-1 rounded-none font-mono font-bold flex items-center ${
                      priceChange >= 0 ? 'bg-[#00ff66]/10 text-[#00ff66] border border-[#00ff66]/25' : 'bg-red-500/10 text-red-500 border border-red-500/25'
                    }`}>
                      {priceChange >= 0 ? <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" /> : <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />}
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </span>
                  </div>

                  {/* Coin custom details badge */}
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-[#1a1a1a] text-[10px] text-gray-500 font-mono">
                    <span className="bg-[#050505] text-[#00ff66] px-2 py-0.5 border border-[#1a1a1a] font-bold">{symbol}</span>
                    <span>• Par Spot Ativo</span>
                    <span>• 24h Vol: Alto</span>
                  </div>
                </div>

                {/* 2. Custom Candlestick Trading Panel */}
                <CandlestickChart 
                  candles={candles} 
                  smas={smas} 
                  emas={emas} 
                  rsis={rsis} 
                  symbol={symbol} 
                />

                {/* 3. Mathematical Signal Output Badge */}
                {currentSignal && (
                  <div className={`p-4 rounded-none border-l-4 flex flex-col space-y-2.5 bg-[#111] ${
                    currentSignal.type.includes('BUY') 
                      ? 'border-[#00ff66] text-[#00ff66]' 
                      : currentSignal.type.includes('SELL')
                        ? 'border-red-500 text-red-405'
                        : 'border-[#1a1a1a] text-gray-300'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-white">Sinal Algorítmico Atual</span>
                      <span className={`text-[10px] px-3 py-0.5 font-black uppercase tracking-wider font-mono ${
                        currentSignal.type.includes('BUY') 
                          ? 'bg-[#00ff66] text-black' 
                          : currentSignal.type.includes('SELL')
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-800 text-gray-300'
                      }`}>
                        {currentSignal.type}
                      </span>
                    </div>

                    <p className="text-[11.5px] leading-relaxed select-text font-sans text-gray-350">
                      {currentSignal.reasons[0] || 'Aguardando fluxo de flutuação de médias.'}
                    </p>

                    {/* Secondary signal reason indicators checks */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-[#1a1a1a]/40 text-[9px] font-mono text-gray-500">
                      <div>• Filtro SMA-20: {currentSignal.indicatorValues.price > (currentSignal.indicatorValues.sma || 0) ? 'BULLISH' : 'BEARISH'}</div>
                      <div>• Tendência MACD: {currentSignal.indicatorValues.macdHist !== null && currentSignal.indicatorValues.macdHist > 0 ? 'COMPRADOR' : 'VENDEDOR'}</div>
                    </div>
                  </div>
                )}

                {/* 4. Log Real alerts History list */}
                <div className="bg-[#111] rounded-none border border-[#1a1a1a] p-4">
                  <div className="flex justify-between items-center mb-3 pb-1.5 border-b border-[#1a1a1a]">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-[#00ff66]" />
                      Histórico Recente ({historicalAlerts.length})
                    </span>
                  </div>

                  {historicalAlerts.length === 0 ? (
                    <p className="text-[10px] text-gray-500 text-center font-mono py-4 uppercase">Nenhum sinal emitido nesta sessão.</p>
                  ) : (
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1.5">
                      {historicalAlerts.map((alert) => (
                        <div key={alert.id} className="p-2.5 rounded-none bg-[#050505] border border-[#1a1a1a] text-[9.5px] font-mono flex flex-col space-y-1">
                          <div className="flex justify-between">
                            <span className={alert.type === 'COMPRA' ? 'text-[#00ff66] font-bold' : 'text-red-400 font-bold'}>
                              {alert.type} • {alert.symbol}
                            </span>
                            <span className="text-gray-600">
                              {new Date(alert.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-gray-300 flex justify-between">
                            <span>Preço no gatilho: ${alert.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                          </div>
                          <span className="text-gray-500 text-[8.5px] italic truncate">{alert.reason}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'config' && (
              <div className="bg-[#111] p-4 rounded-none border border-[#1a1a1a] space-y-4 font-sans">
                <div className="flex items-center gap-1.5 pb-2.5 border-b border-[#1a1a1a]">
                  <Settings2 className="w-4 h-4 text-[#00ff66]" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Configurações Locais</h3>
                </div>

                {/* Trading symbol dropdown */}
                <div className="space-y-1 block">
                  <label className="text-[10px] text-gray-500 font-mono block uppercase tracking-wider">Criptomoeda de Análise (Par Binance)</label>
                  <select
                    value={settings.symbol}
                    onChange={(e) => {
                      updateSettings({ ...settings, symbol: e.target.value });
                      logKotlinEvent(`[MVVM ViewModel] Par atualizado via interface Android: ${e.target.value}`, 'info');
                    }}
                    className="w-full bg-[#050505] text-xs text-white border border-[#1a1a1a] rounded-none p-2 font-mono outline-none focus:border-[#00ff66]"
                  >
                    <option value="BTCUSDT">BTC/USDT (Bitcoin Spot)</option>
                    <option value="ETHUSDT">ETH/USDT (Ethereum Spot)</option>
                    <option value="SOLUSDT">SOL/USDT (Solana Spot)</option>
                    <option value="PHAUSDT">PHA/USDT (Phala Network Spot)</option>
                  </select>
                  <span className="text-[8px] text-gray-500 block leading-tight pt-1">
                    Nota: O par PHA é simulado offline quando as conexões com a Binance falham. Modos BTC, ETH e SOL também são suportados em tempo real.
                  </span>
                </div>

                {/* RSI Bound sliders */}
                <div className="space-y-1 pb-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-gray-400">RSI Sobrevenda (Compra)</span>
                    <span className="text-green-400 font-bold">{settings.rsiOversold}</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="45"
                    value={settings.rsiOversold}
                    onChange={(e) => updateSettings({ ...settings, rsiOversold: Number(e.target.value) })}
                    className="w-full accent-green-500 bg-slate-900 h-1.5 rounded-lg"
                  />
                </div>

                <div className="space-y-1 pb-1">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-gray-400">RSI Sobrecompra (Venda)</span>
                    <span className="text-red-400 font-bold">{settings.rsiOverbought}</span>
                  </div>
                  <input
                    type="range"
                    min="55"
                    max="85"
                    value={settings.rsiOverbought}
                    onChange={(e) => updateSettings({ ...settings, rsiOverbought: Number(e.target.value) })}
                    className="w-full accent-red-500 bg-slate-900 h-1.5 rounded-lg"
                  />
                </div>

                {/* Switch filters */}
                <div className="space-y-2 pt-1 border-t border-gray-900">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-gray-300 font-mono">Média SMA-20 como Filtro</span>
                    <input
                      type="checkbox"
                      checked={settings.useSmaFilter}
                      onChange={(e) => updateSettings({ ...settings, useSmaFilter: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-500 bg-slate-900 accent-indigo-500 border-gray-800"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-gray-300 font-mono font-mono">Crossover MACD para Confirmação</span>
                    <input
                      type="checkbox"
                      checked={settings.useMacdFilter}
                      onChange={(e) => updateSettings({ ...settings, useMacdFilter: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-500 bg-slate-900 accent-indigo-500 border-gray-800"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] text-[#00ff66] font-semibold font-mono flex items-center gap-1">
                      <Bell className="w-3 h-3" /> Push FCM Android Active
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.pushActive}
                      onChange={(e) => {
                        updateSettings({ ...settings, pushActive: e.target.checked });
                        logKotlinEvent(`Push Android Notifications: ${e.target.checked ? 'HABILITADO' : 'DESABILITADO'}`, 'info');
                      }}
                      className="w-4 h-4 rounded text-green-500 bg-slate-900 accent-green-500 border-gray-800"
                    />
                  </div>
                </div>

                {/* Save button mockup */}
                <button
                  onClick={() => {
                    logKotlinEvent('[Kotlin Preferences] Salvando configurações em SharedPreferences nativo do Android', 'success');
                    triggerNotification('💾 Configurações Salvas', 'Os limites dos sinais com SharedPreferences foram persistidos com sucesso!', 'BUY');
                    setActiveTab('dash');
                  }}
                  className="w-full bg-[#00ff66] hover:bg-[#00ff66]/95 text-black font-black uppercase tracking-widest text-[10px] py-2.5 px-4 rounded-none transition duration-150"
                >
                  Salvar em SharedPreferences
                </button>
              </div>
            )}

            {activeTab === 'bot' && (
              <div className="bg-[#111] p-4 rounded-none border border-[#1a1a1a] space-y-3.5">
                <div className="flex justify-between items-center pb-2.5 border-b border-[#1a1a1a]">
                  <div className="flex items-center space-x-1.5">
                    <Cpu className="w-4 h-4 text-[#00ff66]" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider">Robô de Lucro / Simulação</h3>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-none font-mono font-bold uppercase transition ${
                    botRunning ? 'bg-[#00ff66]/15 text-[#00ff66]' : 'bg-[#1a1a1a] text-gray-400'
                  }`}>
                    {botRunning ? 'Ativo (Bot)' : 'Pausado'}
                  </span>
                </div>

                {/* Statistics scoreboard */}
                <div className="grid grid-cols-2 gap-2 text-center font-mono">
                  <div className="p-2.5 border border-[#1a1a1a] bg-black rounded-none">
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider block">SALDO USDT</span>
                    <span className="text-xs font-bold text-white">${balanceUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="p-2.5 border border-[#1a1a1a] bg-black rounded-none">
                    <span className="text-[8px] text-gray-500 uppercase tracking-wider block">CARTEIRA ({symbol.replace('USDT', '')})</span>
                    <span className="text-xs font-bold text-amber-400">{cryptoHoldings.toFixed(5)}</span>
                  </div>
                </div>

                {/* Net Profit block */}
                <div className="p-3 bg-black border border-[#1a1a1a] rounded-none flex items-center justify-between font-mono">
                  <div>
                    <span className="text-[9px] text-gray-500 block font-sans uppercase tracking-wider">PATRIMÔNIO LÍQUIDO SIMULADO</span>
                    <span className="text-xs text-white font-bold">${totalValueUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] text-gray-500 block uppercase tracking-wider">LUCRO / PERDA</span>
                    <span className={`text-xs font-bold font-mono ${profitPercentage >= 0 ? 'text-[#00ff66]' : 'text-red-500'}`}>
                      {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Controller actions */}
                <div className="flex space-x-2 font-sans pt-1">
                  <button
                    onClick={() => {
                      setBotRunning(!botRunning);
                      logKotlinEvent(`Robô de backtesting simulado: ${!botRunning ? 'INICIADO' : 'PAUSADO'}`, !botRunning ? 'success' : 'warning');
                    }}
                    className={`flex-1 text-[10px] uppercase tracking-wider py-2 px-3 rounded-none font-bold font-sans flex items-center justify-center gap-1.5 border transition ${
                      botRunning 
                        ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/40 text-red-400' 
                        : 'bg-[#00ff66] hover:bg-[#00ff66]/90 border-[#00ff66] text-black'
                    }`}
                  >
                    {botRunning ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    {botRunning ? 'Pausar Algoritmo' : 'Ativar Robô'}
                  </button>
                  
                  {cryptoHoldings > 0 ? (
                    <button
                      onClick={() => executeSimulatedTrade('VENDA')}
                      className="bg-black hover:bg-[#111] text-red-400 font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-none transition font-sans border border-red-500/40"
                    >
                      Liquidar
                    </button>
                  ) : (
                    <button
                      onClick={() => executeSimulatedTrade('COMPRA')}
                      className="bg-black hover:bg-[#111] text-[#00ff66] font-bold text-[10px] uppercase tracking-wider py-2 px-3 rounded-none transition font-sans border border-[#00ff66]/40"
                    >
                      Comprar
                    </button>
                  )}
                </div>

                {/* Trades history queue */}
                <div className="space-y-1.5 mt-2 pt-1.5 border-t border-[#1a1a1a] font-mono">
                  <span className="text-[9px] text-gray-400 font-semibold uppercase block">Logs de Negociação ({trades.length})</span>
                  {trades.length === 0 ? (
                    <p className="text-[9px] text-gray-500 text-center py-2">Sem ordens executadas.</p>
                  ) : (
                    <div className="max-h-[100px] overflow-y-auto space-y-1">
                      {trades.map(trade => (
                        <div key={trade.id} className="p-1.5 rounded bg-slate-900 border border-gray-800 text-[8px] flex items-center justify-between">
                          <span className={trade.type === 'COMPRA' ? 'text-green-500 font-bold' : 'text-red-400 font-bold'}>
                            {trade.type}
                          </span>
                          <span className="text-gray-300">${trade.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                          <span className="text-gray-400">{trade.amount.toFixed(4)} {symbol.replace('USDT', '')}</span>
                          {trade.profitPercent !== undefined && (
                            <span className={trade.profitPercent >= 0 ? 'text-green-400 font-bold' : 'text-red-500 font-bold'}>
                              {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'ia' && (
              <div className="bg-[#111] p-4 rounded-none border border-[#1a1a1a] space-y-3.5 font-sans">
                <div className="flex justify-between items-center pb-2.5 border-b border-[#1a1a1a]">
                  <div className="flex items-center space-x-1.5">
                    <BrainCircuit className="w-4.5 h-4.5 text-[#00ff66]" />
                    <h3 className="text-xs font-black text-white uppercase tracking-wider font-display">Conselheiro IA Gemini</h3>
                  </div>
                  <span className="text-[8px] font-mono bg-black text-[#00ff66] px-1.5 py-0.5 rounded-none border border-[#1a1a1a] uppercase font-bold">
                    v3.5 Flash
                  </span>
                </div>

                <p className="text-[10.5px] text-gray-400 leading-relaxed font-sans">
                  Consulte nossa Inteligência Artificial para mapear as tendências técnicas e confluências de médias móveis do par {symbol} nas próximas horas.
                </p>

                {/* Prediction core trigger actions */}
                {!aiAnalysis && !aiLoading && (
                  <button
                    onClick={requestGeminiForecast}
                    className="w-full bg-[#00ff66] hover:bg-[#00ff66]/90 text-black font-black text-[10px] tracking-widest uppercase py-2.5 px-4 rounded-none flex items-center justify-center gap-1.5 transition active:scale-95"
                  >
                    <BrainCircuit className="w-4 h-4 text-black" />
                    Gerar Previsão de IA Técnica
                  </button>
                )}

                {aiLoading && (
                  <div className="p-6 flex flex-col items-center justify-center space-y-2.5 font-mono text-center">
                    <RefreshCw className="animate-spin w-5 h-5 text-[#00ff66]" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider">Consultando o Gemini...</span>
                    <span className="text-[8px] text-gray-650 block">Calculando EMA, RSI e feeds do usuário</span>
                  </div>
                )}

                {aiError && (
                  <div className="p-3.5 bg-red-950/20 border border-red-900/60 rounded-none text-[10px] text-red-400 leading-relaxed font-mono space-y-2">
                    <div className="font-bold uppercase tracking-wider">⚠️ Erro na conexao Gemini</div>
                    <p>{aiError}</p>
                  </div>
                )}

                {aiAnalysis && (
                  <div className="space-y-3 animate-fade-in select-text">
                    <div className="p-3 bg-black border border-[#1a1a1a] rounded-none max-h-[220px] overflow-y-auto space-y-2 leading-relaxed text-gray-300 scrollbar-thin">
                      {renderMarkdownText(aiAnalysis)}
                    </div>
                    
                    <button
                      onClick={requestGeminiForecast}
                      className="w-full border border-[#1a1a1a] hover:bg-black/40 text-gray-400 hover:text-white transition font-mono text-[9px] uppercase tracking-wider py-2 rounded-none flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3 text-[#00ff66]" /> Atualizar Análise de Tendência
                    </button>
                  </div>
                )}

                {/* Visual Feedback Learning Adaptor Unit */}
                <div className="border-t border-[#1a1a1a] pt-3.5 space-y-2.5">
                  <div className="flex items-center space-x-1.5">
                    <BrainCircuit className="w-4 h-4 text-amber-500 animate-pulse" />
                    <h4 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest font-sans">Mecanismo de Aprendizado Neuronal</h4>
                  </div>
                  
                  <p className="text-[10px] text-gray-400 leading-normal font-sans">
                    Cada vez que você clica nos botões das notificações push (<strong>Comprei</strong> ou <strong>Vendi</strong>), o app grava o RSI e o preço local para calibrar seu algoritmo.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-2">
                      <span className="text-gray-500 block uppercase text-[8px]">Feeds Compra</span>
                      <strong className="text-[#00ff66] text-xs font-bold">{buyDecisions.length} registros</strong>
                      <span className="text-[8.5px] text-gray-400 block mt-0.5">RSI de Entrada: {avgRsiBuy ? `${avgRsiBuy}%` : 'N/A'}</span>
                    </div>
                    <div className="bg-[#0a0a0a] border border-[#1a1a1a] p-2">
                      <span className="text-gray-500 block uppercase text-[8px]">Feeds Venda</span>
                      <strong className="text-red-500 text-xs font-bold">{sellDecisions.length} registros</strong>
                      <span className="text-[8.5px] text-gray-400 block mt-0.5">RSI de Saída: {avgRsiSell ? `${avgRsiSell}%` : 'N/A'}</span>
                    </div>
                  </div>

                  {/* Calibration recommendation card */}
                  {(avgRsiBuy || avgRsiSell) ? (
                    <div className="p-2.5 bg-amber-950/15 border border-amber-900/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-500 block">⚡ Ajuste de Sinais Adaptado:</span>
                      </div>
                      <p className="text-[10px] text-gray-300 leading-relaxed font-sans">
                        {avgRsiBuy && `RSI de compra preferido: ${avgRsiBuy}% (Configurado original: ${settings.rsiOversold}%). `}
                        {avgRsiSell && `RSI de venda preferido: ${avgRsiSell}% (Configurado original: ${settings.rsiOverbought}%).`}
                      </p>
                      
                      <button
                        onClick={handleApplyCalibration}
                        className="w-full bg-amber-500 hover:bg-amber-600 transition text-black font-black text-[9px] uppercase tracking-wider py-1.5 rounded-none font-sans active:scale-95"
                      >
                        ✔ Calibrar Sinais pelo meus Feedbacks
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-[#0a0a0a] border border-dashed border-[#1d1d1d] text-center text-[9px] text-gray-550 font-mono uppercase tracking-wider">
                      Aguardando feeds dos alertas push para gerar calibração customizada...
                    </div>
                  )}

                  {/* User trade decision history list */}
                  {userDecisions.length > 0 && (
                    <div className="mt-2 text-[10px]">
                      <div className="flex justify-between items-center text-[9px] uppercase text-gray-500 font-bold font-mono pb-1 border-b border-[#1a1a1a]/60">
                        <span>Minhas Ações Informadas ({userDecisions.length})</span>
                        <button 
                          onClick={() => {
                            setUserDecisions([]);
                            logKotlinEvent('[NeuralBrain] Memória de feeds do operador redefinida com sucesso.', 'warning');
                          }}
                          className="hover:text-red-400 text-gray-500 uppercase text-[8px] font-mono transition"
                        >
                          Apagar Registros
                        </button>
                      </div>
                      <div className="max-h-24 overflow-y-auto mt-1 border border-[#1a1a1a] bg-black/60 p-1 divide-y divide-[#151515] scrollbar-thin">
                        {userDecisions.map((dec) => (
                          <div key={dec.id} className="p-1 px-1.5 flex justify-between items-center text-[9px] font-mono text-gray-300">
                            <span className="flex items-center gap-1.5 shrink-0">
                              {dec.actionTaken === 'COMPREI' ? (
                                <span className="text-[#00ff66] font-bold">🟢 COMPRA</span>
                              ) : (
                                <span className="text-red-500 font-bold">🔴 VENDA</span>
                              )}
                              <span className="text-gray-400 font-semibold">{dec.symbol.replace('USDT', '')}</span>
                            </span>
                            <span className="text-gray-300">${dec.price >= 1 ? dec.price.toFixed(2) : dec.price.toFixed(5)}</span>
                            <span className="text-gray-500 text-[8px]">RSI: {dec.rsi?.toFixed(1) ?? 'N/A'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM SIMULATED PHONE NAVIGATION BAR */}
          <div className="absolute bottom-0 left-0 right-0 h-11 bg-[#111] border-t border-[#1a1a1a] flex justify-around items-center z-45 px-3">
            <button
              onClick={() => {
                setActiveTab('dash');
                logKotlinEvent('[UI Monitor] Navegação para aba PAINEL.', 'info');
              }}
              className={`flex flex-col items-center justify-center space-y-0.5 transition ${
                activeTab === 'dash' ? 'text-[#00ff66]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LineChart className="w-4 h-4" />
              <span className="text-[8px] font-sans font-bold uppercase tracking-wider">Painel</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('config');
                logKotlinEvent('[UI Monitor] Navegação para aba CONFIGURAÇÕES.', 'info');
              }}
              className={`flex flex-col items-center justify-center space-y-0.5 transition ${
                activeTab === 'config' ? 'text-[#00ff66]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span className="text-[8px] font-sans font-bold uppercase tracking-wider">Configurar</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('bot');
                logKotlinEvent('[UI Monitor] Navegação para aba SIMULADOR.', 'info');
              }}
              className={`flex flex-col items-center justify-center space-y-0.5 transition ${
                activeTab === 'bot' ? 'text-[#00ff66]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span className="text-[8px] font-sans font-bold uppercase tracking-wider">Bot P&L</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ia');
                logKotlinEvent('[UI Monitor] Navegação para aba PREVISÃO IA.', 'info');
              }}
              className={`flex flex-col items-center justify-center space-y-0.5 transition ${
                activeTab === 'ia' ? 'text-[#00ff66]' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              <span className="text-[8px] font-sans font-bold uppercase tracking-wider">Análise IA</span>
            </button>
          </div>

          {/* Android Bottom Swipe Pill */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-900 rounded-full z-45" />

        </div>
      </div>
    </div>
  );
}
