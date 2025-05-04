import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Chip,
  IconButton,
  CircularProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Edit,
  ArrowBack,
  Phone,
  Email,
  LocationOn,
  Business,
  Receipt,
  LocalShipping,
  Visibility
} from '@mui/icons-material';
import api from '../utils/api';
import { getNetworkStatus } from '../utils/networkStatus';
import { formatDate, formatCurrency } from '../utils/formatters';

const SupplierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State
  const [supplier, setSupplier] = useState(null);
  const [supplies, setSupplies] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Fetch supplier data
  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (online) {
        const response = await api.get(`/api/suppliers/${id}`);
        if (response.data.success) {
          setSupplier(response.data.data);
        }
        
        // Fetch associated gold supplies
        const suppliesResponse = await api.get(`/api/gold-supplies?supplier=${id}`);
        if (suppliesResponse.data.success) {
          setSupplies(suppliesResponse.data.data);
        }
      } else {
        setSnackbar({
          open: true,
          message: 'You are offline. Some features may be limited.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error fetching supplier details:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to load supplier details'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchSupplier();
  }, [id]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle edit supplier
  const handleEditSupplier = () => {
    navigate(`/suppliers/edit/${id}`);
  };
  
  // Handle go back
  const handleGoBack = () => {
    navigate('/suppliers');
  };
  
  // View supply details
  const handleViewSupply = (supplyId) => {
    navigate(`/gold-supplies/${supplyId}`);
  };
  
  // Add new gold supply from supplier
  const handleAddSupply = () => {
    navigate('/gold-supplies/new', { state: { supplierId: id } });
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Get payment status chip color
  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'pending':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Calculate supplier statistics
  const calculateStats = () => {
    if (!supplies || supplies.length === 0) {
      return {
        totalSupplies: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalDue: 0
      };
    }
    
    return supplies.reduce((stats, supply) => {
      stats.totalSupplies++;
      stats.totalAmount += supply.totalAmount || 0;
      stats.totalPaid += supply.amountPaid || 0;
      stats.totalDue += supply.balanceDue || 0;
      return stats;
    }, {
      totalSupplies: 0,
      totalAmount: 0,
      totalPaid: 0,
      totalDue: 0
    });
  };
  
  const stats = calculateStats();
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!supplier) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Supplier not found
        </Typography>
        <Button startIcon={<ArrowBack />} onClick={handleGoBack} sx={{ mt: 2 }}>
          Back to Suppliers
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={handleGoBack} sx={{ mr: 1 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
            <Business sx={{ mr: 1, color: 'primary.main' }} />
            {supplier.name}
          </Typography>
        </Box>
        
        <Box>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Edit />}
            onClick={handleEditSupplier}
            disabled={isOffline}
            sx={{ mr: 1 }}
          >
            Edit
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<LocalShipping />}
            onClick={handleAddSupply}
            disabled={isOffline}
          >
            Add Supply
          </Button>
        </Box>
      </Box>
      
      {/* Supplier Details */}
      <Grid container spacing={3}>
        {/* Basic Details Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Contact Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List disablePadding>
                {supplier.phone && (
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <Phone sx={{ mr: 2, color: 'primary.main' }} />
                    <ListItemText primary={supplier.phone} secondary="Phone" />
                  </ListItem>
                )}
                
                {supplier.email && (
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <Email sx={{ mr: 2, color: 'primary.main' }} />
                    <ListItemText primary={supplier.email} secondary="Email" />
                  </ListItem>
                )}
                
                {(supplier.address || supplier.city || supplier.state) && (
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <LocationOn sx={{ mr: 2, color: 'primary.main' }} />
                    <ListItemText 
                      primary={`${supplier.address || ''} ${supplier.city || ''} ${supplier.state || ''} ${supplier.pincode || ''}`} 
                      secondary="Address" 
                    />
                  </ListItem>
                )}
                
                {supplier.gstin && (
                  <ListItem disablePadding sx={{ py: 1 }}>
                    <Receipt sx={{ mr: 2, color: 'primary.main' }} />
                    <ListItemText primary={supplier.gstin} secondary="GSTIN" />
                  </ListItem>
                )}
              </List>
              
              {supplier.notes && (
                <>
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {supplier.notes}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Statistics */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Supply Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Supplies
                  </Typography>
                  <Typography variant="h6">
                    {stats.totalSupplies}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(stats.totalAmount)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Paid
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(stats.totalPaid)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Balance Due
                  </Typography>
                  <Typography variant="h6" color={stats.totalDue > 0 ? 'error.main' : 'success.main'}>
                    {formatCurrency(stats.totalDue)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Tabs for Supplies */}
        <Grid item xs={12}>
          <Paper sx={{ mt: 2 }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange}
              variant="fullWidth"
            >
              <Tab label="Gold Supplies" />
            </Tabs>
            
            <Box sx={{ p: 2 }}>
              {tabValue === 0 && (
                <>
                  {supplies.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="body1" color="text.secondary">
                        No gold supplies found for this supplier
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<LocalShipping />}
                        onClick={handleAddSupply}
                        disabled={isOffline}
                        sx={{ mt: 2 }}
                      >
                        Add First Supply
                      </Button>
                    </Box>
                  ) : (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Invoice</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell>Items</TableCell>
                            <TableCell align="right">Total Amount</TableCell>
                            <TableCell>Payment Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {supplies.map((supply) => (
                            <TableRow key={supply._id} hover>
                              <TableCell>
                                {supply.invoiceNumber || 'N/A'}
                              </TableCell>
                              <TableCell>
                                {formatDate(supply.supplyDate)}
                              </TableCell>
                              <TableCell>
                                {supply.items?.length || 0} items
                              </TableCell>
                              <TableCell align="right">
                                {formatCurrency(supply.totalAmount)}
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={supply.paymentStatus} 
                                  color={getStatusColor(supply.paymentStatus)}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Tooltip title="View Details">
                                  <IconButton 
                                    color="primary" 
                                    size="small"
                                    onClick={() => handleViewSupply(supply._id)}
                                  >
                                    <Visibility />
                                  </IconButton>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
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

export default SupplierDetail; 