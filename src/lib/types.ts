export type UserRole = "buyer" | "restaurant" | "rider" | "admin";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "rider_assigned"
  | "picked_up"
  | "delivered"
  | "rejected"
  | "cancelled"
  | "refund_requested";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  phone: string | null;
  is_approved: boolean;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  address: string;
  lat: number | null;
  lng: number | null;
  is_approved: boolean;
  is_open: boolean;
  min_order_rs: number;
  packaging_fee_rs: number;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string;
  price_rs: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  restaurant_id: string;
  rider_id: string | null;
  status: OrderStatus;
  subtotal_rs: number;
  delivery_fee_rs: number;
  packaging_fee_rs: number;
  total_rs: number;
  payment_method: string;
  delivery_address: string;
  note: string;
  placed_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  name_snapshot: string;
  price_rs: number;
  qty: number;
}
