
export type Language = 'en' | 'ur';
export type Page = 'home' | 'classTimetable' | 'teacherTimetable' | 'alternativeTimetable' | 'attendance' | 'dataEntry' | 'settings';
export type DataEntryTab = 'class' | 'teacher' | 'subject' | 'jointPeriods' | 'structure' | 'school';

export type NavPosition = 'top' | 'bottom';
export type NavDesign = 'modern' | 'classic' | 'minimal' | '3d' | 'gradient' | 'outline' | 'crystal' | 'soft' | 'transparent';
export type NavShape = 'circle' | 'pill' | 'leaf' | 'squircle' | 'diamond' | 'arch' | 'shield' | 'petal' | 'square';

export interface Subject {
  id: string;
  nameEn: string;
  nameUr: string;
  isPractical?: boolean;
  practicalSubjectId?: string;
}

export interface Teacher {
  id: string;
  serialNumber?: number;
  nameEn: string;
  nameUr: string;
  gender: 'Male' | 'Female';
  contactNumber: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface GroupSet {
  id: string;
  name: string;
  groups: Group[];
}

export interface ClassSubject {
  subjectId: string;
  periodsPerWeek: number;
  teacherId: string;
  groupSetId?: string;
  groupId?: string;
  combinedGroupId?: string;
}

export interface Period {
  id: string; 
  classId: string;
  subjectId: string;
  teacherId: string;
  jointPeriodId?: string; 
}

export type TimetableSlot = Period[]; 
export type TimetableDay = TimetableSlot[];

export interface TimetableGridData {
  Monday: TimetableDay;
  Tuesday: TimetableDay;
  Wednesday: TimetableDay;
  Thursday: TimetableDay;
  Friday: TimetableDay;
  Saturday: TimetableDay;
}

// Export constant for iteration
export const allDays: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface Timetable {
  classes: { [classId: string]: TimetableGridData };
  teachers: { [teacherId: string]: TimetableGridData };
}

export interface Adjustment {
  id: string; 
  classId: string;
  subjectId: string;
  originalTeacherId: string;
  substituteTeacherId: string;
  day: keyof TimetableGridData;
  periodIndex: number;
  conflictDetails?: {
    classNameEn: string;
    classNameUr: string;
  };
}

export interface JointPeriodAssignment {
  classId: string;
  subjectId: string;
  groupSetId?: string;
  groupId?: string;
}

export interface JointPeriod {
  id: string;
  name: string;
  teacherId: string;
  periodsPerWeek: number;
  assignments: JointPeriodAssignment[];
}

export interface DayConfig {
    active: boolean;
    periodCount: number;
}

export interface PeriodTime {
    start: string;
    end: string;
    name?: string;
}

export interface Break {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    beforePeriod: number; // The break happens BEFORE this period number (1-based)
}

export interface Vacation {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
}

export interface AttendanceData {
    present: number;
    absent: number;
    sick: number;
    leave: number;
    signature?: string; 
    submittedBy?: string; // Added field to track who submitted the attendance
}

export interface TimetableChangeLog {
    id: string;
    timestamp: string;
    type: 'move' | 'delete' | 'add' | 'update';
    details: string;
    entityType: 'teacher' | 'class';
    entityId: string;
}

export interface TimetableSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  jointPeriods: JointPeriod[];
  adjustments: Record<string, Adjustment[]>; 
  leaveDetails?: Record<string, Record<string, LeaveDetails>>;
  attendance?: Record<string, Record<string, AttendanceData>>; // date -> classId -> data
  // Optional structure configuration for portable sessions
  daysConfig?: Record<keyof TimetableGridData, DayConfig>;
  periodTimings?: {
      default: PeriodTime[];
      friday: PeriodTime[];
  };
  breaks?: {
      default: Break[];
      friday: Break[];
  };
  assembly?: {
      default: PeriodTime | null;
      friday: PeriodTime | null;
  };
  vacations?: Vacation[];
  changeLogs?: TimetableChangeLog[];
}

export interface LeaveDetails {
    leaveType: 'full' | 'half';
    startPeriod: number;
    periods?: number[];
    reason?: string;
    startDate?: string;
    endDate?: string;
}

export interface SchoolClass {
  id:string;
  serialNumber?: number;
  nameEn: string;
  nameUr: string;
  category?: 'High' | 'Middle' | 'Primary';
  inCharge: string; 
  roomNumber: string;
  studentCount: number;
  subjects: ClassSubject[];
  timetable: TimetableGridData;
  groupSets?: GroupSet[];
}

// --- Download Types ---

export type DownloadFormat = 'pdf-full' | 'pdf-summary' | 'excel';
export type DownloadLanguage = 'en' | 'ur' | 'both';
export type FontFamily = 'sans-serif' | 'serif' | 'monospace';

export type CardStyle = 'full' | 'outline' | 'text' | 'triangle' | 'glass' | 'gradient' | 'minimal-left' | 'badge';
export type TriangleCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface DownloadDesignConfig {
    version: 3;
    page: {
        size: 'a4' | 'letter' | 'legal';
        orientation: 'portrait' | 'landscape';
        margins: { top: number, right: number, bottom: number, left: number }; // in mm
        watermarkOpacity: number;
    };
    header: {
        showLogo: boolean;
        logoSize: number; // px
        logoPosition: 'left' | 'center' | 'right';
        schoolName: {
            fontFamily: FontFamily;
            fontSize: number; // px
            fontWeight: 'normal' | 'bold';
            align: 'left' | 'center' | 'right';
            color: string;
        };
        showTitle: boolean;
        title: {
            fontFamily: FontFamily;
            fontSize: number;
            fontWeight: 'normal' | 'bold';
            align: 'left' | 'center' | 'right';
            color: string;
        };
        details: {
            fontFamily: FontFamily;
            fontSize: number;
            fontWeight: 'normal' | 'bold';
            align: 'left' | 'center' | 'right';
            color: string;
        };
        divider: boolean;
        bgColor: string;
        showDate?: boolean;
        subtitle?: string;
    };
    table: {
        fontFamily: FontFamily;
        fontSize: number; // px
        cellPadding: number; // px
        headerBgColor: string;
        headerColor: string;
        bodyBgColor: string;
        bodyColor: string; // Added for table body text color
        borderColor: string;
        periodColumnWidth: number; // px
        periodColumnBgColor: string;
        periodColumnColor: string;
        altRowColor: string;
        gridStyle?: 'solid' | 'dashed' | 'dotted';
        borderWidth?: number;
        headerFontSize?: number; // Added property for table header font size
        verticalAlign?: 'top' | 'middle' | 'bottom';
        cardStyle?: CardStyle;
        triangleCorner?: TriangleCorner;
        outlineWidth?: number;
        mergeIdenticalPeriods?: boolean;
        badgeTarget?: 'subject' | 'teacher' | 'class'; // For badge style configuration
        lineHeight?: number;
    };
    footer: {
        show: boolean;
        text: string;
        fontFamily: FontFamily;
        fontSize: number;
        align: 'left' | 'center' | 'right';
        includePageNumber: boolean;
        color: string;
        includeTimestamp?: boolean;
        includeDate?: boolean;
        appNamePlacement?: 'left' | 'center' | 'right' | 'hidden';
        datePlacement?: 'left' | 'center' | 'right' | 'hidden';
        pageNumberPlacement?: 'left' | 'center' | 'right' | 'hidden';
    };
    colorMode: 'color' | 'bw';
    rowsPerPage?: number;
    rowsPerFirstPage?: number; // Option for different row count on first page
    daysPerPage?: number; // Option for splitting table columns (days) across pages
    watermarkText?: string;
    compactMode?: boolean;
    contentScale?: number;
    visibleElements?: {
        teacherName?: boolean;
        subjectName?: boolean;
        roomNumber?: boolean;
    };
}

export interface DownloadDesigns {
    class: DownloadDesignConfig;
    teacher: DownloadDesignConfig;
    workload: DownloadDesignConfig; 
    alternative: DownloadDesignConfig;
    adjustments: DownloadDesignConfig; // New key for Daily Adjustments
    basicInfo: DownloadDesignConfig;
    attendance: DownloadDesignConfig; // New key for Attendance Report
    schoolTimings: DownloadDesignConfig;
}

export interface SchoolConfig {
  schoolNameEn: string;
  schoolNameUr: string;
  schoolLogoBase64: string | null;
  downloadDesigns: DownloadDesigns;
  daysConfig: Record<keyof TimetableGridData, DayConfig>;
  periodTimings: {
      default: PeriodTime[];
      friday: PeriodTime[];
  };
  breaks: {
      default: Break[];
      friday: Break[];
  };
  assembly: {
      default: PeriodTime | null;
      friday: PeriodTime | null;
  };
}

export interface UserData {
  timetableSessions: TimetableSession[];
  schoolConfig: SchoolConfig;
}

export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const colorSchemes = [
    { name: 'subject-sky', border: 'border-l-sky-500' },
    { name: 'subject-green', border: 'border-l-green-500' },
    { name: 'subject-yellow', border: 'border-l-yellow-500' },
    { name: 'subject-red', border: 'border-l-red-500' },
    { name: 'subject-purple', border: 'border-l-purple-500' },
    { name: 'subject-pink', border: 'border-l-pink-500' },
    { name: 'subject-orange', border: 'border-l-orange-500' },
    { name: 'subject-teal', border: 'border-l-teal-500' },
    { name: 'subject-lime', border: 'border-l-lime-500' },
    { name: 'subject-cyan', border: 'border-l-cyan-500' },
    { name: 'subject-emerald', border: 'border-l-emerald-500' },
    { name: 'subject-fuchsia', border: 'border-l-fuchsia-500' },
    { name: 'subject-rose', border: 'border-l-rose-500' },
    { name: 'subject-amber', border: 'border-l-amber-500' },
    { name: 'subject-blue', border: 'border-l-blue-500' },
    { name: 'subject-indigo', border: 'border-l-indigo-500' },
];

export const getColorForId = (id: string): { name: string, border: string } => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colorSchemes.length;
    return colorSchemes[index];
};
