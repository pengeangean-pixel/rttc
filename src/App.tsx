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
  FileText,
  User,
  UserCheck,
  Shield,
  Heart,
  RefreshCw,
  Lock,
  Download,
  Camera,
  Key,
  QrCode,
  GraduationCap,
  Sparkles
} from "lucide-react";
import { Student, AttendanceRecord, AttendanceStatus, AttendanceShift, UserProfile } from "./types";
import QRCode from "qrcode";

// ព័ត៌មានគណនីដើម
const initialProfile: UserProfile = {
  name: "អ៊ាន ប៉េងអ៊ាង",
  role: "គ្រូបង្រៀន",
  username: "eanpengeang",
  gender: "ប្រុស",
  dob: "1997-10-08",
  phone: "0886722609",
  nationality: "ខ្មែរ | ខ្មែរ",
  pob: "ផ្ទះ១, ទួលព្រះឃ្លាំង, ស្ទឹងត្រង់, ខេត្តកំពង់ចាម",
  currentAddress: "មជ្ឈមណ្ឌលគរុកោសល្យភូមិភាគខេត្តកំពង់ចាម",
  schoolName: "មជ្ឈមណ្ឌលគរុកោសល្យភូមិភាគខេត្តកំពង់ចាម",
  schoolCode: "25101401064",
  gradeClass: "ថ្នាក់ទី ៣គ (គ)",
  profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
};

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
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-left text-sm font-semibold text-slate-800 shadow-xs hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                        ? "bg-[#0f2b5c] text-white shadow-xs"
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
  const [activeTab, setActiveTab] = useState<"home" | "account" | "students" | "reports">("home");

  // Core States
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalISODate(new Date()));
  const [shift, setShift] = useState<AttendanceShift>("morning");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Edit Teacher Profile Modal State
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<UserProfile>(initialProfile);

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
    schoolName: userProfile.schoolName,
    address: "",
    village: "",
    commune: "",
    district: "",
    province: ""
  };
  const [studentForm, setStudentForm] = useState<Omit<Student, "id">>(emptyStudentForm);

  // Auth State & QR
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => setFirebaseUser(user));
    return () => unsub();
  }, []);

  // Generate Profile QR Code
  useEffect(() => {
    const generateUserQR = async () => {
      try {
        const qrText = `TEACHER_ID:${userProfile.phone}_CODE:${userProfile.schoolCode}`;
        const url = await QRCode.toDataURL(qrText, { width: 200, margin: 1 });
        setQrCodeDataUrl(url);
      } catch (err) {
        console.error(err);
      }
    };
    generateUserQR();
  }, [userProfile]);

  // Sync គរុនិស្សិតពី Firestore
  useEffect(() => {
    const qStudents = query(collection(db, "students"));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      const list: Student[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Student));
      if (list.length > 0) {
        setStudents(list);
      }
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

  // ⚡ បង្កើត ២១២ នាក់ស្វ័យប្រវត្តិ
  const handleGenerate212Students = async () => {
    if (!window.confirm("តើអ្នកពិតជាចង់បង្កើតបញ្ជីឈ្មោះគរុនិស្សិតចំនួន ២១២ នាក់ចូលក្នុងប្រព័ន្ធមែនទេ?")) return;
    
    const khmerFirstNames = ["សុខ", "លី", "ធឿន", "ចិត្រា", "កែវ", "ហេង", "មុន្នី", "ចាន់", "រតនៈ", "វ៉ាន់", "សុភក្ត្រ", "គឹម", "អ៊ាន", "ផានិត", "ម៉េង", "សិលា"];
    const khmerLastNames = ["ផានិត", "វ៉ារិន", "ទី", "រ៉ា", "ដារ៉ា", "វឌ្ឍនៈ", "ពិសិដ្ឋ", "សម្បត្តិ", "វិបុល", "ចិន្តា", "សុខា", "ស្រីណុច", "បូរ៉ា", "ម៉ានិត", "នាថ"];
    
    const generatedList: Student[] = [];
    for (let i = 1; i <= 212; i++) {
      const fName = khmerFirstNames[i % khmerFirstNames.length];
      const lName = khmerLastNames[(i * 3) % khmerLastNames.length];
      const gender = i % 3 === 0 ? "ស្រី" : "ប្រុស";
      
      generatedList.push({
        id: `rttc-${String(i).padStart(3, "0")}`,
        name: `${fName} ${lName}`,
        gender: gender as "ប្រុស" | "ស្រី",
        dob: "2004-05-10",
        phoneNumber: `096${String(1000000 + i).slice(0, 7)}`,
        telegram: `trainee_${i}`,
        schoolName: userProfile.schoolName,
        address: "ខេត្តកំពង់ចាម",
        village: "ភូមិវាល",
        commune: "ឃុំព្រៃឈរ",
        district: "ស្រុកព្រៃឈរ",
        province: "ខេត្តកំពង់ចាម"
      });
    }

    try {
      const batch = writeBatch(db);
      generatedList.forEach(st => {
        batch.set(doc(db, "students", st.id), removeUndefinedFields(st));
      });
      await batch.commit();
      setStudents(generatedList);
      triggerToast("បានបង្កើតគរុនិស្សិតចំនួន ២១២ នាក់ចូលក្នុង Firestore ជោគជ័យ!");
    } catch (err) {
      console.error(err);
      setStudents(generatedList);
      triggerToast("បានបង្កើតគរុនិស្សិតចំនួន ២១២ នាក់ក្នុងប្រព័ន្ធ!");
    }
  };

  // Upload រូប Profile មិនលើស 2MB
  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerToast("⚠️ រូបភាពមិនអាចលើសពី 2MB បានទេ!");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUserProfile(prev => ({ ...prev, profilePhoto: result }));
      triggerToast("បានផ្លាស់ប្តូររូបភាព Profile រក្សាទុកជោគជ័យ!");
    };
    reader.readAsDataURL(file);
  };

  // រក្សាទុកវត្តមាន
  const updateAttendanceStatus = async (studentId: string, newStatus: AttendanceStatus) => {
    const recordId = `${studentId}-${selectedDate}-${shift}`;
    const now = new Date();
    const formattedTime = `${padDateNumber(now.getHours())}:${padDateNumber(now.getMinutes())}`;

    const existingRec = attendance.find(r => r.id === recordId);

    const newRecord: AttendanceRecord = {
      id: recordId,
      studentId,
      date: selectedDate,
      shift,
      status: newStatus,
      checkInTime: (newStatus === "Present" || newStatus === "Late") ? formattedTime : "",
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

  // រក្សាទុកមូលហេតុ
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

  // រក្សាទុកសិស្ស
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
      schoolName: st.schoolName || userProfile.schoolName,
      address: st.address || "",
      village: st.village || "",
      commune: st.commune || "",
      district: st.district || "",
      province: st.province || ""
    });
    setShowStudentModal(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(editProfileForm);
    setShowProfileEditModal(false);
    triggerToast("បានរក្សាទុកការកែប្រែព័ត៌មានគណនី!");
  };

  const handleDownloadReport = () => {
    const BOM = "\uFEFF";
    const headers = ["ល.រ", "ឈ្មោះសិស្ស", "ភេទ", "ថ្ងៃខែឆ្នាំកំណើត", "លេខទូរស័ព្ទ", "Telegram", "ស្ថានភាពវត្តមាន", "មូលហេតុ", "កាលបរិច្ឆេទ", "វេន"];
    
    const rows = dailyList.map((st, idx) => [
      idx + 1,
      `"${st.name}"`,
      st.gender,
      st.dob,
      `"${st.phoneNumber}"`,
      `"${st.telegram}"`,
      st.status === "Present" ? "វត្តមាន" : st.status === "Late" ? "យឺត" : st.status === "Permission" ? "ច្បាប់" : "អវត្តមាន",
      `"${st.absenceNote || "-"}"`,
      selectedDate,
      shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល"
    ]);

    const csvContent = BOM + [headers.join(","), ...rows.map(e => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_Report_${selectedDate}_${shift}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast("បានទាញយករបាយការណ៍ជោគជ័យ!");
  };

  const dailyList = getDailyList();
  const filteredList = dailyList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.phoneNumber.includes(searchQuery) ||
    s.telegram.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCount = students.length;
  const presentCount = dailyList.filter(s => s.status === "Present").length;
  const absentCount = dailyList.filter(s => s.status === "Absent" || s.status === "Absent_No_Permission").length;
  const lateCount = dailyList.filter(s => s.status === "Late").length;
  const permissionCount = dailyList.filter(s => s.status === "Permission" || s.status === "Absent_Permission").length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between">
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleProfilePhotoUpload}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />

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

      <div className="max-w-7xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
        
        {/* 🔝 TOP NAVIGATION BAR */}
        <header className="bg-white rounded-2xl p-2 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <nav className="flex space-x-1.5 w-full sm:w-auto overflow-x-auto">
            
            {/* 🎓 1. HOME TAB */}
            <button
              onClick={() => setActiveTab("home")}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
                activeTab === "home" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span>ទំព័រដើម</span>
            </button>

            {/* 👤 2. ACCOUNT TAB */}
            <button
              onClick={() => setActiveTab("account")}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
                activeTab === "account" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <User className="w-4 h-4" />
              <span>គណនីខ្ញុំ</span>
            </button>

            {/* 👨‍🎓 3. STUDENTS TAB */}
            <button
              onClick={() => setActiveTab("students")}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
                activeTab === "students" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>គ្រប់គ្រងសិស្ស</span>
            </button>

            {/* 📊 4. REPORTS TAB */}
            <button
              onClick={() => setActiveTab("reports")}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-xs sm:text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 ${
                activeTab === "reports" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>របាយការណ៍</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setLang(lang === "km" ? "en" : "km")}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              {lang === "km" ? "English" : "ភាសាខ្មែរ"}
            </button>

            {firebaseUser && (
              <button
                onClick={() => signOut(auth)}
                className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>ចាកចេញ</span>
              </button>
            )}
          </div>
        </header>

        {/* ================= 🎓 1. HOME TAB ================= */}
        {activeTab === "home" && (
          <div className="space-y-6">
            
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-[#0f2b5c] via-blue-900 to-slate-900 text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-2 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold text-amber-300 backdrop-blur-xs">
                  <GraduationCap className="w-4 h-4" />
                  <span>ប្រព័ន្ធគ្រប់គ្រងសាលារៀន និងវត្តមានសិស្ស</span>
                </div>
                <h2 className="text-xl md:text-2xl font-black">{userProfile.schoolName}</h2>
                <p className="text-xs text-blue-200">
                  លោកគ្រូ៖ <strong>{userProfile.name}</strong> • ទទួលបន្ទុក៖ <strong>{userProfile.gradeClass}</strong>
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleGenerate212Students}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg transition-all shrink-0 flex items-center gap-1.5"
                  title="បង្កើតបញ្ជីឈ្មោះគរុនិស្សិត ២១២ នាក់ស្វ័យប្រវត្តិ"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ បង្កើត ២១២ នាក់</span>
                </button>
              </div>
            </div>

            {/* Dashboard វត្តមានសិស្ស */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0f2b5c]">
                  <CheckCircle className="w-5 h-5 text-[#0f2b5c]" />
                  <h2 className="text-lg font-extrabold tracking-tight">វត្តមានសិស្ស (បង្ហាញ {filteredList.length} / {totalCount} នាក់)</h2>
                </div>
                <span className="text-xs bg-blue-50 text-blue-800 font-bold px-3 py-1 rounded-full border border-blue-200">
                  {shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល"}
                </span>
              </div>

              {/* ជ្រើសរើសកាលបរិច្ឆេទ និង វេន */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 md:grid-cols-2 gap-4">
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

              {/* ស្វែងរកសិស្ស (គ្មានកំហុសរលត់ Cursor ទៀតទេ) */}
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="ស្វែងរកឈ្មោះ, លេខទូរស័ព្ទ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              {/* កាតសិស្ស */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[750px] overflow-y-auto pr-1">
                {filteredList.map((st, i) => (
                  <div
                    key={st.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
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

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditInit(st)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="កែប្រែ"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="លុប"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 pt-3 mt-3 border-t border-slate-100 bg-[#f8fafc] p-1.5 rounded-xl">
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

                      {/* ប្រអប់សរសេរមូលហេតុ */}
                      <AnimatePresence>
                        {st.status !== "Present" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-2 border-t border-slate-100 space-y-1 overflow-hidden mt-2"
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
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ================= 👤 2. ACCOUNT TAB ================= */}
        {activeTab === "account" && (
          <div className="space-y-6">
            
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <h2 className="text-lg font-black text-[#0f2b5c] flex items-center gap-2">
                <User className="w-5 h-5 text-[#0f2b5c]" />
                <span>គណនីរបស់ខ្ញុំ</span>
              </h2>

              <button
                onClick={() => {
                  setEditProfileForm(userProfile);
                  setShowProfileEditModal(true);
                }}
                className="px-4 py-2 bg-[#0f2b5c] hover:bg-blue-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>កែប្រែព័ត៌មាន</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs text-center space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  
                  <div className="relative w-36 h-36 mx-auto">
                    <img
                      src={userProfile.profilePhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"}
                      alt={userProfile.name}
                      className="w-full h-full object-cover rounded-full border-4 border-slate-100 shadow-md mx-auto"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-1 right-1 p-2.5 bg-[#0f2b5c] text-white border-2 border-white rounded-full shadow-md hover:bg-blue-900 transition-all"
                      title="ប្ដូររូបភាព (មិនលើស 2MB)"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center justify-center gap-2">
                      <span>{userProfile.name}</span>
                    </h3>
                    
                    <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-extrabold">
                      <span>👨‍🏫 {userProfile.role}</span>
                    </div>

                    <p className="text-xs text-slate-400 font-mono mt-1">{userProfile.username}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-xs font-semibold text-slate-500 flex justify-center gap-4">
                    <span>♂ {userProfile.gender}</span>
                    <span>•</span>
                    <span>📅 {userProfile.dob}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <span className="text-xs font-extrabold text-slate-600 flex items-center justify-center gap-1">
                    <QrCode className="w-4 h-4 text-slate-500" />
                    <span>កូដសម្គាល់ (QR Code)</span>
                  </span>

                  {qrCodeDataUrl && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-inner">
                      <img src={qrCodeDataUrl} alt="User QR" className="w-32 h-32 mx-auto" />
                    </div>
                  )}

                  <div>
                    <a
                      href={qrCodeDataUrl}
                      download={`QR_${userProfile.name}.png`}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>រក្សាទុក QR</span>
                    </a>
                  </div>
                </div>

              </div>

              <div className="lg:col-span-8 space-y-6">
                
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b pb-3">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <span>ព័ត៌មានទំនាក់ទំនង</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-slate-400 block text-[11px]">លេខទូរស័ព្ទ</span>
                      <strong className="text-slate-900 font-mono text-sm block">{userProfile.phone}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                      <span className="text-slate-400 block text-[11px]">សញ្ជាតិ | អម្បូរ</span>
                      <strong className="text-slate-900 block">{userProfile.nationality}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">ទីកន្លែងកំណើត</span>
                      <strong className="text-slate-800 block leading-relaxed">{userProfile.pob}</strong>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 sm:col-span-2">
                      <span className="text-slate-400 block text-[11px]">អាសយដ្ឋានបច្ចុប្បន្ន</span>
                      <strong className="text-slate-800 block leading-relaxed">{userProfile.currentAddress}</strong>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b pb-3">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span>ព័ត៌មានគ្រូបង្រៀន</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl mt-0.5">
                        <Building className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold block">គ្រឹះស្ថានសិក្សា</span>
                        <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{userProfile.schoolName}</h4>
                        <div className="flex gap-2 mt-1.5 text-[10px] text-slate-500 font-mono">
                          <span className="px-2 py-0.5 bg-white border rounded">កូដ: {userProfile.schoolCode}</span>
                          <span className="px-2 py-0.5 bg-white border rounded">ខេត្តកំពង់ចាម</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                      <div className="p-2 bg-blue-100 text-blue-800 rounded-xl mt-0.5">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold block">ព័ត៌មានថ្នាក់សិក្សា</span>
                        <div className="mt-1">
                          <span className="px-3 py-1 bg-[#0f2b5c] text-white rounded-lg text-xs font-black">
                            {userProfile.gradeClass}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span>សុវត្ថិភាពគណនី</span>
                    </span>
                    <p className="text-[10px] text-slate-400 leading-snug">ផ្លាស់ប្តូរលេខសម្ងាត់ជាទៀងទាត់</p>
                    <button className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center justify-center gap-1">
                      <Key className="w-3.5 h-3.5 text-slate-500" />
                      <span>ប្ដូរលេខសម្ងាត់</span>
                    </button>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                      <Heart className="w-4 h-4 text-pink-600" />
                      <span>សុខភាព និងតម្រូវការ</span>
                    </span>
                    <p className="text-[10px] text-slate-400 italic">មិនមានព័ត៌មានសុខភាព</p>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                      <RefreshCw className="w-4 h-4 text-emerald-600" />
                      <span>ធ្វើបច្ចុប្បន្នភាព</span>
                    </span>
                    <button className="w-full py-2 bg-[#0f2b5c] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs mt-2">
                      ធ្វើបច្ចុប្បន្នភាពឥឡូវ
                    </button>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ================= 👨‍🎓 3. TAB: គ្រប់គ្រងសិស្ស ================= */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">បញ្ជីឈ្មោះគរុនិស្សិតសរុប ({students.length} នាក់)</h3>
                <p className="text-xs text-slate-500 mt-0.5">គ្រប់គ្រង បន្ថែម ឬកែប្រែព័ត៌មានលម្អិតរបស់គរុនិស្សិត</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleGenerate212Students}
                  className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>⚡ បង្កើត ២១២ នាក់</span>
                </button>

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
            </div>

            {/* បង្ហាញវត្តមានសិស្ស */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#0f2b5c]">
                  <CheckCircle className="w-5 h-5 text-[#0f2b5c]" />
                  <h2 className="text-lg font-extrabold tracking-tight">វត្តមានសិស្ស (បង្ហាញ {filteredList.length} / {totalCount} នាក់)</h2>
                </div>
                <span className="text-xs bg-blue-50 text-blue-800 font-bold px-3 py-1 rounded-full border border-blue-200">
                  {shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល"}
                </span>
              </div>

              {/* ជ្រើសរើសកាលបរិច្ឆេទ និង វេន */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  placeholder="ស្វែងរកឈ្មោះ, លេខទូរស័ព្ទ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-blue-600 font-semibold"
                />
              </div>

              {/* កាតសិស្ស */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[750px] overflow-y-auto pr-1">
                {filteredList.map((st, i) => (
                  <div
                    key={st.id}
                    className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-3 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
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

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditInit(st)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="កែប្រែ"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="លុប"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 pt-3 mt-3 border-t border-slate-100 bg-[#f8fafc] p-1.5 rounded-xl">
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

                      {/* ប្រអប់សរសេរមូលហេតុ */}
                      <AnimatePresence>
                        {st.status !== "Present" && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="pt-2 border-t border-slate-100 space-y-1 overflow-hidden mt-2"
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= 📊 4. TAB: របាយការណ៍ (REPORTS) ================= */}
        {activeTab === "reports" && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>របាយការណ៍សរុបវត្តមាន ({selectedDate} - {shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល"})</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">ពិនិត្យ និងទាញយករបាយការណ៍វត្តមានជាឯកសារ Excel/CSV</p>
              </div>

              <button
                onClick={handleDownloadReport}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>ទាញយករាយការណ៍ (CSV)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ជ្រើសរើសថ្ងៃ</label>
                <PremiumDatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
                  lang={lang}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">ជ្រើសរើសវេន</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as AttendanceShift)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="morning">វេនព្រឹក (07:30–11:00)</option>
                  <option value="afternoon">វេនរសៀល (13:00–17:00)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl max-h-[600px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-100 border-b text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">ល.រ</th>
                    <th className="p-3">ឈ្មោះសិស្ស</th>
                    <th className="p-3">ភេទ</th>
                    <th className="p-3">លេខទូរស័ព្ទ</th>
                    <th className="p-3">ស្ថានភាព</th>
                    <th className="p-3">មូលហេតុ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {dailyList.map((st, i) => (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-400">{i + 1}</td>
                      <td className="p-3 font-bold text-slate-900">{st.name}</td>
                      <td className="p-3 text-slate-600">{st.gender}</td>
                      <td className="p-3 font-mono text-slate-600">{st.phoneNumber}</td>
                      <td className="p-3 font-bold">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] ${
                          st.status === "Present" ? "bg-emerald-100 text-emerald-800" :
                          st.status === "Late" ? "bg-amber-100 text-amber-800" :
                          st.status === "Permission" ? "bg-blue-100 text-blue-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {st.status === "Present" ? "វត្តមាន" : st.status === "Late" ? "យឺត" : st.status === "Permission" ? "ច្បាប់" : "អវត្តមាន"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 italic font-semibold">
                        {st.absenceNote || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

      </div>

      {/* MODAL កែប្រែព័ត៌មានគណនីគ្រូ (EDIT TEACHER PROFILE MODAL) */}
      <AnimatePresence>
        {showProfileEditModal && (
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
                  <Edit className="w-5 h-5 text-blue-600" />
                  <span>កែប្រែព័ត៌មានគណនីគ្រូ</span>
                </h3>
                <button onClick={() => setShowProfileEditModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">គោត្តនាម-នាម</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.name}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">តួនាទី</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.role}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, role: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">លេខទូរស័ព្ទ</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.phone}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">ឈ្មោះសាលារៀន</label>
                    <input
                      type="text"
                      required
                      value={editProfileForm.schoolName}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, schoolName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">កូដសាលា</label>
                    <input
                      type="text"
                      value={editProfileForm.schoolCode}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, schoolCode: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-600 mb-1">ថ្នាក់សិក្សា</label>
                    <input
                      type="text"
                      value={editProfileForm.gradeClass}
                      onChange={(e) => setEditProfileForm({ ...editProfileForm, gradeClass: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-600 font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">ទីកន្លែងកំណើត</label>
                  <input
                    type="text"
                    value={editProfileForm.pob}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, pob: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">អាសយដ្ឋានបច្ចុប្បន្ន</label>
                  <input
                    type="text"
                    value={editProfileForm.currentAddress}
                    onChange={(e) => setEditProfileForm({ ...editProfileForm, currentAddress: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowProfileEditModal(false)}
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

      {/* MODAL បំពេញព័ត៌មានសិស្ស (ADD / EDIT STUDENT MODAL) */}
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
                      placeholder="មជ្ឈមណ្ឌលគរុកោសល្យភូមិភាគខេត្តកំពង់ចាម"
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

      {/* FOOTER */}
      <footer className="mt-12 py-6 bg-white border-t border-slate-200/80 text-center text-slate-500 text-xs font-sans">
        <p className="font-bold text-slate-700 uppercase tracking-wider mb-1">
          {userProfile.schoolName} - {userProfile.gradeClass}
        </p>
        <p className="text-slate-400 text-[11px]">
          Copyright © 2026. Student Attendance & Management System.
        </p>
      </footer>

    </div>
  );
}
