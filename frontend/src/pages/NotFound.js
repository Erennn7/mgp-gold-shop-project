import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, Container } from '@mui/material';

const NotFound = () => {
  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          py: 4
        }}
      >
        <Typography variant="h1" color="primary" sx={{ fontWeight: 'bold', fontSize: '7rem' }}>
          404
        </Typography>
        
        <Typography variant="h4" sx={{ mb: 3 }}>
          Page Not Found
        </Typography>
        
        <Typography variant="body1" color="textSecondary" sx={{ mb: 4, maxWidth: 500 }}>
          The page you are looking for doesn't exist or has been moved.
        </Typography>
        
        <Button
          component={RouterLink}
          to="/"
          variant="contained"
          color="primary"
          size="large"
        >
          Go to Dashboard
        </Button>
      </Box>
    </Container>
  );
};

export default NotFound; 