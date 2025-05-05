import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Grid,
  Button,
  Paper
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const CalculatorButton = styled(Button)(({ theme }) => ({
  minWidth: '60px',
  height: '60px',
  fontSize: '1.5rem',
  fontWeight: 'bold',
  borderRadius: '30px',
  margin: '4px',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '&.operator': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
  '&.equals': {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.secondary.contrastText,
  },
  '&.clear': {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  }
}));

const Calculator = ({ open, onClose }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);
  const [lastOperator, setLastOperator] = useState(null);

  const handleNumber = (number) => {
    if (isNewNumber) {
      setDisplay(number);
      setIsNewNumber(false);
    } else {
      setDisplay(display + number);
    }
  };

  const handleOperator = (operator) => {
    if (lastOperator) {
      calculateResult();
    }
    setEquation(display + ' ' + operator + ' ');
    setLastOperator(operator);
    setIsNewNumber(true);
  };

  const calculateResult = () => {
    try {
      const num1 = parseFloat(equation.split(' ')[0]);
      const num2 = parseFloat(display);
      let result;

      switch (lastOperator) {
        case '+':
          result = num1 + num2;
          break;
        case '-':
          result = num1 - num2;
          break;
        case '*':
          result = num1 * num2;
          break;
        case '/':
          if (num2 === 0) {
            throw new Error('Division by zero');
          }
          result = num1 / num2;
          break;
        default:
          return;
      }

      // Format the result to avoid floating point issues
      result = parseFloat(result.toFixed(10));
      setDisplay(result.toString());
      setEquation('');
      setLastOperator(null);
      setIsNewNumber(true);
    } catch (error) {
      setDisplay('Error');
      setEquation('');
      setLastOperator(null);
      setIsNewNumber(true);
    }
  };

  const handleEquals = () => {
    if (lastOperator) {
      calculateResult();
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setLastOperator(null);
    setIsNewNumber(true);
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handlePercentage = () => {
    try {
      const result = parseFloat(display) / 100;
      setDisplay(result.toString());
    } catch (error) {
      setDisplay('Error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          backgroundColor: 'background.default'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: 'primary.main',
        color: 'primary.contrastText'
      }}>
        <Typography variant="h6">Calculator</Typography>
        <IconButton onClick={onClose} sx={{ color: 'primary.contrastText' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 2, 
            backgroundColor: 'background.paper',
            borderRadius: 2
          }}
        >
          <Box sx={{ mb: 2 }}>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ 
                minHeight: '20px',
                textAlign: 'right',
                fontFamily: 'monospace'
              }}
            >
              {equation}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                textAlign: 'right',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {display}
            </Typography>
          </Box>
          <Grid container spacing={1}>
            <Grid item xs={3}>
              <CalculatorButton 
                className="clear" 
                onClick={handleClear}
                fullWidth
              >
                C
              </CalculatorButton>
            </Grid>
            <Grid item xs={3}>
              <CalculatorButton 
                onClick={handlePercentage}
                fullWidth
              >
                %
              </CalculatorButton>
            </Grid>
            <Grid item xs={3}>
              <CalculatorButton 
                className="operator" 
                onClick={() => handleOperator('/')}
                fullWidth
              >
                ÷
              </CalculatorButton>
            </Grid>
            <Grid item xs={3}>
              <CalculatorButton 
                className="operator" 
                onClick={() => handleOperator('*')}
                fullWidth
              >
                ×
              </CalculatorButton>
            </Grid>
            {[7, 8, 9, '-', 4, 5, 6, '+', 1, 2, 3, '='].map((item, index) => (
              <Grid item xs={3} key={index}>
                <CalculatorButton
                  className={typeof item === 'string' ? 'operator' : ''}
                  onClick={() => {
                    if (typeof item === 'number') {
                      handleNumber(item.toString());
                    } else if (item === '=') {
                      handleEquals();
                    } else {
                      handleOperator(item);
                    }
                  }}
                  fullWidth
                >
                  {item}
                </CalculatorButton>
              </Grid>
            ))}
            <Grid item xs={6}>
              <CalculatorButton 
                onClick={() => handleNumber('0')}
                fullWidth
              >
                0
              </CalculatorButton>
            </Grid>
            <Grid item xs={3}>
              <CalculatorButton 
                onClick={handleDecimal}
                fullWidth
              >
                .
              </CalculatorButton>
            </Grid>
            <Grid item xs={3}>
              <CalculatorButton 
                className="equals" 
                onClick={handleEquals}
                fullWidth
              >
                =
              </CalculatorButton>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>
    </Dialog>
  );
};

export default Calculator; 