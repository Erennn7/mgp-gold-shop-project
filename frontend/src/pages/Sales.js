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

const Sales = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const customerId = queryParams.get('customer');
  
  // State
  const [sales, setSales] = useState([]);
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
  const [selectedSale, setSelectedSale] = useState(null);
  const [emailAddress, setEmailAddress] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    sale: null
  });

  // Get database context
  const { db, isOnline } = useDatabase();

  // Effect to fetch sales on mount and when navigating back to this page
  useEffect(() => {
    fetchSales();
  }, [customerId, location]);

  // Function to fetch sales from API or IndexedDB
  const fetchSales = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      if (online) {
        // If online, fetch from API
        let url = '/api/sales';
        if (customerId) {
          url += `?customer=${customerId}`;
        }
        const response = await api.get(url);
        if (response.data.success) {
          setSales(response.data.data);
        }
      } else {
        // If offline, fetch from IndexedDB
        if (db) {
          if (customerId) {
            const cachedSales = await db.sales
              .where('customer')
              .equals(customerId)
              .toArray();
            setSales(cachedSales);
          } else {
            const cachedSales = await db.sales.toArray();
            setSales(cachedSales);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching sales:', error);
      // Try to get data from IndexedDB as a fallback
      if (db) {
        if (customerId) {
          const cachedSales = await db.sales
            .where('customer')
            .equals(customerId)
            .toArray();
          setSales(cachedSales);
        } else {
          const cachedSales = await db.sales.toArray();
          setSales(cachedSales);
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

  // Filter sales based on search term and filter options
  const filteredSales = sales.filter(sale => {
    // Search term filter
    const searchFields = `${sale.invoiceNumber} ${sale.customer.name || 'Unknown'}`.toLowerCase();
    if (!searchFields.includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Metal type filter
    if (filterOptions.metalType && !sale.items.some(item => item.metalType === filterOptions.metalType)) {
      return false;
    }
    
    // Payment status filter
    if (filterOptions.paymentStatus && sale.paymentStatus !== filterOptions.paymentStatus) {
      return false;
    }
    
    // Date range filter
    if (filterOptions.startDate) {
      const startDate = new Date(filterOptions.startDate);
      const saleDate = new Date(sale.createdAt);
      if (saleDate < startDate) {
        return false;
      }
    }
    
    if (filterOptions.endDate) {
      const endDate = new Date(filterOptions.endDate);
      endDate.setHours(23, 59, 59); // End of the day
      const saleDate = new Date(sale.createdAt);
      if (saleDate > endDate) {
        return false;
      }
    }
    
    return true;
  });

  // View sale details
  const handleViewSale = (sale) => {
    navigate(`/sales/${sale._id}`);
  };

  // Navigate to create new sale
  const handleCreateSale = () => {
    navigate('/sales/new');
  };

  // Open email dialog
  const handleOpenEmailDialog = (sale) => {
    setSelectedSale(sale);
    setEmailAddress(sale.customer.email || '');
    setShowEmailDialog(true);
  };

  // Close email dialog
  const handleCloseEmailDialog = () => {
    setShowEmailDialog(false);
    setSelectedSale(null);
    setEmailAddress('');
  };

  // Send invoice via email
  const handleSendEmail = async () => {
    if (!selectedSale || !emailAddress) {
      return;
    }
    
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

      const response = await api.post(`/api/sales/${selectedSale._id}/email-invoice`, { 
        email: emailAddress 
      });
      
      if (response.data.success) {
        // Update the sale to mark email as sent
        const updatedSale = {
          ...selectedSale,
          receiptSent: true,
          receiptSentTo: emailAddress
        };
        
        // Update API only if online
        await api.put(`/api/sales/${selectedSale._id}`, {
          receiptSent: true,
          receiptSentTo: emailAddress
        });
        
        // Update local state
        setSales(prevSales => 
          prevSales.map(sale => 
            sale._id === selectedSale._id ? updatedSale : sale
          )
        );
        
        // Update IndexedDB
        if (db) {
          try {
            await db.sales.update(selectedSale._id, {
              receiptSent: true,
              receiptSentTo: emailAddress
            });
          } catch (error) {
            console.error('Error updating sale in IndexedDB:', error);
          }
        }
        
        setSnackbar({
          open: true,
          message: 'Invoice sent successfully',
          severity: 'success'
        });
      }
      
      handleCloseEmailDialog();
    } catch (error) {
      console.error('Error sending invoice email:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to send invoice'}`,
        severity: 'error'
      });
      
      handleCloseEmailDialog();
    }
  };

  // Confirm delete
  const handleConfirmDelete = (sale) => {
    setConfirmDelete({
      open: true,
      sale
    });
  };

  // Close delete confirmation
  const handleCloseConfirmDelete = () => {
    setConfirmDelete({
      open: false,
      sale: null
    });
  };

  // Delete sale
  const handleDeleteSale = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot delete sale while offline',
          severity: 'error'
        });
        handleCloseConfirmDelete();
        return;
      }

      const response = await api.delete(`/api/sales/${confirmDelete.sale._id}`);
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Sale deleted successfully',
          severity: 'success'
        });
        
        // Update local state
        setSales(prevSales => 
          prevSales.filter(sale => sale._id !== confirmDelete.sale._id)
        );
      }
      
      handleCloseConfirmDelete();
    } catch (error) {
      console.error('Error deleting sale:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to delete sale'}`,
        severity: 'error'
      });
      
      handleCloseConfirmDelete();
    }
  };

  // Print receipt
  const handlePrintReceipt = async (sale) => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot generate receipt while offline',
          severity: 'warning'
        });
        return;
      }

      const response = await api.get(`/api/sales/${sale._id}/invoice`);
      
      if (response.data.success) {
        // Open the PDF in a new window
        const pdfUrl = response.data.data.downloadUrl;
        const fullUrl = `${window.location.origin}${pdfUrl}`;
        
        // Open in a new window
        const newWindow = window.open(fullUrl, '_blank');
        
        // If popup blocked, provide direct link
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          setSnackbar({
            open: true,
            message: 'Popup blocked. Please allow popups or use direct link.',
            severity: 'warning'
          });
        }
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to generate receipt'}`,
        severity: 'error'
      });
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Format total amount
  const getTotalAmount = (sale) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(sale.totalAmount);
  };

  // Render the sales table
  const renderSalesTable = () => {
    if (filteredSales.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            No sales found.
          </Typography>
        </Box>
      );
    }
    
    return (
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Invoice #</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSales.map((sale) => (
              <TableRow key={sale._id || sale.id}>
                <TableCell>{sale.invoiceNumber}</TableCell>
                <TableCell>{sale.customer.name || 'Unknown'}</TableCell>
                <TableCell>{format(new Date(sale.createdAt), 'dd/MM/yyyy')}</TableCell>
                <TableCell>
                  {sale.items.length} items
                  <Box sx={{ mt: 1 }}>
                    {sale.items.map((item, idx) => (
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
                <TableCell>{getTotalAmount(sale)}</TableCell>
                <TableCell>
                  <Chip 
                    label={sale.paymentStatus.charAt(0).toUpperCase() + sale.paymentStatus.slice(1)} 
                    color={
                      sale.paymentStatus === 'completed' ? 'success' :
                      sale.paymentStatus === 'pending' ? 'error' : 'warning'
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="View Details">
                    <IconButton 
                      size="small" 
                      color="primary"
                      onClick={() => handleViewSale(sale)}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Print Receipt">
                    <IconButton 
                      size="small" 
                      color="info"
                      onClick={() => handlePrintReceipt(sale)}
                    >
                      <Print fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Email Receipt">
                    <IconButton 
                      size="small" 
                      color="success"
                      onClick={() => handleOpenEmailDialog(sale)}
                      disabled={!sale.customer.email}
                    >
                      <EmailIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton 
                      size="small" 
                      color="error"
                      onClick={() => handleConfirmDelete(sale)}
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
    fetchSales();
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">
          {customerId ? 'Customer Sales' : 'Sales'}
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
            label="Search Sales"
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
            onClick={handleCreateSale}
          >
            New Sale
          </Button>
        </Grid>
      </Grid>
      
      {showFilters && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth variant="outlined">
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
                <FormControl fullWidth variant="outlined">
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
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  name="startDate"
                  label="From Date"
                  type="date"
                  value={filterOptions.startDate}
                  onChange={handleFilterChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  name="endDate"
                  label="To Date"
                  type="date"
                  value={filterOptions.endDate}
                  onChange={handleFilterChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  onClick={resetFilters}
                >
                  Reset Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : (
        renderSalesTable()
      )}
      
      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onClose={handleCloseEmailDialog}>
        <DialogTitle>Send Invoice via Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailDialog}>Cancel</Button>
          <Button onClick={handleSendEmail} variant="contained" color="primary">
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDelete.open}
        onClose={handleCloseConfirmDelete}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this sale? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseConfirmDelete}>Cancel</Button>
          <Button onClick={handleDeleteSale} color="error" variant="contained">
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Sales; 