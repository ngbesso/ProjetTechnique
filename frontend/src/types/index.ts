export interface UserInfo {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  roles: string[];
  permissions: string[];
}

export interface Token {
  access_token: string;
  token_type: string;
}

export interface Permission {
  code: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export interface UserCreate {
  email: string;
  password: string;
}

export type Page =
    | "home" | "login" | "register" | "admin" | "adhesion" | "mon-profil" | "donation";

export interface MemberSelfInput {
  first_name?: string;
  last_name?: string;
  address?: string | null;
  birth_date?: string | null;
  family_status?: string | null;
}

export interface AssignmentRead {
  role: string; role_id: number; church_id: number; church_name: string;
}
export interface UserAdmin {
  id: number; email: string; is_active: boolean; created_at: string;
  assignments: AssignmentRead[];
}
export interface RoleAssignmentInput {
  user_id: number; role_id: number; church_id: number;
}

export type DonationCategory =
  | "soutien_spirituel"
  | "action_communautaire"
  | "developpement";

export type DonationCurrency = "CAD" | "USD";

export interface DonationCreate {
  amount: number;
  currency: DonationCurrency;
  category: DonationCategory;
  church_id: number;
}

export interface Donation {
  id: number;
  receipt_number: string;
  amount: number;
  currency: DonationCurrency;
  category: DonationCategory;
  church_id: number;
  member_id: number | null;
  donor_name: string | null;
  donor_email: string | null;
  created_at: string;
}

export type District = "Ouest" | "Est" | "Centre" | "Sud" | "Outremer";

export interface Church {
  id: number;
  name: string;
  parent_id: number | null;
  is_mother: boolean;
  district: District | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  pastor_name: string | null;
  representative: string | null;
  founded_on: string | null;
  created_at: string;
}

export interface ChurchInput {
  name: string;
  district?: District | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  pastor_name?: string | null;
  representative?: string | null;
  founded_on?: string | null;
}

export type MemberStatus = "pending" | "active" | "inactive" | "rejected";

export interface Member {
  id: number;
  church_id: number;
  first_name: string;
  last_name: string;
  email: string;
  address: string | null;
  birth_date: string | null;
  family_status: string | null;
  conversion_date: string | null;
  is_baptized: boolean;
  status: MemberStatus;
  created_at: string;
}

export interface MemberListResult {
  items: Member[];
  total: number;
  limit: number;
  offset: number;
}

export interface MemberQuery {
  q?: string;
  status?: MemberStatus;
  limit?: number;
  offset?: number;
}

export interface MembershipInput {
  church_id: number;
  first_name: string;
  last_name: string;
  email: string;
  address?: string | null;
  birth_date?: string | null;
  family_status?: string | null;
  is_baptized: boolean;
}