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
  signInWithEmailAndPassword,
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
  FileSpreadsheet,
  Upload,
  CheckSquare,
  Square,
  LogIn,
  Sparkles,
  Award
} from "lucide-react";
import { Student, AttendanceRecord, AttendanceStatus, AttendanceShift, UserProfile, CurrentUser } from "./types";
import QRCode from "qrcode";

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
  gradeClass: " ",
  profilePhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
};

const defaultStudentsList: Student[] = [
  {
    id: "s-101",
    name: "ធឿន ផានិត",
    gender: "ប្រុស",
    dob: "2004-10-14",
    profilePhoto: "",
    schoolName: "សាលាបឋមសិក្សាហ៊ុនសែនក្តុលផ្សារ",
    phoneNumber: "0961122334",
    telegram: "phanitkrn",
    address: "ក្តុលផ្សារ, ទន្លូង, មេមត់",
    village: "ក្តុលផ្សារ",
    commune: "ទន្លូង",
    district: "មេមត់",
    province: "ខេត្តត្បូងឃ្មុំ"
  },
  {
    id: "s-102",
    name: "ចិត្រា វ៉ារិន",
    gender: "ប្រុស",
    dob: "2003-05-18",
    profilePhoto: "",
    schoolName: "សាលាបឋមសិក្សាហ៊ុនសែនក្តុលផ្សារ",
    phoneNumber: "0968877661",
    telegram: "varinchitra",
    address: "ក្តុលផ្សារ, ទន្លូង, មេមត់",
    village: "ក្តុលផ្សារ",
    commune: "ទន្លូង",
    district: "មេមត់",
    province: "ខេត្តត្បូងឃ្មុំ"
  },
  {
    id: "s-103",
    name: "ធឿន ទី",
    gender: "ប្រុស",
    dob: "2004-08-05",
    profilePhoto: "",
    schoolName: "សាលាបឋមសិក្សាហ៊ុនសែនក្តុលផ្សារ",
    phoneNumber: "0889988772",
    telegram: "tichn",
    address: "ក្តុលផ្សារ, ទន្លូង, មេមត់",
    village: "ក្តុលផ្សារ",
    commune: "ទន្លូង",
    district: "មេមត់",
    province: "ខេត្តត្បូងឃ្មុំ"
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
  
  // 🔥 LOGIN & AUTH ROLES STATE
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loginRoleTab, setLoginRoleTab] = useState<"admin" | "student">("student");
  
  // Inputs Login
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [studentInputQuery, setStudentInputQuery] = useState("");

  const [activeTab, setActiveTab] = useState<"home" | "account" | "students" | "reports">("home");

  // Core States
  const [userProfile, setUserProfile] = useState<UserProfile>(initialProfile);
  const [students, setStudents] = useState<Student[]>(defaultStudentsList);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalISODate(new Date()));
  const [shift, setShift] = useState<AttendanceShift>("morning");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Multi-Select Students State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Modals
  const [showCSVModal, setShowCSVModal] = useState(false);
  const [showProfileEditModal, setShowProfileEditModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState<UserProfile>(initialProfile);

  // Student Form
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

  // Firebase User & QR
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user && user.email === "pengeangean@gmail.com") {
        setCurrentUser({ role: "admin", name: userProfile.name });
      }
    });
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

  // Sync Firestore Data
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

  // 🔥 មុខងារ LOGIN ជា ADMIN
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPass);
      setCurrentUser({ role: "admin", name: userProfile.name });
      triggerToast("ចូលប្រព័ន្ធ Admin ជោគជ័យ!");
    } catch (err) {
      console.error(err);
      // Fallback សម្រាប់ការសាកល្បង
      if (adminEmail === "pengeangean@gmail.com" || adminEmail === "admin") {
        setCurrentUser({ role: "admin", name: userProfile.name });
        triggerToast("ចូលប្រព័ន្ធ Admin ជោគជ័យ!");
      } else {
        triggerToast("⚠️ អ៊ីមែល ឬលេខសម្ងាត់ Admin មិនត្រឹមត្រូវទេ!");
      }
    }
  };

  // 🔥 មុខងារ LOGIN ជា សិស្ស (STUDENT)
  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = studentInputQuery.trim().toLowerCase();
    if (!queryStr) {
      triggerToast("សូមវាយបញ្ចូលលេខទូរស័ព្ទ ឬ Telegram!");
      return;
    }

    // ស្វែងរកសិស្សក្នុងបញ្ជី
    const matched = students.find(s => 
      s.phoneNumber.includes(queryStr) || 
      s.telegram.toLowerCase().includes(queryStr) ||
      s.name.toLowerCase().includes(queryStr)
    );

    if (matched) {
      setCurrentUser({
        role: "student",
        studentId: matched.id,
        studentName: matched.name,
        phoneNumber: matched.phoneNumber,
        telegram: matched.telegram
      });
      triggerToast(`ស្វាគមន៍សិស្សឈ្មោះ ${matched.name}!`);
    } else {
      triggerToast("⚠️ រកមិនឃើញឈ្មោះសិស្សឡើយ! សូមពិនិត្យលេខទូរស័ព្ទឡើងវិញ");
    }
  };

  // មុខងារ LOGOUT
  const handleLogoutUser = () => {
    signOut(auth);
    setCurrentUser(null);
    setAdminEmail("");
    setAdminPass("");
    setStudentInputQuery("");
    triggerToast("បានចាកចេញពីប្រព័ន្ធ!");
  };

  // ទាញយកតារាងគំរូ CSV
  const handleDownloadCSVTemplate = () => {
    const BOM = "\uFEFF";
    const headers = ["ID", "ឈ្មោះ", "ភេទ", "ថ្ងៃកំណើត(YYYY-MM-DD)", "លេខទូរស័ព្ទ", "Telegram", "ឈ្មោះសាលារៀន", "ភូមិ", "ឃុំ", "ស្រុក", "ខេត្ត"];
    const samples = [
      ["st-001", "ធឿន ផានិត", "ប្រុស", "2004-10-14", "0961122334", "phanitkrn", "សាលាបឋមសិក្សាហ៊ុនសែនក្តុលផ្សារ", "ក្តុលផ្សារ", "ទន្លូង", "មេមត់", "ខេត្តត្បូងឃ្មុំ"],
      ["st-002", "ចិត្រា វ៉ារិន", "ប្រុស", "2003-05-18", "0968877661", "varinchitra", "សាលាបឋមសិក្សាហ៊ុនសែនក្តុលផ្សារ", "ក្តុលផ្សារ", "ទន្លូង", "មេមត់", "ខេត្តត្បូងឃ្មុំ"],
      ["st-003", "ធឿន ទី", "ប្រុស", "2004-08-05", "0889988772", "tichn", "សាលាបឋមសិក្សាហ៊ុនសែនក្តុលផ្សារ", "ក្តុលផ្សារ", "ទន្លូង", "មេមត់", "ខេត្តត្បូងឃ្មុំ"]
    ];

    const csvContent = BOM + [headers.join(","), ...samples.map(s => s.map(v => `"${v}"`).join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast("បានទាញយកតារាងគំរូ CSV រួចរាល់!");
  };

  // Upload CSV ដើម្បីធ្វើបច្ចុប្បន្នភាពព័ត៌មានសិស្ស (មិនបង្កើតថ្មី និងមិនជាន់ពីលើតម្លៃទទេ)
  const handleCSVImportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
        
        if (lines.length < 2) {
          triggerToast("⚠️ ឯកសារ CSV គ្មានទិន្នន័យត្រឹមត្រូវទេ!");
          return;
        }

        let updatedCount = 0;
        let skippedCount = 0;
        const updatedStudentsList: Student[] = [];
        const batch = writeBatch(db);

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].split(",").map(val => val.trim().replace(/^["']|["']$/g, ""));
          
          // រំលងជួរណាដែលគ្មានឈ្មោះសិស្ស
          if (row.length < 2 || !row[1]) continue;

          const csvId = row[0];
          const csvName = row[1];
          const csvGender = row[2];
          const csvDob = row[3];
          const csvPhone = row[4];
          const csvTelegram = row[5];
          const csvSchool = row[6];
          const csvVillage = row[7];
          const csvCommune = row[8];
          const csvDistrict = row[9];
          const csvProvince = row[10];

          // ១. ស្វែងរកសិស្សដែលមានស្រាប់ក្នុងប្រព័ន្ធ (ស្វែងរកតាម ID ឬ លេខទូរស័ព្ទ)
          const existingStudent = students.find(s => 
            (csvId && s.id === csvId) || 
            (csvPhone && s.phoneNumber === csvPhone)
          );

          // បើរកមិនឃើញសិស្សនេះក្នុងប្រព័ន្ធទេ គឺមិនបញ្ចូលថ្មីឡើយ (Skip)
          if (!existingStudent) {
            skippedCount++;
            continue;
          }

          // ២. បង្កើត Object សម្រាប់ Update (បញ្ចូលតែព័ត៌មានណាដែលមានតម្លៃ មិនទទេ)
          const updatedData: Partial<Student> = { ...existingStudent };

          if (csvName) updatedData.name = csvName;
          if (csvGender) {
            updatedData.gender = (csvGender === "ស្រី" || csvGender.toLowerCase() === "female") ? "ស្រី" : "ប្រុស";
          }
          if (csvDob) updatedData.dob = csvDob;
          if (csvPhone) updatedData.phoneNumber = csvPhone;
          if (csvTelegram) updatedData.telegram = csvTelegram;
          if (csvSchool) updatedData.schoolName = csvSchool;
          if (csvVillage) updatedData.village = csvVillage;
          if (csvCommune) updatedData.commune = csvCommune;
          if (csvDistrict) updatedData.district = csvDistrict;
          if (csvProvince) updatedData.province = csvProvince;

          // បើមានការបញ្ជាក់អាសយដ្ឋានណាមួយ ទើបធ្វើការផ្សំវាចូលគ្នាជា Address ថ្មី
          if (csvVillage || csvCommune || csvDistrict || csvProvince) {
            const v = csvVillage || existingStudent.village || "";
            const c = csvCommune || existingStudent.commune || "";
            const d = csvDistrict || existingStudent.district || "";
            const p = csvProvince || existingStudent.province || "";
            updatedData.address = [v, c, d, p].filter(Boolean).join(", ");
          }

          // រៀបចំទុកសម្រាប់ធ្វើបច្ចុប្បន្នភាពក្នុង Firestore Batch
          batch.set(
            doc(db, "students", existingStudent.id), 
            removeUndefinedFields(updatedData), 
            { merge: true } // ជម្រើស { merge: true } ការពារមិនឱ្យបាត់បង់រូបភាព ProfilePhoto ឬទិន្នន័យផ្សេងទៀត
          );

          updatedStudentsList.push(updatedData as Student);
          updatedCount++;
        }

        if (updatedCount === 0) {
          triggerToast("⚠️ មិនមានទិន្នន័យសិស្សណាមួយត្រូវបានធ្វើបច្ចុប្បន្នភាពឡើយ (រកមិនឃើញសិស្សក្នុងប្រព័ន្ធ)!");
          return;
        }

        // រុញទិន្នន័យទាំងអស់ទៅកាន់ Firestore ក្នុងពេលតែមួយ
        await batch.commit();

        // ធ្វើបច្ចុប្បន្នភាព State នៅក្នុង UI
        setStudents(prev => {
          const merged = [...prev];
          updatedStudentsList.forEach(upSt => {
            const idx = merged.findIndex(s => s.id === upSt.id);
            if (idx >= 0) merged[idx] = upSt;
          });
          return merged;
        });

        setShowCSVModal(false);
        triggerToast(`ជោគជ័យ! បានធ្វើបច្ចុប្បន្នភាពសិស្សចំនួន ${updatedCount} នាក់ (រំលងមិនបញ្ចូលសិស្សថ្មីចំនួន ${skippedCount} នាក់)`);
      } catch (err) {
        console.error("Error updating CSV:", err);
        triggerToast("មានបញ្ហាក្នុងការអាន ឬកត់ត្រាឯកសារ CSV");
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  // Bulk Delete
  const toggleSelectStudent = (id: string) => {
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllStudents = () => {
    if (selectedStudentIds.length === filteredList.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredList.map(s => s.id));
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.length === 0) return;
    if (!window.confirm(`តើអ្នកពិតជាចង់លុបសិស្សចំនួន ${selectedStudentIds.length} នាក់ដែលបានជ្រើសរើសមែនទេ?`)) return;

    try {
      const batch = writeBatch(db);
      selectedStudentIds.forEach(id => {
        batch.delete(doc(db, "students", id));
      });
      await batch.commit();

      setStudents(prev => prev.filter(s => !selectedStudentIds.includes(s.id)));
      setSelectedStudentIds([]);
      triggerToast(`បានលុបសិស្សចំនួន ${selectedStudentIds.length} នាក់ជោគជ័យ!`);
    } catch (err) {
      console.error("Error bulk deleting:", err);
      triggerToast("មានបញ្ហាក្នុងការលុបសិស្ស");
    }
  };

  // Upload Profile Photo
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

  // កត់ត្រាវត្តមាន
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

  // ================= 🚪 SCREEN USER LOGIN VIEW (ប្រសិនបើមិនទាន់ LOG IN) =================
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f2b5c] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6"
        >
          {/* Header Portal */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-[#0f2b5c] text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
              <GraduationCap className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-xl font-black text-[#0f2b5c]">{userProfile.schoolName}</h1>
            <p className="text-xs text-slate-500 font-bold">ប្រព័ន្ធគ្រប់គ្រងសាលារៀន និងវត្តមានសិស្ស</p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setLoginRoleTab("student")}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginRoleTab === "student" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4" />
              <span>សិស្ស (Student)</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginRoleTab("admin")}
              className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                loginRoleTab === "admin" ? "bg-[#0f2b5c] text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>Admin (គ្រូ/គ្រប់គ្រង)</span>
            </button>
          </div>

          {/* Form 1: Student Login */}
          {loginRoleTab === "student" && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-1">
                <span className="font-extrabold block">🎓 ចូលមើលវត្តមានផ្ទាល់ខ្លួន៖</span>
                <p className="text-[11px] text-blue-700">សូមវាយបញ្ចូល លេខទូរស័ព្ទ ឬ Telegram របស់អ្នកដើម្បីចូលមើលប្រវត្តិនៃវត្តមាន។</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">លេខទូរស័ព្ទ ឬ Telegram របស់អ្នក *</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="ឧ. 0961122334 ឬ @phanitkrn"
                    value={studentInputQuery}
                    onChange={(e) => setStudentInputQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0f2b5c] hover:bg-blue-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>ចូលមើលវត្តមានផ្ទាល់ខ្លួន</span>
              </button>
            </form>
          )}

          {/* Form 2: Admin Login */}
          {loginRoleTab === "admin" && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <span className="font-extrabold block">🔑 ច្រកចូលសម្រាប់ Admin ៖</span>
                <p className="text-[11px] text-amber-800">សិទ្ធិគ្រប់គ្រងទិន្នន័យសរុប (កត់ត្រាវត្តមាន, បន្ថែម/លុបសិស្ស, ទាញយក CSV)</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">អ៊ីមែល Admin (Email) *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="pengeangean@gmail.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">លេខសម្ងាត់ (Password) *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#0f2b5c] hover:bg-blue-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4 text-emerald-400" />
                <span>ចូលប្រព័ន្ធ Admin</span>
              </button>
            </form>
          )}

          <div className="text-center text-[10px] text-slate-400 font-sans border-t pt-4">
            Copyright © 2026. Student Attendance & Management System.
          </div>
        </motion.div>
      </div>
    );
  }

  // ================= 🎓 STUDENT PERSONAL PORTAL VIEW (ប្រសិនបើ LOG IN ជា សិស្ស) =================
  if (currentUser.role === "student") {
    const studentHistory = attendance.filter(r => r.studentId === currentUser.studentId);
    
    const stPresent = studentHistory.filter(r => r.status === "Present").length;
    const stLate = studentHistory.filter(r => r.status === "Late").length;
    const stAbsent = studentHistory.filter(r => r.status === "Absent" || r.status === "Absent_No_Permission").length;
    const stPermission = studentHistory.filter(r => r.status === "Permission" || r.status === "Absent_Permission").length;
    const stTotal = studentHistory.length;
    const stRate = stTotal > 0 ? Math.round((stPresent / stTotal) * 100) : 100;

    return (
      <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col justify-between">
        
        {/* Toast */}
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

        <div className="max-w-4xl mx-auto px-4 py-6 w-full flex-1 space-y-6">
          
          {/* Header Student View */}
          <header className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#0f2b5c] text-white font-black flex items-center justify-center text-lg shadow-sm">
                🎓
              </div>
              <div>
                <h1 className="text-base font-black text-[#0f2b5c]">{currentUser.studentName}</h1>
                <p className="text-xs text-slate-400 font-mono">ទូរស័ព្ទ៖ {currentUser.phoneNumber || "-"} • Telegram: {currentUser.telegram || "-"}</p>
              </div>
            </div>

            <button
              onClick={handleLogoutUser}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>ចាកចេញ</span>
            </button>
          </header>

          {/* Student Welcome Card */}
          <div className="bg-gradient-to-r from-[#0f2b5c] to-blue-900 text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">ទំព័របង្ហាញវត្តមានផ្ទាល់ខ្លួន</span>
              <h2 className="text-xl font-black">{userProfile.schoolName}</h2>
              <p className="text-xs text-blue-200">លោកអ្នកកំពុងមើលប្រវត្តិនៃវត្តមានរបស់ខ្លួនឯង</p>
            </div>

            <div className="px-4 py-3 bg-white/10 rounded-2xl border border-white/20 text-center shrink-0">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">ភាគរយវត្តមាន</span>
              <span className="text-2xl font-black text-white">{stRate}%</span>
            </div>
          </div>

          {/* Personal Stats 5 Boxes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs">
              <span className="text-2xl font-black text-emerald-600 block mb-1">{stPresent}</span>
              <span className="text-xs font-bold text-slate-500">វត្តមាន (ថ្ងៃ)</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs">
              <span className="text-2xl font-black text-amber-600 block mb-1">{stLate}</span>
              <span className="text-xs font-bold text-slate-500">យឺត (ថ្ងៃ)</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs">
              <span className="text-2xl font-black text-blue-600 block mb-1">{stPermission}</span>
              <span className="text-xs font-bold text-slate-500">ច្បាប់ (ថ្ងៃ)</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 text-center shadow-2xs">
              <span className="text-2xl font-black text-red-600 block mb-1">{stAbsent}</span>
              <span className="text-xs font-bold text-slate-500">អវត្តមាន (ថ្ងៃ)</span>
            </div>
          </div>

          {/* History Records Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-2xs space-y-4">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>ប្រវត្តិនៃវត្តមានសរុប ({studentHistory.length} លើក)</span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-700 font-bold">
                    <th className="p-3">ល.រ</th>
                    <th className="p-3">កាលបរិច្ឆេទ</th>
                    <th className="p-3">វេន</th>
                    <th className="p-3">ម៉ោងមកដល់</th>
                    <th className="p-3">ស្ថានភាពវត្តមាន</th>
                    <th className="p-3">មូលហេតុ/ចំណាំ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {studentHistory.map((rec, idx) => (
                    <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-slate-900 font-mono">{rec.date}</td>
                      <td className="p-3 text-slate-700 font-semibold">{rec.shift === "morning" ? "វេនព្រឹក" : "វេនរសៀល"}</td>
                      <td className="p-3 font-mono text-slate-500">{rec.checkInTime || "-"}</td>
                      <td className="p-3 font-bold">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] ${
                          rec.status === "Present" ? "bg-emerald-100 text-emerald-800" :
                          rec.status === "Late" ? "bg-amber-100 text-amber-800" :
                          rec.status === "Permission" ? "bg-blue-100 text-blue-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {rec.status === "Present" ? "វត្តមាន" : rec.status === "Late" ? "យឺត" : rec.status === "Permission" ? "ច្បាប់" : "អវត្តមាន"}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 italic font-semibold">
                        {rec.absenceNote || "-"}
                      </td>
                    </tr>
                  ))}

                  {studentHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                        មិនទាន់មានទិន្នន័យវត្តមានកត់ត្រាក្នុងប្រព័ន្ធឡើយ
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
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

  // ================= 🔑 ADMIN FULL MANAGEMENT PORTAL VIEW =================
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

            <button
              onClick={handleLogoutUser}
              className="px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ចាកចេញ</span>
            </button>
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

              <button
                onClick={() => setActiveTab("students")}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs rounded-2xl shadow-lg transition-all shrink-0 flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>គ្រប់គ្រងសិស្សក្នុងថ្នាក់</span>
              </button>
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
                <p className="text-xs text-slate-500 mt-0.5">គ្រប់គ្រង បន្ថែម នាំចូល CSV ឬលុបសិស្សច្រើននាក់</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowCSVModal(true)}
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>នាំចូល CSV</span>
                </button>

                {selectedStudentIds.length > 0 && (
                  <button
                    onClick={handleBulkDeleteStudents}
                    className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 animate-pulse"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>លុបសិស្ស ({selectedStudentIds.length} នាក់)</span>
                  </button>
                )}

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

            <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl text-xs font-bold text-slate-700">
              <button
                onClick={toggleSelectAllStudents}
                className="flex items-center gap-2 text-slate-800 hover:text-blue-900 cursor-pointer"
              >
                {selectedStudentIds.length === filteredList.length && filteredList.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-blue-700" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>ជ្រើសរើសទាំងអស់ ({filteredList.length} នាក់)</span>
              </button>

              {selectedStudentIds.length > 0 && (
                <span className="text-blue-900 font-extrabold">បានជ្រើសរើស៖ {selectedStudentIds.length} នាក់</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[750px] overflow-y-auto pr-1">
              {filteredList.map((st, i) => {
                const isSelected = selectedStudentIds.includes(st.id);
                return (
                  <div
                    key={st.id}
                    className={`bg-white rounded-2xl border p-4 shadow-2xs space-y-3 transition-all flex flex-col justify-between ${
                      isSelected ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/20" : "border-slate-200/90 hover:shadow-md"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleSelectStudent(st.id)}
                            className="text-slate-400 hover:text-blue-600 cursor-pointer shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-blue-700" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-300" />
                            )}
                          </button>

                          <div className="w-8 h-8 rounded-full bg-[#0f2b5c] text-white font-black flex items-center justify-center text-xs shrink-0">
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

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= 📊 4. TAB: របាយការណ៍ ================= */}
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

      {/* MODAL នាំចូល CSV/EXCEL */}
      <AnimatePresence>
        {showCSVModal && (
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
              className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-4"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>នាំចូលសិស្សច្រើននាក់ (CSV Import)</span>
                </h3>
                <button onClick={() => setShowCSVModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="font-extrabold text-slate-800 block">១. ទាញយកតារាងគំរូ CSV ៖</span>
                  <p className="text-slate-500 text-[11px]">ទាញយកតារាងគំរូ រួចបំពេញឈ្មោះសិស្ស ភេទ និងលេខទូរស័ព្ទក្នុង Excel</p>
                  <button
                    onClick={handleDownloadCSVTemplate}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ទាញយកតារាងគំរូ CSV</span>
                  </button>
                </div>

                <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-2 text-center">
                  <span className="font-extrabold text-emerald-900 block text-left">២. ជ្រើសរើសឯកសារ CSV ដែលបានបំពេញរួច ៖</span>
                  
                  <input
                    type="file"
                    ref={csvFileInputRef}
                    accept=".csv"
                    onChange={handleCSVImportUpload}
                    className="hidden"
                  />

                  <button
                    onClick={() => csvFileInputRef.current?.click()}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>ជ្រើសរើសឯកសារ CSV ដើម្បី Upload</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end border-t pt-3">
                <button
                  onClick={() => setShowCSVModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  បិទ
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL កែប្រែព័ត៌មានគណនីគ្រូ */}
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
