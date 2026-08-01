export type Language = "en" | "km";

export interface Student {
  id: string;
  name: string;
  latinName?: string;
  gender: "Male" | "Female" | "ប្រុស" | "ស្រី" | "M" | "F";
  dob?: string;
  profilePhoto?: string;
  address?: string;
  village?: string;
  commune?: string;
  district?: string;
  province?: string;
  schoolName?: string;
  school?: string;
  phoneNumber?: string;
  phone?: string;
  telegram?: string;
}

export type AttendanceStatus =
  | "Present"
  | "Absent_Permission"
  | "Absent_No_Permission"
  | "present"
  | "absent"
  | "late"
  | "permission";

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  shift?: 'morning' | 'afternoon';
  status: AttendanceStatus;
  checkInTime?: string;
  latitude?: number;
  longitude?: number;
  verifiedByQR?: boolean;
  morningAbsent?: boolean;
  afternoonAbsent?: boolean;
  absenceNote?: string;
  note?: string;
}

export interface GeofenceConfig {
  latitude: number;
  longitude: number;
  radius: number; // in meters
  isEnabled: boolean;
}
