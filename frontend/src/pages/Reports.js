import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
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
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
  IconButton
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import PrintIcon from '@mui/icons-material/Print';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileExcelIcon from '@mui/icons-material/InsertDriveFile';
import { format } from 'date-fns';
import axios from 'axios';
import { openDB } from 'idb';

const Reports = () => {
  const [tabValue, setTabValue] = useState(0);
  const [reportType, setReportType] = useState('inventory');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({ 
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)), 
    endDate: new Date() 
  });
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const { control, register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    defaultValues: {
      reportType: 'inventory',
      itemCategory: 'all',
      paymentMethod: 'all',
      customerId: '',
      itemId: '',
    }
  });

  const selectedReportType = watch('reportType');

  // Monitor online status
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
      fetchReportData();
    }
    
    function handleOffline() {
      setIsOffline(true);
      fetchReportData();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch report data based on the selected tab and filters
  useEffect(() => {
    fetchReportData();
  }, [tabValue, reportType]);

  const fetchReportData = async () => {
    setLoading(true);

    try {
      // Define the report types based on tab value
      const reportTypes = ['inventory', 'sales', 'purchases', 'loans'];
      const currentReportType = reportTypes[tabValue];
      setReportType(currentReportType);

      if (!isOffline) {
        // Online mode - fetch from API
        const response = await axios.get(`/api/reports/${currentReportType}`, {
          params: {
            startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
            endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
            // Add other filters based on form values
          }
        });
        
        setReportData(response.data);
        
        // Cache data in IndexedDB
        const db = await openDB('jewelryShopDB', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('reports')) {
              db.createObjectStore('reports', { keyPath: 'id', autoIncrement: true });
            }
          },
        });
        
        const tx = db.transaction('reports', 'readwrite');
        await tx.store.put({
          type: currentReportType,
          data: response.data,
          timestamp: new Date().toISOString()
        });
        await tx.done;
        
      } else {
        // Offline mode - fetch from IndexedDB
        const db = await openDB('jewelryShopDB', 1);
        const reportData = await db.getAll('reports');
        const filteredData = reportData.filter(item => item.type === currentReportType);
        
        if (filteredData.length > 0) {
          // Sort by timestamp desc and get the latest
          filteredData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          setReportData(filteredData[0].data);
        } else {
          setReportData([]);
        }
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch report data',
        severity: 'error'
      });
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleDateChange = (type, date) => {
    setDateRange(prev => ({
      ...prev,
      [type]: date
    }));
  };

  const generateReport = (data) => {
    // Filter report data based on form inputs
    fetchReportData();
  };

  const handleExportPDF = () => {
    setSnackbar({
      open: true,
      message: 'Exporting PDF...',
      severity: 'info'
    });
    // Implementation for PDF export would go here
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    setSnackbar({
      open: true,
      message: 'Exporting Excel file...',
      severity: 'info'
    });
    // Implementation for Excel export would go here
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Render table based on report type
  const renderReportTable = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (reportData.length === 0) {
      return (
        <Typography variant="body1" sx={{ textAlign: 'center', p: 3 }}>
          No data available for the selected report type and filters.
        </Typography>
      );
    }

    // Different table layouts based on report type
    switch (reportType) {
      case 'inventory':
        return (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item ID</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Cost Value</TableCell>
                  <TableCell>Selling Value</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((item) => (
                  <TableRow key={item.id || item._id}>
                    <TableCell>{item.id || item._id}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.stock}</TableCell>
                    <TableCell>₹{item.costPrice?.toFixed(2)}</TableCell>
                    <TableCell>₹{item.sellingPrice?.toFixed(2)}</TableCell>
                    <TableCell>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      
      case 'sales':
        return (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Invoice #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Total Amount</TableCell>
                  <TableCell>Payment Method</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((sale) => (
                  <TableRow key={sale.id || sale._id}>
                    <TableCell>{sale.invoiceNumber}</TableCell>
                    <TableCell>{new Date(sale.date).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.customer?.name || 'Walk-in'}</TableCell>
                    <TableCell>{sale.items?.length || 0}</TableCell>
                    <TableCell>₹{sale.totalAmount?.toFixed(2)}</TableCell>
                    <TableCell>{sale.paymentMethod}</TableCell>
                    <TableCell>{sale.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      
      case 'purchases':
        return (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Purchase #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Total Cost</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((purchase) => (
                  <TableRow key={purchase.id || purchase._id}>
                    <TableCell>{purchase.purchaseNumber}</TableCell>
                    <TableCell>{new Date(purchase.date).toLocaleDateString()}</TableCell>
                    <TableCell>{purchase.supplier?.name}</TableCell>
                    <TableCell>{purchase.items?.length || 0}</TableCell>
                    <TableCell>₹{purchase.totalCost?.toFixed(2)}</TableCell>
                    <TableCell>{purchase.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      
      case 'loans':
        return (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Loan #</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell>Item</TableCell>
                  <TableCell>Principal</TableCell>
                  <TableCell>Interest Rate</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reportData.map((loan) => (
                  <TableRow key={loan.id || loan._id}>
                    <TableCell>{loan.loanNumber}</TableCell>
                    <TableCell>{new Date(loan.startDate).toLocaleDateString()}</TableCell>
                    <TableCell>{loan.customer?.name}</TableCell>
                    <TableCell>{loan.item?.name || loan.itemDescription}</TableCell>
                    <TableCell>₹{loan.principalAmount?.toFixed(2)}</TableCell>
                    <TableCell>{loan.interestRate}%</TableCell>
                    <TableCell>{loan.durationMonths} months</TableCell>
                    <TableCell>{loan.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        );
      
      default:
        return (
          <Typography variant="body1" sx={{ textAlign: 'center', p: 3 }}>
            Select a report type to view data.
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Reports
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Inventory" />
          <Tab label="Sales" />
          <Tab label="Purchases" />
          <Tab label="Loans" />
        </Tabs>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit(generateReport)}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6">Report Filters</Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Controller
                name="reportType"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Report Type</InputLabel>
                    <Select {...field} label="Report Type">
                      {tabValue === 0 && (
                        <>
                          <MenuItem value="inventory">All Inventory</MenuItem>
                          <MenuItem value="low_stock">Low Stock</MenuItem>
                          <MenuItem value="inventory_value">Inventory Value</MenuItem>
                        </>
                      )}
                      {tabValue === 1 && (
                        <>
                          <MenuItem value="sales">All Sales</MenuItem>
                          <MenuItem value="sales_by_item">Sales by Item</MenuItem>
                          <MenuItem value="sales_by_customer">Sales by Customer</MenuItem>
                        </>
                      )}
                      {tabValue === 2 && (
                        <>
                          <MenuItem value="purchases">All Purchases</MenuItem>
                          <MenuItem value="purchases_by_supplier">Purchases by Supplier</MenuItem>
                          <MenuItem value="purchases_by_item">Purchases by Item</MenuItem>
                        </>
                      )}
                      {tabValue === 3 && (
                        <>
                          <MenuItem value="loans">All Loans</MenuItem>
                          <MenuItem value="active_loans">Active Loans</MenuItem>
                          <MenuItem value="expired_loans">Expired Loans</MenuItem>
                        </>
                      )}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>

            {/* Conditional filters based on the report type */}
            {selectedReportType === 'sales_by_item' && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Item ID"
                  {...register('itemId')}
                  error={!!errors.itemId}
                  helperText={errors.itemId?.message}
                />
              </Grid>
            )}

            {selectedReportType === 'sales_by_customer' && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Customer ID"
                  {...register('customerId')}
                  error={!!errors.customerId}
                  helperText={errors.customerId?.message}
                />
              </Grid>
            )}

            {selectedReportType === 'purchases_by_supplier' && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Supplier ID"
                  {...register('supplierId')}
                  error={!!errors.supplierId}
                  helperText={errors.supplierId?.message}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={fetchReportData}
                  disabled={loading}
                >
                  Refresh
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<CloudDownloadIcon />}
                  disabled={loading}
                >
                  Generate Report
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            {reportType === 'inventory' && 'Inventory Report'}
            {reportType === 'sales' && 'Sales Report'}
            {reportType === 'purchases' && 'Purchases Report'}
            {reportType === 'loans' && 'Loans Report'}
          </Typography>
          <Box>
            <IconButton color="primary" onClick={handleExportPDF} title="Export as PDF">
              <PictureAsPdfIcon />
            </IconButton>
            <IconButton color="primary" onClick={handlePrint} title="Print">
              <PrintIcon />
            </IconButton>
            <IconButton color="primary" onClick={handleExportExcel} title="Export as Excel">
              <FileExcelIcon />
            </IconButton>
          </Box>
        </Box>

        {isOffline && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            You are currently offline. The report data shown may not be up to date.
          </Alert>
        )}

        {renderReportTable()}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Reports; 