// Brand colors
export const COLORS = {
    primary: '#9f8dcb',
    primaryDark: '#7a68a6',
    accent: '#e0ca00',
    accentDark: '#ceb800',
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
  };
  
  // Framework options
  export const FRAMEWORKS = [
    { id: 'all', name: 'All Frameworks' },
    { id: 'taxonomy', name: 'EU Taxonomy', shortName: 'Taxonomy', color: COLORS.warning },
    { id: 'coc', name: 'Code of Conduct', shortName: 'CoC', color: COLORS.info },
    { id: 'eed', name: 'Energy Efficiency Directive', shortName: 'EED', color: COLORS.success },
  ];
  
  // Document status options
  export const DOCUMENT_STATUS = {
    complete: { color: COLORS.success, text: 'Complete' },
    pending: { color: COLORS.warning, text: 'Pending' },
    review: { color: COLORS.info, text: 'Under Review' },
    draft: { color: '#9e9e9e', text: 'Draft' },
  };
  
  // Data center locations
  export const LOCATIONS = [
    { id: 'global', name: 'Equinix Global' },
    { id: 'london', name: 'London LD7' },
    { id: 'paris', name: 'Paris PA8' },
    { id: 'frankfurt', name: 'Frankfurt FR6' },
    { id: 'singapore', name: 'Singapore SG3' },
    { id: 'tokyo', name: 'Tokyo TY4' },
  ];