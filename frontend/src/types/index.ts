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


export type Page = "home" | "login" | "register" | "admin" | "adhesion" | "donation" | "sermons" | "blog"| "evenements" | "mon-profil" | "espace" | "mot-de-passe-oublie" | "confidentialite";

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

export interface DonationCategoryCount {
  category: string;
  count: number;
}

export interface TopDonorItem {
  name: string;
  total: number;
  count: number;
}

export interface TopChurchItem {
  church_id: number;
  church_name: string;
  total: number;
}

export interface DonationAdminStats {
  total_cad: number;
  total_usd: number;
  by_category: DonationCategoryCount[];
  top_donors: TopDonorItem[];
  top_churches: TopChurchItem[];
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
  address?: string | null;
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

export interface MemberStatusStats {
  active: number;
  pending: number;
  inactive: number;
  rejected: number;
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

export interface TopSermonItem {
  id: number;
  title: string;
  preacher: string;
  views: number;
}

export interface SermonAdminStats {
  published: number;
  draft: number;
  total_views: number;
  top_sermons: TopSermonItem[];
}

export interface SermonInput {
  title: string;
  preacher: string;
  sermon_date: string;
  description?: string;
  series?: string;
  status?: SermonStatus;
}

// ── Événements ─────────────────────────────────────────────────────────────

export type EventCategory = string;
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type EventRegistrationStatus = "confirmed" | "cancelled";
export type EventFormat = "presentiel" | "en_ligne" | "hybride";

export interface EventItem {
  id: number;
  title: string;
  description: string | null;
  category: EventCategory;
  date_start: string;
  date_end: string | null;
  location: string | null;
  instructor: string | null;
  intervenant_category: string | null;
  price: number | null;
  zeffy_form_path: string | null;
  church_id: number | null;
  district: District | null;
  capacity: number | null;
  show_registration_count: boolean;
  status: EventStatus;
  format: EventFormat;
  online_link: string | null;
  cancel_deadline_hours: number | null;
  confirmation_message: string | null;
  reminder_message: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  registered_count: number;
  spots_left: number | null;
  image_url: string | null;
}

export interface EventListResult {
  items: EventItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface EventInput {
  title: string;
  description?: string | null;
  category: EventCategory;
  date_start: string;
  date_end?: string | null;
  location?: string | null;
  instructor?: string | null;
  intervenant_category?: string | null;
  price?: number | null;
  zeffy_form_path?: string | null;
  church_id?: number | null;
  district?: District | null;
  capacity?: number | null;
  show_registration_count?: boolean;
  status?: EventStatus;
  format?: EventFormat;
  online_link?: string | null;
  cancel_deadline_hours?: number | null;
  confirmation_message?: string | null;
  reminder_message?: string | null;
}

export interface EventRegistrationInput {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface EventRegistration {
  id: number;
  event_id: number;
  member_id: number | null;
  first_name: string;
  last_name: string;
  email: string;
  registered_at: string;
  status: EventRegistrationStatus;
  online_link: string | null;
}

export interface EventRegistrationSummary {
  id: number;
  title: string;
  category: EventCategory;
  date_start: string;
  location: string | null;
  format: EventFormat;
  online_link: string | null;
}

export interface MyEventRegistration {
  id: number;
  event_id: number;
  registered_at: string;
  event: EventRegistrationSummary;
}

export interface TopEventItem {
  id: number;
  title: string;
  category: EventCategory;
  registered_count: number;
}

export interface StatusBreakdownItem {
  status: EventStatus;
  count: number;
}

export interface EventStats {
  top_events: TopEventItem[];
  status_breakdown: StatusBreakdownItem[];
}

// ── Blog ───────────────────────────────────────────────────────────────────

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

export interface TopPostItem {
  id: number;
  title: string;
  author: string;
  views: number;
}

export interface PostAdminStats {
  published: number;
  draft: number;
  total_views: number;
  top_posts: TopPostItem[];
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

// ── Demandes de prière ───────────────────────────────────────────────────────

export type PrayerRequestStatus = "new" | "handled";

export interface PrayerRequestInput {
  message: string;
}

export interface PrayerRequest {
  id: number;
  member_id: number;
  message: string;
  status: PrayerRequestStatus;
  created_at: string;
}

export interface PrayerRequestAdmin extends PrayerRequest {
  member_name: string;
  member_email: string;
}

// ── Demandes de bénévolat ─────────────────────────────────────────────────────

export type VolunteerRequestStatus = "pending" | "approved" | "rejected";

export interface VolunteerRequestInput {
  event_id: number;
  message?: string;
}

export interface VolunteerRequest {
  id: number;
  member_id: number;
  event_id: number;
  event_title: string;
  message: string | null;
  status: VolunteerRequestStatus;
  created_at: string;
}

export interface VolunteerRequestAdmin extends VolunteerRequest {
  member_name: string;
  member_email: string;
}