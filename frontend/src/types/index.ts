export interface UserInfo {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  roles: string[];
  permissions: string[];
  is_global_admin: boolean;
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

export type Page = "home" | "login" | "register" | "admin" | "adhesion" | "donation" | "sermons" | "blog" | "mon-profil" | "mot-de-passe-oublie";

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
  category: DonationCategory | null;
  church_id: number | null;
  member_id: number | null;
  donor_name: string | null;
  donor_email: string | null;
  payment_reference: string | null;
  payment_status: string;
  created_at: string;
}

export type District = "Ouest" | "Est" | "Centre" | "Sud" | "Outremer";

export interface ParameterValue {
  id: number;
  category: string;
  label: string;
  position: number;
}

export interface AppSetting {
  key: string;
  value: string;
  description: string;
}

export interface Church {
  id: number;
  name: string;
  parent_id: number | null;
  is_mother: boolean;
  is_active: boolean;
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

export type ChurchUpdateInput = Partial<ChurchInput> & { is_active?: boolean };

export interface MemberSelfInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  address?: string | null;
  birth_date?: string | null;
  sexe?: string | null;
  telephone?: string | null;
  family_status?: string | null;
}

export interface MemberUpdateInput {
  first_name?: string;
  last_name?: string;
  address?: string | null;
  birth_date?: string | null;
  sexe?: string | null;
  telephone?: string | null;
  family_status?: string | null;
  conversion_date?: string | null;
  is_baptized?: boolean;
}

export interface AssignmentRead {
  role: string;
  role_id: number;
  church_id: number;
  church_name: string;
}

export interface UserAdmin {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
  assignments: AssignmentRead[];
}

export interface RoleAssignmentInput {
  user_id: number;
  role_id: number;
  church_id: number;
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
  sexe: string | null;
  telephone: string | null;
  family_status: string | null;
  conversion_date: string | null;
  is_baptized: boolean;
  member_code: string | null;
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

export interface MemberImportRowError {
  row: number;
  email: string | null;
  message: string;
}

export interface MemberImportResult {
  created: number;
  errors: MemberImportRowError[];
}

export interface MembershipInput {
  church_id: number;
  first_name: string;
  last_name: string;
  email: string;
  address?: string | null;
  birth_date?: string | null;
  sexe?: string | null;
  telephone?: string | null;
  family_status?: string | null;
  is_baptized: boolean;
}

export type SermonFormat = "audio" | "video";
export type SermonStatus = "draft" | "published" | "archived";

export interface Sermon {
  id: number;
  title: string;
  preacher: string;
  sermon_date: string;
  description: string | null;
  series: string | null;
  format: SermonFormat;
  status: SermonStatus;
  duration_seconds: number | null;
  views: number;
  created_at: string;
}

export interface SermonListResult {
  items: Sermon[];
  total: number;
  limit: number;
  offset: number;
}

export interface SermonInput {
  title: string;
  preacher: string;
  sermon_date: string;
  description?: string;
  series?: string;
  status?: SermonStatus;
}

export type PostStatus = "draft" | "published" | "archived";

export interface Post {
  id: number;
  title: string;
  content: string;
  excerpt: string | null;
  author: string;
  status: PostStatus;
  category: string | null;
  cover_image_url: string | null;
  views: number;
  created_at: string;
  updated_at: string | null;
}

export interface PostListResult {
  items: Post[];
  total: number;
  limit: number;
  offset: number;
}

export interface PostInput {
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  status?: PostStatus;
  category?: string;
  cover_image_url?: string;
}