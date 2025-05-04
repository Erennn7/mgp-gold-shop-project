import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Grid,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Tabs,
  Tab,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Delete,
  Visibility,
  CreditCard,
  CreditScore,
  DonutLarge,
  Cached,
  ArrowUpward,
  ArrowDownward,
  Check,
  Cancel,
  Timeline
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const SavingsSchemes = () => {
  const navigate = useNavigate();
  const { db } = useDatabase();
  
  // State
  const [schemes, setSchemes] = useState([]);
  const [filteredSchemes, setFilteredSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [sortBy, setSortBy] = useState({ field: 'createdAt', direction: 'desc' });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Fetch all savings schemes
  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (online) {
        const response = await api.get('/api/savings-schemes');
        if (response.data.success) {
          setSchemes(response.data.data);
          filterSchemes(response.data.data, tabValue, searchTerm);
        }
      } else if (db) {
        // Handle offline mode with IndexedDB if needed
        setSnackbar({
          open: true,
          message: 'You are offline. Some features may be limited.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error fetching savings schemes:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to load schemes'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchSchemes();
  }, []);
  
  // Filter schemes when tab changes
  useEffect(() => {
    filterSchemes(schemes, tabValue, searchTerm);
  }, [tabValue, searchTerm, schemes]);
  
  // Filter schemes based on tab and search term
  const filterSchemes = (allSchemes, tabValue, searchTerm) => {
    let filtered = [...allSchemes];
    
    // Filter by status
    if (tabValue === 0) { // Active
      filtered = filtered.filter(scheme => scheme.status === 'active');
    } else if (tabValue === 1) { // Completed
      filtered = filtered.filter(scheme => scheme.status === 'completed');
    } else if (tabValue === 2) { // Cancelled
      filtered = filtered.filter(scheme => scheme.status === 'cancelled');
    }
    // tab 3 = All schemes, no filtering
    
    // Filter by search term
    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(scheme => 
        (scheme.schemeId && scheme.schemeId.toLowerCase().includes(lowerCaseSearch)) ||
        (scheme.customer?.name && scheme.customer.name.toLowerCase().includes(lowerCaseSearch)) ||
        (scheme.customer?.phone && scheme.customer.phone.includes(lowerCaseSearch))
      );
    }
    
    // Sort schemes
    filtered.sort((a, b) => {
      const fieldA = sortBy.field === 'createdAt' ? new Date(a.createdAt) : a[sortBy.field];
      const fieldB = sortBy.field === 'createdAt' ? new Date(b.createdAt) : b[sortBy.field];
      
      if (sortBy.direction === 'asc') {
        return fieldA > fieldB ? 1 : -1;
      } else {
        return fieldA < fieldB ? 1 : -1;
      }
    });
    
    setFilteredSchemes(filtered);
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
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
  
  // Calculate progress for a scheme
  const calculateProgress = (scheme) => {
    if (!scheme || !scheme.deposits || !scheme.deposits.length) return 0;
    return Math.min(100, (scheme.deposits.length / 11) * 100);
  };
  
  // Handle sort change
  const handleSort = (field) => {
    if (sortBy.field === field) {
      // Toggle direction if same field
      setSortBy({
        ...sortBy,
        direction: sortBy.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // New field, default to desc
      setSortBy({
        field,
        direction: 'desc'
      });
    }
  };
  
  // Get remaining deposits for a scheme
  const getRemainingDeposits = (scheme) => {
    if (!scheme || !scheme.deposits) return 11;
    return 11 - scheme.deposits.length;
  };
  
  // Navigate to new scheme page
  const handleAddNewScheme = () => {
    navigate('/savings-schemes/new');
  };
  
  // Navigate to scheme detail page
  const handleViewScheme = (id) => {
    navigate(`/savings-schemes/${id}`);
  };
  
  // Handle close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <DonutLarge sx={{ mr: 1, color: 'primary.main' }} />
          Savings Schemes
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<Add />}
          onClick={handleAddNewScheme}
          disabled={isOffline}
        >
          New Scheme
        </Button>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#ecf6ff', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Active Schemes
              </Typography>
              <Typography variant="h4" sx={{ my: 1, color: 'primary.main' }}>
                {schemes.filter(s => s.status === 'active').length}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CreditCard sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="textSecondary">
                  Monthly Contributions
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#f2fbf4', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Completed Schemes
              </Typography>
              <Typography variant="h4" sx={{ my: 1, color: 'success.main' }}>
                {schemes.filter(s => s.status === 'completed').length}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Check sx={{ color: 'success.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="textSecondary">
                  Ready for Redemption
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#fff8f7', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Cancelled Schemes
              </Typography>
              <Typography variant="h4" sx={{ my: 1, color: 'error.main' }}>
                {schemes.filter(s => s.status === 'cancelled').length}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Cancel sx={{ color: 'error.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="textSecondary">
                  Discontinued
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ backgroundColor: '#f9f3ff', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" color="textSecondary">
                Total Collection
              </Typography>
              <Typography variant="h4" sx={{ my: 1, color: 'secondary.main' }}>
                {formatCurrency(schemes.reduce((sum, scheme) => 
                  sum + (scheme.deposits?.reduce((total, d) => total + d.amount, 0) || 0), 0))}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Timeline sx={{ color: 'secondary.main', mr: 1, fontSize: 20 }} />
                <Typography variant="body2" color="textSecondary">
                  Total Deposits
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by scheme ID, customer name or phone"
              value={searchTerm}
              onChange={handleSearch}
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
              startIcon={<Cached />}
              onClick={fetchSchemes}
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      {/* Filter and Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={`Active (${schemes.filter(s => s.status === 'active').length})`} />
              <Tab label={`Completed (${schemes.filter(s => s.status === 'completed').length})`} />
              <Tab label={`Cancelled (${schemes.filter(s => s.status === 'cancelled').length})`} />
              <Tab label="All Schemes" />
            </Tabs>
          </Grid>
          
          {/* ... existing code ... */}
        </Grid>
      </Paper>
      
      {/* Scheme List */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('schemeId')}>
                  Scheme ID
                  {sortBy.field === 'schemeId' && (
                    sortBy.direction === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('startDate')}>
                  Start Date
                  {sortBy.field === 'startDate' && (
                    sortBy.direction === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => handleSort('monthlyAmount')}>
                  Monthly Amount
                  {sortBy.field === 'monthlyAmount' && (
                    sortBy.direction === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell>Progress</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Remaining</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filteredSchemes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body1" color="textSecondary" py={2}>
                    {searchTerm 
                      ? 'No schemes match your search criteria'
                      : tabValue === 0 
                        ? 'No active schemes found' 
                        : tabValue === 1 
                          ? 'No completed schemes found'
                          : tabValue === 2
                            ? 'No cancelled schemes found'
                            : 'No schemes found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSchemes.map((scheme) => (
                <TableRow 
                  key={scheme._id} 
                  hover 
                  onClick={() => handleViewScheme(scheme._id)}
                  sx={{ 
                    cursor: 'pointer',
                    bgcolor: scheme.status === 'cancelled' ? 'rgba(244, 67, 54, 0.07)' : 'inherit'
                  }}
                >
                  <TableCell>
                    <Box sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {scheme.schemeId}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {scheme.customer?.name || 'Unknown Customer'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {scheme.customer?.phone || 'No phone'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(scheme.startDate)}</TableCell>
                  <TableCell>{formatCurrency(scheme.monthlyAmount)}</TableCell>
                  <TableCell>
                    {scheme.status === 'cancelled' ? (
                      <Chip 
                        icon={<Cancel fontSize="small" />} 
                        label="Stopped" 
                        variant="outlined" 
                        color="error" 
                        size="small" 
                      />
                    ) : (
                      <Box sx={{ minWidth: 100 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={calculateProgress(scheme)}
                              color={scheme.status === 'completed' ? 'success' : 'primary'}
                              sx={{ height: 8, borderRadius: 5 }}
                            />
                          </Box>
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {scheme.deposits?.length || 0}/11
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(scheme.status)}
                    {scheme.status === 'cancelled' && scheme.cancellation && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                        Cancelled: {formatDate(scheme.cancellation.date)}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {scheme.status === 'active' ? (
                      <Chip 
                        label={`${getRemainingDeposits(scheme)} months left`} 
                        variant="outlined" 
                        size="small"
                        color={getRemainingDeposits(scheme) <= 3 ? 'secondary' : 'default'}
                      />
                    ) : scheme.status === 'completed' ? (
                      scheme.redemption?.isRedeemed ? (
                        <Chip label="Redeemed" color="success" size="small" />
                      ) : (
                        <Chip label="Awaiting Redemption" color="warning" size="small" />
                      )
                    ) : (
                      <Typography variant="body2" color="textSecondary">---</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton color="primary" onClick={() => handleViewScheme(scheme._id)}>
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    
                    {scheme.status === 'active' && (
                      <Tooltip title="Record Deposit">
                        <IconButton color="secondary" onClick={() => handleViewScheme(scheme._id)}>
                          <CreditScore />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Success/Error Notifications */}
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

export default SavingsSchemes; 