import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  CircularProgress,
  Chip,
  Switch,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import { Autocomplete } from '@mui/material';
import { Add, Edit, Delete, Refresh, CheckCircle, History } from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';

const Prices = () => {
  // State
  const [tabValue, setTabValue] = useState(0);
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isOffline, setIsOffline] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  // Form handling
  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      metalType: 'gold',
      purity: '',
      pricePerGram: '',
      otherCharges: 0,
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      isActive: true
    }
  });

  // Watch for metal type changes in the form
  const watchMetalType = watch('metalType');

  // Get database context
  const { db, resetDatabase } = useDatabase();

  // Effect to fetch prices on tab change or activeOnly change
  useEffect(() => {
    fetchPrices();
  }, [tabValue, showActiveOnly]);

  // Function to fetch prices from API or IndexedDB
  const fetchPrices = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      if (online) {
        try {
          // If online, fetch from API
          const metalType = tabValue === 0 ? 'gold' : 'silver';
          const response = await api.get(`/api/prices?metalType=${metalType}${showActiveOnly ? '&activeOnly=true' : ''}`);
          if (response.data.success) {
            setPrices(response.data.data || []);
          }
        } catch (apiError) {
          console.error('API error fetching prices:', apiError);
          // Try IndexedDB as fallback
          await fetchFromIndexedDB();
        }
      } else {
        // If offline, fetch from IndexedDB
        await fetchFromIndexedDB();
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
      handleDatabaseError(error);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to fetch from IndexedDB
  const fetchFromIndexedDB = async () => {
    if (!db) return;
    
    try {
      const metalType = tabValue === 0 ? 'gold' : 'silver';
      let cachedPrices = await db.prices
        .where('metalType')
        .equals(metalType)
        .toArray();
      
      // Filter for active only if needed
      if (showActiveOnly) {
        cachedPrices = cachedPrices.filter(price => price.isActive);
      }
      
      setPrices(cachedPrices);
    } catch (dbError) {
      console.error('IndexedDB error:', dbError);
      handleDatabaseError(dbError);
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
            fetchPrices();
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

  // Open dialog for adding or editing price
  const handleOpenDialog = (price = null) => {
    if (price) {
      // Editing existing price
      setSelectedPrice(price);
      
      // Set form values
      setValue('metalType', price.metalType);
      setValue('purity', price.purity);
      setValue('pricePerGram', price.pricePerGram);
      setValue('otherCharges', price.otherCharges || 0);
      setValue('effectiveDate', format(new Date(price.effectiveDate), 'yyyy-MM-dd'));
      setValue('notes', price.notes || '');
      setValue('isActive', price.isActive !== false); // Default to true if not specified
    } else {
      // Adding new price
      setSelectedPrice(null);
      
      // Reset form to defaults, but keep the current tab's metal type
      reset({
        metalType: tabValue === 0 ? 'gold' : 'silver',
        purity: '',
        pricePerGram: '',
        otherCharges: 0,
        effectiveDate: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        isActive: true
      });
    }
    
    setOpenDialog(true);
  };

  // Close dialog
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedPrice(null);
  };

  // Handle form submission
  const onSubmit = async (data) => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (selectedPrice) {
        // Update existing price entry
        if (online) {
          // If online, update via API
          const response = await api.put(`/api/prices/${selectedPrice._id}`, data);
          
          if (response.data.success) {
            setSnackbar({
              open: true,
              message: 'Price updated successfully',
              severity: 'success'
            });
            
            // Update local state
            setPrices(prevPrices => 
              prevPrices.map(price => 
                price._id === selectedPrice._id ? response.data.data : price
              )
            );
            
            // Update in IndexedDB
            if (db) {
              try {
                await db.prices.put({
                  ...response.data.data,
                  id: selectedPrice.id // Keep the local ID
                });
              } catch (error) {
                console.error('Error updating price in IndexedDB:', error);
              }
            }
          }
        } else {
          // If offline, update locally in IndexedDB
          if (db) {
            try {
              const updatedPrice = {
                ...selectedPrice,
                ...data,
                updatedAt: new Date()
              };
              
              await db.prices.put(updatedPrice);
              
              // Update local state
              setPrices(prevPrices => 
                prevPrices.map(price => 
                  price._id === selectedPrice._id ? updatedPrice : price
                )
              );
              
              setSnackbar({
                open: true,
                message: 'Price updated locally. Will sync when online.',
                severity: 'success'
              });
            } catch (error) {
              console.error('Error updating price in IndexedDB:', error);
              setSnackbar({
                open: true,
                message: 'Failed to update price locally',
                severity: 'error'
              });
            }
          }
        }
      } else {
        // Create new price entry
        if (online) {
          // If online, create via API
          const response = await api.post('/api/prices', data);
          
          if (response.data.success) {
            setSnackbar({
              open: true,
              message: 'Price added successfully',
              severity: 'success'
            });
            
            const newPrice = response.data.data;
            
            // Update local state if the new price matches the current tab
            if (
              (tabValue === 0 && data.metalType === 'gold') || 
              (tabValue === 1 && data.metalType === 'silver')
            ) {
              setPrices(prevPrices => [...prevPrices, newPrice]);
            }
            
            // Add to IndexedDB
            if (db) {
              try {
                await db.prices.add(newPrice);
              } catch (error) {
                console.error('Error adding price to IndexedDB:', error);
              }
            }
          }
        } else {
          // If offline, create locally in IndexedDB
          if (db) {
            try {
              const tempId = 'local_' + Date.now();
              const newPrice = {
                _id: tempId,
                ...data,
                effectiveDate: new Date(data.effectiveDate),
                createdAt: new Date()
              };
              
              // Add to IndexedDB
              const id = await db.prices.add(newPrice);
              
              // Get the price with the generated id
              const savedPrice = await db.prices.get(id);
              
              // Update local state if the new price matches the current tab
              if (
                (tabValue === 0 && data.metalType === 'gold') || 
                (tabValue === 1 && data.metalType === 'silver')
              ) {
                setPrices(prevPrices => [...prevPrices, savedPrice]);
              }
              
              setSnackbar({
                open: true,
                message: 'Price added locally. Will sync when online.',
                severity: 'success'
              });
            } catch (error) {
              console.error('Error adding price to IndexedDB:', error);
              setSnackbar({
                open: true,
                message: 'Failed to add price locally',
                severity: 'error'
              });
            }
          }
        }
      }
      
      handleCloseDialog();
      fetchPrices(); // Refresh the data
    } catch (error) {
      console.error('Error saving price:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to save price'}`,
        severity: 'error'
      });
    }
  };

  // Get purity options based on metal type
  const getPurityOptions = (metalType) => {
    if (metalType === 'gold') {
      return [
        { value: '24K', label: '24K' },
        { value: '22K', label: '22K' },
        { value: '18K', label: '18K' },
        { value: '14K', label: '14K' }
      ];
    } else {
      return [
        { value: '99.9%', label: '99.9%' },
        { value: '92.5%', label: '92.5% (Sterling)' },
        { value: '80%', label: '80%' }
      ];
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle price deletion
  const handleDelete = async (price) => {
    if (!price || (!price._id && !price.id)) return;
    
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);
      
      if (online) {
        // If online, delete via API
        const response = await api.delete(`/api/prices/${price._id}`);
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: 'Price deleted successfully',
            severity: 'success'
          });
          
          // Update local state
          setPrices(prevPrices => prevPrices.filter(p => p._id !== price._id));
          
          // Delete from IndexedDB
          if (db) {
            try {
              // Make sure we have a valid IndexedDB key (id)
              if (price.id) {
                await db.prices.delete(price.id);
              } else if (price._id) {
                // Try to find the item by _id in IndexedDB
                const dbItem = await db.prices.where('_id').equals(price._id).first();
                if (dbItem && dbItem.id) {
                  await db.prices.delete(dbItem.id);
                }
              }
            } catch (error) {
              console.error('Error deleting price from IndexedDB:', error);
            }
          }
        }
      } else {
        // If offline, delete locally in IndexedDB
        if (db) {
          try {
            // Make sure we have a valid IndexedDB key (id)
            if (price.id) {
              await db.prices.delete(price.id);
              
              // Update local state
              setPrices(prevPrices => prevPrices.filter(p => p.id !== price.id));
              
              setSnackbar({
                open: true,
                message: 'Price deleted locally. Will sync when online.',
                severity: 'success'
              });
            } else {
              throw new Error('Cannot delete: No valid IndexedDB key found');
            }
          } catch (error) {
            console.error('Error deleting price from IndexedDB:', error);
            setSnackbar({
              open: true,
              message: 'Failed to delete price locally: ' + error.message,
              severity: 'error'
            });
          }
        }
      }
    } catch (error) {
      console.error('Error deleting price:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to delete price'}`,
        severity: 'error'
      });
    }
  };

  // Handle view mode toggle
  const handleViewModeChange = (_, newValue) => {
    if (newValue !== null) {
      setShowActiveOnly(newValue === 'active');
    }
  };

  // Render prices table
  const renderPricesTable = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (prices.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No prices found for {tabValue === 0 ? 'gold' : 'silver'}.
          </Typography>
        </Box>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Purity</TableCell>
              <TableCell>Price (per gram)</TableCell>
              <TableCell>Other Charges</TableCell>
              <TableCell>Final Price</TableCell>
              <TableCell>Effective Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No price entries found
                </TableCell>
              </TableRow>
            ) : (
              prices.map((price) => (
                <TableRow 
                  key={price._id || price.id}
                  sx={{
                    backgroundColor: price.isActive ? 'rgba(46, 125, 50, 0.08)' : 'inherit'
                  }}
                >
                  <TableCell>
                    {price.isActive ? (
                      <Chip
                        icon={<CheckCircle />}
                        label="Active"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip
                        label="Historical"
                        color="default"
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>{price.purity}</TableCell>
                  <TableCell>
                    ₹{price.pricePerGram.toLocaleString('en-IN', { 
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2 
                    })}
                  </TableCell>
                  <TableCell>
                    ₹{(price.otherCharges || 0).toLocaleString('en-IN', { 
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2 
                    })}
                  </TableCell>
                  <TableCell>
                    <strong>
                      ₹{(price.finalPricePerGram || price.pricePerGram).toLocaleString('en-IN', { 
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2 
                      })}
                    </strong>
                  </TableCell>
                  <TableCell>
                    {format(new Date(price.effectiveDate), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenDialog(price)}
                      disabled={isOffline}
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(price)}
                      disabled={isOffline}
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  // Render price dialog
  const renderPriceDialog = () => {
    return (
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPrice ? 'Edit Price Entry' : 'Add New Price Entry'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="metalType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth required>
                      <InputLabel>Metal Type</InputLabel>
                      <Select
                        {...field}
                        label="Metal Type"
                      >
                        <MenuItem value="gold">Gold</MenuItem>
                        <MenuItem value="silver">Silver</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="purity"
                  control={control}
                  render={({ field: { onChange, value, ...restField }}) => (
                    <Autocomplete
                      {...restField}
                      freeSolo
                      options={getPurityOptions(watchMetalType)}
                      getOptionLabel={(option) => {
                        // Handle both string values and option objects
                        if (typeof option === 'string') return option;
                        return option.label || option.value || '';
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Purity"
                          required
                          fullWidth
                        />
                      )}
                      onChange={(_, newValue) => {
                        // Handle both string values and option objects
                        if (typeof newValue === 'string') {
                          onChange(newValue);
                        } else if (newValue && newValue.value) {
                          onChange(newValue.value);
                        } else {
                          onChange(newValue);
                        }
                      }}
                      onInputChange={(_, newInputValue) => {
                        if (newInputValue) onChange(newInputValue);
                      }}
                      value={value || ''}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="pricePerGram"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Price per gram"
                      type="number"
                      fullWidth
                      required
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="otherCharges"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Other Charges"
                      type="number"
                      fullWidth
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="effectiveDate"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Effective Date"
                      type="date"
                      fullWidth
                      required
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Set as current active price"
                    />
                  )}
                />
                <Typography variant="caption" color="text.secondary">
                  Only one price per metal/purity can be active at a time
                </Typography>
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
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
            >
              {selectedPrice ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Metal Prices</Typography>
        
        {isOffline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are currently offline. Some features may be limited.
          </Alert>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={showActiveOnly ? 'active' : 'all'}
            exclusive
            onChange={handleViewModeChange}
            size="small"
            sx={{ mr: 2 }}
          >
            <ToggleButton value="active">
              <CheckCircle fontSize="small" sx={{ mr: 1 }} />
              Active Only
            </ToggleButton>
            <ToggleButton value="all">
              <History fontSize="small" sx={{ mr: 1 }} />
              All History
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchPrices}
            sx={{ mr: 1 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Price
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Gold" />
          <Tab label="Silver" />
        </Tabs>
        
        {renderPricesTable()}
      </Paper>
      
      {renderPriceDialog()}
      
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

export default Prices; 