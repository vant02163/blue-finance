import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient";

import {
  ShieldCheck,
  LayoutDashboard,
  List,
  CalendarDays,
  BarChart3,
  Wallet,
  Utensils,
  House,
  ShoppingBag,
  Plus,
  Trash2,
  Pencil,
  Search,
  RotateCcw,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  SlidersHorizontal,
  Landmark,
  Banknote,
  Smartphone,
  CircleDollarSign,
  Gift,
  X,
  Save,
  TrendingUp,
  TrendingDown,
  Volume2,
  Shield,
  Eye,
  Target,
  AlertTriangle,
  CheckCircle2,
  Table2,
  Bell,
  LogOut,
  PieChart,
  UserRound,
  KeyRound,
  Mail,
  Sun,
  Moon,
  Download,
  Upload,
} from "lucide-react";

/* =========================================================
   LOCAL STORAGE
========================================================= */

const ACCOUNT_KEY = "blue-finance-accounts-v5";
const TRANSACTION_KEY = "blue-finance-transactions-v5";
const BUDGET_KEY = "blue-finance-budgets-v5";
const READ_NOTIFICATION_KEY = "blue-finance-read-notifications-v1";

/* =========================================================
   DANH MỤC CHI TIÊU
========================================================= */

const categories = {
  food: {
    label: "Ăn uống",
    icon: Utensils,
  },

  rent: {
    label: "Tiền trọ",
    icon: House,
  },

  other: {
    label: "Chi tiêu khác",
    icon: ShoppingBag,
  },
};

/* =========================================================
   LOẠI TÀI KHOẢN
========================================================= */

const accountTypes = {
  cash: {
    label: "Tiền mặt",
    icon: Banknote,
  },

  bank: {
    label: "Ngân hàng",
    icon: Landmark,
  },

  wallet: {
    label: "Ví điện tử",
    icon: Smartphone,
  },
};

/* =========================================================
   HÀM HỖ TRỢ
========================================================= */

function pad(value) {
  return String(value).padStart(2, "0");
}

function todayString() {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}`;
}

function currentMonthKey() {
  const now = new Date();

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}

function formatDate(value) {
  if (!value) return "";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}

function formatMonth(value) {
  if (!value) return "";

  const [year, month] = value.split("-");

  return `Tháng ${Number(month)} / ${year}`;
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadStorage(key, defaultValue) {
  try {
    const data = localStorage.getItem(key);

    if (!data) return defaultValue;

    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  /* =======================================================
     DỮ LIỆU
  ======================================================= */

  const [accounts, setAccounts] = useState(() =>
    loadStorage(ACCOUNT_KEY, [])
  );

  const [transactions, setTransactions] = useState(() =>
    loadStorage(TRANSACTION_KEY, [])
  );

  const [budgets, setBudgets] = useState(() =>
    loadStorage(BUDGET_KEY, {})
  );

  /* =======================================================
     ĐIỀU HƯỚNG
  ======================================================= */

  const [activePage, setActivePage] = useState("dashboard");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const data = loadStorage(TRANSACTION_KEY, []);

    const months = data
      .filter((item) => item.date)
      .map((item) => item.date.slice(0, 7))
      .sort((a, b) => b.localeCompare(a));

    return months[0] || currentMonthKey();
  });

  const [transactionMonth, setTransactionMonth] = useState(selectedMonth);
  const [monthlyTableMonth, setMonthlyTableMonth] = useState(selectedMonth);

  const [isDarkMode, setIsDarkMode] = useState(() =>
    loadStorage("blue-finance-theme-v1", "dark") !== "light"
  );

  /* =======================================================
     FORM GIAO DỊCH
  ======================================================= */

  const [formType, setFormType] = useState("expense");

  const [transactionForm, setTransactionForm] = useState({
    date: todayString(),
    description: "",
    amount: "",
    category: "food",
    accountId: "",
    adjustmentDirection: "plus",
    fromAccountId: "",
    toAccountId: "",
  });

  /* =======================================================
     FORM TÀI KHOẢN
  ======================================================= */

  const [accountForm, setAccountForm] = useState({
    name: "",
    type: "bank",
    openingBalance: "",
  });

  /* =======================================================
     FORM NGÂN SÁCH
  ======================================================= */

  const [budgetForm, setBudgetForm] = useState({
    food: "",
    rent: "",
    other: "",
  });

  /* =======================================================
     SỬA GIAO DỊCH
  ======================================================= */

  const [editingTransaction, setEditingTransaction] = useState(null);

  /* =======================================================
     XEM TÀI KHOẢN
  ======================================================= */

  const [viewAccountId, setViewAccountId] = useState("");

  /* =======================================================
     DASHBOARD
  ======================================================= */

  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const [readNotificationIds, setReadNotificationIds] = useState(() =>
    loadStorage(READ_NOTIFICATION_KEY, [])
  );

  const [dashboardSearch, setDashboardSearch] = useState("");

  const [userEmail, setUserEmail] = useState("");

  /* =======================================================
     QUẢN LÝ TÀI KHOẢN ĐĂNG NHẬP
  ======================================================= */

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordMessageType, setPasswordMessageType] = useState("");

  /* =======================================================
     SAO LƯU / KHÔI PHỤC DỮ LIỆU
  ======================================================= */

  const importFileInputRef = useRef(null);
  const [importMessage, setImportMessage] = useState("");
  const [importMessageType, setImportMessageType] = useState("");

  /* =======================================================
     BỘ LỌC NHẬT KÝ
  ======================================================= */

  const [filters, setFilters] = useState({
    search: "",
    type: "all",
    category: "all",
    accountId: "all",
    dateFrom: "",
    dateTo: "",
    minAmount: "",
    maxAmount: "",
    sort: "newest",
  });

  /* =======================================================
     ÂM THANH
  ======================================================= */

  const audioContextRef = useRef(null);

  function playSound(frequency = 520, duration = 0.06) {
    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const context = audioContextRef.current;

      if (context.state === "suspended") {
        context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.value = frequency;

      gain.gain.setValueAtTime(0.025, context.currentTime);

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + duration
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch {
      // bỏ qua
    }
  }

  function successSound() {
    playSound(700, 0.08);

    setTimeout(() => {
      playSound(880, 0.08);
    }, 70);
  }

  function deleteSound() {
    playSound(250, 0.12);
  }

  /* =======================================================
     LƯU LOCAL STORAGE
  ======================================================= */

  useEffect(() => {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem(
      TRANSACTION_KEY,
      JSON.stringify(transactions)
    );
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
  }, [budgets]);

  /* =======================================================
     DANH SÁCH THÁNG
  ======================================================= */

  const availableMonths = useMemo(() => {
    const monthSet = new Set();

    transactions.forEach((item) => {
      if (item.date) {
        monthSet.add(item.date.slice(0, 7));
      }
    });

    Object.keys(budgets).forEach((month) => {
      monthSet.add(month);
    });

    if (monthSet.size === 0) {
      monthSet.add(selectedMonth);
    }

    return Array.from(monthSet).sort((a, b) =>
      b.localeCompare(a)
    );
  }, [transactions, budgets, selectedMonth]);

  /* =======================================================
     TÀI KHOẢN
  ======================================================= */

  function getAccount(id) {
    return accounts.find(
      (account) => String(account.id) === String(id)
    );
  }

  function getAccountName(id) {
    return getAccount(id)?.name || "Không xác định";
  }

  function getAccountBalance(account) {
    let balance = Number(account.openingBalance || 0);

    transactions.forEach((transaction) => {
      const amount = Math.abs(Number(transaction.amount || 0));

      if (
        transaction.type === "income" &&
        String(transaction.accountId) === String(account.id)
      ) {
        balance += amount;
      }

      if (
        transaction.type === "expense" &&
        String(transaction.accountId) === String(account.id)
      ) {
        balance -= amount;
      }

      if (
        transaction.type === "adjustment" &&
        String(transaction.accountId) === String(account.id)
      ) {
        if (transaction.adjustmentDirection === "minus") {
          balance -= amount;
        } else {
          balance += amount;
        }
      }

      if (transaction.type === "transfer") {
        if (
          String(transaction.fromAccountId) === String(account.id)
        ) {
          balance -= amount;
        }

        if (
          String(transaction.toAccountId) === String(account.id)
        ) {
          balance += amount;
        }
      }
    });

    return balance;
  }

  const totalAssets = useMemo(() => {
    return accounts.reduce((total, account) => {
      return total + getAccountBalance(account);
    }, 0);
  }, [accounts, transactions]);

  /* =======================================================
     GIAO DỊCH THÁNG
  ======================================================= */

  const monthTransactions = useMemo(() => {
    return transactions.filter(
      (item) =>
        item.date && item.date.startsWith(selectedMonth)
    );
  }, [transactions, selectedMonth]);

  const transactionMonthTransactions = useMemo(() => {
    return transactions.filter(
      (item) =>
        item.date && item.date.startsWith(transactionMonth)
    );
  }, [transactions, transactionMonth]);

  const monthlyTableTransactions = useMemo(() => {
    return transactions.filter(
      (item) =>
        item.date && item.date.startsWith(monthlyTableMonth)
    );
  }, [transactions, monthlyTableMonth]);

  /* =======================================================
     TÍNH TỔNG
  ======================================================= */

  function calculateTotals(data) {
    let income = 0;
    let expense = 0;
    let adjustment = 0;

    let food = 0;
    let rent = 0;
    let other = 0;

    data.forEach((item) => {
      const amount = Math.abs(Number(item.amount || 0));

      if (item.type === "income") {
        income += amount;
      }

      if (item.type === "expense") {
        expense += amount;

        if (item.category === "food") {
          food += amount;
        }

        if (item.category === "rent") {
          rent += amount;
        }

        if (item.category === "other") {
          other += amount;
        }
      }

      if (item.type === "adjustment") {
        if (item.adjustmentDirection === "minus") {
          adjustment -= amount;
        } else {
          adjustment += amount;
        }
      }
    });

    return {
      income,
      expense,
      adjustment,
      food,
      rent,
      other,

      remaining: income + adjustment - expense,
    };
  }

  const totals = useMemo(() => {
    return calculateTotals(monthTransactions);
  }, [monthTransactions]);

  /* =======================================================
     BẢNG CHI TIÊU HÀNG THÁNG - THEO NGÀY
  ======================================================= */

  const monthlyExpenseTable = useMemo(() => {
    const grouped = {};

    monthlyTableTransactions.forEach((item) => {
      if (!item.date) return;

      if (!grouped[item.date]) {
        grouped[item.date] = {
          date: item.date,

          food: 0,

          rent: 0,

          other: 0,

          adjustment: 0,

          income: 0,
        };
      }

      const amount = Math.abs(Number(item.amount || 0));

      /* TIỀN ĂN / TRỌ / KHÁC */

      if (item.type === "expense") {
        if (item.category === "food") {
          grouped[item.date].food += amount;
        }

        if (item.category === "rent") {
          grouped[item.date].rent += amount;
        }

        if (item.category === "other") {
          grouped[item.date].other += amount;
        }
      }

      /* TIP / ÂM */

      if (item.type === "adjustment") {
        if (item.adjustmentDirection === "minus") {
          grouped[item.date].adjustment -= amount;
        } else {
          grouped[item.date].adjustment += amount;
        }
      }

      /* TIỀN ĐƯỢC CHO / LƯƠNG */

      if (item.type === "income") {
        grouped[item.date].income += amount;
      }
    });

    return Object.values(grouped).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [monthTransactions]);

  /* =======================================================
     NGÂN SÁCH
  ======================================================= */

  const currentBudget = budgets[selectedMonth] || {
    food: 0,
    rent: 0,
    other: 0,
  };

  const totalBudget =
    Number(currentBudget.food || 0) +
    Number(currentBudget.rent || 0) +
    Number(currentBudget.other || 0);

  const budgetUsed = totals.expense;

  const budgetRemaining = totalBudget - budgetUsed;

  const budgetPercent =
    totalBudget > 0
      ? (budgetUsed / totalBudget) * 100
      : 0;

  function categoryBudgetPercent(category) {
    const budget = Number(currentBudget[category] || 0);

    const spent = Number(totals[category] || 0);

    if (budget <= 0) {
      return 0;
    }

    return (spent / budget) * 100;
  }

  /* =======================================================
     DANH MỤC CHI NHIỀU NHẤT
  ======================================================= */

  const highestCategory = useMemo(() => {
    const data = [
      {
        name: "Ăn uống",
        amount: totals.food,
      },

      {
        name: "Tiền trọ",
        amount: totals.rent,
      },

      {
        name: "Chi tiêu khác",
        amount: totals.other,
      },
    ];

    return data.reduce((max, item) =>
      item.amount > max.amount ? item : max
    );
  }, [totals]);

  /* =======================================================
     NGÂN SÁCH
  ======================================================= */

  function saveBudget(event) {
    event.preventDefault();

    const newBudget = {
      food: Math.max(0, Number(budgetForm.food || 0)),

      rent: Math.max(0, Number(budgetForm.rent || 0)),

      other: Math.max(0, Number(budgetForm.other || 0)),
    };

    setBudgets((old) => ({
      ...old,

      [selectedMonth]: newBudget,
    }));

    successSound();
  }

  function deleteBudget() {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa ngân sách ${formatMonth(
          selectedMonth
        )}?`
      )
    ) {
      return;
    }

    setBudgets((old) => {
      const copy = { ...old };

      delete copy[selectedMonth];

      return copy;
    });

    setBudgetForm({
      food: "",
      rent: "",
      other: "",
    });

    deleteSound();
  }

  useEffect(() => {
    const budget = budgets[selectedMonth];

    if (budget) {
      setBudgetForm({
        food: budget.food || "",

        rent: budget.rent || "",

        other: budget.other || "",
      });
    } else {
      setBudgetForm({
        food: "",

        rent: "",

        other: "",
      });
    }
  }, [selectedMonth, budgets]);

  /* =======================================================
     THÊM TÀI KHOẢN
  ======================================================= */

  function addAccount(event) {
    event.preventDefault();

    if (!accountForm.name.trim()) {
      alert("Vui lòng nhập tên tài khoản.");

      return;
    }

    const newAccount = {
      id: createId(),

      name: accountForm.name.trim(),

      type: accountForm.type,

      openingBalance: Number(accountForm.openingBalance || 0),
    };

    setAccounts((old) => [...old, newAccount]);

    setAccountForm({
      name: "",

      type: "bank",

      openingBalance: "",
    });

    successSound();
  }

  /* =======================================================
     XÓA TÀI KHOẢN
  ======================================================= */

  function deleteAccount(id) {
    const linked = transactions.some(
      (item) =>
        String(item.accountId) === String(id) ||
        String(item.fromAccountId) === String(id) ||
        String(item.toAccountId) === String(id)
    );

    if (linked) {
      alert(
        "Không thể xóa tài khoản vì tài khoản này đang có giao dịch liên kết."
      );

      return;
    }

    if (!window.confirm("Bạn có chắc muốn xóa tài khoản?")) {
      return;
    }

    setAccounts((old) =>
      old.filter((account) => account.id !== id)
    );

    if (String(viewAccountId) === String(id)) {
      setViewAccountId("");
    }

    deleteSound();
  }

  /* =======================================================
     RESET FORM GIAO DỊCH
  ======================================================= */

  function resetTransactionForm() {
    setTransactionForm({
      date: todayString(),

      description: "",

      amount: "",

      category: "food",

      accountId: "",

      adjustmentDirection: "plus",

      fromAccountId: "",

      toAccountId: "",
    });
  }

  /* =======================================================
     THÊM GIAO DỊCH
  ======================================================= */

  function addTransaction(event) {
    event.preventDefault();

    const amount = Math.abs(Number(transactionForm.amount));

    if (!transactionForm.date) {
      alert("Vui lòng chọn ngày.");

      return;
    }

    if (!amount) {
      alert("Vui lòng nhập số tiền.");

      return;
    }

    /* CHUYỂN TIỀN */

    if (formType === "transfer") {
      if (
        !transactionForm.fromAccountId ||
        !transactionForm.toAccountId
      ) {
        alert(
          "Vui lòng chọn tài khoản nguồn và tài khoản đích."
        );

        return;
      }

      if (
        transactionForm.fromAccountId ===
        transactionForm.toAccountId
      ) {
        alert(
          "Tài khoản nguồn và tài khoản đích phải khác nhau."
        );

        return;
      }

      const sourceAccount = getAccount(
        transactionForm.fromAccountId
      );

      if (
        sourceAccount &&
        getAccountBalance(sourceAccount) < amount
      ) {
        const allow = window.confirm(
          "Số tiền chuyển lớn hơn số dư hiện tại. Bạn vẫn muốn tiếp tục?"
        );

        if (!allow) return;
      }

      const transaction = {
        id: createId(),

        type: "transfer",

        date: transactionForm.date,

        description:
          transactionForm.description || "Chuyển tiền",

        amount,

        fromAccountId: transactionForm.fromAccountId,

        toAccountId: transactionForm.toAccountId,
      };

      setTransactions((old) => [...old, transaction]);
    } else {
      /* THU / CHI / ĐIỀU CHỈNH */

      if (!transactionForm.accountId) {
        alert("Vui lòng chọn tài khoản.");

        return;
      }

      const selectedAccountObject = getAccount(
        transactionForm.accountId
      );

      if (
        formType === "expense" &&
        selectedAccountObject &&
        getAccountBalance(selectedAccountObject) < amount
      ) {
        const allow = window.confirm(
          "Khoản chi lớn hơn số dư tài khoản. Bạn vẫn muốn tiếp tục?"
        );

        if (!allow) return;
      }

      const transaction = {
        id: createId(),

        type: formType,

        date: transactionForm.date,

        description: transactionForm.description,

        amount,

        accountId: transactionForm.accountId,

        ...(formType === "expense"
          ? {
              category: transactionForm.category,
            }
          : {}),

        ...(formType === "adjustment"
          ? {
              adjustmentDirection:
                transactionForm.adjustmentDirection,
            }
          : {}),
      };

      setTransactions((old) => [...old, transaction]);
    }

    setSelectedMonth(transactionForm.date.slice(0, 7));

    resetTransactionForm();

    successSound();
  }

  /* =======================================================
     XÓA GIAO DỊCH
  ======================================================= */

  function deleteTransaction(id) {
    if (!window.confirm("Bạn có chắc muốn xóa giao dịch?")) {
      return;
    }

    setTransactions((old) =>
      old.filter((item) => item.id !== id)
    );

    deleteSound();
  }

  /* =======================================================
     SỬA GIAO DỊCH
  ======================================================= */

  function startEdit(transaction) {
    setEditingTransaction({
      ...transaction,

      amount: Math.abs(Number(transaction.amount || 0)),
    });
  }

  function saveEdit(event) {
    event.preventDefault();

    if (!editingTransaction) return;

    const amount = Math.abs(Number(editingTransaction.amount));

    if (!editingTransaction.date || !amount) {
      alert("Ngày và số tiền không được để trống.");

      return;
    }

    if (editingTransaction.type === "transfer") {
      if (
        !editingTransaction.fromAccountId ||
        !editingTransaction.toAccountId
      ) {
        alert("Vui lòng chọn đủ hai tài khoản.");

        return;
      }

      if (
        editingTransaction.fromAccountId ===
        editingTransaction.toAccountId
      ) {
        alert(
          "Tài khoản nguồn và tài khoản đích phải khác nhau."
        );

        return;
      }
    } else if (!editingTransaction.accountId) {
      alert("Vui lòng chọn tài khoản.");

      return;
    }

    const updated = {
      ...editingTransaction,

      amount,
    };

    setTransactions((old) =>
      old.map((item) =>
        item.id === updated.id ? updated : item
      )
    );

    setSelectedMonth(updated.date.slice(0, 7));

    setEditingTransaction(null);

    successSound();
  }

  /* =======================================================
     LỌC GIAO DỊCH
  ======================================================= */

  const filteredTransactions = useMemo(() => {
    let result = [...monthTransactions];

    const search = filters.search.trim().toLowerCase();

    if (search) {
      result = result.filter((item) => {
        let accountText = "";

        if (item.type === "transfer") {
          accountText = `${getAccountName(
            item.fromAccountId
          )} ${getAccountName(item.toAccountId)}`;
        } else {
          accountText = getAccountName(item.accountId);
        }

        const categoryText =
          item.type === "expense"
            ? categories[item.category]?.label || ""
            : "";

        return `${item.description || ""} ${accountText} ${categoryText}`
          .toLowerCase()
          .includes(search);
      });
    }

    if (filters.type !== "all") {
      result = result.filter(
        (item) => item.type === filters.type
      );
    }

    if (filters.category !== "all") {
      result = result.filter(
        (item) =>
          item.type === "expense" &&
          item.category === filters.category
      );
    }

    if (filters.accountId !== "all") {
      result = result.filter((item) => {
        if (item.type === "transfer") {
          return (
            String(item.fromAccountId) ===
              String(filters.accountId) ||
            String(item.toAccountId) ===
              String(filters.accountId)
          );
        }

        return (
          String(item.accountId) ===
          String(filters.accountId)
        );
      });
    }

    if (filters.dateFrom) {
      result = result.filter(
        (item) => item.date >= filters.dateFrom
      );
    }

    if (filters.dateTo) {
      result = result.filter(
        (item) => item.date <= filters.dateTo
      );
    }

    if (filters.minAmount !== "") {
      result = result.filter(
        (item) =>
          Math.abs(Number(item.amount)) >=
          Number(filters.minAmount)
      );
    }

    if (filters.maxAmount !== "") {
      result = result.filter(
        (item) =>
          Math.abs(Number(item.amount)) <=
          Number(filters.maxAmount)
      );
    }

    result.sort((a, b) => {
      if (filters.sort === "newest") {
        return b.date.localeCompare(a.date);
      }

      if (filters.sort === "oldest") {
        return a.date.localeCompare(b.date);
      }

      if (filters.sort === "highest") {
        return Number(b.amount) - Number(a.amount);
      }

      if (filters.sort === "lowest") {
        return Number(a.amount) - Number(b.amount);
      }

      return 0;
    });

    return result;
  }, [monthTransactions, filters, accounts]);

  const filteredTotals = useMemo(
    () => calculateTotals(filteredTransactions),
    [filteredTransactions]
  );

  const filteredAverage =
    filteredTransactions.length > 0
      ? filteredTransactions.reduce(
          (sum, item) =>
            sum + Math.abs(Number(item.amount || 0)),
          0
        ) / filteredTransactions.length
      : 0;

  const filteredHighest =
    filteredTransactions.length > 0
      ? Math.max(
          ...filteredTransactions.map((item) =>
            Math.abs(Number(item.amount || 0))
          )
        )
      : 0;

  function resetFilters() {
    setFilters({
      search: "",

      type: "all",

      category: "all",

      accountId: "all",

      dateFrom: "",

      dateTo: "",

      minAmount: "",

      maxAmount: "",

      sort: "newest",
    });

    playSound();
  }

  /* =======================================================
     LỊCH
  ======================================================= */

  const [selectedYear, selectedMonthNumber] = selectedMonth
    .split("-")
    .map(Number);

  const calendarCells = useMemo(() => {
    const firstDate = new Date(
      selectedYear,
      selectedMonthNumber - 1,
      1
    );

    const numberOfDays = new Date(
      selectedYear,
      selectedMonthNumber,
      0
    ).getDate();

    let start = firstDate.getDay();

    start = start === 0 ? 6 : start - 1;

    const cells = [];

    for (let i = 0; i < start; i++) {
      cells.push(null);
    }

    for (let day = 1; day <= numberOfDays; day++) {
      cells.push(day);
    }

    return cells;
  }, [selectedYear, selectedMonthNumber]);

  function dailyTotals(day) {
    const date = `${selectedYear}-${pad(
      selectedMonthNumber
    )}-${pad(day)}`;

    const data = monthTransactions.filter(
      (item) => item.date === date
    );

    return calculateTotals(data);
  }

  /* =======================================================
     LỊCH SỬ TÀI KHOẢN
  ======================================================= */

  const selectedAccount = getAccount(viewAccountId);

  const selectedAccountHistory = useMemo(() => {
    if (!viewAccountId) {
      return [];
    }

    return transactions
      .filter((item) => {
        if (item.type === "transfer") {
          return (
            String(item.fromAccountId) ===
              String(viewAccountId) ||
            String(item.toAccountId) ===
              String(viewAccountId)
          );
        }

        return (
          String(item.accountId) === String(viewAccountId)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, viewAccountId]);

  /* =======================================================
     DASHBOARD - BIẾN ĐỘNG TIỀN VÀO / TIỀN RA
  ======================================================= */

  const dashboardFlowData = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    let cumulative = 0;

    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1;
      const date = `${selectedMonth}-${pad(day)}`;
      const dayTransactions = transactions.filter(
        (item) => item.date === date
      );

      let income = 0;
      let expense = 0;
      let adjustment = 0;

      dayTransactions.forEach((item) => {
        const amount = Math.abs(Number(item.amount || 0));

        if (item.type === "income") income += amount;
        if (item.type === "expense") expense += amount;
        if (item.type === "adjustment") {
          adjustment +=
            item.adjustmentDirection === "minus"
              ? -amount
              : amount;
        }
      });

      cumulative += income + adjustment - expense;

      return {
        day,
        income,
        expense,
        adjustment,
        net: income + adjustment - expense,
        cumulative,
      };
    });
  }, [transactions, selectedMonth]);

  /* =======================================================
     DASHBOARD - THÔNG BÁO
  ======================================================= */

  const dashboardNotifications = useMemo(() => {
    const items = [];

    if (totalBudget > 0 && budgetPercent >= 100) {
      items.push({
        id: `budget-danger-${selectedMonth}`,
        type: "danger",
        title: "Đã vượt ngân sách",
        text: `Đã chi ${formatMoney(budgetUsed)} / ${formatMoney(totalBudget)}.`,
        actionPage: "budget",
      });
    } else if (totalBudget > 0 && budgetPercent >= 80) {
      items.push({
        id: `budget-warning-${selectedMonth}`,
        type: "warning",
        title: "Ngân sách sắp đạt giới hạn",
        text: `Đã sử dụng ${budgetPercent.toFixed(0)}% ngân sách tháng.`,
        actionPage: "budget",
      });
    }

    if (accounts.length === 0) {
      items.push({
        id: "no-account",
        type: "info",
        title: "Chưa có tài khoản",
        text: "Hãy tạo tài khoản để bắt đầu theo dõi số dư.",
        actionPage: "accounts",
      });
    }

    if (monthTransactions.length > 0) {
      const latest = [...monthTransactions].sort((a, b) =>
        b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))
      )[0];

      items.push({
        id: `latest-${latest.id}`,
        type: "success",
        title: "Giao dịch mới nhất",
        text: `${latest.description || "Giao dịch"} · ${formatMoney(latest.amount)}.`,
        actionPage: "transactions",
      });
    }

    if (monthTransactions.length === 0) {
      items.push({
        id: `empty-month-${selectedMonth}`,
        type: "info",
        title: "Chưa có giao dịch",
        text: `Tháng ${formatMonth(selectedMonth)} chưa có dữ liệu.`,
        actionPage: "transactions",
      });
    }

    return items.slice(0, 5);
  }, [
    totalBudget,
    budgetPercent,
    budgetUsed,
    accounts.length,
    monthTransactions,
    selectedMonth,
  ]);

  const unreadNotifications = useMemo(() => {
    return dashboardNotifications.filter(
      (item) => !readNotificationIds.includes(item.id)
    );
  }, [dashboardNotifications, readNotificationIds]);

  function markNotificationRead(id) {
    setReadNotificationIds((old) => {
      if (old.includes(id)) return old;

      const next = [...old, id].slice(-100);
      localStorage.setItem(READ_NOTIFICATION_KEY, JSON.stringify(next));
      return next;
    });
  }

  function markAllNotificationsRead() {
    setReadNotificationIds((old) => {
      const next = Array.from(
        new Set([...old, ...dashboardNotifications.map((item) => item.id)])
      ).slice(-100);
      localStorage.setItem(READ_NOTIFICATION_KEY, JSON.stringify(next));
      return next;
    });
  }

  function openNotification(item) {
    markNotificationRead(item.id);
    setShowNotifications(false);
    if (item.actionPage) {
      setActivePage(item.actionPage);
      playSound(620, 0.05);
    }
  }

  useEffect(() => {
    if (activePage !== "dashboard") {
      setShowNotifications(false);
    }
  }, [activePage]);

  useEffect(() => {
    function handleOutsideNotificationClick(event) {
      if (
        showNotifications &&
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
      }
    }

    function handleNotificationEscape(event) {
      if (event.key === "Escape") {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideNotificationClick);
    document.addEventListener("keydown", handleNotificationEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideNotificationClick);
      document.removeEventListener("keydown", handleNotificationEscape);
    };
  }, [showNotifications]);

  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) {
          setUserEmail(data.user?.email || "");
        }
      })
      .catch(() => {
        if (mounted) setUserEmail("");
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordMessageType("");

    if (newPassword.length < 8) {
      setPasswordMessage("Mật khẩu mới phải có ít nhất 8 ký tự.");
      setPasswordMessageType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("Mật khẩu xác nhận không khớp.");
      setPasswordMessageType("error");
      return;
    }

    setPasswordSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordMessage(error.message || "Không thể đổi mật khẩu.");
        setPasswordMessageType("error");
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Đổi mật khẩu thành công.");
      setPasswordMessageType("success");
      playSound(720, 0.06);
    } catch (error) {
      console.error(error);
      setPasswordMessage("Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại.");
      setPasswordMessageType("error");
    } finally {
      setPasswordSaving(false);
    }
  }

  /* =======================================================
     XUẤT DỮ LIỆU RA FILE JSON
  ======================================================= */

  function exportData() {
    const payload = {
      app: "blue-finance",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        accounts,
        transactions,
        budgets,
      },
    };

    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `blue-finance-backup-${todayString()}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      setImportMessage("Đã xuất file sao lưu thành công.");
      setImportMessageType("success");
      successSound();
    } catch (error) {
      console.error(error);
      setImportMessage("Không thể xuất file sao lưu. Vui lòng thử lại.");
      setImportMessageType("error");
    }
  }

  /* =======================================================
     NHẬP DỮ LIỆU TỪ FILE JSON
  ======================================================= */

  function triggerImportFile() {
    importFileInputRef.current?.click();
  }

  function handleImportFile(event) {
    const file = event.target.files?.[0];

    /* CHO PHÉP CHỌN LẠI CÙNG 1 FILE LẦN NỮA */
    event.target.value = "";

    if (!file) return;

    setImportMessage("");
    setImportMessageType("");

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));

        /* HỖ TRỢ CẢ FILE CÓ BỌC { data: {...} } VÀ FILE THÔ {...} */
        const data = parsed?.data || parsed;

        const nextAccounts = Array.isArray(data?.accounts)
          ? data.accounts
          : null;

        const nextTransactions = Array.isArray(data?.transactions)
          ? data.transactions
          : null;

        const nextBudgets =
          data?.budgets &&
          typeof data.budgets === "object" &&
          !Array.isArray(data.budgets)
            ? data.budgets
            : null;

        if (!nextAccounts || !nextTransactions || !nextBudgets) {
          setImportMessage(
            "File không đúng định dạng sao lưu của Blue Finance."
          );
          setImportMessageType("error");
          return;
        }

        const confirmed = window.confirm(
          "Nhập dữ liệu sẽ THAY THẾ toàn bộ tài khoản, giao dịch và ngân sách hiện tại bằng dữ liệu trong file. Bạn có chắc chắn muốn tiếp tục?"
        );

        if (!confirmed) return;

        setAccounts(nextAccounts);
        setTransactions(nextTransactions);
        setBudgets(nextBudgets);

        setImportMessage("Nhập dữ liệu thành công.");
        setImportMessageType("success");
        successSound();
      } catch (error) {
        console.error(error);
        setImportMessage(
          "Không thể đọc file. Vui lòng kiểm tra lại file JSON."
        );
        setImportMessageType("error");
      }
    };

    reader.onerror = () => {
      setImportMessage("Không thể đọc file. Vui lòng thử lại.");
      setImportMessageType("error");
    };

    reader.readAsText(file);
  }

  /* =======================================================
     MENU
  ======================================================= */

  const pages = [
    {
      id: "dashboard",

      label: "Tổng quan",

      icon: LayoutDashboard,
    },

    {
      id: "transactions",

      label: "Nhật ký giao dịch",

      icon: List,
    },

    {
      id: "monthlyTable",

      label: "Bảng chi tiêu tháng",

      icon: Table2,
    },

    {
      id: "calendar",

      label: "Lịch chi tiêu",

      icon: CalendarDays,
    },

    {
      id: "reports",

      label: "Báo cáo theo tháng",

      icon: BarChart3,
    },

    {
      id: "budget",

      label: "Ngân sách tháng",

      icon: Target,
    },

    {
      id: "accounts",

      label: "Tài khoản tài chính",

      icon: Wallet,
    },

    {
      id: "profile",

      label: "Tài khoản & bảo mật",

      icon: UserRound,
    },
  ];

  const pageTitle =
    pages.find((item) => item.id === activePage)?.label ||
    "Blue Finance";

  return (
    <>
      <style>{styles}</style>

      <div className={`app ${isDarkMode ? "dark-mode" : "light-mode"}`}>
        {/* ===================================================
            SIDEBAR
        =================================================== */}

        <aside className="sidebar">
          <div className="brand">
            <ShieldCheck size={31} />

            <div>
              <strong>BLUE FINANCE</strong>

              <span>PERSONAL FINANCE SYSTEM</span>
            </div>
          </div>

          <div className="nav-label">
            ĐIỀU HƯỚNG
          </div>

          {pages.map((page) => {
            const Icon = page.icon;

            return (
              <button
                key={page.id}
                className={`nav-button ${
                  activePage === page.id ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(page.id);

                  playSound();
                }}
              >
                <Icon size={21} />

                {page.label}
              </button>
            );
          })}

          <div className="system-status">
            <strong>
              <Shield size={16} />

              TRẠNG THÁI HỆ THỐNG
            </strong>

            <p>
              <span className="dot" />

              Giao dịch liên kết tài khoản
            </p>

            <p>
              <span className="dot" />

              Số dư tự động
            </p>

            <p>
              <span className="dot" />

              Ngân sách tự cập nhật
            </p>

            <p>
              <Volume2 size={14} />

              Âm thanh hoạt động
            </p>
          </div>

          <div className="sidebar-bottom">
            <div className="sidebar-user">
              <div className="sidebar-user-icon">
                <UserRound size={17} />
              </div>

              <div>
                <strong>Tài khoản đăng nhập</strong>
                <span>{userEmail || "Chưa xác định email"}</span>
              </div>
            </div>

            <button
              type="button"
              className="sidebar-logout-button"
              onClick={() => {
                handleLogout();
                playSound(420, 0.06);
              }}
            >
              <LogOut size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        {/* ===================================================
            MAIN
        =================================================== */}

        <main className="main">
          <div className="container">
            {/* HEADER */}

            <header className="header">
              <div className="header-left">
                <div className="eyebrow">
                  <Shield size={17} />

                  HỆ THỐNG QUẢN LÝ TÀI CHÍNH
                </div>

                <h1>{pageTitle}</h1>

                {activePage === "dashboard" && (
                  <p>
                    Đang xem {formatMonth(selectedMonth)}
                  </p>
                )}
              </div>

              {activePage === "dashboard" && (
                <div className="header-actions">
                  <div className="dashboard-search">
                    <Search size={18} />

                    <input
                      value={dashboardSearch}
                      placeholder="Tìm kiếm giao dịch..."
                      onChange={(event) =>
                        setDashboardSearch(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          playSound();
                        }
                      }}
                    />
                  </div>

                  <select
                    className="month-select"
                    value={selectedMonth}
                    onChange={(event) => {
                      setSelectedMonth(event.target.value);
                      playSound();
                    }}
                  >
                    {availableMonths.map((month) => (
                      <option key={month} value={month}>
                        {formatMonth(month)}
                      </option>
                    ))}
                  </select>

                  <div
                    className="header-notification-wrap"
                    ref={notificationRef}
                  >
                    <button
                      type="button"
                      className={`icon-button ${
                        showNotifications ? "active" : ""
                      }`}
                      title="Thông báo"
                      onClick={() => {
                        setShowNotifications((old) => !old);
                        playSound(620, 0.05);
                      }}
                    >
                      <Bell size={19} />

                      {unreadNotifications.length > 0 && (
                        <span className="notification-badge">
                          {unreadNotifications.length}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <div className="notification-dropdown">
                        <div className="notification-header">
                          <div>
                            <strong>Thông báo</strong>
                            <span>
                              {unreadNotifications.length > 0
                                ? `${unreadNotifications.length} mục chưa đọc`
                                : "Không có thông báo mới"}
                            </span>
                          </div>

                          {unreadNotifications.length > 0 ? (
                            <button
                              type="button"
                              className="notification-read-all"
                              onClick={(event) => {
                                event.stopPropagation();
                                markAllNotificationsRead();
                                setShowNotifications(false);
                                playSound(700, 0.05);
                              }}
                            >
                              Đọc tất cả
                            </button>
                          ) : (
                            <Bell size={17} />
                          )}
                        </div>

                        {unreadNotifications.length === 0 ? (
                          <div className="notification-empty">
                            Bạn đã xem hết thông báo.
                          </div>
                        ) : (
                          unreadNotifications.map((item) => (
                            <button
                              type="button"
                              key={item.id}
                              className={`notification-item ${item.type}`}
                              onClick={() => openNotification(item)}
                            >
                              <div className="notification-dot" />

                              <div>
                                <strong>{item.title}</strong>
                                <span>{item.text}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="theme-toggle-button"
                    title={isDarkMode ? "Chuyển sang ban ngày" : "Chuyển sang ban đêm"}
                    aria-label={isDarkMode ? "Chuyển sang ban ngày" : "Chuyển sang ban đêm"}
                    onClick={() => {
                      setIsDarkMode((old) => !old);
                      playSound(520, 0.05);
                    }}
                  >
                    {isDarkMode ? <Sun size={19} /> : <Moon size={19} />}
                  </button>
                </div>
              )}
            </header>

            {/* =================================================
                TỔNG QUAN
            ================================================= */}

            {activePage === "dashboard" && (
              <>
                <div className="summary-grid dashboard-summary-grid">
                  <SummaryCard
                    icon={ArrowUpCircle}
                    title="TỔNG ĐẦU VÀO"
                    value={totals.income}
                    className="income"
                  />

                  <SummaryCard
                    icon={ArrowDownCircle}
                    title="TỔNG ĐẦU RA"
                    value={totals.expense}
                    className="expense"
                  />

                  <SummaryCard
                    icon={Gift}
                    title="ĐIỀU CHỈNH"
                    value={totals.adjustment}
                    className="adjustment"
                  />

                  <SummaryCard
                    icon={CircleDollarSign}
                    title={
                      totals.remaining >= 0
                        ? "DƯ TRONG THÁNG"
                        : "ÂM TRONG THÁNG"
                    }
                    value={Math.abs(totals.remaining)}
                    className={
                      totals.remaining >= 0 ? "positive" : "expense"
                    }
                  />

                  <SummaryCard
                    icon={Wallet}
                    title="TỔNG TÀI SẢN"
                    value={totalAssets}
                    className="asset"
                  />
                </div>

                <div id="dashboard-quick-add">
                <div className="transaction-page-add">
                  <section className="panel transaction-add-panel">
                    <PanelTitle
                      title="Thêm giao dịch"
                      subtitle="Mọi giao dịch đều liên kết tài khoản"
                    />

                    <div className="transaction-tabs">
                      <TabButton
                        active={formType === "expense"}
                        onClick={() => {
                          setFormType("expense");

                          playSound();
                        }}
                        icon={ArrowDownCircle}
                      >
                        Đầu ra
                      </TabButton>

                      <TabButton
                        active={formType === "income"}
                        onClick={() => {
                          setFormType("income");

                          playSound();
                        }}
                        icon={ArrowUpCircle}
                      >
                        Đầu vào
                      </TabButton>

                      <TabButton
                        active={formType === "adjustment"}
                        onClick={() => {
                          setFormType("adjustment");

                          playSound();
                        }}
                        icon={SlidersHorizontal}
                      >
                        Tip / Âm
                      </TabButton>

                      <TabButton
                        active={formType === "transfer"}
                        onClick={() => {
                          setFormType("transfer");

                          playSound();
                        }}
                        icon={ArrowLeftRight}
                      >
                        Chuyển tiền
                      </TabButton>
                    </div>

                    <form
                      className="form"
                      onSubmit={addTransaction}
                    >
                      <FormField label="Ngày">
                        <input
                          type="date"
                          value={transactionForm.date}
                          onChange={(event) =>
                            setTransactionForm({
                              ...transactionForm,

                              date: event.target.value,
                            })
                          }
                        />
                      </FormField>

                      {formType === "expense" && (
                        <FormField label="Danh mục chi">
                          <select
                            value={transactionForm.category}
                            onChange={(event) =>
                              setTransactionForm({
                                ...transactionForm,

                                category:
                                  event.target.value,
                              })
                            }
                          >
                            <option value="food">
                              Tiền ăn
                            </option>

                            <option value="rent">
                              Tiền trọ
                            </option>

                            <option value="other">
                              Chi khác
                            </option>
                          </select>
                        </FormField>
                      )}

                      {formType === "adjustment" && (
                        <FormField label="Loại">
                          <select
                            value={
                              transactionForm.adjustmentDirection
                            }
                            onChange={(event) =>
                              setTransactionForm({
                                ...transactionForm,

                                adjustmentDirection:
                                  event.target.value,
                              })
                            }
                          >
                            <option value="plus">
                              Tip / Cộng (+)
                            </option>

                            <option value="minus">
                              Âm / Trừ (-)
                            </option>
                          </select>
                        </FormField>
                      )}

                      {formType !== "transfer" ? (
                        <FormField label="Tài khoản">
                          <select
                            value={transactionForm.accountId}
                            onChange={(event) =>
                              setTransactionForm({
                                ...transactionForm,

                                accountId:
                                  event.target.value,
                              })
                            }
                          >
                            <option value="">
                              -- Chọn tài khoản --
                            </option>

                            {accounts.map((account) => (
                              <option
                                key={account.id}
                                value={account.id}
                              >
                                {account.name} -{" "}
                                {formatMoney(
                                  getAccountBalance(account)
                                )}
                              </option>
                            ))}
                          </select>
                        </FormField>
                      ) : (
                        <>
                          <FormField label="Từ tài khoản">
                            <select
                              value={
                                transactionForm.fromAccountId
                              }
                              onChange={(event) =>
                                setTransactionForm({
                                  ...transactionForm,

                                  fromAccountId:
                                    event.target.value,
                                })
                              }
                            >
                              <option value="">
                                -- Tài khoản nguồn --
                              </option>

                              {accounts.map((account) => (
                                <option
                                  key={account.id}
                                  value={account.id}
                                >
                                  {account.name}
                                </option>
                              ))}
                            </select>
                          </FormField>

                          <FormField label="Đến tài khoản">
                            <select
                              value={
                                transactionForm.toAccountId
                              }
                              onChange={(event) =>
                                setTransactionForm({
                                  ...transactionForm,

                                  toAccountId:
                                    event.target.value,
                                })
                              }
                            >
                              <option value="">
                                -- Tài khoản đích --
                              </option>

                              {accounts.map((account) => (
                                <option
                                  key={account.id}
                                  value={account.id}
                                >
                                  {account.name}
                                </option>
                              ))}
                            </select>
                          </FormField>
                        </>
                      )}

                      <FormField label="Nội dung">
                        <input
                          placeholder={
                            formType === "expense"
                              ? "Ví dụ: Ăn trưa / Đổ xăng..."
                              : formType === "income"
                              ? "Ví dụ: Bố gửi / Tiền lương..."
                              : formType === "transfer"
                              ? "Ví dụ: Rút tiền mặt"
                              : "Ví dụ: Được tip / Điều chỉnh..."
                          }
                          value={
                            transactionForm.description
                          }
                          onChange={(event) =>
                            setTransactionForm({
                              ...transactionForm,

                              description:
                                event.target.value,
                            })
                          }
                        />
                      </FormField>

                      <FormField label="Số tiền">
                        <input
                          type="number"
                          min="0"
                          placeholder="Nhập số tiền"
                          value={transactionForm.amount}
                          onChange={(event) =>
                            setTransactionForm({
                              ...transactionForm,

                              amount:
                                event.target.value,
                            })
                          }
                        />
                      </FormField>

                      <button className="primary-button">
                        <Plus size={19} />

                        THÊM GIAO DỊCH
                      </button>
                    </form>
                  </section>

                </div>

                </div>

                <section className="dashboard-overview-grid">
                  <div className="panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <div className="panel-kicker">GIAO DỊCH</div>
                        <h2>Giao dịch gần đây</h2>
                        <span>
                          {dashboardSearch.trim()
                            ? `Kết quả tìm kiếm: "${dashboardSearch.trim()}"`
                            : `5 giao dịch mới nhất trong ${formatMonth(selectedMonth)}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          setActivePage("transactions");
                          playSound();
                        }}
                      >
                        Xem tất cả →
                      </button>
                    </div>

                    <DashboardRecentTransactions
                      transactions={monthTransactions}
                      getAccountName={getAccountName}
                      search={dashboardSearch}
                    />
                  </div>

                  <div className="panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <div className="panel-kicker">TÀI SẢN</div>
                        <h2>Phân bổ số dư</h2>
                        <span>{accounts.length} tài khoản đang theo dõi</span>
                      </div>
                      <Wallet size={22} />
                    </div>

                    <DashboardAccountBalances
                      accounts={accounts}
                      getAccountBalance={getAccountBalance}
                    />

                    <button
                      type="button"
                      className="secondary-button dashboard-wide-button"
                      onClick={() => {
                        setActivePage("accounts");
                        playSound();
                      }}
                    >
                      <Wallet size={17} />
                      Quản lý tài khoản
                    </button>
                  </div>
                </section>

                <section className="dashboard-bottom-grid">
                  <div className="panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <div className="panel-kicker">NGÂN SÁCH</div>
                        <h2>Tình hình ngân sách</h2>
                        <span>{formatMonth(selectedMonth)}</span>
                      </div>
                      <Target size={22} />
                    </div>

                    {totalBudget > 0 ? (
                      <>
                        <div className="dashboard-budget-total">
                          <div>
                            <span>Đã sử dụng</span>
                            <strong className={budgetPercent >= 100 ? "expense" : budgetPercent >= 80 ? "adjustment" : "positive"}>
                              {budgetPercent.toFixed(0)}%
                            </strong>
                          </div>
                          <span>
                            {formatMoney(budgetUsed)} / {formatMoney(totalBudget)}
                          </span>
                        </div>

                        <div className="dashboard-budget-track">
                          <span
                            style={{
                              width: `${Math.min(budgetPercent, 100)}%`,
                            }}
                            className={budgetPercent >= 100 ? "danger" : budgetPercent >= 80 ? "warning" : "safe"}
                          />
                        </div>

                        <div className="dashboard-budget-mini-grid">
                          <BudgetMini label="Ăn uống" spent={totals.food} budget={currentBudget.food} />
                          <BudgetMini label="Tiền trọ" spent={totals.rent} budget={currentBudget.rent} />
                          <BudgetMini label="Chi khác" spent={totals.other} budget={currentBudget.other} />
                        </div>
                      </>
                    ) : (
                      <Empty>Chưa thiết lập ngân sách cho tháng này.</Empty>
                    )}

                    <button
                      type="button"
                      className="secondary-button dashboard-wide-button"
                      onClick={() => {
                        setActivePage("budget");
                        playSound();
                      }}
                    >
                      <Target size={17} />
                      Xem ngân sách tháng
                    </button>
                  </div>

                  <div className="panel dashboard-quick-panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <div className="panel-kicker">TỔNG QUAN</div>
                        <h2>Thao tác nhanh</h2>
                        <span>Chuyển đến chức năng bạn cần</span>
                      </div>
                      <Plus size={22} />
                    </div>

                    <div className="dashboard-quick-actions">
                      <button type="button" onClick={() => {
                        document
                          .getElementById("dashboard-quick-add")
                          ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        playSound();
                      }}>
                        <ArrowDownCircle size={19} />
                        <span>Thêm giao dịch</span>
                        <small>Thu / chi / chuyển tiền</small>
                      </button>
                      <button type="button" onClick={() => { setActivePage("reports"); playSound(); }}>
                        <BarChart3 size={19} />
                        <span>Xem báo cáo</span>
                        <small>Biểu đồ và phân bổ chi tiêu</small>
                      </button>
                      <button type="button" onClick={() => { setActivePage("monthlyTable"); playSound(); }}>
                        <Table2 size={19} />
                        <span>Bảng chi tiêu tháng</span>
                        <small>Theo dõi từng ngày</small>
                      </button>
                    </div>
                  </div>
                </section>

                <div className="dashboard-note">
                  <ShieldCheck size={18} />
                  <span>Biểu đồ chi tiết, phân bổ chi tiêu và biến động tiền vào/ra đã được chuyển sang <strong>Báo cáo theo tháng</strong> để phần Tổng quan gọn và dễ theo dõi hơn.</span>
                  <button type="button" onClick={() => { setActivePage("reports"); playSound(); }}>Xem báo cáo →</button>
                </div>
              </>
            )}

            {/* =================================================
                NHẬT KÝ GIAO DỊCH
            ================================================= */}

            {activePage === "transactions" && (
              <>
                <div className="mini-grid">
                  <MiniStat
                    label="GIAO DỊCH"
                    value={`${transactionMonthTransactions.length} giao dịch`}
                  />

                  <MiniStat
                    label="ĐẦU VÀO"
                    value={formatMoney(calculateTotals(transactionMonthTransactions).income)}
                    className="income"
                  />

                  <MiniStat
                    label="ĐẦU RA"
                    value={formatMoney(calculateTotals(transactionMonthTransactions).expense)}
                    className="expense"
                  />

                  <MiniStat
                    label="ĐIỀU CHỈNH"
                    value={formatMoney(calculateTotals(transactionMonthTransactions).adjustment)}
                    className="adjustment"
                  />

                  <MiniStat
                    label="CÒN / ÂM"
                    value={formatMoney(Math.abs(calculateTotals(transactionMonthTransactions).remaining))}
                    className={calculateTotals(transactionMonthTransactions).remaining >= 0 ? "positive" : "expense"}
                  />
                </div>

                <section className="panel">
                  <PanelTitle
                    title="Nhật ký giao dịch"
                    subtitle={`${formatMonth(transactionMonth)} • ${transactionMonthTransactions.length} giao dịch`}
                  />

                  <div className="page-month-toolbar">
                    <label>
                      <CalendarDays size={16} />
                      <span>Tháng xem nhật ký</span>
                    </label>
                    <select
                      className="page-month-select"
                      value={transactionMonth}
                      onChange={(event) => {
                        setTransactionMonth(event.target.value);
                        setEditingTransaction(null);
                        playSound();
                      }}
                    >
                      {availableMonths.map((month) => (
                        <option key={month} value={month}>
                          {formatMonth(month)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <TransactionTable
                    data={[...transactionMonthTransactions].sort((a, b) =>
                      b.date.localeCompare(a.date) ||
                      String(b.id).localeCompare(String(a.id))
                    )}
                    getAccountName={getAccountName}
                    onEdit={startEdit}
                    onDelete={deleteTransaction}
                  />
                </section>
              </>
            )}

            {/* =================================================
                BẢNG CHI TIÊU THÁNG - MỚI
            ================================================= */}

            {activePage === "monthlyTable" && (
              <>
                <section className="panel">
                  <PanelTitle
                    title="Bảng chi tiêu hàng tháng"
                    subtitle={formatMonth(
                      monthlyTableMonth
                    )}
                  />

                  <div className="page-month-toolbar">
                    <label>
                      <CalendarDays size={16} />
                      <span>Tháng xem bảng</span>
                    </label>
                    <select
                      className="page-month-select"
                      value={monthlyTableMonth}
                      onChange={(event) => {
                        setMonthlyTableMonth(event.target.value);
                        playSound();
                      }}
                    >
                      {availableMonths.map((month) => (
                        <option key={month} value={month}>
                          {formatMonth(month)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sheet-info">
                    <div>
                      <Table2 size={22} />

                      <div>
                        <strong>
                          BẢNG DỮ LIỆU THÁNG
                        </strong>

                        <span>
                          Các giao dịch cùng ngày được tự động
                          cộng vào đúng cột.
                        </span>
                      </div>
                    </div>

                    <strong>
                      {monthlyExpenseTable.length} ngày có dữ
                      liệu
                    </strong>
                  </div>

                  <div className="monthly-sheet-wrapper">
                    <table className="monthly-sheet">
                      <thead>
                        <tr>
                          <th>
                            NGÀY / THÁNG / NĂM
                          </th>

                          <th>
                            TIỀN ĂN
                          </th>

                          <th>
                            TIỀN TRỌ
                          </th>

                          <th>
                            CHI KHÁC
                          </th>

                          <th>
                            TIP / ÂM
                          </th>

                          <th>
                            TỔNG CHI NGÀY
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {monthlyExpenseTable.length === 0 ? (
                          <tr>
                            <td
                              colSpan="6"
                              className="sheet-empty"
                            >
                              Chưa có dữ liệu trong{" "}
                              {formatMonth(
                                selectedMonth
                              )}
                            </td>
                          </tr>
                        ) : (
                          monthlyExpenseTable.map(
                            (row) => {
                              const dailyExpense =
                                row.food +
                                row.rent +
                                row.other;

                              return (
                                <tr
                                  key={row.date}
                                >
                                  <td className="sheet-date">
                                    {formatDate(
                                      row.date
                                    )}
                                  </td>

                                  <td>
                                    {row.food > 0
                                      ? formatMoney(
                                          row.food
                                        )
                                      : "-"}
                                  </td>

                                  <td>
                                    {row.rent > 0
                                      ? formatMoney(
                                          row.rent
                                        )
                                      : "-"}
                                  </td>

                                  <td>
                                    {row.other > 0
                                      ? formatMoney(
                                          row.other
                                        )
                                      : "-"}
                                  </td>

                                  <td
                                    className={
                                      row.adjustment >
                                      0
                                        ? "positive"
                                        : row.adjustment <
                                          0
                                        ? "expense"
                                        : ""
                                    }
                                  >
                                    {row.adjustment ===
                                    0
                                      ? "-"
                                      : row.adjustment >
                                        0
                                      ? `+ ${formatMoney(
                                          row.adjustment
                                        )}`
                                      : `- ${formatMoney(
                                          Math.abs(
                                            row.adjustment
                                          )
                                        )}`}
                                  </td>

                                  <td className="expense sheet-daily-total">
                                    {dailyExpense > 0
                                      ? formatMoney(
                                          dailyExpense
                                        )
                                      : "-"}
                                  </td>
                                </tr>
                              );
                            }
                          )
                        )}
                      </tbody>

                      {monthlyExpenseTable.length >
                        0 && (
                        <tfoot>
                          <tr>
                            <th>
                              TỔNG THÁNG
                            </th>

                            <th className="expense">
                              {formatMoney(
                                totals.food
                              )}
                            </th>

                            <th className="expense">
                              {formatMoney(
                                totals.rent
                              )}
                            </th>

                            <th className="expense">
                              {formatMoney(
                                totals.other
                              )}
                            </th>

                            <th
                              className={
                                totals.adjustment >=
                                0
                                  ? "positive"
                                  : "expense"
                              }
                            >
                              {totals.adjustment >
                              0
                                ? `+ ${formatMoney(
                                    totals.adjustment
                                  )}`
                                : totals.adjustment <
                                  0
                                ? `- ${formatMoney(
                                    Math.abs(
                                      totals.adjustment
                                    )
                                  )}`
                                : "0 đ"}
                            </th>

                            <th className="expense">
                              {formatMoney(
                                totals.expense
                              )}
                            </th>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </section>

                {/* THỐNG KÊ */}

                <section className="panel">
                  <PanelTitle
                    title="Bảng thống kê tháng"
                    subtitle={`Tổng hợp ${formatMonth(
                      selectedMonth
                    )}`}
                  />

                  <div className="monthly-stat-table">
                    <div className="monthly-stat-header">
                      <span>
                        KHOẢN THỐNG KÊ
                      </span>

                      <span>
                        TỔNG TIỀN
                      </span>
                    </div>

                    <MonthlyStatRow
                      label="Tổng tiền ăn"
                      value={totals.food}
                      className="expense"
                    />

                    <MonthlyStatRow
                      label="Tổng tiền trọ"
                      value={totals.rent}
                      className="expense"
                    />

                    <MonthlyStatRow
                      label="Tổng chi khác"
                      value={totals.other}
                      className="expense"
                    />

                    <MonthlyStatRow
                      label="Tổng Tip / Âm"
                      value={totals.adjustment}
                      className={
                        totals.adjustment >= 0
                          ? "positive"
                          : "expense"
                      }
                      signed
                    />

                    <MonthlyStatRow
                      label="Tiền được cho / Tiền lương"
                      value={totals.income}
                      className="income"
                    />

                    <MonthlyStatRow
                      label="TỔNG ĐẦU RA"
                      value={totals.expense}
                      className="expense"
                      strong
                    />

                    <MonthlyStatRow
                      label="TỔNG ĐẦU VÀO"
                      value={totals.income}
                      className="income"
                      strong
                    />

                    <MonthlyStatRow
                      label={
                        totals.remaining >= 0
                          ? "DƯ CUỐI THÁNG"
                          : "ÂM CUỐI THÁNG"
                      }
                      value={Math.abs(
                        totals.remaining
                      )}
                      className={
                        totals.remaining >= 0
                          ? "positive"
                          : "expense"
                      }
                      extraStrong
                    />
                  </div>
                </section>

                {/* CÔNG THỨC */}

                <section className="monthly-result-panel">
                  <div>
                    <span>
                      KẾT QUẢ THÁNG
                    </span>

                    <strong>
                      {formatMonth(
                        selectedMonth
                      )}
                    </strong>
                  </div>

                  <div className="monthly-result-formula">
                    <span>
                      {formatMoney(
                        totals.income
                      )}
                    </span>

                    <small>
                      Đầu vào
                    </small>

                    <b>+</b>

                    <span
                      className={
                        totals.adjustment >=
                        0
                          ? "positive"
                          : "expense"
                      }
                    >
                      {formatMoney(
                        totals.adjustment
                      )}
                    </span>

                    <small>
                      Tip / Âm
                    </small>

                    <b>-</b>

                    <span className="expense">
                      {formatMoney(
                        totals.expense
                      )}
                    </span>

                    <small>
                      Đầu ra
                    </small>

                    <b>=</b>

                    <span
                      className={
                        totals.remaining >=
                        0
                          ? "positive"
                          : "expense"
                      }
                    >
                      {formatMoney(
                        totals.remaining
                      )}
                    </span>

                    <small>
                      {totals.remaining >= 0
                        ? "Dư"
                        : "Âm"}
                    </small>
                  </div>
                </section>
              </>
            )}

            {/* =================================================
                LỊCH
            ================================================= */}

            {activePage === "calendar" && (
              <section className="panel">
                <PanelTitle
                  title={`Lịch tài chính ${formatMonth(
                    selectedMonth
                  )}`}
                  subtitle={`Tổng chi: ${formatMoney(
                    totals.expense
                  )}`}
                />

                <div className="calendar-scroll">
                  <div className="weekdays">
                    {[
                      "THỨ 2",
                      "THỨ 3",
                      "THỨ 4",
                      "THỨ 5",
                      "THỨ 6",
                      "THỨ 7",
                      "CN",
                    ].map((day) => (
                      <div key={day}>
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="calendar-grid">
                    {calendarCells.map(
                      (day, index) => {
                        if (!day) {
                          return (
                            <div
                              className="calendar-empty"
                              key={`empty-${index}`}
                            />
                          );
                        }

                        const result =
                          dailyTotals(day);

                        const date = `${selectedYear}-${pad(
                          selectedMonthNumber
                        )}-${pad(day)}`;

                        const today =
                          date === todayString();

                        return (
                          <div
                            className={`calendar-day ${
                              today
                                ? "today"
                                : ""
                            }`}
                            key={date}
                          >
                            <div className="calendar-day-number">
                              <strong>
                                {day}
                              </strong>

                              {today && (
                                <span>
                                  HÔM NAY
                                </span>
                              )}
                            </div>

                            {result.income >
                              0 && (
                              <span className="calendar-income">
                                +{" "}
                                {formatMoney(
                                  result.income
                                )}
                              </span>
                            )}

                            {result.expense >
                              0 && (
                              <span className="calendar-expense">
                                -{" "}
                                {formatMoney(
                                  result.expense
                                )}
                              </span>
                            )}

                            {result.adjustment !==
                              0 && (
                              <span className="calendar-adjustment">
                                Tip/Âm:{" "}
                                {formatMoney(
                                  result.adjustment
                                )}
                              </span>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* =================================================
                BÁO CÁO
            ================================================= */}

            {activePage === "reports" && (
              <>
                <div className="month-history">
                  {availableMonths.map(
                    (month) => {
                      const monthData =
                        transactions.filter(
                          (item) =>
                            item.date &&
                            item.date.startsWith(
                              month
                            )
                        );

                      const report =
                        calculateTotals(
                          monthData
                        );

                      return (
                        <button
                          key={month}
                          className={`month-history-item ${
                            selectedMonth ===
                            month
                              ? "active"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedMonth(
                              month
                            );

                            playSound();
                          }}
                        >
                          <strong>
                            {formatMonth(
                              month
                            )}
                          </strong>

                          <span>
                            Thu:{" "}
                            {formatMoney(
                              report.income
                            )}
                          </span>

                          <span>
                            Chi:{" "}
                            {formatMoney(
                              report.expense
                            )}
                          </span>

                          <span
                            className={
                              report.remaining >=
                              0
                                ? "positive"
                                : "expense"
                            }
                          >
                            {report.remaining >=
                            0
                              ? "Dư"
                              : "Âm"}
                            :{" "}
                            {formatMoney(
                              Math.abs(
                                report.remaining
                              )
                            )}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                <div className="summary-grid">
                  <SummaryCard
                    icon={TrendingUp}
                    title="TỔNG ĐẦU VÀO"
                    value={totals.income}
                    className="income"
                  />

                  <SummaryCard
                    icon={TrendingDown}
                    title="TỔNG ĐẦU RA"
                    value={totals.expense}
                    className="expense"
                  />

                  <SummaryCard
                    icon={Gift}
                    title="TIP / ÂM"
                    value={totals.adjustment}
                    className="adjustment"
                  />

                  <SummaryCard
                    icon={CircleDollarSign}
                    title={
                      totals.remaining >= 0
                        ? "DƯ THÁNG"
                        : "ÂM THÁNG"
                    }
                    value={Math.abs(
                      totals.remaining
                    )}
                    className={
                      totals.remaining >= 0
                        ? "positive"
                        : "expense"
                    }
                  />
                </div>

                <section className="dashboard-hero-grid reports-chart-grid">
                  <div className="panel dashboard-flow-panel">
                    <div className="dashboard-panel-heading">
                      <div>
                        <div className="panel-kicker">BIẾN ĐỘNG DÒNG TIỀN</div>
                        <h2>Tiền vào và tiền ra</h2>
                        <span>Theo dõi dòng tiền từng ngày trong {formatMonth(selectedMonth)}</span>
                      </div>

                      <div className="flow-legend">
                        <span><i className="legend-income" /> Tiền vào</span>
                        <span><i className="legend-expense" /> Tiền ra</span>
                      </div>
                    </div>

                    <DashboardFlowChart data={dashboardFlowData} monthKey={selectedMonth} />

                    <div className="flow-summary-row">
                      <div>
                        <span>Tiền vào</span>
                        <strong className="income">+{formatMoney(totals.income)}</strong>
                      </div>
                      <div>
                        <span>Tiền ra</span>
                        <strong className="expense">-{formatMoney(totals.expense)}</strong>
                      </div>
                      <div>
                        <span>Biến động ròng</span>
                        <strong className={totals.remaining >= 0 ? "positive" : "expense"}>
                          {totals.remaining >= 0 ? "+" : "-"}{formatMoney(Math.abs(totals.remaining))}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="panel dashboard-allocation-panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <div className="panel-kicker">PHÂN BỔ CHI TIÊU</div>
                        <h2>Các khoản đã chi</h2>
                        <span>{formatMonth(selectedMonth)}</span>
                      </div>
                      <PieChart size={22} />
                    </div>

                    <SpendingDonut
                      food={totals.food}
                      rent={totals.rent}
                      other={totals.other}
                      total={totals.expense}
                    />
                  </div>
                </section>

                <div className="dashboard-grid">
                  <section className="panel">
                    <PanelTitle
                      title="Chi theo danh mục"
                      subtitle={formatMonth(
                        selectedMonth
                      )}
                    />

                    <MoneyRow
                      label="Tiền ăn"
                      value={totals.food}
                    />

                    <MoneyRow
                      label="Tiền trọ"
                      value={totals.rent}
                    />

                    <MoneyRow
                      label="Chi khác"
                      value={totals.other}
                    />

                    <MoneyRow
                      label="Tổng đầu ra"
                      value={totals.expense}
                      strong
                    />
                  </section>

                  <section className="panel">
                    <PanelTitle
                      title="Kết quả thu - chi"
                      subtitle="Tính dư / âm"
                    />

                    <CalculationRow
                      label="Tổng đầu vào"
                      sign="+"
                      value={totals.income}
                      className="income"
                    />

                    <CalculationRow
                      label="Tip / Âm"
                      sign={
                        totals.adjustment >= 0
                          ? "+"
                          : ""
                      }
                      value={totals.adjustment}
                      className="adjustment"
                    />

                    <CalculationRow
                      label="Tổng đầu ra"
                      sign="-"
                      value={totals.expense}
                      className="expense"
                    />

                    <div className="final-result">
                      <span>
                        {totals.remaining >= 0
                          ? "THÁNG NÀY DƯ"
                          : "THÁNG NÀY ÂM"}
                      </span>

                      <strong
                        className={
                          totals.remaining >= 0
                            ? "positive"
                            : "expense"
                        }
                      >
                        {formatMoney(
                          Math.abs(
                            totals.remaining
                          )
                        )}
                      </strong>
                    </div>
                  </section>
                </div>

                <section className="panel">
                  <PanelTitle
                    title="Chi tiết giao dịch"
                    subtitle={formatMonth(
                      selectedMonth
                    )}
                  />

                  <TransactionTable
                    data={[
                      ...monthTransactions,
                    ].sort((a, b) =>
                      b.date.localeCompare(
                        a.date
                      )
                    )}
                    getAccountName={
                      getAccountName
                    }
                    onEdit={startEdit}
                    onDelete={
                      deleteTransaction
                    }
                  />
                </section>
              </>
            )}

            {/* =================================================
                NGÂN SÁCH
            ================================================= */}

            {activePage === "budget" && (
              <>
                <div className="summary-grid">
                  <SummaryCard
                    icon={Target}
                    title="TỔNG NGÂN SÁCH"
                    value={totalBudget}
                    className="income"
                  />

                  <SummaryCard
                    icon={TrendingDown}
                    title="ĐÃ CHI"
                    value={budgetUsed}
                    className="expense"
                  />

                  <SummaryCard
                    icon={CircleDollarSign}
                    title={
                      budgetRemaining >= 0
                        ? "NGÂN SÁCH CÒN"
                        : "VƯỢT NGÂN SÁCH"
                    }
                    value={Math.abs(
                      budgetRemaining
                    )}
                    className={
                      budgetRemaining >= 0
                        ? "positive"
                        : "expense"
                    }
                  />

                  <div className="summary-card">
                    <div className="summary-title">
                      <Target size={21} />

                      TỶ LỆ ĐÃ DÙNG
                    </div>

                    <strong
                      className={`summary-money ${
                        budgetPercent >= 100
                          ? "expense"
                          : budgetPercent >= 80
                          ? "adjustment"
                          : "positive"
                      }`}
                    >
                      {budgetPercent.toFixed(
                        1
                      )}
                      %
                    </strong>
                  </div>
                </div>

                <div className="dashboard-grid">
                  <section className="panel">
                    <PanelTitle
                      title="Thiết lập ngân sách"
                      subtitle={formatMonth(
                        selectedMonth
                      )}
                    />

                    <form
                      className="form"
                      onSubmit={saveBudget}
                    >
                      <FormField label="Ngân sách tiền ăn">
                        <input
                          type="number"
                          min="0"
                          value={
                            budgetForm.food
                          }
                          onChange={(event) =>
                            setBudgetForm({
                              ...budgetForm,

                              food:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </FormField>

                      <FormField label="Ngân sách tiền trọ">
                        <input
                          type="number"
                          min="0"
                          value={
                            budgetForm.rent
                          }
                          onChange={(event) =>
                            setBudgetForm({
                              ...budgetForm,

                              rent:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </FormField>

                      <FormField label="Ngân sách chi khác">
                        <input
                          type="number"
                          min="0"
                          value={
                            budgetForm.other
                          }
                          onChange={(event) =>
                            setBudgetForm({
                              ...budgetForm,

                              other:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </FormField>

                      <button className="primary-button">
                        <Save size={18} />

                        LƯU NGÂN SÁCH
                      </button>

                      {totalBudget > 0 && (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={
                            deleteBudget
                          }
                        >
                          <Trash2
                            size={18}
                          />

                          XÓA NGÂN SÁCH
                        </button>
                      )}
                    </form>
                  </section>

                  <section className="panel">
                    <PanelTitle
                      title="Theo dõi ngân sách"
                      subtitle="Tự động cập nhật"
                    />

                    <BudgetItem
                      title="Tiền ăn"
                      spent={totals.food}
                      totalExpense={totals.expense}
                      budget={
                        currentBudget.food
                      }
                      percent={categoryBudgetPercent(
                        "food"
                      )}
                    />

                    <BudgetItem
                      title="Tiền trọ"
                      spent={totals.rent}
                      totalExpense={totals.expense}
                      budget={
                        currentBudget.rent
                      }
                      percent={categoryBudgetPercent(
                        "rent"
                      )}
                    />

                    <BudgetItem
                      title="Chi khác"
                      spent={totals.other}
                      totalExpense={totals.expense}
                      budget={
                        currentBudget.other
                      }
                      percent={categoryBudgetPercent(
                        "other"
                      )}
                    />
                  </section>
                </div>
              </>
            )}

            {/* =================================================
                TÀI KHOẢN & BẢO MẬT
            ================================================= */}

            {activePage === "profile" && (
              <>
                <div className="profile-summary-grid">
                  <section className="profile-identity-card">
                    <div className="profile-avatar">
                      <UserRound size={30} />
                    </div>

                    <div>
                      <span>TÀI KHOẢN ĐĂNG NHẬP</span>
                      <h2>{userEmail || "Chưa xác định"}</h2>
                      <p>Tài khoản đang sử dụng Blue Finance</p>
                    </div>
                  </section>

                  <section className="profile-security-card">
                    <ShieldCheck size={26} />
                    <div>
                      <strong>Bảo mật tài khoản</strong>
                      <span>Đăng nhập bằng email và mật khẩu</span>
                    </div>
                  </section>
                </div>

                <div className="profile-page-grid">
                  <section className="panel">
                    <PanelTitle
                      title="Thông tin tài khoản"
                      subtitle="Thông tin đăng nhập hiện tại"
                    />

                    <div className="profile-info-list">
                      <div className="profile-info-row">
                        <div className="profile-info-icon">
                          <Mail size={18} />
                        </div>
                        <div>
                          <span>Email đăng nhập</span>
                          <strong>{userEmail || "Chưa xác định"}</strong>
                        </div>
                      </div>

                      <div className="profile-info-row">
                        <div className="profile-info-icon">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <span>Trạng thái</span>
                          <strong className="positive">Đang đăng nhập</strong>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="panel">
                    <PanelTitle
                      title="Đổi mật khẩu"
                      subtitle="Cập nhật mật khẩu đăng nhập"
                    />

                    <form className="form" onSubmit={handleChangePassword}>
                      <FormField label="Mật khẩu mới">
                        <input
                          type="password"
                          minLength="8"
                          placeholder="Nhập mật khẩu mới"
                          value={newPassword}
                          onChange={(event) => setNewPassword(event.target.value)}
                        />
                      </FormField>

                      <FormField label="Xác nhận mật khẩu mới">
                        <input
                          type="password"
                          minLength="8"
                          placeholder="Nhập lại mật khẩu mới"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                        />
                      </FormField>

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={passwordSaving}
                      >
                        <KeyRound size={18} />
                        {passwordSaving ? "ĐANG CẬP NHẬT..." : "ĐỔI MẬT KHẨU"}
                      </button>

                      {passwordMessage && (
                        <div className={`profile-message ${passwordMessageType}`}>
                          {passwordMessageType === "success" ? (
                            <CheckCircle2 size={17} />
                          ) : (
                            <AlertTriangle size={17} />
                          )}
                          <span>{passwordMessage}</span>
                        </div>
                      )}
                    </form>
                  </section>

                  <section className="panel profile-backup-section">
                    <PanelTitle
                      title="Sao lưu dữ liệu"
                      subtitle="Xuất toàn bộ dữ liệu ra file JSON để lưu trữ, hoặc nhập lại từ file đã sao lưu"
                    />

                    <div className="backup-actions-row">
                      <button
                        type="button"
                        className="primary-button"
                        onClick={exportData}
                      >
                        <Download size={18} />
                        XUẤT DỮ LIỆU (.JSON)
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        onClick={triggerImportFile}
                      >
                        <Upload size={18} />
                        NHẬP DỮ LIỆU TỪ FILE
                      </button>

                      <input
                        ref={importFileInputRef}
                        type="file"
                        accept="application/json,.json"
                        onChange={handleImportFile}
                        style={{ display: "none" }}
                      />
                    </div>

                    <p className="backup-hint">
                      File sao lưu chứa tài khoản, giao dịch và ngân sách hiện tại. Nên xuất file định kỳ để phòng mất dữ liệu, vì dữ liệu chỉ đang được lưu trên trình duyệt này.
                    </p>

                    {importMessage && (
                      <div className={`profile-message ${importMessageType}`}>
                        {importMessageType === "success" ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <AlertTriangle size={17} />
                        )}
                        <span>{importMessage}</span>
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}

            {/* =================================================
                TÀI KHOẢN
            ================================================= */}

            {activePage === "accounts" && (
              <>
                <div className="account-summary-grid">
                  <MiniStat
                    label="SỐ TÀI KHOẢN"
                    value={accounts.length}
                  />

                  <MiniStat
                    label="TỔNG TÀI SẢN"
                    value={formatMoney(
                      totalAssets
                    )}
                    className="income"
                  />
                </div>

                <div className="account-page-grid">
                  <section className="panel">
                    <PanelTitle
                      title="Thêm tài khoản"
                      subtitle="Nhập số dư ban đầu"
                    />

                    <form
                      className="form"
                      onSubmit={addAccount}
                    >
                      <FormField label="Tên tài khoản">
                        <input
                          placeholder="Ví dụ: MB Bank"
                          value={
                            accountForm.name
                          }
                          onChange={(event) =>
                            setAccountForm({
                              ...accountForm,

                              name:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </FormField>

                      <FormField label="Loại tài khoản">
                        <select
                          value={
                            accountForm.type
                          }
                          onChange={(event) =>
                            setAccountForm({
                              ...accountForm,

                              type:
                                event.target
                                  .value,
                            })
                          }
                        >
                          <option value="cash">
                            Tiền mặt
                          </option>

                          <option value="bank">
                            Ngân hàng
                          </option>

                          <option value="wallet">
                            Ví điện tử
                          </option>
                        </select>
                      </FormField>

                      <FormField label="Số dư ban đầu">
                        <input
                          type="number"
                          value={
                            accountForm.openingBalance
                          }
                          onChange={(event) =>
                            setAccountForm({
                              ...accountForm,

                              openingBalance:
                                event.target
                                  .value,
                            })
                          }
                        />
                      </FormField>

                      <button className="primary-button">
                        <Plus size={18} />

                        THÊM TÀI KHOẢN
                      </button>
                    </form>
                  </section>

                  <section className="panel">
                    <PanelTitle
                      title="Danh sách tài khoản"
                      subtitle="Số dư tự động"
                    />

                    <div className="account-list">
                      {accounts.length ===
                        0 && (
                        <Empty>
                          Chưa có tài khoản.
                        </Empty>
                      )}

                      {accounts.map(
                        (account) => {
                          const config =
                            accountTypes[
                              account.type
                            ] ||
                            accountTypes.bank;

                          const Icon =
                            config.icon;

                          return (
                            <div
                              className="account-management-row"
                              key={
                                account.id
                              }
                            >
                              <div className="account-icon">
                                <Icon
                                  size={22}
                                />
                              </div>

                              <div className="account-main">
                                <strong>
                                  {
                                    account.name
                                  }
                                </strong>

                                <span>
                                  {
                                    config.label
                                  }{" "}
                                  • Ban đầu:{" "}
                                  {formatMoney(
                                    account.openingBalance
                                  )}
                                </span>
                              </div>

                              <strong className="account-money">
                                {formatMoney(
                                  getAccountBalance(
                                    account
                                  )
                                )}
                              </strong>

                              <button
                                className="icon-button"
                                onClick={() => {
                                  setViewAccountId(
                                    account.id
                                  );

                                  playSound();
                                }}
                              >
                                <Eye
                                  size={17}
                                />
                              </button>

                              <button
                                className="icon-button delete"
                                onClick={() =>
                                  deleteAccount(
                                    account.id
                                  )
                                }
                              >
                                <Trash2
                                  size={17}
                                />
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>
                  </section>
                </div>

                {selectedAccount && (
                  <section className="panel">
                    <PanelTitle
                      title={`Lịch sử tài khoản: ${selectedAccount.name}`}
                      subtitle={`Số dư: ${formatMoney(
                        getAccountBalance(
                          selectedAccount
                        )
                      )}`}
                    />

                    <TransactionTable
                      data={
                        selectedAccountHistory
                      }
                      getAccountName={
                        getAccountName
                      }
                      onEdit={
                        startEdit
                      }
                      onDelete={
                        deleteTransaction
                      }
                    />
                  </section>
                )}
              </>
            )}
          </div>
        </main>

        {/* ===================================================
            MODAL SỬA
        =================================================== */}

        {editingTransaction && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <div>
                  <span>
                    CHỈNH SỬA GIAO DỊCH
                  </span>

                  <h2>
                    Sửa thông tin
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setEditingTransaction(
                      null
                    )
                  }
                >
                  <X size={21} />
                </button>
              </div>

              <form
                className="form"
                onSubmit={saveEdit}
              >
                <FormField label="Ngày">
                  <input
                    type="date"
                    value={
                      editingTransaction.date
                    }
                    onChange={(event) =>
                      setEditingTransaction({
                        ...editingTransaction,

                        date:
                          event.target.value,
                      })
                    }
                  />
                </FormField>

                {editingTransaction.type ===
                  "expense" && (
                  <FormField label="Danh mục">
                    <select
                      value={
                        editingTransaction.category
                      }
                      onChange={(event) =>
                        setEditingTransaction({
                          ...editingTransaction,

                          category:
                            event.target
                              .value,
                        })
                      }
                    >
                      <option value="food">
                        Tiền ăn
                      </option>

                      <option value="rent">
                        Tiền trọ
                      </option>

                      <option value="other">
                        Chi khác
                      </option>
                    </select>
                  </FormField>
                )}

                {editingTransaction.type ===
                  "adjustment" && (
                  <FormField label="Tip / Âm">
                    <select
                      value={
                        editingTransaction.adjustmentDirection ||
                        "plus"
                      }
                      onChange={(event) =>
                        setEditingTransaction({
                          ...editingTransaction,

                          adjustmentDirection:
                            event.target
                              .value,
                        })
                      }
                    >
                      <option value="plus">
                        Tip / Cộng (+)
                      </option>

                      <option value="minus">
                        Âm / Trừ (-)
                      </option>
                    </select>
                  </FormField>
                )}

                {editingTransaction.type !==
                "transfer" ? (
                  <FormField label="Tài khoản">
                    <select
                      value={
                        editingTransaction.accountId ||
                        ""
                      }
                      onChange={(event) =>
                        setEditingTransaction({
                          ...editingTransaction,

                          accountId:
                            event.target
                              .value,
                        })
                      }
                    >
                      <option value="">
                        -- Chọn tài khoản --
                      </option>

                      {accounts.map(
                        (account) => (
                          <option
                            key={
                              account.id
                            }
                            value={
                              account.id
                            }
                          >
                            {
                              account.name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </FormField>
                ) : (
                  <>
                    <FormField label="Từ tài khoản">
                      <select
                        value={
                          editingTransaction.fromAccountId ||
                          ""
                        }
                        onChange={(event) =>
                          setEditingTransaction({
                            ...editingTransaction,

                            fromAccountId:
                              event.target
                                .value,
                          })
                        }
                      >
                        <option value="">
                          -- Tài khoản nguồn --
                        </option>

                        {accounts.map(
                          (account) => (
                            <option
                              key={
                                account.id
                              }
                              value={
                                account.id
                              }
                            >
                              {
                                account.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </FormField>

                    <FormField label="Đến tài khoản">
                      <select
                        value={
                          editingTransaction.toAccountId ||
                          ""
                        }
                        onChange={(event) =>
                          setEditingTransaction({
                            ...editingTransaction,

                            toAccountId:
                              event.target
                                .value,
                          })
                        }
                      >
                        <option value="">
                          -- Tài khoản đích --
                        </option>

                        {accounts.map(
                          (account) => (
                            <option
                              key={
                                account.id
                              }
                              value={
                                account.id
                              }
                            >
                              {
                                account.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </FormField>
                  </>
                )}

                <FormField label="Nội dung">
                  <input
                    value={
                      editingTransaction.description ||
                      ""
                    }
                    onChange={(event) =>
                      setEditingTransaction({
                        ...editingTransaction,

                        description:
                          event.target
                            .value,
                      })
                    }
                  />
                </FormField>

                <FormField label="Số tiền">
                  <input
                    type="number"
                    min="0"
                    value={
                      editingTransaction.amount
                    }
                    onChange={(event) =>
                      setEditingTransaction({
                        ...editingTransaction,

                        amount:
                          event.target.value,
                      })
                    }
                  />
                </FormField>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      setEditingTransaction(
                        null
                      )
                    }
                  >
                    <X size={18} />

                    Hủy
                  </button>

                  <button className="primary-button">
                    <Save size={18} />

                    LƯU THAY ĐỔI
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* =========================================================
   COMPONENTS
========================================================= */


function DashboardFlowChart({ data, monthKey }) {
  const width = 900;
  const height = 250;
  const padding = { top: 20, right: 18, bottom: 38, left: 58 };

  const maxValue = Math.max(
    1,
    ...data.map((item) => Math.max(item.income, item.expense))
  );

  const x = (index) =>
    padding.left +
    (index / Math.max(data.length - 1, 1)) *
      (width - padding.left - padding.right);

  const y = (value) =>
    padding.top +
    (1 - value / maxValue) *
      (height - padding.top - padding.bottom);

  const incomePoints = data
    .map((item, index) => `${x(index)},${y(item.income)}`)
    .join(" ");

  const expensePoints = data
    .map((item, index) => `${x(index)},${y(item.expense)}`)
    .join(" ");

  const gridValues = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="dashboard-chart-wrap">
      <svg
        className="dashboard-chart"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Biểu đồ tiền vào và tiền ra"
      >
        {gridValues.map((ratio) => {
          const value = maxValue * ratio;
          const lineY = y(value);

          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={lineY}
                y2={lineY}
                className="chart-grid-line"
              />
              <text
                x={padding.left - 10}
                y={lineY + 4}
                textAnchor="end"
                className="chart-axis-label"
              >
                {formatCompactMoney(value)}
              </text>
            </g>
          );
        })}

        <polyline
          points={incomePoints}
          fill="none"
          className="chart-income-line"
        />

        <polyline
          points={expensePoints}
          fill="none"
          className="chart-expense-line"
        />

        {data.map((item, index) => (
          <g key={item.day}>
            <circle
              cx={x(index)}
              cy={y(item.income)}
              r="4"
              className="chart-income-dot"
            />
            <circle
              cx={x(index)}
              cy={y(item.expense)}
              r="4"
              className="chart-expense-dot"
            />
          </g>
        ))}

        {data.map((item, index) => {
          const show =
            index === 0 ||
            index === data.length - 1 ||
            item.day === 5 ||
            item.day === 10 ||
            item.day === 15 ||
            item.day === 20 ||
            item.day === 25;

          if (!show) return null;

          return (
            <text
              key={`label-${item.day}`}
              x={x(index)}
              y={height - 12}
              textAnchor="middle"
              className="chart-axis-label"
            >
              {item.day}/{String(Number(monthKey.split("-")[1])).padStart(2, "0")}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function formatCompactMoney(value) {
  const amount = Number(value || 0);

  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}tr`;
  }

  if (amount >= 1000) {
    return `${Math.round(amount / 1000)}k`;
  }

  return `${Math.round(amount)}`;
}

function SpendingDonut({ food, rent, other, total }) {
  const safeTotal = Number(total || 0);
  const items = [
    { label: "Ăn uống", value: Number(food || 0), className: "food" },
    { label: "Tiền trọ", value: Number(rent || 0), className: "rent" },
    { label: "Chi tiêu khác", value: Number(other || 0), className: "other" },
  ];

  let cursor = 0;
  const gradient =
    safeTotal > 0
      ? items
          .map((item) => {
            const start = cursor;
            const percent = (item.value / safeTotal) * 100;
            cursor += percent;
            return `${item.className === "food" ? "var(--cat-food)" : item.className === "rent" ? "var(--cat-rent)" : "var(--cat-other)"} ${start}% ${cursor}%`;
          })
          .join(", ")
      : "var(--chart-empty) 0% 100%";

  return (
    <div className="donut-content">
      <div
        className="donut-chart"
        style={{ background: `conic-gradient(${gradient})` }}
      >
        <div className="donut-hole">
          <strong>{formatMoney(safeTotal)}</strong>
          <span>Tổng chi</span>
        </div>
      </div>

      <div className="donut-legend">
        {items.map((item) => {
          const percent =
            safeTotal > 0 ? (item.value / safeTotal) * 100 : 0;

          return (
            <div className="donut-legend-row" key={item.label}>
              <div>
                <i className={`donut-dot ${item.className}`} />
                <span>{item.label}</span>
              </div>
              <strong>{percent.toFixed(0)}%</strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardRecentTransactions({ transactions, getAccountName, search = "" }) {
  const normalizedSearch = search.trim().toLowerCase();

  const data = [...transactions]
    .filter((item) => {
      if (!normalizedSearch) return true;

      const accountText =
        item.type === "transfer"
          ? `${getAccountName(item.fromAccountId)} ${getAccountName(item.toAccountId)}`
          : getAccountName(item.accountId);

      const categoryText =
        item.type === "expense"
          ? categories[item.category]?.label || ""
          : "";

      return `${item.description || ""} ${accountText} ${categoryText}`
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .sort((a, b) =>
      b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id))
    )
    .slice(0, 5);

  if (data.length === 0) {
    return <Empty>Chưa có giao dịch trong tháng này.</Empty>;
  }

  return (
    <div className="dashboard-recent-list">
      {data.map((item) => {
        const isIncome = item.type === "income";
        const isAdjustment = item.type === "adjustment";
        const isTransfer = item.type === "transfer";
        const amount = Math.abs(Number(item.amount || 0));

        let className = "expense";
        let sign = "-";
        let label = categories[item.category]?.label || "Chi tiêu";
        let Icon = ArrowDownCircle;

        if (isIncome) {
          className = "income";
          sign = "+";
          label = "Thu nhập";
          Icon = ArrowUpCircle;
        } else if (isAdjustment) {
          className = item.adjustmentDirection === "minus" ? "expense" : "adjustment";
          sign = item.adjustmentDirection === "minus" ? "-" : "+";
          label = item.adjustmentDirection === "minus" ? "Điều chỉnh giảm" : "Điều chỉnh tăng";
          Icon = SlidersHorizontal;
        } else if (isTransfer) {
          className = "adjustment";
          sign = "↔";
          label = "Chuyển tiền";
          Icon = ArrowLeftRight;
        }

        return (
          <div className="dashboard-recent-row" key={item.id}>
            <div className={`dashboard-transaction-icon ${className}`}>
              <Icon size={18} />
            </div>

            <div className="dashboard-recent-main">
              <strong>{item.description || label}</strong>
              <span>
                {formatDate(item.date)} · {label}
                {!isTransfer && item.accountId
                  ? ` · ${getAccountName(item.accountId)}`
                  : ""}
              </span>
            </div>

            <strong className={`dashboard-recent-amount ${className}`}>
              {sign}{formatMoney(amount)}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

function DashboardAccountBalances({ accounts, getAccountBalance }) {
  if (accounts.length === 0) {
    return <Empty>Chưa có tài khoản.</Empty>;
  }

  return (
    <div className="dashboard-account-list">
      {accounts.slice(0, 5).map((account) => {
        const config = accountTypes[account.type] || accountTypes.bank;
        const Icon = config.icon;
        const balance = getAccountBalance(account);

        return (
          <div className="dashboard-account-row" key={account.id}>
            <div className="dashboard-account-icon">
              <Icon size={18} />
            </div>
            <div>
              <strong>{account.name}</strong>
              <span>{config.label}</span>
            </div>
            <strong className={balance < 0 ? "expense" : "positive"}>
              {formatMoney(balance)}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

function DashboardNotificationList({ notifications }) {
  if (notifications.length === 0) {
    return <Empty>Hiện chưa có cảnh báo.</Empty>;
  }

  return (
    <div className="dashboard-notification-list">
      {notifications.map((item) => (
        <div
          className={`dashboard-notification-row ${item.type}`}
          key={item.id}
        >
          <div className="dashboard-notification-mark" />
          <div>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function BudgetMini({ label, spent, budget }) {
  const safeBudget = Number(budget || 0);
  const safeSpent = Number(spent || 0);
  const percent = safeBudget > 0 ? (safeSpent / safeBudget) * 100 : 0;

  return (
    <div className="dashboard-budget-mini">
      <div>
        <span>{label}</span>
        <strong>{safeBudget > 0 ? `${Math.min(percent, 999).toFixed(0)}%` : "—"}</strong>
      </div>
      <small>
        {formatMoney(safeSpent)} / {formatMoney(safeBudget)}
      </small>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  className = "",
}) {
  return (
    <div className="summary-card">
      <div className="summary-title">
        <Icon size={20} />

        {title}
      </div>

      <strong
        className={`summary-money ${className}`}
      >
        {formatMoney(value)}
      </strong>
    </div>
  );
}

function AnalysisSummary({
  label,
  value,
  className = "",
}) {
  return (
    <div className="analysis-summary-box">
      <span>
        {label}
      </span>

      <strong className={className}>
        {formatMoney(value)}
      </strong>
    </div>
  );
}

function MiniStat({
  label,
  value,
  className = "",
}) {
  return (
    <div className="mini-stat">
      <span>
        {label}
      </span>

      <strong className={className}>
        {value}
      </strong>
    </div>
  );
}

function PanelTitle({
  title,
  subtitle,
}) {
  return (
    <div className="panel-title">
      <h2>
        {title}
      </h2>

      <span>
        {subtitle}
      </span>
    </div>
  );
}

function FormField({
  label,
  children,
}) {
  return (
    <label className="form-field">
      <span>
        {label}
      </span>

      {children}
    </label>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}) {
  return (
    <button
      type="button"
      className={`tab-button ${
        active ? "active" : ""
      }`}
      onClick={onClick}
    >
      <Icon size={17} />

      {children}
    </button>
  );
}

function MoneyRow({
  label,
  value,
  strong = false,
}) {
  return (
    <div
      className={`money-row ${
        strong ? "strong" : ""
      }`}
    >
      <span>
        {label}
      </span>

      <strong>
        {formatMoney(value)}
      </strong>
    </div>
  );
}

function CalculationRow({
  label,
  sign,
  value,
  className = "",
}) {
  return (
    <div className="calculation-row">
      <span>
        {label}
      </span>

      <strong className={className}>
        {sign} {formatMoney(value)}
      </strong>
    </div>
  );
}

function Empty({
  children,
}) {
  return (
    <div className="empty">
      {children}
    </div>
  );
}

/* =========================================================
   THỐNG KÊ BẢNG THÁNG
========================================================= */

function MonthlyStatRow({
  label,
  value,
  className = "",
  signed = false,
  strong = false,
  extraStrong = false,
}) {
  const number =
    Number(value || 0);

  let display =
    formatMoney(Math.abs(number));

  if (signed) {
    if (number > 0) {
      display = `+ ${formatMoney(
        number
      )}`;
    }

    if (number < 0) {
      display = `- ${formatMoney(
        Math.abs(number)
      )}`;
    }

    if (number === 0) {
      display = "0 đ";
    }
  }

  return (
    <div
      className={`monthly-stat-row ${
        strong ? "strong" : ""
      } ${
        extraStrong
          ? "extra-strong"
          : ""
      }`}
    >
      <span>
        {label}
      </span>

      <strong className={className}>
        {display}
      </strong>
    </div>
  );
}

/* =========================================================
   PHÂN TÍCH DANH MỤC
========================================================= */

function SpendingAnalysisItem({
  title,
  spent,
  totalExpense,
  budget,
}) {
  const expensePercent =
    totalExpense > 0
      ? (spent / totalExpense) * 100
      : 0;

  const budgetNumber =
    Number(budget || 0);

  const budgetPercent =
    budgetNumber > 0
      ? (spent / budgetNumber) * 100
      : 0;

  const remaining =
    budgetNumber - spent;

  let status = "safe";

  if (budgetPercent >= 100) {
    status = "danger";
  } else if (
    budgetPercent >= 80
  ) {
    status = "warning";
  }

  return (
    <div className="analysis-item">
      <div className="analysis-item-header">
        <div>
          <strong>
            {title}
          </strong>

          <span>
            Chiếm{" "}
            {expensePercent.toFixed(
              1
            )}
            % tổng chi
          </span>
        </div>

        <strong className="expense">
          {formatMoney(spent)}
        </strong>
      </div>

      <div className="analysis-detail">
        <span>
          Ngân sách:{" "}
          {formatMoney(
            budgetNumber
          )}
        </span>

        <span
          className={
            status === "danger"
              ? "expense"
              : status ===
                "warning"
              ? "adjustment"
              : "positive"
          }
        >
          {budgetNumber > 0
            ? `${budgetPercent.toFixed(
                1
              )}%`
            : "Chưa đặt"}
        </span>
      </div>

      <div className="progress">
        <div
          className={status}
          style={{
            width: `${
              budgetNumber > 0
                ? Math.min(
                    budgetPercent,
                    100
                  )
                : 0
            }%`,
          }}
        />
      </div>

      <div className="analysis-footer">
        {budgetNumber <= 0 ? (
          <span>
            Chưa thiết lập ngân sách
          </span>
        ) : remaining >= 0 ? (
          <span>
            Còn{" "}
            <strong className="positive">
              {formatMoney(
                remaining
              )}
            </strong>
          </span>
        ) : (
          <span>
            Vượt{" "}
            <strong className="expense">
              {formatMoney(
                Math.abs(
                  remaining
                )
              )}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   BUDGET ITEM
========================================================= */

function BudgetItem({
  title,
  spent,
  totalExpense,
  budget,
  percent,
}) {
  const budgetNumber = Number(budget || 0);
  const spentNumber = Number(spent || 0);
  const totalExpenseNumber = Number(totalExpense || 0);
  const expenseShare =
    totalExpenseNumber > 0
      ? (spentNumber / totalExpenseNumber) * 100
      : 0;

  const remaining = budgetNumber - spentNumber;

  let status = "safe";

  if (budgetNumber > 0 && percent >= 100) {
    status = "danger";
  } else if (budgetNumber > 0 && percent >= 80) {
    status = "warning";
  }

  return (
    <div className="budget-item">
      <div className="budget-item-header">
        <div>
          <strong>{title}</strong>
          <span>Đã tiêu {formatMoney(spentNumber)}</span>
        </div>

        <strong
          className={
            budgetNumber <= 0
              ? "muted"
              : status === "danger"
              ? "expense"
              : status === "warning"
              ? "adjustment"
              : "positive"
          }
        >
          {budgetNumber > 0 ? `${percent.toFixed(1)}% ngân sách` : "Chưa đặt"}
        </strong>
      </div>

      <div className="budget-detail-grid">
        <div>
          <span>Chiếm tổng chi</span>
          <strong>{expenseShare.toFixed(1)}%</strong>
        </div>

        <div>
          <span>Ngân sách</span>
          <strong>
            {budgetNumber > 0
              ? formatMoney(budgetNumber)
              : "Chưa đặt ngân sách"}
          </strong>
        </div>

        <div>
          <span>Trạng thái</span>
          <strong>
            {budgetNumber > 0
              ? remaining >= 0
                ? `Còn ${formatMoney(remaining)}`
                : `Vượt ${formatMoney(Math.abs(remaining))}`
              : "Chưa thiết lập ngân sách"}
          </strong>
        </div>
      </div>

      <div className="progress">
        <div
          className={status}
          style={{
            width: `${
              budgetNumber > 0 ? Math.min(percent, 100) : 0
            }%`,
          }}
        />
      </div>

      <div className="budget-item-note">
        {budgetNumber > 0
          ? `Đã dùng ${percent.toFixed(1)}% ngân sách ${title.toLowerCase()}.`
          : `Chưa đặt ngân sách cho ${title.toLowerCase()}.`}
      </div>
    </div>
  );
}

/* =========================================================
   TRANSACTION TABLE
========================================================= */

function TransactionTable({
  data,
  getAccountName,
  onEdit,
  onDelete,
}) {
  function getType(item) {
    if (
      item.type === "income"
    ) {
      return "Đầu vào";
    }

    if (
      item.type === "expense"
    ) {
      return "Đầu ra";
    }

    if (
      item.type ===
      "adjustment"
    ) {
      return "Tip / Âm";
    }

    return "Chuyển tiền";
  }

  function getCategory(item) {
    if (
      item.type === "expense"
    ) {
      return (
        categories[
          item.category
        ]?.label ||
        "Chi tiêu"
      );
    }

    if (
      item.type === "income"
    ) {
      return "Tiền nhận";
    }

    if (
      item.type ===
      "adjustment"
    ) {
      return "Tip / Âm";
    }

    return "Nội bộ";
  }

  function getAccountText(
    item
  ) {
    if (
      item.type ===
      "transfer"
    ) {
      return `${getAccountName(
        item.fromAccountId
      )} → ${getAccountName(
        item.toAccountId
      )}`;
    }

    return getAccountName(
      item.accountId
    );
  }

  function getMoneyPrefix(
    item
  ) {
    if (
      item.type === "income"
    ) {
      return "+";
    }

    if (
      item.type === "expense"
    ) {
      return "-";
    }

    if (
      item.type ===
      "adjustment"
    ) {
      return item.adjustmentDirection ===
        "minus"
        ? "-"
        : "+";
    }

    return "";
  }

  function getMoneyClass(
    item
  ) {
    if (
      item.type === "income"
    ) {
      return "income";
    }

    if (
      item.type === "expense"
    ) {
      return "expense";
    }

    if (
      item.type ===
      "adjustment"
    ) {
      return item.adjustmentDirection ===
        "minus"
        ? "expense"
        : "positive";
    }

    return "transfer-color";
  }

  return (
    <div className="table-wrapper">
      <div className="transaction-table">
        <div className="table-header">
          <span>NGÀY</span>

          <span>LOẠI</span>

          <span>DANH MỤC</span>

          <span>NỘI DUNG</span>

          <span>TÀI KHOẢN</span>

          <span>SỐ TIỀN</span>

          <span>THAO TÁC</span>
        </div>

        {data.length === 0 && (
          <Empty>
            Không có giao dịch.
          </Empty>
        )}

        {data.map((item) => (
          <div
            className="table-row"
            key={item.id}
          >
            <span>
              {formatDate(
                item.date
              )}
            </span>

            <span>
              <span
                className={`type-badge ${item.type}`}
              >
                {getType(item)}
              </span>
            </span>

            <span>
              {getCategory(item)}
            </span>

            <span>
              {item.description ||
                "Không có ghi chú"}
            </span>

            <span className="account-cell">
              {getAccountText(
                item
              )}
            </span>

            <strong
              className={getMoneyClass(
                item
              )}
            >
              {getMoneyPrefix(
                item
              )}
              {formatMoney(
                Math.abs(
                  Number(
                    item.amount ||
                      0
                  )
                )
              )}
            </strong>

            <span className="actions">
              <button
                className="icon-button"
                onClick={() =>
                  onEdit(item)
                }
              >
                <Pencil
                  size={16}
                />
              </button>

              <button
                className="icon-button delete"
                onClick={() =>
                  onDelete(
                    item.id
                  )
                }
              >
                <Trash2
                  size={16}
                />
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   CSS
========================================================= */

const styles = `
/* =========================================================
   THIẾT KẾ - BIẾN MÀU (DESIGN TOKENS)
   Toàn bộ màu dùng lặp lại trong app được khai báo tập trung
   ở đây. Đổi giao diện sáng/tối chỉ cần đổi giá trị biến,
   mọi thành phần dùng biến sẽ tự động cập nhật theo.
========================================================= */

:root {
  /* Nền */
  --bg-app: #08111f;
  --bg-surface: #101827;
  --bg-surface-alt: #0d1727;
  --bg-surface-raised: #111f34;
  --bg-surface-soft: #172943;
  --bg-surface-soft-2: #17243a;
  --bg-surface-deep: #111c2f;
  --bg-surface-deep-2: #131f33;
  --bg-surface-deep-3: #0d1728;
  --bg-surface-deep-4: #101b2d;

  /* Viền */
  --border: #263a58;
  --border-strong: #293f5e;
  --border-soft: #365b87;
  --border-soft-2: #36577d;
  --border-muted: #3c5b81;
  --border-dim: #2b425f;
  --border-dim-2: #2a405f;
  --border-faint: #1f314b;
  --border-scroll: #355172;

  /* Chữ */
  --text-heading: #f1f5f9;
  --text-primary: #e2e8f0;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-muted-alt: #7185a3;
  --text-muted-soft: #7f91aa;
  --text-neutral: #64748b;

  /* Màu nhấn (thương hiệu) */
  --accent: #60a5fa;
  --accent-soft: #93c5fd;
  --accent-strong: #3b82f6;
  --accent-deep: #2563eb;
  --accent-sky: #38bdf8;
  --accent-tint: #dbeafe;

  /* Trạng thái tài chính */
  --color-income: #34d399;
  --color-expense: #fb7185;
  --color-expense-tint: #fecdd3;
  --color-adjustment: #fbbf24;

  /* Biểu đồ phân bổ chi tiêu (donut) */
  --cat-food: #6366f1;
  --cat-rent: #22c55e;
  --cat-other: #f59e0b;
  --chart-empty: #243b5a;

  /* Bề mặt sáng màu (chủ yếu dùng ở giao diện sáng) */
  --surface-white: #ffffff;
  --surface-off-white: #f8fafc;
  --border-light: #dbe4ef;
  --text-light-muted: #475569;
}

.app.light-mode {
  --bg-app: #f2f5fa;
  --bg-surface: #ffffff;
  --bg-surface-alt: #f8fafc;
  --bg-surface-raised: #f8fafc;
  --bg-surface-soft: #eff6ff;
  --bg-surface-soft-2: #eff6ff;
  --bg-surface-deep: #f8fafc;
  --bg-surface-deep-2: #f1f5f9;
  --bg-surface-deep-3: #f8fafc;
  --bg-surface-deep-4: #eef2f7;

  --border: #e2e8f0;
  --border-strong: #dbe4ef;
  --border-soft: #cbd5e1;
  --border-soft-2: #cbd5e1;
  --border-muted: #cbd5e1;
  --border-dim: #e2e8f0;
  --border-dim-2: #e2e8f0;
  --border-faint: #eef2f7;
  --border-scroll: #cbd5e1;

  --text-heading: #0f172a;
  --text-primary: #1e293b;
  --text-secondary: #334155;
  --text-muted: #64748b;
  --text-muted-alt: #64748b;
  --text-muted-soft: #64748b;
  --text-neutral: #64748b;

  --accent: #2563eb;
  --accent-soft: #3b82f6;
  --accent-strong: #2563eb;
  --accent-deep: #1d4ed8;
  --accent-sky: #0284c7;
  --accent-tint: #eff6ff;

  --color-income: #16a34a;
  --color-expense: #e11d48;
  --color-expense-tint: #ffe4e6;
  --color-adjustment: #b45309;

  --cat-food: #4f46e5;
  --cat-rent: #16a34a;
  --cat-other: #b45309;
  --chart-empty: #e2e8f0;

  --surface-white: #ffffff;
  --surface-off-white: #f8fafc;
  --border-light: #dbe4ef;
  --text-light-muted: #475569;
}


* {
  box-sizing: border-box;
}

html,
body,
#root {
  margin: 0;
  padding: 0;

  width: 100%;
  min-width: 100%;
  min-height: 100%;

  background: var(--bg-app);
}

body {
  display: block;

  min-width: 320px;
  min-height: 100vh;

  overflow-x: hidden;

  color: var(--text-primary);

  background: var(--bg-app);

  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  font-size: 15px;
}

#root {
  width: 100%;
  max-width: none;

  margin: 0;
  padding: 0;

  text-align: left;
}

button,
input,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

input,
select {
  color-scheme: dark;
}

.app.light-mode input,
.app.light-mode select {
  color-scheme: light;
}

/* Đường viền focus nhất quán cho người dùng điều hướng bằng bàn phím */
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* =========================================================
   SCROLLBAR
========================================================= */

html,
body,
.sidebar,
.main,
.table-wrapper,
.calendar-scroll,
.month-history,
.monthly-sheet-wrapper,
.modal {
  scrollbar-width: thin;

  scrollbar-color:
    #36587f
    var(--bg-app);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-app);
}

::-webkit-scrollbar-thumb {
  background:
    linear-gradient(
      180deg,
      #304d70,
      #243d5c
    );

  border:
    2px solid var(--bg-app);

  border-radius: 20px;
}

::-webkit-scrollbar-thumb:hover {
  background:
    linear-gradient(
      180deg,
      #4f82bb,
      #3d6b9d
    );
}

::-webkit-scrollbar-corner {
  background: var(--bg-app);
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: #0b1423;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #294867;

  border: none;

  border-radius: 20px;
}

/* =========================================================
   APP
========================================================= */

.app {
  width: 100%;
  min-height: 100vh;

  background:
    radial-gradient(
      circle at 85% 0%,
      rgba(59, 130, 246, 0.10),
      transparent 35%
    ),
    var(--bg-app);
}

/* =========================================================
   SIDEBAR
========================================================= */

.sidebar {
  position: fixed;

  top: 0;
  bottom: 0;
  left: 0;

  z-index: 100;

  width: 290px;

  padding: 25px 18px;

  overflow-y: auto;
  overflow-x: hidden;

  scrollbar-gutter: stable;

  display: flex;
  flex-direction: column;

  background:
    linear-gradient(
      180deg,
      var(--bg-surface),
      #0b1220
    );

  border-right:
    1px solid var(--border);
}

.brand {
  display: flex;

  align-items: center;

  gap: 12px;

  padding:
    12px 10px 25px;

  color: var(--accent);

  border-bottom:
    1px solid var(--border);
}

.brand strong {
  display: block;

  color: var(--accent);

  font-size: 20px;
}

.brand span {
  display: block;

  margin-top: 5px;

  color: var(--text-muted-alt);

  font-size: 11px;

  line-height: 1.8;

  letter-spacing: 1px;
}

.nav-label {
  margin:
    25px 10px 12px;

  color: var(--text-muted);

  font-size: 12px;

  font-weight: 800;
}

.nav-button {
  display: flex;

  align-items: center;

  gap: 12px;

  width: 100%;

  min-height: 55px;

  margin-bottom: 8px;

  padding:
    13px 15px;

  color: #c3cfdf;

  background:
    rgba(
      30,
      41,
      59,
      0.55
    );

  border:
    1px solid var(--border);

  border-radius: 8px;

  font-weight: 600;

  font-size: 14px;

  text-align: left;

  transition:
    0.2s ease;
}

.nav-button:hover,
.nav-button.active {
  color: var(--text-heading);

  background:
    rgba(
      59,
      130,
      246,
      0.13
    );

  border-color:
    var(--accent-strong);
}

.nav-button.active {
  box-shadow:
    inset 4px 0 var(--accent);
}

.sidebar-bottom {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px 12px;
}

.sidebar-user-icon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-soft);
  background: var(--bg-surface-soft);
  border: 1px solid #304b6d;
  border-radius: 8px;
}

.sidebar-user div:last-child {
  min-width: 0;
}

.sidebar-user strong,
.sidebar-user span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-user strong {
  color: var(--text-primary);
  font-size: 12px;
}

.sidebar-user span {
  margin-top: 3px;
  color: var(--text-muted-alt);
  font-size: 11px;
}

.sidebar-logout-button {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.14);
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
}

.sidebar-logout-button:hover {
  color: #fecaca;
  background: rgba(127, 29, 29, 0.25);
  border-color: rgba(248, 113, 113, 0.5);
}

.system-status {
  margin-top: 30px;

  padding: 16px;

  background: var(--bg-surface-deep);

  border:
    1px solid #273b59;

  border-radius: 9px;
}

.system-status strong {
  display: flex;

  align-items: center;

  gap: 7px;

  color: var(--accent-soft);

  font-size: 13px;
}

.system-status p {
  display: flex;

  align-items: center;

  gap: 8px;

  margin:
    12px 0;

  color: var(--text-muted);

  font-size: 12px;
}

.dot {
  width: 8px;
  height: 8px;

  background: var(--accent);

  border-radius: 50%;

  box-shadow:
    0 0 7px var(--accent);
}

/* =========================================================
   MAIN
========================================================= */

.main {
  width:
    calc(100% - 290px);

  min-width: 0;
  min-height: 100vh;

  margin-left: 290px;

  padding: 20px;

  background: var(--bg-app);
}

.container {
  width: 100%;

  min-height:
    calc(100vh - 40px);

  padding: 28px;

  background:
    rgba(
      11,
      18,
      32,
      0.97
    );

  border:
    1px solid var(--border);

  border-radius: 12px;
}

/* =========================================================
   HEADER
========================================================= */

.header {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  gap: 20px;

  margin-bottom: 24px;

  padding-bottom: 22px;

  border-bottom:
    1px solid var(--border);
}

.eyebrow {
  display: flex;

  align-items: center;

  gap: 7px;

  color: var(--accent);

  font-size: 13px;

  font-weight: 800;
}

.header h1 {
  margin:
    6px 0;

  color: var(--text-heading);

  font-size: 27px;
}

.header p {
  margin: 0;

  color: #a5b4c8;
}

.month-select {
  min-width: 230px;

  min-height: 44px;

  padding:
    9px 12px;

  color: var(--text-primary);

  background: var(--bg-surface-soft-2);

  border:
    1px solid var(--border-muted);

  border-radius: 7px;

  outline: none;
}

/* =========================================================
   MÀU
========================================================= */

.income {
  color: var(--accent-sky) !important;
}

.expense {
  color: var(--color-expense) !important;
}

.adjustment {
  color: var(--color-adjustment) !important;
}

.positive {
  color: var(--color-income) !important;
}

.transfer-color {
  color: #a78bfa !important;
}

/* =========================================================
   SUMMARY
========================================================= */

.summary-grid {
  display: grid;

  grid-template-columns:
    repeat(
      5,
      minmax(0, 1fr)
    );

  gap: 16px;

  margin-bottom: 20px;
}

.summary-card {
  min-height: 135px;

  padding: 20px;

  background:
    linear-gradient(
      145deg,
      #162238,
      #111a2b
    );

  border:
    1px solid var(--border-dim-2);

  border-radius: 9px;
}

.summary-title {
  display: flex;

  align-items: center;

  gap: 8px;

  color: #c2ccda;

  font-size: 13px;

  font-weight: 800;
}

.summary-money {
  display: block;

  margin-top: 23px;

  font-size: 22px;
}

/* =========================================================
   PANEL
========================================================= */

.dashboard-grid {
  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, 1fr);

  gap: 20px;
}

.profile-summary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.8fr);
  gap: 18px;
  margin-bottom: 18px;
}

.profile-identity-card,
.profile-security-card {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  background: linear-gradient(145deg, var(--bg-surface-deep), var(--bg-surface));
  border: 1px solid var(--border-strong);
  border-radius: 10px;
}

.profile-avatar {
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-soft);
  background: var(--bg-surface-soft);
  border: 1px solid #35547b;
  border-radius: 12px;
}

.profile-identity-card span {
  color: var(--text-muted-soft);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

.profile-identity-card h2 {
  margin: 5px 0 3px;
  color: var(--text-heading);
  font-size: 19px;
  overflow-wrap: anywhere;
}

.profile-identity-card p {
  margin: 0;
  color: #8193ab;
  font-size: 12px;
}

.profile-security-card {
  color: var(--accent-soft);
}

.profile-security-card > div {
  min-width: 0;
}

.profile-security-card strong,
.profile-security-card span {
  display: block;
}

.profile-security-card strong {
  color: var(--text-primary);
  font-size: 14px;
}

.profile-security-card span {
  margin-top: 4px;
  color: #8193ab;
  font-size: 12px;
}

.profile-page-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 20px;
}

.profile-info-list {
  display: grid;
  gap: 12px;
}

.profile-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
}

.profile-info-icon {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-soft);
  background: var(--bg-surface-soft);
  border-radius: 8px;
}

.profile-info-row span,
.profile-info-row strong {
  display: block;
}

.profile-info-row span {
  color: var(--text-muted-soft);
  font-size: 11px;
}

.profile-info-row strong {
  margin-top: 4px;
  color: var(--text-primary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.profile-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border-radius: 8px;
  font-size: 12px;
}

.profile-message.success {
  color: #86efac;
  background: rgba(22, 101, 52, 0.18);
  border: 1px solid rgba(74, 222, 128, 0.25);
}

.profile-message.error {
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.18);
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.profile-backup-section {
  grid-column: 1 / -1;
}

.backup-actions-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.backup-hint {
  margin: 12px 0 0;
  color: var(--text-muted-soft);
  font-size: 12px;
  line-height: 1.6;
}

.account-page-grid {
  display: grid;

  grid-template-columns:
    390px
    minmax(0, 1fr);

  gap: 20px;
}

.panel {
  margin-bottom: 20px;

  padding: 21px;

  color: #d8e0eb;

  background:
    linear-gradient(
      145deg,
      var(--bg-surface-deep),
      var(--bg-surface)
    );

  border:
    1px solid var(--border-strong);

  border-radius: 10px;
}

.panel-title {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  gap: 15px;

  margin-bottom: 18px;

  padding-bottom: 15px;

  border-bottom:
    1px solid var(--border-strong);
}

.panel-title h2 {
  margin: 0;

  color: var(--text-primary);

  font-size: 20px;

  font-weight: 700;
}

.panel-title span {
  color: var(--text-muted);

  font-size: 13px;
}

.panel h2,
.panel h3 {
  color: var(--text-primary);
}

/* =========================================================
   FORM
========================================================= */

.form {
  display: grid;

  gap: 14px;
}

.form-field {
  display: grid;

  gap: 7px;
}

.form-field > span {
  color: var(--text-secondary);

  font-size: 14px;

  font-weight: 650;
}

.form-field input,
.form-field select,
.search-box input {
  width: 100%;

  min-height: 49px;

  padding:
    11px 13px;

  color: var(--text-primary);

  background: var(--bg-surface-deep);

  border:
    1px solid #334d70;

  border-radius: 7px;

  outline: none;
}

.form-field input::placeholder,
.search-box input::placeholder {
  color: #718096;
}

.form-field input:focus,
.form-field select:focus,
.search-box input:focus {
  border-color:
    var(--accent);

  box-shadow:
    0 0 0 3px
    rgba(
      96,
      165,
      250,
      0.08
    );
}

/* =========================================================
   TAB
========================================================= */

.transaction-tabs {
  display: grid;

  grid-template-columns:
    repeat(
      4,
      1fr
    );

  gap: 7px;

  margin-bottom: 18px;

  padding: 6px;

  background: #0c1525;

  border:
    1px solid #293e5b;

  border-radius: 8px;
}

.tab-button {
  min-height: 48px;

  display: flex;

  justify-content: center;

  align-items: center;

  gap: 6px;

  padding: 8px;

  color: #aab6c7;

  background: transparent;

  border:
    1px solid transparent;

  border-radius: 6px;

  font-size: 13px;

  font-weight: 700;
}

.tab-button.active {
  color: var(--text-heading);

  background:
    rgba(
      59,
      130,
      246,
      0.15
    );

  border-color:
    var(--accent-strong);
}

/* =========================================================
   BUTTON
========================================================= */

.primary-button,
.secondary-button,
.danger-button {
  min-height: 49px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 8px;

  padding:
    10px 16px;

  border-radius: 7px;

  font-weight: 800;
}

.primary-button {
  color: #fff;

  background:
    linear-gradient(
      135deg,
      var(--accent-deep),
      var(--accent-strong)
    );

  border:
    1px solid var(--accent);
}

.primary-button:hover {
  filter:
    brightness(1.08);
}

.secondary-button {
  width: fit-content;

  color: #bfdbfe;

  background: #152238;

  border:
    1px solid var(--border-soft);
}

.danger-button {
  color: var(--color-expense-tint);

  background:
    rgba(
      190,
      24,
      93,
      0.1
    );

  border:
    1px solid #9f3552;
}

/* =========================================================
   ANALYSIS
========================================================= */

.analysis-summary {
  display: grid;

  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );

  gap: 12px;

  margin-bottom: 20px;
}

.analysis-summary-box {
  padding: 16px;

  background: var(--bg-surface-alt);

  border:
    1px solid var(--border-strong);

  border-radius: 8px;
}

.analysis-summary-box span {
  display: block;

  color: var(--text-muted);

  font-size: 12px;

  font-weight: 700;
}

.analysis-summary-box strong {
  display: block;

  margin-top: 8px;

  font-size: 20px;
}

.analysis-grid {
  display: grid;

  grid-template-columns:
    repeat(
      3,
      minmax(0, 1fr)
    );

  gap: 14px;
}

.analysis-item {
  padding: 17px;

  background: var(--bg-surface-deep-2);

  border:
    1px solid var(--border-dim);

  border-radius: 8px;
}

.analysis-item-header {
  display: flex;

  justify-content:
    space-between;

  gap: 10px;
}

.analysis-item-header strong {
  color: var(--text-primary);
}

.analysis-item-header span {
  display: block;

  margin-top: 5px;

  color: var(--text-muted);

  font-size: 12px;
}

.analysis-detail {
  display: flex;

  justify-content:
    space-between;

  gap: 10px;

  margin-top: 16px;

  color: #aab6c7;

  font-size: 12px;
}

.analysis-footer {
  margin-top: 9px;

  color: var(--text-muted);

  font-size: 12px;
}

.highest-category {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  gap: 15px;

  margin-top: 18px;

  padding: 16px;

  background: var(--bg-surface-alt);

  border:
    1px solid var(--border-soft-2);

  border-radius: 8px;
}

.highest-category span {
  display: block;

  color: var(--text-muted);

  font-size: 11px;

  font-weight: 700;
}

.highest-category div strong {
  display: block;

  margin-top: 5px;

  color: var(--text-primary);
}

/* =========================================================
   ACCOUNT
========================================================= */

.asset-total {
  padding: 20px;

  margin-bottom: 17px;

  background: var(--bg-surface-alt);

  border:
    1px solid var(--border-soft-2);

  border-radius: 8px;
}

.asset-total span {
  display: block;

  color: var(--text-muted);

  font-size: 12px;
}

.asset-total strong {
  display: block;

  margin-top: 7px;

  color: var(--accent);

  font-size: 29px;
}

.account-list {
  display: grid;

  gap: 10px;
}

.account-row,
.account-management-row {
  display: grid;

  align-items: center;

  gap: 12px;

  padding: 14px;

  background: var(--bg-surface-deep-2);

  border:
    1px solid var(--border-dim);

  border-radius: 8px;
}

.account-row {
  grid-template-columns:
    48px
    minmax(0, 1fr)
    auto;
}

.account-management-row {
  grid-template-columns:
    48px
    minmax(0, 1fr)
    auto
    40px
    40px;
}

.account-icon {
  width: 44px;
  height: 44px;

  display: flex;

  justify-content: center;

  align-items: center;

  color: var(--accent);

  background:
    rgba(
      59,
      130,
      246,
      0.1
    );

  border:
    1px solid var(--border-soft);

  border-radius: 7px;
}

.account-main strong {
  display: block;

  color: var(--text-primary);
}

.account-main span {
  display: block;

  margin-top: 4px;

  color: var(--text-muted);

  font-size: 12px;
}

.account-money {
  color: var(--accent-soft);

  white-space: nowrap;
}

.category-box {
  margin-top: 18px;

  padding: 17px;

  background: var(--bg-surface-alt);

  border:
    1px solid var(--border-strong);

  border-radius: 8px;
}

.category-box h3 {
  margin:
    0 0 12px;

  color: var(--text-primary);
}

.money-row,
.calculation-row {
  display: flex;

  justify-content:
    space-between;

  gap: 15px;

  padding:
    12px 0;

  color: var(--text-secondary);

  border-bottom:
    1px solid #20334d;
}

.money-row.strong {
  margin-top: 6px;

  color: var(--color-expense);

  font-weight: 800;
}

/* =========================================================
   BẢNG CHI TIÊU THÁNG - EXCEL
========================================================= */

.sheet-info {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  gap: 20px;

  margin-bottom: 17px;

  padding:
    14px 16px;

  background: var(--bg-surface-alt);

  border:
    1px solid #304d70;

  border-radius: 8px;
}

.sheet-info > div {
  display: flex;

  align-items: center;

  gap: 12px;

  color: var(--accent);
}

.sheet-info strong,
.sheet-info span {
  display: block;
}

.sheet-info > div strong {
  color: var(--accent-tint);

  font-size: 13px;
}

.sheet-info span {
  margin-top: 4px;

  color: var(--text-muted);

  font-size: 12px;
}

.sheet-info > strong {
  color: var(--accent-soft);

  font-size: 13px;
}

.monthly-sheet-wrapper {
  width: 100%;

  overflow-x: auto;

  background: #091423;

  border:
    1px solid #36516f;

  border-radius: 8px;
}

.monthly-sheet {
  width: 100%;

  min-width: 980px;

  border-collapse: collapse;

  color: #dce5ef;

  font-size: 14px;

  font-variant-numeric:
    tabular-nums;
}

.monthly-sheet th,
.monthly-sheet td {
  min-width: 145px;

  height: 54px;

  padding:
    13px 16px;

  text-align: center;

  border-right:
    1px solid #304662;

  border-bottom:
    1px solid #304662;
}

.monthly-sheet th:first-child,
.monthly-sheet td:first-child {
  min-width: 180px;

  text-align: center;
}

.monthly-sheet thead th {
  color: var(--accent-tint);

  background:
    linear-gradient(
      180deg,
      #1a2b44,
      #142238
    );

  font-size: 12px;

  font-weight: 800;

  letter-spacing:
    0.35px;
}

.monthly-sheet tbody tr {
  background: #0d1829;

  transition:
    0.15s ease;
}

.monthly-sheet tbody tr:nth-child(even) {
  background: #101d30;
}

.monthly-sheet tbody tr:hover {
  background:
    rgba(
      59,
      130,
      246,
      0.13
    );
}

.monthly-sheet tbody td {
  color: var(--text-secondary);
}

.monthly-sheet .sheet-date {
  color: var(--accent-soft);

  font-weight: 700;
}

.monthly-sheet .sheet-daily-total {
  font-weight: 800;
}

.monthly-sheet tfoot th {
  color: var(--text-heading);

  background:
    var(--bg-surface-soft);

  border-top:
    2px solid #4b6d95;

  font-size: 14px;
}

.sheet-empty {
  height: 130px !important;

  color: #8295af !important;

  text-align: center !important;
}

/* =========================================================
   BẢNG THỐNG KÊ
========================================================= */

.monthly-stat-table {
  overflow: hidden;

  background: #0c1626;

  border:
    1px solid #36516f;

  border-radius: 8px;
}

.monthly-stat-header,
.monthly-stat-row {
  display: grid;

  grid-template-columns:
    minmax(
      280px,
      1fr
    )
    260px;

  align-items: center;
}

.monthly-stat-header {
  padding:
    15px 20px;

  color: var(--accent-soft);

  background:
    #16243a;

  font-size: 12px;

  font-weight: 800;
}

.monthly-stat-header span:last-child {
  text-align: right;
}

.monthly-stat-row {
  min-height: 58px;

  padding:
    13px 20px;

  border-top:
    1px solid var(--border-strong);
}

.monthly-stat-row:nth-child(odd) {
  background:
    rgba(
      30,
      58,
      93,
      0.11
    );
}

.monthly-stat-row:hover {
  background:
    rgba(
      59,
      130,
      246,
      0.07
    );
}

.monthly-stat-row span {
  color: var(--text-secondary);
}

.monthly-stat-row strong {
  text-align: right;

  font-size: 16px;

  font-variant-numeric:
    tabular-nums;
}

.monthly-stat-row.strong {
  min-height: 63px;

  background: #13233a;

  border-top:
    1px solid #426185;
}

.monthly-stat-row.strong span {
  color: var(--text-primary);

  font-weight: 700;
}

.monthly-stat-row.extra-strong {
  min-height: 72px;

  background:
    linear-gradient(
      90deg,
      #142944,
      #102137
    );

  border-top:
    2px solid #4f7dad;
}

.monthly-stat-row.extra-strong span {
  color: var(--text-heading);

  font-size: 18px;

  font-weight: 800;
}

.monthly-stat-row.extra-strong strong {
  font-size: 22px;
}

/* =========================================================
   KẾT QUẢ THÁNG
========================================================= */

.monthly-result-panel {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  gap: 25px;

  margin-bottom: 20px;

  padding: 22px;

  background:
    linear-gradient(
      135deg,
      #101e32,
      #122743
    );

  border:
    1px solid #41658d;

  border-radius: 10px;
}

.monthly-result-panel > div:first-child span {
  display: block;

  color: #7f95af;

  font-size: 11px;

  font-weight: 800;
}

.monthly-result-panel > div:first-child strong {
  display: block;

  margin-top: 5px;

  color: var(--accent-tint);

  font-size: 19px;
}

.monthly-result-formula {
  display: flex;

  align-items: center;

  gap: 9px;
}

.monthly-result-formula span {
  color: var(--accent-sky);

  font-size: 17px;

  font-weight: 800;
}

.monthly-result-formula small {
  color: #8496ad;

  font-size: 10px;
}

.monthly-result-formula b {
  color: var(--text-neutral);
}

/* =========================================================
   BUDGET ALERT
========================================================= */

.budget-alert {
  display: flex;

  align-items: center;

  gap: 14px;

  margin-bottom: 20px;

  padding: 16px;

  border-radius: 8px;
}

.budget-alert strong,
.budget-alert span {
  display: block;
}

.budget-alert span {
  margin-top: 4px;

  font-size: 13px;
}

.budget-alert.safe {
  color: #a7f3d0;

  background:
    rgba(
      16,
      185,
      129,
      0.08
    );

  border:
    1px solid #17684f;
}

.budget-alert.warning {
  color: #fde68a;

  background:
    rgba(
      245,
      158,
      11,
      0.08
    );

  border:
    1px solid #785f25;
}

.budget-alert.danger {
  color: var(--color-expense-tint);

  background:
    rgba(
      244,
      63,
      94,
      0.08
    );

  border:
    1px solid #804153;
}

/* =========================================================
   FILTER
========================================================= */

.search-box {
  display: flex;

  align-items: center;

  gap: 10px;

  margin-bottom: 18px;

  color: var(--accent);
}

.filter-grid {
  display: grid;

  grid-template-columns:
    repeat(
      4,
      minmax(0, 1fr)
    );

  gap: 13px;

  margin-bottom: 16px;
}

.mini-grid {
  display: grid;

  grid-template-columns:
    repeat(
      5,
      minmax(0, 1fr)
    );

  gap: 12px;

  margin-bottom: 20px;
}

.account-summary-grid {
  display: grid;

  grid-template-columns:
    repeat(
      2,
      minmax(0, 1fr)
    );

  gap: 12px;

  margin-bottom: 20px;
}

.mini-stat {
  min-height: 95px;

  padding: 16px;

  background: var(--bg-surface-deep-2);

  border:
    1px solid var(--border-dim);

  border-radius: 8px;
}

.mini-stat span {
  display: block;

  margin-bottom: 12px;

  color: var(--text-muted);

  font-size: 12px;
}

.mini-stat strong {
  color: var(--text-primary);

  font-size: 18px;
}

/* =========================================================
   TRANSACTION TABLE
========================================================= */

.table-wrapper {
  width: 100%;

  overflow-x: auto;

  border:
    1px solid var(--border-strong);

  border-radius: 8px;
}

.app.light-mode .sidebar {
  background: var(--surface-white);
  border-right-color: var(--border-light);
}

.app.light-mode .brand {
  border-bottom-color: var(--text-primary);
}

.app.light-mode .brand strong,
.app.light-mode .nav-button.active {
  color: var(--accent-deep);
}

.app.light-mode .brand span,
.app.light-mode .nav-label {
  color: var(--text-neutral);
}

.app.light-mode .nav-button {
  color: var(--text-light-muted);
  background: var(--surface-off-white);
  border-color: var(--text-primary);
}

.app.light-mode .nav-button:hover,
.app.light-mode .nav-button.active {
  background: #eff6ff;
  border-color: var(--accent-soft);
}

.app.light-mode .system-status {
  background: var(--surface-off-white);
  border-color: var(--border-light);
}

.app.light-mode .system-status p,
.app.light-mode .sidebar-user span {
  color: var(--text-neutral);
}

.app.light-mode .sidebar-user strong {
  color: #1e293b;
}

.app.light-mode .sidebar-logout-button {
  background: #fff1f2;
  border-color: var(--color-expense-tint);
  color: #be123c;
}

.page-month-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin: -4px 0 16px;
  padding: 10px 12px;
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-strong);
  border-radius: 8px;
}

.page-month-toolbar label {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #aebbd0;
  font-size: 12px;
  font-weight: 700;
}

.page-month-select {
  min-width: 175px;
  min-height: 38px;
  padding: 7px 10px;
  color: var(--text-primary);
  background: var(--bg-surface-soft-2);
  border: 1px solid var(--border-soft);
  border-radius: 7px;
  outline: none;
}

.page-month-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(96,165,250,.08);
}

.theme-toggle-button {
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-adjustment);
  background: var(--bg-surface-soft-2);
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  transition: .2s ease;
}

.theme-toggle-button:hover {
  color: #fde68a;
  border-color: var(--accent);
  transform: translateY(-1px);
}

.app.light-mode {
  background: #f4f7fb;
}

.app.light-mode .main {
  background: #f4f7fb;
}

.app.light-mode .container {
  background: var(--surface-white);
  border-color: var(--border-light);
}

.app.light-mode .header {
  border-color: var(--text-primary);
}

.app.light-mode .header h1,
.app.light-mode .panel-title h2,
.app.light-mode .panel h2,
.app.light-mode .panel h3,
.app.light-mode .table-row {
  color: #172033;
}

.app.light-mode .header p,
.app.light-mode .panel-title span,
.app.light-mode .table-row,
.app.light-mode .summary-title {
  color: var(--text-neutral);
}

.app.light-mode .summary-card,
.app.light-mode .panel {
  background: var(--surface-white);
  border-color: var(--border-light);
}

.app.light-mode .month-select,
.app.light-mode .page-month-select,
.app.light-mode .form-field input,
.app.light-mode .form-field select,
.app.light-mode .search-box input {
  color: #172033;
  background: var(--surface-off-white);
  border-color: var(--text-secondary);
}

.app.light-mode .transaction-table {
  background: var(--surface-white);
}

.app.light-mode .table-header {
  color: var(--text-light-muted);
  background: var(--text-heading);
}

.app.light-mode .table-row {
  border-color: var(--text-primary);
}

.app.light-mode .page-month-toolbar {
  background: var(--surface-off-white);
  border-color: var(--border-light);
}

.app.light-mode .page-month-toolbar label {
  color: var(--text-light-muted);
}

.app.light-mode .theme-toggle-button {
  color: #334155;
  background: var(--surface-off-white);
  border-color: var(--text-secondary);
}

@media (max-width: 900px) {
  .page-month-toolbar {
    justify-content: space-between;
  }

  .header-actions {
    width: 100%;
  }

  .dashboard-search {
    flex: 1 1 220px;
  }
}

@media (max-width: 1150px) {
  .table-header,
  .table-row {
    grid-template-columns:
      78px
      82px
      96px
      minmax(130px, 1.3fr)
      minmax(110px, 1fr)
      118px
      74px;
    gap: 6px;
  }

  .table-header,
  .table-row {
    font-size: 12px;
  }

  .type-badge {
    font-size: 10px;
    padding: 4px 5px;
  }

  .icon-button {
    width: 32px;
    height: 32px;
  }
}

.transaction-table {
  width: 100%;
  min-width: 0;
  background: #0c1626;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns:
    82px
    92px
    105px
    minmax(150px, 1.4fr)
    minmax(125px, 1.1fr)
    128px
    78px;
  gap: 8px;
  align-items: center;
}

.table-header > *,
.table-row > * {
  min-width: 0;
}

.table-row > span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-row .account-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-row .actions {
  justify-content: flex-start;
  min-width: 0;
}

.table-header {
  padding:
    14px 16px;

  color: var(--text-secondary);

  background: #101d30;

  font-size: 11px;

  font-weight: 800;
}

.table-row {
  padding:
    15px 16px;

  color: var(--text-secondary);

  border-top:
    1px solid #20334d;

  font-size: 14px;
}

.table-row:hover {
  background:
    rgba(
      59,
      130,
      246,
      0.05
    );
}

.type-badge {
  display: inline-block;

  padding:
    5px 7px;

  border:
    1px solid currentColor;

  border-radius: 5px;

  font-size: 11px;

  font-weight: 700;
}

.account-cell {
  color: var(--accent-soft);
}

.actions {
  display: flex;

  gap: 6px;
}

.icon-button {
  width: 38px;
  height: 38px;

  display: flex;

  justify-content: center;

  align-items: center;

  color: var(--accent-soft);

  background:
    rgba(
      59,
      130,
      246,
      0.08
    );

  border:
    1px solid var(--border-soft);

  border-radius: 6px;
}

.icon-button.delete {
  color: var(--color-expense);

  border-color:
    #704052;

  background:
    rgba(
      251,
      113,
      133,
      0.06
    );
}

/* =========================================================
   CALENDAR
========================================================= */

.calendar-scroll {
  overflow-x: auto;
}

.weekdays,
.calendar-grid {
  min-width: 850px;

  display: grid;

  grid-template-columns:
    repeat(
      7,
      1fr
    );

  gap: 8px;
}

.weekdays {
  margin-bottom: 8px;
}

.weekdays div {
  padding: 11px;

  color: var(--accent-tint);

  background: var(--bg-surface-raised);

  border:
    1px solid var(--border-soft-2);

  border-radius: 6px;

  text-align: center;

  font-size: 12px;

  font-weight: 800;
}

.calendar-day {
  min-height: 130px;

  padding: 12px;

  color: #dce5ef;

  background: var(--bg-surface-deep);

  border:
    1px solid var(--border-strong);

  border-radius: 7px;
}

.calendar-day.today {
  border:
    2px solid var(--accent);

  background:
    rgba(
      59,
      130,
      246,
      0.08
    );
}

.calendar-day-number {
  display: flex;

  justify-content:
    space-between;

  gap: 7px;
}

.calendar-day-number span {
  padding:
    3px 5px;

  color: var(--accent-soft);

  border:
    1px solid #4978a9;

  border-radius: 4px;

  font-size: 9px;
}

.calendar-income,
.calendar-expense,
.calendar-adjustment {
  display: block;

  margin-top: 11px;

  padding-top: 7px;

  border-top:
    1px solid var(--border-strong);

  font-size: 12px;
}

.calendar-income {
  color: var(--accent-sky);
}

.calendar-expense {
  color: var(--color-expense);
}

.calendar-adjustment {
  color: var(--color-adjustment);
}

/* =========================================================
   MONTH HISTORY
========================================================= */

.month-history {
  display: flex;

  gap: 12px;

  margin-bottom: 20px;

  padding-bottom: 5px;

  overflow-x: auto;
}

.month-history-item {
  min-width: 210px;

  display: grid;

  gap: 6px;

  padding: 15px;

  color: var(--text-secondary);

  background: #121f34;

  border:
    1px solid var(--border-strong);

  border-radius: 8px;

  text-align: left;
}

.month-history-item.active {
  border-color:
    var(--accent);

  background:
    rgba(
      59,
      130,
      246,
      0.13
    );
}

.month-history-item strong {
  color: var(--text-primary);

  font-size: 16px;
}

.month-history-item span {
  font-size: 12px;
}

/* =========================================================
   RESULT
========================================================= */

.final-result {
  display: flex;

  justify-content:
    space-between;

  gap: 15px;

  margin-top: 20px;

  padding: 18px;

  color: var(--text-primary);

  background: var(--bg-surface-raised);

  border:
    1px solid var(--border-muted);

  border-radius: 8px;

  font-size: 20px;

  font-weight: 800;
}

/* =========================================================
   BUDGET
========================================================= */

.budget-item {
  margin-bottom: 18px;

  padding: 17px;

  background: var(--bg-surface-alt);

  border:
    1px solid var(--border-strong);

  border-radius: 8px;
}

.budget-detail-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 15px;
}

.budget-detail-grid > div {
  padding: 11px 12px;
  background: #101c2e;
  border: 1px solid #253b59;
  border-radius: 8px;
}

.budget-detail-grid span,
.budget-detail-grid strong {
  display: block;
}

.budget-detail-grid span {
  color: var(--text-muted-soft);
  font-size: 11px;
}

.budget-detail-grid strong {
  margin-top: 5px;
  color: #dce5f0;
  font-size: 13px;
}

.budget-item-note {
  margin-top: 10px;
  color: var(--text-muted-soft);
  font-size: 12px;
}

.muted {
  color: var(--text-muted-soft) !important;
}

.budget-item-header {
  display: flex;

  justify-content:
    space-between;

  gap: 15px;
}

.budget-item-header strong {
  color: var(--text-primary);
}

.budget-item-header span {
  display: block;

  margin-top: 5px;

  color: var(--text-muted);

  font-size: 13px;
}

.progress {
  width: 100%;

  height: 12px;

  margin-top: 15px;

  overflow: hidden;

  background: #172236;

  border-radius: 20px;
}

.progress div {
  height: 100%;

  border-radius: 20px;

  transition:
    width 0.3s ease;
}

.progress div.safe {
  background: var(--color-income);
}

.progress div.warning {
  background: var(--color-adjustment);
}

.progress div.danger {
  background: var(--color-expense);
}

.budget-remaining {
  margin-top: 10px;

  color: #a6b2c2;

  font-size: 13px;
}

/* =========================================================
   MODAL
========================================================= */

.modal-overlay {
  position: fixed;

  z-index: 1000;

  inset: 0;

  display: flex;

  justify-content: center;

  align-items: center;

  padding: 20px;

  background:
    rgba(
      2,
      6,
      23,
      0.85
    );

  backdrop-filter:
    blur(6px);
}

.modal {
  width:
    min(
      600px,
      100%
    );

  max-height: 90vh;

  overflow-y: auto;

  padding: 22px;

  background: var(--bg-surface);

  border:
    1px solid var(--border-muted);

  border-radius: 12px;

  box-shadow:
    0 25px 80px
    rgba(
      0,
      0,
      0,
      0.45
    );
}

.modal-header {
  display: flex;

  justify-content:
    space-between;

  align-items: center;

  gap: 15px;

  margin-bottom: 20px;
}

.modal-header span {
  color: var(--accent);

  font-size: 11px;

  font-weight: 800;
}

.modal-header h2 {
  margin:
    4px 0 0;

  color: var(--text-primary);
}

.modal-header button {
  width: 40px;
  height: 40px;

  display: flex;

  justify-content: center;

  align-items: center;

  color: var(--text-primary);

  background: var(--bg-surface-soft-2);

  border:
    1px solid #334d70;

  border-radius: 7px;
}

.modal-actions {
  display: flex;

  justify-content:
    flex-end;

  gap: 10px;

  margin-top: 5px;
}

.empty {
  padding:
    35px 15px;

  color: var(--text-muted);

  text-align: center;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (max-width: 1300px) {
  .summary-grid {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }

  .analysis-summary {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }

  .analysis-grid {
    grid-template-columns:
      1fr;
  }

  .filter-grid {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }

  .mini-grid {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }

  .dashboard-grid,
  .account-page-grid,
  .profile-summary-grid,
  .profile-page-grid {
    grid-template-columns:
      1fr;
  }

  .monthly-result-panel {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .monthly-result-formula {
    flex-wrap: wrap;
  }
}

@media (max-width: 900px) {
  .sidebar {
    position: static;

    width: 100%;

    max-height: none;
  }

  .main {
    width: 100%;

    margin-left: 0;
  }

  .header {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .month-select {
    width: 100%;
  }

  .summary-grid,
  .analysis-summary,
  .filter-grid,
  .mini-grid,
  .account-summary-grid {
    grid-template-columns:
      1fr;
  }

  .transaction-tabs {
    grid-template-columns:
      repeat(
        2,
        1fr
      );
  }

  .highest-category {
    align-items:
      flex-start;

    flex-direction:
      column;
  }

  .monthly-stat-header,
  .monthly-stat-row {
    grid-template-columns:
      1fr
      150px;
  }

  .sheet-info {
    align-items:
      flex-start;

    flex-direction:
      column;
  }
}

/* =========================================================
   DASHBOARD REBUILD - GỌN HƠN
========================================================= */

.dashboard-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(320px, 0.85fr);
  gap: 18px;
  margin-bottom: 18px;
}

.dashboard-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.85fr);
  gap: 18px;
  margin-bottom: 18px;
}

.dashboard-wide-button {
  width: 100%;
  justify-content: center;
  margin-top: 12px;
}

.dashboard-budget-total {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 15px;
  margin-bottom: 9px;
}

.dashboard-budget-total div {
  display: grid;
  gap: 4px;
}

.dashboard-budget-total span,
.dashboard-budget-total > span {
  color: var(--text-muted-alt);
  font-size: 12px;
}

.dashboard-budget-total strong {
  font-size: 24px;
}

.dashboard-budget-track {
  height: 8px;
  overflow: hidden;
  background: var(--bg-surface-soft-2);
  border-radius: 99px;
  border: 1px solid var(--border);
}

.dashboard-budget-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.dashboard-budget-track .safe { background: var(--color-income); }
.dashboard-budget-track .warning { background: var(--color-adjustment); }
.dashboard-budget-track .danger { background: var(--color-expense); }

.dashboard-budget-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;
}

.dashboard-budget-mini {
  padding: 11px;
  background: var(--bg-surface-deep-3);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.dashboard-budget-mini > div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.dashboard-budget-mini span {
  color: var(--text-muted);
  font-size: 11px;
}

.dashboard-budget-mini strong {
  color: var(--text-primary);
  font-size: 12px;
}

.dashboard-budget-mini small {
  display: block;
  margin-top: 5px;
  color: var(--text-muted-alt);
  font-size: 10px;
}

.dashboard-quick-actions {
  display: grid;
  gap: 9px;
}

.dashboard-quick-actions button {
  display: grid;
  grid-template-columns: 34px 1fr;
  grid-template-rows: auto auto;
  column-gap: 10px;
  align-items: center;
  padding: 11px;
  color: #dbe5f2;
  background: var(--bg-surface-deep-3);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: left;
}

.dashboard-quick-actions button:hover {
  border-color: #4f6f98;
  background: var(--bg-surface-raised);
}

.dashboard-quick-actions svg {
  grid-row: 1 / 3;
  color: var(--accent);
}

.dashboard-quick-actions span {
  font-size: 13px;
  font-weight: 700;
}

.dashboard-quick-actions small {
  margin-top: 2px;
  color: var(--text-muted-alt);
  font-size: 10px;
}

.dashboard-note {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  padding: 12px 14px;
  color: #9fb0c7;
  background: var(--bg-surface-deep-3);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 12px;
}

.dashboard-note svg {
  flex: 0 0 auto;
  color: var(--accent);
}

.dashboard-note span {
  flex: 1;
}

.dashboard-note strong {
  color: var(--accent-tint);
}

.dashboard-note button {
  flex: 0 0 auto;
  border: 0;
  color: var(--accent-soft);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}

.transaction-add-panel {
  margin-bottom: 18px;
}

#dashboard-quick-add {
  scroll-margin-top: 20px;
  margin-bottom: 18px;
}

#dashboard-quick-add .transaction-page-add {
  margin-bottom: 0;
}

.header-add-button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 15px;
  color: #fff;
  background: var(--accent-deep);
  border: 1px solid var(--accent-strong);
  border-radius: 8px;
  box-shadow: 0 8px 22px rgba(37, 99, 235, 0.22);
  font-size: 13px;
  font-weight: 700;
}

.header-add-button:hover {
  background: #1d4ed8;
}


.reports-chart-grid {
  margin-bottom: 18px;
}

@media (max-width: 1350px) {
  .dashboard-summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1050px) {
  .dashboard-overview-grid,
  .dashboard-bottom-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 800px) {
  .budget-detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .dashboard-summary-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-budget-mini-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-note {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 560px) {
  .notification-dropdown {
    position: fixed;
    top: 76px;
    right: 12px;
    left: 12px;
    width: auto;
    max-height: calc(100vh - 96px);
  }

  .notification-header {
    min-height: 64px;
    padding: 12px 14px;
  }
}

/* =========================================================
   DASHBOARD NÂNG CAO
========================================================= */

.header-left {
  min-width: 0;
}

.header-actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.dashboard-search {
  width: 240px;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 14px;
  color: #8294ad;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-dim-2);
  border-radius: 8px;
}

.dashboard-search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
}

.dashboard-search input {
  width: 100%;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  background: transparent;
}

.dashboard-search input::placeholder {
  color: var(--text-muted-alt);
}

.icon-button {
  position: relative;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: #c7d5e8;
  background: var(--bg-surface-raised);
  border: 1px solid #304a6c;
  border-radius: 9px;
  line-height: 0;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.icon-button:hover,
.icon-button.active {
  color: #eff6ff;
  background: var(--bg-surface-soft);
  border-color: #5b8bc2;
}

.icon-button:active {
  transform: translateY(1px);
}

.dashboard-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.9fr) minmax(330px, 0.9fr);
  gap: 18px;
  margin-bottom: 18px;
}

.header-notification-wrap {
  position: relative;
  z-index: 1200;
  flex: 0 0 auto;
}

.notification-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 19px;
  height: 19px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  color: var(--surface-white);
  background: #ef4444;
  border: 2px solid var(--bg-app);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
  pointer-events: none;
}

.notification-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: min(390px, calc(100vw - 32px));
  max-height: min(560px, calc(100vh - 120px));
  overflow: hidden auto;
  color: #dbe5f2;
  background: var(--bg-surface-deep-4);
  border: 1px solid var(--border-scroll);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(96, 165, 250, 0.04);
  scrollbar-width: thin;
  scrollbar-color: var(--border-scroll) var(--bg-surface-deep-4);
}

.notification-dropdown::-webkit-scrollbar {
  width: 7px;
}

.notification-dropdown::-webkit-scrollbar-track {
  background: var(--bg-surface-deep-4);
}

.notification-dropdown::-webkit-scrollbar-thumb {
  background: var(--border-scroll);
  border: 0;
  border-radius: 99px;
}

.notification-header {
  position: sticky;
  top: 0;
  z-index: 2;
  min-height: 70px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  background: var(--bg-surface-raised);
  border-bottom: 1px solid var(--border-dim-2);
}

.notification-header > div {
  min-width: 0;
}

.notification-header strong {
  display: block;
  color: var(--text-heading);
  font-size: 14px;
  font-weight: 800;
}

.notification-header span {
  display: block;
  margin-top: 4px;
  color: var(--text-muted-alt);
  font-size: 11px;
}

.notification-read-all {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 0 9px;
  border: 1px solid var(--border-soft);
  border-radius: 7px;
  color: var(--accent-soft);
  background: #12233a;
  font-size: 11px;
  font-weight: 700;
}

.notification-read-all:hover {
  color: var(--accent-tint);
  background: #19304e;
  border-color: #5b8bc2;
}

.notification-empty {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: var(--text-muted-alt);
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
}

.notification-item {
  position: relative;
  width: 100%;
  min-height: 74px;
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 16px;
  color: inherit;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--border-faint);
  text-align: left;
  transition: background 0.16s ease;
}

.notification-item:last-child {
  border-bottom: 0;
}

.notification-item:hover {
  background: #14233a;
}

.notification-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.notification-item > div:nth-child(2) {
  flex: 1;
  min-width: 0;
}

.notification-item strong {
  display: block;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.notification-item span {
  display: block;
  margin-top: 4px;
  color: #8294ad;
  font-size: 11px;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.notification-dot {
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  margin-top: 4px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.08);
}

.notification-item.warning .notification-dot {
  background: var(--color-adjustment);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.08);
}

.notification-item.danger .notification-dot {
  background: var(--color-expense);
  box-shadow: 0 0 0 4px rgba(251, 113, 133, 0.08);
}

.notification-item.success .notification-dot {
  background: var(--color-income);
  box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.08);
}

.dashboard-secondary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.85fr) minmax(280px, 0.85fr);
  gap: 18px;
  margin-bottom: 18px;
}

.dashboard-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 18px;
}

.dashboard-panel-heading.compact {
  margin-bottom: 15px;
}

.dashboard-panel-heading h2 {
  margin: 3px 0 5px;
  color: var(--text-heading);
  font-size: 20px;
}

.dashboard-panel-heading span {
  color: var(--text-muted-alt);
  font-size: 12px;
}

.dashboard-panel-heading > svg {
  flex: 0 0 auto;
  color: var(--accent);
}

.panel-kicker {
  color: var(--accent);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1px;
}

.flow-legend {
  display: flex;
  gap: 16px;
  padding-top: 4px;
  color: #9aabc1;
  font-size: 12px;
}

.flow-legend span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.flow-legend i {
  width: 8px;
  height: 8px;
  display: inline-block;
  border-radius: 50%;
}

.legend-income {
  background: var(--color-income);
}

.legend-expense {
  background: var(--color-expense);
}

.dashboard-chart-wrap {
  width: 100%;
  min-height: 250px;
}

.dashboard-chart {
  width: 100%;
  height: 250px;
  overflow: visible;
}

.chart-grid-line {
  stroke: var(--border);
  stroke-width: 1;
}

.chart-axis-label {
  fill: var(--text-muted-alt);
  font-size: 10px;
}

.chart-income-line {
  stroke: var(--color-income);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-expense-line {
  stroke: var(--color-expense);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.chart-income-dot {
  fill: var(--bg-surface);
  stroke: var(--color-income);
  stroke-width: 2;
}

.chart-expense-dot {
  fill: var(--bg-surface);
  stroke: var(--color-expense);
  stroke-width: 2;
}

.flow-summary-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 8px;
  padding-top: 15px;
  border-top: 1px solid var(--border);
}

.flow-summary-row div {
  display: grid;
  gap: 5px;
}

.flow-summary-row span {
  color: var(--text-muted-alt);
  font-size: 11px;
}

.flow-summary-row strong {
  font-size: 15px;
}

.donut-content {
  display: grid;
  grid-template-columns: 180px 1fr;
  align-items: center;
  gap: 20px;
  min-height: 280px;
}

.donut-chart {
  width: 170px;
  height: 170px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
}

.donut-hole {
  width: 112px;
  height: 112px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--bg-surface);
  border-radius: 50%;
}

.donut-hole strong {
  color: var(--text-heading);
  font-size: 17px;
}

.donut-hole span {
  margin-top: 5px;
  color: var(--text-muted-alt);
  font-size: 11px;
}

.donut-legend {
  display: grid;
  gap: 15px;
}

.donut-legend-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
}

.donut-legend-row > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.donut-legend-row strong {
  color: var(--text-primary);
}

.donut-dot {
  width: 9px;
  height: 9px;
  display: inline-block;
  border-radius: 50%;
}

.donut-dot.food {
  background: var(--cat-food);
}

.donut-dot.rent {
  background: var(--cat-rent);
}

.donut-dot.other {
  background: var(--cat-other);
}

.text-button {
  border: 0;
  padding: 4px 0;
  color: #818cf8;
  background: transparent;
  font-weight: 800;
}

.text-button:hover {
  color: #a5b4fc;
}

.dashboard-recent-list,
.dashboard-account-list,
.dashboard-notification-list {
  display: grid;
  gap: 7px;
}

.dashboard-recent-row,
.dashboard-account-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-faint);
}

.dashboard-recent-row:last-child,
.dashboard-account-row:last-child {
  border-bottom: 0;
}

.dashboard-transaction-icon,
.dashboard-account-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 9px;
}

.dashboard-transaction-icon.income {
  color: var(--color-income);
  background: rgba(52, 211, 153, 0.1);
}

.dashboard-transaction-icon.expense {
  color: var(--color-expense);
  background: rgba(251, 113, 133, 0.1);
}

.dashboard-transaction-icon.adjustment {
  color: var(--color-adjustment);
  background: rgba(251, 191, 36, 0.1);
}

.dashboard-recent-main,
.dashboard-account-row > div:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.dashboard-recent-main strong,
.dashboard-account-row strong {
  display: block;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-recent-main span,
.dashboard-account-row span {
  display: block;
  margin-top: 4px;
  overflow: hidden;
  color: var(--text-muted-alt);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-recent-amount {
  white-space: nowrap;
  font-size: 12px;
}

.dashboard-account-row > strong {
  text-align: right;
  white-space: nowrap;
}

.dashboard-account-icon {
  color: var(--accent);
  background: rgba(96, 165, 250, 0.1);
}

.dashboard-notification-row {
  display: flex;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-faint);
}

.dashboard-notification-row:last-child {
  border-bottom: 0;
}

.dashboard-notification-mark {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--accent);
}

.dashboard-notification-row.info .dashboard-notification-mark {
  background: var(--accent);
}

.dashboard-notification-row > div:last-child {
  min-width: 0;
}

.dashboard-notification-row strong,
.dashboard-notification-row span {
  display: block;
}

.dashboard-notification-row strong {
  color: var(--text-primary);
  font-size: 12px;
}

.dashboard-notification-row span {
  margin-top: 4px;
  color: var(--text-muted-alt);
  font-size: 11px;
  line-height: 1.5;
}

.summary-card .summary-money.asset {
  color: #a78bfa;
}

@media (max-width: 1250px) {
  .dashboard-hero-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-secondary-grid {
    grid-template-columns: 1fr 1fr;
  }

  .dashboard-notification-panel {
    grid-column: 1 / -1;
  }

  .dashboard-search {
    width: 210px;
  }
}

@media (max-width: 900px) {
  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .dashboard-search {
    width: 100%;
    order: 1;
  }

  .month-select {
    order: 2;
    flex: 1;
  }

  .header-notification-wrap {
    order: 3;
  }

  .dashboard-secondary-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-notification-panel {
    grid-column: auto;
  }

  .donut-content {
    grid-template-columns: 1fr;
  }

  .flow-summary-row {
    grid-template-columns: 1fr;
  }
}

`;