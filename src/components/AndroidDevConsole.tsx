/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileCode, 
  Terminal, 
  Code, 
  Copy, 
  Check, 
  Folder, 
  Cpu, 
  ExternalLink,
  ChevronRight,
  Database
} from 'lucide-react';
import { LogMessage } from '../types';

interface DevConsoleProps {
  logs: LogMessage[];
  clearLogs: () => void;
  activeSymbol: string;
}

export default function AndroidDevConsole({ logs, clearLogs, activeSymbol }: DevConsoleProps) {
  const [activeFile, setActiveFile] = useState<string>('ViewModel');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Professional real Kotlin snippets custom written for our crypto alarm setup
  const kotlinFiles: Record<string, { title: string; desc: string; pkg: string; ext: string; code: string }> = {
    BinanceService: {
      title: 'BinanceService.kt',
      pkg: 'com.crypto.alert.api',
      ext: 'Kotlin (Retrofit)',
      desc: 'Define a interface de requisições assíncronas do Retrofit para mapear dados históricos de velas (candles/klines) e candles da API oficial da Binance utilizando Coroutines.',
      code: `package com.crypto.alert.api

import retrofit2.http.GET
import retrofit2.http.Query
import retrofit2.Response

/**
 * Interface do Retrofit para consultar dados públicos da Binance de forma reativa.
 */
interface BinanceService {
    @GET("api/v3/klines")
    suspend fun getCandles(
        @Query("symbol") symbol: String,
        @Query("interval") interval: String = "1h",
        @Query("limit") limit: Int = 100
    ): Response<List<List<Any>>>
}

// Modelo de resposta para parsing reativo das métricas de candle
data class BinanceCandle(
    val openTime: Long,
    val open: Double,
    val high: Double,
    val low: Double,
    val close: Double,
    val volume: Double,
    val closeTime: Long
)`
    },
    ViewModel: {
      title: 'CryptoViewModel.kt',
      pkg: 'com.crypto.alert.viewmodel',
      ext: 'Kotlin (Architecture Components & Coroutines)',
      desc: 'Elemento central da arquitetura MVVM que controla a thread de polling, calcula o RSI de 14 períodos e as Médias Móveis via Coroutines em background, atualizando o StateFlow da UI.',
      code: `package com.crypto.alert.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.crypto.alert.api.BinanceService
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlin.math.abs

class CryptoViewModel(private val apiService: BinanceService) : ViewModel() {

    private val _priceState = MutableStateFlow<Double>(0.0)
    val priceState: StateFlow<Double> = _priceState

    private val _signalState = MutableStateFlow<String>("AGUARDANDO")
    val signalState: StateFlow<String> = _signalState

    // Inicializa pooling em background de forma isolada com Coroutines
    fun monitorMarket(symbol: String) {
        viewModelScope.launch {
            while (true) {
                try {
                    val response = apiService.getCandles(symbol)
                    if (response.isSuccessful && response.body() != null) {
                        val candlesData = response.body()!!
                        
                        // Extrai preços de fechamento das velas recebidas
                        val closePrices = candlesData.map { it[4].toString().toDouble() }
                        val currentPrice = closePrices.last()
                        
                        _priceState.value = currentPrice
                        
                        // Executa motor de cálculo técnico local no celular
                        val rsi = calculateRSI(closePrices, 14)
                        val sma = calculateSMA(closePrices, 20)
                        
                        evaluateAlertSignal(rsi, currentPrice, sma)
                    }
                } catch (e: Exception) {
                    _signalState.value = "ERRO: \${e.message}"
                }
                delay(10000) // Delay de 10s conforme recomendação técnica
            }
        }
    }

    private fun calculateRSI(prices: List<Double>, period: Int): Double {
        if (prices.size <= period) return 50.0
        var gains = 0.0
        var losses = 0.0
        for (i in 1..period) {
            val diff = prices[prices.size - period + i - 1] - prices[prices.size - period + i - 2]
            if (diff > 0) gains += diff else losses += abs(diff)
        }
        val avgGain = gains / period
        val avgLoss = losses / period
        if (avgLoss == 0.0) return 100.0
        val rs = avgGain / avgLoss
        return 100.0 - (100.0 / (1.0 + rs))
    }

    private fun calculateSMA(prices: List<Double>, period: Int): Double {
        if (prices.size < period) return prices.last()
        return prices.takeLast(period).average()
    }

    private fun evaluateAlertSignal(rsi: Double, price: Double, sma: Double) {
        _signalState.value = when {
            rsi < 30.0 && price > sma -> "COMPRA"
            rsi > 70.0 -> "VENDA"
            else -> "AGUARDAR"
        }
    }
}`
    },
    NotificationService: {
      title: 'CryptoNotificationManager.kt',
      pkg: 'com.crypto.alert.notification',
      ext: 'Kotlin (Android Native OS Integrations)',
      desc: 'Gerencia a criação do canal de notificações (NotificationChannel) para o Android Oreo ou superior e as notificações locais com sons personalizados baseados nos alertas disparados.',
      code: `package com.crypto.alert.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import com.crypto.alert.R

/**
 * Registra o canal e envia alertas push direto no topo do celular
 */
class CryptoNotificationManager(private val context: Context) {

    private val CHANNEL_ID = "crypto_trading_alerts"
    private val notificationManager = 
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Sinais de Compra e Venda"
            val descriptionText = "Notificações push imediatas de triggers do RSI"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableVibration(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun dispatchTradeAlert(title: String, message: String, isBuy: Boolean) {
        val icon = if (isBuy) R.drawable.ic_trending_up else R.drawable.ic_trending_down
        
        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(icon)
            .setContentTitle(title)
            .setContentText(message)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVibrate(longArrayOf(100, 200, 300, 400))

        notificationManager.notify(if (isBuy) 1001 else 1002, builder.build())
    }
}`
    },
    MainActivity: {
      title: 'MainActivity.kt',
      pkg: 'com.crypto.alert.ui',
      ext: 'Kotlin (Jetpack Compose Interface)',
      desc: 'A View principal declarativa em Jetpack Compose que renderiza o estado reativo do CryptoViewModel e permite o acionamento de alertas por interface amigável aos usuários.',
      code: `package com.crypto.alert.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.crypto.alert.viewmodel.CryptoViewModel

class MainActivity : ComponentActivity() {
    
    private val viewModel: CryptoViewModel by lazy {
        // Inicialização injetando o RetrofitClient
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        viewModel.monitorMarket("${activeSymbol}")

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    CryptoDashboard(viewModel)
                }
            }
        }
    }
}

@Composable
fun CryptoDashboard(viewModel: CryptoViewModel) {
    val price by viewModel.priceState.collectAsState()
    val signal by viewModel.signalState.collectAsState()

    Column(modifier = Modifier.padding(16.dp)) {
        Text(text = "Binance Monitor", style = MaterialTheme.typography.titleMedium)
        Spacer(modifier = Modifier.height(8.dp))
        Card {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "Preço Atual: \\$ \$price USDT")
                Text(text = "Sinal Técnico: \$signal")
            }
        }
    }
}`
    }
  };

  const selectedFile = kotlinFiles[activeFile];

  return (
    <div className="flex flex-col space-y-4 h-full">
      {/* Kotlin files Navigator mimicking Android Studio */}
      <div className="bg-[#050505] rounded-none border border-[#1a1a1a] overflow-hidden flex flex-col min-h-[360px] max-h-[500px]">
        {/* IDE Bar Header */}
        <div className="bg-[#111] px-4 py-3 flex items-center justify-between border-b border-[#1a1a1a] select-none">
          <div className="flex items-center space-x-2 text-xs font-mono text-gray-400">
            <span className="text-[#00ff66] font-bold">Android Studio IDE</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-500">app/src/main/java/com/crypto/alert</span>
          </div>
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 bg-[#1a1a1a] border border-gray-700" />
            <div className="w-2.5 h-2.5 bg-[#1a1a1a] border border-gray-750" />
            <div className="w-2.5 h-2.5 bg-[#00ff66]" />
          </div>
        </div>

        {/* IDE Sub Navigation Tabs */}
        <div className="flex bg-[#050505] border-b border-[#1a1a1a] overflow-x-auto text-[11px] font-mono scrollbar-none">
          {Object.entries(kotlinFiles).map(([key, item]) => (
            <button
              key={key}
              onClick={() => {
                setActiveFile(key);
              }}
              className={`px-4.5 py-3 flex items-center space-x-1.5 transition whitespace-nowrap border-r border-[#1a1a1a] ${
                activeFile === key 
                  ? 'bg-[#111] text-white font-bold border-b-2 border-b-[#00ff66]' 
                  : 'text-gray-500 hover:text-white hover:bg-[#111]/50'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-[#00ff66]" />
              <span>{item.title}</span>
            </button>
          ))}
        </div>

        {/* Description alert block */}
        <div className="bg-[#111] px-4 py-3 border-b border-[#1a1a1a]">
          <p className="text-[10px] text-gray-500 leading-normal font-sans">
            <strong className="text-white uppercase tracking-wider text-[9px] mr-1">Camada de {selectedFile.ext}</strong>: {selectedFile.desc}
          </p>
        </div>

        {/* Dynamic code editor viewer */}
        <div className="flex-1 relative overflow-y-auto bg-[#050505] scrollbar-thin flex flex-col">
          <button
            onClick={() => handleCopyCode(selectedFile.code)}
            className="absolute top-3 right-3 bg-[#111] border border-[#1a1a1a] text-gray-400 hover:text-white hover:bg-black p-1.5 rounded-none transition"
            title="Copiar código Kotlin"
          >
            {copied ? <Check className="w-4 h-4 text-[#00ff66]" /> : <Copy className="w-4 h-4" />}
          </button>

          <pre className="p-4.5 text-[10px] font-mono leading-relaxed text-gray-300 overflow-x-auto whitespace-pre">
            <code>
              {selectedFile.code.split('\n').map((line, idx) => (
                <div key={idx} className="flex hover:bg-[#111]/30">
                  <span className="w-6 text-gray-650 text-right select-none pr-3.5 border-r border-[#1a1a1a]/30 mr-2.5">{idx + 1}</span>
                  <span className="text-gray-300 select-text">{line}</span>
                </div>
              ))}
            </code>
          </pre>
        </div>
      </div>

      {/* Kotlin Engine Live Event Logs console monitor */}
      <div className="bg-[#050505] rounded-none border border-[#1a1a1a] p-4 flex flex-col flex-1 h-[260px] min-h-[160px]">
        <div className="flex justify-between items-center pb-2 border-b border-[#1a1a1a] mb-2">
          <div className="flex items-center space-x-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
            <Terminal className="w-4 h-4 text-[#00ff66]" />
            <span>Logcat Feed (ViewModel Coroutine Stream)</span>
          </div>
          <button
            onClick={clearLogs}
            className="text-[9px] uppercase tracking-widest font-bold font-mono text-gray-400 hover:text-white bg-[#111] px-2.5 py-1 rounded-none border border-[#1a1a1a] transition"
          >
            Clear Console
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[10px] pr-1.5 scrollbar-thin">
          {logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-650 italic text-xs uppercase tracking-widest">
              Nenhuma mensagem emitida pelo Logcat.
            </div>
          ) : (
            logs.map((log) => {
              let tagColor = 'text-blue-400'; // info
              let textStyle = 'text-gray-400';
              if (log.type === 'success') {
                tagColor = 'text-[#00ff66]';
                textStyle = 'text-gray-200';
              } else if (log.type === 'warning') {
                tagColor = 'text-yellow-500';
                textStyle = 'text-yellow-250';
              } else if (log.type === 'error') {
                tagColor = 'text-red-500';
                textStyle = 'text-red-400';
              }

              const formattedTime = new Date(log.time).toLocaleTimeString('pt-BR', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div key={log.id} className="flex space-x-1.5 leading-snug hover:bg-[#111]/20 py-0.5">
                  <span className="text-gray-600 shrink-0 select-none">{formattedTime}</span>
                  <span className="text-gray-700 shrink-0 select-none">|</span>
                  <span className={`shrink-0 select-none font-bold uppercase ${tagColor}`}>[{log.type}]</span>
                  <span className={`flex-1 select-text ${textStyle}`}>{log.text}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
