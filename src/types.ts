export type Language = "en" | "km";

export interface Student {
  id: string;
  name: string;
  gender: "Male" | "Female" | "ប្រុស" | "ស្រី";
  dob: string;

  /** Student profile image URL. Kept optional so existing Firestore data still works. */
  profilePhoto?: string;

  /** Legacy free-text address field kept for compatibility with existing records/import/export. */
  address: string;
  village?: string;
  commune?: string;
  district?: string;
  province?: string;

  schoolName?: string;

  phoneNumber: string;
  telegram: string;
  isMonitor?: boolean;
}

export type AttendanceStatus = "Present" | "Absent_Permission" | "Absent_No_Permission";

export interface AttendanceRecord {
  id: string; // studentId + date
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkInTime?: string;
  latitude?: number;
  longitude?: number;
  verifiedByQR?: boolean;

  /** Morning/afternoon absence checkboxes for classroom attendance note taking. */
  morningAbsent?: boolean;
  afternoonAbsent?: boolean;
  absenceNote?: string;
}

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  isEnabled: boolean;
}
