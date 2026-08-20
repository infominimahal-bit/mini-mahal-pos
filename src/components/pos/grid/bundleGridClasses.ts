export function getGridClasses(gridCols: number): string {
  const base = "grid gap-2 lg:gap-4";
  const mobileDefaults = "grid-cols-[repeat(auto-fill,minmax(110px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]";
  const desktopCols: Record<number, string> = {
    1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4",
    5: "lg:grid-cols-5", 6: "lg:grid-cols-6", 7: "lg:grid-cols-7", 8: "lg:grid-cols-8",
  };
  const desktopClass = gridCols === 0
    ? "lg:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]"
    : (desktopCols[gridCols] || "lg:grid-cols-4");
  return `${base} ${mobileDefaults} ${desktopClass}`;
}
