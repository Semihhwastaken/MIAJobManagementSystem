import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { Button, Card, Container, Typography } from '@mui/material';
import axiosInstance from '../../services/axiosInstance';

const TeamInvite = () => {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [teamName, setTeamName] = useState('');

  useEffect(() => {
    const joinTeam = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.post(`Team/join-with-code/${inviteCode}`);
        setTeamName(response.data.teamName || 'Ekip');
        setSuccess(true);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Ekibe katılırken bir hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    joinTeam();
  }, [inviteCode]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Typography>Ekibe katılma işlemi gerçekleştiriliyor...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Card sx={{ p: 4, textAlign: 'center' }}>
        {success ? (
          <>
            <Typography variant="h5" gutterBottom color="primary">
              Başarıyla Katıldınız!
            </Typography>
            <Typography variant="body1" paragraph>
              {teamName} ekibine başarıyla katıldınız.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/teams')}
            >
              Ekiplerime Git
            </Button>
          </>
        ) : (
          <>
            <Typography variant="h5" gutterBottom color="error">
              Hata
            </Typography>
            <Typography variant="body1" paragraph>
              {error}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/teams')}
            >
              Ekiplerime Dön
            </Button>
          </>
        )}
      </Card>
    </Container>
  );
};

export default TeamInvite;
