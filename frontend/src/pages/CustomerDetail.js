import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress,
  Avatar,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tabs,
  Tab,
  Tooltip,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  InputAdornment,
  LinearProgress
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  Home,
  LocationCity,
  Notes,
  Edit,
  ArrowBack,
  CalendarToday,
  VerifiedUser,
  LocalAtm,
  Repeat,
  History,
  ShoppingBag,
  Visibility,
  Payment,
  CreditCard,
  DonutLarge,
  Receipt,
  PointOfSale
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { format, isValid } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [purchases, setPurchases] = useState([]);
  const [sales, setSales] = useState([]);
  const [loans, setLoans] = useState([]);
  const [savingsSchemes, setSavingsSchemes] = useState([]);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  
  // Get database context
  const { db, resetDatabase } = useDatabase();
  
  // Form setup
  const { control, handleSubmit, reset, formState: { errors } } = useForm();
  
  // Effect to fetch customer data
  useEffect(() => {
    fetchCustomerData();
  }, [id]);
  
  // Fetch customer data
  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (online) {
        // Fetch customer from API
        const response = await api.get(`/api/customers/${id}`);
        if (response.data.success) {
          setCustomer(response.data.data);
          
          // Also fetch related transactions
          fetchCustomerPurchases(id);
          fetchCustomerSales(id);
          fetchCustomerLoans(id);
          fetchCustomerSavingsSchemes(id);
        } else {
          setSnackbar({
            open: true,
            message: 'Failed to fetch customer data',
            severity: 'error'
          });
        }
      } else {
        // User is offline
        setSnackbar({
          open: true,
          message: 'You are offline. Please check your connection.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setSnackbar({
        open: true,
        message: 'Error loading customer information',
        severity: 'error'
      });
    } finally {
      setLoading(false);
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
            fetchCustomerData();
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
  
  // Open edit dialog
  const handleOpenEditDialog = () => {
    reset({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      documentType: customer.documentType || 'aadhar',
      documentNumber: customer.documentNumber || '',
      customerType: customer.customerType || 'regular',
      notes: customer.notes || ''
    });
    
    setOpenEditDialog(true);
  };
  
  // Close edit dialog
  const handleCloseEditDialog = () => {
    setOpenEditDialog(false);
  };
  
  // Submit edit form
  const onSubmit = async (data) => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot update customer while offline',
          severity: 'warning'
        });
        return;
      }
      
      const response = await api.put(`/api/customers/${id}`, data);
      
      if (response.data.success) {
        setCustomer(response.data.data);
        
        setSnackbar({
          open: true,
          message: 'Customer updated successfully',
          severity: 'success'
        });
        
        // Update in IndexedDB
        if (db) {
          try {
            const existingCustomer = await db.customers
              .filter(c => c._id === id || c.id === id)
              .first();
            
            if (existingCustomer) {
              await db.customers.update(existingCustomer.id, {
                ...existingCustomer,
                ...response.data.data
              });
            }
          } catch (error) {
            console.error('Error updating customer in IndexedDB:', error);
          }
        }
        
        handleCloseEditDialog();
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to update customer'}`,
        severity: 'error'
      });
    }
  };
  
  // Navigate back to customers list
  const handleBack = () => {
    navigate('/customers');
  };
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };
  
  // Get customer type display text
  const getCustomerTypeDisplay = (type) => {
    const types = {
      regular: { label: 'Regular', color: 'primary' },
      wholesale: { label: 'Wholesale', color: 'secondary' },
      vip: { label: 'VIP', color: 'success' }
    };
    
    return types[type] || types.regular;
  };
  
  // Generate initials for avatar
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };
  
  // Fetch customer loans
  const fetchCustomerLoans = async (customerId) => {
    try {
      // Check if online
      const online = await getNetworkStatus();
      
      if (online) {
        // Fetch loans for this customer
        const response = await api.get(`/api/loans?customer=${customerId}`);
        if (response.data.success) {
          setLoans(response.data.data || []);
        }
      } else {
        // If offline, try to get from IndexedDB
        if (db) {
          try {
            const customerLoans = await db.loans
              .filter(loan => loan.customer === customerId || 
                      (loan.customer && loan.customer._id === customerId))
              .toArray();
            setLoans(customerLoans);
          } catch (error) {
            console.error('Error fetching loans from IndexedDB:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching customer loans:', error);
    }
  };
  
  // Fetch customer's savings schemes
  const fetchCustomerSavingsSchemes = async (customerId) => {
    try {
      const online = await getNetworkStatus();
      
      if (online) {
        const response = await api.get(`/api/savings-schemes/customer/${customerId}`);
        if (response.data.success) {
          setSavingsSchemes(response.data.data);
        }
      } else {
        console.log('Cannot fetch savings schemes while offline');
      }
    } catch (error) {
      console.error('Error fetching customer savings schemes:', error);
    }
  };
  
  // Fetch customer purchases
  const fetchCustomerPurchases = async (customerId) => {
    try {
      const online = await getNetworkStatus();
      
      if (online) {
        const response = await api.get(`/api/gold-purchases?customer=${customerId}`);
        if (response.data.success) {
          setPurchases(response.data.data || []);
        }
      } else {
        console.log('Cannot fetch purchases while offline');
      }
    } catch (error) {
      console.error('Error fetching customer purchases:', error);
    }
  };

  // Fetch customer sales
  const fetchCustomerSales = async (customerId) => {
    try {
      const online = await getNetworkStatus();
      
      if (online) {
        const response = await api.get(`/api/sales?customer=${customerId}`);
        if (response.data.success) {
          setSales(response.data.data || []);
        }
      } else if (db) {
        try {
          const dbSales = await db.sales
            .filter(sale => sale.customer === customerId || 
                         (sale.customer && sale.customer._id === customerId))
            .toArray();
          
          setSales(dbSales || []);
        } catch (error) {
          console.error('Error fetching sales from IndexedDB:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching customer sales:', error);
    }
  };
  
  // Handle opening the payment dialog
  const handleOpenPaymentDialog = (loan) => {
    setSelectedLoan(loan);
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentNotes('');
    setOpenPaymentDialog(true);
  };
  
  // Handle closing the payment dialog
  const handleClosePaymentDialog = () => {
    setOpenPaymentDialog(false);
    setSelectedLoan(null);
  };
  
  // Handle submitting a payment
  const handleSubmitPayment = async () => {
    if (!selectedLoan || !paymentAmount || paymentAmount <= 0) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid payment amount',
        severity: 'error'
      });
      return;
    }
    
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot process payment while offline',
          severity: 'warning'
        });
        return;
      }
      
      // Create a new payment
      const payment = {
        amount: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes,
        date: new Date()
      };
      
      // Get the loan and update it with the new payment
      const updatedLoan = {
        ...selectedLoan,
        payments: [...(selectedLoan.payments || []), payment],
        totalPaid: (selectedLoan.totalPaid || 0) + Number(paymentAmount)
      };
      
      // If the payment covers or exceeds the loan amount, mark as completed
      const principal = selectedLoan.principalAmount;
      const interest = principal * (selectedLoan.interestRate / 100) * 
                      (new Date(selectedLoan.dueDate) - new Date(selectedLoan.startDate)) / 
                      (1000 * 60 * 60 * 24 * 30); // Rough estimation of interest
      const totalDue = principal + interest;
      
      if (updatedLoan.totalPaid >= totalDue) {
        updatedLoan.status = 'completed';
      }
      
      // Update the loan in the API
      const response = await api.put(`/api/loans/${selectedLoan._id}`, updatedLoan);
      
      if (response.data.success) {
        // Update the loans list
        setLoans(prevLoans => 
          prevLoans.map(loan => 
            loan._id === selectedLoan._id ? response.data.data : loan
          )
        );
        
        setSnackbar({
          open: true,
          message: 'Payment processed successfully',
          severity: 'success'
        });
        
        // Close the dialog
        handleClosePaymentDialog();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to process payment'}`,
        severity: 'error'
      });
    }
  };
  
  // Format date safely
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, 'dd/MM/yyyy');
  };
  
  // Format date time safely
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (!isValid(date)) return 'Invalid date';
    
    return format(date, 'dd MMM yyyy, hh:mm a');
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Customer not found
  if (!customer) {
    return (
      <Box sx={{ p: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back to Customers
        </Button>
        
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h5" color="error">
            Customer not found
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            The customer you're looking for doesn't exist or has been deleted.
          </Typography>
        </Paper>
      </Box>
    );
  }
  
  // Customer type display
  const customerTypeInfo = getCustomerTypeDisplay(customer.customerType);
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header with back button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Back to Customers
        </Button>
        
        {isOffline && (
          <Alert severity="warning" sx={{ display: 'inline-flex' }}>
            You are offline. Some features may be limited.
          </Alert>
        )}
      </Box>
      
      {/* Customer Profile Card */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', pt: 4 }}>
              <Avatar 
                sx={{ 
                  width: 100, 
                  height: 100, 
                  mx: 'auto', 
                  mb: 2,
                  bgcolor: customerTypeInfo.color + '.main',
                  fontSize: '2rem'
                }}
              >
                {getInitials(customer.name)}
              </Avatar>
              
              <Typography variant="h5" component="div" gutterBottom>
                {customer.name}
              </Typography>
              
              <Chip 
                label={customerTypeInfo.label}
                color={customerTypeInfo.color}
                sx={{ mb: 2 }}
              />
              
              <Divider sx={{ my: 2 }} />
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Phone color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Phone" 
                    secondary={customer.phone} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Email color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Email" 
                    secondary={customer.email || 'Not provided'} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Home color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Address" 
                    secondary={customer.address ? 
                      `${customer.address}${customer.city ? `, ${customer.city}` : ''}${customer.pincode ? ` - ${customer.pincode}` : ''}` : 
                      'Not provided'} 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Customer Since" 
                    secondary={formatDateTime(customer.createdAt)} 
                  />
                </ListItem>
              </List>
            </CardContent>
            <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
              <Button 
                variant="contained" 
                startIcon={<Edit />}
                onClick={handleOpenEditDialog}
                disabled={isOffline}
              >
                Edit Details
              </Button>
            </CardActions>
          </Card>
          
          {/* Additional Info Card */}
          {customer.notes && (
            <Card variant="outlined" sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <Notes sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Notes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {customer.notes}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
        
        <Grid item xs={12} md={8}>
          {/* Customer Transactions Card */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ boxShadow: 2, borderRadius: 2 }}>
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
                >
                  <Tab 
                    icon={<PointOfSale sx={{ mr: 1 }} />} 
                    label="Sales History" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<ShoppingBag sx={{ mr: 1 }} />} 
                    label="Gold Purchases" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<LocalAtm sx={{ mr: 1 }} />} 
                    label="Loan History" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<DonutLarge sx={{ mr: 1 }} />} 
                    label="Savings Schemes" 
                    iconPosition="start"
                  />
                  <Tab 
                    icon={<History sx={{ mr: 1 }} />} 
                    label="Activity Log" 
                    iconPosition="start"
                  />
                </Tabs>
                
                <Box sx={{ p: 3 }}>
                  {/* Sales History Tab */}
                  {tabValue === 0 && (
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <Receipt sx={{ mr: 1, color: 'primary.main' }} />
                        Sales History
                      </Typography>
                      
                      {sales.length > 0 ? (
                        <Box sx={{ mt: 2 }}>
                          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 1 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: 'primary.50' }}>
                                <TableRow>
                                  <TableCell>Invoice Number</TableCell>
                                  <TableCell>Date</TableCell>
                                  <TableCell>Items</TableCell>
                                  <TableCell>Total Amount</TableCell>
                                  <TableCell>Payment Status</TableCell>
                                  <TableCell>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {sales.map((sale) => {
                                  return (
                                    <TableRow key={sale._id || sale.id} hover>
                                      <TableCell>{sale.invoiceNumber}</TableCell>
                                      <TableCell>{formatDate(sale.saleDate)}</TableCell>
                                      <TableCell>
                                        {sale.items ? `${sale.items.length} items` : '-'}
                                      </TableCell>
                                      <TableCell>
                                        {formatCurrency(sale.totalAmount)}
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          size="small"
                                          label={sale.paymentStatus ? sale.paymentStatus.charAt(0).toUpperCase() + sale.paymentStatus.slice(1) : 'Paid'}
                                          color={sale.paymentStatus === 'pending' ? 'warning' : 'success'}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <IconButton 
                                          size="small"
                                          color="primary"
                                          onClick={() => navigate(`/sales/${sale._id || sale.id}`)}
                                        >
                                          <Visibility fontSize="small" />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      ) : (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            textAlign: 'center', 
                            py: 4, 
                            px: 2, 
                            bgcolor: 'background.paper',
                            borderRadius: 2
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {isOffline ? 
                              'Sales history is not available while offline.' : 
                              'No sales records found for this customer.'}
                          </Typography>
                        </Paper>
                      )}
                      
                      <Button
                        variant="contained"
                        startIcon={<PointOfSale />}
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/sales/new', { state: { customerId: customer._id } })}
                        disabled={isOffline}
                      >
                        Create New Sale for this Customer
                      </Button>
                    </Box>
                  )}
                  
                  {/* Gold Purchases Tab */}
                  {tabValue === 1 && (
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <ShoppingBag sx={{ mr: 1, color: 'primary.main' }} />
                        Gold Purchases
                      </Typography>
                      
                      {purchases.length > 0 ? (
                        <Box sx={{ mt: 2 }}>
                          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 1 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: 'primary.50' }}>
                                <TableRow>
                                  <TableCell>Receipt Number</TableCell>
                                  <TableCell>Date</TableCell>
                                  <TableCell>Weight</TableCell>
                                  <TableCell>Purity</TableCell>
                                  <TableCell>Amount Paid</TableCell>
                                  <TableCell>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {purchases.map((purchase) => {
                                  return (
                                    <TableRow key={purchase._id || purchase.id} hover>
                                      <TableCell>{purchase.receiptNumber}</TableCell>
                                      <TableCell>{formatDate(purchase.purchaseDate)}</TableCell>
                                      <TableCell>{purchase.weight} {purchase.weightUnit}</TableCell>
                                      <TableCell>{purchase.purity}</TableCell>
                                      <TableCell>
                                        {formatCurrency(purchase.amount)}
                                      </TableCell>
                                      <TableCell>
                                        <IconButton 
                                          size="small"
                                          color="primary"
                                          onClick={() => navigate(`/gold-purchases/${purchase._id || purchase.id}`)}
                                        >
                                          <Visibility fontSize="small" />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      ) : (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            textAlign: 'center', 
                            py: 4, 
                            px: 2, 
                            bgcolor: 'background.paper',
                            borderRadius: 2
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {isOffline ? 
                              'Purchase history is not available while offline.' : 
                              'No gold purchase records found for this customer.'}
                          </Typography>
                        </Paper>
                      )}
                      
                      <Button
                        variant="contained"
                        startIcon={<ShoppingBag />}
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/gold-purchases/new', { state: { customerId: customer._id } })}
                        disabled={isOffline}
                      >
                        Record Gold Purchase for this Customer
                      </Button>
                    </Box>
                  )}
                  
                  {/* Loan History Tab */}
                  {tabValue === 2 && (
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocalAtm sx={{ mr: 1, color: 'primary.main' }} />
                        Loan History
                      </Typography>
                      
                      {loans.length > 0 ? (
                        <Box sx={{ mt: 2 }}>
                          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 1 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: 'primary.50' }}>
                                <TableRow>
                                  <TableCell>Loan Number</TableCell>
                                  <TableCell>Date</TableCell>
                                  <TableCell>Item</TableCell>
                                  <TableCell>Principal</TableCell>
                                  <TableCell>Interest Rate</TableCell>
                                  <TableCell>Status</TableCell>
                                  <TableCell>Due Date</TableCell>
                                  <TableCell>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {loans.map((loan) => {
                                  const statusColors = {
                                    active: 'success',
                                    completed: 'info',
                                    overdue: 'error'
                                  };
                                  
                                  return (
                                    <TableRow key={loan._id || loan.id} hover>
                                      <TableCell>{loan.loanNumber}</TableCell>
                                      <TableCell>{formatDate(loan.startDate)}</TableCell>
                                      <TableCell>
                                        <Tooltip title={loan.itemDescription}>
                                          <span>
                                            {loan.itemDescription.length > 20 
                                              ? `${loan.itemDescription.substring(0, 20)}...` 
                                              : loan.itemDescription}
                                          </span>
                                        </Tooltip>
                                      </TableCell>
                                      <TableCell>
                                        {formatCurrency(loan.principalAmount)}
                                      </TableCell>
                                      <TableCell>{loan.interestRate}%</TableCell>
                                      <TableCell>
                                        <Chip 
                                          size="small"
                                          label={loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
                                          color={statusColors[loan.status] || 'default'}
                                        />
                                      </TableCell>
                                      <TableCell>{formatDate(loan.dueDate)}</TableCell>
                                      <TableCell>
                                        <IconButton 
                                          size="small"
                                          color="primary"
                                          onClick={() => navigate(`/loans/${loan._id || loan.id}`)}
                                        >
                                          <Visibility fontSize="small" />
                                        </IconButton>
                                        {loan.status !== 'completed' && (
                                          <IconButton
                                            size="small"
                                            color="success"
                                            onClick={() => handleOpenPaymentDialog(loan)}
                                            disabled={isOffline}
                                          >
                                            <Payment fontSize="small" />
                                          </IconButton>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      ) : (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            textAlign: 'center', 
                            py: 4, 
                            px: 2, 
                            bgcolor: 'background.paper',
                            borderRadius: 2
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {isOffline ? 
                              'Loan history is not available while offline.' : 
                              'No loan records found for this customer.'}
                          </Typography>
                        </Paper>
                      )}
                      
                      <Button
                        variant="contained"
                        startIcon={<LocalAtm />}
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/loans/new', { state: { customerId: customer._id } })}
                        disabled={isOffline}
                      >
                        Create New Loan for this Customer
                      </Button>
                    </Box>
                  )}
                  
                  {/* Savings Schemes Tab */}
                  {tabValue === 3 && (
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <DonutLarge sx={{ mr: 1, color: 'primary.main' }} />
                        Savings Schemes
                      </Typography>
                      
                      {savingsSchemes.length > 0 ? (
                        <Box sx={{ mt: 2 }}>
                          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 1 }}>
                            <Table size="small">
                              <TableHead sx={{ bgcolor: 'primary.50' }}>
                                <TableRow>
                                  <TableCell>Scheme ID</TableCell>
                                  <TableCell>Start Date</TableCell>
                                  <TableCell>Monthly Amount</TableCell>
                                  <TableCell>Progress</TableCell>
                                  <TableCell>Status</TableCell>
                                  <TableCell>Total Value</TableCell>
                                  <TableCell>Actions</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {savingsSchemes.map((scheme) => {
                                  const statusColors = {
                                    active: 'primary',
                                    completed: 'success',
                                    cancelled: 'error'
                                  };
                                  
                                  const progress = scheme.deposits ? 
                                    Math.round((scheme.deposits.length / 11) * 100) : 0;
                                  
                                  return (
                                    <TableRow key={scheme._id || scheme.id} hover>
                                      <TableCell>{scheme.schemeId}</TableCell>
                                      <TableCell>{formatDate(scheme.startDate)}</TableCell>
                                      <TableCell>
                                        {formatCurrency(scheme.monthlyAmount)}
                                      </TableCell>
                                      <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                          <Box sx={{ width: '70%', mr: 1 }}>
                                            <LinearProgress
                                              variant="determinate"
                                              value={progress}
                                              color={statusColors[scheme.status] || 'primary'}
                                              sx={{ height: 8, borderRadius: 5 }}
                                            />
                                          </Box>
                                          <Box>
                                            <Typography variant="body2" color="text.secondary">
                                              {scheme.deposits?.length || 0}/11
                                            </Typography>
                                          </Box>
                                        </Box>
                                      </TableCell>
                                      <TableCell>
                                        <Chip 
                                          size="small"
                                          label={scheme.status.charAt(0).toUpperCase() + scheme.status.slice(1)}
                                          color={statusColors[scheme.status] || 'default'}
                                        />
                                      </TableCell>
                                      <TableCell>
                                        {formatCurrency(scheme.totalExpectedAmount)}
                                      </TableCell>
                                      <TableCell>
                                        <IconButton 
                                          size="small"
                                          color="primary"
                                          onClick={() => navigate(`/savings-schemes/${scheme._id || scheme.id}`)}
                                        >
                                          <Visibility fontSize="small" />
                                        </IconButton>
                                        {scheme.status === 'active' && (
                                          <IconButton
                                            size="small"
                                            color="success"
                                            onClick={() => navigate(`/savings-schemes/${scheme._id || scheme.id}`)}
                                            disabled={isOffline}
                                          >
                                            <Payment fontSize="small" />
                                          </IconButton>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      ) : (
                        <Paper 
                          variant="outlined" 
                          sx={{ 
                            textAlign: 'center', 
                            py: 4, 
                            px: 2, 
                            bgcolor: 'background.paper',
                            borderRadius: 2
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {isOffline ? 
                              'Savings schemes are not available while offline.' : 
                              'No savings schemes found for this customer.'}
                          </Typography>
                        </Paper>
                      )}
                      
                      <Button
                        variant="contained"
                        startIcon={<CreditCard />}
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() => navigate('/savings-schemes/new', { state: { customerId: customer._id } })}
                        disabled={isOffline}
                      >
                        Create New Savings Scheme for this Customer
                      </Button>
                    </Box>
                  )}
                  
                  {/* Activity Log Tab */}
                  {tabValue === 4 && (
                    <Box>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <History sx={{ mr: 1, color: 'primary.main' }} />
                        Activity Log
                      </Typography>
                      
                      <Paper variant="outlined" sx={{ p: 2, boxShadow: 1, borderRadius: 2 }}>
                        <List>
                          <ListItem>
                            <ListItemIcon>
                              <Person color="primary" />
                            </ListItemIcon>
                            <ListItemText 
                              primary="Customer Created" 
                              secondary={formatDateTime(customer.createdAt)} 
                            />
                          </ListItem>
                          
                          {customer.updatedAt && customer.updatedAt !== customer.createdAt && (
                            <ListItem>
                              <ListItemIcon>
                                <Edit color="primary" />
                              </ListItemIcon>
                              <ListItemText 
                                primary="Last Updated" 
                                secondary={formatDateTime(customer.updatedAt)} 
                              />
                            </ListItem>
                          )}
                        </List>
                      </Paper>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      
      {/* Edit Customer Dialog */}
      <Dialog 
        open={openEditDialog} 
        onClose={handleCloseEditDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Customer Details</DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  defaultValue={customer.name}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                      margin="normal"
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
                  defaultValue={customer.phone}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Phone"
                      fullWidth
                      error={!!errors.phone}
                      helperText={errors.phone?.message}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="email"
                  control={control}
                  defaultValue={customer.email || ''}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      fullWidth
                      type="email"
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Controller
                  name="customerType"
                  control={control}
                  defaultValue={customer.customerType || 'regular'}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Customer Type</InputLabel>
                      <Select {...field} label="Customer Type">
                        <MenuItem value="regular">Regular</MenuItem>
                        <MenuItem value="wholesale">Wholesale</MenuItem>
                        <MenuItem value="vip">VIP</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Controller
                  name="address"
                  control={control}
                  defaultValue={customer.address || ''}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Address"
                      fullWidth
                      multiline
                      rows={2}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="city"
                  control={control}
                  defaultValue={customer.city || ''}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="City"
                      fullWidth
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="state"
                  control={control}
                  defaultValue={customer.state || ''}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="State"
                      fullWidth
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <Controller
                  name="pincode"
                  control={control}
                  defaultValue={customer.pincode || ''}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Pincode"
                      fullWidth
                      margin="normal"
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Controller
                  name="notes"
                  control={control}
                  defaultValue={customer.notes || ''}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Notes"
                      fullWidth
                      multiline
                      rows={3}
                      margin="normal"
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
            >
              Save Changes
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* Payment Dialog */}
      <Dialog 
        open={openPaymentDialog} 
        onClose={handleClosePaymentDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Process Loan Payment</DialogTitle>
        <DialogContent>
          {selectedLoan && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Loan: {selectedLoan.loanNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Item: {selectedLoan.itemDescription}
                </Typography>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Principal:</strong> ₹{selectedLoan.principalAmount.toLocaleString('en-IN')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Interest Rate:</strong> {selectedLoan.interestRate}%
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Total Paid:</strong> ₹{(selectedLoan.totalPaid || 0).toLocaleString('en-IN')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Status:</strong> {selectedLoan.status}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Payment Amount"
                  fullWidth
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                  }}
                  margin="normal"
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
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
              
              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  rows={2}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  margin="normal"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePaymentDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSubmitPayment}
          >
            Process Payment
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

export default CustomerDetail; 