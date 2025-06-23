// usePageContext.js - Place this file in src/components/utils
import { useEffect } from 'react';
import { useChatContext } from './ChatContext';

/**
 * Hook to update the chat context with information about the current page
 * 
 * @param {Object} pageInfo - Information about the current page
 * @param {string} pageInfo.pageName - Name of the current page
 * @param {string} pageInfo.additionalContext - Additional context from the page (optional)
 * @param {Object} pageInfo.data - Data available on the page (optional)
 */
const usePageContext = (pageInfo) => {
  const { updatePageContext } = useChatContext();
  
  useEffect(() => {
    if (pageInfo && pageInfo.pageName) {
      updatePageContext(pageInfo);
    }
    
    // Cleanup function to reset context when component unmounts
    return () => {
      // Optional: you could reset the context here if needed
      // updatePageContext(null);
    };
  }, [pageInfo, updatePageContext]);
  
  return null;
};

export default usePageContext;