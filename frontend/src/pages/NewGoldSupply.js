import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Autocomplete,
  InputAdornment,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  Save,
  LocalShipping,
  Add,
  Delete
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import api from '../utils/api';
import { getNetworkStatus } from '../utils/networkStatus';
import { formatCurrency } from '../utils/formatters';

// Metal type options
const metalTypes = ['gold', 'silver', 'platinum', 'other'];
const itemTypes = [
  'ring', 'necklace', 'bracelet', 'earring', 'chain', 
  'pendant', 'bangle', 'nose-pin', 'other'
];
const weightUnits = ['g', 'mg', 'kg', 'oz'];

// Initial item state
const emptyItemState = {
  itemType: 'other',
  description: '',
  metalType: 'gold',
  purity: '',
  grossWeight: 0,
  netWeight: 0,
  weightUnit: 'g',
  hasStones: false,
  stoneDetails: '',
  stoneWeight: 0,
  quantity: 1,
  ratePerGram: 0,
  totalAmount: 0,
  remarks: ''
};

const NewGoldSupply = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if we have a supplier ID from location state
  const initialSupplierId = location.state?.supplierId || '';
  
  // Form state
  const [formData, setFormData] = useState({
    supplier: initialSupplierId,
    invoiceNumber: '',
    supplyDate: new Date(),
    items: [{ ...emptyItemState }],
    totalAmount: 0,
    paymentStatus: 'pending',
    amountPaid: 0,
    balanceDue: 0,
    notes: ''
  });
  
  // UI state
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await api.get('/api/suppliers');
        if (response.data.success) {
          setSuppliers(response.data.data);
          
          // If initial supplier ID is provided, set the selected supplier
          if (initialSupplierId) {
            const supplier = response.data.data.find(s => s._id === initialSupplierId);
            if (supplier) {
              setSelectedSupplier(supplier);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        setSnackbar({
          open: true,
          message: `Error fetching suppliers: ${error.message}`,
          severity: 'error'
        });
      }
    };
    
    fetchSuppliers();
  }, [initialSupplierId]);
  
  // Make sure formData supplier is set when selectedSupplier changes
  useEffect(() => {
    if (selectedSupplier && selectedSupplier._id) {
      setFormData(prev => ({
        ...prev,
        supplier: selectedSupplier._id
      }));
    }
  }, [selectedSupplier]);
  
  // Handle supplier change
  const handleSupplierChange = (event, newValue) => {
    console.log('Selected supplier:', newValue);
    setSelectedSupplier(newValue);
    
    // Store the entire supplier object ID, ensuring it's never empty string if there's a selection
    const supplierId = newValue && newValue._id ? newValue._id : null;
    
    setFormData(prev => ({
      ...prev,
      supplier: supplierId
    }));
    
    // Clear supplier error if exists
    if (errors.supplier) {
      setErrors({
        ...errors,
        supplier: null
      });
    }
  };
  
  // Handle date change
  const handleDateChange = (newDate) => {
    setFormData({
      ...formData,
      supplyDate: newDate
    });
  };
  
  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
    
    // Update balanceDue when amountPaid changes
    if (name === 'amountPaid') {
      const amountPaid = parseFloat(value) || 0;
      const balanceDue = formData.totalAmount - amountPaid;
      
      setFormData(prev => ({
        ...prev,
        amountPaid,
        balanceDue: balanceDue < 0 ? 0 : balanceDue,
        paymentStatus: balanceDue <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending'
      }));
    }
  };
  
  // Handle item form changes
  const handleItemChange = (index, field, value, isNumeric = false) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: isNumeric ? (parseFloat(value) || 0) : value
    };
    
    // Clear item error
    const updatedItemErrors = [...itemErrors];
    if (updatedItemErrors[index] && updatedItemErrors[index][field]) {
      updatedItemErrors[index] = {
        ...updatedItemErrors[index],
        [field]: null
      };
      setItemErrors(updatedItemErrors);
    }
    
    // Calculate total amount for the item
    if (field === 'netWeight' || field === 'ratePerGram' || field === 'quantity') {
      const item = updatedItems[index];
      const netWeight = parseFloat(item.netWeight) || 0;
      const ratePerGram = parseFloat(item.ratePerGram) || 0;
      const quantity = parseInt(item.quantity) || 1;
      
      const totalAmount = (netWeight * ratePerGram) * quantity;
      updatedItems[index].totalAmount = totalAmount;
    }
    
    // Update form data
    setFormData(prev => {
      const newFormData = {
        ...prev,
        items: updatedItems
      };
      
      // Recalculate total
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalAmount, 0);
      const amountPaid = parseFloat(prev.amountPaid) || 0;
      const balanceDue = totalAmount - amountPaid;
      
      return {
        ...newFormData,
        totalAmount,
        balanceDue: balanceDue < 0 ? 0 : balanceDue,
        paymentStatus: balanceDue <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending'
      };
    });
  };
  
  // Add new item
  const handleAddItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...emptyItemState }]
    }));
    
    setItemErrors(prev => [...prev, {}]);
  };
  
  // Remove item
  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) {
      return; // Don't remove the last item
    }
    
    const updatedItems = formData.items.filter((_, i) => i !== index);
    const updatedItemErrors = itemErrors.filter((_, i) => i !== index);
    
    // Recalculate total
    const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalAmount, 0);
    const amountPaid = parseFloat(formData.amountPaid) || 0;
    const balanceDue = totalAmount - amountPaid;
    
    setFormData({
      ...formData,
      items: updatedItems,
      totalAmount,
      balanceDue: balanceDue < 0 ? 0 : balanceDue,
      paymentStatus: balanceDue <= 0 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending'
    });
    
    setItemErrors(updatedItemErrors);
  };
  
  // Validate form
  const validateForm = () => {
    const newErrors = {};
    const newItemErrors = formData.items.map(() => ({}));
    let isValid = true;
    
    // Validate supplier
    if (!formData.supplier) {
      newErrors.supplier = 'Supplier is required';
      isValid = false;
      console.log('Supplier validation failed:', formData.supplier);
    }
    
    // Validate items
    formData.items.forEach((item, index) => {
      if (!item.purity) {
        newItemErrors[index].purity = 'Purity is required';
        isValid = false;
      }
      
      if (!item.grossWeight || item.grossWeight <= 0) {
        newItemErrors[index].grossWeight = 'Valid gross weight is required';
        isValid = false;
      }
      
      if (!item.netWeight || item.netWeight <= 0) {
        newItemErrors[index].netWeight = 'Valid net weight is required';
        isValid = false;
      }
      
      if (item.hasStones && (!item.stoneDetails || item.stoneDetails.trim() === '')) {
        newItemErrors[index].stoneDetails = 'Stone details are required';
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    setItemErrors(newItemErrors);
    
    return isValid;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: 'Please correct the errors in the form',
        severity: 'error'
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const isOnline = await getNetworkStatus();
      
      if (!isOnline) {
        setSnackbar({
          open: true,
          message: 'You are offline. Please try again when you have internet connection.',
          severity: 'error'
        });
        setLoading(false);
        return;
      }
      
      const response = await api.post('/api/gold-supplies', formData);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Gold supply added successfully!',
          severity: 'success'
        });
        
        // Navigate to the supply details page
        setTimeout(() => {
          navigate(`/gold-supplies/${response.data.data._id}`);
        }, 2000);
      }
    } catch (error) {
      console.error('Error adding gold supply:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to add gold supply'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle go back
  const handleGoBack = () => {
    navigate(-1);
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={handleGoBack} sx={{ mr: 1 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <LocalShipping sx={{ mr: 1, color: 'primary.main' }} />
          New Gold Supply
        </Typography>
      </Box>
      
      {/* Form */}
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <form onSubmit={handleSubmit}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Autocomplete
                  options={suppliers}
                  getOptionLabel={(option) => {
                    // Handle both string and object cases
                    if (typeof option === 'string') return option;
                    if (option && option.name) return option.name;
                    return '';
                  }}
                  value={selectedSupplier}
                  onChange={handleSupplierChange}
                  isOptionEqualToValue={(option, value) => {
                    // Properly compare objects by ID or accept exact matches
                    if (option === value) return true;
                    if (!option || !value) return false;
                    // Compare by ID if both have _id property
                    if (option._id && value._id) return option._id === value._id;
                    return false;
                  }}
                  renderOption={(props, option) => (
                    <li {...props} key={option._id}>
                      {option.name}
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Supplier"
                      required
                      error={!!errors.supplier}
                      helperText={errors.supplier}
                      onChange={(e) => {
                        // Clear validation error when user types
                        if (errors.supplier && e.target.value) {
                          setErrors({...errors, supplier: null});
                        }
                      }}
                    />
                  )}
                  disableClearable={true}
                  blurOnSelect
                  openOnFocus
                  selectOnFocus
                  disablePortal
                  clearOnBlur={false}
                  handleHomeEndKeys
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Invoice Number"
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={handleChange}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Supply Date"
                  value={formData.supplyDate}
                  onChange={handleDateChange}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                />
              </Grid>
            </Grid>
          </Paper>
          
          {/* Items */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Supply Items</Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={handleAddItem}
              >
                Add Item
              </Button>
            </Box>
            <Divider sx={{ mb: 3 }} />
            
            {formData.items.map((item, index) => (
              <Box key={index} sx={{ mb: 4, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Item {index + 1}
                  </Typography>
                  
                  {formData.items.length > 1 && (
                    <IconButton 
                      color="error" 
                      onClick={() => handleRemoveItem(index)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  )}
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Item Type</InputLabel>
                      <Select
                        value={item.itemType}
                        label="Item Type"
                        onChange={(e) => handleItemChange(index, 'itemType', e.target.value)}
                      >
                        {itemTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Description"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Metal Type</InputLabel>
                      <Select
                        value={item.metalType}
                        label="Metal Type"
                        onChange={(e) => handleItemChange(index, 'metalType', e.target.value)}
                      >
                        {metalTypes.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      required
                      label="Purity"
                      placeholder="e.g. 22K, 916, 999"
                      value={item.purity}
                      onChange={(e) => handleItemChange(index, 'purity', e.target.value)}
                      error={!!(itemErrors[index] && itemErrors[index].purity)}
                      helperText={(itemErrors[index] && itemErrors[index].purity) || ''}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Gross Weight"
                      value={item.grossWeight}
                      onChange={(e) => handleItemChange(index, 'grossWeight', e.target.value, true)}
                      error={!!(itemErrors[index] && itemErrors[index].grossWeight)}
                      helperText={(itemErrors[index] && itemErrors[index].grossWeight) || ''}
                      InputProps={{
                        endAdornment: (
                          <FormControl variant="standard" sx={{ minWidth: 50 }}>
                            <Select
                              value={item.weightUnit}
                              onChange={(e) => handleItemChange(index, 'weightUnit', e.target.value)}
                              sx={{ ml: 1 }}
                            >
                              {weightUnits.map((unit) => (
                                <MenuItem key={unit} value={unit}>{unit}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ),
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      required
                      type="number"
                      label="Net Weight"
                      value={item.netWeight}
                      onChange={(e) => handleItemChange(index, 'netWeight', e.target.value, true)}
                      error={!!(itemErrors[index] && itemErrors[index].netWeight)}
                      helperText={(itemErrors[index] && itemErrors[index].netWeight) || ''}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{item.weightUnit}</InputAdornment>,
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Quantity"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value, true)}
                      InputProps={{
                        inputProps: { min: 1 },
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={item.hasStones}
                          onChange={(e) => handleItemChange(index, 'hasStones', e.target.checked)}
                        />
                      }
                      label="Has Stones/Gems"
                    />
                  </Grid>
                  
                  {item.hasStones && (
                    <>
                      <Grid item xs={12} sm={8}>
                        <TextField
                          fullWidth
                          label="Stone Details"
                          value={item.stoneDetails}
                          onChange={(e) => handleItemChange(index, 'stoneDetails', e.target.value)}
                          error={!!(itemErrors[index] && itemErrors[index].stoneDetails)}
                          helperText={(itemErrors[index] && itemErrors[index].stoneDetails) || ''}
                          placeholder="e.g. 5 diamonds, 0.5 carat each"
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          type="number"
                          label="Stone Weight"
                          value={item.stoneWeight}
                          onChange={(e) => handleItemChange(index, 'stoneWeight', e.target.value, true)}
                          InputProps={{
                            endAdornment: <InputAdornment position="end">{item.weightUnit}</InputAdornment>,
                          }}
                        />
                      </Grid>
                    </>
                  )}
                  
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }} />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Rate per Gram"
                      value={item.ratePerGram}
                      onChange={(e) => handleItemChange(index, 'ratePerGram', e.target.value, true)}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      fullWidth
                      disabled
                      label="Total Amount"
                      value={formatCurrency(item.totalAmount)}
                    />
                  </Grid>
                </Grid>
              </Box>
            ))}
          </Paper>
          
          {/* Payment */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Payment Information</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  disabled
                  label="Total Amount"
                  value={formatCurrency(formData.totalAmount)}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount Paid"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  disabled
                  label="Balance Due"
                  value={formatCurrency(formData.balanceDue)}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth disabled>
                  <InputLabel>Payment Status</InputLabel>
                  <Select
                    value={formData.paymentStatus}
                    label="Payment Status"
                  >
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="partial">Partially Paid</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                  <FormHelperText>
                    Status is updated automatically based on payment
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Submit Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleGoBack}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <Save />}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Supply'}
            </Button>
          </Box>
        </form>
      </LocalizationProvider>
      
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

export default NewGoldSupply; 