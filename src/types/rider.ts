export type VehicleType = 'bike' | 'scooter' | 'bicycle' | 'car';
export type RiderAvailability = 'available' | 'busy' | 'offline';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export type RiderProfile = {
  _id: string;
  userId: string;
  riderCode: string;
  vehicleType: VehicleType;
  vehicleNumber?: string;
  drivingLicense?: string;
  aadhaarCard?: string;
  profileImage?: string;
  bankAccountDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  onlineStatus: boolean;
  availabilityStatus: RiderAvailability;
  currentOrderId?: string;
  activeOrderIds?: string[];
  averageRating: number;
  totalDeliveries: number;
  totalEarnings: number;
  todayEarnings: number;
  verificationStatus: VerificationStatus;
};

export type RiderUser = {
  _id: string;
  fullName?: string;
  email: string;
  mobile?: string;
  profileImage?: string;
  role?: string;
};

export type RiderOrderItem = {
  id?: string;
  _id?: string;
  itemType?: string;
  /** Get Anything: customer reference photos. */
  imageUrls?: string[];
  itemName: string;
  quantity: number;
  price?: number;
  restaurantId?: string;
  specialInstructions?: string | null;
  fulfillmentStatus?: string | null;
  unavailableReason?: string | null;
};

export type RiderChatMessage = {
  id: string;
  _id?: string;
  body: string;
  senderId?: string;
  senderRole?: 'CUSTOMER' | 'RIDER' | 'OTHER' | string;
  createdAt?: string;
};

export type RiderOrder = {
  _id: string;
  orderNumber?: string;
  orderStatus: string;
  awaitingCustomerDecision?: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
  grandTotal: number;
  totalUsd?: number | null;
  usdRateSnapshot?: number | null;
  payInUsd?: boolean;
  cashDueUsd?: number | null;
  cashDueAtDelivery?: number;
  walletDeduction?: number;
  /** Rider's earning for this trip is the delivery fee plus any tip */
  deliveryFee?: number;
  /** Get Anything — fee is set by rider at delivery, confirmed by customer. */
  deliveryFeeDeferred?: boolean;
  settlement?: {
    deliveryFeeDeferred?: boolean;
    pendingDeliveryFee?: number | null;
  } | null;
  tipAmount?: number;
  /** Set by the complete-delivery response — what was actually credited */
  earnedAmount?: number;
  orderSize?: string | null;
  /** Customer order-level note / comments */
  generalNote?: string | null;
  notes?: string | null;
  items?: RiderOrderItem[];
  orderItems?: RiderOrderItem[];
  deliveryAddress?: {
    street?: string;
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  customerAddress?: {
    fullAddress?: string;
    street?: string;
    city?: string;
    pincode?: string;
    latitude?: number;
    longitude?: number;
  };
  restaurantId?: {
    _id: string;
    restaurantName?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    addressStreet?: string;
    addressCity?: string;
    address?: { street?: string; city?: string };
    location?: { coordinates?: [number, number] };
  };
  /** All stores on multi-store CASE orders (primary + secondary pickups). */
  pickups?: Array<{
    _id: string;
    restaurantName?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    addressStreet?: string;
    addressCity?: string;
    address?: { street?: string; city?: string };
  }>;
  storeNames?: string[];
  deliveryPoint?: {
    id?: string;
    name?: string;
    campus?: string;
  };
  customerId?: {
    _id: string;
    fullName?: string;
    mobile?: string;
  };
  riderLocation?: { latitude: number; longitude: number; heading?: number };
  createdAt?: string;
  riderId?: string | null;
};

export type RiderEarnings = {
  totalEarnings: number;
  todayEarnings: number;
  totalDeliveries: number;
};

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};
