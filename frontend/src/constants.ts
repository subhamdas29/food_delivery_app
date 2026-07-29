import { MenuItem, DeliveryAddress } from './types';

export const RESTAURANT = {
  restaurantId: 'rest-001',
  name: 'Spice Garden',
  cuisine: 'North Indian',
  rating: 4.8,
  ratingCount: '1.2k+',
  deliveryTime: '25-35 min',
  location: 'Park Street, Kolkata',
  bannerImage: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1200&q=80',
};

export const MENU_ITEMS: MenuItem[] = [
  {
    itemId: 'item-1',
    name: 'Butter Chicken',
    unitPrice: 25000, // ₹250.00
    description: 'Tender chicken pieces simmered in rich, creamy tomato and butter gravy with aromatic spices.',
    category: 'Main Course',
    isVeg: false,
  },
  {
    itemId: 'item-2',
    name: 'Paneer Tikka',
    unitPrice: 18000, // ₹180.00
    description: 'Cottage cheese marinated in spices, yogurt, and bell peppers, grilled to perfection in a tandoor.',
    category: 'Starters',
    isVeg: true,
  },
  {
    itemId: 'item-3',
    name: 'Dal Makhani',
    unitPrice: 15000, // ₹150.00
    description: 'Slow-cooked whole black lentils simmered overnight with butter, cream, and subtle Indian spices.',
    category: 'Main Course',
    isVeg: true,
  },
  {
    itemId: 'item-4',
    name: 'Garlic Naan',
    unitPrice: 5000, // ₹50.00
    description: 'Traditional leavened flatbread brushed with garlic butter and fresh cilantro, baked in tandoor.',
    category: 'Breads',
    isVeg: true,
  },
  {
    itemId: 'item-5',
    name: 'Mango Lassi',
    unitPrice: 8000, // ₹80.00
    description: 'Refreshing sweet yogurt drink blended with Alphonso mango pulp and cardamom.',
    category: 'Beverages',
    isVeg: true,
  },
];

export const DEFAULT_ADDRESS: DeliveryAddress = {
  street: '12 MG Road',
  city: 'Kolkata',
  pincode: '700001',
};
