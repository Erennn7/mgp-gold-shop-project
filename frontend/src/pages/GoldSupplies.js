import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add,
  Search,
  Visibility,
  Refresh,
  LocalShipping
} from '@mui/icons-material';
import api from '../utils/api';
import { getNetworkStatus } from '../utils/networkStatus';
import { formatDate, formatCurrency } from '../utils/formatters';

const GoldSupplies = () => {
  const navigate = useNavigate();
  
  // State
  const [supplies, setSupplies] = useState([]);
  const [filteredSupplies, setFilteredSupplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Fetch gold supplies
  const fetchSupplies = async () => {
    setLoading(true);
    try {
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (online) {
        const response = await api.get('/api/gold-supplies');
        if (response.data.success) {
          setSupplies(response.data.data);
          filterSupplies(response.data.data, searchTerm);
        }
      } else {
        setSnackbar({
          open: true,
          message: 'You are offline. Some features may be limited.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error fetching gold supplies:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to load gold supplies'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchSupplies();
  }, []);
  
  // Filter supplies when search term changes
  useEffect(() => {
    filterSupplies(supplies, searchTerm);
  }, [searchTerm, supplies]);
  
  // Filter supplies based on search term
  const filterSupplies = (allSupplies, term) => {
    if (!term) {
      setFilteredSupplies(allSupplies);
      return;
    }
    
    const lowerCaseSearch = term.toLowerCase();
    const filtered = allSupplies.filter(supply => 
      (supply.invoiceNumber && supply.invoiceNumber.toLowerCase().includes(lowerCaseSearch)) ||
      (supply.supplier && supply.supplier.name && supply.supplier.name.toLowerCase().includes(lowerCaseSearch))
    );
    
    setFilteredSupplies(filtered);
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Navigate to new supply page
  const handleAddSupply = () => {
    navigate('/gold-supplies/new');
  };
  
  // Navigate to supply details page
  const handleViewSupply = (id) => {
    navigate(`/gold-supplies/${id}`);
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
  
  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <LocalShipping sx={{ mr: 1, color: 'primary.main' }} />
          Gold Supplies
        </Typography>
        
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleAddSupply}
            disabled={isOffline}
            sx={{ ml: 1 }}
          >
            Add Supply
          </Button>
        </Box>
      </Box>
      
      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search supplies..."
          variant="outlined"
          size="small"
          sx={{ width: '100%', maxWidth: 500 }}
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
        
        <Button
          startIcon={<Refresh />}
          onClick={fetchSupplies}
          disabled={loading}
          sx={{ ml: 2 }}
        >
          Refresh
        </Button>
      </Paper>
      
      {/* Supplies List */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.50' }}>
            <TableRow>
              <TableCell>Invoice</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Items</TableCell>
              <TableCell align="right">Total Amount</TableCell>
              <TableCell>Payment Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filteredSupplies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="textSecondary">
                    {searchTerm ? 'No supplies match your search' : 'No supplies found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSupplies.map((supply) => (
                <TableRow key={supply._id} hover>
                  <TableCell>
                    {supply.invoiceNumber || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {formatDate(supply.supplyDate)}
                  </TableCell>
                  <TableCell>
                    {supply.supplier?.name || 'Unknown'}
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
                        onClick={() => handleViewSupply(supply._id)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
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

export default GoldSupplies; 