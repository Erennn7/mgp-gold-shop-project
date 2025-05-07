import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  Autocomplete,
  InputAdornment,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Table,
  TableHead,
  TableRow,
  TableCell,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Calculate as CalculateIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useDatabase } from '../store/DatabaseContext';
import axios from 'axios';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';

const NewGoldPurchase = () => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { db, dbLoading } = useDatabase();
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  // Gold purchase form state
  const [formData, setFormData] = useState({
    referenceNumber: `GPR-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    customer: null,
    items: [{
      id: uuidv4(),
      metalType: 'gold',
      description: 'Gold Item', // Add default description here
      netWeight: 0,
      grossWeight: 0,
      purity: 0, // percentage purity
      karatPurity: '22K', // karat purity
      pricePerGram: 0,
      totalAmount: 0,
      notes: ''
      // Removed: hasStones, stoneDetails, stonePrice
    }],
    paymentMethod: 'cash',
    paymentStatus: 'completed',
    notes: '',
    processedBy: user?._id || "demo-user"
  });

  // Customer and pricing states
  const [customers, setCustomers] = useState([]);
  const [mycus, setmycus] = useState('');

  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [pricesByMetal, setPricesByMetal] = useState({
    gold: {},
    silver: {}
  });
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [customerDialog, setCustomerDialog] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Karat to percentage conversion
  const karatToPercentage = {
    '24K': 99.9,
    '22K': 91.6,
    '18K': 75.0,
    '14K': 58.3,
    '10K': 41.7
  };

  useEffect(() => {
    fetchCustomers();
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    setLoadingPrices(true);
    try {
      const response = await axios.get(`${apiUrl}/prices?activeOnly=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Organize by metal type and purity
      const priceData = {
        gold: {},
        silver: {}
      };

      response.data.data.forEach(price => {
        if (!priceData[price.metalType]) {
          priceData[price.metalType] = {};
        }
        priceData[price.metalType][price.purity] = price;
      });

      setPricesByMetal(priceData);
      setLoadingPrices(false);
    } catch (error) {
      console.error('Error fetching prices:', error);
      toast.error('Failed to load current prices');
      setLoadingPrices(false);
    }
  };

  const fetchCustomers = async (searchTerm = '') => {
    setLoadingCustomers(true);
    try {
      const params = searchTerm ? { search: searchTerm } : {};
      const response = await axios.get(`${apiUrl}/customers`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.data);
      setLoadingCustomers(false);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
      setLoadingCustomers(false);
    }
  };

  const handleCustomerSearch = (event, newValue) => {
    if (typeof newValue === 'string') {
      setCustomerSearchTerm(newValue);
      fetchCustomers(newValue);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomerChange = (event, newValue) => {
    setmycus(newValue?._id );
    setFormData(prev => ({ ...prev, customer: newValue?._id || null }));
  };

  const handleItemChange = (id, field, value) => {
    setFormData(prev => {
      const updatedItems = prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          
          // If toggling hasStones, initialize stonePrice if needed
          if (field === 'hasStones' && value === true && updatedItem.stonePrice === undefined) {
            updatedItem.stonePrice = 0;
          }

          // If we're changing netWeight, purity, or price per gram, recalculate total
          if (['netWeight', 'purity', 'pricePerGram'].includes(field)) {
            const weight = field === 'netWeight' ? value : updatedItem.netWeight;
            const purity = field === 'purity' ? value : updatedItem.purity;
            const pricePerGram = field === 'pricePerGram' ? value : updatedItem.pricePerGram;
            
            // Calculate total amount
            const totalAmount = weight * (purity / 100) * pricePerGram;
            updatedItem.totalAmount = Math.round(totalAmount * 100) / 100; // Round to 2 decimal places
          }

          // If we're changing karatPurity, update the percentage purity as well
          if (field === 'karatPurity' && karatToPercentage[value]) {
            updatedItem.purity = karatToPercentage[value];
            
            // Recalculate total amount
            const totalAmount = updatedItem.netWeight * (updatedItem.purity / 100) * updatedItem.pricePerGram;
            updatedItem.totalAmount = Math.round(totalAmount * 100) / 100;
          }
          
          // If changing net weight, ensure gross weight is at least equal
          if (field === 'netWeight' && parseFloat(value) > parseFloat(updatedItem.grossWeight || 0)) {
            updatedItem.grossWeight = value;
          }

          return updatedItem;
        }
        return item;
      });

      return { ...prev, items: updatedItems };
    });
  };

  const addItem = () => {
    setFormData(prev => {
      return {
        ...prev,
        items: [
          ...prev.items,
          {
            id: uuidv4(),
            metalType: 'gold',
            description: 'Gold Item', // Default description added here
            netWeight: 0,
            grossWeight: 0,
            purity: 0,
            karatPurity: '22K',
            pricePerGram: 0,
            totalAmount: 0,
            notes: ''
            // Removed: hasStones, stoneDetails, stonePrice
          }
        ]
      };
    });
  };

  const removeItem = (id) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  const handleKaratChange = (id, value) => {
    handleItemChange(id, 'karatPurity', value);
  };

  const handleLookupPrice = (id) => {
    const item = formData.items.find(item => item.id === id);
    if (!item) return;

    const metalPrices = pricesByMetal[item.metalType];
    if (!metalPrices) {
      toast.error(`No prices found for ${item.metalType}`);
      return;
    }

    const price = metalPrices[item.karatPurity];
    if (!price) {
      toast.error(`No price found for ${item.metalType} with purity ${item.karatPurity}`);
      return;
    }

    handleItemChange(id, 'pricePerGram', price.finalPricePerGram);
  };

  const handleOpenCustomerDialog = () => {
    setCustomerDialog(true);
  };

  const handleCloseCustomerDialog = () => {
    setCustomerDialog(false);
    setNewCustomer({
      name: '',
      phone: '',
      email: '',
      address: ''
    });
  };

  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCustomer = async () => {
    try {
      const response = await axios.post(
        `${apiUrl}/customers`,
        newCustomer,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Add the new customer to the list and select it
      const savedCustomer = response.data.data;
      setCustomers(prev => [...prev, savedCustomer]);
      setFormData(prev => ({ ...prev, customer: savedCustomer._id }));
      
      handleCloseCustomerDialog();
      toast.success('Customer added successfully');
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer');
    }
  };

  const calculateTotals = () => {
    const totalNetWeight = formData.items.reduce((sum, item) => sum + (parseFloat(item.netWeight) || 0), 0);
    const totalGrossWeight = formData.items.reduce((sum, item) => sum + (parseFloat(item.grossWeight) || 0), 0);
    const totalAmount = formData.items.reduce((sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0);
    
    return {
      totalNetWeight: parseFloat(totalNetWeight.toFixed(3)),
      totalGrossWeight: parseFloat(totalGrossWeight.toFixed(3)),
      totalAmount: parseFloat(totalAmount.toFixed(2))
    };
  };

  const { totalNetWeight, totalGrossWeight, totalAmount } = calculateTotals();

  const validateForm = () => {
    const newErrors = { items: [] };
    let hasErrors = false;
    
    // Validate customer
    if (!formData.customer) {
      newErrors.customer = 'Customer is required';
      hasErrors = true;
    }
    
    // Validate items
    if (formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
      hasErrors = true;
    } else {
      formData.items.forEach((item, index) => {
        const itemErrors = {};
        
        if (!item.description) {
          itemErrors.description = 'Required';
          hasErrors = true;
        }
        
        if (!item.netWeight) {
          itemErrors.netWeight = 'Required';
          hasErrors = true;
        } else if (parseFloat(item.netWeight) <= 0) {
          itemErrors.netWeight = 'Must be > 0';
          hasErrors = true;
        }
        
        if (!item.grossWeight) {
          itemErrors.grossWeight = 'Required';
          hasErrors = true;
        } else if (parseFloat(item.grossWeight) < parseFloat(item.netWeight)) {
          itemErrors.grossWeight = 'Must be ≥ net weight';
          hasErrors = true;
        }
        
        if (!item.rate) {
          itemErrors.rate = 'Required';
          hasErrors = true;
        } else if (parseFloat(item.rate) <= 0) {
          itemErrors.rate = 'Must be > 0';
          hasErrors = true;
        }
        
        newErrors.items[index] = itemErrors;
      });
    }
    
    setErrors(hasErrors ? newErrors : {});
    return !hasErrors;
  };

  const handleSave = async () => {
    // Validate customer
    if (!formData.customer) {
      toast.error('Please select a customer');
      return;
    }

    // Validate items
    if (formData.items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    // Validate each item
    for (const [i, item] of formData.items.entries()) {
      if (!item.description?.trim()) {
        toast.error(`Item ${i + 1}: Description is required`);
        return;
      }
      
      if (!item.netWeight || isNaN(Number(item.netWeight)) || Number(item.netWeight) <= 0) {
        toast.error(`Item ${i + 1}: Valid weight is required`);
        return;
      }
      
      if (!item.purity || isNaN(Number(item.purity)) || Number(item.purity) < 0 || Number(item.purity) > 100) {
        toast.error(`Item ${i + 1}: Valid purity (0-100) is required`);
        return;
      }
      
      if (!item.karatPurity) {
        toast.error(`Item ${i + 1}: Karat purity is required`);
        return;
      }
      
      if (!item.pricePerGram || isNaN(Number(item.pricePerGram)) || Number(item.pricePerGram) <= 0) {
        toast.error(`Item ${i + 1}: Valid price per gram is required`);
        return;
      }
    }

    setIsSaving(true);

    try {
      // Prepare data for API
      const purchaseData = {
        referenceNumber: formData.referenceNumber,
        customer: formData.customer,
        items: formData.items.map(item => ({
          description: item.description?.trim() || '',
          metalType: item.metalType,
          weight: parseFloat(item.netWeight),
          grossWeight: parseFloat(item.grossWeight),
          purity: parseFloat(item.purity),
          karatPurity: item.karatPurity,
          pricePerGram: parseFloat(item.pricePerGram),
          totalAmount: parseFloat(item.totalAmount),
          notes: item.notes
        })),
        totalNetWeight: totalNetWeight,
        totalGrossWeight,
        totalAmount,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        notes: formData.notes,
        processedBy: mycus  // Ensure processedBy is either a valid ObjectId or null
      };
      console.log(mycus);
      

      // Send to backend API
      const response = await axios.post(`${apiUrl}/gold-purchases`, purchaseData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Gold purchase saved successfully');
        navigate('/gold-purchases');
      }
    } catch (error) {
      console.error('Error saving gold purchase:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save gold purchase';
      console.log('Server error response:', error.response?.data);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const getSelectedCustomer = () => {
    if (!formData.customer) return null;
    return customers.find(c => c._id === formData.customer) || null;
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1" fontWeight="500">
          Record Gold Purchase
        </Typography>
        <Button
          variant="outlined"
          startIcon={<BackIcon />}
          onClick={() => navigate('/gold-purchases')}
        >
          Back to List
        </Button>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Reference Number"
              name="referenceNumber"
              value={formData.referenceNumber}
              onChange={handleInputChange}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box display="flex" alignItems="center">
              <Autocomplete
                fullWidth
                options={customers}
                getOptionLabel={(option) => option.name || ''}
                value={getSelectedCustomer()}
                onChange={handleCustomerChange}
                onInputChange={handleCustomerSearch}
                loading={loadingCustomers}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Customer"
                    required
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingCustomers ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                getOptionKey={(option) => option._id}
              />
              <Tooltip title="Add New Customer">
                <IconButton 
                  color="primary" 
                  onClick={handleOpenCustomerDialog} 
                  sx={{ ml: 1 }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h6" fontWeight="500" sx={{ mt: 4, mb: 2 }}>
        Items
      </Typography>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Description</TableCell>
            <TableCell>Net Weight (g)</TableCell>
            <TableCell>Gross Weight (g)</TableCell>
            <TableCell>Purity (%)</TableCell>
            <TableCell>Rate (per g)</TableCell>
            <TableCell>Total Amount</TableCell>
            {/* Removed: <TableCell>Has Stones</TableCell> */}
            <TableCell width="120px">Actions</TableCell>
          </TableRow>
        </TableHead>
        {formData.items.map((item, index) => (
          <TableRow key={item.id}>
            <TableCell>{item.description}</TableCell>
            <TableCell>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">g</InputAdornment>,
                  inputProps: { min: 0, step: 0.001 }
                }}
                value={item.netWeight}
                onChange={(e) => handleItemChange(item.id, 'netWeight', e.target.value)}
                onBlur={validateForm}
                error={!!(errors?.items?.[index]?.netWeight)}
                helperText={errors?.items?.[index]?.netWeight}
              />
            </TableCell>
            <TableCell>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">g</InputAdornment>,
                  inputProps: { min: 0, step: 0.001 }
                }}
                value={item.grossWeight}
                onChange={(e) => handleItemChange(item.id, 'grossWeight', e.target.value)}
                onBlur={validateForm}
                error={!!(errors?.items?.[index]?.grossWeight)}
                helperText={errors?.items?.[index]?.grossWeight}
              />
            </TableCell>
            <TableCell>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  inputProps: { min: 0, max: 100, step: 0.01 }
                }}
                value={item.purity}
                onChange={(e) => handleItemChange(item.id, 'purity', e.target.value)}
              />
            </TableCell>
            <TableCell>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                InputProps={{
                  endAdornment: <InputAdornment position="end">₹</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 }
                }}
                value={item.pricePerGram}
                onChange={(e) => handleItemChange(item.id, 'pricePerGram', e.target.value)}
              />
            </TableCell>
            <TableCell>
              {item.totalAmount.toFixed(2)}
            </TableCell>
            {/* Removed: Has Stones cell */}
            <TableCell>
              <IconButton
                color="error"
                onClick={() => removeItem(item.id)}
              >
                <DeleteIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        ))}
      </Table>

      <Box display="flex" justifyContent="center" mb={4}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={addItem}
        >
          Add Another Item
        </Button>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Payment Method</InputLabel>
              <Select
                name="paymentMethod"
                value={formData.paymentMethod}
                label="Payment Method"
                onChange={handleInputChange}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank transfer">Bank Transfer</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel>Payment Status</InputLabel>
              <Select
                name="paymentStatus"
                value={formData.paymentStatus}
                label="Payment Status"
                onChange={handleInputChange}
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
              margin="normal"
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              multiline
              rows={3}
            />
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, bgcolor: '#f9f9f9' }}>
        <Typography variant="h6" gutterBottom>
          Purchase Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle1">
              Total Items: {formData.items.length}
            </Typography>
            <Typography variant="subtitle1">
              Total Net Weight: {totalNetWeight.toFixed(3)} g
            </Typography>
            <Typography variant="subtitle1">
              Total Gross Weight: {totalGrossWeight.toFixed(3)} g
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="h5" align={isSmallScreen ? "left" : "right"} sx={{ color: theme.palette.primary.main }}>
              Total Amount: ₹{totalAmount.toFixed(2)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Box display="flex" justifyContent="center" mt={4}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Gold Purchase'}
        </Button>
      </Box>

      {/* New Customer Dialog */}
      <Dialog open={customerDialog} onClose={handleCloseCustomerDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Customer</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={newCustomer.name}
                onChange={handleNewCustomerChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={newCustomer.phone}
                onChange={handleNewCustomerChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={newCustomer.email}
                onChange={handleNewCustomerChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={newCustomer.address}
                onChange={handleNewCustomerChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCustomerDialog}>Cancel</Button>
          <Button 
            onClick={handleSaveCustomer} 
            variant="contained" 
            color="primary"
            disabled={!newCustomer.name || !newCustomer.phone}
          >
            Save Customer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default NewGoldPurchase;