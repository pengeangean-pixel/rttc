import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, Users, MapPin, QrCode, CheckCircle, XCircle, HelpCircle, 
  FileSpreadsheet, Search, Plus, Trash2, Edit, Download, UserCheck, 
  Smartphone, Locate, User, UserPlus, Save, Calendar, Compass, 
  TrendingUp, ExternalLink, AlertTriangle, Globe, Settings, X, Check, 
  Briefcase, Phone, Send, LogOut, LogIn, Lock, Unlock, Mail, Key, RefreshCw, ArrowLeft
} from "lucide-react";
import { collection, doc, setDoc, onSnapshot, query, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { Student, AttendanceRecord, GeofenceConfig, AttendanceStatus } from "./types";
import { translations } from "./translations_rttc";
import { initialStudentsList } from "./studentsData";
import QRCode from "qrcode";

export default function App() {
  // Locale state
  const [lang, setLang] = useState<"km" | "en">("km");
  const t = translations[lang];

  // UI Navigation states
  const [activeTab, setActiveTab] = useState<"dashboard" | "admin" | "qr" | "sheets">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Data States
  const [students, setStudents] = useState<Student[]>(initialStudentsList);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);

  // QR & Geofence Configurations
  const [geofence, setGeofence] = useState<GeofenceConfig>({
    latitude: 11.9610, // RTTC Kampong Cham default
    longitude: 105.4616,
    radius: 150,
    isEnabled: true
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  // Admin Security Authentication
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // CRUD & Modals states
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: "", gender: "ប្រុស", dob: "", address: "", phoneNumber: "", telegram: ""
  });

  // Custom Popup Notification Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const triggerPopup = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  // --- Real-Time Attendance Listener ---
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, `attendance_${selectedDate}`));
    
    // ចាប់យកទិន្នន័យលក្ខណៈ Real-Time ដោយមិនបង្កឱ្យ UI Lag
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recordsMap: Record<string, AttendanceRecord> = {};
      snapshot.forEach((doc) => {
        recordsMap[doc.id] = doc.data() as AttendanceRecord;
      });
      setAttendance(recordsMap);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Real-time Sync Error: ", error);
      setLoading(false);
    });

    return () => unsubscribe(); // Cleanup Listener ពេលប្ដូរថ្ងៃខែ
  }, [selectedDate]);

  // --- Generate Dynamic QR Code ---
  useEffect(() => {
    const qrData = JSON.stringify({
      date: selectedDate,
      lat: geofence.latitude,
      lng: geofence.longitude,
      radius: geofence.radius,
      geofenceEnabled: geofence.isEnabled
    });

    QRCode.toDataURL(qrData, { width: 300, margin: 2 })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error("QR Code Generation Error:", err));
  }, [selectedDate, geofence]);

  // --- Quick Status Updates ---
  const handleStatusChange = async (studentId: string, status: AttendanceStatus) => {
    const recordId = `${studentId}_${selectedDate}`;
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    
    const recordData: AttendanceRecord = {
      id: recordId,
      studentId,
      date: selectedDate,
      status,
      checkInTime: status === "Present" ? now : "-",
      verifiedByQR: false
    };

    try {
      await setDoc(doc(db, `attendance_${selectedDate}`, recordId), recordData);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // --- Bulk Reset/Mark Actions ---
  const handleBulkAction = async (status: AttendanceStatus) => {
    triggerPopup(
      status === "Present" ? "វត្តមានទាំងអស់" : "អវត្តមានទាំងអស់",
      `តើអ្នកពិតជាចង់កំណត់ស្ថានភាពនិស្សិតទាំងអស់ទៅជា [${status}] សម្រាប់ថ្ងៃនេះមែនទេ?`,
      async () => {
        setLoading(true);
        const batch = writeBatch(db);
        const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

        students.forEach((student) => {
          const recordId = `${student.id}_${selectedDate}`;
          const ref = doc(db, `attendance_${selectedDate}`, recordId);
          batch.set(ref, {
            id: recordId,
            studentId: student.id,
            date: selectedDate,
            status,
            checkInTime: status === "Present" ? now : "-",
            verifiedByQR: false
          });
        });

        await batch.commit();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setLoading(false);
      }
    );
  };

  // --- Filtered Students List (Search Optimization) ---
  const filteredList = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phoneNumber.includes(searchQuery) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  // --- Analytics Stats Calculations ---
  const stats = useMemo(() => {
    const total = students.length;
    let present = 0, excused = 0, unexcused = 0;

    students.forEach(s => {
      const record = attendance[s.id];
      if (!record) unexcused++; // Default to absent if no record
      else if (record.status === "Present") present++;
      else if (record.status === "Absent_Permission") excused++;
      else unexcused++;
    });

    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, excused, unexcused, rate };
  }, [students, attendance]);

  // --- Admin Login ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "rttc2026") {
      setIsAdmin(true);
      setAuthError("");
    } else {
      setAuthError(t.currentPasswordInvalid || "ឈ្មោះអ្នកប្រើប្រាស់ ឬលេខកូដខុស!");
    }
  };

  // --- Add New Student ---
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name) return;
    const created: Student = {
      id: `s-${Date.now()}`,
      name: newStudent.name,
      gender: newStudent.gender as any,
      dob: newStudent.dob || "",
      address: newStudent.address || "",
      phoneNumber: newStudent.phoneNumber || "",
      telegram: newStudent.telegram || ""
    };
    setStudents(prev => [created, ...prev]);
    setIsAddModalOpen(false);
    setNewStudent({ name: "", gender: "ប្រុស", dob: "", address: "", phoneNumber: "", telegram: "" });
  };

  // --- Delete Student ---
  const handleDeleteStudent = (id: string) => {
    triggerPopup("លុបទិន្នន័យ", "តើអ្នកពិតជាចង់លុបនិស្សិតនេះចេញពីបញ្ជីមែនទេ?", () => {
      setStudents(prev => prev.filter(s => s.id !== id));
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    });
  };

  // --- Export CSV Simulation ---
  const exportToCSV = () => {
    alert("តារាងវត្តមានត្រូវបានទាញយកជាទម្រង់ CSV ដោយជោគជ័យ!");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3.5 sm:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">{t.title}</h1>
            <p className="text-[11px] font-medium text-slate-400 tracking-wide">{t.subtitle} • {t.academicYear}</p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-indigo-500"
          />
          <button 
            onClick={() => setLang(lang === "km" ? "en" : "km")}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition text-xs font-bold flex items-center gap-1"
          >
            <Globe className="w-4 h-4 text-slate-500" />
            <span className="uppercase">{lang}</span>
          </button>
          {isAdmin && (
            <button onClick={() => setIsAdmin(false)} className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-xs font-medium flex items-center gap-1 transition">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="text-slate-400 text-xs font-medium mb-1">{t.totalStudents}</div>
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="text-emerald-500 text-xs font-medium mb-1">{t.presentCount}</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.present}</div>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="text-amber-500 text-xs font-medium mb-1">{t.excusedCount}</div>
            <div className="text-2xl font-bold text-amber-600">{stats.excused}</div>
          </div>
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
            <div className="text-rose-500 text-xs font-medium mb-1">{t.absentCount}</div>
            <div className="text-2xl font-bold text-rose-600">{stats.unexcused}</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 col-span-2 lg:col-span-1 p-4 rounded-2xl text-white shadow-md shadow-indigo-100 flex flex-col justify-between">
            <div className="text-indigo-100 text-xs font-medium">{t.attendanceRate}</div>
            <div className="text-2xl font-extrabold">{stats.rate}%</div>
          </div>
        </div>

        {/* Tab View Switcher */}
        <div className="flex border-b border-slate-200 text-sm font-medium gap-6">
          {(["dashboard", "admin", "qr", "sheets"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 capitalize transition-all relative ${activeTab === tab ? "text-indigo-600 font-bold" : "text-slate-400 hover:text-slate-600"}`}
            >
              {tab === "dashboard" && t.tabDashboard}
              {tab === "admin" && t.tabAdmin}
              {tab === "qr" && t.tabQR}
              {tab === "sheets" && t.tabSheets}
              {activeTab === tab && <motion.div layoutId="activeTabBorder" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>

        {/* --- TAB CONTENT: LIVE DASHBOARD --- */}
        {activeTab === "dashboard" && (
          <div className="space-y-4">
            {/* Control Panel Bar */}
            <div className="bg-white border border-slate-200/80 p-3.5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white focus:border-indigo-500 transition"
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button onClick={() => handleBulkAction("Present")} className="px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
                  <Check className="w-4 h-4" /> {t.statusPresent}ទាំងអស់
                </button>
                <button onClick={() => handleBulkAction("Absent_No_Permission")} className="px-3 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition">
                  <X className="w-4 h-4" /> {t.statusUnexcused}ទាំងអស់
                </button>
                <button onClick={exportToCSV} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Attendance Student Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-slate-400 text-xs font-mono flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
                  កំពុងទាញទិន្នន័យពី Firebase...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">ល.រ</th>
                        <th className="py-3 px-4">{t.searchPlaceholder?.split(" ")[1] || "ឈ្មោះនិស្សិត"}</th>
                        <th className="py-3 px-4 w-20">ភេទ</th>
                        <th className="py-3 px-4 w-32">ម៉ោងមកដល់</th>
                        <th className="py-3 px-4 w-24">វិធីសាស្ត្រ</th>
                        <th className="py-3 px-4 text-center w-64">{t.quickAction}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {filteredList.map((student, index) => {
                        const record = attendance[student.id];
                        const currentStatus = record?.status || "Absent_No_Permission";
                        return (
                          <tr key={student.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4 text-center font-mono text-slate-400">{index + 1}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{student.name}</td>
                            <td className="py-3 px-4 text-slate-500">{student.gender}</td>
                            <td className="py-3 px-4 font-mono text-slate-600">{record?.checkInTime || "-"}</td>
                            <td className="py-3 px-4">
                              {record?.verifiedByQR ? (
                                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 py-0.5 px-1.5 rounded-md">QR SCAN</span>
                              ) : (
                                <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 py-0.5 px-1.5 rounded-md">MANUAL</span>
                              )}
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex gap-1 justify-center">
                                <button 
                                  onClick={() => handleStatusChange(student.id, "Present")}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold transition flex-1 text-center ${currentStatus === "Present" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                >
                                  {t.statusPresent}
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(student.id, "Absent_Permission")}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold transition flex-1 text-center ${currentStatus === "Absent_Permission" ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                >
                                  ច្បាប់
                                </button>
                                <button 
                                  onClick={() => handleStatusChange(student.id, "Absent_No_Permission")}
                                  className={`px-2.5 py-1.5 rounded-xl font-bold transition flex-1 text-center ${currentStatus === "Absent_No_Permission" ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                                >
                                  អត់ច្បាប់
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: ADMIN REGISTRY (PROTECTED) --- */}
        {activeTab === "admin" && !isAdmin && (
          <div className="max-w-md mx-auto bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
            <div className="text-center">
              <Lock className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <h3 className="font-bold text-slate-900">តម្រូវឱ្យមានគណនីរដ្ឋបាល</h3>
              <p className="text-xs text-slate-400">សូមបញ្ចូលគណនីដើម្បីគ្រប់គ្រងបញ្ជីឈ្មោះនិស្សិត</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Username</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="admin" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 border rounded-xl text-xs outline-none focus:border-indigo-500" placeholder="••••••••" />
              </div>
              {authError && <p className="text-xs font-medium text-rose-500">{authError}</p>}
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 hover:bg-indigo-700 transition">ផ្ទៀងផ្ទាត់</button>
            </form>
          </div>
        )}

        {activeTab === "admin" && isAdmin && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-900">គ្រប់គ្រងបញ្ជីឈ្មោះនិស្សិត ({students.length} នាក់)</h3>
              <button onClick={() => setIsAddModalOpen(true)} className="px-3 py-2 bg-indigo-600 text-white font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-indigo-700 transition shadow-sm">
                <UserPlus className="w-4 h-4" /> បន្ថែមនិស្សិតថ្មី
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-semibold">
                    <tr>
                      <th className="py-3 px-4">ឈ្មោះ</th>
                      <th className="py-3 px-4">ភេទ</th>
                      <th className="py-3 px-4">លេខទូរស័ព្ទ</th>
                      <th className="py-3 px-4">អាសយដ្ឋាន</th>
                      <th className="py-3 px-4 text-center w-24">សកម្មភាព</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/30">
                        <td className="py-3 px-4 font-semibold text-slate-900">{student.name}</td>
                        <td className="py-3 px-4">{student.gender}</td>
                        <td className="py-3 px-4 font-mono">{student.phoneNumber || "-"}</td>
                        <td className="py-3 px-4 text-slate-500">{student.address || "-"}</td>
                        <td className="py-2 px-4 text-center">
                          <button onClick={() => handleDeleteStudent(student.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: QR CODE CHECK-IN solution --- */}
        {activeTab === "qr" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center space-y-4 md:col-span-1 flex flex-col justify-center items-center">
              <h4 className="font-bold text-slate-900">{t.qrTitle}</h4>
              <p className="text-xs text-slate-400 max-w-xs">{t.qrInstruct}</p>
              {qrCodeUrl ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
                  <img src={qrCodeUrl} alt="Attendance QR Code" className="w-56 h-56 mx-auto" />
                </div>
              ) : (
                <div className="w-56 h-56 bg-slate-100 flex items-center justify-center rounded-2xl text-slate-400 text-xs font-mono">Loading QR...</div>
              )}
              <div className="text-[11px] bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-mono font-bold tracking-wide">
                កាលបរិច្ឆេទ៖ {selectedDate}
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-slate-500" /> ការកំណត់ទីតាំងភូមិសាស្ត្រ (Geofence Config)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">{t.latitude}</label>
                  <input type="number" step="any" value={geofence.latitude} onChange={e => setGeofence(prev => ({ ...prev, latitude: parseFloat(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono outline-none focus:bg-white" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">{t.longitude}</label>
                  <input type="number" step="any" value={geofence.longitude} onChange={e => setGeofence(prev => ({ ...prev, longitude: parseFloat(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono outline-none focus:bg-white" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">{t.radius}</label>
                  <input type="number" value={geofence.radius} onChange={e => setGeofence(prev => ({ ...prev, radius: parseInt(e.target.value) }))} className="w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono outline-none focus:bg-white" />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t text-xs">
                <span className="text-slate-500 font-medium">បើកដំណើរការត្រួតពិនិត្យទីតាំង GPS (Geofencing)</span>
                <input type="checkbox" checked={geofence.isEnabled} onChange={e => setGeofence(prev => ({ ...prev, isEnabled: e.target.checked }))} className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
              </div>
            </div>
          </div>
        )}

        {/* --- TAB CONTENT: ONLINE SPREADSHEET MODE --- */}
        {activeTab === "sheets" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono">RTTC Kampong Cham Class R01 Grid View Mode</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Real-time Cloud Synced</span>
            </div>
            <div className="border border-slate-200 rounded-xl overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b font-mono font-bold text-slate-400 uppercase">
                  <tr>
                    <th className="p-2 border-r text-center w-12">ID</th>
                    <th className="p-2 border-r min-w-[150px]">Student Name</th>
                    <th className="p-2 border-r text-center w-20">Gender</th>
                    <th className="p-2 border-r text-center w-36">Status</th>
                    <th className="p-2">Checked-In At</th>
                  </tr>
                </thead>
                <tbody className="divide-y font-mono">
                  {students.map((s) => {
                    const r = attendance[s.id];
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="p-2 border-r text-center text-slate-400">{s.id}</td>
                        <td className="p-2 border-r font-sans font-semibold text-slate-800">{s.name}</td>
                        <td className="p-2 border-r text-center text-slate-500">{s.gender}</td>
                        <td className="p-1 border-r text-center">
                          <select 
                            value={r?.status || "Absent_No_Permission"}
                            onChange={(e) => handleStatusChange(s.id, e.target.value as AttendanceStatus)}
                            className={`w-full p-1 border rounded-lg text-[11px] font-bold ${r?.status === "Present" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : r?.status === "Absent_Permission" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-rose-600 bg-rose-50 border-rose-200"}`}
                          >
                            <option value="Present">PRESENT</option>
                            <option value="Absent_Permission">EXCUSED</option>
                            <option value="Absent_No_Permission">ABSENT</option>
                          </select>
                        </td>
                        <td className="p-2 text-slate-500 text-[11px]">{r?.checkInTime || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* --- MODAL DIALOGS AND POPUPS --- */}
      
      {/* 1. Add Student Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border rounded-2xl shadow-xl max-w-md w-full overflow-hidden relative z-10 p-6 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">បញ្ចូលព័ត៌មាននិស្សិតថ្មី</h3>
              <form onSubmit={handleAddStudent} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">ឈ្មោះនិស្សិត</label>
                  <input type="text" required value={newStudent.name} onChange={e => setNewStudent(prev => ({ ...prev, name: e.target.value }))} className="w-full px-3 py-2 border rounded-xl outline-none focus:border-indigo-500" placeholder="បញ្ចូលឈ្មោះ" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">ភេទ</label>
                    <select value={newStudent.gender} onChange={e => setNewStudent(prev => ({ ...prev, gender: e.target.value as any }))} className="w-full px-3 py-2 border rounded-xl outline-none focus:border-indigo-500">
                      <option value="ប្រុស">ប្រុស</option>
                      <option value="ស្រី">ស្រី</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">លេខទូរស័ព្ទ</label>
                    <input type="text" value={newStudent.phoneNumber} onChange={e => setNewStudent(prev => ({ ...prev, phoneNumber: e.target.value }))} className="w-full px-3 py-2 border rounded-xl outline-none focus:border-indigo-500" placeholder="096xxxxxxx" />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">អាសយដ្ឋានបច្ចុប្បន្ន</label>
                  <input type="text" value={newStudent.address} onChange={e => setNewStudent(prev => ({ ...prev, address: e.target.value }))} className="w-full px-3 py-2 border rounded-xl outline-none focus:border-indigo-500" placeholder="ខេត្ត, ស្រុក..." />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold text-slate-500 hover:bg-slate-50">បោះបង់</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md shadow-indigo-100 hover:bg-indigo-700">រក្សាទុក</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Global Confirmation Popup Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white border rounded-2xl shadow-xl max-w-sm w-full overflow-hidden relative z-10 p-5 space-y-4 text-center">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-950 text-sm">{confirmModal.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{confirmModal.message}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setConfirmModal(p => ({ ...p, isOpen: false }))} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition">បដិសេធ</button>
                <button onClick={confirmModal.onConfirm} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-indigo-100">យល់ព្រម</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer copyright section */}
      <footer className="mt-12 py-10 bg-white border-t border-slate-200/80 text-center text-slate-400 text-[11px]">
        <p className="font-bold text-slate-500 uppercase tracking-wider mb-1">មជ្ឈមណ្ឌលគរុកោសល្យភូមិភាគខេត្តកំពង់ចាម - RTTC Kampong Cham</p>
        <p>Copyright © 2026. Custom Classroom Attendance & Registry Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
