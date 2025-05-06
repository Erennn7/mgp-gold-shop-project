import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  InputAdornment,
  Tab,
  Tabs
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Person,
  Phone,
  Visibility
} from '@mui/icons-material';
import { useForm, Controller } from "react-hook-form";
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const Customers = () => {
  const navigate = useNavigate();
  
  // State
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [tabValue, setTabValue] = useState('all');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Get database context
  const { db, resetDatabase } = useDatabase();

  // Form setup
  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      documentType: 'aadhar',
      documentNumber: '',
      customerType: 'regular',
      notes: ''
    }
  });

  // Effect to fetch customers on mount and when tab changes
  useEffect(() => {
    fetchCustomers();
  }, [tabValue]);

  // Function to fetch customers
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      if (online) {
        try {
          // If online, fetch from API
          let endpoint = '/api/customers';
          if (tabValue !== 'all') {
            endpoint += `?type=${tabValue}`;
          }
          
          const response = await api.get(endpoint);
          if (response.data.success) {
            setCustomers(response.data.data || []);
          }
        } catch (apiError) {
          console.error('API error fetching customers:', apiError);
          // Try IndexedDB as fallback
          await fetchFromIndexedDB();
        }
      } else {
        // If offline, get from IndexedDB
        await fetchFromIndexedDB();
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      handleDatabaseError(error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch customers',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to fetch from IndexedDB
  const fetchFromIndexedDB = async () => {
    if (!db) return;
    
    try {
      let allCustomers = await db.customers.toArray();
      
      // Filter based on tab
      if (tabValue !== 'all') {
        allCustomers = allCustomers.filter(customer => customer.customerType === tabValue);
      }
      
      setCustomers(allCustomers);
    } catch (dbError) {
      console.error('Error getting customers from IndexedDB:', dbError);
      handleDatabaseError(dbError);
    }
  };
  
  // Helper function to handle database errors
  const handleDatabaseError = (error) => {
    if (error && (error.name === 'DatabaseClosedError' || 
                  error.message.includes('Database has been closed') ||
                  error.message.includes('Internal error opening backing store'))) {
      if (resetDatabase) {
        console.warn('Database is closed or corrupted, attempting to reset...');
        resetDatabase().then(() => {
          setSnackbar({
            open: true,
            message: 'Database has been reset due to corruption. Refreshing data...',
            severity: 'warning'
          });
          // Wait a moment before trying to fetch again
          setTimeout(() => {
            fetchCustomers();
          }, 1000);
        }).catch(resetError => {
          console.error('Failed to reset database:', resetError);
          setSnackbar({
            open: true,
            message: 'Failed to reset corrupted database. Please refresh the page.',
            severity: 'error'
          });
        });
      }
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Open dialog for creating a new customer
  const handleOpenCreateDialog = () => {
    setSelectedCustomer(null);
    reset({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      documentType: 'aadhar',
      documentNumber: '',
      customerType: 'regular',
      notes: ''
    });
    setOpenDialog(true);
  };

  // Open dialog for editing a customer
  const handleOpenEditDialog = (customer) => {
    setSelectedCustomer(customer);
    
    // Set form values
    setValue('name', customer.name);
    setValue('phone', customer.phone);
    setValue('email', customer.email || '');
    setValue('address', customer.address || '');
    setValue('city', customer.city || '');
    setValue('state', customer.state || '');
    setValue('pincode', customer.pincode || '');
    setValue('documentType', customer.documentType || 'aadhar');
    setValue('documentNumber', customer.documentNumber || '');
    setValue('customerType', customer.customerType || 'regular');
    setValue('notes', customer.notes || '');
    
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  // Submit form handler
  const onSubmit = async (data) => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (selectedCustomer) {
        // Update existing customer
        if (online) {
          const response = await api.put(`/api/customers/${selectedCustomer._id}`, data);
          
          if (response.data.success) {
            setSnackbar({
              open: true,
              message: 'Customer updated successfully',
              severity: 'success'
            });
            
            // Update local state
            setCustomers(prevCustomers => 
              prevCustomers.map(customer => 
                customer._id === selectedCustomer._id ? response.data.data : customer
              )
            );
            
            // Update in IndexedDB
            if (db) {
              try {
                await db.customers.put({
                  ...response.data.data,
                  id: selectedCustomer.id || selectedCustomer._id // Keep the local ID
                });
              } catch (error) {
                console.error('Error updating customer in IndexedDB:', error);
                handleDatabaseError(error);
              }
            }
          }
        } else {
          setSnackbar({
            open: true,
            message: 'Cannot update customers while offline',
            severity: 'error'
          });
        }
      } else {
        // Create new customer
        if (online) {
          const response = await api.post('/api/customers', data);
          
          if (response.data.success) {
            setSnackbar({
              open: true,
              message: 'Customer added successfully',
              severity: 'success'
            });
            
            // Update local state
            setCustomers(prevCustomers => [...prevCustomers, response.data.data]);
            
            // Add to IndexedDB
            if (db) {
              try {
                await db.customers.add(response.data.data);
              } catch (error) {
                console.error('Error adding customer to IndexedDB:', error);
                handleDatabaseError(error);
              }
            }
          }
        } else {
          setSnackbar({
            open: true,
            message: 'Cannot create customers while offline',
            severity: 'error'
          });
        }
      }
      
      // Close dialog and refresh data
      handleCloseDialog();
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to save customer'}`,
        severity: 'error'
      });
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteConfirm = (customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setCustomerToDelete(null);
  };

  // Delete customer handler
  const handleDeleteCustomer = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot delete customers while offline',
          severity: 'error'
        });
        handleCloseDeleteConfirm();
        return;
      }
      
      const response = await api.delete(`/api/customers/${customerToDelete._id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Customer deleted successfully',
          severity: 'success'
        });
        
        // Remove from IndexedDB if available
        if (db) {
          try {
            await db.customers.delete(customerToDelete._id);
          } catch (error) {
            console.error('Error deleting customer from IndexedDB:', error);
          }
        }
        
        // Refresh customers
        fetchCustomers();
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete customer',
        severity: 'error'
      });
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    const searchStr = searchTerm.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchStr) ||
      customer.phone.includes(searchStr) ||
      (customer.email && customer.email.toLowerCase().includes(searchStr))
    );
  });

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // View customer details
  const handleViewCustomer = (customer) => {
    navigate(`/customers/${customer._id || customer.id}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
          Customers
        </Typography>
        
        <Box>
          {isOffline && (
            <Alert severity="warning" sx={{ mb: 2, display: 'inline-flex', mr: 2 }}>
              You are offline. Some features may be limited.
            </Alert>
          )}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenCreateDialog}
            disabled={isOffline}
          >
            New Customer
          </Button>
        </Box>
      </Box>
      
      {/* Tabs for customer filtering */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="all" label="All Customers" />
          <Tab value="regular" label="Regular" />
          <Tab value="wholesale" label="Wholesale" />
          <Tab value="vip" label="VIP" />
        </Tabs>
      </Paper>
      
      {/* Search and filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search customers by name, phone or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} textAlign="right">
            <Typography variant="subtitle2">
              {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} found
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Customers Table */}
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredCustomers.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Customer ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Customer Type</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer._id || customer.id}>
                    <TableCell>{customer.customerId || '-'}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Phone fontSize="small" color="primary" sx={{ mr: 1 }} />
                        {customer.phone}
                      </Box>
                    </TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>
                      {customer.address ? 
                        `${customer.address}, ${customer.city || ''} ${customer.pincode || ''}`.trim() : 
                        '-'}
                    </TableCell>
                    <TableCell>
                      {customer.customerType ? 
                        customer.customerType.charAt(0).toUpperCase() + customer.customerType.slice(1) : 
                        'Regular'}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleViewCustomer(customer)}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="secondary"
                        onClick={() => handleOpenEditDialog(customer)}
                        disabled={isOffline}
                      >
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleOpenDeleteConfirm(customer)}
                        disabled={isOffline}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No customers found. {tabValue !== 'all' ? 'Try changing the type filter or ' : ''}
              {!isOffline && 'Create a new customer using the button above.'}
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Customer Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedCustomer ? 'Edit Customer' : 'Create New Customer'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="phone"
                  control={control}
                  rules={{ 
                    required: 'Phone is required',
                    pattern: {
                      value: /^[0-9]{10}$/,
                      message: 'Please enter a valid 10-digit phone number'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  rules={{ 
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="customerType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Customer Type"
                      fullWidth
                      select
                      SelectProps={{
                        native: true
                      }}
                    >
                      <option value="regular">Regular</option>
                      <option value="wholesale">Wholesale</option>
                      <option value="vip">VIP</option>
                    </TextField>
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Address"
                      fullWidth
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="city"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="City"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="state"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="State"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="pincode"
                  control={control}
                  rules={{ 
                    pattern: {
                      value: /^[0-9]{6}$/,
                      message: 'Please enter a valid 6-digit pincode'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Pincode"
                      fullWidth
                      error={!!errors.pincode}
                      helperText={errors.pincode?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="documentType"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="ID Document Type"
                      fullWidth
                      select
                      SelectProps={{
                        native: true
                      }}
                    >
                      <option value="aadhar">Aadhar Card</option>
                      <option value="pan">PAN Card</option>
                      <option value="voter">Voter ID</option>
                      <option value="driving">Driving License</option>
                      <option value="passport">Passport</option>
                    </TextField>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="documentNumber"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="ID Document Number"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notes"
                      fullWidth
                      multiline
                      rows={3}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              type="submit"
              variant="contained" 
              color="primary"
            >
              {selectedCustomer ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this customer?
            {customerToDelete && (
              <Box component="span" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
                {customerToDelete.name} - {customerToDelete.phone}
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancel</Button>
          <Button onClick={handleDeleteCustomer} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default Customers; 