import React, { useEffect, useState } from 'react';
import { Container, Card, Alert, Spinner, Button, Badge } from 'react-bootstrap';
import aiAnalysisService from '../services/aiAnalysisService';
import { useParams, useHistory } from 'react-router-dom';
import repairService from '../services/repairService';

const AIAnalysisPage: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<{ status: 'HEALTHY' | 'UNHEALTHY', message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repairData, setRepairData] = useState<any | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);
  const { repairId } = useParams<{ repairId: string }>();
  const history = useHistory();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const status = await aiAnalysisService.checkHealth();
        setHealthStatus(status);
        
        if (status.status === 'UNHEALTHY') {
          setError(status.message);
          setLoading(false);
          return;
        }
        
        if (repairId) {
          await loadRepairData(repairId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setError('Failed to check AI service health: ' + err.message);
        setLoading(false);
      }
    };

    checkHealth();
  }, [repairId]);

  const loadRepairData = async (id: string) => {
    try {
      const data = await repairService.getRepairById(id);
      if (!data) {
        throw new Error('Repair record not found');
      }
      setRepairData(data);
      
      // Perform AI analysis on the repair data
      const analysisResult = await aiAnalysisService.analyzeRepairData(data);
      setAnalysis(analysisResult);
    } catch (err) {
      setError('Failed to load repair data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Something went wrong</Alert.Heading>
          <p>{error}</p>
        </Alert>
        {healthStatus?.status === 'UNHEALTHY' && (
          <Card className="mt-3">
            <Card.Header>AI System Diagnostic</Card.Header>
            <Card.Body>
              <Card.Title>
                <Badge bg="danger">UNHEALTHY</Badge>
              </Card.Title>
              <Card.Text>{healthStatus.message}</Card.Text>
              <p>Please contact your administrator to configure the GitHub API token.</p>
            </Card.Body>
          </Card>
        )}
      </Container>
    );
  }

  if (!repairData || !analysis) {
    return (
      <Container className="mt-4">
        <Alert variant="info">
          <Alert.Heading>Select a repair record</Alert.Heading>
          <p>Please select a repair record to analyze or run a new analysis.</p>
          <Button onClick={() => history.push('/repairs')}>View Repair Records</Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <h1>AI Analysis</h1>
      
      <Card className="mb-4">
        <Card.Header>System Status</Card.Header>
        <Card.Body>
          <Badge bg={healthStatus?.status === 'HEALTHY' ? 'success' : 'danger'}>
            {healthStatus?.status || 'UNKNOWN'}
          </Badge>
          <p className="mt-2">{healthStatus?.message}</p>
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Header>Repair Overview</Card.Header>
        <Card.Body>
          <h5>Truck: {repairData.truckModel} (ID: {repairData.truckId})</h5>
          <p>Reported Issue: {repairData.description}</p>
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Header>Part Recommendations</Card.Header>
        <Card.Body>
          {analysis.partRecommendations.map((part: any, index: number) => (
            <div key={index} className="mb-3">
              <h5>{part.name}</h5>
              <p>Confidence: {(part.confidence * 100).toFixed(1)}%</p>
              <p>Reason: {part.reason}</p>
            </div>
          ))}
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Header>Estimated Repair Time</Card.Header>
        <Card.Body>
          <h5>{analysis.estimatedRepairTime.hours} hours</h5>
          <p>Range: {analysis.estimatedRepairTime.confidenceInterval.min} - {analysis.estimatedRepairTime.confidenceInterval.max} hours</p>
          <p>Based on: {analysis.estimatedRepairTime.basedOn}</p>
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Header>Similar Cases</Card.Header>
        <Card.Body>
          {analysis.similarCases.map((item: any, index: number) => (
            <div key={index} className="mb-3">
              <h5>Case #{item.id}</h5>
              <p>Similarity: {(item.similarity * 100).toFixed(1)}%</p>
              <p>Resolution: {item.resolution}</p>
              <p>Time to Fix: {item.timeToFix} hours</p>
            </div>
          ))}
        </Card.Body>
      </Card>
      
      <Card className="mb-4">
        <Card.Header>Priority Assessment</Card.Header>
        <Card.Body>
          <h5>
            <Badge bg={analysis.priority.level === 'HIGH' ? 'danger' : analysis.priority.level === 'MEDIUM' ? 'warning' : 'info'}>
              {analysis.priority.level}
            </Badge>
          </h5>
          <p>Factors:</p>
          <ul>
            {analysis.priority.factors.map((factor: string, index: number) => (
              <li key={index}>{factor}</li>
            ))}
          </ul>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AIAnalysisPage;