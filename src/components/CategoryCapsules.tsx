import './CategoryCapsules.css';
import React from 'react';
import { motion } from 'framer-motion';

interface CategoryCapsulesProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
}

export const CategoryCapsules: React.FC<CategoryCapsulesProps> = ({
  categories,
  activeCategory,
  onSelectCategory
}) => {
  return (
    <div className="category-capsules-scroll">
      {categories.map(cat => {
        const isSelected = activeCategory === cat;
        return (
          <motion.button
            key={cat}
            className={`capsule-pill ${isSelected ? 'active' : ''}`}
            whileTap={{ scale: 0.94 }}
            onClick={() => onSelectCategory(cat)}
          >
            {cat}
          </motion.button>
        );
      })}
    </div>
  );
};
