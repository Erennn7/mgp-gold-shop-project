import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Card,
  CardContent,
  CardHeader,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  ArrowBack,
  Receipt,
  Print,
  Edit,
  Person,
  Phone,
  Email,
  LocationOn,
  ShoppingBasket,
  Payment,
  CalendarToday,
  PictureAsPdf
} from '@mui/icons-material';
import { format } from 'date-fns';
import api from '../utils/api';
import { useDatabase } from '../store/DatabaseContext';
import { getNetworkStatus } from '../utils/networkStatus';
import InvoiceActions from '../components/Sales/InvoiceActions';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const SaleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printComponentRef = useRef();
  
  // State
  const [sale, setSale] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    paymentStatus: '',
    paymentMethod: '',
    notes: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Get database context
  const { db } = useDatabase();

  // Effect to fetch sale on mount
  useEffect(() => {
    fetchSaleDetail();
  }, [id]);

  // Function to fetch sale detail from API or IndexedDB
  const fetchSaleDetail = async () => {
    setLoading(true);
    try {
      // Check network status
      const online = await getNetworkStatus();
      setIsOffline(!online);

      if (online) {
        // If online, fetch from API
        const response = await api.get(`/api/sales/${id}`);
        if (response.data.success) {
          setSale(response.data.data);
          setCustomer(response.data.data.customer);
          setEditData({
            paymentStatus: response.data.data.paymentStatus,
            paymentMethod: response.data.data.paymentMethod,
            notes: response.data.data.notes || ''
          });
        }
      } else {
        // If offline, fetch from IndexedDB
        if (db) {
          const cachedSale = await db.sales
            .where('_id')
            .equals(id)
            .or('id')
            .equals(id)
            .first();
          
          if (cachedSale) {
            setSale(cachedSale);
            setCustomer(cachedSale.customer);
            setEditData({
              paymentStatus: cachedSale.paymentStatus,
              paymentMethod: cachedSale.paymentMethod,
              notes: cachedSale.notes || ''
            });
          } else {
            throw new Error('Sale not found in cache');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching sale details:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.message || 'Failed to load sale details'}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle email dialog open
  const handleOpenEmailDialog = () => {
    setEmailAddress(customer?.email || '');
    setShowEmailDialog(true);
  };

  // Handle email dialog close
  const handleCloseEmailDialog = () => {
    setShowEmailDialog(false);
    setEmailAddress('');
  };

  // Send receipt by email
  const handleSendEmail = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot send email while offline',
          severity: 'error'
        });
        handleCloseEmailDialog();
        return;
      }

      const response = await api.post(`/api/sales/${id}/send-receipt`, {
        email: emailAddress
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Receipt sent successfully',
          severity: 'success'
        });
        
        // Update sale with receiptSent status
        setSale(prevSale => ({
          ...prevSale,
          receiptSent: true,
          receiptSentTo: emailAddress
        }));
      }
      
      handleCloseEmailDialog();
    } catch (error) {
      console.error('Error sending receipt:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to send receipt'}`,
        severity: 'error'
      });
      
      handleCloseEmailDialog();
    }
  };

  // Download receipt
  const handleDownloadReceipt = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot generate receipt while offline',
          severity: 'warning'
        });
        return;
      }

      const response = await api.get(`/api/sales/${id}/invoice`);
      
      if (response.data.success) {
        // Open the PDF in a new window
        const pdfUrl = response.data.data.downloadUrl;
        const fullUrl = `${window.location.origin}${pdfUrl}`;
        
        // Open in a new window
        const newWindow = window.open(fullUrl, '_blank');
        
        // If popup blocked, provide direct link
        if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
          setSnackbar({
            open: true,
            message: 'Popup blocked. Please allow popups or use direct link.',
            severity: 'warning'
          });
        }
      }
    } catch (error) {
      console.error('Error generating receipt:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to generate receipt'}`,
        severity: 'error'
      });
    }
  };

  // Handle edit mode toggle
  const handleToggleEditMode = () => {
    if (editMode) {
      // Cancel edit mode
      setEditData({
        paymentStatus: sale.paymentStatus,
        paymentMethod: sale.paymentMethod,
        notes: sale.notes || ''
      });
    }
    
    setEditMode(!editMode);
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData({
      ...editData,
      [name]: value
    });
  };

  // Save edited sale
  const handleSaveEdit = async () => {
    try {
      // Check network status
      const online = await getNetworkStatus();
      
      if (!online) {
        setSnackbar({
          open: true,
          message: 'Cannot update sale while offline',
          severity: 'error'
        });
        return;
      }

      const response = await api.put(`/api/sales/${id}`, editData);
      
      if (response.data.success) {
        setSale(prevSale => ({
          ...prevSale,
          ...editData
        }));
        
        setSnackbar({
          open: true,
          message: 'Sale updated successfully',
          severity: 'success'
        });
        
        setEditMode(false);
      }
    } catch (error) {
      console.error('Error updating sale:', error);
      
      setSnackbar({
        open: true,
        message: `Error: ${error.response?.data?.message || error.message || 'Failed to update sale'}`,
        severity: 'error'
      });
    }
  };

  // Navigate back
  const handleBack = () => {
    navigate(-1);
  };

  // Navigate to customer details
  const handleViewCustomer = () => {
    navigate(`/customers?id=${customer._id}`);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Calculate total for an item
  const calculateItemTotal = (item) => {
    return item.weight * item.pricePerGram + item.makingCharges;
  };

  // Generate and download PDF
  const handleGeneratePDF = () => {
    try {
      if (!sale) return;
      
      // Create a new PDF document
      const doc = new jsPDF();
      
      // Add shop logo/name
      doc.setFontSize(20);
      doc.setTextColor(183, 132, 25); // Gold color
      doc.setFont("helvetica", "bold");
      doc.text("MG Potdar Jewellers", 105, 20, { align: "center" });
      
      // Add shop address
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text("123 Main Street, Solapur, Maharashtra - 413001", 105, 28, { align: "center" });
      doc.text("Phone: +91 987-654-3210 | Email: info@mgpotdar.com", 105, 34, { align: "center" });
      
      // Add a decorative border
      doc.setDrawColor(183, 132, 25); // Gold color
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 30);
      
      // Add a flourish
      doc.setLineWidth(0.3);
      doc.line(15, 45, 195, 45);
      
      // Add invoice title
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("SALES INVOICE", 105, 55, { align: "center" });
      
      // Add invoice details
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Invoice Number: ", 15, 65);
      doc.setFont("helvetica", "normal");
      doc.text(sale.invoiceNumber || "-", 50, 65);
      
      doc.setFont("helvetica", "bold");
      doc.text("Date: ", 15, 72);
      doc.setFont("helvetica", "normal");
      doc.text(format(new Date(sale.saleDate || sale.createdAt), "dd/MM/yyyy"), 50, 72);
      
      // Add payment status
      doc.setFont("helvetica", "bold");
      doc.text("Payment Status: ", 130, 65);
      doc.setFont("helvetica", "normal");
      doc.text(sale.paymentStatus || "Pending", 175, 65);
      
      doc.setFont("helvetica", "bold");
      doc.text("Payment Method: ", 130, 72);
      doc.setFont("helvetica", "normal");
      doc.text(sale.paymentMethod || "-", 175, 72);
      
      // Add customer details
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 15, 85);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Name: ", 15, 92);
      doc.setFont("helvetica", "normal");
      doc.text(customer?.name || "Guest Customer", 40, 92);
      
      if (customer?.phone) {
        doc.setFont("helvetica", "bold");
        doc.text("Phone: ", 15, 99);
        doc.setFont("helvetica", "normal");
        doc.text(customer.phone, 40, 99);
      }
      
      if (customer?.email) {
        doc.setFont("helvetica", "bold");
        doc.text("Email: ", 15, 106);
        doc.setFont("helvetica", "normal");
        doc.text(customer.email, 40, 106);
      }
      
      // Add items table
      const items = sale.items || [];
      const tableColumn = [
        "Item", 
        "Metal", 
        "Purity", 
        "Weight (g)", 
        "Rate (₹/g)", 
        "Making (₹)", 
        "Price (₹)"
      ];
      
      const tableRows = items.map(item => [
        item.product ? item.product.name : (item.name || 'Small Item'),
        item.metalType || '-',
        item.purity || '-',
        item.weight ? item.weight.toFixed(3) : '-',
        item.pricePerGram ? item.pricePerGram.toLocaleString('en-IN') : '-',
        item.makingCharges ? item.makingCharges.toLocaleString('en-IN') : '0',
        calculateItemTotal(item).toLocaleString('en-IN')
      ]);
      
      // Add items table using autotable
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 115,
        theme: 'grid',
        headStyles: { 
          fillColor: [183, 132, 25],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        }
      });
      
      // Get final Y position after the table
      const finalY = doc.previousAutoTable.finalY + 10;
      
      doc.setFont("helvetica", "bold");
      doc.text("Subtotal:", 140, finalY);
      doc.setFont("helvetica", "normal");
      doc.text(`₹ ${sale.subtotal.toLocaleString('en-IN')}`, 180, finalY, { align: "right" });
      
      if (sale.discount && sale.discount > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Discount:", 140, finalY + 7);
        doc.setFont("helvetica", "normal");
        doc.text(`₹ ${sale.discount.toLocaleString('en-IN')}`, 180, finalY + 7, { align: "right" });
      }
      
      if (sale.taxAmount && sale.taxAmount > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Tax (GST):", 140, finalY + 14);
        doc.setFont("helvetica", "normal");
        doc.text(`₹ ${sale.taxAmount.toLocaleString('en-IN')}`, 180, finalY + 14, { align: "right" });
      }
      
      // Add total
      doc.setLineWidth(0.5);
      doc.line(140, finalY + 18, 190, finalY + 18);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("TOTAL:", 140, finalY + 25);
      doc.setTextColor(183, 132, 25); // Gold color
      doc.text(`₹ ${(sale.totalAmount || sale.total).toLocaleString('en-IN')}`, 180, finalY + 25, { align: "right" });
      
      // Add terms and conditions
      const termsY = finalY + 40;
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Terms & Conditions:", 15, termsY);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const terms = [
        "1. All sold items are final, no returns or exchanges.",
        "2. Gold rate is calculated based on the day's market rate.",
        "3. Purity certificate is provided for all hallmarked jewelry.",
        "4. For queries, please contact us at +91 987-654-3210."
      ];
      
      terms.forEach((term, i) => {
        doc.text(term, 15, termsY + 7 + (i * 5));
      });
      
      // Add thank you note
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text("Thank you for your business!", 105, termsY + 35, { align: "center" });
      
      // Add decorative footer
      doc.setDrawColor(183, 132, 25); // Gold color
      doc.setLineWidth(0.3);
      doc.line(15, termsY + 40, 195, termsY + 40);
      
      // Save the PDF
      doc.save(`Invoice-${sale.invoiceNumber || id}.pdf`);
      
      setSnackbar({
        open: true,
        message: 'Invoice PDF generated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      setSnackbar({
        open: true,
        message: `Failed to generate PDF: ${error.message}`,
        severity: 'error'
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!sale) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Sale not found</Alert>
        <Button
          variant="contained"
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBack />}
          onClick={handleBack}
        >
          Back to Sales
        </Button>
        
        <Box>
          {isOffline && (
            <Alert severity="warning" sx={{ mb: 2, display: 'inline-flex', mr: 2 }}>
              You are offline. Some features may be limited.
            </Alert>
          )}
          {!editMode && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleToggleEditMode}
              sx={{ ml: 1 }}
            >
              Edit
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Sale Header */}
      <Box ref={printComponentRef}>
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h4" gutterBottom>
                Invoice: {sale.invoiceNumber}
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CalendarToday fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1">
                  Date: {format(new Date(sale.createdAt), 'dd MMM yyyy, h:mm a')}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Payment fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1">
                  Payment: {sale.paymentMethod.charAt(0).toUpperCase() + sale.paymentMethod.slice(1)}
                </Typography>
                <Chip 
                  label={sale.paymentStatus.charAt(0).toUpperCase() + sale.paymentStatus.slice(1)} 
                  color={
                    sale.paymentStatus === 'completed' ? 'success' :
                    sale.paymentStatus === 'pending' ? 'error' : 'warning'
                  }
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
              
              {sale.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Notes: {sale.notes}
                  </Typography>
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Box>
                <Typography variant="h6" gutterBottom>Customer</Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Person fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body1">{customer.name}</Typography>
                </Box>
                
                {customer.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Phone fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body1">{customer.phone}</Typography>
                  </Box>
                )}
                
                {customer.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Email fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body1">{customer.email}</Typography>
                  </Box>
                )}
                
                {customer.address && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body1">{customer.address}</Typography>
                  </Box>
                )}
                
                <Button
                  variant="text"
                  size="small"
                  onClick={handleViewCustomer}
                  sx={{ mt: 1 }}
                >
                  View Customer Details
                </Button>
              </Box>
            </Grid>
          </Grid>
          
          {/* Edit Form */}
          {editMode && (
            <Box sx={{ mt: 3 }}>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>Edit Sale</Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Payment Status</InputLabel>
                    <Select
                      name="paymentStatus"
                      value={editData.paymentStatus}
                      onChange={handleEditChange}
                      label="Payment Status"
                    >
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="partial">Partial</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      name="paymentMethod"
                      value={editData.paymentMethod}
                      onChange={handleEditChange}
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
                
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    name="notes"
                    label="Notes"
                    value={editData.notes}
                    onChange={handleEditChange}
                  />
                </Grid>
                
                <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={handleToggleEditMode}
                    sx={{ mr: 1 }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained" 
                    onClick={handleSaveEdit}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </Paper>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <Card variant="outlined">
              <CardHeader title="Receipt Actions" />
              <Divider />
              <CardContent>
                <Button
                  variant="outlined"
                  startIcon={<Print />}
                  onClick={handleDownloadReceipt}
                  sx={{ mr: 2 }}
                >
                  Print Receipt
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Email />}
                  onClick={handleOpenEmailDialog}
                  disabled={!customer.email}
                >
                  Email Receipt
                </Button>
                
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<PictureAsPdf />}
                  onClick={handleGeneratePDF}
                  sx={{ ml: 2 }}
                >
                  Generate PDF Bill
                </Button>
                
                {sale.receiptSent && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Receipt sent to: {sale.receiptSentTo}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardHeader title="Sale Summary" />
              <Divider />
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Subtotal:</Typography>
                  <Typography variant="body1">{formatCurrency(sale.subtotal)}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">Discount:</Typography>
                  <Typography variant="body1">{formatCurrency(sale.discount)}</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1">GST:</Typography>
                  <Typography variant="body1">{formatCurrency(sale.gst)}</Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total:</Typography>
                  <Typography variant="h6" color="primary.main">{formatCurrency(sale.totalAmount)}</Typography>
                </Box>

                <Typography variant="subtitle1">
                  Total Gold Weight: {sale.items
                    .filter(item => item.metalType === 'gold')
                    .reduce((total, item) => total + ((parseFloat(item.netWeight) || parseFloat(item.weight) || 0) * (parseInt(item.quantity) || 1)), 0)
                    .toFixed(3)} g
                </Typography>
                <Typography variant="subtitle1">
                  Total Silver Weight: {sale.items
                    .filter(item => item.metalType === 'silver')
                    .reduce((total, item) => total + ((parseFloat(item.netWeight) || parseFloat(item.weight) || 0) * (parseInt(item.quantity) || 1)), 0)
                    .toFixed(3)} g
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Sale Items */}
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Items
          </Typography>
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell>Metal Type</TableCell>
                  <TableCell>Purity</TableCell>
                  <TableCell align="right">Net Weight (g)</TableCell>
                  <TableCell align="right">Gross Weight (g)</TableCell>
                  <TableCell align="right">Rate/g</TableCell>
                  <TableCell align="right">Making</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sale.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      {item.name} 
                      {item.hoid && <Typography variant="caption" display="block" color="textSecondary">({item.hoid})</Typography>}
                    </TableCell>
                    <TableCell>{item.metalType}</TableCell>
                    <TableCell>{item.purity}</TableCell>
                    <TableCell align="right">{parseFloat(item.netWeight || item.weight).toFixed(3)}</TableCell>
                    <TableCell align="right">{parseFloat(item.grossWeight || item.weight).toFixed(3)}</TableCell>
                    <TableCell align="right">₹{parseFloat(item.pricePerGram).toFixed(2)}</TableCell>
                    <TableCell align="right">
                      ₹{parseFloat(item.makingCharges).toFixed(2)}
                      {item.hasStones && item.stonePrice > 0 && (
                        <Typography variant="caption" display="block" color="textSecondary">
                          Stone: ₹{parseFloat(item.stonePrice).toFixed(2)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">₹{parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
      
      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onClose={handleCloseEmailDialog}>
        <DialogTitle>Send Invoice via Email</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Email Address"
            type="email"
            fullWidth
            variant="outlined"
            value={emailAddress}
            onChange={(e) => setEmailAddress(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailDialog}>Cancel</Button>
          <Button onClick={handleSendEmail} variant="contained" color="primary">
            Send
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar */}
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

export default SaleDetail; 