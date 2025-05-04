import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Snackbar,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  ArrowBack,
  Payment,
  CheckCircle,
  Cancel,
  CreditCard,
  Person,
  CalendarToday,
  Timeline,
  Edit,
  Done,
  Block
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import { getNetworkStatus } from '../utils/networkStatus';

const SavingsSchemeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State
  const [scheme, setScheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depositDialog, setDepositDialog] = useState({
    open: false,
    month: null
  });
  const [depositForm, setDepositForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    paymentReference: '',
    notes: ''
  });
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelForm, setCancelForm] = useState({
    cancellationReason: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Fetch scheme details
  const fetchSchemeDetails = async () => {
    setLoading(true);
    try {
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (online) {
        const response = await api.get(`/api/savings-schemes/${id}`);
        if (response.data.success) {
          setScheme(response.data.data);
        }
      } else {
        setSnackbar({
          open: true,
          message: 'You are offline. Some features may be limited.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error fetching scheme details:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to load scheme details'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchSchemeDetails();
  }, [id]);
  
  // Get remaining months for deposits
  const getRemainingMonths = () => {
    if (!scheme || !scheme.deposits) return Array.from({length: 11}, (_, i) => i + 1);
    
    const depositedMonths = scheme.deposits.map(deposit => deposit.month);
    return Array.from({length: 11}, (_, i) => i + 1).filter(month => !depositedMonths.includes(month));
  };
  
  // Get deposit for a specific month
  const getDepositForMonth = (month) => {
    if (!scheme || !scheme.deposits) return null;
    return scheme.deposits.find(deposit => deposit.month === month);
  };
  
  // Open deposit dialog for a month
  const handleOpenDepositDialog = (month) => {
    // Set default amount to the scheme's monthly amount
    setDepositForm({
      amount: scheme.monthlyAmount.toString(),
      paymentMethod: 'cash',
      paymentReference: '',
      notes: ''
    });
    
    setDepositDialog({
      open: true,
      month
    });
  };
  
  // Close deposit dialog
  const handleCloseDepositDialog = () => {
    setDepositDialog({
      open: false,
      month: null
    });
  };
  
  // Handle form change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setDepositForm({
      ...depositForm,
      [name]: value
    });
  };
  
  // Submit deposit
  const handleSubmitDeposit = async () => {
    if (!depositDialog.month) return;
    
    // Validate form
    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid amount',
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
          message: 'Cannot add deposit while offline',
          severity: 'error'
        });
        setIsSubmitting(false);
        return;
      }
      
      // Prepare data
      const depositData = {
        month: depositDialog.month,
        amount: parseFloat(depositForm.amount),
        paymentMethod: depositForm.paymentMethod,
        paymentReference: depositForm.paymentReference,
        notes: depositForm.notes
      };
      
      // Submit the deposit
      const response = await api.post(`/api/savings-schemes/${id}/deposit`, depositData);
      
      if (response.data.success) {
        setScheme(response.data.data);
        setSnackbar({
          open: true,
          message: `Deposit for Month ${depositDialog.month} recorded successfully`,
          severity: 'success'
        });
        
        handleCloseDepositDialog();
      }
    } catch (error) {
      console.error('Error adding deposit:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to add deposit'}`,
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };
  
  // Handle close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  // Get scheme status chip
  const getStatusChip = (status) => {
    switch (status) {
      case 'active':
        return <Chip label="Active" color="primary" size="small" />;
      case 'completed':
        return <Chip label="Completed" color="success" size="small" />;
      case 'cancelled':
        return <Chip label="Cancelled" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };
  
  // Calculate progress
  const calculateProgress = () => {
    if (!scheme || !scheme.deposits || !scheme.deposits.length) return 0;
    return Math.min(100, (scheme.deposits.length / 11) * 100);
  };
  
  // Get month status
  const getMonthStatus = (month) => {
    const deposit = getDepositForMonth(month);
    if (deposit) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CheckCircle color="success" sx={{ mr: 1 }} />
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
              Paid on {formatDate(deposit.depositDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatCurrency(deposit.amount)} via {deposit.paymentMethod}
            </Typography>
          </Box>
        </Box>
      );
    } else {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <CreditCard color="action" sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            Payment Pending
          </Typography>
        </Box>
      );
    }
  };
  
  // Is month paid
  const isMonthPaid = (month) => {
    return !!getDepositForMonth(month);
  };
  
  // Handle form change for cancel form
  const handleCancelFormChange = (e) => {
    const { name, value } = e.target;
    setCancelForm({
      ...cancelForm,
      [name]: value
    });
  };
  
  // Submit cancel request
  const handleCancelScheme = async () => {
    // Validate form
    if (!cancelForm.cancellationReason) {
      setSnackbar({
        open: true,
        message: 'Please provide a reason for cancellation',
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
          message: 'Cannot cancel scheme while offline',
          severity: 'error'
        });
        setIsSubmitting(false);
        return;
      }
      
      console.log('Attempting to cancel scheme with URL:', `/api/savings-schemes/${id}/cancel`);
      console.log('Payload:', cancelForm);
      
      // Submit the cancel request
      const response = await api.put(`/api/savings-schemes/${id}`, {
        status: 'cancelled',
        cancellationReason: cancelForm.cancellationReason,
        notes: cancelForm.notes
      });
      
      if (response.data.success) {
        setScheme(response.data.data);
        setSnackbar({
          open: true,
          message: 'Scheme cancelled successfully',
          severity: 'success'
        });
        
        setCancelDialog(false);
      }
    } catch (error) {
      console.error('Error cancelling scheme:', error);
      console.error('Error details:', error.response?.data || 'No response data');
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to cancel scheme'}`,
        severity: 'error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!scheme) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" color="error">
          Scheme not found or error loading details
        </Typography>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/savings-schemes')}
          sx={{ mt: 2 }}
        >
          Back to Schemes
        </Button>
      </Box>
    );
  }
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={() => navigate('/savings-schemes')}
        >
          Back to Schemes
        </Button>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {scheme.status === 'active' && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Block />}
              onClick={() => setCancelDialog(true)}
              sx={{ mr: 2 }}
              disabled={isOffline}
            >
              Stop Scheme
            </Button>
          )}
          {getStatusChip(scheme.status)}
        </Box>
      </Box>
      
      {/* Scheme Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ display: 'flex', alignItems: 'center' }}>
            <CreditCard sx={{ mr: 1, color: 'primary.main' }} />
            Scheme {scheme.schemeId}
          </Typography>
          
          <Chip 
            label={`Created on ${formatDate(scheme.createdAt)}`} 
            variant="outlined" 
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Monthly Amount
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(scheme.monthlyAmount)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Expected
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(scheme.totalExpectedAmount)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Start Date
                </Typography>
                <Typography variant="body1">
                  {formatDate(scheme.startDate)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Completion Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Box sx={{ width: '70%', mr: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={calculateProgress()}
                      color={scheme.status === 'completed' ? 'success' : 'primary'}
                      sx={{ height: 8, borderRadius: 5 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2">
                      {scheme.deposits?.length || 0}/11 months paid
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Customer Information
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Person sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {scheme.customer?.name || 'Unknown Customer'}
              </Typography>
            </Box>
            
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  Phone: {scheme.customer?.phone || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  Email: {scheme.customer?.email || 'N/A'}
                </Typography>
              </Grid>
              {scheme.customer?.address && (
                <Grid item xs={12}>
                  <Typography variant="body2">
                    Address: {scheme.customer.address}, {scheme.customer.city} {scheme.customer.pincode}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: scheme.status === 'completed' ? '#f1f8e9' : '#f5f5f5', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Timeline sx={{ mr: 1, color: scheme.status === 'completed' ? 'success.main' : 'primary.main' }} />
                  Payment Summary
                </Typography>
                
                <Divider sx={{ my: 1 }} />
                
                <Grid container spacing={1} sx={{ mt: 1 }}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Deposited:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right">
                      {formatCurrency(scheme.deposits?.reduce((sum, deposit) => sum + deposit.amount, 0) || 0)}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Remaining Deposits:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right">
                      {11 - (scheme.deposits?.length || 0)} months
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Expected:
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body1" align="right">
                      {formatCurrency(scheme.totalExpectedAmount)}
                    </Typography>
                  </Grid>
                </Grid>
                
                {scheme.status === 'completed' && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: '#e8f5e9', borderRadius: 1 }}>
                    <Typography variant="subtitle2" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                      <CheckCircle sx={{ mr: 1, fontSize: 16 }} />
                      All payments completed
                    </Typography>
                    
                    {!scheme.redemption?.isRedeemed ? (
                      <Typography variant="caption" color="text.secondary">
                        Customer can now redeem for gold
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Redeemed on {formatDate(scheme.redemption.redemptionDate)}
                      </Typography>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Monthly Payments Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Monthly Payments
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment Details</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({length: 11}, (_, i) => i + 1).map(month => (
                <TableRow key={month} hover sx={{ bgcolor: isMonthPaid(month) ? 'rgba(0, 200, 83, 0.04)' : 'inherit' }}>
                  <TableCell>
                    <Typography variant="body1">
                      Month {month}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {isMonthPaid(month) ? (
                      <Chip label="Paid" color="success" size="small" icon={<Done />} />
                    ) : (
                      <Chip label="Pending" variant="outlined" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{getMonthStatus(month)}</TableCell>
                  <TableCell align="right">
                    {!isMonthPaid(month) && scheme.status === 'active' && (
                      <Tooltip title="Record Payment">
                        <IconButton 
                          color="primary" 
                          onClick={() => handleOpenDepositDialog(month)}
                          disabled={isOffline}
                        >
                          <Payment />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      
      {/* Deposit Dialog */}
      <Dialog open={depositDialog.open} onClose={handleCloseDepositDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Record Payment for Month {depositDialog.month}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount"
                name="amount"
                type="number"
                value={depositForm.amount}
                onChange={handleFormChange}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                variant="outlined"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required variant="outlined">
                <InputLabel>Payment Method</InputLabel>
                <Select
                  name="paymentMethod"
                  value={depositForm.paymentMethod}
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
                value={depositForm.paymentReference}
                onChange={handleFormChange}
                variant="outlined"
                placeholder="Transaction ID, UPI ID, etc."
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                multiline
                rows={2}
                value={depositForm.notes}
                onChange={handleFormChange}
                variant="outlined"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDepositDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleSubmitDeposit}
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={24} /> : 'Record Payment'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Cancel Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'error.light', color: 'error.contrastText' }}>
          Stop Savings Scheme
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 2, p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Warning:</strong> Stopping a scheme will mark it as cancelled. The customer will not be able to continue with payments or redeem gold at the end of the term.
            </Typography>
          </Box>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Reason for stopping scheme"
                name="cancellationReason"
                value={cancelForm.cancellationReason}
                onChange={handleCancelFormChange}
                required
                variant="outlined"
                placeholder="Customer request, payment issues, etc."
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Additional Notes"
                name="notes"
                multiline
                rows={3}
                value={cancelForm.notes}
                onChange={handleCancelFormChange}
                variant="outlined"
                placeholder="Any additional information about the cancellation"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setCancelDialog(false)}>
            Keep Active
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleCancelScheme}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <Block />}
          >
            Stop Scheme
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar */}
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

export default SavingsSchemeDetail; 