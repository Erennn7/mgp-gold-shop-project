// Format date to local format (DD/MM/YYYY)
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    return date.toLocaleDateString();
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

// Format currency (₹ symbol with commas for thousands)
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '₹0.00';
  
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    console.error('Currency formatting error:', error);
    return '₹0.00';
  }
};

// Format weight (g or kg with proper units)
export const formatWeight = (weight, unit = 'g') => {
  if (weight === undefined || weight === null) return '0g';
  
  try {
    if (unit === 'kg') {
      return `${weight}kg`;
    } else if (unit === 'mg') {
      return `${weight}mg`;
    } else if (unit === 'oz') {
      return `${weight}oz`;
    } else {
      // Default to grams
      return `${weight}g`;
    }
  } catch (error) {
    console.error('Weight formatting error:', error);
    return '0g';
  }
};

// Format percentage (with % symbol)
export const formatPercentage = (value) => {
  if (value === undefined || value === null) return '0%';
  
  try {
    return `${value}%`;
  } catch (error) {
    console.error('Percentage formatting error:', error);
    return '0%';
  }
}; 