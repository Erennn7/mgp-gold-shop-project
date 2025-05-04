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
  FormControlLabel,
  Checkbox,
  Chip,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Card,
  CardContent
} from '@mui/material';
import {
  ArrowBack,
  Save,
  CreditCard,
  Person,
  CalendarToday,
  CheckCircle
} from '@mui/icons-material';
import { format } from 'date-fns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const NewSavingsScheme = () => {
  const navigate = useNavigate();
  const { db } = useDatabase();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Form state
  const [formData, setFormData] = useState({
    customer: '',
    startDate: new Date(),
    monthlyAmount: 1000,
    initialDeposit: true,
    paymentMethod: 'cash',
    paymentReference: '',
    notes: ''
  });
  
  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
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
        try {
          const cachedCustomers = await db.customers.toArray();
          setCustomers(cachedCustomers);
        } catch (dbError) {
          console.error('Error fetching customers from IndexedDB:', dbError);
        }
      }
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to load customers'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchCustomers();
  }, []);
  
  // Handle form change
  const handleFormChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  // Handle date change
  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      startDate: date
    });
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Submit form
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
    
    if (!formData.monthlyAmount || formData.monthlyAmount <= 0) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid monthly amount',
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
          message: 'Cannot create scheme while offline',
          severity: 'error'
        });
        setIsSubmitting(false);
        return;
      }
      
      // Prepare data
      const schemeData = {
        customer: formData.customer,
        startDate: formData.startDate,
        monthlyAmount: formData.monthlyAmount,
        initialDeposit: formData.initialDeposit,
        paymentMethod: formData.paymentMethod,
        paymentReference: formData.paymentReference,
        notes: formData.notes
      };
      
      // Submit the scheme
      const response = await api.post('/api/savings-schemes', schemeData);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Savings scheme created successfully',
          severity: 'success'
        });
        
        // Navigate to the new scheme detail page or back to the list
        setTimeout(() => {
          navigate('/savings-schemes');
        }, 2000);
      }
    } catch (error) {
      console.error('Error creating savings scheme:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to create scheme'}`,
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Navigate back
  const handleBack = () => {
    navigate(-1);
  };
  
  // Calculate expected total amount
  const calculateTotalAmount = () => {
    return formData.monthlyAmount * 12;
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Back to Schemes
        </Button>
        
        {isOffline && (
          <Alert severity="warning" sx={{ display: 'inline-flex' }}>
            You are offline. Cannot create scheme.
          </Alert>
        )}
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <CreditCard sx={{ mr: 1, color: 'primary.main' }} />
          New Savings Scheme
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Create a new monthly savings scheme for a customer
        </Typography>
      </Box>
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <Person sx={{ mr: 1 }} />
                Customer Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth required variant="outlined">
                    <InputLabel>Select Customer</InputLabel>
                    <Select
                      name="customer"
                      value={formData.customer}
                      onChange={handleFormChange}
                      label="Select Customer"
                      disabled={isOffline || loading}
                    >
                      {customers.map(customer => (
                        <MenuItem key={customer._id || customer.id} value={customer._id || customer.id}>
                          {customer.name} - {customer.phone}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {formData.customer && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ bgcolor: '#f8f9ff', mt: 1 }}>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Selected Customer
                        </Typography>
                        {customers.filter(c => (c._id || c.id) === formData.customer).map(customer => (
                          <Box key={customer._id || customer.id}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {customer.name}
                            </Typography>
                            <Typography variant="body2">
                              Phone: {customer.phone}
                            </Typography>
                            {customer.email && (
                              <Typography variant="body2">
                                Email: {customer.email}
                              </Typography>
                            )}
                            {customer.address && (
                              <Typography variant="body2">
                                Address: {customer.address}, {customer.city} {customer.pincode}
                              </Typography>
                            )}
                            <Chip 
                              label={customer.customerType || 'Regular'} 
                              size="small" 
                              color="primary" 
                              sx={{ mt: 1 }} 
                            />
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                )}
              </Grid>
            </Paper>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
                <CalendarToday sx={{ mr: 1 }} />
                Scheme Details
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Start Date"
                      value={formData.startDate}
                      onChange={handleDateChange}
                      renderInput={(params) => <TextField {...params} fullWidth required />}
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Monthly Amount"
                    name="monthlyAmount"
                    type="number"
                    value={formData.monthlyAmount}
                    onChange={handleFormChange}
                    required
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                    variant="outlined"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="initialDeposit"
                        checked={formData.initialDeposit}
                        onChange={handleFormChange}
                        color="primary"
                      />
                    }
                    label="Make initial deposit now"
                  />
                </Grid>
                
                {formData.initialDeposit && (
                  <>
                    <Grid item xs={12} sm={6}>
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
                    
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Payment Reference"
                        name="paymentReference"
                        value={formData.paymentReference}
                        onChange={handleFormChange}
                        variant="outlined"
                        placeholder="Transaction ID, UPI ID, etc."
                      />
                    </Grid>
                  </>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
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
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Typography variant="h6" gutterBottom>
                Scheme Summary
              </Typography>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ my: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <Typography variant="body1">Monthly Amount:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right" fontWeight="bold">
                      {formatCurrency(formData.monthlyAmount)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body1">Duration:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right" fontWeight="bold">
                      11 months
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body1">Initial Deposit:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right" fontWeight="bold">
                      {formData.initialDeposit ? formatCurrency(formData.monthlyAmount) : 'None'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ my: 2 }}>
                <Grid container>
                  <Grid item xs={6}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Customer Pays:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle1" align="right" fontWeight="bold">
                      {formatCurrency(formData.monthlyAmount * 11)}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                  Customer makes 11 monthly payments of {formatCurrency(formData.monthlyAmount)}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ bgcolor: '#f1f8e9', p: 2, borderRadius: 1, mt: 3 }}>
                <Grid container alignItems="center">
                  <Grid item xs={6}>
                    <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                      Customer Gets:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle1" align="right" fontWeight="bold" color="success.main">
                      {formatCurrency(calculateTotalAmount())}
                    </Typography>
                  </Grid>
                </Grid>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <CheckCircle sx={{ color: 'success.main', mr: 1, fontSize: 16 }} />
                  <Typography variant="caption" color="textSecondary">
                    Value of gold in the 12th month
                  </Typography>
                </Box>
              </Box>
              
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                startIcon={<Save />}
                disabled={isSubmitting || isOffline || !formData.customer || !formData.monthlyAmount}
                sx={{ mt: 3 }}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Create Scheme'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </form>
      
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

export default NewSavingsScheme; 