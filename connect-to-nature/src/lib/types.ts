import type { Locale } from '@/i18n/config';

export type I18nJson = Partial<Record<Locale, string>>;

export type ActivityCategory =
  | 'farming' | 'trekking' | 'water' | 'food' | 'camping' | 'culture' | 'craft' | 'stars';

export type Slot = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

export type ListingStatus = 'draft' | 'pending' | 'published' | 'paused' | 'rejected';
export type VerificationStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed' | 'demo';
export type UserRole = 'traveler' | 'host' | 'admin';

export interface Region {
  id: string;
  slug: string;
  name: I18nJson;
  tagline: I18nJson;
  description: I18nJson;
  districts: I18nJson[];
  season: I18nJson;
  reach: I18nJson;
  hero_scene: string;
  accent: string;
  sort_order: number;
  is_active: boolean;
  listing_count?: number;
}

export interface Activity {
  id: string;
  slug: string;
  name: I18nJson;
  description: I18nJson;
  category: ActivityCategory;
  duration_minutes: number;
  slots: Slot[];
}

export interface HostProfile {
  id: string;
  user_id: string | null;
  farm_name: I18nJson;
  host_name: I18nJson;
  bio: I18nJson;
  region_id: string;
  district: string;
  village: I18nJson;
  phone: string | null;
  land_acres: number | null;
  languages: string[];
  verification_status: VerificationStatus;
  hosting_since: number | null;
}

export interface ListingPhoto {
  id: string;
  url: string;
  alt: I18nJson;
  position: number;
}

export interface Listing {
  id: string;
  host_id: string;
  slug: string;
  title: I18nJson;
  description: I18nJson;
  region_id: string;
  district: string;
  village: I18nJson;
  stay_type: string;
  scene: string;
  crops: string[];
  base_price: number;
  max_guests: number;
  bedrooms: number;
  best_months: number[];
  lat: number | null;
  lng: number | null;
  status: ListingStatus;
  rating: number;
  review_count: number;
  is_featured: boolean;
  host?: HostProfile;
  region?: Region;
  photos?: ListingPhoto[];
  activities?: Activity[];
}

export interface ItineraryItem {
  day: 1 | 2;
  slot: Slot;
  time: string;
  activity_id?: string;
  activity_slug?: string;
  title: I18nJson;
  note: I18nJson;
  category?: ActivityCategory;
}

export interface TripPackage {
  id: string;
  slug: string;
  title: I18nJson;
  summary: I18nJson;
  region_id: string;
  listing_id: string | null;
  duration_days: number;
  price_per_person: number;
  itinerary: ItineraryItem[];
  is_featured: boolean;
  listing?: Listing;
  region?: Region;
}

export interface Booking {
  id: string;
  code: string;
  traveler_id: string | null;
  listing_id: string;
  trip_package_id: string | null;
  itinerary_id: string | null;
  start_date: string;
  end_date: string;
  guest_count: number;
  guest_name: string;
  guest_phone: string;
  guest_note: string | null;
  language: string;
  total_amount: number;
  farmer_amount: number;
  platform_fee: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  created_at: string;
  listing?: Listing;
}

export interface Review {
  id: string;
  booking_id: string;
  listing_id: string;
  rating: number;
  comment: I18nJson;
  created_at: string;
  guest_name?: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  preferred_language: string;
}
