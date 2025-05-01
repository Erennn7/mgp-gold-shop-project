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
  CircularProgress
} from '@mui/material';
import {
  Add,
  Delete,
  ArrowBack,
  Save,
  ShoppingBasket,
  Person
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const NewPurchase = () => {
  const navigate = useNavigate();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [goldRates, setGoldRates] = useState({});
  const [silverRates, setSilverRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Form state
  const [formData, setFormData] = useState({
    customer: '',
    items: [createEmptyItem()],
    subtotal: 0,
    discount: 0,
    discountPercentage: 0, // Add discount percentage
    gst: 0,
    gstPercentage: 3, // Default GST percentage
    makingChargesPercentage: 3, // Default making charges percentage for the whole purchase
    totalAmount: 0,
    paymentMethod: 'cash',
    paymentStatus: 'completed',
    notes: ''
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
  
  // Get database context
  const { db } = useDatabase();
  
  // Effect to fetch data on mount
  useEffect(() => {
    fetchInitialData();
  }, []);
  
  // Effect to calculate totals when items change
  useEffect(() => {
    // Use a ref to track whether this is the first render
    const hasItems = formData.items.some(item => 
      item.name && 
      parseFloat(item.weight) > 0 && 
      parseFloat(item.pricePerGram) > 0
    );
    
    if (hasItems) {
      console.log("Recalculating totals due to form changes");
      calculateTotals();
    }
  }, [
    formData.items.map(item => item.product).join(','), 
    formData.items.map(item => item.weight).join(','),
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
      weight: '',
      pricePerGram: 0,
      makingCharges: 0,
      quantity: 1,
      totalPrice: 0
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
      if (!item.metalType || !item.purity) return item;
      
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
  
  // Handle item change
  const handleItemChange = (index, field, value) => {
    console.log(`Changing item ${index}, field ${field} to value:`, value);
    
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    
    // If product is selected, populate product details
    if (field === 'product' && value) {
      console.log("Products array:", products);
      const selectedProduct = products.find(product => product._id === value || product.id === value);
      console.log("Selected product:", selectedProduct);
      
      if (selectedProduct) {
        // Get current price based on metal type AND purity
        let currentPrice = 0;
        
        if (selectedProduct.metalType === 'gold') {
          // Get the price for this specific purity
          console.log(`Gold rates for purity ${selectedProduct.purity}:`, goldRates[selectedProduct.purity]);
          currentPrice = goldRates[selectedProduct.purity] || Object.values(goldRates)[0] || 0;
        } else { // silver
          // Get the price for this specific purity
          console.log(`Silver rates for purity ${selectedProduct.purity}:`, silverRates[selectedProduct.purity]);
          currentPrice = silverRates[selectedProduct.purity] || Object.values(silverRates)[0] || 0;
        }
        
        console.log(`Current price determined: ${currentPrice}`);
        
        // Update the item with product details
        updatedItems[index] = {
          ...updatedItems[index],
          name: selectedProduct.name,
          hoid: selectedProduct.hoid || '',
          metalType: selectedProduct.metalType,
          purity: selectedProduct.purity || '24K',
          weight: selectedProduct.weight || '',
          pricePerGram: currentPrice,
          quantity: 1,
          maxQuantity: selectedProduct.currentStock || 1 // Use currentStock instead of quantity
        };
        
        console.log("Updated item details:", updatedItems[index]);
      }
    }
    
    // If metal type changes, update the price per gram
    if (field === 'metalType') {
      const purity = updatedItems[index].purity;
      if (value === 'gold') {
        updatedItems[index].pricePerGram = goldRates[purity] || Object.values(goldRates)[0] || 0;
      } else {
        updatedItems[index].pricePerGram = silverRates[purity] || Object.values(silverRates)[0] || 0;
      }
    }
    
    // If purity changes, update the price per gram
    if (field === 'purity') {
      const metalType = updatedItems[index].metalType;
      if (metalType === 'gold') {
        updatedItems[index].pricePerGram = goldRates[value] || Object.values(goldRates)[0] || 0;
      } else {
        updatedItems[index].pricePerGram = silverRates[value] || Object.values(silverRates)[0] || 0;
      }
    }
    
    // If quantity is changed, ensure it doesn't exceed the max quantity
    if (field === 'quantity') {
      const maxQty = updatedItems[index].maxQuantity || 1;
      const newQuantity = parseInt(value) || 1;
      
      if (newQuantity > maxQty) {
        // Show a warning and limit the quantity
        setSnackbar({
          open: true,
          message: `Only ${maxQty} of ${updatedItems[index].name} available in stock`,
          severity: 'warning'
        });
        
        updatedItems[index].quantity = maxQty;
      }
    }
    
    // Update form data with new items array
    setFormData({
      ...formData,
      items: updatedItems
    });
    
    // Don't call calculateTotals() here, the useEffect will handle it
  };
  
  // Add a new item
  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, createEmptyItem()]
    });
  };
  
  // Remove an item
  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) {
      return; // Keep at least one item
    }
    
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      items: updatedItems
    });
  };
  
  // Calculate totals
  const calculateTotals = () => {
    console.log("Calculating totals, current items:", formData.items);
    
    // Calculate item totals first
    const updatedItems = formData.items.map(item => {
      const weight = parseFloat(item.weight) || 0;
      const pricePerGram = parseFloat(item.pricePerGram) || 0;
      const quantity = parseInt(item.quantity) || 1;
      
      // Calculate base price
      const basePrice = weight * pricePerGram * quantity;
      console.log(`Item ${item.name || 'unknown'}: weight=${weight}, price=${pricePerGram}, quantity=${quantity}, basePrice=${basePrice}`);
      
      // Apply making charges to base price
      const makingChargesPercentage = parseFloat(formData.makingChargesPercentage) || 0;
      const makingCharges = (basePrice * makingChargesPercentage) / 100;
      
      // Calculate price after making charges
      const priceWithMakingCharges = basePrice + makingCharges;
      
      // Apply GST to price after making charges
      const gstPercentage = parseFloat(formData.gstPercentage) || 0;
      const gstAmount = (priceWithMakingCharges * gstPercentage) / 100;
      
      // Total price for this item
      const totalPrice = priceWithMakingCharges + gstAmount;
      console.log(`Final totalPrice: ${totalPrice}`);
      
      return {
        ...item,
        basePrice,
        makingCharges,
        gstAmount,
        totalPrice
      };
    });
    
    console.log("Updated items after calculation:", updatedItems);
    
    // Calculate subtotal (sum of all item total prices)
    const subtotal = updatedItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
    
    // Apply discount to subtotal
    const discountPercentage = parseFloat(formData.discountPercentage) || 0;
    const discount = (subtotal * discountPercentage) / 100;
    
    // Final total amount
    const totalAmount = subtotal - discount;
    
    console.log(`Subtotal: ${subtotal}, Discount: ${discount}, Total: ${totalAmount}`);
    
    // Create a new state object without triggering useEffect recursively
    const newFormData = {
      ...formData,
      subtotal,
      discount,
      totalAmount,
      items: updatedItems // Always update items with calculated values
    };
    
    // Update form data with totals
    setFormData(newFormData);
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
  
  // Submit purchase
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
    
    if (formData.items.some(item => !item.name || !item.weight || item.totalPrice <= 0)) {
      setSnackbar({
        open: true,
        message: 'Please complete all item details',
        severity: 'error'
      });
      return;
    }
    
    // Check if any item quantity exceeds available stock
    const invalidItems = formData.items.filter(item => 
      item.quantity > (item.maxQuantity || 1)
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
          message: 'Cannot create purchase while offline',
          severity: 'error'
        });
        setIsSubmitting(false);
        return;
      }
      
      const response = await api.post('/api/purchases', formData);
      
      if (response.data.success) {
        // Add the new purchase to IndexedDB if available
        if (db) {
          try {
            await db.purchases.add(response.data.data);
          } catch (error) {
            console.error('Error adding purchase to IndexedDB:', error);
          }
        }
        
        setSnackbar({
          open: true,
          message: 'Purchase created successfully',
          severity: 'success'
        });
        
        // Navigate back to the purchases list instead of the detail page
        // The purchase list will be refreshed and show the new purchase
        navigate('/purchases');
      }
    } catch (error) {
      console.error('Error creating purchase:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to create purchase'}`,
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
          Back to Purchases
        </Button>
        
        {isOffline && (
          <Alert severity="warning" sx={{ display: 'inline-flex' }}>
            You are offline. Cannot create purchase.
          </Alert>
        )}
      </Box>
      
      <Typography variant="h4" sx={{ mb: 3 }}>
        <ShoppingBasket sx={{ mr: 1, verticalAlign: 'middle' }} />
        New Purchase
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Customer Information</Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={10}>
              <FormControl fullWidth required>
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
            
            <Grid item xs={12} sm={2}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                fullWidth
                onClick={() => setShowNewCustomerDialog(true)}
                disabled={isOffline}
              >
                New
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Purchase Items</Typography>
          
          <TableContainer sx={{ mb: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="25%">Product</TableCell>
                  <TableCell width="12%">Metal Type</TableCell>
                  <TableCell width="12%">Weight (g)</TableCell>
                  <TableCell width="15%">Price/g (₹)</TableCell>
                  <TableCell width="10%">Quantity</TableCell>
                  <TableCell width="20%">Subtotal</TableCell>
                  <TableCell width="6%">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {formData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <FormControl fullWidth required>
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
                    </TableCell>
                    <TableCell>
                      <FormControl fullWidth>
                        <InputLabel>Metal</InputLabel>
                        <Select
                          value={item.metalType}
                          onChange={(e) => handleItemChange(index, 'metalType', e.target.value)}
                          label="Metal"
                          disabled={!!item.product} // Disable if product is selected
                        >
                          <MenuItem value="gold">Gold</MenuItem>
                          <MenuItem value="silver">Silver</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        fullWidth
                        value={item.weight}
                        onChange={(e) => handleItemChange(index, 'weight', e.target.value)}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">g</InputAdornment>,
                        }}
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        fullWidth
                        value={item.pricePerGram}
                        onChange={(e) => handleItemChange(index, 'pricePerGram', e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                        }}
                        required
                        disabled={!!item.product} // Disable if product is selected
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        fullWidth
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        InputProps={{ 
                          inputProps: { 
                            min: 1, 
                            max: item.maxQuantity || 1
                          } 
                        }}
                        required
                        helperText={item.product ? `Max: ${item.maxQuantity || 1}` : ''}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(item.totalPrice || 0)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Base: {formatCurrency((parseFloat(item.weight) || 0) * (parseFloat(item.pricePerGram) || 0) * (parseInt(item.quantity) || 1))}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Making: {formatCurrency(parseFloat(item.makingCharges) || 0)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        color="error" 
                        onClick={() => handleRemoveItem(index)}
                        disabled={formData.items.length === 1}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleAddItem}
          >
            Add Item
          </Button>
        </Paper>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Payment Information</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
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
                  <FormControl fullWidth required>
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
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Order Summary</Typography>
              
              <TableContainer sx={{ mb: 2 }}>
                <Table>
                  <TableBody>
                    {/* Making charges and GST settings */}
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <Typography variant="subtitle1">Making Charges (%):</Typography>
                      </TableCell>
                      <TableCell colSpan={3} align="right">
                        <TextField
                          type="number"
                          name="makingChargesPercentage"
                          value={formData.makingChargesPercentage}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setFormData({
                              ...formData,
                              makingChargesPercentage: value
                            });
                          }}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                          sx={{ width: 150 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1">
                          {formatCurrency(formData.items.reduce((total, item) => total + (parseFloat(item.makingCharges) || 0), 0))}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <Typography variant="subtitle1">GST (%):</Typography>
                      </TableCell>
                      <TableCell colSpan={3} align="right">
                        <TextField
                          type="number"
                          name="gstPercentage"
                          value={formData.gstPercentage}
                          onChange={handleFormChange}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                          sx={{ width: 150 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1">
                          {formatCurrency(formData.items.reduce((total, item) => total + (parseFloat(item.gstAmount) || 0), 0))}
                        </Typography>
                      </TableCell>
                    </TableRow>

                    {/* Table Summary */}
                    <TableRow>
                      <TableCell colSpan={7} align="right">
                        <Typography variant="subtitle1">
                          Subtotal (includes making charges and GST):
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1">
                          {formatCurrency(formData.subtotal)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell colSpan={4} align="right">
                        <Typography variant="subtitle1">Discount (%):</Typography>
                      </TableCell>
                      <TableCell colSpan={3} align="right">
                        <TextField
                          type="number"
                          name="discountPercentage"
                          value={formData.discountPercentage}
                          onChange={handleFormChange}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">%</InputAdornment>,
                          }}
                          sx={{ width: 150 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="subtitle1" color="error">
                          - {formatCurrency(formData.discount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell colSpan={8}>
                        <Divider sx={{ my: 1 }} />
                      </TableCell>
                    </TableRow>
                    
                    <TableRow>
                      <TableCell colSpan={7} align="right">
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          Total Amount:
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(formData.totalAmount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                startIcon={<Save />}
                disabled={isSubmitting || isOffline}
                sx={{ mt: 2 }}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create Purchase'}
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
    </Box>
  );
};

export default NewPurchase; 