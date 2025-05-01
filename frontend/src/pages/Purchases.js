import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  IconButton,
  Snackbar,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
  Tooltip,
  Divider,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle
} from '@mui/material';
import { 
  Add, 
  Visibility,
  Print,
  Email as EmailIcon,
  Refresh, 
  Search, 
  FilterList,
  Delete,
  ShoppingBasket
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const Purchases = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const customerId = queryParams.get('customer');
  
  // State
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState({
    metalType: '',
    paymentStatus: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isOffline, setIsOffline] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    purchase: null
  });

  // Get database context
  const { db } = useDatabase();

  // Effect to fetch purchases on mount and when navigating back to this page
  useEffect(() => {
    fetchPurchases();
  }, [customerId, location]);

  // Function to fetch purchases from API or IndexedDB
  const fetchPurchases = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      if (online) {
        // If online, fetch from API
        let url = '/api/purchases';
        if (customerId) {
          url += `?customer=${customerId}`;
        }
        const response = await api.get(url);
        if (response.data.success) {
          setPurchases(response.data.data);
        }
      } else {
        // If offline, fetch from IndexedDB
        if (db) {
          if (customerId) {
            const cachedPurchases = await db.purchases
              .where('customer')
              .equals(customerId)
              .toArray();
            setPurchases(cachedPurchases);
          } else {
            const cachedPurchases = await db.purchases.toArray();
            setPurchases(cachedPurchases);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching purchases:', error);
      // Try to get data from IndexedDB as a fallback
      if (db) {
        if (customerId) {
          const cachedPurchases = await db.purchases
            .where('customer')
            .equals(customerId)
            .toArray();
          setPurchases(cachedPurchases);
        } else {
          const cachedPurchases = await db.purchases.toArray();
          setPurchases(cachedPurchases);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Toggle filter panel
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Handle filter change
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilterOptions({
      ...filterOptions,
      [name]: value
    });
  };

  // Reset filters
  const resetFilters = () => {
    setFilterOptions({
      metalType: '',
      paymentStatus: '',
      startDate: '',
      endDate: ''
    });
  };

  // Filter purchases based on search term and filter options
  const filteredPurchases = purchases.filter(purchase => {
    // Search term filter
    const searchFields = `${purchase.invoiceNumber} ${purchase.customer.name || 'Unknown'}`.toLowerCase();
    if (!searchFields.includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Metal type filter
    if (filterOptions.metalType && !purchase.items.some(item => item.metalType === filterOptions.metalType)) {
      return false;
    }
    
    // Payment status filter
    if (filterOptions.paymentStatus && purchase.paymentStatus !== filterOptions.paymentStatus) {
      return false;
    }
    
    // Date range filter
    if (filterOptions.startDate) {
      const startDate = new Date(filterOptions.startDate);
      const purchaseDate = new Date(purchase.createdAt);
      if (purchaseDate < startDate) {
        return false;
      }
    }
    
    if (filterOptions.endDate) {
      const endDate = new Date(filterOptions.endDate);
      endDate.setHours(23, 59, 59); // End of the day
      const purchaseDate = new Date(purchase.createdAt);
      if (purchaseDate > endDate) {
        return false;
      }
    }
    
    return true;
  });

  // View purchase details
  const handleViewPurchase = (purchase) => {
    navigate(`/purchases/${purchase._id}`);
  };

  // Navigate to create new purchase
  const handleCreatePurchase = () => {
    navigate('/purchases/new');
  };

  // Open email dialog
  const handleOpenEmailDialog = (purchase) => {
    setSelectedPurchase(purchase);
    setEmailAddress(purchase.customer.email || '');
    setShowEmailDialog(true);
  };

  // Close email dialog
  const handleCloseEmailDialog = () => {
    setShowEmailDialog(false);
    setSelectedPurchase(null);
    setEmailAddress('');
  };

  // Send receipt by email
  const handleSendEmail = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot send email while offline',
          severity: 'error'
        });
        handleCloseEmailDialog();
        return;
      }

      const response = await api.post(`/api/purchases/${selectedPurchase._id}/send-receipt`, {
        email: emailAddress
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Receipt sent successfully',
          severity: 'success'
        });
        
        // Update the purchase with receiptSent status
        setPurchases(prevPurchases => 
          prevPurchases.map(purchase => {
            if (purchase._id === selectedPurchase._id) {
              return {
                ...purchase,
                receiptSent: true,
                receiptSentTo: emailAddress
              };
            }
            return purchase;
          })
        );
      }
      
      handleCloseEmailDialog();
    } catch (error) {
      console.error('Error sending receipt:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to send receipt'}`,
        severity: 'error'
      });
      
      handleCloseEmailDialog();
    }
  };

  // Open confirm delete dialog
  const handleConfirmDelete = (purchase) => {
    setConfirmDelete({
      open: true,
      purchase
    });
  };

  // Close confirm delete dialog
  const handleCloseConfirmDelete = () => {
    setConfirmDelete({
      open: false,
      purchase: null
    });
  };

  // Delete purchase
  const handleDeletePurchase = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot delete purchase while offline',
          severity: 'error'
        });
        handleCloseConfirmDelete();
        return;
      }

      const response = await api.delete(`/api/purchases/${confirmDelete.purchase._id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Purchase deleted successfully',
          severity: 'success'
        });
        
        // Update local state
        setPurchases(prevPurchases => 
          prevPurchases.filter(purchase => purchase._id !== confirmDelete.purchase._id)
        );
      }
      
      handleCloseConfirmDelete();
    } catch (error) {
      console.error('Error deleting purchase:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to delete purchase'}`,
        severity: 'error'
      });
      
      handleCloseConfirmDelete();
    }
  };

  // Print receipt
  const handlePrintReceipt = async (purchase) => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot generate receipt while offline',
          severity: 'error'
        });
        return;
      }

      const response = await api.get(`/api/purchases/${purchase._id}/receipt`, {
        responseType: 'blob'
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${purchase.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSnackbar({
        open: true,
        message: 'Receipt generated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      
      setSnackbar({
        open: true,
        message: 'Failed to generate receipt',
        severity: 'error'
      });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Get total amount for purchase
  const getTotalAmount = (purchase) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(purchase.totalAmount);
  };

  // Render purchases table
  const renderPurchasesTable = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (filteredPurchases.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No purchases found{searchTerm ? ' for your search criteria' : ''}.
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice Number</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPurchases.map((purchase) => (
              <TableRow key={purchase._id || purchase.id}>
                <TableCell>{purchase.invoiceNumber}</TableCell>
                <TableCell>{purchase.customer.name || 'Unknown'}</TableCell>
                <TableCell>{format(new Date(purchase.createdAt), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  {purchase.items.length} items
                  <Box sx={{ mt: 1 }}>
                    {purchase.items.map((item, idx) => (
                      <Chip 
                        key={idx}
                        label={`${item.name.substring(0, 15)}${item.name.length > 15 ? '...' : ''} (${item.quantity})`} 
                        size="small" 
                        color={item.metalType === 'gold' ? 'primary' : 'secondary'}
                        sx={{ mr: 0.5, mb: 0.5 }} 
                      />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{getTotalAmount(purchase)}</TableCell>
                <TableCell>
                  <Chip 
                    label={purchase.paymentStatus.charAt(0).toUpperCase() + purchase.paymentStatus.slice(1)} 
                    color={
                      purchase.paymentStatus === 'completed' ? 'success' :
                      purchase.paymentStatus === 'pending' ? 'error' : 'warning'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleViewPurchase(purchase)}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Print Receipt">
                    <IconButton 
                      size="small" 
                      color="info"
                      onClick={() => handlePrintReceipt(purchase)}
                    >
                      <Print fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Email Receipt">
                    <IconButton 
                      size="small" 
                      color="success"
                      onClick={() => handleOpenEmailDialog(purchase)}
                      disabled={!purchase.customer.email}
                    >
                      <EmailIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleConfirmDelete(purchase)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Add a refresh button handler
  const handleRefresh = () => {
    fetchPurchases();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          {customerId ? 'Customer Purchases' : 'Purchases'}
        </Typography>
        
        {isOffline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are currently offline. Some features may be limited.
          </Alert>
        )}
      </Box>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            variant="outlined"
            label="Search Purchases"
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
        <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={toggleFilters}
            sx={{ mr: 1 }}
          >
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreatePurchase}
          >
            New Purchase
          </Button>
        </Grid>
      </Grid>
      
      {showFilters && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Metal Type</InputLabel>
                <Select
                  name="metalType"
                  value={filterOptions.metalType}
                  onChange={handleFilterChange}
                  label="Metal Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="gold">Gold</MenuItem>
                  <MenuItem value="silver">Silver</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Payment Status</InputLabel>
                <Select
                  name="paymentStatus"
                  value={filterOptions.paymentStatus}
                  onChange={handleFilterChange}
                  label="Payment Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="Start Date"
                type="date"
                name="startDate"
                value={filterOptions.startDate}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="End Date"
                type="date"
                name="endDate"
                value={filterOptions.endDate}
                onChange={handleFilterChange}
                InputLabelProps={{ shrink: true }}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={2} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={resetFilters}
              >
                Reset
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      <Paper sx={{ mb: 3 }}>
        {renderPurchasesTable()}
      </Paper>
      
      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onClose={handleCloseEmailDialog}>
        <DialogTitle>Send Receipt by Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailDialog}>Cancel</Button>
          <Button 
            onClick={handleSendEmail} 
            color="primary" 
            variant="contained"
            disabled={!emailAddress || !emailAddress.includes('@')}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirm Delete Dialog */}
      <Dialog open={confirmDelete.open} onClose={handleCloseConfirmDelete}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the purchase with invoice number "{confirmDelete.purchase?.invoiceNumber}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDelete}>Cancel</Button>
          <Button onClick={handleDeletePurchase} color="error" variant="contained">
            Delete
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

export default Purchases; 