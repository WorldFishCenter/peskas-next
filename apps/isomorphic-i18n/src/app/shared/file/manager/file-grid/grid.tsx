// Simple card component replacement for removed file manager
import React from 'react';
import { PiFile } from 'react-icons/pi';

interface CardProps {
  item: {
    id: string;
    name: string;
    size?: string;
    type?: string;
    modified?: string;
  };
  className?: string;
}

export function Card({ item, className = '' }: CardProps) {
  return (
    <div className={`p-4 border rounded-lg hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center gap-3">
        <PiFile className="w-8 h-8 text-gray-400" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
          {item.size && (
            <p className="text-sm text-gray-500">{item.size}</p>
          )}
          {item.modified && (
            <p className="text-xs text-gray-400">{item.modified}</p>
          )}
        </div>
      </div>
    </div>
  );
}