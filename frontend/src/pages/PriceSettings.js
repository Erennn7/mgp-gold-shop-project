import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const PriceSettings = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Price Settings
      </Typography>
      <Paper sx={{ p: 3, mt: 2 }}>
        <Typography variant="body1">
          The price settings feature is coming soon. This will allow you to configure pricing rules for various metals and purities.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PriceSettings; 