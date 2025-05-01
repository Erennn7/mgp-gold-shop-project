import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { Box, CircularProgress } from '@mui/material';
import Layout from './components/Layout/Layout';
import { useAuth } from './store/AuthContext';
import { useDatabase } from './store/DatabaseContext';

// Lazy load pages for better performance
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Prices = React.lazy(() => import('./pages/Prices'));
const Products = React.lazy(() => import('./pages/Products'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Purchases = React.lazy(() => import('./pages/Purchases'));
const PurchaseDetail = React.lazy(() => import('./pages/PurchaseDetail'));
// Uncomment NewPurchase import
const NewPurchase = React.lazy(() => import('./pages/NewPurchase'));
const Loans = React.lazy(() => import('./pages/Loans'));
// Comment out the LoanDetail route
// <Route path="loans/:id" element={<LoanDetail />} />
// import NewLoan from './pages/NewLoan';
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Loading component
const LoadingComponent = () => {
  const theme = useTheme();
  
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor={theme.palette.background.default}
    >
      <CircularProgress color="primary" />
    </Box>
  );
};

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingComponent />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  const { initialize, isInitialized } = useDatabase();
  const [isAppReady, setIsAppReady] = useState(false);
  
  // Initialize the database
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize the database before showing the UI
        await initialize();
        setIsAppReady(true);
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };
    
    initApp();
  }, [initialize]);
  
  if (!isAppReady || !isInitialized) {
    return <LoadingComponent />;
  }
  
  return (
    <React.Suspense fallback={<LoadingComponent />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="prices" element={<Prices />} />
          <Route path="products" element={<Products />} />
          <Route path="customers" element={<Customers />} />
          <Route path="purchases" element={<Purchases />} />
          <Route path="purchases/new" element={<NewPurchase />} />
          <Route path="purchases/:id" element={<PurchaseDetail />} />
          <Route path="loans" element={<Loans />} />
          {/* <Route path="loans/new" element={<NewLoan />} /> */}
          {/* Comment out the LoanDetail route */}
          {/* <Route path="loans/:id" element={<LoanDetail />} /> */}
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </React.Suspense>
  );
}

export default App; 