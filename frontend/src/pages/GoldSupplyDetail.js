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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Print,
  LocalShipping,
  Receipt,
  Business,
  Payment
} from '@mui/icons-material';
import api from '../utils/api';
import { getNetworkStatus } from '../utils/networkStatus';
import { formatDate, formatCurrency, formatWeight } from '../utils/formatters';

const GoldSupplyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State
  const [supply, setSupply] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentDate: new Date(),
    reference: '',
    notes: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Fetch gold supply data
  const fetchSupply = async () => {
    setLoading(true);
    try {
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (online) {
        const response = await api.get(`/api/gold-supplies/${id}`);
        if (response.data.success) {
          setSupply(response.data.data);
        }
      } else {
        setSnackbar({
          open: true,
          message: 'You are offline. Some features may be limited.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error fetching gold supply details:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to load supply details'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchSupply();
  }, [id]);
  
  // Handle go back
  const handleGoBack = () => {
    navigate(-1);
  };
  
  // Navigate to supplier details
  const handleViewSupplier = () => {
    if (supply && supply.supplier) {
      navigate(`/suppliers/${supply.supplier._id}`);
    }
  };
  
  // Open payment dialog
  const handleOpenPaymentDialog = () => {
    setPaymentDialog(true);
    setPaymentData({
      ...paymentData,
      amount: supply.balanceDue
    });
  };
  
  // Close payment dialog
  const handleClosePaymentDialog = () => {
    setPaymentDialog(false);
  };
  
  // Handle payment input change
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData({
      ...paymentData,
      [name]: value
    });
  };
  
  // Process payment
  const handleProcessPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid payment amount',
        severity: 'error'
      });
      return;
    }
    
    setProcessingPayment(true);
    
    try {
      const response = await api.post(`/api/gold-supplies/${id}/payment`, paymentData);
      
      if (response.data.success) {
        setSupply(response.data.data);
        setSnackbar({
          open: true,
          message: 'Payment processed successfully',
          severity: 'success'
        });
        handleClosePaymentDialog();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to process payment'}`,
        severity: 'error'
      });
    } finally {
      setProcessingPayment(false);
    }
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
  
  // Print invoice
  const handlePrint = () => {
    window.print();
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!supply) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Gold Supply not found
        </Typography>
        <Button startIcon={<ArrowBack />} onClick={handleGoBack} sx={{ mt: 2 }}>
          Back
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
            <LocalShipping sx={{ mr: 1, color: 'primary.main' }} />
            Gold Supply Details
            {supply.invoiceNumber && (
              <Typography variant="subtitle1" sx={{ ml: 2 }}>
                Invoice: {supply.invoiceNumber}
              </Typography>
            )}
          </Typography>
        </Box>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<Print />}
            onClick={handlePrint}
            sx={{ mr: 1 }}
          >
            Print
          </Button>
          
          {supply.balanceDue > 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Payment />}
              onClick={handleOpenPaymentDialog}
              disabled={isOffline}
            >
              Make Payment
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Supply Details */}
      <Grid container spacing={3} className="print-content">
        {/* Basic Details */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Supply Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Supply Date
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(supply.supplyDate)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Invoice Number
                  </Typography>
                  <Typography variant="body1">
                    {supply.invoiceNumber || 'N/A'}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Supplier
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body1" sx={{ mr: 1 }}>
                      {supply.supplier?.name || 'Unknown'}
                    </Typography>
                    <Button 
                      size="small" 
                      startIcon={<Business />}
                      onClick={handleViewSupplier}
                    >
                      View
                    </Button>
                  </Box>
                </Grid>
                
                {supply.supplier?.phone && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">
                      {supply.supplier.phone}
                    </Typography>
                  </Grid>
                )}
                
                {supply.supplier?.email && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body1">
                      {supply.supplier.email}
                    </Typography>
                  </Grid>
                )}
                
                {supply.notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Notes
                    </Typography>
                    <Typography variant="body1">
                      {supply.notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Payment Details */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Payment Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(supply.totalAmount)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Amount Paid
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {formatCurrency(supply.amountPaid)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Balance Due
                  </Typography>
                  <Typography variant="h6" color={supply.balanceDue > 0 ? 'error.main' : 'success.main'}>
                    {formatCurrency(supply.balanceDue)}
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Status
                  </Typography>
                  <Chip 
                    label={supply.paymentStatus} 
                    color={getStatusColor(supply.paymentStatus)}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                </Grid>
                
                {supply.paymentDueDate && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Payment Due Date
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(supply.paymentDueDate)}
                    </Typography>
                  </Grid>
                )}
              </Grid>
              
              {supply.balanceDue > 0 && (
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<Payment />}
                  onClick={handleOpenPaymentDialog}
                  disabled={isOffline}
                  sx={{ mt: 2 }}
                >
                  Make Payment
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
        
        {/* Supply Items */}
        <Grid item xs={12}>
          <Paper>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Supply Items
              </Typography>
              <Typography variant="subtitle1">
                {supply.items?.length || 0} items
              </Typography>
            </Box>
            <Divider />
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Metal / Purity</TableCell>
                    <TableCell align="right">Weight</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Rate</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {supply.items?.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        {item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}
                      </TableCell>
                      <TableCell>
                        {item.description || '-'}
                        {item.hasStones && item.stoneDetails && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Stones: {item.stoneDetails}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.metalType.charAt(0).toUpperCase() + item.metalType.slice(1)} / {item.purity}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          Net: {formatWeight(item.netWeight, item.weightUnit)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Gross: {formatWeight(item.grossWeight, item.weightUnit)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.quantity}
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.ratePerGram)} / g
                      </TableCell>
                      <TableCell align="right">
                        {formatCurrency(item.totalAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={handleClosePaymentDialog}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Payment sx={{ mr: 1, color: 'primary.main' }} />
            Process Payment
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Amount"
              name="amount"
              type="number"
              value={paymentData.amount}
              onChange={handlePaymentChange}
              InputProps={{
                startAdornment: <InputAdornment position="start">₹</InputAdornment>,
              }}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Payment Method</InputLabel>
              <Select
                name="paymentMethod"
                value={paymentData.paymentMethod}
                label="Payment Method"
                onChange={handlePaymentChange}
              >
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
                <MenuItem value="upi">UPI</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              label="Reference / Transaction ID"
              name="reference"
              value={paymentData.reference}
              onChange={handlePaymentChange}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Notes"
              name="notes"
              value={paymentData.notes}
              onChange={handlePaymentChange}
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleProcessPayment}
            disabled={processingPayment}
            startIcon={processingPayment && <CircularProgress size={20} color="inherit" />}
          >
            {processingPayment ? 'Processing...' : 'Process Payment'}
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

export default GoldSupplyDetail; 