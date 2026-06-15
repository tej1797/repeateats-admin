// ─── Existing RepeatEats tables (read-only from admin) ───────────────────────

export type UserRow = {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  radius_km: number | null;
  role: string | null;
  created_at: string;
};

export type RestaurantRow = {
  id: string;
  owner_id: string | null;
  name: string;
  cuisine: string | null;
  category: string | null;
  city: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  is_live: boolean;
  open_to_collabs: boolean;
  rating: number | null;
  review_count: number | null;
  created_at: string;
};

export type DealRow = {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  discount_type: string | null;
  discount_value: string | null;
  deal_types: string[];
  available_days: string[];
  emoji: string | null;
  max_claims: number | null;
  current_claims: number;
  is_coming: boolean;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  created_at: string;
};

export type ClaimRow = {
  id: string;
  deal_id: string;
  user_id: string;
  qr_code: string;
  status: "claimed" | "redeemed" | "expired";
  claimed_at: string;
  redeemed_at: string | null;
};

export type InfluencerRow = {
  id: string;
  user_id: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  follower_count: number | null;
  niche: string | null;
  bio: string | null;
  rating: number | null;
  total_collabs: number | null;
  created_at: string;
};

export type CollabRow = {
  id: string;
  restaurant_id: string;
  influencer_id: string | null;
  offer_amount_min: number | null;
  offer_amount_max: number | null;
  deliverables: string | null;
  status: "open" | "negotiating" | "accepted" | "completed" | "cancelled";
  payment_status: "pending" | "escrowed" | "released";
  created_at: string;
};

// ─── New admin tables ─────────────────────────────────────────────────────────

export type TicketPortal = "customer" | "restaurant" | "creator";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "normal" | "urgent";
export type TicketCategory =
  | "claim_issue"
  | "redemption_issue"
  | "technical"
  | "payment"
  | "collab"
  | "account"
  | "general";

export type SupportTicket = {
  id: string;
  user_id: string | null;
  user_email: string;
  user_name: string | null;
  portal: TicketPortal;
  subject: string;
  category: TicketCategory;
  status: TicketStatus;
  priority: TicketPriority;
  first_response_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  unread_count?: number;
  last_message_at?: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin";
  sender_id: string | null;
  message: string;
  is_internal_note: boolean;
  created_at: string;
};

export type SupportEmailLog = {
  id: string;
  ticket_id: string;
  to_email: string;
  subject: string;
  body: string;
  sent_at: string;
};

export type QuickReplyTemplate = {
  id: string;
  title: string;
  body: string;
  category: TicketCategory | "all";
  created_at: string;
};

export type TicketSLAConfig = {
  id: string;
  priority: TicketPriority;
  target_hours: number;
};

// Email outreach
export type EmailProspect = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  source: "google_places" | "manual";
  status: "prospect" | "emailed" | "registered";
  google_place_id: string | null;
  created_at: string;
};

export type EmailCampaign = {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: "draft" | "sent";
  sent_at: string | null;
  total_sent: number;
  created_at: string;
};

export type CampaignSend = {
  id: string;
  campaign_id: string;
  prospect_id: string;
  to_email: string;
  sent_at: string | null;
  opened_at: string | null;
  status: "pending" | "sent" | "failed";
};

// ─── Composite types used in UI ───────────────────────────────────────────────

export type TicketWithUser = SupportTicket & {
  user?: UserRow;
};

export type DashboardStats = {
  tickets: {
    open: number;
    urgent: number;
    in_progress: number;
    resolved_today: number;
    new_since_last_visit: number;
  };
  avg_first_response_hours: number;
  top_categories: { category: TicketCategory; count: number }[];
  daily_volume: { date: string; count: number }[];
};

export type AnalyticsOverview = {
  total_customers: number;
  new_customers_7d: number;
  new_customers_30d: number;
  total_restaurants: number;
  new_restaurants_7d: number;
  total_creators: number;
  total_claims: number;
  total_redeems: number;
  redemption_rate: number;
  total_collabs: number;
  active_collabs: number;
};

export type RestaurantPerformance = {
  restaurant: RestaurantRow;
  total_deals: number;
  total_claims: number;
  total_redeems: number;
  redemption_rate: number;
  has_discrepancy: boolean;
};

export type DealPerformance = {
  deal: DealRow;
  total_claims: number;
  total_redeems: number;
  redemption_rate: number;
};
