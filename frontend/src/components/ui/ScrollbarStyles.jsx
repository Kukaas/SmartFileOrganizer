import { useEffect } from 'react';

// Define the scrollbar styles string outside the component for better performance
const scrollbarStyles = `
  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .dark ::-webkit-scrollbar-thumb {
    background: #475569;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  .dark ::-webkit-scrollbar-thumb:hover {
    background: #64748b;
  }
`;

export function ScrollbarStyles() {
  useEffect(() => {
    // Add scrollbar styles
    const style = document.createElement('style');
    style.textContent = scrollbarStyles;
    document.head.appendChild(style);

    // Clean up
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null; // This is a utility component that doesn't render anything
} 