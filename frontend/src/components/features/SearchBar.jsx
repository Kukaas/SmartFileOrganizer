import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SearchBar({ onSearch, onFilterChange }) {
  return (
    <div className="flex gap-2 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search files..."
          className="pl-9 h-9"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
      <div className="relative">
        <Select onValueChange={onFilterChange} defaultValue="all">
          <SelectTrigger className="w-[150px] h-9 gap-1">
            <Filter className="h-3.5 w-3.5 opacity-70" />
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent position="popper" align="end" className="w-[150px]">
            <SelectItem value="all">All Files</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="document">Documents & PDFs</SelectItem>
            <SelectItem value="media">Audio & Video</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
} 