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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Chip,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Add,
  Search,
  Edit,
  Visibility,
  Delete,
  Business,
  Refresh,
  LocalShipping
} from '@mui/icons-material';
import api from '../utils/api';
import { getNetworkStatus } from '../utils/networkStatus';

const Suppliers = () => {
  const navigate = useNavigate();
  
  // State
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOffline, setIsOffline] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // Fetch suppliers
  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (online) {
        const response = await api.get('/api/suppliers');
        if (response.data.success) {
          setSuppliers(response.data.data);
          filterSuppliers(response.data.data, searchTerm);
        }
      } else {
        setSnackbar({
          open: true,
          message: 'You are offline. Some features may be limited.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to load suppliers'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    fetchSuppliers();
  }, []);
  
  // Filter suppliers when search term changes
  useEffect(() => {
    filterSuppliers(suppliers, searchTerm);
  }, [searchTerm, suppliers]);
  
  // Filter suppliers based on search term
  const filterSuppliers = (allSuppliers, term) => {
    if (!term) {
      setFilteredSuppliers(allSuppliers);
      return;
    }
    
    const lowerCaseSearch = term.toLowerCase();
    const filtered = allSuppliers.filter(supplier => 
      (supplier.name && supplier.name.toLowerCase().includes(lowerCaseSearch)) ||
      (supplier.phone && supplier.phone.includes(lowerCaseSearch)) ||
      (supplier.email && supplier.email.toLowerCase().includes(lowerCaseSearch)) ||
      (supplier.gstin && supplier.gstin.toLowerCase().includes(lowerCaseSearch))
    );
    
    setFilteredSuppliers(filtered);
  };
  
  // Handle search
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  // Navigate to new supplier page
  const handleAddSupplier = () => {
    navigate('/suppliers/new');
  };
  
  // Navigate to supplier details page
  const handleViewSupplier = (id) => {
    navigate(`/suppliers/${id}`);
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
          <Business sx={{ mr: 1, color: 'primary.main' }} />
          Suppliers
        </Typography>
        
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={handleAddSupplier}
            disabled={isOffline}
            sx={{ ml: 1 }}
          >
            Add Supplier
          </Button>
        </Box>
      </Box>
      
      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Search suppliers..."
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
          onClick={fetchSuppliers}
          disabled={loading}
          sx={{ ml: 2 }}
        >
          Refresh
        </Button>
      </Paper>
      
      {/* Suppliers List */}
      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead sx={{ bgcolor: 'primary.50' }}>
            <TableRow>
              <TableCell>Supplier Name</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>GSTIN</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  <Typography variant="body1" color="textSecondary">
                    {searchTerm ? 'No suppliers match your search' : 'No suppliers found'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier) => (
                <TableRow key={supplier._id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {supplier.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {supplier.phone}
                    </Typography>
                    {supplier.email && (
                      <Typography variant="caption" color="textSecondary">
                        {supplier.email}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.city || 'N/A'}
                  </TableCell>
                  <TableCell>
                    {supplier.gstin || 'N/A'}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleViewSupplier(supplier._id)}
                      >
                        <Visibility />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Record Supply">
                      <IconButton 
                        color="secondary" 
                        onClick={() => navigate('/gold-supplies/new', { state: { supplierId: supplier._id } })}
                        disabled={isOffline}
                      >
                        <LocalShipping />
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

export default Suppliers; 