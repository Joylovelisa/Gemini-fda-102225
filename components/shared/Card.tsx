import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-gradient-to-br from-[var(--color-card-bg-start)] to-[var(--color-card-bg-end)] border-2 border-[var(--color-border)] rounded-xl p-4 md:p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:border-[var(--color-primary)] ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
