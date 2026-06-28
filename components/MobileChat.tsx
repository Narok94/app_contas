import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Mic,
  Edit2,
  Check,
  LayoutDashboard,
  Settings,
  PieChart,
  Menu,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  List,
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { type User, type Account, type Income, AccountStatus } from "../types";
import * as dataService from "../services/dataService";

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
  sender: "user" | "bot";
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
  onBack,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"chat" | "contas">("chat");

  const conversationAccounts = useMemo(() => {
    return accounts
      .filter((acc) => acc.category?.startsWith("💬 Conversa"))
      .sort(
        (a, b) =>
          new Date(b.paymentDate || 0).getTime() -
          new Date(a.paymentDate || 0).getTime(),
      );
  }, [accounts]);

  // Interactive transaction state machine
  const [pendingConfirmation, setPendingConfirmation] = useState<{
    name: string;
    value: number;
    isInstallment: boolean;
    currentInstallment?: number;
    totalInstallments?: number;
    step: "status" | "method";
    status?: AccountStatus;
  } | null>(null);

  useEffect(() => {
    const savedChat = localStorage.getItem("tatu_mobile_chat_history");
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
    localStorage.setItem(
      "tatu_mobile_chat_history",
      JSON.stringify(newMessages),
    );
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  function formatTime(date: Date) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    setShowScrollTop(scrollTop > 200);
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 100);
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Generate monthly financial summary text
  const generateFinancialSummaryText = (): string => {
    const totalPaid = accounts
      .filter((a) => a.status === AccountStatus.PAID)
      .reduce((sum, a) => sum + a.value, 0);

    const totalPending = accounts
      .filter((a) => a.status === AccountStatus.PENDING)
      .reduce((sum, a) => sum + a.value, 0);

    const totalExpenses = totalPaid + totalPending;
    const totalIncomes = incomes.reduce((sum, i) => sum + i.value, 0);
    const balance = totalIncomes - totalExpenses;

    return (
      `📊 *Resumo de Contas do Mês*\n\n` +
      `💰 *Entradas Totais:* R$ ${totalIncomes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
      `📉 *Despesas Totais:* R$ ${totalExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n` +
      `⭐ *Saldo Restante:* R$ ${balance.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n\n` +
      `Deseja adicionar mais alguma conta?`
    );
  };

  // Helper to add to temporary list ("Contas da Conversa") in Database
  const addConversationAccount = async (
    name: string,
    value: number,
    status: AccountStatus,
    paymentMethod?: "dinheiro" | "credito",
  ) => {
    let category = "💬 Conversa - Pendente";
    if (status === AccountStatus.PAID) {
      if (paymentMethod === "dinheiro") {
        category = "💬 Conversa - Dinheiro";
      } else if (paymentMethod === "credito") {
        category = "💬 Conversa - Crédito";
      }
    }

    const newAccount: Account = {
      id: `conv-acc-${Date.now()}-${Math.random()}`,
      groupId: activeGroupId,
      name,
      category,
      value,
      status: AccountStatus.PENDING,
      isRecurrent: false,
      isInstallment: false,
      paymentDate: new Date().toISOString(),
    };

    try {
      await dataService.addAccount(newAccount);
    } catch (err) {
      console.error("Erro ao adicionar conta de conversa:", err);
    }
  };

  // Helper to add installment series directly to main accounts database
  const handleAddInstallmentDirectly = async (
    name: string,
    value: number,
    current: number,
    total: number,
    status: AccountStatus,
  ) => {
    const installmentId = `inst-${Date.now()}`;
    const baseDate = new Date(selectedDate);

    for (let i = current; i <= total; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setMonth(baseDate.getMonth() + (i - current));

      const installmentStatus = i === current ? status : AccountStatus.PENDING;

      const installmentAccount: Account = {
        id: `acc-bot-${Date.now()}-${i}`,
        groupId: activeGroupId,
        name: name,
        category: "📦 Outros",
        value: value,
        isRecurrent: false,
        isInstallment: true,
        installmentId: installmentId,
        currentInstallment: i,
        totalInstallments: total,
        status: installmentStatus,
        paymentDate: currentDate.toISOString(),
      };
      await dataService.addAccount(installmentAccount);
    }
  };

  // Dual-mode parsing: 100% optimized regex transaction detection
  const tryParseTransaction = (text: string) => {
    let trimmed = text.trim();
    trimmed = trimmed.replace(/^(comprei|gastei|paguei)\s+/i, "");

    // 1. Try installment regex: [name] [value] [current]/[total]
    // e.g. "teste 999 1/5" or "Compra lanche 25,50 1/3" or "Comprei bala por 5 reais 1/2"
    const installmentRegex =
      /^(.*?)\s+(?:por\s+|custou\s+|de\s+)?(?:r\$\s*)?([\d.,]+)(?:\s*(?:reais|conto|pila))?\s*(?:em\s+)?(\d+)\s*[\/\\]\s*(\d+)\s*$/i;
    const instMatch = trimmed.match(installmentRegex);
    if (instMatch) {
      const name = instMatch[1].trim();
      const rawVal = instMatch[2].replace(",", ".");
      const value = parseFloat(rawVal);
      const current = parseInt(instMatch[3], 10);
      const total = parseInt(instMatch[4], 10);

      if (!isNaN(value) && !isNaN(current) && !isNaN(total)) {
        return {
          name: name || "Compra",
          value,
          isInstallment: true,
          currentInstallment: current,
          totalInstallments: total,
        };
      }
    }

    // 2. Try regular regex: [name] [value]
    // e.g. "teste 999" or "lanche 25.50" or "bala 5 reais"
    const regularRegex =
      /^(.*?)\s+(?:por\s+|custou\s+|de\s+)?(?:r\$\s*)?([\d.,]+)(?:\s*(?:reais|conto|pila))?\s*$/i;
    const regMatch = trimmed.match(regularRegex);
    if (regMatch) {
      const name = regMatch[1].trim();
      const rawVal = regMatch[2].replace(",", ".");
      const value = parseFloat(rawVal);

      if (!isNaN(value)) {
        return {
          name: name || "Compra",
          value,
          isInstallment: false,
        };
      }
    }

    // 3. Fallback for X reais if first words are comprei, paguei
    const fallbackMatch = text.match(
      /^(?:comprei|paguei|gastei)\s+(?:com\s+|um\s+|uma\s+)?(.*?)\s*([\d.,]+)\s*(?:reais|conto|pila)?$/i,
    );
    if (fallbackMatch) {
      const name = fallbackMatch[1].trim();
      const rawVal = fallbackMatch[2].replace(",", ".");
      const value = parseFloat(rawVal);
      if (!isNaN(value)) {
        return { name: name || "Compra", value, isInstallment: false };
      }
    }

    return null;
  };

  const handleOptionSelect = async (
    option: "pago" | "pendente" | "dinheiro" | "credito",
  ) => {
    if (!pendingConfirmation) return;

    setIsTyping(true);
    const current = pendingConfirmation;

    // 1. Add user message
    let userText = "";
    if (option === "pago") userText = "Já foi paga";
    else if (option === "pendente") userText = "Adicionar como pendente";
    else if (option === "dinheiro") userText = "Dinheiro";
    else if (option === "credito") userText = "Crédito";

    const newUserMsg: Message = {
      id: `user-opt-${Date.now()}`,
      sender: "user",
      text: userText,
      timestamp: formatTime(new Date()),
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);

    // 2. State machine processing
    if (current.step === "status") {
      if (option === "pago") {
        setPendingConfirmation({
          ...current,
          step: "method",
          status: AccountStatus.PAID,
        });

        setTimeout(() => {
          const newBotMsg: Message = {
            id: `bot-opt-${Date.now()}`,
            sender: "bot",
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
            AccountStatus.PENDING,
          );
        } else {
          await addConversationAccount(
            current.name,
            current.value,
            AccountStatus.PENDING,
          );
        }

        setPendingConfirmation(null);

        setTimeout(() => {
          const text = "Anotado no caderno:";

          const newBotMsg: Message = {
            id: `bot-opt-${Date.now()}`,
            sender: "bot",
            text,
            timestamp: formatTime(new Date()),
            parsedAccount: {
              id: `acc-conv-${Date.now()}`,
              name: current.name,
              value: current.value,
              category: "📦 Outros",
              paymentDate: new Date().toISOString(),
              isConfirmed: true,
            },
          };
          const final = [...updatedMessages, newBotMsg];
          setMessages(final);
          saveChatHistory(final);
          setIsTyping(false);
        }, 600);
      }
    } else if (current.step === "method") {
      if (option === "dinheiro") {
        if (current.isInstallment) {
          await handleAddInstallmentDirectly(
            current.name,
            current.value,
            current.currentInstallment || 1,
            current.totalInstallments || 1,
            AccountStatus.PAID,
          );
        } else {
          await addConversationAccount(
            current.name,
            current.value,
            AccountStatus.PAID,
            "dinheiro",
          );
        }

        setPendingConfirmation(null);

        setTimeout(() => {
          const text = "Anotado no caderno:";

          const newBotMsg: Message = {
            id: `bot-opt-${Date.now()}`,
            sender: "bot",
            text,
            timestamp: formatTime(new Date()),
            parsedAccount: {
              id: `acc-conv-${Date.now()}`,
              name: current.name,
              value: current.value,
              category: "💵 Dinheiro",
              paymentDate: new Date().toISOString(),
              isConfirmed: true,
            },
          };
          const final = [...updatedMessages, newBotMsg];
          setMessages(final);
          saveChatHistory(final);
          setIsTyping(false);
        }, 600);
      } else if (option === "credito") {
        if (current.isInstallment) {
          await handleAddInstallmentDirectly(
            current.name,
            current.value,
            current.currentInstallment || 1,
            current.totalInstallments || 1,
            AccountStatus.PAID,
          );
        } else {
          await addConversationAccount(
            current.name,
            current.value,
            AccountStatus.PAID,
            "credito",
          );
        }

        setPendingConfirmation(null);

        setTimeout(() => {
          const text = "Anotado no caderno:";

          const newBotMsg: Message = {
            id: `bot-opt-${Date.now()}`,
            sender: "bot",
            text,
            timestamp: formatTime(new Date()),
            parsedAccount: {
              id: `acc-conv-${Date.now()}`,
              name: current.name,
              value: current.value,
              category: "💳 Crédito",
              paymentDate: new Date().toISOString(),
              isConfirmed: true,
            },
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
    let apiKey = "";
    try {
      apiKey = process.env.API_KEY || "";
    } catch (e) {}

    if (!apiKey) {
      return null;
    }
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const historyContext = chatHistory
        .slice(-6)
        .map(
          (m) => `${m.sender === "user" ? "Usuário" : "Assistente"}: ${m.text}`,
        )
        .join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Histórico recente:\n${historyContext}\n\nMensagem atual do usuário: "${text}"\nAnalise o contexto e a mensagem e extraia a ação.`,
        config: {
          systemInstruction: `Você é um assistente financeiro direto e objetivo.
          Categorias disponíveis: ${JSON.stringify(categories)}.
          
          Sempre que o usuário registrar uma despesa, extraia o nome e o valor e retorne a action "add_account" ignorando a forma de pagamento (o sistema perguntará depois).
          Se for uma receita, retorne "add_income".
          Para pedir um resumo financeiro, retorne "summary".
          
          Responda sempre apenas neste JSON:
          {
            "action": "add_account" | "add_income" | "summary" | "unknown",
            "data": { "name": "nome da conta", "value": 150.00, "category": "categoria" },
            "reply": "Resposta direta e curta."
          }
          `,
          responseMimeType: "application/json",
        },
      });
      const jsonStr = response.text?.trim() || "{}";
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Gemini Parsing Error:", e);
      return null;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue;
    setInputValue("");

    const newUserMessage: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
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
      if (pendingConfirmation.step === "status") {
        if (
          lower.includes("pago") ||
          lower.includes("paga") ||
          lower === "sim" ||
          lower === "s"
        ) {
          await handleOptionSelect("pago");
          return;
        } else if (
          lower.includes("pendente") ||
          lower.includes("não") ||
          lower.includes("nao") ||
          lower === "n"
        ) {
          await handleOptionSelect("pendente");
          return;
        }
      } else if (pendingConfirmation.step === "method") {
        if (
          lower.includes("dinheiro") ||
          lower.includes("vista") ||
          lower.includes("visto") ||
          lower.includes("pix")
        ) {
          await handleOptionSelect("dinheiro");
          return;
        } else if (
          lower.includes("crédito") ||
          lower.includes("credito") ||
          lower.includes("cartão") ||
          lower.includes("cartao") ||
          lower.includes("card")
        ) {
          await handleOptionSelect("credito");
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
        step: "status",
      });

      const botText = `A compra de ${parsed.name} no valor de R$ ${parsed.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} ${parsed.isInstallment ? `(parcela ${parsed.currentInstallment}/${parsed.totalInstallments})` : ""} já foi paga ou quer adicionar como pendente?`;

      setTimeout(() => {
        const newBotMessage: Message = {
          id: `bot-${Date.now()}`,
          sender: "bot",
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
    let botReplyText = "";
    let parsedAccountData: ParsedAccountData | undefined;

    if (parsedResult) {
      const { action, data, reply } = parsedResult;

      if (action === "add_account" && data) {
        setPendingConfirmation({
          name: data.name,
          value: Number(data.value),
          isInstallment: false,
          step: "status",
        });

        const botText = `A compra de ${data.name} no valor de R$ ${Number(data.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} já foi paga ou quer adicionar como pendente?`;

        setTimeout(() => {
          const newBotMessage: Message = {
            id: `bot-${Date.now()}`,
            sender: "bot",
            text: botText,
            timestamp: formatTime(new Date()),
          };
          const finalMessages = [...updatedMessages, newBotMessage];
          setMessages(finalMessages);
          saveChatHistory(finalMessages);
          setIsTyping(false);
        }, 600);
        return;
      } else if (action === "add_income" && data) {
        const targetIncomeDate = new Date(selectedDate);
        const newIncome: Income = {
          id: `inc-bot-${Date.now()}`,
          groupId: activeGroupId,
          name: data.name,
          value: Number(data.value),
          date: targetIncomeDate.toISOString(),
          isRecurrent: false,
        };
        await dataService.addIncome(newIncome);
        botReplyText = reply || `Receita de ${data.name} adicionada!`;
      } else if (action === "summary") {
        botReplyText = generateFinancialSummaryText();
      } else {
        botReplyText = reply || `Não entendi. Pode tentar de novo?`;
      }
    } else {
      botReplyText = `Não entendi. Pode tentar de novo?`;
    }

    setTimeout(() => {
      const newBotMessage: Message = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: botReplyText,
        timestamp: formatTime(new Date()),
        parsedAccount: parsedAccountData,
      };

      const finalMessages = [...updatedMessages, newBotMessage];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
      setIsTyping(false);
    }, 800);
  };

  const handleConfirmAccount = (msgId: string) => {
    setMessages((prev) => {
      const newMsgs = prev.map((m) => {
        if (m.id === msgId && m.parsedAccount) {
          return {
            ...m,
            parsedAccount: { ...m.parsedAccount, isConfirmed: true },
          };
        }
        return m;
      });
      saveChatHistory(newMsgs);
      return newMsgs;
    });
  };

  const handleEditParsedAccount = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId);
    if (acc) onEditAccount(acc);
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#fdfbf7] relative font-sans overflow-hidden">
      {/* Header */}
      <div
        className="bg-[#D8875D] px-4 pb-2 pt-4 flex flex-col gap-3 z-10 shadow-sm shrink-0 rounded-b-3xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <div className="flex items-center gap-3">
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
            <h1 className="text-white font-bold text-lg leading-tight">
              Caderno do Tatu
            </h1>
            <p className="text-white/80 text-xs font-medium">
              Suas anotações financeiras
            </p>
          </div>
        </div>

        <div className="flex bg-white/20 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === "chat"
                ? "bg-white text-[#D8875D] shadow-sm"
                : "text-white/80 hover:text-white"
            }`}
          >
            Histórico
          </button>
          <button
            onClick={() => setActiveTab("contas")}
            className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "contas"
                ? "bg-white text-[#D8875D] shadow-sm"
                : "text-white/80 hover:text-white"
            }`}
          >
            Contas
            {conversationAccounts.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] leading-none ${activeTab === "contas" ? "bg-[#D8875D] text-white" : "bg-white text-[#D8875D]"}`}
              >
                {conversationAccounts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === "chat" ? (
        <>
          {/* Messages Area - Notebook Lines */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-2 relative"
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent, transparent 39px, #cbd5e1 39px, #cbd5e1 40px)",
              backgroundSize: "100% 40px",
              backgroundAttachment: "local",
              backgroundPosition: "0 28px",
            }}
          >
            <div className="absolute left-10 top-0 bottom-0 w-[2px] bg-red-300/40 pointer-events-none" />

            <div className="pl-12 pr-4 pt-0 relative z-10 min-h-full flex flex-col">
              <AnimatePresence initial={false}>
                {messages.map((msg) => {
                  const isUser = msg.sender === "user";

                  if (isUser) {
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full flex justify-end mb-0"
                      >
                        <div className="text-[22px] leading-[40px] text-blue-700 font-handwriting break-words max-w-[90%] -rotate-1">
                          {msg.text}
                        </div>
                      </motion.div>
                    );
                  }

                  // Bot Message
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="w-full flex flex-col items-start mb-0"
                    >
                      <div className="text-[22px] leading-[40px] text-slate-800 font-handwriting break-words max-w-[95%]">
                        {msg.text}
                      </div>

                      {msg.parsedAccount &&
                        (msg.parsedAccount.isConfirmed ? (
                          <div className="w-full max-w-[95%] flex justify-between items-center font-handwriting leading-[40px]">
                            <span className="text-[22px] text-slate-800">
                              - {msg.parsedAccount.name}
                            </span>
                            <span className="text-[22px] text-slate-800 flex items-center gap-2">
                              {msg.parsedAccount.value.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                              <Check className="w-5 h-5 text-emerald-600" />
                            </span>
                          </div>
                        ) : (
                          <div className="bg-white/95 px-3 py-2 rounded-lg shadow-sm border border-slate-200 w-full max-w-[90%] my-0 h-[120px] flex flex-col justify-between rotate-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-slate-800 text-[15px]">
                                  {msg.parsedAccount.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {msg.parsedAccount.category
                                    .substring(2)
                                    .trim()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-800 text-[16px]">
                                  {msg.parsedAccount.value.toLocaleString(
                                    "pt-BR",
                                    {
                                      style: "currency",
                                      currency: "BRL",
                                    },
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2 w-full pt-1">
                              <button
                                onClick={() =>
                                  handleEditParsedAccount(msg.parsedAccount!.id)
                                }
                                className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-[13px] flex items-center justify-center gap-1.5 active:bg-slate-50 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                Editar
                              </button>
                              <button
                                onClick={() => handleConfirmAccount(msg.id)}
                                className="flex-1 py-1.5 rounded-lg font-bold text-[13px] bg-[#D8875D] text-white shadow-sm flex items-center justify-center gap-1.5 active:bg-[#C97A56] transition-colors"
                              >
                                <Check className="w-4 h-4" />
                                Registrar
                              </button>
                            </div>
                          </div>
                        ))}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {isTyping && (
                <div className="flex justify-start w-full">
                  <div className="text-[22px] leading-[40px] text-slate-400 font-handwriting italic tracking-wider">
                    escrevendo...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-[40px] shrink-0" />
            </div>
          </div>

          {/* Floating Scroll Buttons */}
          <AnimatePresence>
            {showScrollTop && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToTop}
                className="absolute bottom-28 right-4 w-10 h-10 bg-white border border-slate-200 rounded-full shadow-md flex items-center justify-center text-slate-500 hover:text-slate-700 hover:bg-slate-50 z-30 transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </motion.button>
            )}
            {showScrollBottom && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="absolute bottom-28 right-16 w-10 h-10 bg-[#D8875D] border border-[#c4774f] rounded-full shadow-md flex items-center justify-center text-white hover:bg-[#c4774f] z-30 transition-colors"
              >
                <ChevronDown className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input Area */}
          <div className="w-full shrink-0 px-6 py-4 bg-[#fdfbf7] z-20 border-t border-slate-200/60 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
            {pendingConfirmation && (
              <div className="flex gap-2 mb-3 overflow-x-auto py-1 no-scrollbar justify-center">
                {pendingConfirmation.step === "status" ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect("pago")}
                      className="px-4 py-2 bg-[#D8875D] hover:bg-[#c4774f] text-white rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                    >
                      Já foi paga
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect("pendente")}
                      className="px-4 py-2 bg-white text-[#D8875D] border border-[#D8875D]/20 hover:bg-[#D8875D]/5 rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                    >
                      Adicionar como pendente
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect("dinheiro")}
                      className="px-4 py-2 bg-[#D8875D] hover:bg-[#c4774f] text-white rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
                    >
                      Dinheiro / À Vista
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect("credito")}
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
        </>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-slate-50 z-20">
          {conversationAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-4">
              <List className="w-12 h-12 text-slate-400" />
              <p className="text-slate-500 font-medium">
                Nenhuma conta anotada ainda
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-8">
              {conversationAccounts.map((acc) => {
                const isPaid = acc.status === AccountStatus.PAID;
                return (
                  <div
                    key={acc.id}
                    className={`bg-white rounded-xl p-4 shadow-sm border border-slate-100 relative overflow-hidden transition-all ${isPaid ? "opacity-60" : ""}`}
                  >
                    {isPaid && (
                      <div className="absolute top-1/2 left-4 right-4 h-[1px] bg-slate-400 -translate-y-1/2 z-10 pointer-events-none" />
                    )}
                    <div className="flex justify-between items-center relative z-0">
                      <div>
                        <p
                          className={`font-bold text-[15px] ${isPaid ? "text-slate-500" : "text-slate-800"}`}
                        >
                          {acc.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(
                            acc.paymentDate || acc.date || 0,
                          ).toLocaleDateString("pt-BR")}{" "}
                          •{" "}
                          {acc.category?.replace("💬 Conversa - ", "") ||
                            "Pendente"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold text-[16px] ${isPaid ? "text-slate-500" : "text-slate-800"}`}
                        >
                          {acc.value.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileChat;
