export type Language = "en" | "km";

export interface Student {
  id: string;
  name: string;
  gender: "Male" | "Female" | "ប្រុស" | "ស្រី";
  dob: string;

  profilePhoto?: string;

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

export interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  latitude?: number;
  longitude?: number;
  verifiedByQR?: boolean;

  morningAbsent?: boolean;
  afternoonAbsent?: boolean;
  absenceNote?: string;
}
