import { http } from "./client";

export interface MonthCount {
    month: string;
    count: number;
}

export interface MonthAmount {
    month: string;
    amount: number;
}

export interface MemberStats {
    total: number;
    active: number;
    pending: number;
    inactive: number;
    rejected: number;
    by_month: MonthCount[];
}

export interface ChurchStats {
    total: number;
    affiliates: number;
}

export interface DonationStats {
    total_cad: number;
    total_usd: number;
    count: number;
    by_category: Record<string, number>;
    by_month: MonthAmount[];
}

export interface SermonStats {
    total: number;
    published: number;
    draft: number;
    archived: number;
}

export interface PendingMemberItem {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    created_at: string;
}

export interface DashboardStats {
    membres: MemberStats;
    eglises: ChurchStats;
    dons: DonationStats;
    sermons: SermonStats;
    recent_pending: PendingMemberItem[];
}

export function fetchDashboardStats(): Promise<DashboardStats> {
    return http.get<DashboardStats>("/admin/dashboard");
}
