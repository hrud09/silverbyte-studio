import React from 'react';
import {
  Gamepad2,
  BarChart3,
  Wrench,
  Tv,
  Settings,
  Heart,
  GraduationCap,
  MessageSquare,
  Grid,
  Sparkles,
  Smartphone,
  Folder,
  Layers,
  Compass,
  Building2,
  Users,
} from 'lucide-react';

const iconMap = {
  Gamepad2,
  BarChart3,
  Wrench,
  Tv,
  Settings,
  Heart,
  GraduationCap,
  MessageSquare,
  Grid,
  Sparkles,
  Smartphone,
  Folder,
  Layers,
  Compass,
  Building2,
  Users,
};

export default function CategoryIcon({ name, size = 18, className = '', color }) {
  const IconComponent = iconMap[name] || Grid;
  return <IconComponent size={size} className={className} style={color ? { color } : undefined} />;
}
