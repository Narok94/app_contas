import React, { useState, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  type User,
  type Group,
  type Account,
  Role,
  AccountStatus,
  type Income,
  type View,
} from "./types";
import LoginScreen from "./components/LoginScreen";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import AccountsView from "./components/AccountsView";
import AccountFormModal from "./components/AccountFormModal";
import BatchAccountModal from "./components/BatchAccountModal";
import AddSelectionModal from "./components/AddSelectionModal";
import SettingsModal from "./components/SettingsModal";
import { useTheme } from "./hooks/useTheme";
import * as dataService from "./services/dataService";
import realtimeService from "./services/realtimeService";
import IncomeManagement from "./components/IncomeManagement";
import MoveAccountsModal from "./components/MoveAccountsModal";
import { notifyPaymentViaWhatsApp } from "./utils/whatsapp";
import { isVariableExpense, getMonthlyAccounts } from "./utils/accountUtils";

import {
  Plus,
  MessageSquare,
  PieChart,
  List,
  LayoutGrid,
  Settings,
  CheckCircle2,
} from "lucide-react";
import MobileChat from "./components/MobileChat";
import WhatsAppAssistant from "./components/WhatsAppAssistant";

// isVariableExpense removed as it is now imported from accountUtils

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const { theme, toggleTheme } = useTheme(currentUser?.username);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [view, setView] = useState<View>("login");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);

  const [isChatMode, setIsChatMode] = useState(() => {
    const stored = localStorage.getItem("tatu_mobile_chat_mode");
    return stored !== "false";
  });

  useEffect(() => {
    localStorage.setItem("tatu_mobile_chat_mode", String(isChatMode));
  }, [isChatMode]);

  const constraintsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMobile && view === "assistant") {
      setView("dashboard");
    }
  }, [isMobile, view]);

  useEffect(() => {
    const unsubUsers = realtimeService.subscribe("users", setUsers);
    const unsubGroups = realtimeService.subscribe("groups", setGroups);
    const unsubAccounts = realtimeService.subscribe("accounts", setAccounts);
    const unsubIncomes = realtimeService.subscribe("incomes", setIncomes);
    const unsubCategories = realtimeService.subscribe(
      "categories",
      setCategories,
    );
    const unsubSettings = realtimeService.subscribe("settings", (s) => {
      setWhatsappEnabled(!!s?.whatsappEnabled);
    });

    const initAuth = async () => {
      setIsLoading(true);
      const storedUserStr = sessionStorage.getItem("app_currentUser");
      if (storedUserStr) {
        try {
          const storedUser = JSON.parse(storedUserStr);
          setCurrentUser(storedUser);
          realtimeService.setUser(storedUser.username);
          setActiveGroupId("jessica-personal");
          const isCurrentlyMobile = window.innerWidth < 640;
          setView(isCurrentlyMobile ? "assistant" : "dashboard");
        } catch (e) {
          setView("login");
        }
      } else {
        setView("login");
      }
      setIsLoading(false);
    };
    initAuth();
    return () => {
      unsubUsers();
      unsubGroups();
      unsubAccounts();
      unsubIncomes();
      unsubCategories();
      unsubSettings();
    };
  }, []);

  const userAccounts = useMemo(() => {
    if (!activeGroupId) return [];
    return accounts.filter((acc) => acc.groupId === activeGroupId);
  }, [accounts, activeGroupId]);

  const mobileStats = useMemo(() => {
    if (!activeGroupId) return { total: 0, paid: 0 };
    const safeDate =
      selectedDate instanceof Date && !isNaN(selectedDate.getTime())
        ? selectedDate
        : new Date();
    const allForMonth = getMonthlyAccounts(userAccounts, safeDate);

    const total = allForMonth.reduce(
      (sum, acc) => sum + Number(acc.value || 0),
      0,
    );
    const paid = allForMonth
      .filter((acc) => acc.status === AccountStatus.PAID)
      .reduce((sum, acc) => sum + Number(acc.value || 0), 0);

    return { total, paid };
  }, [userAccounts, selectedDate, activeGroupId]);

  const userIncomes = useMemo(() => {
    if (!activeGroupId) return [];
    return incomes.filter((inc) => inc.groupId === activeGroupId);
  }, [incomes, activeGroupId]);

  const handleLogin = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    let userToAuth = null;
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const remoteUsers = await res.json();
        userToAuth = remoteUsers.find(
          (u: any) => u.username.toLowerCase() === username.toLowerCase(),
        );
      }
    } catch (e) {
      console.error("Failed to fetch remote users for login", e);
    }

    if (!userToAuth) {
      userToAuth = users.find(
        (u) => u.username.toLowerCase() === username.toLowerCase(),
      );
    }

    if (!userToAuth || userToAuth.password !== password) return false;
    setCurrentUser(userToAuth);
    sessionStorage.setItem("app_currentUser", JSON.stringify(userToAuth));
    realtimeService.setUser(userToAuth.username);
    handleGroupSelect("jessica-personal");
    return true;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveGroupId(null);
    sessionStorage.removeItem("app_currentUser");
    sessionStorage.removeItem("app_activeGroupId");
    realtimeService.setUser("");
    setView("login");
  };

  const handleGroupSelect = (groupId: string) => {
    setActiveGroupId(groupId);
    sessionStorage.setItem("app_activeGroupId", groupId);
    const isCurrentlyMobile = window.innerWidth < 640;
    setView(isCurrentlyMobile ? "assistant" : "dashboard");
  };

  const handleToggleAccountStatus = (acc: Account) => {
    const isPaying = acc.status !== AccountStatus.PAID;
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const targetDate = `${year}-${month}-15T12:00:00Z`;

    if (isVariableExpense(acc) && isPaying && Number(acc.value) === 0) {
      setAccountToEdit(acc);
      setIsAccountModalOpen(true);
      return;
    }

    const isVirtual =
      acc.id?.toString().startsWith("projected-") ||
      (!acc.paymentDate && acc.isRecurrent);

    if (isVirtual) {
      // Criando um snapshot físico para uma projeção ou template recorrente
      const snapshot: Account = {
        ...acc,
        id: `acc-snap-${Date.now()}`,
        isRecurrent: false,
        status: isPaying ? AccountStatus.PAID : AccountStatus.PENDING,
        paymentDate: targetDate,
        value: Number(acc.value),
      };
      dataService.addAccount(snapshot);

      if (isPaying) {
        const settings = realtimeService.getSettings();
        if (settings?.whatsappEnabled) {
          notifyPaymentViaWhatsApp(
            snapshot.name,
            snapshot.value,
            settings.whatsappGroupLink,
          );
        }
      }
    } else {
      // Atualizando um registro físico existente
      dataService.updateAccount({
        ...acc,
        status: isPaying ? AccountStatus.PAID : AccountStatus.PENDING,
        paymentDate: acc.paymentDate || targetDate,
        value: Number(acc.value),
      });

      if (isPaying) {
        const settings = realtimeService.getSettings();
        if (settings?.whatsappEnabled) {
          notifyPaymentViaWhatsApp(
            acc.name,
            Number(acc.value),
            settings.whatsappGroupLink,
          );
        }
      }
    }
  };

  const handleToggleMultipleAccountStatus = (accs: Account[]) => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const targetDate = `${year}-${month}-15T12:00:00Z`;
    const settings = realtimeService.getSettings();

    accs.forEach((acc) => {
      const isPaying = acc.status !== AccountStatus.PAID;

      // Skip variable expenses with 0 value for batch processing to avoid multiple modals
      if (isVariableExpense(acc) && isPaying && Number(acc.value) === 0) return;

      const isVirtual =
        acc.id?.toString().startsWith("projected-") ||
        (!acc.paymentDate && acc.isRecurrent);

      if (isVirtual) {
        const snapshot: Account = {
          ...acc,
          id: `acc-snap-${Date.now()}-${Math.random()}`,
          isRecurrent: false,
          status: isPaying ? AccountStatus.PAID : AccountStatus.PENDING,
          paymentDate: targetDate,
          value: Number(acc.value),
        };
        dataService.addAccount(snapshot);
        if (isPaying && settings?.whatsappEnabled) {
          notifyPaymentViaWhatsApp(
            snapshot.name,
            snapshot.value,
            settings.whatsappGroupLink,
          );
        }
      } else {
        dataService.updateAccount({
          ...acc,
          status: isPaying ? AccountStatus.PAID : AccountStatus.PENDING,
          paymentDate: acc.paymentDate || targetDate,
          value: Number(acc.value),
        });
        if (isPaying && settings?.whatsappEnabled) {
          notifyPaymentViaWhatsApp(
            acc.name,
            Number(acc.value),
            settings.whatsappGroupLink,
          );
        }
      }
    });
  };

  const handleAccountSubmit = (data: any) => {
    const isEditingProjection =
      data.id && data.id?.toString().startsWith("projected-");
    const existingAccount = accounts.find((a) => a.id === data.id);

    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const targetDate = `${year}-${month}-15T12:00:00Z`;

    const sanitizedTotal = data.totalInstallments
      ? Number(data.totalInstallments)
      : undefined;
    const sanitizedCurrent = data.currentInstallment
      ? Number(data.currentInstallment)
      : undefined;

    let sanitizedValue = Number(data.value);
    if (data.isInstallment && data.totalValue && sanitizedTotal) {
      sanitizedValue = Number(data.totalValue) / sanitizedTotal;
    }

    if (data.id && (existingAccount || isEditingProjection)) {
      // Caso A: Editando uma Projeção ou um Template de Recorrente
      if (
        isEditingProjection ||
        (existingAccount?.isRecurrent && !existingAccount.paymentDate)
      ) {
        let baseId = data.id.toString().replace(/^projected-/, "");
        const parts = baseId.split("-");
        if (parts.length > 2 && /^\d{4}$/.test(parts[parts.length - 2])) {
          baseId = parts.slice(0, -2).join("-");
        }

        const original = accounts.find((a) => a.id === baseId);

        if (data.isInstallment) {
          const finalInstallmentId =
            data.installmentId ||
            original?.installmentId ||
            `series-${Date.now()}`;
          const newPhysicalInstallment: Account = {
            ...data,
            id: `acc-${Date.now()}`,
            value: sanitizedValue,
            totalInstallments: sanitizedTotal || original?.totalInstallments,
            currentInstallment: sanitizedCurrent,
            paymentDate: data.paymentDate || targetDate,
            status: data.status || AccountStatus.PENDING,
            installmentId: finalInstallmentId,
          };
          dataService.addAccount(newPhysicalInstallment);
          realtimeService.updateAccountAndSeries(newPhysicalInstallment);
          return;
        }

        // Se o usuário desmarcou Recorrente, atualiza o original para físico e remove duplicidades
        if (original && !data.isRecurrent && !data.isInstallment) {
          const updatedOriginal: Account = {
            ...original,
            ...data,
            id: original.id,
            isRecurrent: false,
            paymentDate: data.paymentDate || targetDate,
            status: data.status || AccountStatus.PENDING,
            value: sanitizedValue,
          };
          dataService.updateAccount(updatedOriginal);

          const dupSnap = accounts.find(
            (a) =>
              a.id !== original.id &&
              a.id.startsWith("acc-snap-") &&
              a.name === original.name &&
              a.category === original.category,
          );
          if (dupSnap) {
            dataService.deleteAccount(dupSnap.id);
          }
          return;
        }

        // Se manteve Recorrente:
        // 1. Atualizar o template original (para propagar a mudança de Nome, Categoria e Valor para os próximos meses)
        if (original && data.isRecurrent) {
          const updatedTemplate: Account = {
            ...original,
            name: data.name,
            category: data.category,
            value: sanitizedValue,
            groupId: data.groupId || original.groupId,
            isRecurrent: true,
            paymentDate: undefined, // continua sendo template
          };
          dataService.updateAccount(updatedTemplate);
        }

        // 2. Cria ou atualiza o snapshot do mês atual com os novos valores
        const existingSnap = accounts.find(
          (a) =>
            a.id.startsWith("acc-snap-") &&
            a.name === (original?.name || data.name) &&
            a.groupId === (data.groupId || original?.groupId) &&
            a.paymentDate?.startsWith(`${year}-${month}`),
        );

        if (existingSnap) {
          dataService.updateAccount({
            ...existingSnap,
            name: data.name,
            category: data.category,
            value: sanitizedValue,
            status: data.status || existingSnap.status,
            paymentDate: data.paymentDate || targetDate,
            isRecurrent: true,
          });
        } else {
          const newSnapshot: Account = {
            ...data,
            id: `acc-snap-${Date.now()}`,
            name: data.name,
            category: data.category,
            value: sanitizedValue,
            paymentDate: data.paymentDate || targetDate,
            status: data.status || AccountStatus.PENDING,
            isRecurrent: true,
            currentInstallment: sanitizedCurrent,
            totalInstallments: sanitizedTotal || original?.totalInstallments,
          };
          dataService.addAccount(newSnapshot);
        }
        return;
      }

      // Caso B: Editando um Snapshot Físico Existente (ex: acc-snap-xxx)
      if (existingAccount && existingAccount.id.startsWith("acc-snap-")) {
        // Tenta achar o template original correspondente pelo nome e categoria originais
        const originalTemplate = accounts.find(
          (a) =>
            a.isRecurrent &&
            !a.paymentDate &&
            a.name === existingAccount.name &&
            a.category === existingAccount.category,
        );

        if (originalTemplate) {
          if (!data.isRecurrent) {
            // Cancela a recorrência futura
            dataService.deleteAccount(originalTemplate.id);
          } else {
            // Mantém e atualiza o template
            dataService.updateAccount({
              ...originalTemplate,
              name: data.name,
              category: data.category,
              value: sanitizedValue,
              isRecurrent: true,
            });
          }
        }

        const updateData = {
          ...existingAccount,
          ...data,
          value: sanitizedValue,
          totalInstallments: sanitizedTotal,
          currentInstallment: sanitizedCurrent,
          isRecurrent: data.isRecurrent,
          installmentId:
            data.installmentId ||
            (data.isInstallment ? `repair-${Date.now()}` : undefined),
        };
        realtimeService.updateAccountAndSeries(updateData as Account);
        return;
      }

      // Caso C: Atualizando qualquer outro registro físico padrão (ex: parcelas, avulsas)
      const updateData = {
        ...existingAccount,
        ...data,
        value: sanitizedValue,
        totalInstallments: sanitizedTotal,
        currentInstallment: sanitizedCurrent,
        installmentId:
          data.installmentId ||
          (data.isInstallment ? `repair-${Date.now()}` : undefined),
      };
      realtimeService.updateAccountAndSeries(updateData as Account);
    } else {
      const isVar = isVariableExpense(data);
      const isRec = Boolean(data.isRecurrent);
      const isInst = Boolean(data.isInstallment);
      const installmentId = isInst ? `inst-${Date.now()}` : undefined;

      if (isInst && sanitizedTotal && sanitizedTotal > 0) {
        const currentInstallmentNum = sanitizedCurrent || 1;
        const baseDate = data.paymentDate
          ? new Date(data.paymentDate)
          : new Date(targetDate);

        for (let i = 1; i <= sanitizedTotal; i++) {
          const currentDate = new Date(baseDate);
          currentDate.setMonth(
            baseDate.getMonth() + (i - currentInstallmentNum),
          );

          // Mark past installments as paid, and current / future as pending
          const status =
            i < currentInstallmentNum
              ? AccountStatus.PAID
              : AccountStatus.PENDING;

          dataService.addAccount({
            ...data,
            id: `acc-${Date.now()}-${i}`,
            value: sanitizedValue,
            totalValue: data.totalValue,
            isRecurrent: false, // Installments are fixed series
            isInstallment: true,
            installmentId: installmentId,
            currentInstallment: i,
            totalInstallments: sanitizedTotal,
            status: status,
            paymentDate: currentDate.toISOString(),
          });
        }
      } else {
        // Single account or simple recurrent template
        const newAccount: Account = {
          ...data,
          id: `acc-${Date.now()}`,
          value: sanitizedValue,
          totalValue: data.totalValue,
          isRecurrent: isRec,
          isInstallment: isInst,
          installmentId: installmentId,
          currentInstallment: isInst ? sanitizedCurrent || 1 : undefined,
          totalInstallments: sanitizedTotal,
          status: AccountStatus.PENDING,
          paymentDate:
            isRec && !isInst ? undefined : data.paymentDate || targetDate,
        };

        dataService.addAccount(newAccount);

        // If it's a recurrent variable expense, also create a physical record for the current month
        // so the user sees the value they just entered immediately.
        if (isVar && isRec && !isInst) {
          dataService.addAccount({
            ...newAccount,
            id: `acc-snap-${Date.now()}`,
            isRecurrent: false,
            paymentDate: data.paymentDate || targetDate,
          });
        }
      }
    }
  };

  const handleExportJson = () => {
    const data = realtimeService.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tatu_backup_${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (
        window.confirm(
          "Atenção: Importar um backup irá substituir TODOS os dados atuais no banco. Deseja continuar?",
        )
      ) {
        await realtimeService.importData(data);
        alert("Backup importado com sucesso!");
        window.location.reload(); // Recarregar para garantir que tudo sincronize
      }
    } catch (e) {
      alert(
        "Erro ao importar backup. Verifique se o arquivo é um JSON válido.",
      );
    }
  };

  const handleExportCsv = () => {
    const accounts = realtimeService.getAccounts();
    const incomes = realtimeService.getIncomes();

    let csv = "Tipo,Nome,Valor,Categoria,Data,Status\n";

    accounts.forEach((acc) => {
      csv += `Despesa,"${acc.name}",${acc.value},"${acc.category}",${acc.paymentDate || (acc as any).dueDate},${acc.status}\n`;
    });

    incomes.forEach((inc) => {
      csv += `Receita,"${inc.name}",${inc.value},"Entrada",${inc.date},PAGO\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tatu_relatorio_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    const accounts = realtimeService.getAccounts();
    const incomes = realtimeService.getIncomes();

    const wb = XLSX.utils.book_new();

    // 1. Add a "Resumo Geral" sheet first
    const allData = [
      ...incomes.map((inc) => ({
        Tipo: "Receita",
        Nome: inc.name,
        Valor: inc.value,
        Categoria: "Entrada",
        Data: new Date(inc.date).toLocaleDateString("pt-BR"),
        Status: "Pago",
      })),
      ...accounts.map((acc) => ({
        Tipo: "Despesa",
        Nome: acc.name,
        Valor: acc.value,
        Categoria: acc.category,
        Data: acc.paymentDate
          ? new Date(acc.paymentDate).toLocaleDateString("pt-BR")
          : "N/A",
        Status: acc.status === AccountStatus.PAID ? "Pago" : "Pendente",
      })),
    ];
    const wsAll = XLSX.utils.json_to_sheet(allData);
    XLSX.utils.book_append_sheet(wb, wsAll, "Resumo Geral");

    // 2. Group accounts by category in separate sheets
    const categories = Array.from(new Set(accounts.map((a) => a.category)));

    categories.forEach((cat) => {
      const catAccounts = accounts.filter((a) => a.category === cat);
      const data = catAccounts.map((acc) => ({
        Nome: acc.name,
        Valor: acc.value,
        Status: acc.status === AccountStatus.PAID ? "Pago" : "Pendente",
        Data: acc.paymentDate
          ? new Date(acc.paymentDate).toLocaleDateString("pt-BR")
          : "N/A",
        Recorrente: acc.isRecurrent ? "Sim" : "Não",
        Parcela: acc.isInstallment
          ? `${acc.currentInstallment}/${acc.totalInstallments}`
          : "N/A",
      }));

      const ws = XLSX.utils.json_to_sheet(data);

      // Auto-size columns
      const maxWidths = data.reduce((acc: any, row: any) => {
        Object.keys(row).forEach((key, i) => {
          const val = String(row[key]);
          acc[i] = Math.max(acc[i] || 0, val.length, key.length);
        });
        return acc;
      }, []);
      ws["!cols"] = maxWidths.map((w: number) => ({ wch: w + 2 }));

      XLSX.utils.book_append_sheet(
        wb,
        ws,
        cat.replace(/[\[\]\*\?\/\\]/g, "").substring(0, 31) || "Sem Categoria",
      );
    });

    XLSX.writeFile(
      wb,
      `tatu_financeiro_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] font-sans relative overflow-hidden">
        {/* Background elements */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent, transparent 39px, #cbd5e1 39px, #cbd5e1 40px)",
            backgroundSize: "100% 40px",
            backgroundAttachment: "local",
            backgroundPosition: "0 8px",
          }}
        ></div>
        <div className="absolute left-10 top-0 bottom-0 w-[2px] bg-red-300/40 pointer-events-none" />

        {/* Floating emojis/decorations */}
        <div
          className="absolute top-[20%] left-[20%] text-3xl animate-bounce"
          style={{ animationDuration: "3s" }}
        >
          ✅
        </div>
        <div
          className="absolute top-[30%] right-[25%] text-4xl animate-bounce"
          style={{ animationDuration: "2.5s", animationDelay: "0.5s" }}
        >
          💸
        </div>
        <div
          className="absolute bottom-[25%] left-[30%] text-4xl animate-bounce"
          style={{ animationDuration: "2.8s", animationDelay: "1s" }}
        >
          💰
        </div>
        <div
          className="absolute bottom-[35%] right-[20%] text-3xl animate-bounce"
          style={{ animationDuration: "3.2s", animationDelay: "0.2s" }}
        >
          ✨
        </div>

        <div className="relative z-10 flex flex-col items-center gap-8 bg-white/80 backdrop-blur-sm p-12 rounded-[2rem] shadow-xl border-2 border-slate-100 rotate-1">
          <div className="relative">
            <div className="w-24 h-24 bg-[#D8875D]/10 rounded-full flex items-center justify-center">
              <div className="w-20 h-20 bg-[#D8875D]/20 rounded-full flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 bg-[#D8875D] rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>
            {/* Small spinning ring */}
            <div className="absolute inset-0 border-4 border-dashed border-[#D8875D]/30 rounded-full animate-[spin_4s_linear_infinite]"></div>
          </div>
          <div className="text-center space-y-3">
            <p className="font-serif font-bold text-slate-800 text-3xl mb-1 flex items-center justify-center gap-2 tracking-tight">
              Tatu Financeiro
            </p>
            <p className="text-[#D8875D] font-serif text-lg font-medium italic animate-pulse">
              Pagando as contas... brincadeira, só carregando! 🤭
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (view === "login")
    return (
      <LoginScreen onLogin={handleLogin} onNavigateToRegister={() => {}} />
    );
  if (!currentUser || !activeGroupId)
    return (
      <LoginScreen onLogin={handleLogin} onNavigateToRegister={() => {}} />
    );

  if (!isMobile && isChatMode) {
    return (
      <div className="fixed inset-0 h-[100dvh] w-full bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden flex flex-col z-50">
        <WhatsAppAssistant
          currentUser={currentUser}
          activeGroupId={activeGroupId}
          accounts={userAccounts}
          incomes={userIncomes}
          categories={categories}
          selectedDate={selectedDate}
          onSwitchToTraditional={() => setIsChatMode(false)}
        />
      </div>
    );
  }

  // Render bottom nav for mobile
  const renderMobileBottomNav = () => {
    if (!isMobile || view === "login" || view === "assistant") return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-2 flex justify-between items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] h-20">
        <button
          onClick={() => setView("dashboard")}
          className={`flex flex-col items-center gap-1 ${view === "dashboard" ? "text-[#D8875D]" : "text-slate-400"}`}
        >
          <PieChart className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Resumo</span>
        </button>
        <button
          onClick={() => setView("assistant")}
          className={`flex flex-col items-center gap-1 ${view === "assistant" ? "text-[#D8875D]" : "text-slate-400"}`}
        >
          <List className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Contas</span>
        </button>
        <button
          onClick={() => setView("accounts")}
          className={`flex flex-col items-center gap-1 ${view === "accounts" ? "text-[#D8875D]" : "text-slate-400"}`}
        >
          <LayoutGrid className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Planilhas</span>
        </button>
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="flex flex-col items-center gap-1 text-slate-400"
        >
          <Settings className="w-6 h-6" />
          <span className="text-[10px] font-semibold">Ajustes</span>
        </button>
      </div>
    );
  };

  return (
    <div
      className={`${isMobile && view === "assistant" ? "h-[100dvh] w-full overflow-hidden" : "min-h-[100dvh] w-full"} flex flex-col bg-background text-text-primary dark:bg-dark-background dark:text-dark-text-primary relative overflow-x-hidden ${isMobile && view !== "assistant" ? "pb-20" : ""}`}
    >
      {/* Decorative Background Elements (mostly visible in dark mode, extremely subtle in light) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-primary/5 dark:bg-primary/30 rounded-full blur-[150px] animate-pulse transition-colors duration-1000" />
        <div
          className="absolute top-[10%] -right-[15%] w-[50%] h-[50%] bg-highlight/5 dark:bg-highlight/20 rounded-full blur-[130px] animate-pulse transition-colors duration-1000"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute -bottom-[20%] left-[10%] w-[55%] h-[55%] bg-indigo-500/5 dark:bg-blue-600/20 rounded-full blur-[140px] animate-pulse transition-colors duration-1000"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-[40%] right-[20%] w-[25%] h-[25%] bg-success/5 dark:bg-emerald-500/20 rounded-full blur-[120px] animate-pulse transition-colors duration-1000"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        {!isMobile && (
          <Header
            currentUser={currentUser}
            onSettingsClick={() => setIsSettingsModalOpen(true)}
            onLogout={handleLogout}
            activeView={view}
            onViewChange={setView}
            isAdmin={currentUser.role === Role.ADMIN}
            onAddClick={() => setIsSelectionModalOpen(true)}
            mobileStats={mobileStats}
          />
        )}
        <main
          className={`max-w-[1200px] mx-auto w-full flex-1 flex flex-col ${view === "assistant" && isMobile ? "p-0 h-[100dvh]" : "p-3 sm:p-4 lg:p-6 pb-32"}`}
        >
          {view === "assistant" && isMobile && (
            <div className="flex-1 flex flex-col">
              <MobileChat
                currentUser={currentUser}
                activeGroupId={activeGroupId}
                accounts={userAccounts}
                incomes={userIncomes}
                categories={categories}
                selectedDate={selectedDate}
                onEditAccount={(acc) => {
                  setAccountToEdit(acc);
                  setIsAccountModalOpen(true);
                }}
                onBack={() => setView("dashboard")}
              />
            </div>
          )}
          {view === "dashboard" && (
            <Dashboard
              accounts={userAccounts}
              incomes={userIncomes}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
          )}
          {view === "accounts" && (
            <AccountsView
              accounts={userAccounts}
              onEditAccount={(acc) => {
                setAccountToEdit(acc);
                setIsAccountModalOpen(true);
              }}
              onDeleteAccount={(id) => {
                let targetId = id;
                if (id.toString().startsWith("projected-")) {
                  let baseId = id.toString().replace(/^projected-/, "");
                  const parts = baseId.split("-");
                  if (
                    parts.length > 2 &&
                    /^\d{4}$/.test(parts[parts.length - 2])
                  ) {
                    baseId = parts.slice(0, -2).join("-");
                  }
                  targetId = baseId;
                }
                dataService.deleteAccount(targetId);
              }}
              onToggleStatus={handleToggleAccountStatus}
              onToggleMultipleStatus={handleToggleMultipleAccountStatus}
              onNotifyWhatsApp={(acc) => {
                const settings = realtimeService.getSettings();
                notifyPaymentViaWhatsApp(
                  acc.name,
                  acc.value,
                  settings?.whatsappGroupLink,
                );
              }}
              whatsappEnabled={whatsappEnabled}
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              onOpenMoveModal={() => setIsMoveModalOpen(true)}
              categories={categories}
              activeGroupId={activeGroupId}
            />
          )}
          {view === "income" && (
            <IncomeManagement
              incomes={userIncomes}
              onAddOrUpdate={(data) => {
                if (data.id)
                  dataService.updateIncome({
                    ...data,
                    date: new Date().toISOString(),
                  } as any);
                else
                  dataService.addIncome({
                    ...data,
                    date: new Date().toISOString(),
                    id: `inc-${Date.now()}`,
                  } as any);
              }}
              onDelete={(id) => dataService.deleteIncome(id)}
              activeGroupId={activeGroupId}
            />
          )}
        </main>
        {renderMobileBottomNav()}
        <div
          ref={constraintsRef}
          className="fixed inset-0 pointer-events-none z-40"
        />
        {isMobile && currentUser && activeGroupId && view !== "assistant" && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
            <button
              onClick={() => {
                setAccountToEdit(null);
                setIsAccountModalOpen(true);
              }}
              className="flex items-center justify-center w-14 h-14 bg-[#D8875D] text-white rounded-full shadow-[0_4px_15px_rgba(216,135,93,0.4)] active:scale-95 transition-all border-4 border-white"
              title="Adicionar Conta"
            >
              <Plus className="w-7 h-7" strokeWidth={3.5} />
            </button>
          </div>
        )}
        {!isMobile && (
          <button
            onClick={() => setIsChatMode(true)}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#D8875D] text-white rounded-full shadow-[0_4px_15px_rgba(216,135,93,0.4)] active:scale-95 transition-all border-[3px] border-white pointer-events-auto"
            title="Conversar com o Bot"
          >
            <MessageSquare className="w-6 h-6" />
          </button>
        )}

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
          theme={theme}
          toggleTheme={toggleTheme}
          onExportData={handleExportJson}
          onImportData={handleImportJson}
          onExportToCsv={handleExportCsv}
          onExportToExcel={handleExportExcel}
          currentUser={currentUser}
        />
        <AccountFormModal
          isOpen={isAccountModalOpen}
          onClose={() => {
            setIsAccountModalOpen(false);
            setAccountToEdit(null);
          }}
          onSubmit={handleAccountSubmit}
          account={accountToEdit}
          categories={categories}
          onManageCategories={() => {}}
          activeGroupId={activeGroupId}
          selectedDate={selectedDate}
        />
        <BatchAccountModal
          isOpen={isBatchModalOpen}
          onClose={() => setIsBatchModalOpen(false)}
          onSubmit={async (batch) => {
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
            const defaultDate = `${year}-${month}-10T12:00:00Z`;

            batch.forEach((item) => {
              const isVar = isVariableExpense(item);
              const isRec = Boolean(item.isRecurrent);
              const isInst = Boolean(item.isInstallment);
              const sanitizedTotal = item.totalInstallments
                ? Number(item.totalInstallments)
                : undefined;
              const installmentId = isInst
                ? `batch-series-${Date.now()}-${Math.random()}`
                : undefined;
              const sanitizedValue =
                isInst && sanitizedTotal && sanitizedTotal > 1
                  ? Number(item.value) / sanitizedTotal
                  : Number(item.value);

              if (isInst && sanitizedTotal && sanitizedTotal > 1) {
                const baseDate = new Date(defaultDate);
                for (let i = 1; i <= sanitizedTotal; i++) {
                  const currentDate = new Date(baseDate);
                  currentDate.setMonth(baseDate.getMonth() + (i - 1));

                  dataService.addAccount({
                    ...item,
                    id: `batch-${Date.now()}-${Math.random()}-${i}`,
                    groupId: activeGroupId,
                    value: sanitizedValue,
                    isRecurrent: false,
                    isInstallment: true,
                    installmentId: installmentId,
                    currentInstallment: i,
                    totalInstallments: sanitizedTotal,
                    paymentDate: currentDate.toISOString(),
                    status: AccountStatus.PENDING,
                  });
                }
              } else {
                dataService.addAccount({
                  ...item,
                  id: `batch-${Date.now()}-${Math.random()}`,
                  groupId: activeGroupId,
                  value: sanitizedValue,
                  isRecurrent: isRec,
                  isInstallment: isInst,
                  installmentId: installmentId,
                  currentInstallment: isInst
                    ? Number(item.currentInstallment) || 1
                    : undefined,
                  totalInstallments: sanitizedTotal,
                  paymentDate: isRec && !isInst ? undefined : defaultDate,
                  status: AccountStatus.PENDING,
                });
              }
            });
          }}
          categories={categories}
        />
        <AddSelectionModal
          isOpen={isSelectionModalOpen}
          onClose={() => setIsSelectionModalOpen(false)}
          onSelectSingle={() => setIsAccountModalOpen(true)}
          onSelectBatch={() => setIsBatchModalOpen(true)}
        />
        <MoveAccountsModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          onSubmit={(ids, to) => {
            const accsToUpdate = accounts
              .filter((a) => ids.includes(a.id))
              .map((a) => ({ ...a, paymentDate: `${to}-10T12:00:00Z` }));
            dataService.updateMultipleAccounts(accsToUpdate);
          }}
          allAccounts={userAccounts}
          currentDashboardMonth={selectedDate.toISOString().slice(0, 7)}
        />
      </div>
    </div>
  );
};
export default App;
