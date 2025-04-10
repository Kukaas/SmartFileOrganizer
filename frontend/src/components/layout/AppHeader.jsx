import { ThemeToggle } from '@/components/ui/theme-toggle';
import { FileUpload } from '@/components/features/FileUpload';
import { SearchBar } from '@/components/features/SearchBar';

export function AppHeader({ 
  syncError, 
  onFilesSelected, 
  onSearch, 
  onFilterChange 
}) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-background pt-4 px-4 pb-2 border-b border-border shadow-sm">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Smart File Organizer</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {syncError && (
              <div className="text-sm text-yellow-600 dark:text-yellow-400">
                {syncError}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <FileUpload onFilesSelected={onFilesSelected} />
        <SearchBar
          onSearch={onSearch}
          onFilterChange={onFilterChange}
        />
      </div>
    </div>
  );
} 