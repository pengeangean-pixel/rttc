import { db } from "./firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  Users, 
  MapPin, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
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
  Briefcase,
  Phone,
  Send,
  LogOut,
  LogIn,
  Lock,
  Unlock,
  Mail,
  Key,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { Student, AttendanceRecord, GeofenceConfig, AttendanceStatus } from "./types";
import { translations } from "./translations_rttc";
import { initialStudentsList } from "./studentsData";
import QRCode from "qrcode";

export default function App() {
  // Locale state
  const [lang, setLang] = useState<"km" | "en">("km");
  const t = translations[lang];

  // --- CUSTOM POPUP FOR CONFIRMATION (GRADIENT BACKDROP & MODAL) ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "delete" | "edit" | "reset";
    actionLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "delete",
    actionLabel: "",
    cancelLabel: "",
    onConfirm: () => {}
  });

  // --- BULK CSV IMPORT & REAL QR SOLUTION STATES ---
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [parsedBulkStudents, setParsedBulkStudents] = useState<Student[]>([]);
  const [bulkImportError, setBulkImportError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");

  const [isStudentCheckInView, setIsStudentCheckInView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") === "student-checkin";
  });

  const [studentCheckInId, setStudentCheckInId] = useState("");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentGPSData, setStudentGPSData] = useState<{ lat: number; lng: number } | null>(null);
  const [studentGPSDistance, setStudentGPSDistance] = useState<number | null>(null);
  const [studentGPSStatus, setStudentGPSStatus] = useState<"checking" | "allowed" | "denied" | "iframe-fallback">("checking");
  const [studentGPSMessage, setStudentGPSMessage] = useState("");
  const [checkInSuccessDetails, setCheckInSuccessDetails] = useState<{ studentName: string; time: string; date: string } | null>(null);

  // --- ATTENDANCE SYSTEM AUTHENTICATION STATES ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem("rttc_auth_active") === "true";
  });
  
  const [adminPassword, setAdminPassword] = useState<string>(() => {
    const saved = localStorage.getItem("rttc_admin_pwd");
    return saved || "@rttc2026";
  });

  const [adminUsername, setAdminUsername] = useState<string>(() => {
    const saved = localStorage.getItem("rttc_admin_username");
    return saved || "admin";
  });

  const [adminEmail, setAdminEmail] = useState<string>(() => {
    const saved = localStorage.getItem("rttc_admin_email");
    return saved || "admin.rttc.kc@gmail.com";
  });

  const [adminDisplayName, setAdminDisplayName] = useState<string>(() => {
    const saved = localStorage.getItem("rttc_admin_name");
    return saved || "គណៈគ្រប់គ្រង RTTC";
  });

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUsername, setProfileUsername] = useState("");
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileConfirmNewPassword, setProfileConfirmNewPassword] = useState("");
  const [profileError, setProfileError] = useState("");

  const [inputUsername, setInputUsername] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [authView, setAuthView] = useState<"login" | "forgot" | "reset">("login");
  const [wrongCredsError, setWrongCredsError] = useState("");
  
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleUserEmail, setGoogleUserEmail] = useState("");

  // Core state collections linked to Firebase
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(true);

  // Current session config
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Geofence constraints
  const [geofence, setGeofence] = useState<GeofenceConfig>({
    latitude: 12.0004658, // Kampong Cham RTTC Coordinate Center
    longitude: 105.4645,
    radius: 150, // 150 meters
    isEnabled: true
  });

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "admin" | "qr" | "sheets">("dashboard");

  // Admin student form state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentForm, setStudentForm] = useState<Omit<Student, "id">>({
    name: "",
    gender: "ប្រុស",
    dob: "2004-01-01",
    address: "",
    phoneNumber: "",
    telegram: "",
    isMonitor: false
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Student QR Scanner Simulator states
  const [simulatedStudentId, setSimulatedStudentId] = useState<string>("");
  const [simulatedLocation, setSimulatedLocation] = useState<"inside" | "outside">("inside");
  const [simScanResult, setSimScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<string | null>(null);

  // --- Real-time Cloud Sync Effect (Firestore onSnapshot) ---
  useEffect(() => {
    const qStudents = query(collection(db, "students"));
    const unsubscribeStudents = onSnapshot(qStudents, (snapshot) => {
      const list: Student[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Student);
      });
      // បើសិនជាលើ Cloud មិនទាន់មានទិន្នន័យទាល់តែសោះ ឱ្យប្រើប្រាស់បញ្ជីលំនាំដើម
      setStudents(list.length > 0 ? list : initialStudentsList);
      setIsLoadingCloud(false);
    }, (error) => {
      console.error("Error syncing students from Firestore:", error);
      setIsLoadingCloud(false);
    });

    const qAttendance = query(collection(db, "attendance"));
    const unsubscribeAttendance = onSnapshot(qAttendance, (snapshot) => {
      const list: AttendanceRecord[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
      });
      setAttendance(list);
    }, (error) => {
      console.error("Error syncing attendance from Firestore:", error);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeAttendance();
    };
  }, []);

  // Dynamic Real QR Code generation with error handling
  useEffect(() => {
    const generateRealQRCode = async () => {
      try {
        const baseUrl = window.location.origin + window.location.pathname;
        const studentGateURL = `${baseUrl}?mode=student-checkin&token=SECURE-TOKEN-R01&lat=${geofence.latitude}&lng=${geofence.longitude}&r=${geofence.radius}`;
        
        const dataUrl = await QRCode.toDataURL(studentGateURL, {
          width: 350,
          margin: 1.5,
          color: {
            dark: "#0f172a", // slate-900 / dark color
            light: "#ffffff"
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error("Error creating real QR Code:", err);
      }
    };
    generateRealQRCode();
  }, [geofence.latitude, geofence.longitude, geofence.radius, geofence.isEnabled]);

  // Standalone Geo-Distance Calculator using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // returns distance in meters
  };

  // High quality CSV parser supporting both English and Khmer columns
  const parseCSV = (csvText: string): Student[] => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];

    const headerLine = lines[0].toLowerCase();
    const headers = headerLine.split(",").map(h => h.trim().replace(/^["']|["']$/g, ""));

    const parsedList: Student[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      let rowValues: string[] = [];
      let insideQuote = false;
      let currentVal = "";

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          rowValues.push(currentVal.trim());
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      rowValues.push(currentVal.trim());

      const cleanedValues = rowValues.map(v => v.replace(/^["']|["']$/g, ""));
      if (cleanedValues.length === 0 || cleanedValues.every(v => v === "")) continue;

      const getVal = (possibleHeaders: string[]): string => {
        const idx = headers.findIndex(h => possibleHeaders.some(p => h.includes(p)));
        return idx >= 0 && idx < cleanedValues.length ? cleanedValues[idx] : "";
      };

      const rawId = getVal(["id", "ល.រ", "លេខសម្គាល់", "no", "លរ", "សិស្ស"]);
      const id = rawId ? rawId.trim() : `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const name = getVal(["name", "ឈ្មោះ", "full name", "គោត្តនាម", "នាមខ្លួន", "សិស្ស"]);
      if (!name) continue;

      const rawGender = getVal(["gender", "ភេទ"]) || "ប្រុស";
      let gender: "Male" | "Female" | "ប្រុស" | "ស្រី" = "ប្រុស";
      if (rawGender.toLowerCase().includes("female") || rawGender.includes("ស្រី") || rawGender.toLowerCase() === "f") {
        gender = "ស្រី";
      } else if (rawGender.toLowerCase().includes("male") || rawGender.includes("ប្រុស") || rawGender.toLowerCase() === "m") {
        gender = "ប្រុស";
      }

      let dob = getVal(["dob", "ថ្ងៃខែឆ្នាំកំណើត", "date of birth", "ថ្ងៃកំណើត", "ឆ្នាំកំណើត"]) || "2004-01-01";
      if (dob.includes("/")) {
        const parts = dob.split("/");
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            dob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else if (parts[0].length === 4) {
            dob = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
        }
      }

      const phoneNumber = getVal(["phone", "ទូរស័ព្ទ", "លេខទូរស័ព្ទ", "tel"]) || "096";
      const telegram = getVal(["telegram", "តេឡេក្រាម", "គណនី", "username", "tg"]) || "";
      const address = getVal(["address", "អាសយដ្ឋាន", "ទីកន្លែងរស់នៅ", "ខេត្ត"]) || "កំពង់ចាម";
      
      const rawMonitor = getVal(["monitor", "ប្រធានថ្នាក់", "is monitor", "ប្រធាន"]);
      const isMonitor = rawMonitor ? (rawMonitor.toLowerCase() === "true" || rawMonitor === "yes" || rawMonitor === "1" || rawMonitor.includes("បាទ") || rawMonitor.includes("ចាស")) : false;

      parsedList.push({
        id,
        name,
        gender,
        dob,
        phoneNumber,
        telegram,
        address,
        isMonitor
      });
    }

    return parsedList;
  };

  // CSV sample file trigger
  const handleDownloadCSVTemplate = () => {
    const BOM = "\uFEFF";
    const headers = ["ID", "Name", "Gender", "DOB", "PhoneNumber", "Telegram", "Address", "IsMonitor"];
    const sampleRows = [
      ["s-101", "លី រតនៈ", "ប្រុស", "2004-10-14", "012334455", "@ratanak_ly", "ក្រុងកំពង់ចាម ខេត្តកំពង់ចាម", "FALSE"],
      ["s-102", "សុខ សុភក្ត្រ", "ស្រី", "2003-05-18", "0968877661", "@sopheak_sok", "ស្រុកព្រៃឈរ ខេត្តកំពង់ចាម", "FALSE"],
      ["s-103", "មុន្នី ច័ន្ទដារ៉ា", "ប្រុស", "2004-08-05", "0889988772", "@dara_rttc", "ស្រុកចំការលើ ខេត្តកំពង់ចាម", "TRUE"]
    ];
    
    const csvContent = BOM + [headers.join(","), ...sampleRows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "rttc_students_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleParseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleParseFile(e.target.files[0]);
    }
  };

  const handleParseFile = (file: File) => {
    setBulkImportError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setBulkImportError(t.noDataFound || "No valid student data rows found.");
        } else {
          setParsedBulkStudents(parsed);
        }
      } catch (err) {
        setBulkImportError(t.invalidFormat || "Failed to process the CSV structure.");
      }
    };
    reader.onerror = () => {
      setBulkImportError("Error reading file.");
    };
    reader.readAsText(file, "UTF-8");
  };

  // --- កែប្រែ៖ រុញទិន្នន័យ CSV ទៅកាន់ Cloud Database ទាំងស្រុង ---
  const handleConfirmBulkImport = async () => {
    if (parsedBulkStudents.length === 0) return;

    try {
      setBulkImportError(lang === "km" ? "កំពុងរក្សាទុកទៅ Cloud..." : "Saving to Cloud...");
      const batch = writeBatch(db);

      parsedBulkStudents.forEach((newSt) => {
        const studentRef = doc(db, "students", String(newSt.id).trim());
        batch.set(studentRef, {
          name: newSt.name,
          gender: newSt.gender,
          dob: newSt.dob,
          phoneNumber: newSt.phoneNumber,
          telegram: newSt.telegram,
          address: newSt.address,
          isMonitor: newSt.isMonitor || false
        });
      });

      await batch.commit();
      setShowBulkImportModal(false);
      setParsedBulkStudents([]);
      setBulkImportError("");
      triggerToast(lang === "km" 
        ? `បាននាំចូលនិស្សិតចំនួន ${parsedBulkStudents.length} នាក់ទៅ Cloud ជោគជ័យ!` 
        : `Successfully loaded ${parsedBulkStudents.length} student records to Cloud!`);
    } catch (error) {
      console.error("Batch Import Cloud Error:", error);
      setBulkImportError("ការនាំចូលទិន្នន័យទៅ Cloud បានបរាជ័យ។");
    }
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleAdminSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUsername.trim().toLowerCase() === adminUsername.trim().toLowerCase() && inputPassword === adminPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem("rttc_auth_active", "true");
      setWrongCredsError("");
      setInputUsername("");
      setInputPassword("");
      triggerToast(lang === "km" ? "ស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងសន្លឹកវត្តមាន RTTC!" : "Welcome to the RTTC Attendance management system!");
    } else {
      setWrongCredsError(t.wrongCreds || "Incorrect credentials");
      triggerToast(t.wrongCreds || "Incorrect credentials");
    }
  };

  const openProfileModal = () => {
    setProfileUsername(adminUsername);
    setProfileDisplayName(adminDisplayName);
    setProfileEmail(adminEmail);
    setProfileCurrentPassword("");
    setProfileNewPassword("");
    setProfileConfirmNewPassword("");
    setProfileError("");
    setShowProfileModal(true);
  };

  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUsername.trim()) {
      setProfileError(t.usernameRequired || "Username is required.");
      return;
    }
    
    const wantsPasswordChange = profileNewPassword.length > 0 || profileCurrentPassword.length > 0;
    if (wantsPasswordChange) {
      if (profileCurrentPassword !== adminPassword) {
        setProfileError(t.currentPasswordInvalid || "Current password incorrect.");
        return;
      }
      if (!profileNewPassword.trim()) {
        setProfileError(lang === "km" ? "លេខកូដសម្ងាត់ថ្មីមិនអាចទទេបានឡើយ" : "New password cannot be empty.");
        return;
      }
      if (profileNewPassword !== profileConfirmNewPassword) {
        setProfileError(t.passwordsMismatch || "Passwords do not match.");
        return;
      }
    }

    localStorage.setItem("rttc_admin_username", profileUsername.trim());
    localStorage.setItem("rttc_admin_name", profileDisplayName.trim());
    localStorage.setItem("rttc_admin_email", profileEmail.trim());
    setAdminUsername(profileUsername.trim());
    setAdminDisplayName(profileDisplayName.trim());
    setAdminEmail(profileEmail.trim());

    if (wantsPasswordChange) {
      localStorage.setItem("rttc_admin_pwd", profileNewPassword);
      setAdminPassword(profileNewPassword);
    }

    setProfileCurrentPassword("");
    setProfileNewPassword("");
    setProfileConfirmNewPassword("");
    setProfileError("");
    setShowProfileModal(false);
    triggerToast(t.toastAdminUpdated || "Administrator profile updated successfully!");
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetNewPassword.trim() === "") {
      setResetError(lang === "km" ? "លេខកូដសម្ងាត់មិនអាចទទេបានទេ" : "Password cannot be empty.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError(t.passwordsMismatch || "Passwords match error");
      return;
    }
    
    localStorage.setItem("rttc_admin_pwd", resetNewPassword);
    setAdminPassword(resetNewPassword);
    setResetError("");
    setResetNewPassword("");
    setResetConfirmPassword("");
    setAuthView("login");
    triggerToast(t.resetPassSuccess || "Password reset successful!");
  };

  const handleGoogleAccountSelect = (email: string, name: string) => {
    setIsAuthenticated(true);
    sessionStorage.setItem("rttc_auth_active", "true");
    setShowGoogleModal(false);
    triggerToast(`${t.googleSignInSuccess || "Google signed in as:"} ${name} (${email})`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("rttc_auth_active");
    triggerToast(lang === "km" ? "បានចាកចេញពីប្រព័ន្ធដោយជោគជ័យ" : "Successfully logged out from portal.");
  };

  // --- កែប្រែ៖ មុខងារ Toggle វត្តមាន រុញទៅ Cloud Real-time ---
  const toggleAttendanceStatus = async (studentId: string, currentStatus: AttendanceStatus) => {
    const todayStr = selectedDate;
    const recordId = `${studentId}-${todayStr}`;
    
    let nextStatus: AttendanceStatus = "Present";
    let updatedTime: string | null = "07:30 AM";
    if (currentStatus === "Present") {
      nextStatus = "Absent_Permission";
      updatedTime = null;
    } else if (currentStatus === "Absent_Permission") {
      nextStatus = "Absent_No_Permission";
      updatedTime = null;
    } else {
      nextStatus = "Present";
      updatedTime = "07:15 AM";
    }

    try {
      await setDoc(doc(db, "attendance", recordId), {
        studentId,
        date: todayStr,
        status: nextStatus,
        checkInTime: updatedTime,
        verifiedByQR: false
      });
      triggerToast(lang === "km" ? "វត្តមានត្រូវបានកែប្រែលើ Cloud រួចរាល់" : "Attendance updated on Cloud");
    } catch (error) {
      console.error("Error toggling attendance on Cloud:", error);
      triggerToast("Error connecting to Cloud");
    }
  };

  // --- កែប្រែ៖ មុខងារកំណត់មានវត្តមានទាំងអស់ រុញទៅ Cloud តាម Batch ---
  const setAllToPresent = async () => {
    const todayStr = selectedDate;
    try {
      const batch = writeBatch(db);
      students.forEach(st => {
        const recordId = `${st.id}-${todayStr}`;
        const recordRef = doc(db, "attendance", recordId);
        batch.set(recordRef, {
          studentId: st.id,
          date: todayStr,
          status: "Present",
          checkInTime: "07:15 AM",
          verifiedByQR: false
        });
      });
      await batch.commit();
      triggerToast(lang === "km" ? "និស្សិតទាំងអស់ត្រូវបានកត់ត្រា មានវត្តមានលើ Cloud" : "All students marked Present on Cloud");
    } catch (error) {
      console.error("Error setting all present:", error);
    }
  };

  // Get active student records with attendance statuses merged
  const getDailyStatusList = () => {
    const todayStr = selectedDate;
    return students.map(st => {
      const record = attendance.find(r => r.studentId === st.id && r.date === todayStr);
      return {
        ...st,
        status: record ? record.status : ("Present" as AttendanceStatus),
        checkInTime: record ? record.checkInTime || undefined : undefined,
        verifiedByQR: record ? !!record.verifiedByQR : false
      };
    });
  };

  // Statistical calculations
  const listToday = getDailyStatusList();
  const filteredList = listToday.filter(st => {
    const queryStr = searchQuery.toLowerCase();
    return (
      st.name.toLowerCase().includes(queryStr) ||
      st.phoneNumber.includes(queryStr) ||
      st.address.toLowerCase().includes(queryStr) ||
      st.telegram.toLowerCase().includes(queryStr)
    );
  });

  const totalCount = students.length;
  const presentCount = listToday.filter(s => s.status === "Present").length;
  const excusedCount = listToday.filter(s => s.status === "Absent_Permission").length;
  const absentCount = listToday.filter(s => s.status === "Absent_No_Permission").length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Student Simulation QR Check-In Event
  const executeSimulatedCheckIn = async () => {
    if (!simulatedStudentId) {
      setSimScanResult({ success: false, message: lang === "km" ? "សូមជ្រើសរើសឈ្មោះនិស្សិត" : "Please select a student" });
      return;
    }

    const selectedSt = students.find(s => s.id === simulatedStudentId);
    if (!selectedSt) return;

    const studentLat = simulatedLocation === "inside" ? 12.0004658 : 11.9212; 
    const studentLng = simulatedLocation === "inside" ? 105.4645 : 105.4789;

    const dist = calculateDistance(geofence.latitude, geofence.longitude, studentLat, studentLng);

    if (geofence.isEnabled && dist > geofence.radius) {
      setSimScanResult({
        success: false,
        message: lang === "km" 
          ? `បរាជ័យ៖ ទីតាំងរបស់អ្នកស្ថិតនៅចម្ងាយ ${Math.round(dist)}ម៉ែត្រ (ហួសដែនកំណត់ ${geofence.radius}ម៉ែត្រ)` 
          : `Rejected: You are ${Math.round(dist)}m away (limit is ${geofence.radius}m)`
      });
      return;
    }

    const todayStr = selectedDate;
    const recordId = `${simulatedStudentId}-${todayStr}`;
    
    const nowHours = new Date().getHours().toString().padStart(2, "0");
    const nowMins = new Date().getMinutes().toString().padStart(2, "0");
    const formattedCheckInTime = `${nowHours}:${nowMins} AM`;

    try {
      await setDoc(doc(db, "attendance", recordId), {
        studentId: simulatedStudentId,
        date: todayStr,
        status: "Present",
        checkInTime: formattedCheckInTime,
        verifiedByQR: true,
        latitude: studentLat,
        longitude: studentLng
      });

      setSimScanResult({ 
        success: true, 
        message: lang === "km" 
          ? `ចុះវត្តមាន និស្សិត ${selectedSt.name} ជោគជ័យតាមកូដ QR ម៉ោង ${formattedCheckInTime}` 
          : `Check-in Successful for ${selectedSt.name} at ${formattedCheckInTime}` 
      });
    } catch (error) {
      console.error("Simulation error:", error);
    }
  };

  // Excel / CSV Export
  const handleExportCSV = () => {
    const headers = [
      lang === "km" ? "ល.រ" : "No.",
      lang === "km" ? "ឈ្មោះនិស្សិត" : "Student Name",
      lang === "km" ? "ភេទ" : "Gender",
      lang === "km" ? "ថ្ងៃខែឆ្នាំកំណើត" : "Date of Birth",
      lang === "km" ? "លេខទូរស័ព្ទ" : "Phone Number",
      lang === "km" ? "គណនី Telegram" : "Telegram",
      lang === "km" ? "អាសយដ្ឋានបច្ចុប្បន្ន" : "Current Address",
      lang === "km" ? "ស្ថានភាពវត្តមាន" : "Attendance Status",
      lang === "km" ? "ម៉ោងមកដល់" : "Arrival Time",
      lang === "km" ? "ផ្ទៀងផ្ទាត់ទីតាំង QR" : "QR Verified"
    ];

    const rows = filteredList.map((st, i) => [
      i + 1,
      st.name,
      st.gender,
      st.dob,
      st.phoneNumber,
      st.telegram,
      `"${st.address.replace(/"/g, '""')}"`,
      st.status === "Present" 
        ? (lang === "km" ? "មានវត្តមាន" : "Present") 
        : st.status === "Absent_Permission" 
          ? (lang === "km" ? "ច្បាប់" : "Absent Excused") 
          : (lang === "km" ? "ឥតច្បាប់" : "Absent Unexcused"),
      st.checkInTime || "-",
      st.verifiedByQR ? "YES" : "NO"
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `RTTC_R01_Attendance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    triggerToast(lang === "km" ? "បានទាញយកតារាង Excel/Sheets (CSV)" : "Spreadsheet exported successfully!");
  };

  // --- កែប្រែ៖ និស្សិតចុះវត្តមានផ្ទាល់ខ្លួនតាម QR រុញទៅ Cloud ---
  const handleStudentDirectCheckIn = async (isSimulatedOverride: boolean) => {
    if (!studentCheckInId) {
      triggerToast(lang === "km" ? "សូមជ្រើសរើសឈ្មោះរបស់អ្នកជាមុនសិន!" : "Please select your name first!");
      return;
    }

    const selectedSt = students.find(s => s.id === studentCheckInId);
    if (!selectedSt) return;

    const todayStr = new Date().toISOString().split("T")[0]; 
    const recordId = `${studentCheckInId}-${todayStr}`;

    const nowHours = new Date().getHours();
    const nowMins = new Date().getMinutes().toString().padStart(2, "0");
    const ampm = nowHours >= 12 ? "PM" : "AM";
    const displayHours = (nowHours % 12 || 12).toString().padStart(2, "0");
    const formattedCheckInTime = `${displayHours}:${nowMins} ${ampm}`;

    try {
      await setDoc(doc(db, "attendance", recordId), {
        studentId: studentCheckInId,
        date: todayStr,
        status: "Present",
        checkInTime: formattedCheckInTime,
        verifiedByQR: true,
        latitude: isSimulatedOverride ? geofence.latitude : (studentGPSData?.lat || geofence.latitude),
        longitude: isSimulatedOverride ? geofence.longitude : (studentGPSData?.lng || geofence.longitude)
      });

      setCheckInSuccessDetails({
        studentName: selectedSt.name,
        time: formattedCheckInTime,
        date: todayStr
      });
      triggerToast(lang === "km" ? "✓ ការចុះវត្តមានផ្ទៀងផ្ទាត់ដោយជោគជ័យ!" : "✓ QR Attendance verified and submitted!");
    } catch (error) {
      console.error("Student CheckIn Error:", error);
    }
  };

  // --- បន្ថែមផ្ទាំងស្កេន Loading ពេលកំពុងទាញទិន្នន័យពី Cloud Firestore ---
  if (isLoadingCloud) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-400 font-sans">
        <RefreshCw className="w-10 h-10 animate-spin text-teal-400 mb-4" />
        <p className="text-sm font-medium font-mono">CONNECTING TO CLOUD FIRESTORE DATABASE...</p>
      </div>
    );
  }

  // Render direct Student portal landing page layout
  if (isStudentCheckInView) {
    const filteredSearch = students.filter(s => 
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
      s.phoneNumber.includes(studentSearchQuery)
    );

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between" id="student-gate-portal">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500"></div>
        
        <div className="max-w-md w-full mx-auto px-4 pt-6 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">LIVE ENROLL GATE</span>
          </div>
          
          <button
            onClick={() => setLang(lang === "km" ? "en" : "km")}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-xl text-xs font-bold text-teal-400 transition-all flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            {lang === "km" ? "English" : "ភាសាខ្មែរ"}
          </button>
        </div>

        <div className="max-w-md w-full mx-auto p-4 flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!checkInSuccessDetails ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5"
              >
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-slate-700/50 border border-slate-600 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white uppercase tracking-wide font-mono">RTTC R01 ATTENDANCE GATE</h1>
                    <p className="text-xs text-slate-400">សូមជ្រើសរើសឈ្មោះដើម្បីកត់ត្រានិងផ្ទៀងផ្ទាត់វត្តមាន</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">ស្វែងរក ឬ ជ្រើសរើសឈ្មោះរបស់អ្នក</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="វាយបញ្ចូលឈ្មោះ ឬ លេខទូរស័ព្ទ..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm focus:outline-none focus:border-teal-500 text-white font-sans"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto border border-slate-700 bg-slate-900 rounded-xl divide-y divide-slate-800">
                    {filteredSearch.map((st) => (
                      <button
                        key={st.id}
                        onClick={() => {
                          setStudentCheckInId(st.id);
                          setStudentSearchQuery(st.name);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs transition-colors font-sans flex justify-between items-center ${
                          studentCheckInId === st.id ? "bg-teal-950 text-teal-300 font-bold" : "text-slate-300 hover:bg-slate-800/50"
                        }`}
                      >
                        <span>{st.name} ({st.gender})</span>
                        <span className="text-slate-500 font-mono text-[10px]">{st.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <button
                    onClick={() => handleStudentDirectCheckIn(true)}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold rounded-xl text-sm shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {lang === "km" ? "បញ្ជាក់ចូលរៀន (Check In)" : "Confirm Attendance"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-800 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl"
              >
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-white font-sans">កត់ត្រាវត្តមានជោគជ័យ!</h2>
                  <p className="text-xs text-slate-400">ទិន្នន័យត្រូវបាន Sync ទៅកាន់ Cloud Server រួចរាល់</p>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 text-left border border-slate-700/80 space-y-2 font-sans text-xs">
                  <div className="flex justify-between"><span className="text-slate-400">និស្សិត៖</span> <span className="font-bold text-white">{checkInSuccessDetails.studentName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">ម៉ោងកត់ត្រា៖</span> <span className="font-bold text-emerald-400 font-mono">{checkInSuccessDetails.time}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">កាលបរិច្ឆេទ៖</span> <span className="font-bold text-slate-300 font-mono">{checkInSuccessDetails.date}</span></div>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">RTTC Kampong Cham • Class R01 Portal</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <footer className="py-6 text-center text-slate-500 text-[11px] font-sans">
          មជ្ឈមណ្ឌលគរុកោសល្យភូមិភាគខេត្តកំពង់ចាម (RTTC)
        </footer>
      </div>
    );
  }

  // --- UI បន្ទាប់ពីនេះគឺជាផ្ទាំង Admin Dashboard ដើមរបស់អ្នកទាំងអស់ ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500 selection:text-white">
      {/* លោកអ្នកអាចរក្សារចនាសម្ព័ន្ធ UI ដើមសម្រាប់ Render ផ្ទាំង Dashboard ធំនៅទីនេះ... */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              {t.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">{t.subtitle} • {t.academicYear}</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => setLang(lang === "km" ? "en" : "km")}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-indigo-600 transition-colors"
            >
              {lang === "km" ? "English" : "ភាសាខ្មែរ"}
            </button>
            <button
              onClick={() => setShowBulkImportModal(true)}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t.excelImportBtn}
            </button>
          </div>
        </header>

        {/* ផ្ទាំងបង្ហាញស្ថិតិលម្អិត (Dashboard Analytics Metrics) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Users className="w-5 h-5" /></div>
            <div><p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{t.totalStudents}</p><p className="text-lg font-bold text-slate-900 font-mono">{totalCount}</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5" /></div>
            <div><p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{t.presentCount}</p><p className="text-lg font-bold text-emerald-600 font-mono">{presentCount}</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center"><HelpCircle className="w-5 h-5" /></div>
            <div><p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{t.excusedCount}</p><p className="text-lg font-bold text-amber-600 font-mono">{excusedCount}</p></div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><XCircle className="w-5 h-5" /></div>
            <div><p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">{t.absentCount}</p><p className="text-lg font-bold text-rose-600 font-mono">{absentCount}</p></div>
          </div>
        </div>

        {/* ផ្ទាំងបញ្ជីឈ្មោះសិស្ស និងប៊ូតុងបញ្ជាវត្តមាន (Attendance Table List) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/50 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={setAllToPresent}
                className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition-all"
              >
                ✓ {lang === "km" ? "វត្តមានទាំងអស់" : "Mark All Present"}
              </button>
              <button 
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-slate-50 transition-all text-slate-600"
              >
                <Download className="w-3.5 h-3.5" />
                {t.exportExcel}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/30">
                  <th className="py-3 px-4 w-12 text-center">ល.រ</th>
                  <th className="py-3 px-4">ឈ្មោះនិស្សិត</th>
                  <th className="py-3 px-4 w-16">ភេទ</th>
                  <th className="py-3 px-4">ថ្ងៃខែឆ្នាំកំណើត</th>
                  <th className="py-3 px-4">លេខទូរស័ព្ទ</th>
                  <th className="py-3 px-4">អាសយដ្ឋានបច្ចុប្បន្ន</th>
                  <th className="py-3 px-4 text-center w-36">ស្ថានភាពវត្តមាន</th>
                  <th className="py-3 px-4 w-24">ម៉ោងមកដល់</th>
                  <th className="py-3 px-4 text-center w-24">ផ្ទៀងផ្ទាត់ QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-xs text-slate-700 font-sans">
                {filteredList.map((st, index) => (
                  <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 text-center font-mono text-slate-400 font-bold">{index + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900">{st.name}</span>
                        {st.isMonitor && (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md uppercase tracking-wide">ប្រធាន</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st.gender === "ស្រី" ? "bg-pink-50 text-pink-600" : "bg-blue-50 text-blue-600"}`}>{st.gender}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">{st.dob}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{st.phoneNumber}</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{st.address}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleAttendanceStatus(st.id, st.status)}
                        className={`w-full py-1.5 px-3 rounded-xl font-bold transition-all border text-[11px] ${
                          st.status === "Present" 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                            : st.status === "Absent_Permission" 
                              ? "bg-amber-50 text-amber-700 border-amber-200" 
                              : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {st.status === "Present" ? t.statusPresent : st.status === "Absent_Permission" ? t.statusExcused : t.statusUnexcused}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-500">{st.checkInTime || "-"}</td>
                    <td className="py-3 px-4 text-center">
                      {st.verifiedByQR ? (
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-150 py-0.5 px-2 rounded-lg inline-flex items-center gap-1">
                          <QrCode className="w-3 h-3" /> YES
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 py-0.5 px-2 rounded-lg inline-flex items-center">MANUAL</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-b-2xl border-t border-slate-200/80 text-[11px] text-slate-400 font-mono">
            <span>Total rows active: <strong className="text-slate-700">{filteredList.length}</strong></span>
            <span>RTTC Kampong Cham Class R01</span>
          </div>
        </div>

        {/* ផ្ទាំងផ្នែក QR Setup & Simulation Portal (QR & Simulator View) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">{t.qrTitle}</h3>
              <p className="text-[11px] text-slate-400 px-4">{t.qrInstruct}</p>
            </div>
            {qrCodeDataUrl ? (
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl shadow-inner animate-fade-in">
                <img src={qrCodeDataUrl} alt="RTTC Enrollment QR Gate" className="w-48 h-48 mix-blend-multiply" />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-mono animate-pulse">GENERATING QR...</div>
            )}
            <a 
              href={`${window.location.origin}${window.location.pathname}?mode=student-checkin`} 
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline"
            >
              Open Student Portal <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">QR Scanner Simulator (សម្រាប់តេស្តសាកល្បង)</h3>
              <p className="text-[11px] text-slate-400">តេស្តសាកល្បងមុខងារចុះវត្តមាន QR ដោយមិនបាច់ប្រើទូរស័ព្ទដៃស្កេនផ្ទាល់</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 block">ជ្រើសរើសឈ្មោះនិស្សិតតេស្ត</label>
                <select
                  value={simulatedStudentId}
                  onChange={(e) => setSimulatedStudentId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- ជ្រើសរើសនិស្សិត --</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-slate-600 block">ទីតាំង GPS របស់និស្សិត</label>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSimulatedLocation("inside")}
                    className={`w-full py-2 rounded-xl font-bold border transition-all text-[11px] ${simulatedLocation === "inside" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    នៅក្នុងវិទ្យាស្ថាន (Allowed)
                  </button>
                  <button 
                    onClick={() => setSimulatedLocation("outside")}
                    className={`w-full py-2 rounded-xl font-bold border transition-all text-[11px] ${simulatedLocation === "outside" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    នៅក្រៅវិទ្យាស្ថាន (Restricted)
                  </button>
                </div>
              </div>
            </div>

            <button 
              onClick={executeSimulatedCheckIn}
              className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-slate-800 transition-all flex items-center justify-center gap-1"
            >
              <Smartphone className="w-4 h-4 text-teal-400" />
              ដំណើរការស្កេនកូដ QR សិប្បនិម្មិត
            </button>

            {simScanResult && (
              <div className={`p-3 rounded-xl border text-xs font-medium flex items-start gap-2 ${simScanResult.success ? "bg-emerald-50 text-emerald-800 border-emerald-100" : "bg-rose-50 text-rose-800 border-rose-100"}`}>
                {simScanResult.success ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
                <p>{simScanResult.message}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- BULK CSV IMPORTING DIALOG MODAL LAYOUT --- */}
      <AnimatePresence>
        {showBulkImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowBulkImportModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 p-6 shadow-2xl relative z-10 space-y-4 max-h-[90vh] overflow-y-auto font-sans"
            >
              <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  {t.bulkImport}
                </h3>
                <button onClick={() => setShowBulkImportModal(false)} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>

              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all relative ${dragActive ? "border-indigo-500 bg-indigo-50/40" : "border-slate-200 hover:border-indigo-400 bg-slate-50/50"}`}
              >
                <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Download className="w-8 h-8 text-indigo-500 mx-auto mb-2 animate-bounce" />
                <p className="text-xs font-bold text-slate-700">{t.dragDropText}</p>
                <p className="text-[10px] text-slate-400 mt-1">គាំទ្រតែឯកសារទម្រង់ .CSV (UTF-8) ប៉ុណ្ណោះ</p>
              </div>

              <div className="flex justify-between items-center text-xs">
                <button onClick={handleDownloadCSVTemplate} className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> {t.downloadTemplate}
                </button>
              </div>

              {bulkImportError && <p className="text-xs text-rose-600 font-medium bg-rose-50 p-3 rounded-xl border border-rose-100 font-sans">{bulkImportError}</p>}

              {parsedBulkStudents.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-emerald-800 font-medium bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">{t.importStats?.replace("{count}", String(parsedBulkStudents.length))}</p>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 text-[11px] bg-slate-50 font-mono">
                    {parsedBulkStudents.map((s, idx) => (
                      <div key={idx} className="p-2 flex justify-between items-center">
                        <span className="font-bold text-slate-800 font-sans">{idx + 1}. {s.name} ({s.gender})</span>
                        <span className="text-slate-400">{s.id} • {s.phoneNumber}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleConfirmBulkImport} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md">
                    {t.importConfirmBtn}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Toast Component */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white py-3 px-5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-sm font-sans text-xs"
          >
            <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <p className="font-medium text-slate-100">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer copyright */}
      <footer className="mt-12 py-10 bg-white border-t border-slate-200/80 text-center text-slate-400 text-xs font-sans">
        <p className="font-bold text-slate-500 uppercase tracking-wider mb-1.5">មជ្ឈមណ្ឌលគរុកោសល្យភូមិភាគខេត្តកំពង់ចាម - RTTC Kampong Cham</p>
        <p>Copyright © 2026. Custom Classroom Attendance & Real-time Cloud Solution</p>
        <p>ប្រព័ន្ធនេះគ្រប់គ្រងដោយ៖ អ៊ាន ប៉េងអ៊ាង</p>
      </footer>
    </div>
  );
}
