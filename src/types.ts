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
}

export type AttendanceStatus = 
  | "Present" 
  | "Absent" 
  | "Late" 
  | "Permission" 
  | "Absent_Permission" 
  | "Absent_No_Permission";

export type AttendanceShift = "morning" | "afternoon";

export interface AttendanceRecord {
  id: string; // studentId + "-" + date + "-" + shift
  studentId: string;
  date: string; // YYYY-MM-DD
  shift?: AttendanceShift; // "morning" | "afternoon"
  status: AttendanceStatus;
  checkInTime?: string;
  absenceNote?: string;
}
