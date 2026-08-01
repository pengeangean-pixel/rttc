import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";
import {
  EmailAuthProvider,
  User as FirebaseUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  updateProfile
} from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Users, 
  MapPin, 
  QrCode, 
  CheckCircle, 
  FileSpreadsheet, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Download, 
  UserCheck, 
  Smartphone, 
  Locate, 
  User,
  UserPlus, 
  Save, 
  Calendar, 
  Compass, 
  TrendingUp,
  ExternalLink, 
  AlertTriangle,
  Globe,
  Settings,
  X,
  Check,
  Phone,
  Send,
  LogOut,
  LogIn,
  Lock,
  Mail,
  Key,
  RefreshCw,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock
} from "lucide-react";
import { Student, AttendanceRecord, GeofenceConfig, AttendanceStatus, AttendanceShift } from "./types";
import QRCode from "qrcode";

// Default Initial Students List fallback
const defaultStudentsList: Student[] = [
  {
    id: "s-101",
    name: "ធឿន ផានិត",
    gender: "ប្រុស",
    dob: "2004-10-14",
    profilePhoto: "",
    schoolName: "វិទ្យាល័យកំពង់ចាម",
    phoneNumber: "0961122334",
    telegram: "phanitkrn",
    address: "កំពង់ចាម",
    village: "ភូមិវាល",
    commune: "ឃុំព្រៃឈរ",
    district: "ស្រុកព្រៃឈរ",
    province: "ខេត្តកំពង់ចាម",
    isMonitor: false
  },
  {
    id: "s-102",
    name: "ចិត្រា វ៉ារិន",
    gender: "ប្រុស",
    dob: "2003-05-18",
    profilePhoto: "",
    schoolName: "វិទ្យាល័យហ៊ុនសែន",
    phoneNumber: "0968877661",
    telegram: "varinchitra",
    address: "កំពង់ចាម",
    village: "ភូមិថ្មី",
    commune: "ឃុំជ្រៃវៀន",
    district: "ស្រុកព្រៃឈរ",
    province: "ខេត្តកំពង់ចាម",
    isMonitor: false
  },
  {
    id: "s-103",
    name: "ធឿន ទី",
    gender: "ប្រុស",
    dob: "2004-08-05",
    profilePhoto: "",
    schoolName: "RTTC Kampong Cham",
    phoneNumber: "0889988772",
    telegram: "tichn",
    address: "កំពង់ចាម",
    village: "ភូមិអូរ",
    commune: "ឃុំតាអុង",
    district: "ស្រុកចំការលើ",
    province: "ខេត្តកំពង់ចាម",
    isMonitor: true
  }
];

const removeUndefinedFields = <T extends object>(data: T) => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
};

const padDateNumber = (value: number) => String(value).padStart(2, "0");

const toLocalISODate = (date: Date) => {
  return `${date.getFullYear()}-${padDateNumber(date.getMonth() + 1)}-${padDateNumber(date.getDate())}`;
};

const parseISODate = (dateString: string) => {
  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const KHMER_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAY_LABELS = {
  km: ["ច", "អ", "ព", "ព្រ", "សុ", "ស", "អា"],
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
};

type PremiumDatePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  lang: "km" | "en";
  placeholder?: string;
  className?: string;
};

const PremiumDatePicker = ({ id, value, onChange, lang, placeholder, className = "" }: PremiumDatePickerProps) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const selectedDate = value ? parseISODate(value) : new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));

  useEffect(() => {
    if (value) {
      const next = parseISODate(value);
      setVisibleMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = new Date();
  const todayISO = toLocalISODate(today);
  const selectedISO = value;
  const monthNames = lang === "km" ? KHMER_MONTHS : EN_MONTHS;
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1 - mondayOffset);

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        id={id}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-xs transition-all hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${className}`}
      >
        <span>{value ? value.split("-").reverse().join("/") : (placeholder || "01/08/2026")}</span>
        <Calendar className="h-4 w-4 text-slate-400" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute left-0 top-full z-[9999] mt-2 w-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl p-4"
          >
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-sm text-slate-800">
                {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
              </h4>
              <div className="flex gap-1">
                <button type="button" onClick={() => setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setVisibleMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-2">
              {WEEKDAY_LABELS[lang].map(d => <div key={d}>{d}</div>)}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map(day => {
                const iso = toLocalISODate(day);
                const isSelected = iso === selectedISO;
                const isToday = iso === todayISO;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      onChange(iso);
                      setIsOpen(false);
                    }}
                    className={`h-8 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-blue-900 text-white shadow-xs"
                        : isToday
                          ? "bg-emerald-50 text-emerald-700 font-extrabold"
                          : "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<"km" | "en">("km");
  const [activeTab, setActiveTab] = useState<"dashboard" | "admin" | "qr" | "sheets">("dashboard");

  // Core Data States
  const [students, setStudents] = useState<Student[]>(defaultStudentsList);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalISODate(new Date()));
  const [shift, setShift] = useState<AttendanceShift>("noon"); // "morning" | "noon" | "afternoon"
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Auth States
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [inputEmail, setInputEmail] = useState("");
  const [inputPassword, setInputPassword] = useState("");

  // QR Code & Geofence
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [geofence, setGeofence] = useState<GeofenceConfig>({
    latitude: 12.0004658,
    longitude: 105.4645,
    radius: 150,
    isEnabled: true
  });

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Firebase Auth Observer
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsub();
  }, []);

  // Firebase Firestore Realtime Sync
  useEffect(() => {
    const qStudents = query(collection(db, "students"));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const list: Student[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Student));
      if (list.length > 0) setStudents(list);
    });

    const qAttendance = query(collection(db, "attendance"));
    const unsubAttendance = onSnapshot(qAttendance, (snap) => {
      const list: AttendanceRecord[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as AttendanceRecord));
      setAttendance(list);
    });

    return () => {
      unsubStudents();
      unsubAttendance();
    };
  }, []);

  // Generate QR Code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = `${window.location.origin}${window.location.pathname}?mode=student-checkin&date=${selectedDate}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 1 });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error(err);
      }
    };
    generateQR();
  }, [selectedDate, geofence]);

  // Update Attendance Function (Direct status change to Firebase)
  const updateAttendanceStatus = async (studentId: string, newStatus: AttendanceStatus) => {
    const todayStr = selectedDate;
    const recordId = `${studentId}-${todayStr}`;
    
    const now = new Date();
    const formattedTime = `${padDateNumber(now.getHours())}:${padDateNumber(now.getMinutes())}`;

    const newRecord: AttendanceRecord = {
      id: recordId,
      studentId,
      date: todayStr,
      shift,
      status: newStatus,
      checkInTime: (newStatus === "Present" || newStatus === "Late") ? formattedTime : "",
      verifiedByQR: false
    };

    try {
      await setDoc(doc(db, "attendance", recordId), removeUndefinedFields(newRecord), { merge: true });
      triggerToast(lang === "km" ? "បានកែប្រែវត្តមានរួចរាល់" : "Attendance updated");
    } catch (err) {
      console.error("Error saving to cloud:", err);
      // Fallback local update
      setAttendance(prev => {
        const exists = prev.some(r => r.id === recordId);
        return exists ? prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r) : [...prev, newRecord];
      });
      triggerToast(lang === "km" ? "បានកត់ត្រាក្នុងម៉ាស៊ីន" : "Saved locally");
    }
  };

  // Get status for today
  const getDailyList = () => {
    return students.map(st => {
      const rec = attendance.find(r => r.studentId === st.id && r.date === selectedDate);
      return {
        ...st,
        status: (rec ? rec.status : "Present") as AttendanceStatus,
        checkInTime: rec?.checkInTime || ""
      };
    });
  };

  const dailyList = getDailyList();
  const filteredList = dailyList.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Stats Counters
  const totalCount = students.length;
  const presentCount = dailyList.filter(s => s.status === "Present").length;
  const absentCount = dailyList.filter(s => s.status === "Absent" || s.status === "Absent_No_Permission").length;
  const lateCount = dailyList.filter(s => s.status === "Late").length;
  const permissionCount = dailyList.filter(s => s.status === "Permission" || s.status === "Absent_Permission").length;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans">
      
      {/* Dynamic Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Main App Navigation Header */}
        <header className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0f2b5c] text-white rounded-xl shadow-xs">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[#0f2b5c] tracking-tight">
                {lang === "km" ? "វត្តមានសិស្ស - វិទ្យាស្ថាន RTTC" : "Student Attendance Portal"}
              </h1>
              <p className="text-xs text-slate-400 font-semibold">
                {lang === "km" ? "ប្រព័ន្ធគ្រប់គ្រងសន្លឹកវត្តមាន ថ្នាក់ R01" : "Attendance Management System R01"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "km" ? "en" : "km")}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              {lang === "km" ? "English" : "ភាសាខ្មែរ"}
            </button>

            {firebaseUser ? (
              <button
                onClick={() => signOut(auth)}
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                {lang === "km" ? "ចាកចេញ" : "Logout"}
              </button>
            ) : null}
          </div>
        </header>

        {/* Tab Navigation Switches */}
        <nav className="flex space-x-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs mb-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === "dashboard" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {lang === "km" ? "វត្តមានសិស្ស" : "Dashboard"}
          </button>
          <button
            onClick={() => setActiveTab("admin")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === "admin" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {lang === "km" ? "បញ្ជីឈ្មោះសិស្ស" : "Students"}
          </button>
          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === "qr" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {lang === "km" ? "កូដ QR" : "QR Code"}
          </button>
          <button
            onClick={() => setActiveTab("sheets")}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === "sheets" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-500 hover:bg-slate-50"}`}
          >
            {lang === "km" ? "តារាងសរុប" : "Reports"}
          </button>
        </nav>

        {/* ================= TAB 1: MAIN DASHBOARD (EXACT MATCH TO YOUR IMAGE) ================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-5">
            
            {/* Header Title Section */}
            <div className="flex items-center gap-2 text-[#0f2b5c]">
              <CheckCircle className="w-5 h-5 text-[#0f2b5c]" />
              <h2 className="text-lg font-extrabold tracking-tight">វត្តមានសិស្ស</h2>
            </div>

            {/* Date & Shift Selectors */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  កាលបរិច្ឆេទ
                </label>
                <PremiumDatePicker
                  id="rttc-date-input"
                  value={selectedDate}
                  onChange={setSelectedDate}
                  lang={lang}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">
                  វេន <span className="text-red-500">*</span>
                </label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as AttendanceShift)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
                >
                  <option value="morning">វេនព្រឹក (07:30–11:00)</option>
                  <option value="noon">វេនថ្ងៃត្រង់ (10:30–14:00)</option>
                  <option value="afternoon">វេនរសៀល (14:00–17:00)</option>
                </select>
              </div>
            </div>

            {/* Horizontal 5-Box Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs">
                <span className="text-2xl font-black text-[#0f2b5c] block mb-1">{totalCount}</span>
                <span className="text-xs font-bold text-slate-500">សរុប</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs">
                <span className="text-2xl font-black text-emerald-600 block mb-1">{presentCount}</span>
                <span className="text-xs font-bold text-slate-500">វត្តមាន</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs">
                <span className="text-2xl font-black text-red-600 block mb-1">{absentCount}</span>
                <span className="text-xs font-bold text-slate-500">អវត្តមាន</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs">
                <span className="text-2xl font-black text-amber-600 block mb-1">{lateCount}</span>
                <span className="text-xs font-bold text-slate-500">យឺត</span>
              </div>

              <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs col-span-2 sm:col-span-1">
                <span className="text-2xl font-black text-blue-600 block mb-1">{permissionCount}</span>
                <span className="text-xs font-bold text-slate-500">ច្បាប់</span>
              </div>
            </div>

            {/* Search Filter Bar */}
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="ស្វែងរកឈ្មោះសិស្ស..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-semibold"
              />
            </div>

            {/* Student Cards Grid (Matching image layout) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((st, i) => (
                <div
                  key={st.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-4 hover:shadow-md transition-all"
                >
                  {/* Circle Badge + Student Name */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0f2b5c] text-white font-black flex items-center justify-center text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-slate-900 text-base leading-snug truncate">
                        {st.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-mono truncate">
                        {st.telegram || st.phoneNumber || `student_${i + 1}`}
                      </p>
                    </div>
                  </div>

                  {/* 4 Attendance Action Buttons */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 bg-[#f8fafc] p-1.5 rounded-xl">
                    {/* វត្តមាន */}
                    <button
                      type="button"
                      onClick={() => updateAttendanceStatus(st.id, "Present")}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                        st.status === "Present"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "text-emerald-700 hover:bg-emerald-50"
                      }`}
                    >
                      <Check className="w-4 h-4 mb-0.5" />
                      <span>វត្តមាន</span>
                    </button>

                    {/* អវត្តមាន */}
                    <button
                      type="button"
                      onClick={() => updateAttendanceStatus(st.id, "Absent")}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                        st.status === "Absent" || st.status === "Absent_No_Permission"
                          ? "bg-red-600 text-white shadow-xs"
                          : "text-red-700 hover:bg-red-50"
                      }`}
                    >
                      <X className="w-4 h-4 mb-0.5" />
                      <span>អវត្តមាន</span>
                    </button>

                    {/* យឺត */}
                    <button
                      type="button"
                      onClick={() => updateAttendanceStatus(st.id, "Late")}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                        st.status === "Late"
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-amber-700 hover:bg-amber-50"
                      }`}
                    >
                      <Clock className="w-4 h-4 mb-0.5" />
                      <span>យឺត</span>
                    </button>

                    {/* ច្បាប់ */}
                    <button
                      type="button"
                      onClick={() => updateAttendanceStatus(st.id, "Permission")}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all ${
                        st.status === "Permission" || st.status === "Absent_Permission"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-blue-700 hover:bg-blue-50"
                      }`}
                    >
                      <Calendar className="w-4 h-4 mb-0.5" />
                      <span>ច្បាប់</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ================= TAB 2: ADMIN STUDENT ROSTER ================= */}
        {activeTab === "admin" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900">បញ្ជីឈ្មោះសិស្សសរុប ({students.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {students.map((st, i) => (
                <div key={st.id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">{i + 1}. {st.name}</span>
                    <span className="text-xs text-slate-400 font-mono">{st.phoneNumber} | {st.telegram}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{st.gender}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: QR CODE GENERATOR ================= */}
        {activeTab === "qr" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs text-center space-y-4 max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-slate-900">កូដ QR សម្រាប់ស្កេនវត្តមាន</h3>
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64 mx-auto rounded-xl border border-slate-200 p-2" />
            ) : null}
            <p className="text-xs text-slate-500">ស្កេនកូដនេះដើម្បីចុះឈ្មោះវត្តមានប្រចាំថ្ងៃ</p>
          </div>
        )}

        {/* ================= TAB 4: REPORTS ================= */}
        {activeTab === "sheets" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4 overflow-x-auto">
            <h3 className="text-base font-extrabold text-slate-900">របាយការណ៍សរុបវត្តមានថ្ងៃនេះ</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b text-slate-600 font-bold">
                  <th className="p-2">ល.រ</th>
                  <th className="p-2">ឈ្មោះ</th>
                  <th className="p-2">ភេទ</th>
                  <th className="p-2">លេខទូរស័ព្ទ</th>
                  <th className="p-2">ស្ថានភាព</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dailyList.map((st, i) => (
                  <tr key={st.id}>
                    <td className="p-2 font-bold text-slate-400">{i + 1}</td>
                    <td className="p-2 font-bold text-slate-800">{st.name}</td>
                    <td className="p-2 text-slate-600">{st.gender}</td>
                    <td className="p-2 font-mono text-slate-500">{st.phoneNumber}</td>
                    <td className="p-2 font-bold">
                      <span className={`px-2 py-1 rounded-lg text-[10px] ${
                        st.status === "Present" ? "bg-emerald-100 text-emerald-800" :
                        st.status === "Late" ? "bg-amber-100 text-amber-800" :
                        st.status === "Permission" ? "bg-blue-100 text-blue-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {st.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
