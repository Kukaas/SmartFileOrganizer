import { useState, useMemo } from 'react';

export function useFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Filter files for the current view
  const getFilteredFiles = (files, currentSearchQuery = searchQuery, currentFilterType = filterType) => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(currentSearchQuery.toLowerCase());
      
      // Check file type for filtering
      let matchesFilter = currentFilterType === 'all';
      
      if (currentFilterType === 'image') {
        matchesFilter = file.type.startsWith('image/') || file.tags?.includes('image');
      } 
      else if (currentFilterType === 'document') {
        matchesFilter = file.type.includes('document') || 
                        file.type === 'application/pdf' || 
                        file.name.toLowerCase().endsWith('.pdf') ||
                        file.type.includes('text') ||
                        file.tags?.includes('document');
      }
      else if (currentFilterType === 'media') {
        matchesFilter = file.type.startsWith('video/') || 
                        file.type.startsWith('audio/') ||
                        file.tags?.includes('video') ||
                        file.tags?.includes('audio');
      }
      else if (currentFilterType === 'archive') {
        matchesFilter = file.type.includes('zip') || 
                        file.type.includes('archive') ||
                        file.type.includes('compressed') ||
                        file.tags?.includes('archive');
      }
      else if (currentFilterType === 'code') {
        matchesFilter = file.tags?.includes('code');
      }
      
      return matchesSearch && matchesFilter;
    });
  };

  const filteredFiles = (files) => {
    return getFilteredFiles(files);
  };

  return {
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filteredFiles,
    getFilteredFiles
  };
} 