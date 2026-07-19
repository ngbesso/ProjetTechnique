import { http } from "./client";

export interface PrayerAlertItem {
    id: number;
    member_name: string;
    created_at: string;
}

export interface PrayerAlertStats {
    pending: number;
    recent: PrayerAlertItem[];
}

export interface VolunteerAlertItem {
    id: number;
    member_name: string;
    event_title: string;
    created_at: string;
}

export interface VolunteerAlertStats {
    pending: number;
    recent: VolunteerAlertItem[];
}

export type ActivityType =
    | "member"
    | "donation"
    | "sermon"
    | "post"
    | "event_registration"
    | "prayer_request"
    | "volunteer_request";

export interface ActivityItem {
    type: ActivityType;
    label: string;
    date: string;
}

export interface DashboardStats {
    membres_pending: number;
    prieres: PrayerAlertStats;
    benevolat: VolunteerAlertStats;
    recent_activity: ActivityItem[];
}

export function fetchDashboardStats(): Promise<DashboardStats> {
    return http.get<DashboardStats>("/admin/dashboard");
}
