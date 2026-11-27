import { createPortal } from "react-dom";
import React, {
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { supabase } from "./lib/supabaseClient";
import {
    getFamilyData,
    saveFamilyData,
} from "./lib/apiClient";
import {
    ShieldCheck,
    LayoutDashboard,
    List,
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
    Download,
    Upload,
    Sun,
    Sunset,
    Moon,
    CreditCard,
    PiggyBank,
    ChevronLeft,
    ChevronDown,
    ChevronRight,
    History as HistoryIcon,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";
/* =========================================================
   LOCAL STORAGE
========================================================= */
const ACCOUNT_KEY = "blue-finance-accounts-v5";
const TRANSACTION_KEY = "blue-finance-transactions-v5";
const BUDGET_KEY = "blue-finance-budgets-v5";
const READ_NOTIFICATION_KEY = "blue-finance-read-notifications-v1";
const TX_NOTICE_KEY = "blue-finance-tx-notices-v1";
const THEME_KEY = "blue-finance-theme-v1";
const DEBT_KEY = "blue-finance-debts-v1";
const SAVING_KEY = "blue-finance-savings-v1";
const SALARY_KEY = "blue-finance-salaries-v1";
const INVEST_CATEGORY_KEY = "blue-finance-invest-categories-v1";
/* Danh mục đầu tư có sẵn (người dùng thêm / xoá danh mục tuỳ ý) */
const DEFAULT_INVEST_CATEGORIES = [
    { id: "saving", name: "Gửi tiết kiệm" },
    { id: "bank-loan", name: "Vay ngân hàng" },
];
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
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
function dateKeyFromOffset(offset) {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}
function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
}
function formatDate(value) {
    if (!value)
        return "";
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}
function formatMonth(value) {
    if (!value)
        return "";
    const [year, month] = value.split("-");
    return `Tháng ${Number(month)} / ${year}`;
}
function getPreviousMonthKey(monthKey) {
    const [year, month] = monthKey.split("-").map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}
/* Số tiền chênh lệch: bỏ 3 số 0 ở cuối (làm tròn đến nghìn) */
function formatCompareAmount(value) {
    return Math.round(Math.abs(value) / 1000).toLocaleString("vi-VN");
}
function getGreeting(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) {
        return { text: "Good morning", icon: Sun };
    }
    if (hour >= 12 && hour < 18) {
        return { text: "Good afternoon", icon: Sunset };
    }
    if (hour >= 18 && hour < 22) {
        return { text: "Good evening", icon: Moon };
    }
    return { text: "Good night", icon: Moon };
}
function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
/* =========================================================
   MÃ GIAO DỊCH (ID):  #DDMMYY.N
   Ví dụ giao dịch ngày 01/11/2026 → #011126.1, #011126.2 ...
   Phần sau dấu chấm là số thứ tự của giao dịch trong ngày đó.
   Mã được lưu cùng giao dịch nên không đổi khi xoá giao dịch khác.
========================================================= */
function transactionDatePrefix(dateKey) {
    const [year, month, day] = String(dateKey || "").split("-");
    if (!year || !month || !day)
        return "";
    return `${day}${month}${year.slice(-2)}`;
}
/* Số thứ tự tiếp theo trong ngày (lớn nhất đang có + 1) */
function getNextTransactionCode(list, dateKey, letter = "") {
    const prefix = transactionDatePrefix(dateKey);
    const pattern = new RegExp("^#" + letter + "(\\d{6})\\.(\\d+)$");
    let max = 0;
    list.forEach((item) => {
        const match = pattern.exec(item.code || "");
        if (match && match[1] === prefix) {
            max = Math.max(max, Number(match[2]));
        }
    });
    return `#${letter}${prefix}.${max + 1}`;
}
function transactionCreatedAt(item) {
    return Number(String(item.id || "").split("-")[0]) || 0;
}
/* Gán mã cho giao dịch cũ chưa có mã (theo thứ tự tạo trong từng ngày).
   Không có gì để gán thì trả về đúng mảng cũ để không render lại. */
function assignMissingCodes(list) {
    if (list.every((item) => item.code || !item.date))
        return list;
    const next = [...list];
    const counters = {};
    next.forEach((item) => {
        const match = /^#(\d{6})\.(\d+)$/.exec(item.code || "");
        if (match) {
            counters[match[1]] = Math.max(counters[match[1]] || 0, Number(match[2]));
        }
    });
    next
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !item.code && item.date)
        .sort((a, b) => transactionCreatedAt(a.item) - transactionCreatedAt(b.item) ||
        a.index - b.index)
        .forEach(({ item, index }) => {
        const prefix = transactionDatePrefix(item.date);
        counters[prefix] = (counters[prefix] || 0) + 1;
        next[index] = { ...item, code: `#${prefix}.${counters[prefix]}` };
    });
    return next;
}
function loadStorage(key, defaultValue) {
    try {
        const data = localStorage.getItem(key);
        if (!data)
            return defaultValue;
        return JSON.parse(data);
    }
    catch {
        return defaultValue;
    }
}
/* =========================================================
   APP
========================================================= */
/* =========================================================
   CHẠY SỐ KHI VÀO TRANG
   Quét các số tiền / phần trăm trong trang vừa mở (dạng 1.250.000 đ, 45%)
   rồi cho chạy từ 0 lên giá trị thật. Không cần sửa từng component.
   - Bỏ qua nếu bật "giảm chuyển động" của hệ điều hành
   - Nếu React cập nhật số giữa chừng thì tự dừng, không ghi đè dữ liệu
========================================================= */
function runNumberCountUp(root, options = {}) {
    const { duration = 1000, delay = 150, maxItems = 150 } = options;
    if (!root || typeof window === "undefined")
        return undefined;
    if (window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return undefined;
    }
    const pattern = /^(\s*[-+\u2212]?\s*)(\d{1,3}(?:\.\d{3})+|\d+)(\s*(?:đ|₫|%)?\s*)$/;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent ||
                parent.closest("input, textarea, select, script, style, [data-no-count]")) {
                return NodeFilter.FILTER_REJECT;
            }
            return pattern.test(node.nodeValue)
                ? NodeFilter.FILTER_ACCEPT
                : NodeFilter.FILTER_REJECT;
        },
    });
    const items = [];
    while (walker.nextNode() && items.length < maxItems) {
        const node = walker.currentNode;
        const match = node.nodeValue.match(pattern);
        const target = Number(match[2].replace(/\./g, ""));
        const hasGroup = /\d\.\d{3}/.test(match[2]);
        const hasSuffix = match[3].trim() !== "";
        /* Chỉ chạy số tiền / phần trăm; bỏ qua số ngày, số thứ tự... */
        if (!target || (!hasGroup && !hasSuffix))
            continue;
        const startText = `${match[1]}0${match[3]}`;
        node.nodeValue = startText;
        items.push({
            node,
            original: match[0],
            prefix: match[1],
            suffix: match[3],
            target,
            last: startText,
            done: false,
        });
    }
    if (!items.length)
        return undefined;
    const startTime = performance.now() + delay;
    let frame = 0;
    function tick(now) {
        const progress = Math.min(Math.max((now - startTime) / duration, 0), 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        let alive = false;
        items.forEach((item) => {
            if (item.done)
                return;
            if (!item.node.isConnected || item.node.nodeValue !== item.last) {
                item.done = true;
                return;
            }
            if (progress >= 1) {
                item.node.nodeValue = item.original;
                item.done = true;
                return;
            }
            const text = `${item.prefix}${Math.round(item.target * eased).toLocaleString("vi-VN")}${item.suffix}`;
            item.node.nodeValue = text;
            item.last = text;
            alive = true;
        });
        if (progress < 1 && alive)
            frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => {
        cancelAnimationFrame(frame);
        items.forEach((item) => {
            if (!item.done &&
                item.node.isConnected &&
                item.node.nodeValue === item.last) {
                item.node.nodeValue = item.original;
            }
        });
    };
}
/* Đọc số tiền thành chữ tiếng Việt: 1050000 -> "Một triệu không trăm năm mươi nghìn đồng" (tối đa 999 tỷ) */
function vietnameseAmountInWords(value) {
    const amount = Math.floor(Math.abs(Number(value) || 0));
    if (!amount || amount >= 1e12)
        return "";
    const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    const units = ["", "nghìn", "triệu", "tỷ"];
    function readTriple(n, hasHigher) {
        const h = Math.floor(n / 100);
        const t = Math.floor((n % 100) / 10);
        const u = n % 10;
        const parts = [];
        if (h > 0 || (hasHigher && (t > 0 || u > 0)))
            parts.push(`${digits[h]} trăm`);
        if (t > 1) {
            parts.push(`${digits[t]} mươi`);
            if (u === 1)
                parts.push("mốt");
            else if (u === 5)
                parts.push("lăm");
            else if (u > 0)
                parts.push(digits[u]);
        }
        else if (t === 1) {
            parts.push("mười");
            if (u === 5)
                parts.push("lăm");
            else if (u > 0)
                parts.push(digits[u]);
        }
        else if (u > 0) {
            if (h > 0 || hasHigher)
                parts.push("lẻ");
            parts.push(digits[u]);
        }
        return parts.join(" ");
    }
    const groups = [];
    let rest = amount;
    while (rest > 0) {
        groups.push(rest % 1000);
        rest = Math.floor(rest / 1000);
    }
    const out = [];
    for (let i = groups.length - 1; i >= 0; i -= 1) {
        if (groups[i] === 0)
            continue;
        out.push(`${readTriple(groups[i], out.length > 0)} ${units[i]}`.trim());
    }
    const text = `${out.join(" ")} đồng`;
    return text.charAt(0).toUpperCase() + text.slice(1);
}
export default function App() {
    /* =======================================================
       DỮ LIỆU
    ======================================================= */
    const [accounts, setAccounts] = useState(() => loadStorage(ACCOUNT_KEY, []));
    const [transactions, setTransactions] = useState(() => loadStorage(TRANSACTION_KEY, []));
    const [budgets, setBudgets] = useState(() => loadStorage(BUDGET_KEY, {}));
    const [debts, setDebts] = useState(() => loadStorage(DEBT_KEY, []));
    const [savings, setSavings] = useState(() => loadStorage(SAVING_KEY, []));
    const [salaries, setSalaries] = useState(() => loadStorage(SALARY_KEY, []));
    const [investCategories, setInvestCategories] = useState(() => {
        const saved = loadStorage(INVEST_CATEGORY_KEY, null);
        return Array.isArray(saved) && saved.length
            ? saved
            : DEFAULT_INVEST_CATEGORIES;
    });
    /* =======================================================
       ĐỒNG BỘ DỮ LIỆU GIA ĐÌNH
    ======================================================= */
    const [familySyncReady, setFamilySyncReady] = useState(false);
    const [familySyncError, setFamilySyncError] = useState("");
    const [familySyncStatus, setFamilySyncStatus] = useState("loading");
    const familySyncStartedRef = useRef(false);
    const familySaveTimerRef = useRef(null);
    const familyDataRef = useRef(null);
    const familySaveQueueRef = useRef(Promise.resolve());
    const familySyncVersionRef = useRef(null);
    const familySyncConflictRef = useRef(false);
    /* =======================================================
       ĐIỀU HƯỚNG
    ======================================================= */
    const [activePage, setActivePage] = useState("dashboard");
    /* Vùng nội dung của trang đang mở: mount lại mỗi lần đổi tab để chạy hiệu ứng vào trang */
    const pageStageRef = useRef(null);
    useLayoutEffect(() => runNumberCountUp(pageStageRef.current), [activePage]);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const data = loadStorage(TRANSACTION_KEY, []);
        const months = data
            .filter((item) => item.date)
            .map((item) => item.date.slice(0, 7))
            .sort((a, b) => b.localeCompare(a));
        return months[0] || currentMonthKey();
    });
    const [transactionMonth, setTransactionMonth] = useState(selectedMonth);
    /* Nhật ký giao dịch: xem theo ngày / tháng / năm tuỳ chỉnh */
    const [logMode, setLogMode] = useState("month");
    const [logDay, setLogDay] = useState(todayString());
    const [logYear, setLogYear] = useState(String(new Date().getFullYear()));
    /* Tìm kiếm giao dịch (tìm trong toàn bộ nhật ký) */
    const [logSearch, setLogSearch] = useState("");
    /* Lọc theo loại: mảng rỗng = tất cả các loại */
    const [logTypes, setLogTypes] = useState([]);
    /* Phân trang nhật ký */
    const [logPage, setLogPage] = useState(1);
    const [logPageSize, setLogPageSize] = useState(8);
    const logTableRef = useRef(null);
    const logPageRef = useRef(null);
    /* Thông báo "Giao dịch mới": chuông có 2 tai + nhấp nháy cho tới khi đã đọc */
    const [txNotices, setTxNotices] = useState(() => loadStorage(TX_NOTICE_KEY, []));
    useEffect(() => {
        try {
            localStorage.setItem(TX_NOTICE_KEY, JSON.stringify(txNotices));
        }
        catch {
            // bỏ qua
        }
    }, [txNotices]);
    function addTxNotice(info) {
        setTxNotices((old) => [
            {
                id: `tx-${createId()}`,
                type: "success",
                title: "Giao dịch mới",
                text: info.text,
                actionPage: "transactions",
            },
            ...old,
        ].slice(0, 30));
    }
    const [monthlyTableMonth, setMonthlyTableMonth] = useState(selectedMonth);
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
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);
    const greeting = getGreeting(now);
    const GreetingIcon = greeting.icon;
    const [showNotifications, setShowNotifications] = useState(false);
    const notificationRef = useRef(null);
    const [readNotificationIds, setReadNotificationIds] = useState(() => loadStorage(READ_NOTIFICATION_KEY, []));
    const [dashboardSearch, setDashboardSearch] = useState("");
    const [userEmail, setUserEmail] = useState("");
    /* =======================================================
       GIAO DIỆN BAN NGÀY / BAN ĐÊM
    ======================================================= */
    const [isDark, setIsDark] = useState(() => loadStorage(THEME_KEY, "light") === "dark");
    /* =======================================================
       NHÃN TÊN CHỨC NĂNG KHI RÊ CHUỘT VÀO THANH TRÁI
    ======================================================= */
    const [railTip, setRailTip] = useState(null);
    function showRailTip(event, label) {
        const rect = event.currentTarget.getBoundingClientRect();
        /* Trên điện thoại thanh nằm ở dưới cùng nên nhãn hiện phía trên nút */
        if (window.innerWidth <= 900) {
            setRailTip({
                label,
                placement: "above",
                left: rect.left + rect.width / 2,
                top: rect.top - 10,
            });
            return;
        }
        setRailTip({
            label,
            placement: "side",
            left: rect.right + 14,
            top: rect.top + rect.height / 2,
        });
    }
    function hideRailTip() {
        setRailTip(null);
    }
    useEffect(() => {
        document.documentElement.dataset.theme = isDark ? "dark" : "light";
        try {
            localStorage.setItem(THEME_KEY, JSON.stringify(isDark ? "dark" : "light"));
        }
        catch {
            // Trình duyệt chặn lưu trữ: bỏ qua, chế độ vẫn đổi trong phiên này
        }
    }, [isDark]);
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
    /* Hiệu ứng nhún khi bấm vào các nút chức năng (thanh trên + thanh icon bên trái) */
    useEffect(() => {
        const selector = ".topbar-pill, .rail-button";
        function handleBounce(event) {
            const el = event.target.closest && event.target.closest(selector);
            if (!el)
                return;
            el.classList.remove("is-bouncing");
            void el.offsetWidth; /* khởi động lại animation nếu bấm liên tục */
            el.classList.add("is-bouncing");
        }
        function handleEnd(event) {
            if (event.animationName === "fn-click-bounce") {
                event.target.classList.remove("is-bouncing");
            }
        }
        document.addEventListener("click", handleBounce);
        document.addEventListener("animationend", handleEnd);
        return () => {
            document.removeEventListener("click", handleBounce);
            document.removeEventListener("animationend", handleEnd);
        };
    }, []);
    function playSound(frequency = 520, duration = 0.06) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext)
                return;
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
            gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start();
            oscillator.stop(context.currentTime + duration);
        }
        catch {
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
     Chỉ lưu sau khi đã tải dữ liệu gia đình thành công
  ======================================================= */
    useEffect(() => {
        if (!familySyncReady)
            return;
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(accounts));
    }, [accounts, familySyncReady]);
    useEffect(() => {
        if (!familySyncReady)
            return;
        localStorage.setItem(TRANSACTION_KEY, JSON.stringify(transactions));
    }, [transactions, familySyncReady]);
    /* Giao dịch cũ chưa có mã thì tự gán sau khi tải dữ liệu */
    useEffect(() => {
        if (!familySyncReady)
            return;
        setTransactions((old) => assignMissingCodes(old));
    }, [transactions, familySyncReady]);
    useEffect(() => {
        if (!familySyncReady)
            return;
        localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
    }, [budgets, familySyncReady]);
    useEffect(() => {
        if (!familySyncReady)
            return;
        localStorage.setItem(DEBT_KEY, JSON.stringify(debts));
    }, [debts, familySyncReady]);
    useEffect(() => {
        if (!familySyncReady)
            return;
        localStorage.setItem(SAVING_KEY, JSON.stringify(savings));
    }, [savings, familySyncReady]);
    useEffect(() => {
        if (!familySyncReady)
            return;
        localStorage.setItem(SALARY_KEY, JSON.stringify(salaries));
    }, [salaries, familySyncReady]);
    useEffect(() => {
        if (!familySyncReady)
            return;
        localStorage.setItem(INVEST_CATEGORY_KEY, JSON.stringify(investCategories));
    }, [investCategories, familySyncReady]);
    /* =======================================================
       TẢI DỮ LIỆU GIA ĐÌNH TỪ SUPABASE
    ======================================================= */
    useEffect(() => {
        if (familySyncStartedRef.current)
            return;
        familySyncStartedRef.current = true;
        async function initializeFamilyData() {
            try {
                setFamilySyncStatus("loading");
                setFamilySyncError("");
                // 1. Sao lưu dữ liệu cũ trên máy trước khi đồng bộ
                const backupKey = "blue-finance-before-family-sync-backup-v1";
                if (!localStorage.getItem(backupKey)) {
                    const backup = {
                        createdAt: new Date().toISOString(),
                        values: {
                            accounts: localStorage.getItem(ACCOUNT_KEY),
                            transactions: localStorage.getItem(TRANSACTION_KEY),
                            budgets: localStorage.getItem(BUDGET_KEY),
                            debts: localStorage.getItem(DEBT_KEY),
                            savings: localStorage.getItem(SAVING_KEY),
                            salaries: localStorage.getItem(SALARY_KEY),
                            investCategories: localStorage.getItem(INVEST_CATEGORY_KEY),
                        },
                    };
                    localStorage.setItem(backupKey, JSON.stringify(backup));
                }
                // 2. Đóng gói dữ liệu hiện có trên máy
                const localData = {
                    accounts,
                    transactions,
                    budgets,
                    debts,
                    savings,
                    salaries,
                    investCategories,
                };
                // 3. Tải dữ liệu từ Supabase
                const result = await getFamilyData();
                const remoteData = result.data;
                familySyncVersionRef.current =
                    result.version ?? result.updatedAt ?? null;
                if (remoteData &&
                    typeof remoteData === "object" &&
                    !Array.isArray(remoteData)) {
                    // 4A. Đã có dữ liệu trên máy chủ:
                    // lấy dữ liệu máy chủ làm dữ liệu chính
                    const normalizedData = {
                        accounts: Array.isArray(remoteData.accounts)
                            ? remoteData.accounts
                            : [],
                        transactions: Array.isArray(remoteData.transactions)
                            ? remoteData.transactions
                            : [],
                        budgets: remoteData.budgets &&
                            typeof remoteData.budgets === "object" &&
                            !Array.isArray(remoteData.budgets)
                            ? remoteData.budgets
                            : {},
                        debts: Array.isArray(remoteData.debts)
                            ? remoteData.debts
                            : [],
                        savings: Array.isArray(remoteData.savings)
                            ? remoteData.savings
                            : [],
                        salaries: Array.isArray(remoteData.salaries)
                            ? remoteData.salaries
                            : [],
                        investCategories: Array.isArray(remoteData.investCategories) &&
                            remoteData.investCategories.length
                            ? remoteData.investCategories
                            : DEFAULT_INVEST_CATEGORIES,
                    };
                    setAccounts(normalizedData.accounts);
                    setTransactions(normalizedData.transactions);
                    setBudgets(normalizedData.budgets);
                    setDebts(normalizedData.debts);
                    setSavings(normalizedData.savings);
                    setSalaries(normalizedData.salaries);
                    setInvestCategories(normalizedData.investCategories);
                    familyDataRef.current = JSON.stringify(normalizedData);
                }
                else {
                    // 4B. Chưa có dữ liệu trên máy chủ:
                    // đưa dữ liệu hiện có trên máy lên Supabase
                    const saveResult = await saveFamilyData(localData, null);
                    familySyncVersionRef.current =
                        saveResult.version ?? saveResult.updatedAt ?? null;
                    familyDataRef.current = JSON.stringify(localData);
                }
                // 5. Chỉ cho phép lưu và đồng bộ sau khi hoàn tất
                setFamilySyncStatus("synced");
                setFamilySyncReady(true);
            }
            catch (error) {
                console.error("Family sync initialization error:", error);
                setFamilySyncStatus("error");
                setFamilySyncError(error.message ||
                    "Không thể tải dữ liệu gia đình. Vui lòng thử tải lại trang.");
            }
        }
        initializeFamilyData();
    }, []);
    /* =======================================================
       TỰ ĐỘNG ĐỒNG BỘ DỮ LIỆU LÊN SUPABASE
    ======================================================= */
    useEffect(() => {
        if (!familySyncReady || familySyncConflictRef.current) {
            return;
        }
        const familyData = {
            accounts,
            transactions,
            budgets,
            debts,
            savings,
            salaries,
            investCategories,
        };
        const serializedData = JSON.stringify(familyData);
        // Không lưu nếu dữ liệu chưa thay đổi
        if (serializedData === familyDataRef.current) {
            return;
        }
        // Chờ 1 giây sau thao tác cuối cùng rồi mới lưu
        if (familySaveTimerRef.current) {
            clearTimeout(familySaveTimerRef.current);
        }
        familySaveTimerRef.current = setTimeout(() => {
            familySaveQueueRef.current = familySaveQueueRef.current
                .catch(() => { })
                .then(async () => {
                if (serializedData === familyDataRef.current ||
                    familySyncConflictRef.current) {
                    return;
                }
                try {
                    setFamilySyncStatus("saving");
                    setFamilySyncError("");
                    const saveResult = await saveFamilyData(familyData, familySyncVersionRef.current);
                    familySyncVersionRef.current =
                        saveResult.version ?? saveResult.updatedAt ?? null;
                    familyDataRef.current = serializedData;
                    setFamilySyncStatus("synced");
                }
                catch (error) {
                    console.error("Family data save error:", error);
                    if (error.conflict) {
                        familySyncConflictRef.current = true;
                        localStorage.setItem("blue-finance-conflict-backup-v1", JSON.stringify({
                            createdAt: new Date().toISOString(),
                            expectedVersion: familySyncVersionRef.current,
                            data: familyData,
                        }));
                        setFamilySyncError("Dữ liệu đã được thay đổi trên thiết bị khác. Bản chỉnh sửa trên thiết bị này đã được sao lưu cục bộ. Hãy tải lại trang để nhận dữ liệu mới nhất.");
                        setFamilySyncReady(false);
                    }
                    else {
                        setFamilySyncError(error.message ||
                            "Không thể đồng bộ dữ liệu lên máy chủ.");
                    }
                    setFamilySyncStatus("error");
                }
            });
        }, 1000);
        return () => {
            if (familySaveTimerRef.current) {
                clearTimeout(familySaveTimerRef.current);
            }
        };
    }, [
        accounts,
        transactions,
        budgets,
        debts,
        savings,
        salaries,
        investCategories,
        familySyncReady,
    ]);
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
        return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    }, [transactions, budgets, selectedMonth]);
    /* =======================================================
       TÀI KHOẢN
    ======================================================= */
    function getAccount(id) {
        return accounts.find((account) => String(account.id) === String(id));
    }
    function getAccountName(id) {
        return getAccount(id)?.name || "Không xác định";
    }
    function getAccountBalance(account, uptoMonth) {
        let balance = Number(account.openingBalance || 0);
        transactions.forEach((transaction) => {
            /* Nếu có uptoMonth: chỉ tính các giao dịch đến hết tháng đó */
            if (uptoMonth &&
                String(transaction.date || "").slice(0, 7) > uptoMonth) {
                return;
            }
            const amount = Math.abs(Number(transaction.amount || 0));
            if (transaction.type === "income" &&
                String(transaction.accountId) === String(account.id)) {
                balance += amount;
            }
            if (transaction.type === "expense" &&
                String(transaction.accountId) === String(account.id)) {
                balance -= amount;
            }
            if (transaction.type === "adjustment" &&
                String(transaction.accountId) === String(account.id)) {
                if (transaction.adjustmentDirection === "minus") {
                    balance -= amount;
                }
                else {
                    balance += amount;
                }
            }
            if (transaction.type === "transfer") {
                if (String(transaction.fromAccountId) === String(account.id)) {
                    balance -= amount;
                }
                if (String(transaction.toAccountId) === String(account.id)) {
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
        return transactions.filter((item) => item.date && item.date.startsWith(selectedMonth));
    }, [transactions, selectedMonth]);
    const logSearchText = logSearch.trim().toLowerCase();
    const transactionMonthTransactions = useMemo(() => {
        return transactions.filter((item) => {
            if (!item.date)
                return false;
            /* Lọc theo loại (không chọn loại nào = lấy tất cả) */
            if (logTypes.length > 0 && !logTypes.includes(item.type))
                return false;
            /* Có từ khoá: tìm trong toàn bộ nhật ký, không giới hạn ngày/tháng/năm */
            if (logSearchText) {
                const accountText = item.type === "transfer"
                    ? `${getAccountName(item.fromAccountId)} ${getAccountName(item.toAccountId)}`
                    : getAccountName(item.accountId);
                const categoryText = item.type === "expense"
                    ? categories[item.category]?.label || ""
                    : "";
                return `${item.code || ""} ${item.description || ""} ${accountText} ${categoryText} ${typeLabels[item.type] || ""} ${formatDate(item.date)} ${Math.abs(Number(item.amount || 0))}`
                    .toLowerCase()
                    .includes(logSearchText);
            }
            if (logMode === "day")
                return item.date === logDay;
            if (logMode === "year")
                return item.date.startsWith(`${logYear}-`);
            return item.date.startsWith(transactionMonth);
        });
    }, [
        transactions,
        accounts,
        transactionMonth,
        logMode,
        logDay,
        logYear,
        logTypes,
        logSearchText,
    ]);
    const logMonthsWithData = useMemo(() => {
        const set = new Set();
        transactions.forEach((item) => {
            if (item.date)
                set.add(item.date.slice(0, 7));
        });
        return set;
    }, [transactions]);
    const logYearsWithData = useMemo(() => {
        const set = new Set();
        transactions.forEach((item) => {
            if (item.date)
                set.add(Number(item.date.slice(0, 4)));
        });
        return set;
    }, [transactions]);
    /* Sắp xếp mới nhất trước rồi cắt thành từng trang */
    const logSorted = useMemo(() => [...transactionMonthTransactions].sort((a, b) => b.date.localeCompare(a.date) ||
        String(b.id).localeCompare(String(a.id))), [transactionMonthTransactions]);
    const logPageCount = Math.max(1, Math.ceil(logSorted.length / logPageSize));
    const logPageSafe = Math.min(logPage, logPageCount);
    const logPageStart = (logPageSafe - 1) * logPageSize;
    const logPageData = logSorted.slice(logPageStart, logPageStart + logPageSize);
    /* Đổi bộ lọc thì quay về trang 1 */
    useEffect(() => {
        setLogPage(1);
    }, [
        logMode,
        logDay,
        transactionMonth,
        logYear,
        logSearchText,
        logTypes,
    ]);
    /* Bảng nhật ký kéo dài tới đáy màn hình: đo chiều cao còn lại, chia số dòng
       mỗi trang và giãn đều chiều cao dòng để không còn khoảng trống */
    useLayoutEffect(() => {
        if (activePage !== "transactions")
            return undefined;
        const measure = () => {
            const panel = logPageRef.current;
            const table = logTableRef.current;
            if (!panel || !table)
                return;
            if (window.innerWidth <= 900) {
                panel.style.removeProperty("--log-page-h");
                table.style.setProperty("--log-row-h", `${LOG_ROW_HEIGHT}px`);
                setLogPageSize(10);
                return;
            }
            const top = panel.getBoundingClientRect().top + window.scrollY;
            panel.style.setProperty("--log-page-h", `${Math.max(420, window.innerHeight - top - 20)}px`);
            const head = table.querySelector(".table-header")?.offsetHeight || LOG_HEAD_HEIGHT;
            const area = table.clientHeight - head - 2;
            const count = Math.max(3, Math.min(50, Math.floor(area / LOG_ROW_HEIGHT)));
            table.style.setProperty("--log-row-h", `${Math.max(LOG_ROW_HEIGHT, area / count)}px`);
            setLogPageSize(count);
        };
        measure();
        const frame = requestAnimationFrame(measure);
        const timer = setTimeout(measure, 200);
        let observer = null;
        if (typeof ResizeObserver !== "undefined" && logTableRef.current) {
            observer = new ResizeObserver(measure);
            observer.observe(logTableRef.current);
        }
        window.addEventListener("resize", measure);
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timer);
            if (observer)
                observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [activePage]);
    const logYearOptions = useMemo(() => {
        const thisYear = new Date().getFullYear();
        const years = new Set([thisYear - 3, thisYear - 2, thisYear - 1, thisYear, thisYear + 1]);
        transactions.forEach((item) => {
            if (item.date)
                years.add(Number(item.date.slice(0, 4)));
        });
        years.add(Number(transactionMonth.split("-")[0]));
        years.add(Number(logYear));
        return [...years]
            .filter((y) => Number.isFinite(y))
            .sort((a, b) => b - a)
            .map(String);
    }, [transactions, transactionMonth, logYear]);
    const logScopeLabel = logSearchText
        ? `Kết quả cho “${logSearch.trim()}”`
        : logMode === "day"
            ? `Ngày ${formatDate(logDay)}`
            : logMode === "year"
                ? `Năm ${logYear}`
                : formatMonth(transactionMonth);
    const logTypeLabel = logTypes.length > 0
        ? logTypes.map((type) => typeLabels[type]).join(", ")
        : "";
    const monthlyTableTransactions = useMemo(() => {
        return transactions.filter((item) => item.date && item.date.startsWith(monthlyTableMonth));
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
                }
                else {
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
       SO SÁNH VỚI THÁNG TRƯỚC
    ======================================================= */
    const previousMonth = useMemo(() => getPreviousMonthKey(selectedMonth), [selectedMonth]);
    const previousMonthTransactions = useMemo(() => {
        return transactions.filter((item) => item.date && item.date.startsWith(previousMonth));
    }, [transactions, previousMonth]);
    const previousTotals = useMemo(() => {
        return calculateTotals(previousMonthTransactions);
    }, [previousMonthTransactions]);
    const hasPreviousMonthData = previousMonthTransactions.length > 0;
    const monthComparisons = {
        income: {
            diff: totals.income - previousTotals.income,
            ready: hasPreviousMonthData,
        },
        expense: {
            diff: totals.expense - previousTotals.expense,
            ready: hasPreviousMonthData,
        },
        adjustment: {
            diff: totals.adjustment - previousTotals.adjustment,
            ready: hasPreviousMonthData,
        },
        remaining: {
            diff: totals.remaining - previousTotals.remaining,
            ready: hasPreviousMonthData,
        },
    };
    /* =======================================================
       NGÂN SÁCH — ép trang vừa đúng 1 màn hình (không cần cuộn)
    ======================================================= */
    const budgetPageRef = useRef(null);
    useEffect(() => {
        if (activePage !== "budget")
            return undefined;
        const fit = () => {
            const element = budgetPageRef.current;
            if (!element)
                return;
            const top = element.getBoundingClientRect().top + window.scrollY;
            const available = window.innerHeight - top - 20;
            element.style.setProperty("--budget-page-h", `${Math.max(available, 400)}px`);
        };
        fit();
        const frame = requestAnimationFrame(fit);
        const timer = setTimeout(fit, 200);
        window.addEventListener("resize", fit);
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(timer);
            window.removeEventListener("resize", fit);
        };
    }, [activePage]);
    /* =======================================================
       NGÂN SÁCH
    ======================================================= */
    const currentBudget = budgets[selectedMonth] || {
        food: 0,
        rent: 0,
        other: 0,
    };
    const totalBudget = Number(currentBudget.food || 0) +
        Number(currentBudget.rent || 0) +
        Number(currentBudget.other || 0);
    const budgetShares = getBudgetShares(currentBudget);
    const budgetUsed = totals.expense;
    const budgetRemaining = totalBudget - budgetUsed;
    const budgetPercent = totalBudget > 0
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
        return data.reduce((max, item) => item.amount > max.amount ? item : max);
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
        if (!window.confirm(`Bạn có chắc muốn xóa ngân sách ${formatMonth(selectedMonth)}?`)) {
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
        }
        else {
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
        const linked = transactions.some((item) => String(item.accountId) === String(id) ||
            String(item.fromAccountId) === String(id) ||
            String(item.toAccountId) === String(id));
        if (linked) {
            alert("Không thể xóa tài khoản vì tài khoản này đang có giao dịch liên kết.");
            return;
        }
        if (!window.confirm("Bạn có chắc muốn xóa tài khoản?")) {
            return;
        }
        setAccounts((old) => old.filter((account) => account.id !== id));
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
            if (!transactionForm.fromAccountId ||
                !transactionForm.toAccountId) {
                alert("Vui lòng chọn tài khoản nguồn và tài khoản đích.");
                return;
            }
            if (transactionForm.fromAccountId ===
                transactionForm.toAccountId) {
                alert("Tài khoản nguồn và tài khoản đích phải khác nhau.");
                return;
            }
            const sourceAccount = getAccount(transactionForm.fromAccountId);
            if (sourceAccount &&
                getAccountBalance(sourceAccount) < amount) {
                const allow = window.confirm("Số tiền chuyển lớn hơn số dư hiện tại. Bạn vẫn muốn tiếp tục?");
                if (!allow)
                    return;
            }
            const transaction = {
                id: createId(),
                code: getNextTransactionCode(transactions, transactionForm.date),
                type: "transfer",
                date: transactionForm.date,
                description: transactionForm.description || "Chuyển tiền",
                amount,
                fromAccountId: transactionForm.fromAccountId,
                toAccountId: transactionForm.toAccountId,
            };
            setTransactions((old) => [...old, transaction]);
        }
        else {
            /* THU / CHI / ĐIỀU CHỈNH */
            if (!transactionForm.accountId) {
                alert("Vui lòng chọn tài khoản.");
                return;
            }
            const selectedAccountObject = getAccount(transactionForm.accountId);
            if (formType === "expense" &&
                selectedAccountObject &&
                getAccountBalance(selectedAccountObject) < amount) {
                const allow = window.confirm("Khoản chi lớn hơn số dư tài khoản. Bạn vẫn muốn tiếp tục?");
                if (!allow)
                    return;
            }
            const transaction = {
                id: createId(),
                code: getNextTransactionCode(transactions, transactionForm.date),
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
                        adjustmentDirection: transactionForm.adjustmentDirection,
                    }
                    : {}),
            };
            setTransactions((old) => [...old, transaction]);
        }
        setSelectedMonth(transactionForm.date.slice(0, 7));
        /* Nhật ký giao dịch cũng chuyển sang tháng của giao dịch vừa thêm
           để thấy ngay dòng mới */
        setTransactionMonth(transactionForm.date.slice(0, 7));
        setMonthlyTableMonth(transactionForm.date.slice(0, 7));
        setLogDay(transactionForm.date);
        setLogYear(transactionForm.date.slice(0, 4));
        /* Thông báo chuông: mã này trùng mã vừa cấp cho giao dịch (state chưa cập nhật) */
        addTxNotice({
            text: `${typeLabels[formType]} · ${formatMoney(amount)} · ${getNextTransactionCode(transactions, transactionForm.date)}`,
        });
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
        setTransactions((old) => old.filter((item) => item.id !== id));
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
        if (!editingTransaction)
            return;
        const amount = Math.abs(Number(editingTransaction.amount));
        if (!editingTransaction.date || !amount) {
            alert("Ngày và số tiền không được để trống.");
            return;
        }
        if (editingTransaction.type === "transfer") {
            if (!editingTransaction.fromAccountId ||
                !editingTransaction.toAccountId) {
                alert("Vui lòng chọn đủ hai tài khoản.");
                return;
            }
            if (editingTransaction.fromAccountId ===
                editingTransaction.toAccountId) {
                alert("Tài khoản nguồn và tài khoản đích phải khác nhau.");
                return;
            }
        }
        else if (!editingTransaction.accountId) {
            alert("Vui lòng chọn tài khoản.");
            return;
        }
        /* Mã ID gắn với ngày: đổi ngày thì cấp mã mới theo ngày mới */
        const original = transactions.find((item) => item.id === editingTransaction.id);
        let code = editingTransaction.code;
        if (!code || (original && original.date !== editingTransaction.date)) {
            code = getNextTransactionCode(transactions.filter((item) => item.id !== editingTransaction.id), editingTransaction.date, /^#L/.test(editingTransaction.code || "") ? "L" : "");
        }
        const updated = {
            ...editingTransaction,
            code,
            amount,
        };
        setTransactions((old) => old.map((item) => item.id === updated.id ? updated : item));
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
                    accountText = `${getAccountName(item.fromAccountId)} ${getAccountName(item.toAccountId)}`;
                }
                else {
                    accountText = getAccountName(item.accountId);
                }
                const categoryText = item.type === "expense"
                    ? categories[item.category]?.label || ""
                    : "";
                return `${item.description || ""} ${accountText} ${categoryText}`
                    .toLowerCase()
                    .includes(search);
            });
        }
        if (filters.type !== "all") {
            result = result.filter((item) => item.type === filters.type);
        }
        if (filters.category !== "all") {
            result = result.filter((item) => item.type === "expense" &&
                item.category === filters.category);
        }
        if (filters.accountId !== "all") {
            result = result.filter((item) => {
                if (item.type === "transfer") {
                    return (String(item.fromAccountId) ===
                        String(filters.accountId) ||
                        String(item.toAccountId) ===
                            String(filters.accountId));
                }
                return (String(item.accountId) ===
                    String(filters.accountId));
            });
        }
        if (filters.dateFrom) {
            result = result.filter((item) => item.date >= filters.dateFrom);
        }
        if (filters.dateTo) {
            result = result.filter((item) => item.date <= filters.dateTo);
        }
        if (filters.minAmount !== "") {
            result = result.filter((item) => Math.abs(Number(item.amount)) >=
                Number(filters.minAmount));
        }
        if (filters.maxAmount !== "") {
            result = result.filter((item) => Math.abs(Number(item.amount)) <=
                Number(filters.maxAmount));
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
    const filteredTotals = useMemo(() => calculateTotals(filteredTransactions), [filteredTransactions]);
    const filteredAverage = filteredTransactions.length > 0
        ? filteredTransactions.reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0) / filteredTransactions.length
        : 0;
    const filteredHighest = filteredTransactions.length > 0
        ? Math.max(...filteredTransactions.map((item) => Math.abs(Number(item.amount || 0))))
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
        const firstDate = new Date(selectedYear, selectedMonthNumber - 1, 1);
        const numberOfDays = new Date(selectedYear, selectedMonthNumber, 0).getDate();
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
        const date = `${selectedYear}-${pad(selectedMonthNumber)}-${pad(day)}`;
        const data = monthTransactions.filter((item) => item.date === date);
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
                return (String(item.fromAccountId) ===
                    String(viewAccountId) ||
                    String(item.toAccountId) ===
                        String(viewAccountId));
            }
            return (String(item.accountId) === String(viewAccountId));
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
            const dayTransactions = transactions.filter((item) => item.date === date);
            let income = 0;
            let expense = 0;
            let adjustment = 0;
            dayTransactions.forEach((item) => {
                const amount = Math.abs(Number(item.amount || 0));
                if (item.type === "income")
                    income += amount;
                if (item.type === "expense")
                    expense += amount;
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
        }
        else if (totalBudget > 0 && budgetPercent >= 80) {
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
        if (monthTransactions.length === 0) {
            items.push({
                id: `empty-month-${selectedMonth}`,
                type: "info",
                title: "Chưa có giao dịch",
                text: `${formatMonth(selectedMonth)} chưa có dữ liệu.`,
                actionPage: "transactions",
            });
        }
        return [...txNotices.slice(0, 5), ...items].slice(0, 8);
    }, [
        txNotices,
        totalBudget,
        budgetPercent,
        budgetUsed,
        accounts.length,
        monthTransactions,
        selectedMonth,
    ]);
    const unreadNotifications = useMemo(() => {
        return dashboardNotifications.filter((item) => !readNotificationIds.includes(item.id));
    }, [dashboardNotifications, readNotificationIds]);
    /* Còn giao dịch mới chưa đọc → chuông có 2 tai và nhấp nháy;
       đọc xong thì trở về chuông ban đầu */
    const hasNewTx = unreadNotifications.some((item) => String(item.id).startsWith("tx-"));
    function markNotificationRead(id) {
        setReadNotificationIds((old) => {
            if (old.includes(id))
                return old;
            const next = [...old, id].slice(-100);
            localStorage.setItem(READ_NOTIFICATION_KEY, JSON.stringify(next));
            return next;
        });
    }
    function markAllNotificationsRead() {
        setReadNotificationIds((old) => {
            const next = Array.from(new Set([...old, ...dashboardNotifications.map((item) => item.id)])).slice(-100);
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
        setShowNotifications(false);
    }, [activePage]);
    useEffect(() => {
        function handleOutsideNotificationClick(event) {
            if (showNotifications &&
                notificationRef.current &&
                !notificationRef.current.contains(event.target)) {
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
            if (mounted)
                setUserEmail("");
        });
        return () => {
            mounted = false;
        };
    }, []);
    async function handleLogout() {
        try {
            await supabase.auth.signOut();
        }
        catch (error) {
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
        }
        catch (error) {
            console.error(error);
            setPasswordMessage("Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại.");
            setPasswordMessageType("error");
        }
        finally {
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
                debts,
                savings,
                salaries,
                investCategories,
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
        }
        catch (error) {
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
        if (!file)
            return;
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
                const nextBudgets = data?.budgets &&
                    typeof data.budgets === "object" &&
                    !Array.isArray(data.budgets)
                    ? data.budgets
                    : null;
                if (!nextAccounts || !nextTransactions || !nextBudgets) {
                    setImportMessage("File không đúng định dạng sao lưu của Blue Finance.");
                    setImportMessageType("error");
                    return;
                }
                const confirmed = window.confirm("Nhập dữ liệu sẽ THAY THẾ toàn bộ tài khoản, giao dịch, ngân sách, khoản nợ và khoản tiết kiệm hiện tại bằng dữ liệu trong file. Bạn có chắc chắn muốn tiếp tục?");
                if (!confirmed)
                    return;
                setAccounts(nextAccounts);
                setTransactions(nextTransactions);
                setBudgets(nextBudgets);
                /* File sao lưu cũ chưa có 2 mục này: giữ nguyên dữ liệu hiện tại */
                if (Array.isArray(data?.debts))
                    setDebts(data.debts);
                if (Array.isArray(data?.savings))
                    setSavings(data.savings);
                if (Array.isArray(data?.salaries))
                    setSalaries(data.salaries);
                if (Array.isArray(data?.investCategories) && data.investCategories.length) {
                    setInvestCategories(data.investCategories);
                }
                setImportMessage("Nhập dữ liệu thành công.");
                setImportMessageType("success");
                successSound();
            }
            catch (error) {
                console.error(error);
                setImportMessage("Không thể đọc file. Vui lòng kiểm tra lại file JSON.");
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
            label: "Thống kê tháng",
            icon: Table2,
        },
        {
            id: "reports",
            label: "Báo cáo theo tháng",
            icon: BarChart3,
        },
        {
            id: "salary",
            label: "Lương",
            icon: Banknote,
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
            id: "debts",
            label: "Khoản Vay / Nợ",
            icon: CreditCard,
        },
        {
            id: "savings",
            label: "Đầu tư",
            icon: TrendingUp,
        },
        {
            id: "profile",
            label: "Tài khoản & bảo mật",
            icon: UserRound,
        },
    ];
    const shortLabels = {
        dashboard: "Tổng quan",
        transactions: "Giao dịch",
        monthlyTable: "Thống kê",
        reports: "Báo cáo",
        salary: "Lương",
        budget: "Ngân sách",
        accounts: "Tài khoản",
        debts: "Khoản Vay / Nợ",
        savings: "Đầu tư",
        profile: "Bảo mật",
    };
    /* Hai chức năng nằm ở thanh điều hướng trên (chỉ chữ, không logo).
       Trên điện thoại thanh trên bị ẩn nên hai nút này vẫn có ở thanh dưới. */
    const topbarPageIds = ["budget", "accounts"];
    const topbarPages = pages.filter((page) => topbarPageIds.includes(page.id));
    /* Nút icon trên thanh trái (dùng cho cả nhóm giữa và nhóm dưới cùng) */
    function renderRailButton(page) {
        const Icon = page.icon;
        return (<button key={page.id} type="button" aria-label={page.label} onMouseEnter={(event) => showRailTip(event, page.label)} onMouseLeave={hideRailTip} onFocus={(event) => showRailTip(event, page.label)} onBlur={hideRailTip} className={`rail-button ${activePage === page.id ? "active" : ""} ${topbarPageIds.includes(page.id) ? "moved-to-topbar" : ""}`} onClick={() => {
                setActivePage(page.id);
                playSound();
            }}>
        <Icon size={20}/>
      </button>);
    }
    const pageTitle = pages.find((item) => item.id === activePage)?.label ||
        "Blue Finance";
    /* Ô "Thêm giao dịch": số dư sau giao dịch (xem trước) và các lựa chọn nhanh */
    const quickTypes = [
        { id: "income", label: "Đầu vào", icon: ArrowUpCircle },
        { id: "expense", label: "Đầu ra", icon: ArrowDownCircle },
        { id: "adjustment", label: "Tip / Âm", icon: SlidersHorizontal },
    ];
    const quickAmounts = [50000, 100000, 200000, 500000];
    const quickAmount = Math.abs(Number(transactionForm.amount)) || 0;
    const quickAccount = transactionForm.accountId
        ? getAccount(transactionForm.accountId)
        : null;
    const quickBalance = quickAccount ? getAccountBalance(quickAccount) : 0;
    const quickSign = formType === "income" ||
        (formType === "adjustment" &&
            transactionForm.adjustmentDirection === "plus")
        ? 1
        : -1;
    const quickAfter = quickBalance + quickSign * quickAmount;
    const quickWords = vietnameseAmountInWords(quickAmount);
    const quickCategoryLabel = formType === "expense"
        ? { food: "Tiền ăn", rent: "Tiền trọ", other: "Chi khác" }[transactionForm.category] || "Chi tiêu"
        : formType === "income"
            ? "Đầu vào"
            : transactionForm.adjustmentDirection === "plus"
                ? "Tip / Cộng"
                : "Âm / Trừ";
    const quickSuggestions = formType === "income"
        ? ["Tiền lương", "Bố mẹ gửi", "Được cho", "Hoàn tiền"]
        : formType === "adjustment"
            ? transactionForm.adjustmentDirection === "plus"
                ? ["Được tip", "Điều chỉnh số dư"]
                : ["Điều chỉnh số dư", "Sai số"]
            : transactionForm.category === "rent"
                ? ["Tiền trọ", "Tiền điện", "Tiền nước", "Internet"]
                : transactionForm.category === "other"
                    ? ["Đổ xăng", "Grab", "Mua sắm", "Giải trí"]
                    : ["Ăn sáng", "Ăn trưa", "Ăn tối", "Cà phê"];
    const quickMissing = [
        !quickAmount && "số tiền",
        !quickAccount && "tài khoản",
        !transactionForm.date && "ngày",
    ].filter(Boolean);
    /* Tài khoản mới thêm gần nhất (tài khoản được thêm sau cùng nằm cuối danh sách) */
    const quickAccountsSorted = [...accounts].reverse();
    let quickVisible = quickAccountsSorted.slice(0, 2);
    if (quickAccount &&
        !quickVisible.some((item) => String(item.id) === String(quickAccount.id))) {
        quickVisible = [quickVisible[0], quickAccount].filter(Boolean);
    }
    const renderQuickAccount = (account) => {
        const accConfig = accountTypes[account.type] || accountTypes.bank;
        const AccIcon = accConfig.icon;
        const on = String(transactionForm.accountId) === String(account.id);
        return (<button key={account.id} type="button" role="radio" aria-checked={on} className={`qa-acc ${account.type || "bank"} ${on ? "active" : ""}`} onClick={() => {
                setTransactionForm({
                    ...transactionForm,
                    accountId: String(account.id),
                });
                playSound();
            }}>
        <i>
          <AccIcon size={17}/>
        </i>

        <span>
          <b>{account.name}</b>
          <small>{formatMoney(getAccountBalance(account))}</small>
        </span>

        {on && <CheckCircle2 size={16} className="qa-acc-check"/>}
      </button>);
    };
    const quickSubmitLabel = {
        expense: "Thêm khoản chi",
        income: "Thêm khoản thu",
        adjustment: "Thêm Tip / Âm",
    }[formType] || "Thêm giao dịch";
    /* =======================================================
       MÀN HÌNH CHỜ ĐỒNG BỘ DỮ LIỆU GIA ĐÌNH
    ======================================================= */
    if (!familySyncReady) {
        const isError = familySyncStatus === "error";
        return (<div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background: "#f5f7fb",
                fontFamily: "Arial, sans-serif",
            }}>
        <div style={{
                width: "100%",
                maxWidth: "420px",
                padding: "32px 24px",
                borderRadius: "20px",
                background: "#ffffff",
                textAlign: "center",
                boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
            }}>
          <div style={{
                width: "58px",
                height: "58px",
                margin: "0 auto 18px",
                borderRadius: "18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isError ? "#fee2e2" : "#e0f2fe",
                color: isError ? "#dc2626" : "#0284c7",
                fontSize: "27px",
            }}>
            {isError ? "!" : "↻"}
          </div>

          <h2 style={{
                margin: "0 0 10px",
                color: "#172033",
                fontSize: "21px",
            }}>
            {isError
                ? "Không thể đồng bộ dữ liệu"
                : "Đang tải dữ liệu gia đình"}
          </h2>

          <p style={{
                margin: "0 0 22px",
                color: "#64748b",
                fontSize: "14px",
                lineHeight: 1.7,
            }}>
            {isError
                ? familySyncError ||
                    "Đã xảy ra lỗi khi kết nối máy chủ."
                : "Vui lòng chờ trong giây lát. Hệ thống đang kết nối và tải dữ liệu tài chính của gia đình."}
          </p>

          {isError ? (<button type="button" onClick={() => window.location.reload()} style={{
                    border: "none",
                    borderRadius: "10px",
                    padding: "12px 24px",
                    background: "#2563eb",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: "pointer",
                }}>
              Thử kết nối lại
            </button>) : (<div style={{
                    width: "28px",
                    height: "28px",
                    margin: "0 auto",
                    border: "3px solid #dbeafe",
                    borderTopColor: "#2563eb",
                    borderRadius: "50%",
                    animation: "familySyncSpin 0.8s linear infinite",
                }}/>)}
        </div>

        <style>
          {`
            @keyframes familySyncSpin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>);
    }
    return (<>
      <style>{styles}</style>

      <div className={`app theme-v14 light-mode ${isDark ? "is-dark" : ""}`}>
        {/* ===================================================
            THANH ĐIỀU HƯỚNG TRÊN (TOPBAR)
        =================================================== */}

        <nav className="topbar">
          <div className="topbar-brand">
            <div className="topbar-logo">
              <Wallet size={23} strokeWidth={2.3}/>
            </div>

            <div className="topbar-brand-text">
              <strong>Finance</strong>
            </div>
          </div>

          <div className="topbar-nav" role="tablist">
            {topbarPages.map((page) => (<button key={page.id} type="button" role="tab" aria-selected={activePage === page.id} className={`topbar-pill ${activePage === page.id ? "active" : ""}`} onClick={() => {
                setActivePage(page.id);
                playSound();
            }}>
                {shortLabels[page.id] || page.label}
              </button>))}
          </div>

          <div className="topbar-right">
                <div className="header-actions">
                  {activePage === "dashboard" && (<div className="dashboard-search">
                    <Search size={18}/>

                    <input value={dashboardSearch} placeholder="Tìm kiếm giao dịch..." onChange={(event) => setDashboardSearch(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter") {
                    playSound();
                }
            }}/>
                  </div>)}

                  <div className="header-notification-wrap" ref={notificationRef}>
                    <button type="button" className={`icon-button ${showNotifications ? "active" : ""} ${hasNewTx ? "ringing" : ""}`} title="Thông báo" onClick={() => {
            setShowNotifications((old) => !old);
            playSound(620, 0.05);
        }}>
                      {hasNewTx ? (<RingingBell size={30}/>) : (<Bell size={19}/>)}

                      {unreadNotifications.length > 0 && (<span className="notification-badge">
                          {unreadNotifications.length}
                        </span>)}
                    </button>

                    {showNotifications && (<div className="notification-dropdown">
                        <div className="notification-header">
                          <div>
                            <strong>Thông báo</strong>
                            <span>
                              {unreadNotifications.length > 0
                ? `${unreadNotifications.length} mục chưa đọc`
                : "Không có thông báo mới"}
                            </span>
                          </div>

                          {unreadNotifications.length > 0 ? (<button type="button" className="notification-read-all" onClick={(event) => {
                    event.stopPropagation();
                    markAllNotificationsRead();
                    setShowNotifications(false);
                    playSound(700, 0.05);
                }}>
                              Đọc tất cả
                            </button>) : (<Bell size={17}/>)}
                        </div>

                        {unreadNotifications.length === 0 ? (<div className="notification-empty">
                            Bạn đã xem hết thông báo.
                          </div>) : (unreadNotifications.map((item) => (<button type="button" key={item.id} className={`notification-item ${item.type}`} onClick={() => openNotification(item)}>
                              <div className="notification-dot"/>

                              <div>
                                <strong>{item.title}</strong>
                                <span>{item.text}</span>
                              </div>
                            </button>)))}
                      </div>)}
                  </div>

                </div>
            <div className="topbar-user" title={userEmail || ""}>
              <div className="topbar-avatar">
                <UserRound size={18}/>
              </div>

              <div className="topbar-user-text">
                <strong>Tài khoản</strong>
                <span>{userEmail || "Chưa xác định email"}</span>
              </div>
            </div>
          </div>
        </nav>

        {/* ===================================================
            THANH ĐIỀU HƯỚNG TRÁI (RAIL ICON)
        =================================================== */}

        <aside className="rail">
          {/* Nhóm trên cùng: Ban ngày / Ban đêm */}
          <div className="rail-pill rail-top">
            {[
            { mode: "light", label: "Ban ngày", icon: Sun },
            { mode: "dark", label: "Ban đêm", icon: Moon },
        ].map((item) => {
            const ModeIcon = item.icon;
            const selected = (item.mode === "dark") === isDark;
            return (<button key={item.mode} type="button" aria-label={item.label} aria-pressed={selected} onMouseEnter={(event) => showRailTip(event, item.label)} onMouseLeave={hideRailTip} onFocus={(event) => showRailTip(event, item.label)} onBlur={hideRailTip} className={`rail-button ${selected ? "active" : ""}`} onClick={() => {
                    setIsDark(item.mode === "dark");
                    playSound(item.mode === "dark" ? 440 : 640, 0.06);
                }}>
                  <ModeIcon size={20}/>
                </button>);
        })}
          </div>

          <div className="rail-pill">
            {pages
            .filter((page) => page.id !== "profile")
            .map((page) => renderRailButton(page))}
          </div>

          <div className="rail-spacer"/>

          {/* Nhóm dưới cùng: Tài khoản & bảo mật + Đăng xuất */}
          <div className="rail-pill rail-bottom">
            {pages
            .filter((page) => page.id === "profile")
            .map((page) => renderRailButton(page))}

            <button type="button" aria-label="Đăng xuất" onMouseEnter={(event) => showRailTip(event, "Đăng xuất")} onMouseLeave={hideRailTip} onFocus={(event) => showRailTip(event, "Đăng xuất")} onBlur={hideRailTip} className="rail-button rail-logout" onClick={() => {
            handleLogout();
            playSound(420, 0.06);
        }}>
              <LogOut size={20}/>
            </button>
          </div>
        </aside>

        {railTip && (<div className={`rail-tooltip ${railTip.placement}`} style={{ top: railTip.top, left: railTip.left }} role="tooltip">
            {railTip.label}
          </div>)}

        <div className="shell">

        {/* ===================================================
            MAIN
        =================================================== */}

        <main className="main">
          <div className="container">
            {/* HEADER */}

            <header className="header">
              <div className="header-left">
                <div className="header-title-row">
                  <h1 key={pageTitle} className="fn-title-in">{pageTitle}</h1>

                </div>
              </div>

              <div className="eyebrow header-greeting">
                <GreetingIcon size={17}/>

                {greeting.text}
              </div>

            </header>

            <div className="page-stage" key={activePage} ref={pageStageRef}>

            {/* =================================================
            TỔNG QUAN
        ================================================= */}

            {activePage === "dashboard" && (<>
                <div className="dashboard-top-row">
                <div className="dashboard-top-left">
                <div className="summary-board">
                <div className="summary-board-head">
                  <MonthBadge month={selectedMonth} label="Đang xem" live/>
                </div>
                <div className="summary-grid dashboard-summary-grid">
                  <SummaryCard icon={ArrowUpCircle} title="TỔNG ĐẦU VÀO" value={totals.income} className="income" compare={monthComparisons.income}/>

                  <SummaryCard icon={ArrowDownCircle} title="CHI TIÊU THÁNG" value={totals.expense} className="expense" compare={monthComparisons.expense}/>

                  <SummaryCard icon={Gift} title="TIP" value={totals.adjustment} className="adjustment" compare={monthComparisons.adjustment}/>

                  <SummaryCard icon={CircleDollarSign} title={totals.remaining >= 0
                ? "DƯ TRONG THÁNG"
                : "ÂM TRONG THÁNG"} value={Math.abs(totals.remaining)} className={totals.remaining >= 0 ? "positive" : "expense"} compare={monthComparisons.remaining}/>
                </div>
                </div>

                  <div className="panel dashboard-recent-panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <h2>Giao dịch gần đây</h2>
                        <span>
                          {dashboardSearch.trim()
                ? `Kết quả tìm kiếm: "${dashboardSearch.trim()}"`
                : `5 giao dịch mới nhất trong ${formatMonth(selectedMonth)}`}
                        </span>
                      </div>

                      <button type="button" className="text-button" onClick={() => {
                setActivePage("transactions");
                playSound();
            }}>
                        Xem tất cả →
                      </button>
                    </div>

                    <DashboardRecentTransactions transactions={monthTransactions} getAccountName={getAccountName} search={dashboardSearch}/>
                  </div>
                </div>

                <div className="panel dashboard-allocation-panel dashboard-top-donut">
                  <WeeklySpendingChart transactions={transactions} selectedMonth={selectedMonth} availableMonths={availableMonths} onSelectMonth={(monthKey) => {
                setSelectedMonth(monthKey);
                playSound();
            }}/>
                </div>
                </div>

                <div className="dashboard-add-row">
                <div id="dashboard-quick-add">
                <div className="transaction-page-add">
                  <section className="qa-card" data-type={formType}>
                    <form className="qa-form qa2" onSubmit={addTransaction}>
                      {/* Đầu thẻ: tiêu đề + chọn loại giao dịch */}
                      <div className="qa-top">
                        <div className="qa-head">
                          <i className="qa-head-ico">
                            <Plus size={20} strokeWidth={2.4}/>
                          </i>

                          <div>
                            <h2>Thêm giao dịch</h2>
                            <span>Mọi giao dịch đều liên kết tài khoản</span>
                          </div>
                        </div>

                        <div className="qa-seg" role="tablist" style={{
                "--qa-i": Math.max(0, quickTypes.findIndex((item) => item.id === formType)),
            }}>
                          {quickTypes.map((item) => {
                const TypeIcon = item.icon;
                return (<button key={item.id} type="button" role="tab" aria-selected={formType === item.id} className={`qa-seg-btn ${formType === item.id ? "active" : ""}`} onClick={() => {
                        setFormType(item.id);
                        playSound();
                    }}>
                                <TypeIcon size={17}/>
                                {item.label}
                              </button>);
            })}
                        </div>
                      </div>

                      <div className="qa-body">
                          {formType === "expense" && (<div className="qa-field qa-swap" key="expense">
                              <span className="qa-label">Danh mục</span>

                              <div className="qa-options">
                                {[
                    { id: "food", label: "Tiền ăn", icon: Utensils },
                    { id: "rent", label: "Tiền trọ", icon: House },
                    { id: "other", label: "Chi khác", icon: ShoppingBag },
                ].map((item) => {
                    const CategoryIcon = item.icon;
                    const on = transactionForm.category === item.id;
                    return (<button key={item.id} type="button" aria-pressed={on} className={`qa-option ${on ? "active" : ""}`} onClick={() => {
                            setTransactionForm({
                                ...transactionForm,
                                category: item.id,
                            });
                            playSound();
                        }}>
                                      <CategoryIcon size={16}/>
                                      {item.label}
                                    </button>);
                })}
                              </div>
                            </div>)}

                          {formType === "adjustment" && (<div className="qa-field qa-swap" key="adjustment">
                              <span className="qa-label">Chiều điều chỉnh</span>

                              <div className="qa-options">
                                {[
                    { id: "plus", label: "Tip / Cộng (+)", icon: ArrowUpRight },
                    { id: "minus", label: "Âm / Trừ (\u2212)", icon: ArrowDownRight },
                ].map((item) => {
                    const DirectionIcon = item.icon;
                    const on = transactionForm.adjustmentDirection === item.id;
                    return (<button key={item.id} type="button" aria-pressed={on} className={`qa-option ${on ? "active" : ""}`} onClick={() => {
                            setTransactionForm({
                                ...transactionForm,
                                adjustmentDirection: item.id,
                            });
                            playSound();
                        }}>
                                      <DirectionIcon size={16}/>
                                      {item.label}
                                    </button>);
                })}
                              </div>
                            </div>)}
                        <div className="qa-fields">
                          <div className="qa-field">
                            <span className="qa-label">Ngày</span>

                            <DatePicker clearable customizable value={transactionForm.date} onChange={(event) => setTransactionForm({
                ...transactionForm,
                date: event.target.value,
            })}/>
                          </div>

                          <label className="qa-field">
                            <span className="qa-label">Số tiền</span>

                            <MoneyInput className="qa-money" placeholder="0" aria-label="Số tiền" value={transactionForm.amount} onValueChange={(next) => setTransactionForm((old) => ({
                ...old,
                amount: next,
            }))}/>
                          </label>

                          <label className="qa-field qa-wide">
                            <span className="qa-label">Nội dung</span>

                            <span className="qa-input-wrap">
                              <Pencil size={16}/>

                              <input className="qa-input" placeholder={formType === "expense"
                ? "Ví dụ: Ăn trưa / Đổ xăng..."
                : formType === "income"
                    ? "Ví dụ: Bố gửi / Tiền lương..."
                    : "Ví dụ: Được tip / Điều chỉnh..."} value={transactionForm.description} onChange={(event) => setTransactionForm({
                ...transactionForm,
                description: event.target.value,
            })}/>
                            </span>
                          </label>
                        </div>

                        <div className="qa-field">
                          <span className="qa-label">Tài khoản</span>

                          <div className="qa-acc-row" role="radiogroup" aria-label="Tài khoản">
                            {accounts.length === 0 && (<div className="qa-empty">
                                Chưa có tài khoản. Hãy tạo ở mục Tài khoản.
                              </div>)}

                            {quickVisible.map((account) => renderQuickAccount(account))}

                            {accounts.length > 2 && (<AccountMenuButton accounts={quickAccountsSorted} selectedId={transactionForm.accountId} getBalance={getAccountBalance} onSelect={(account) => {
                    setTransactionForm({
                        ...transactionForm,
                        accountId: String(account.id),
                    });
                    playSound();
                }}/>)}
                          </div>
                        </div>
                      </div>

                      {/* Chân thẻ: tóm tắt giao dịch + nút thêm */}
                      <div className="qa-foot">
                        {!quickMissing.length && (<div className="qa-summary ready" aria-live="polite">
                            <CheckCircle2 size={16}/>
                            <span>
                              <b>
                                {quickSign > 0 ? "+" : "\u2212"}
                                {formatMoney(quickAmount)}
                              </b>{" "}
                              · {quickCategoryLabel} · {quickAccount.name} ·{" "}
                              {formatDate(transactionForm.date)}
                            </span>
                          </div>)}

                        <button className="qa-submit">
                          <Plus size={19} strokeWidth={2.4}/>
                          {quickSubmitLabel}
                        </button>
                      </div>
                    </form>
                  </section>

                </div>

                </div>
                  <div className="panel dashboard-quick-panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <div className="panel-kicker">TỔNG QUAN</div>
                        <h2>Thao tác nhanh</h2>
                        <span>Chuyển đến chức năng bạn cần</span>
                      </div>
                      <Plus size={22}/>
                    </div>

                    <div className="dashboard-quick-actions">
                      <button type="button" onClick={() => {
                document
                    .getElementById("dashboard-quick-add")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                playSound();
            }}>
                        <ArrowDownCircle size={19}/>
                        <span>Thêm giao dịch</span>
                        <small>Thu / chi / tip</small>
                      </button>
                      <button type="button" onClick={() => { setActivePage("reports"); playSound(); }}>
                        <BarChart3 size={19}/>
                        <span>Xem báo cáo</span>
                        <small>Biểu đồ và phân bổ chi tiêu</small>
                      </button>
                      <button type="button" onClick={() => { setActivePage("monthlyTable"); playSound(); }}>
                        <Table2 size={19}/>
                        <span>Thống kê tháng</span>
                        <small>Tổng hợp từng tháng</small>
                      </button>
                    </div>
                  </div>
                </div>

                <section className="dashboard-info-row">
                  <div className="panel dashboard-budget-panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <div className="panel-kicker">NGÂN SÁCH</div>
                        <h2>Tình hình ngân sách</h2>
                        <MonthBadge month={selectedMonth} compact/>
                      </div>
                      <Target size={22}/>
                    </div>

                    {totalBudget > 0 ? (<>
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
                          <span style={{
                    width: `${Math.min(budgetPercent, 100)}%`,
                }} className={budgetPercent >= 100 ? "danger" : budgetPercent >= 80 ? "warning" : "safe"}/>
                        </div>

                        <div className="dashboard-budget-mini-grid">
                          <BudgetMini label="Ăn uống" spent={totals.food} budget={currentBudget.food}/>
                          <BudgetMini label="Tiền trọ" spent={totals.rent} budget={currentBudget.rent}/>
                          <BudgetMini label="Chi khác" spent={totals.other} budget={currentBudget.other}/>
                        </div>
                      </>) : (<Empty>Chưa thiết lập ngân sách cho tháng này.</Empty>)}

                    <button type="button" className="secondary-button dashboard-wide-button" onClick={() => {
                setActivePage("budget");
                playSound();
            }}>
                      <Target size={17}/>
                      Xem ngân sách tháng
                    </button>
                  </div>

                  <div className="panel dashboard-assets-panel">
                    <div className="dashboard-panel-heading compact">
                      <div>
                        <div className="panel-kicker">TÀI SẢN</div>
                        <h2>Phân bổ số dư</h2>
                        <span>{accounts.length} tài khoản đang theo dõi</span>
                      </div>
                      <Wallet size={22}/>
                    </div>

                    <DashboardAccountBalances accounts={accounts} getAccountBalance={getAccountBalance}/>

                    <button type="button" className="secondary-button dashboard-wide-button" onClick={() => {
                setActivePage("accounts");
                playSound();
            }}>
                      <Wallet size={17}/>
                      Quản lý tài khoản
                    </button>
                  </div>
                </section>

                <div className="dashboard-note">
                  <ShieldCheck size={18}/>
                  <span>Biểu đồ chi tiết, phân bổ chi tiêu và biến động tiền vào/ra đã được chuyển sang <strong>Báo cáo theo tháng</strong> để phần Tổng quan gọn và dễ theo dõi hơn.</span>
                  <button type="button" onClick={() => { setActivePage("reports"); playSound(); }}>Xem báo cáo →</button>
                </div>
              </>)}

            {/* =================================================
            NHẬT KÝ GIAO DỊCH
        ================================================= */}

            {activePage === "transactions" && (<>
                <section className="panel log-page" ref={logPageRef}>
                  <div className="log-filter">
                    <div className="log-filter-left">
                      <div className="log-filter-modes" role="tablist" aria-label="Cách xem nhật ký">
                        {[
                ["day", "Theo ngày"],
                ["month", "Theo tháng"],
                ["year", "Theo năm"],
            ].map(([mode, label]) => (<button key={mode} type="button" role="tab" aria-selected={logMode === mode} className={logMode === mode ? "active" : ""} onClick={() => {
                    setLogMode(mode);
                    setEditingTransaction(null);
                    playSound();
                }}>
                            {label}
                          </button>))}
                      </div>

                      <div className="log-filter-types" aria-label="Lọc theo loại">
                        <button type="button" className={`log-type-chip all ${logTypes.length === 0 ? "active" : ""}`} onClick={() => {
                setLogTypes([]);
                playSound();
            }}>
                          Tất cả
                        </button>

                        {logTypeKeys.map((type) => {
                const TypeIcon = typeIcons[type];
                const on = logTypes.includes(type);
                return (<button key={type} type="button" aria-pressed={on} className={`log-type-chip ${type} ${on ? "active" : ""}`} onClick={() => {
                        setLogTypes((old) => old.includes(type)
                            ? old.filter((item) => item !== type)
                            : [...old, type]);
                        playSound();
                    }}>
                              <TypeIcon size={14} strokeWidth={2.3}/>

                              {typeLabels[type]}
                            </button>);
            })}
                      </div>
                    </div>

                    <div className={`log-filter-right ${logSearchText ? "searching" : ""}`}>
                      <label className="log-search">
                        <Search size={16}/>

                        <input value={logSearch} placeholder="Tìm kiếm giao dịch..." onChange={(event) => {
                setLogSearch(event.target.value);
                setEditingTransaction(null);
            }}/>

                        {logSearch && (<button type="button" aria-label="Xoá tìm kiếm" onClick={() => {
                    setLogSearch("");
                    playSound();
                }}>
                            <X size={14}/>
                          </button>)}
                      </label>

                      <div className="log-filter-picker">
                        {logMode === "day" && (<DatePicker clearable className="page-month-select" value={logDay} onChange={(event) => {
                    if (!event.target.value)
                        return;
                    setLogDay(event.target.value);
                    setEditingTransaction(null);
                }}/>)}

                        {logMode === "month" && (<PeriodPicker mode="month" value={transactionMonth} monthsWithData={logMonthsWithData} yearsWithData={logYearsWithData} onChange={(value) => {
                    setTransactionMonth(value);
                    setEditingTransaction(null);
                    playSound();
                }}/>)}

                        {logMode === "year" && (<PeriodPicker mode="year" value={logYear} monthsWithData={logMonthsWithData} yearsWithData={logYearsWithData} onChange={(value) => {
                    setLogYear(value);
                    setEditingTransaction(null);
                    playSound();
                }}/>)}
                      </div>
                    </div>
                  </div>

                  <div className="log-scope">
                    <strong>{logScopeLabel}</strong>

                    <span>• {logSorted.length} giao dịch</span>

                    {logTypeLabel && <span>• {logTypeLabel}</span>}
                  </div>

                  <div className="log-table" ref={logTableRef}>
                    <TransactionTable data={logPageData} getAccountName={getAccountName} onEdit={startEdit} onDelete={deleteTransaction}/>
                  </div>

                  <LogPager page={logPageSafe} pageCount={logPageCount} total={logSorted.length} from={logSorted.length ? logPageStart + 1 : 0} to={Math.min(logPageStart + logPageSize, logSorted.length)} onChange={(next) => {
                setLogPage(next);
                playSound();
            }}/>
                </section>
              </>)}

            {/* =================================================
            THỐNG KÊ THÁNG
        ================================================= */}

            {activePage === "monthlyTable" && (<MonthlyStatistics transactions={transactions} month={monthlyTableMonth} onMonthChange={(value) => {
                setMonthlyTableMonth(value);
                playSound();
            }} calculateTotals={calculateTotals}/>)}

            {/* =================================================
            LỊCH
        ================================================= */}

            {activePage === "calendar" && (<section className="panel">
                <PanelTitle title={`Lịch tài chính ${formatMonth(selectedMonth)}`} subtitle={`Tổng chi: ${formatMoney(totals.expense)}`}/>

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
            ].map((day) => (<div key={day}>
                        {day}
                      </div>))}
                  </div>

                  <div className="calendar-grid">
                    {calendarCells.map((day, index) => {
                if (!day) {
                    return (<div className="calendar-empty" key={`empty-${index}`}/>);
                }
                const result = dailyTotals(day);
                const date = `${selectedYear}-${pad(selectedMonthNumber)}-${pad(day)}`;
                const today = date === todayString();
                return (<div className={`calendar-day ${today
                        ? "today"
                        : ""}`} key={date}>
                            <div className="calendar-day-number">
                              <strong>
                                {day}
                              </strong>

                              {today && (<span>
                                  HÔM NAY
                                </span>)}
                            </div>

                            {result.income >
                        0 && (<span className="calendar-income">
                                +{" "}
                                {formatMoney(result.income)}
                              </span>)}

                            {result.expense >
                        0 && (<span className="calendar-expense">
                                -{" "}
                                {formatMoney(result.expense)}
                              </span>)}

                            {result.adjustment !==
                        0 && (<span className="calendar-adjustment">
                                Tip/Âm:{" "}
                                {formatMoney(result.adjustment)}
                              </span>)}
                          </div>);
            })}
                  </div>
                </div>
              </section>)}

            {/* =================================================
            BÁO CÁO
        ================================================= */}

            {activePage === "reports" && (<MonthlyReportPage availableMonths={availableMonths} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} transactions={transactions} totals={totals} previousTotals={previousTotals} hasPreviousMonthData={hasPreviousMonthData} previousMonth={previousMonth} flowData={dashboardFlowData} monthTransactions={monthTransactions} calculateTotals={calculateTotals} getAccountName={getAccountName} onEdit={startEdit} onDelete={deleteTransaction} playSound={playSound}/>)}

            {/* =================================================
            NGÂN SÁCH
        ================================================= */}

            {activePage === "budget" && (<div className="budget-page" ref={budgetPageRef}>
                <BudgetHero total={totalBudget} used={budgetUsed} remaining={budgetRemaining} percent={budgetPercent} shares={budgetShares}/>

                <div className="dashboard-grid">
                  <section className="panel">
                    <PanelTitle title="Thiết lập ngân sách" subtitle={<BudgetMonthPicker month={selectedMonth} budgets={budgets} onChange={(value) => {
                    setSelectedMonth(value);
                    playSound();
                }}/>}/>

                    <form className="form" onSubmit={saveBudget}>
                      <FormField label="Ngân sách tiền ăn">
                        <MoneyInput value={budgetForm.food} onValueChange={(next) => setBudgetForm((old) => ({ ...old, food: next }))}/>
                      </FormField>

                      <FormField label="Ngân sách tiền trọ">
                        <MoneyInput value={budgetForm.rent} onValueChange={(next) => setBudgetForm((old) => ({ ...old, rent: next }))}/>
                      </FormField>

                      <FormField label="Ngân sách chi khác">
                        <MoneyInput value={budgetForm.other} onValueChange={(next) => setBudgetForm((old) => ({ ...old, other: next }))}/>
                      </FormField>

                      <button className="primary-button">
                        <Save size={18}/>

                        LƯU NGÂN SÁCH
                      </button>

                      {totalBudget > 0 && (<button type="button" className="danger-button" onClick={deleteBudget}>
                          <Trash2 size={18}/>

                          XÓA NGÂN SÁCH
                        </button>)}
                    </form>
                  </section>

                  <section className="panel">
                    <PanelTitle title="Theo dõi ngân sách"/>

                    <BudgetItem title="Tiền ăn" tone="food" share={budgetShares.food} spent={totals.food} budget={currentBudget.food} percent={categoryBudgetPercent("food")}/>

                    <BudgetItem title="Tiền trọ" tone="rent" share={budgetShares.rent} spent={totals.rent} budget={currentBudget.rent} percent={categoryBudgetPercent("rent")}/>

                    <BudgetItem title="Chi khác" tone="other" share={budgetShares.other} spent={totals.other} budget={currentBudget.other} percent={categoryBudgetPercent("other")}/>
                  </section>
                </div>
              </div>)}

            {/* =================================================
            TÀI KHOẢN & BẢO MẬT
        ================================================= */}

            {activePage === "profile" && (<>
                <div className="profile-summary-grid">
                  <section className="profile-identity-card">
                    <div className="profile-avatar">
                      <UserRound size={30}/>
                    </div>

                    <div>
                      <span>TÀI KHOẢN ĐĂNG NHẬP</span>
                      <h2>{userEmail || "Chưa xác định"}</h2>
                      <p>Tài khoản đang sử dụng Blue Finance</p>
                    </div>
                  </section>

                  <section className="profile-security-card">
                    <ShieldCheck size={26}/>
                    <div>
                      <strong>Bảo mật tài khoản</strong>
                      <span>Đăng nhập bằng email và mật khẩu</span>
                    </div>
                  </section>
                </div>

                <div className="profile-page-grid">
                  <section className="panel">
                    <PanelTitle title="Thông tin tài khoản" subtitle="Thông tin đăng nhập hiện tại"/>

                    <div className="profile-info-list">
                      <div className="profile-info-row">
                        <div className="profile-info-icon">
                          <Mail size={18}/>
                        </div>
                        <div>
                          <span>Email đăng nhập</span>
                          <strong>{userEmail || "Chưa xác định"}</strong>
                        </div>
                      </div>

                      <div className="profile-info-row">
                        <div className="profile-info-icon">
                          <ShieldCheck size={18}/>
                        </div>
                        <div>
                          <span>Trạng thái</span>
                          <strong className="positive">Đang đăng nhập</strong>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="panel">
                    <PanelTitle title="Đổi mật khẩu" subtitle="Cập nhật mật khẩu đăng nhập"/>

                    <form className="form" onSubmit={handleChangePassword}>
                      <FormField label="Mật khẩu mới">
                        <input type="password" minLength="8" placeholder="Nhập mật khẩu mới" value={newPassword} onChange={(event) => setNewPassword(event.target.value)}/>
                      </FormField>

                      <FormField label="Xác nhận mật khẩu mới">
                        <input type="password" minLength="8" placeholder="Nhập lại mật khẩu mới" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)}/>
                      </FormField>

                      <button type="submit" className="primary-button" disabled={passwordSaving}>
                        <KeyRound size={18}/>
                        {passwordSaving ? "ĐANG CẬP NHẬT..." : "ĐỔI MẬT KHẨU"}
                      </button>

                      {passwordMessage && (<div className={`profile-message ${passwordMessageType}`}>
                          {passwordMessageType === "success" ? (<CheckCircle2 size={17}/>) : (<AlertTriangle size={17}/>)}
                          <span>{passwordMessage}</span>
                        </div>)}
                    </form>
                  </section>

                  <section className="panel profile-backup-section">
                    <PanelTitle title="Sao lưu dữ liệu" subtitle="Xuất toàn bộ dữ liệu ra file JSON để lưu trữ, hoặc nhập lại từ file đã sao lưu"/>

                    <div className="backup-actions-row">
                      <button type="button" className="primary-button" onClick={exportData}>
                        <Download size={18}/>
                        XUẤT DỮ LIỆU (.JSON)
                      </button>

                      <button type="button" className="secondary-button" onClick={triggerImportFile}>
                        <Upload size={18}/>
                        NHẬP DỮ LIỆU TỪ FILE
                      </button>

                      <input ref={importFileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} style={{ display: "none" }}/>
                    </div>

                    <p className="backup-hint">
                      File sao lưu chứa tài khoản, giao dịch và ngân sách hiện tại. Nên xuất file định kỳ để phòng mất dữ liệu, vì dữ liệu chỉ đang được lưu trên trình duyệt này.
                    </p>

                    {importMessage && (<div className={`profile-message ${importMessageType}`}>
                        {importMessageType === "success" ? (<CheckCircle2 size={17}/>) : (<AlertTriangle size={17}/>)}
                        <span>{importMessage}</span>
                      </div>)}
                  </section>
                </div>
              </>)}

            {/* =================================================
            TÀI KHOẢN
        ================================================= */}

            {activePage === "salary" && (<SalaryPage salaries={salaries} setSalaries={setSalaries} transactions={transactions} setTransactions={setTransactions} accounts={accounts} playSound={playSound} successSound={successSound} deleteSound={deleteSound} onTransactionAdded={(text) => addTxNotice({ text })}/>)}

            {activePage === "debts" && (<GoalLedger kind="debt" items={debts} setItems={setDebts} playSound={playSound} successSound={successSound} deleteSound={deleteSound}/>)}

            {activePage === "savings" && (<GoalLedger kind="saving" items={savings} setItems={setSavings} categories={investCategories} setCategories={setInvestCategories} playSound={playSound} successSound={successSound} deleteSound={deleteSound}/>)}

            {activePage === "accounts" && (<>
                <div className="account-page-grid acc-page">
                  <section className="panel acc-form-panel">
                    <div className="acc-form-head">
                      <i>
                        <Wallet size={21}/>
                      </i>

                      <div>
                        <h2>Thêm tài khoản</h2>
                        <span>Nhập số dư ban đầu</span>
                      </div>
                    </div>

                    <form className="form acc-form" onSubmit={addAccount}>
                      <FormField label="Tên tài khoản">
                        <input placeholder="Ví dụ: MB Bank" value={accountForm.name} onChange={(event) => setAccountForm({
                ...accountForm,
                name: event.target.value,
            })}/>
                      </FormField>

                      <div className="acc-type-field">
                        <span className="acc-field-label">Loại tài khoản</span>

                        <div className="acc-types" role="radiogroup" aria-label="Loại tài khoản">
                          {Object.entries(accountTypes).map(([key, typeConfig]) => {
                const TypeIcon = typeConfig.icon;
                return (<button key={key} type="button" role="radio" aria-checked={accountForm.type === key} className={`acc-type ${key} ${accountForm.type === key ? "active" : ""}`} onClick={() => setAccountForm({ ...accountForm, type: key })}>
                                <TypeIcon size={21}/>
                                <span>{typeConfig.label}</span>
                              </button>);
            })}
                        </div>
                      </div>

                      <FormField label="Số dư ban đầu">
                        <MoneyInput placeholder="Nhập số dư ban đầu" value={accountForm.openingBalance} onValueChange={(next) => setAccountForm((old) => ({
                ...old,
                openingBalance: next,
            }))}/>
                      </FormField>

                      <button className="primary-button">
                        <Plus size={18}/>
                        THÊM TÀI KHOẢN
                      </button>
                    </form>
                  </section>

                  <section className="panel acc-list-panel">
                    <PanelTitle title="Danh sách tài khoản"/>

                    <div className="acc-grid">
                      {accounts.length === 0 && (<Empty>Chưa có tài khoản.</Empty>)}

                      {accounts.map((account) => {
                const config = accountTypes[account.type] || accountTypes.bank;
                const Icon = config.icon;
                const balance = getAccountBalance(account);
                const opening = Number(account.openingBalance || 0);
                const diff = balance - opening;
                const isActive = String(viewAccountId) === String(account.id);
                return (<article className={`acc-card ${account.type || "bank"} ${isActive ? "active" : ""}`} key={account.id}>
                            <div className="acc-card-top">
                              <i className="acc-card-ico">
                                <Icon size={22}/>
                              </i>

                              <div className="acc-card-name">
                                <strong>{account.name}</strong>
                                <span className="acc-pill">{config.label}</span>
                              </div>

                              <div className="acc-card-actions">
                                <button type="button" className="acc-btn" title="Xem lịch sử" aria-label="Xem lịch sử tài khoản" onClick={() => {
                        setViewAccountId(account.id);
                        playSound();
                    }}>
                                  <Eye size={17}/>
                                </button>

                                <button type="button" className="acc-btn danger" title="Xóa tài khoản" aria-label="Xóa tài khoản" onClick={() => deleteAccount(account.id)}>
                                  <Trash2 size={17}/>
                                </button>
                              </div>
                            </div>

                            <strong className={`acc-card-balance ${balance < 0 ? "neg" : ""}`}>
                              {formatMoney(balance)}
                            </strong>

                            <div className="acc-card-foot">
                              <span>Ban đầu: {formatMoney(opening)}</span>

                              {diff !== 0 && (<em className={diff > 0 ? "up" : "down"}>
                                  {diff > 0 ? "+" : "-"}
                                  {formatMoney(Math.abs(diff))}
                                </em>)}
                            </div>
                          </article>);
            })}
                    </div>
                  </section>
                </div>

                {selectedAccount && (<section className="panel">
                    <PanelTitle title={`Lịch sử tài khoản: ${selectedAccount.name}`} subtitle={`Số dư: ${formatMoney(getAccountBalance(selectedAccount))}`}/>

                    <TransactionTable data={selectedAccountHistory} getAccountName={getAccountName} onEdit={startEdit} onDelete={deleteTransaction}/>
                  </section>)}
              </>)}
            </div>
          </div>
        </main>
        </div>

        {/* ===================================================
            MODAL SỬA
        =================================================== */}

        {editingTransaction && (<div className="modal-overlay">
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

                <button onClick={() => setEditingTransaction(null)}>
                  <X size={21}/>
                </button>
              </div>

              <form className="form" onSubmit={saveEdit}>
                <FormField label="Ngày">
                  <DatePicker clearable value={editingTransaction.date} onChange={(event) => setEditingTransaction({
                ...editingTransaction,
                date: event.target.value,
            })}/>
                </FormField>

                {editingTransaction.type ===
                "expense" && (<FormField label="Danh mục">
                    <select value={editingTransaction.category} onChange={(event) => setEditingTransaction({
                    ...editingTransaction,
                    category: event.target
                        .value,
                })}>
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
                  </FormField>)}

                {editingTransaction.type ===
                "adjustment" && (<FormField label="Tip / Âm">
                    <select value={editingTransaction.adjustmentDirection ||
                    "plus"} onChange={(event) => setEditingTransaction({
                    ...editingTransaction,
                    adjustmentDirection: event.target
                        .value,
                })}>
                      <option value="plus">
                        Tip / Cộng (+)
                      </option>

                      <option value="minus">
                        Âm / Trừ (-)
                      </option>
                    </select>
                  </FormField>)}

                {editingTransaction.type !==
                "transfer" ? (<FormField label="Tài khoản">
                    <select value={editingTransaction.accountId ||
                    ""} onChange={(event) => setEditingTransaction({
                    ...editingTransaction,
                    accountId: event.target
                        .value,
                })}>
                      <option value="">
                        -- Chọn tài khoản --
                      </option>

                      {accounts.map((account) => (<option key={account.id} value={account.id}>
                            {account.name}
                          </option>))}
                    </select>
                  </FormField>) : (<>
                    <FormField label="Từ tài khoản">
                      <select value={editingTransaction.fromAccountId ||
                    ""} onChange={(event) => setEditingTransaction({
                    ...editingTransaction,
                    fromAccountId: event.target
                        .value,
                })}>
                        <option value="">
                          -- Tài khoản nguồn --
                        </option>

                        {accounts.map((account) => (<option key={account.id} value={account.id}>
                              {account.name}
                            </option>))}
                      </select>
                    </FormField>

                    <FormField label="Đến tài khoản">
                      <select value={editingTransaction.toAccountId ||
                    ""} onChange={(event) => setEditingTransaction({
                    ...editingTransaction,
                    toAccountId: event.target
                        .value,
                })}>
                        <option value="">
                          -- Tài khoản đích --
                        </option>

                        {accounts.map((account) => (<option key={account.id} value={account.id}>
                              {account.name}
                            </option>))}
                      </select>
                    </FormField>
                  </>)}

                <FormField label="Nội dung">
                  <input value={editingTransaction.description ||
                ""} onChange={(event) => setEditingTransaction({
                ...editingTransaction,
                description: event.target
                    .value,
            })}/>
                </FormField>

                <FormField label="Số tiền">
                  <MoneyInput value={editingTransaction.amount} onValueChange={(next) => setEditingTransaction({
                ...editingTransaction,
                amount: next,
            })}/>
                </FormField>

                <div className="modal-actions">
                  <button type="button" className="secondary-button" onClick={() => setEditingTransaction(null)}>
                    <X size={18}/>

                    Hủy
                  </button>

                  <button className="primary-button">
                    <Save size={18}/>

                    LƯU THAY ĐỔI
                  </button>
                </div>
              </form>
            </div>
          </div>)}
      </div>
    </>);
}
/* =========================================================
   COMPONENTS
========================================================= */
function monotonePath(pts) {
    const n = pts.length;
    if (n < 2)
        return n ? `M${pts[0].x},${pts[0].y}` : "";
    const dx = [], m = [], t = [];
    for (let i = 0; i < n - 1; i++) {
        dx[i] = pts[i + 1].x - pts[i].x;
        m[i] = (pts[i + 1].y - pts[i].y) / dx[i];
    }
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++)
        t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
        if (m[i] === 0) {
            t[i] = 0;
            t[i + 1] = 0;
            continue;
        }
        const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
        if (s > 9) {
            const k = 3 / Math.sqrt(s);
            t[i] = k * a * m[i];
            t[i + 1] = k * b * m[i];
        }
    }
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < n - 1; i++) {
        const h = dx[i] / 3;
        d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
}
function niceCeil(value) {
    if (value <= 0)
        return 100000;
    const e = Math.pow(10, Math.floor(Math.log10(value)));
    const f = value / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}
function Sparkline({ values, tone, id }) {
    const w = 96, h = 36, p = 3;
    if (values.length < 2)
        return null;
    const max = Math.max(...values), min = Math.min(...values), range = max - min || 1;
    const pts = values.map((v, i) => ({
        x: p + (i / (values.length - 1)) * (w - 2 * p),
        y: max === min ? h / 2 : h - p - ((v - min) / range) * (h - 2 * p),
    }));
    const line = monotonePath(pts);
    return (<svg className={`rp-spark ${tone}`} width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <defs>
        <linearGradient id={`rp-sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity=".3"/>
          <stop offset="100%" stopColor="currentColor" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={`${line} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`} fill={`url(#rp-sp-${id})`}/>
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>);
}
/* Biểu đồ sóng kiểu kính tối: 2 sóng phát sáng + vùng phủ gradient, cột khối lượng theo ngày,
   rê chuột / chạm để xem từng ngày (đường dọc, chấm sáng, 2 chú thích kính mờ) */
function WaveFlowChart({ data, monthKey, mode }) {
    const wrapRef = useRef(null);
    const [width, setWidth] = useState(760);
    const [boxH, setBoxH] = useState(320);
    const [hover, setHover] = useState(null);
    useLayoutEffect(() => {
        const node = wrapRef.current;
        if (!node)
            return undefined;
        const update = () => {
            const r = node.getBoundingClientRect();
            setWidth(Math.max(280, Math.round(r.width)));
            setBoxH(Math.max(260, Math.round(r.height)));
        };
        update();
        if (typeof ResizeObserver === "undefined") {
            window.addEventListener("resize", update);
            return () => window.removeEventListener("resize", update);
        }
        const observer = new ResizeObserver(update);
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    const series = useMemo(() => {
        let inc = 0, exp = 0;
        return data.map((d) => {
            inc += d.income;
            exp += d.expense;
            return mode === "cumulative" ? { income: inc, expense: exp } : { income: d.income, expense: d.expense };
        });
    }, [data, mode]);
    const compact = width < 520;
    const height = boxH;
    const axisH = 26;
    const barH = Math.max(34, Math.min(56, Math.round(height * 0.17)));
    const pad = { top: 30, right: 18, bottom: axisH + barH + 16, left: compact ? 40 : 54 };
    const innerW = width - pad.left - pad.right;
    const innerH = Math.max(80, height - pad.top - pad.bottom);
    const maxRaw = Math.max(0, ...series.map((s) => Math.max(s.income, s.expense)));
    const maxValue = niceCeil(maxRaw);
    const x = (i) => pad.left + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = (v) => pad.top + (1 - v / maxValue) * innerH;
    const baseY = pad.top + innerH;
    const barBase = height - axisH;
    const last = data.length - 1;
    const volumes = data.map((d) => (d.income || 0) + (d.expense || 0));
    const maxVol = Math.max(1, ...volumes);
    const slot = innerW / Math.max(data.length, 1);
    const barW = Math.max(2, Math.min(14, slot * 0.58));
    const incLine = monotonePath(series.map((s, i) => ({ x: x(i), y: y(s.income) })));
    const expLine = monotonePath(series.map((s, i) => ({ x: x(i), y: y(s.expense) })));
    const area = (line) => `${line} L${x(last)},${baseY} L${x(0)},${baseY} Z`;
    let defaultIndex = 0;
    if (monthKey === currentMonthKey()) {
        defaultIndex = Math.min(new Date().getDate(), data.length) - 1;
    }
    else {
        let best = -1;
        series.forEach((s, i) => {
            if (s.income + s.expense > best) {
                best = s.income + s.expense;
                defaultIndex = i;
            }
        });
    }
    const active = Math.max(0, Math.min(hover ?? defaultIndex, last));
    const point = series[active] || { income: 0, expense: 0 };
    const month2 = monthKey.split("-")[1];
    const labelStep = compact ? 10 : 5;
    const tipRight = x(active) > width * 0.62;
    const incomeHigher = point.income >= point.expense;
    const tips = {
        in: { cls: "in", label: `Tiền vào${mode === "cumulative" ? " · lũy kế" : ""}`, value: point.income, y: y(point.income) },
        out: { cls: "out", label: `Tiền ra${mode === "cumulative" ? " · lũy kế" : ""}`, value: point.expense, y: y(point.expense) },
    };
    const hiTip = incomeHigher ? tips.in : tips.out;
    const loTip = incomeHigher ? tips.out : tips.in;
    const hiLeft = Math.min(Math.max(x(active), 76), width - 76);
    const hiTop = Math.max(hiTip.y - 14, pad.top + 40);
    const loTop = Math.max(pad.top, Math.min(loTip.y + 14, baseY - 48));
    function move(event) {
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left - pad.left) / innerW;
        setHover(Math.max(0, Math.min(last, Math.round(ratio * last))));
    }
    return (<div className="rp-chart" ref={wrapRef}>
      <svg width={width} height={height} onPointerMove={move} onPointerDown={move} onPointerLeave={() => setHover(null)} role="img" aria-label="Biểu đồ sóng tiền vào và tiền ra">
        <defs>
          <linearGradient id="fl-g-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="fl-s-in" stopOpacity=".5"/>
            <stop offset="70%" className="fl-s-in" stopOpacity=".08"/>
            <stop offset="100%" className="fl-s-in" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="fl-g-out" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="fl-s-out" stopOpacity=".42"/>
            <stop offset="70%" className="fl-s-out" stopOpacity=".07"/>
            <stop offset="100%" className="fl-s-out" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="fl-bar-on" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7"/>
            <stop offset="100%" stopColor="#10b981"/>
          </linearGradient>
          <linearGradient id="fl-cursor" gradientUnits="userSpaceOnUse" x1="0" y1={pad.top} x2="0" y2={barBase}>
            <stop offset="0%" className="fl-s-cur" stopOpacity=".05"/>
            <stop offset="45%" className="fl-s-cur" stopOpacity=".4"/>
            <stop offset="100%" className="fl-s-cur" stopOpacity=".12"/>
          </linearGradient>
        </defs>

        {[1, 0.75, 0.5, 0.25, 0].map((r) => (<g key={r}>
            <line x1={pad.left} x2={width - pad.right} y1={y(maxValue * r)} y2={y(maxValue * r)} className="fl-grid"/>
            <text x={pad.left - 10} y={y(maxValue * r) + 4} textAnchor="end" className="fl-axis">{formatCompactMoney(maxValue * r)}</text>
          </g>))}

        {data.map((d, i) => {
            const v = volumes[i];
            const h = v > 0 ? Math.max(3, (v / maxVol) * barH) : 2;
            return (<rect key={`bar-${d.day}`} x={x(i) - barW / 2} y={barBase - h} width={barW} height={h} rx={Math.min(3, barW / 2)} className={`fl-bar ${i === active ? "on" : ""}`}/>);
        })}

        {data.map((d, i) => {
            const show = d.day === 1 || d.day === data.length || (d.day % labelStep === 0 && data.length - d.day >= 2);
            return show ? <text key={d.day} x={x(i)} y={height - 8} textAnchor="middle" className="fl-axis">{pad2(d.day)}/{month2}</text> : null;
        })}

        <path d={area(expLine)} fill="url(#fl-g-out)"/>
        <path d={area(incLine)} fill="url(#fl-g-in)"/>
        <path d={expLine} className="fl-line out"/>
        <path d={incLine} className="fl-line in"/>

        <line x1={x(active)} x2={x(active)} y1={pad.top} y2={barBase} stroke="url(#fl-cursor)" strokeWidth="1.5"/>
        <circle cx={x(active)} cy={y(point.expense)} r="11" className="fl-halo out"/>
        <circle cx={x(active)} cy={y(point.income)} r="11" className="fl-halo in"/>
        <circle cx={x(active)} cy={y(point.expense)} r="5.2" className="fl-dot out"/>
        <circle cx={x(active)} cy={y(point.income)} r="5.2" className="fl-dot in"/>
      </svg>

      {maxRaw === 0 && <div className="rp-chart-empty">Chưa có giao dịch trong tháng này</div>}

      <div className={`fl-tip ${hiTip.cls}`} style={{ left: hiLeft, top: hiTop, transform: "translate(-50%, -100%)" }}>
        <span>{hiTip.label}</span>
        <strong>{formatMoney(hiTip.value)}</strong>
      </div>

      <div className={`fl-tip ${loTip.cls}`} style={{ left: tipRight ? x(active) - 14 : x(active) + 14, top: loTop, transform: tipRight ? "translateX(-100%)" : "none" }}>
        <span>{loTip.label}</span>
        <strong>{formatMoney(loTip.value)}</strong>
      </div>

      <div className="fl-chip" style={{ left: Math.min(Math.max(x(active), 30), width - 30), top: height - axisH + 2 }}>
        {pad2(data[active]?.day || 1)}/{month2}
      </div>
    </div>);
}
function pad2(value) {
    return String(value).padStart(2, "0");
}
function deltaInfo(cur, prev, goodWhenUp, ready) {
    /* Chỉ hiện phần trăm tăng / giảm so với tháng trước (không dấu +/−):
       tăng = xanh, giảm = đỏ, không có thay đổi hoặc chưa có dữ liệu = 0% */
    const fmt = (n) => n.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    const flat = { text: "0%", tone: "flat", up: null };
    if (!ready)
        return flat;
    if (prev === 0) {
        if (cur === 0)
            return flat;
        /* từ 0 lên có số: tính là 100% */
        return { text: "100%", tone: cur > 0 ? "up" : "down", up: cur > 0 };
    }
    const pct = Number((((cur - prev) / Math.abs(prev)) * 100).toFixed(1));
    if (pct === 0)
        return flat;
    return {
        text: `${fmt(Math.abs(pct))}%`,
        tone: pct > 0 ? "up" : "down",
        up: pct > 0,
    };
}
function MonthlyReportPage({ availableMonths, selectedMonth, setSelectedMonth, transactions, totals, previousTotals, hasPreviousMonthData, previousMonth, flowData, monthTransactions, calculateTotals, getAccountName, onEdit, onDelete, playSound, }) {
    const [mode, setMode] = useState("daily");
    const [yearText, monthText] = selectedMonth.split("-");
    const [prevYear, prevMonthText] = previousMonth.split("-");
    const positive = totals.remaining >= 0;
    const [pickerYear, setPickerYear] = useState(yearText);
    useEffect(() => { setPickerYear(yearText); }, [yearText]);
    const yearOptions = useMemo(() => {
        const set = new Set([yearText, String(new Date().getFullYear()), pickerYear]);
        availableMonths.forEach((m) => set.add(m.slice(0, 4)));
        return Array.from(set).sort((x, y) => y.localeCompare(x));
    }, [availableMonths, yearText, pickerYear]);
    const yearSummaries = useMemo(() => {
        const map = {};
        for (let i = 1; i <= 12; i++) {
            const key = `${pickerYear}-${pad2(i)}`;
            const list = transactions.filter((item) => item.date && item.date.startsWith(key));
            map[key] = { ...calculateTotals(list), count: list.length };
        }
        return map;
    }, [transactions, pickerYear]);
    function go(month) {
        if (!month)
            return;
        setSelectedMonth(month);
        playSound();
    }
    const cumulative = (key) => {
        let sum = 0;
        return flowData.map((d) => (sum += d[key]));
    };
    const kpis = [
        { id: "income", label: "Tổng đầu vào", icon: TrendingUp, value: totals.income, prev: previousTotals.income, tone: "income", good: true, series: cumulative("income"), text: formatMoney(totals.income) },
        { id: "expense", label: "Tổng đầu ra", icon: TrendingDown, value: totals.expense, prev: previousTotals.expense, tone: "expense", good: false, series: cumulative("expense"), text: formatMoney(totals.expense) },
        { id: "adjust", label: "Tip / Âm", icon: Gift, value: totals.adjustment, prev: previousTotals.adjustment, tone: "adjust", good: true, series: cumulative("adjustment"), text: `${totals.adjustment > 0 ? "+" : ""}${formatMoney(totals.adjustment)}`, neg: totals.adjustment < 0 },
        { id: "net", label: positive ? "Dư tháng" : "Âm tháng", icon: CircleDollarSign, value: totals.remaining, prev: previousTotals.remaining, tone: positive ? "income" : "expense", good: true, series: flowData.map((d) => d.cumulative), text: `${positive ? "" : "-"}${formatMoney(Math.abs(totals.remaining))}`, neg: !positive },
    ];
    const catRows = [
        { key: "food", value: totals.food },
        { key: "rent", value: totals.rent },
        { key: "other", value: totals.other },
    ];
    const feed = [...monthTransactions]
        .sort((a, b) => b.date.localeCompare(a.date) || transactionCreatedAt(b) - transactionCreatedAt(a))
        .slice(0, 6);
    return (<div className="rp">
      <div className="rp-top">
        <div className="rp-left">
        <div className="rp-cal">
          <div className="rp-cal-head">
            <button type="button" onClick={() => setPickerYear(String(Number(pickerYear) - 1))} aria-label="Năm trước"><ChevronLeft size={16}/></button>
            <select value={pickerYear} onChange={(event) => setPickerYear(event.target.value)} aria-label="Chọn năm">
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button type="button" onClick={() => setPickerYear(String(Number(pickerYear) + 1))} aria-label="Năm sau"><ChevronRight size={16}/></button>
          </div>
          <div className="rp-cal-grid">
            {Array.from({ length: 12 }, (_, i) => {
            const key = `${pickerYear}-${pad2(i + 1)}`;
            const s = yearSummaries[key];
            const hasData = s && s.count > 0;
            return (<button type="button" key={key} className={`rp-cal-month ${key === selectedMonth ? "active" : ""}`} onClick={() => go(key)}>
                  <span>Tháng {i + 1}</span>
                  {hasData && <i className={s.remaining >= 0 ? "pos" : "neg"}/>}
                </button>);
        })}
          </div>
        </div>

          <div className="rp-kpis">
            {kpis.map((k) => {
            const delta = deltaInfo(k.value, k.prev, k.good, hasPreviousMonthData);
            return (<article className={`rp-kpi ${k.tone}`} key={k.id}>
                  <span className="rp-kpi-label"><k.icon size={14}/> {k.label}</span>
                  <strong className={k.neg ? "neg" : ""}>{k.text}</strong>
                  <div className="rp-kpi-foot">
                    {delta ? (<em className={`rp-delta ${delta.tone}`} title={`Tăng / giảm so với T${Number(prevMonthText)}/${prevYear}`}>
                        {delta.up === true ? <ArrowUpRight size={15}/> : delta.up === false ? <ArrowDownRight size={15}/> : null}
                        {delta.text}
                      </em>) : <small>—</small>}
                  </div>
                </article>);
        })}
          </div>
        </div>

        <section className="rp-card rp-flow">
          <div className="rp-card-head">
            <div>
              <h2>Dòng tiền trong tháng</h2>
              <p>
                Tháng {Number(monthText)}/{yearText}
                {totals.income + totals.expense + totals.adjustment > 0 && (<span className={`rp-pill ${positive ? "ok" : "warn"}`}>{positive ? "Đang dư" : "Đang âm"} {positive ? "+" : "-"}{formatMoney(Math.abs(totals.remaining))}</span>)}
              </p>
            </div>
            <div className="rp-tools">
              <div className="rp-legend">
                <span><i className="in"/> Tiền vào</span>
                <span><i className="out"/> Tiền ra</span>
              </div>
              <div className="rp-seg">
                <button type="button" className={mode === "daily" ? "on" : ""} onClick={() => setMode("daily")}>Hằng ngày</button>
                <button type="button" className={mode === "cumulative" ? "on" : ""} onClick={() => setMode("cumulative")}>Lũy kế</button>
              </div>
            </div>
          </div>

        <WaveFlowChart data={flowData} monthKey={selectedMonth} mode={mode}/>

        </section>
      </div>

      <div className="rp-grid2">
        <section className="rp-card">
          <div className="rp-card-head"><div><h2>Chi tiêu theo danh mục</h2><p>Tổng đầu ra {formatMoney(totals.expense)}</p></div></div>
          <div className="rp-cats">
            <div className="rp-cat-h"><span>Danh mục</span><span>Tỷ trọng</span><span>Số tiền</span><span>%</span></div>
            {catRows.map((row) => {
            const share = totals.expense ? (row.value / totals.expense) * 100 : 0;
            const Icon = categories[row.key].icon;
            const segCount = 16;
            return (<div className="rp-cat" key={row.key}>
                  <span className="rp-cat-name"><b className={row.key}><Icon size={15}/></b>{categories[row.key].label}</span>
                  <span className="rp-segs" role="img" aria-label={`${Math.round(share)}%`}>
                    {Array.from({ length: segCount }, (_, i) => {
                    const exact = (share / 100) * segCount;
                    const full = Math.floor(exact);
                    const frac = exact - full;
                    const state = i < full ? "on" : i === full && frac > 0 && (frac >= 0.25 || full === 0) ? "part" : "";
                    return <i key={i} className={state ? `${state} ${row.key}` : ""}/>;
                })}
                  </span>
                  <span className="rp-cat-amt">{formatMoney(row.value)}</span>
                  <em>{Math.round(share)}%</em>
                </div>);
        })}
          </div>
        </section>

        <section className="rp-card">
          <div className="rp-card-head"><div><h2>Giao dịch gần đây</h2><p>{feed.length ? `${feed.length} giao dịch mới nhất trong tháng` : "Chưa có giao dịch"}</p></div></div>
          <div className="rp-feed">
            {feed.length === 0 && <Empty>Chưa có giao dịch trong tháng này.</Empty>}
            {feed.map((item) => {
            const minus = item.type === "expense" || (item.type === "adjustment" && item.adjustmentDirection === "minus");
            const Icon = item.type === "income" ? TrendingUp : item.type === "expense" ? TrendingDown : Gift;
            const acc = getAccountName(item.accountId);
            return (<div className="rp-feed-item" key={item.id}>
                  <time>{item.date.slice(8, 10)}/{item.date.slice(5, 7)}</time>
                  <b className={item.type}><Icon size={14}/></b>
                  <div>
                    <strong>{item.description || typeLabels[item.type] || "Giao dịch"}</strong>
                    <small>{[acc, item.code].filter(Boolean).join(" · ")}</small>
                  </div>
                  <span className={minus ? "neg" : "pos"}>{minus ? "-" : "+"}{formatMoney(Math.abs(Number(item.amount || 0)))}</span>
                </div>);
        })}
          </div>
        </section>
      </div>

      <section className="panel rp-detail">
        <PanelTitle title="Chi tiết giao dịch" subtitle={formatMonth(selectedMonth)}/>
        <TransactionTable data={[...monthTransactions].sort((a, b) => b.date.localeCompare(a.date))} getAccountName={getAccountName} onEdit={onEdit} onDelete={onDelete}/>
      </section>
    </div>);
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
/* =========================================================
   BIỂU ĐỒ CỘT KHOẢN CHI THEO TUẦN (7 ngày, Thứ 2 → Chủ nhật)
   Mỗi cột là một ngày, có thể chứa tới 3 màu:
   Ăn uống (cam) · Tiền trọ (đen) · Chi tiêu khác (cam nhạt).
   Ngày chưa chi gì chỉ hiện cột sọc xám.
========================================================= */
const WEEK_SHORT = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const WEEK_FULL = [
    "Thứ hai",
    "Thứ ba",
    "Thứ tư",
    "Thứ năm",
    "Thứ sáu",
    "Thứ bảy",
    "Chủ nhật",
];
const WEEKLY_CHART_HEIGHT = 230;
/* Phần chiều cao của vùng biểu đồ không phải là cột: đệm trên + hàng nhãn thứ */
const WEEKLY_CHART_RESERVED = 46;
/* Màn hình rộng: đo vùng biểu đồ (đã được ép vừa 1 màn hình) rồi co giãn cột theo đó.
   Màn hình hẹp: dùng chiều cao mặc định. */
function useWeeklyChartHeight(ref) {
    const [height, setHeight] = useState(WEEKLY_CHART_HEIGHT);
    useEffect(() => {
        const node = ref.current;
        if (!node)
            return undefined;
        const measure = () => {
            if (window.innerWidth <= 1100) {
                setHeight(WEEKLY_CHART_HEIGHT);
                return;
            }
            const available = node.clientHeight - WEEKLY_CHART_RESERVED;
            setHeight(Math.max(96, Math.min(420, Math.round(available))));
        };
        measure();
        let observer = null;
        if (typeof ResizeObserver !== "undefined") {
            observer = new ResizeObserver(measure);
            observer.observe(node);
        }
        window.addEventListener("resize", measure);
        return () => {
            if (observer)
                observer.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [ref]);
    return height;
}
const WEEKLY_TIP_HEIGHT = 118;
function getWeekDays(offset) {
    const now = new Date();
    const mondayShift = (now.getDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayShift + offset * 7 + index);
        return {
            index,
            key: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
            label: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`,
        };
    });
}
/* Tuần (tính từ thứ 2) chứa một ngày, so với tuần hiện tại: 0 = tuần này, -1 = tuần trước... */
function getWeekOffsetForDate(date) {
    const now = new Date();
    const monday = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    return Math.round((monday(date) - monday(now)) / (7 * 86400000));
}
/* =========================================================
   LỊCH CHỌN THÁNG XEM (nằm ở bảng thống kê khoản chi)
   Chỉ có chế độ xem Ngày: bấm mũi tên để đổi tháng, bấm một ngày để
   biểu đồ nhảy tới tuần chứa ngày đó.
========================================================= */
/* Chữ trên các nút ở chân lịch: muốn đổi chữ thì sửa ngay tại đây */
const CALENDAR_FOOT_LABELS = {
    custom: "Tuỳ chỉnh",
    back: "Quay lại",
    apply: "Xem ngày này",
};
function CalendarPicker({ month, onChangeMonth, onPickDay, transactions = [], }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("calendar");
    const [draft, setDraft] = useState({ day: 1, month: 1, year: 2026 });
    const wrapRef = useRef(null);
    const [year, monthNumber] = month.split("-").map(Number);
    const todayKey = todayString();
    const thisMonth = currentMonthKey();
    useEffect(() => {
        if (!open)
            return undefined;
        const onDown = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);
    /* Chi từng ngày của tháng đang xem */
    const monthStats = useMemo(() => {
        const dayExpense = {};
        transactions.forEach((item) => {
            if (!item.date || !item.date.startsWith(month))
                return;
            if (item.type !== "expense")
                return;
            const amount = Math.abs(Number(item.amount || 0));
            dayExpense[item.date] = (dayExpense[item.date] || 0) + amount;
        });
        return { dayExpense };
    }, [transactions, month]);
    const cells = useMemo(() => {
        const first = new Date(year, monthNumber - 1, 1).getDay();
        const start = first === 0 ? 6 : first - 1;
        const days = new Date(year, monthNumber, 0).getDate();
        return [
            ...Array(start).fill(null),
            ...Array.from({ length: days }, (_, i) => i + 1),
        ];
    }, [year, monthNumber]);
    function monthKeyOf(y, m) {
        const date = new Date(y, m - 1, 1);
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
    }
    /* ----- Phần Tuỳ chỉnh: chọn cụ thể ngày, tháng, năm ----- */
    const thisYear = new Date().getFullYear();
    const yearOptions = [];
    for (let y = Math.min(thisYear - 5, draft.year); y <= Math.max(thisYear + 1, draft.year); y += 1) {
        yearOptions.push(y);
    }
    const draftDaysInMonth = new Date(draft.year, draft.month, 0).getDate();
    const draftDay = Math.min(draft.day, draftDaysInMonth);
    const draftKey = `${draft.year}-${pad(draft.month)}-${pad(draftDay)}`;
    const draftWeekday = WEEK_FULL[(new Date(draft.year, draft.month - 1, draftDay).getDay() + 6) % 7];
    const draftSpent = useMemo(() => {
        return transactions.reduce((sum, item) => {
            if (item.type !== "expense" || item.date !== draftKey)
                return sum;
            return sum + Math.abs(Number(item.amount || 0));
        }, 0);
    }, [transactions, draftKey]);
    function openCustom() {
        setDraft({
            day: month === thisMonth ? new Date().getDate() : 1,
            month: monthNumber,
            year,
        });
        setMode("custom");
    }
    function applyCustom() {
        onChangeMonth(`${draft.year}-${pad(draft.month)}`);
        onPickDay(draftKey);
        setOpen(false);
    }
    return (<div className="calendar-picker" ref={wrapRef}>
      <button type="button" className={`calendar-trigger ${open ? "active" : ""}`} title="Chọn tháng xem" aria-label="Chọn tháng xem" aria-expanded={open} onClick={() => {
            setMode("calendar");
            setOpen((old) => !old);
        }}>
        <ModernCalendarIcon size={18}/>
      </button>

      {open && (<div className="calendar-pop" role="dialog" aria-label="Lịch xem tháng">
          {mode === "calendar" ? (<>
              <div className="calendar-nav">
                <button type="button" aria-label="Tháng trước" onClick={() => onChangeMonth(monthKeyOf(year, monthNumber - 1))}>
                  <ChevronLeft size={16}/>
                </button>

                {/* Chỉ hiển thị chữ, không bấm để chuyển sang xem tháng / năm */}
                <div className="calendar-nav-title">{`Tháng ${monthNumber}/${year}`}</div>

                <button type="button" aria-label="Tháng sau" onClick={() => onChangeMonth(monthKeyOf(year, monthNumber + 1))}>
                  <ChevronRight size={16}/>
                </button>
              </div>

              <div className="mini-cal-days mini-cal-weekdays">
                {WEEK_SHORT.map((label) => (<span key={label}>{label}</span>))}
              </div>

              <div className="mini-cal-days">
                {cells.map((day, index) => {
                    if (!day)
                        return <i key={`empty-${index}`}/>;
                    const dateKey = `${month}-${pad(day)}`;
                    const spent = monthStats.dayExpense[dateKey] || 0;
                    return (<button key={dateKey} type="button" className={`mini-cal-day ${dateKey === todayKey ? "today" : ""} ${spent > 0 ? "has-spending" : ""}`} title={spent > 0
                            ? `${formatDate(dateKey)}: chi ${formatMoney(spent)}`
                            : `${formatDate(dateKey)}: chưa chi`} onClick={() => {
                            onPickDay(dateKey);
                            setOpen(false);
                        }}>
                      {day}
                    </button>);
                })}
              </div>

              <div className="calendar-foot">
                <button type="button" className="primary" onClick={openCustom}>
                  {CALENDAR_FOOT_LABELS.custom}
                </button>
              </div>
            </>) : (<>
              <div className="calendar-custom">
                <div className="calendar-custom-title">
                  {CALENDAR_FOOT_LABELS.custom}
                </div>

                <div className="calendar-custom-grid">
                  <label>
                    <span>Ngày</span>

                    <select value={draftDay} onChange={(event) => setDraft({ ...draft, day: Number(event.target.value) })}>
                      {Array.from({ length: draftDaysInMonth }, (_, i) => i + 1).map((d) => (<option key={d} value={d}>
                          {d}
                        </option>))}
                    </select>
                  </label>

                  <label>
                    <span>Tháng</span>

                    <select value={draft.month} onChange={(event) => setDraft({
                    ...draft,
                    month: Number(event.target.value),
                })}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (<option key={m} value={m}>
                          {m}
                        </option>))}
                    </select>
                  </label>

                  <label>
                    <span>Năm</span>

                    <select value={draft.year} onChange={(event) => setDraft({
                    ...draft,
                    year: Number(event.target.value),
                })}>
                      {yearOptions.map((y) => (<option key={y} value={y}>
                          {y}
                        </option>))}
                    </select>
                  </label>
                </div>

                <div className="calendar-custom-preview">
                  <strong>
                    {draftWeekday}, {pad(draftDay)}/{pad(draft.month)}/
                    {draft.year}
                  </strong>

                  <span>
                    {draftSpent > 0
                    ? `Chi ngày này: ${formatMoney(draftSpent)}`
                    : "Ngày này chưa chi"}
                  </span>
                </div>
              </div>

              <div className="calendar-foot">
                <button type="button" onClick={() => setMode("calendar")}>
                  {CALENDAR_FOOT_LABELS.back}
                </button>

                <button type="button" className="primary" onClick={applyCustom}>
                  {CALENDAR_FOOT_LABELS.apply}
                </button>
              </div>
            </>)}
        </div>)}
    </div>);
}
/* Bước chia trục tung "đẹp": 4 khoảng bằng nhau */
function getNiceStep(maxValue) {
    if (maxValue <= 0)
        return 25000;
    const raw = maxValue / 4;
    const exponent = Math.pow(10, Math.floor(Math.log10(raw)));
    const fraction = raw / exponent;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    return nice * exponent;
}
function WeeklySpendingChart({ transactions, selectedMonth, availableMonths = [], onSelectMonth = () => { }, }) {
    const [weekOffset, setWeekOffset] = useState(0);
    const [hoverIndex, setHoverIndex] = useState(null);
    const [pickedKey, setPickedKey] = useState(null);
    /* Đổi tháng ở lịch: biểu đồ nhảy tới tuần cuối của tháng đó
       (tháng hiện tại thì về tuần này) */
    useEffect(() => {
        if (!selectedMonth)
            return;
        /* Vừa chọn một ngày cụ thể (ví dụ ở phần Tuỳ chỉnh) thuộc tháng này:
           giữ nguyên tuần đã chọn */
        if (pickedKey && pickedKey.startsWith(selectedMonth))
            return;
        const [y, m] = selectedMonth.split("-").map(Number);
        const reference = selectedMonth === currentMonthKey() ? new Date() : new Date(y, m, 0);
        setWeekOffset(Math.min(0, getWeekOffsetForDate(reference)));
        setPickedKey(null);
    }, [selectedMonth]);
    function handlePickDay(dateKey) {
        const [y, m, d] = dateKey.split("-").map(Number);
        setWeekOffset(Math.min(0, getWeekOffsetForDate(new Date(y, m - 1, d))));
        setPickedKey(dateKey);
    }
    const chartAreaRef = useRef(null);
    const chartHeight = useWeeklyChartHeight(chartAreaRef);
    const todayKey = todayString();
    const days = getWeekDays(weekOffset);
    const columns = days.map((day) => {
        let food = 0;
        let rent = 0;
        let other = 0;
        transactions.forEach((item) => {
            if (item.type !== "expense" || item.date !== day.key)
                return;
            const amount = Math.abs(Number(item.amount || 0));
            if (item.category === "food")
                food += amount;
            else if (item.category === "rent")
                rent += amount;
            else
                other += amount;
        });
        return { ...day, food, rent, other, total: food + rent + other };
    });
    const weekTotal = columns.reduce((sum, col) => sum + col.total, 0);
    const maxTotal = Math.max(...columns.map((col) => col.total), 0);
    const step = getNiceStep(maxTotal);
    const axisMax = step * 4;
    const todayIndex = columns.findIndex((col) => col.key === todayKey);
    /* Cột đang được chọn: cột rê chuột, nếu không thì hôm nay,
       nếu không thì ngày chi gần nhất của tuần đó */
    let defaultIndex = todayIndex;
    if (defaultIndex < 0) {
        for (let i = columns.length - 1; i >= 0; i -= 1) {
            if (columns[i].total > 0) {
                defaultIndex = i;
                break;
            }
        }
    }
    if (defaultIndex < 0)
        defaultIndex = 0;
    const pickedIndex = pickedKey
        ? columns.findIndex((col) => col.key === pickedKey)
        : -1;
    const activeIndex = hoverIndex ?? (pickedIndex >= 0 ? pickedIndex : defaultIndex);
    const activeCol = columns[activeIndex];
    const categories = [
        { id: "food", label: "Ăn uống" },
        { id: "rent", label: "Tiền trọ" },
        { id: "other", label: "Chi tiêu khác" },
    ];
    return (<div className="weekly-chart-card">
      <div className="dashboard-panel-heading compact">
        <div>
          <div className="panel-kicker">THỐNG KÊ KHOẢN CHI</div>
          <h2>Chi tiêu trong tuần</h2>
        </div>

        <div className="weekly-head-actions">
        <CalendarPicker month={selectedMonth} onChangeMonth={onSelectMonth} onPickDay={handlePickDay} transactions={transactions}/>

        </div>
      </div>

      <div className="weekly-chart" ref={chartAreaRef} onMouseLeave={() => setHoverIndex(null)}>
        <div className="weekly-axis" style={{ height: chartHeight }} aria-hidden="true">
          {[0, 1, 2, 3, 4].map((tick) => (<span key={tick} style={{ bottom: `${(tick / 4) * 100}%` }}>
              {formatCompactMoney(step * tick)}
            </span>))}
        </div>

        <div className="weekly-bars">
          {columns.map((col) => {
            const isActive = col.index === activeIndex;
            const isToday = col.key === todayKey;
            const hasSpending = col.total > 0;
            const barHeight = hasSpending
                ? Math.max(40, (col.total / axisMax) * chartHeight)
                : 54;
            return (<button key={col.key} type="button" className={`weekly-col ${isActive ? "active" : ""} ${isToday ? "today" : ""}`} aria-label={`${WEEK_FULL[col.index]} ${col.label}: ${formatMoney(col.total)}`} onMouseEnter={() => setHoverIndex(col.index)} onFocus={() => setHoverIndex(col.index)} onBlur={() => setHoverIndex(null)}>
                <div className="weekly-bar-area" style={{ height: chartHeight }}>
                  {isActive && (<div className={`weekly-tip ${col.index <= 1
                        ? "align-left"
                        : col.index >= 5
                            ? "align-right"
                            : ""}`} style={{ top: -(WEEKLY_TIP_HEIGHT + 12) }}>
                      <div className="weekly-tip-head">
                        <span>
                          {isToday ? "Hôm nay" : WEEK_FULL[col.index]}
                          {" · "}
                          {col.label}
                        </span>

                        <strong>{formatMoney(col.total)}</strong>
                      </div>

                      {categories.map((category) => (<div className={`weekly-tip-row ${col[category.id] > 0 ? "" : "zero"}`} key={category.id}>
                          <i className={`donut-dot ${category.id}`}/>

                          <span>{category.label}</span>

                          <strong>{formatMoney(col[category.id])}</strong>
                        </div>))}
                    </div>)}

                  <div className={`weekly-bar ${hasSpending ? "filled" : "empty"}`} style={{ height: barHeight }}>
                    {categories.map((category) => col[category.id] > 0 ? (<i key={category.id} className={`weekly-seg ${category.id}`} style={{ flexGrow: col[category.id] }}/>) : null)}

                    {isActive && hasSpending && (<b className="weekly-bar-dot"/>)}
                  </div>
                </div>

                <span className="weekly-label">{WEEK_SHORT[col.index]}</span>
              </button>);
        })}
        </div>
      </div>

      <div className="weekly-summary">
        <div className="weekly-summary-title">
          <strong>
            {activeCol.key === todayKey
            ? "Hôm nay"
            : WEEK_FULL[activeCol.index]}
            {" · "}
            {activeCol.label}
          </strong>

          <span>Tổng chi {formatMoney(activeCol.total)}</span>
        </div>

        <div className="weekly-legend">
          {categories.map((category) => (<div className="weekly-legend-item" key={category.id}>
              <i className={`donut-dot ${category.id}`}/>

              {category.label}

              <strong>{formatMoney(activeCol[category.id])}</strong>
            </div>))}
        </div>

        <div className="weekly-week-total">
          <span>Cả tuần</span>

          <strong>
            {formatMoney(weekTotal).replace(/\s*đ$/, "")}
            <sup>đ</sup>
          </strong>
        </div>
      </div>
    </div>);
}
function SpendingDonut({ food, rent, other, total, showAmount = false }) {
    const safeTotal = Number(total || 0);
    const items = [
        { label: "Ăn uống", value: Number(food || 0), className: "food" },
        { label: "Tiền trọ", value: Number(rent || 0), className: "rent" },
        { label: "Chi tiêu khác", value: Number(other || 0), className: "other" },
    ];
    let cursor = 0;
    const gradient = safeTotal > 0
        ? items
            .map((item) => {
            const start = cursor;
            const percent = (item.value / safeTotal) * 100;
            cursor += percent;
            return `${item.className === "food" ? "var(--cat-food)" : item.className === "rent" ? "var(--cat-rent)" : "var(--cat-other)"} ${start}% ${cursor}%`;
        })
            .join(", ")
        : "var(--chart-empty) 0% 100%";
    return (<div className="donut-content">
      <div className="donut-chart" style={{ background: `conic-gradient(${gradient})` }}>
        <div className="donut-hole">
          <strong>{formatMoney(safeTotal)}</strong>
          <span>Tổng chi</span>
        </div>
      </div>

      <div className="donut-legend">
        {items.map((item) => {
            const percent = safeTotal > 0 ? (item.value / safeTotal) * 100 : 0;
            return (<div className="donut-legend-row" key={item.label}>
              <div>
                <i className={`donut-dot ${item.className}`}/>
                <span>{item.label}</span>
              </div>
              <strong>
                {percent.toFixed(0)}%

                {showAmount && (<small>{formatMoney(item.value)}</small>)}
              </strong>
            </div>);
        })}
      </div>
    </div>);
}
function DashboardRecentTransactions({ transactions, getAccountName, search = "" }) {
    const normalizedSearch = search.trim().toLowerCase();
    const data = [...transactions]
        .filter((item) => {
        if (!normalizedSearch)
            return true;
        const accountText = item.type === "transfer"
            ? `${getAccountName(item.fromAccountId)} ${getAccountName(item.toAccountId)}`
            : getAccountName(item.accountId);
        const categoryText = item.type === "expense"
            ? categories[item.category]?.label || ""
            : "";
        return `${item.description || ""} ${accountText} ${categoryText}`
            .toLowerCase()
            .includes(normalizedSearch);
    })
        .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)))
        .slice(0, 5);
    if (data.length === 0) {
        return <Empty>Chưa có giao dịch trong tháng này.</Empty>;
    }
    return (<div className="dashboard-recent-list">
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
            }
            else if (isAdjustment) {
                className = item.adjustmentDirection === "minus" ? "expense" : "adjustment";
                sign = item.adjustmentDirection === "minus" ? "-" : "+";
                label = item.adjustmentDirection === "minus" ? "Điều chỉnh giảm" : "Điều chỉnh tăng";
                Icon = SlidersHorizontal;
            }
            else if (isTransfer) {
                className = "adjustment";
                sign = "↔";
                label = "Chuyển tiền";
                Icon = ArrowLeftRight;
            }
            return (<div className="dashboard-recent-row" key={item.id}>
            <div className={`dashboard-transaction-icon ${className}`}>
              <Icon size={18}/>
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
          </div>);
        })}
    </div>);
}
function DashboardAccountBalances({ accounts, getAccountBalance }) {
    if (accounts.length === 0) {
        return <Empty>Chưa có tài khoản.</Empty>;
    }
    return (<div className="dashboard-account-list">
      {accounts.slice(0, 5).map((account) => {
            const config = accountTypes[account.type] || accountTypes.bank;
            const Icon = config.icon;
            const balance = getAccountBalance(account);
            return (<div className="dashboard-account-row" key={account.id}>
            <div className="dashboard-account-icon">
              <Icon size={18}/>
            </div>
            <div>
              <strong>{account.name}</strong>
              <span>{config.label}</span>
            </div>
            <strong className={balance < 0 ? "expense" : "positive"}>
              {formatMoney(balance)}
            </strong>
          </div>);
        })}
    </div>);
}
function DashboardNotificationList({ notifications }) {
    if (notifications.length === 0) {
        return <Empty>Hiện chưa có cảnh báo.</Empty>;
    }
    return (<div className="dashboard-notification-list">
      {notifications.map((item) => (<div className={`dashboard-notification-row ${item.type}`} key={item.id}>
          <div className="dashboard-notification-mark"/>
          <div>
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </div>
        </div>))}
    </div>);
}
function BudgetMini({ label, spent, budget }) {
    const safeBudget = Number(budget || 0);
    const safeSpent = Number(spent || 0);
    const percent = safeBudget > 0 ? (safeSpent / safeBudget) * 100 : 0;
    return (<div className="dashboard-budget-mini">
      <div>
        <span>{label}</span>
        <strong>{safeBudget > 0 ? `${Math.min(percent, 999).toFixed(0)}%` : "—"}</strong>
      </div>
      <small>
        {formatMoney(safeSpent)} / {formatMoney(safeBudget)}
      </small>
    </div>);
}
/* Số chạy từ giá trị hiện tại đến đúng giá trị đích */
function CountUp({ value = 0, format = (number) => Math.round(number).toLocaleString("vi-VN"), decimals = 0, duration = 1100, }) {
    const target = Number(value) || 0;
    const [display, setDisplay] = useState(0);
    const fromRef = useRef(0);
    useEffect(() => {
        const reduceMotion = typeof window !== "undefined" &&
            window.matchMedia &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduceMotion) {
            fromRef.current = target;
            setDisplay(target);
            return undefined;
        }
        const from = fromRef.current;
        const startTime = performance.now();
        let frame = 0;
        function tick(time) {
            const progress = Math.min((time - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            if (progress >= 1) {
                fromRef.current = target;
                setDisplay(target);
                return;
            }
            const current = from + (target - from) * eased;
            fromRef.current = current;
            setDisplay(Number(current.toFixed(decimals)));
            frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [target, duration, decimals]);
    return <>{format(display)}</>;
}
/* Chạy số cho chuỗi dạng "1.250.000 đ" hoặc "12 giao dịch" */
function AnimatedText({ text }) {
    if (typeof text === "number") {
        return (<CountUp value={text} format={(number) => Math.round(number).toLocaleString("vi-VN")}/>);
    }
    const match = typeof text === "string" ? text.match(/^(-?\d[\d.]*)(.*)$/) : null;
    if (!match)
        return <>{text}</>;
    const target = Number(match[1].replace(/\./g, ""));
    if (Number.isNaN(target))
        return <>{text}</>;
    return (<CountUp value={target} format={(number) => `${Math.round(number).toLocaleString("vi-VN")}${match[2]}`}/>);
}
function SummaryCompare({ diff, ready }) {
    if (!ready) {
        return (<div className="summary-compare flat">
        Chưa có dữ liệu tháng trước
      </div>);
    }
    /* Chênh lệch dưới 1 đ coi như bằng tháng trước */
    if (Math.abs(diff) < 1) {
        return (<div className="summary-compare flat">
        Bằng tháng trước
      </div>);
    }
    const isUp = diff > 0;
    const ArrowIcon = isUp ? TrendingUp : TrendingDown;
    return (<div className={`summary-compare ${isUp ? "up" : "down"}`} title={`${isUp ? "Nhiều hơn" : "Ít hơn"} tháng trước ${formatMoney(Math.abs(diff))}`}>
      <ArrowIcon size={13} strokeWidth={2.4}/>

      <strong>{formatCompareAmount(diff)}</strong>
    </div>);
}
function SummaryCard({ icon: Icon, title, value, className = "", compare, }) {
    return (<div className="summary-card">
      <div className="summary-title">
        <Icon size={20}/>

        {title}
      </div>

      {compare ? (<div className="summary-card-foot">
          <strong className={`summary-money ${className}`}>
            <CountUp value={value} format={formatMoney}/>
          </strong>

          <SummaryCompare diff={compare.diff} ready={compare.ready}/>
        </div>) : (<strong className={`summary-money ${className}`}>
          <CountUp value={value} format={formatMoney}/>
        </strong>)}
    </div>);
}
function AnalysisSummary({ label, value, className = "", }) {
    return (<div className="analysis-summary-box">
      <span>
        {label}
      </span>

      <strong className={className}>
        <CountUp value={value} format={formatMoney}/>
      </strong>
    </div>);
}
function MiniStat({ label, value, className = "", }) {
    return (<div className="mini-stat">
      <span>
        {label}
      </span>

      <strong className={className}>
        <AnimatedText text={value}/>
      </strong>
    </div>);
}
/* =========================================================
   THỐNG KÊ THÁNG
   Bảng thống kê 3 cột cân đối (Khoản · Số giao dịch · Số tiền)
   + bộ chọn tháng dạng viên thuốc ở bên phải.
========================================================= */
function MonthlyStatistics({ transactions, month, onMonthChange, calculateTotals, }) {
    const [yearText, monthText] = month.split("-");
    const year = Number(yearText);
    const monthNumber = Number(monthText);
    /* Xem nhiều năm: bấm vào "Năm ..." để mở bảng 12 năm, lật trang để xem thêm */
    const [yearsView, setYearsView] = useState(false);
    const [pageStart, setPageStart] = useState(Math.floor(year / 12) * 12);
    const data = useMemo(() => transactions.filter((item) => item.date && item.date.startsWith(month)), [transactions, month]);
    const totals = calculateTotals(data);
    const monthsWithData = useMemo(() => {
        const set = new Set();
        transactions.forEach((item) => {
            if (item.date)
                set.add(item.date.slice(0, 7));
        });
        return set;
    }, [transactions]);
    const yearsWithData = useMemo(() => {
        const set = new Set();
        monthsWithData.forEach((key) => set.add(Number(key.slice(0, 4))));
        return set;
    }, [monthsWithData]);
    const thisYearNumber = new Date().getFullYear();
    const countOf = (test) => data.filter(test).length;
    const goTo = (targetYear, targetMonth) => onMonthChange(`${targetYear}-${pad(targetMonth)}`);
    const shiftYear = (step) => goTo(year + step, monthNumber);
    const formatValue = (value, signed) => {
        const number = Number(value || 0);
        if (!signed)
            return formatMoney(Math.abs(number));
        if (number > 0)
            return `+ ${formatMoney(number)}`;
        if (number < 0)
            return `- ${formatMoney(Math.abs(number))}`;
        return "0 đ";
    };
    const kpiTiles = [
        {
            label: "Tổng đầu vào",
            sub: "Tiền được cho / lương",
            icon: ArrowDownCircle,
            count: countOf((i) => i.type === "income"),
            value: totals.income,
            tone: "income",
        },
        {
            label: "Tổng đầu ra",
            sub: "Ăn · Trọ · Chi khác",
            icon: ArrowUpCircle,
            count: countOf((i) => i.type === "expense"),
            value: totals.expense,
            tone: "expense",
        },
        {
            label: "Tổng Tip / Âm",
            sub: "Điều chỉnh trong tháng",
            icon: SlidersHorizontal,
            count: countOf((i) => i.type === "adjustment"),
            value: totals.adjustment,
            signed: true,
            tone: "tip",
        },
    ];
    const groups = [
        {
            title: "Chi tiêu",
            items: [
                {
                    label: "Tổng tiền ăn",
                    icon: Utensils,
                    count: countOf((i) => i.type === "expense" && i.category === "food"),
                    value: totals.food,
                    tone: "expense",
                },
                {
                    label: "Tổng tiền trọ",
                    icon: House,
                    count: countOf((i) => i.type === "expense" && i.category === "rent"),
                    value: totals.rent,
                    tone: "expense",
                },
                {
                    label: "Tổng chi khác",
                    icon: ShoppingBag,
                    count: countOf((i) => i.type === "expense" && i.category === "other"),
                    value: totals.other,
                    tone: "expense",
                },
            ],
        },
        {
            title: "Thu nhập & điều chỉnh",
            items: [
                {
                    label: "Tổng Tip / Âm",
                    icon: SlidersHorizontal,
                    count: countOf((i) => i.type === "adjustment"),
                    value: totals.adjustment,
                    signed: true,
                    tone: "tip",
                },
                {
                    label: "Tiền được cho / Tiền lương",
                    icon: Gift,
                    count: countOf((i) => i.type === "income"),
                    value: totals.income,
                    tone: "income",
                },
            ],
        },
        {
            title: "Tổng hợp",
            items: [
                {
                    label: "Tổng đầu vào",
                    icon: ArrowDownCircle,
                    count: countOf((i) => i.type === "income"),
                    value: totals.income,
                    tone: "income",
                    strong: true,
                },
                {
                    label: "Tổng đầu ra",
                    icon: ArrowUpCircle,
                    count: countOf((i) => i.type === "expense"),
                    value: totals.expense,
                    tone: "expense",
                    strong: true,
                },
                {
                    label: totals.remaining >= 0 ? "Dư cuối tháng" : "Âm cuối tháng",
                    icon: Wallet,
                    count: null,
                    value: Math.abs(totals.remaining),
                    tone: totals.remaining >= 0 ? "positive" : "expense",
                    final: true,
                },
            ],
        },
    ];
    const expenseRows = groups[0].items;
    return (<div className="ms2 ms3">
      <div className="ms3-main">
        <div className={`ms2-hero ${totals.remaining >= 0 ? "ok" : "warn"}`}>
          <div className="ms2-hero-main">
            <span>{formatMonth(month)}</span>
            <strong>{totals.remaining >= 0 ? "+" : "-"}{formatMoney(Math.abs(totals.remaining))}</strong>
            <em>{totals.remaining >= 0 ? "Dư cuối tháng" : "Âm cuối tháng"} · {data.length} giao dịch</em>
          </div>
          <div className="ms2-split">
            <div className="ms2-split-bar">
              <i className="in" style={{ width: `${totals.income + totals.expense ? (totals.income / (totals.income + totals.expense)) * 100 : 50}%` }}/>
              <i className="out"/>
            </div>
            <div className="ms2-split-legend">
              <span><i className="in"/> Thu {formatMoney(totals.income)}</span>
              <span><i className="out"/> Chi {formatMoney(totals.expense)}</span>
            </div>
          </div>
        </div>

        <div className="ms3-kpis">
          {kpiTiles.map(({ label, sub, icon: Icon, count, value, signed, tone }) => (<article className={`ms3-kpi is-${tone}`} key={label}>
              <div className="ms3-kpi-top">
                <i className={`ms2-ico is-${tone}`}><Icon size={16} strokeWidth={2.2}/></i>
                <span>{label}</span>
              </div>
              <strong className={`is-${tone}`}>{formatValue(value, signed)}</strong>
              <small>{count} giao dịch · {sub}</small>
            </article>))}
        </div>

        <div className="ms2-table ms3-table" role="table" aria-label="Bảng thống kê tháng">
          <div className="ms2-head" role="row">
            <span>Chi tiêu theo khoản</span>
            <span>Giao dịch</span>
            <span>Tỷ trọng</span>
            <span>Tổng tiền</span>
          </div>

          {expenseRows.map(({ label, icon: Icon, count, value, tone }) => {
            const share = totals.expense ? Math.round((value / totals.expense) * 100) : 0;
            return (<div key={label} role="row" className="ms2-row">
                <span className="ms2-label">
                  <i className={`ms2-ico is-${tone}`}><Icon size={16} strokeWidth={2.2}/></i>
                  {label}
                </span>
                <span className="ms2-count">{count}</span>
                <span className="ms2-share">
                  <span className="ms2-meter"><i className={`is-${tone}`} style={{ width: `${Math.min(100, share)}%` }}/></span>
                  <em>{share}%</em>
                </span>
                <strong className={`ms2-value is-${tone}`}>{formatValue(value, false)}</strong>
              </div>);
        })}

          <div role="row" className="ms2-row is-final">
            <span className="ms2-label">
              <i className={`ms2-ico is-${totals.remaining >= 0 ? "positive" : "expense"}`}><Wallet size={16} strokeWidth={2.2}/></i>
              {totals.remaining >= 0 ? "Dư cuối tháng" : "Âm cuối tháng"}
            </span>
            <span className="ms2-count">—</span>
            <span className="ms2-share"/>
            <strong className={`ms2-value is-${totals.remaining >= 0 ? "positive" : "expense"}`}>{formatValue(Math.abs(totals.remaining), false)}</strong>
          </div>
        </div>
      </div>

        <aside className="ms-picker" aria-label="Chọn tháng thống kê">
          <div className="ms-picker-title">
            <ModernCalendarIcon size={16}/>
            Chọn tháng thống kê
          </div>

          <div className="ms-year-pill">
            <button type="button" aria-label={yearsView ? "Các năm trước" : "Năm trước"} onClick={() => yearsView ? setPageStart((value) => value - 12) : shiftYear(-1)}>
              <ChevronLeft size={16}/>
            </button>

            <button type="button" className="ms-year-title" title={yearsView ? "Về chọn tháng" : "Bấm để xem nhiều năm"} aria-expanded={yearsView} onClick={() => {
            setPageStart(Math.floor(year / 12) * 12);
            setYearsView((value) => !value);
        }}>
              {yearsView ? `${pageStart} – ${pageStart + 11}` : `Năm ${year}`}
            </button>

            <button type="button" aria-label={yearsView ? "Các năm sau" : "Năm sau"} onClick={() => yearsView ? setPageStart((value) => value + 12) : shiftYear(1)}>
              <ChevronRight size={16}/>
            </button>
          </div>

          {yearsView ? (<div className="ms-month-grid">
              {Array.from({ length: 12 }, (_, index) => pageStart + index).map((value) => (<button key={value} type="button" aria-pressed={value === year} className={`ms-month-pill ${value === year ? "active" : ""} ${yearsWithData.has(value) ? "has-data" : ""} ${value === thisYearNumber ? "is-current" : ""}`} onClick={() => {
                    goTo(value, monthNumber);
                    setYearsView(false);
                }}>
                    {value}
                  </button>))}
            </div>) : (<div className="ms-month-grid">
              {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => {
                const key = `${year}-${pad(value)}`;
                return (<button key={value} type="button" aria-pressed={value === monthNumber} className={`ms-month-pill ${value === monthNumber ? "active" : ""} ${monthsWithData.has(key) ? "has-data" : ""} ${key === currentMonthKey() ? "is-current" : ""}`} onClick={() => goTo(year, value)}>
                    Tháng {value}
                  </button>);
            })}
            </div>)}

          <button type="button" className="ms-current-pill" onClick={() => {
            onMonthChange(currentMonthKey());
            setYearsView(false);
        }}>
            Về tháng hiện tại
          </button>

          <div className="ms-picker-foot">
            <strong>{formatMonth(month)}</strong>
            <span>{data.length} giao dịch</span>
          </div>
        </aside>
    </div>);
}
/* =========================================================
   NGÂN SÁCH — khối tổng quan (vòng tiến độ + 3 chỉ số + cơ cấu ngân sách)
========================================================= */
function BudgetHero({ total, used, remaining, percent, shares }) {
    const pct = Math.max(0, Number(percent || 0));
    const shown = Math.min(100, pct);
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const status = total <= 0 ? "none" : pct >= 100 ? "danger" : pct >= 80 ? "warning" : "safe";
    const statusText = {
        none: "Chưa thiết lập ngân sách",
        safe: "Trong tầm kiểm soát",
        warning: "Sắp chạm trần ngân sách",
        danger: "Đã vượt ngân sách",
    }[status];
    const stats = [
        { key: "total", icon: Target, label: "Tổng ngân sách", value: total },
        { key: "used", icon: TrendingDown, label: "Đã chi", value: used },
        {
            key: remaining >= 0 ? "left" : "over",
            icon: CircleDollarSign,
            label: remaining >= 0 ? "Ngân sách còn" : "Vượt ngân sách",
            value: Math.abs(remaining),
        },
    ];
    const segments = [
        { key: "food", label: "Tiền ăn" },
        { key: "rent", label: "Tiền trọ" },
        { key: "other", label: "Chi khác" },
    ];
    return (<section className={`bgt-hero is-${status}`}>
      <div className="bgt-ring">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="bgt-ring-bg" cx="50" cy="50" r={radius}/>
          <circle className="bgt-ring-fg" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - shown / 100)} transform="rotate(-90 50 50)"/>
        </svg>

        <div className="bgt-ring-text">
          <strong>
            <CountUp value={percent} decimals={1} format={(number) => `${number.toFixed(1)}%`}/>
          </strong>
          <span>đã dùng</span>
        </div>
      </div>

      <div className="bgt-main">
        <div className="bgt-top">
          <span className="bgt-status">
            <i />
            {statusText}
          </span>

          <div className="bgt-legend">
            {segments.map((segment) => (<span key={segment.key}>
                <i className={segment.key}/>
                {segment.label}{" "}
                <b>{total > 0 ? formatShare(shares[segment.key]) : "—"}</b>
              </span>))}
          </div>
        </div>

        <div className="bgt-stats">
          {stats.map(({ key, icon: StatIcon, label, value }) => (<div className={`bgt-stat ${key}`} key={key}>
              <i className="bgt-stat-ico">
                <StatIcon size={18}/>
              </i>
              <div>
                <span>{label}</span>
                <strong>
                  <CountUp value={value} format={formatMoney}/>
                </strong>
              </div>
            </div>))}
        </div>

        <div className="bgt-alloc-bar" aria-hidden="true">
          {total > 0 &&
            segments.map((segment) => (<i key={segment.key} className={segment.key} style={{ width: `${shares[segment.key]}%` }}/>))}
        </div>
      </div>
    </section>);
}
/* =========================================================
   NGÂN SÁCH — tỷ lệ (tổng = 100%) và chọn tháng bằng lịch
========================================================= */
/* Chia tỷ lệ từng khoản trên tổng ngân sách, làm tròn 0,1% sao cho cộng lại đúng 100% */
function getBudgetShares(budget) {
    const keys = ["food", "rent", "other"];
    const values = keys.map((key) => Math.max(0, Number((budget && budget[key]) || 0)));
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total <= 0)
        return { food: 0, rent: 0, other: 0 };
    const raw = values.map((value) => (value / total) * 1000);
    const floors = raw.map(Math.floor);
    let left = 1000 - floors.reduce((sum, value) => sum + value, 0);
    raw
        .map((value, index) => ({ index, fraction: value - floors[index] }))
        .sort((a, b) => b.fraction - a.fraction)
        .forEach(({ index }) => {
        if (left > 0) {
            floors[index] += 1;
            left -= 1;
        }
    });
    return {
        food: floors[0] / 10,
        rent: floors[1] / 10,
        other: floors[2] / 10,
    };
}
function formatShare(value) {
    return `${Number(Number(value || 0).toFixed(1))}%`;
}
function BudgetMonthPicker({ month, budgets, onChange }) {
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(Number(month.split("-")[0]));
    const wrapRef = useRef(null);
    const activeMonth = Number(month.split("-")[1]);
    const activeYear = Number(month.split("-")[0]);
    useEffect(() => {
        if (open)
            setViewYear(Number(month.split("-")[0]));
    }, [open, month]);
    useEffect(() => {
        if (!open)
            return undefined;
        const onPointer = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);
    const hasBudget = (key) => {
        const item = budgets[key];
        return (!!item &&
            Number(item.food || 0) + Number(item.rent || 0) + Number(item.other || 0) > 0);
    };
    return (<div className="bmp" ref={wrapRef}>
      <button type="button" className={`bmp-trigger ${open ? "active" : ""}`} aria-haspopup="dialog" aria-expanded={open} aria-label={`Chọn tháng thiết lập ngân sách, đang chọn ${formatMonth(month)}`} title={formatMonth(month)} onClick={() => setOpen((value) => !value)}>
        <ModernCalendarIcon size={18}/>
      </button>

      {open && (<div className="bmp-pop" role="dialog" aria-label="Chọn tháng thiết lập ngân sách">
          <div className="bmp-year">
            <button type="button" aria-label="Năm trước" onClick={() => setViewYear((value) => value - 1)}>
              <ChevronLeft size={16}/>
            </button>

            <strong>Năm {viewYear}</strong>

            <button type="button" aria-label="Năm sau" onClick={() => setViewYear((value) => value + 1)}>
              <ChevronRight size={16}/>
            </button>
          </div>

          <div className="bmp-grid">
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => {
                const key = `${viewYear}-${pad(value)}`;
                const selected = viewYear === activeYear && value === activeMonth;
                return (<button key={value} type="button" aria-pressed={selected} className={`bmp-month ${selected ? "active" : ""} ${hasBudget(key) ? "has-budget" : ""}`} onClick={() => {
                        onChange(key);
                        setOpen(false);
                    }}>
                  Tháng {value}
                </button>);
            })}
          </div>

          <div className="bmp-foot">
            <i />
            Tháng đã thiết lập ngân sách
          </div>
        </div>)}
    </div>);
}
/* =========================================================
   LOGO LỊCH HIỆN ĐẠI + Ô CHỌN NGÀY (BẢNG LỊCH TRONG 1 Ô VUÔNG)
========================================================= */
function ModernCalendarIcon({ size = 18 }) {
    return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flex: "0 0 auto" }}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="5.5" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M3.4 9.6h17.2" stroke="currentColor" strokeWidth="1.7"/>
      <path d="M8 2.8v3.6M16 2.8v3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8.2" cy="13.6" r="1.15" fill="currentColor"/>
      <circle cx="12" cy="13.6" r="1.15" fill="currentColor"/>
      <circle cx="15.8" cy="13.6" r="1.15" fill="currentColor"/>
      <circle cx="8.2" cy="17.2" r="1.15" fill="currentColor"/>
      <circle cx="12" cy="17.2" r="1.15" fill="currentColor"/>
    </svg>);
}
/* =========================================================
   MENU TÀI KHOẢN — nút "v" mở ô vuông nhỏ bên cạnh
========================================================= */
const ACCOUNT_MENU_SIZE = 284;
function AccountMenuButton({ accounts, selectedId, onSelect, getBalance }) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0, height: ACCOUNT_MENU_SIZE });
    const buttonRef = useRef(null);
    const popRef = useRef(null);
    function toggle() {
        if (open) {
            setOpen(false);
            return;
        }
        const rect = buttonRef.current.getBoundingClientRect();
        const card = buttonRef.current.closest(".qa-card");
        const box = card
            ? card.getBoundingClientRect()
            : { left: 8, top: 8, right: window.innerWidth - 8, bottom: window.innerHeight - 8 };
        /* Ô danh sách nằm gọn trong bảng Thêm giao dịch, ngay bên phải nút "v" */
        const height = Math.min(ACCOUNT_MENU_SIZE, Math.max(200, box.bottom - box.top - 16));
        let left = rect.right + 8;
        if (left + ACCOUNT_MENU_SIZE > box.right - 8) {
            left = Math.max(box.left + 8, box.right - ACCOUNT_MENU_SIZE - 8);
        }
        let top = rect.top + rect.height / 2 - height / 2;
        top = Math.min(Math.max(box.top + 8, top), box.bottom - height - 8);
        setPos({ top, left, height });
        setOpen(true);
    }
    useEffect(() => {
        if (!open)
            return undefined;
        const onDown = (event) => {
            if (popRef.current &&
                !popRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === "Escape")
                setOpen(false);
        };
        const onScroll = (event) => {
            if (popRef.current && popRef.current.contains(event.target))
                return;
            setOpen(false);
        };
        const close = () => setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", onScroll, true);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", onScroll, true);
        };
    }, [open]);
    return (<>
      <button type="button" ref={buttonRef} className={`qa-acc-more ${open ? "open" : ""}`} aria-haspopup="listbox" aria-expanded={open} aria-label="Xem tất cả tài khoản" title="Xem tất cả tài khoản" onClick={toggle}>
        <ChevronDown size={18}/>
      </button>

      {open &&
            createPortal(<div ref={popRef} className="qa-pop" role="listbox" aria-label="Tất cả tài khoản" style={{
                    top: pos.top,
                    left: pos.left,
                    width: ACCOUNT_MENU_SIZE,
                    height: pos.height || ACCOUNT_MENU_SIZE,
                }}>
            <div className="qa-pop-title">Tất cả tài khoản</div>

            <div className="qa-pop-list">
              {accounts.map((account) => {
                    const accConfig = accountTypes[account.type] || accountTypes.bank;
                    const AccIcon = accConfig.icon;
                    const on = String(selectedId) === String(account.id);
                    return (<button key={account.id} type="button" role="option" aria-selected={on} className={`qa-pop-item ${account.type || "bank"} ${on ? "active" : ""}`} onClick={() => {
                            onSelect(account);
                            setOpen(false);
                        }}>
                    <i>
                      <AccIcon size={15}/>
                    </i>

                    <span>
                      <b>{account.name}</b>
                      <small>{formatMoney(getBalance(account))}</small>
                    </span>

                    {on && <CheckCircle2 size={15}/>}
                  </button>);
                })}
            </div>
          </div>, document.body)}
    </>);
}
const DATEPICKER_SIZE = 328;
function DatePicker({ value, onChange, className = "", placeholder = "dd/mm/yyyy", clearable = false, customizable = false, }) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("calendar");
    const [draft, setDraft] = useState({ day: 1, month: 1, year: 2026 });
    const [view, setView] = useState(currentMonthKey());
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);
    const popRef = useRef(null);
    const [viewYear, viewMonth] = view.split("-").map(Number);
    const todayKey = todayString();
    function emit(next) {
        if (onChange)
            onChange({ target: { value: next } });
    }
    function openPicker() {
        const rect = buttonRef.current.getBoundingClientRect();
        const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - DATEPICKER_SIZE - 8));
        let top = rect.bottom + 8;
        if (top + DATEPICKER_SIZE > window.innerHeight - 8) {
            top = Math.max(8, rect.top - DATEPICKER_SIZE - 8);
        }
        setPos({ top, left });
        setView(value ? String(value).slice(0, 7) : currentMonthKey());
        setMode("calendar");
        setOpen(true);
    }
    /* ----- Phần Tuỳ chỉnh: chọn ngày, tháng, năm tuỳ ý ----- */
    const thisYear = new Date().getFullYear();
    const draftYearOptions = [];
    for (let y = Math.min(thisYear - 30, draft.year); y <= Math.max(thisYear + 10, draft.year); y += 1) {
        draftYearOptions.push(y);
    }
    const draftDaysInMonth = new Date(draft.year, draft.month, 0).getDate();
    const draftDay = Math.min(draft.day, draftDaysInMonth);
    const draftKey = `${draft.year}-${pad(draft.month)}-${pad(draftDay)}`;
    const draftWeekday = WEEK_FULL[(new Date(draft.year, draft.month - 1, draftDay).getDay() + 6) % 7];
    function openCustom() {
        const base = value ? String(value) : todayKey;
        const [y, m, d] = base.split("-").map(Number);
        setDraft({ day: d || 1, month: m || 1, year: y || thisYear });
        setMode("custom");
    }
    useEffect(() => {
        if (!open)
            return undefined;
        const onDown = (event) => {
            if (popRef.current &&
                !popRef.current.contains(event.target) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === "Escape")
                setOpen(false);
        };
        const close = () => setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, true);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [open]);
    const cells = useMemo(() => {
        const first = new Date(viewYear, viewMonth - 1, 1).getDay();
        const start = first === 0 ? 6 : first - 1;
        const days = new Date(viewYear, viewMonth, 0).getDate();
        return [
            ...Array(start).fill(null),
            ...Array.from({ length: days }, (_, i) => i + 1),
        ];
    }, [viewYear, viewMonth]);
    function shiftMonth(step) {
        const date = new Date(viewYear, viewMonth - 1 + step, 1);
        setView(`${date.getFullYear()}-${pad(date.getMonth() + 1)}`);
    }
    return (<>
      <button type="button" ref={buttonRef} className={`dp-trigger ${open ? "open" : ""} ${className}`} aria-haspopup="dialog" aria-expanded={open} onClick={() => (open ? setOpen(false) : openPicker())}>
        <span className={value ? "" : "dp-placeholder"}>
          {value ? formatDate(value) : placeholder}
        </span>

        <ModernCalendarIcon size={17}/>
      </button>

      {open &&
            createPortal(<div ref={popRef} className="dp-pop" role="dialog" aria-label="Chọn ngày" style={{
                    top: pos.top,
                    left: pos.left,
                    width: DATEPICKER_SIZE,
                    height: DATEPICKER_SIZE,
                }}>
            {mode === "calendar" ? (<>
                <div className="dp-head">
                  <button type="button" aria-label="Tháng trước" onClick={() => shiftMonth(-1)}>
                    <ChevronLeft size={17}/>
                  </button>

                  <strong>{`Tháng ${viewMonth}/${viewYear}`}</strong>

                  <button type="button" aria-label="Tháng sau" onClick={() => shiftMonth(1)}>
                    <ChevronRight size={17}/>
                  </button>
                </div>

                <div className="dp-weekdays">
                  {WEEK_SHORT.map((label) => (<span key={label}>{label}</span>))}
                </div>

                <div className="dp-grid">
                  {cells.map((day, index) => {
                        if (!day)
                            return <i key={`empty-${index}`}/>;
                        const key = `${view}-${pad(day)}`;
                        return (<button key={key} type="button" className={`dp-day ${key === value ? "selected" : ""} ${key === todayKey ? "today" : ""}`} onClick={() => {
                                emit(key);
                                setOpen(false);
                            }}>
                        {day}
                      </button>);
                    })}
                </div>

                <div className="dp-foot">
                  {customizable && (<button type="button" onClick={openCustom}>
                      Tuỳ chỉnh
                    </button>)}

                  <button type="button" className="primary" onClick={() => {
                        emit(todayKey);
                        setOpen(false);
                    }}>
                    Hôm nay
                  </button>

                  {clearable && value && (<button type="button" onClick={() => {
                            emit("");
                            setOpen(false);
                        }}>
                      Xóa
                    </button>)}
                </div>
              </>) : (<>
                <div className="dp-custom">
                  <div className="dp-custom-title">Tuỳ chỉnh</div>

                  <div className="dp-custom-grid">
                    <label>
                      <span>Ngày</span>

                      <select value={draftDay} onChange={(event) => setDraft({
                        ...draft,
                        day: Number(event.target.value),
                    })}>
                        {Array.from({ length: draftDaysInMonth }, (_, i) => i + 1).map((d) => (<option key={d} value={d}>
                            {d}
                          </option>))}
                      </select>
                    </label>

                    <label>
                      <span>Tháng</span>

                      <select value={draft.month} onChange={(event) => setDraft({
                        ...draft,
                        month: Number(event.target.value),
                    })}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (<option key={m} value={m}>
                              {m}
                            </option>))}
                      </select>
                    </label>

                    <label>
                      <span>Năm</span>

                      <select value={draft.year} onChange={(event) => setDraft({
                        ...draft,
                        year: Number(event.target.value),
                    })}>
                        {draftYearOptions.map((y) => (<option key={y} value={y}>
                            {y}
                          </option>))}
                      </select>
                    </label>
                  </div>

                  <div className="dp-custom-preview">
                    <strong>
                      {draftWeekday}, {pad(draftDay)}/{pad(draft.month)}/
                      {draft.year}
                    </strong>

                    <span>Ngày sẽ được chọn</span>
                  </div>
                </div>

                <div className="dp-foot">
                  <button type="button" onClick={() => setMode("calendar")}>
                    Quay lại
                  </button>

                  <button type="button" className="primary" onClick={() => {
                        emit(draftKey);
                        setOpen(false);
                    }}>
                    Chọn ngày này
                  </button>
                </div>
              </>)}
          </div>, document.body)}
    </>);
}
/* =========================================================
   Ô NHẬP SỐ TIỀN — tự thêm dấu chấm ngăn cách mỗi 3 số từ cuối lên
   (giá trị lưu trong state vẫn là chuỗi chữ số thuần, ví dụ "1500000")
========================================================= */
function formatThousands(value) {
    const digits = String(value ?? "")
        .replace(/\D/g, "")
        .replace(/^0+(?=\d)/, "");
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
function MoneyInput({ value, onValueChange, ...rest }) {
    const inputRef = useRef(null);
    const caretDigits = useRef(null);
    const display = formatThousands(value);
    /* Giữ con trỏ đúng vị trí sau khi chèn thêm dấu chấm */
    useLayoutEffect(() => {
        const element = inputRef.current;
        if (caretDigits.current === null || !element)
            return;
        let remaining = caretDigits.current;
        let position = 0;
        while (position < display.length && remaining > 0) {
            if (/\d/.test(display[position]))
                remaining -= 1;
            position += 1;
        }
        element.setSelectionRange(position, position);
        caretDigits.current = null;
    }, [display]);
    return (<input {...rest} ref={inputRef} type="text" inputMode="numeric" autoComplete="off" value={display} onChange={(event) => {
            const raw = event.target.value;
            const caret = event.target.selectionStart ?? raw.length;
            caretDigits.current = raw.slice(0, caret).replace(/\D/g, "").length;
            onValueChange(raw.replace(/\D/g, "").replace(/^0+(?=\d)/, ""));
        }}/>);
}
/* Huy hiệu hiển thị tháng đang xem (thay cho dòng chữ đơn lẻ) */
function MonthBadge({ month, label = "", compact = false, live = false }) {
    return (<div className={`month-badge ${compact ? "compact" : ""}`} title={`Đang xem ${formatMonth(month)}`}>
      {live ? (<i className="month-badge-dot"/>) : (<ModernCalendarIcon size={compact ? 13 : 15}/>)}

      {label && <em>{label}</em>}

      <strong>{formatMonth(month)}</strong>
    </div>);
}
function PanelTitle({ title, subtitle, }) {
    return (<div className="panel-title">
      <h2>
        {title}
      </h2>

      <span>
        {subtitle}
      </span>
    </div>);
}
function FormField({ label, children, }) {
    return (<label className="form-field">
      <span>
        {label}
      </span>

      {children}
    </label>);
}
function TabButton({ active, onClick, icon: Icon, children, }) {
    return (<button type="button" className={`tab-button ${active ? "active" : ""}`} onClick={onClick}>
      <Icon size={17}/>

      {children}
    </button>);
}
function MoneyRow({ label, value, strong = false, }) {
    return (<div className={`money-row ${strong ? "strong" : ""}`}>
      <span>
        {label}
      </span>

      <strong>
        {formatMoney(value)}
      </strong>
    </div>);
}
function CalculationRow({ label, sign, value, className = "", }) {
    return (<div className="calculation-row">
      <span>
        {label}
      </span>

      <strong className={className}>
        {sign} {formatMoney(value)}
      </strong>
    </div>);
}
/* =========================================================
   NỢ / VAY  và  TIẾT KIỆM
   Dùng chung một giao diện: "total" là số nợ / số cho vay / mục tiêu,
   "done" là số đã trả / đã thu / đã tiết kiệm.
   Trang Vay / Nợ có 2 chiều: "owe" (tôi nợ) và "lend" (tôi cho vay).
========================================================= */
const goalConfigs = {
    debt: {
        icon: CreditCard,
        listTitle: "Danh sách khoản vay / nợ",
        listSubtitle: "",
        empty: "Chưa có khoản vay / nợ nào.",
        capAtTotal: true,
    },
    saving: {
        icon: TrendingUp,
        addTitle: "Thêm khoản đầu tư",
        addSubtitle: "",
        nameLabel: "Tên khoản đầu tư",
        namePlaceholder: "Ví dụ: Sổ tiết kiệm 12 tháng",
        totalLabel: "Số tiền mục tiêu",
        doneLabel: "Đã đầu tư",
        dateLabel: "Ngày dự kiến (không bắt buộc)",
        addButton: "THÊM KHOẢN ĐẦU TƯ",
        listTitle: "Danh sách khoản đầu tư",
        listSubtitle: "Theo dõi lãi suất, kỳ hạn và tiến độ từng khoản",
        empty: "Chưa có khoản đầu tư nào.",
        statTotal: "TỔNG MỤC TIÊU",
        statDone: "ĐÃ ĐẦU TƯ",
        statRemain: "CÒN THIẾU",
        remainLabel: "Còn thiếu",
        actionLabel: "Góp thêm",
        actionPlaceholder: "Số tiền góp",
        dateInfo: "Dự kiến",
        actionDateLabel: "Ngày góp",
        finished: "Đạt mục tiêu",
        capAtTotal: false,
    },
};
/* Ý nghĩa:
   - "Khoản vay" (key lend): bạn đã vay của người khác  → thuộc ô PHẢI TRẢ
   - "Khoản nợ"  (key owe) : người khác nợ bạn          → thuộc ô PHẢI THU
   Giữ nguyên key cũ để dữ liệu đã lưu không bị đổi. */
const debtDirections = {
    lend: {
        tag: "Khoản vay",
        addTitle: "",
        addSubtitle: "",
        nameLabel: "Ai vay",
        namePlaceholder: "Ví dụ: Bạn Minh",
        totalLabel: "Số tiền",
        doneLabel: "Đã trả",
        dateLabel: "Ngày vay",
        addButton: "THÊM KHOẢN VAY",
        remainLabel: "Còn phải trả",
        actionLabel: "Ghi trả",
        actionPlaceholder: "Số tiền trả",
        dateInfo: "Ngày vay",
        actionDateLabel: "Ngày trả",
        finished: "Đã trả hết",
    },
    owe: {
        tag: "Khoản nợ",
        addTitle: "",
        addSubtitle: "",
        nameLabel: "Nợ ai",
        namePlaceholder: "Ví dụ: Bạn Minh",
        totalLabel: "Số tiền",
        doneLabel: "Đã thu hồi",
        dateLabel: "Ngày nợ",
        addButton: "THÊM KHOẢN NỢ",
        remainLabel: "Còn phải thu",
        actionLabel: "Ghi thu",
        actionPlaceholder: "Số tiền thu",
        dateInfo: "Ngày nợ",
        actionDateLabel: "Ngày thu",
        finished: "Đã thu đủ",
    },
};
function getGoalLabels(kind, direction) {
    if (kind === "debt") {
        return {
            ...goalConfigs.debt,
            ...(debtDirections[direction] || debtDirections.owe),
        };
    }
    return goalConfigs[kind];
}
/* Ngày hoạt động gần nhất của một khoản (ngày ghi trả/thu cuối, hoặc ngày tạo) */
function getGoalLastDate(item) {
    const dates = (item.history || []).map((entry) => String(entry.date || ""));
    dates.sort();
    return dates[dates.length - 1] || item.date || item.createdAt || "";
}
function isGoalFinished(item) {
    const total = Number(item.total || 0);
    return total > 0 && Number(item.done || 0) >= total;
}
/* ---------- Đầu tư: nhãn theo danh mục + tính đáo hạn ---------- */
function investLabels(cat) {
    if (cat === "bank-loan") {
        return { name: "Tên khoản vay", ph: "Ví dụ: Vay mua xe - Vietcombank", total: "Số tiền vay", done: "Đã trả", remain: "Còn nợ", rate: "Lãi suất vay (%/năm)", dateLabel: "Ngày giải ngân", interest: "Lãi ước tính", action: "Trả nợ", actionPh: "Số tiền trả", finished: "Đã tất toán", icon: Landmark, tone: "loan" };
    }
    if (cat === "saving") {
        return { name: "Tên sổ tiết kiệm", ph: "Ví dụ: Sổ tiết kiệm 12 tháng", total: "Số tiền gửi", done: "Đã gửi", remain: "Còn thiếu", rate: "Lãi suất gửi (%/năm)", dateLabel: "Ngày gửi", interest: "Lãi dự kiến", action: "Gửi thêm", actionPh: "Số tiền gửi", finished: "Đủ tiền gửi", icon: PiggyBank, tone: "save" };
    }
    return { name: "Tên khoản đầu tư", ph: "Ví dụ: Vàng, chứng chỉ quỹ...", total: "Số tiền mục tiêu", done: "Đã đầu tư", remain: "Còn thiếu", rate: "Lãi suất / lợi nhuận (%/năm)", dateLabel: "Ngày bắt đầu (không bắt buộc)", interest: "Lãi dự kiến", action: "Góp thêm", actionPh: "Số tiền góp", finished: "Đạt mục tiêu", icon: TrendingUp, tone: "other" };
}
function upperFirst(text) {
    const value = String(text || "");
    return value.charAt(0).toLocaleUpperCase("vi-VN") + value.slice(1);
}
function addMonthsToDate(dateStr, months) {
    const [y, m, d] = String(dateStr || "").split("-").map(Number);
    if (!y || !m || !d)
        return "";
    const target = new Date(y, m - 1 + months, 1);
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
    return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(Math.min(d, last))}`;
}
function daysUntil(dateStr) {
    const [y, m, d] = String(dateStr).split("-").map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}
function GoalLedger({ kind, items, setItems, categories = [], setCategories, playSound, successSound, deleteSound, }) {
    const baseConfig = goalConfigs[kind];
    const Icon = baseConfig.icon;
    const isDebt = kind === "debt";
    const [form, setForm] = useState({
        direction: "lend",
        category: categories[0]?.id || "saving",
        name: "",
        total: "",
        done: "",
        date: "",
        rate: "",
        term: "",
        termUnit: "month",
    });
    const [amounts, setAmounts] = useState({});
    const [payDates, setPayDates] = useState({});
    /* ----- Trang Đầu tư: danh mục ----- */
    const [catFilter, setCatFilter] = useState("all");
    const [addingCategory, setAddingCategory] = useState(false);
    const [newCategory, setNewCategory] = useState("");
    const categoryOf = (item) => item.category || "saving";
    const categoryName = (id) => categories.find((category) => category.id === id)?.name ||
        "Chưa phân loại";
    /* Danh mục đang chọn trong form luôn phải còn tồn tại */
    const formCategory = categories.some((c) => c.id === form.category)
        ? form.category
        : categories[0]?.id || "";
    function addCategory(event) {
        event.preventDefault();
        const name = newCategory.trim().slice(0, 40);
        if (!name)
            return;
        if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
            alert("Danh mục này đã có.");
            return;
        }
        const category = { id: `cat-${createId()}`, name };
        setCategories((old) => [...old, category]);
        setCatFilter(category.id);
        setForm((old) => ({ ...old, category: category.id }));
        setNewCategory("");
        setAddingCategory(false);
        successSound();
    }
    function removeCategory(id) {
        const used = items.some((item) => categoryOf(item) === id);
        if (used) {
            alert("Danh mục này đang có khoản đầu tư. Hãy xoá hoặc chuyển các khoản đó trước.");
            return;
        }
        if (!window.confirm(`Xóa danh mục "${categoryName(id)}"?`))
            return;
        setCategories((old) => old.filter((category) => category.id !== id));
        setCatFilter("all");
        deleteSound();
    }
    /* Trang Vay / Nợ: nút nào đang được chọn thì danh sách hiện theo nút đó
       "pay" = Phải trả (các khoản vay) · "collect" = Phải thu (các khoản nợ) · "history" = Lịch sử */
    const [tab, setTab] = useState("pay");
    /* Nhãn của form thay đổi theo chiều đang chọn (khoản vay / khoản nợ) */
    const formConfig = getGoalLabels(kind, form.direction);
    /* Cộng dồn: số còn lại và đã trả/thu */
    const sumBy = (list) => list.reduce((sum, item) => {
        const total = Number(item.total || 0);
        const done = Number(item.done || 0);
        return {
            total: sum.total + total,
            done: sum.done + done,
            remain: sum.remain + Math.max(0, total - done),
        };
    }, { total: 0, done: 0, remain: 0 });
    const allTotals = sumBy(items);
    /* Chỉ những khoản CHƯA ghi xong mới nằm trong danh sách;
       khoản ghi xong tự chuyển sang Lịch sử */
    /* Phải trả = khoản vay (bạn vay người khác) · Phải thu = khoản nợ (người khác nợ bạn) */
    const payOpen = items.filter((item) => item.direction === "lend" && !isGoalFinished(item));
    const collectOpen = items.filter((item) => (item.direction || "owe") === "owe" && !isGoalFinished(item));
    const finishedItems = items
        .filter(isGoalFinished)
        .sort((a, b) => getGoalLastDate(b).localeCompare(getGoalLastDate(a)));
    const payTotals = sumBy(payOpen);
    const collectTotals = sumBy(collectOpen);
    const finishedTotals = sumBy(finishedItems);
    function addItem(event) {
        event.preventDefault();
        const name = form.name.trim();
        const total = Math.abs(Number(form.total));
        let done = Math.abs(Number(form.done || 0));
        if (!name || !total) {
            alert(`Vui lòng nhập ${formConfig.nameLabel.toLowerCase()} và ${formConfig.totalLabel.toLowerCase()}.`);
            return;
        }
        if (baseConfig.capAtTotal) {
            done = Math.min(done, total);
        }
        /* Đầu tư / gửi tiết kiệm: không còn nhập "đã gửi" lúc tạo — bắt đầu từ 0 */
        if (!isDebt && formCategory !== "bank-loan")
            done = 0;
        setItems((old) => [
            {
                id: createId(),
                ...(isDebt
                    ? { direction: form.direction }
                    : {
                        category: formCategory,
                        rate: Number(form.rate) || 0,
                        term: Math.floor(Number(form.term)) || 0,
                        termUnit: form.termUnit,
                    }),
                name,
                total,
                done,
                date: form.date || "",
                createdAt: todayString(),
            },
            ...old,
        ]);
        /* Thêm xong thì chuyển danh sách sang đúng loại vừa thêm */
        if (isDebt)
            setTab(form.direction === "lend" ? "pay" : "collect");
        else if (catFilter !== "all")
            setCatFilter(formCategory);
        setForm({ ...form, name: "", total: "", done: "", date: "", rate: "", term: "" });
        successSound();
    }
    function addAmount(item) {
        const value = Number(amounts[item.id]);
        if (!value)
            return;
        setItems((old) => old.map((current) => {
            if (current.id !== item.id)
                return current;
            let nextDone = Math.max(0, Number(current.done || 0) + value);
            if (baseConfig.capAtTotal) {
                nextDone = Math.min(nextDone, Number(current.total || 0));
            }
            return {
                ...current,
                done: nextDone,
                history: [
                    ...(current.history || []),
                    {
                        id: createId(),
                        date: payDates[item.id] || todayString(),
                        amount: value,
                    },
                ],
            };
        }));
        setAmounts((old) => ({ ...old, [item.id]: "" }));
        successSound();
    }
    function removeItem(item) {
        if (!window.confirm(`Xóa "${item.name}"?`))
            return;
        setItems((old) => old.filter((current) => current.id !== item.id));
        deleteSound();
    }
    /* Một dòng trong danh sách. readOnly = dòng trong Lịch sử (đã ghi xong, không còn ô ghi thêm) */
    function renderRow(item, readOnly = false, forcedDirection = null) {
        const rowConfig = getGoalLabels(kind, forcedDirection || item.direction || "owe");
        const total = Number(item.total || 0);
        const done = Number(item.done || 0);
        const remain = Math.max(0, total - done);
        const percent = total
            ? Math.min(100, Math.round((done / total) * 100))
            : 0;
        const isFinished = isGoalFinished(item);
        const history = [...(item.history || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)) ||
            String(b.id).localeCompare(String(a.id)));
        return (<div className={`goal-row ${readOnly ? "is-history" : ""} ${isDebt ? `dir-${item.direction || "owe"}` : ""}`} key={item.id}>
        <div className="goal-row-top">
          <div className="account-icon">
            <Icon size={22}/>
          </div>

          <div className="account-main">
            <strong>{item.name}</strong>

            <span>
              {isDebt && `${rowConfig.tag} • `}

              {!isDebt && `${categoryName(categoryOf(item))} • `}

              {item.date
                ? `${rowConfig.dateInfo}: ${formatDate(item.date)}`
                : "Không đặt ngày"}

              {readOnly && ` • Hoàn tất: ${formatDate(getGoalLastDate(item))}`}
            </span>
          </div>

          {isFinished && (<span className="goal-tag done">{rowConfig.finished}</span>)}

          <button type="button" className="icon-button delete" title="Xóa" onClick={() => removeItem(item)}>
            <Trash2 size={17}/>
          </button>
        </div>

        <div className="goal-amounts">
          <strong>{formatMoney(done)}</strong>

          <span>/ {formatMoney(total)}</span>

          <em>{percent}%</em>
        </div>

        <div className="progress goal-progress">
          <div className={isFinished ? "safe" : "warning"} style={{ width: `${percent}%` }}/>
        </div>

        {!readOnly && (<div className="goal-row-bottom">
            <span className="goal-remain">
              {rowConfig.remainLabel}: {formatMoney(remain)}
            </span>

            <div className="goal-add">
              <DatePicker customizable className="goal-pay-date" value={payDates[item.id] ?? todayString()} onChange={(event) => setPayDates((old) => ({
                    ...old,
                    [item.id]: event.target.value,
                }))}/>

              <MoneyInput placeholder={rowConfig.actionPlaceholder} value={amounts[item.id] ?? ""} onValueChange={(next) => setAmounts((old) => ({
                    ...old,
                    [item.id]: next,
                }))} onKeyDown={(event) => {
                    if (event.key === "Enter")
                        addAmount(item);
                }}/>

              <button type="button" className="secondary-button" onClick={() => addAmount(item)}>
                {rowConfig.actionLabel}
              </button>
            </div>
          </div>)}

        {history.length > 0 && (<div className="goal-history">
            <div className="goal-history-title">
              Lịch sử {rowConfig.actionLabel.toLowerCase()}
            </div>

            {history.map((entry) => (<div className="goal-history-row" key={entry.id}>
                <span>
                  {rowConfig.actionDateLabel}: <b>{formatDate(entry.date)}</b>
                </span>

                <strong>{formatMoney(entry.amount)}</strong>
              </div>))}
          </div>)}
      </div>);
    }
    /* ----- Đầu tư: một thẻ khoản đầu tư (hiển thị theo danh mục) ----- */
    function renderInvestRow(item) {
        const cat = categoryOf(item);
        const lb = investLabels(cat);
        const CatIcon = lb.icon;
        const total = Number(item.total || 0);
        const done = Number(item.done || 0);
        const remain = Math.max(0, total - done);
        const percent = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
        const finished = isGoalFinished(item);
        const rate = Number(item.rate || 0);
        const term = Number(item.term || 0);
        const termMonths = item.termUnit === "year" ? term * 12 : term;
        const maturity = item.date && termMonths ? addMonthsToDate(item.date, termMonths) : "";
        const left = maturity ? daysUntil(maturity) : null;
        const interest = rate && termMonths ? Math.round((total * rate * termMonths) / 1200) : 0;
        const history = [...(item.history || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
        /* Bảng chỉ số: gửi tiết kiệm / đầu tư bỏ "đã gửi" + "còn thiếu", đáo hạn và lãi xếp cuối hàng;
           vay ngân hàng giữ "đã trả" + "còn nợ" */
        const isLoan = cat === "bank-loan";
        const metrics = [
            { key: "total", label: lb.total, value: formatMoney(total) },
            ...(isLoan
                ? [
                    { key: "done", label: lb.done, value: formatMoney(done), pos: true },
                    { key: "remain", label: lb.remain, value: formatMoney(remain) },
                ]
                : []),
            ...(rate > 0
                ? [{ key: "rate", label: "Lãi suất", value: `${rate.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%/năm` }]
                : []),
            ...(term > 0
                ? [{ key: "term", label: "Kỳ hạn", value: `${term} ${item.termUnit === "year" ? "năm" : "tháng"}` }]
                : []),
            ...(item.date
                ? [{ key: "start", label: isLoan ? "Giải ngân" : "Bắt đầu", value: formatDate(item.date) }]
                : []),
            ...(maturity
                ? [
                    {
                        key: "maturity",
                        label: "Đáo hạn",
                        value: formatDate(maturity),
                        note: finished
                            ? null
                            : {
                                text: left > 0 ? `còn ${left} ngày` : left === 0 ? "hôm nay" : `quá hạn ${-left} ngày`,
                                late: left < 0,
                            },
                    },
                ]
                : []),
            ...(interest > 0
                ? [{ key: "interest", label: lb.interest, value: formatMoney(interest), pos: true }]
                : []),
        ];
        return (<div className={`inv-card tone-${lb.tone}`} key={item.id}>
        <div className="inv-top">
          <div className="inv-ico"><CatIcon size={20}/></div>
          <div className="inv-title">
            <strong>{upperFirst(item.name)}</strong>
          </div>
          {finished && <span className="goal-tag done">{lb.finished}</span>}
          <button type="button" className="icon-button delete" title="Xóa" onClick={() => removeItem(item)}>
            <Trash2 size={17}/>
          </button>
        </div>

        <div className="inv-metrics">
          <div className="inv-metrics-in">
            {metrics.map((metric) => (<div key={metric.key}>
                <span>{metric.label}</span>
                <strong className={metric.pos ? "pos" : ""}>{metric.value}</strong>
                {metric.note && <small className={metric.note.late ? "late" : ""}>{metric.note.text}</small>}
              </div>))}
          </div>
        </div>

        <div className="inv-progress">
          <div className="progress goal-progress"><div className={finished ? "safe" : "warning"} style={{ width: `${percent}%` }}/></div>
          <em>{percent}%</em>
        </div>

        <div className="goal-row-bottom">
          <div className="goal-add">
            <DatePicker customizable className="goal-pay-date" value={payDates[item.id] ?? todayString()} onChange={(event) => setPayDates((old) => ({ ...old, [item.id]: event.target.value }))}/>
            <MoneyInput placeholder={lb.actionPh} value={amounts[item.id] ?? ""} onValueChange={(next) => setAmounts((old) => ({ ...old, [item.id]: next }))} onKeyDown={(event) => { if (event.key === "Enter")
            addAmount(item); }}/>
            <button type="button" className="secondary-button" onClick={() => addAmount(item)}>{lb.action}</button>
          </div>
        </div>

        {history.length > 0 && (<div className="goal-history">
            <div className="goal-history-title">Lịch sử {lb.action.toLowerCase()}</div>
            {history.map((entry) => (<div className="goal-history-row" key={entry.id}>
                <span>Ngày: <b>{formatDate(entry.date)}</b></span>
                <strong>{formatMoney(entry.amount)}</strong>
              </div>))}
          </div>)}
      </div>);
    }
    /* Form thêm khoản (dùng chung cho Vay / Nợ và Đầu tư) */
    const inv = investLabels(formCategory);
    const formPanel = (<section className="panel">
      {!isDebt && <h2 className="inv-form-title">{formConfig.addTitle}</h2>}

      <form className={`form ${isDebt ? "" : "inv-form"}`} onSubmit={addItem}>
        {isDebt && (<div className="goal-direction-pills">
            {Object.entries(debtDirections).map(([key, item]) => (<button key={key} type="button" className={`goal-dir-pill ${key} ${form.direction === key ? "active" : ""}`} onClick={() => setForm({ ...form, direction: key })}>
                {item.tag}
              </button>))}
          </div>)}

        {!isDebt && (<FormField label="Danh mục">
            <select value={formCategory} onChange={(event) => setForm({ ...form, category: event.target.value })}>
              {categories.map((category) => (<option key={category.id} value={category.id}>{category.name}</option>))}
            </select>
          </FormField>)}

        <FormField label={isDebt ? formConfig.nameLabel : inv.name}>
          <input placeholder={isDebt ? formConfig.namePlaceholder : inv.ph} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })}/>
        </FormField>

        {!isDebt && formCategory === "bank-loan" ? (<div className="inv-form-row">
            <FormField label={inv.total}>
              <MoneyInput value={form.total} onValueChange={(next) => setForm({ ...form, total: next })}/>
            </FormField>

            <FormField label={inv.done}>
              <MoneyInput value={form.done} onValueChange={(next) => setForm({ ...form, done: next })}/>
            </FormField>
          </div>) : (<FormField label={isDebt ? formConfig.totalLabel : inv.total}>
            <MoneyInput value={form.total} onValueChange={(next) => setForm({ ...form, total: next })}/>
          </FormField>)}

        {!isDebt && (<div className="inv-form-row">
            <FormField label={inv.rate}>
              <input inputMode="decimal" placeholder="Ví dụ: 6.5" value={form.rate} onChange={(event) => setForm({ ...form, rate: event.target.value.replace(",", ".").replace(/[^0-9.]/g, "") })}/>
            </FormField>

            <FormField label="Kỳ hạn">
              <div className="inv-term">
                <input inputMode="numeric" placeholder="12" value={form.term} onChange={(event) => setForm({ ...form, term: event.target.value.replace(/\D/g, "") })}/>
                <select value={form.termUnit} onChange={(event) => setForm({ ...form, termUnit: event.target.value })}>
                  <option value="month">Tháng</option>
                  <option value="year">Năm</option>
                </select>
              </div>
            </FormField>
          </div>)}

        <FormField label={isDebt ? formConfig.dateLabel : inv.dateLabel}>
          <DatePicker clearable customizable value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })}/>
        </FormField>

        <button className="primary-button">
          <Plus size={18}/>
          {formConfig.addButton}
        </button>
      </form>
    </section>);
    /* ---------- Trang Tiết kiệm (giữ nguyên bố cục cũ) ---------- */
    if (!isDebt) {
        const visibleItems = catFilter === "all"
            ? items
            : items.filter((item) => categoryOf(item) === catFilter);
        return (<>
        <div className="invest-cats">
          <div className="invest-cat-list" role="tablist" aria-label="Danh mục đầu tư">
            <button type="button" role="tab" aria-selected={catFilter === "all"} className={`invest-cat ${catFilter === "all" ? "active" : ""}`} onClick={() => {
                setCatFilter("all");
                playSound();
            }}>
              Tất cả
              <em>{items.length}</em>
            </button>

            {categories.map((category) => (<button key={category.id} type="button" role="tab" aria-selected={catFilter === category.id} className={`invest-cat ${catFilter === category.id ? "active" : ""}`} onClick={() => {
                    setCatFilter(category.id);
                    setForm((old) => ({ ...old, category: category.id }));
                    playSound();
                }}>
                {category.name}
                <em>
                  {items.filter((item) => categoryOf(item) === category.id).length}
                </em>
              </button>))}

            {addingCategory ? (<form className="invest-cat-add" onSubmit={addCategory}>
                <input autoFocus value={newCategory} maxLength={40} placeholder="Tên danh mục mới" onChange={(event) => setNewCategory(event.target.value)}/>

                <button type="submit" className="ok">
                  Thêm
                </button>

                <button type="button" onClick={() => {
                    setAddingCategory(false);
                    setNewCategory("");
                }}>
                  Huỷ
                </button>
              </form>) : (<button type="button" className="invest-cat add" onClick={() => setAddingCategory(true)}>
                <Plus size={15}/>
                Thêm danh mục
              </button>)}
          </div>

          {catFilter !== "all" && (<button type="button" className="invest-cat-remove" onClick={() => removeCategory(catFilter)}>
              <Trash2 size={14}/>
              Xoá danh mục này
            </button>)}
        </div>

        <div className="account-page-grid">
          {formPanel}

          <section className="panel">
            <PanelTitle title={catFilter === "all"
                ? baseConfig.listTitle
                : `${categoryName(catFilter)}`} subtitle={baseConfig.listSubtitle}/>

            <div className="goal-list">
              {visibleItems.length === 0 && <Empty>{baseConfig.empty}</Empty>}

              {visibleItems.map((item) => renderInvestRow(item))}
            </div>
          </section>
        </div>
      </>);
    }
    /* ---------- Trang Vay / Nợ ---------- */
    const tiles = [
        {
            key: "pay",
            label: "PHẢI TRẢ",
            value: formatMoney(payTotals.remain),
            sub: `${payOpen.length} khoản vay chưa trả xong`,
            icon: ArrowUpCircle,
        },
        {
            key: "collect",
            label: "PHẢI THU",
            value: formatMoney(collectTotals.remain),
            sub: `${collectOpen.length} khoản nợ chưa thu xong`,
            icon: ArrowDownCircle,
        },
        {
            key: "history",
            label: "LỊCH SỬ",
            value: `${finishedItems.length} khoản`,
            sub: `Đã ghi xong ${formatMoney(finishedTotals.total)}`,
            icon: CheckCircle2,
        },
    ];
    const tabInfo = {
        pay: {
            title: "Khoản phải trả",
            subtitle: "Các khoản bạn đã vay và chưa trả xong",
            empty: "Chưa có khoản vay nào cần trả.",
            list: payOpen,
            forced: "lend",
        },
        collect: {
            title: "Khoản phải thu",
            subtitle: "Các khoản người khác nợ bạn và chưa thu xong",
            empty: "Chưa có khoản nợ nào cần thu.",
            list: collectOpen,
            forced: "owe",
        },
        history: {
            title: "Lịch sử",
            subtitle: "Các khoản đã ghi xong",
            empty: "Chưa có khoản nào được ghi xong.",
            list: finishedItems,
            forced: null,
        },
    };
    const current = tabInfo[tab];
    return (<div className="debt-page">
      <div className="debt-top">
        {formPanel}

        <div className="debt-board">
          <div className="debt-tiles" role="tablist" aria-label="Chọn danh sách" aria-orientation="vertical">
            {tiles.map((tile) => {
            const TileIcon = tile.icon;
            return (<button key={tile.key} type="button" role="tab" aria-selected={tab === tile.key} className={`debt-tile ${tile.key} ${tab === tile.key ? "active" : ""}`} onClick={() => {
                    setTab(tile.key);
                    playSound();
                }}>
                  <span className="debt-tile-icon">
                    <TileIcon size={17} strokeWidth={2.3}/>
                  </span>

                  <span className="debt-tile-text">
                    <span className="debt-tile-label">{tile.label}</span>

                    <strong className="debt-tile-value">{tile.value}</strong>

                    <span className="debt-tile-sub">{tile.sub}</span>
                  </span>
                </button>);
        })}
          </div>

          <div className="debt-board-list">
            <PanelTitle title={current.title} subtitle={current.subtitle}/>

            <div className="goal-list">
              {current.list.length === 0 && <Empty>{current.empty}</Empty>}

              {current.list.map((item) => renderRow(item, tab === "history", current.forced))}
            </div>
          </div>
        </div>
      </div>
    </div>);
}
/* =========================================================
   LƯƠNG
   Ghi nhận lương từng kỳ: lương cơ bản + phụ cấp + thưởng − khấu trừ
   = thực nhận. Có chọn tài khoản nhận thì tự tạo thêm một giao dịch
   "Đầu vào" trong Nhật ký giao dịch (xoá bản ghi lương sẽ xoá luôn
   giao dịch đó).
========================================================= */
function SalaryPage({ salaries, setSalaries, transactions, setTransactions, accounts, playSound, successSound, deleteSound, onTransactionAdded, }) {
    const [form, setForm] = useState({
        date: todayString(),
        base: "",
        allowance: "",
        bonus: "",
        deduction: "",
        accountId: "",
        note: "",
    });
    const num = (value) => Number(value || 0);
    const net = num(form.base) + num(form.allowance) + num(form.bonus) - num(form.deduction);
    const thisMonthKey = currentMonthKey();
    const sorted = useMemo(() => [...salaries].sort((a, b) => String(b.date).localeCompare(String(a.date)) ||
        String(b.id).localeCompare(String(a.id))), [salaries]);
    /* ---------- Lịch sử lương theo tháng ---------- */
    const [view, setView] = useState("record");
    const [histYear, setHistYear] = useState(null);
    const [histMonth, setHistMonth] = useState("all");
    const [pickOpen, setPickOpen] = useState(false);
    const [pickStart, setPickStart] = useState(0);
    const monthOf = (item) => String(item.month || item.date || "").slice(0, 7);
    const years = useMemo(() => {
        const set = new Set([thisMonthKey.slice(0, 4)]);
        salaries.forEach((item) => monthOf(item) && set.add(monthOf(item).slice(0, 4)));
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [salaries, thisMonthKey]);
    const activeYear = histYear || years[0];
    const pickYears = Array.from({ length: 12 }, (_, i) => pickStart + i);
    const monthStats = useMemo(() => {
        const stats = {};
        for (let m = 1; m <= 12; m++)
            stats[`${activeYear}-${pad(m)}`] = { count: 0, net: 0 };
        salaries.forEach((item) => {
            const s = stats[monthOf(item)];
            if (s) {
                s.count += 1;
                s.net += num(item.net);
            }
        });
        return stats;
    }, [salaries, activeYear]);
    const yearTotal = Object.values(monthStats).reduce((sum, s) => sum + s.net, 0);
    const visible = sorted.filter((item) => histMonth === "all" ? monthOf(item).startsWith(activeYear) : monthOf(item) === histMonth);
    const visibleNet = visible.reduce((sum, item) => sum + num(item.net), 0);
    const groups = useMemo(() => {
        const map = new Map();
        visible.forEach((item) => {
            const key = monthOf(item);
            if (!map.has(key))
                map.set(key, []);
            map.get(key).push(item);
        });
        return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    }, [visible]);
    function renderSalaryRow(item) {
        const [y, m] = monthOf(item).split("-");
        return (<div className="goal-row salary-row" key={item.id}>
        <div className="goal-row-top">
          <div className="account-icon"><Banknote size={22}/></div>
          <div className="account-main">
            <strong>{`Lương tháng ${m}/${y}`}</strong>
            <span>
              Nhận ngày {formatDate(item.date)}
              {item.accountId && accountName(item.accountId) ? ` • ${accountName(item.accountId)}` : ""}
              {item.code ? ` • ${item.code}` : ""}
            </span>
          </div>
          <button type="button" className="icon-button delete" title="Xóa" onClick={() => removeSalary(item)}>
            <Trash2 size={17}/>
          </button>
        </div>
        <div className="goal-amounts">
          <strong>{formatMoney(item.net)}</strong>
          <span>thực nhận</span>
        </div>
        <div className="salary-breakdown">
          <span>Cơ bản <b>{formatMoney(item.base)}</b></span>
          {num(item.allowance) > 0 && <span>Phụ cấp <b>{formatMoney(item.allowance)}</b></span>}
          {num(item.bonus) > 0 && <span>Thưởng <b>{formatMoney(item.bonus)}</b></span>}
          {num(item.deduction) > 0 && <span className="minus">Khấu trừ <b>- {formatMoney(item.deduction)}</b></span>}
        </div>
        {item.note && <div className="salary-note">{item.note}</div>}
      </div>);
    }
    const accountName = (id) => accounts.find((account) => account.id === id)?.name || "";
    function addSalary(event) {
        event.preventDefault();
        if (!form.date) {
            alert("Vui lòng chọn ngày nhận lương.");
            return;
        }
        if (num(form.base) + num(form.allowance) + num(form.bonus) <= 0) {
            alert("Vui lòng nhập ít nhất một khoản lương.");
            return;
        }
        if (net <= 0) {
            alert("Khoản khấu trừ đang lớn hơn tổng lương.");
            return;
        }
        const month = form.date.slice(0, 7);
        const [year, monthText] = month.split("-");
        const title = `Lương tháng ${monthText}/${year}`;
        const salary = {
            id: createId(),
            month,
            date: form.date,
            base: num(form.base),
            allowance: num(form.allowance),
            bonus: num(form.bonus),
            deduction: num(form.deduction),
            net,
            accountId: form.accountId,
            note: form.note.trim(),
        };
        /* Có chọn tài khoản nhận: tạo luôn giao dịch Đầu vào */
        if (form.accountId) {
            const code = getNextTransactionCode(transactions, form.date, "L");
            const transaction = {
                id: createId(),
                code,
                type: "income",
                date: form.date,
                description: salary.note ? `${title} - ${salary.note}` : title,
                amount: net,
                accountId: form.accountId,
            };
            salary.transactionId = transaction.id;
            salary.code = code;
            setTransactions((old) => [...old, transaction]);
            if (onTransactionAdded) {
                onTransactionAdded(`${typeLabels.income} · ${formatMoney(net)} · ${code}`);
            }
        }
        setSalaries((old) => [salary, ...old]);
        setForm({
            ...form,
            base: "",
            allowance: "",
            bonus: "",
            deduction: "",
            note: "",
        });
        successSound();
    }
    function removeSalary(item) {
        const linked = item.transactionId
            ? " và giao dịch Đầu vào đã tạo cùng lúc"
            : "";
        if (!window.confirm(`Xóa bản ghi lương này${linked}?`))
            return;
        setSalaries((old) => old.filter((current) => current.id !== item.id));
        if (item.transactionId) {
            setTransactions((old) => old.filter((transaction) => transaction.id !== item.transactionId));
        }
        deleteSound();
    }
    const [previewYear, previewMonth] = (form.date || thisMonthKey)
        .slice(0, 7)
        .split("-");
    return (<>
      <div className="sal-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={view === "record"} className={view === "record" ? "active" : ""} onClick={() => { setView("record"); playSound(); }}>
          <Plus size={16}/> Ghi nhận lương
        </button>
        <button type="button" role="tab" aria-selected={view === "history"} className={view === "history" ? "active" : ""} onClick={() => { setView("history"); playSound(); }}>
          <HistoryIcon size={16}/> Lịch sử <em>{salaries.length}</em>
        </button>
      </div>

      {view === "record" && (<div className="account-page-grid">
        <section className="panel">
          <PanelTitle title="Ghi nhận lương" subtitle={`Kỳ lương tháng ${previewMonth}/${previewYear}`}/>

          <form className="form" onSubmit={addSalary}>
            <FormField label="Ngày nhận lương">
              <DatePicker customizable value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })}/>
            </FormField>

            <FormField label="Lương cơ bản">
              <MoneyInput value={form.base} onValueChange={(next) => setForm({ ...form, base: next })}/>
            </FormField>

            <FormField label="Phụ cấp">
              <MoneyInput value={form.allowance} onValueChange={(next) => setForm({ ...form, allowance: next })}/>
            </FormField>

            <FormField label="Thưởng / Hoa hồng">
              <MoneyInput value={form.bonus} onValueChange={(next) => setForm({ ...form, bonus: next })}/>
            </FormField>

            <FormField label="Khấu trừ (bảo hiểm, thuế...)">
              <MoneyInput value={form.deduction} onValueChange={(next) => setForm({ ...form, deduction: next })}/>
            </FormField>

            <FormField label="Tài khoản nhận lương">
              <select value={form.accountId} onChange={(event) => setForm({ ...form, accountId: event.target.value })}>
                <option value="">-- Không ghi vào tài khoản --</option>

                {accounts.map((account) => (<option key={account.id} value={account.id}>
                    {account.name}
                  </option>))}
              </select>
            </FormField>

            <FormField label="Ghi chú">
              <input placeholder="Ví dụ: Lương kỳ 1" value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })}/>
            </FormField>

            <div className="salary-preview">
              <span>Thực nhận</span>

              <strong>{formatMoney(Math.max(0, net))}</strong>

              <small>
                {form.accountId
                ? "Sẽ tự ghi một giao dịch Đầu vào vào tài khoản đã chọn"
                : "Chỉ lưu bản ghi lương, chưa ghi vào tài khoản"}
              </small>
            </div>

            <button className="primary-button">
              <Plus size={18}/>

              GHI NHẬN LƯƠNG
            </button>
          </form>
        </section>

        <section className="panel">
          <PanelTitle title="Kỳ lương gần đây" subtitle="3 kỳ mới nhất"/>

          <div className="goal-list">
            {sorted.length === 0 && <Empty>Chưa có kỳ lương nào.</Empty>}
            {sorted.slice(0, 3).map(renderSalaryRow)}
          </div>

          {sorted.length > 3 && (<button type="button" className="sal-more" onClick={() => { setView("history"); playSound(); }}>
              Xem toàn bộ lịch sử <ChevronRight size={16}/>
            </button>)}
        </section>
      </div>)}

      {view === "history" && (<section className="panel sal-history">
          <div className="sal-hist-head">
            <PanelTitle title="Lịch sử lương" subtitle="Chọn tháng để xem các kỳ lương"/>
            <div className="sal-year">
              <button type="button" onClick={() => { setHistYear(String(Number(activeYear) - 1)); setHistMonth("all"); }} aria-label="Năm trước"><ChevronLeft size={16}/></button>
              <strong>{activeYear}</strong>
              <button type="button" onClick={() => { setHistYear(String(Number(activeYear) + 1)); setHistMonth("all"); }} aria-label="Năm sau"><ChevronRight size={16}/></button>

              <div className="sal-yearpick">
                <button type="button" className="sal-cal-btn" aria-label="Xem nhiều năm" title="Xem nhiều năm" onClick={() => { setPickStart(Number(activeYear) - (Number(activeYear) % 12)); setPickOpen((open) => !open); }}>
                  <ModernCalendarIcon size={18}/>
                </button>

                {pickOpen && (<>
                    <div className="sal-yearpop-bg" onClick={() => setPickOpen(false)}/>
                    <div className="sal-yearpop">
                      <div className="sal-yearpop-head">
                        <button type="button" onClick={() => setPickStart(pickStart - 12)} aria-label="12 năm trước"><ChevronLeft size={15}/></button>
                        <strong>{pickStart} – {pickStart + 11}</strong>
                        <button type="button" onClick={() => setPickStart(pickStart + 12)} aria-label="12 năm sau"><ChevronRight size={15}/></button>
                      </div>
                      <div className="sal-yearpop-grid">
                        {pickYears.map((y) => (<button type="button" key={y} className={String(y) === activeYear ? "active" : ""} onClick={() => { setHistYear(String(y)); setHistMonth("all"); setPickOpen(false); playSound(); }}>
                            {y}
                            {salaries.some((item) => monthOf(item).startsWith(String(y))) && <i />}
                          </button>))}
                      </div>
                    </div>
                  </>)}
              </div>
            </div>
          </div>

          <div className="sal-months">
            <button type="button" className={`sal-month ${histMonth === "all" ? "active" : ""}`} onClick={() => { setHistMonth("all"); playSound(); }}>
              <span>Cả năm</span>
              <b>{yearTotal > 0 ? formatCompactMoney(yearTotal) : "—"}</b>
            </button>
            {Object.entries(monthStats).map(([key, s]) => (<button type="button" key={key} className={`sal-month ${histMonth === key ? "active" : ""} ${s.count ? "" : "empty"}`} onClick={() => { setHistMonth(key); playSound(); }}>
                <span>T{Number(key.slice(5))}</span>
                <b>{s.count ? formatCompactMoney(s.net) : "—"}</b>
                {s.count > 1 && <i>{s.count} kỳ</i>}
              </button>))}
          </div>

          <div className="sal-stats">
            <div><span>Tổng thực nhận</span><strong>{formatMoney(visibleNet)}</strong></div>
            <div><span>Số kỳ lương</span><strong>{visible.length}</strong></div>
            <div><span>Trung bình mỗi kỳ</span><strong>{formatMoney(visible.length ? Math.round(visibleNet / visible.length) : 0)}</strong></div>
          </div>

          {groups.length === 0 && (<Empty>{histMonth === "all" ? `Chưa có kỳ lương nào trong năm ${activeYear}.` : "Không có kỳ lương nào trong tháng này."}</Empty>)}

          {groups.map(([key, list]) => (<div className="sal-group" key={key}>
              <div className="sal-group-head">
                <strong>Tháng {Number(key.slice(5))}/{key.slice(0, 4)}</strong>
                <span>{list.length} kỳ · {formatMoney(list.reduce((sum, item) => sum + num(item.net), 0))}</span>
              </div>
              <div className="goal-list">{list.map(renderSalaryRow)}</div>
            </div>))}
        </section>)}
    </>);
}
function Empty({ children, }) {
    return (<div className="empty">
      {children}
    </div>);
}
/* =========================================================
   THỐNG KÊ BẢNG THÁNG
========================================================= */
function MonthlyStatRow({ label, value, className = "", signed = false, strong = false, extraStrong = false, }) {
    const number = Number(value || 0);
    let display = formatMoney(Math.abs(number));
    if (signed) {
        if (number > 0) {
            display = `+ ${formatMoney(number)}`;
        }
        if (number < 0) {
            display = `- ${formatMoney(Math.abs(number))}`;
        }
        if (number === 0) {
            display = "0 đ";
        }
    }
    return (<div className={`monthly-stat-row ${strong ? "strong" : ""} ${extraStrong
            ? "extra-strong"
            : ""}`}>
      <span>
        {label}
      </span>

      <strong className={className}>
        {display}
      </strong>
    </div>);
}
/* =========================================================
   PHÂN TÍCH DANH MỤC
========================================================= */
function SpendingAnalysisItem({ title, spent, totalExpense, budget, }) {
    const expensePercent = totalExpense > 0
        ? (spent / totalExpense) * 100
        : 0;
    const budgetNumber = Number(budget || 0);
    const budgetPercent = budgetNumber > 0
        ? (spent / budgetNumber) * 100
        : 0;
    const remaining = budgetNumber - spent;
    let status = "safe";
    if (budgetPercent >= 100) {
        status = "danger";
    }
    else if (budgetPercent >= 80) {
        status = "warning";
    }
    return (<div className="analysis-item">
      <div className="analysis-item-header">
        <div>
          <strong>
            {title}
          </strong>

          <span>
            Chiếm{" "}
            {expensePercent.toFixed(1)}
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
          {formatMoney(budgetNumber)}
        </span>

        <span className={status === "danger"
            ? "expense"
            : status ===
                "warning"
                ? "adjustment"
                : "positive"}>
          {budgetNumber > 0
            ? `${budgetPercent.toFixed(1)}%`
            : "Chưa đặt"}
        </span>
      </div>

      <div className="progress">
        <div className={status} style={{
            width: `${budgetNumber > 0
                ? Math.min(budgetPercent, 100)
                : 0}%`,
        }}/>
      </div>

      <div className="analysis-footer">
        {budgetNumber <= 0 ? (<span>
            Chưa thiết lập ngân sách
          </span>) : remaining >= 0 ? (<span>
            Còn{" "}
            <strong className="positive">
              {formatMoney(remaining)}
            </strong>
          </span>) : (<span>
            Vượt{" "}
            <strong className="expense">
              {formatMoney(Math.abs(remaining))}
            </strong>
          </span>)}
      </div>
    </div>);
}
/* =========================================================
   BUDGET ITEM
========================================================= */
function BudgetItem({ title, tone, spent, budget, percent, share = 0, }) {
    const budgetNumber = Number(budget || 0);
    const spentNumber = Number(spent || 0);
    const remaining = budgetNumber - spentNumber;
    /* Thang 100%: 100% = toàn bộ ngân sách của khoản này */
    const shownPercent = Math.min(Math.max(Number(percent || 0), 0), 100);
    let status = "safe";
    if (budgetNumber > 0 && percent >= 100) {
        status = "danger";
    }
    else if (budgetNumber > 0 && percent >= 80) {
        status = "warning";
    }
    return (<div className="budget-item">
      <div className="budget-item-header">
        <div>
          <strong>{title}</strong>
          <span>Đã tiêu {formatMoney(spentNumber)}</span>
        </div>

        <em className={`bi-chip ${budgetNumber <= 0 ? "is-muted" : `is-${status}`}`}>
          {budgetNumber > 0
            ? `Đã dùng ${Number(shownPercent.toFixed(1))}%`
            : "Chưa đặt"}
        </em>
      </div>

      <div className="progress">
        <div className={`tone-${tone}`} style={{
            width: `${budgetNumber > 0 ? shownPercent : 0}%`,
        }}/>
      </div>

      <div className="budget-detail-grid">
        <div>
          <span>Tỷ lệ ngân sách</span>
          <strong>{budgetNumber > 0 ? formatShare(share) : "—"}</strong>
        </div>

        <div>
          <span>Ngân sách</span>
          <strong>
            {budgetNumber > 0 ? formatMoney(budgetNumber) : "Chưa đặt"}
          </strong>
        </div>

        <div>
          <span>Trạng thái</span>
          <strong className={budgetNumber > 0 && remaining < 0 ? "is-over" : ""}>
            {budgetNumber > 0
            ? remaining >= 0
                ? `Còn ${formatMoney(remaining)}`
                : `Vượt ${formatMoney(Math.abs(remaining))}`
            : "Chưa thiết lập"}
          </strong>
        </div>
      </div>
    </div>);
}
/* =========================================================
   TRANSACTION TABLE
========================================================= */
/* Kích thước dùng để chia trang nhật ký vừa 1 màn hình */
const LOG_ROW_HEIGHT = 54;
const LOG_HEAD_HEIGHT = 46;
/* Các loại có thể thêm / lọc (đã bỏ Chuyển tiền) */
const logTypeKeys = ["income", "expense", "adjustment"];
const typeLabels = {
    income: "Đầu vào",
    expense: "Đầu ra",
    adjustment: "Tip / Âm",
    transfer: "Chuyển tiền",
};
/* =========================================================
   BỘ CHỌN THÁNG / NĂM CHO NHẬT KÝ (nút lịch + bảng chọn nổi)
   mode "month": chọn tháng, bấm tiêu đề năm để nhảy sang bất kỳ năm nào
   mode "year" : chọn năm, lật từng trang 12 năm để xem mọi năm
   Tháng / năm đã có giao dịch được đánh dấu chấm cam.
========================================================= */
function PeriodPicker({ mode, value, onChange, monthsWithData, yearsWithData, }) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState(mode === "year" ? "years" : "months");
    const wrapRef = useRef(null);
    const activeYear = Number(String(value).slice(0, 4));
    const activeMonth = mode === "month" ? Number(String(value).split("-")[1]) : 0;
    const [viewYear, setViewYear] = useState(activeYear);
    const [pageStart, setPageStart] = useState(Math.floor(activeYear / 12) * 12);
    const thisYear = new Date().getFullYear();
    const thisMonthKey = currentMonthKey();
    function openPicker() {
        setView(mode === "year" ? "years" : "months");
        setViewYear(activeYear);
        setPageStart(Math.floor(activeYear / 12) * 12);
        setOpen(true);
    }
    useEffect(() => {
        if (!open)
            return undefined;
        const onPointer = (event) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKey = (event) => {
            if (event.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("pointerdown", onPointer);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);
    const label = mode === "year" ? `Năm ${activeYear}` : `Tháng ${activeMonth} / ${activeYear}`;
    return (<div className="pp" ref={wrapRef}>
      <button type="button" className={`pp-trigger ${open ? "open" : ""}`} aria-haspopup="dialog" aria-expanded={open} title={mode === "year" ? "Chọn năm xem" : "Chọn tháng / năm xem"} onClick={() => (open ? setOpen(false) : openPicker())}>
        <ModernCalendarIcon size={18}/>

        <span>{label}</span>
      </button>

      {open && (<div className="pp-pop" role="dialog" aria-label={mode === "year" ? "Chọn năm" : "Chọn tháng và năm"}>
          {view === "months" ? (<>
              <div className="pp-head">
                <button type="button" aria-label="Năm trước" onClick={() => setViewYear((y) => y - 1)}>
                  <ChevronLeft size={16}/>
                </button>

                <button type="button" className="pp-title" title="Chọn năm khác" onClick={() => {
                    setPageStart(Math.floor(viewYear / 12) * 12);
                    setView("years");
                }}>
                  Năm {viewYear}
                </button>

                <button type="button" aria-label="Năm sau" onClick={() => setViewYear((y) => y + 1)}>
                  <ChevronRight size={16}/>
                </button>
              </div>

              <div className="pp-grid">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const key = `${viewYear}-${pad(m)}`;
                    const selected = viewYear === activeYear && m === activeMonth;
                    return (<button key={m} type="button" aria-pressed={selected} className={`pp-cell ${selected ? "active" : ""} ${monthsWithData.has(key) ? "has-data" : ""} ${key === thisMonthKey ? "is-current" : ""}`} onClick={() => {
                            onChange(key);
                            setOpen(false);
                        }}>
                      Tháng {m}
                    </button>);
                })}
              </div>

              <div className="pp-foot">
                <button type="button" onClick={() => {
                    onChange(thisMonthKey);
                    setOpen(false);
                }}>
                  Tháng này
                </button>
              </div>
            </>) : (<>
              <div className="pp-head">
                <button type="button" aria-label="Các năm trước" onClick={() => setPageStart((y) => y - 12)}>
                  <ChevronLeft size={16}/>
                </button>

                <span className="pp-title static">
                  {pageStart} – {pageStart + 11}
                </span>

                <button type="button" aria-label="Các năm sau" onClick={() => setPageStart((y) => y + 12)}>
                  <ChevronRight size={16}/>
                </button>
              </div>

              <div className="pp-grid">
                {Array.from({ length: 12 }, (_, i) => pageStart + i).map((y) => {
                    const selected = y === activeYear;
                    return (<button key={y} type="button" aria-pressed={selected} className={`pp-cell ${selected ? "active" : ""} ${yearsWithData.has(y) ? "has-data" : ""} ${y === thisYear ? "is-current" : ""}`} onClick={() => {
                            if (mode === "year") {
                                onChange(String(y));
                                setOpen(false);
                            }
                            else {
                                setViewYear(y);
                                setView("months");
                            }
                        }}>
                      {y}
                    </button>);
                })}
              </div>

              <div className="pp-foot">
                {mode === "year" ? (<button type="button" onClick={() => {
                        onChange(String(thisYear));
                        setOpen(false);
                    }}>
                    Năm nay
                  </button>) : (<button type="button" onClick={() => setView("months")}>
                    Quay lại
                  </button>)}
              </div>
            </>)}

          <div className="pp-legend">
            <i />
            Có giao dịch
          </div>
        </div>)}
    </div>);
}
/* Dãy số trang: 1 2 3 … 9 (có dấu … khi nhiều trang) */
function getPageList(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = new Set([1, total, current - 1, current, current + 1]);
    if (current <= 3)
        [2, 3, 4].forEach((p) => pages.add(p));
    if (current >= total - 2)
        [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
    const sorted = [...pages]
        .filter((p) => p >= 1 && p <= total)
        .sort((a, b) => a - b);
    const result = [];
    sorted.forEach((p, index) => {
        if (index > 0 && p - sorted[index - 1] > 1)
            result.push("…");
        result.push(p);
    });
    return result;
}
function LogPager({ page, pageCount, total, from, to, onChange }) {
    return (<div className="log-pager">
      <span className="log-pager-info">
        {total > 0
            ? `Hiển thị ${from}–${to} / ${total} giao dịch`
            : "Không có giao dịch"}
      </span>

      <div className="log-pager-pages">
        <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16}/>
        </button>

        {getPageList(page, pageCount).map((item, index) => item === "…" ? (<i key={`gap-${index}`}>…</i>) : (<button key={item} type="button" aria-current={item === page ? "page" : undefined} className={item === page ? "active" : ""} onClick={() => onChange(item)}>
              {item}
            </button>))}

        <button type="button" aria-label="Trang sau" disabled={page >= pageCount} onClick={() => onChange(page + 1)}>
          <ChevronRight size={16}/>
        </button>
      </div>
    </div>);
}
/* Chuông có 2 "tai" (sóng rung) hai bên, nhấp nháy khi thêm giao dịch */
function RingingBell({ size = 40 }) {
    return (<svg className="ring-bell" width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g className="ring-ears" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path className="ear-in" d="M9 17c-2.2 3-2.2 7 0 10"/>
        <path className="ear-out" d="M5 14c-3.4 4.5-3.4 11.5 0 16"/>
        <path className="ear-in" d="M39 17c2.2 3 2.2 7 0 10"/>
        <path className="ear-out" d="M43 14c3.4 4.5 3.4 11.5 0 16"/>
      </g>

      <g className="ring-body" fill="currentColor">
        <circle cx="24" cy="8" r="2.2"/>
        <path d="M24 10c-5.5 0-9.5 4.3-9.5 10v6.5L11.5 32h25l-3-5.5V20c0-5.7-4-10-9.5-10z"/>
        <path d="M20.5 34.5a3.5 3.5 0 0 0 7 0z"/>
      </g>
    </svg>);
}
/* Icon theo loại giao dịch — dùng đúng icon của các thẻ ở phần Tổng quan:
   Tổng đầu vào · Chi tiêu tháng · Tip */
const typeIcons = {
    income: ArrowUpCircle,
    expense: ArrowDownCircle,
    adjustment: Gift,
    transfer: ArrowLeftRight,
};
function TransactionTable({ data, getAccountName, onEdit, onDelete, }) {
    function getType(item) {
        if (item.type === "income") {
            return "Đầu vào";
        }
        if (item.type === "expense") {
            return "Đầu ra";
        }
        if (item.type ===
            "adjustment") {
            return "Tip / Âm";
        }
        return "Chuyển tiền";
    }
    function getCategory(item) {
        if (item.type === "expense") {
            return (categories[item.category]?.label ||
                "Chi tiêu");
        }
        if (item.type === "income") {
            return "Tiền nhận";
        }
        if (item.type ===
            "adjustment") {
            return "Tip / Âm";
        }
        return "Nội bộ";
    }
    function getAccountText(item) {
        if (item.type ===
            "transfer") {
            return `${getAccountName(item.fromAccountId)} → ${getAccountName(item.toAccountId)}`;
        }
        return getAccountName(item.accountId);
    }
    function getMoneyPrefix(item) {
        if (item.type === "income") {
            return "+";
        }
        if (item.type === "expense") {
            return "-";
        }
        if (item.type ===
            "adjustment") {
            return item.adjustmentDirection ===
                "minus"
                ? "-"
                : "+";
        }
        return "";
    }
    function getMoneyClass(item) {
        if (item.type === "income") {
            return "income";
        }
        if (item.type === "expense") {
            return "expense";
        }
        if (item.type ===
            "adjustment") {
            return item.adjustmentDirection ===
                "minus"
                ? "expense"
                : "positive";
        }
        return "transfer-color";
    }
    return (<div className="table-wrapper">
      <div className="transaction-table">
        <div className="table-header">
          <span>ID</span>

          <span>NGÀY</span>

          <span>LOẠI</span>

          <span>DANH MỤC</span>

          <span>SỐ TIỀN</span>

          <span>TÀI KHOẢN</span>

          <span>NỘI DUNG</span>

          <span>THAO TÁC</span>
        </div>

        {data.length === 0 && (<Empty>
            Không có giao dịch.
          </Empty>)}

        {data.map((item) => (<div className="table-row" key={item.id}>
            <span className="id-cell" title={`Mã giao dịch ${item.code || ""} · ${getType(item)}`}>
              {(() => {
                const TypeIcon = typeIcons[item.type] || ArrowLeftRight;
                return (<i className={`id-type-icon ${item.type}`}>
                    <TypeIcon size={15} strokeWidth={2.3}/>
                  </i>);
            })()}

              <span className="id-code">{item.code || "—"}</span>
            </span>

            <span>
              {formatDate(item.date)}
            </span>

            <span>
              <span className={`type-badge ${item.type}`}>
                {getType(item)}
              </span>
            </span>

            <span>
              {getCategory(item)}
            </span>

            <strong className={getMoneyClass(item)}>
              {getMoneyPrefix(item)}
              {formatMoney(Math.abs(Number(item.amount || 0)))}
            </strong>

            <span className="account-cell" title={getAccountText(item)}>
              {getAccountText(item)}
            </span>

            <span className="content-cell" title={item.description || ""}>
              {item.description || "Không có ghi chú"}
            </span>

            <span className="actions">
              <button type="button" className="icon-button" title="Sửa giao dịch" aria-label="Sửa giao dịch" onClick={() => onEdit(item)}>
                <Pencil size={16}/>
              </button>

              <button type="button" className="icon-button delete" title="Xoá giao dịch" aria-label="Xoá giao dịch" onClick={() => onDelete(item.id)}>
                <Trash2 size={16}/>
              </button>
            </span>
          </div>))}
      </div>
    </div>);
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

:root,
.app.light-mode {
  /* Nền: trắng */
  --bg-app: #ffffff;
  --bg-surface: #ffffff;
  --bg-surface-alt: #fafafa;
  --bg-surface-raised: #fafafa;
  --bg-surface-soft: #fff7ed;
  --bg-surface-soft-2: #fafafa;
  --bg-surface-deep: #fafafa;
  --bg-surface-deep-2: #f4f4f5;
  --bg-surface-deep-3: #fafafa;
  --bg-surface-deep-4: #f4f4f5;

  /* Viền */
  --border: #ececec;
  --border-strong: #ececec;
  --border-soft: #e4e4e7;
  --border-soft-2: #e4e4e7;
  --border-muted: #e4e4e7;
  --border-dim: #ececec;
  --border-dim-2: #ececec;
  --border-faint: #f4f4f5;
  --border-scroll: #d4d4d8;

  /* Chữ: đen */
  --text-heading: #0a0a0a;
  --text-primary: #171717;
  --text-secondary: #404040;
  --text-muted: #737373;
  --text-muted-alt: #737373;
  --text-muted-soft: #737373;
  --text-neutral: #737373;

  /* Màu nhấn: cam */
  --accent: #ea580c;
  --accent-soft: #fb923c;
  --accent-strong: #f97316;
  --accent-deep: #c2410c;
  --accent-sky: #16a34a;
  --accent-tint: #fff7ed;

  /* Trạng thái tài chính */
  --color-income: #16a34a;
  --color-expense: #e11d48;
  --color-expense-tint: #be123c;
  --color-adjustment: #d97706;

  /* Biểu đồ phân bổ chi tiêu (donut): cam / đen / cam nhạt */
  --cat-food: #f97316;
  --cat-rent: #171717;
  --cat-other: #fdba74;
  --chart-empty: #f4f4f5;

  --surface-white: #ffffff;
  --surface-off-white: #fafafa;
  --border-light: #ececec;
  --text-light-muted: #525252;
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
  color-scheme: light;
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
    #d4d4d8
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
      #d4d4d8,
      #d4d4d8
    );

  border:
    2px solid var(--bg-app);

  border-radius: 20px;
}

::-webkit-scrollbar-thumb:hover {
  background:
    linear-gradient(
      180deg,
      #d4d4d8,
      #d4d4d8
    );
}

::-webkit-scrollbar-corner {
  background: var(--bg-app);
}

.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: #ffffff;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #d4d4d8;

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
      rgba(249, 115, 22, 0.1),
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
      #ffffff
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

  color: #171717;

  background:
    rgba(255, 255, 255, 0.9);

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
    rgba(249, 115, 22, 0.13);

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
  border: 1px solid #fdba74;
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
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.28);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
}

.sidebar-logout-button:hover {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.5);
}

.system-status {
  margin-top: 30px;

  padding: 16px;

  background: var(--bg-surface-deep);

  border:
    1px solid #fdba74;

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
    rgba(255, 255, 255, 0.97);

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

  color: #737373;
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
  color: #7c3aed !important;
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
      #ffffff,
      #ffffff
    );

  border:
    1px solid var(--border-dim-2);

  border-radius: 9px;
}

.summary-title {
  display: flex;

  align-items: center;

  gap: 8px;

  color: #171717;

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
  border: 1px solid #fdba74;
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
  color: #737373;
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
  color: #737373;
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
  color: #15803d;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.profile-message.error {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
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

  color: #171717;

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
    1px solid #fdba74;

  border-radius: 7px;

  outline: none;
}

.form-field input::placeholder,
.search-box input::placeholder {
  color: #737373;
}

.form-field input:focus,
.form-field select:focus,
.search-box input:focus {
  border-color:
    var(--accent);

  box-shadow:
    0 0 0 3px
    rgba(249, 115, 22, 0.08);
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

  background: #ffffff;

  border:
    1px solid #fdba74;

  border-radius: 8px;
}

.tab-button {
  min-height: 48px;

  display: flex;

  justify-content: center;

  align-items: center;

  gap: 6px;

  padding: 8px;

  color: #737373;

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
    rgba(249, 115, 22, 0.15);

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
  color: #ffffff;

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

  color: #ea580c;

  background: #ffffff;

  border:
    1px solid var(--border-soft);
}

.danger-button {
  color: var(--color-expense-tint);

  background:
    rgba(239, 68, 68, 0.08);

  border:
    1px solid #fca5a5;
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

  color: #737373;

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
    rgba(249, 115, 22, 0.1);

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
    1px solid #fdba74;
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
    1px solid #fdba74;

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

  background: #ffffff;

  border:
    1px solid #fdba74;

  border-radius: 8px;
}

.monthly-sheet {
  width: 100%;

  min-width: 980px;

  border-collapse: collapse;

  color: #171717;

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
    1px solid #fdba74;

  border-bottom:
    1px solid #fdba74;
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
      #fafafa,
      #fafafa
    );

  font-size: 12px;

  font-weight: 800;

  letter-spacing:
    0.35px;
}

.monthly-sheet tbody tr {
  background: #ffffff;

  transition:
    0.15s ease;
}

.monthly-sheet tbody tr:nth-child(even) {
  background: #fafafa;
}

.monthly-sheet tbody tr:hover {
  background:
    rgba(249, 115, 22, 0.13);
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
    2px solid #fdba74;

  font-size: 14px;
}

.sheet-empty {
  height: 130px !important;

  color: #737373 !important;

  text-align: center !important;
}

/* =========================================================
   BẢNG THỐNG KÊ
========================================================= */

.monthly-stat-table {
  overflow: hidden;

  background: #ffffff;

  border:
    1px solid #fdba74;

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
    #fafafa;

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
    rgba(255, 255, 255, 0.9);
}

.monthly-stat-row:hover {
  background:
    rgba(249, 115, 22, 0.07);
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

  background: #fafafa;

  border-top:
    1px solid #fdba74;
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
      #fafafa,
      #fafafa
    );

  border-top:
    2px solid #fdba74;
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
      #ffffff,
      #ffffff
    );

  border:
    1px solid #fdba74;

  border-radius: 10px;
}

.monthly-result-panel > div:first-child span {
  display: block;

  color: #737373;

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
  color: #737373;

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
  color: #047857;

  background:
    rgba(16, 185, 129, 0.08);

  border:
    1px solid #86efac;
}

.budget-alert.warning {
  color: #b45309;

  background:
    rgba(245, 158, 11, 0.08);

  border:
    1px solid #fcd34d;
}

.budget-alert.danger {
  color: var(--color-expense-tint);

  background:
    rgba(244, 63, 94, 0.08);

  border:
    1px solid #fca5a5;
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
  background: #fff7ed;
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
  color: #262626;
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
  color: #737373;
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
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.08);
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
  color: #b45309;
  border-color: var(--accent);
  transform: translateY(-1px);
}

.app.light-mode {
  background: #fafafa;
}

.app.light-mode .main {
  background: #fafafa;
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
  color: #262626;
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
  color: #262626;
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
  color: #262626;
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
  background: #ffffff;
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

  background: #fafafa;

  font-size: 11px;

  font-weight: 800;
}

.table-row {
  padding:
    15px 16px;

  color: var(--text-secondary);

  border-top:
    1px solid #fdba74;

  font-size: 14px;
}

.table-row:hover {
  background:
    rgba(249, 115, 22, 0.05);
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
    rgba(249, 115, 22, 0.08);

  border:
    1px solid var(--border-soft);

  border-radius: 6px;
}

.icon-button.delete {
  color: var(--color-expense);

  border-color:
    #fca5a5;

  background:
    rgba(225, 29, 72, 0.06);
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

  color: #171717;

  background: var(--bg-surface-deep);

  border:
    1px solid var(--border-strong);

  border-radius: 7px;
}

.calendar-day.today {
  border:
    2px solid var(--accent);

  background:
    rgba(249, 115, 22, 0.08);
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
    1px solid #fdba74;

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

  background: #ffffff;

  border:
    1px solid var(--border-strong);

  border-radius: 8px;

  text-align: left;
}

.month-history-item.active {
  border-color:
    var(--accent);

  background:
    rgba(249, 115, 22, 0.13);
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
  background: #ffffff;
  border: 1px solid #fdba74;
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
  color: #171717;
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

  background: #ffffff;

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

  color: #737373;

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
    rgba(24, 24, 27, 0.45);

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
    rgba(24, 24, 27, 0.12);
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
    1px solid #fdba74;

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
  color: #171717;
  background: var(--bg-surface-deep-3);
  border: 1px solid var(--border);
  border-radius: 8px;
  text-align: left;
}

.dashboard-quick-actions button:hover {
  border-color: #fdba74;
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
  color: #737373;
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
  color: #ffffff;
  background: var(--accent-deep);
  border: 1px solid var(--accent-strong);
  border-radius: 8px;
  box-shadow: 0 8px 22px rgba(249, 115, 22, 0.22);
  font-size: 13px;
  font-weight: 700;
}

.header-add-button:hover {
  background: #d4d4d8;
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
  color: #737373;
  background: var(--bg-surface-raised);
  border: 1px solid var(--border-dim-2);
  border-radius: 8px;
}

.dashboard-search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);
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
  color: #171717;
  background: var(--bg-surface-raised);
  border: 1px solid #fdba74;
  border-radius: 9px;
  line-height: 0;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.icon-button:hover,
.icon-button.active {
  color: #ea580c;
  background: var(--bg-surface-soft);
  border-color: #fdba74;
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
  background: #f97316;
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
  color: #171717;
  background: var(--bg-surface-deep-4);
  border: 1px solid var(--border-scroll);
  border-radius: 12px;
  box-shadow: 0 20px 50px rgba(24, 24, 27, 0.12), 0 0 0 1px rgba(249, 115, 22, 0.04);
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
  background: #fafafa;
  font-size: 11px;
  font-weight: 700;
}

.notification-read-all:hover {
  color: var(--accent-tint);
  background: #fafafa;
  border-color: #fdba74;
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
  background: #fafafa;
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
  color: #737373;
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
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.08);
}

.notification-item.warning .notification-dot {
  background: var(--color-adjustment);
  box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.08);
}

.notification-item.danger .notification-dot {
  background: var(--color-expense);
  box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.08);
}

.notification-item.success .notification-dot {
  background: var(--color-income);
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.08);
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
  color: #737373;
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
  color: #ea580c;
  background: transparent;
  font-weight: 800;
}

.text-button:hover {
  color: #c2410c;
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
  background: rgba(22, 163, 74, 0.1);
}

.dashboard-transaction-icon.expense {
  color: var(--color-expense);
  background: rgba(225, 29, 72, 0.1);
}

.dashboard-transaction-icon.adjustment {
  color: #a16207;
  background: #fff4c2;
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
  background: rgba(249, 115, 22, 0.1);
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
  color: #7c3aed;
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

/* =========================================================
   GIAO DIỆN DASHBOARD V14
   Nền trắng · chữ đen · điểm nhấn cam
   (lớp ghi đè đặt cuối cùng để thắng mọi quy tắc phía trên)
========================================================= */

.app.theme-v14.light-mode {
  background: #ffffff;
  color: var(--text-primary);
}

/* ---------- Sidebar ---------- */

.app.theme-v14.light-mode .sidebar {
  background: #ffffff;
  border-right: 1px solid #f0f0f0;
}

.app.theme-v14.light-mode .brand {
  border-bottom: 1px solid #f4f4f5;
}

.app.theme-v14.light-mode .brand > svg {
  box-sizing: content-box;
  padding: 9px;
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-radius: 14px;
  box-shadow: 0 8px 20px -6px rgba(249, 115, 22, 0.55);
}

.app.theme-v14.light-mode .brand strong {
  color: #0a0a0a;
  letter-spacing: -0.01em;
}

.app.theme-v14.light-mode .nav-label {
  color: #a3a3a3;
  font-weight: 700;
  letter-spacing: 1.2px;
}

.app.theme-v14.light-mode .nav-button {
  color: #525252;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 14px;
  box-shadow: none;
}

.app.theme-v14.light-mode .nav-button:hover {
  color: #0a0a0a;
  background: #f4f4f5;
  border-color: transparent;
}

.app.theme-v14.light-mode .nav-button.active {
  color: #ffffff;
  background: #0a0a0a;
  border-color: #0a0a0a;
  box-shadow: 0 10px 24px -10px rgba(10, 10, 10, 0.55);
}

.app.theme-v14.light-mode .nav-button.active svg {
  color: #fb923c;
}

.app.theme-v14.light-mode .system-status {
  color: #404040;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 16px;
}

.app.theme-v14.light-mode .system-status strong {
  color: #c2410c;
}

.app.theme-v14.light-mode .system-status p {
  color: #525252;
}

.app.theme-v14.light-mode .dot {
  background: #f97316;
}

.app.theme-v14.light-mode .sidebar-bottom {
  border-top: 1px solid #f4f4f5;
}

.app.theme-v14.light-mode .sidebar-user-icon {
  color: #ea580c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 12px;
}

.app.theme-v14.light-mode .sidebar-user strong {
  color: #0a0a0a;
}

.app.theme-v14.light-mode .sidebar-user span {
  color: #737373;
}

.app.theme-v14.light-mode .sidebar-logout-button {
  color: #0a0a0a;
  background: #f4f4f5;
  border: 1px solid transparent;
  border-radius: 14px;
}

.app.theme-v14.light-mode .sidebar-logout-button:hover {
  color: #ffffff;
  background: #0a0a0a;
  border-color: #0a0a0a;
}

/* ---------- Khung chính ---------- */

.app.theme-v14.light-mode .main {
  background: #ffffff;
}

.app.theme-v14.light-mode .container {
  background: #ffffff;
  border: 0;
  border-radius: 0;
  padding: 12px 20px 28px;
}

.app.theme-v14.light-mode .header {
  border-bottom: 0;
  padding-bottom: 8px;
  margin-bottom: 22px;
}

.app.theme-v14.light-mode .eyebrow {
  display: inline-flex;
  padding: 5px 12px;
  color: #c2410c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.8px;
}

.app.theme-v14.light-mode .header h1 {
  margin: 12px 0 6px;
  color: #0a0a0a;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.app.theme-v14.light-mode .header p {
  color: #737373;
}

/* ---------- Thanh tìm kiếm / chọn tháng / chuông ---------- */

.app.theme-v14.light-mode .dashboard-search {
  color: #737373;
  background: #f4f4f5;
  border: 1px solid transparent;
  border-radius: 999px;
}

.app.theme-v14.light-mode .dashboard-search:focus-within {
  background: #ffffff;
  border-color: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
}

.app.theme-v14.light-mode .dashboard-search input {
  color: #0a0a0a;
  background: transparent;
}

.app.theme-v14.light-mode .month-select,
.app.theme-v14.light-mode .page-month-select {
  color: #0a0a0a;
  background: #f4f4f5;
  border: 1px solid transparent;
  border-radius: 999px;
  font-weight: 600;
}

.app.theme-v14.light-mode .month-select:focus,
.app.theme-v14.light-mode .page-month-select:focus {
  border-color: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
}

.app.theme-v14.light-mode .icon-button {
  color: #0a0a0a;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
}

.app.theme-v14.light-mode .icon-button:hover,
.app.theme-v14.light-mode .icon-button.active {
  color: #ea580c;
  background: #fff7ed;
  border-color: #fdba74;
}

.app.theme-v14.light-mode .notification-badge {
  color: #ffffff;
  background: #f97316;
  box-shadow: 0 0 0 2px #ffffff;
}

.app.theme-v14.light-mode .notification-dropdown {
  color: #171717;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 20px;
  box-shadow: 0 24px 60px -16px rgba(24, 24, 27, 0.2);
}

.app.theme-v14.light-mode .notification-item:hover {
  background: #fff7ed;
}

.app.theme-v14.light-mode .notification-read-all {
  color: #ea580c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.app.theme-v14.light-mode .notification-read-all:hover {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

/* ---------- Thẻ tổng quan (summary) ---------- */

.app.theme-v14.light-mode .summary-card {
  position: relative;
  min-height: 140px;
  padding: 22px;
  color: #0a0a0a;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 24px;
  box-shadow:
    0 1px 2px rgba(24, 24, 27, 0.04),
    0 14px 32px -16px rgba(24, 24, 27, 0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.app.theme-v14.light-mode .summary-card:hover {
  transform: translateY(-3px);
  box-shadow:
    0 1px 2px rgba(24, 24, 27, 0.04),
    0 20px 40px -16px rgba(249, 115, 22, 0.28);
}

.app.theme-v14.light-mode .summary-title {
  color: #737373;
  font-size: 12px;
  letter-spacing: 0.6px;
}

.app.theme-v14.light-mode .summary-title svg {
  box-sizing: content-box;
  padding: 6px;
  color: #ea580c;
  background: #fff7ed;
  border-radius: 12px;
}

.app.theme-v14.light-mode .summary-money {
  margin-top: 20px;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

/* ---------- Panel ---------- */

.app.theme-v14.light-mode .panel {
  color: #171717;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 24px;
  box-shadow:
    0 1px 2px rgba(24, 24, 27, 0.04),
    0 14px 32px -16px rgba(24, 24, 27, 0.1);
}

.app.theme-v14.light-mode .panel h2,
.app.theme-v14.light-mode .panel h3,
.app.theme-v14.light-mode .panel-title h2 {
  color: #0a0a0a;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.app.theme-v14.light-mode .panel-title {
  border-bottom: 1px solid #f4f4f5;
}

.app.theme-v14.light-mode .panel-title span {
  color: #737373;
}

.app.theme-v14.light-mode .panel-kicker {
  color: #ea580c;
}

.app.theme-v14.light-mode .dashboard-panel-heading > svg {
  box-sizing: content-box;
  padding: 7px;
  color: #ea580c;
  background: #fff7ed;
  border-radius: 12px;
}

.app.theme-v14.light-mode .profile-identity-card,
.app.theme-v14.light-mode .profile-security-card,
.app.theme-v14.light-mode .analysis-summary-box {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
}

/* ---------- Nút ---------- */

.app.theme-v14.light-mode .primary-button,
.app.theme-v14.light-mode .header-add-button {
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border: 1px solid #ea580c;
  border-radius: 14px;
  box-shadow: 0 12px 24px -10px rgba(234, 88, 12, 0.6);
}

.app.theme-v14.light-mode .primary-button:hover,
.app.theme-v14.light-mode .header-add-button:hover {
  background: linear-gradient(135deg, #f97316, #c2410c);
  filter: none;
}

.app.theme-v14.light-mode .secondary-button {
  color: #0a0a0a;
  background: #f4f4f5;
  border: 1px solid transparent;
  border-radius: 14px;
}

.app.theme-v14.light-mode .secondary-button:hover {
  color: #ffffff;
  background: #0a0a0a;
}

.app.theme-v14.light-mode .danger-button {
  color: #be123c;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 14px;
}

.app.theme-v14.light-mode .text-button {
  color: #ea580c;
}

.app.theme-v14.light-mode .text-button:hover {
  color: #c2410c;
}

.app.theme-v14.light-mode .dashboard-quick-actions button {
  color: #0a0a0a;
  background: #f4f4f5;
  border: 1px solid transparent;
  border-radius: 14px;
}

.app.theme-v14.light-mode .dashboard-quick-actions button:hover {
  color: #ffffff;
  background: #0a0a0a;
  border-color: #0a0a0a;
}

/* ---------- Tab / bộ lọc ---------- */

.app.theme-v14.light-mode .transaction-tabs {
  background: #f4f4f5;
  border: 0;
  border-radius: 16px;
}

.app.theme-v14.light-mode .tab-button {
  color: #525252;
  border-radius: 12px;
}

.app.theme-v14.light-mode .tab-button.active {
  color: #ffffff;
  background: #0a0a0a;
  border-color: #0a0a0a;
}

/* ---------- Ô nhập liệu ---------- */

.app.theme-v14.light-mode input,
.app.theme-v14.light-mode select,
.app.theme-v14.light-mode textarea {
  color: #0a0a0a;
}

.app.theme-v14.light-mode .form-field input,
.app.theme-v14.light-mode .form-field select,
.app.theme-v14.light-mode .search-box input {
  color: #0a0a0a;
  background: #fafafa;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
}

.app.theme-v14.light-mode .form-field input:focus,
.app.theme-v14.light-mode .form-field select:focus,
.app.theme-v14.light-mode .search-box input:focus {
  background: #ffffff;
  border-color: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
  outline: none;
}

.app.theme-v14.light-mode input::placeholder {
  color: #a3a3a3;
}

/* ---------- Bảng ---------- */

.app.theme-v14.light-mode .transaction-table,
.app.theme-v14.light-mode .monthly-sheet-wrapper,
.app.theme-v14.light-mode .monthly-stat-table {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
}

.app.theme-v14.light-mode .table-header,
.app.theme-v14.light-mode .monthly-sheet thead th,
.app.theme-v14.light-mode .monthly-stat-header {
  color: #737373;
  background: #fafafa;
}

.app.theme-v14.light-mode .table-row,
.app.theme-v14.light-mode .monthly-sheet,
.app.theme-v14.light-mode .monthly-sheet td {
  color: #171717;
}

.app.theme-v14.light-mode .table-row:hover,
.app.theme-v14.light-mode .monthly-sheet tbody tr:hover,
.app.theme-v14.light-mode .monthly-stat-row:hover {
  background: #fff7ed;
}

.app.theme-v14.light-mode .monthly-sheet tbody tr:nth-child(even),
.app.theme-v14.light-mode .monthly-stat-row:nth-child(odd) {
  background: #fafafa;
}

.app.theme-v14.light-mode .monthly-stat-row.strong,
.app.theme-v14.light-mode .monthly-stat-row.extra-strong,
.app.theme-v14.light-mode .monthly-result-panel {
  background: #fff7ed;
  border-color: #fed7aa;
}

.app.theme-v14.light-mode .icon-button.delete {
  color: #be123c;
  background: #fff1f2;
  border-color: #fecdd3;
}

/* ---------- Tiến độ / ngân sách ---------- */

.app.theme-v14.light-mode .progress {
  background: #f4f4f5;
}

.app.theme-v14.light-mode .budget-detail-grid > div {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 14px;
}

.app.theme-v14.light-mode .budget-detail-grid strong {
  color: #0a0a0a;
}

/* ---------- Lịch ---------- */

.app.theme-v14.light-mode .calendar-day {
  color: #171717;
  border-radius: 14px;
}

.app.theme-v14.light-mode .calendar-day.today {
  background: #fff7ed;
  border-color: #fdba74;
}

.app.theme-v14.light-mode .month-history-item {
  background: #fafafa;
  border-radius: 14px;
}

.app.theme-v14.light-mode .month-history-item.active {
  background: #fff7ed;
  border-color: #fdba74;
}

/* ---------- Biểu đồ ---------- */

.app.theme-v14.light-mode .chart-grid-line {
  stroke: #f0f0f0;
}

.app.theme-v14.light-mode .chart-income-line {
  stroke: #0a0a0a;
}

.app.theme-v14.light-mode .chart-expense-line {
  stroke: #f97316;
}

.app.theme-v14.light-mode .chart-income-dot {
  stroke: #0a0a0a;
}

.app.theme-v14.light-mode .chart-expense-dot {
  stroke: #f97316;
}

.app.theme-v14.light-mode .legend-income {
  background: #0a0a0a;
}

.app.theme-v14.light-mode .legend-expense {
  background: #f97316;
}

.app.theme-v14.light-mode .flow-legend {
  color: #737373;
}

.app.theme-v14.light-mode .donut-hole {
  background: #ffffff;
}

.app.theme-v14.light-mode .dashboard-transaction-icon.income,
.app.theme-v14.light-mode .dashboard-transaction-icon.expense,
.app.theme-v14.light-mode .dashboard-transaction-icon.adjustment {
  border-radius: 12px;
}

.app.theme-v14.light-mode .dashboard-account-icon {
  color: #ea580c;
  background: #fff7ed;
  border-radius: 12px;
}

.app.theme-v14.light-mode .dashboard-recent-row,
.app.theme-v14.light-mode .dashboard-account-row {
  border-bottom-color: #f4f4f5;
}

/* ---------- Modal ---------- */

.app.theme-v14.light-mode .modal {
  color: #171717;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 24px;
  box-shadow: 0 30px 80px -20px rgba(24, 24, 27, 0.35);
}

.app.theme-v14.light-mode .modal-header span {
  color: #ea580c;
}

.app.theme-v14.light-mode .modal-header button {
  color: #0a0a0a;
  background: #f4f4f5;
  border-color: transparent;
  border-radius: 999px;
}

/* ---------- Thanh cuộn + tiêu điểm ---------- */

.app.theme-v14.light-mode button:focus-visible,
.app.theme-v14.light-mode a:focus-visible,
.app.theme-v14.light-mode input:focus-visible,
.app.theme-v14.light-mode select:focus-visible {
  outline: 2px solid #f97316;
  outline-offset: 2px;
}

::selection {
  color: #ffffff;
  background: #f97316;
}

/* =========================================================
   2 THANH ĐIỀU HƯỚNG: TOPBAR (NGANG) + RAIL (DỌC) — GIỐNG ẢNH MẪU
========================================================= */

.app.theme-v14.light-mode {
  --top-h: 72px;
  --rail-w: 76px;
  /* Logo và nút rail cùng một cỡ để thẳng hàng hai mép trái/phải */
  --brand-size: 40px;
  /* Viên thuốc thương hiệu: logo nhỏ hơn, đệm mỏng hơn */
  --logo-size: 42px;
  --brand-pad: 5px;
}

/* ---------- Topbar ---------- */

.app.theme-v14.light-mode .topbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 120;
  height: var(--top-h);
  display: flex;
  align-items: center;
  gap: 18px;
  /* Lề trái = (rail-w - logo-size) / 2 - đệm của viên thuốc thương hiệu,
     để logo vẫn nằm đúng trục với rail */
  padding: 0 24px 0 calc((var(--rail-w) - var(--logo-size)) / 2 - var(--brand-pad));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #f0f0f0;
}

.app.theme-v14.light-mode .topbar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  padding: var(--brand-pad) 18px var(--brand-pad) var(--brand-pad);
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  box-shadow: 0 6px 18px -10px rgba(24, 24, 27, 0.25);
}

.app.theme-v14.light-mode .topbar-logo {
  width: var(--logo-size);
  height: var(--logo-size);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-radius: 50%;
  box-shadow: 0 6px 14px -6px rgba(249, 115, 22, 0.6);
}

.app.theme-v14.light-mode .topbar-brand-text strong {
  display: block;
  color: #0a0a0a;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.app.theme-v14.light-mode .topbar-brand-text span {
  display: block;
  margin-top: 2px;
  color: #a3a3a3;
  font-size: 11px;
}

.app.theme-v14.light-mode .topbar-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin: 0 auto;
  padding: 5px;
  overflow-x: auto;
  background: #f4f4f5;
  border-radius: 999px;
  scrollbar-width: none;
}

.app.theme-v14.light-mode .topbar-nav::-webkit-scrollbar {
  display: none;
}

.app.theme-v14.light-mode .topbar-pill {
  flex: 0 0 auto;
  padding: 9px 17px;
  color: #525252;
  background: transparent;
  border: 0;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  transition: 0.18s ease;
}

.app.theme-v14.light-mode .topbar-pill:hover {
  color: #0a0a0a;
  background: #e7e5e4;
}

.app.theme-v14.light-mode .topbar-pill.active {
  color: #ffffff;
  background: #0a0a0a;
  box-shadow: 0 6px 16px -6px rgba(10, 10, 10, 0.5);
}

.app.theme-v14.light-mode .topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.app.theme-v14.light-mode .topbar .header-actions {
  width: auto;
  flex-wrap: nowrap;
  gap: 10px;
}

.app.theme-v14.light-mode .topbar .dashboard-search {
  width: 210px;
  order: 0;
}

.app.theme-v14.light-mode .topbar .month-select {
  width: auto;
  min-width: 150px;
  min-height: 42px;
  order: 0;
}

.app.theme-v14.light-mode .topbar .header-notification-wrap {
  order: 0;
}

.app.theme-v14.light-mode .topbar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 14px 4px 4px;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
}

.app.theme-v14.light-mode .topbar-avatar {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  background: #0a0a0a;
  border-radius: 50%;
}

.app.theme-v14.light-mode .topbar-user-text strong {
  display: block;
  color: #0a0a0a;
  font-size: 12.5px;
  line-height: 1.2;
}

.app.theme-v14.light-mode .topbar-user-text span {
  display: block;
  max-width: 150px;
  overflow: hidden;
  color: #737373;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- Rail (thanh icon bên trái) ---------- */

.app.theme-v14.light-mode .rail {
  position: fixed;
  top: var(--top-h);
  bottom: 0;
  left: 0;
  z-index: 110;
  width: var(--rail-w);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 18px 0 18px;
  overflow-y: auto;
  background: #ffffff;
  border-right: 1px solid #f0f0f0;
  scrollbar-width: none;
}

.app.theme-v14.light-mode .rail::-webkit-scrollbar {
  display: none;
}

.app.theme-v14.light-mode .rail-spacer {
  flex: 1;
}

.app.theme-v14.light-mode .rail-button {
  position: relative;
  width: var(--brand-size);
  height: var(--brand-size);
  flex: 0 0 var(--brand-size);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #525252;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 13px;
  transition: 0.18s ease;
}

.app.theme-v14.light-mode .rail-button:hover {
  color: #0a0a0a;
  background: #f4f4f5;
}

.app.theme-v14.light-mode .rail-button.active {
  color: #ffffff;
  background: #0a0a0a;
  box-shadow: 0 10px 22px -10px rgba(10, 10, 10, 0.6);
}

.app.theme-v14.light-mode .rail-button.active::before {
  content: "";
  position: absolute;
  left: -16px;
  top: 12px;
  bottom: 12px;
  width: 4px;
  background: #f97316;
  border-radius: 0 4px 4px 0;
}

.app.theme-v14.light-mode .rail-logout {
  color: #ea580c;
  background: #fff7ed;
}

.app.theme-v14.light-mode .rail-logout:hover {
  color: #ffffff;
  background: #ea580c;
}

/* ---------- Vùng nội dung ---------- */

.app.theme-v14.light-mode .shell {
  min-height: 100vh;
  margin-left: var(--rail-w);
  padding-top: var(--top-h);
}

.app.theme-v14.light-mode .main {
  width: 100%;
  margin-left: 0;
  min-height: calc(100vh - var(--top-h));
  padding: 16px 20px;
}

.app.theme-v14.light-mode .header {
  margin-bottom: 18px;
}

.app.theme-v14.light-mode .header h1 {
  font-size: 32px;
}

/* ---------- Responsive ---------- */

@media (max-width: 1320px) {
  .app.theme-v14.light-mode .topbar-brand-text,
  .app.theme-v14.light-mode .topbar-user-text {
    display: none;
  }

  .app.theme-v14.light-mode .topbar-user {
    padding: 4px;
  }
}

@media (max-width: 1100px) {
  .app.theme-v14.light-mode .topbar .dashboard-search {
    display: none;
  }
}

@media (max-width: 900px) {
  .app.theme-v14.light-mode {
    --rail-w: 0px;
  }

  .app.theme-v14.light-mode .topbar {
    padding: 0 14px;
    gap: 10px;
  }

  .app.theme-v14.light-mode .topbar-nav {
    display: none;
  }

  .app.theme-v14.light-mode .topbar-right {
    margin-left: auto;
  }

  .app.theme-v14.light-mode .topbar .month-select {
    min-width: 0;
    max-width: 140px;
  }

  /* Rail chuyển thành thanh điều hướng dưới cùng trên điện thoại */
  .app.theme-v14.light-mode .rail {
    top: auto;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 66px;
    flex-direction: row;
    justify-content: space-around;
    padding: 0 10px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: 0;
    border-top: 1px solid #f0f0f0;
  }

  .app.theme-v14.light-mode .rail-spacer {
    display: none;
  }

  .app.theme-v14.light-mode .rail-button.active::before {
    display: none;
  }

  .app.theme-v14.light-mode .shell {
    padding-bottom: 76px;
  }

  .app.theme-v14.light-mode .main {
    padding: 12px;
  }
}

/* =========================================================
   MÀU CAM PHỦ TỪ GÓC TRÊN TRÁI XUỐNG DƯỚI — CHUYỂN ĐỘNG LIÊN TỤC
   Một lớp cam to gấp 3 lần phần tử, trượt chéo bằng transform
   (chạy trên GPU, một đường cong duy nhất, không bị khựng).
   Mỗi lần mở trang, thẻ được mount lại nên hiệu ứng tự chạy.
========================================================= */

@keyframes orangeSweep {
  from {
    transform: translate3d(-52%, -52%, 0);
  }

  to {
    transform: translate3d(0, 0, 0);
  }
}

.app.theme-v14.light-mode .summary-card,
.app.theme-v14.light-mode .mini-stat,
.app.theme-v14.light-mode .analysis-summary-box {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  color: #ffffff;
  background: #ffffff;
  border: 1px solid #fdba74;
  box-shadow: 0 18px 36px -14px rgba(234, 88, 12, 0.55);
}

.app.theme-v14.light-mode .mini-stat,
.app.theme-v14.light-mode .analysis-summary-box {
  border-radius: 20px;
}

.app.theme-v14.light-mode .summary-card::before,
.app.theme-v14.light-mode .mini-stat::before,
.app.theme-v14.light-mode .analysis-summary-box::before,
.app.theme-v14.light-mode .topbar-pill.active::before,
.app.theme-v14.light-mode .rail-button.active::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: auto;
  bottom: auto;
  width: 300%;
  height: 300%;
  z-index: -1;
  border-radius: 0;
  pointer-events: none;
  background: linear-gradient(
    135deg,
    #fb923c 0%,
    #f97316 16%,
    #ea580c 33%,
    #ea580c 49%,
    rgba(234, 88, 12, 0) 50%
  );
  transform: translate3d(0, 0, 0);
  will-change: transform;
  animation: orangeSweep 1.15s cubic-bezier(0.45, 0.05, 0.25, 1) both;
  animation-delay: var(--sweep-delay, 0s);
}

/* So le nhẹ giữa các thẻ để màu lan lần lượt */
.app.theme-v14.light-mode .summary-card:nth-child(2),
.app.theme-v14.light-mode .mini-stat:nth-child(2),
.app.theme-v14.light-mode .analysis-summary-box:nth-child(2) {
  --sweep-delay: 0.07s;
}

.app.theme-v14.light-mode .summary-card:nth-child(3),
.app.theme-v14.light-mode .mini-stat:nth-child(3),
.app.theme-v14.light-mode .analysis-summary-box:nth-child(3) {
  --sweep-delay: 0.14s;
}

.app.theme-v14.light-mode .summary-card:nth-child(4),
.app.theme-v14.light-mode .mini-stat:nth-child(4),
.app.theme-v14.light-mode .analysis-summary-box:nth-child(4) {
  --sweep-delay: 0.21s;
}

.app.theme-v14.light-mode .summary-card:nth-child(5),
.app.theme-v14.light-mode .mini-stat:nth-child(5),
.app.theme-v14.light-mode .analysis-summary-box:nth-child(5) {
  --sweep-delay: 0.28s;
}

.app.theme-v14.light-mode .summary-card:nth-child(6) {
  --sweep-delay: 0.35s;
}

/* Chữ trắng trên nền cam (ghi đè màu thu/chi/điều chỉnh cũ) */
.app.theme-v14.light-mode .summary-title {
  color: rgba(255, 255, 255, 0.92);
}

.app.theme-v14.light-mode .summary-title svg {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.22);
}

.app.theme-v14.light-mode .summary-money,
.app.theme-v14.light-mode .mini-stat strong,
.app.theme-v14.light-mode .analysis-summary-box strong {
  color: #ffffff !important;
  font-variant-numeric: tabular-nums;
}

.app.theme-v14.light-mode .mini-stat span,
.app.theme-v14.light-mode .analysis-summary-box span {
  color: rgba(255, 255, 255, 0.9);
}

/* ---------- Thanh điều hướng: mục đang chọn màu cam ---------- */

.app.theme-v14.light-mode .topbar-pill.active,
.app.theme-v14.light-mode .rail-button.active {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  color: #ffffff;
  background: #fff7ed;
  box-shadow: 0 10px 22px -10px rgba(234, 88, 12, 0.7);
}

.app.theme-v14.light-mode .topbar-pill.active {
  background: transparent;
}

.app.theme-v14.light-mode .topbar-pill.active:hover {
  color: #ffffff;
  background: transparent;
}

.app.theme-v14.light-mode .rail-button.active svg {
  position: relative;
  z-index: 1;
}

@media (max-width: 900px) {
  .app.theme-v14.light-mode .rail-button.active::before {
    display: block;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app.theme-v14.light-mode .summary-card::before,
  .app.theme-v14.light-mode .mini-stat::before,
  .app.theme-v14.light-mode .analysis-summary-box::before,
  .app.theme-v14.light-mode .topbar-pill.active::before,
  .app.theme-v14.light-mode .rail-button.active::before {
    animation: none;
  }
}

/* =========================================================
   TAB ĐẦU RA / ĐẦU VÀO / TIP-ÂM / CHUYỂN TIỀN
   Hình chữ nhật bo đủ 4 góc (khung ngoài và nút trong bo đồng tâm).
   Rê chuột tới nút nào thì màu "chìm" (lõm nhẹ) mờ dần hiện ra ở nút đó,
   rời chuột thì mờ dần ẩn đi.
========================================================= */

.app.theme-v14.light-mode .transaction-tabs {
  padding: 6px;
  gap: 8px;
  border-radius: 20px;
}

.app.theme-v14.light-mode .tab-button {
  border-radius: 14px;
  background-color: transparent;
  box-shadow:
    inset 0 3px 8px rgba(234, 88, 12, 0),
    inset 0 0 0 999px rgba(249, 115, 22, 0);
  transition:
    background-color 0.28s ease,
    box-shadow 0.28s ease,
    color 0.28s ease,
    border-color 0.28s ease,
    transform 0.28s ease;
}

.app.theme-v14.light-mode .tab-button:hover:not(.active) {
  color: #c2410c;
  background-color: #fff7ed;
  box-shadow:
    inset 0 3px 8px rgba(234, 88, 12, 0.22),
    inset 0 0 0 999px rgba(249, 115, 22, 0.09);
}

.app.theme-v14.light-mode .tab-button:active:not(.active) {
  transform: scale(0.98);
}

.app.theme-v14.light-mode .tab-button.active {
  border-radius: 14px;
}

@media (prefers-reduced-motion: reduce) {
  .app.theme-v14.light-mode .tab-button {
    transition: none;
  }
}

/* =========================================================
   CHẾ ĐỘ BAN ĐÊM (DARK MODE)
   Bật bằng nút Mặt trời / Mặt trăng cạnh chuông thông báo.
   Class "light-mode" là lớp giao diện V14 gốc (giữ nguyên bố cục),
   class "is-dark" chỉ đổi màu nên đặt cuối cùng để thắng mọi quy tắc.
========================================================= */

:root[data-theme="dark"],
.app.light-mode.is-dark {
  --bg-app: #0b0b0d;
  --bg-surface: #161618;
  --bg-surface-alt: #1c1c1f;
  --bg-surface-raised: #1c1c1f;
  --bg-surface-soft: #2a1a10;
  --bg-surface-soft-2: #1c1c1f;
  --bg-surface-deep: #111113;
  --bg-surface-deep-2: #1f1f23;
  --bg-surface-deep-3: #1c1c1f;
  --bg-surface-deep-4: #1f1f23;

  --border: #27272a;
  --border-strong: #27272a;
  --border-soft: #2f2f33;
  --border-soft-2: #2f2f33;
  --border-muted: #2f2f33;
  --border-dim: #27272a;
  --border-dim-2: #27272a;
  --border-faint: #1f1f23;
  --border-scroll: #3f3f46;

  --text-heading: #fafafa;
  --text-primary: #ededed;
  --text-secondary: #d4d4d8;
  --text-muted: #a1a1aa;
  --text-muted-alt: #a1a1aa;
  --text-muted-soft: #a1a1aa;
  --text-neutral: #a1a1aa;

  --accent-tint: #2a1a10;

  --color-income: #4ade80;
  --color-expense: #fb7185;
  --color-expense-tint: #fda4af;
  --color-adjustment: #fbbf24;
  --accent-sky: #4ade80;

  --cat-rent: #e5e5e5;
  --chart-empty: #27272a;

  --surface-white: #161618;
  --surface-off-white: #1c1c1f;
  --border-light: #27272a;
  --text-light-muted: #a1a1aa;

  color-scheme: dark;
}

.app.light-mode.is-dark input,
.app.light-mode.is-dark select {
  color-scheme: dark;
}

/* ---------- Nền & khung ---------- */

.app.theme-v14.light-mode.is-dark,
.app.theme-v14.light-mode.is-dark .main,
.app.theme-v14.light-mode.is-dark .container {
  background: #0b0b0d;
  color: var(--text-primary);
}

.app.theme-v14.light-mode.is-dark .sidebar {
  background: #111113;
  border-right-color: #232326;
}

/* ---------- Topbar & Rail ---------- */

.app.theme-v14.light-mode.is-dark .topbar {
  background: rgba(11, 11, 13, 0.92);
  border-bottom-color: #232326;
}

.app.theme-v14.light-mode.is-dark .topbar-brand-text strong,
.app.theme-v14.light-mode.is-dark .topbar-user-text strong {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .topbar-brand-text span,
.app.theme-v14.light-mode.is-dark .topbar-user-text span {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .topbar-nav {
  background: #1f1f23;
}

.app.theme-v14.light-mode.is-dark .topbar-pill {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .topbar-pill:hover:not(.active) {
  color: #fafafa;
  background: #2a2a2e;
}

.app.theme-v14.light-mode.is-dark .topbar-user {
  background: #161618;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .topbar-avatar {
  color: #fafafa;
  background: #2a2a2e;
}

.app.theme-v14.light-mode.is-dark .rail {
  background: #111113;
  border-right-color: #232326;
  border-top-color: #232326;
}

.app.theme-v14.light-mode.is-dark .rail-button {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .rail-button:hover:not(.active) {
  color: #fafafa;
  background: #1f1f23;
}

.app.theme-v14.light-mode.is-dark .rail-logout {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
}

.app.theme-v14.light-mode.is-dark .rail-logout:hover {
  color: #ffffff;
  background: #ea580c;
}

/* ---------- Tiêu đề trang ---------- */

.app.theme-v14.light-mode.is-dark .header h1,
.app.theme-v14.light-mode.is-dark .panel h2,
.app.theme-v14.light-mode.is-dark .panel h3,
.app.theme-v14.light-mode.is-dark .panel-title h2,
.app.theme-v14.light-mode.is-dark .budget-detail-grid strong {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .header p,
.app.theme-v14.light-mode.is-dark .panel-title span,
.app.theme-v14.light-mode.is-dark .flow-legend,
.app.theme-v14.light-mode.is-dark .dashboard-note,
.app.theme-v14.light-mode.is-dark .notification-item span {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .eyebrow {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

/* ---------- Thẻ, panel, modal ---------- */

.app.theme-v14.light-mode.is-dark .summary-card,
.app.theme-v14.light-mode.is-dark .mini-stat,
.app.theme-v14.light-mode.is-dark .analysis-summary-box {
  background: #161618;
}

.app.theme-v14.light-mode.is-dark .panel,
.app.theme-v14.light-mode.is-dark .modal,
.app.theme-v14.light-mode.is-dark .notification-dropdown {
  color: #ededed;
  background: #161618;
  border-color: #27272a;
  box-shadow: 0 24px 60px -16px rgba(0, 0, 0, 0.7);
}

.app.theme-v14.light-mode.is-dark .panel-title {
  border-bottom-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .profile-identity-card,
.app.theme-v14.light-mode.is-dark .profile-security-card,
.app.theme-v14.light-mode.is-dark .budget-detail-grid > div,
.app.theme-v14.light-mode.is-dark .month-history-item {
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .month-history-item.active,
.app.theme-v14.light-mode.is-dark .calendar-day.today {
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.45);
}

.app.theme-v14.light-mode.is-dark .calendar-day {
  color: #ededed;
}

.app.theme-v14.light-mode.is-dark .modal-header button {
  color: #fafafa;
  background: #27272a;
}

/* ---------- Ô nhập, chọn, tìm kiếm ---------- */

.app.theme-v14.light-mode.is-dark input,
.app.theme-v14.light-mode.is-dark select,
.app.theme-v14.light-mode.is-dark textarea,
.app.theme-v14.light-mode.is-dark .dashboard-search input {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark input::placeholder {
  color: #71717a;
}

.app.theme-v14.light-mode.is-dark .dashboard-search,
.app.theme-v14.light-mode.is-dark .month-select,
.app.theme-v14.light-mode.is-dark .page-month-select {
  color: #a1a1aa;
  background: #1f1f23;
}

.app.theme-v14.light-mode.is-dark .month-select,
.app.theme-v14.light-mode.is-dark .page-month-select {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .dashboard-search:focus-within {
  background: #161618;
}

.app.theme-v14.light-mode.is-dark .form-field input,
.app.theme-v14.light-mode.is-dark .form-field select,
.app.theme-v14.light-mode.is-dark .search-box input {
  color: #fafafa;
  background: #1c1c1f;
  border-color: #2f2f33;
}

.app.theme-v14.light-mode.is-dark .form-field input:focus,
.app.theme-v14.light-mode.is-dark .form-field select:focus,
.app.theme-v14.light-mode.is-dark .search-box input:focus {
  background: #161618;
  border-color: #f97316;
}

/* ---------- Nút ---------- */

.app.theme-v14.light-mode.is-dark .icon-button {
  color: #fafafa;
  background: #161618;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .icon-button:hover,
.app.theme-v14.light-mode.is-dark .icon-button.active {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.45);
}

.app.theme-v14.light-mode.is-dark .notification-badge {
  box-shadow: 0 0 0 2px #161618;
}

.app.theme-v14.light-mode.is-dark .notification-item:hover {
  background: rgba(249, 115, 22, 0.12);
}

.app.theme-v14.light-mode.is-dark .notification-read-all {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.theme-v14.light-mode.is-dark .notification-read-all:hover {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.app.theme-v14.light-mode.is-dark .secondary-button,
.app.theme-v14.light-mode.is-dark .dashboard-quick-actions button {
  color: #fafafa;
  background: #1f1f23;
}

.app.theme-v14.light-mode.is-dark .secondary-button:hover,
.app.theme-v14.light-mode.is-dark .dashboard-quick-actions button:hover {
  color: #0a0a0a;
  background: #fafafa;
  border-color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .danger-button,
.app.theme-v14.light-mode.is-dark .icon-button.delete {
  color: #fda4af;
  background: rgba(225, 29, 72, 0.14);
  border-color: rgba(225, 29, 72, 0.35);
}

.app.theme-v14.light-mode.is-dark .text-button {
  color: #fb923c;
}

.app.theme-v14.light-mode.is-dark .text-button:hover {
  color: #fdba74;
}

/* ---------- Tab Đầu ra / Đầu vào ---------- */

.app.theme-v14.light-mode.is-dark .transaction-tabs {
  background: #1f1f23;
}

.app.theme-v14.light-mode.is-dark .tab-button {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .tab-button:hover:not(.active) {
  color: #fdba74;
  background-color: rgba(249, 115, 22, 0.12);
}

.app.theme-v14.light-mode.is-dark .tab-button.active {
  color: #0a0a0a;
  background: #fafafa;
  border-color: #fafafa;
}

/* ---------- Bảng ---------- */

.app.theme-v14.light-mode.is-dark .transaction-table,
.app.theme-v14.light-mode.is-dark .monthly-sheet-wrapper,
.app.theme-v14.light-mode.is-dark .monthly-stat-table {
  background: #161618;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .table-header,
.app.theme-v14.light-mode.is-dark .monthly-sheet thead th,
.app.theme-v14.light-mode.is-dark .monthly-stat-header {
  color: #a1a1aa;
  background: #1c1c1f;
}

.app.theme-v14.light-mode.is-dark .table-row,
.app.theme-v14.light-mode.is-dark .monthly-sheet,
.app.theme-v14.light-mode.is-dark .monthly-sheet td {
  color: #ededed;
}

.app.theme-v14.light-mode.is-dark .monthly-sheet tbody tr {
  background: #161618;
}

.app.theme-v14.light-mode.is-dark .monthly-sheet tbody tr:nth-child(even),
.app.theme-v14.light-mode.is-dark .monthly-stat-row:nth-child(odd) {
  background: #1c1c1f;
}

.app.theme-v14.light-mode.is-dark .table-row:hover,
.app.theme-v14.light-mode.is-dark .monthly-sheet tbody tr:hover,
.app.theme-v14.light-mode.is-dark .monthly-stat-row:hover {
  background: rgba(249, 115, 22, 0.1);
}

.app.theme-v14.light-mode.is-dark .monthly-stat-row.strong,
.app.theme-v14.light-mode.is-dark .monthly-stat-row.extra-strong,
.app.theme-v14.light-mode.is-dark .monthly-result-panel {
  background: rgba(249, 115, 22, 0.1);
  border-color: rgba(249, 115, 22, 0.35);
}

/* ---------- Biểu đồ & danh sách ---------- */

.app.theme-v14.light-mode.is-dark .progress {
  background: #27272a;
}

.app.theme-v14.light-mode.is-dark .chart-grid-line {
  stroke: #27272a;
}

.app.theme-v14.light-mode.is-dark .chart-income-line,
.app.theme-v14.light-mode.is-dark .chart-income-dot {
  stroke: #fafafa;
}

.app.theme-v14.light-mode.is-dark .legend-income {
  background: #fafafa;
}

.app.theme-v14.light-mode.is-dark .donut-hole {
  background: #161618;
}

.app.theme-v14.light-mode.is-dark .dashboard-recent-row,
.app.theme-v14.light-mode.is-dark .dashboard-account-row {
  border-bottom-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .dashboard-account-icon,
.app.theme-v14.light-mode.is-dark .dashboard-panel-heading > svg {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
}

/* ---------- So sánh với tháng trước trên 5 thẻ tổng hợp ----------
   Gọn ở góc dưới bên phải thẻ, không có nền.
   Nhiều hơn tháng trước: chữ trắng. Ít hơn: chữ đỏ (thêm viền sáng
   mờ quanh chữ để vẫn đọc rõ trên nền cam). */

.app.theme-v14.light-mode .summary-compare {
  position: absolute;
  right: 22px;
  bottom: 18px;
  max-width: calc(100% - 44px);
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.2;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.app.theme-v14.light-mode .summary-compare strong {
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: inherit;
}

.app.theme-v14.light-mode .summary-compare.up {
  color: #ffffff;
}

.app.theme-v14.light-mode .summary-compare.down {
  color: #dc2626;
  text-shadow:
    0 0 3px #ffffff,
    0 0 3px #ffffff,
    0 0 6px rgba(255, 255, 255, 0.9);
}

.app.theme-v14.light-mode .summary-compare.flat {
  color: rgba(255, 255, 255, 0.85);
}

/* ---------- Bảng 5 thẻ tổng hợp trong một khối bo tròn trắng (gọn) ----------
   Hàng 1: Tổng đầu vào | Tổng đầu ra (ô vuông)
   Hàng 2: Điều chỉnh   | Dư/Âm trong tháng (ô vuông)
   Hàng 3: Tổng tài sản kéo dài hết chiều ngang. */

.app.theme-v14.light-mode .dashboard-top-row {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
  margin-bottom: 20px;
}

.app.theme-v14.light-mode .dashboard-top-row #dashboard-quick-add {
  margin-bottom: 0;
}

.app.theme-v14.light-mode .dashboard-top-row .transaction-add-panel {
  margin-bottom: 0;
}

.app.theme-v14.light-mode .summary-board {
  padding: 10px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 26px;
  box-shadow:
    0 1px 2px rgba(24, 24, 27, 0.04),
    0 14px 32px -16px rgba(24, 24, 27, 0.12);
}

.app.theme-v14.light-mode .summary-board .summary-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 0;
}

.app.theme-v14.light-mode .summary-board .summary-card {
  min-height: 0;
  padding: 12px;
  border-radius: 18px;
  aspect-ratio: 1 / 1;
  container-type: inline-size;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) {
  grid-column: 1 / -1;
  aspect-ratio: auto;
  min-height: 78px;
}

.app.theme-v14.light-mode .summary-board .summary-title {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 11px;
  line-height: 1.25;
  letter-spacing: 0.02em;
}

.app.theme-v14.light-mode .summary-board .summary-title svg {
  flex: 0 0 auto;
  box-sizing: content-box;
  width: 13px;
  height: 13px;
  padding: 4px;
  border-radius: 9px;
}

.app.theme-v14.light-mode .summary-board .summary-money {
  margin-top: 10px;
  font-size: clamp(13px, 13.5cqw, 19px);
  white-space: nowrap;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) .summary-money {
  font-size: 24px;
}

.app.theme-v14.light-mode .summary-board .summary-compare {
  right: 12px;
  bottom: 10px;
  max-width: calc(100% - 24px);
  font-size: 11px;
}

.app.theme-v14.light-mode .summary-board .summary-compare strong {
  font-size: 13px;
}

.app.theme-v14.light-mode .summary-board .summary-compare svg {
  width: 13px;
  height: 13px;
}

.app.theme-v14.light-mode.is-dark .summary-board {
  background: #161618;
  border-color: #27272a;
  box-shadow: 0 14px 32px -16px rgba(0, 0, 0, 0.6);
}

@media (max-width: 1100px) {
  .app.theme-v14.light-mode .dashboard-top-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .app.theme-v14.light-mode .summary-board {
    width: 100%;
    max-width: 300px;
  }
}

/* ---------- Dịch nội dung (từ lời chào đến hết trang) lên trên và sang trái một chút ---------- */

.app.theme-v14.light-mode .main {
  padding-top: 6px;
}

.app.theme-v14.light-mode .container {
  padding-top: 4px;
  padding-left: 4px;
}

/* ---------- Nhãn tên chức năng khi rê chuột vào thanh trái ---------- */

@keyframes railTipIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.rail-tooltip {
  position: fixed;
  z-index: 300;
  padding: 7px 12px;
  color: #ffffff;
  background: #0a0a0a;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
  pointer-events: none;
  box-shadow: 0 10px 24px -8px rgba(0, 0, 0, 0.4);
  animation: railTipIn 0.14s ease both;
}

.rail-tooltip::before {
  content: "";
  position: absolute;
  width: 8px;
  height: 8px;
  background: inherit;
  border-radius: 2px;
}

.rail-tooltip.side {
  transform: translateY(-50%);
}

.rail-tooltip.side::before {
  left: -4px;
  top: 50%;
  transform: translateY(-50%) rotate(45deg);
}

.rail-tooltip.above {
  transform: translate(-50%, -100%);
}

.rail-tooltip.above::before {
  left: 50%;
  bottom: -4px;
  transform: translateX(-50%) rotate(45deg);
}

.app.theme-v14.light-mode.is-dark .rail-tooltip {
  color: #0a0a0a;
  background: #fafafa;
}

@media (prefers-reduced-motion: reduce) {
  .rail-tooltip {
    animation: none;
  }
}

/* ---------- Ngân sách / Tài khoản chuyển lên thanh trên ----------
   Trên máy tính hai nút này chỉ nằm ở thanh trên (chữ ngắn gọn);
   trên điện thoại thanh trên bị ẩn nên chúng hiện lại ở thanh dưới. */

.app.theme-v14.light-mode .rail-button.moved-to-topbar {
  display: none;
}

@media (max-width: 900px) {
  .app.theme-v14.light-mode .rail-button.moved-to-topbar {
    display: flex;
  }
}

/* ---------- Khung thanh điều hướng trên: trắng giống viên thuốc thanh trái ---------- */

.app.theme-v14.light-mode .topbar-nav {
  background: #ffffff;
  border: 1px solid #ececec;
  box-shadow: 0 6px 18px -10px rgba(24, 24, 27, 0.25);
}

.app.theme-v14.light-mode .topbar-pill:hover:not(.active) {
  background: #f4f4f5;
}

.app.theme-v14.light-mode.is-dark .topbar-nav {
  background: #161618;
  border-color: #27272a;
  box-shadow: 0 6px 18px -10px rgba(0, 0, 0, 0.6);
}

.app.theme-v14.light-mode.is-dark .topbar-pill:hover:not(.active) {
  background: #2a2a2e;
}

/* ---------- Trang Khoản nợ / Khoản tiết kiệm ---------- */

.goal-summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.goal-direction-pills {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 4px;
}

.goal-dir-pill {
  min-height: 46px;
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  transition: 0.18s ease;
}

.goal-dir-pill.owe {
  color: #be123c;
  background: #fff1f2;
  border-color: #fecdd3;
}

.goal-dir-pill.lend {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.goal-dir-pill.owe.active {
  background: #fecdd3;
  border-color: #fb7185;
}

.goal-dir-pill.lend.active {
  background: #bbf7d0;
  border-color: #4ade80;
}

.app.is-dark .goal-dir-pill.owe {
  color: #fda4af;
  background: rgba(225, 29, 72, 0.12);
  border-color: rgba(251, 113, 133, 0.3);
}

.app.is-dark .goal-dir-pill.lend {
  color: #86efac;
  background: rgba(22, 163, 74, 0.12);
  border-color: rgba(74, 222, 128, 0.3);
}

.app.is-dark .goal-dir-pill.owe.active {
  background: rgba(225, 29, 72, 0.28);
}

.app.is-dark .goal-dir-pill.lend.active {
  background: rgba(22, 163, 74, 0.28);
}

.goal-list {
  display: grid;
  gap: 12px;
}

.goal-row {
  padding: 14px 16px;
  background: var(--bg-surface-alt);
  border: 1px solid var(--border);
  border-radius: 18px;
}

.goal-row-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.goal-row-top .account-main {
  flex: 1;
  min-width: 0;
}

.goal-tag {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.goal-tag.done {
  color: #15803d;
  background: rgba(22, 163, 74, 0.14);
}

.goal-tag.overdue {
  color: #be123c;
  background: rgba(225, 29, 72, 0.12);
}

.goal-amounts {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.goal-amounts strong {
  color: var(--text-heading);
  font-size: 18px;
  font-weight: 800;
}

.goal-amounts span {
  color: var(--text-muted);
  font-size: 13px;
}

.goal-amounts em {
  margin-left: auto;
  color: var(--accent);
  font-size: 13px;
  font-style: normal;
  font-weight: 800;
}

.goal-progress {
  margin-top: 8px;
  height: 10px;
}

.goal-row-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.goal-remain {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 600;
}

.goal-add {
  display: flex;
  align-items: center;
  gap: 8px;
}

.goal-add input {
  width: 130px;
  height: 38px;
  padding: 0 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-soft);
  border-radius: 12px;
}

.goal-add .secondary-button {
  height: 38px;
  padding: 0 14px;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .goal-summary-grid {
    grid-template-columns: 1fr;
  }
}

/* ---------- Biểu đồ khoản chi ở góc trên bên phải (cạnh khối 5 thẻ) ---------- */

.app.theme-v14.light-mode .dashboard-top-row {
  grid-template-columns: 300px minmax(0, 1fr);
}

.app.theme-v14.light-mode .dashboard-top-row > .dashboard-top-donut {
  align-self: stretch;
  margin-bottom: 0;
  display: flex;
  flex-direction: column;
}

.app.theme-v14.light-mode .dashboard-top-donut .donut-content {
  flex: 1;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 32px;
  min-height: 0;
}

.app.theme-v14.light-mode .dashboard-top-donut .donut-chart {
  width: 210px;
  height: 210px;
}

.app.theme-v14.light-mode .dashboard-top-donut .donut-hole {
  width: 138px;
  height: 138px;
}

.app.theme-v14.light-mode .dashboard-top-donut .donut-hole strong {
  font-size: 16px;
}

.app.theme-v14.light-mode .dashboard-top-donut .donut-legend {
  gap: 18px;
  max-width: 360px;
}

.app.theme-v14.light-mode .donut-legend-row strong {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.app.theme-v14.light-mode .donut-legend-row strong small {
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 1100px) {
  .app.theme-v14.light-mode .dashboard-top-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .app.theme-v14.light-mode .dashboard-top-row > .dashboard-top-donut {
    margin-bottom: 0;
  }
}

@media (max-width: 700px) {
  .app.theme-v14.light-mode .dashboard-top-donut .donut-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

/* ---------- Huy hiệu tháng đang xem ---------- */

@keyframes monthDotPulse {
  0% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5);
  }

  70% {
    box-shadow: 0 0 0 7px rgba(249, 115, 22, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0);
  }
}

.month-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 8px;
  padding: 7px 14px 7px 12px;
  color: #c2410c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  font-size: 13px;
  line-height: 1.2;
  white-space: nowrap;
}

.month-badge em {
  color: #9a3412;
  font-style: normal;
  font-weight: 500;
  opacity: 0.85;
}

.month-badge strong {
  color: #c2410c;
  font-weight: 800;
}

.month-badge.compact {
  margin-top: 2px;
  padding: 4px 10px 4px 8px;
  gap: 6px;
  font-size: 12px;
}

.month-badge-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  background: #f97316;
  border-radius: 50%;
  animation: monthDotPulse 1.8s ease-out infinite;
}

.app.theme-v14.light-mode.is-dark .month-badge {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.theme-v14.light-mode.is-dark .month-badge em,
.app.theme-v14.light-mode.is-dark .month-badge strong {
  color: #fdba74;
}

@media (prefers-reduced-motion: reduce) {
  .month-badge-dot {
    animation: none;
  }
}

/* ---------- Header: tiêu đề + huy hiệu tháng cùng một hàng, lời chào ở bên phải ---------- */

.app.theme-v14.light-mode .header {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 20px;
  padding-bottom: 0;
  margin-bottom: 16px;
}

.app.theme-v14.light-mode .header-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.app.theme-v14.light-mode .header h1 {
  margin: 0;
}

.app.theme-v14.light-mode .header-title-row .month-badge {
  margin-top: 0;
}

.app.theme-v14.light-mode .header-greeting {
  padding: 7px 15px;
  font-size: 12px;
  box-shadow: 0 6px 18px -10px rgba(234, 88, 12, 0.35);
}

/* ---------- Biểu đồ cột khoản chi theo tuần ---------- */

.app.theme-v14.light-mode .dashboard-top-donut {
  display: block;
}

.weekly-chart-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.weekly-nav {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 999px;
}

.weekly-nav button {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #525252;
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.weekly-nav button:hover:not(:disabled) {
  color: #ea580c;
  background: #fff7ed;
}

.weekly-nav button:disabled {
  opacity: 0.35;
  cursor: default;
}

.weekly-nav-label {
  min-width: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1.15;
}

.weekly-nav-label strong {
  color: #0a0a0a;
  font-size: 12.5px;
  font-weight: 800;
}

.weekly-nav-label small {
  color: #737373;
  font-size: 10.5px;
}

.weekly-chart {
  display: flex;
  gap: 10px;
  margin-top: 6px;
  /* Chừa chỗ phía trên cho thẻ chi tiết để nó không che cột */
  padding-top: 134px;
}

.weekly-axis {
  position: relative;
  flex: 0 0 38px;
}

.weekly-axis span {
  position: absolute;
  left: 0;
  transform: translateY(50%);
  color: #a3a3a3;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.weekly-bars {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-around;
  gap: 6px;
}

.weekly-col {
  flex: 1;
  max-width: 64px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  font: inherit;
}

.weekly-bar-area {
  position: relative;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.weekly-bar {
  position: relative;
  width: 34px;
  max-width: 100%;
  display: flex;
  flex-direction: column-reverse;
  gap: 2px;
  overflow: hidden;
  border-radius: 999px;
  transition: height 0.4s ease, transform 0.2s ease;
}

.weekly-col:hover .weekly-bar,
.weekly-col.active .weekly-bar {
  transform: translateY(-2px);
}

/* Ngày chưa chi: cột sọc xám */
.weekly-bar.empty {
  background-color: #fafafa;
  background-image: repeating-linear-gradient(
    135deg,
    #d4d4d8 0,
    #d4d4d8 1.5px,
    transparent 1.5px,
    transparent 6px
  );
}

.weekly-bar.filled {
  background: #ffffff;
}

.weekly-seg {
  display: block;
  flex-basis: 0;
  min-height: 10px;
  border-radius: 999px;
}

.weekly-seg.food {
  background: var(--cat-food);
}

.weekly-seg.rent {
  background: var(--cat-rent);
}

.weekly-seg.other {
  background: var(--cat-other);
}

.weekly-bar-dot {
  position: absolute;
  top: 7px;
  left: 50%;
  width: 11px;
  height: 11px;
  background: #ffffff;
  border: 3px solid #0a0a0a;
  border-radius: 50%;
  box-sizing: border-box;
  transform: translateX(-50%);
}

.weekly-tip {
  position: absolute;
  left: 50%;
  z-index: 6;
  min-width: 200px;
  padding: 10px 12px;
  color: #ffffff;
  background: #0a0a0a;
  border-radius: 16px;
  box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.5);
  font-size: 12px;
  line-height: 1.2;
  text-align: left;
  white-space: nowrap;
  transform: translateX(-50%);
  pointer-events: none;
}

.weekly-tip.align-left {
  left: -6px;
  transform: none;
}

.weekly-tip.align-right {
  right: -6px;
  left: auto;
  transform: none;
}

/* Mũi tên chỉ xuống đúng cột đang xem */
.weekly-tip::after {
  content: "";
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 12px;
  height: 12px;
  background: inherit;
  border-radius: 3px;
  transform: translateX(-50%) rotate(45deg);
}

.weekly-tip.align-left::after {
  left: 38px;
}

.weekly-tip.align-right::after {
  right: 38px;
  left: auto;
  transform: translateX(50%) rotate(45deg);
}

.weekly-tip-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 7px;
  padding-bottom: 7px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.weekly-tip-head span {
  color: rgba(255, 255, 255, 0.7);
  font-size: 11px;
}

.weekly-tip-head strong {
  font-size: 13.5px;
  font-weight: 800;
}

.weekly-tip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
}

.weekly-tip-row span {
  flex: 1;
}

.weekly-tip-row strong {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.weekly-tip-row.zero {
  opacity: 0.45;
}

/* Chấm màu có viền để nhìn rõ cả màu đen trên nền đen */
.weekly-tip .donut-dot {
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.85);
}

.weekly-col.active {
  position: relative;
  z-index: 5;
}

.weekly-label {
  color: #a3a3a3;
  font-size: 12px;
  font-weight: 600;
}

.weekly-col.active .weekly-label,
.weekly-col.today .weekly-label {
  color: #0a0a0a;
  font-weight: 800;
}

.weekly-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 22px;
  margin-top: 18px;
  padding: 14px 16px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
}

.weekly-summary-title {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 130px;
}

.weekly-summary-title strong {
  color: #0a0a0a;
  font-size: 13.5px;
  font-weight: 800;
}

.weekly-summary-title span {
  color: #737373;
  font-size: 12px;
}

.weekly-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  flex: 1;
}

.weekly-legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  color: #525252;
  font-size: 12.5px;
}

.weekly-legend-item strong {
  color: #0a0a0a;
  font-weight: 800;
}

.weekly-week-total {
  margin-left: auto;
  color: #737373;
  font-size: 12px;
}

.weekly-week-total strong {
  color: #ea580c;
  font-weight: 800;
}

.app.theme-v14.light-mode.is-dark .weekly-nav,
.app.theme-v14.light-mode.is-dark .weekly-summary {
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .weekly-nav button {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .weekly-nav button:hover:not(:disabled) {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
}

.app.theme-v14.light-mode.is-dark .weekly-nav-label strong,
.app.theme-v14.light-mode.is-dark .weekly-summary-title strong,
.app.theme-v14.light-mode.is-dark .weekly-legend-item strong,
.app.theme-v14.light-mode.is-dark .weekly-col.active .weekly-label,
.app.theme-v14.light-mode.is-dark .weekly-col.today .weekly-label {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .weekly-nav-label small,
.app.theme-v14.light-mode.is-dark .weekly-summary-title span,
.app.theme-v14.light-mode.is-dark .weekly-legend-item,
.app.theme-v14.light-mode.is-dark .weekly-week-total {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .weekly-bar.empty {
  background-color: #1c1c1f;
  background-image: repeating-linear-gradient(
    135deg,
    #3f3f46 0,
    #3f3f46 1.5px,
    transparent 1.5px,
    transparent 6px
  );
}

.app.theme-v14.light-mode.is-dark .weekly-bar.filled {
  background: #161618;
}

.app.theme-v14.light-mode.is-dark .weekly-tip {
  color: #0a0a0a;
  background: #fafafa;
}

.app.theme-v14.light-mode.is-dark .weekly-tip-head {
  border-bottom-color: rgba(0, 0, 0, 0.14);
}

.app.theme-v14.light-mode.is-dark .weekly-tip-head span {
  color: rgba(0, 0, 0, 0.6);
}

.app.theme-v14.light-mode.is-dark .weekly-tip .donut-dot {
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.45);
}

.app.theme-v14.light-mode.is-dark .weekly-bar-dot {
  background: #161618;
  border-color: #fafafa;
}

@media (max-width: 700px) {
  .weekly-week-total {
    margin-left: 0;
  }

  .weekly-bar {
    width: 28px;
  }
}

/* ---------- Viên thuốc logo + chữ Finance ---------- */

.app.theme-v14.light-mode.is-dark .topbar-brand {
  background: #ffffff;
  border-color: #ffffff;
  box-shadow: 0 6px 18px -10px rgba(0, 0, 0, 0.6);
}

.app.theme-v14.light-mode.is-dark .topbar-brand-text strong {
  color: #0a0a0a;
}

@media (max-width: 1320px) {
  .app.theme-v14.light-mode .topbar-brand {
    padding-right: var(--brand-pad);
  }
}

/* ---------- Viên thuốc trắng chứa các chức năng của thanh trái ---------- */

.app.theme-v14.light-mode .rail-pill {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 6px;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  box-shadow: 0 6px 18px -10px rgba(24, 24, 27, 0.25);
}

/* Nút tròn, đồng tâm với viên thuốc */
.app.theme-v14.light-mode .rail-button {
  border-radius: 50%;
}

.app.theme-v14.light-mode.is-dark .rail-pill {
  background: #161618;
  border-color: #27272a;
  box-shadow: 0 6px 18px -10px rgba(0, 0, 0, 0.6);
}

/* Căn viên thuốc giữa thanh theo chiều trên dưới;
   nhóm Tài khoản & bảo mật + Đăng xuất ghim ở đáy để không làm lệch phần căn giữa */
.app.theme-v14.light-mode .rail {
  justify-content: center;
}

.app.theme-v14.light-mode .rail-spacer {
  display: none;
}

.app.theme-v14.light-mode .rail-bottom {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
}

.app.theme-v14.light-mode .rail-top {
  position: absolute;
  left: 50%;
  top: 18px;
  transform: translateX(-50%);
}

@media (max-width: 900px) {
  /* Thanh dưới cùng trên điện thoại: viên thuốc nằm ngang */
  .app.theme-v14.light-mode .rail-pill {
    flex-direction: row;
    gap: 6px;
    padding: 5px;
  }

  .app.theme-v14.light-mode .rail {
    justify-content: space-around;
  }

  .app.theme-v14.light-mode .rail-bottom,
  .app.theme-v14.light-mode .rail-top {
    position: relative;
    left: auto;
    top: auto;
    bottom: auto;
    transform: none;
  }
}

/* ---------- Dashboard: bảng tổng + bảng thống kê khoản chi bằng nhau, vừa khít màn hình ----------
   Lướt xuống mới thấy phần "Thêm giao dịch". */

.app.theme-v14.light-mode .dashboard-top-row {
  grid-template-columns: minmax(380px, 5fr) minmax(0, 7fr);
  align-items: stretch;
  min-height: max(480px, calc(100vh - var(--top-h) - 104px));
  margin-bottom: 28px;
}

.app.theme-v14.light-mode .summary-board {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  padding: 14px;
}

.app.theme-v14.light-mode .summary-board-head {
  display: flex;
  align-items: center;
  padding: 2px 4px 0;
}

.app.theme-v14.light-mode .summary-board-head .month-badge {
  margin-top: 0;
}

.app.theme-v14.light-mode .summary-board .summary-grid {
  flex: 1;
  min-height: 0;
  gap: 12px;
  grid-template-rows: repeat(2, minmax(0, 1fr)) minmax(0, 0.85fr);
}

.app.theme-v14.light-mode .summary-board .summary-card,
.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) {
  aspect-ratio: auto;
  min-height: 0;
  padding: 18px 20px;
  border-radius: 22px;
}

.app.theme-v14.light-mode .summary-board .summary-title {
  font-size: 12px;
}

.app.theme-v14.light-mode .summary-board .summary-money {
  margin-top: 14px;
  font-size: clamp(18px, 11.5cqw, 30px);
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) .summary-money {
  font-size: clamp(24px, 8cqw, 34px);
}

.app.theme-v14.light-mode .summary-board .summary-compare {
  right: 16px;
  bottom: 14px;
  max-width: calc(100% - 32px);
  font-size: 12px;
}

.app.theme-v14.light-mode .dashboard-top-donut .weekly-chart-card {
  flex: 1;
  min-height: 0;
}

/* Biểu đồ nằm giữa phần còn lại của bảng */
.app.theme-v14.light-mode .dashboard-top-donut .weekly-chart {
  margin-top: auto;
  margin-bottom: auto;
}

@media (max-width: 1100px) {
  .app.theme-v14.light-mode .dashboard-top-row {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .app.theme-v14.light-mode .summary-board {
    max-width: none;
  }

  .app.theme-v14.light-mode .summary-board .summary-grid {
    grid-template-rows: none;
    grid-auto-rows: minmax(120px, auto);
  }

  .app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) {
    min-height: 96px;
  }
}

/* ---------- Lịch chọn tháng xem (bảng thống kê khoản chi) ---------- */

.weekly-head-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.app.theme-v14.light-mode .dashboard-top-donut {
  overflow: visible;
}

.calendar-picker {
  position: relative;
}

.calendar-trigger {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ea580c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.calendar-trigger:hover,
.calendar-trigger.active {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.calendar-pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 40;
  width: 300px;
  padding: 12px;
  color: #0a0a0a;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 20px;
  box-shadow: 0 20px 44px -14px rgba(24, 24, 27, 0.35);
}

.calendar-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 999px;
}

.calendar-tabs button {
  padding: 6px 0;
  color: #525252;
  background: transparent;
  border: 0;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.calendar-tabs button.active {
  color: #ffffff;
  background: #ea580c;
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin: 10px 0 8px;
}

.calendar-nav button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  color: #525252;
  background: transparent;
  border: 0;
  border-radius: 10px;
  cursor: pointer;
}

.calendar-nav button:not(.calendar-nav-title) {
  width: 30px;
}

.calendar-nav button:hover:not(:disabled) {
  color: #ea580c;
  background: #fff7ed;
}

.calendar-nav-title {
  flex: 1;
  color: #0a0a0a;
  font-size: 14px;
  font-weight: 800;
}

.calendar-nav-title:disabled {
  cursor: default;
}

.mini-cal-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.mini-cal-weekdays span {
  padding: 4px 0;
  color: #a3a3a3;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.mini-cal-day {
  position: relative;
  height: 34px;
  color: #262626;
  background: transparent;
  border: 0;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.mini-cal-day:hover {
  background: #fff7ed;
}

.mini-cal-day.today {
  color: #ea580c;
  font-weight: 800;
  box-shadow: inset 0 0 0 1.5px #fdba74;
}

/* Chấm nhỏ dưới ngày có chi tiêu */
.mini-cal-day.has-spending::after {
  content: "";
  position: absolute;
  bottom: 4px;
  left: 50%;
  width: 4px;
  height: 4px;
  background: #f97316;
  border-radius: 50%;
  transform: translateX(-50%);
}

.calendar-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.calendar-stats div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
}

.calendar-stats span {
  color: #737373;
  font-size: 11px;
}

.calendar-stats strong {
  font-size: 12.5px;
  font-weight: 800;
}

.calendar-grid-pick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.calendar-grid-pick button {
  position: relative;
  padding: 12px 0;
  color: #262626;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.calendar-grid-pick button:hover {
  color: #ea580c;
  background: #fff7ed;
}

.calendar-grid-pick button.current {
  border-color: #fdba74;
}

.calendar-grid-pick button.has-data::after {
  content: "";
  position: absolute;
  top: 6px;
  right: 7px;
  width: 5px;
  height: 5px;
  background: #f97316;
  border-radius: 50%;
}

.calendar-grid-pick button.selected {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.calendar-foot {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.calendar-foot button {
  flex: 1;
  padding: 8px 0;
  color: #525252;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.calendar-foot button.primary {
  color: #c2410c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.calendar-foot button:hover {
  border-color: #fdba74;
}

.app.theme-v14.light-mode.is-dark .calendar-trigger {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.theme-v14.light-mode.is-dark .calendar-trigger:hover,
.app.theme-v14.light-mode.is-dark .calendar-trigger.active {
  color: #ffffff;
  background: #ea580c;
}

.app.theme-v14.light-mode.is-dark .calendar-pop {
  color: #fafafa;
  background: #161618;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .calendar-tabs,
.app.theme-v14.light-mode.is-dark .calendar-stats div,
.app.theme-v14.light-mode.is-dark .calendar-grid-pick button {
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .calendar-tabs button,
.app.theme-v14.light-mode.is-dark .calendar-nav button,
.app.theme-v14.light-mode.is-dark .mini-cal-day,
.app.theme-v14.light-mode.is-dark .calendar-grid-pick button,
.app.theme-v14.light-mode.is-dark .calendar-nav-title {
  color: #e4e4e7;
}

.app.theme-v14.light-mode.is-dark .calendar-tabs button.active,
.app.theme-v14.light-mode.is-dark .calendar-grid-pick button.selected {
  color: #ffffff;
  background: #ea580c;
}

.app.theme-v14.light-mode.is-dark .mini-cal-day:hover,
.app.theme-v14.light-mode.is-dark .calendar-nav button:hover:not(:disabled),
.app.theme-v14.light-mode.is-dark .calendar-grid-pick button:hover:not(.selected) {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
}

.app.theme-v14.light-mode.is-dark .calendar-stats span,
.app.theme-v14.light-mode.is-dark .mini-cal-weekdays span {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .calendar-foot button {
  color: #e4e4e7;
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .calendar-foot button.primary {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

@media (max-width: 480px) {
  .calendar-pop {
    right: auto;
    left: 50%;
    width: min(300px, calc(100vw - 32px));
    transform: translateX(-50%);
  }
}

/* ---------- Lịch mini: ô vuông nhỏ như cuốn lịch bé ---------- */

.weekly-head-actions {
  margin-left: auto;
}

.calendar-picker .calendar-pop {
  display: flex;
  flex-direction: column;
  width: 252px;
  height: 252px;
  padding: 10px;
  border-radius: 16px;
  box-shadow: 0 14px 30px -12px rgba(24, 24, 27, 0.35);
}

.calendar-picker .calendar-nav {
  margin: 0 0 4px;
}

.calendar-picker .calendar-nav button {
  height: 26px;
}

.calendar-picker .calendar-nav button:not(.calendar-nav-title) {
  width: 26px;
}

.calendar-picker .calendar-nav-title {
  font-size: 13px;
}

.calendar-picker .mini-cal-weekdays span {
  padding: 2px 0;
  font-size: 10px;
}

.calendar-picker .mini-cal-days:not(.mini-cal-weekdays) {
  flex: 1;
  min-height: 0;
  grid-auto-rows: 1fr;
  gap: 2px;
}

.calendar-picker .mini-cal-day {
  height: auto;
  border-radius: 8px;
  font-size: 11.5px;
}

.calendar-picker .mini-cal-day.has-spending::after {
  bottom: 2px;
}

.calendar-picker .calendar-grid-pick {
  flex: 1;
  min-height: 0;
  grid-auto-rows: 1fr;
  gap: 5px;
}

.calendar-picker .calendar-grid-pick button {
  padding: 0;
  border-radius: 10px;
  font-size: 12px;
}

.calendar-picker .calendar-foot {
  gap: 6px;
  margin-top: 6px;
}

.calendar-picker .calendar-foot button {
  padding: 4px 0;
  font-size: 11px;
}

@media (max-width: 480px) {
  .calendar-pop {
    width: min(252px, calc(100vw - 32px));
  }
}

.calendar-picker .mini-cal-day {
  min-height: 0;
  padding: 0;
  line-height: 1;
}

.calendar-picker .mini-cal-days {
  align-content: stretch;
}

/* Khối thống kê dưới biểu đồ: ngày bên trái, 3 khoản chi căn giữa, cả tuần bên phải */
.weekly-chart-card .weekly-summary {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 8px 22px;
}

.weekly-chart-card .weekly-legend {
  flex: none;
  justify-content: center;
  text-align: center;
}

.weekly-chart-card .weekly-week-total {
  margin-left: 0;
  justify-self: end;
  text-align: right;
}

@media (max-width: 900px) {
  .weekly-chart-card .weekly-summary {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .weekly-chart-card .weekly-summary-title {
    align-items: center;
  }

  .weekly-chart-card .weekly-week-total {
    justify-self: center;
    text-align: center;
  }
}

/* ---------- Hàng đầu trang gọn lại để Thêm giao dịch / Giao dịch gần đây được đẩy lên ---------- */

.app.theme-v14.light-mode .dashboard-top-row {
  min-height: 0;
  margin-bottom: 18px;
}

/* Chi tiết ngày đã hiện ở khối bên dưới biểu đồ nên bỏ phần chừa chỗ cho thẻ nổi */
.weekly-chart-card .weekly-chart {
  padding-top: 8px;
  margin-top: 4px;
  margin-bottom: 0;
}

.weekly-chart-card .weekly-tip {
  display: none;
}

.weekly-chart-card .weekly-summary {
  margin-top: auto;
}

.app.theme-v14.light-mode .dashboard-top-donut .weekly-chart {
  margin-top: 4px;
  margin-bottom: 0;
}

.app.theme-v14.light-mode .summary-board {
  padding: 10px;
  gap: 8px;
}

.app.theme-v14.light-mode .summary-board .summary-grid {
  gap: 8px;
}

.app.theme-v14.light-mode .summary-board .summary-card,
.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) {
  padding: 12px 14px;
  border-radius: 16px;
}

.app.theme-v14.light-mode .summary-board .summary-money {
  margin-top: 8px;
  font-size: clamp(16px, 10cqw, 24px);
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) .summary-money {
  font-size: clamp(20px, 7cqw, 28px);
}

/* ---------- Cột trái: bảng tổng (gọn, ở trên) + Giao dịch gần đây ngay bên dưới ---------- */

.app.theme-v14.light-mode .dashboard-top-left {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.app.theme-v14.light-mode .dashboard-top-left .summary-board {
  flex: none;
}

.app.theme-v14.light-mode .summary-board .summary-grid {
  flex: none;
  grid-template-rows: none;
  grid-auto-rows: auto;
}

.app.theme-v14.light-mode .summary-board .summary-card,
.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) {
  min-height: 84px;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) {
  min-height: 72px;
}

.app.theme-v14.light-mode .dashboard-recent-panel {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

/* Phần Phân bổ số dư còn lại một mình: trải rộng hết hàng */
.dashboard-overview-grid {
  grid-template-columns: minmax(0, 1fr);
}

/* Biểu đồ nằm giữa, khối chi tiết ngày dính ngay bên dưới */
.app.theme-v14.light-mode .dashboard-top-donut .weekly-chart {
  margin-top: auto;
  margin-bottom: auto;
}

.weekly-chart-card .weekly-summary {
  margin-top: 18px;
}

/* ---------- Bảng thống kê khoản chi: 3 màu pastel (chỉ áp dụng trong bảng này) ----------
   Ăn uống = xanh lá · Tiền trọ = xanh dương · Chi tiêu khác = vàng */

.weekly-chart-card {
  --cat-food: #86efac;
  --cat-rent: #93c5fd;
  --cat-other: #fde68a;
}

/* Viền mảnh để chấm màu nhạt vẫn nhìn rõ trên nền sáng */
.weekly-chart-card .weekly-legend-item .donut-dot {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

/* ---------- Hàng đầu trang vừa khít 1 màn hình; lướt xuống mới tới "Thêm giao dịch" ---------- */

@media (min-width: 1101px) {
  .app.theme-v14.light-mode .dashboard-top-row {
    height: max(560px, calc(100vh - var(--top-h) - 80px));
    min-height: 0;
    grid-template-rows: minmax(0, 1fr);
    margin-bottom: 20px;
  }

  .app.theme-v14.light-mode .dashboard-top-left {
    min-height: 0;
  }

  .app.theme-v14.light-mode .dashboard-top-left .summary-board {
    flex: none;
  }

  /* Giao dịch gần đây lấp phần còn lại của cột trái; danh sách dài thì cuộn trong khung */
  .app.theme-v14.light-mode .dashboard-recent-panel {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    overflow: hidden;
  }

  .app.theme-v14.light-mode .dashboard-recent-panel .dashboard-recent-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .app.theme-v14.light-mode .dashboard-top-donut {
    min-height: 0;
  }

  .app.theme-v14.light-mode .dashboard-top-donut .weekly-chart-card {
    flex: 1 1 0;
    min-height: 0;
  }

  /* Vùng biểu đồ chiếm phần còn lại, cột tự cao theo vùng này */
  .app.theme-v14.light-mode .dashboard-top-donut .weekly-chart {
    flex: 1 1 0;
    min-height: 0;
    margin-top: 4px;
    margin-bottom: 0;
    overflow: hidden;
    align-items: flex-start;
  }

  .weekly-chart-card .weekly-summary {
    flex: none;
    margin-top: 14px;
  }
}

/* Màn hình thấp: thẻ tổng gọn thêm cho kịp vừa */
@media (min-width: 1101px) and (max-height: 820px) {
  .app.theme-v14.light-mode .summary-board .summary-card,
  .app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) {
    min-height: 60px;
    padding: 8px 12px;
  }

  .app.theme-v14.light-mode .summary-board .summary-money {
    margin-top: 4px;
  }
}

/* ---------- 5 thẻ bảng tổng: tông màu pastel nhạt ----------
   1 Tổng đầu vào = xanh bạc hà · 2 Tổng đầu ra = hồng phấn
   3 Tip           = vàng nhạt    · 4 Dư/Âm trong tháng = xanh da trời nhạt
   5 Tổng tài sản = vàng nhám nhạt (vàng cát dịu, không chói)
   Mỗi thẻ có 3 sắc độ nhạt (a → b → c) cho hiệu ứng loang màu + màu chữ đậm vừa để dễ đọc. */

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(1) {
  --card-a: #dcfce7;
  --card-b: #bbf7d0;
  --card-c: #a7f3d0;
  --card-ink: #166534;
  --card-line: #a7f3d0;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(2) {
  --card-a: #ffe4e6;
  --card-b: #fecdd3;
  --card-c: #fbcfe8;
  --card-ink: #9f1239;
  --card-line: #fecdd3;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(3) {
  --card-a: #fff9dc;
  --card-b: #fdf0b8;
  --card-c: #fbe69a;
  --card-ink: #755600;
  --card-line: #fdf0b8;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(4) {
  --card-a: #e0f2fe;
  --card-b: #bae6fd;
  --card-c: #a5f3fc;
  --card-ink: #075985;
  --card-line: #bae6fd;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(5) {
  --card-a: #fbf4d6;
  --card-b: #f6ebbc;
  --card-c: #efdfa2;
  --card-ink: #7a5c12;
  --card-line: #efdfa2;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5) {
  background: var(--card-a);
  border-color: var(--card-line);
  box-shadow: 0 10px 22px -14px var(--card-ink);
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5)::before {
  background: linear-gradient(
    135deg,
    var(--card-a) 0%,
    var(--card-b) 16%,
    var(--card-c) 33%,
    var(--card-c) 49%,
    rgba(255, 255, 255, 0) 50%
  );
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5) .summary-title {
  color: var(--card-ink);
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5) .summary-title svg {
  color: var(--card-ink);
  background: rgba(255, 255, 255, 0.6);
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5) .summary-money {
  color: var(--card-ink) !important;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5) .summary-compare.up {
  color: var(--card-ink);
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5) .summary-compare.down {
  color: #b91c1c;
  text-shadow: none;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5) .summary-compare.flat {
  color: var(--card-ink);
  opacity: 0.75;
}

.app.theme-v14.light-mode .summary-board .summary-card:nth-child(-n + 5):hover {
  box-shadow: 0 16px 30px -14px var(--card-ink);
}

/* ---------- Dòng so sánh tháng trước: nằm riêng một dòng bên dưới con số, không đè lên nữa ---------- */

.app.theme-v14.light-mode .summary-board .summary-money {
  display: block;
}

.app.theme-v14.light-mode .summary-board .summary-compare {
  position: static;
  right: auto;
  bottom: auto;
  width: 100%;
  max-width: 100%;
  margin-top: 6px;
  justify-content: flex-start;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- 5 thẻ tổng: chữ tiêu đề căn giữa với logo; mũi tên + số so với tháng trước ở góc dưới bên phải ---------- */

.app.theme-v14.light-mode .summary-board .summary-card {
  display: flex;
  flex-direction: column;
}

/* Chữ tiêu đề căn giữa theo chiều trên dưới so với logo (icon) */
.app.theme-v14.light-mode .summary-board .summary-card .summary-title {
  display: flex;
  align-items: center;
  gap: 8px;
  line-height: 1.2;
}

.app.theme-v14.light-mode .summary-board .summary-card .summary-title svg {
  flex: 0 0 auto;
}

/* Hàng đáy thẻ: số tiền bên trái, so sánh tháng trước bên phải */
.app.theme-v14.light-mode .summary-board .summary-card-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2px 10px;
  margin-top: auto;
  padding-top: 8px;
  min-width: 0;
}

.app.theme-v14.light-mode .summary-board .summary-card-foot .summary-money {
  margin-top: 0;
  min-width: 0;
}

.app.theme-v14.light-mode .summary-board .summary-card-foot .summary-compare {
  position: static;
  right: auto;
  bottom: auto;
  width: auto;
  max-width: 100%;
  margin: 0 0 0 auto;
  flex: 0 0 auto;
  justify-content: flex-end;
  text-align: right;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.app.theme-v14.light-mode .summary-board .summary-card-foot .summary-compare svg {
  flex: 0 0 auto;
}

/* ---------- Lịch: tiêu đề tháng chỉ là chữ (không còn bấm để xem tháng / năm) ---------- */

.calendar-nav .calendar-nav-title {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: default;
  user-select: none;
}

/* ---------- Cả tuần: căn giữa, chữ "đ" nằm trên dòng số ---------- */

.weekly-week-total {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-self: center;
  gap: 2px;
  min-width: 104px;
  text-align: center;
}

.weekly-week-total span {
  font-size: 11.5px;
  font-weight: 600;
}

.weekly-week-total strong {
  font-size: 16px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.weekly-week-total sup {
  margin-left: 2px;
  font-size: 0.62em;
  font-weight: 700;
  line-height: 0;
  vertical-align: super;
}

/* ---------- Cả tuần: chữ đen đậm giống "Hôm nay", cùng dòng với "Hôm nay" ---------- */

.weekly-chart-card .weekly-summary-title,
.weekly-chart-card .weekly-week-total {
  gap: 2px;
  line-height: 1.35;
}

.weekly-chart-card .weekly-week-total span {
  color: #0a0a0a;
  font-size: 13.5px;
  font-weight: 800;
}

.weekly-chart-card .weekly-week-total strong {
  color: #ea580c;
  font-size: 12px;
  line-height: 1.35;
  font-weight: 800;
}

.app.theme-v14.light-mode.is-dark .weekly-chart-card .weekly-week-total span {
  color: #fafafa;
}

/* ---------- Lịch: phần Tuỳ chỉnh (chọn cụ thể ngày, tháng, năm) ---------- */

.calendar-custom {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.calendar-custom-title {
  padding: 4px 0 2px;
  color: #0a0a0a;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
}

.calendar-custom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.3fr;
  gap: 8px;
}

.calendar-custom-grid label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.calendar-custom-grid label span {
  color: #737373;
  font-size: 11px;
  font-weight: 700;
}

.calendar-custom-grid select {
  width: 100%;
  height: 34px;
  padding: 0 6px;
  color: #0a0a0a;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.calendar-custom-grid select:focus {
  outline: none;
  border-color: #fdba74;
}

.calendar-custom-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  margin-top: auto;
  padding: 10px 8px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 14px;
  text-align: center;
}

.calendar-custom-preview strong {
  color: #c2410c;
  font-size: 13.5px;
  font-weight: 800;
}

.calendar-custom-preview span {
  color: #737373;
  font-size: 11.5px;
}

.app.theme-v14.light-mode.is-dark .calendar-custom-title,
.app.theme-v14.light-mode.is-dark .calendar-custom-grid select {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .calendar-custom-grid select {
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .calendar-custom-preview {
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.theme-v14.light-mode.is-dark .calendar-custom-preview strong {
  color: #fdba74;
}

/* ---------- Nhật ký giao dịch: ID · Ngày · Loại · Danh mục · Số tiền · Tài khoản · Nội dung · Thao tác ---------- */

.table-wrapper {
  overflow-x: auto;
}

.transaction-table {
  min-width: 920px;
}

.table-header,
.table-row {
  grid-template-columns:
    92px
    86px
    96px
    108px
    126px
    minmax(110px, 1fr)
    minmax(140px, 1.3fr)
    84px;
  gap: 10px;
}

.table-row .id-cell {
  color: #737373;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.table-row .content-cell {
  white-space: nowrap;
}

.table-row .actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.app.theme-v14.light-mode.is-dark .table-row .id-cell {
  color: #a1a1aa;
}

@media (max-width: 1150px) {
  .table-header,
  .table-row {
    grid-template-columns:
      88px
      80px
      88px
      100px
      118px
      minmax(100px, 1fr)
      minmax(120px, 1.2fr)
      80px;
    gap: 8px;
  }
}

/* ---------- Nhật ký giao dịch: bảng gọn, có đường ngăn giữa các cột, mọi dữ liệu nằm trong bảng ---------- */

.table-wrapper {
  overflow-x: visible;
}

.transaction-table {
  min-width: 0;
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns:
    minmax(96px, 0.9fr)
    minmax(88px, 0.8fr)
    minmax(88px, 0.8fr)
    minmax(96px, 0.9fr)
    minmax(118px, 1fr)
    minmax(100px, 1fr)
    minmax(120px, 1.5fr)
    88px;
  gap: 0;
  align-items: stretch;
  padding: 0;
}

.transaction-table .table-header > *,
.transaction-table .table-row > * {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 12px 12px;
  border-left: 1px solid #f0f0f0;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.35;
}

.transaction-table .table-header > :first-child,
.transaction-table .table-row > :first-child {
  border-left: 0;
}

.transaction-table .table-header > * {
  padding-top: 13px;
  padding-bottom: 13px;
}

.transaction-table .table-row .id-cell {
  color: #c2410c;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12.5px;
  font-weight: 800;
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow-wrap: normal;
}

.transaction-table .table-row .content-cell,
.transaction-table .table-row .account-cell {
  white-space: normal;
}

.transaction-table .table-row .actions {
  justify-content: center;
  gap: 6px;
  padding-left: 6px;
  padding-right: 6px;
}

.transaction-table .table-header > :last-child {
  justify-content: center;
}

.transaction-table .table-row .actions .icon-button {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
}

.app.theme-v14.light-mode.is-dark .transaction-table .table-header > *,
.app.theme-v14.light-mode.is-dark .transaction-table .table-row > * {
  border-left-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .transaction-table .table-row .id-cell {
  color: #fdba74;
}

@media (max-width: 1150px) {
  .table-header,
  .table-row {
    grid-template-columns:
      minmax(88px, 0.9fr)
      minmax(78px, 0.8fr)
      minmax(80px, 0.8fr)
      minmax(86px, 0.9fr)
      minmax(104px, 1fr)
      minmax(86px, 1fr)
      minmax(100px, 1.3fr)
      80px;
  }

  .transaction-table .table-header > *,
  .transaction-table .table-row > * {
    padding: 10px 8px;
  }
}

/* Màn hình rất hẹp: bảng cuộn ngang bên trong khung (vẫn nằm trong bảng) */
@media (max-width: 820px) {
  .table-wrapper {
    overflow-x: auto;
  }

  .transaction-table {
    min-width: 780px;
  }
}

/* ---------- Bộ lọc nhật ký: xem theo ngày / tháng / năm ---------- */

.log-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin: -4px 0 16px;
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 18px;
}

.log-filter-modes {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
}

.log-filter-modes button {
  padding: 7px 16px;
  color: #525252;
  background: transparent;
  border: 0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.15s ease;
}

.log-filter-modes button:hover:not(.active) {
  color: #ea580c;
  background: #fff7ed;
}

.log-filter-modes button.active {
  color: #ffffff;
  background: #0a0a0a;
}

.log-filter-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: #737373;
}

.log-filter-picker .page-month-select {
  min-width: 0;
  min-height: 38px;
  padding: 7px 14px;
}

.app.theme-v14.light-mode.is-dark .log-filter {
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .log-filter-modes {
  background: #161618;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .log-filter-modes button {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .log-filter-modes button:hover:not(.active) {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
}

.app.theme-v14.light-mode.is-dark .log-filter-modes button.active {
  color: #0a0a0a;
  background: #fafafa;
}
/* =========================================================
   THỐNG KÊ THÁNG — bảng 3 cột cân đối + bộ chọn tháng dạng viên thuốc
========================================================= */

.ms-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

/* ---------- Bảng ---------- */

.ms-table {
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 22px;
}

.ms-head,
.ms-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 110px 190px;
  align-items: center;
  column-gap: 12px;
  padding: 0 22px;
}

.ms-head {
  min-height: 46px;
  color: #ea580c;
  background: #fafafa;
  border-bottom: 1px solid #ececec;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.ms-head span:nth-child(2),
.ms-cell-count {
  text-align: center;
}

.ms-head span:nth-child(3),
.ms-cell-value {
  text-align: right;
}

.ms-group + .ms-group {
  border-top: 1px solid #ececec;
}

.ms-group-title {
  padding: 14px 22px 6px;
  color: #ea580c;
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.ms-row {
  min-height: 52px;
  color: #0a0a0a;
  font-size: 15px;
  transition: background 0.15s ease;
}

.ms-row:hover {
  background: #fafafa;
}

.ms-cell-label {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
}

.ms-cell-count {
  color: #737373;
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ms-cell-value {
  font-size: 15px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ms-cell-value.is-expense {
  color: #dc2626;
}

.ms-cell-value.is-income,
.ms-cell-value.is-positive {
  color: #16a34a;
}

.ms-ico {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border-radius: 999px;
}

.ms-ico.is-expense {
  color: #dc2626;
  background: #fef2f2;
}

.ms-ico.is-income,
.ms-ico.is-positive {
  color: #16a34a;
  background: #f0fdf4;
}

.ms-row.is-strong {
  background: #fafafa;
}

.ms-row.is-strong .ms-cell-label {
  font-weight: 800;
}

.ms-row.is-final {
  min-height: 60px;
  color: #ffffff;
  background: #ea580c;
}

.ms-row.is-final:hover {
  background: #ea580c;
}

.ms-row.is-final .ms-cell-label,
.ms-row.is-final .ms-cell-value {
  font-size: 16px;
  font-weight: 800;
}

.ms-row.is-final .ms-cell-label {
  color: #ffffff;
}

.ms-row.is-final .ms-cell-count {
  color: rgba(255, 255, 255, 0.5);
}

.ms-row.is-final .ms-cell-value {
  justify-self: end;
  padding: 6px 16px;
  line-height: 1.2;
  background: #ffffff;
  border-radius: 999px;
}

.ms-row.is-final .ms-cell-value.is-positive {
  color: #15803d;
}

.ms-row.is-final .ms-cell-value.is-expense {
  color: #dc2626;
}

.ms-row.is-final .ms-ico {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.14);
}

/* ---------- Bộ chọn tháng (viên thuốc) ---------- */

.ms-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 22px;
}

.ms-picker-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0a0a0a;
  font-size: 13.5px;
  font-weight: 800;
}

.ms-picker-title svg {
  color: #ea580c;
}

.ms-year-pill {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
}

.ms-year-pill button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  color: #525252;
  background: transparent;
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.15s ease;
}

.ms-year-pill button:hover {
  color: #ea580c;
  background: #fff7ed;
}

.ms-year-pill select {
  flex: 1;
  min-width: 0;
  height: 32px;
  color: #0a0a0a;
  background: transparent;
  border: 0;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  text-align: center;
  text-align-last: center;
  cursor: pointer;
  outline: none;
}

.ms-year-pill select:hover,
.ms-year-pill select:focus-visible {
  color: #ea580c;
  background: #fff7ed;
}

.ms-month-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.ms-month-pill {
  position: relative;
  height: 38px;
  padding: 0 6px;
  color: #525252;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: 0.15s ease;
}

.ms-month-pill:hover:not(.active) {
  color: #ea580c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.ms-month-pill.is-current:not(.active) {
  color: #ea580c;
  border-color: #fdba74;
}

.ms-month-pill.has-data::after {
  content: "";
  position: absolute;
  top: 6px;
  right: 11px;
  width: 5px;
  height: 5px;
  background: #f97316;
  border-radius: 999px;
}

.ms-month-pill.active {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.ms-current-pill {
  height: 38px;
  color: #ea580c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.15s ease;
}

.ms-current-pill:hover {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.ms-picker-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 16px;
  background: #fafafa;
  border: 1px solid #ececec;
  border-radius: 999px;
  font-size: 13px;
}

.ms-picker-foot strong {
  color: #0a0a0a;
  font-weight: 800;
}

.ms-picker-foot span {
  color: #737373;
  font-weight: 600;
}

/* ---------- Giao diện tối ---------- */

.app.theme-v14.light-mode.is-dark .ms-table,
.app.theme-v14.light-mode.is-dark .ms-picker {
  background: #161618;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .ms-head,
.app.theme-v14.light-mode.is-dark .ms-group-title {
  color: #fb923c;
  background: #1c1c1f;
  border-bottom-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .ms-group + .ms-group {
  border-top-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .ms-row {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .ms-row:hover,
.app.theme-v14.light-mode.is-dark .ms-row.is-strong {
  background: #1c1c1f;
}

.app.theme-v14.light-mode.is-dark .ms-cell-count {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .ms-cell-value.is-expense {
  color: #f87171;
}

.app.theme-v14.light-mode.is-dark .ms-cell-value.is-income,
.app.theme-v14.light-mode.is-dark .ms-cell-value.is-positive {
  color: #4ade80;
}

.app.theme-v14.light-mode.is-dark .ms-ico.is-expense {
  color: #f87171;
  background: rgba(239, 68, 68, 0.16);
}

.app.theme-v14.light-mode.is-dark .ms-ico.is-income,
.app.theme-v14.light-mode.is-dark .ms-ico.is-positive {
  color: #4ade80;
  background: rgba(34, 197, 94, 0.16);
}

.app.theme-v14.light-mode.is-dark .ms-row.is-final,
.app.theme-v14.light-mode.is-dark .ms-row.is-final:hover {
  background: #ea580c;
}

.app.theme-v14.light-mode.is-dark .ms-row.is-final .ms-cell-value {
  background: #ffffff;
}

.app.theme-v14.light-mode.is-dark .ms-row.is-final .ms-cell-value.is-positive {
  color: #15803d;
}

.app.theme-v14.light-mode.is-dark .ms-row.is-final .ms-cell-value.is-expense {
  color: #dc2626;
}

.app.theme-v14.light-mode.is-dark .ms-picker-title,
.app.theme-v14.light-mode.is-dark .ms-picker-foot strong {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .ms-year-pill,
.app.theme-v14.light-mode.is-dark .ms-month-pill {
  color: #a1a1aa;
  background: #161618;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .ms-year-pill button {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .ms-year-pill select {
  color: #fafafa;
  background: transparent;
}

.app.theme-v14.light-mode.is-dark .ms-year-pill select option {
  color: #fafafa;
  background: #1c1c1f;
}

.app.theme-v14.light-mode.is-dark .ms-year-pill button:hover,
.app.theme-v14.light-mode.is-dark .ms-year-pill select:hover,
.app.theme-v14.light-mode.is-dark .ms-month-pill:hover:not(.active) {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.theme-v14.light-mode.is-dark .ms-month-pill.active {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.app.theme-v14.light-mode.is-dark .ms-current-pill {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.theme-v14.light-mode.is-dark .ms-current-pill:hover {
  color: #ffffff;
  background: #ea580c;
}

.app.theme-v14.light-mode.is-dark .ms-picker-foot {
  background: #1c1c1f;
  border-color: #27272a;
}

/* ---------- Responsive ---------- */

@media (max-width: 1100px) {
  .ms-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .ms-picker {
    order: -1;
  }
}

@media (max-width: 620px) {
  .ms-head,
  .ms-row {
    grid-template-columns: minmax(0, 1fr) 64px auto;
    padding: 0 14px;
    column-gap: 8px;
  }

  .ms-group-title {
    padding: 12px 14px 4px;
  }

  .ms-ico {
    display: none;
  }

  .ms-cell-label,
  .ms-cell-count,
  .ms-cell-value,
  .ms-row {
    font-size: 14px;
  }

  .ms-row.is-final .ms-cell-label,
  .ms-row.is-final .ms-cell-value {
    font-size: 15px;
  }
}
/* =========================================================
   NGÂN SÁCH — thanh tỷ lệ 100% và bộ chọn tháng dạng lịch
========================================================= */

.bsb {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 18px;
  padding: 16px 18px;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 20px;
}

.bsb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.bsb-head strong {
  color: #0a0a0a;
  font-size: 14px;
  font-weight: 800;
}

.bsb-head em {
  padding: 3px 12px;
  color: #ea580c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  font-size: 13px;
  font-style: normal;
  font-weight: 800;
}

.bsb-bar {
  display: flex;
  gap: 3px;
  height: 14px;
  overflow: hidden;
  background: #f4f4f5;
  border-radius: 999px;
}

.bsb-seg {
  display: block;
  height: 100%;
  min-width: 6px;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.bsb-seg.is-food,
.bsb-dot.is-food {
  background: #f97316;
}

.bsb-seg.is-rent,
.bsb-dot.is-rent {
  background: #3b82f6;
}

.bsb-seg.is-other,
.bsb-dot.is-other {
  background: #8b5cf6;
}

.bsb-legend {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.bsb-legend-item {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  color: #525252;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.bsb-legend-item strong {
  margin-left: auto;
  color: #0a0a0a;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.bsb-dot {
  flex: 0 0 9px;
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

/* ---------- Bộ chọn tháng (biểu tượng lịch) ---------- */

.bmp {
  position: relative;
  display: inline-block;
}

.bmp-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: #ea580c;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.15s ease;
}

.bmp-trigger:hover,
.bmp-trigger.active {
  background: #fff7ed;
  border-color: #fdba74;
}

.bmp-pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 292px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 22px;
  box-shadow: 0 22px 48px -14px rgba(24, 24, 27, 0.35);
}

.bmp-year {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.bmp-year strong {
  color: #0a0a0a;
  font-size: 14px;
  font-weight: 800;
}

.bmp-year button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  color: #525252;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  cursor: pointer;
  transition: 0.15s ease;
}

.bmp-year button:hover {
  color: #ea580c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.bmp-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.bmp-month {
  position: relative;
  height: 46px;
  padding: 0 4px;
  color: #404040;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: 0.15s ease;
}

.bmp-month:hover:not(.active) {
  color: #ea580c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.bmp-month.has-budget::after {
  content: "";
  position: absolute;
  top: 7px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: #f97316;
  border-radius: 999px;
}

.bmp-month.active {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.bmp-month.active.has-budget::after {
  background: #ffffff;
}

.bmp-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 2px;
  color: #737373;
  font-size: 12px;
  font-weight: 600;
}

.bmp-foot i {
  width: 6px;
  height: 6px;
  background: #f97316;
  border-radius: 999px;
}

/* ---------- Giao diện tối ---------- */

.app.theme-v14.light-mode.is-dark .bsb,
.app.theme-v14.light-mode.is-dark .bmp-pop {
  background: #161618;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .bsb-bar {
  background: #27272a;
}

.app.theme-v14.light-mode.is-dark .bsb-head strong,
.app.theme-v14.light-mode.is-dark .bsb-legend-item strong,
.app.theme-v14.light-mode.is-dark .bmp-year strong {
  color: #fafafa;
}

.app.theme-v14.light-mode.is-dark .bsb-legend-item,
.app.theme-v14.light-mode.is-dark .bmp-foot {
  color: #a1a1aa;
}

.app.theme-v14.light-mode.is-dark .bsb-head em {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.theme-v14.light-mode.is-dark .bmp-trigger,
.app.theme-v14.light-mode.is-dark .bmp-year button,
.app.theme-v14.light-mode.is-dark .bmp-month {
  color: #d4d4d8;
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .bmp-trigger {
  color: #fb923c;
}

.app.theme-v14.light-mode.is-dark .bmp-trigger:hover,
.app.theme-v14.light-mode.is-dark .bmp-trigger.active,
.app.theme-v14.light-mode.is-dark .bmp-year button:hover,
.app.theme-v14.light-mode.is-dark .bmp-month:hover:not(.active) {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.theme-v14.light-mode.is-dark .bmp-month.active {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

@media (max-width: 520px) {
  .bsb-legend {
    grid-template-columns: minmax(0, 1fr);
  }

  .bmp-pop {
    width: min(292px, calc(100vw - 64px));
  }
}
/* =========================================================
   NGÂN SÁCH — gọn lại để vừa trong 1 màn hình
   Vạch tiến độ theo màu từng khoản: ăn = cam · trọ = xanh dương · khác = tím
========================================================= */

.progress div.tone-food {
  background: #f97316;
}

.progress div.tone-rent {
  background: #3b82f6;
}

.progress div.tone-other {
  background: #8b5cf6;
}

.bi-chip {
  align-self: center;
  padding: 4px 12px;
  font-size: 12.5px;
  font-style: normal;
  font-weight: 800;
  border: 1px solid transparent;
  border-radius: 999px;
  white-space: nowrap;
}

.bi-chip.is-safe {
  color: #15803d;
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.bi-chip.is-warning {
  color: #b45309;
  background: #fffbeb;
  border-color: #fde68a;
}

.bi-chip.is-danger {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

.bi-chip.is-muted {
  color: #737373;
  background: #f4f4f5;
  border-color: #ececec;
}

.budget-detail-grid strong.is-over {
  color: #dc2626;
}

.app.theme-v14.light-mode .budget-page .summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.app.theme-v14.light-mode .budget-page .summary-card {
  min-height: 0;
  padding: 12px 16px 14px;
  border-radius: 18px;
}

.app.theme-v14.light-mode .budget-page .summary-card:hover {
  transform: none;
}

.app.theme-v14.light-mode .budget-page .summary-title {
  gap: 8px;
  font-size: 12px;
}

.app.theme-v14.light-mode .budget-page .summary-title svg {
  box-sizing: border-box;
  width: 28px;
  height: 28px;
  padding: 6px;
  border-radius: 10px;
}

.app.theme-v14.light-mode .budget-page .summary-money {
  margin-top: 8px;
  font-size: 20px;
}

.app.theme-v14.light-mode .budget-page .dashboard-grid {
  gap: 12px;
  align-items: start;
}

.app.theme-v14.light-mode .budget-page .panel {
  margin-bottom: 0;
  padding: 14px 16px;
  border-radius: 20px;
}

.app.theme-v14.light-mode .budget-page .panel-title {
  min-height: 42px;
  margin-bottom: 10px;
  padding-bottom: 10px;
}

.app.theme-v14.light-mode .budget-page .panel-title h2 {
  font-size: 17px;
}

.app.theme-v14.light-mode .budget-page .bmp-trigger {
  width: 36px;
  height: 36px;
}

.app.theme-v14.light-mode .budget-page .form {
  gap: 10px;
}

.app.theme-v14.light-mode .budget-page .form-field {
  gap: 5px;
}

.app.theme-v14.light-mode .budget-page .form-field > span {
  font-size: 13px;
}

.app.theme-v14.light-mode .budget-page .form-field input {
  min-height: 40px;
  padding: 8px 12px;
  font-size: 14px;
}

.app.theme-v14.light-mode .budget-page .primary-button,
.app.theme-v14.light-mode .budget-page .danger-button {
  min-height: 40px;
  padding: 8px 14px;
  font-size: 13px;
}

.app.theme-v14.light-mode .budget-page .budget-item {
  margin-bottom: 10px;
  padding: 12px 14px;
  border-radius: 16px;
}

.app.theme-v14.light-mode .budget-page .budget-item:last-child {
  margin-bottom: 0;
}

.app.theme-v14.light-mode .budget-page .budget-item-header {
  align-items: center;
}

.app.theme-v14.light-mode .budget-page .budget-item-header strong {
  font-size: 15px;
}

.app.theme-v14.light-mode .budget-page .budget-item-header span {
  margin-top: 2px;
  font-size: 12px;
}

.app.theme-v14.light-mode .budget-page .progress {
  height: 8px;
  margin-top: 10px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid {
  gap: 8px;
  margin-top: 10px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid > div {
  padding: 7px 10px;
  border-radius: 12px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid span {
  margin: 0 0 2px;
  font-size: 10.5px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid strong {
  font-size: 13px;
  white-space: nowrap;
}

.app.theme-v14.light-mode.is-dark .bi-chip.is-safe {
  color: #4ade80;
  background: rgba(34, 197, 94, 0.14);
  border-color: rgba(34, 197, 94, 0.3);
}

.app.theme-v14.light-mode.is-dark .bi-chip.is-warning {
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.3);
}

.app.theme-v14.light-mode.is-dark .bi-chip.is-danger {
  color: #f87171;
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.3);
}

.app.theme-v14.light-mode.is-dark .bi-chip.is-muted {
  color: #a1a1aa;
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .budget-page .progress {
  background: #27272a;
}

.app.theme-v14.light-mode.is-dark .budget-detail-grid strong.is-over {
  color: #f87171;
}

@media (max-width: 1100px) {
  .app.theme-v14.light-mode .budget-page .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
/* =========================================================
   NGÂN SÁCH — hai bảng bằng nhau, vừa đúng 1 màn hình
   (chiều cao được đo trong JS và đưa vào biến --budget-page-h)
========================================================= */

.app.theme-v14.light-mode .budget-page {
  display: flex;
  flex-direction: column;
  height: var(--budget-page-h, auto);
  min-height: 0;
}

.app.theme-v14.light-mode .budget-page .summary-grid {
  flex: 0 0 auto;
}

.app.theme-v14.light-mode .budget-page .dashboard-grid {
  flex: 1 1 auto;
  min-height: 0;
  align-items: stretch;
  grid-template-rows: minmax(0, 1fr);
}

.app.theme-v14.light-mode .budget-page .panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.app.theme-v14.light-mode .budget-page .panel-title {
  flex: 0 0 auto;
}

/* Bảng trái: các ô nhập chia đều chiều cao, nút nằm sát đáy */
.app.theme-v14.light-mode .budget-page .form {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

.app.theme-v14.light-mode .budget-page .form-field {
  flex: 1 1 0;
  min-height: 0;
  align-content: center;
}

.app.theme-v14.light-mode .budget-page .primary-button,
.app.theme-v14.light-mode .budget-page .danger-button {
  flex: 0 0 auto;
}

/* Bảng phải: 3 khoản chia đều chiều cao */
.app.theme-v14.light-mode .budget-page .budget-item {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  justify-content: center;
  min-height: min-content;
  margin-bottom: 0;
}

.app.theme-v14.light-mode .budget-page .budget-item + .budget-item {
  margin-top: 10px;
}

.app.theme-v14.light-mode .budget-page .panel:last-child {
  overflow-y: auto;
}

@media (max-width: 1100px) {
  .app.theme-v14.light-mode .budget-page {
    height: auto;
  }

  .app.theme-v14.light-mode .budget-page .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto;
  }

  .app.theme-v14.light-mode .budget-page .panel {
    height: auto;
  }

  .app.theme-v14.light-mode .budget-page .form-field,
  .app.theme-v14.light-mode .budget-page .budget-item {
    flex: 0 0 auto;
  }
}
/* =========================================================
   NGÂN SÁCH — thu nhỏ thêm các ô tiền ăn / tiền trọ / chi khác
   để cả trang nằm gọn trong 1 màn hình
========================================================= */

.app.theme-v14.light-mode .budget-page .summary-grid {
  gap: 10px;
  margin-bottom: 10px;
}

.app.theme-v14.light-mode .budget-page .summary-card {
  padding: 9px 14px 11px;
  border-radius: 16px;
}

.app.theme-v14.light-mode .budget-page .summary-title {
  font-size: 11.5px;
}

.app.theme-v14.light-mode .budget-page .summary-title svg {
  width: 24px;
  height: 24px;
  padding: 5px;
  border-radius: 8px;
}

.app.theme-v14.light-mode .budget-page .summary-money {
  margin-top: 5px;
  font-size: 18px;
}

.app.theme-v14.light-mode .budget-page .dashboard-grid {
  gap: 10px;
}

.app.theme-v14.light-mode .budget-page .panel {
  padding: 12px 14px;
  border-radius: 18px;
}

.app.theme-v14.light-mode .budget-page .panel-title {
  min-height: 36px;
  margin-bottom: 8px;
  padding-bottom: 8px;
}

.app.theme-v14.light-mode .budget-page .panel-title h2 {
  font-size: 16px;
}

.app.theme-v14.light-mode .budget-page .bmp-trigger {
  width: 32px;
  height: 32px;
}

.app.theme-v14.light-mode .budget-page .form {
  gap: 8px;
}

.app.theme-v14.light-mode .budget-page .form-field {
  gap: 4px;
}

.app.theme-v14.light-mode .budget-page .form-field > span {
  font-size: 12.5px;
}

.app.theme-v14.light-mode .budget-page .form-field input {
  min-height: 36px;
  padding: 6px 12px;
  font-size: 13.5px;
}

.app.theme-v14.light-mode .budget-page .primary-button,
.app.theme-v14.light-mode .budget-page .danger-button {
  min-height: 36px;
  padding: 6px 12px;
  font-size: 12.5px;
}

/* ---------- 3 ô theo dõi: gọn, mỗi ô ~90px ---------- */

.app.theme-v14.light-mode .budget-page .budget-item {
  min-height: min-content;
  padding: 8px 12px;
  border-radius: 14px;
}

.app.theme-v14.light-mode .budget-page .budget-item + .budget-item {
  margin-top: 8px;
}

.app.theme-v14.light-mode .budget-page .budget-item-header strong {
  font-size: 14px;
}

.app.theme-v14.light-mode .budget-page .budget-item-header span {
  margin-top: 0;
  font-size: 11.5px;
  line-height: 1.3;
}

.app.theme-v14.light-mode .budget-page .bi-chip {
  padding: 2px 10px;
  font-size: 12px;
}

.app.theme-v14.light-mode .budget-page .progress {
  height: 6px;
  margin-top: 6px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid {
  gap: 6px;
  margin-top: 7px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid > div {
  padding: 4px 8px;
  border-radius: 10px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid span {
  margin: 0;
  font-size: 10px;
  line-height: 1.25;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid strong {
  font-size: 12.5px;
  line-height: 1.3;
}
/* =========================================================
   NGÂN SÁCH — viền trung tính cho các ô nhập và 3 ô theo dõi
========================================================= */

.app.theme-v14.light-mode .budget-page .form-field input {
  border: 1px solid #e7e5e4;
}

.app.theme-v14.light-mode .budget-page .budget-item {
  border: 1px solid #f0f0f0;
}

.app.theme-v14.light-mode.is-dark .budget-page .form-field input {
  border-color: #2f2f33;
}

.app.theme-v14.light-mode.is-dark .budget-page .budget-item {
  border-color: #27272a;
}
/* =========================================================
   NGÂN SÁCH — chữ to hơn trong 2 bảng, vẫn vừa 1 màn hình
   (chữ tăng, khoảng cách dọc giảm để bù chiều cao)
========================================================= */

.app.theme-v14.light-mode .budget-page .panel-title h2 {
  font-size: 18px;
}

/* ----- Bảng thiết lập ngân sách ----- */

.app.theme-v14.light-mode .budget-page .form-field > span {
  font-size: 14px;
  line-height: 1.2;
}

.app.theme-v14.light-mode .budget-page .form-field input {
  min-height: 42px;
  font-size: 16px;
  font-weight: 600;
}

.app.theme-v14.light-mode .budget-page .primary-button,
.app.theme-v14.light-mode .budget-page .danger-button {
  min-height: 42px;
  font-size: 14px;
}

/* ----- Bảng theo dõi ngân sách ----- */

.app.theme-v14.light-mode .budget-page .budget-item {
  padding: 6px 12px;
}

.app.theme-v14.light-mode .budget-page .budget-item-header strong {
  font-size: 16px;
  line-height: 1.2;
}

.app.theme-v14.light-mode .budget-page .budget-item-header span {
  font-size: 13px;
  line-height: 1.2;
}

.app.theme-v14.light-mode .budget-page .bi-chip {
  padding: 3px 12px;
  font-size: 13.5px;
}

.app.theme-v14.light-mode .budget-page .progress {
  height: 7px;
  margin-top: 5px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid {
  margin-top: 6px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid > div {
  padding: 3px 9px;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid span {
  font-size: 11.5px;
  line-height: 1.2;
}

.app.theme-v14.light-mode .budget-page .budget-detail-grid strong {
  overflow: hidden;
  font-size: 14.5px;
  line-height: 1.25;
  text-overflow: ellipsis;
}

/* =========================================================
   LỊCH HIỆN ĐẠI — ô chọn ngày (DatePicker) + lịch chọn tháng xem
========================================================= */

.dp-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 0 14px;
  color: #0a0a0a;
  background: #fafafa;
  border: 1px solid #e7e5e4;
  border-radius: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: 0.15s ease;
}

.dp-trigger svg {
  color: #ea580c;
}

.dp-trigger:hover,
.dp-trigger.open {
  background: #ffffff;
  border-color: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
}

.dp-placeholder {
  color: #a3a3a3;
  font-weight: 500;
}

.form-field .dp-trigger {
  min-height: 49px;
}

.page-month-select.dp-trigger {
  width: auto;
  min-width: 175px;
  min-height: 38px;
  border-radius: 999px;
}

.dp-trigger.goal-pay-date {
  width: 138px;
  min-height: 38px;
  padding: 0 12px;
  font-size: 13px;
}

.dp-pop {
  position: fixed;
  z-index: 3000;
  display: flex;
  flex-direction: column;
  padding: 16px;
  color: #0a0a0a;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 26px;
  box-shadow: 0 28px 60px -18px rgba(24, 24, 27, 0.4);
  animation: dpPop 0.16s ease-out;
}

@keyframes dpPop {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
  }
}

.dp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}

.dp-head strong {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.dp-head button {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #0a0a0a;
  background: #f4f4f5;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.dp-head button:hover {
  color: #ffffff;
  background: #ea580c;
}

.dp-weekdays,
.dp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.dp-weekdays span {
  padding: 4px 0;
  color: #a3a3a3;
  font-size: 11px;
  font-weight: 800;
  text-align: center;
}

.dp-grid {
  flex: 1;
  min-height: 0;
  grid-auto-rows: 1fr;
}

.dp-day {
  min-height: 0;
  padding: 0;
  color: #171717;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
}

.dp-day:hover {
  color: #c2410c;
  background: #fff7ed;
}

.dp-day.today {
  color: #ea580c;
  border-color: #fdba74;
  font-weight: 800;
}

.dp-day.selected {
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-color: #ea580c;
  box-shadow: 0 8px 16px -8px rgba(234, 88, 12, 0.7);
  font-weight: 800;
}

.dp-foot {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.dp-foot button {
  flex: 1;
  padding: 8px 0;
  color: #0a0a0a;
  background: #f4f4f5;
  border: 0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.dp-foot button.primary {
  color: #c2410c;
  background: #fff7ed;
}

.dp-foot button:hover {
  color: #ffffff;
  background: #ea580c;
}

html[data-theme="dark"] .dp-trigger {
  color: #fafafa;
  background: #1c1c1f;
  border-color: #2f2f33;
}

html[data-theme="dark"] .dp-trigger:hover,
html[data-theme="dark"] .dp-trigger.open {
  background: #161618;
  border-color: #f97316;
}

html[data-theme="dark"] .dp-pop {
  color: #fafafa;
  background: #18181b;
  border-color: #2f2f33;
}

html[data-theme="dark"] .dp-head button,
html[data-theme="dark"] .dp-foot button {
  color: #fafafa;
  background: #27272a;
}

html[data-theme="dark"] .dp-foot button.primary {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
}

html[data-theme="dark"] .dp-head button:hover,
html[data-theme="dark"] .dp-foot button:hover {
  color: #ffffff;
  background: #ea580c;
}

html[data-theme="dark"] .dp-day {
  color: #e4e4e7;
}

html[data-theme="dark"] .dp-day:hover {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
}

html[data-theme="dark"] .dp-day.selected {
  color: #ffffff;
}

/* Lịch chọn tháng xem (biểu đồ chi tiêu): to hơn, bo tròn, hiện đại hơn */
.calendar-picker .calendar-pop {
  width: 292px;
  height: 292px;
  padding: 14px;
  border-radius: 24px;
  box-shadow: 0 26px 56px -18px rgba(24, 24, 27, 0.4);
}

.calendar-picker .calendar-nav-title {
  font-size: 15px;
}

.calendar-picker .calendar-nav button:not(.calendar-nav-title) {
  width: 30px;
  height: 30px;
  background: #f4f4f5;
  border-radius: 50%;
}

.calendar-picker .mini-cal-day {
  border-radius: 11px;
  font-size: 12.5px;
}

.calendar-picker .mini-cal-day.today {
  box-shadow: inset 0 0 0 1px #fdba74;
}

.calendar-trigger {
  width: 42px;
  height: 42px;
  border-radius: 14px;
}

.bmp-trigger {
  border-radius: 14px;
}

.goal-add {
  flex-wrap: wrap;
}

.goal-history {
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.goal-history-title {
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.goal-history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
  border-top: 1px dashed var(--border);
  color: var(--text-secondary);
  font-size: 13px;
}

.goal-history-row:first-of-type {
  border-top: 0;
}

.goal-history-row b {
  color: var(--text-primary);
}

.goal-history-row strong {
  color: var(--color-income);
}

/* =========================================================
   NHẬT KÝ GIAO DỊCH — icon theo loại ở cột ID + nhãn LOẠI pastel
   Cùng bảng màu với 4 thẻ ở Tổng quan:
   Đầu vào = xanh bạc hà · Đầu ra = hồng phấn · Tip/Âm = tím nhạt · Chuyển tiền = xanh da trời
========================================================= */

.transaction-table {
  --t-income-bg: #dcfce7;
  --t-income-ink: #166534;
  --t-expense-bg: #ffe4e6;
  --t-expense-ink: #9f1239;
  --t-adjustment-bg: #fff4c2;
  --t-adjustment-ink: #7a5a00;
  --t-transfer-bg: #e0f2fe;
  --t-transfer-ink: #075985;
}

/* Ô ID: icon tròn + mã giao dịch */
.transaction-table .table-row .id-cell {
  gap: 8px;
  flex-wrap: nowrap;
}

.transaction-table .table-row .id-cell .id-code {
  display: inline;
  padding: 0;
  border: 0;
  overflow-wrap: normal;
  white-space: nowrap;
}

.id-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-style: normal;
}

.id-type-icon.income {
  color: var(--t-income-ink);
  background: var(--t-income-bg);
}

.id-type-icon.expense {
  color: var(--t-expense-ink);
  background: var(--t-expense-bg);
}

.id-type-icon.adjustment {
  color: var(--t-adjustment-ink);
  background: var(--t-adjustment-bg);
}

.id-type-icon.transfer {
  color: var(--t-transfer-ink);
  background: var(--t-transfer-bg);
}

/* Nhãn LOẠI dạng viên pastel, không viền (giống ảnh Completed / Pending) */
.transaction-table .type-badge {
  padding: 5px 12px;
  border: 0;
  border-radius: 8px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.transaction-table .type-badge.income {
  color: var(--t-income-ink);
  background: var(--t-income-bg);
}

.transaction-table .type-badge.expense {
  color: var(--t-expense-ink);
  background: var(--t-expense-bg);
}

.transaction-table .type-badge.adjustment {
  color: var(--t-adjustment-ink);
  background: var(--t-adjustment-bg);
}

.transaction-table .type-badge.transfer {
  color: var(--t-transfer-ink);
  background: var(--t-transfer-bg);
}

/* Ban đêm: nền trong suốt theo màu, chữ sáng */
.app.is-dark .transaction-table {
  --t-income-bg: rgba(74, 222, 128, 0.16);
  --t-income-ink: #86efac;
  --t-expense-bg: rgba(251, 113, 133, 0.16);
  --t-expense-ink: #fda4af;
  --t-adjustment-bg: rgba(250, 204, 21, 0.16);
  --t-adjustment-ink: #fde68a;
  --t-transfer-bg: rgba(56, 189, 248, 0.16);
  --t-transfer-ink: #7dd3fc;
}

/* =========================================================
   NHẬT KÝ GIAO DỊCH — bỏ vạch dọc, gạch ngang mờ, lọc, phân trang
========================================================= */

/* Bỏ nét | ngăn cách giữa các cột */
.app .transaction-table .table-header > *,
.app .transaction-table .table-row > * {
  border-left: 0;
}

/* Gạch ngang giữa các giao dịch: mờ nhẹ thay cho nét đen/cam */
.app .transaction-table .table-row {
  border-top: 1px solid rgba(24, 24, 27, 0.07);
}

.app.is-dark .transaction-table .table-row {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.log-page {
  display: flex;
  flex-direction: column;
}

.log-page .log-filter {
  margin: 0 0 10px;
}

.log-range-label {
  color: #737373;
  font-size: 13px;
  font-weight: 700;
}

.log-filter-types {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  flex-basis: 100%;
  gap: 8px;
}

.log-type-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  color: #525252;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  transition: 0.15s ease;
}

.log-type-chip:hover:not(.active) {
  border-color: #fdba74;
  color: #ea580c;
}

.log-type-chip.all.active {
  color: #ffffff;
  background: #0a0a0a;
  border-color: #0a0a0a;
}

.log-type-chip.income.active {
  color: #166534;
  background: #dcfce7;
  border-color: #86efac;
}

.log-type-chip.expense.active {
  color: #9f1239;
  background: #ffe4e6;
  border-color: #fda4af;
}

.log-type-chip.adjustment.active {
  color: #7a5a00;
  background: #fff4c2;
  border-color: #f2d56b;
}

.log-type-chip.transfer.active {
  color: #075985;
  background: #e0f2fe;
  border-color: #7dd3fc;
}

.log-scope {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  margin: 0 0 10px;
  padding: 0 4px;
  color: #737373;
  font-size: 13px;
}

.log-scope strong {
  color: #0a0a0a;
  font-size: 14px;
  font-weight: 800;
}

/* Mỗi giao dịch 1 dòng cố định để chia trang vừa màn hình */
.log-table .transaction-table .table-row {
  height: 54px;
  overflow: hidden;
}

.log-table .transaction-table .table-row .content-cell,
.log-table .transaction-table .table-row .account-cell {
  display: block;
  align-self: center;
  overflow: hidden;
  line-height: 30px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Phân trang */
.log-pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 48px;
  margin-top: 12px;
}

.log-pager-info {
  color: #737373;
  font-size: 13px;
  font-weight: 600;
}

.log-pager-pages {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.log-pager-pages button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  color: #404040;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 700;
  transition: 0.15s ease;
}

.log-pager-pages button:hover:not(:disabled):not(.active) {
  color: #ea580c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.log-pager-pages button.active {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.log-pager-pages button:disabled {
  opacity: 0.35;
  cursor: default;
}

.log-pager-pages i {
  color: #a3a3a3;
  font-style: normal;
  font-weight: 800;
}

.app.is-dark .log-range-label,
.app.is-dark .log-scope,
.app.is-dark .log-pager-info {
  color: #a1a1aa;
}

.app.is-dark .log-scope strong {
  color: #fafafa;
}

.app.is-dark .log-type-chip,
.app.is-dark .log-pager-pages button {
  color: #d4d4d8;
  background: #1c1c1f;
  border-color: #27272a;
}

.app.is-dark .log-type-chip.all.active {
  color: #0a0a0a;
  background: #fafafa;
  border-color: #fafafa;
}

.app.is-dark .log-type-chip.income.active {
  color: #86efac;
  background: rgba(74, 222, 128, 0.16);
  border-color: rgba(74, 222, 128, 0.4);
}

.app.is-dark .log-type-chip.expense.active {
  color: #fda4af;
  background: rgba(251, 113, 133, 0.16);
  border-color: rgba(251, 113, 133, 0.4);
}

.app.is-dark .log-type-chip.adjustment.active {
  color: #fde68a;
  background: rgba(250, 204, 21, 0.16);
  border-color: rgba(250, 204, 21, 0.4);
}

.app.is-dark .log-type-chip.transfer.active {
  color: #7dd3fc;
  background: rgba(56, 189, 248, 0.16);
  border-color: rgba(56, 189, 248, 0.4);
}

.app.is-dark .log-pager-pages button.active {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

/* =========================================================
   CHUÔNG THÔNG BÁO KHI THÊM GIAO DỊCH
   Chuông lắc, 2 "tai" hai bên nhấp nháy, viền thẻ nháy cam.
========================================================= */

@keyframes bellToastLife {
  0% {
    opacity: 0;
    transform: translate(-50%, -16px) scale(0.94);
  }

  9%,
  88% {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -10px) scale(0.97);
  }
}

@keyframes bellSwing {
  0%,
  100% {
    transform: rotate(0deg);
  }

  15% {
    transform: rotate(16deg);
  }

  30% {
    transform: rotate(-14deg);
  }

  45% {
    transform: rotate(10deg);
  }

  60% {
    transform: rotate(-7deg);
  }

  75% {
    transform: rotate(3deg);
  }
}

@keyframes earBlink {
  0%,
  100% {
    opacity: 0.12;
  }

  50% {
    opacity: 1;
  }
}

@keyframes bellGlow {
  0%,
  100% {
    border-color: #fed7aa;
    box-shadow: 0 18px 40px -14px rgba(24, 24, 27, 0.35),
      0 0 0 0 rgba(249, 115, 22, 0);
  }

  50% {
    border-color: #f97316;
    box-shadow: 0 18px 40px -14px rgba(24, 24, 27, 0.35),
      0 0 0 6px rgba(249, 115, 22, 0.22);
  }
}

.bell-toast {
  position: fixed;
  top: calc(var(--top-h, 72px) + 14px);
  left: 50%;
  z-index: 400;
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 280px;
  max-width: calc(100vw - 24px);
  padding: 10px 22px 10px 10px;
  color: #0a0a0a;
  background: #ffffff;
  border: 2px solid #fed7aa;
  border-radius: 999px;
  pointer-events: none;
  animation: bellToastLife 3.2s ease both, bellGlow 0.7s ease-in-out infinite;
}

.bell-toast-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 52px;
  width: 52px;
  height: 52px;
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-radius: 50%;
}

.ring-body {
  transform-box: view-box;
  transform-origin: 24px 8px;
  animation: bellSwing 0.9s ease-in-out infinite;
}

.ring-ears .ear-in {
  animation: earBlink 0.7s ease-in-out infinite;
}

.ring-ears .ear-out {
  animation: earBlink 0.7s ease-in-out 0.35s infinite;
}

.bell-toast-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bell-toast-text strong {
  font-size: 14.5px;
  font-weight: 800;
}

.bell-toast-text span {
  overflow: hidden;
  color: #737373;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app.is-dark .bell-toast {
  color: #fafafa;
  background: #161618;
}

.app.is-dark .bell-toast-text span {
  color: #a1a1aa;
}

@media (prefers-reduced-motion: reduce) {
  .ring-body,
  .ring-ears .ear-in,
  .ring-ears .ear-out,
  .bell-toast {
    animation-duration: 0.01s;
    animation-iteration-count: 1;
  }

  .bell-toast {
    animation: bellToastLife 3.2s ease both;
  }
}

/* =========================================================
   NHẬT KÝ v3 — bỏ Chuyển tiền, tìm kiếm bên phải, màu cam, bảng kín màn hình
========================================================= */

/* Thêm giao dịch: còn 3 tab */
.app.theme-v14.light-mode .transaction-tabs {
  grid-template-columns: repeat(3, 1fr);
}

/* Bố cục bộ lọc: trái = chế độ + loại, phải = tìm kiếm trên lịch */
.log-page .log-filter {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
}

.log-filter-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}

.log-page .log-filter-types {
  flex-basis: auto;
}

.log-filter-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  margin-left: auto;
}

.log-search {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 290px;
  max-width: 100%;
  height: 40px;
  padding: 0 10px 0 14px;
  color: #737373;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  transition: 0.15s ease;
}

.log-search:focus-within {
  border-color: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
}

.log-search input,
.app.theme-v14.light-mode .log-search input {
  flex: 1;
  min-width: 0;
  color: #0a0a0a;
  background: transparent;
  border: 0;
  outline: 0;
  font-size: 13.5px;
}

.log-search button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
  color: #737373;
  background: #f4f4f5;
  border: 0;
  border-radius: 50%;
}

.log-search button:hover {
  color: #ffffff;
  background: #ea580c;
}

.log-filter-right.searching .log-filter-picker {
  opacity: 0.4;
}

.log-filter-picker {
  position: relative;
}

/* Màu cam thay cho màu đen khi chọn Theo ngày / tháng / năm / Tất cả */
.app.theme-v14.light-mode .log-filter-modes button.active,
.app.theme-v14.light-mode .log-type-chip.all.active,
.app.theme-v14.light-mode.is-dark .log-filter-modes button.active,
.app.theme-v14.light-mode.is-dark .log-type-chip.all.active {
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-color: #ea580c;
  box-shadow: 0 8px 16px -8px rgba(234, 88, 12, 0.7);
}

/* Bảng nhật ký kéo dài tới đáy màn hình */
.app.theme-v14.light-mode .log-page {
  height: var(--log-page-h, auto);
  margin-bottom: 0;
}

.log-page .log-table {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

.log-page .log-table .table-wrapper,
.log-page .log-table .transaction-table {
  height: 100%;
}

.log-page .log-table .transaction-table {
  min-width: 0;
}

.log-table .transaction-table .table-row {
  height: var(--log-row-h, 54px);
}

.log-page .log-pager {
  flex: 0 0 auto;
  margin-top: 10px;
}

/* =========================================================
   BỘ CHỌN THÁNG / NĂM (PeriodPicker)
========================================================= */

.pp {
  position: relative;
  display: inline-block;
}

.pp-trigger {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 42px;
  padding: 0 18px 0 14px;
  color: #0a0a0a;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.15s ease;
}

.pp-trigger svg {
  color: #ea580c;
}

.pp-trigger:hover,
.pp-trigger.open {
  background: #fff7ed;
  border-color: #f97316;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
}

.pp-pop {
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 308px;
  padding: 16px;
  color: #0a0a0a;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 24px;
  box-shadow: 0 28px 60px -18px rgba(24, 24, 27, 0.4);
  animation: dpPop 0.16s ease-out;
}

.pp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pp-head > button:not(.pp-title) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  color: #0a0a0a;
  background: #f4f4f5;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.pp-head > button:not(.pp-title):hover {
  color: #ffffff;
  background: #ea580c;
}

.pp-title {
  flex: 1;
  height: 34px;
  color: #0a0a0a;
  background: transparent;
  border: 0;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 800;
  text-align: center;
  cursor: pointer;
}

button.pp-title:hover {
  color: #ea580c;
  background: #fff7ed;
}

.pp-title.static {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.pp-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.pp-cell {
  position: relative;
  height: 46px;
  padding: 0 4px;
  color: #404040;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 14px;
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: 0.15s ease;
}

.pp-cell:hover:not(.active) {
  color: #ea580c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.pp-cell.is-current:not(.active) {
  color: #ea580c;
  border-color: #fdba74;
}

.pp-cell.has-data::after {
  content: "";
  position: absolute;
  top: 7px;
  right: 9px;
  width: 6px;
  height: 6px;
  background: #f97316;
  border-radius: 999px;
}

.pp-cell.active {
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-color: #ea580c;
}

.pp-cell.active.has-data::after {
  background: #ffffff;
}

.pp-foot {
  display: flex;
  gap: 8px;
}

.pp-foot button {
  flex: 1;
  height: 36px;
  color: #c2410c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.pp-foot button:hover {
  color: #ffffff;
  background: #ea580c;
  border-color: #ea580c;
}

.pp-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #737373;
  font-size: 12px;
  font-weight: 600;
}

.pp-legend i {
  width: 6px;
  height: 6px;
  background: #f97316;
  border-radius: 999px;
}

.app.is-dark .log-search,
.app.is-dark .pp-trigger,
.app.is-dark .pp-cell {
  color: #e4e4e7;
  background: #1c1c1f;
  border-color: #27272a;
}

.app.theme-v14.light-mode.is-dark .log-search input {
  color: #fafafa;
}

.app.is-dark .log-search button {
  color: #a1a1aa;
  background: #27272a;
}

.app.is-dark .pp-trigger:hover,
.app.is-dark .pp-trigger.open,
.app.is-dark .pp-cell:hover:not(.active) {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.4);
}

.app.is-dark .pp-pop {
  color: #fafafa;
  background: #161618;
  border-color: #27272a;
}

.app.is-dark .pp-title,
.app.is-dark .pp-head > button:not(.pp-title) {
  color: #fafafa;
}

.app.is-dark .pp-head > button:not(.pp-title) {
  background: #27272a;
}

.app.is-dark .pp-foot button {
  color: #fdba74;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

.app.is-dark .pp-legend {
  color: #a1a1aa;
}

.app.is-dark .pp-cell.active {
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-color: #ea580c;
}

/* =========================================================
   NÚT CHUÔNG: có giao dịch mới chưa đọc → chuông 2 tai nhấp nháy
========================================================= */

.icon-button.ringing,
.app.theme-v14.light-mode .icon-button.ringing,
.app.theme-v14.light-mode.is-dark .icon-button.ringing {
  width: 48px;
  flex-basis: 48px;
  color: #ea580c;
  background: #fff7ed;
  border-color: #fdba74;
  animation: bellGlow 0.7s ease-in-out infinite;
}

.app.theme-v14.light-mode.is-dark .icon-button.ringing {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.16);
}

.icon-button.ringing svg {
  overflow: visible;
}

@media (prefers-reduced-motion: reduce) {
  .icon-button.ringing {
    animation: none;
  }
}

@media (max-width: 900px) {
  .log-filter-right {
    align-items: flex-start;
    margin-left: 0;
    width: 100%;
  }

  .log-search {
    width: 100%;
  }

  .pp-pop {
    right: auto;
    left: 0;
  }
}

/* ---------- Nhật ký: nhóm Theo ngày / tháng / năm căn giữa so với nhóm Tất cả / Đầu vào / Đầu ra / Tip ---------- */

.log-page .log-filter-left {
  align-items: center;
}

.log-page .log-filter-types {
  justify-content: center;
}

/* ---------- DatePicker: phần Tuỳ chỉnh (chọn ngày, tháng, năm tuỳ ý) ---------- */

.dp-custom {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
}

.dp-custom-title {
  padding: 6px 0 2px;
  color: #0a0a0a;
  font-size: 16px;
  font-weight: 800;
  text-align: center;
}

.dp-custom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1.35fr;
  gap: 10px;
}

.dp-custom-grid label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}

.dp-custom-grid label span {
  color: #737373;
  font-size: 11.5px;
  font-weight: 700;
}

.dp-custom-grid select {
  width: 100%;
  height: 38px;
  padding: 0 8px;
  color: #0a0a0a;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.dp-custom-grid select:focus {
  outline: none;
  border-color: #fdba74;
}

.dp-custom-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  margin-top: auto;
  padding: 12px 8px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 16px;
  text-align: center;
}

.dp-custom-preview strong {
  color: #c2410c;
  font-size: 15px;
  font-weight: 800;
}

.dp-custom-preview span {
  color: #737373;
  font-size: 12px;
}

html[data-theme="dark"] .dp-custom-title,
html[data-theme="dark"] .dp-custom-grid select {
  color: #fafafa;
}

html[data-theme="dark"] .dp-custom-grid select {
  background: #1c1c1f;
  border-color: #2f2f33;
}

html[data-theme="dark"] .dp-custom-preview {
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

html[data-theme="dark"] .dp-custom-preview strong {
  color: #fdba74;
}

/* ---------- Thống kê tháng: bấm "Năm ..." để xem nhiều năm ---------- */

.ms-year-pill .ms-year-title {
  flex: 1;
  width: auto;
  min-width: 0;
  height: 32px;
  color: #0a0a0a;
  font-size: 14px;
  font-weight: 800;
}

.ms-year-pill .ms-year-title::after {
  content: "";
  display: inline-block;
  margin-left: 7px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid currentColor;
  vertical-align: middle;
  opacity: 0.55;
}

.ms-year-pill .ms-year-title[aria-expanded="true"]::after {
  transform: rotate(180deg);
}

html[data-theme="dark"] .ms-year-pill .ms-year-title {
  color: #fafafa;
}

/* ---------- Trang Vay / Nợ: form bên trái · ô bo tròn bên phải gồm 3 nút dọc + danh sách ---------- */

.debt-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.debt-top {
  display: grid;
  grid-template-columns: minmax(300px, 380px) minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.debt-top > .panel {
  margin-bottom: 0;
}

.debt-board {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 18px;
  align-items: start;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 32px;
  box-shadow:
    0 1px 2px rgba(24, 24, 27, 0.04),
    0 14px 32px -16px rgba(24, 24, 27, 0.12);
}

/* 3 nút nhỏ xếp theo hàng dọc */
.debt-tiles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debt-tile {
  --tile-bg-1: #e6f9f1;
  --tile-bg-2: #c8f1e0;
  --tile-ink: #0b5d49;
  --tile-sub: #3f8a76;
  --tile-accent: #10b981;
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 11px 12px;
  color: var(--tile-ink);
  text-align: left;
  background: linear-gradient(145deg, var(--tile-bg-1), var(--tile-bg-2));
  border: 2px solid transparent;
  border-radius: 18px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease,
    border-color 0.18s ease;
}

/* Phải trả: xanh bạc hà · Phải thu: xanh da trời nhạt · Lịch sử: vàng nhạt */
.debt-tile.collect {
  --tile-bg-1: #e4f3fe;
  --tile-bg-2: #c5e5fb;
  --tile-ink: #0a517c;
  --tile-sub: #3f84ad;
  --tile-accent: #0ea5e9;
}

.debt-tile.history {
  --tile-bg-1: #fff9dc;
  --tile-bg-2: #fdeeb0;
  --tile-ink: #755600;
  --tile-sub: #a07f1a;
  --tile-accent: #eab308;
}

.debt-tile:hover:not(.active) {
  transform: translateX(2px);
  box-shadow: 0 12px 20px -16px var(--tile-accent);
}

.debt-tile.active {
  border-color: var(--tile-accent);
  box-shadow: 0 12px 22px -14px var(--tile-accent);
}

.debt-tile-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  color: var(--tile-accent);
  background: rgba(255, 255, 255, 0.78);
  border-radius: 11px;
}

.debt-tile-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.debt-tile-label {
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.debt-tile-value {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.debt-tile-sub {
  color: var(--tile-sub);
  font-size: 10.5px;
  font-weight: 600;
  line-height: 1.25;
}

/* Danh sách nằm ngay trong ô bo tròn, bên phải 3 nút */
.debt-board-list {
  min-width: 0;
  max-height: 72vh;
  overflow-y: auto;
  padding-right: 4px;
}

.debt-board-list .panel-title {
  margin-bottom: 12px;
}

.goal-row.is-history {
  background: var(--bg-surface-alt);
}

html[data-theme="dark"] .debt-board {
  background: #161618;
  border-color: #27272a;
  box-shadow: 0 14px 32px -16px rgba(0, 0, 0, 0.6);
}

html[data-theme="dark"] .debt-tile {
  --tile-bg-1: rgba(16, 185, 129, 0.2);
  --tile-bg-2: rgba(16, 185, 129, 0.1);
  --tile-ink: #6ee7b7;
  --tile-sub: #7fc9ae;
  --tile-accent: #34d399;
}

html[data-theme="dark"] .debt-tile.collect {
  --tile-bg-1: rgba(14, 165, 233, 0.2);
  --tile-bg-2: rgba(14, 165, 233, 0.1);
  --tile-ink: #7dd3fc;
  --tile-sub: #7fb6d6;
  --tile-accent: #38bdf8;
}

html[data-theme="dark"] .debt-tile.history {
  --tile-bg-1: rgba(234, 179, 8, 0.2);
  --tile-bg-2: rgba(234, 179, 8, 0.1);
  --tile-ink: #fde68a;
  --tile-sub: #cdb766;
  --tile-accent: #facc15;
}

html[data-theme="dark"] .debt-tile-icon {
  background: rgba(0, 0, 0, 0.3);
}

@media (max-width: 1100px) {
  .debt-top {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 760px) {
  .debt-board {
    grid-template-columns: minmax(0, 1fr);
  }

  .debt-tiles {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .debt-tile {
    flex: 1 1 150px;
  }

  .debt-board-list {
    max-height: none;
  }
}

/* ---------- Trang Lương ---------- */

.salary-preview {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 14px 16px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 16px;
}

.salary-preview span {
  color: #9a3412;
  font-size: 12px;
  font-weight: 700;
}

.salary-preview strong {
  color: #c2410c;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.salary-preview small {
  color: #737373;
  font-size: 12px;
}

.salary-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.salary-breakdown span {
  padding: 5px 11px;
  color: #525252;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.salary-breakdown span b {
  margin-left: 4px;
  color: #0a0a0a;
  font-weight: 800;
}

.salary-breakdown span.minus b {
  color: #be123c;
}

.salary-note {
  margin-top: 10px;
  color: #737373;
  font-size: 12.5px;
}

html[data-theme="dark"] .salary-preview {
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.35);
}

html[data-theme="dark"] .salary-preview span,
html[data-theme="dark"] .salary-preview strong {
  color: #fdba74;
}

html[data-theme="dark"] .salary-breakdown span {
  color: #a1a1aa;
  background: #1c1c1f;
  border-color: #27272a;
}

html[data-theme="dark"] .salary-breakdown span b {
  color: #fafafa;
}

html[data-theme="dark"] .salary-breakdown span.minus b {
  color: #fda4af;
}

/* ---------- Tip: mọi màu / biểu tượng liên quan đến Tip dùng vàng nhạt ---------- */

.ms-cell-value.is-tip {
  color: #a16207;
}

.ms-ico.is-tip {
  color: #a16207;
  background: #fff4c2;
}

.app.theme-v14.light-mode.is-dark .ms-cell-value.is-tip {
  color: #fde68a;
}

.app.theme-v14.light-mode.is-dark .ms-ico.is-tip {
  color: #fde68a;
  background: rgba(250, 204, 21, 0.16);
}

html[data-theme="dark"] .dashboard-transaction-icon.adjustment {
  color: #fde68a;
  background: rgba(250, 204, 21, 0.16);
}

/* ---------- Trang Đầu tư: thanh danh mục + nút thêm danh mục ---------- */

.invest-cats {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-bottom: 18px;
}

.invest-cat-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.invest-cat {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  color: #525252;
  background: #ffffff;
  border: 1px solid #ececec;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.15s ease;
}

.invest-cat em {
  min-width: 20px;
  padding: 1px 6px;
  color: #737373;
  background: #f4f4f5;
  border-radius: 999px;
  font-size: 11.5px;
  font-style: normal;
  font-weight: 800;
  text-align: center;
}

.invest-cat:hover:not(.active) {
  color: #ea580c;
  border-color: #fdba74;
}

.invest-cat.active {
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-color: #ea580c;
  box-shadow: 0 8px 16px -8px rgba(234, 88, 12, 0.7);
}

.invest-cat.active em {
  color: #c2410c;
  background: rgba(255, 255, 255, 0.9);
}

.invest-cat.add {
  color: #ea580c;
  background: #fff7ed;
  border: 1px dashed #fdba74;
}

.invest-cat.add:hover {
  color: #ffffff;
  background: #ea580c;
  border-style: solid;
  border-color: #ea580c;
}

.invest-cat-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 14px;
  background: #ffffff;
  border: 1px solid #f97316;
  border-radius: 999px;
  box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.12);
}

.invest-cat-add input {
  width: 170px;
  min-width: 0;
  color: #0a0a0a;
  background: transparent;
  border: 0;
  outline: 0;
  font-size: 13.5px;
}

.invest-cat-add button {
  padding: 7px 14px;
  color: #525252;
  background: #f4f4f5;
  border: 0;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.invest-cat-add button.ok {
  color: #ffffff;
  background: #ea580c;
}

.invest-cat-remove {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  color: #be123c;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
}

.invest-cat-remove:hover {
  color: #ffffff;
  background: #e11d48;
  border-color: #e11d48;
}

html[data-theme="dark"] .invest-cat {
  color: #a1a1aa;
  background: #161618;
  border-color: #27272a;
}

html[data-theme="dark"] .invest-cat em {
  color: #a1a1aa;
  background: #27272a;
}

html[data-theme="dark"] .invest-cat.active {
  color: #ffffff;
  background: linear-gradient(135deg, #fb923c, #ea580c);
  border-color: #ea580c;
}

html[data-theme="dark"] .invest-cat.add {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
  border-color: rgba(249, 115, 22, 0.45);
}

html[data-theme="dark"] .invest-cat-add {
  background: #161618;
}

html[data-theme="dark"] .invest-cat-add input {
  color: #fafafa;
}

html[data-theme="dark"] .invest-cat-add button {
  color: #a1a1aa;
  background: #27272a;
}

html[data-theme="dark"] .invest-cat-remove {
  color: #fda4af;
  background: rgba(225, 29, 72, 0.14);
  border-color: rgba(225, 29, 72, 0.35);
}
/* =========================================================
   BÁO CÁO THEO THÁNG (giao diện dashboard hiện đại)
========================================================= */
.rp, .ms2 {
  --rp-warn: #ca8a04;
  --rp-card: #ffffff; --rp-card2: #fafafa; --rp-border: #ececec; --rp-text: #0a0a0a;
  --rp-muted: #71717a; --rp-accent: #f97316; --rp-line: #18181b; --rp-grid: #ececee;
  --rp-good: #16a34a; --rp-bad: #e11d48; --rp-shadow: 0 1px 2px rgba(0,0,0,.04), 0 12px 28px -18px rgba(0,0,0,.18);
  display: flex; flex-direction: column; gap: 16px; color: var(--rp-text);
}
.app.is-dark .rp, .app.is-dark .ms2 {
  --rp-warn: #fde68a;
  --rp-card: #121316; --rp-card2: #17181c; --rp-border: #25272d; --rp-text: #f4f4f5;
  --rp-muted: #8d8f99; --rp-accent: #e8a05a; --rp-line: #f5f5f5; --rp-grid: #25272d;
  --rp-good: #4ade80; --rp-bad: #fb7185; --rp-shadow: none;
}
.rp * { box-sizing: border-box; }
.rp-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.rp-head h1 { margin: 0 12px 0 0; display: inline; font-size: 26px; font-weight: 800; letter-spacing: -.02em; color: var(--rp-accent); }
.rp-status { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; color: var(--rp-muted); }
.rp-status i { width: 8px; height: 8px; border-radius: 50%; background: var(--rp-good); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rp-good) 22%, transparent); }
.rp-status.warn i { background: var(--rp-bad); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rp-bad) 22%, transparent); }
.rp-nav { display: flex; gap: 8px; }
.rp-nav button, .rp-seg button { border: 1px solid var(--rp-border); background: var(--rp-card); color: var(--rp-text); }
.rp-nav button { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; }
.rp-nav button:disabled { opacity: .35; cursor: default; }

.rp-chips { position: relative; display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.rp-chip { flex: none; display: flex; flex-direction: column; gap: 2px; align-items: flex-start; padding: 9px 14px; border-radius: 12px; border: 1px solid var(--rp-border); background: var(--rp-card); color: var(--rp-text); text-align: left; }
.rp-chip span { font-size: 12.5px; font-weight: 700; }
.rp-chip b { font-size: 12px; font-weight: 700; }
.rp-chip b.pos, .rp .pos { color: var(--rp-good); }
.rp-chip b.neg, .rp .neg { color: var(--rp-bad); }
.rp-chip.active { border-color: var(--rp-accent); background: color-mix(in srgb, var(--rp-accent) 12%, var(--rp-card)); }

.rp-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.rp-kpi, .rp-card { background: var(--rp-card); border: 1px solid var(--rp-border); border-radius: 16px; box-shadow: var(--rp-shadow); }
.rp-kpi { padding: 16px 16px 12px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.rp-kpi-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rp-kpi-top > span { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--rp-muted); }
.rp-delta { display: inline-flex; align-items: center; gap: 2px; font-style: normal; font-size: 11.5px; font-weight: 700; padding: 3px 8px; border-radius: 999px; }
.rp-delta.good { color: var(--rp-good); background: color-mix(in srgb, var(--rp-good) 14%, transparent); }
.rp-delta.bad { color: var(--rp-bad); background: color-mix(in srgb, var(--rp-bad) 14%, transparent); }
.rp-delta.flat { color: var(--rp-muted); background: var(--rp-card2); }
.rp-kpi-body { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; }
.rp-kpi-body strong { font-size: 22px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rp-kpi small { color: var(--rp-muted); font-size: 11.5px; }
.rp-spark { flex: none; }
.rp-spark.income { color: var(--rp-accent); }
.rp-spark.expense { color: var(--rp-bad); }
.rp-spark.adjust { color: var(--rp-muted); }

.rp-card { padding: 18px; min-width: 0; }
.rp-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.rp-card-head h2 { margin: 0; font-size: 16px; font-weight: 700; }
.rp-card-head p { margin: 3px 0 0; font-size: 12.5px; color: var(--rp-muted); }
.rp-tools { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.rp-legend { display: flex; gap: 14px; font-size: 12.5px; color: var(--rp-muted); }
.rp-legend span, .rp-tip span { display: inline-flex; align-items: center; gap: 6px; }
.rp-legend i, .rp-tip i { width: 14px; height: 3px; border-radius: 3px; display: inline-block; }
.rp-legend .in, .rp-tip .in { background: var(--rp-accent); }
.rp-legend .out, .rp-tip .out { background: var(--rp-line); }
.rp-seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 10px; background: var(--rp-card2); border: 1px solid var(--rp-border); }
.rp-seg button { border: 0; background: transparent; padding: 5px 11px; border-radius: 8px; font-size: 12px; font-weight: 700; color: var(--rp-muted); }
.rp-seg button.on { background: var(--rp-card); color: var(--rp-text); box-shadow: 0 1px 3px rgba(0,0,0,.12); }

.rp-chart { position: relative; width: 100%; touch-action: pan-y; }
.rp-chart svg { display: block; overflow: visible; }
.rp-grid { stroke: var(--rp-grid); stroke-dasharray: 3 5; }
.rp-axis { fill: var(--rp-muted); font-size: 11px; }
.rp-stop-in { stop-color: var(--rp-accent); }
.rp-stop-out { stop-color: var(--rp-line); }
.rp-wave { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.rp-wave.in { stroke: var(--rp-accent); }
.rp-wave.out { stroke: var(--rp-line); }
.rp-cursor { stroke: var(--rp-muted); stroke-dasharray: 2 4; opacity: .7; }
.rp-dot { stroke: var(--rp-card); stroke-width: 2.5; }
.rp-dot.in { fill: var(--rp-accent); }
.rp-dot.out { fill: var(--rp-line); }
.rp-chart-empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--rp-muted); font-size: 13px; pointer-events: none; }
.rp-tip { position: absolute; z-index: 2; pointer-events: none; transform: translateX(14px); display: flex; flex-direction: column; gap: 4px; padding: 9px 12px; border-radius: 10px; font-size: 12px; background: var(--rp-card); border: 1px solid var(--rp-border); box-shadow: 0 8px 24px -8px rgba(0,0,0,.35); white-space: nowrap; }
.rp-tip.left { transform: translateX(calc(-100% - 14px)); }
.rp-tip b { font-size: 12px; }

.rp-foot { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--rp-border); }
.rp-foot div { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rp-foot span { font-size: 12px; color: var(--rp-muted); }
.rp-foot strong { font-size: 15px; font-variant-numeric: tabular-nums; }

.rp-grid2 { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 16px; }
.rp-cats { --cat-food: #86efac; --cat-rent: #93c5fd; --cat-other: #fde68a; }
.rp-cat-h, .rp-cat { display: grid; grid-template-columns: minmax(120px, 150px) minmax(110px, 1fr) minmax(90px, auto) 52px; gap: 12px; align-items: center; text-align: left; }
.rp-cat-h { padding-bottom: 10px; border-bottom: 1px solid var(--rp-border); font-size: 11.5px; font-weight: 700; color: var(--rp-muted); text-transform: uppercase; letter-spacing: .04em; }
.rp-cat-h span { text-align: left; }
.rp-cat { padding: 14px 0; border-bottom: 1px solid var(--rp-border); font-size: 13.5px; }
.rp-cat:last-child { border-bottom: 0; }
.rp-cat-name { display: inline-flex; align-items: center; justify-content: flex-start; gap: 9px; font-weight: 600; }
.rp-cat-name b, .rp-feed-item b { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; flex: none; background: var(--rp-card2); border: 1px solid var(--rp-border); color: var(--rp-muted); }
/* Logo danh mục hiển thị màu pastel */
.rp-cat-name b.food  { background: var(--cat-food);  border-color: transparent; color: #14532d; }
.rp-cat-name b.rent  { background: var(--cat-rent);  border-color: transparent; color: #1e3a8a; }
.rp-cat-name b.other { background: var(--cat-other); border-color: transparent; color: #713f12; }
/* Tỷ trọng dạng vạch */
.rp-segs { display: flex; align-items: center; justify-content: flex-start; gap: 3px; min-width: 0; }
.rp-segs i { flex: 0 1 7px; min-width: 3px; height: 18px; border-radius: 2px; background: var(--rp-grid); }
.rp-segs i.on.food, .rp-segs i.part.food { background: var(--cat-food); }
.rp-segs i.on.rent, .rp-segs i.part.rent { background: var(--cat-rent); }
.rp-segs i.on.other, .rp-segs i.part.other { background: var(--cat-other); }
.rp-segs i.part { opacity: .5; }
.rp-cat-amt { text-align: left; font-weight: 700; font-variant-numeric: tabular-nums; }
.rp-cat em { justify-self: start; font-style: normal; text-align: left; font-size: 11.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--rp-accent) 16%, transparent); color: var(--rp-accent); }

.rp-feed { position: relative; display: flex; flex-direction: column; }
.rp-feed-item { position: relative; display: grid; grid-template-columns: 44px 28px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 0; font-size: 13px; }
.rp-feed-item::before { content: ""; position: absolute; left: 58px; top: 0; bottom: 0; width: 1px; background: var(--rp-border); }
.rp-feed-item b { position: relative; z-index: 1; border-radius: 50%; }
.rp-feed-item b.income { color: var(--rp-good); }
.rp-feed-item b.expense { color: var(--rp-bad); }
.rp-feed-item b.adjustment { color: var(--rp-accent); }
.rp-feed-item time { font-size: 12px; color: var(--rp-muted); font-variant-numeric: tabular-nums; }
.rp-feed-item div { min-width: 0; display: flex; flex-direction: column; }
.rp-feed-item strong { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-feed-item small { color: var(--rp-muted); font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rp-feed-item > span { font-weight: 700; font-variant-numeric: tabular-nums; }

@media (max-width: 1100px) { .rp-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } .rp-grid2 { grid-template-columns: 1fr; } }
@media (max-width: 640px) {
  .rp-head h1 { font-size: 21px; display: block; margin-bottom: 6px; }
  .rp-kpis { gap: 10px; } .rp-kpi { padding: 13px 13px 10px; } .rp-kpi-body strong { font-size: 17px; }
  .rp-foot { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rp-cat-h, .rp-cat { grid-template-columns: minmax(90px, 110px) minmax(60px, 1fr) auto; } .rp-segs { gap: 2px; } .rp-segs i { flex-basis: 5px; min-width: 2px; } .rp-cat-h span:last-child, .rp-cat em { display: none; }
}

/* =========================================================
   LƯƠNG - TAB & LỊCH SỬ THEO THÁNG
========================================================= */
.sal-tabs { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 16px; border-radius: 12px; background: var(--bg-surface-alt); border: 1px solid var(--border); }
.sal-tabs button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 16px; border: 0; border-radius: 9px; background: transparent; color: var(--text-muted); font-size: 13.5px; font-weight: 700; }
.sal-tabs button.active { background: var(--bg-surface); color: var(--text-heading); box-shadow: 0 1px 4px rgba(0,0,0,.12); }
.sal-tabs em { font-style: normal; font-size: 11px; padding: 1px 7px; border-radius: 999px; background: rgba(249,115,22,.15); color: var(--accent-strong); }
.sal-more { margin-top: 12px; display: inline-flex; align-items: center; gap: 4px; border: 0; background: transparent; color: var(--accent-strong); font-weight: 700; font-size: 13px; }
.sal-hist-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.sal-year { display: inline-flex; align-items: center; gap: 10px; }
.sal-year button { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-heading); }
.sal-year button:disabled { opacity: .35; cursor: default; }
.sal-year strong { min-width: 44px; text-align: center; font-size: 16px; color: var(--text-heading); }
.sal-months { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 8px; margin: 14px 0; }
.sal-month { display: flex; flex-direction: column; gap: 2px; align-items: flex-start; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-heading); text-align: left; }
.sal-month span { font-size: 12px; font-weight: 700; color: var(--text-muted); }
.sal-month b { font-size: 14px; }
.sal-month i { font-style: normal; font-size: 10.5px; color: var(--text-muted); }
.sal-month.empty { opacity: .55; }
.sal-month.active { border-color: var(--accent-strong); background: rgba(249,115,22,.12); opacity: 1; }
.sal-month.active span { color: var(--accent-strong); }
.sal-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.sal-stats div { padding: 12px 14px; border-radius: 12px; background: var(--bg-surface-alt); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.sal-stats span { font-size: 12px; color: var(--text-muted); }
.sal-stats strong { font-size: 15px; color: var(--text-heading); overflow: hidden; text-overflow: ellipsis; }
.sal-group { margin-top: 14px; }
.sal-group-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding: 0 2px 8px; color: var(--text-heading); }
.sal-group-head span { font-size: 12.5px; color: var(--text-muted); }
@media (max-width: 640px) { .sal-stats { grid-template-columns: 1fr; } }

/* Lịch chọn tháng */
.rp-picker { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 14px; align-items: stretch; }
.rp-cal { background: var(--rp-card); border: 1px solid var(--rp-border); border-radius: 16px; box-shadow: var(--rp-shadow); padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.rp-cal-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rp-cal-head button { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; border: 1px solid var(--rp-border); background: var(--rp-card); color: var(--rp-text); }
.rp-cal-head select { flex: 1; height: 34px; text-align: center; text-align-last: center; font-size: 15px; font-weight: 800; border-radius: 10px; border: 1px solid var(--rp-border); background: var(--rp-card2); color: var(--rp-text); }
.rp-cal-grid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.rp-cal-month { position: relative; min-height: 52px; display: grid; place-items: center; border-radius: 12px; border: 1px solid var(--rp-border); background: var(--rp-card2); color: var(--rp-text); font-size: 13px; font-weight: 700; }
.rp-cal-month i { position: absolute; top: 7px; right: 7px; width: 7px; height: 7px; border-radius: 50%; }
.rp-cal-month i.pos { background: var(--rp-good); }
.rp-cal-month i.neg { background: var(--rp-bad); }
.rp-cal-month.active { background: var(--rp-accent); border-color: var(--rp-accent); color: #fff; }
.rp-result { background: var(--rp-card); border: 1px solid var(--rp-border); border-radius: 16px; box-shadow: var(--rp-shadow); padding: 22px; display: flex; flex-direction: column; justify-content: center; gap: 6px; min-width: 0; }
.rp-result-label { font-size: 14px; font-weight: 700; color: var(--rp-muted); }
.rp-result-state { font-size: 28px; font-weight: 800; letter-spacing: -.02em; }
.rp-result.ok .rp-result-state, .rp-result.ok .rp-result-amount { color: var(--rp-good); }
.rp-result.warn .rp-result-state, .rp-result.warn .rp-result-amount { color: var(--rp-bad); }
.rp-result-amount { font-size: 34px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.rp-result-sub { display: flex; flex-wrap: wrap; gap: 8px 22px; margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--rp-border); font-size: 13px; color: var(--rp-muted); }
.rp-result-sub b { margin-left: 4px; color: var(--rp-text); font-variant-numeric: tabular-nums; }
@media (max-width: 760px) { .rp-picker { grid-template-columns: 1fr; } .rp-result-amount { font-size: 26px; } }

/* ---- Bố cục báo cáo: lịch + 4 ô bên trái, dòng tiền bên phải (vừa 1 màn hình) ---- */
.rp-top { display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 14px; align-items: stretch; }
.rp-left { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.rp-left .rp-cal { padding: 12px; gap: 10px; }
.rp-left .rp-cal-grid { flex: none; gap: 6px; }
.rp-left .rp-cal-month { min-height: 42px; font-size: 12.5px; }
.rp-left .rp-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.rp-left .rp-kpi { padding: 11px 12px; gap: 5px; }
.rp-kpi-label { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: var(--rp-muted); white-space: nowrap; }
.rp-left .rp-kpi > strong { font-size: 16px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rp-kpi-foot { display: flex; align-items: center; gap: 6px; min-width: 0; }
.rp-kpi-foot small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rp-flow { display: flex; flex-direction: column; }
.rp-flow .rp-chart { flex: 1; min-height: 260px; }
.rp-chart svg { position: absolute; left: 0; top: 0; }
.rp-pill { display: inline-block; margin-left: 8px; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.rp-pill.ok { color: var(--rp-good); background: color-mix(in srgb, var(--rp-good) 14%, transparent); }
.rp-pill.warn { color: var(--rp-bad); background: color-mix(in srgb, var(--rp-bad) 14%, transparent); }
@media (max-width: 900px) { .rp-top { grid-template-columns: 1fr; } }

/* Lương: căn giữa ô tháng + chọn nhiều năm */
.sal-month { align-items: center; justify-content: center; text-align: center; }
.sal-yearpick { position: relative; margin-left: 4px; }
.sal-cal-btn { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--accent-strong); }
.sal-yearpop-bg { position: fixed; inset: 0; z-index: 29; }
.sal-yearpop { position: absolute; right: 0; top: 40px; z-index: 30; width: 244px; padding: 10px; border-radius: 14px; background: var(--bg-surface); border: 1px solid var(--border); box-shadow: 0 16px 36px -12px rgba(0,0,0,.35); }
.sal-yearpop-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: var(--text-heading); font-size: 13px; }
.sal-yearpop-head button { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-surface); color: var(--text-heading); }
.sal-yearpop-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.sal-yearpop-grid button { position: relative; padding: 9px 0; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-surface-alt); color: var(--text-heading); font-weight: 700; font-size: 13px; }
.sal-yearpop-grid button.active { background: var(--accent-strong); border-color: var(--accent-strong); color: #fff; }
.sal-yearpop-grid i { position: absolute; top: 5px; right: 6px; width: 6px; height: 6px; border-radius: 50%; background: var(--accent-strong); }
.sal-yearpop-grid button.active i { background: #fff; }

/* ---- Báo cáo: số âm vàng nhạt, ô to lấp đầy 1 màn hình ---- */
.rp .neg, .rp-chip b.neg { color: var(--rp-warn); }
.rp-pill.warn { color: var(--rp-warn); background: color-mix(in srgb, var(--rp-warn) 16%, transparent); }
.rp-delta { font-size: 13px; padding: 4px 10px; }
@media (min-width: 901px) {
  .rp-top { grid-template-columns: 360px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); height: max(560px, calc(100vh - var(--top-h, 72px) - 80px)); }
  .rp-left { min-height: 0; }
  .rp-left .rp-cal { flex: 1; min-height: 0; padding: 16px; gap: 14px; }
  .rp-left .rp-cal-grid { flex: 1; min-height: 0; grid-auto-rows: 1fr; gap: 8px; }
  .rp-left .rp-cal-month { min-height: 0; font-size: 14px; }
  .rp-left .rp-kpi { padding: 16px 16px 14px; gap: 8px; }
  .rp-left .rp-kpi > strong { font-size: 21px; }
  .rp-kpi-label { font-size: 13px; }
  .rp-flow { min-height: 0; padding: 22px; }
  .rp-flow .rp-card-head h2 { font-size: 18px; }
}

/* ---- Thống kê tháng (giao diện mới) ---- */
.ms2 { min-width: 0; }
.ms2-hero { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; padding: 20px 22px; border-radius: 18px; border: 1px solid var(--rp-border); background: linear-gradient(135deg, color-mix(in srgb, var(--rp-accent) 14%, var(--rp-card)), var(--rp-card) 70%); }
.ms2-hero-main { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.ms2-hero-main span { font-size: 13px; font-weight: 700; color: var(--rp-muted); }
.ms2-hero-main strong { font-size: 32px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.ms2-hero.ok strong { color: var(--rp-good); }
.ms2-hero.warn strong { color: var(--rp-bad); }
.ms2-hero-main em { font-style: normal; font-size: 13px; color: var(--rp-muted); }
.ms2-split { flex: 1; min-width: 220px; max-width: 360px; display: flex; flex-direction: column; gap: 8px; }
.ms2-split-bar { display: flex; height: 10px; border-radius: 10px; overflow: hidden; background: var(--rp-grid); }
.ms2-split-bar i.in { background: var(--rp-accent); }
.ms2-split-bar i.out { flex: 1; background: var(--rp-line); opacity: .75; }
.ms2-split-legend { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; color: var(--rp-muted); font-variant-numeric: tabular-nums; }
.ms2-split-legend span { display: inline-flex; align-items: center; gap: 6px; }
.ms2-split-legend i { width: 9px; height: 9px; border-radius: 50%; }
.ms2-split-legend i.in { background: var(--rp-accent); }
.ms2-split-legend i.out { background: var(--rp-line); }
.ms2-table { background: var(--rp-card); border: 1px solid var(--rp-border); border-radius: 18px; box-shadow: var(--rp-shadow); overflow: hidden; }
.ms2-head, .ms2-row { display: grid; grid-template-columns: minmax(190px, 2.2fr) 84px minmax(120px, 1.4fr) minmax(130px, 1.2fr); gap: 14px; align-items: center; padding: 0 20px; }
.ms2-head { height: 44px; background: var(--rp-card2); border-bottom: 1px solid var(--rp-border); font-size: 11.5px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; color: var(--rp-muted); }
.ms2-head span:nth-child(2) { text-align: center; }
.ms2-head span:last-child { text-align: right; }
.ms2-group-title { padding: 10px 20px; font-size: 12px; font-weight: 800; color: var(--rp-accent); background: color-mix(in srgb, var(--rp-accent) 7%, var(--rp-card)); border-bottom: 1px solid var(--rp-border); }
.ms2-row { min-height: 58px; border-bottom: 1px solid var(--rp-border); font-size: 14px; transition: background .15s; }
.ms2-row:hover { background: var(--rp-card2); }
.ms2-group:last-child .ms2-row:last-child { border-bottom: 0; }
.ms2-label { display: inline-flex; align-items: center; gap: 12px; font-weight: 600; min-width: 0; }
.ms2-ico { width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; flex: none; font-style: normal; background: var(--rp-card2); border: 1px solid var(--rp-border); color: var(--rp-muted); }
.ms2-ico.is-income, .ms2-ico.is-positive { color: var(--rp-good); background: color-mix(in srgb, var(--rp-good) 12%, transparent); }
.ms2-ico.is-expense { color: var(--rp-bad); background: color-mix(in srgb, var(--rp-bad) 12%, transparent); }
.ms2-ico.is-tip { color: var(--rp-accent); background: color-mix(in srgb, var(--rp-accent) 14%, transparent); }
.ms2-count { justify-self: center; min-width: 34px; text-align: center; padding: 3px 10px; border-radius: 999px; font-size: 12.5px; font-weight: 700; background: var(--rp-card2); border: 1px solid var(--rp-border); color: var(--rp-muted); }
.ms2-share { display: flex; align-items: center; gap: 10px; }
.ms2-meter { flex: 1; height: 6px; border-radius: 6px; background: var(--rp-grid); overflow: hidden; }
.ms2-meter i { display: block; height: 100%; border-radius: 6px; }
.ms2-meter i.is-income { background: var(--rp-good); }
.ms2-meter i.is-expense { background: var(--rp-accent); }
.ms2-share em { width: 38px; text-align: right; font-style: normal; font-size: 12px; font-weight: 700; color: var(--rp-muted); }
.ms2-value { text-align: right; font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.ms2-value.is-income, .ms2-value.is-positive { color: var(--rp-good); }
.ms2-value.is-expense { color: var(--rp-bad); }
.ms2-value.is-tip { color: var(--rp-accent); }
.ms2-row.is-strong { background: var(--rp-card2); }
.ms2-row.is-final { min-height: 68px; background: color-mix(in srgb, var(--rp-accent) 9%, var(--rp-card)); }
.ms2-row.is-final .ms2-value { font-size: 18px; }
@media (max-width: 760px) {
  .ms2-head, .ms2-row { grid-template-columns: minmax(0, 1fr) 56px auto; padding: 0 14px; gap: 10px; }
  .ms2-head span:nth-child(3), .ms2-share { display: none; }
  .ms2-hero-main strong { font-size: 26px; }
}

/* ---- Đầu tư ---- */
.inv-form-title { margin: 0 0 14px; text-align: center; font-size: 18px; font-weight: 800; color: var(--text-heading); }
.inv-form .primary-button { justify-content: center; text-align: center; }
.inv-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.inv-term { display: grid; grid-template-columns: 1fr 92px; gap: 8px; }
.inv-term select, .inv-term input { min-width: 0; }
.inv-card { padding: 16px; border-radius: 16px; border: 1px solid var(--border); background: var(--bg-surface); display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden; }
.inv-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--accent-strong); }
.inv-card.tone-loan::before { background: #e11d48; }
.inv-card.tone-save::before { background: #16a34a; }
.inv-top { display: flex; align-items: center; gap: 12px; }
.inv-ico { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; flex: none; color: var(--accent-strong); background: rgba(249,115,22,.12); }
.tone-loan .inv-ico { color: #e11d48; background: rgba(225,29,72,.12); }
.tone-save .inv-ico { color: #16a34a; background: rgba(22,163,74,.12); }
.inv-title { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.inv-title strong { font-size: 15.5px; color: var(--text-heading); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.inv-badge { align-self: flex-start; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; color: var(--text-muted); background: var(--bg-surface-alt); border: 1px solid var(--border); }
.inv-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1px; border-radius: 12px; overflow: hidden; background: var(--border); border: 1px solid var(--border); }
.inv-metrics > div { display: flex; flex-direction: column; gap: 3px; padding: 10px 12px; background: var(--bg-surface-alt); min-width: 0; }
.inv-metrics span { font-size: 11.5px; color: var(--text-muted); }
.inv-metrics strong { font-size: 14px; color: var(--text-heading); font-variant-numeric: tabular-nums; overflow: hidden; text-overflow: ellipsis; }
.inv-metrics strong.pos { color: var(--accent-sky); }
.inv-metrics small { font-size: 11px; color: var(--text-muted); }
.inv-metrics small.late { color: #e11d48; font-weight: 700; }
.inv-progress { display: flex; align-items: center; gap: 10px; }
.inv-progress .progress { flex: 1; }
.inv-progress em { font-style: normal; font-size: 12.5px; font-weight: 800; color: var(--text-heading); min-width: 38px; text-align: right; }


/* =========================================================
   BÁO CÁO THÁNG — màu Tip/Âm, 2 màu dòng tiền, THỐNG KÊ THÁNG gọn 1 màn hình
========================================================= */
.rp, .ms2 { --rp-out: #eab308; }
.app.is-dark .rp, .app.is-dark .ms2 { --rp-out: #f5d77a; }
.rp-legend .out, .rp-tip .out { background: var(--rp-out); }
.rp-stop-out { stop-color: var(--rp-out); }
.rp-wave.out { stroke: var(--rp-out); }
.rp-dot.out { fill: var(--rp-out); }
.rp-kpi.adjust > strong, .rp-left .rp-kpi.adjust > strong { color: var(--rp-warn); }

.ms3 { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: stretch; }
.ms3-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.ms3 .ms2-hero { padding: 16px 22px; gap: 16px; }
.ms3 .ms2-hero-main strong { font-size: 30px; }
.ms3-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.ms3-kpi { position: relative; display: flex; flex-direction: column; gap: 6px; min-width: 0; padding: 14px 16px 14px 20px; overflow: hidden; background: var(--rp-card); border: 1px solid var(--rp-border); border-radius: 18px; box-shadow: var(--rp-shadow); }
.ms3-kpi::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--k, var(--rp-accent)); }
.ms3-kpi.is-income { --k: var(--rp-good); }
.ms3-kpi.is-expense { --k: var(--rp-bad); }
.ms3-kpi.is-tip { --k: var(--rp-warn); }
.ms3-kpi-top { display: flex; align-items: center; gap: 10px; font-size: 13px; font-weight: 700; color: var(--rp-muted); }
.ms3-kpi-top .ms2-ico { width: 30px; height: 30px; border-radius: 10px; }
.ms3-kpi > strong { font-size: 22px; font-weight: 800; letter-spacing: -.02em; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms3-kpi > strong.is-income { color: var(--rp-good); }
.ms3-kpi > strong.is-expense { color: var(--rp-bad); }
.ms3-kpi > strong.is-tip { color: var(--rp-warn); }
.ms3-kpi small { font-size: 12px; color: var(--rp-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms3 .ms2-table { flex: 1; display: flex; flex-direction: column; }
.ms3 .ms2-head { flex: none; }
.ms3 .ms2-row { flex: 1 1 auto; min-height: 52px; }
.ms3 .ms2-table > .ms2-row:last-child { border-bottom: 0; }
.ms3 .ms2-row.is-final { min-height: 60px; }
.ms3 .ms-picker { gap: 12px; }
.ms3 .ms-month-grid { flex: 1; grid-auto-rows: 1fr; }
.ms3 .ms-month-pill { height: auto; min-height: 34px; }
@media (max-width: 1100px) {
  .ms3 { grid-template-columns: minmax(0, 1fr); }
  .ms3 .ms-picker { order: -1; }
  .ms3 .ms-month-grid { flex: none; grid-auto-rows: auto; }
  .ms3 .ms-month-pill { height: 38px; }
}
@media (max-width: 760px) {
  .ms3-kpis { grid-template-columns: minmax(0, 1fr); }
}
@media (min-width: 1101px) and (max-height: 780px) {
  .ms3-main { gap: 10px; }
  .ms3 .ms2-hero { padding: 10px 20px; }
  .ms3 .ms2-hero-main strong { font-size: 26px; }
  .ms3-kpi { padding: 10px 14px 10px 18px; gap: 4px; }
  .ms3-kpi > strong { font-size: 19px; }
  .ms3 .ms2-row { min-height: 44px; }
  .ms3 .ms2-row.is-final { min-height: 52px; }
  .ms3 .ms-month-pill { min-height: 30px; }
}

/* ---- Đầu tư: bảng chỉ số gọn trong 1 khối, không còn ô trống ---- */
.inv-metrics { display: block; gap: 0; overflow: hidden; background: var(--bg-surface-alt); border: 1px solid var(--border); border-radius: 12px; }
.inv-metrics > .inv-metrics-in { display: flex; flex-direction: row; flex-wrap: wrap; gap: 0; margin: 0 -1px -1px 0; padding: 0; background: transparent; }
.inv-metrics-in > div { flex: 1 1 auto; display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 10px 12px; box-shadow: inset -1px -1px 0 var(--border); }
.inv-metrics-in span { white-space: nowrap; }
.inv-metrics-in strong { white-space: nowrap; font-size: 13.5px; }
.inv-card .goal-row-bottom { justify-content: flex-end; }

/* =========================================================
   NGÂN SÁCH — giao diện khối tổng quan mới
========================================================= */
.bgt-hero { --bgt: #16a34a; flex: 0 0 auto; display: flex; align-items: center; gap: 22px; margin-bottom: 12px; padding: 14px 24px; border: 1px solid var(--border); border-radius: 22px; background: linear-gradient(135deg, color-mix(in srgb, var(--bgt) 9%, var(--bg-surface)), var(--bg-surface) 60%); box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 16px 34px -24px rgba(0, 0, 0, 0.3); }
.bgt-hero.is-warning { --bgt: #f59e0b; }
.bgt-hero.is-danger { --bgt: #e11d48; }
.bgt-hero.is-none { --bgt: #a3a3a3; }
.bgt-ring { position: relative; flex: none; width: 96px; height: 96px; }
.bgt-ring svg { display: block; width: 100%; height: 100%; }
.bgt-ring-bg { fill: none; stroke: color-mix(in srgb, var(--bgt) 16%, var(--border)); stroke-width: 9; }
.bgt-ring-fg { fill: none; stroke: var(--bgt); stroke-width: 9; stroke-linecap: round; transition: stroke-dashoffset 0.6s ease; }
.bgt-ring-text { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.15; }
.bgt-ring-text strong { color: var(--text-heading); font-size: 17px; font-weight: 800; font-variant-numeric: tabular-nums; }
.bgt-ring-text span { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.bgt-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.bgt-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px 14px; }
.bgt-status { display: inline-flex; align-items: center; gap: 7px; padding: 4px 12px; color: var(--bgt); background: color-mix(in srgb, var(--bgt) 14%, transparent); border-radius: 999px; font-size: 12px; font-weight: 800; }
.bgt-status i { width: 7px; height: 7px; background: var(--bgt); border-radius: 50%; }
.bgt-legend { display: flex; flex-wrap: wrap; gap: 4px 16px; color: var(--text-muted); font-size: 12px; font-weight: 600; }
.bgt-legend span { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.bgt-legend b { color: var(--text-heading); font-weight: 800; }
.bgt-legend i, .bgt-alloc-bar i.food, .bgt-alloc-bar i.rent, .bgt-alloc-bar i.other { display: inline-block; }
.bgt-legend i { width: 8px; height: 8px; border-radius: 50%; }
.bgt-legend i.food, .bgt-alloc-bar i.food { background: #f97316; }
.bgt-legend i.rent, .bgt-alloc-bar i.rent { background: #3b82f6; }
.bgt-legend i.other, .bgt-alloc-bar i.other { background: #8b5cf6; }
.bgt-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.bgt-stat { display: flex; align-items: center; gap: 12px; min-width: 0; padding: 0 18px; border-left: 1px solid var(--border); }
.bgt-stat:first-child { padding-left: 0; border-left: 0; }
.bgt-stat-ico { display: grid; place-items: center; flex: none; width: 38px; height: 38px; border-radius: 12px; font-style: normal; }
.bgt-stat > div { min-width: 0; }
.bgt-stat span { display: block; color: var(--text-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
.bgt-stat strong { display: block; overflow: hidden; color: var(--text-heading); font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; text-overflow: ellipsis; white-space: nowrap; }
.bgt-stat.total .bgt-stat-ico { color: #ea580c; background: rgba(249, 115, 22, 0.13); }
.bgt-stat.used .bgt-stat-ico, .bgt-stat.over .bgt-stat-ico { color: #e11d48; background: rgba(225, 29, 72, 0.12); }
.bgt-stat.left .bgt-stat-ico { color: #16a34a; background: rgba(22, 163, 74, 0.12); }
.bgt-stat.used strong, .bgt-stat.over strong { color: #e11d48; }
.bgt-stat.left strong { color: #16a34a; }
.bgt-alloc-bar { display: flex; gap: 2px; height: 8px; overflow: hidden; background: var(--border); border-radius: 8px; }
.bgt-alloc-bar i { height: 100%; }
@media (max-width: 1100px) {
  .bgt-hero { padding: 14px 18px; }
}
@media (max-width: 760px) {
  .bgt-hero { flex-direction: column; align-items: stretch; }
  .bgt-ring { align-self: center; }
  .bgt-stats { grid-template-columns: minmax(0, 1fr); gap: 10px; }
  .bgt-stat, .bgt-stat:first-child { padding: 0; border-left: 0; }
}

/* ---- Đầu tư: form thêm khoản gọn trong 1 màn hình ---- */
.inv-form-title { margin: 0 0 10px; font-size: 17px; }
.inv-form.form { gap: 10px; }
.inv-form .form-field { gap: 5px; }
.inv-form .form-field > span { font-size: 12.5px; }
.inv-form .form-field input, .inv-form .form-field select { min-height: 42px; padding: 8px 12px; }
.inv-form .form-field .dp-trigger { min-height: 42px; }
.inv-form .inv-form-row { gap: 10px; }
.inv-form .primary-button { min-height: 44px; }

/* =========================================================
   TÀI KHOẢN — giao diện thẻ hiện đại
========================================================= */
.acc-page { align-items: start; }
.acc-form-panel { padding: 22px; }
.acc-form-head { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; }
.acc-form-head > i { display: grid; place-items: center; flex: none; width: 46px; height: 46px; color: #ea580c; background: rgba(249, 115, 22, 0.13); border-radius: 15px; }
.acc-form-head h2 { margin: 0; color: var(--text-heading); font-size: 18px; font-weight: 800; letter-spacing: -0.01em; }
.acc-form-head span { color: var(--text-muted); font-size: 13px; font-weight: 600; }
.acc-form { gap: 16px; }
.acc-field-label { display: block; margin-bottom: 7px; color: var(--text-secondary); font-size: 14px; font-weight: 650; }
.acc-types { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.acc-type { --c: #ea580c; display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 14px 6px 12px; color: var(--text-muted); background: var(--bg-surface-alt); border: 1.5px solid var(--border); border-radius: 16px; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: 0.16s ease; }
.acc-type.cash { --c: #16a34a; }
.acc-type.bank { --c: #2563eb; }
.acc-type.wallet { --c: #7c3aed; }
.acc-type:hover { color: var(--c); border-color: color-mix(in srgb, var(--c) 45%, var(--border)); }
.acc-type.active { color: var(--c); background: color-mix(in srgb, var(--c) 11%, var(--bg-surface)); border-color: var(--c); box-shadow: 0 8px 18px -12px var(--c); }
.acc-form .primary-button { min-height: 50px; border-radius: 14px; }

.acc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px; }
.acc-grid > .empty { grid-column: 1 / -1; }
.acc-card { --c: #2563eb; position: relative; display: flex; flex-direction: column; gap: 12px; padding: 16px 16px 14px; overflow: hidden; background: linear-gradient(145deg, color-mix(in srgb, var(--c) 9%, var(--bg-surface)), var(--bg-surface) 62%); border: 1px solid var(--border); border-radius: 20px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04); transition: 0.18s ease; }
.acc-card::after { content: ""; position: absolute; right: -34px; top: -34px; width: 110px; height: 110px; background: color-mix(in srgb, var(--c) 12%, transparent); border-radius: 50%; pointer-events: none; }
.acc-card.cash { --c: #16a34a; }
.acc-card.bank { --c: #2563eb; }
.acc-card.wallet { --c: #7c3aed; }
.acc-card:hover { transform: translateY(-2px); box-shadow: 0 16px 30px -20px color-mix(in srgb, var(--c) 70%, #000); }
.acc-card.active { border-color: var(--c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 18%, transparent); }
.acc-card-top { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; }
.acc-card-ico { display: grid; place-items: center; flex: none; width: 44px; height: 44px; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border-radius: 14px; font-style: normal; }
.acc-card-name { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.acc-card-name strong { max-width: 100%; overflow: hidden; color: var(--text-heading); font-size: 15.5px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.acc-pill { padding: 2px 10px; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-radius: 999px; font-size: 11px; font-weight: 800; }
.acc-card-actions { display: flex; gap: 6px; }
.acc-btn { display: grid; place-items: center; width: 34px; height: 34px; color: var(--text-muted); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 11px; cursor: pointer; transition: 0.15s ease; }
.acc-btn:hover { color: var(--c); border-color: var(--c); }
.acc-btn.danger:hover { color: #e11d48; border-color: #e11d48; background: rgba(225, 29, 72, 0.08); }
.acc-card-balance { position: relative; z-index: 1; color: var(--text-heading); font-size: 26px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-card-balance.neg { color: #e11d48; }
.acc-card-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 10px; border-top: 1px dashed var(--border); color: var(--text-muted); font-size: 12.5px; font-weight: 600; }
.acc-card-foot em { padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-style: normal; font-weight: 800; font-variant-numeric: tabular-nums; }
.acc-card-foot em.up { color: #16a34a; background: rgba(22, 163, 74, 0.12); }
.acc-card-foot em.down { color: #e11d48; background: rgba(225, 29, 72, 0.12); }
@media (max-width: 1100px) {
  .acc-page { grid-template-columns: minmax(0, 1fr); }
}

/* =========================================================
   HOVER MÀU CAM NHẠT — thay cho màu xám nhạt
   Áp dụng: thanh trái (rail), thanh trên (Ngân sách / Tài khoản),
   menu, hàng thống kê, ô chọn ngày… ; ban đêm dùng cam mờ trên nền tối.
========================================================= */

.app.theme-v14.light-mode .nav-button:hover {
  color: #c2410c;
  background: #fff7ed;
  border-color: #fed7aa;
}

.app.theme-v14.light-mode .topbar-pill:hover:not(.active),
.app.theme-v14.light-mode .rail-button:hover:not(.active) {
  color: #ea580c;
  background: #fff7ed;
  transition: background 0.15s ease, color 0.15s ease;
}

.app.theme-v14.light-mode .ms-row:hover:not(.is-final) {
  background: #fff7ed;
}

.ms2-row:hover {
  background: color-mix(in srgb, var(--rp-accent) 9%, var(--rp-card));
}

.dp-trigger:hover,
.dp-trigger.open {
  background: #fff7ed;
}

.calendar-foot button:hover {
  color: #ea580c;
  background: #fff7ed;
  border-color: #fdba74;
}

/* Ban đêm */
.app.theme-v14.light-mode.is-dark .topbar-pill:hover:not(.active),
.app.theme-v14.light-mode.is-dark .rail-button:hover:not(.active) {
  color: #fb923c;
  background: rgba(249, 115, 22, 0.14);
}

.app.theme-v14.light-mode.is-dark .ms-row:hover:not(.is-final) {
  background: rgba(249, 115, 22, 0.1);
}

html[data-theme="dark"] .dp-trigger:hover,
html[data-theme="dark"] .dp-trigger.open {
  background: rgba(249, 115, 22, 0.14);
}

/* ---------- Hiệu ứng nhún cho nút chức năng ---------- */

.app.theme-v14.light-mode .topbar-pill,
.app.theme-v14.light-mode .rail-button {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.15s ease, color 0.15s ease, box-shadow 0.2s ease;
  will-change: transform;
}

/* Rê chuột: nảy nhẹ lên trên */
.app.theme-v14.light-mode .topbar-pill:hover,
.app.theme-v14.light-mode .rail-button:hover {
  transform: translateY(-3px) scale(1.06);
}

/* Giữ chuột: ép xuống, thả ra sẽ bật lại có độ nảy */
.app.theme-v14.light-mode .topbar-pill:active,
.app.theme-v14.light-mode .rail-button:active {
  transform: translateY(1px) scale(0.92);
  transition-duration: 0.1s;
}

/* Bấm xong: nhún nhảy vài nhịp */
.app.theme-v14.light-mode .topbar-pill.is-bouncing,
.app.theme-v14.light-mode .rail-button.is-bouncing {
  animation: fn-click-bounce 0.55s cubic-bezier(0.28, 0.84, 0.42, 1);
}

@keyframes fn-click-bounce {
  0%   { transform: translateY(0) scale(1); }
  25%  { transform: translateY(-8px) scale(1.12, 0.92); }
  45%  { transform: translateY(0) scale(0.94, 1.08); }
  65%  { transform: translateY(-4px) scale(1.05, 0.97); }
  82%  { transform: translateY(0) scale(0.99, 1.02); }
  100% { transform: translateY(0) scale(1); }
}

@media (prefers-reduced-motion: reduce) {
  .app.theme-v14.light-mode .topbar-pill,
  .app.theme-v14.light-mode .rail-button {
    transition: background 0.15s ease, color 0.15s ease;
  }

  .app.theme-v14.light-mode .topbar-pill:hover,
  .app.theme-v14.light-mode .rail-button:hover,
  .app.theme-v14.light-mode .topbar-pill:active,
  .app.theme-v14.light-mode .rail-button:active {
    transform: none;
  }

  .app.theme-v14.light-mode .topbar-pill.is-bouncing,
  .app.theme-v14.light-mode .rail-button.is-bouncing {
    animation: none;
  }
}

/* =========================================================
   THAY HIỆU ỨNG "ĐỔ MÀU TỪ TRÊN XUỐNG" BẰNG HIỆN DẦN + TRƯỢT LÊN NHẸ
   - Thẻ tóm tắt: nền cam đứng yên, cả thẻ mờ -> rõ và trượt lên 10px
   - Nút đang chọn ở thanh điều hướng: nền cam hiện dần (crossfade)
========================================================= */

@keyframes fnCardIn {
  from {
    opacity: 0;
    transform: translate3d(0, 10px, 0) scale(0.985);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

@keyframes fnFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

.app.theme-v14.light-mode .summary-card::before,
.app.theme-v14.light-mode .mini-stat::before,
.app.theme-v14.light-mode .analysis-summary-box::before,
.app.theme-v14.light-mode .topbar-pill.active::before,
.app.theme-v14.light-mode .rail-button.active::before {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #fb923c 0%, #f97316 45%, #ea580c 100%);
  transform: none;
  will-change: auto;
  animation: none;
}

.app.theme-v14.light-mode .summary-card,
.app.theme-v14.light-mode .mini-stat,
.app.theme-v14.light-mode .analysis-summary-box {
  animation: fnCardIn 0.5s cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
  animation-delay: var(--sweep-delay, 0s);
}

.app.theme-v14.light-mode .topbar-pill.active::before,
.app.theme-v14.light-mode .rail-button.active::before {
  animation: fnFadeIn 0.3s ease-out backwards;
}

@media (prefers-reduced-motion: reduce) {
  .app.theme-v14.light-mode .summary-card,
  .app.theme-v14.light-mode .mini-stat,
  .app.theme-v14.light-mode .analysis-summary-box,
  .app.theme-v14.light-mode .topbar-pill.active::before,
  .app.theme-v14.light-mode .rail-button.active::before {
    animation: none;
  }
}

/* =========================================================
   HIỆU ỨNG VÀO TRANG KHI CHUYỂN CHỨC NĂNG
   - Cả trang hiện dần, từng khối trượt lên lần lượt
   - Thanh tiến độ / cột biểu đồ mọc lên, vòng tròn quét theo chiều kim đồng hồ
   - Biểu đồ đường được vẽ từ trái sang phải
   - Số tiền chạy từ 0 (xem runNumberCountUp)
========================================================= */

@property --fn-sweep {
  syntax: "<percentage>";
  inherits: false;
  initial-value: 100%;
}

@keyframes fnRise {
  from { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.985); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}

@keyframes fnTitleIn {
  from { opacity: 0; transform: translate3d(-16px, 0, 0); clip-path: inset(0 100% 0 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); clip-path: inset(0 0 0 0); }
}

@keyframes fnRevealUp {
  from { clip-path: inset(100% 0 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

@keyframes fnRevealX {
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
}

@keyframes fnRing {
  from { --fn-sweep: 0%; }
  to { --fn-sweep: 100%; }
}

@keyframes fnDonutSpin {
  from { opacity: 0; transform: rotate(-150deg) scale(0.78); }
  to { opacity: 1; transform: rotate(0) scale(1); }
}

@keyframes fnDonutUnspin {
  from { transform: rotate(150deg) scale(1.28); }
  to { transform: rotate(0) scale(1); }
}

@keyframes fnSweepLine {
  0% { opacity: 0; transform: scaleX(0); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: scaleX(1); }
}

.fn-title-in {
  animation: fnTitleIn 0.6s cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
}

.page-stage {
  position: relative;
  animation: fnFadeIn 0.3s ease-out backwards;
}

/* Vệt cam quét ngang dưới tiêu đề mỗi lần mở trang */
.page-stage::before {
  content: "";
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  z-index: 5;
  height: 3px;
  border-radius: 3px;
  pointer-events: none;
  background: linear-gradient(90deg, transparent, #fb923c 30%, #ea580c 70%, transparent);
  transform-origin: left center;
  animation: fnSweepLine 0.95s cubic-bezier(0.4, 0, 0.2, 1) both;
}

/* Các khối chính trượt lên lần lượt */
.page-stage > * {
  animation: fnRise 0.65s cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
}

.page-stage > *:nth-child(2) { animation-delay: 0.07s; }
.page-stage > *:nth-child(3) { animation-delay: 0.14s; }
.page-stage > *:nth-child(4) { animation-delay: 0.21s; }
.page-stage > *:nth-child(5) { animation-delay: 0.28s; }
.page-stage > *:nth-child(n + 6) { animation-delay: 0.35s; }

/* Hàng danh sách, thẻ tài khoản, mục ngân sách: vào lần lượt sau khối cha */
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item) {
  animation: fnRise 0.55s cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
  animation-delay: calc(0.2s + var(--fn-i, 0) * 0.05s);
}

.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(1) { --fn-i: 0; }
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(2) { --fn-i: 1; }
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(3) { --fn-i: 2; }
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(4) { --fn-i: 3; }
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(5) { --fn-i: 4; }
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(6) { --fn-i: 5; }
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(7) { --fn-i: 6; }
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(8) { --fn-i: 7; }
.page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item):nth-child(n + 9) { --fn-i: 8; }

/* Bảng: từng dòng hiện lần lượt */
.page-stage tbody tr {
  animation: fnRise 0.5s cubic-bezier(0.22, 0.8, 0.3, 1) backwards;
  animation-delay: calc(0.2s + var(--fn-i, 0) * 0.035s);
}

.page-stage tbody tr:nth-child(1) { --fn-i: 0; }
.page-stage tbody tr:nth-child(2) { --fn-i: 1; }
.page-stage tbody tr:nth-child(3) { --fn-i: 2; }
.page-stage tbody tr:nth-child(4) { --fn-i: 3; }
.page-stage tbody tr:nth-child(5) { --fn-i: 4; }
.page-stage tbody tr:nth-child(6) { --fn-i: 5; }
.page-stage tbody tr:nth-child(7) { --fn-i: 6; }
.page-stage tbody tr:nth-child(8) { --fn-i: 7; }
.page-stage tbody tr:nth-child(9) { --fn-i: 8; }
.page-stage tbody tr:nth-child(10) { --fn-i: 9; }
.page-stage tbody tr:nth-child(11) { --fn-i: 10; }
.page-stage tbody tr:nth-child(12) { --fn-i: 11; }
.page-stage tbody tr:nth-child(n + 13) { --fn-i: 12; }

/* Cột biểu đồ tuần mọc lên từ đáy */
.page-stage .weekly-bar {
  animation: fnRevealUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: calc(0.25s + var(--fn-i, 0) * 0.07s);
}

.page-stage .weekly-col:nth-child(1) { --fn-i: 0; }
.page-stage .weekly-col:nth-child(2) { --fn-i: 1; }
.page-stage .weekly-col:nth-child(3) { --fn-i: 2; }
.page-stage .weekly-col:nth-child(4) { --fn-i: 3; }
.page-stage .weekly-col:nth-child(5) { --fn-i: 4; }
.page-stage .weekly-col:nth-child(6) { --fn-i: 5; }
.page-stage .weekly-col:nth-child(7) { --fn-i: 6; }
.page-stage .weekly-col:nth-child(8) { --fn-i: 7; }
.page-stage .weekly-col:nth-child(n + 9) { --fn-i: 8; }

/* Thanh tiến độ ngân sách và thanh phân bổ chạy từ trái sang */
.page-stage .progress div,
.page-stage .bgt-alloc-bar i {
  animation: fnRevealX 1s cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: 0.3s;
}

/* Vòng tròn ngân sách quét theo chiều kim đồng hồ */
.page-stage .bgt-ring svg {
  -webkit-mask-image: conic-gradient(#000 var(--fn-sweep), transparent 0);
  mask-image: conic-gradient(#000 var(--fn-sweep), transparent 0);
  animation: fnRing 1.2s cubic-bezier(0.22, 0.8, 0.3, 1) 0.25s backwards;
}

/* Biểu đồ tròn xoay vào, chữ ở giữa giữ nguyên chiều */
.page-stage .donut-chart {
  animation: fnDonutSpin 1s cubic-bezier(0.22, 0.9, 0.3, 1) 0.15s backwards;
}

.page-stage .donut-chart .donut-hole {
  animation: fnDonutUnspin 1s cubic-bezier(0.22, 0.9, 0.3, 1) 0.15s backwards;
}

/* Biểu đồ đường ở Báo cáo được vẽ từ trái sang phải */
.page-stage .rp-chart svg {
  animation: fnRevealX 1.3s cubic-bezier(0.4, 0, 0.2, 1) 0.2s backwards;
}

@media (prefers-reduced-motion: reduce) {
  .fn-title-in,
  .page-stage,
  .page-stage::before,
  .page-stage > *,
  .page-stage :is(.dashboard-recent-row, .dashboard-account-row, .dashboard-notification-row, .acc-card, .budget-item, .donut-legend-row, .bgt-stat, .weekly-legend-item),
  .page-stage tbody tr,
  .page-stage .weekly-bar,
  .page-stage .progress div,
  .page-stage .bgt-alloc-bar i,
  .page-stage .bgt-ring svg,
  .page-stage .donut-chart,
  .page-stage .donut-chart .donut-hole,
  .page-stage .rp-chart svg {
    animation: none;
  }
}
/* =========================================================
   THÊM GIAO DỊCH (Tổng quan) — 1 ô chữ nhật, 4 dòng
   1 tiêu đề · 2 loại giao dịch · 3 số tiền · 4 ngày / tài khoản / nội dung / nút thêm
   Màu nhấn đổi theo loại: Đầu ra = xanh dương pha lê · Đầu vào = xanh lá · Tip/Âm = hổ phách
========================================================= */

/* Hàng: [Thêm giao dịch] [Thao tác nhanh] */
.app.theme-v14.light-mode .dashboard-add-row,
.app.theme-v14.light-mode .dashboard-info-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(360px, 31%, 460px);
  gap: 20px;
  align-items: stretch;
  margin-bottom: 20px;
}

.app.theme-v14.light-mode .dashboard-add-row #dashboard-quick-add,
.app.theme-v14.light-mode .dashboard-add-row .transaction-page-add {
  height: 100%;
  margin: 0;
}

.app.theme-v14.light-mode .dashboard-add-row > .panel,
.app.theme-v14.light-mode .dashboard-info-row > .panel {
  display: flex;
  flex-direction: column;
  margin: 0;
  min-width: 0;
}

/* Thao tác nhanh: ô vuông bên phải, 3 nút dàn đều theo chiều cao */
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions {
  flex: 1;
  grid-auto-rows: 1fr;
  margin-top: 4px;
}

/* Phân bổ số dư: ô nhỏ bên phải, danh sách cuộn khi dài */
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-list {
  flex: 1;
  min-height: 0;
  max-height: 260px;
  overflow-y: auto;
}

.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-wide-button,
.app.theme-v14.light-mode .dashboard-budget-panel .dashboard-wide-button {
  margin-top: auto;
}

.app.theme-v14.light-mode .dashboard-budget-panel .dashboard-budget-mini-grid {
  margin-bottom: 14px;
}

@media (max-width: 1360px) {
  .app.theme-v14.light-mode .dashboard-add-row,
  .app.theme-v14.light-mode .dashboard-info-row {
    grid-template-columns: minmax(0, 1fr) 340px;
  }
}

@media (max-width: 1100px) {
  .app.theme-v14.light-mode .dashboard-add-row,
  .app.theme-v14.light-mode .dashboard-info-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-list { max-height: none; }
}

/* Ô bên phải lớn hơn: Thao tác nhanh + Phân bổ số dư */
.app.theme-v14.light-mode .dashboard-quick-panel,
.app.theme-v14.light-mode .dashboard-assets-panel { padding: 26px; }

.app.theme-v14.light-mode .dashboard-quick-panel h2,
.app.theme-v14.light-mode .dashboard-assets-panel h2 { font-size: 24px; letter-spacing: -0.02em; }

.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions { gap: 14px; margin-top: 10px; }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions button {
  grid-template-columns: 56px minmax(0, 1fr);
  column-gap: 16px;
  padding: 18px 20px;
  border-radius: 20px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions button:hover { transform: translateY(-3px); }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions svg {
  box-sizing: border-box;
  width: 56px;
  height: 56px;
  padding: 15px;
  color: #ea580c;
  background: rgba(249, 115, 22, 0.13);
  border-radius: 18px;
  transition: background 0.2s ease, color 0.2s ease;
}
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions button:hover svg { color: #ffffff; background: rgba(255, 255, 255, 0.16); }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions span { font-size: 17px; font-weight: 800; }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions small { margin-top: 3px; font-size: 13px; opacity: 0.75; }

.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-list { gap: 0; max-height: 330px; }
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-row { gap: 14px; padding: 17px 0; }
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-icon { width: 50px; height: 50px; flex: 0 0 50px; border-radius: 15px; }
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-icon svg { width: 24px; height: 24px; }
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-row strong { font-size: 16px; font-weight: 800; }
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-row span { margin-top: 3px; font-size: 12.5px; }
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-account-row > strong { font-size: 16.5px; }
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-wide-button { min-height: 52px; font-size: 15px; border-radius: 16px; }
.app.theme-v14.light-mode .dashboard-budget-panel .dashboard-wide-button { min-height: 52px; font-size: 15px; border-radius: 16px; }

/* ---------- Thẻ ---------- */
.app.theme-v14.light-mode .qa-card {
  --qa: #0ea5e9;
  --qa-ink: #0369a1;
  position: relative;
  height: 100%;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  box-shadow: 0 1px 2px rgba(24, 24, 27, 0.04), 0 22px 44px -26px rgba(24, 24, 27, 0.22);
}
.app.theme-v14.light-mode .qa-card[data-type="income"] { --qa: #16a34a; --qa-ink: #15803d; }
.app.theme-v14.light-mode .qa-card[data-type="adjustment"] { --qa: #d97706; --qa-ink: #b45309; }

/* Dải màu mảnh trên cùng, đổi theo loại */
.app.theme-v14.light-mode .qa-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, var(--qa), color-mix(in srgb, var(--qa) 40%, #ffffff));
  transition: background 0.35s ease;
}

.app.theme-v14.light-mode .qa-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  height: 100%;
  padding: 24px 26px 26px;
}

/* Dòng 1 */
.app.theme-v14.light-mode .qa-head { display: flex; align-items: center; gap: 14px; }
.app.theme-v14.light-mode .qa-head h2 { margin: 0; color: var(--text-heading); font-size: 19px; font-weight: 800; letter-spacing: -0.015em; }
.app.theme-v14.light-mode .qa-head span { color: var(--text-muted); font-size: 13px; font-weight: 600; }
.app.theme-v14.light-mode .qa-head-ico {
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  color: #ffffff;
  background: var(--qa);
  border-radius: 14px;
  box-shadow: 0 12px 22px -10px var(--qa);
  transition: background 0.35s ease, box-shadow 0.35s ease;
}

/* Dòng 2 */
.app.theme-v14.light-mode .qa-row-type { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; }

.app.theme-v14.light-mode .qa-seg {
  position: relative;
  flex: none;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(100%, 400px);
  padding: 4px;
  background: var(--bg-surface-alt);
  border: 1px solid var(--border);
  border-radius: 16px;
}
.app.theme-v14.light-mode .qa-seg::before {
  content: "";
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px) / 3);
  background: var(--qa);
  border-radius: 12px;
  box-shadow: 0 10px 20px -10px var(--qa);
  transform: translateX(calc(var(--qa-i, 0) * 100%));
  transition: transform 0.42s cubic-bezier(0.34, 1.3, 0.5, 1), background 0.35s ease;
}
.app.theme-v14.light-mode .qa-seg-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 0 8px;
  color: var(--text-muted);
  background: transparent;
  border: 0;
  border-radius: 12px;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: color 0.25s ease;
}
.app.theme-v14.light-mode .qa-seg-btn:hover:not(.active) { color: var(--qa-ink); background: transparent; transform: none; }
.app.theme-v14.light-mode .qa-seg-btn.active { color: #ffffff; }

.app.theme-v14.light-mode .qa-options { display: flex; flex-wrap: wrap; gap: 8px; }
.app.theme-v14.light-mode .qa-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 0 14px;
  color: var(--text-muted);
  background: var(--bg-surface-alt);
  border: 1.5px solid var(--border);
  border-radius: 13px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: 0.18s ease;
}
.app.theme-v14.light-mode .qa-option:hover { color: var(--qa-ink); border-color: color-mix(in srgb, var(--qa) 45%, var(--border)); background: color-mix(in srgb, var(--qa) 6%, var(--bg-surface)); transform: none; }
.app.theme-v14.light-mode .qa-option.active { color: var(--qa-ink); background: color-mix(in srgb, var(--qa) 11%, var(--bg-surface)); border-color: var(--qa); box-shadow: 0 8px 18px -12px var(--qa); }

.app.theme-v14.light-mode .qa-swap { animation: qaSwap 0.4s cubic-bezier(0.22, 0.8, 0.3, 1) backwards; }
@keyframes qaSwap {
  from { opacity: 0; transform: translate3d(14px, 0, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

.app.theme-v14.light-mode .qa-label {
  display: block;
  margin-bottom: 7px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 700;
}

/* Dòng 3: ô nhập số tiền */
.app.theme-v14.light-mode .qa-amount-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-surface);
  border: 1.5px solid color-mix(in srgb, var(--qa) 28%, var(--border));
  border-radius: 20px;
  box-shadow: 0 1px 2px rgba(24, 24, 27, 0.04), 0 16px 30px -24px var(--qa);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}
.app.theme-v14.light-mode .qa-amount-card:focus-within {
  border-color: var(--qa);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--qa) 14%, transparent), 0 16px 30px -24px var(--qa);
}

.app.theme-v14.light-mode .qa-amount-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 14px 18px 0;
}
.app.theme-v14.light-mode .qa-amount-top .qa-label { margin: 0; }

.app.theme-v14.light-mode .qa-amount-main {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 18px 14px;
}
.app.theme-v14.light-mode .qa-amount-badge {
  display: grid;
  place-items: center;
  flex: none;
  width: 48px;
  height: 48px;
  color: #ffffff;
  background: var(--qa);
  border-radius: 50%;
  box-shadow: 0 12px 20px -10px var(--qa);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  transition: background 0.3s ease, box-shadow 0.3s ease;
}
.app.theme-v14.light-mode .qa-card .qa-amount-input {
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: auto;
  padding: 0;
  color: var(--text-heading);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  outline: none;
  font-size: clamp(34px, 3.6vw, 48px);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.app.theme-v14.light-mode .qa-card .qa-amount-input::placeholder { color: color-mix(in srgb, var(--text-muted) 45%, transparent); }
.app.theme-v14.light-mode .qa-amount-unit {
  flex: none;
  padding: 6px 12px;
  color: var(--qa-ink);
  background: color-mix(in srgb, var(--qa) 12%, transparent);
  border-radius: 999px;
  font-size: 12.5px;
  font-style: normal;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.app.theme-v14.light-mode .qa-amount-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 18px;
  padding: 11px 18px;
  background: color-mix(in srgb, var(--qa) 5%, var(--bg-surface-alt));
  border-top: 1px solid color-mix(in srgb, var(--qa) 14%, var(--border));
  transition: background 0.3s ease;
}
.app.theme-v14.light-mode .qa-words { min-height: 18px; color: var(--text-secondary); font-size: 13px; font-weight: 600; }
.app.theme-v14.light-mode .qa-words.empty { color: var(--text-muted); font-weight: 500; opacity: 0.8; }

.app.theme-v14.light-mode .qa-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.app.theme-v14.light-mode .qa-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 13px;
  color: var(--qa-ink);
  background: color-mix(in srgb, var(--qa) 11%, var(--bg-surface));
  border: 1px solid color-mix(in srgb, var(--qa) 24%, transparent);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease, color 0.2s ease;
}
.app.theme-v14.light-mode .qa-chip:hover { color: #ffffff; background: var(--qa); transform: translateY(-2px); }
.app.theme-v14.light-mode .qa-chip:active { transform: scale(0.94); }
.app.theme-v14.light-mode .qa-chip.ghost { color: var(--text-muted); background: transparent; border-color: var(--border); }
.app.theme-v14.light-mode .qa-chip.ghost:hover { color: var(--text-heading); background: var(--bg-surface-alt); }

.app.theme-v14.light-mode .qa-preview {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-muted);
  font-size: 12.5px;
  font-weight: 700;
}
.app.theme-v14.light-mode .qa-preview svg { flex: none; }
.app.theme-v14.light-mode .qa-preview strong { color: var(--text-heading); font-variant-numeric: tabular-nums; font-weight: 800; white-space: nowrap; }
.app.theme-v14.light-mode .qa-preview strong.after { color: var(--qa-ink); }
.app.theme-v14.light-mode .qa-preview.warn svg,
.app.theme-v14.light-mode .qa-preview.warn strong.after { color: #e11d48; }

/* Dòng 4 */
.app.theme-v14.light-mode .qa-row-fields {
  display: grid;
  grid-template-columns: 172px minmax(0, 1fr) minmax(0, 1.25fr) auto;
  gap: 14px;
  align-items: end;
  margin-top: auto;
}
.app.theme-v14.light-mode .qa-field { display: block; min-width: 0; }
.app.theme-v14.light-mode .qa-card .dp-trigger { min-height: 48px; border-radius: 14px; }

.app.theme-v14.light-mode .qa-select-wrap { position: relative; display: block; }
.app.theme-v14.light-mode .qa-card .qa-select {
  width: 100%;
  min-height: 48px;
  padding: 0 38px 0 14px;
  color: var(--text-heading);
  background: var(--bg-surface-alt);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  box-shadow: none;
  outline: none;
  font-size: 14px;
  font-weight: 600;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
  transition: 0.18s ease;
}
.app.theme-v14.light-mode .qa-card .qa-select:focus { background: var(--bg-surface); border-color: var(--qa); box-shadow: 0 0 0 4px color-mix(in srgb, var(--qa) 14%, transparent); }
.app.theme-v14.light-mode .qa-select-chevron { position: absolute; top: 50%; right: 14px; color: var(--text-muted); pointer-events: none; transform: translateY(-50%) rotate(90deg); }

.app.theme-v14.light-mode .qa-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: var(--text-muted);
  background: var(--bg-surface-alt);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  transition: 0.18s ease;
}
.app.theme-v14.light-mode .qa-input-wrap:focus-within { color: var(--qa-ink); background: var(--bg-surface); border-color: var(--qa); box-shadow: 0 0 0 4px color-mix(in srgb, var(--qa) 14%, transparent); }
.app.theme-v14.light-mode .qa-card .qa-input {
  flex: 1;
  min-width: 0;
  min-height: 46px;
  padding: 0;
  color: var(--text-heading);
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  outline: none;
  font-size: 14.5px;
  font-weight: 600;
}

.app.theme-v14.light-mode .qa-submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 24px;
  color: #ffffff;
  background: linear-gradient(135deg, color-mix(in srgb, var(--qa) 78%, #ffffff), var(--qa));
  border: 0;
  border-radius: 14px;
  box-shadow: 0 16px 26px -14px var(--qa);
  font-size: 14.5px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, filter 0.2s ease;
}
.app.theme-v14.light-mode .qa-submit:hover { transform: translateY(-2px); box-shadow: 0 22px 32px -14px var(--qa); filter: brightness(1.04); }
.app.theme-v14.light-mode .qa-submit:active { transform: translateY(1px) scale(0.985); }

/* Ban đêm */
.app.theme-v14.light-mode.is-dark .qa-card .qa-amount-input,
.app.theme-v14.light-mode.is-dark .qa-card .qa-input,
.app.theme-v14.light-mode.is-dark .qa-card .qa-select { color: var(--text-heading); }
.app.theme-v14.light-mode.is-dark .qa-card .qa-amount-input,
.app.theme-v14.light-mode.is-dark .qa-card .qa-input { background: transparent; }
.app.theme-v14.light-mode.is-dark .qa-card .qa-select { background: var(--bg-surface-alt); }

@media (max-width: 1280px) {
  .app.theme-v14.light-mode .qa-row-fields { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .app.theme-v14.light-mode .qa-submit { grid-column: 1 / -1; }
}

@media (max-width: 760px) {
  .app.theme-v14.light-mode .qa-form { padding: 18px; }
  .app.theme-v14.light-mode .qa-amount-foot { flex-direction: column; align-items: flex-start; }
  .app.theme-v14.light-mode .qa-amount-main { gap: 10px; }
  .app.theme-v14.light-mode .qa-amount-badge { width: 40px; height: 40px; font-size: 24px; }
  .app.theme-v14.light-mode .qa-row-fields { grid-template-columns: minmax(0, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .app.theme-v14.light-mode .qa-seg::before,
  .app.theme-v14.light-mode .qa-chip,
  .app.theme-v14.light-mode .qa-option,
  .app.theme-v14.light-mode .qa-submit { transition: none; }
  .app.theme-v14.light-mode .qa-swap { animation: none; }
}

/* =========================================================
   THÊM GIAO DỊCH — bố cục 2 cột (v2): số tiền | tài khoản · ngày · nội dung
========================================================= */
.app.theme-v14.light-mode .qa2 { gap: 20px; }
.app.theme-v14.light-mode .qa-top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px 20px; }
.app.theme-v14.light-mode .qa-top .qa-seg { width: min(100%, 360px); }
.app.theme-v14.light-mode .qa-grid { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, 1fr); gap: 20px; align-items: stretch; }
.app.theme-v14.light-mode .qa-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.app.theme-v14.light-mode .qa-main .qa-amount-card { flex: 1; }
.app.theme-v14.light-mode .qa-main .qa-amount-main { flex: 1; }
.app.theme-v14.light-mode .qa-side { padding: 16px; background: var(--bg-surface-alt); border: 1px solid var(--border); border-radius: 20px; }
.app.theme-v14.light-mode .qa-side .qa-field { display: block; }
.app.theme-v14.light-mode .qa-side .qa-label { margin-bottom: 8px; }

.app.theme-v14.light-mode .qa-accounts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; max-height: 188px; overflow-y: auto; padding: 2px; }
.app.theme-v14.light-mode .qa-empty { grid-column: 1 / -1; padding: 12px 14px; color: var(--text-muted); background: var(--bg-surface); border: 1.5px dashed var(--border); border-radius: 14px; font-size: 13px; font-weight: 600; }
.app.theme-v14.light-mode .qa-acc { --c: #2563eb; position: relative; display: flex; align-items: center; gap: 10px; min-width: 0; padding: 9px 12px; color: var(--text-heading); background: var(--bg-surface); border: 1.5px solid var(--border); border-radius: 14px; text-align: left; cursor: pointer; transition: 0.16s ease; }
.app.theme-v14.light-mode .qa-acc.cash { --c: #16a34a; }
.app.theme-v14.light-mode .qa-acc.bank { --c: #2563eb; }
.app.theme-v14.light-mode .qa-acc.wallet { --c: #7c3aed; }
.app.theme-v14.light-mode .qa-acc i { display: grid; place-items: center; flex: none; width: 34px; height: 34px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border-radius: 11px; font-style: normal; }
.app.theme-v14.light-mode .qa-acc > span { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.app.theme-v14.light-mode .qa-acc b { overflow: hidden; font-size: 13.5px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.app.theme-v14.light-mode .qa-acc small { overflow: hidden; color: var(--text-muted); font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; text-overflow: ellipsis; white-space: nowrap; }
.app.theme-v14.light-mode .qa-acc:hover { border-color: color-mix(in srgb, var(--c) 50%, var(--border)); transform: none; }
.app.theme-v14.light-mode .qa-acc.active { background: color-mix(in srgb, var(--c) 9%, var(--bg-surface)); border-color: var(--c); box-shadow: 0 8px 18px -12px var(--c); }
.app.theme-v14.light-mode .qa-acc-check { position: absolute; top: 7px; right: 8px; color: var(--c); }

.app.theme-v14.light-mode .qa-date-row { display: flex; align-items: center; gap: 8px; }
.app.theme-v14.light-mode .qa-date-row .dp-trigger { flex: 1; min-width: 0; }
.app.theme-v14.light-mode .qa-day { flex: none; min-height: 48px; padding: 0 13px; color: var(--text-muted); background: var(--bg-surface); border: 1.5px solid var(--border); border-radius: 14px; font-size: 12.5px; font-weight: 800; cursor: pointer; transition: 0.16s ease; }
.app.theme-v14.light-mode .qa-day:hover { color: var(--qa-ink); border-color: color-mix(in srgb, var(--qa) 45%, var(--border)); transform: none; }
.app.theme-v14.light-mode .qa-day.active { color: var(--qa-ink); background: color-mix(in srgb, var(--qa) 11%, var(--bg-surface)); border-color: var(--qa); }

.app.theme-v14.light-mode .qa-side .qa-input-wrap { background: var(--bg-surface); }
.app.theme-v14.light-mode .qa-suggest { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.app.theme-v14.light-mode .qa-tag { padding: 5px 11px; color: var(--text-secondary); background: var(--bg-surface); border: 1px solid var(--border); border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.16s ease; }
.app.theme-v14.light-mode .qa-tag:hover { color: var(--qa-ink); border-color: color-mix(in srgb, var(--qa) 45%, var(--border)); transform: none; }
.app.theme-v14.light-mode .qa-tag.active { color: #ffffff; background: var(--qa); border-color: var(--qa); }

.app.theme-v14.light-mode .qa-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px 18px; margin-top: auto; padding-top: 18px; border-top: 1px dashed var(--border); }
.app.theme-v14.light-mode .qa-summary { display: flex; align-items: center; gap: 9px; flex: 1; min-width: 0; padding: 11px 15px; border-radius: 14px; font-size: 13.5px; font-weight: 600; }
.app.theme-v14.light-mode .qa-summary svg { flex: none; }
.app.theme-v14.light-mode .qa-summary span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app.theme-v14.light-mode .qa-summary.ready { color: var(--qa-ink); background: color-mix(in srgb, var(--qa) 9%, var(--bg-surface)); border: 1px solid color-mix(in srgb, var(--qa) 24%, transparent); }
.app.theme-v14.light-mode .qa-summary.warn { color: #b45309; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.28); }
.app.theme-v14.light-mode .qa-summary b { font-weight: 800; font-variant-numeric: tabular-nums; }
.app.theme-v14.light-mode .qa-foot .qa-submit { min-height: 52px; padding: 0 30px; }

.app.theme-v14.light-mode.is-dark .qa-summary.warn { color: #fbbf24; }

@media (max-width: 1280px) {
  .app.theme-v14.light-mode .qa-grid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 760px) {
  .app.theme-v14.light-mode .qa-accounts { grid-template-columns: minmax(0, 1fr); }
  .app.theme-v14.light-mode .qa-foot .qa-submit { width: 100%; }
  .app.theme-v14.light-mode .qa-date-row { flex-wrap: wrap; }
  .app.theme-v14.light-mode .qa-date-row .dp-trigger { flex: 1 1 100%; }
  .app.theme-v14.light-mode .qa-day { flex: 1; }
}

/* =========================================================
   THÊM GIAO DỊCH (v3): Ngày · Số tiền · Nội dung · Tài khoản gần nhất
========================================================= */
.app.theme-v14.light-mode .qa-body { display: flex; flex-direction: column; gap: 18px; }
.app.theme-v14.light-mode .qa-body .qa-field { display: block; min-width: 0; }
.app.theme-v14.light-mode .qa-fields { display: grid; grid-template-columns: 190px 190px minmax(0, 1fr); gap: 14px; align-items: end; }
.app.theme-v14.light-mode .qa-card .qa-money {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  color: var(--text-heading);
  background: var(--bg-surface-alt);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  box-shadow: none;
  outline: none;
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  transition: 0.18s ease;
}
.app.theme-v14.light-mode .qa-card .qa-money::placeholder { color: color-mix(in srgb, var(--text-muted) 55%, transparent); font-weight: 600; }
.app.theme-v14.light-mode .qa-card .qa-money:focus { background: var(--bg-surface); border-color: var(--qa); box-shadow: 0 0 0 4px color-mix(in srgb, var(--qa) 14%, transparent); }
.app.theme-v14.light-mode .qa-acc-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) auto; gap: 10px; align-items: stretch; }
.app.theme-v14.light-mode .qa-acc-row:not(:has(.qa-acc-more)) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.app.theme-v14.light-mode .qa-acc-more { display: grid; place-items: center; width: 48px; color: var(--text-muted); background: var(--bg-surface-alt); border: 1.5px solid var(--border); border-radius: 14px; cursor: pointer; transition: 0.16s ease; }
.app.theme-v14.light-mode .qa-acc-more:hover { color: var(--qa-ink); border-color: color-mix(in srgb, var(--qa) 45%, var(--border)); transform: none; }
.app.theme-v14.light-mode .qa-acc-more svg { transition: transform 0.25s ease; }
.app.theme-v14.light-mode .qa-acc-more.open { color: var(--qa-ink); background: color-mix(in srgb, var(--qa) 10%, var(--bg-surface)); border-color: var(--qa); }
.app.theme-v14.light-mode .qa-acc-more.open svg { transform: rotate(180deg); }
.app.theme-v14.light-mode .qa-acc-all { margin-top: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); max-height: 200px; animation: qaSwap 0.3s ease backwards; }
@media (max-width: 1100px) {
  .app.theme-v14.light-mode .qa-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .app.theme-v14.light-mode .qa-fields .qa-wide { grid-column: 1 / -1; }
  .app.theme-v14.light-mode .qa-acc-all { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .app.theme-v14.light-mode .qa-fields { grid-template-columns: minmax(0, 1fr); }
  .app.theme-v14.light-mode .qa-acc-row { grid-template-columns: minmax(0, 1fr) auto; }
  .app.theme-v14.light-mode .qa-acc-row .qa-acc:nth-of-type(n+2) { grid-column: 1 / -1; grid-row: 2; }
  .app.theme-v14.light-mode .qa-acc-all { grid-template-columns: minmax(0, 1fr); }
}

/* =========================================================
   THÊM GIAO DỊCH (v4): thu nhỏ + ô vuông chọn tài khoản
========================================================= */
.qa-pop { position: fixed; z-index: 3000; display: flex; flex-direction: column; padding: 12px; color: #0a0a0a; background: #ffffff; border: 1px solid #f0f0f0; border-radius: 20px; box-shadow: 0 24px 50px -16px rgba(24, 24, 27, 0.4); animation: dpPop 0.16s ease-out; }
.qa-pop-title { padding: 2px 6px 8px; color: #a3a3a3; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.qa-pop-list { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 6px; overflow-y: auto; }
.qa-pop-item { --c: #2563eb; display: flex; align-items: center; gap: 9px; padding: 7px 9px; color: inherit; background: #fafafa; border: 1.5px solid transparent; border-radius: 12px; text-align: left; cursor: pointer; transition: 0.15s ease; }
.qa-pop-item.cash { --c: #16a34a; }
.qa-pop-item.bank { --c: #2563eb; }
.qa-pop-item.wallet { --c: #7c3aed; }
.qa-pop-item i { display: grid; place-items: center; flex: none; width: 28px; height: 28px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border-radius: 9px; font-style: normal; }
.qa-pop-item > span { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.qa-pop-item b { overflow: hidden; font-size: 13px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.qa-pop-item small { color: #737373; font-size: 11.5px; font-weight: 600; font-variant-numeric: tabular-nums; }
.qa-pop-item > svg { flex: none; color: var(--c); }
.qa-pop-item:hover { border-color: color-mix(in srgb, var(--c) 45%, transparent); }
.qa-pop-item.active { background: color-mix(in srgb, var(--c) 10%, #ffffff); border-color: var(--c); }
html[data-theme="dark"] .qa-pop { color: #fafafa; background: #18181b; border-color: #2f2f33; }
html[data-theme="dark"] .qa-pop-item { background: #232327; }
html[data-theme="dark"] .qa-pop-item small { color: #a1a1aa; }
html[data-theme="dark"] .qa-pop-item.active { background: color-mix(in srgb, var(--c) 18%, #18181b); }

.app.theme-v14.light-mode .qa-card { border-radius: 20px; }
.app.theme-v14.light-mode .qa-form { gap: 12px; padding: 16px 18px 18px; }
.app.theme-v14.light-mode .qa2 { gap: 14px; }
.app.theme-v14.light-mode .qa-head { gap: 11px; }
.app.theme-v14.light-mode .qa-head-ico { width: 38px; height: 38px; border-radius: 12px; }
.app.theme-v14.light-mode .qa-head h2 { font-size: 17px; }
.app.theme-v14.light-mode .qa-head span { font-size: 12px; }
.app.theme-v14.light-mode .qa-top .qa-seg { width: min(100%, 300px); border-radius: 14px; }
.app.theme-v14.light-mode .qa-seg::before { border-radius: 10px; }
.app.theme-v14.light-mode .qa-seg-btn { min-height: 34px; font-size: 12.5px; }
.app.theme-v14.light-mode .qa-body { gap: 12px; }
.app.theme-v14.light-mode .qa-option { min-height: 36px; padding: 0 12px; border-radius: 11px; font-size: 12.5px; }
.app.theme-v14.light-mode .qa-label { margin-bottom: 5px; font-size: 12px; }
.app.theme-v14.light-mode .qa-fields { grid-template-columns: 150px 150px minmax(0, 1fr); gap: 10px; }
.app.theme-v14.light-mode .qa-card .dp-trigger { min-height: 42px; border-radius: 12px; font-size: 13.5px; }
.app.theme-v14.light-mode .qa-card .qa-money { min-height: 42px; border-radius: 12px; font-size: 14.5px; }
.app.theme-v14.light-mode .qa-card .qa-input { min-height: 40px; font-size: 13.5px; }
.app.theme-v14.light-mode .qa-input-wrap { border-radius: 12px; }
.app.theme-v14.light-mode .qa-acc-row { gap: 8px; }
.app.theme-v14.light-mode .qa-acc { padding: 6px 10px; border-radius: 12px; }
.app.theme-v14.light-mode .qa-acc i { width: 30px; height: 30px; border-radius: 10px; }
.app.theme-v14.light-mode .qa-acc b { font-size: 13px; }
.app.theme-v14.light-mode .qa-acc small { font-size: 11.5px; }
.app.theme-v14.light-mode .qa-acc-more { width: 42px; border-radius: 12px; }
.app.theme-v14.light-mode .qa-foot { gap: 10px 14px; padding-top: 12px; }
.app.theme-v14.light-mode .qa-summary { padding: 8px 12px; border-radius: 12px; font-size: 12.5px; }
.app.theme-v14.light-mode .qa-foot .qa-submit { min-height: 42px; padding: 0 22px; border-radius: 12px; font-size: 13.5px; }
@media (max-width: 1100px) {
  .app.theme-v14.light-mode .qa-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .app.theme-v14.light-mode .qa-fields { grid-template-columns: minmax(0, 1fr); }
}

/* =========================================================
   THÊM GIAO DỊCH + THAO TÁC NHANH (v5): nhỏ gọn hơn, nâng lên một chút
========================================================= */
.app.theme-v14.light-mode .dashboard-add-row {
  margin-top: -10px;
  margin-bottom: 14px;
}
.app.theme-v14.light-mode .qa-foot .qa-submit { margin-left: auto; }
.app.theme-v14.light-mode .qa-form { gap: 10px; padding: 14px 16px 16px; }
.app.theme-v14.light-mode .qa-body { gap: 10px; }
.app.theme-v14.light-mode .qa-card .dp-trigger,
.app.theme-v14.light-mode .qa-card .qa-money { min-height: 38px; }
.app.theme-v14.light-mode .qa-card .qa-input { min-height: 36px; }
.app.theme-v14.light-mode .qa-acc { padding: 5px 10px; }
.app.theme-v14.light-mode .qa-acc i { width: 28px; height: 28px; }
.app.theme-v14.light-mode .qa-acc-more { width: 38px; }
.app.theme-v14.light-mode .qa-foot { padding-top: 10px; }
.app.theme-v14.light-mode .qa-foot .qa-submit { min-height: 40px; }

.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-panel { padding: 14px 16px 16px; }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-panel h2 { font-size: 16px; }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-panel .dashboard-panel-heading span { font-size: 12px; }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions { gap: 8px; margin-top: 6px; }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions button {
  grid-template-columns: 40px minmax(0, 1fr);
  column-gap: 12px;
  padding: 10px 14px;
  border-radius: 16px;
}
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions svg {
  width: 40px;
  height: 40px;
  padding: 10px;
  border-radius: 13px;
}
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions span { font-size: 14.5px; }
.app.theme-v14.light-mode .dashboard-add-row .dashboard-quick-actions small { margin-top: 1px; font-size: 11.5px; }
@media (max-width: 1100px) {
  .app.theme-v14.light-mode .dashboard-add-row { grid-template-columns: minmax(0, 1fr); margin-top: 0; }
}

/* =========================================================
   THÊM GIAO DỊCH (v6): 2 tài khoản mới thêm gần nhất (thẻ nhỏ) + nút "v" dịch trái
========================================================= */
.app.theme-v14.light-mode .qa-acc-row { display: flex; flex-wrap: nowrap; align-items: stretch; justify-content: flex-start; gap: 8px; }
.app.theme-v14.light-mode .qa-acc-row .qa-empty { flex: 1; }
.app.theme-v14.light-mode .qa-acc { flex: 0 0 156px; width: 156px; padding: 4px 8px; gap: 8px; }
.app.theme-v14.light-mode .qa-acc i { width: 26px; height: 26px; border-radius: 9px; }
.app.theme-v14.light-mode .qa-acc b { font-size: 12.5px; }
.app.theme-v14.light-mode .qa-acc small { font-size: 11px; }
.app.theme-v14.light-mode .qa-acc-check { top: 5px; right: 6px; }
.app.theme-v14.light-mode .qa-acc-more { flex: none; width: 38px; }
@media (max-width: 640px) {
  .app.theme-v14.light-mode .qa-acc-row { flex-wrap: wrap; }
  .app.theme-v14.light-mode .qa-acc { flex: 1 1 140px; width: auto; }
}
.qa-pop { padding: 14px; border-radius: 22px; }
.qa-pop-title { padding: 2px 6px 10px; font-size: 11.5px; }
.qa-pop-list { gap: 7px; }
.qa-pop-item { gap: 11px; padding: 9px 11px; border-radius: 14px; }
.qa-pop-item i { width: 32px; height: 32px; border-radius: 10px; }
.qa-pop-item b { font-size: 13.5px; }
.qa-pop-item small { font-size: 12px; }

/* Tổng quan: nút "Xem ngân sách tháng" / "Quản lý tài khoản" — hover cam nhạt (pha) */
.app.theme-v14.light-mode .dashboard-budget-panel .dashboard-wide-button,
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-wide-button {
  transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease, transform 0.2s ease;
}
.app.theme-v14.light-mode .dashboard-budget-panel .dashboard-wide-button:hover,
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-wide-button:hover {
  color: #9a3412;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.4), rgba(253, 186, 116, 0.24));
  border-color: rgba(249, 115, 22, 0.55);
  box-shadow: 0 12px 24px -14px rgba(234, 88, 12, 0.7);
  transform: translateY(-1px);
}
.app.theme-v14.light-mode .dashboard-budget-panel .dashboard-wide-button:hover svg,
.app.theme-v14.light-mode .dashboard-assets-panel .dashboard-wide-button:hover svg { color: #ea580c; }
.app.theme-v14.light-mode.is-dark .dashboard-budget-panel .dashboard-wide-button:hover,
.app.theme-v14.light-mode.is-dark .dashboard-assets-panel .dashboard-wide-button:hover {
  color: #fed7aa;
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.42), rgba(251, 146, 60, 0.22));
  border-color: rgba(251, 146, 60, 0.6);
}

/* =========================================================
   DÒNG TIỀN TRONG THÁNG — nền trắng như cũ, sóng mượt có đổ màu gradient + cột khối lượng
========================================================= */
.rp-flow { --fl-in: #10b981; --fl-out: var(--rp-out); }
.app.is-dark .rp-flow { --fl-in: #34d399; }
.rp-flow .rp-legend i { width: 16px; height: 4px; }
.rp-flow .rp-legend .in { background: var(--fl-in); }
.rp-flow .rp-legend .out { background: var(--fl-out); }
.rp-flow .rp-seg { border-radius: 999px; }
.rp-flow .rp-seg button { padding: 5px 14px; border-radius: 999px; }
.rp-flow .rp-chart { min-height: 300px; }

.fl-s-in { stop-color: var(--fl-in); }
.fl-s-out { stop-color: var(--fl-out); }
.fl-s-cur { stop-color: var(--rp-text); }
.fl-grid { stroke: var(--rp-grid); stroke-dasharray: 3 5; }
.fl-axis { fill: var(--rp-muted); font-size: 11px; }
.fl-line { fill: none; stroke-width: 2.7; stroke-linecap: round; stroke-linejoin: round; }
.fl-line.in { stroke: var(--fl-in); filter: drop-shadow(0 5px 7px color-mix(in srgb, var(--fl-in) 38%, transparent)); }
.fl-line.out { stroke: var(--fl-out); filter: drop-shadow(0 5px 7px color-mix(in srgb, var(--fl-out) 38%, transparent)); }
.fl-bar { fill: var(--rp-grid); transition: fill 0.15s ease; }
.fl-bar.on { fill: url(#fl-bar-on); filter: drop-shadow(0 3px 6px color-mix(in srgb, var(--fl-in) 45%, transparent)); }
.fl-halo.in { fill: color-mix(in srgb, var(--fl-in) 22%, transparent); }
.fl-halo.out { fill: color-mix(in srgb, var(--fl-out) 26%, transparent); }
.fl-dot { stroke: var(--rp-card); stroke-width: 2.6; }
.fl-dot.in { fill: var(--fl-in); }
.fl-dot.out { fill: var(--fl-out); }
.fl-tip {
  position: absolute;
  z-index: 3;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 13px;
  color: var(--rp-text);
  border: 1px solid var(--rp-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--rp-card) 86%, transparent);
  box-shadow: 0 14px 30px -14px rgba(0, 0, 0, 0.4);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  white-space: nowrap;
  pointer-events: none;
}
.fl-tip.in { border-color: color-mix(in srgb, var(--fl-in) 55%, var(--rp-border)); }
.fl-tip.out { border-color: color-mix(in srgb, var(--fl-out) 60%, var(--rp-border)); }
.fl-tip span { color: var(--rp-muted); font-size: 11.5px; font-weight: 600; }
.fl-tip strong { font-size: 15px; font-weight: 800; font-variant-numeric: tabular-nums; }
.fl-chip {
  position: absolute;
  z-index: 3;
  transform: translateX(-50%);
  padding: 2px 10px;
  color: var(--rp-card);
  background: var(--rp-text);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  pointer-events: none;
}

/* Báo cáo: phần trăm tăng / giảm so với tháng trước hiện rõ */
.rp-delta { gap: 3px; padding: 4px 11px; font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
.rp-left .rp-kpi .rp-kpi-foot em { font-size: 14px; }

/* Báo cáo: % so với tháng trước — không nền, góc phải; tăng xanh, giảm đỏ */
.rp-delta, .rp-delta.good, .rp-delta.bad, .rp-delta.up, .rp-delta.down, .rp-delta.flat { padding: 0; background: transparent; border-radius: 0; font-size: 15px; font-weight: 800; }
.rp-delta.up { color: #16a34a; }
.rp-delta.down { color: #e11d48; }
.rp-delta.flat { color: var(--rp-muted); }
.rp-kpi-foot { justify-content: flex-end; }
`;
