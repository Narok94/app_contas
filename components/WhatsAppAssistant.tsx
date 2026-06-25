import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, ArrowLeft, MoreVertical, CheckCheck, Smile, Paperclip, Mic, Sparkles, LayoutDashboard } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { type User, type Account, type Income, AccountStatus } from '../types';
import * as dataService from '../services/dataService';
import realtimeService from '../services/realtimeService';

declare let process: any;

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  isRead?: boolean;
}

interface WhatsAppAssistantProps {
  currentUser: User;
  activeGroupId: string;
  accounts: Account[];
  incomes: Income[];
  categories: string[];
  selectedDate: Date;
  onSwitchToTraditional: () => void;
}

const WhatsAppAssistant: React.FC<WhatsAppAssistantProps> = ({
  currentUser,
  activeGroupId,
  accounts,
  incomes,
  categories,
  selectedDate,
  onSwitchToTraditional
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages with an elegant welcome
  useEffect(() => {
    const savedChat = localStorage.getItem('tatu_whatsapp_chat_history');
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.some(m => m.text && m.text.includes('Sou o seu assistente financeiro pessoal'))) {
          loadDefaultWelcome();
        } else {
          setMessages(parsed);
        }
      } catch (e) {
        loadDefaultWelcome();
      }
    } else {
      loadDefaultWelcome();
    }
  }, []);

  const loadDefaultWelcome = () => {
    const welcomeMsgs: Message[] = [
      {
        id: 'welcome-1',
        sender: 'bot',
        text: `Olá, Jé! Como posso te ajudar com as finanças hoje? 🦦`,
        timestamp: formatTime(new Date()),
        isRead: true
      }
    ];
    setMessages(welcomeMsgs);
    saveChatHistory(welcomeMsgs);
  };

  const saveChatHistory = (newMessages: Message[]) => {
    localStorage.setItem('tatu_whatsapp_chat_history', JSON.stringify(newMessages));
  };

  // Scroll to bottom whenever messages or typing state change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function formatTime(date: Date) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Regex parser for offline or fast responses
  const tryLocalRegexParser = (text: string) => {
    const lowerText = text.toLowerCase().trim();

    // 1. Check for monthly summary requests
    if (lowerText.includes('resumo') || lowerText.includes('balanço') || lowerText.includes('quanto gastei') || lowerText.includes('relatório')) {
      return { action: 'summary' as const };
    }

    // 2. Parse Income (Receita/Entrada)
    // Matches: "recebi 1500", "recebi 2500 reais", "salario de 5000", "ganhei 200"
    const incomeRegex = /(?:recebi|salario|salário|recebimento|ganhei|pix|entrada)\s+.*?(\d+(?:[.,]\d{2})?)/i;
    const incomeMatch = lowerText.match(incomeRegex);
    if (incomeMatch) {
      const val = parseFloat(incomeMatch[1].replace(',', '.'));
      let name = 'Entrada Extra';
      if (lowerText.includes('salario') || lowerText.includes('salário')) name = 'Salário';
      else if (lowerText.includes('reembolso')) name = 'Reembolso';
      else if (lowerText.includes('venda')) name = 'Venda';
      
      return {
        action: 'add_income' as const,
        data: {
          name,
          value: val,
          category: 'Receita',
          isIncome: true
        }
      };
    }

    // 3. Extract Recurrence info ("recorrente", "fixo", etc.)
    let isRecurrent = false;
    if (lowerText.includes('recorrente') || lowerText.includes('recorrentes') || lowerText.includes('fixo') || lowerText.includes('fixa') || lowerText.includes('mensal')) {
      isRecurrent = true;
    }

    // Strip out recurrence helper words to avoid noise in description parsing
    let cleanTextForParsing = lowerText
      .replace(/[-\s]*(?:recorrente|recorrentes|fixo|fixa|mensal)[-\s]*/gi, ' ')
      .trim();

    // 4. Extract Installment info first if it exists
    // Examples: "Dentista 294- 1/08", "Dentista 294 1/8", "Dentista 294 1 de 8", "TV 100 1/10"
    let isInstallment = false;
    let currentInstallment = 1;
    let totalInstallments = 1;

    // Check for "X/Y" or "X de Y" pattern
    const installMatch = cleanTextForParsing.match(/(\d+)\s*(?:\/|de)\s*(\d+)/i);
    if (installMatch) {
      currentInstallment = parseInt(installMatch[1], 10);
      totalInstallments = parseInt(installMatch[2], 10);
      isInstallment = true;
      // Strip out the installment pattern from text to avoid interfering with name/value parsing
      cleanTextForParsing = cleanTextForParsing.replace(/[-\s]*\d+\s*(?:\/|de)\s*\d+[-\s]*/gi, ' ').trim();
    } else {
      // Check for standard "8x" or "8 vezes" pattern
      const timesMatch = cleanTextForParsing.match(/(\d+)\s*x\b/i) || cleanTextForParsing.match(/(\d+)\s*vezes/i) || cleanTextForParsing.match(/parcelado\s+em\s+(\d+)/i);
      if (timesMatch) {
        totalInstallments = parseInt(timesMatch[1], 10);
        currentInstallment = 1;
        isInstallment = true;
        cleanTextForParsing = cleanTextForParsing
          .replace(/[-\s]*\d+\s*x\b[-\s]*/gi, ' ')
          .replace(/[-\s]*\d+\s*vezes[-\s]*/gi, ' ')
          .replace(/[-\s]*parcelado\s+em\s+\d+[-\s]*/gi, ' ')
          .trim();
      }
    }

    // Remove "R$" or "r$" prefix from anywhere to make parsing bulletproof
    cleanTextForParsing = cleanTextForParsing.replace(/r\$\s*/gi, '').trim();

    // 5. Parse Expense (Despesa/Conta) - Matches: "pão, 5 reais", "Netflix 50", "pão 5", etc.
    // Find the last numeric value in the string (optionally followed by reais, real, rs, etc.)
    const trailingNumberRegex = /(\d+(?:[.,]\d+)?)\s*(?:reais|real|rs)?\s*$/i;
    const expenseMatch = cleanTextForParsing.match(trailingNumberRegex);
    
    if (expenseMatch) {
      const val = parseFloat(expenseMatch[1].replace(',', '.'));
      let rawName = cleanTextForParsing.substring(0, expenseMatch.index).trim();
      
      // Clean up the name from trailing separators (commas, dashes, or connectives like "de", "por", "em", "com")
      rawName = rawName
        .replace(/[-\s,;:="]+$/gi, '')
        .replace(/\s+(?:de|por|em|com)$/i, '')
        .trim();

      // Clean up leading helper words
      const cleanName = rawName
        .replace(/^(paguei|comprei|gastei|lanche|comi|gasto|compra|uma|um|na|no|com|de)\s+/i, '')
        .trim();

      if (cleanName.length > 1 && val > 0) {
        // Simple category matcher
        let category = '📦 Outros';
        const nameLower = cleanName.toLowerCase();
        if (nameLower.includes('dentista') || nameLower.includes('remedio') || nameLower.includes('unimed') || nameLower.includes('saude') || nameLower.includes('consulta') || nameLower.includes('farmacia') || nameLower.includes('médico') || nameLower.includes('drogaria')) {
          category = '🏥 Saúde';
        } else if (nameLower.includes('gasolina') || nameLower.includes('uber') || nameLower.includes('combustivel') || nameLower.includes('carro')) {
          category = '🚗 Transporte';
        } else if (nameLower.includes('comida') || nameLower.includes('lanche') || nameLower.includes('ifood') || nameLower.includes('mercado') || nameLower.includes('restaurante') || nameLower.includes('pão') || nameLower.includes('padaria')) {
          category = '🍱 Alimentação';
        } else if (nameLower.includes('luz') || nameLower.includes('cemig')) {
          category = '💡 Luz';
        } else if (nameLower.includes('agua') || nameLower.includes('copasa')) {
          category = '💧 Água';
        } else if (nameLower.includes('internet') || nameLower.includes('wifi') || nameLower.includes('net') || nameLower.includes('netflix') || nameLower.includes('spotify') || nameLower.includes('disney') || nameLower.includes('prime')) {
          category = '🌐 Internet';
        } else if (nameLower.includes('cartao') || nameLower.includes('crédito') || nameLower.includes('card')) {
          category = '💳 Cartão';
        } else if (nameLower.includes('manuela') || nameLower.includes('manu') || nameLower.includes('brinquedo')) {
          category = '🧸 Manuela';
        } else if (nameLower.includes('lazer') || nameLower.includes('cinema') || nameLower.includes('clube') || nameLower.includes('viagem')) {
          category = '🎮 Lazer';
        }

        return {
          action: 'add_account' as const,
          data: {
            name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
            value: val,
            category,
            isIncome: false,
            isInstallment,
            currentInstallment,
            totalInstallments,
            isRecurrent
          }
        };
      }
    }

    return null;
  };

  // Generate monthly financial summary text
  const generateFinancialSummaryText = (): string => {
    // Calculate values for current month
    const totalPaid = accounts
      .filter(a => a.status === AccountStatus.PAID)
      .reduce((sum, a) => sum + a.value, 0);

    const totalPending = accounts
      .filter(a => a.status === AccountStatus.PENDING)
      .reduce((sum, a) => sum + a.value, 0);

    const totalExpenses = totalPaid + totalPending;

    const totalIncomes = incomes.reduce((sum, i) => sum + i.value, 0);

    const balance = totalIncomes - totalExpenses;

    // Build categories break-down
    const categoryTotals: { [key: string]: number } = {};
    accounts.forEach(a => {
      categoryTotals[a.category] = (categoryTotals[a.category] || 0) + a.value;
    });

    const categorySummary = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => `${cat}: *R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}*`)
      .slice(0, 5)
      .join('\n');

    return `📊 *Resumo de Contas do Mês* 🦦\n\n` +
           `💰 *Entradas Totais:* R$ ${totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
           `📉 *Despesas Totais:* R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
           `   ✅ Pagas: R$ ${totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
           `   ⏳ Pendentes: R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
           `⭐ *Saldo Restante:* R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
           `🔝 *Principais Categorias:* \n${categorySummary || '_Nenhum gasto anotado_'}\n\n` +
           `Deseja adicionar mais alguma conta, Jé? É só me mandar! 😉`;
  };

  // Call Gemini-3.5-flash AI to parse complex phrases
  const callGeminiParser = async (text: string) => {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      console.warn('API_KEY not found. Using local regex parser fallback.');
      return null;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Analise a seguinte mensagem em português da usuária Jéssica e extraia as informações financeiras. Ela está adicionando despesas ou receitas ou solicitando resumos.\n\nMensagem: "${text}"`,
        config: {
          systemInstruction: `Você é um robô de controle de contas financeiras do WhatsApp altamente simpático e rápido chamado Tatu.
Seu objetivo é analisar as mensagens da Jéssica, entender o que ela gastou ou recebeu, e mapear em um JSON estruturado para adicionarmos na lista do app.

Lista de Categorias Disponíveis para despesas:
${JSON.stringify(categories)}

DIRETRIZES DE INTERPRETAÇÃO CRÍTICAS:
1. SE NÃO HOUVER PALAVRAS-CHAVE DE ENTRADA/RECEITA (como "recebi", "ganhei", "pix", "salário", etc.), considere AUTOMATICAMENTE como uma COMPRA ou DESPESA (action: "add_account").
   - Exemplos: "pão, 5 reais", "pão 5", "Netflix 50", "Uber 15", "dentista 200" devem ser despesas (action: "add_account").
2. RECORRÊNCIA: Se a mensagem contiver o termo "recorrente" ou indicar uma despesa fixa mensal regular (ex: "Netflix 50 recorrente" ou "Academia 120 fixa"), marque o campo "isRecurrent": true.
3. PARCELAMENTO ("TV 100 1/10"): Se contiver a indicação de parcelas com o valor (ex: "TV 100 1/10" ou "Dentista 120 1 de 10"), isso significa que cada parcela mensal custa 100 reais, a parcela atual é 1 e o total de parcelas é 10.
   - Configure "isInstallment": true, "currentInstallment": 1, "totalInstallments": 10, e "value": 100.
   - Se o formato for "8x" ou "8 vezes" (ex: "Dentista 200 8x"), assuma totalInstallments: 8, currentInstallment: 1, isInstallment: true.

Se ela estiver descrevendo um gasto (ou por padrão se não for receita):
- extraia o nome do item comprado (ex: "Gasolina", "Lanche", "Padaria").
- extraia o valor numérico de cada parcela/mensalidade.
- mapeie para a categoria mais próxima ou apropriada da lista. Se nenhuma servir, use "📦 Outros". Se o nome contiver "dentista", "médico", use "🏥 Saúde".
- configure "isInstallment" (boolean), "currentInstallment" (number) e "totalInstallments" (number) se aplicável.
- configure "isRecurrent" (boolean) se for uma despesa recorrente/fixa.
- retorne o campo "action": "add_account".

Se ela estiver descrevendo uma receita/entrada de dinheiro (ex: "recebi", "ganhei", "pix de", "salário"):
- extraia o nome (ex: "Pix Recebido", "Salário", "Bônus").
- extraia o valor numérico.
- retorne o campo "action": "add_income".

Se ela pedir um resumo, balanço ou relatórios das contas ("resumo", "quanto gastei", "me manda o resumo", "contas do mês"):
- retorne o campo "action": "summary".

Se for uma saudação ou conversa geral sem ação financeira direta:
- retorne o campo "action": "unknown".

Você DEVE responder UNICAMENTE com um JSON válido correspondente a este formato:
{
  "action": "add_account" | "add_income" | "summary" | "unknown",
  "data": {
    "name": "nome do item",
    "value": 150.00,
    "category": "categoria correspondente",
    "isInstallment": boolean (opcional),
    "currentInstallment": number (opcional),
    "totalInstallments": number (opcional),
    "isRecurrent": boolean (opcional)
  },
  "reply": "Uma resposta simpática simulando o WhatsApp que confirme a ação (ex: 'Anotado, Jé! Lanche de R$ 35,00 adicionado com sucesso na categoria 🍱 Alimentação!'). Use emojis combinando."
}
Não coloque nenhuma formatação markdown fora do bloco JSON. Apenas retorne o JSON cru.`,
          responseMimeType: 'application/json'
        }
      });

      const jsonStr = response.text?.trim() || '{}';
      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (e) {
      console.error('Gemini Parsing Error:', e);
      return null;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setInputValue('');

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: formatTime(new Date()),
      isRead: true
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setIsTyping(true);

    // 1. Try Local Fast Parsing Engine (Regex)
    let parsedResult: any = tryLocalRegexParser(userText);
    
    // 2. If local regex is not a perfect summary or general text, use Gemini Parser
    if (!parsedResult || (parsedResult.action === 'add_account' && parsedResult.data?.category === '📦 Outros')) {
      const aiResult = await callGeminiParser(userText);
      if (aiResult && aiResult.action !== 'unknown') {
        parsedResult = aiResult;
      }
    }

    // 3. Process the action
    let botReplyText = '';
    
    if (parsedResult) {
      const { action, data, reply } = parsedResult;

      if (action === 'add_account' && data) {
        const isRec = Boolean(data.isRecurrent);
        const isInst = Boolean(data.isInstallment);
        const totalInst = data.totalInstallments ? Number(data.totalInstallments) : 0;
        const currentInst = data.currentInstallment ? Number(data.currentInstallment) : 1;

        if (isInst && totalInst > 0) {
          // It's an installment series! Create physical entries for each installment month
          const baseDate = new Date(selectedDate);
          const installmentId = `inst-bot-${Date.now()}`;

          for (let i = 1; i <= totalInst; i++) {
            const currentDate = new Date(baseDate);
            // Distribute across months based on installment relation
            currentDate.setMonth(baseDate.getMonth() + (i - currentInst));

            // Past installments are marked paid, current/future pending
            const status = i < currentInst ? AccountStatus.PAID : AccountStatus.PENDING;

            await dataService.addAccount({
              id: `acc-bot-${Date.now()}-${i}`,
              groupId: activeGroupId,
              name: data.name,
              category: data.category || '📦 Outros',
              value: Number(data.value),
              totalValue: Number(data.value) * totalInst,
              status: status,
              isRecurrent: false,
              isInstallment: true,
              installmentId: installmentId,
              currentInstallment: i,
              totalInstallments: totalInst,
              paymentDate: currentDate.toISOString()
            });
          }

          botReplyText = reply || `Deixei anotado aqui, Jé! Adicionei a série de **${totalInst} parcelas** para *${data.name}* no valor de *R$ ${Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* cada (iniciando na parcela ${currentInst}). Elas já estão distribuídas nos respectivos meses! 🗓️`;
        } else {
          // Simple single account or recurrent template
          const targetPaymentDate = new Date(selectedDate);
          const now = new Date();
          targetPaymentDate.setDate(now.getDate());
          targetPaymentDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

          const newAccount: Account = {
            id: `acc-bot-${Date.now()}`,
            groupId: activeGroupId,
            name: data.name,
            category: data.category || '📦 Outros',
            value: Number(data.value),
            status: AccountStatus.PENDING,
            isRecurrent: isRec,
            isInstallment: false,
            paymentDate: isRec ? undefined : targetPaymentDate.toISOString()
          };
          await dataService.addAccount(newAccount);
          botReplyText = reply || `Deixei anotado aqui, Jé! Adicionei a despesa ${isRec ? '*recorrente*' : ''} *${data.name}* no valor de *R$ ${Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}* na categoria *${data.category}*.`;
        }
      } 
      else if (action === 'add_income' && data) {
        // Create actual income aligned to selected month
        const targetIncomeDate = new Date(selectedDate);
        const now = new Date();
        targetIncomeDate.setDate(now.getDate());
        targetIncomeDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        const newIncome: Income = {
          id: `inc-bot-${Date.now()}`,
          groupId: activeGroupId,
          name: data.name,
          value: Number(data.value),
          date: targetIncomeDate.toISOString(),
          isRecurrent: false
        };
        await dataService.addIncome(newIncome);
        botReplyText = reply || `Que ótimo, Jé! Registrei a entrada de *${data.name}* no valor de *R$ ${Number(data.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}*. 🎉`;
      } 
      else if (action === 'summary') {
        botReplyText = generateFinancialSummaryText();
      } 
      else {
        botReplyText = reply || `Não consegui entender completamente o valor ou item, Jé. Me conta bem rapidinho, tipo: *"Comprei lanche de 25 reais"* ou *"Recebi 150 reais"*! 🦦`;
      }
    } else {
      botReplyText = `Não consegui entender completamente o valor ou item, Jé. Me conta bem rapidinho, tipo: *"Comprei lanche de 25 reais"* ou *"Recebi 150 reais"*! 🦦`;
    }

    // Simulate typing delay
    setTimeout(() => {
      const newBotMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        timestamp: formatTime(new Date()),
        isRead: true
      };
      
      const finalMessages = [...updatedMessages, newBotMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
      setIsTyping(false);
    }, 1200);
  };

  const clearChatHistory = () => {
    if (window.confirm('Deseja limpar o histórico de conversas?')) {
      localStorage.removeItem('tatu_whatsapp_chat_history');
      loadDefaultWelcome();
    }
  };

  return (
    <div id="whatsapp-mobile-view" className="flex flex-col h-full w-full bg-[#efeae2] dark:bg-[#0b141a] rounded-none md:rounded-3xl overflow-hidden shadow-2xl border-0 md:border md:border-slate-200/60 dark:md:border-slate-800/60 transition-all duration-300 relative">
      
      {/* WhatsApp Header - Elegant dark slate/emerald header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-4 pt-[calc(1rem+env(safe-area-inset-top))] bg-[#075e54] dark:bg-[#1f2c34] text-white select-none shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 dark:bg-slate-700 flex items-center justify-center font-black text-xl text-primary overflow-hidden relative border border-white/20 shadow-inner">
            🦦
            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#075e54] dark:border-[#1f2c34] animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight flex items-center gap-1 text-slate-50">
              Tatu Zap Bot
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
            </h3>
            <p className="text-[10px] text-emerald-100/95 font-semibold tracking-wide">
              {isTyping ? 'digitando...' : 'online'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onSwitchToTraditional} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 transition-all rounded-full border border-white/10 text-[11px] font-black tracking-tight uppercase"
            title="Fechar Chat"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Fechar</span>
          </button>
          <div className="relative group">
            <button className="p-2 hover:bg-white/10 rounded-full active:scale-90 transition-colors text-white">
              <MoreVertical className="w-4 h-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-dark-surface border border-slate-100 dark:border-dark-border-color shadow-lg rounded-xl overflow-hidden py-1 z-50 min-w-[140px]">
              <button 
                onClick={clearChatHistory} 
                className="w-full text-left px-4 py-2.5 text-xs text-rose-500 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-dark-surface-light font-bold"
              >
                Limpar Conversa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Body (Message Lists) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 relative scrollbar-none no-scrollbar">
        {/* Subtle WhatsApp watermark background effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.015] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat" />

        <div className="flex justify-center my-1 relative z-10">
          <span className="bg-emerald-500/10 text-[#00a884] dark:text-[#00c298] text-[10px] font-semibold px-3 py-1 rounded-full border border-emerald-500/10 shadow-xs">
            🔒 Criptografado ponta a ponta
          </span>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, scale: 0.95, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`flex w-full relative z-10 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm text-[14px] leading-relaxed relative flex flex-col ${
                    isUser
                      ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-[#303030] dark:text-gray-100 rounded-tr-none shadow-xs'
                      : 'bg-white dark:bg-[#1f2c34] text-slate-800 dark:text-gray-100 rounded-tl-none border border-slate-100 dark:border-slate-800/20 shadow-[0_2px_8px_rgba(0,0,0,0.03)]'
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">{msg.text}</p>
                  
                  <div className="flex items-center justify-end gap-1 mt-1.5 self-end text-[10px] text-slate-400 dark:text-slate-500 select-none">
                    <span>{msg.timestamp}</span>
                    {isUser && (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-sky-400" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isTyping && (
          <div className="flex w-full justify-start relative z-10">
            <div className="bg-white dark:bg-[#1f2c34] rounded-2xl rounded-tl-none px-4 py-3 shadow-xs border border-slate-100 dark:border-slate-800/20">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#8696a0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* WhatsApp Input Footer - Styled elegantly, guaranteed visible send button */}
      <div className="shrink-0 bg-[#f0f2f5] dark:bg-[#111b21] px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col gap-2 z-10 relative">
        <form onSubmit={handleSend} className="flex items-center gap-2.5 w-full">
          <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-full flex items-center px-3.5 py-1.5 border border-slate-200/60 dark:border-slate-700/60 shadow-inner focus-within:ring-2 focus-within:ring-[#00a884]/30 focus-within:border-[#00a884] transition-all">
            <button type="button" className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <Smile className="w-5 h-5" />
            </button>
            
            <input
              type="text"
              className="flex-1 bg-transparent border-none outline-none py-1.5 px-2 text-sm text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold"
              placeholder="Digite uma mensagem..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <button type="button" className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
          </div>

          <button
            type="submit"
            className="w-12 h-12 rounded-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,168,132,0.3)] shrink-0"
            title="Enviar mensagem"
          >
            <Send className="w-5 h-5 ml-0.5 text-white" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default WhatsAppAssistant;
