import React from 'react';
import * as Icons from 'lucide-react';

interface IconRendererProps {
  name: string;
  className?: string;
  color?: string;
  size?: number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, className = 'w-5 h-5', color, size }) => {
  // Normalize icon name
  const cleanName = name ? name.trim() : 'Tag';
  
  // Find component in Lucide Icons
  const IconComponent = (Icons as any)[cleanName] || (Icons as any)['Tag'] || Icons.CircleDot;

  return <IconComponent className={className} style={color ? { color } : undefined} size={size} />;
};
