export const LoadingView = () => {
  return (
    <div className="fixed inset-0 w-full p-4 sm:p-6 space-y-6 bg-gray-50/50 dark:bg-app w-full overflow-hidden animate-pulse">
      {/* Header Row Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 dark:bg-white/5 rounded-xl"></div>
          <div className="h-3.5 w-32 bg-gray-200/60 dark:bg-white/5 rounded-lg"></div>
        </div>
        <div className="h-10 w-full sm:w-64 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
      </div>

      {/* Stats Cards Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-24 bg-gradient-to-br from-gray-200/50 to-gray-200 dark:from-white/[0.03] dark:to-white/[0.01] border border-gray-100 dark:border-white/5 rounded-[1.5rem] p-4 flex flex-col justify-between">
            <div className="h-3 w-16 bg-gray-300 dark:bg-white/10 rounded-lg"></div>
            <div className="h-6 w-24 bg-gray-300 dark:bg-white/10 rounded-xl mt-2"></div>
          </div>
        ))}
      </div>

      {/* Main Workspace Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Heavy Content (Chart/Table) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#080808] border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-6 h-[320px] flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
            <div className="h-8 w-24 bg-gray-200 dark:bg-white/10 rounded-xl"></div>
          </div>
          <div className="flex-1 flex items-end gap-3 mt-6">
            {[35, 60, 45, 80, 50, 75, 40, 95, 70, 85, 55, 90].map((h, i) => (
              <div key={i} className="flex-1 bg-gray-200/60 dark:bg-white/5 rounded-t-xl" style={{ height: `${h}%` }}></div>
            ))}
          </div>
        </div>

        {/* Right Sidebar List */}
        <div className="bg-white dark:bg-[#080808] border border-gray-100 dark:border-white/5 rounded-[2.5rem] p-6 h-[320px] flex flex-col gap-4">
          <div className="h-4 w-28 bg-gray-200 dark:bg-white/10 rounded-lg mb-2"></div>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-white/10"></div>
                <div className="space-y-1.5">
                  <div className="h-3 w-20 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
                  <div className="h-2 w-12 bg-gray-200/60 dark:bg-white/10 rounded-md"></div>
                </div>
              </div>
              <div className="h-4 w-12 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
