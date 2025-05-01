import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  CircularProgress,
  Chip,
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
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  Add,
  Check,
  Close,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useDatabase } from '../store/DatabaseContext';
import { useForm, Controller } from 'react-hook-form';

const LoanDetail = () => {
  const { id } = useParams();
  const theme = useTheme();
  const navigate = useNavigate();
  const { db, isOnline } = useDatabase();
  
  const [loan, setLoan] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [payments, setPayments] = useState([]);
  
  const { control, handleSubmit, reset, formState: { errors }, setValue } = useForm({
    defaultValues: {
      amount: '',
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentType: 'cash',
      notes: '',
    }
  });
  
  // Fetch loan details
  useEffect(() => {
    const fetchLoanDetails = async () => {
      try {
        setLoading(true);
        let loanData;
        
        if (isOnline) {
          // Fetch from API
          const response = await fetch(`/api/loans/${id}`);
          if (!response.ok) throw new Error('Failed to fetch loan');
          loanData = await response.json();
        } else {
          // Fetch from IndexedDB
          loanData = await db.loans.get(parseInt(id));
          if (!loanData) throw new Error('Loan not found in offline storage');
        }
        
        setLoan(loanData);
        
        // Fetch customer details
        let customerData;
        if (isOnline) {
          const custResponse = await fetch(`/api/customers/${loanData.customerId}`);
          if (custResponse.ok) {
            customerData = await custResponse.json();
          }
        } else {
          customerData = await db.customers.get(parseInt(loanData.customerId));
        }
        
        setCustomer(customerData);
        
        // Fetch loan payments
        let paymentsData;
        if (isOnline) {
          const paymentsResponse = await fetch(`/api/loans/${id}/payments`);
          if (paymentsResponse.ok) {
            paymentsData = await paymentsResponse.json();
          } else {
            paymentsData = [];
          }
        } else {
          paymentsData = await db.loanPayments
            .where('loanId')
            .equals(parseInt(id))
            .toArray();
        }
        
        setPayments(paymentsData || []);
      } catch (error) {
        console.error('Error fetching loan details:', error);
        setSnackbar({
          open: true,
          message: `Error loading loan details: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchLoanDetails();
  }, [id, db, isOnline]);
  
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  const handleAddPayment = async (data) => {
    try {
      const paymentData = {
        ...data,
        loanId: parseInt(id),
        paymentDate: new Date(data.paymentDate).toISOString(),
        amount: parseFloat(data.amount),
        createdAt: new Date().toISOString(),
      };
      
      if (isOnline) {
        const response = await fetch(`/api/loans/${id}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentData),
        });
        
        if (!response.ok) throw new Error('Failed to add payment');
        
        const result = await response.json();
        // Add payment to the payments array first
        const newPayments = [...payments, result];
        setPayments(newPayments);
        
        // Recalculate the remaining amount after adding the payment
        // This will take into account the compound interest
        const updatedLoan = { 
          ...loan, 
          payments: newPayments,
          totalPaid: newPayments.reduce((total, payment) => total + payment.amount, 0)
        };
        
        setLoan(updatedLoan);
      } else {
        // Add to IndexedDB and sync queue
        const newPaymentId = await db.loanPayments.add(paymentData);
        
        // Add to sync queue
        await db.syncQueue.add({
          type: 'create',
          endpoint: `/api/loans/${id}/payments`,
          data: paymentData,
          objectId: newPaymentId,
          objectStore: 'loanPayments',
          createdAt: new Date().toISOString(),
        });
        
        // Add payment to the payments array first
        const newPayments = [...payments, { ...paymentData, id: newPaymentId }];
        setPayments(newPayments);
        
        // Recalculate the remaining amount after adding the payment
        const updatedLoan = { 
          ...loan, 
          payments: newPayments,
          totalPaid: newPayments.reduce((total, payment) => total + payment.amount, 0)
        };
        
        setLoan(updatedLoan);
        
        // Update the loan in IndexedDB
        await db.loans.update(parseInt(id), { 
          payments: newPayments,
          totalPaid: updatedLoan.totalPaid 
        });
        
        // Add to sync queue
        await db.syncQueue.add({
          type: 'update',
          endpoint: `/api/loans/${id}`,
          data: { 
            payments: newPayments,
            totalPaid: updatedLoan.totalPaid 
          },
          objectId: parseInt(id),
          objectStore: 'loans',
          createdAt: new Date().toISOString(),
        });
      }
      
      setOpenPaymentDialog(false);
      reset();
      
      setSnackbar({
        open: true,
        message: 'Payment added successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error adding payment:', error);
      setSnackbar({
        open: true,
        message: `Error adding payment: ${error.message}`,
        severity: 'error',
      });
    }
  };
  
  const handleDeleteLoan = async () => {
    try {
      if (isOnline) {
        const response = await fetch(`/api/loans/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Failed to delete loan');
      } else {
        // Delete from IndexedDB and add to sync queue
        await db.loans.delete(parseInt(id));
        
        // Add to sync queue
        await db.syncQueue.add({
          type: 'delete',
          endpoint: `/api/loans/${id}`,
          objectId: parseInt(id),
          objectStore: 'loans',
          createdAt: new Date().toISOString(),
        });
      }
      
      navigate('/loans');
      setSnackbar({
        open: true,
        message: 'Loan deleted successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error deleting loan:', error);
      setSnackbar({
        open: true,
        message: `Error deleting loan: ${error.message}`,
        severity: 'error',
      });
    }
  };
  
  const calculateTotalPaid = () => {
    return payments.reduce((total, payment) => total + payment.amount, 0);
  };
  
  // Calculate remaining amount with compound interest
  const calculateRemainingAmount = () => {
    if (!loan) return 0;
    
    const principal = loan.principalAmount;
    const totalPaid = calculateTotalPaid();
    const monthlyRate = loan.interestRate / 100;
    
    // Calculate months elapsed since start date (no due date limit)
    const start = new Date(loan.startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    
    // Add partial month calculation (days/30)
    const days = now.getDate() - start.getDate();
    const partialMonth = days / 30;
    const totalMonths = months + (days >= 0 ? partialMonth : 0);
    
    // Calculate compound interest: A = P(1 + r)^t
    const compoundAmount = principal * Math.pow(1 + monthlyRate, Math.max(totalMonths, 0));
    
    // Return total balance (compound amount minus payments)
    return Math.max(0, compoundAmount - totalPaid);
  };
  
  // Calculate accumulated interest
  const calculateAccumulatedInterest = () => {
    if (!loan) return 0;
    
    const principal = loan.principalAmount;
    const monthlyRate = loan.interestRate / 100;
    
    // Calculate months elapsed (no due date limit)
    const start = new Date(loan.startDate);
    const now = new Date();
    const months = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
    
    // Add partial month calculation (days/30)
    const days = now.getDate() - start.getDate();
    const partialMonth = days / 30;
    const totalMonths = months + (days >= 0 ? partialMonth : 0);
    
    // Calculate compound amount
    const compoundAmount = principal * Math.pow(1 + monthlyRate, Math.max(totalMonths, 0));
    
    // Interest is the difference between compound amount and principal
    return compoundAmount - principal;
  };
  
  // Handle quick payment options
  const handleQuickPaymentOption = (type) => {
    const remainingAmount = calculateRemainingAmount();
    let paymentAmount = 0;
    
    if (type === 'full') {
      // Full payment - set to exact remaining amount
      paymentAmount = remainingAmount;
    } else if (type === 'interest') {
      // Interest only - pay just the accumulated interest
      paymentAmount = calculateAccumulatedInterest();
    } else if (type === 'half') {
      // Half payment - 50% of remaining
      paymentAmount = remainingAmount / 2;
    }
    
    setValue('amount', paymentAmount.toFixed(2));
  };
  
  // Calculate days past due
  const calculateDaysPastDue = () => {
    if (!loan || !loan.dueDate) return 0;
    
    const dueDate = new Date(loan.dueDate);
    const now = new Date();
    
    if (now <= dueDate) return 0;
    
    // Calculate days difference
    const diffTime = Math.abs(now - dueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };
  
  // Calculate additional interest accrued after due date
  const calculatePostDueInterest = () => {
    if (!loan || !loan.dueDate) return 0;
    
    const dueDate = new Date(loan.dueDate);
    const now = new Date();
    
    if (now <= dueDate) return 0;
    
    const principal = loan.principalAmount;
    const monthlyRate = loan.interestRate / 100;
    
    // Calculate months until due date
    const start = new Date(loan.startDate);
    const monthsUntilDue = (dueDate.getFullYear() - start.getFullYear()) * 12 + 
                          dueDate.getMonth() - start.getMonth();
    
    // Calculate compound amount at due date
    const amountAtDue = principal * Math.pow(1 + monthlyRate, monthsUntilDue);
    
    // Calculate months past due
    const monthsPastDue = (now.getFullYear() - dueDate.getFullYear()) * 12 + 
                        now.getMonth() - dueDate.getMonth();
    
    // Add partial month calculation
    const days = now.getDate() - dueDate.getDate();
    const partialMonth = days / 30;
    const totalMonthsPastDue = monthsPastDue + (days >= 0 ? partialMonth : 0);
    
    // Calculate final compound amount
    const finalAmount = amountAtDue * Math.pow(1 + monthlyRate, totalMonthsPastDue);
    
    // Return only the interest accrued after due date
    return finalAmount - amountAtDue;
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!loan) {
    return (
      <Box p={3}>
        <Typography variant="h5" color="error">
          Loan not found
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/loans')}
          sx={{ mt: 2 }}
        >
          Back to Loans
        </Button>
      </Box>
    );
  }
  
  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBack />} 
          onClick={() => navigate('/loans')}
        >
          Back to Loans
        </Button>
        
        <Box>
          <Button 
            variant="outlined" 
            color="primary" 
            startIcon={<Edit />} 
            onClick={() => navigate(`/loans/edit/${id}`)}
            sx={{ mr: 1 }}
          >
            Edit Loan
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            startIcon={<Delete />} 
            onClick={() => setOpenDeleteDialog(true)}
          >
            Delete
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              Loan Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Loan ID
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {loan.id}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Chip 
                  label={loan.status} 
                  color={loan.status === 'Active' ? 'primary' : 
                         loan.status === 'Completed' ? 'success' : 'default'} 
                  size="small" 
                />
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Loan Amount
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ₹{loan.principalAmount.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Remaining Amount
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ₹{calculateRemainingAmount().toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Accumulated Interest
                </Typography>
                <Typography variant="body1" gutterBottom>
                  ₹{calculateAccumulatedInterest().toLocaleString()}
                </Typography>
              </Grid>

              {/* Display overdue information if loan is past due date */}
              {calculateDaysPastDue() > 0 && (
                <Grid item xs={12}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2, 
                      mt: 2, 
                      mb: 2, 
                      bgcolor: 'error.light', 
                      borderRadius: 1,
                      color: 'error.contrastText'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Loan Overdue: {calculateDaysPastDue()} days past due date
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Scheduled Due Amount:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          ₹{(loan.principalAmount * Math.pow(1 + loan.interestRate/100, (new Date(loan.dueDate).getFullYear() - new Date(loan.startDate).getFullYear()) * 12 + new Date(loan.dueDate).getMonth() - new Date(loan.startDate).getMonth())).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          Additional Interest Since Due Date:
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          ₹{calculatePostDueInterest().toLocaleString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}

              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Interest Rate
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {loan.interestRate}% {loan.interestType}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Loan Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {format(new Date(loan.loanDate), 'dd/MM/yyyy')}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Due Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {loan.dueDate ? format(new Date(loan.dueDate), 'dd/MM/yyyy') : 'Not specified'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Collateral Details
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {loan.collateralDetails || 'No collateral details provided'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">
                  Notes
                </Typography>
                <Typography variant="body1">
                  {loan.notes || 'No notes provided'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Customer Details
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {customer ? (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Name
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {customer.name}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Phone
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {customer.phone || 'Not provided'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {customer.email || 'Not provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {customer.address || 'Not provided'}
                  </Typography>
                </Grid>
              </Grid>
            ) : (
              <Typography variant="body1" color="text.secondary">
                Customer details not available
              </Typography>
            )}
          </Paper>
          
          <Paper elevation={3} sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h5">
                Payment History
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<Add />} 
                onClick={() => setOpenPaymentDialog(true)}
                color="success"
                sx={{ fontWeight: 'bold' }}
              >
                Add Payment
              </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Principal Amount
                  </Typography>
                  <Typography variant="h6">
                    ₹{loan.principalAmount.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="warning.main">
                    Accumulated Interest
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    ₹{calculateAccumulatedInterest().toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle2" color="error.main">
                    Total Amount Due
                  </Typography>
                  <Typography variant="h6" color="error.main" fontWeight="bold">
                    ₹{calculateRemainingAmount().toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle1">
                Total Paid: ₹{calculateTotalPaid().toLocaleString()}
              </Typography>
              <Typography variant="subtitle1">
                Remaining: ₹{calculateRemainingAmount().toLocaleString()}
              </Typography>
            </Box>
            
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Typography variant="subtitle2" color="warning.dark">
                Accrued Interest: ₹{calculateAccumulatedInterest().toLocaleString()}
              </Typography>
            </Box>
            
            {calculateDaysPastDue() > 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                  This loan is overdue by {calculateDaysPastDue()} days
                </Typography>
                <Typography variant="body2" color="error.main">
                  Additional interest accrued after due date: ₹{calculatePostDueInterest().toLocaleString()}
                </Typography>
              </Grid>
            )}
            
            {payments.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.paymentDate), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>{payment.paymentType}</TableCell>
                        <TableCell>{payment.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" align="center" py={2}>
                No payment records found
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Add Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(handleAddPayment)}>
          <DialogTitle>
            <Typography variant="h6" component="div">
              Add Payment
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Loan #{loan.loanNumber || loan.id}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 3, mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Payment Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Principal:
                  </Typography>
                  <Typography variant="body1">
                    ₹{loan.principalAmount.toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Accrued Interest:
                  </Typography>
                  <Typography variant="body1" color="warning.main">
                    ₹{calculateAccumulatedInterest().toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Total Already Paid:
                  </Typography>
                  <Typography variant="body1">
                    ₹{calculateTotalPaid().toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Current Balance Due:
                  </Typography>
                  <Typography variant="body1" fontWeight="bold" color="error.main">
                    ₹{calculateRemainingAmount().toLocaleString()}
                  </Typography>
                </Grid>
                
                {calculateDaysPastDue() > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="error.main" sx={{ mt: 1, mb: 1 }}>
                      This loan is overdue by {calculateDaysPastDue()} days
                    </Typography>
                    <Typography variant="body2" color="error.main">
                      Additional interest accrued after due date: ₹{calculatePostDueInterest().toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Quick Payment Options:
                  </Typography>
                  <Box display="flex" gap={1}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="primary"
                      onClick={() => handleQuickPaymentOption('full')}
                    >
                      Full Amount
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="warning"
                      onClick={() => handleQuickPaymentOption('interest')}
                    >
                      Interest Only
                    </Button>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      color="secondary"
                      onClick={() => handleQuickPaymentOption('half')}
                    >
                      Half Payment
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="amount"
                  control={control}
                  rules={{ 
                    required: 'Amount is required',
                    validate: value => 
                      parseFloat(value) > 0 ? true : 'Amount must be greater than 0',
                    max: {
                      value: calculateRemainingAmount(),
                      message: `Amount cannot exceed remaining amount (₹${calculateRemainingAmount().toLocaleString()})`,
                    }
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Payment Amount"
                      fullWidth
                      variant="outlined"
                      type="number"
                      InputProps={{ 
                        inputProps: { min: 0, step: 'any' },
                        startAdornment: <InputAdornment position="start">₹</InputAdornment>
                      }}
                      error={!!errors.amount}
                      helperText={errors.amount?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="paymentDate"
                  control={control}
                  rules={{ required: 'Payment date is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Payment Date"
                      type="date"
                      fullWidth
                      variant="outlined"
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.paymentDate}
                      helperText={errors.paymentDate?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="paymentType"
                  control={control}
                  rules={{ required: 'Payment type is required' }}
                  render={({ field }) => (
                    <FormControl fullWidth variant="outlined">
                      <InputLabel>Payment Method</InputLabel>
                      <Select
                        {...field}
                        label="Payment Method"
                        error={!!errors.paymentType}
                      >
                        <MenuItem value="cash">Cash</MenuItem>
                        <MenuItem value="bank">Bank Transfer</MenuItem>
                        <MenuItem value="upi">UPI</MenuItem>
                        <MenuItem value="cheque">Cheque</MenuItem>
                        <MenuItem value="other">Other</MenuItem>
                      </Select>
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
                      variant="outlined"
                      multiline
                      rows={2}
                      placeholder="Add any additional payment notes here"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              startIcon={<Check />}
            >
              Confirm Payment
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this loan? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
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
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LoanDetail; 