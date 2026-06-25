
import React from 'react';
import { 
  Utensils, 
  Home, 
  Car, 
  Gamepad2, 
  HeartPulse, 
  GraduationCap, 
  MoreHorizontal, 
  Zap, 
  ShoppingBag, 
  CreditCard,
  Smartphone,
  Wifi,
  Droplets,
  Flame,
  ShieldCheck,
  Plane,
  Coffee,
  Dog,
  Briefcase,
  TrendingUp,
  LucideIcon
} from 'lucide-react';

export const categoryIconMap: Record<string, LucideIcon> = {
  'Alimentação': Utensils,
  'Moradia': Home,
  'Transporte': Car,
  'Lazer': Gamepad2,
  'Saúde': HeartPulse,
  'Educação': GraduationCap,
  'Outros': MoreHorizontal,
  'Contas Fixas': Zap,
  'Energia': Zap,
  'Água': Droplets,
  'Gás': Flame,
  'Internet': Wifi,
  'Telefone': Smartphone,
  'Compras': ShoppingBag,
  'Assinaturas': CreditCard,
  'Seguros': ShieldCheck,
  'Viagem': Plane,
  'Café': Coffee,
  'Pet': Dog,
  'Trabalho': Briefcase,
  'Investimentos': TrendingUp,
};

export const getCategoryIcon = (category: string, sizeClass: string = "w-4 h-4") => {
  const Icon = categoryIconMap[category] || MoreHorizontal;
  return <Icon className={sizeClass} />;
};

export const getCategoryIconComponent = (category: string) => {
  return categoryIconMap[category] || MoreHorizontal;
};
