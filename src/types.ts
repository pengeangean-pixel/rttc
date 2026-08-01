export type Language = "en" | "km";

export interface Student {
  id: string;
  name: string;
  gender: "Male" | "Female" | "ប្រុស" | "ស្រី";
  dob: string;

  /** Student profile image URL. Optional so existing Firestore data still works. */
  profilePhoto?: string;

  /** Address fields */
  address: string;
  village?: string;
  commune?: string;
  district?: string;
  province?: string;

  schoolName?: string;
  phoneNumber: string;
  telegram: string;

  /** Class Monitor flag */
  isMonitor?: boolean;
}

/** 
 * 4 Core Attendance statuses matching the new UI:
 * - "Present": វត្តមាន
 * - "Absent": អវត្តមាន
 * - "Late": យឺត
 * - "Permission": ច្បាប់
 * (Legacy types kept for Firestore backward compatibility)
 */
export type AttendanceStatus = 
  | "Present" 
  | "Absent" 
  | "Late" 
  | "Permission" 
  | "Absent_Permission" 
  | "Absent_No_Permission";

export type AttendanceShift = "morning" | "noon" | "afternoon";

export interface AttendanceRecord {
  id: string; // studentId + "-" + date
  studentId: string;
  date: string; // YYYY-MM-DD
  shift?: AttendanceShift; // "morning" | "noon" | "afternoon"
  status: AttendanceStatus;
  checkInTime?: string;
  latitude?: number;
  longitude?: number;
  verifiedByQR?: boolean;

  /** Note taking */
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
