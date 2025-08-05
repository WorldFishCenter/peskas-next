// Simple favorite component replacement for removed file manager
import React from 'react';
import { PiHeart, PiHeartFill } from 'react-icons/pi';

interface FavoriteProps {
  isFavorite?: boolean;
  onClick?: () => void;
  className?: string;
}

export default function Favorite({ 
  isFavorite = false, 
  onClick, 
  className = '' 
}: FavoriteProps) {
  return (
    <button
      onClick={onClick}
      className={`text-gray-400 hover:text-red-500 transition-colors ${className}`}
      type="button"
    >
      {isFavorite ? (
        <PiHeartFill className="w-4 h-4 text-red-500" />
      ) : (
        <PiHeart className="w-4 h-4" />
      )}
    </button>
  );
}