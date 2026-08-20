import { RefObject } from 'react';
import { Search, X, Camera, FileText, ChevronLeft, ChevronRight, Star, Gift } from 'lucide-react';

interface GridControlsProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  onOpenDrafts?: () => void;
  draftsCount: number;
  setShowScanner: (v: boolean) => void;
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  showLeftScroll: boolean;
  showRightScroll: boolean;
  scrollCategories: (dir: 'left' | 'right') => void;
  categoriesRef: RefObject<HTMLDivElement>;
  isTouchMode: boolean;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function GridControls({
  searchTerm,
  setSearchTerm,
  searchRef,
  onOpenDrafts,
  draftsCount,
  setShowScanner,
  categories,
  selectedCategory,
  setSelectedCategory,
  showLeftScroll,
  showRightScroll,
  scrollCategories,
  categoriesRef,
  isTouchMode,
  onSearchKeyDown,
}: GridControlsProps) {
  return (
    <div className="p-1 lg:p-6 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-app transition-colors">
      <div className="flex flex-col xl:flex-row gap-3 xl:gap-4 xl:items-center">
        <div className="flex-1 xl:flex-none xl:w-[380px] flex items-center gap-1.5 lg:gap-2.5 w-full min-w-[280px] sm:min-w-[340px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5 lg:h-4 lg:w-4" />
            <input
              ref={searchRef}
              type="text"
              placeholder={"Search or scan..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className={`w-full transition-all bg-gray-50 dark:bg-white/5 dark:text-white border border-gray-200/60 dark:border-white/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-full pl-9 pr-16 lg:pl-11 lg:pr-20 outline-none ${isTouchMode ? 'h-9 lg:h-10 text-xs lg:text-sm' : 'h-9 lg:h-10 text-xs lg:text-sm'
                }`}
            />

            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-full transition-all active:scale-95"
                  title="Clear Search"
                >
                  <X className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                </button>
              )}
              <button
                onClick={() => setShowScanner(true)}
                className="p-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-full transition-all active:scale-95"
                title="Scan with Camera"
              >
                <Camera className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              </button>
            </div>
          </div>
          {onOpenDrafts && (
            <button
              onClick={onOpenDrafts}
              className="h-9 lg:h-10 w-9 lg:w-10 rounded-full bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-gray-200/60 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center justify-center flex-shrink-0 relative transition-all active:scale-95"
              title="View saved drafts"
            >
              <FileText className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              {draftsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[8px] lg:text-[9px] font-black h-4 lg:h-4.5 w-4 lg:w-4.5 flex items-center justify-center rounded-full border border-white dark:border-[#0A0A0A]">
                  {draftsCount}
                </span>
              )}
            </button>
          )}
        </div>

        <div className="relative flex items-center w-full xl:flex-1 min-w-0">
          {showLeftScroll && (
            <button
              onClick={() => scrollCategories('left')}
              className="absolute left-0 z-10 flex items-center justify-center w-7 h-7 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-white/10 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-all focus:outline-none"
              style={{ transform: 'translateX(-50%)' }}
            >
              <ChevronLeft className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
            </button>
          )}

          <div
            ref={categoriesRef}
            className="flex overflow-x-auto space-x-1.5 w-full scrollbar-hide scroll-smooth px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1 px-3 sm:px-4 h-8 sm:h-9 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider active:scale-95 ${selectedCategory === category
                    ? category === '__BUNDLES__'
                      ? 'bg-violet-600 text-white font-black shadow-lg shadow-violet-500/20'
                      : 'bg-primary text-white font-black shadow-lg shadow-emerald-500/20'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'
                  }`}
              >
                {category === 'Featured' && <Star className="w-2.5 h-2.5 lg:w-3 h-3 fill-current" />}
                {category === '__BUNDLES__' && <Gift className="w-2.5 h-2.5 lg:w-3 h-3" />}
                {category === '__BUNDLES__'
                  ? "Bundles & Deals"
                  : category === 'Featured'
                    ? "Featured"
                    : category === 'All'
                      ? "All"
                      : category}
              </button>
            ))}
          </div>

          {showRightScroll && (
            <button
              onClick={() => scrollCategories('right')}
              className="absolute right-0 z-10 flex items-center justify-center w-7 h-7 bg-white dark:bg-[#1C1C1C] border border-gray-200 dark:border-white/10 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-all focus:outline-none"
              style={{ transform: 'translateX(50%)' }}
            >
              <ChevronRight className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
