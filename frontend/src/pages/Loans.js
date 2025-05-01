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
  Chip,
  Alert,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Snackbar,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Visibility,
  AccountBalanceWallet,
  Close
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useForm, Controller } from "react-hook-form";
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const Loans = () => {
  const navigate = useNavigate();
  
  // State
  const [loans, setLoans] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
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
      customer: '',
      metalType: 'gold',
      itemDescription: '',
      weight: '',
      principalAmount: '',
      interestRate: '2.0', // 2% monthly interest rate default
      startDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd'), // 3 months loan term default
      status: 'active',
      notes: ''
    }
  });

  // Effect to fetch loans on mount and when tab changes
  useEffect(() => {
    fetchLoans();
    fetchCustomers();
  }, [tabValue]);

  // Function to fetch loans
  const fetchLoans = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      let fetchedLoans = [];
      
      if (online) {
        try {
          // If online, fetch from API
          let endpoint = '/api/loans';
          if (tabValue !== 'all') {
            endpoint += `?status=${tabValue}`;
          }
          
          const response = await api.get(endpoint);
          if (response.data.success) {
            fetchedLoans = response.data.data;
            
            // Update IndexedDB if available - THIS IS CRITICAL
            if (db) {
              try {
                console.log("Storing loans in IndexedDB:", fetchedLoans);
                
                // Clear existing loans first to prevent duplicates
                await db.loans.clear();
                
                // Add new loans to IndexedDB - ensure IDs are preserved
                if (fetchedLoans.length > 0) {
                  // Map MongoDB _id to IndexedDB id for compatibility
                  const loansToStore = fetchedLoans.map(loan => ({
                    ...loan,
                    id: loan._id // Ensure id field is set for IndexedDB
                  }));
                  
                  await db.loans.bulkAdd(loansToStore);
                  console.log(`Successfully stored ${loansToStore.length} loans in IndexedDB`);
                }
              } catch (dbError) {
                console.error('Error updating loans in IndexedDB:', dbError);
                handleDatabaseError(dbError);
              }
            }
            
            // Update state with fetched loans
            setLoans(fetchedLoans);
          }
        } catch (apiError) {
          console.error('API error fetching loans:', apiError);
          await fetchFromIndexedDB();
        }
      } else {
        // If offline, get from IndexedDB
        await fetchFromIndexedDB();
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
      handleDatabaseError(error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch loans',
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
      console.log("Retrieving loans from IndexedDB");
      let allLoans = await db.loans.toArray();
      console.log("Loans retrieved from IndexedDB:", allLoans);
      
      // Filter based on tab
      if (tabValue !== 'all') {
        allLoans = allLoans.filter(loan => loan.status === tabValue);
      }
      
      setLoans(allLoans);
    } catch (dbError) {
      console.error('Error getting loans from IndexedDB:', dbError);
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
            fetchLoans();
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

  // Function to fetch customers for the form
  const fetchCustomers = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();

      if (online) {
        try {
          // If online, fetch from API
          const response = await api.get('/api/customers');
          if (response.data.success) {
            const fetchedCustomers = response.data.data || [];
            setCustomers(fetchedCustomers);
            
            // Update IndexedDB if available
            if (db) {
              try {
                // Only update if we have customers
                if (fetchedCustomers.length > 0) {
                  // Clear existing customers (optional)
                  await db.customers.clear();
                  // Add new customers to IndexedDB
                  await db.customers.bulkAdd(fetchedCustomers);
                }
              } catch (dbError) {
                console.error('Error updating customers in IndexedDB:', dbError);
                handleDatabaseError(dbError);
              }
            }
          }
        } catch (apiError) {
          console.error('API error fetching customers:', apiError);
          await fetchCustomersFromIndexedDB();
        }
      } else {
        // If offline, get from IndexedDB
        await fetchCustomersFromIndexedDB();
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      handleDatabaseError(error);
    }
  };

  // Helper function to fetch customers from IndexedDB
  const fetchCustomersFromIndexedDB = async () => {
    if (!db) return;
    
    try {
      const fetchedCustomers = await db.customers.toArray();
      setCustomers(fetchedCustomers);
    } catch (dbError) {
      console.error('Error getting customers from IndexedDB:', dbError);
      handleDatabaseError(dbError);
    }
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Open dialog for creating a new loan
  const handleOpenCreateDialog = () => {
    setSelectedLoan(null);
    reset({
      customer: '',
      metalType: 'gold',
      itemDescription: '',
      weight: '',
      principalAmount: '',
      interestRate: '2.0',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(new Date().setMonth(new Date().getMonth() + 3)), 'yyyy-MM-dd'),
      status: 'active',
      notes: ''
    });
    setOpenDialog(true);
  };

  // Open dialog for editing a loan
  const handleOpenEditDialog = (loan) => {
    setSelectedLoan(loan);
    
    // Set form values
    setValue('customer', loan.customer._id || loan.customer.id);
    setValue('metalType', loan.metalType);
    setValue('itemDescription', loan.itemDescription);
    setValue('weight', loan.weight);
    setValue('principalAmount', loan.principalAmount);
    setValue('interestRate', loan.interestRate);
    setValue('startDate', format(new Date(loan.startDate), 'yyyy-MM-dd'));
    setValue('dueDate', format(new Date(loan.dueDate), 'yyyy-MM-dd'));
    setValue('status', loan.status);
    setValue('notes', loan.notes || '');
    
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
      setIsOffline(!online);
      
      if (selectedLoan) {
        // Update existing loan
        if (online) {
          const response = await api.put(`/api/loans/${selectedLoan._id}`, data);
          
          if (response.data.success) {
            setSnackbar({
              open: true,
              message: 'Loan updated successfully',
              severity: 'success'
            });
            
            // Update local state
            setLoans(prevLoans => 
              prevLoans.map(loan => 
                loan._id === selectedLoan._id ? response.data.data : loan
              )
            );
            
            // Update in IndexedDB
            if (db) {
              try {
                const updatedLoan = {
                  ...response.data.data,
                  id: response.data.data._id // Ensure id field is set for IndexedDB
                };
                
                console.log("Updating loan in IndexedDB:", updatedLoan);
                await db.loans.put(updatedLoan);
              } catch (error) {
                console.error('Error updating loan in IndexedDB:', error);
                handleDatabaseError(error);
              }
            }
          }
        } else {
          setSnackbar({
            open: true,
            message: 'Cannot update loans while offline',
            severity: 'error'
          });
        }
      } else {
        // Create new loan
        if (online) {
          const response = await api.post('/api/loans', data);
          
          if (response.data.success) {
            setSnackbar({
              open: true,
              message: 'Loan created successfully',
              severity: 'success'
            });
            
            // Add to local state
            setLoans(prevLoans => [response.data.data, ...prevLoans]);
            
            // Add to IndexedDB
            if (db) {
              try {
                const newLoan = {
                  ...response.data.data,
                  id: response.data.data._id // Ensure id field is set for IndexedDB
                };
                
                console.log("Adding new loan to IndexedDB:", newLoan);
                await db.loans.add(newLoan);
              } catch (error) {
                console.error('Error adding loan to IndexedDB:', error);
                handleDatabaseError(error);
              }
            }
          }
        } else {
          setSnackbar({
            open: true,
            message: 'Cannot create loans while offline',
            severity: 'error'
          });
        }
      }
      
      // Close dialog
      handleCloseDialog();
      
      // Refresh data after a short delay
      setTimeout(() => {
        fetchLoans();
      }, 500);
    } catch (error) {
      console.error('Error submitting loan form:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to save loan'}`,
        severity: 'error'
      });
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteConfirm = (loan) => {
    setLoanToDelete(loan);
    setDeleteConfirmOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setLoanToDelete(null);
  };

  // Delete loan handler
  const handleDeleteLoan = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot delete loans while offline',
          severity: 'error'
        });
        handleCloseDeleteConfirm();
        return;
      }
      
      const response = await api.delete(`/api/loans/${loanToDelete._id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Loan deleted successfully',
          severity: 'success'
        });
        
        // Remove from local state
        setLoans(prevLoans => prevLoans.filter(loan => loan._id !== loanToDelete._id));
        
        // Remove from IndexedDB if available
        if (db) {
          try {
            console.log(`Deleting loan from IndexedDB: ${loanToDelete._id}`);
            
            // Try to delete by _id (MongoDB ID)
            await db.loans.where('_id').equals(loanToDelete._id).delete();
            
            // Also try by id (IndexedDB ID) for backup
            await db.loans.where('id').equals(loanToDelete._id).delete();
            
            console.log("Loan deleted from IndexedDB");
          } catch (error) {
            console.error('Error deleting loan from IndexedDB:', error);
            handleDatabaseError(error);
          }
        }
      }
    } catch (error) {
      console.error('Error deleting loan:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete loan',
        severity: 'error'
      });
    } finally {
      handleCloseDeleteConfirm();
    }
  };

  // Filter loans based on search term
  const filteredLoans = loans.filter(loan => {
    const searchStr = searchTerm.toLowerCase();
    return (
      (loan.customer?.name?.toLowerCase().includes(searchStr)) ||
      loan.itemDescription.toLowerCase().includes(searchStr) ||
      loan.loanNumber?.toLowerCase().includes(searchStr)
    );
  });

  // Calculate interest amount
  const calculateInterest = (principal, rate, startDate, dueDate) => {
    const start = new Date(startDate);
    const due = new Date(dueDate);
    const months = (due.getFullYear() - start.getFullYear()) * 12 + due.getMonth() - start.getMonth();
    const monthlyRate = rate / 100;
    
    // Compound interest formula: A = P(1 + r)^t - P
    // Where A is interest, P is principal, r is rate, t is time
    const finalAmount = principal * Math.pow(1 + monthlyRate, months);
    return finalAmount - principal;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'warning';
      case 'completed':
        return 'success';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  // Calculate days past due
  const calculateDaysPastDue = (loan) => {
    if (!loan || !loan.dueDate) return 0;
    
    const dueDate = new Date(loan.dueDate);
    const now = new Date();
    
    if (now <= dueDate) return 0;
    
    // Calculate days difference
    const diffTime = Math.abs(now - dueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Format days overdue
  const formatDaysOverdue = (days) => {
    if (days === 0) return '';
    if (days === 1) return '(1 day overdue)';
    return `(${days} days overdue)`;
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // View loan details
  const handleViewLoan = (loan) => {
    navigate(`/loans/${loan._id || loan.id}`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          <AccountBalanceWallet sx={{ mr: 1, verticalAlign: 'middle' }} />
          Loans
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
            New Loan
          </Button>
        </Box>
      </Box>
      
      {/* Tabs for loan filtering */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="all" label="All Loans" />
          <Tab value="active" label="Active" />
          <Tab value="completed" label="Completed" />
          <Tab value="overdue" label="Overdue" />
        </Tabs>
      </Paper>
      
      {/* Search and filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              placeholder="Search loans by customer name, description or loan number"
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
              {filteredLoans.length} loan{filteredLoans.length !== 1 ? 's' : ''} found
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Loans Table */}
      <Paper>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : filteredLoans.length > 0 ? (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Loan Number</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Item Description</TableCell>
                  <TableCell>Weight (g)</TableCell>
                  <TableCell align="right">Principal Amount</TableCell>
                  <TableCell align="right">Interest Rate</TableCell>
                  <TableCell align="right">Est. Final Amount</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>Due Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredLoans.map((loan) => {
                  const interestAmount = calculateInterest(
                    loan.principalAmount,
                    loan.interestRate,
                    loan.startDate,
                    loan.dueDate
                  );
                  
                  const finalAmount = loan.principalAmount + interestAmount;
                  
                  return (
                    <TableRow key={loan._id || loan.id}>
                      <TableCell>{loan.loanNumber}</TableCell>
                      <TableCell>{loan.customer?.name || 'Unknown'}</TableCell>
                      <TableCell>{loan.itemDescription}</TableCell>
                      <TableCell>{loan.weight} g</TableCell>
                      <TableCell align="right">{formatCurrency(loan.principalAmount)}</TableCell>
                      <TableCell align="right">
                        {loan.interestRate}%
                        <Typography variant="caption" display="block">
                          (monthly compound)
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(finalAmount)}
                        <Typography variant="caption" display="block" color="warning.main">
                          (+{formatCurrency(interestAmount)} interest)
                        </Typography>
                      </TableCell>
                      <TableCell>{format(new Date(loan.startDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(new Date(loan.dueDate), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>
                        <Chip 
                          label={loan.status.charAt(0).toUpperCase() + loan.status.slice(1)} 
                          color={getStatusColor(loan.status)}
                          size="small"
                        />
                        {loan.status === 'overdue' && (
                          <Typography variant="caption" display="block" color="error">
                            {formatDaysOverdue(calculateDaysPastDue(loan))}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleViewLoan(loan)}
                        >
                          <Visibility fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="secondary"
                          onClick={() => handleOpenEditDialog(loan)}
                          disabled={isOffline}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton 
                          size="small" 
                          color="error"
                          onClick={() => handleOpenDeleteConfirm(loan)}
                          disabled={isOffline}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No loans found. {tabValue !== 'all' ? 'Try changing the status filter or ' : ''}
              {!isOffline && 'Create a new loan using the button above.'}
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Loan Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedLoan ? 'Edit Loan' : 'Create New Loan'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="customer"
                  control={control}
                  rules={{ required: 'Customer is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.customer}>
                      <InputLabel>Customer</InputLabel>
                      <Select
                        {...field}
                        label="Customer"
                      >
                        {customers.map(customer => (
                          <MenuItem key={customer._id || customer.id} value={customer._id || customer.id}>
                            {customer.name} - {customer.phone}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.customer && (
                        <Typography variant="caption" color="error">
                          {errors.customer.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="metalType"
                  control={control}
                  rules={{ required: 'Metal type is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.metalType}>
                      <InputLabel>Metal Type</InputLabel>
                      <Select
                        {...field}
                        label="Metal Type"
                      >
                        <MenuItem value="gold">Gold</MenuItem>
                        <MenuItem value="silver">Silver</MenuItem>
                      </Select>
                      {errors.metalType && (
                        <Typography variant="caption" color="error">
                          {errors.metalType.message}
                        </Typography>
                      )}
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Controller
                  name="itemDescription"
                  control={control}
                  rules={{ required: 'Item description is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Item Description"
                      fullWidth
                      error={!!errors.itemDescription}
                      helperText={errors.itemDescription?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="weight"
                  control={control}
                  rules={{ 
                    required: 'Weight is required',
                    pattern: {
                      value: /^[0-9]*\.?[0-9]+$/,
                      message: 'Please enter a valid number'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Weight (grams)"
                      fullWidth
                      error={!!errors.weight}
                      helperText={errors.weight?.message}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">g</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="principalAmount"
                  control={control}
                  rules={{ 
                    required: 'Principal amount is required',
                    pattern: {
                      value: /^[0-9]*\.?[0-9]+$/,
                      message: 'Please enter a valid number'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Principal Amount"
                      fullWidth
                      error={!!errors.principalAmount}
                      helperText={errors.principalAmount?.message}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="interestRate"
                  control={control}
                  rules={{ 
                    required: 'Interest rate is required',
                    pattern: {
                      value: /^[0-9]*\.?[0-9]+$/,
                      message: 'Please enter a valid number'
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Interest Rate (monthly)"
                      fullWidth
                      error={!!errors.interestRate}
                      helperText={errors.interestRate?.message}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="startDate"
                  control={control}
                  rules={{ required: 'Start date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Start Date"
                      type="date"
                      fullWidth
                      error={!!errors.startDate}
                      helperText={errors.startDate?.message}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="dueDate"
                  control={control}
                  rules={{ required: 'Due date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Due Date"
                      type="date"
                      fullWidth
                      error={!!errors.dueDate}
                      helperText={errors.dueDate?.message}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="status"
                  control={control}
                  rules={{ required: 'Status is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.status}>
                      <InputLabel>Status</InputLabel>
                      <Select
                        {...field}
                        label="Status"
                      >
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="overdue">Overdue</MenuItem>
                      </Select>
                      {errors.status && (
                        <Typography variant="caption" color="error">
                          {errors.status.message}
                        </Typography>
                      )}
                    </FormControl>
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
              {selectedLoan ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this loan record?
            {loanToDelete && (
              <Box component="span" sx={{ fontWeight: 'bold', display: 'block', mt: 1 }}>
                {loanToDelete.loanNumber} - {loanToDelete.customer?.name}
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm}>Cancel</Button>
          <Button onClick={handleDeleteLoan} color="error" variant="contained">
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

export default Loans; 