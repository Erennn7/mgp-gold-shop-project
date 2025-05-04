import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent
} from '@mui/material';
import {
  Add,
  Delete,
  ArrowBack,
  Save,
  ShoppingBasket,
  Person,
  Inventory
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const NewSale = () => {
  const navigate = useNavigate();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [goldRates, setGoldRates] = useState({});
  const [silverRates, setSilverRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [showNewProductDialog, setShowNewProductDialog] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Form state
  const [formData, setFormData] = useState({
    customer: '',
    invoiceNumber: `INV-${new Date().getTime().toString().substr(-6)}`, // Generate a unique invoice number
    items: [createEmptyItem()],
    subtotal: 0,
    discount: 0,
    discountPercentage: 0, // Add discount percentage
    gst: 0,
    gstPercentage: 3, // Default GST percentage
    makingChargesPercentage: 3, // Default making charges percentage for the whole sale
    totalAmount: 0,
    paymentMethod: 'cash',
    paymentStatus: 'completed',
    notes: '',
    soldBy: '646f12fa639d443ec9108e8f' // Use a default user ID for now
  });
  
  // New customer form
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    customerType: 'regular'
  });
  
  // New product form
  const [newProduct, setNewProduct] = useState({
    name: '',
    hoid: '',
    category: 'jewellery',
    description: '',
    metalType: 'gold',
    purity: '24K',
    netWeight: '',
    grossWeight: '',
    hasStones: false,
    stoneDetails: '',
    pricePerGram: 0,
    quantity: 1,
    images: []
  });
  
  // Get database context
  const { db } = useDatabase();
  
  // State for removal confirmation
  const [removeConfirm, setRemoveConfirm] = useState({
    open: false,
    index: null,
    name: ''
  });
  
  // Effect to fetch data on mount
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  // Effect to calculate totals when items change
  useEffect(() => {
    // Use a ref to track whether this is the first render
    const hasItems = formData.items.some(item => 
      item.name && 
      parseFloat(item.netWeight) > 0 && 
      parseFloat(item.pricePerGram) > 0
    );
    
    if (hasItems) {
      console.log("Recalculating totals due to form changes");
      calculateTotals();
    }
  }, [
    formData.items.map(item => item.product).join(','), 
    formData.items.map(item => item.netWeight).join(','),
    formData.items.map(item => item.pricePerGram).join(','),
    formData.items.map(item => item.quantity).join(','),
    formData.discountPercentage, 
    formData.gstPercentage, 
    formData.makingChargesPercentage
  ]);
  
  // Function to create an empty item
  function createEmptyItem() {
    return {
      product: '', // selected product id
      name: '',
      hoid: '',
      metalType: 'gold',
      purity: '24K',
      netWeight: '',
      grossWeight: '',
      hasStones: false,
      stoneDetails: '',
      pricePerGram: 0,
      makingCharges: 0,
      makingChargesPercentage: 3, // Default making charges percentage
      isCalculatedMakingCharges: true,
      quantity: 1,
      totalPrice: 0,
      isSmallItem: false, // explicitly set to false by default
      stonePrice: 0
    };
  }
  
  // Fetch initial data (customers, products, rates)
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      // Fetch data in parallel for better performance
      const fetchPromises = [
        fetchCustomers(),
        fetchProducts(),
        fetchRates()
      ];
      
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load data. Some features may be limited.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const online = await getNetworkStatus();
      
      if (online) {
        const response = await api.get('/api/customers');
        if (response.data.success) {
          setCustomers(response.data.data || []);
        }
      } else if (db) {
        const cachedCustomers = await db.customers.toArray();
        setCustomers(cachedCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (db) {
        const cachedCustomers = await db.customers.toArray();
        setCustomers(cachedCustomers);
      }
    }
  };
  
  // Fetch products
  const fetchProducts = async () => {
    try {
      const online = await getNetworkStatus();
      
      if (online) {
        const response = await api.get('/api/products');
        if (response.data.success) {
          setProducts(response.data.data || []);
        }
      } else if (db) {
        const cachedProducts = await db.products.toArray();
        setProducts(cachedProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      if (db) {
        const cachedProducts = await db.products.toArray();
        setProducts(cachedProducts);
      }
    }
  };
  
  // Fetch current gold/silver rates
  const fetchRates = async () => {
    try {
      const online = await getNetworkStatus();
      
      if (online) {
        // Fetch all gold prices
        const goldResponse = await api.get('/api/prices?metalType=gold');
        // Fetch all silver prices
        const silverResponse = await api.get('/api/prices?metalType=silver');
        
        // Create objects to store rates by purity
        const goldRatesByPurity = {};
        const silverRatesByPurity = {};
        
        if (goldResponse.data.success && goldResponse.data.data.length > 0) {
          // Group gold prices by purity and use the latest for each
          const goldPrices = goldResponse.data.data;
          
          // Create a map of the latest price for each purity
          const goldPuritiesMap = {};
          
          // First pass to find the latest date for each purity
          goldPrices.forEach(price => {
            const purity = price.purity;
            const date = new Date(price.effectiveDate);
            
            if (!goldPuritiesMap[purity] || date > new Date(goldPuritiesMap[purity].effectiveDate)) {
              goldPuritiesMap[purity] = price;
            }
          });
          
          // Convert map to the rates object
          Object.keys(goldPuritiesMap).forEach(purity => {
            goldRatesByPurity[purity] = goldPuritiesMap[purity].pricePerGram;
          });
          
          // Set default 24K price if available for backward compatibility
          const defaultGoldRate = goldPuritiesMap['24K'] ? goldPuritiesMap['24K'].pricePerGram : 0;
          
          setGoldRates(goldRatesByPurity);
        }
        
        if (silverResponse.data.success && silverResponse.data.data.length > 0) {
          // Group silver prices by purity and use the latest for each
          const silverPrices = silverResponse.data.data;
          
          // Create a map of the latest price for each purity
          const silverPuritiesMap = {};
          
          // First pass to find the latest date for each purity
          silverPrices.forEach(price => {
            const purity = price.purity;
            const date = new Date(price.effectiveDate);
            
            if (!silverPuritiesMap[purity] || date > new Date(silverPuritiesMap[purity].effectiveDate)) {
              silverPuritiesMap[purity] = price;
            }
          });
          
          // Convert map to the rates object
          Object.keys(silverPuritiesMap).forEach(purity => {
            silverRatesByPurity[purity] = silverPuritiesMap[purity].pricePerGram;
          });
          
          // Set default 99.9% price if available for backward compatibility
          const defaultSilverRate = silverPuritiesMap['99.9%'] ? silverPuritiesMap['99.9%'].pricePerGram : 0;
          
          setSilverRates(silverRatesByPurity);
        }
        
        // Update any existing gold/silver items with new rates
        updateItemsWithCurrentRates();
      } else if (db) {
        // If offline, use IndexedDB
        const goldPrices = await db.prices
          .where('metalType')
          .equals('gold')
          .toArray();
          
        const silverPrices = await db.prices
          .where('metalType')
          .equals('silver')
          .toArray();
          
        // Create objects to store rates by purity
        const goldRatesByPurity = {};
        const silverRatesByPurity = {};
        
        if (goldPrices.length > 0) {
          // Create a map to track the latest date for each purity
          const goldPuritiesMap = {};
          
          // First pass to find the latest date for each purity
          goldPrices.forEach(price => {
            const purity = price.purity;
            const date = new Date(price.effectiveDate);
            
            if (!goldPuritiesMap[purity] || date > new Date(goldPuritiesMap[purity].effectiveDate)) {
              goldPuritiesMap[purity] = price;
            }
          });
          
          // Convert map to the rates object
          Object.keys(goldPuritiesMap).forEach(purity => {
            goldRatesByPurity[purity] = goldPuritiesMap[purity].pricePerGram;
          });
          
          setGoldRates(goldRatesByPurity);
        }
        
        if (silverPrices.length > 0) {
          // Create a map to track the latest date for each purity
          const silverPuritiesMap = {};
          
          // First pass to find the latest date for each purity
          silverPrices.forEach(price => {
            const purity = price.purity;
            const date = new Date(price.effectiveDate);
            
            if (!silverPuritiesMap[purity] || date > new Date(silverPuritiesMap[purity].effectiveDate)) {
              silverPuritiesMap[purity] = price;
            }
          });
          
          // Convert map to the rates object
          Object.keys(silverPuritiesMap).forEach(purity => {
            silverRatesByPurity[purity] = silverPuritiesMap[purity].pricePerGram;
          });
          
          setSilverRates(silverRatesByPurity);
        }
        
        // Update any existing gold/silver items with current rates
        updateItemsWithCurrentRates();
      }
    } catch (error) {
      console.error('Error fetching rates:', error);
      if (db) {
        try {
          // Handle fallback to IndexedDB
          // Similar to the offline case above
          const goldPrices = await db.prices
            .where('metalType')
            .equals('gold')
            .toArray();
            
          const silverPrices = await db.prices
            .where('metalType')
            .equals('silver')
            .toArray();
            
          // Create objects to store rates by purity
          const goldRatesByPurity = {};
          const silverRatesByPurity = {};
          
          if (goldPrices.length > 0) {
            // Create a map to track the latest date for each purity
            const goldPuritiesMap = {};
            
            // First pass to find the latest date for each purity
            goldPrices.forEach(price => {
              const purity = price.purity;
              const date = new Date(price.effectiveDate);
              
              if (!goldPuritiesMap[purity] || date > new Date(goldPuritiesMap[purity].effectiveDate)) {
                goldPuritiesMap[purity] = price;
              }
            });
            
            // Convert map to the rates object
            Object.keys(goldPuritiesMap).forEach(purity => {
              goldRatesByPurity[purity] = goldPuritiesMap[purity].pricePerGram;
            });
            
            setGoldRates(goldRatesByPurity);
          }
          
          if (silverPrices.length > 0) {
            // Create a map to track the latest date for each purity
            const silverPuritiesMap = {};
            
            // First pass to find the latest date for each purity
            silverPrices.forEach(price => {
              const purity = price.purity;
              const date = new Date(price.effectiveDate);
              
              if (!silverPuritiesMap[purity] || date > new Date(silverPuritiesMap[purity].effectiveDate)) {
                silverPuritiesMap[purity] = price;
              }
            });
            
            // Convert map to the rates object
            Object.keys(silverPuritiesMap).forEach(purity => {
              silverRatesByPurity[purity] = silverPuritiesMap[purity].pricePerGram;
            });
            
            setSilverRates(silverRatesByPurity);
          }
          
          // Update any existing gold/silver items with current rates
          updateItemsWithCurrentRates();
        } catch (dbError) {
          console.error('Error fetching rates from IndexedDB:', dbError);
        }
      }
    }
  };
  
  // Helper function to update items with current rates
  const updateItemsWithCurrentRates = () => {
    const updatedItems = formData.items.map(item => {
      // Skip items that have been manually added or custom created (don't override their prices)
      if (!item.metalType || !item.purity || item.isCustomProduct) return item;
      
      let newPrice = 0;
      
      if (item.metalType === 'gold') {
        // Use the specific price for the purity, or fallback to a default
        newPrice = goldRates[item.purity] || Object.values(goldRates)[0] || 0;
      } else if (item.metalType === 'silver') {
        // Use the specific price for the purity, or fallback to a default
        newPrice = silverRates[item.purity] || Object.values(silverRates)[0] || 0;
      }
      
      if (newPrice > 0) {
        return {
          ...item,
          pricePerGram: newPrice
        };
      }
      
      return item;
    });
    
    if (JSON.stringify(updatedItems) !== JSON.stringify(formData.items)) {
      setFormData(prev => ({
        ...prev,
        items: updatedItems
      }));
    }
  };
  
  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle item change including all relevant fields
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index][field] = value;
    
    // If changing the product, populate the other fields
    if (field === 'product' && value) {
      const selectedProduct = products.find(p => p._id === value || p.id === value);
      if (selectedProduct) {
        // Get the making charges percentage from the product or default to the global one
        const makingChargesPercentage = selectedProduct.makingChargesPercentage || formData.makingChargesPercentage;
        const netWeight = selectedProduct.netWeight || 0;
        const pricePerGram = getProductRate(selectedProduct.metalType, selectedProduct.purity);
        
        // Calculate making charges based on the percentage
        const metalCost = netWeight * pricePerGram;
        const makingCharges = (metalCost * makingChargesPercentage) / 100;
        
        updatedItems[index] = {
          ...updatedItems[index],
          name: selectedProduct.name,
          hoid: selectedProduct.hoid,
          metalType: selectedProduct.metalType,
          purity: selectedProduct.purity,
          netWeight: selectedProduct.netWeight || 0,
          grossWeight: selectedProduct.grossWeight || 0,
          hasStones: selectedProduct.hasStones || false,
          stoneDetails: selectedProduct.stoneDetails || '',
          stonePrice: selectedProduct.stonePrice || 0,
          pricePerGram: pricePerGram,
          makingCharges: makingCharges,
          makingChargesPercentage: makingChargesPercentage,
          isCalculatedMakingCharges: true,
          quantity: 1
        };
      }
    } 
    // If makingChargesPercentage changes, recalculate the making charges
    else if (field === 'makingChargesPercentage' && updatedItems[index].isCalculatedMakingCharges) {
      const netWeight = parseFloat(updatedItems[index].netWeight) || 0;
      const pricePerGram = parseFloat(updatedItems[index].pricePerGram) || 0;
      const metalCost = netWeight * pricePerGram;
      updatedItems[index].makingCharges = (metalCost * parseFloat(value)) / 100;
    }
    // If netWeight or pricePerGram changes and using calculated making charges, update making charges
    else if ((field === 'netWeight' || field === 'pricePerGram') && updatedItems[index].isCalculatedMakingCharges) {
      const netWeight = field === 'netWeight' ? parseFloat(value) : parseFloat(updatedItems[index].netWeight) || 0;
      const pricePerGram = field === 'pricePerGram' ? parseFloat(value) : parseFloat(updatedItems[index].pricePerGram) || 0;
      const metalCost = netWeight * pricePerGram;
      const makingChargesPercentage = parseFloat(updatedItems[index].makingChargesPercentage) || parseFloat(formData.makingChargesPercentage) || 0;
      updatedItems[index].makingCharges = (metalCost * makingChargesPercentage) / 100;
    }
    
    // Recalculate total price for weight, price, making charge changes, or related fields
    if (['netWeight', 'pricePerGram', 'makingCharges', 'makingChargesPercentage', 'quantity', 'stonePrice'].includes(field)) {
      updatedItems[index].totalPrice = calculateItemTotal(updatedItems[index]);
    }
    
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    // Update overall total
    calculateTotal(updatedItems);
  };
  
  // Helper function for explicitly selecting a product
  const handleProductSelect = (index, productId) => {
    if (!productId) return;
    
    // Use the existing handleItemChange function
    handleItemChange(index, 'product', productId);
  };
  
  // Add a new item
  const handleAddItem = () => {
    // First calculate totals for existing items to ensure their values are up to date
    calculateTotals();
    
    // Then add a new empty item
    setFormData({
      ...formData,
      items: [...formData.items, createEmptyItem()]
    });
  };
  
  // Prompt to remove an item
  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) {
      return; // Keep at least one item
    }
    
    const item = formData.items[index];
    setRemoveConfirm({
      open: true,
      index,
      name: item.name || `Item #${index + 1}`
    });
  };
  
  // Confirm and actually remove the item
  const confirmRemoveItem = () => {
    const index = removeConfirm.index;
    if (index !== null) {
      const updatedItems = formData.items.filter((_, i) => i !== index);
      setFormData({
        ...formData,
        items: updatedItems
      });
      
      setSnackbar({
        open: true,
        message: `${removeConfirm.name} removed from sale`,
        severity: 'success'
      });
    }
    
    // Reset confirmation dialog
    setRemoveConfirm({
      open: false,
      index: null,
      name: ''
    });
  };
  
  // Calculate totals
  const calculateTotals = () => {
    console.log("Calculating totals...");
    
    const items = [...formData.items];
    
    // Calculate each item's total price
    const updatedItems = items.map(item => {
      const netWeight = parseFloat(item.netWeight) || 0;
      const pricePerGram = parseFloat(item.pricePerGram) || 0;
      const quantity = parseInt(item.quantity) || 1;
      const stonePrice = parseFloat(item.stonePrice) || 0;
      
      // Base metal cost
      const metalCost = netWeight * pricePerGram;
      
      // Making charges can be fixed or percentage-based
      let makingCharges = parseFloat(item.makingCharges) || 0;
      if (item.isCalculatedMakingCharges) {
        // If making charges are calculated as a percentage, use the item's percentage if available
        const makingChargesPercentage = parseFloat(item.makingChargesPercentage || formData.makingChargesPercentage) || 0;
        makingCharges = (metalCost * makingChargesPercentage) / 100;
      }
      
      // Calculate total for this item
      const totalForItem = (metalCost + makingCharges + stonePrice) * quantity;
      
      return {
        ...item,
        makingCharges,
        totalPrice: totalForItem
      };
    });
    
    // Calculate subtotal (sum of all item totals)
    const subtotal = updatedItems.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    
    // Calculate discount
    let discount = 0;
    
    if (formData.discountPercentage > 0) {
      // If discount is entered as a percentage
      discount = (subtotal * formData.discountPercentage) / 100;
    } else if (formData.discount > 0) {
      // If discount is entered as a fixed amount
      discount = formData.discount;
    }
    
    // Calculate GST
    const afterDiscount = subtotal - discount;
    const gst = (afterDiscount * (formData.gstPercentage || 0)) / 100;
    
    // Calculate total amount
    const totalAmount = afterDiscount + gst;
    
    // Update the form data
    setFormData(prevData => ({
      ...prevData,
      items: updatedItems,
      subtotal,
      discount,
      gst,
      totalAmount
    }));
  };
  
  // Handle new customer form change
  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer({
      ...newCustomer,
      [name]: value
    });
  };
  
  // Create new customer
  const handleCreateCustomer = async () => {
    try {
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot create customer while offline',
          severity: 'error'
        });
        return;
      }
      
      const response = await api.post('/api/customers', newCustomer);
      
      if (response.data.success) {
        const newCustomerData = response.data.data;
        
        // Add to state
        setCustomers([...customers, newCustomerData]);
        
        // Select the new customer
        setFormData({
          ...formData,
          customer: newCustomerData._id
        });
        
        // Add to IndexedDB
        if (db) {
          try {
            await db.customers.add(newCustomerData);
          } catch (error) {
            console.error('Error adding customer to IndexedDB:', error);
          }
        }
        
        setSnackbar({
          open: true,
          message: 'Customer created successfully',
          severity: 'success'
        });
        
        setShowNewCustomerDialog(false);
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to create customer'}`,
        severity: 'error'
      });
    }
  };
  
  // Submit sale
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.customer) {
      setSnackbar({
        open: true,
        message: 'Please select a customer',
        severity: 'error'
      });
      return;
    }
    
    if (formData.items.some(item => !item.name || !item.netWeight || item.totalPrice <= 0)) {
      setSnackbar({
        open: true,
        message: 'Please complete all item details',
        severity: 'error'
      });
      return;
    }
    
    // Check if any item quantity exceeds available stock
    const invalidItems = formData.items.filter(item => 
      item.product && !item.isSmallItem && item.quantity > (item.maxQuantity || 1)
    );
    
    if (invalidItems.length > 0) {
      setSnackbar({
        open: true,
        message: `Some items exceed available stock: ${invalidItems.map(i => i.name).join(', ')}`,
        severity: 'error'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot create sale while offline',
          severity: 'error'
        });
        setIsSubmitting(false);
        return;
      }
      
      // Prepare data - ensure small items have product set to null
      const preparedData = {
        ...formData,
        items: formData.items.map(item => {
          if (item.isSmallItem) {
            return { 
              ...item, 
              product: null 
            };
          } else if (!item.product || item.product === '') {
            // Convert items with missing product to small items
            console.warn(`Item with empty product field detected: ${item.name} - converting to small item`);
            return { 
              ...item, 
              product: null,
              isSmallItem: true
            };
          }
          return item;
        })
      };
      
      console.log('Submitting sale data:', preparedData);
      
      // Submit the sale
      const response = await api.post('/api/sales', preparedData);
      
      if (response.data.success) {
        // Add the new sale to IndexedDB if available
        if (db) {
          try {
            await db.sales.add(response.data.data);
          } catch (error) {
            console.error('Error adding sale to IndexedDB:', error);
          }
        }
        
        setSnackbar({
          open: true,
          message: 'Sale created successfully',
          severity: 'success'
        });
        
        // Navigate back to the sales list instead of the detail page
        navigate('/sales');
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to create sale'}`,
        severity: 'error'
      });
      setIsSubmitting(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  // Navigate back
  const handleBack = () => {
    navigate(-1);
  };
  
  // Handle close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Selected purity options based on metal type
  const getPurityOptions = (metalType) => {
    if (metalType === 'gold') {
      return [
        { value: '24K', label: '24K' },
        { value: '22K', label: '22K' },
        { value: '18K', label: '18K' },
        { value: '14K', label: '14K' }
      ];
    } else {
      return [
        { value: '99.9%', label: '99.9%' },
        { value: '92.5%', label: '92.5% (Sterling)' },
        { value: '80%', label: '80%' }
      ];
    }
  };
  
  // Handle new product form change
  const handleNewProductChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // If this is the hasStones checkbox being checked
    if (name === 'hasStones') {
      setNewProduct({
        ...newProduct,
        hasStones: checked,
        // Initialize stonePrice if checking the box
        ...(checked && { stonePrice: 0 })
      });
      return;
    }
    
    // Special handling for metal type to update purity options
    if (name === 'metalType') {
      // If metal type changed, update purity options and default purity
      const newPurity = value === 'gold' ? '24K' : '99.9%';
      setNewProduct({
        ...newProduct,
        [name]: value,
        purity: newPurity
      });
    } else {
      setNewProduct({
        ...newProduct,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  
  // Handle purity change directly
  const handlePurityChange = (event) => {
    const selectedPurity = event.target.value;
    const metalType = newProduct.metalType;
    
    // Get current rate for this metal type and purity
    let currentRate = 0;
    if (metalType === 'gold') {
      currentRate = goldRates[selectedPurity] || Object.values(goldRates)[0] || 0;
      console.log(`Selected gold purity: ${selectedPurity}, rate: ${currentRate}, available rates:`, goldRates);
    } else {
      currentRate = silverRates[selectedPurity] || Object.values(silverRates)[0] || 0;
      console.log(`Selected silver purity: ${selectedPurity}, rate: ${currentRate}, available rates:`, silverRates);
    }
    
    console.log(`Setting price per gram to: ${currentRate}`);
    
    setNewProduct(prev => ({
      ...prev,
      purity: selectedPurity
    }));
  };
  
  // Open small item dialog
  const handleOpenNewProductDialog = () => {
    // No longer need to track current item index since we're adding new items
    
    // Get default purity and rate
    const defaultMetalType = 'gold';
    const defaultPurity = defaultMetalType === 'gold' ? '24K' : '99.9%';
    
    // Calculate the current price from rates
    let defaultRate = 0;
    if (Object.keys(goldRates).length > 0) {
      defaultRate = goldRates[defaultPurity] || Object.values(goldRates)[0];
      console.log(`Initial rate for ${defaultPurity} gold: ${defaultRate}`, goldRates);
    }
    
    // Reset the form with proper initial values for a small item
    setNewProduct({
      name: '',
      hoid: '',
      category: 'jewellery',
      description: '',
      metalType: defaultMetalType,
      purity: defaultPurity,
      netWeight: '',
      grossWeight: '',
      hasStones: false,
      stoneDetails: '',
      pricePerGram: defaultRate || 0,
      quantity: 1,
      images: []
    });
    
    setShowNewProductDialog(true);
  };
  
  // Create new product and add to sale
  const handleCreateProduct = async () => {
    try {
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot create product while offline',
          severity: 'error'
        });
        return;
      }
      
      // Ensure we have all required fields
      if (!newProduct.name || !newProduct.netWeight) {
        setSnackbar({
          open: true,
          message: 'Please fill in all required fields',
          severity: 'error'
        });
        return;
      }
      
      // Add directly to sale without creating in inventory (as a small item)
      // Instead of modifying the current item at currentItemIndex, create a new item
      const newSmallItem = {
        ...createEmptyItem(),
        product: null, // MUST be null for small items, not an empty string
        name: newProduct.name,
        hoid: newProduct.hoid || '',
        metalType: newProduct.metalType,
        purity: newProduct.purity,
        netWeight: newProduct.netWeight,
        grossWeight: newProduct.grossWeight,
        hasStones: newProduct.hasStones,
        stoneDetails: newProduct.stoneDetails,
        pricePerGram: newProduct.metalType === 'gold' 
          ? goldRates[newProduct.purity] || Object.values(goldRates)[0] || 0
          : silverRates[newProduct.purity] || Object.values(silverRates)[0] || 0,
        quantity: parseInt(newProduct.quantity) || 1,
        isSmallItem: true, // Mark as small item
        stonePrice: 0
      };
      
      // Add the new small item to the items array
      setFormData({
        ...formData,
        items: [...formData.items, newSmallItem]
      });
      
      setSnackbar({
        open: true,
        message: 'Small item added to sale',
        severity: 'success'
      });
      
      setShowNewProductDialog(false);
    } catch (error) {
      console.error('Error creating product:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to create product'}`,
        severity: 'error'
      });
    }
  };
  
  // Helper function to get the current rate for a product based on metal type and purity
  const getProductRate = (metalType, purity) => {
    if (!metalType || !purity) return 0;
    
    if (metalType === 'gold') {
      return goldRates[purity] || Object.values(goldRates)[0] || 0;
    } else if (metalType === 'silver') {
      return silverRates[purity] || Object.values(silverRates)[0] || 0;
    }
    
    return 0;
  };
  
  // Function to calculate total price for an item
  const calculateItemTotal = (item) => {
    try {
      // Extract values with defaults
      const netWeight = parseFloat(item.netWeight) || 0;
      const pricePerGram = parseFloat(item.pricePerGram) || 0;
      const makingCharges = parseFloat(item.makingCharges) || 0;
      const stonePrice = parseFloat(item.stonePrice) || 0;
      const quantity = parseInt(item.quantity) || 1;
      
      // Calculate metal price
      const metalPrice = netWeight * pricePerGram;
      
      // Calculate total price including making charges and stone price (if applicable)
      let totalBeforeTax = (metalPrice + makingCharges + stonePrice) * quantity;
      
      return Math.round(totalBeforeTax * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Error calculating total:', error);
      return 0;
    }
  };
  
  // Calculate overall totals based on all items
  const calculateTotal = (items = formData.items) => {
    // Calculate subtotal (sum of all item totals)
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0);
    
    // Calculate discount
    let discount = 0;
    
    if (formData.discountPercentage > 0) {
      // If discount is entered as a percentage
      discount = (subtotal * formData.discountPercentage) / 100;
    } else if (formData.discount > 0) {
      // If discount is entered as a fixed amount
      discount = formData.discount;
    }
    
    // Calculate GST
    const afterDiscount = subtotal - discount;
    const gst = (afterDiscount * (formData.gstPercentage || 0)) / 100;
    
    // Calculate total amount
    const totalAmount = afterDiscount + gst;
    
    // Update the form data
    setFormData(prev => ({
      ...prev,
      subtotal,
      discount,
      gst,
      totalAmount
    }));
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Back to Sales
        </Button>
        
        {isOffline && (
          <Alert severity="warning" sx={{ display: 'inline-flex' }}>
            You are offline. Cannot create sale.
          </Alert>
        )}
      </Box>
      
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <ShoppingBasket sx={{ mr: 1, color: 'primary.main' }} />
          Create New Sale
        </Typography>
        
        <Typography variant="subtitle1" color="text.secondary">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </Typography>
      </Box>
      
      {/* Quick summary card */}
      {formData.items.some(item => item.totalPrice > 0) && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: '#f8f9ff', border: '1px dashed #c5cae9' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">Items</Typography>
              <Typography variant="h6">{formData.items.length} items</Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">Gold Weight</Typography>
              <Typography variant="h6">
                {formData.items
                  .filter(item => item.metalType === 'gold')
                  .reduce((acc, item) => acc + (parseFloat(item.netWeight) || 0) * (parseInt(item.quantity) || 1), 0)
                  .toFixed(2)}g
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">Silver Weight</Typography>
              <Typography variant="h6">
                {formData.items
                  .filter(item => item.metalType === 'silver')
                  .reduce((acc, item) => acc + (parseFloat(item.netWeight) || 0) * (parseInt(item.quantity) || 1), 0)
                  .toFixed(2)}g
              </Typography>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Typography variant="body2" color="text.secondary">Total Amount</Typography>
              <Typography variant="h6" color="primary.main">{formatCurrency(formData.totalAmount)}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
            <Person sx={{ mr: 1 }} />
            Customer Information
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={9}>
              <FormControl fullWidth required variant="outlined">
                <InputLabel>Select Customer</InputLabel>
                <Select
                  name="customer"
                  value={formData.customer}
                  onChange={handleFormChange}
                  label="Select Customer"
                  disabled={isOffline}
                >
                  {customers.map(customer => (
                    <MenuItem key={customer._id || customer.id} value={customer._id || customer.id}>
                      {customer.name} - {customer.phone}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                fullWidth
                onClick={() => setShowNewCustomerDialog(true)}
                disabled={isOffline}
                size="large"
              >
                New Customer
              </Button>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Invoice Number"
                name="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={handleFormChange}
                required
                variant="outlined"
              />
            </Grid>
          </Grid>
        </Paper>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
              <Inventory sx={{ mr: 1 }} />
              Sale Items
            </Typography>
            
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<Add />}
              onClick={() => handleOpenNewProductDialog()}
              disabled={isOffline}
            >
              Add Small Item
            </Button>
          </Box>
          
          {formData.items.map((item, index) => (
            <Card key={index} sx={{ 
              mb: 2, 
              position: 'relative', 
              overflow: 'visible', 
              border: item.isSmallItem ? '1px solid #9c27b0' : item.product ? '1px solid #1976d2' : '1px solid #e0e0e0',
              bgcolor: item.isSmallItem ? 'rgba(156, 39, 176, 0.03)' : 'white'
            }}>
              {item.isSmallItem && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: -12, 
                  right: 16, 
                  backgroundColor: '#9c27b0', 
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  Small Item
                </Box>
              )}
              
              {item.product && !item.isSmallItem && (
                <Box sx={{ 
                  position: 'absolute', 
                  top: -12, 
                  right: 16, 
                  backgroundColor: '#1976d2', 
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.75rem',
                  fontWeight: 'bold'
                }}>
                  Inventory Item
                </Box>
              )}
              
              <CardContent sx={{ pb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Product Information
                    </Typography>
                    
                    {!item.isSmallItem ? (
                      // For regular inventory items
                      <FormControl fullWidth required variant="outlined" sx={{ mb: 2 }}>
                        <InputLabel>Select Product</InputLabel>
                        <Select
                          value={item.product}
                          onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                          label="Select Product"
                        >
                          {products.map(product => (
                            <MenuItem key={product._id || product.id} value={product._id || product.id}>
                              {product.name} ({product.metalType} - {product.purity})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    ) : (
                      // For small items that were added directly
                      <Box>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                          {item.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          HOID: {item.hoid || 'N/A'}
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Show item name if selected or entered - only for inventory items */}
                    {!item.isSmallItem && item.name && (
                      <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                        {item.name}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Item Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                          <InputLabel>Metal</InputLabel>
                          <Select
                            value={item.metalType}
                            onChange={(e) => handleItemChange(index, 'metalType', e.target.value)}
                            label="Metal"
                            disabled={!!item.product || item.isSmallItem} // Disable if product is selected or it's a small item
                          >
                            <MenuItem value="gold">Gold</MenuItem>
                            <MenuItem value="silver">Silver</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                          <InputLabel>Purity</InputLabel>
                          <Select
                            value={item.purity}
                            onChange={(e) => handleItemChange(index, 'purity', e.target.value)}
                            label="Purity"
                            disabled={!!item.product || item.isSmallItem} // Disable if product is selected or it's a small item
                          >
                            {getPurityOptions(item.metalType).map(option => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Net Weight (g)"
                          type="number"
                          fullWidth
                          value={item.netWeight}
                          onChange={(e) => handleItemChange(index, 'netWeight', e.target.value)}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">g</InputAdornment>,
                          }}
                          required
                          variant="outlined"
                          disabled={item.isSmallItem} // Disable for small items after creation
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Gross Weight (g)"
                          type="number"
                          fullWidth
                          value={item.grossWeight}
                          onChange={(e) => handleItemChange(index, 'grossWeight', e.target.value)}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">g</InputAdornment>,
                          }}
                          required
                          variant="outlined"
                          disabled={item.isSmallItem} // Disable for small items after creation
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={item.hasStones || false}
                              onChange={(e) => handleItemChange(index, 'hasStones', e.target.checked)}
                              disabled={!!item.product} // Disable if product is selected
                            />
                          }
                          label="Has stones/beads?"
                        />
                      </Grid>
                      
                      {item.hasStones && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Stone/Bead Price"
                            type="number"
                            fullWidth
                            value={item.stonePrice || 0}
                            onChange={(e) => handleItemChange(index, 'stonePrice', e.target.value)}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                            }}
                            variant="outlined"
                          />
                        </Grid>
                      )}
                      
                      {item.isCalculatedMakingCharges && (
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Making Charges (%)"
                            type="number"
                            fullWidth
                            value={item.makingChargesPercentage || formData.makingChargesPercentage}
                            onChange={(e) => handleItemChange(index, 'makingChargesPercentage', e.target.value)}
                            InputProps={{
                              endAdornment: <InputAdornment position="end">%</InputAdornment>,
                            }}
                            variant="outlined"
                            helperText="Percentage of metal price"
                          />
                        </Grid>
                      )}
                      
                      <Grid item xs={12}>
                        <TextField
                          label="Quantity"
                          type="number"
                          fullWidth
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          InputProps={{ 
                            inputProps: { 
                              min: 1, 
                              // Only show max for inventory items
                              ...(item.product && !item.isSmallItem && { max: item.maxQuantity || 1 })
                            } 
                          }}
                          required
                          variant="outlined"
                          helperText={item.product && !item.isSmallItem ? `Max: ${item.maxQuantity || 1}` : ''}
                        />
                      </Grid>
                    </Grid>
                  </Grid>
                </Grid>
                
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mt: 2, 
                  pt: 2, 
                  borderTop: '1px solid #eee' 
                }}>
                  <Box>
                    <Grid container spacing={0.5}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Base Price:</strong> {formatCurrency((parseFloat(item.netWeight) || 0) * (parseFloat(item.pricePerGram) || 0) * (parseInt(item.quantity) || 1))}
                          {' '}<small>({parseFloat(item.netWeight || 0).toFixed(2)}g × ₹{parseFloat(item.pricePerGram || 0).toFixed(2)} × {parseInt(item.quantity) || 1})</small>
                        </Typography>
                      </Grid>
                      {item.hasStones && parseFloat(item.stonePrice) > 0 && (
                        <Grid item xs={12}>
                          <Typography variant="body2" color="text.secondary">
                            <strong>Stone/Bead Price:</strong> {formatCurrency(parseFloat(item.stonePrice) || 0)}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ mr: 2, color: item.isSmallItem ? 'secondary.main' : 'primary.main' }}>
                      Total: {formatCurrency(item.totalPrice || 0)}
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleRemoveItem(index)}
                      disabled={formData.items.length === 1}
                      startIcon={<Delete />}
                      size="small"
                    >
                      Remove
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Add />}
              onClick={handleAddItem}
              size="large"
              sx={{ px: 4, py: 1 }}
            >
              Add Another Item
            </Button>
          </Box>
        </Paper>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <ShoppingBasket sx={{ mr: 1 }} />
                Payment Information
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleFormChange}
                      label="Payment Method"
                    >
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="upi">UPI</MenuItem>
                      <MenuItem value="bank transfer">Bank Transfer</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      name="paymentStatus"
                      value={formData.paymentStatus}
                      onChange={handleFormChange}
                      label="Payment Status"
                    >
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="partial">Partial</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    name="notes"
                    label="Notes"
                    multiline
                    rows={3}
                    value={formData.notes}
                    onChange={handleFormChange}
                    variant="outlined"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <ShoppingBasket sx={{ mr: 1 }} />
                Order Summary
              </Typography>
              
              <Box sx={{ mb: 3, backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">GST (%):</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      name="gstPercentage"
                      value={formData.gstPercentage}
                      onChange={handleFormChange}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">Discount (%):</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      type="number"
                      name="discountPercentage"
                      value={formData.discountPercentage}
                      onChange={handleFormChange}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                      fullWidth
                      variant="outlined"
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Grid container sx={{ mb: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body1">Subtotal:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right">
                      {formatCurrency(formData.subtotal)}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Grid container sx={{ mb: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body1" color="error">
                      Discount:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" color="error" align="right">
                      - {formatCurrency(formData.discount)}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Grid container sx={{ mb: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body1">
                      GST ({formData.gstPercentage}%):
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right">
                      {formatCurrency(formData.gst)}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Grid container>
                  <Grid item xs={6}>
                    <Typography variant="h6" fontWeight="bold">
                      Total Amount:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="h6" fontWeight="bold" align="right" color="primary.main">
                      {formatCurrency(formData.totalAmount)}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                startIcon={<Save />}
                disabled={isSubmitting || isOffline}
                sx={{ mt: 1 }}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create Sale'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </form>
      
      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onClose={() => setShowNewCustomerDialog(false)} maxWidth="md">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Person sx={{ mr: 1 }} />
            Create New Customer
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="name"
                label="Customer Name"
                value={newCustomer.name}
                onChange={handleNewCustomerChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="phone"
                label="Phone Number"
                value={newCustomer.phone}
                onChange={handleNewCustomerChange}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="email"
                label="Email"
                type="email"
                value={newCustomer.email}
                onChange={handleNewCustomerChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="address"
                label="Address"
                value={newCustomer.address}
                onChange={handleNewCustomerChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="city"
                label="City"
                value={newCustomer.city}
                onChange={handleNewCustomerChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="pincode"
                label="PIN Code"
                value={newCustomer.pincode}
                onChange={handleNewCustomerChange}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Customer Type</InputLabel>
                <Select
                  name="customerType"
                  value={newCustomer.customerType}
                  onChange={handleNewCustomerChange}
                  label="Customer Type"
                >
                  <MenuItem value="regular">Regular</MenuItem>
                  <MenuItem value="wholesale">Wholesale</MenuItem>
                  <MenuItem value="vip">VIP</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewCustomerDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateCustomer} 
            variant="contained" 
            disabled={!newCustomer.name || !newCustomer.phone}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* New Product Dialog */}
      <Dialog
        open={showNewProductDialog}
        onClose={() => setShowNewProductDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" sx={{ color: 'secondary.main' }}>
            <Inventory sx={{ mr: 1 }} />
            Add Small Item
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Small items are added directly to the sale without being tracked in inventory.
          </Typography>
          
          <Box sx={{ backgroundColor: '#f9f9ff', p: 2, borderRadius: 1, mb: 3, border: '1px solid #e0e0ff' }}>
            <Typography variant="subtitle2" sx={{ color: 'primary.main', mb: 1 }}>
              Today's Rates
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  Gold 24K: {formatCurrency(goldRates['24K'] || 0)}/g
                </Typography>
                <Typography variant="body2">
                  Gold 22K: {formatCurrency(goldRates['22K'] || 0)}/g
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  Silver 99.9%: {formatCurrency(silverRates['99.9%'] || 0)}/g
                </Typography>
                <Typography variant="body2">
                  Silver 92.5%: {formatCurrency(silverRates['92.5%'] || 0)}/g
                </Typography>
              </Grid>
            </Grid>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Product Name"
                name="name"
                value={newProduct.name}
                onChange={handleNewProductChange}
                required
                variant="outlined"
                autoFocus
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="HOID (Hallmark ID)"
                name="hoid"
                value={newProduct.hoid}
                onChange={handleNewProductChange}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Metal Type</InputLabel>
                <Select
                  name="metalType"
                  value={newProduct.metalType}
                  onChange={handleNewProductChange}
                  label="Metal Type"
                >
                  <MenuItem value="gold">Gold</MenuItem>
                  <MenuItem value="silver">Silver</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel>Purity</InputLabel>
                <Select
                  name="purity"
                  value={newProduct.purity}
                  onChange={handlePurityChange}
                  label="Purity"
                >
                  {getPurityOptions(newProduct.metalType).map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="netWeight"
                label="Net Weight (g)"
                fullWidth
                margin="normal"
                type="number"
                inputProps={{ min: 0, step: 0.001 }}
                value={newProduct.netWeight}
                onChange={handleNewProductChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="grossWeight"
                label="Gross Weight (g)"
                fullWidth
                margin="normal"
                type="number"
                inputProps={{ min: 0, step: 0.001 }}
                value={newProduct.grossWeight}
                onChange={handleNewProductChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newProduct.hasStones}
                    onChange={(e) => setNewProduct({
                      ...newProduct,
                      hasStones: e.target.checked
                    })}
                  />
                }
                label="Has stones/beads?"
              />
            </Grid>
            
            {newProduct.hasStones && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="stoneDetails"
                    label="Stone/Bead Details"
                    fullWidth
                    margin="normal"
                    value={newProduct.stoneDetails}
                    onChange={handleNewProductChange}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="stonePrice"
                    label="Stone/Bead Price"
                    fullWidth
                    margin="normal"
                    type="number"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      inputProps: { min: 0, step: 0.01 }
                    }}
                    value={newProduct.stonePrice || 0}
                    onChange={handleNewProductChange}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Quantity"
                name="quantity"
                type="number"
                value={newProduct.quantity}
                onChange={handleNewProductChange}
                variant="outlined"
                InputProps={{
                  inputProps: { min: 1, step: 1 }
                }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              Price will be calculated automatically based on today's {newProduct.metalType} rate for {newProduct.purity}.
            </Typography>
            
            <Typography variant="h6" color="primary.main">
              Current Rate: {formatCurrency(newProduct.metalType === 'gold' 
                ? (goldRates[newProduct.purity] || 0) 
                : (silverRates[newProduct.purity] || 0))}/g
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewProductDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateProduct} 
            variant="contained" 
            color="secondary"
            disabled={!newProduct.name || !newProduct.netWeight}
          >
            Add to Sale
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Item Removal Confirmation Dialog */}
      <Dialog
        open={removeConfirm.open}
        onClose={() => setRemoveConfirm({ open: false, index: null, name: '' })}
      >
        <DialogTitle>
          Remove Item?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to remove "{removeConfirm.name}" from this sale?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setRemoveConfirm({ open: false, index: null, name: '' })}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmRemoveItem}
            variant="contained" 
            color="error"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NewSale; 