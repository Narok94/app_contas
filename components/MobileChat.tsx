import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Edit2, Check, LayoutDashboard, Settings, PieChart, Menu, Sparkles, ArrowLeft } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { type User, type Account, type Income, AccountStatus } from '../types';
import * as dataService from '../services/dataService';

declare let process: any;

interface ParsedAccountData {
  id: string;
  name: string;
  value: number;
  category: string;
  paymentDate?: string;
  isConfirmed?: boolean;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  parsedAccount?: ParsedAccountData;
}

interface MobileChatProps {
  currentUser: User;
  activeGroupId: string;
  accounts: Account[];
  incomes: Income[];
  categories: string[];
  selectedDate: Date;
  onEditAccount: (acc: Account) => void;
  onBack?: () => void;
}

const MobileChat: React.FC<MobileChatProps> = ({
  currentUser,
  activeGroupId,
  accounts,
  incomes,
  categories,
  selectedDate,
  onEditAccount,
  onBack
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Interactive transaction state machine
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    name: string;
    value: number;
    isInstallment: boolean;
    currentInstallment?: number;
    totalInstallments?: number;
    step: 'status' | 'method';
    status?: AccountStatus;
  } | null>(null);

  useEffect(() => {
    const savedChat = localStorage.getItem('tatu_mobile_chat_history');
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (e) {
        loadDefaultWelcome();
      }
    } else {
      loadDefaultWelcome();
    }
    
    // Auto focus input when component mounts
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const loadDefaultWelcome = () => {
    const welcomeMsgs: Message[] = [];
    setMessages(welcomeMsgs);
    saveChatHistory(welcomeMsgs);
  };

  const saveChatHistory = (newMessages: Message[]) => {
    localStorage.setItem('tatu_mobile_chat_history', JSON.stringify(newMessages));
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function formatTime(date: Date) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  // Generate monthly financial summary text
  const generateFinancialSummaryText = (): string => {
    const totalPaid = accounts
      .filter(a => a.status === AccountStatus.PAID)
      .reduce((sum, a) => sum + a.value, 0);

    const totalPending = accounts
      .filter(a => a.status === AccountStatus.PENDING)
      .reduce((sum, a) => sum + a.value, 0);

    const totalExpenses = totalPaid + totalPending;
    const totalIncomes = incomes.reduce((sum, i) => sum + i.value, 0);
    const balance = totalIncomes - totalExpenses;

    return `📊 *Resumo de Contas do Mês*\n\n` +
           `💰 *Entradas Totais:* R$ ${totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
           `📉 *Despesas Totais:* R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
           `⭐ *Saldo Restante:* R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
           `Deseja adicionar mais alguma conta?`;
  };

  // Helper to add to temporary list ("Contas da Conversa") in localStorage
  const addConversationAccount = (name: string, value: number, status: AccountStatus, paymentMethod?: 'dinheiro' | 'credito') => {
    let list: any[] = [];
    const raw = localStorage.getItem('tatu_conversation_accounts');
    if (raw) {
      try {
        list = JSON.parse(raw);
      } catch (e) {}
    }
    const newItem = {
      id: `conv-acc-${Date.now()}-${Math.random()}`,
      groupId: activeGroupId,
      name,
      value,
      category: '📦 Outros',
      status,
      paymentMethod,
      createdAt: new Date().toISOString()
    };
    list.push(newItem);
    localStorage.setItem('tatu_conversation_accounts', JSON.stringify(list));
    window.dispatchEvent(new Event('tatu_conversation_accounts_updated'));
  };

  // Helper to add installment series directly to main accounts database
  const handleAddInstallmentDirectly = async (
    name: string,
    value: number,
    current: number,
    total: number,
    status: AccountStatus
  ) => {
    const installmentId = `inst-${Date.now()}`;
    const baseDate = new Date(selectedDate);
    
    for (let i = current; i <= total; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setMonth(baseDate.getMonth() + (i - current));
      
      const installmentStatus = (i === current) ? status : AccountStatus.PENDING;
      
      const installmentAccount: Account = {
        id: `acc-bot-${Date.now()}-${i}`,
        groupId: activeGroupId,
        name: name,
        category: '📦 Outros',
        value: value,
        isRecurrent: false,
        isInstallment: true,
        installmentId: installmentId,
        currentInstallment: i,
        totalInstallments: total,
        status: installmentStatus,
        paymentDate: currentDate.toISOString()
      };
      await dataService.addAccount(installmentAccount);
    }
  };

  // Dual-mode parsing: 100% optimized regex transaction detection
  const tryParseTransaction = (text: string) => {
    const trimmed = text.trim();
    
    // 1. Try installment regex: [name] [value] [current]/[total]
    // e.g. "teste 999 1/5" or "Compra lanche 25,50 1/3"
    const installmentRegex = /^(.+?)\s+([\d.,]+)\s+(\d+)\s*[\/\\]\s*(\d+)\s*$/i;
    const instMatch = trimmed.match(installmentRegex);
    if (instMatch) {
      const name = instMatch[1].trim();
      const rawVal = instMatch[2].replace(',', '.');
      const value = parseFloat(rawVal);
      const current = parseInt(instMatch[3], 10);
      const total = parseInt(instMatch[4], 10);
      
      if (!isNaN(value) && !isNaN(current) && !isNaN(total)) {
        return {
          name,
          value,
          isInstallment: true,
          currentInstallment: current,
          totalInstallments: total
        };
      }
    }
    
    // 2. Try regular regex: [name] [value]
    // e.g. "teste 999" or "lanche 25.50"
    const regularRegex = /^(.+?)\s+([\d.,]+)\s*$/i;
    const regMatch = trimmed.match(regularRegex);
    if (regMatch) {
      const name = regMatch[1].trim();
      const rawVal = regMatch[2].replace(',', '.');
      const value = parseFloat(rawVal);
      
      if (!isNaN(value)) {
        return {
          name,
          value,
          isInstallment: false
        };
      }
    }
    
    return null;
  };

  const handleOptionSelect = async (option: 'pago' | 'pendente' | 'dinheiro' | 'credito') => {
    if (!pendingConfirmation) return;

    setIsTyping(true);
    const current = pendingConfirmation;

    // 1. Add user message
    let userText = '';
    if (option === 'pago') userText = 'Já foi paga';
    else if (option === 'pendente') userText = 'Adicionar como pendente';
    else if (option === 'dinheiro') userText = 'Dinheiro';
    else if (option === 'credito') userText = 'Crédito';

    const newUserMsg: Message = {
      id: `user-opt-${Date.now()}`,
      sender: 'user',
      text: userText,
      timestamp: formatTime(new Date()),
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);

    // 2. State machine processing
    if (current.step === 'status') {
      if (option === 'pago') {
        setPendingConfirmation({
          ...current,
          step: 'method',
          status: AccountStatus.PAID
        });
        
        setTimeout(() => {
          const newBotMsg: Message = {
            id: `bot-opt-${Date.now()}`,
            sender: 'bot',
            text: `Perfeito! Foi paga no dinheiro ou no crédito?`,
            timestamp: formatTime(new Date()),
          };
          const final = [...updatedMessages, newBotMsg];
          setMessages(final);
          saveChatHistory(final);
          setIsTyping(false);
        }, 600);
      } else {
        // 'pendente'
        if (current.isInstallment) {
          await handleAddInstallmentDirectly(
            current.name,
            current.value,
            current.currentInstallment || 1,
            current.totalInstallments || 1,
            AccountStatus.PENDING
          );
        } else {
          addConversationAccount(current.name, current.value, AccountStatus.PENDING);
        }

        setPendingConfirmation(null);

        setTimeout(() => {
          const text = current.isInstallment 
            ? `Entendido! O parcelamento de **${current.name}** (${current.currentInstallment}/${current.totalInstallments}) de R$ ${current.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi adicionado como **PENDENTE** diretamente na planilha principal.`
            : `Entendido! A conta **${current.name}** de R$ ${current.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi adicionada como **PENDENTE** na listagem de contas da conversa.`;

          const newBotMsg: Message = {
            id: `bot-opt-${Date.now()}`,
            sender: 'bot',
            text,
            timestamp: formatTime(new Date()),
          };
          const final = [...updatedMessages, newBotMsg];
          setMessages(final);
          saveChatHistory(final);
          setIsTyping(false);
        }, 600);
      }
    } else if (current.step === 'method') {
      if (option === 'dinheiro') {
        if (current.isInstallment) {
          await handleAddInstallmentDirectly(
            current.name,
            current.value,
            current.currentInstallment || 1,
            current.totalInstallments || 1,
            AccountStatus.PAID
          );
        } else {
          addConversationAccount(current.name, current.value, AccountStatus.PAID, 'dinheiro');
        }

        setPendingConfirmation(null);

        setTimeout(() => {
          const text = current.isInstallment
            ? `Tudo certo! O parcelamento de **${current.name}** (${current.currentInstallment}/${current.totalInstallments}) de R$ ${current.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi adicionado como **PAGO (Dinheiro)** diretamente na planilha principal.`
            : `Adicionado! A conta **${current.name}** de R$ ${current.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi incluída na listagem de contas da conversa como **Pago no Dinheiro**.`;

          const newBotMsg: Message = {
            id: `bot-opt-${Date.now()}`,
            sender: 'bot',
            text,
            timestamp: formatTime(new Date()),
          };
          const final = [...updatedMessages, newBotMsg];
          setMessages(final);
          saveChatHistory(final);
          setIsTyping(false);
        }, 600);
      } else if (option === 'credito') {
        if (current.isInstallment) {
          await handleAddInstallmentDirectly(
            current.name,
            current.value,
            current.currentInstallment || 1,
            current.totalInstallments || 1,
            AccountStatus.PAID
          );
        } else {
          addConversationAccount(current.name, current.value, AccountStatus.PAID, 'credito');
        }

        setPendingConfirmation(null);

        setTimeout(() => {
          const text = current.isInstallment
            ? `Tudo certo! O parcelamento de **${current.name}** (${current.currentInstallment}/${current.totalInstallments}) de R$ ${current.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi adicionado como **PAGO (Crédito)** diretamente na planilha principal.`
            : `Adicionado! A conta **${current.name}** de R$ ${current.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi incluída na listagem de contas da conversa como **Pago no Crédito**.`;

          const newBotMsg: Message = {
            id: `bot-opt-${Date.now()}`,
            sender: 'bot',
            text,
            timestamp: formatTime(new Date()),
          };
          const final = [...updatedMessages, newBotMsg];
          setMessages(final);
          saveChatHistory(final);
          setIsTyping(false);
        }, 600);
      }
    }
  };

  const callGeminiParser = async (text: string, chatHistory: Message[]) => {
    const apiKey = process.env.API_KEY || '';
    if (!apiKey) {
      return { action: 'unknown', reply: 'Configuração da API ausente.' };
    }
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      
      const historyContext = chatHistory.slice(-6).map(m => `${m.sender === 'user' ? 'Usuário' : 'Assistente'}: ${m.text}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Histórico recente:\n${historyContext}\n\nMensagem atual do usuário: "${text}"\nAnalise o contexto e a mensagem e extraia a ação.`,
        config: {
          systemInstruction: `Você é um assistente financeiro direto e objetivo.
          Categorias disponíveis: ${JSON.stringify(categories)}.
          
          Regras para despesas:
          1. Sempre que o usuário registrar uma despesa, verifique se ele informou a forma de pagamento (cartão, dinheiro, pix, etc.).
          2. Se a forma de pagamento NÃO for informada, retorne a action "ask_info" e no campo "reply" pergunte de forma direta e concisa: "Qual foi a forma de pagamento (cartão, dinheiro, pix)?"
          3. Se a forma de pagamento FOI informada, retorne a action "add_account". No campo "name", inclua a forma de pagamento, ex: "Supermercado (Cartão)". No campo "reply" confirme apenas com: "Conta adicionada."
          
          Responda sempre apenas neste JSON:
          {
            "action": "add_account" | "add_income" | "summary" | "ask_info" | "unknown",
            "data": { "name": "nome da conta", "value": 150.00, "category": "categoria" },
            "reply": "Resposta direta e curta."
          }
          `,
          responseMimeType: 'application/json'
        }
      });
      const jsonStr = response.text?.trim() || '{}';
      return JSON.parse(jsonStr);
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
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setIsTyping(true);

    // 1. If currently waiting for confirmation step
    if (pendingConfirmation) {
      const lower = userText.toLowerCase().trim();
      if (pendingConfirmation.step === 'status') {
        if (lower.includes('pago') || lower.includes('paga') || lower === 'sim' || lower === 's') {
          await handleOptionSelect('pago');
          return;
        } else if (lower.includes('pendente') || lower.includes('não') || lower.includes('nao') || lower === 'n') {
          await handleOptionSelect('pendente');
          return;
        }
      } else if (pendingConfirmation.step === 'method') {
        if (lower.includes('dinheiro') || lower.includes('vista') || lower.includes('visto') || lower.includes('pix')) {
          await handleOptionSelect('dinheiro');
          return;
        } else if (lower.includes('crédito') || lower.includes('credito') || lower.includes('cartão') || lower.includes('cartao') || lower.includes('card')) {
          await handleOptionSelect('credito');
          return;
        }
      }
    }

    // 2. Try to parse new transaction (regex-based fast path)
    const parsed = tryParseTransaction(userText);
    if (parsed) {
      setPendingConfirmation({
        name: parsed.name,
        value: parsed.value,
        isInstallment: parsed.isInstallment,
        currentInstallment: parsed.currentInstallment,
        totalInstallments: parsed.totalInstallments,
        step: 'status'
      });

      const botText = `A compra de **${parsed.name}** no valor de **R$ ${parsed.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** ${parsed.isInstallment ? `(parcela ${parsed.currentInstallment}/${parsed.totalInstallments})` : ''} já foi paga ou quer adicionar como pendente?`;
      
      setTimeout(() => {
        const newBotMessage: Message = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: botText,
          timestamp: formatTime(new Date()),
        };
        const finalMessages = [...updatedMessages, newBotMessage];
        setMessages(finalMessages);
        saveChatHistory(finalMessages);
        setIsTyping(false);
      }, 600);
      return;
    }

    // 3. Fallback to Gemini Parser
    const parsedResult = await callGeminiParser(userText, messages);
    let botReplyText = '';
    let parsedAccountData: ParsedAccountData | undefined;

    if (parsedResult) {
      const { action, data, reply } = parsedResult;

      if (action === 'add_account' && data) {
        const targetPaymentDate = new Date(selectedDate);
        const newAccountId = `acc-bot-${Date.now()}`;
        const newAccount: Account = {
          id: newAccountId,
          groupId: activeGroupId,
          name: data.name,
          category: data.category || '📦 Outros',
          value: Number(data.value),
          status: AccountStatus.PENDING,
          isRecurrent: false,
          isInstallment: false,
          paymentDate: targetPaymentDate.toISOString()
        };
        await dataService.addAccount(newAccount);
        botReplyText = reply || 'Conta adicionada.';
        parsedAccountData = {
          id: newAccountId,
          name: data.name,
          value: Number(data.value),
          category: data.category || '📦 Outros',
          paymentDate: targetPaymentDate.toISOString(),
          isConfirmed: false
        };
      } 
      else if (action === 'add_income' && data) {
        const targetIncomeDate = new Date(selectedDate);
        const newIncome: Income = {
          id: `inc-bot-${Date.now()}`,
          groupId: activeGroupId,
          name: data.name,
          value: Number(data.value),
          date: targetIncomeDate.toISOString(),
          isRecurrent: false
        };
        await dataService.addIncome(newIncome);
        botReplyText = reply || `Receita de ${data.name} adicionada!`;
      } 
      else if (action === 'summary') {
        botReplyText = generateFinancialSummaryText();
      } 
      else {
        botReplyText = reply || `Não entendi. Pode tentar de novo?`;
      }
    } else {
      botReplyText = `Não entendi. Pode tentar de novo?`;
    }

    setTimeout(() => {
      const newBotMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: botReplyText,
        timestamp: formatTime(new Date()),
        parsedAccount: parsedAccountData
      };
      
      const finalMessages = [...updatedMessages, newBotMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
      setIsTyping(false);
    }, 800);
  };

  const handleConfirmAccount = (msgId: string) => {
    setMessages(prev => {
        const newMsgs = prev.map(m => {
            if (m.id === msgId && m.parsedAccount) {
                return { ...m, parsedAccount: { ...m.parsedAccount, isConfirmed: true } };
            }
            return m;
        });
        saveChatHistory(newMsgs);
        return newMsgs;
    });
  };

  const handleEditParsedAccount = (accountId: string) => {
    const acc = accounts.find(a => a.id === accountId);
    if (acc) onEditAccount(acc);
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-[#FAF8F5] relative font-sans">
      {/* Header */}
      <div className="bg-[#D8875D] px-4 py-4 flex items-center gap-3 z-10 shadow-sm shrink-0 rounded-b-3xl">
        {onBack && (
          <button 
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center shrink-0 rounded-full text-white active:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg leading-tight">Assistente Tatu</h1>
          <p className="text-white/80 text-xs font-medium">Online e pronto para anotar</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-none no-scrollbar pb-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            
            if (isUser) {
                return (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-end w-full"
                    >
                        <div className="max-w-[85%] bg-[#D8875D] text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-sm">
                            <div className="text-[15px] leading-relaxed font-medium">
                                {msg.text}
                            </div>
                            <div className="text-right text-[10px] text-white/70 mt-1 font-medium flex items-center justify-end gap-1">
                                {msg.timestamp}
                                <Check className="w-3 h-3 text-white/70" />
                            </div>
                        </div>
                    </motion.div>
                );
            }

            // Bot Message
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start w-full"
              >
                <div className="max-w-[85%]">
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100">
                        <div className="text-[15px] text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                            {msg.text}
                        </div>
                        <div className="text-left text-[10px] text-slate-400 mt-1 font-medium">
                            {msg.timestamp}
                        </div>
                    </div>
                    
                    {msg.parsedAccount && (
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 w-full mt-2">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#F6EFE9] flex items-center justify-center text-[#D8875D] shrink-0">
                                        <span className="text-xl leading-none">
                                            {msg.parsedAccount.category.split(' ')[0]}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-[15px] leading-tight">{msg.parsedAccount.name}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">{msg.parsedAccount.category.substring(2).trim()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-800 text-[16px]">
                                        {msg.parsedAccount.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 w-full pt-1">
                                <button 
                                    onClick={() => handleEditParsedAccount(msg.parsedAccount!.id)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[13px] flex items-center justify-center gap-1.5 active:bg-slate-50 transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Editar
                                </button>
                                <button 
                                    onClick={() => handleConfirmAccount(msg.id)}
                                    disabled={msg.parsedAccount.isConfirmed}
                                    className={`flex-1 py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 transition-colors ${msg.parsedAccount.isConfirmed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-[#D8875D] text-white shadow-sm active:bg-[#C97A56]'}`}
                                >
                                    <Check className="w-4 h-4" />
                                    {msg.parsedAccount.isConfirmed ? 'Confirmado' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isTyping && (
          <div className="flex justify-start w-full">
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100 flex items-center gap-1.5 h-[42px]">
                <span className="w-1.5 h-1.5 bg-[#D8875D]/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#D8875D]/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#D8875D]/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="w-full shrink-0 px-6 py-4 bg-[#FAF8F5] z-20 border-t border-slate-100/50">
        {pendingConfirmation && (
          <div className="flex gap-2 mb-3 overflow-x-auto py-1 no-scrollbar justify-center">
            {pendingConfirmation.step === 'status' ? (
              <>
                <button
                  type="button"
                  onClick={() => handleOptionSelect('pago')}
                  className="px-4 py-2 bg-[#D8875D] hover:bg-[#c4774f] text-white rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                >
                  Já foi paga
                </button>
                <button
                  type="button"
                  onClick={() => handleOptionSelect('pendente')}
                  className="px-4 py-2 bg-white text-[#D8875D] border border-[#D8875D]/20 hover:bg-[#D8875D]/5 rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                >
                  Adicionar como pendente
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleOptionSelect('dinheiro')}
                  className="px-4 py-2 bg-[#D8875D] hover:bg-[#c4774f] text-white rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                >
                  Dinheiro / À Vista
                </button>
                <button
                  type="button"
                  onClick={() => handleOptionSelect('credito')}
                  className="px-4 py-2 bg-white text-[#D8875D] border border-[#D8875D]/20 hover:bg-[#D8875D]/5 rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                >
                  Cartão de Crédito
                </button>
              </>
            )}
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2">
            <div className="w-12 h-12 shrink-0 bg-white rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.03)] border border-slate-100 text-[#D8875D]">
                <Sparkles className="w-5 h-5" />
            </div>
            
            <div className="flex-1 h-14 bg-white rounded-full flex items-center px-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)] border border-slate-100 focus-within:border-[#D8875D]/30 focus-within:ring-2 focus-within:ring-[#D8875D]/10 transition-all">
                <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent border-none outline-none text-[15px] text-slate-800 placeholder:text-slate-400 font-medium h-full"
                placeholder="Digite uma mensagem..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                />
            </div>
            
            <button
                type="submit"
                className="w-14 h-14 shrink-0 rounded-full bg-[#D8875D] text-white flex items-center justify-center active:scale-95 transition-all shadow-[0_4px_15px_rgba(216,135,93,0.3)]"
            >
                <Send className="w-6 h-6 ml-1" />
            </button>
        </form>
      </div>

    </div>
  );
};

export default MobileChat;
