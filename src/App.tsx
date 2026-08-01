import React, { useState, useEffect, useRef } from "react";
import { auth, db } from "./firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc, 
  deleteDoc 
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signOut,
  User as FirebaseUser
} from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, 
  Search, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  X, 
  Check, 
  LogOut, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  UserPlus,
  Save,
  Building,
  Phone,
  Send,
  MapPin,
  FileText
} from "lucide-react";
import { Student, AttendanceRecord, AttendanceStatus, AttendanceShift } from "./types";
import QRCode from "qrcode";

// បញ្ជីសិស្សលំនាំដើម
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
    province: "ខេត្តកំពង់ចាម"
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
    province: "ខេត្តកំពង់ចាម"
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
    province: "ខេត្តកំពង់ចាម"
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
};

const PremiumDatePicker = ({ id, value, onChange, lang, placeholder }: PremiumDatePickerProps) => {
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
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-xs hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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

  // Core States
  const [students, setStudents] = useState<Student[]>(defaultStudentsList);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalISODate(new Date()));
  const [shift, setShift] = useState<AttendanceShift>("morning");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Student Form & Modal
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const emptyStudentForm: Omit<Student, "id"> = {
    name: "",
    gender: "ប្រុស",
    dob: "2004-01-01",
    profilePhoto: "",
    phoneNumber: "",
    telegram: "",
    schoolName: "",
    address: "",
    village: "",
    commune: "",
    district: "",
    province: ""
  };
  const [studentForm, setStudentForm] = useState<Omit<Student, "id">>(emptyStudentForm);

  // Auth & QR
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsub();
  }, []);

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

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = `${window.location.origin}${window.location.pathname}?mode=student-checkin&date=${selectedDate}&shift=${shift}`;
        const dataUrl = await QRCode.toDataURL(url, { width: 300, margin: 1 });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error(err);
      }
    };
    generateQR();
  }, [selectedDate, shift]);

  // រក្សាទុកវត្តមាន
  const updateAttendanceStatus = async (studentId: string, newStatus: AttendanceStatus) => {
    const recordId = `${studentId}-${selectedDate}-${shift}`;
    const now = new Date();
    const formattedTime = `${padDateNumber(now.getHours())}:${padDateNumber(now.getMinutes())}`;

    // រក្សាទុកមូលហេតុចាស់ប្រសិនបើមាន
    const existingRec = attendance.find(r => r.id === recordId);

    const newRecord: AttendanceRecord = {
      id: recordId,
      studentId,
      date: selectedDate,
      shift,
      status: newStatus,
      checkInTime: (newStatus === "Present" || newStatus === "Late") ? formattedTime : "",
      verifiedByQR: false,
      absenceNote: newStatus === "Present" ? "" : (existingRec?.absenceNote || "")
    };

    try {
      await setDoc(doc(db, "attendance", recordId), removeUndefinedFields(newRecord), { merge: true });
      const shiftText = shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល";
      triggerToast(`បានកត់ត្រាវត្តមាន (${shiftText}) រួចរាល់!`);
    } catch (err) {
      console.error("Error saving to Firestore:", err);
      setAttendance(prev => {
        const exists = prev.some(r => r.id === recordId);
        return exists ? prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r) : [...prev, newRecord];
      });
      triggerToast("បានរក្សាទុកក្នុងម៉ាស៊ីន (Offline)");
    }
  };

  // 🔥 មុខងាររក្សាទុកមូលហេតុ (Save Absence/Late/Permission Reason Note)
  const updateAbsenceNote = async (studentId: string, note: string) => {
    const recordId = `${studentId}-${selectedDate}-${shift}`;
    try {
      await setDoc(doc(db, "attendance", recordId), { absenceNote: note }, { merge: true });
      triggerToast("បានរក្សាទុកមូលហេតុរួចរាល់!");
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  const getDailyList = () => {
    return students.map(st => {
      const recordId = `${st.id}-${selectedDate}-${shift}`;
      const rec = attendance.find(r => r.id === recordId);
      return {
        ...st,
        status: (rec ? rec.status : "Present") as AttendanceStatus,
        checkInTime: rec?.checkInTime || "",
        absenceNote: rec?.absenceNote || ""
      };
    });
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.phoneNumber) {
      triggerToast("សូមបំពេញឈ្មោះ និងលេខទូរស័ព្ទសិស្ស!");
      return;
    }

    try {
      if (editingStudentId) {
        const updatedStudent: Student = { id: editingStudentId, ...studentForm };
        await setDoc(doc(db, "students", editingStudentId), removeUndefinedFields(updatedStudent));
        setStudents(prev => prev.map(s => s.id === editingStudentId ? updatedStudent : s));
        triggerToast("បានកែប្រែព័ត៌មានសិស្សជោគជ័យ!");
      } else {
        const newId = `s-${Date.now()}`;
        const newStudent: Student = { id: newId, ...studentForm };
        await setDoc(doc(db, "students", newId), removeUndefinedFields(newStudent));
        setStudents(prev => [...prev, newStudent]);
        triggerToast("បានបន្ថែមសិស្សថ្មីជោគជ័យ!");
      }

      setShowStudentModal(false);
      setEditingStudentId(null);
      setStudentForm(emptyStudentForm);
    } catch (err) {
      console.error("Error saving student:", err);
      triggerToast("មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យសិស្ស");
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបសិស្សឈ្មោះ "${name}" មែនទេ?`)) return;
    try {
      await deleteDoc(doc(db, "students", id));
      setStudents(prev => prev.filter(s => s.id !== id));
      triggerToast("បានលុបសិស្សចេញពីប្រព័ន្ធ!");
    } catch (err) {
      console.error(err);
      triggerToast("មានបញ្ហាក្នុងការលុបសិស្ស");
    }
  };

  const handleEditInit = (st: Student) => {
    setEditingStudentId(st.id);
    setStudentForm({
      name: st.name,
      gender: st.gender,
      dob: st.dob,
      profilePhoto: st.profilePhoto || "",
      phoneNumber: st.phoneNumber,
      telegram: st.telegram,
      schoolName: st.schoolName || "",
      address: st.address || "",
      village: st.village || "",
      commune: st.commune || "",
      district: st.district || "",
      province: st.province || ""
    });
    setShowStudentModal(true);
  };

  const dailyList = getDailyList();
  const filteredList = dailyList.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const totalCount = students.length;
  const presentCount = dailyList.filter(s => s.status === "Present").length;
  const absentCount = dailyList.filter(s => s.status === "Absent" || s.status === "Absent_No_Permission").length;
  const lateCount = dailyList.filter(s => s.status === "Late").length;
  const permissionCount = dailyList.filter(s => s.status === "Permission" || s.status === "Absent_Permission").length;

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 font-sans flex flex-col justify-between">
      
      {/* Toast Notification */}
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

      <div className="max-w-6xl mx-auto px-4 py-6 w-full flex-1">
        
        {/* App Header */}
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

            {firebaseUser && (
              <button
                onClick={() => signOut(auth)}
                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                {lang === "km" ? "ចាកចេញ" : "Logout"}
              </button>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
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

        {/* ================= TAB 1: MAIN DASHBOARD ================= */}
        {activeTab === "dashboard" && (
          <div className="space-y-5">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#0f2b5c]">
                <CheckCircle className="w-5 h-5 text-[#0f2b5c]" />
                <h2 className="text-lg font-extrabold tracking-tight">វត្តមានសិស្ស</h2>
              </div>
              <span className="text-xs bg-blue-50 text-blue-800 font-bold px-3 py-1 rounded-full border border-blue-200">
                {shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល"}
              </span>
            </div>

            {/* ជ្រើសរើសកាលបរិច្ឆេទ និង វេន */}
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
                  <option value="afternoon">វេនរសៀល (13:00–17:00)</option>
                </select>
              </div>
            </div>

            {/* របារបង្ហាញស្ថិតិ ៥ ប្រអប់ */}
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

            {/* ស្វែងរកសិស្ស */}
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

            {/* កាតសិស្ស */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((st, i) => (
                <div
                  key={st.id}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 hover:shadow-md transition-all"
                >
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

                  {/* ប៊ូតុងទាំង ៤ វត្តមាន អវត្តមាន យឺត ច្បាប់ */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 bg-[#f8fafc] p-1.5 rounded-xl">
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

                  {/* 🔥 ប្រអប់សរសេរមូលហេតុ (បង្ហាញស្វ័យប្រវត្តិតែពេលជ្រើសរើស អវត្តមាន យឺត ឬ ច្បាប់) */}
                  <AnimatePresence>
                    {st.status !== "Present" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-2 border-t border-slate-100 space-y-1 overflow-hidden"
                      >
                        <label className="block text-[11px] font-extrabold text-slate-600 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            មូលហេតុ ({st.status === "Absent" || st.status === "Absent_No_Permission" ? "អវត្តមាន" : st.status === "Late" ? "មកយឺត" : "សុំច្បាប់"}) ៖
                          </span>
                        </label>
                        <input
                          type="text"
                          placeholder="បញ្ចូលមូលហេតុ (ឧ. ឈឺ, ស្ទះផ្លូវ, មានធុរៈ...)"
                          value={st.absenceNote || ""}
                          onChange={(e) => {
                            const newNote = e.target.value;
                            // កែប្រែ State ក្នុងម៉ាស៊ីនភ្លាមៗ
                            setAttendance(prev => {
                              const recordId = `${st.id}-${selectedDate}-${shift}`;
                              const exists = prev.some(r => r.id === recordId);
                              if (exists) {
                                return prev.map(r => r.id === recordId ? { ...r, absenceNote: newNote } : r);
                              } else {
                                return [...prev, {
                                  id: recordId,
                                  studentId: st.id,
                                  date: selectedDate,
                                  shift,
                                  status: st.status,
                                  absenceNote: newNote
                                }];
                              }
                            });
                          }}
                          onBlur={(e) => updateAbsenceNote(st.id, e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600 font-semibold text-slate-800 transition-all"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              ))}
            </div>

          </div>
        )}

        {/* ================= TAB 2: បញ្ជីឈ្មោះសិស្ស ================= */}
        {activeTab === "admin" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">បញ្ជីឈ្មោះសិស្សសរុប ({students.length} នាក់)</h3>
                <p className="text-xs text-slate-500 mt-0.5">គ្រប់គ្រង បន្ថែម ឬកែប្រែព័ត៌មានលម្អិតរបស់សិស្ស</p>
              </div>

              <button
                onClick={() => {
                  setEditingStudentId(null);
                  setStudentForm(emptyStudentForm);
                  setShowStudentModal(true);
                }}
                className="px-4 py-2.5 bg-[#0f2b5c] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>+ បញ្ចូលសិស្សថ្មី</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {students.map((st, i) => (
                <div key={st.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {i + 1}. {st.name}
                      </h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${st.gender === "ស្រី" || st.gender === "Female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
                        {st.gender}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 text-xs text-slate-500 font-sans">
                      <p className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-slate-700">{st.phoneNumber || "-"}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-mono text-blue-600 font-bold">{st.telegram || "-"}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        <span>{st.schoolName || "-"}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] italic text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{[st.village, st.commune, st.district, st.province].filter(Boolean).join(" ") || st.address || "-"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-200/60 justify-end">
                    <button
                      onClick={() => handleEditInit(st)}
                      className="px-2.5 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>កែប្រែ</span>
                    </button>
                    <button
                      onClick={() => handleDeleteStudent(st.id, st.name)}
                      className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>លុប</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* MODAL បំពេញព័ត៌មានសិស្ស */}
        <AnimatePresence>
          {showStudentModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-8 space-y-4"
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-600" />
                    <span>{editingStudentId ? "កែប្រែព័ត៌មានសិស្ស" : "បញ្ចូលព័ត៌មានសិស្សថ្មី"}</span>
                  </h3>
                  <button onClick={() => setShowStudentModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-600 mb-1">ឈ្មោះសិស្ស *</label>
                      <input
                        type="text"
                        required
                        placeholder="ឧ. ធឿន ផានិត"
                        value={studentForm.name}
                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 mb-1">ភេទ</label>
                      <select
                        value={studentForm.gender}
                        onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as "ប្រុស" | "ស្រី" })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600 font-semibold"
                      >
                        <option value="ប្រុស">ប្រុស</option>
                        <option value="ស្រី">ស្រី</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ *</label>
                      <input
                        type="text"
                        required
                        placeholder="0961122334"
                        value={studentForm.phoneNumber}
                        onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 mb-1">Telegram (Username)</label>
                      <input
                        type="text"
                        placeholder="@phanitkrn"
                        value={studentForm.telegram}
                        onChange={(e) => setStudentForm({ ...studentForm, telegram: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 mb-1">ថ្ងៃខែឆ្នាំកំណើត</label>
                      <input
                        type="date"
                        value={studentForm.dob}
                        onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-600 mb-1">ឈ្មោះសាលារៀន</label>
                      <input
                        type="text"
                        placeholder="វិទ្យាល័យកំពង់ចាម"
                        value={studentForm.schoolName}
                        onChange={(e) => setStudentForm({ ...studentForm, schoolName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-2">
                    <label className="block font-bold text-slate-700">អាសយដ្ឋានរស់នៅ</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="ភូមិ"
                        value={studentForm.village}
                        onChange={(e) => setStudentForm({ ...studentForm, village: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="ឃុំ / សង្កាត់"
                        value={studentForm.commune}
                        onChange={(e) => setStudentForm({ ...studentForm, commune: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="ស្រុក / ក្រុង"
                        value={studentForm.district}
                        onChange={(e) => setStudentForm({ ...studentForm, district: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                      <input
                        type="text"
                        placeholder="ខេត្ត"
                        value={studentForm.province}
                        onChange={(e) => setStudentForm({ ...studentForm, province: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowStudentModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                    >
                      បោះបង់
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0f2b5c] hover:bg-blue-900 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs"
                    >
                      <Save className="w-4 h-4" />
                      <span>រក្សាទុក</span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= TAB 3: QR CODE GENERATOR ================= */}
        {activeTab === "qr" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs text-center space-y-4 max-w-md mx-auto">
            <h3 className="text-base font-extrabold text-slate-900">កូដ QR សម្រាប់ស្កេនវត្តមាន</h3>
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64 mx-auto rounded-xl border border-slate-200 p-2" />
            ) : null}
            <p className="text-xs text-slate-500">ស្កេនកូដនេះដើម្បីចុះឈ្មោះវត្តមានប្រចាំថ្ងៃ ({shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល"})</p>
          </div>
        )}

        {/* ================= TAB 4: REPORTS (មានបង្ហាញមូលហេតុ) ================= */}
        {activeTab === "sheets" && (
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-2xs space-y-4 overflow-x-auto">
            <h3 className="text-base font-extrabold text-slate-900">របាយការណ៍សរុបវត្តមាន ({selectedDate} - {shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល"})</h3>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b text-slate-600 font-bold">
                  <th className="p-2">ល.រ</th>
                  <th className="p-2">ឈ្មោះ</th>
                  <th className="p-2">ភេទ</th>
                  <th className="p-2">លេខទូរស័ព្ទ</th>
                  <th className="p-2">ស្ថានភាព</th>
                  <th className="p-2">មូលហេតុ</th>
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
                        {st.status === "Present" ? "វត្តមាន" : st.status === "Late" ? "យឺត" : st.status === "Permission" ? "ច្បាប់" : "អវត្តមាន"}
                      </span>
                    </td>
                    <td className="p-2 text-slate-600 italic">
                      {st.absenceNote || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* FOOTER */}
      <footer className="mt-12 py-6 bg-white border-t border-slate-200/80 text-center text-slate-500 text-xs font-sans">
        <p className="font-bold text-slate-700 uppercase tracking-wider mb-1">
          មជ្ឈមណ្ឌលគរុកោសល្យភូមិភាគខេត្តកំពង់ចាម - RTTC Kampong Cham
        </p>
        <p className="text-slate-400 text-[11px]">
          Copyright © 2026. Classroom Attendance & Geofenced System.
        </p>
      </footer>

    </div>
  );
}
