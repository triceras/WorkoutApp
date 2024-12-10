// src/pages/LandingPage.jsx

import React, { useState, useEffect } from 'react';
import {
  Button,
  Box,
  Typography,
  Container,
  Dialog,
  DialogContent,
  TextField,
  IconButton,
  DialogTitle,
  useTheme,
  useMediaQuery,
  Paper,
  Link as MuiLink,
  AppBar,
  Toolbar,
  Grid,
  Card,
  CardContent,
  Fade,
  Slide
} from '@mui/material';
import { makeStyles } from '@mui/styles';
import { Link, useNavigate } from 'react-router-dom';
import CloseIcon from '@mui/icons-material/Close';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import TimelineIcon from '@mui/icons-material/Timeline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import HeroImage from '../assets/WorkoutPlanAi.png';
import axiosInstance from '../api/axiosInstance';

const useStyles = makeStyles((theme) => ({
  appBar: {
    background: 'transparent',
    boxShadow: 'none',
    position: 'absolute',
    zIndex: 1,
  },
  logo: {
    flexGrow: 1,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: '1.5rem',
    textDecoration: 'none',
  },
  heroSection: {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${HeroImage})`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: '#000',
    minHeight: '70vh',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    color: '#fff',
    padding: '2rem 0',
  },
  heroContent: {
    textAlign: 'center',
    padding: '1rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  ctaButton: {
    marginTop: '1.5rem',
    padding: '0.8rem 2.5rem',
    fontSize: '1.1rem',
    background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
    '&:hover': {
      background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)',
      transform: 'scale(1.05)',
      transition: 'all 0.3s ease-in-out',
    },
  },
  featureSection: {
    padding: '5rem 0',
    background: '#f5f5f5',
  },
  featureCard: {
    height: '100%',
    textAlign: 'center',
    transition: 'transform 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-10px)',
    },
  },
  featureIcon: {
    fontSize: '3rem',
    color: '#FF6B6B',
    marginBottom: '1rem',
  },
  testimonialSection: {
    padding: '5rem 0',
    background: '#fff',
  },
  testimonialCard: {
    padding: '2rem',
    margin: '0 auto',
    maxWidth: '800px',
    position: 'relative',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    borderRadius: '15px',
  },
  testimonialNav: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    background: '#FF6B6B',
    color: '#fff',
    '&:hover': {
      background: '#FF8E53',
    },
  },
  navPrev: {
    left: '-20px',
  },
  navNext: {
    right: '-20px',
  },
  footer: {
    padding: '2rem 0',
    background: '#333',
    color: '#fff',
    textAlign: 'center',
  },
  dialogContent: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    marginTop: '20px',
  },
  loginButton: {
    color: '#fff',
    borderColor: '#fff',
    marginLeft: '1rem',
    '&:hover': {
      borderColor: '#FF6B6B',
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
    },
  },
}));

const testimonials = [
  {
    text: "This app transformed my fitness journey. The personalized plans are exactly what I needed!",
    author: "John Doe",
  },
  {
    text: "The AI-powered workout recommendations have helped me achieve my fitness goals faster than ever.",
    author: "Jane Smith",
  },
  {
    text: "Amazing app! The progress tracking feature keeps me motivated and accountable.",
    author: "Mike Johnson",
  },
];

function LoginDialog({ open, onClose }) {
  const classes = useStyles();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axiosInstance.post('/auth/login/', {
        username,
        password,
      });
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        onClose();
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>
        <Typography variant="h5" component="div" align="center" fontWeight="bold">
          Welcome Back
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        {error && (
          <Typography color="error" align="center">
            {error}
          </Typography>
        )}
        <form onSubmit={handleSubmit} className={classes.form}>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
              color: 'white',
              padding: '12px',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)',
              },
            }}
          >
            Login
          </Button>
        </form>
        <Typography variant="body2" align="center" sx={{ mt: 2 }}>
          Don't have an account?{' '}
          <MuiLink component={Link} to="/register" onClick={onClose} color="primary">
            Register here
          </MuiLink>
        </Typography>
      </DialogContent>
    </Dialog>
  );
}

function LandingPage() {
  const classes = useStyles();
  const [loginOpen, setLoginOpen] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  const handleLoginOpen = () => setLoginOpen(true);
  const handleLoginClose = () => setLoginOpen(false);

  const handleNextTestimonial = () => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      setFadeIn(true);
    }, 300);
  };

  const handlePrevTestimonial = () => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
      setFadeIn(true);
    }, 300);
  };

  return (
    <Box>
      {/* Navigation */}
      <AppBar className={classes.appBar}>
        <Toolbar>
          <Typography
            component={Link}
            to="/"
            className={classes.logo}
            variant="h6"
          >
            MyFitnessApp
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="outlined"
            onClick={handleLoginOpen}
            className={classes.loginButton}
          >
            LOGIN
          </Button>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            sx={{
              ml: 2,
              background: 'linear-gradient(45deg, #FF6B6B 30%, #FF8E53 90%)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FF8E53 30%, #FF6B6B 90%)',
              },
            }}
          >
            Register
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box className={classes.heroSection}>
        <Slide direction="up" in={true} timeout={1000}>
          <Container maxWidth="md">
            <Box className={classes.heroContent}>
              <Typography variant="h2" component="h1" gutterBottom>
                Achieve Your Fitness Goals Faster
              </Typography>
              <Typography variant="h5" component="p" gutterBottom>
                Personalized workout plans tailored to your needs.
                Start your transformation today.
              </Typography>
              <Button
                variant="contained"
                component={Link}
                to="/register"
                className={classes.ctaButton}
              >
                Get Started
              </Button>
            </Box>
          </Container>
        </Slide>
      </Box>

      {/* Features Section */}
      <Box className={classes.featureSection}>
        <Container>
          <Typography variant="h3" align="center" gutterBottom>
            Features
          </Typography>
          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={4}>
              <Fade in={true} timeout={1000}>
                <Card className={classes.featureCard}>
                  <CardContent>
                    <FitnessCenterIcon className={classes.featureIcon} />
                    <Typography variant="h5" gutterBottom>
                      Personalized Plans
                    </Typography>
                    <Typography>
                      Get workout plans tailored to your fitness level and goals.
                    </Typography>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
            <Grid item xs={12} md={4}>
              <Fade in={true} timeout={1500}>
                <Card className={classes.featureCard}>
                  <CardContent>
                    <TimelineIcon className={classes.featureIcon} />
                    <Typography variant="h5" gutterBottom>
                      Track Progress
                    </Typography>
                    <Typography>
                      Monitor your improvements over time with detailed analytics.
                    </Typography>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
            <Grid item xs={12} md={4}>
              <Fade in={true} timeout={2000}>
                <Card className={classes.featureCard}>
                  <CardContent>
                    <AccessTimeIcon className={classes.featureIcon} />
                    <Typography variant="h5" gutterBottom>
                      Flexible Scheduling
                    </Typography>
                    <Typography>
                      Fit workouts into your busy schedule with ease.
                    </Typography>
                  </CardContent>
                </Card>
              </Fade>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box className={classes.testimonialSection}>
        <Container>
          <Typography variant="h3" align="center" gutterBottom>
            What Our Users Say
          </Typography>
          <Box position="relative">
            <Fade in={fadeIn} timeout={300}>
              <Card className={classes.testimonialCard}>
                <CardContent>
                  <Typography variant="h6" align="center" paragraph>
                    {testimonials[currentTestimonial].text}
                  </Typography>
                  <Typography variant="subtitle1" align="center" color="primary">
                    - {testimonials[currentTestimonial].author}
                  </Typography>
                </CardContent>
              </Card>
            </Fade>
            <IconButton
              className={`${classes.testimonialNav} ${classes.navPrev}`}
              onClick={handlePrevTestimonial}
            >
              <NavigateBeforeIcon />
            </IconButton>
            <IconButton
              className={`${classes.testimonialNav} ${classes.navNext}`}
              onClick={handleNextTestimonial}
            >
              <NavigateNextIcon />
            </IconButton>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box className={classes.footer}>
        <Container>
          <Typography>
            {new Date().getFullYear()} MyFitnessApp. All rights reserved.
          </Typography>
        </Container>
      </Box>

      {/* Login Dialog */}
      <LoginDialog open={loginOpen} onClose={handleLoginClose} />
    </Box>
  );
}

export default LandingPage;
