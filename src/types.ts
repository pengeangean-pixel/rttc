export type Language = "en" | "km";

export interface Student {
  id: string;
  name: string;
  gender: "Male" | "Female" | "ប្រុស" | "ស្រី";
  dob: string;
  address: string;
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
}

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  isEnabled: boolean;
}
