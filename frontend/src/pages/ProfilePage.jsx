// src/pages/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
  Typography,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  CircularProgress,
  Avatar,
  Tabs,
  Tab
} from '@mui/material';
// import CloudUploadIcon from '@mui/icons-material/CloudUpload';
// import SaveIcon from '@mui/icons-material/Save';
import { styled } from '@mui/material/styles';
import axiosInstance from '../api/axiosInstance';
import ProgressionMetrics from '../components/ProgressionMetrics';
// import UploadProfilePicture from '../components/UploadProfilePicture';

const StyledPaper = styled(Paper)(({ theme }) => ({
  borderRadius: '15px',
  background: 'linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%)',
  border: '1px solid rgba(33, 150, 243, 0.1)',
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const ProfileInfoItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(2),
  '& .label': {
    color: '#1976d2',
    fontWeight: 600,
    minWidth: '150px',
    marginRight: theme.spacing(2),
  },
  '& .value': {
    color: '#2D3748',
    fontWeight: 500,
  },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 150,
  height: 150,
  border: '4px solid white',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
}));

const WorkoutCard = styled(Paper)(({ theme, type }) => ({
  borderRadius: '15px',
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  background: type === 'CARDIO' 
    ? 'linear-gradient(135deg, #fff3e0 0%, #ffffff 100%)'
    : 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
  border: type === 'CARDIO'
    ? '1px solid rgba(245, 124, 0, 0.1)'
    : '1px solid rgba(76, 175, 80, 0.1)',
}));

const defaultProfilePicture = '/default-profile.png';

const ProfilePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('trainingSessions');
  const [expandedSessions, setExpandedSessions] = useState({});
  const [profileData, setProfileData] = useState({
    user: {
      first_name: '',
      last_name: '',
      age: '',
      member_since: '',
      id: '',
      profile_picture: null
    },
    training_sessions: []
  });

  // const [selectedFile, setSelectedFile] = useState(null);

  // Helper function to extract day number from day string
  const extractDayNumber = (dayString) => {
    const match = dayString.match(/Day (\d+)/i); // Case-insensitive match
    return match ? parseInt(match[1], 10) : null;
  };

  // Function to fetch profile data from the backend
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userResponse = await axiosInstance.get('user/');
      const progressionResponse = await axiosInstance.get('user/progression/');
      
      setProfileData({
        user: userResponse.data,
        training_sessions: progressionResponse.data.training_sessions || []
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError('Failed to load profile data');
      setLoading(false);
    }
  };

  // Function to fetch workout plans from the backend
  const fetchWorkoutPlans = async () => {
    try {
      const response = await axiosInstance.get('workout-plans/');
      const plans = response.data;

      // Process each workoutPlan to include dayNumber and type in workoutDays
      const processedPlans = plans.map((plan) => ({
        ...plan,
        workoutDays: plan.workoutDays.map((day) => ({
          ...day,
          dayNumber: extractDayNumber(day.day),
          type: day.day.toLowerCase().includes('rest') ? 'rest' : 'workout',
        })),
      }));

      console.log('Processed workoutPlans:', processedPlans); // Debugging
    } catch (err) {
      console.error('Error fetching workout plans:', err);
      setError('Failed to load workout plans.');
    }
  };

  // Fetch profile data and workout plans on component mount
  useEffect(() => {
    fetchProfileData();
    fetchWorkoutPlans();
  }, []);

  /*

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    try {
      const formData = new FormData();
      formData.append('profile_picture', selectedFile);

      const response = await axiosInstance.post('user/update-profile-picture/', formData);
      setProfileData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          profile_picture: response.data.profile_picture
        }
      }));
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    }
  };

  */

  const TrainingSessionsTab = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchSessions = async () => {
        try {
          const response = await axiosInstance.get('workout-plans/');
          console.log('API Response:', response.data);
          
          if (response.data && response.data.length > 0) {
            const currentPlan = response.data[0];
            console.log('Current Plan:', currentPlan);
            
            const scheduledSessions = currentPlan.workoutDays.map(day => {
              // Extract the raw day data
              console.log('Raw day data:', day);
              
              // Create the session object
              const session = {
                id: `scheduled_${day.day}`,
                date: new Date(),
                session_name: day.day,
                workout_type: day.workout_type,
                type: day.type,
                exercises: Array.isArray(day.exercises) ? day.exercises.map(exercise => {
                  console.log('Raw exercise data:', exercise);
                  
                  const baseExercise = {
                    name: exercise.name,
                    duration: exercise.duration,
                    intensity: exercise.intensity?.toLowerCase() || 'low',
                    tracking_type: exercise.tracking_type || 'reps_based'
                  };

                  // For active recovery or time-based exercises
                  if (day.type === 'active_recovery' || exercise.tracking_type === 'time_based') {
                    return {
                      ...baseExercise,
                      duration: exercise.duration || '20-30 minutes',
                      intensity: exercise.intensity?.toLowerCase() || 'low'
                    };
                  }
                  
                  // For cardio exercises
                  if (exercise.exercise_type === 'cardio') {
                    return {
                      ...baseExercise,
                      duration: exercise.duration || '30 minutes',
                      isCardio: true
                    };
                  }
                  
                  // For strength exercises
                  const setsMatch = exercise.setsReps?.match(/(\d+)\s*sets/);
                  const repsMatch = exercise.setsReps?.match(/(\d+)\s*reps/);
                  
                  return {
                    ...baseExercise,
                    sets: exercise.sets || (setsMatch ? parseInt(setsMatch[1]) : 3),
                    reps: exercise.reps || (repsMatch ? parseInt(repsMatch[1]) : 12),
                    isCardio: false
                  };
                }) : []
              };
              
              console.log('Created session:', session);
              return session;
            });
            
            console.log('Final scheduled sessions:', scheduledSessions);
            setSessions(scheduledSessions);
          }
        } catch (error) {
          console.error('Error fetching training sessions:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchSessions();
    }, []);

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <Box>
        {sessions.map((session) => (
          <WorkoutCard 
            key={session.id} 
            type={session.workout_type?.toUpperCase()}
            elevation={0}
            sx={session.type === 'rest' ? {
              background: 'linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)',
              border: '1px solid rgba(76, 175, 80, 0.1)',
            } : undefined}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2 
            }}>
              {session.type === 'rest' ? (
                <Typography 
                  variant="h6" 
                  sx={{ 
                    color: '#43a047',
                    fontWeight: 700,
                    fontSize: '1.25rem'
                  }}
                >
                  Rest Day
                </Typography>
              ) : (
                <>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      color: session.workout_type === 'CARDIO' ? '#f57c00' : '#43a047',
                      fontWeight: 700 
                    }}
                  >
                    {session.session_name}
                  </Typography>
                  <Typography 
                    variant="subtitle1"
                    sx={{
                      bgcolor: session.workout_type === 'CARDIO' ? '#fff3e0' : '#e8f5e9',
                      color: session.workout_type === 'CARDIO' ? '#f57c00' : '#43a047',
                      px: 2,
                      py: 0.5,
                      borderRadius: '20px',
                      fontWeight: 600,
                    }}
                  >
                    {session.workout_type}
                  </Typography>
                </>
              )}
            </Box>

            {session.type === 'rest' ? null : session.type === 'active_recovery' ? (
              <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '40%' }}>EXERCISE</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>DURATION</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>INTENSITY</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(session.exercises) && session.exercises.map((exercise, idx) => (
                      <TableRow key={idx}>
                        <TableCell component="th" scope="row">
                          {exercise.name}
                        </TableCell>
                        <TableCell>{exercise.duration || '20-30 minutes'}</TableCell>
                        <TableCell sx={{ textTransform: 'capitalize' }}>
                          {exercise.intensity || 'Low'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: '40%' }}>EXERCISE</TableCell>
                      {['SET 1', 'SET 2', 'SET 3', 'SET 4'].map((set) => (
                        <TableCell key={set} align="center" sx={{ fontWeight: 700 }}>
                          {set}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Array.isArray(session.exercises) && session.exercises.map((exercise, idx) => (
                      <TableRow key={idx}>
                        <TableCell component="th" scope="row">
                          {exercise.name}
                        </TableCell>
                        <TableCell align="center">{exercise.sets >= 1 ? exercise.reps : '-'}</TableCell>
                        <TableCell align="center">{exercise.sets >= 2 ? exercise.reps : '-'}</TableCell>
                        <TableCell align="center">{exercise.sets >= 3 ? exercise.reps : '-'}</TableCell>
                        <TableCell align="center">{exercise.sets >= 4 ? exercise.reps : '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </WorkoutCard>
        ))}
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth: 1200, margin: '0 auto', p: { xs: 2, sm: 3 } }}>
      {/* Profile Information */}
      <StyledPaper elevation={0} sx={{ p: 2, background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)' }}>
        <Grid container spacing={3}>
          {/* Left Section - Profile Picture */}
          <Grid item xs={12} sm={4} md={3}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: '24px',
                background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Background Decoration */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '30%',
                  background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
                  opacity: 0.1
                }}
              />
              
              
              {/* Profile Picture Container /*}
              {/* <Box
                sx={{
                  width: '85%',
                  position: 'relative',
                  mt: 2
                }}
              >
                <Box
                  sx={{
                    paddingTop: '100%',
                    position: 'relative',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    border: '4px solid #ffffff'
                  }}
                >
                  <img
                    src={profileData.user.profile_picture || defaultProfilePicture}
                    alt="Profile"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              </Box>

       

              {/* Comment out Upload Button section */}
              <Box sx={{ width: '100%', px: 2 }}>
                {/* 
                <Button
                  variant="contained"
                  component="label"
                  fullWidth
                  startIcon={<CloudUploadIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #4a90e2 0%, #357abd 100%)',
                    color: 'white',
                    py: 1.2,
                    px: 3,
                    textTransform: 'none',
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 12px rgba(74, 144, 226, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #357abd 0%, #2b62a1 100%)',
                      boxShadow: '0 6px 16px rgba(74, 144, 226, 0.4)',
                    }
                  }}
                >
                  Upload Photo
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </Button>

                {selectedFile && (
                  <Button
                    variant="contained"
                    onClick={handleUpload}
                    fullWidth
                    startIcon={<SaveIcon />}
                    sx={{
                      mt: 1.5,
                      background: 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)',
                      color: 'white',
                      py: 1.2,
                      px: 3,
                      textTransform: 'none',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      boxShadow: '0 4px 12px rgba(102, 187, 106, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #43a047 0%, #2e7d32 100%)',
                        boxShadow: '0 6px 16px rgba(102, 187, 106, 0.4)',
                      }
                    }}
                  >
                    Save Changes
                  </Button>
                )}
                */}
                <Typography variant="body2" color="text.secondary">
                  Profile picture upload disabled during testing
                </Typography>
              </Box>
            </Paper>
          </Grid>



          {/* Right Section - User Details */}
          <Grid item xs={12} sm={8} md={9}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Top Row - Full Name and Age */}
              <Grid container spacing={2}>
                {/* Full Name */}
                <Grid item xs={12} sm={8}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: '20px',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        background: 'linear-gradient(to bottom, #4a90e2, #357abd)',
                      }}
                    />
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: '#4a90e2',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        lineHeight: 1,
                        mb: 0.5,
                        letterSpacing: '0.1em'
                      }}
                    >
                      FULL NAME
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: '#1a2b4b',
                        fontWeight: 700,
                        lineHeight: 1.2
                      }}
                    >
                      {`${profileData.user.first_name} ${profileData.user.last_name}`}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Age */}
                <Grid item xs={12} sm={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: '20px',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        background: 'linear-gradient(to bottom, #4a90e2, #357abd)',
                      }}
                    />
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: '#4a90e2',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        lineHeight: 1,
                        mb: 0.5,
                        letterSpacing: '0.1em'
                      }}
                    >
                      AGE
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: '#1a2b4b',
                        fontWeight: 700,
                        lineHeight: 1.2
                      }}
                    >
                      {profileData.user.age} years
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Bottom Row - Member Since and Membership Number */}
              <Grid container spacing={2}>
                {/* Member Since */}
                <Grid item xs={12} sm={8}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: '20px',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        background: 'linear-gradient(to bottom, #66bb6a, #43a047)',
                      }}
                    />
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: '#43a047',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        lineHeight: 1,
                        mb: 0.5,
                        letterSpacing: '0.1em'
                      }}
                    >
                      MEMBER SINCE
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: '#1a2b4b',
                        fontWeight: 700,
                        lineHeight: 1.2
                      }}
                    >
                      {profileData.user.member_since}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Membership Number */}
                <Grid item xs={12} sm={4}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      borderRadius: '20px',
                      background: 'linear-gradient(145deg, #ffffff 0%, #f8faff 100%)',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '4px',
                        height: '100%',
                        background: 'linear-gradient(to bottom, #f57c00, #e65100)',
                      }}
                    />
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: '#f57c00',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        lineHeight: 1,
                        mb: 0.5,
                        letterSpacing: '0.1em'
                      }}
                    >
                      MEMBERSHIP #
                    </Typography>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: '#1a2b4b',
                        fontWeight: 700,
                        lineHeight: 1.2
                      }}
                    >
                      {profileData.user.id}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </StyledPaper>

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
            },
          }}
        >
          <Tab 
            value="trainingSessions" 
            label="Training Sessions" 
          />
          <Tab 
            value="progressionMetrics" 
            label="Progression Metrics" 
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 'trainingSessions' && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TrainingSessionsTab />
          )}
        </Box>
      )}
      {activeTab === 'progressionMetrics' && <ProgressionMetrics />}
    </Box>
  );
};

export default ProfilePage;
