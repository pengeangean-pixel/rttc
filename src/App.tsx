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
import React, { useState, useEffect } from "react";
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

const removeUndefinedFields = <T extends object>(data: T) => {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
};

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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const isAuthenticated = Boolean(firebaseUser);
  const adminEmail = firebaseUser?.email || "";
  const adminDisplayName = firebaseUser?.displayName || (lang === "km" ? "គណៈគ្រប់គ្រង RTTC" : "RTTC Administrator");

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

  // Keep React state synced with Firebase Authentication.
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthLoading(false);
    });

  return () => unsubscribeAuth();
  }, []);

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

      // Extract unique identifier or auto-generate
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

      // DOB
      let dob = getVal(["dob", "ថ្ងៃខែឆ្នាំកំណើត", "date of birth", "ថ្ងៃកំណើត", "ឆ្នាំកំណើត"]) || "2004-01-01";
      // Sanitize standard slash dates (e.g. DD/MM/YYYY or MM/DD/YYYY) to YYYY-MM-DD
      if (dob.includes("/")) {
        const parts = dob.split("/");
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            // Check if DD/MM/YYYY
            dob = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          } else if (parts[0].length === 4) {
            // YYYY/MM/DD
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
    // UTF-8 BOM helps Excel recognize Khmer scripts
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

  // Drag-and-drop file ingestion support
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

  const handleConfirmBulkImport = async () => {
    if (parsedBulkStudents.length === 0) return;

    // Merge students list. If ID already exists, overwrite. Otherwise add.
    const merged = [...students];
    parsedBulkStudents.forEach(newSt => {
      const idx = merged.findIndex(st => st.id === newSt.id || st.name.trim().toLowerCase() === newSt.name.trim().toLowerCase());
      if (idx >= 0) {
        merged[idx] = { ...merged[idx], ...newSt }; // merge
      } else {
        merged.push(newSt);
      }
    });

    try {
      const batch = writeBatch(db);
      parsedBulkStudents.forEach(st => {
        batch.set(doc(db, "students", st.id), removeUndefinedFields(st));
      });
      await batch.commit();
      setStudents(merged);
      setShowBulkImportModal(false);
      setParsedBulkStudents([]);
      setBulkImportError("");
      triggerToast(lang === "km" 
        ? `បានទាញចូលទិន្នន័យនិស្សិតចំនួន ${parsedBulkStudents.length} នាក់ដោយជោគជ័យ!` 
        : `Successfully loaded ${parsedBulkStudents.length} student records!`);
    } catch (error) {
      console.error("Error importing students to Cloud:", error);
      triggerToast(lang === "km" ? "មានបញ្ហាក្នុងការរក្សាទុកទៅ Cloud" : "Error saving imported students to Cloud");
    }
  };

  // Trigger Toast Notification Helper
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const getFirebaseAuthErrorMessage = (error: unknown) => {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: string }).code) : "";
    if (code.includes("auth/invalid-email")) return lang === "km" ? "អ៊ីមែលមិនត្រឹមត្រូវ។" : "Invalid email address.";
    if (code.includes("auth/user-not-found") || code.includes("auth/wrong-password") || code.includes("auth/invalid-credential")) return t.wrongCreds || "Incorrect email or password.";
    if (code.includes("auth/too-many-requests")) return lang === "km" ? "ព្យាយាមចូលច្រើនដងពេក។ សូមព្យាយាមម្តងទៀតពេលក្រោយ។" : "Too many login attempts. Please try again later.";
    if (code.includes("auth/requires-recent-login")) return lang === "km" ? "សូមចេញ ហើយចូលវិញម្តងទៀត មុនពេលកែប្រែព័ត៌មានសំខាន់។" : "Please sign out and sign in again before changing sensitive account information.";
    if (code.includes("auth/weak-password")) return lang === "km" ? "លេខសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។" : "Password should be at least 6 characters.";
    if (code.includes("auth/email-already-in-use")) return lang === "km" ? "អ៊ីមែលនេះត្រូវបានប្រើរួចហើយ។" : "This email is already in use.";
    return lang === "km" ? "មានបញ្ហាជាមួយ Firebase Authentication។" : "Firebase Authentication error.";
  };

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setWrongCredsError("");
    try {
      await signInWithEmailAndPassword(auth, inputUsername.trim(), inputPassword);
      setInputUsername("");
      setInputPassword("");
      triggerToast(lang === "km" ? "ស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងសន្លឹកវត្តមាន RTTC!" : "Welcome to the RTTC Attendance management system!");
    } catch (error) {
      const message = getFirebaseAuthErrorMessage(error);
      setWrongCredsError(message);
      triggerToast(message);
    }
  };

  const openProfileModal = () => {
    if (!firebaseUser) return;
    setProfileUsername(firebaseUser.email || "");
    setProfileDisplayName(firebaseUser.displayName || "");
    setProfileEmail(firebaseUser.email || "");
    setProfileCurrentPassword("");
    setProfileNewPassword("");
    setProfileConfirmNewPassword("");
    setProfileError("");
    setShowProfileModal(true);
  };

  const handleUpdateProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !firebaseUser.email) {
      setProfileError(lang === "km" ? "មិនទាន់មានគណនី Firebase ចូលប្រព័ន្ធ។" : "No Firebase user is signed in.");
      return;
    }
    if (!profileEmail.trim()) {
      setProfileError(lang === "km" ? "ត្រូវបញ្ចូលអ៊ីមែល។" : "Email is required.");
      return;
    }

    const wantsEmailChange = profileEmail.trim() !== firebaseUser.email;
    const wantsPasswordChange = profileNewPassword.length > 0 || profileCurrentPassword.length > 0;

    if ((wantsEmailChange || wantsPasswordChange) && !profileCurrentPassword) {
      setProfileError(lang === "km" ? "សូមបញ្ចូលលេខសម្ងាត់បច្ចុប្បន្ន ដើម្បីប្តូរ Email ឬ Password។" : "Enter the current password to change email or password.");
      return;
    }
    if (wantsPasswordChange && !profileNewPassword.trim()) {
      setProfileError(lang === "km" ? "លេខកូដសម្ងាត់ថ្មីមិនអាចទទេបានឡើយ" : "New password cannot be empty.");
      return;
    }
    if (wantsPasswordChange && profileNewPassword !== profileConfirmNewPassword) {
      setProfileError(t.passwordsMismatch || "Passwords do not match.");
      return;
    }

    try {
      if (wantsEmailChange || wantsPasswordChange) {
        const credential = EmailAuthProvider.credential(firebaseUser.email, profileCurrentPassword);
        await reauthenticateWithCredential(firebaseUser, credential);
      }

      await updateProfile(firebaseUser, { displayName: profileDisplayName.trim() || null });
      if (wantsEmailChange) await updateEmail(firebaseUser, profileEmail.trim());
      if (wantsPasswordChange) await updatePassword(firebaseUser, profileNewPassword);

      setProfileCurrentPassword("");
      setProfileNewPassword("");
      setProfileConfirmNewPassword("");
      setProfileError("");
      setShowProfileModal(false);
      triggerToast(t.toastAdminUpdated || "Administrator profile updated successfully!");
    } catch (error) {
      setProfileError(getFirebaseAuthErrorMessage(error));
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = resetNewPassword.trim() || inputUsername.trim();
    if (!email) {
      setResetError(lang === "km" ? "សូមបញ្ចូលអ៊ីមែលរដ្ឋបាល។" : "Please enter the admin email address.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetError("");
      setResetNewPassword("");
      setResetConfirmPassword("");
      setAuthView("login");
      triggerToast(lang === "km" ? "បានផ្ញើតំណកំណត់លេខសម្ងាត់ទៅអ៊ីមែលរួចហើយ។" : "Password reset link sent to the admin email.");
    } catch (error) {
      setResetError(getFirebaseAuthErrorMessage(error));
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    triggerToast(lang === "km" ? "បានចាកចេញពីប្រព័ន្ធដោយជោគជ័យ" : "Successfully logged out from portal.");
  };

  // Quick State Toggler (Present/Absent-Permission/Absent-No-Permission)
  const toggleAttendanceStatus = async (studentId: string, currentStatus: AttendanceStatus) => {
    const todayStr = selectedDate;
    const recordId = `${studentId}-${todayStr}`;
    
    let nextStatus: AttendanceStatus = "Present";
    let updatedTime: string | undefined = "07:30 AM";
    if (currentStatus === "Present") {
      nextStatus = "Absent_Permission";
      updatedTime = undefined;
    } else if (currentStatus === "Absent_Permission") {
      nextStatus = "Absent_No_Permission";
      updatedTime = undefined;
    } else {
      nextStatus = "Present";
      updatedTime = "07:15 AM";
    }

    try {
      await setDoc(doc(db, "attendance", recordId), removeUndefinedFields({
        studentId,
        date: todayStr,
        status: nextStatus,
        checkInTime: updatedTime,
        verifiedByQR: false
      }));
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
        batch.set(recordRef, removeUndefinedFields({
          studentId: st.id,
          date: todayStr,
          status: "Present",
          checkInTime: "07:15 AM",
          verifiedByQR: false
        }));
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
    const query = searchQuery.toLowerCase();
    return (
      st.name.toLowerCase().includes(query) ||
      st.phoneNumber.includes(query) ||
      st.address.toLowerCase().includes(query) ||
      st.telegram.toLowerCase().includes(query)
    );
  });

  const totalCount = students.length;
  const presentCount = listToday.filter(s => s.status === "Present").length;
  const excusedCount = listToday.filter(s => s.status === "Absent_Permission").length;
  const absentCount = listToday.filter(s => s.status === "Absent_No_Permission").length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  // Student Simulation QR Check-In Event
  const executeSimulatedCheckIn = () => {
    if (!simulatedStudentId) {
      setSimScanResult({ success: false, message: lang === "km" ? "សូមជ្រើសរើសឈ្មោះនិស្សិត" : "Please select a student" });
      return;
    }

    const selectedSt = students.find(s => s.id === simulatedStudentId);
    if (!selectedSt) return;

    // Check Geofence Coordinates
    // RTTC: 12.0004658, 105.4645
    // Simulated coords:
    const studentLat = simulatedLocation === "inside" ? 11.9935 : 11.9212; // outside is 11.9212 (~8km away at Riverside Kampong Cham)
    const studentLng = simulatedLocation === "inside" ? 105.4646 : 105.4789;

    // Radius calculation distance
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // metres
      const φ1 = lat1 * Math.PI/180;
      const φ2 = lat2 * Math.PI/180;
      const Δφ = (lat2-lat1) * Math.PI/180;
      const Δλ = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

      return R * c; // in metres
    };

    const dist = calculateDistance(geofence.latitude, geofence.longitude, studentLat, studentLng);

    if (geofence.isEnabled && dist > geofence.radius) {
      setSimScanResult({
        success: false,
        message: lang === "km" 
          ? `បរាជ័យ៖ ទីតាំងរបស់អ្នកស្ថិតនៅចម្ងាយ ${Math.round(dist)}ម៉ែត្រ (ហួសដែនកំណត់ ${geofence.radius}ម៉ែត្រ)` 
          : `Rejected: You are ${Math.round(dist)}m away (limit is ${geofence.radius}m)`
      });
      triggerToast(t.toastLocationRestricted);
      return;
    }

    const todayStr = selectedDate;
    const recordId = `${simulatedStudentId}-${todayStr}`;
    
    // Save to state
    const updated = [...attendance];
    const existingIndex = updated.findIndex(r => r.id === recordId);
    
    const nowHours = new Date().getHours().toString().padStart(2, "0");
    const nowMins = new Date().getMinutes().toString().padStart(2, "0");
    const formattedCheckInTime = `${nowHours}:${nowMins} AM`;

    const newRecord: AttendanceRecord = {
      id: recordId,
      studentId: simulatedStudentId,
      date: todayStr,
      status: "Present",
      checkInTime: formattedCheckInTime,
      verifiedByQR: true,
      latitude: studentLat,
      longitude: studentLng
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = newRecord;
    } else {
      updated.push(newRecord);
    }

    setAttendance(updated);
    setSimScanResult({ 
      success: true, 
      message: lang === "km" 
        ? `ចុះវត្តមាន និស្សិត ${selectedSt.name} ជោគជ័យតាមកូដ QR ម៉ោង ${formattedCheckInTime}` 
        : `Check-in Successful for ${selectedSt.name} at ${formattedCheckInTime}` 
    });
    triggerToast(t.toastCheckin);
  };

  // Excel / CSV Export
  const handleExportCSV = () => {
    // CSV Header representation
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

  // Handle direct check-in of student from the QR Code scan landing page
  const handleStudentDirectCheckIn = async (isSimulatedOverride: boolean) => {
    if (!studentCheckInId) {
      triggerToast(lang === "km" ? "សូមជ្រើសរើសឈ្មោះរបស់អ្នកជាមុនសិន!" : "Please select your name first!");
      return;
    }

    const selectedSt = students.find(s => s.id === studentCheckInId);
    if (!selectedSt) return;

    const todayStr = new Date().toISOString().split("T")[0]; // Use real current date for live check-in
    const recordId = `${studentCheckInId}-${todayStr}`;

    const nowHours = new Date().getHours();
    const nowMins = new Date().getMinutes().toString().padStart(2, "0");
    const ampm = nowHours >= 12 ? "PM" : "AM";
    const displayHours = (nowHours % 12 || 12).toString().padStart(2, "0");
    const formattedCheckInTime = `${displayHours}:${nowMins} ${ampm}`;

    const updated = [...attendance];
    const existingIndex = updated.findIndex(r => r.id === recordId);

    const checkInRecord: AttendanceRecord = {
      id: recordId,
      studentId: studentCheckInId,
      date: todayStr,
      status: "Present",
      checkInTime: formattedCheckInTime,
      verifiedByQR: true,
      latitude: isSimulatedOverride ? geofence.latitude : (studentGPSData?.lat || geofence.latitude),
      longitude: isSimulatedOverride ? geofence.longitude : (studentGPSData?.lng || geofence.longitude)
    };

    if (existingIndex >= 0) {
      updated[existingIndex] = checkInRecord;
    } else {
      updated.push(checkInRecord);
    }

    try {
      await setDoc(doc(db, "attendance", recordId), removeUndefinedFields(checkInRecord));
      setAttendance(updated);
      setCheckInSuccessDetails({
        studentName: selectedSt.name,
        time: formattedCheckInTime,
        date: todayStr
      });
      triggerToast(lang === "km" ? "✓ ការចុះវត្តមានផ្ទៀងផ្ទាត់ដោយជោគជ័យ!" : "✓ QR Attendance verified and submitted!");
    } catch (error) {
      console.error("Error submitting QR check-in to Cloud:", error);
      triggerToast(lang === "km" ? "មានបញ្ហាក្នុងការផ្ញើវត្តមានទៅ Cloud" : "Error submitting attendance to Cloud");
    }
  };

  // Render direct Student portal landing page layout
  const renderStudentCheckInGate = () => {
    const filteredSearch = students.filter(s => 
      s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
      s.phoneNumber.includes(studentSearchQuery)
    );

    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col justify-between" id="student-gate-portal">
        <div className="h-1.5 w-full bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500"></div>
        
        {/* Top Header with Lang selector */}
        <div className="max-w-md w-full mx-auto px-4 pt-6 flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono">LIVE ENROLL GATE</span>
          </div>
          
          <button
            onClick={() => setLang(lang === "km" ? "en" : "km")}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-705 border border-slate-700/60 rounded-xl text-xs font-bold text-teal-400 transition-all flex items-center gap-1"
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            {lang === "km" ? "English" : "ភាសាខ្មែរ"}
          </button>
        </div>

        {/* Core Check-In Center */}
        <div className="max-w-md w-full mx-auto p-4 flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!checkInSuccessDetails ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-slate-800 border border-slate-700/80 rounded-3xl p-6 shadow-2xl space-y-5"
              >
                {/* Logo and Class Header */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-slate-700/50 border border-slate-600 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white tracking-tight leading-snug">
                      {t.studentCheckInGate || "RTTC R01 Attendance Portal"}
                    </h1>
                    <p className="text-xs text-slate-400 mt-1">
                      {lang === "km" 
                        ? "វិទ្យាស្ថានជាតិគរុកោសល្យភូមិភាគកំពង់ចាម (RTTC)" 
                        : "Regional Teacher Training Center, Kampong Cham"}
                    </p>
                  </div>
                </div>

                {/* Step 1: Search and Select Name */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-extrabold text-teal-400 uppercase tracking-wider text-[11px]">
                    {lang === "km" ? "១. ស្វែងរក និងជ្រើសរើសឈ្មោះរបស់អ្នក ៖" : "1. Search and Select Your Name :"}
                  </label>
                  
                  {/* Inline search bar */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      placeholder={lang === "km" ? "វាយឈ្មោះដើម្បីស្វែងរក..." : "Type to filter name..."}
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 bg-slate-900/80 border border-slate-700 focus:border-teal-400 rounded-xl text-xs sm:text-sm text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-teal-400/20 transition-all font-sans"
                    />
                    {studentSearchQuery && (
                      <button
                        onClick={() => setStudentSearchQuery("")}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filtered list with items checkmark */}
                  <div className="max-h-48 overflow-y-auto border border-slate-700/60 rounded-xl bg-slate-900/40 divide-y divide-slate-800 scrollbar-none">
                    {filteredSearch.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 italic">
                        {lang === "km" ? "រកមិនឃើញឈ្មោះនិស្សិតទេ" : "No matching student profiles found"}
                      </div>
                    ) : (
                      filteredSearch.map(st => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setStudentCheckInId(st.id);
                            setStudentSearchQuery(st.name); // lock-in name
                          }}
                          className={`w-full p-3 text-left transition-all hover:bg-slate-800 text-xs sm:text-sm flex justify-between items-center ${studentCheckInId === st.id ? "bg-teal-500/10 text-teal-300 font-bold" : "text-slate-300"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${st.isMonitor ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`}></span>
                            <span>{st.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">({st.gender === "Female" || st.gender === "ស្រី" ? (lang === "km" ? "ស្រី" : "F") : (lang === "km" ? "ប្រុស" : "M")})</span>
                          </div>
                          {studentCheckInId === st.id && (
                            <Check className="w-4 h-4 text-teal-400" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Step 2: Location Fence Verification */}
                <div className="p-4 bg-slate-900/60 border border-slate-700/50 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-teal-400 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-teal-400" />
                      {lang === "km" ? "២. ផ្ទៀងផ្ទាត់ទីតាំង GPS ៖" : "2. Geolocation Control :"}
                    </span>
                    
                    {/* Trigger Check Position Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setStudentGPSStatus("checking");
                        if (!navigator.geolocation) {
                          setStudentGPSStatus("iframe-fallback");
                          setStudentGPSMessage("GPS not supported on your browser.");
                          return;
                        }
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            const { latitude, longitude } = pos.coords;
                            setStudentGPSData({ lat: latitude, lng: longitude });
                            const dist = calculateDistance(geofence.latitude, geofence.longitude, latitude, longitude);
                            setStudentGPSDistance(dist);
                            if (geofence.isEnabled && dist > geofence.radius) {
                              setStudentGPSStatus("denied");
                              setStudentGPSMessage(lang === "km" 
                                ? `✗ បរាជ័យ៖ ទីតាំងរបស់អ្នកនៅចម្ងាយ ${Math.round(dist)}ម៉ែត្រ (ហួសដែនកំណត់ ${geofence.radius}ម៉ែត្រ)`
                                : `✗ Location Denied: You are ${Math.round(dist)}m away (limit is ${geofence.radius}m)`);
                            } else {
                              setStudentGPSStatus("allowed");
                              setStudentGPSMessage(lang === "km" ? "✓ ទីតាំងត្រឹមត្រូវ៖ ស្ថិតក្នុងសាលា RTTC" : "✓ Within Kampong Cham RTTC boundary");
                            }
                          },
                          (err) => {
                            console.warn("GPS request denied:", err);
                            setStudentGPSStatus("iframe-fallback");
                            setStudentGPSMessage("Unable to access browser GPS coordinates inside container/iframe sandbox.");
                          },
                          { enableHighAccuracy: true, timeout: 5000 }
                        );
                      }}
                      className="text-[10px] font-bold text-teal-400 hover:text-teal-300 underline"
                    >
                      {lang === "km" ? "↺ ស្កេនរកទីតាំងឡើងវិញ" : "↺ Recalculate GPS"}
                    </button>
                  </div>

                  {/* Status Indicator */}
                  <div className={`p-2.5 rounded-xl border text-[11px] font-bold text-center ${
                    studentGPSStatus === "checking" ? "bg-slate-800/80 border-slate-700 text-slate-400" :
                    studentGPSStatus === "allowed" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                    studentGPSStatus === "denied" ? "bg-rose-500/10 border-rose-500/30 text-rose-300" :
                    "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  }`}>
                    {studentGPSStatus === "checking" && (
                      <div className="flex items-center justify-center gap-1.5 py-0.5">
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                        <span>{t.checkingStatus || "Checking GPS location..."}</span>
                      </div>
                    )}
                    {studentGPSStatus !== "checking" && (
                      <p className="leading-snug">{studentGPSMessage}</p>
                    )}
                  </div>

                  {/* Iframe fallback details */}
                  {studentGPSStatus === "iframe-fallback" && (
                    <p className="text-[10px] text-slate-400/80 text-center leading-relaxed">
                      {lang === "km"
                        ? "ចំណាំ៖ ឧបករណ៍រុករករបស់អ្នកអាចនឹងទប់ស្កាត់ការទាញទីតាំងក្នុងប្រអប់ Iframe។ អ្នកអាចចុះវត្តមានសាកល្បងបានជោគជ័យ។"
                        : "Notice: GPS permission is disabled inside sandbox browser frames. Free simulator bypass operates successfully."}
                    </p>
                  )}
                </div>

                {/* Confirm Action Submit Buttons */}
                <div className="space-y-2 pt-2">
                  {geofence.isEnabled && studentGPSStatus === "denied" ? (
                    <div className="p-3 bg-slate-900 border border-rose-950 rounded-xl text-center text-xs font-semibold text-rose-400 leading-normal">
                      {lang === "km" 
                        ? `ចុះវត្តមានត្រូវបានបដិសេធ៖ ចម្ងាយរបស់អ្នកគឺ ${studentGPSDistance !== null ? Math.round(studentGPSDistance) : "?"}ម៉ែត្រ ឆ្ងាយជាងដែនកំណត់របស់សាលារៀន។`
                        : `Check-In Blocked: You are ${studentGPSDistance !== null ? Math.round(studentGPSDistance) : "?"}m away from the campus hub config.`}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={!studentCheckInId}
                      onClick={() => handleStudentDirectCheckIn(false)}
                      className={`w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${!studentCheckInId ? "bg-slate-705 text-slate-500 cursor-not-allowed" : "bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold"}`}
                    >
                      <Check className="w-4.5 h-4.5 text-slate-950" />
                      {t.confirmCheckInBtn || "Confirm & Submit Check-In"}
                    </button>
                  )}

                  {/* Fallback check-in button (Guarantees testing in developer preview or blocked permissions) */}
                  <button
                    type="button"
                    disabled={!studentCheckInId}
                    onClick={() => handleStudentDirectCheckIn(true)}
                    className="w-full py-2.5 bg-slate-805 hover:bg-slate-750 border border-slate-700/60 text-slate-300 hover:text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    {t.simCheckInBtn || "Bypass / Simulate Coordinate Check-In"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-slate-800 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-5 text-center"
              >
                {/* Check-In Success Victory Display */}
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                  <Check className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold text-white">
                    {lang === "km" ? "ចុះវត្តមានបានសម្រេច!" : "Check-in Successful!"}
                  </h2>
                  <p className="text-xs text-slate-400 leading-snug">
                    {lang === "km" 
                      ? "ទិន្នន័យវត្តមានរបស់អ្នកត្រូវបានកត់ត្រាក្នុងបញ្ជីសាលាភាសាបច្ចេកវិទ្យា RTTC កំពង់ចាម" 
                      : "Your attendance was submitted successfully to RTTC Kampong Cham registry."}
                  </p>
                </div>

                {/* Details Table */}
                <div className="p-4 bg-slate-900/60 border border-slate-700/60 rounded-2xl space-y-2.5 text-left text-xs text-slate-300 font-sans">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">{lang === "km" ? "ឈ្មោះនិស្សិត :" : "Student Name :"}</span>
                    <span className="text-emerald-400 font-extrabold">{checkInSuccessDetails.studentName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">{lang === "km" ? "កាលបរិច្ឆេទ :" : "Date :"}</span>
                    <span className="text-white font-semibold">{checkInSuccessDetails.date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase tracking-wider">{lang === "km" ? "ម៉ោងចុះឈ្មោះ :" : "Arrival Check-in Time :"}</span>
                    <span className="text-emerald-400 font-extrabold">{checkInSuccessDetails.time}</span>
                  </div>
                </div>

                {/* Back to direct portal selector */}
                <button
                  onClick={() => {
                    setCheckInSuccessDetails(null);
                    setStudentCheckInId("");
                    setStudentSearchQuery("");
                  }}
                  className="w-full py-3 bg-slate-705 hover:bg-slate-650 text-white rounded-xl font-bold text-xs"
                >
                  {lang === "km" ? "ចុះវត្តមានសិស្សផ្សេងទៀត" : "Check-in another student"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info text */}
        <div className="text-center pb-6 max-w-md w-full mx-auto px-4 space-y-1">
          <p className="text-[10px] text-slate-500">
            {lang === "km" 
              ? "© រក្សាសិទ្ធិគ្រប់យ៉ាង ២០២៦ - គណៈគ្រប់គ្រង RTTC កំពង់ចាម" 
              : "© Copyright 2026 - Regional Teacher Training Center (RTTC)"}
          </p>
          <p className="text-[9px] text-emerald-400 font-bold tracking-wider uppercase">
            RTTC Secure System Active
          </p>
        </div>
      </div>
    );
  };

  // Student Admin Form Submission
  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.phoneNumber || !studentForm.address) {
      triggerToast(t.toastFieldsRequired);
      return;
    }

    const executeSave = async () => {
      try {
        if (editingStudentId) {
          // Edit mode
          const updatedStudent: Student = { id: editingStudentId, ...studentForm };
          await setDoc(doc(db, "students", editingStudentId), removeUndefinedFields(updatedStudent));
          const updated = students.map(s => s.id === editingStudentId ? updatedStudent : s);
          setStudents(updated);
          setEditingStudentId(null);
          triggerToast(t.toastSaved);
        } else {
          // Add mode
          const newStudent: Student = {
            id: `s-${Date.now()}`,
            ...studentForm
          };
          await setDoc(doc(db, "students", newStudent.id), removeUndefinedFields(newStudent));
          setStudents([...students, newStudent]);
          triggerToast(t.toastSaved);
        }

        // Reset Form
        setStudentForm({
          name: "",
          gender: "ប្រុស",
          dob: "2004-01-01",
          address: "",
          phoneNumber: "",
          telegram: "",
          isMonitor: false
        });
        setShowAddForm(false);
      } catch (error) {
        console.error("Error saving student to Cloud:", error);
        triggerToast(lang === "km" ? "មានបញ្ហាក្នុងការរក្សាទុកទៅ Cloud" : "Error saving student to Cloud");
      }
    };

    if (editingStudentId) {
      setConfirmModal({
        isOpen: true,
        title: lang === "km" ? "រក្សាទុកការកែប្រែព័ត៌មាន" : "Save Student Profile Edits",
        message: lang === "km" 
          ? `តើអ្នកចង់រក្សាទុកការផ្លាស់ប្តូរ និងកែប្រែព័ត៌មានរបស់និស្សិត "${studentForm.name}" ដែរឬទេ?`
          : `Are you sure you want to save the changes made to the profile of student "${studentForm.name}"?`,
        type: "edit",
        actionLabel: lang === "km" ? "យល់ព្រមរក្សាទុក" : "Save Changes",
        cancelLabel: lang === "km" ? "បោះបង់" : "Cancel",
        onConfirm: async () => {
          await executeSave();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      });
    } else {
      executeSave();
    }
  };

  const handleEditInit = (student: Student) => {
    setEditingStudentId(student.id);
    setStudentForm({
      name: student.name,
      gender: student.gender,
      dob: student.dob,
      address: student.address,
      phoneNumber: student.phoneNumber,
      telegram: student.telegram,
      isMonitor: !!student.isMonitor
    });
    setShowAddForm(true);
  };

  const handleDeleteStudent = (id: string) => {
    const studentToDelete = students.find(s => s.id === id);
    if (!studentToDelete) return;

    setConfirmModal({
      isOpen: true,
      title: lang === "km" ? "លុបឈ្មោះសិស្ស" : "Delete Student Profile",
      message: lang === "km"
        ? `តើអ្នកពិតជាចង់លុបឈ្មោះ "${studentToDelete.name}" ចេញពីប្រព័ន្ធមែនទេ? សកម្មភាពនេះមិនអាចសង្គ្រោះវិញបានឡើយ!`
        : `Are you sure you want to delete "${studentToDelete.name}" from the database? This action is permanent and cannot be undone!`,
      type: "delete",
      actionLabel: lang === "km" ? "យល់ព្រមលុប" : "Confirm Delete",
      cancelLabel: lang === "km" ? "បោះបង់" : "Cancel",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "students", id));
          setStudents(prev => prev.filter(s => s.id !== id));
          triggerToast(t.toastDeleted);
        } catch (error) {
          console.error("Error deleting student from Cloud:", error);
          triggerToast(lang === "km" ? "មានបញ្ហាក្នុងការលុបពី Cloud" : "Error deleting student from Cloud");
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  if (isStudentCheckInView) {
    return renderStudentCheckInGate();
  }

  if (isAuthLoading && !isStudentCheckInView) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 text-center text-sm font-bold text-slate-700">
          {lang === "km" ? "កំពុងពិនិត្យ Firebase Authentication..." : "Checking Firebase Authentication..."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-800 font-sans leading-relaxed selection:bg-emerald-500 selection:text-white" id=" rttc-app">
      
      {/* Visual Brand Banner & Top Progress Accent */}
      <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-teal-500 via-emerald-600 to-amber-500 shadow-sm"></div>

      {/* Dynamic Toast Feedback element */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -25, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-slate-800 dark:border-slate-700 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 max-w-lg text-center"
            id="toast-rttc"
          >
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping"></div>
            <span className="text-sm font-semibold tracking-wide">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popular Gradient Confirm Dynamic Popup Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-tr from-[#0b0f19]/90 via-[#111827]/85 to-[#064e4b]/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white rounded-3xl border border-slate-100 max-w-md w-full p-6 shadow-2xl relative space-y-5 overflow-hidden font-sans"
            >
              {/* Highlight gradient line at top */}
              <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                confirmModal.type === "delete" 
                  ? "bg-gradient-to-r from-red-500 to-rose-600 animate-pulse" 
                  : confirmModal.type === "edit"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                    : "bg-gradient-to-r from-amber-500 to-yellow-500"
              }`} />

              <div className="flex flex-col items-center text-center space-y-4 pt-2">
                {/* Custom animated Icon wrappers */}
                {confirmModal.type === "delete" ? (
                  <div className="p-4 bg-red-50 rounded-full text-red-650 ring-8 ring-red-50/50 border border-red-100 flex items-center justify-center animate-bounce">
                    <Trash2 className="w-8 h-8" />
                  </div>
                ) : confirmModal.type === "edit" ? (
                  <div className="p-4 bg-emerald-50 rounded-full text-emerald-600 ring-8 ring-emerald-50/50 border border-emerald-100 flex items-center justify-center animate-pulse">
                    <Save className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-full text-amber-600 ring-8 ring-amber-50/50 border border-amber-100 flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                )}

                <div className="space-y-1.5 px-2">
                  <h4 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                    {confirmModal.title}
                  </h4>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    {confirmModal.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons with high standard interactive design & hover scale-ups */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all duration-300 hover:scale-[1.03] select-none flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <X className="w-3.5 h-3.5" />
                  {confirmModal.cancelLabel}
                </button>
                <button
                  type="button"
                  onClick={confirmModal.onConfirm}
                  className={`w-full py-2.5 text-white rounded-xl text-xs font-bold transition-all duration-300 hover:scale-[1.03] select-none flex items-center justify-center gap-1.5 active:scale-95 shadow-md ${
                    confirmModal.type === "delete"
                      ? "bg-red-600 hover:bg-red-500 hover:shadow-red-200"
                      : confirmModal.type === "edit"
                        ? "bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-200"
                        : "bg-amber-500 hover:bg-amber-600 hover:shadow-amber-200"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {confirmModal.actionLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV Bulk Student Import Dialog */}
      <AnimatePresence>
        {showBulkImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl relative space-y-5 my-8"
            >
              <button
                onClick={() => {
                  setShowBulkImportModal(false);
                  setParsedBulkStudents([]);
                }}
                className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <FileSpreadsheet className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {lang === "km" ? "នាំចូលនិស្សិតជាច្រើននាក់ក្នុងពេលតែមួយ" : "Bulk Student Excel/CSV Import"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === "km" ? "ទាញយកគំរូ CSV បំពេញព័ត៌មាន រួចបោះចូលប្រព័ន្ធវិញ" : "Download the spreadsheet pattern, input details, and import in bulk."}
                  </p>
                </div>
              </div>

              {/* Step 1: Download Template */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl gap-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    {lang === "km" ? "១. ទាញយកតារាងExcelគំរូ ៖" : "1. Download Excel/CSV Model Template :"}
                  </span>
                  <p className="text-[11px] text-slate-500 font-sans">
                    {lang === "km" ? "តារាងគំរូមានតម្រូវការជួរឈរយោងត្រឹមត្រូវ និងទម្រង់ពុម្ពអក្សរខ្មែរ" : "This preset contains appropriate headers and supports Khmer characters (UTF-8)."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCSVTemplate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0 font-sans"
                >
                  <Download className="w-4 h-4" />
                  {lang === "km" ? "ទាញយកគំរូ CSV" : "Download Template .CSV"}
                </button>
              </div>

              {/* Step 2: Drag & Drop Zone */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-slate-800 block">
                  {lang === "km" ? "២. ជ្រើសរើស ឬអូសឯកសារ CSV បញ្ចូលទីនេះ ៖" : "2. Drop or Browse Completed CSV File :"}
                </span>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center cursor-pointer ${
                    dragActive 
                      ? "border-emerald-500 bg-emerald-50/40" 
                      : parsedBulkStudents.length > 0
                        ? "border-emerald-200 bg-slate-50/40"
                        : "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                  onClick={() => document.getElementById("file-csv-picker")?.click()}
                >
                  <input
                    type="file"
                    id="file-csv-picker"
                    className="hidden"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  
                  <FileSpreadsheet className={`w-10 h-10 mb-2 ${parsedBulkStudents.length > 0 ? "text-emerald-500 animate-bounce" : "text-slate-400"}`} />
                  
                  {parsedBulkStudents.length > 0 ? (
                    <div className="space-y-1 text-center">
                      <span className="text-xs font-bold text-emerald-800 block">
                        {lang === "km" ? `ស្រង់បាននិស្សិតជោគជ័យចំនួន ${parsedBulkStudents.length} នាក់!` : `Found ${parsedBulkStudents.length} valid students candidate!`}
                      </span>
                      <span className="text-[10px] text-slate-405">
                        {lang === "km" ? "សូមត្រួតពិនិត្យតារាងខាងក្រោមមុនបញ្ជាក់" : "Review the loaded grid preview below before confirming."}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1 text-center">
                      <span className="text-xs font-bold text-slate-700 block">
                        {lang === "km" ? "អូសឯកសារ CSV ទម្លាក់ទីនេះ ឬចុចដើម្បីស្វែងរក" : "Drag & Drop Completed CSV file here, or click to browse"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {lang === "km" ? "ឯកសារដែលបញ្ចូលគួរសរសេរតាមទម្រង់គំរូខាងលើ" : "Only valid utf-8 formatted .csv list files are accepted."}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Review Preview Table */}
              {parsedBulkStudents.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-extrabold text-slate-800 block">
                    {lang === "km" ? "៣. តារាងពិនិត្យគំរូដំបូង ៖" : "3. Student Listing Preview Grid :"}
                  </span>
                  
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-100 border-b border-slate-200 text-slate-500 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 pl-3">ID</th>
                          <th className="p-2">{lang === "km" ? "ឈ្មោះ" : "Name"}</th>
                          <th className="p-2">{lang === "km" ? "ភេទ" : "Gender"}</th>
                          <th className="p-2">{lang === "km" ? "លេខទូរស័ព្ទ" : "Phone"}</th>
                          <th className="p-2">{lang === "km" ? "តួនាទី" : "Is Monitor"}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedBulkStudents.slice(0, 10).map((st, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 pl-3 font-mono text-slate-400 text-[10px]">{st.id || `AUTO_ID_${idx}`}</td>
                            <td className="p-2 font-bold text-slate-800">{st.name}</td>
                            <td className="p-2 text-slate-600">{st.gender}</td>
                            <td className="p-2 text-slate-500 font-mono text-[10px]">{st.phoneNumber || "-"}</td>
                            <td className="p-2 text-slate-500">
                              {st.isMonitor ? (
                                <span className="bg-amber-100 text-amber-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                  {lang === "km" ? "ប្រធានថ្នាក់" : "Monitor"}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedBulkStudents.length > 10 && (
                    <span className="text-[10px] text-slate-400 italic block text-right">
                      {lang === "km" ? `... និង ${parsedBulkStudents.length - 10} នាក់ផ្សេងទៀត` : `... and ${parsedBulkStudents.length - 10} other student columns.`}
                    </span>
                  )}
                </div>
              )}

              {/* Step 4: Confirm Action Controls */}
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkImportModal(false);
                    setParsedBulkStudents([]);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-250 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  {lang === "km" ? "បដិសេធ" : "Discard"}
                </button>
                <button
                  type="button"
                  disabled={parsedBulkStudents.length === 0}
                  onClick={handleConfirmBulkImport}
                  className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                    parsedBulkStudents.length === 0
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  {lang === "km" ? `បញ្ចូលទាំងស្រុង (${parsedBulkStudents.length} នាក់)` : `Confirm Import All (${parsedBulkStudents.length})`}
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Profile Details & Password Management Dialog */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-8"
              id="admin-profile-modal"
            >
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title={t.cancel}
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-6 flex items-center gap-3">
                <div className="w-11 h-11 bg-teal-50 border border-teal-100 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{t.adminInfoTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{t.adminInfoSubtitle}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfileSubmit} className="space-y-4">
                {profileError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
                    {profileError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Display Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {t.adminFullName}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={profileDisplayName}
                        onChange={(e) => setProfileDisplayName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-bold transition-all"
                      />
                    </div>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      {t.adminEmailLabel}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={profileUsername}
                        onChange={(e) => setProfileUsername(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t.adminEmailLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-sans transition-all"
                    />
                  </div>
                </div>

                {/* Change Password Block Divider */}
                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-extrabold text-teal-700 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-teal-600" />
                    {t.changePasswordHeading}
                  </h4>

                  <div className="space-y-3">
                    {/* Current Password validation */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {t.currentPasswordLabel} <span className="text-slate-400 font-normal">({lang === "km" ? "បញ្ចូលដើម្បីប្តូរ ឬទុកទទេបើមិនចង់ប្តូរ" : "needed for pass change"})</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type="password"
                          placeholder={lang === "km" ? "លេខកូដសម្ងាត់បច្ចុប្បន្ន" : "Current password"}
                          value={profileCurrentPassword}
                          onChange={(e) => setProfileCurrentPassword(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* New Password */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {t.newPassword}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Key className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            placeholder={lang === "km" ? "លេខកូដសិ្ងាត់ថ្មី" : "New password"}
                            value={profileNewPassword}
                            onChange={(e) => setProfileNewPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono transition-all"
                          />
                        </div>
                      </div>

                      {/* Confirm New Password */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          {t.confirmNewPassword}
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Check className="w-4 h-4" />
                          </div>
                          <input
                            type="password"
                            placeholder={lang === "km" ? "បញ្ជាក់លេខកូដថ្មី" : "Confirm new password"}
                            value={profileConfirmNewPassword}
                            onChange={(e) => setProfileConfirmNewPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed">
                  {lang === "km" ? "លេខសម្ងាត់ត្រូវបានគ្រប់គ្រងដោយ Firebase Authentication។ មិនមានលេខសម្ងាត់ដើមនៅក្នុង Source Code ទៀតទេ។" : "Password is managed by Firebase Authentication. No default password is stored in the source code."}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-slate-900 hover:bg-teal-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-4 h-4 text-white" />
                    {t.btnUpdateProfile}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto my-12" id="auth-gate-wrapper">
            {/* Lang selection for Login screen */}
            <div className="flex justify-end gap-2 mb-6">
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80 shadow-xs">
                <button
                  onClick={() => setLang("km")}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition-all ${lang === "km" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  ខ្មែរ
                </button>
                <button
                  onClick={() => setLang("en")}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition-all ${lang === "en" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Auth Cards */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-md"
              id="auth-card"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl border border-emerald-150 flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm animate-pulse">
                  {authView === "reset" ? (
                    <Key className="w-8 h-8" />
                  ) : authView === "forgot" ? (
                    <HelpCircle className="w-8 h-8" />
                  ) : (
                    <Lock className="w-8 h-8" />
                  )}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                  {authView === "login" && t.authTitle}
                  {authView === "forgot" && t.forgotPass}
                  {authView === "reset" && t.resetPassTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 px-2">
                  {authView === "login" && t.authSubtitle}
                  {authView === "forgot" && t.forgotPassInstruct}
                  {authView === "reset" && t.resetInstruct}
                </p>
              </div>

              {/* VIEW 1: LOGIN MODE */}
              {authView === "login" && (
                <form onSubmit={handleAdminSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">{lang === "km" ? "អ៊ីមែល" : "Email"}</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Users className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder={lang === "km" ? "ឧទាហរណ៍៖ admin@example.com" : "e.g. admin@example.com"}
                        value={inputUsername}
                        onChange={(e) => setInputUsername(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest">{t.password}</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthView("forgot");
                          setWrongCredsError("");
                        }}
                        className="text-xs font-extrabold text-emerald-600 hover:text-emerald-700 hover:underline transition-all font-sans"
                      >
                        {t.forgotPass}
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={inputPassword}
                        onChange={(e) => setInputPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono transition-all"
                      />
                    </div>
                  </div>

                  {wrongCredsError && (
                    <div className="p-3 bg-rose-50 border border-rose-200/85 text-xs text-rose-700 font-semibold rounded-xl text-center">
                      {wrongCredsError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <LogIn className="w-4 h-4 text-white" />
                    {t.signIn}
                  </button>

                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-2xl text-center text-[11px] text-slate-500 leading-relaxed font-sans">
                    <strong>Firebase Auth:</strong> Email / Password
                  </div>
                </form>
              )}

              {/* VIEW 2: FORGOT VIEW */}
              {authView === "forgot" && (
                <div className="space-y-5">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5">
                    <p className="font-sans leading-relaxed text-slate-650">
                      {lang === "km" ? "បញ្ចូលអ៊ីមែលគណនី Admin Firebase ដើម្បីទទួលតំណកំណត់លេខសម្ងាត់ថ្មី។" : "Enter the Firebase admin email to receive a password reset link."}
                    </p>
                  </div>

                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1">
                        {lang === "km" ? "អ៊ីមែល Admin" : "Admin Email"}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="email"
                          required
                          placeholder={lang === "km" ? "ឧទាហរណ៍៖ admin@example.com" : "e.g. admin@example.com"}
                          value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-sans transition-all"
                        />
                      </div>
                    </div>

                    {resetError && (
                      <div className="p-3 bg-rose-50 border border-rose-200/85 text-xs text-rose-700 font-bold rounded-xl text-center">
                        {resetError}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <button
                        type="submit"
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
                      >
                        <RefreshCw className="w-4 h-4 text-white" />
                        {lang === "km" ? "ផ្ញើតំណកំណត់លេខសម្ងាត់" : "Send Password Reset Link"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthView("login");
                          setWrongCredsError("");
                          setResetError("");
                        }}
                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-4 h-4 text-slate-600" />
                        {t.backToLogin}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        ) : (
          <>
            {/* Hub Header Section */}
            <header className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2">
              <span className="text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                RTTC Kampong Cham
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold uppercase bg-slate-100 text-slate-600 border border-slate-205">
                {t.classLabel} <strong className="text-slate-900">R01</strong>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold text-amber-800 bg-amber-50 border border-amber-200/60">
                {t.monitorLabel} <strong className="text-amber-900">អ៊ាន ប៉េងអ៊ាង</strong>
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold text-teal-800 bg-teal-50 border border-teal-200/60 inline-flex items-center gap-1">
                <User className="w-3 h-3 text-teal-600" />
                <span className="font-bold">{adminDisplayName} ({adminEmail})</span>
              </span>
            </div>

            <h1 className="text-3xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Compass className="w-8 h-8 text-emerald-600" />
              {t.title}
            </h1>
            <p className="text-slate-500 text-sm mt-1 mb-1">
              {t.subtitle}
            </p>
          </div>

          {/* Quick Config Controls */}
          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto" id="control-panel">
            {/* Lang Selection Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner">
              <button
                onClick={() => setLang("km")}
                className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${lang === "km" ? "bg-white text-emerald-800 shadow-sm scale-102" : "text-slate-400 hover:text-slate-600"}`}
                id="rttc-switcher-km"
              >
                ខ្មែរ (KM)
              </button>
              <button
                onClick={() => setLang("en")}
                className={`text-xs px-3 py-2 rounded-lg font-bold transition-all ${lang === "en" ? "bg-white text-emerald-800 shadow-sm scale-102" : "text-slate-400 hover:text-slate-600"}`}
                id="rttc-switcher-en"
              >
                EN
              </button>
            </div>
            
            {/* Admin Profile/Settings Button */}
            <button
              onClick={openProfileModal}
              className="px-4 py-3 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              id="header-btn-admin-profile"
            >
              <Settings className="w-4 h-4 text-teal-600 animate-spin-slow" />
              {t.adminSettings}
            </button>

            {/* CSV Quick Download */}
            <button
              onClick={handleExportCSV}
              className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              id="header-btn-export"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {t.exportCSV}
            </button>

            {/* Logout Action Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              id="header-btn-logout"
            >
              <LogOut className="w-4 h-4 text-red-650" />
              {t.logout}
            </button>
          </div>
        </header>

        {/* STATISTICAL OVERVIEW BENTO ROW */}
        <section className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6" id="rttc-stats-bento">
          
          <div className="bg-white border border-slate-200 hover:border-slate-400 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer group hover:bg-gradient-to-br hover:from-white hover:to-slate-50/50">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider group-hover:text-slate-600 transition-colors">{t.totalStudents}</span>
            <div className="flex items-baseline gap-1.5 pt-2">
              <span className="text-3xl font-extrabold text-slate-900 group-hover:scale-105 transition-transform origin-left duration-300">{totalCount}</span>
              <span className="text-xs text-slate-400">{lang === "km" ? "នាក់" : "students"}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-slate-900 h-full w-full group-hover:bg-slate-700 transition-colors"></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 hover:border-emerald-400 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer group hover:bg-gradient-to-br hover:from-white hover:to-emerald-50/25">
            <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider group-hover:text-emerald-700 transition-colors">{t.presentCount}</span>
            <div className="flex items-baseline gap-1.5 pt-2">
              <span className="text-3xl font-extrabold text-emerald-600 group-hover:scale-105 transition-transform origin-left duration-300">{presentCount}</span>
              <span className="text-xs text-slate-400">/{totalCount}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${totalCount > 0 ? (presentCount/totalCount)*100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 hover:border-amber-400 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer group hover:bg-gradient-to-br hover:from-white hover:to-amber-50/25">
            <span className="text-xs text-amber-600 font-bold uppercase tracking-wider group-hover:text-amber-700 transition-colors">{t.excusedCount}</span>
            <div className="flex items-baseline gap-1.5 pt-2">
              <span className="text-3xl font-extrabold text-amber-600 group-hover:scale-105 transition-transform origin-left duration-300">{excusedCount}</span>
              <span className="text-xs text-slate-400">/{totalCount}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${totalCount > 0 ? (excusedCount/totalCount)*100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 hover:border-rose-400 p-4 rounded-2xl shadow-xs flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer group hover:bg-gradient-to-br hover:from-white hover:to-rose-50/25 col-span-1">
            <span className="text-xs text-rose-500 font-bold uppercase tracking-wider group-hover:text-rose-600 transition-colors">{t.absentCount}</span>
            <div className="flex items-baseline gap-1.5 pt-2">
              <span className="text-3xl font-extrabold text-rose-600 group-hover:scale-105 transition-transform origin-left duration-300">{absentCount}</span>
              <span className="text-xs text-slate-400">/{totalCount}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${totalCount > 0 ? (absentCount/totalCount)*100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 hover:from-slate-900 hover:to-indigo-800 p-4 rounded-2xl shadow-xs flex flex-col justify-between col-span-2 md:col-span-1 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg cursor-pointer group">
            <span className="text-xs text-indigo-200 font-bold uppercase tracking-wider group-hover:text-indigo-100 transition-colors">{t.attendanceRate}</span>
            <div className="flex items-baseline gap-1 pt-2">
              <span className="text-3xl font-extrabold tracking-tight group-hover:scale-105 transition-transform origin-left duration-300">{attendanceRate}%</span>
              <TrendingUp className="w-4 h-4 text-emerald-400 animate-bounce" />
            </div>
            <span className="text-[10px] text-slate-300 mt-2 block italic group-hover:text-white transition-colors">{t.academicYear}</span>
          </div>

        </section>

        {/* WORKSPACE CENTRAL TABS */}
        <nav className="flex space-x-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm mb-6" id="rttc-navigation-tabs">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "dashboard" ? "bg-slate-900 text-white shadow-md scale-101" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
          >
            <Users className="w-4.5 h-4.5" />
            {t.tabDashboard}
          </button>

          <button
            onClick={() => {
              setActiveTab("admin");
              setEditingStudentId(null);
              setShowAddForm(false);
            }}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "admin" ? "bg-slate-900 text-white shadow-md scale-101" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            id="tab-admin-roster"
          >
            <UserPlus className="w-4.5 h-4.5 text-amber-500" />
            {t.tabAdmin}
          </button>

          <button
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "qr" ? "bg-slate-900 text-white shadow-md scale-101" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            id="tab-qr-checkin"
          >
            <QrCode className="w-4.5 h-4.5 text-emerald-500" />
            {t.tabQR}
          </button>

          <button
            onClick={() => setActiveTab("sheets")}
            className={`flex-1 py-3 px-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === "sheets" ? "bg-slate-900 text-white shadow-md scale-101" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}
            id="tab-sheets-view"
          >
            <FileSpreadsheet className="w-4.5 h-4.5 text-teal-500" />
            {t.tabSheets}
          </button>
        </nav>

        {/* CONTROLLER SECTION FOR DATES (Dashboard Only) */}
        {activeTab === "dashboard" && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <label htmlFor="rttc-date-input" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {t.dateLabel}
              </label>
              <input 
                id="rttc-date-input"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <button 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-bold underline"
              >
                {t.setToday}
              </button>
            </div>

            <button
              onClick={setAllToPresent}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all shadow-xs"
              id="btn-all-present"
            >
              {lang === "km" ? "វត្តមានទាំងសងខាង / ទាំងអស់" : "Mark All Present"}
            </button>
          </div>
        )}

        {/* TAB 1: WORKSPACE ATTENDANCE DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-tab-panel">
            
            {/* Left side filtered student controls */}
            <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                  <UserCheck className="w-5.5 h-5.5 text-emerald-600" />
                  {t.studentStatusList} ({filteredList.length})
                </h2>
                
                {/* Search Bar Input */}
                <div className="relative max-w-xs w-full">
                  <label htmlFor="rttc-search" className="sr-only">Search R01 Students</label>
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="rttc-search"
                    type="text"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-250/60 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-505 transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* Attendance quick grid items */}
              <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
                {filteredList.map((st, i) => (
                  <div 
                    key={st.id}
                    className="p-4 rounded-2xl border border-slate-150 hover:border-slate-250 bg-white/80 hover:bg-slate-50/50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar initial or sequence index */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase ${st.isMonitor ? "bg-amber-100 text-amber-800 border-2 border-amber-300" : "bg-slate-100 text-slate-600"}`}>
                        {st.isMonitor ? "MON" : (i+1).toString().padStart(2, "0")}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                            {st.name}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${st.gender === "ស្រី" || st.gender === "Female" ? "bg-pink-50 text-pink-700 border border-pink-100" : "bg-blue-50 text-blue-700 border border-blue-100"}`}>
                            {st.gender === "ស្រី" || st.gender === "Female" ? (lang === "km" ? "ស្រី" : "Female") : (lang === "km" ? "ប្រុស" : "Male")}
                          </span>
                          {st.isMonitor && (
                            <span className="text-[9px] font-bold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                              {lang === "km" ? "ប្រធានថ្នាក់" : "Monitor"}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <span className="text-slate-300">#</span> {st.phoneNumber}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="font-sans italic">
                            Telegram: <strong className="text-slate-500 font-semibold">{st.telegram}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Check Action Indicators */}
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Live QR indicator badge */}
                      {st.verifiedByQR && (
                        <span className="text-[10px] bg-indigo-50 border border-indigo-150 text-indigo-700 font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                          <QrCode className="w-3 h-3 text-indigo-600" />
                          QR Scan
                        </span>
                      )}

                      {/* Status select pill */}
                      <button
                        onClick={() => toggleAttendanceStatus(st.id, st.status)}
                        className={`text-xs px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                          st.status === "Present"
                            ? "bg-emerald-500 text-white shadow-xs"
                            : st.status === "Absent_Permission"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-rose-500 text-white shadow-xs"
                        }`}
                        title={t.quickAction}
                      >
                        {st.status === "Present" ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>{t.statusPresent}</span>
                          </>
                        ) : st.status === "Absent_Permission" ? (
                          <>
                            <HelpCircle className="w-4 h-4" />
                            <span>{t.statusExcused}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>{t.statusUnexcused}</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ))}

                {filteredList.length === 0 && (
                  <div className="text-center py-12 text-slate-400 italic font-mono text-xs">
                    {lang === "km" ? "រកមិនឃើញគណនីនិស្សិតជាមួយតម្រូវការនោះទេ" : "No students match your query."}
                  </div>
                )}
              </div>
            </div>

            {/* Quick administrative info cards & shortcuts */}
            <div className="space-y-6 md:col-span-1" id="widgets-panel">
              
              {/* Regional Center Coordinates Information Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Locate className="w-4 h-4 text-emerald-600" />
                  {t.rttcCampCoordinates}
                </h3>
                
                <div className="space-y-3 font-mono text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Class Block:</span>
                    <strong className="text-slate-900">R01 Laboratory</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Campus Latitude:</span>
                    <strong className="text-slate-900">{geofence.latitude}° N</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Campus Longitude:</span>
                    <strong className="text-slate-900">{geofence.longitude}° E</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-202 pt-2.5 mt-1">
                    <span className="text-slate-400">Radius Config:</span>
                    <strong className="text-emerald-700">{geofence.radius}m ({lang === "km" ? "អនុញ្ញាត" : "Allowed"})</strong>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setActiveTab("qr")}
                    className="w-full text-center py-2.5 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
                  >
                    {lang === "km" ? "កែសម្រួល Geofence" : "Edit Geofence"}
                  </button>
                </div>
              </div>

              {/* Class Monitor Info Column */}
              <div className="bg-amber-50/40 rounded-3xl border border-amber-205 p-5 relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-5">
                  <Users className="w-24 h-24 text-amber-900" />
                </div>

                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <UserPlus className="w-4.5 h-4.5" />
                  <span className="text-xs font-bold uppercase tracking-wide">Class Monitor Roles</span>
                </div>
                
                <h4 className="font-extrabold text-[#78350f] text-base mb-1">
                  អ៊ាន ប៉េងអ៊ាង (Pengeang)
                </h4>
                <p className="text-xs text-amber-900/80 leading-relaxed">
                  Responsible for activating the morning attendance QR code, updating sick leave permissions, and downloading the final CSV sheet log to the Kampong Cham RTTC Administrative server.
                </p>

                <div className="mt-4 pt-3.5 border-t border-amber-900/10 flex flex-col gap-2 font-mono text-[10px] text-amber-800">
                  <div className="flex gap-1.5 items-center">
                    <Phone className="w-3 h-3 text-amber-700/80" />
                    <span>096 456 7123</span>
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <Send className="w-3 h-3 text-amber-700/80" />
                    <span>Telegram username: @Pengeang_Ean</span>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: ADMIN STUDENT ROSTER REGISTRY */}
        {activeTab === "admin" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6" id="admin-roster-tab">
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {t.registryTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {lang === "km" ? "គ្រប់គ្រង បន្ថែម កែប្រែ ឬលុបព័ត៌មានរដ្ឋបាលរបស់និស្សិតថ្នាក់ R01" : "Add, Modify or Delete R01 Student Registry and phone details."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    setEditingStudentId(null);
                    setStudentForm({
                      name: "",
                      gender: "ប្រុស",
                      dob: "2004-01-01",
                      address: "",
                      phoneNumber: "",
                      telegram: "",
                      isMonitor: false
                    });
                    setShowAddForm(true);
                  }}
                  className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                  id="btn-add-student-init"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  {t.addNewStudent}
                </button>

                <button
                  onClick={() => setShowBulkImportModal(true)}
                  className="px-5 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                  id="btn-bulk-import-init"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
                  {t.importBulkBtn || "នាំចូលនិស្សិតច្រើន (CSV)"}
                </button>
              </div>
            </div>

            {/* Beautiful, Animated Student Add/Edit Modal with trendy gradient backdrop */}
            <AnimatePresence>
              {showAddForm && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-gradient-to-tr from-[#0b0f19]/90 via-[#111827]/85 to-[#064e4b]/40 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.95, y: 30, opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="bg-white rounded-3xl border border-slate-100 max-w-2xl w-full p-6 shadow-2xl relative space-y-5 my-8 font-sans overflow-hidden"
                  >
                    {/* Top gradient highlight strip */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-550" />

                    <div className="flex items-center justify-between border-b border-slate-150 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl ring-4 ring-emerald-50/50">
                          <UserPlus className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-snug">
                            {editingStudentId ? t.editStudent : t.addNewStudent}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {editingStudentId 
                              ? (lang === "km" ? "ធ្វើបច្ចុប្បន្នភាពព័ត៌មានលម្អិតរបស់និស្សិតខាងក្រោម" : "Update the detailed student info below to persist changes.")
                              : (lang === "km" ? "បំពេញព័ត៌មានលម្អិតដើម្បីបង្កើតគណនីនិស្សិតថ្មី" : "Fill relevant details to establish a new student record.")}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowAddForm(false)}
                        className="p-2 text-slate-400 hover:text-slate-650 rounded-xl hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <form onSubmit={handleSaveStudent} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        
                        <div>
                          <label htmlFor="form-name" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                            {t.fullName} *
                          </label>
                          <input 
                            id="form-name"
                            type="text"
                            required
                            placeholder={lang === "km" ? "ឧ. សុខ មករា" : "e.g., Sok Makara"}
                            value={studentForm.name}
                            onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-sans"
                          />
                        </div>

                        <div>
                          <label htmlFor="form-gender" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                            {t.gender}
                          </label>
                          <select
                            id="form-gender"
                            value={studentForm.gender}
                            onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value as "ប្រុស" | "ស្រី" })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all"
                          >
                            <option value="ប្រុស">{lang === "km" ? "ប្រុស (Male)" : "Male"}</option>
                            <option value="ស្រី">{lang === "km" ? "ស្រី (Female)" : "Female"}</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="form-dob" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                            {t.dob}
                          </label>
                          <input 
                            id="form-dob"
                            type="date"
                            value={studentForm.dob}
                            onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-sans"
                          />
                        </div>

                        <div>
                          <label htmlFor="form-phone" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                            {t.phoneNum} *
                          </label>
                          <input 
                            id="form-phone"
                            type="text"
                            required
                            placeholder="e.g., 096 1122334"
                            value={studentForm.phoneNumber}
                            onChange={(e) => setStudentForm({ ...studentForm, phoneNumber: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-sans"
                          />
                        </div>

                        <div>
                          <label htmlFor="form-tg" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                            {t.tgUsername}
                          </label>
                          <input 
                            id="form-tg"
                            type="text"
                            placeholder="e.g., @m_sopheak"
                            value={studentForm.telegram}
                            onChange={(e) => setStudentForm({ ...studentForm, telegram: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-sans"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-6">
                          <input 
                            type="checkbox"
                            id="form-monitor"
                            checked={studentForm.isMonitor}
                            onChange={(e) => setStudentForm({ ...studentForm, isMonitor: e.target.checked })}
                            className="h-4.5 w-4.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                          <label htmlFor="form-monitor" className="text-xs font-bold text-slate-705 cursor-pointer uppercase select-none">
                            {lang === "km" ? "ជាប្រធានថ្នាក់ (Class Monitor)" : "Is Monitor"}
                          </label>
                        </div>

                      </div>

                      <div>
                        <label htmlFor="form-addr" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                          {t.currentAddress} *
                        </label>
                        <textarea 
                          id="form-addr"
                          rows={2}
                          required
                          placeholder={lang === "km" ? "ឧ. ភូមិវាល ឃុំព្រៃឈរ ស្រុកព្រៃឈរ ខេត្តកំពង់ចាម" : "e.g., Veal village, Kampong Cham province"}
                          value={studentForm.address}
                          onChange={(e) => setStudentForm({ ...studentForm, address: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all font-sans resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-150">
                        <button
                          type="button"
                          onClick={() => setShowAddForm(false)}
                          className="px-4 py-2.5 border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-95"
                        >
                          {t.cancel}
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:from-emerald-550 hover:to-emerald-600 text-xs font-bold rounded-xl transition-all shadow-md hover:scale-[1.02] active:scale-95 flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {t.saveProfile}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Student list grid with editable properties */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="roster-grid">
              
              {students.map((st) => (
                <div 
                  key={st.id} 
                  className={`border rounded-2xl p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:scale-[1.02] hover:-translate-y-0.5 ${
                    st.isMonitor 
                      ? "border-amber-300 bg-amber-50/15 hover:border-amber-450 hover:bg-gradient-to-tr hover:from-amber-50/10 hover:to-amber-100/10" 
                      : "bg-[#fdfdfe] border-slate-200/80 hover:border-emerald-300 hover:bg-gradient-to-tr hover:from-white hover:to-emerald-50/5"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-[#0f172a] text-base font-sans flex items-center gap-1.5">
                        {st.name}
                        {st.isMonitor && (
                          <span className="text-[10px] uppercase font-bold bg-[#f59e0b] text-slate-950 px-1.5 py-0.5 rounded-sm">
                            {lang === "km" ? "ប្រធាន" : "Monitor"}
                          </span>
                        )}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-mono mt-0.5 block italic">{lang === "km" ? "ថ្ងៃខែឆ្នាំកំណើត៖" : "DOB:"} {st.dob}</span>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleEditInit(st)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-50 border border-slate-100 rounded-lg"
                        title={t.editStudent}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStudent(st.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-50 border border-slate-100 rounded-lg"
                        title={t.btnDelete}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-100 font-sans text-xs text-slate-500">
                    <div className="flex justify-between">
                      <span>{t.gender}:</span>
                      <strong className="text-slate-900 font-bold">{st.gender}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.phoneNum}:</span>
                      <strong className="text-slate-900 font-mono">{st.phoneNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Telegram:</span>
                      <strong className="text-[#3b82f6] font-semibold">{st.telegram}</strong>
                    </div>
                    <div className="pt-2 border-t border-slate-50 leading-snug">
                      <span className="text-slate-400 block text-[10px] uppercase tracking-wide font-bold mb-0.5">{t.currentAddress}</span>
                      <p className="text-slate-700 italic">{st.address}</p>
                    </div>
                  </div>
                </div>
              ))}

              {students.length === 0 && (
                <div className="col-span-full text-center py-16 text-slate-400 italic">
                  No students active in Class R01 configuration. Click Add student above.
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 3: QR CODE & LOCATION TRACKING SOLUTION */}
        {activeTab === "qr" && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" id="qr-tab-panel">
            
            {/* Left QR Code display & Coordinate Config */}
            <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                    <QrCode className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {t.qrTitle}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t.qrInstruct}
                    </p>
                  </div>
                </div>

                {/* Simulated SVG High-Craft QR representation */}
                <div className="flex flex-col items-center justify-center py-6 bg-slate-50/50 rounded-2xl border border-slate-200/80 max-w-sm mx-auto">
                  
                  {/* Outer Frame */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-205 shadow-md flex flex-col items-center">
                    
                    {qrCodeDataUrl ? (
                      <div className="relative group p-1 bg-slate-50 rounded-xl border border-slate-100 shadow-inner mb-4 animate-fade-in text-center">
                        <img 
                          src={qrCodeDataUrl} 
                          alt="Real RTTC QR Check-In" 
                          className="w-56 h-56 rounded-lg object-contain mx-auto"
                        />
                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center rounded-lg">
                          <a 
                            href={qrCodeDataUrl} 
                            download="RTTC_R01_CheckIn_QR.png"
                            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold shadow-xl flex items-center gap-1.5 transition-transform transform active:scale-95 text-center font-sans"
                          >
                            <Download className="w-3.5 h-3.5" />
                            {t.downloadQRBtn || "Download QR Code"}
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {/* SVG Pixels Grid mock representation */}
                    <svg className={`w-56 h-56 ${qrCodeDataUrl ? "hidden" : ""}`} viewBox="0 0 100 100" shapeRendering="crispEdges">
                      {/* Corners */}
                      <rect x="0" y="0" width="30" height="30" fill="#0f172a" />
                      <rect x="5" y="5" width="20" height="20" fill="#ffffff" />
                      <rect x="10" y="10" width="10" height="10" fill="#0f172a" />

                      <rect x="70" y="0" width="30" height="30" fill="#0f172a" />
                      <rect x="75" y="5" width="20" height="20" fill="#ffffff" />
                      <rect x="80" y="10" width="10" height="10" fill="#0f172a" />

                      <rect x="0" y="70" width="30" height="30" fill="#0f172a" />
                      <rect x="5" y="75" width="20" height="20" fill="#ffffff" />
                      <rect x="10" y="80" width="10" height="10" fill="#0f172a" />

                      {/* Small anchor inside bottom right */}
                      <rect x="75" y="75" width="15" height="15" fill="#0f172a" />
                      <rect x="80" y="80" width="5" height="5" fill="#ffffff" />

                      {/* Dynamic simulated matrix pixels for visual accuracy */}
                      <rect x="40" y="5" width="5" height="10" fill="#0f172a" />
                      <rect x="55" y="0" width="10" height="5" fill="#0f172a" />
                      <rect x="45" y="20" width="15" height="5" fill="#0f172a" />
                      <rect x="60" y="15" width="5" height="15" fill="#0f172a" />

                      <rect x="5" y="40" width="10" height="5" fill="#0f172a" />
                      <rect x="0" y="50" width="15" height="5" fill="#0f172a" />
                      <rect x="20" y="45" width="5" height="15" fill="#0f172a" />

                      <rect x="40" y="40" width="20" height="20" fill="#10b981" /> {/* RTTC Emerald center anchor */}
                      <rect x="45" y="45" width="10" height="10" fill="#ffffff" />

                      <rect x="75" y="40" width="10" height="5" fill="#0f172a" />
                      <rect x="85" y="50" width="15" height="5" fill="#0f172a" />
                      <rect x="70" y="60" width="5" height="10" fill="#0f172a" />

                      <rect x="45" y="70" width="10" height="5" fill="#0f172a" />
                      <rect x="50" y="85" width="5" height="10" fill="#0f172a" />
                      <rect x="40" y="90" width="15" height="5" fill="#0f172a" />

                      <rect x="5" y="60" width="5" height="5" fill="#0f172a" />
                      <rect x="15" y="55" width="5" height="5" fill="#0f172a" />
                    </svg>

                    <div className="mt-3.5 flex flex-col items-center">
                      <span className="text-xs font-mono font-bold text-slate-800 tracking-wider">SECURE-TOKEN-R01</span>
                      <span className="text-[9px] text-[#22c55e] font-sans font-bold flex items-center gap-1 mt-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                        ACTIVE: LIVE SYSTEM
                      </span>
                    </div>

                  </div>

                  <div className="mt-4 flex flex-col items-center gap-1.5 px-4 w-full">
                    <a 
                      href={window.location.origin + window.location.pathname + `?mode=student-checkin`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full justify-center px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 text-center shadow-sm border border-emerald-200 font-sans"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {lang === "km" ? "បើករូបភាពស្កេនរបស់សិស្សក្នុង Tab ថ្មី" : "Open Student Gate in New Tab"}
                    </a>
                    <span className="text-[10px] text-slate-500 font-sans text-center">
                      {lang === "km" ? "សិស្សអាចស្កេនពីទូរស័ព្ទផ្ទាល់ ឬប្រើប្រព័ន្ធខាងលើ" : "Students can scan using physical phone cameras directly."}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 mt-4 px-6 text-center italic">
                    The token refreshes every morning to prevent unexcused checks from home.
                  </span>
                </div>
              </div>

              {/* Geofence Form Editing parameters */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Kampong Cham RTTC Location Setting
                  </span>
                  
                  {/* Enabled Toggler */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">{t.enableGeofence}</span>
                    <input 
                      type="checkbox"
                      checked={geofence.isEnabled}
                      onChange={(e) => setGeofence({ ...geofence, isEnabled: e.target.checked })}
                      className="h-4 w-10 text-emerald-600 rounded-md cursor-pointer focus:ring-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="geo-lat" className="block text-xs font-bold text-slate-400 mb-1 leading-snug">
                      {t.latitude}
                    </label>
                    <input
                      id="geo-lat"
                      type="number"
                      step="0.0001"
                      value={geofence.latitude}
                      onChange={(e) => setGeofence({ ...geofence, latitude: parseFloat(e.target.value) || 12.0004658 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="geo-lng" className="block text-xs font-bold text-slate-400 mb-1 leading-snug">
                      {t.longitude}
                    </label>
                    <input
                      id="geo-lng"
                      type="number"
                      step="0.0001"
                      value={geofence.longitude}
                      onChange={(e) => setGeofence({ ...geofence, longitude: parseFloat(e.target.value) || 105.4645 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="geo-radius" className="block text-xs font-bold text-slate-400 mb-1 leading-snug">
                      {t.radius}
                    </label>
                    <input 
                      id="geo-radius"
                      type="number"
                      value={geofence.radius}
                      onChange={(e) => setGeofence({ ...geofence, radius: parseInt(e.target.value) || 150 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Right Student Checkin scan simulator */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Classroom Simulator Box */}
              <div className="bg-white border rounded-3xl p-5 border-slate-200/60 shadow-xs">
                <div className="flex items-center gap-2 text-indigo-800 mb-3.5">
                  <Smartphone className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-bold uppercase tracking-wide">{t.mockCheckinSim}</span>
                </div>

                <p className="text-xs text-slate-500 mb-5 leading-normal italic">
                  Simulate checking in as an actual Class R01 student teacher to test the geolocation radius and immediate attendance updates.
                </p>

                <div className="space-y-4">
                  {/* Select simulating student */}
                  <div>
                    <label htmlFor="sim-student-id" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      1. Select Simulating Student
                    </label>
                    <select
                      id="sim-student-id"
                      value={simulatedStudentId}
                      onChange={(e) => {
                        setSimulatedStudentId(e.target.value);
                        setSimScanResult(null);
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-350 bg-white text-sm focus:outline-none focus:border-indigo-500 font-sans"
                    >
                      <option value="">-- Choose R01 Student --</option>
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} {st.isMonitor ? " (Monitor)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Geolocation Coordinate Preset */}
                  <div>
                    <label htmlFor="sim-loc" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">
                      2. Set Geolocation Coordinate
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSimulatedLocation("inside");
                          setSimScanResult(null);
                        }}
                        className={`p-3 border rounded-xl text-xs font-bold text-center flex flex-col items-center justify-center gap-1 transition-all ${simulatedLocation === "inside" ? "bg-emerald-50 border-emerald-400 text-emerald-800 scale-102" : "border-slate-205 text-slate-500"}`}
                      >
                        <Locate className="w-4 h-4 text-emerald-600" />
                        <span className="font-semibold">Inside RTTC Campus</span>
                        <span className="text-[9px] text-slate-400 font-mono">(lat: 12.0004658)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSimulatedLocation("outside");
                          setSimScanResult(null);
                        }}
                        className={`p-3 border rounded-xl text-xs font-bold text-center flex flex-col items-center justify-center gap-1 transition-all ${simulatedLocation === "outside" ? "bg-rose-50 border-rose-400 text-rose-800 scale-102" : "border-slate-205 text-slate-500"}`}
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span className="font-semibold">Kampong Cham River</span>
                        <span className="text-[9px] text-slate-400 font-mono">(~8km away)</span>
                      </button>
                    </div>
                  </div>

                  {/* Simulated Action Submit */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={executeSimulatedCheckIn}
                      className="w-full py-3 bg-indigo-650 hover:bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      <QrCode className="w-4 h-4 text-white" />
                      Simulate Phone QR Scan
                    </button>
                  </div>
                </div>

                {/* Simulated Result Display */}
                {simScanResult && (
                  <div className={`mt-5 p-4 rounded-2xl border flex items-start gap-2.5 ${simScanResult.success ? "bg-emerald-50 border-emerald-250 text-emerald-800" : "bg-red-50 border-red-250 text-red-800"}`}>
                    {simScanResult.success ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-xs font-bold block">
                        {simScanResult.success ? "Scan Cleared" : "Verification Rejected"}
                      </span>
                      <p className="text-xs mt-0.5 font-sans leading-relaxed">{simScanResult.message}</p>
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* TAB 4: BULK EXCEL SHEET LOGGER WORKSPACE */}
        {activeTab === "sheets" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6" id="bulk-sheets-tab">
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {t.sheetsTitle}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  {t.sheetsIntro}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExportCSV}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
                  id="btn-sheets-csv"
                >
                  <Download className="w-4.5 h-4.5" />
                  {t.exportCSV}
                </button>
              </div>
            </div>

            {/* Simulated Live Sheet Grid */}
            <div className="border border-slate-200 rounded-2xl overflow-x-auto" id="sheet-table-wrapper">
              
              <table className="w-full text-xs text-left text-slate-500 font-sans border-collapse">
                
                <thead className="text-[10px] text-slate-400 uppercase bg-slate-50 border-b border-slate-205 font-bold tracking-wider">
                  <tr>
                    <th scope="col" className="px-3 py-3 text-center border-r border-slate-200 w-12">{t.rowNum}</th>
                    <th scope="col" className="px-4 py-3 border-r border-slate-200">{t.colName}</th>
                    <th scope="col" className="px-4 py-3 border-r border-slate-200 text-center w-20">{t.colGender}</th>
                    <th scope="col" className="px-4 py-3 border-r border-slate-200 w-32">{t.colDOB}</th>
                    <th scope="col" className="px-4 py-3 border-r border-slate-200 w-36">{t.colPhone}</th>
                    <th scope="col" className="px-4 py-3 border-r border-slate-200 w-36">{t.colTelegram}</th>
                    <th scope="col" className="px-4 py-3 border-r border-slate-200">{t.colAddress}</th>
                    <th scope="col" className="px-4 py-3 border-r border-slate-200 w-36 text-center">{t.colStatus}</th>
                    <th scope="col" className="px-4 py-3 border-r border-slate-200 w-28 text-center">{t.colTime}</th>
                    <th scope="col" className="px-4 py-3 text-center w-28">{t.colVerification}</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredList.map((st, idx) => (
                    <tr 
                      key={st.id} 
                      className={`border-b border-slate-200/80 hover:bg-slate-55/40 hover:text-slate-900 transition-colors ${st.isMonitor ? "bg-amber-50/10" : ""}`}
                    >
                      <td className="px-3 py-2.5 text-center font-mono border-r border-slate-200 text-slate-400 font-bold bg-slate-50/50">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 border-r border-slate-200 flex items-center gap-1.5">
                        {st.name}
                        {st.isMonitor && (
                          <span className="text-[9px] bg-amber-500 text-slate-950 font-bold font-sans px-1 rounded-sm uppercase scale-90">MON</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 border-r border-slate-200 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${st.gender === "ស្រី" || st.gender === "Female" ? "bg-pink-50 text-pink-700" : "bg-blue-50 text-blue-700"}`}>
                          {st.gender}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 border-r border-slate-200 font-mono text-slate-600">{st.dob}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 font-mono text-slate-900">{st.phoneNumber}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 text-slate-500 font-bold font-mono">{st.telegram}</td>
                      <td className="px-4 py-2.5 border-r border-slate-200 italic max-w-sm truncate text-slate-500" title={st.address}>{st.address}</td>
                      
                      {/* Interactive Sheet cell status switcher */}
                      <td className="px-4 py-2.5 border-r border-slate-200 text-center font-bold">
                        <select
                          value={st.status}
                          onChange={(e) => {
                            // Update attendance records from Excel spreadsheet selector cell
                            const targetVal = e.target.value as AttendanceStatus;
                            const todayStr = selectedDate;
                            const recordId = `${st.id}-${todayStr}`;
                            
                            const updated = [...attendance];
                            const idxRecord = updated.findIndex(r => r.id === recordId);
                            
                            const nowTime = targetVal === "Present" ? "07:15 AM" : "";
                            
                            if (idxRecord >= 0) {
                              updated[idxRecord] = {
                                ...updated[idxRecord],
                                status: targetVal,
                                checkInTime: nowTime
                              };
                            } else {
                              updated.push({
                                id: recordId,
                                studentId: st.id,
                                date: todayStr,
                                status: targetVal,
                                checkInTime: nowTime,
                                verifiedByQR: false
                              });
                            }
                            setAttendance(updated);
                            triggerToast(lang === "km" ? "វត្តមានត្រូវបានកែសម្រួលលើតារាង" : "Spreadsheet cell updated!");
                          }}
                          className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border focus:outline-none cursor-pointer ${
                            st.status === "Present" 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                              : st.status === "Absent_Permission" 
                                ? "bg-amber-50 text-amber-800 border-amber-200" 
                                : "bg-red-50 text-red-800 border-red-200"
                          }`}
                        >
                          <option value="Present">{lang === "km" ? "មានវត្តមាន" : "Present"}</option>
                          <option value="Absent_Permission">{lang === "km" ? "ច្បាប់" : "Leave"}</option>
                          <option value="Absent_No_Permission">{lang === "km" ? "អវត្តមាន" : "Unexcused"}</option>
                        </select>
                      </td>

                      <td className="px-4 py-2.5 border-r border-slate-200 text-center text-slate-800 font-mono font-bold">
                        {st.checkInTime || "-"}
                      </td>

                      <td className="px-4 py-2.5 text-center">
                        {st.verifiedByQR ? (
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 py-0.5 px-2 rounded-lg inline-flex items-center gap-1">
                            <QrCode className="w-3 h-3" />
                            YES
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100 py-0.5 px-2 rounded-lg inline-flex items-center">
                            MANUAL
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-[11px] text-slate-400 font-mono">
              <span>Total rows active: <strong className="text-slate-700">{filteredList.length}</strong></span>
              <span>RTTC Kampong Cham Class R01</span>
            </div>

          </div>
        )}
          </>
        )}

      </div>

      {/* Footer copyright */}
      <footer className="mt-12 py-10 bg-white border-t border-slate-200/80 text-center text-slate-400 text-xs font-sans">
        <p className="font-bold text-slate-500 uppercase tracking-wider mb-1.5">មជ្ឈមណ្ឌលគរុកោសល្យភូមិភាគខេត្តកំពង់ចាម - RTTC Kampong Cham</p>
        <p>Copyright © 2026. Custom Classroom Attendance & Geofenced QR solution, Class Monitor អ៊ាន ប៉េងអ៊ាង.</p>
      </footer>

    </div>
  );
}
