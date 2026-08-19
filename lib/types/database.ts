export interface Business {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
}

export type ItemStatus = "in_stock" | "sold";

export interface Item {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  cost: number;
  price: number;
  status: ItemStatus;
  created_at: string;
  sold_at: string | null;
}

export interface Receipt {
  id: string;
  item_id: string;
  business_id: string;
  sale_price: number;
  receipt_number: string;
  created_at: string;
}
