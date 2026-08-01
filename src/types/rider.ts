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
  itemName: string;
  quantity: number;
  price?: number;
};

export type RiderOrder = {
  _id: string;
  orderNumber?: string;
  orderStatus: string;
  paymentMethod?: string;
  paymentStatus?: string;
  grandTotal: number;
  /** Rider's earning for this trip is the delivery fee plus any tip */
  deliveryFee?: number;
  tipAmount?: number;
  /** Set by the complete-delivery response — what was actually credited */
  earnedAmount?: number;
  orderSize?: string | null;
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
    address?: { street?: string; city?: string };
    location?: { coordinates?: [number, number] };
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
