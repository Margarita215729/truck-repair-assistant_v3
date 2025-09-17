import React, { useEffect, useState } from 'react';
import { ServiceCenter } from '../types/serviceCenter';
import serviceLocatorService from '../services/serviceLocatorService';
import ServiceCenterMap from '../components/ServiceCenterMap';
import ServiceCenterList from '../components/ServiceCenterList';
import { Container, Row, Col, Spinner } from 'react-bootstrap';

const ServiceLocatorPage: React.FC = () => {
  const [serviceCenters, setServiceCenters] = useState<ServiceCenter[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServiceCenters = async () => {
      try {
        setLoading(true);
        const centers = await serviceLocatorService.getServiceCenters();
        setServiceCenters(centers);
      } catch (err) {
        setError('Failed to load service centers. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceCenters();
  }, []);

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
    return <Container className="mt-4"><div className="alert alert-danger">{error}</div></Container>;
  }

  return (
    <Container className="mt-4">
      <h1>Find Truck Repair Service Centers</h1>
      <Row>
        <Col md={5}>
          <ServiceCenterList serviceCenters={serviceCenters} />
        </Col>
        <Col md={7}>
          <ServiceCenterMap serviceCenters={serviceCenters} />
        </Col>
      </Row>
    </Container>
  );
};

export default ServiceLocatorPage;
