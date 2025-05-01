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
  CircularProgress
} from '@mui/material';
import { Add, Edit, Delete, Refresh } from '@mui/icons-material';
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

  // Form handling
  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      metalType: 'gold',
      purity: '',
      pricePerGram: '',
      makingCharges: 0,
      gst: 3,
      otherCharges: 0,
      effectiveDate: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    }
  });

  // Watch for metal type changes in the form
  const watchMetalType = watch('metalType');

  // Get database context
  const { db, resetDatabase } = useDatabase();

  // Effect to fetch prices on tab change
  useEffect(() => {
    fetchPrices();
  }, [tabValue]);

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
          const response = await api.get(`/api/prices?metalType=${metalType}`);
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
      const cachedPrices = await db.prices
        .where('metalType')
        .equals(metalType)
        .toArray();
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
      setValue('makingCharges', price.makingCharges);
      setValue('gst', price.gst);
      setValue('otherCharges', price.otherCharges);
      setValue('effectiveDate', format(new Date(price.effectiveDate), 'yyyy-MM-dd'));
      setValue('notes', price.notes || '');
    } else {
      // Adding new price
      setSelectedPrice(null);
      
      // Reset form to defaults, but keep the current tab's metal type
      reset({
        metalType: tabValue === 0 ? 'gold' : 'silver',
        purity: '',
        pricePerGram: '',
        makingCharges: 0,
        gst: 3,
        otherCharges: 0,
        effectiveDate: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
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
      return ['24K', '22K', '18K', '14K'];
    } else {
      return ['99.9%', '92.5%', '80%'];
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
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
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Purity</TableCell>
              <TableCell>Base Price/g</TableCell>
              <TableCell>Making Charges</TableCell>
              <TableCell>GST (%)</TableCell>
              <TableCell>Final Price/g</TableCell>
              <TableCell>Effective Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prices.map((price) => (
              <TableRow key={price._id || price.id}>
                <TableCell>{price.purity}</TableCell>
                <TableCell>₹{typeof price.pricePerGram === 'number' ? price.pricePerGram.toFixed(2) : (Number(price.pricePerGram) || 0).toFixed(2)}</TableCell>
                <TableCell>₹{typeof price.makingCharges === 'number' ? price.makingCharges.toFixed(2) : (Number(price.makingCharges) || 0).toFixed(2)}</TableCell>
                <TableCell>{price.gst || 0}%</TableCell>
                <TableCell>₹{typeof price.finalPricePerGram === 'number' ? price.finalPricePerGram.toFixed(2) : (Number(price.finalPricePerGram) || 0).toFixed(2)}</TableCell>
                <TableCell>
                  {format(new Date(price.effectiveDate), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={() => handleOpenDialog(price)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
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
        
        <Box>
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
      
      {/* Add/Edit Price Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPrice ? 'Edit Price' : 'Add New Price'}
        </DialogTitle>
        
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="metalType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth margin="normal">
                      <InputLabel>Metal Type</InputLabel>
                      <Select {...field} label="Metal Type">
                        <MenuItem value="gold">Gold</MenuItem>
                        <MenuItem value="silver">Silver</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="purity"
                  control={control}
                  rules={{ required: 'Purity is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <FormControl fullWidth margin="normal" error={!!error}>
                      <InputLabel>Purity</InputLabel>
                      <Select {...field} label="Purity">
                        {getPurityOptions(watchMetalType).map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="pricePerGram"
                  control={control}
                  rules={{ required: 'Price per gram is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="Price per Gram (₹)"
                      fullWidth
                      margin="normal"
                      type="number"
                      inputProps={{ min: 0, step: "0.01" }}
                      error={!!error}
                      helperText={error?.message}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="makingCharges"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Making Charges (₹)"
                      fullWidth
                      margin="normal"
                      type="number"
                      inputProps={{ min: 0, step: "0.01" }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="gst"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="GST (%)"
                      fullWidth
                      margin="normal"
                      type="number"
                      inputProps={{ min: 0, step: "0.01" }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="otherCharges"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Other Charges (₹)"
                      fullWidth
                      margin="normal"
                      type="number"
                      inputProps={{ min: 0, step: "0.01" }}
                    />
                  )}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Controller
                  name="effectiveDate"
                  control={control}
                  rules={{ required: 'Effective date is required' }}
                  render={({ field, fieldState: { error } }) => (
                    <TextField
                      {...field}
                      label="Effective Date"
                      type="date"
                      fullWidth
                      margin="normal"
                      InputLabelProps={{ shrink: true }}
                      error={!!error}
                      helperText={error?.message}
                    />
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
                      margin="normal"
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
            <Button type="submit" variant="contained" color="primary">
              {selectedPrice ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
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

export default Prices; 