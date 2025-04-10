import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export function DeviceIDConflictBanner({ onFixConflict }) {
  return (
    <div className="absolute top-[100px] right-0 left-0 z-10 bg-background pt-4 px-4 pb-2 border-b border-border shadow-sm">
      <div className="flex items-center justify-center">
        <Button onClick={onFixConflict}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Fix Device ID Conflict
        </Button>
      </div>
    </div>
  );
} 