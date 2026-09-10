import React, { useEffect, useMemo, useRef, useState } from "react";

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
} from "lucide-react";

/* =========================================================
   LOCAL STORAGE
========================================================= */

const ACCOUNT_KEY = "blue-finance-accounts-v5";
const TRANSACTION_KEY = "blue-finance-transactions-v5";
const BUDGET_KEY = "blue-finance-budgets-v5";

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

    monthTransactions.forEach((item) => {
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

      label: "Quản lý tài khoản",

      icon: Wallet,
    },
  ];

  const pageTitle =
    pages.find((item) => item.id === activePage)?.label ||
    "Blue Finance";

  return (
    <>
      <style>{styles}</style>

      <div className="app">
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
        </aside>

        {/* ===================================================
            MAIN
        =================================================== */}

        <main className="main">
          <div className="container">
            {/* HEADER */}

            <header className="header">
              <div>
                <div className="eyebrow">
                  <Shield size={17} />

                  HỆ THỐNG QUẢN LÝ TÀI CHÍNH
                </div>

                <h1>{pageTitle}</h1>

                <p>
                  Đang xem {formatMonth(selectedMonth)}
                </p>
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
                  <option
                    key={month}
                    value={month}
                  >
                    {formatMonth(month)}
                  </option>
                ))}
              </select>
            </header>

            {/* =================================================
                TỔNG QUAN
            ================================================= */}

            {activePage === "dashboard" && (
              <>
                <div className="summary-grid">
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
                      totals.remaining >= 0
                        ? "positive"
                        : "expense"
                    }
                  />
                </div>

                {/* PHÂN TÍCH */}

                <section className="panel">
                  <PanelTitle
                    title="Phân tích chi tiêu"
                    subtitle={formatMonth(selectedMonth)}
                  />

                  <div className="analysis-summary">
                    <AnalysisSummary
                      label="TỔNG CHI"
                      value={totals.expense}
                      className="expense"
                    />

                    <AnalysisSummary
                      label="TỔNG NGÂN SÁCH"
                      value={totalBudget}
                      className="income"
                    />

                    <AnalysisSummary
                      label={
                        budgetRemaining >= 0
                          ? "CÒN NGÂN SÁCH"
                          : "VƯỢT NGÂN SÁCH"
                      }
                      value={Math.abs(budgetRemaining)}
                      className={
                        budgetRemaining >= 0
                          ? "positive"
                          : "expense"
                      }
                    />

                    <div className="analysis-summary-box">
                      <span>ĐÃ SỬ DỤNG</span>

                      <strong
                        className={
                          budgetPercent >= 100
                            ? "expense"
                            : budgetPercent >= 80
                            ? "adjustment"
                            : "positive"
                        }
                      >
                        {budgetPercent.toFixed(1)}%
                      </strong>
                    </div>
                  </div>

                  <div className="analysis-grid">
                    <SpendingAnalysisItem
                      title="Ăn uống"
                      spent={totals.food}
                      totalExpense={totals.expense}
                      budget={currentBudget.food}
                    />

                    <SpendingAnalysisItem
                      title="Tiền trọ"
                      spent={totals.rent}
                      totalExpense={totals.expense}
                      budget={currentBudget.rent}
                    />

                    <SpendingAnalysisItem
                      title="Chi tiêu khác"
                      spent={totals.other}
                      totalExpense={totals.expense}
                      budget={currentBudget.other}
                    />
                  </div>

                  <div className="highest-category">
                    <div>
                      <span>
                        DANH MỤC CHI NHIỀU NHẤT
                      </span>

                      <strong>
                        {totals.expense > 0
                          ? highestCategory.name
                          : "Chưa có chi tiêu"}
                      </strong>
                    </div>

                    <strong className="expense">
                      {formatMoney(
                        totals.expense > 0
                          ? highestCategory.amount
                          : 0
                      )}
                    </strong>
                  </div>
                </section>

                {/* CẢNH BÁO */}

                {totalBudget > 0 && (
                  <div
                    className={`budget-alert ${
                      budgetPercent >= 100
                        ? "danger"
                        : budgetPercent >= 80
                        ? "warning"
                        : "safe"
                    }`}
                  >
                    {budgetPercent >= 100 ? (
                      <AlertTriangle size={24} />
                    ) : (
                      <CheckCircle2 size={24} />
                    )}

                    <div>
                      <strong>
                        {budgetPercent >= 100
                          ? "Bạn đã vượt ngân sách tháng"
                          : budgetPercent >= 80
                          ? "Ngân sách tháng sắp đạt giới hạn"
                          : "Ngân sách tháng đang an toàn"}
                      </strong>

                      <span>
                        Đã chi {formatMoney(budgetUsed)} /{" "}
                        {formatMoney(totalBudget)}
                      </span>
                    </div>
                  </div>
                )}

                {/* THÊM GIAO DỊCH + TÀI SẢN */}

                <div className="dashboard-grid">
                  <section className="panel">
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

                  <section className="panel">
                    <PanelTitle
                      title="Tài sản hiện tại"
                      subtitle={`${accounts.length} tài khoản`}
                    />

                    <div className="asset-total">
                      <span>TỔNG TÀI SẢN</span>

                      <strong>
                        {formatMoney(totalAssets)}
                      </strong>
                    </div>

                    <div className="account-list">
                      {accounts.length === 0 && (
                        <Empty>
                          Chưa có tài khoản.
                        </Empty>
                      )}

                      {accounts.map((account) => {
                        const config =
                          accountTypes[account.type] ||
                          accountTypes.bank;

                        const Icon = config.icon;

                        return (
                          <div
                            className="account-row"
                            key={account.id}
                          >
                            <div className="account-icon">
                              <Icon size={22} />
                            </div>

                            <div className="account-main">
                              <strong>
                                {account.name}
                              </strong>

                              <span>
                                {config.label}
                              </span>
                            </div>

                            <strong className="account-money">
                              {formatMoney(
                                getAccountBalance(
                                  account
                                )
                              )}
                            </strong>
                          </div>
                        );
                      })}
                    </div>

                    <div className="category-box">
                      <h3>
                        Chi theo danh mục
                      </h3>

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
                    </div>
                  </section>
                </div>
              </>
            )}

            {/* =================================================
                NHẬT KÝ GIAO DỊCH
            ================================================= */}

            {activePage === "transactions" && (
              <>
                <section className="panel">
                  <PanelTitle
                    title="Tìm kiếm và lọc giao dịch"
                    subtitle={`${monthTransactions.length} giao dịch`}
                  />

                  <div className="search-box">
                    <Search size={21} />

                    <input
                      placeholder="Tìm giao dịch..."
                      value={filters.search}
                      onChange={(event) =>
                        setFilters({
                          ...filters,

                          search:
                            event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="filter-grid">
                    <FormField label="Loại giao dịch">
                      <select
                        value={filters.type}
                        onChange={(event) =>
                          setFilters({
                            ...filters,

                            type:
                              event.target.value,
                          })
                        }
                      >
                        <option value="all">
                          Tất cả
                        </option>

                        <option value="income">
                          Đầu vào
                        </option>

                        <option value="expense">
                          Đầu ra
                        </option>

                        <option value="adjustment">
                          Tip / Âm
                        </option>

                        <option value="transfer">
                          Chuyển tiền
                        </option>
                      </select>
                    </FormField>

                    <FormField label="Danh mục">
                      <select
                        value={filters.category}
                        onChange={(event) =>
                          setFilters({
                            ...filters,

                            category:
                              event.target.value,
                          })
                        }
                      >
                        <option value="all">
                          Tất cả
                        </option>

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

                    <FormField label="Tài khoản">
                      <select
                        value={filters.accountId}
                        onChange={(event) =>
                          setFilters({
                            ...filters,

                            accountId:
                              event.target.value,
                          })
                        }
                      >
                        <option value="all">
                          Tất cả
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

                    <FormField label="Sắp xếp">
                      <select
                        value={filters.sort}
                        onChange={(event) =>
                          setFilters({
                            ...filters,

                            sort:
                              event.target.value,
                          })
                        }
                      >
                        <option value="newest">
                          Ngày mới nhất
                        </option>

                        <option value="oldest">
                          Ngày cũ nhất
                        </option>

                        <option value="highest">
                          Tiền cao → thấp
                        </option>

                        <option value="lowest">
                          Tiền thấp → cao
                        </option>
                      </select>
                    </FormField>

                    <FormField label="Từ ngày">
                      <input
                        type="date"
                        value={filters.dateFrom}
                        onChange={(event) =>
                          setFilters({
                            ...filters,

                            dateFrom:
                              event.target.value,
                          })
                        }
                      />
                    </FormField>

                    <FormField label="Đến ngày">
                      <input
                        type="date"
                        value={filters.dateTo}
                        onChange={(event) =>
                          setFilters({
                            ...filters,

                            dateTo:
                              event.target.value,
                          })
                        }
                      />
                    </FormField>

                    <FormField label="Số tiền từ">
                      <input
                        type="number"
                        value={filters.minAmount}
                        onChange={(event) =>
                          setFilters({
                            ...filters,

                            minAmount:
                              event.target.value,
                          })
                        }
                      />
                    </FormField>

                    <FormField label="Số tiền đến">
                      <input
                        type="number"
                        value={filters.maxAmount}
                        onChange={(event) =>
                          setFilters({
                            ...filters,

                            maxAmount:
                              event.target.value,
                          })
                        }
                      />
                    </FormField>
                  </div>

                  <button
                    className="secondary-button"
                    onClick={resetFilters}
                  >
                    <RotateCcw size={18} />

                    Xóa bộ lọc
                  </button>
                </section>

                <div className="mini-grid">
                  <MiniStat
                    label="KẾT QUẢ"
                    value={`${filteredTransactions.length} giao dịch`}
                  />

                  <MiniStat
                    label="ĐẦU VÀO"
                    value={formatMoney(
                      filteredTotals.income
                    )}
                    className="income"
                  />

                  <MiniStat
                    label="ĐẦU RA"
                    value={formatMoney(
                      filteredTotals.expense
                    )}
                    className="expense"
                  />

                  <MiniStat
                    label="TRUNG BÌNH"
                    value={formatMoney(
                      filteredAverage
                    )}
                  />

                  <MiniStat
                    label="CAO NHẤT"
                    value={formatMoney(
                      filteredHighest
                    )}
                  />
                </div>

                <section className="panel">
                  <TransactionTable
                    data={filteredTransactions}
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
                BẢNG CHI TIÊU THÁNG - MỚI
            ================================================= */}

            {activePage === "monthlyTable" && (
              <>
                <section className="panel">
                  <PanelTitle
                    title="Bảng chi tiêu hàng tháng"
                    subtitle={formatMonth(
                      selectedMonth
                    )}
                  />

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
  budget,
  percent,
}) {
  const budgetNumber =
    Number(budget || 0);

  const remaining =
    budgetNumber -
    Number(spent || 0);

  let status = "safe";

  if (percent >= 100) {
    status = "danger";
  } else if (
    percent >= 80
  ) {
    status = "warning";
  }

  return (
    <div className="budget-item">
      <div className="budget-item-header">
        <div>
          <strong>
            {title}
          </strong>

          <span>
            {formatMoney(
              spent
            )}{" "}
            /{" "}
            {formatMoney(
              budgetNumber
            )}
          </span>
        </div>

        <strong
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
            ? `${percent.toFixed(
                1
              )}%`
            : "0%"}
        </strong>
      </div>

      <div className="progress">
        <div
          className={status}
          style={{
            width: `${
              budgetNumber > 0
                ? Math.min(
                    percent,
                    100
                  )
                : 0
            }%`,
          }}
        />
      </div>

      {budgetNumber > 0 && (
        <div className="budget-remaining">
          {remaining >= 0 ? (
            <>
              Còn{" "}
              <strong className="positive">
                {formatMoney(
                  remaining
                )}
              </strong>
            </>
          ) : (
            <>
              Vượt{" "}
              <strong className="expense">
                {formatMoney(
                  Math.abs(
                    remaining
                  )
                )}
              </strong>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   BẢNG GIAO DỊCH
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

  background: #08111f;
}

body {
  display: block;

  min-width: 320px;
  min-height: 100vh;

  overflow-x: hidden;

  color: #e2e8f0;

  background: #08111f;

  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  font-size: 17px;
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
    #08111f;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #08111f;
}

::-webkit-scrollbar-thumb {
  background:
    linear-gradient(
      180deg,
      #304d70,
      #243d5c
    );

  border:
    2px solid #08111f;

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
  background: #08111f;
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
    #08111f;
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

  background:
    linear-gradient(
      180deg,
      #101827,
      #0b1220
    );

  border-right:
    1px solid #263a58;
}

.brand {
  display: flex;

  align-items: center;

  gap: 12px;

  padding:
    12px 10px 25px;

  color: #60a5fa;

  border-bottom:
    1px solid #263a58;
}

.brand strong {
  display: block;

  color: #60a5fa;

  font-size: 22px;
}

.brand span {
  display: block;

  margin-top: 5px;

  color: #7185a3;

  font-size: 11px;

  line-height: 1.8;

  letter-spacing: 1px;
}

.nav-label {
  margin:
    25px 10px 12px;

  color: #94a3b8;

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
    1px solid #263a58;

  border-radius: 8px;

  font-weight: 650;

  text-align: left;

  transition:
    0.2s ease;
}

.nav-button:hover,
.nav-button.active {
  color: #f1f5f9;

  background:
    rgba(
      59,
      130,
      246,
      0.13
    );

  border-color:
    #3b82f6;
}

.nav-button.active {
  box-shadow:
    inset 4px 0 #60a5fa;
}

.system-status {
  margin-top: 30px;

  padding: 16px;

  background: #111c2f;

  border:
    1px solid #273b59;

  border-radius: 9px;
}

.system-status strong {
  display: flex;

  align-items: center;

  gap: 7px;

  color: #93c5fd;

  font-size: 13px;
}

.system-status p {
  display: flex;

  align-items: center;

  gap: 8px;

  margin:
    12px 0;

  color: #94a3b8;

  font-size: 12px;
}

.dot {
  width: 8px;
  height: 8px;

  background: #60a5fa;

  border-radius: 50%;

  box-shadow:
    0 0 7px #60a5fa;
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

  background: #08111f;
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
    1px solid #263a58;

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
    1px solid #263a58;
}

.eyebrow {
  display: flex;

  align-items: center;

  gap: 7px;

  color: #60a5fa;

  font-size: 13px;

  font-weight: 800;
}

.header h1 {
  margin:
    6px 0;

  color: #f1f5f9;

  font-size: 35px;
}

.header p {
  margin: 0;

  color: #a5b4c8;
}

.month-select {
  min-width: 230px;

  min-height: 48px;

  padding:
    10px 13px;

  color: #e2e8f0;

  background: #17243a;

  border:
    1px solid #3c5b81;

  border-radius: 7px;

  outline: none;
}

/* =========================================================
   MÀU
========================================================= */

.income {
  color: #38bdf8 !important;
}

.expense {
  color: #fb7185 !important;
}

.adjustment {
  color: #fbbf24 !important;
}

.positive {
  color: #34d399 !important;
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
      4,
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
    1px solid #2a405f;

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

  font-size: 27px;
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
      #111c2f,
      #101827
    );

  border:
    1px solid #293f5e;

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
    1px solid #293f5e;
}

.panel-title h2 {
  margin: 0;

  color: #e2e8f0;

  font-size: 20px;

  font-weight: 700;
}

.panel-title span {
  color: #94a3b8;

  font-size: 13px;
}

.panel h2,
.panel h3 {
  color: #e2e8f0;
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
  color: #cbd5e1;

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

  color: #e2e8f0;

  background: #111c2f;

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
    #60a5fa;

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
  color: #f1f5f9;

  background:
    rgba(
      59,
      130,
      246,
      0.15
    );

  border-color:
    #3b82f6;
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
      #2563eb,
      #3b82f6
    );

  border:
    1px solid #60a5fa;
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
    1px solid #365b87;
}

.danger-button {
  color: #fecdd3;

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

  background: #0d1727;

  border:
    1px solid #293f5e;

  border-radius: 8px;
}

.analysis-summary-box span {
  display: block;

  color: #94a3b8;

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

  background: #131f33;

  border:
    1px solid #2b425f;

  border-radius: 8px;
}

.analysis-item-header {
  display: flex;

  justify-content:
    space-between;

  gap: 10px;
}

.analysis-item-header strong {
  color: #e2e8f0;
}

.analysis-item-header span {
  display: block;

  margin-top: 5px;

  color: #94a3b8;

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

  color: #94a3b8;

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

  background: #0d1727;

  border:
    1px solid #36577d;

  border-radius: 8px;
}

.highest-category span {
  display: block;

  color: #94a3b8;

  font-size: 11px;

  font-weight: 700;
}

.highest-category div strong {
  display: block;

  margin-top: 5px;

  color: #e2e8f0;
}

/* =========================================================
   ACCOUNT
========================================================= */

.asset-total {
  padding: 20px;

  margin-bottom: 17px;

  background: #0d1727;

  border:
    1px solid #36577d;

  border-radius: 8px;
}

.asset-total span {
  display: block;

  color: #94a3b8;

  font-size: 12px;
}

.asset-total strong {
  display: block;

  margin-top: 7px;

  color: #60a5fa;

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

  background: #131f33;

  border:
    1px solid #2b425f;

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

  color: #60a5fa;

  background:
    rgba(
      59,
      130,
      246,
      0.1
    );

  border:
    1px solid #365b87;

  border-radius: 7px;
}

.account-main strong {
  display: block;

  color: #e2e8f0;
}

.account-main span {
  display: block;

  margin-top: 4px;

  color: #94a3b8;

  font-size: 12px;
}

.account-money {
  color: #93c5fd;

  white-space: nowrap;
}

.category-box {
  margin-top: 18px;

  padding: 17px;

  background: #0d1727;

  border:
    1px solid #293f5e;

  border-radius: 8px;
}

.category-box h3 {
  margin:
    0 0 12px;

  color: #e2e8f0;
}

.money-row,
.calculation-row {
  display: flex;

  justify-content:
    space-between;

  gap: 15px;

  padding:
    12px 0;

  color: #cbd5e1;

  border-bottom:
    1px solid #20334d;
}

.money-row.strong {
  margin-top: 6px;

  color: #fb7185;

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

  background: #0d1727;

  border:
    1px solid #304d70;

  border-radius: 8px;
}

.sheet-info > div {
  display: flex;

  align-items: center;

  gap: 12px;

  color: #60a5fa;
}

.sheet-info strong,
.sheet-info span {
  display: block;
}

.sheet-info > div strong {
  color: #dbeafe;

  font-size: 13px;
}

.sheet-info span {
  margin-top: 4px;

  color: #94a3b8;

  font-size: 12px;
}

.sheet-info > strong {
  color: #93c5fd;

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
  color: #dbeafe;

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
  color: #cbd5e1;
}

.monthly-sheet .sheet-date {
  color: #93c5fd;

  font-weight: 700;
}

.monthly-sheet .sheet-daily-total {
  font-weight: 800;
}

.monthly-sheet tfoot th {
  color: #f1f5f9;

  background:
    #172943;

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

  color: #93c5fd;

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
    1px solid #293f5e;
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
  color: #cbd5e1;
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
  color: #e2e8f0;

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
  color: #f1f5f9;

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

  color: #dbeafe;

  font-size: 19px;
}

.monthly-result-formula {
  display: flex;

  align-items: center;

  gap: 9px;
}

.monthly-result-formula span {
  color: #38bdf8;

  font-size: 17px;

  font-weight: 800;
}

.monthly-result-formula small {
  color: #8496ad;

  font-size: 10px;
}

.monthly-result-formula b {
  color: #64748b;
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
  color: #fecdd3;

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

  color: #60a5fa;
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

  background: #131f33;

  border:
    1px solid #2b425f;

  border-radius: 8px;
}

.mini-stat span {
  display: block;

  margin-bottom: 12px;

  color: #94a3b8;

  font-size: 12px;
}

.mini-stat strong {
  color: #e2e8f0;

  font-size: 18px;
}

/* =========================================================
   TRANSACTION TABLE
========================================================= */

.table-wrapper {
  width: 100%;

  overflow-x: auto;

  border:
    1px solid #293f5e;

  border-radius: 8px;
}

.transaction-table {
  min-width: 1100px;

  background: #0c1626;
}

.table-header,
.table-row {
  display: grid;

  grid-template-columns:
    110px
    120px
    140px
    minmax(
      180px,
      1fr
    )
    minmax(
      170px,
      1fr
    )
    155px
    100px;

  gap: 10px;

  align-items: center;
}

.table-header {
  padding:
    14px 16px;

  color: #cbd5e1;

  background: #101d30;

  font-size: 11px;

  font-weight: 800;
}

.table-row {
  padding:
    15px 16px;

  color: #cbd5e1;

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
  color: #93c5fd;
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

  color: #93c5fd;

  background:
    rgba(
      59,
      130,
      246,
      0.08
    );

  border:
    1px solid #365b87;

  border-radius: 6px;
}

.icon-button.delete {
  color: #fb7185;

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

  color: #dbeafe;

  background: #111f34;

  border:
    1px solid #36577d;

  border-radius: 6px;

  text-align: center;

  font-size: 12px;

  font-weight: 800;
}

.calendar-day {
  min-height: 130px;

  padding: 12px;

  color: #dce5ef;

  background: #111c2f;

  border:
    1px solid #293f5e;

  border-radius: 7px;
}

.calendar-day.today {
  border:
    2px solid #60a5fa;

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

  color: #93c5fd;

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
    1px solid #293f5e;

  font-size: 12px;
}

.calendar-income {
  color: #38bdf8;
}

.calendar-expense {
  color: #fb7185;
}

.calendar-adjustment {
  color: #fbbf24;
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

  color: #cbd5e1;

  background: #121f34;

  border:
    1px solid #293f5e;

  border-radius: 8px;

  text-align: left;
}

.month-history-item.active {
  border-color:
    #60a5fa;

  background:
    rgba(
      59,
      130,
      246,
      0.13
    );
}

.month-history-item strong {
  color: #e2e8f0;

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

  color: #e2e8f0;

  background: #111f34;

  border:
    1px solid #3c5b81;

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

  background: #0d1727;

  border:
    1px solid #293f5e;

  border-radius: 8px;
}

.budget-item-header {
  display: flex;

  justify-content:
    space-between;

  gap: 15px;
}

.budget-item-header strong {
  color: #e2e8f0;
}

.budget-item-header span {
  display: block;

  margin-top: 5px;

  color: #94a3b8;

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
  background: #34d399;
}

.progress div.warning {
  background: #fbbf24;
}

.progress div.danger {
  background: #fb7185;
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

  background: #101827;

  border:
    1px solid #3c5b81;

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
  color: #60a5fa;

  font-size: 11px;

  font-weight: 800;
}

.modal-header h2 {
  margin:
    4px 0 0;

  color: #e2e8f0;
}

.modal-header button {
  width: 40px;
  height: 40px;

  display: flex;

  justify-content: center;

  align-items: center;

  color: #e2e8f0;

  background: #17243a;

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

  color: #94a3b8;

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
  .account-page-grid {
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
`;