'use client';

import { useState } from 'react';

interface GalleryItem {
  id: number;
  title: string;
  category: string;
  beforePlaceholder: string;
  afterPlaceholder: string;
}

interface GalleryGridProps {
  items: GalleryItem[];
}

export default function GalleryGrid({ items }: GalleryGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(items.map((item) => item.category)))];

  const filteredItems = selectedCategory === 'all'
    ? items
    : items.filter((item) => item.category === selectedCategory);

  return (
    <div>
      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full font-medium transition-colors duration-200 ${
              selectedCategory === category
                ? 'bg-emerald-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-2">
              {/* Before */}
              <div className="relative">
                <div className="aspect-square bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-500 text-sm">{item.beforePlaceholder}</span>
                </div>
                <span className="absolute bottom-2 left-2 bg-gray-900 text-white text-xs px-2 py-1 rounded">
                  Before
                </span>
              </div>
              {/* After */}
              <div className="relative">
                <div className="aspect-square bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-600 text-sm">{item.afterPlaceholder}</span>
                </div>
                <span className="absolute bottom-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded">
                  After
                </span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <span className="text-sm text-emerald-600 capitalize">{item.category}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
