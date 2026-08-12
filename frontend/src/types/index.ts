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


export type Page = "home" | "login" | "admin" | "organiser-evenements" | "adhesion" | "donation" | "sermons" | "blog"| "evenements" | "actualites" | "leadership" | "mon-profil" | "espace" | "mot-de-passe-oublie" | "confidentialite" | "qui-sommes-nous";

export type DonationCategory =
  | "soutien_spirituel"
  | "action_communautaire"
  | "developpement";

export type DonationCurrency = "CAD" | "USD";

export type ContributionType = "don" | "dime" | "offrande";

export interface DonationCreate {
  amount: number;
  currency: DonationCurrency;
  category: DonationCategory;
  contribution_type?: ContributionType;
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
  contribution_type: ContributionType;
  church_id: number | null;
  member_id: number | null;
  donor_id: number | null;
  donor_name: string | null;
  donor_email: string | null;
  payment_reference: string | null;
  payment_status: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

export interface DonationManualInput {
  amount: number;
  currency?: DonationCurrency;
  category?: DonationCategory;
  contribution_type?: ContributionType;
  church_id?: number | null;
  member_id?: number | null;
  donor_id?: number | null;
  donor_name?: string;
  donor_email?: string;
  received_on?: string;
}

export interface Donor {
  id: number;
  name: string;
  email: string | null;
}

export interface DonationListResult {
  items: Donation[];
  total: number;
  limit: number;
  offset: number;
}

export type District = "Ouest" | "Est" | "Centre" | "Sud" | "Outremer" | "National";

export const DISTRICTS: District[] = ["Ouest", "Est", "Centre", "Sud", "Outremer", "National"];

export interface Expense {
  id: number;
  amount: number;
  expense_date: string;
  category: string;
  church_id: number | null;
  responsible_id: number;
  responsible_email: string;
  comment: string;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

export interface ExpenseInput {
  amount: number;
  expense_date: string;
  category: string;
  comment: string;
  church_id?: number | null;
}

export interface ExpenseListResult {
  items: Expense[];
  total: number;
  limit: number;
  offset: number;
}

export type FinancePeriod = "day" | "week" | "month" | "year" | "custom";

export interface FinanceTransaction {
  date: string;
  type: string;
  category: string;
  amount: number;
  currency: string;
  party: string;
  note: string;
  attachment_url: string | null;
}

export interface FinanceReport {
  period_start: string;
  period_end: string;
  income_cad: number;
  income_usd: number;
  expenses_total: number;
  balance: number;
  income_count: number;
  expense_count: number;
  transactions: FinanceTransaction[];
}

export interface ParameterValue {
  id: number;
  category: string;
  label: string;
  position: number;
  restricted_to_sexe: string | null;
}

export interface AppSetting {
  key: string;
  value: string;
  description: string;
}

export interface MenuItem {
  id: number;
  label: string;
  target_page: string;
  position: number;
  is_visible: boolean;
}

export interface MenuItemInput {
  label?: string;
  target_page?: string;
  position?: number;
  is_visible?: boolean;
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

export interface OrganiserEventCount {
  user_id: number;
  event_count: number;
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
  family_status?: string;
  limit?: number;
  offset?: number;
}

export interface MemberStatusStats {
  active: number;
  pending: number;
  inactive: number;
  rejected: number;
}

export interface MemberBirthday {
  id: number;
  first_name: string;
  last_name: string;
  birth_date: string;
}

export interface BirthdaysOverview {
  today: MemberBirthday[];
  this_month: MemberBirthday[];
}

export interface MinistryAffiliation {
  id: number;
  member_id: number;
  ministry: string;
  joined_at: string;
  left_at: string | null;
  created_at: string;
}

export interface MinistryMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  affiliation_id: number;
  joined_at: string;
}

export interface MinistryBulkAddResult {
  added: number[];
  skipped: number[];
}

export interface MinistryStatsItem {
  ministry: string;
  count: number;
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
  volunteer_capacity: number | null;
  volunteer_auto_approve: boolean;
  volunteer_message: string | null;
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
  volunteer_capacity?: number | null;
  volunteer_auto_approve?: boolean;
  volunteer_message?: string | null;
}

export interface VolunteerOpportunity {
  event_id: number;
  title: string;
  date_start: string;
  location: string | null;
  church_id: number | null;
  volunteer_capacity: number;
  volunteer_spots_left: number;
  volunteer_message: string | null;
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

// ── Actualités ────────────────────────────────────────────────────────────────

export type NewsStatus = "draft" | "published" | "archived";

export interface News {
  id: number;
  title: string;
  content: string;
  excerpt: string | null;
  author: string;
  status: NewsStatus;
  category: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  position: number;
  views: number;
  created_at: string;
  updated_at: string | null;
}

export interface NewsListResult {
  items: News[];
  total: number;
  limit: number;
  offset: number;
}

export interface NewsInput {
  title: string;
  content: string;
  excerpt?: string;
  author: string;
  status?: NewsStatus;
  category?: string;
  cover_image_url?: string;
  is_featured?: boolean;
  position?: number;
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
  handled_by: number | null;
  handled_by_email: string | null;
  handled_at: string | null;
}

// ── Demandes libres des membres ──────────────────────────────────────────────

export type MemberRequestStatus = "new" | "in_progress" | "resolved";

export interface MemberRequestInput {
  request_type: string;
  message: string;
}

export interface MemberRequest {
  id: number;
  member_id: number;
  request_type: string;
  message: string;
  status: MemberRequestStatus;
  admin_response: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface MemberRequestAdmin extends MemberRequest {
  member_name: string;
  member_email: string;
  handled_by: number | null;
  handled_by_email: string | null;
}

export interface MemberRequestAdminStats {
  new: number;
  in_progress: number;
  resolved: number;
  total: number;
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

// ── Corps de leadership ─────────────────────────────────────────────────────

export type LeaderRole = "pastor" | "elder" | "deacon" | "department_head";

export interface Leader {
  id: number;
  first_name: string;
  last_name: string;
  title: string;
  role: string;
  district: District | null;
  church_id: number | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  years_of_service: number | null;
  is_published: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
  photo_url: string | null;
}

export interface LeaderListResult {
  items: Leader[];
  total: number;
  limit: number;
  offset: number;
}

export interface LeaderInput {
  first_name: string;
  last_name: string;
  title: string;
  role: string;
  district?: District | null;
  church_id?: number | null;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  years_of_service?: number | null;
  is_published?: boolean;
  order_index?: number;
}