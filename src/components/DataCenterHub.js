import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Droplet, 
  MapPin, 
  RefreshCcw, 
  Thermometer, 
  Zap,
  Target,
  PoundSterling,
  AlertTriangle,
  Leaf,
  Heart,
  UserCheck,
  Bolt,
  Clock
} from 'lucide-react';

const DataCenterHub = () => {
  // State variables
  const [selectedLocation, setSelectedLocation] = useState('Global View');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeGoalCategory, setActiveGoalCategory] = useState('all');
  const [selectedMapMetric, setSelectedMapMetric] = useState('renewable');
  
  // Locations - from actual Equinix's global presence
  const locations = [
    'Global View',
    'Americas',
    'EMEA',
    'Asia-Pacific'
  ];
  
  // Sustainability metrics based on 2024 Equinix Sustainability Report
  const sustainabilityMetrics = useMemo(() => ({
    'Global View': {
      uptime: 99.999,
      pue: 1.39,
      wue: 0.95,
      powerInvested: 51, // $51M invested in energy efficiency
      renewable: 96, // 96% renewable energy coverage
      emissions: {
        scope1: 59400, // mtCO₂e
        scope2: 253300, // mtCO₂e (market-based)
        scope3: 1435000, // mtCO₂e
        yearToYear: -10, // 10% reduction year-over-year (estimated)
        carbonNeutral: 'In Progress'
      },
      carbonIntensity: {
        locationBased: 315, // mtCO₂e / million USD revenue
        marketBased: 36 // mtCO₂e / million USD revenue
      },
      kpi: {
        energy: 8560000, // MWh annually (from report)
        renewable: 96, // percentage
        ppaContracted: 1.2, // GW of PPAs under contract
        newPPA: 370, // MW of new PPAs executed in 2024
        heatExport: 14.5, // GWh of heat export
        scope3Coverage: 29, // % of qualified Scope 3 emissions covered by supplier set science-based targets
        greenBonds: 7 // $7B+ issued in green bonds since 2020
      },
      renewableSources: {
        utility: 38, // % Utility supplied EACs
        unbundled: 47, // % Unbundled Energy Attribute Certificates
        ppa: 11, // % PPAs
        noCoverage: 4 // % No coverage
      }
    }
  }), []); // Empty dependency array since this data is static
  
  // Data centers for map with actual Equinix locations
  const dataCenterLocations = [
    // Americas
    { name: 'New York', location: 'Americas', lat: 40.7128, lng: -74.0060, renewable: 95, size: 16, status: 'operational' },
    { name: 'Washington DC', location: 'Americas', lat: 38.9072, lng: -77.0369, renewable: 98, size: 18, status: 'operational' },
    { name: 'Silicon Valley', location: 'Americas', lat: 37.3875, lng: -122.0575, renewable: 100, size: 20, status: 'operational' },
    { name: 'São Paulo', location: 'Americas', lat: -23.5505, lng: -46.6333, renewable: 87, size: 14, status: 'operational' },
    { name: 'Toronto', location: 'Americas', lat: 43.6511, lng: -79.3470, renewable: 96, size: 15, status: 'operational' },
    
    // EMEA
    { name: 'London', location: 'EMEA', lat: 51.5074, lng: -0.1278, renewable: 97, size: 19, status: 'operational' },
    { name: 'Frankfurt', location: 'EMEA', lat: 50.1109, lng: 8.6821, renewable: 100, size: 17, status: 'operational' },
    { name: 'Paris', location: 'EMEA', lat: 48.8566, lng: 2.3522, renewable: 95, size: 16, status: 'operational' },
    { name: 'Amsterdam', location: 'EMEA', lat: 52.3676, lng: 4.9041, renewable: 100, size: 18, status: 'operational' },
    { name: 'Dublin', location: 'EMEA', lat: 53.3498, lng: -6.2603, renewable: 99, size: 14, status: 'operational' },
    
    // Asia-Pacific
    { name: 'Singapore', location: 'Asia-Pacific', lat: 1.3521, lng: 103.8198, renewable: 90, size: 17, status: 'operational' },
    { name: 'Tokyo', location: 'Asia-Pacific', lat: 35.6762, lng: 139.6503, renewable: 85, size: 16, status: 'operational' },
    { name: 'Sydney', location: 'Asia-Pacific', lat: -33.8688, lng: 151.2093, renewable: 95, size: 15, status: 'operational' },
    { name: 'Hong Kong', location: 'Asia-Pacific', lat: 22.3193, lng: 114.1694, renewable: 91, size: 16, status: 'operational' },
    { name: 'Shanghai', location: 'Asia-Pacific', lat: 31.2304, lng: 121.4737, renewable: 88, size: 14, status: 'operational' },
  ];
  
  // Emissions trends data from 2019 to 2024 (based on report values)
  const emissionsTrendsData = {
    yearly: [
      { time: '2019', scope1: 40700, scope2: 308000 },
      { time: '2022', scope1: 40300, scope2: 241000 },
      { time: '2023', scope1: 29000, scope2: 247600 },
      { time: '2024', scope1: 59400, scope2: 253300 }
    ]
  };
  
  // PUE trends data from 2019 to 2024 (based on report)
  const pueTrendsData = {
    yearly: [
      { time: '2019', value: 1.54 },
      { time: '2022', value: 1.46 },
      { time: '2023', value: 1.42 },
      { time: '2024', value: 1.39 }
    ]
  };
  
  // Goals and targets data aligned with Equinix's Future First strategy
  const goalsData = [
    // Grow digital infrastructure sustainably
    { id: 1, category: 'energy', title: 'Reduce PUE to 1.2 by 2026', progress: 65, description: 'Improving energy efficiency through innovative solutions', dueDate: '2026-12-31' },
    { id: 2, category: 'energy', title: '100% renewable energy coverage', progress: 96, description: 'Using clean and renewable energy across operations', dueDate: '2025-12-31' },
    { id: 3, category: 'carbon', title: 'Climate Neutral Scope 1+2 by 2030', progress: 45, description: 'Offsetting and renewable procurement underway', dueDate: '2030-12-31' },
    { id: 4, category: 'carbon', title: 'Reduce Scope 3 emissions by 50%', progress: 29, description: 'Working with suppliers on science-based targets', dueDate: '2030-12-31' },
    
    // Drive social progress
    { id: 5, category: 'social', title: 'Increase employee volunteering by 50%', progress: 98, description: 'Empower employees to give back to communities', dueDate: '2025-12-31' },
    { id: 6, category: 'social', title: '100% manager training completion', progress: 70, description: 'Ensure a fair, transparent, standardized hiring process', dueDate: '2025-12-31' }
  ];
  
  // Function to get current metrics based on selected location
  const getCurrentMetrics = useCallback(() => {
    return sustainabilityMetrics[selectedLocation] || sustainabilityMetrics['Global View'];
  }, [selectedLocation, sustainabilityMetrics]);
  
  // Function to get filtered data centers based on selected location
  const getFilteredDataCenters = () => {
    if (selectedLocation === 'Global View') {
      return dataCenterLocations;
    } else {
      return dataCenterLocations.filter(dc => dc.location === selectedLocation);
    }
  };
  
  // Current metrics
  const [currentMetrics, setCurrentMetrics] = useState(getCurrentMetrics());
  
  useEffect(() => {
    setCurrentMetrics(getCurrentMetrics());
  }, [getCurrentMetrics]);
  
  // Function to get color based on renewable percentage
  const getRenewableColor = (percentage) => {
    if (percentage >= 95) return '#4caf50'; /* Green */
    if (percentage >= 80) return '#8bc34a'; /* Light Green */
    if (percentage >= 70) return '#cddc39'; /* Lime */
    if (percentage >= 50) return '#ffeb3b'; /* Yellow */
    return '#ff9800'; /* Orange */
  };
  
  // Function to get map marker color based on selected metric
  const getMarkerColor = (dataCenter) => {
    if (selectedMapMetric === 'renewable') {
      return getRenewableColor(dataCenter.renewable);
    }
    return '#4caf50'; // Default color
  };
  
  // Function to get color for status
  const getStatusColor = (status) => {
    switch (status) {
      case 'operational':
        return '#4caf50'; /* Green */
      case 'maintenance':
        return '#ffc107'; /* Amber */
      case 'degraded':
        return '#ff9800'; /* Orange */
      case 'critical':
        return '#f44336'; /* Red */
      default:
        return '#9e9e9e'; /* Gray */
    }
  };
  
  // Function to format number with comma separators
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };
  
  // Function to format currency in millions
  const formatMillions = (amount) => {
    return `$${amount}M`;
  };
  
  // Function to format currency in billions
  const formatBillions = (amount) => {
    return `$${amount}B+`;
  };
  
  // Function to toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  // Function to select location
  const selectLocation = (location) => {
    setSelectedLocation(location);
    setIsDropdownOpen(false);
  };
  
  // Calculate center and zoom for map based on selected location
  const getMapSettings = () => {
    if (selectedLocation === 'Global View') {
      return { center: [30, 0], zoom: 2 };
    } else if (selectedLocation === 'Americas') {
      return { center: [15, -100], zoom: 3 };
    } else if (selectedLocation === 'EMEA') {
      return { center: [50, 10], zoom: 4 };
    } else if (selectedLocation === 'Asia-Pacific') {
      return { center: [10, 110], zoom: 3 };
    }
    
    return { center: [30, 0], zoom: 2 };
  };
  
  // Map settings
  const mapSettings = getMapSettings();
  
  // Get color for goal category
  const getGoalCategoryColor = (category) => {
    switch (category) {
      case 'energy':
        return '#4caf50'; // Green
      case 'carbon':
        return '#2196f3'; // Blue
      case 'social':
        return '#ff9800'; // Orange
      case 'governance':
        return '#9c27b0'; // Purple
      default:
        return '#9e9e9e'; // Gray
    }
  };
  
  // Simple bar chart component
  const SimpleBarChart = ({ data, height = 50, color = '#2196f3', dataKey = 'value' }) => {
    const max = Math.max(...data.map(d => d[dataKey])) * 1.1;
    
    return (
      <div style={{ height: `${height}px`, display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
        {data.map((item, index) => (
          <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div 
              style={{ 
                width: '100%',
                height: `${(item[dataKey] / max) * 100}%`,
                backgroundColor: color,
                borderTopLeftRadius: '2px',
                borderTopRightRadius: '2px'
              }}
            />
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{item.time}</div>
          </div>
        ))}
      </div>
    );
  };
  
  // Stacked bar chart component for emissions
  const StackedBarChart = ({ data, height = 150 }) => {
    const max = Math.max(...data.map(d => d.scope1 + d.scope2)) * 1.1;
    
    return (
      <div style={{ height: `${height}px`, display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        {data.map((item, index) => (
          <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', justifyContent: 'flex-end' }}>
              <div 
                style={{ 
                  width: '100%',
                  height: `${(item.scope2 / max) * 100}%`,
                  backgroundColor: '#2196f3',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderTopLeftRadius: index === 0 ? '2px' : '0',
                  borderTopRightRadius: index === data.length - 1 ? '2px' : '0'
                }}
              >
                <span style={{ fontSize: '10px', color: 'white', fontWeight: 'bold' }}>2</span>
              </div>
              <div 
                style={{ 
                  width: '100%',
                  height: `${(item.scope1 / max) * 100}%`,
                  backgroundColor: '#4caf50',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderBottomLeftRadius: index === 0 ? '2px' : '0',
                  borderBottomRightRadius: index === data.length - 1 ? '2px' : '0'
                }}
              >
                <span style={{ fontSize: '10px', color: 'white', fontWeight: 'bold' }}>1</span>
              </div>
            </div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>{item.time}</div>
          </div>
        ))}
      </div>
    );
  };

  // Pie chart component for renewable sources
  const RenewableSourcesPieChart = ({ data }) => {
    const colors = {
      utility: '#4caf50',
      unbundled: '#2196f3',
      ppa: '#ff9800',
      noCoverage: '#f44336'
    };
    
    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    let currentAngle = 0;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', width: '150px', height: '150px' }}>
          {Object.entries(data).map(([key, value]) => {
            const percentage = (value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            
            return (
              <div 
                key={key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: `conic-gradient(${colors[key]} ${startAngle}deg, ${colors[key]} ${startAngle + angle}deg, transparent ${startAngle + angle}deg)`,
                  borderRadius: '50%',
                  clipPath: 'circle(50%)'
                }}
              />
            );
          })}
          <div 
            style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            {data.utility + data.unbundled + data.ppa}%
          </div>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
          {Object.entries(data).map(([key, value]) => (
            key !== 'noCoverage' && (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '12px', height: '12px', backgroundColor: colors[key], borderRadius: '2px' }} />
                <span style={{ fontSize: '12px' }}>{
                  key === 'utility' ? 'Utility EACs' : 
                  key === 'unbundled' ? 'Unbundled EACs' : 
                  key === 'ppa' ? 'PPAs' : 'No Coverage'
                } ({value}%)</span>
              </div>
            )
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="datacenter-dashboard" style={{ backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* Top Navigation */}
      <header style={{ 
        backgroundColor: 'white', 
        padding: '12px 24px', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        position: 'relative',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#3949ab' }}>Equinix Sustainability Hub</h1>
          
          <div style={{ position: 'relative' }}>
            <button
              onClick={toggleDropdown}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              <MapPin size={16} />
              {selectedLocation}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {isDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                width: '200px',
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginTop: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 10
              }}>
                {locations.map(location => (
                  <button
                    key={location}
                    onClick={() => selectLocation(location)}
                    style={{
                      padding: '8px 12px',
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      borderBottom: '1px solid #f0f0f0',
                      backgroundColor: location === selectedLocation ? '#f0f4ff' : 'white',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {location}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ 
            color: '#3949ab',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Clock size={16} />
            <span>FY 2024 Sustainability Data</span>
          </div>
          
          <button style={{
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#3949ab',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '4px'
          }}>
            <RefreshCcw size={16} />
            <span>Refresh</span>
          </button>
        </div>
      </header>
      
      <main style={{ padding: '24px' }}>
        {/* Dashboard Title */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600' }}>
            {selectedLocation === 'Global View' ? 'Data Center Sustainability Performance' : `${selectedLocation} Sustainability Performance`}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#666' }}>
            Tracking our sustainability performance across Environmental, Social and Governance metrics
          </p>
        </div>
        
        {/* Main Environmental Metrics */}
        <div style={{ 
          marginBottom: '24px',
          background: 'linear-gradient(to right, #e0f2f1, #f5f5f5)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={20} style={{ color: '#009688' }} />
              Key Environmental Metrics
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#666' }}>
              Primary sustainability indicators from our FY2024 report
            </p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px'
          }}>
            {/* Renewable Energy Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4caf50'
                }}>
                  <Bolt size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>Renewable Energy</h3>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{currentMetrics.renewable}%</p>
                </div>
              </div>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                7th consecutive year with 90%+ coverage
              </p>
              <div style={{ marginTop: '12px' }}>
                <RenewableSourcesPieChart data={currentMetrics.renewableSources} />
              </div>
            </div>
            
            {/* PUE Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4caf50'
                }}>
                  <Zap size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>PUE</h3>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{currentMetrics.pue}</p>
                </div>
              </div>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                6% improvement from 2023
              </p>
              <div style={{ marginTop: '12px' }}>
                <SimpleBarChart data={pueTrendsData.yearly} height={80} color="#4caf50" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '8px' }}>
                  <span>2019: {pueTrendsData.yearly[0].value}</span>
                  <span>2024: {pueTrendsData.yearly[pueTrendsData.yearly.length - 1].value}</span>
                </div>
              </div>
            </div>
            
            {/* WUE Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2196f3'
                }}>
                  <Droplet size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>WUE</h3>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{currentMetrics.wue}</p>
                </div>
              </div>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                Water Usage Effectiveness (L/kWh)
              </p>
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: 'rgba(33, 150, 243, 0.05)', 
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Customer Water Reports Now Available</p>
                <p style={{ margin: '0', color: '#666' }}>
                  Provides site-level WUE and allocated water withdrawal data
                </p>
              </div>
            </div>
            
            {/* Energy Efficiency Investment Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(156, 39, 176, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#9c27b0'
                }}>
                  <PoundSterling size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>Energy Investment</h3>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{formatMillions(currentMetrics.powerInvested)}</p>
                </div>
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
                Invested in energy efficiency
              </p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                backgroundColor: 'rgba(156, 39, 176, 0.05)',
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                <div>
                  <span style={{ fontWeight: '500' }}>Green Bonds:</span>
                </div>
                <div>
                  {formatBillions(currentMetrics.kpi.greenBonds)} issued since 2020
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px',
            marginTop: '16px'
          }}>
            {/* Emissions Dashboard Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              gridColumn: '1 / 3'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(33, 150, 243, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2196f3'
                }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>GHG Emissions</h3>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                <div style={{ flex: '1 1 250px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#666' }}>2024 Emissions by Scope (mtCO₂e)</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: '1 1 150px', padding: '12px', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>Scope 1</div>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatNumber(currentMetrics.emissions.scope1)}</div>
                      </div>
                      <div style={{ flex: '1 1 150px', padding: '12px', backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>Scope 2 (market-based)</div>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatNumber(currentMetrics.emissions.scope2)}</div>
                      </div>
                      <div style={{ flex: '1 1 150px', padding: '12px', backgroundColor: 'rgba(156, 39, 176, 0.1)', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>Scope 3</div>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>{formatNumber(currentMetrics.emissions.scope3)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#666' }}>Carbon Intensity (mtCO₂e/million USD)</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: '1 1 150px', padding: '12px', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>Location-based</div>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>{currentMetrics.carbonIntensity.locationBased}</div>
                      </div>
                      <div style={{ flex: '1 1 150px', padding: '12px', backgroundColor: 'rgba(255, 152, 0, 0.1)', borderRadius: '4px' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>Market-based</div>
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>{currentMetrics.carbonIntensity.marketBased}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ flex: '1 1 250px' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#666' }}>Operational Emissions Trend</h4>
                  <StackedBarChart data={emissionsTrendsData.yearly} />
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '10px', height: '10px', backgroundColor: '#4caf50', borderRadius: '2px' }}></div>
                      <span>Scope 1</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '10px', height: '10px', backgroundColor: '#2196f3', borderRadius: '2px' }}></div>
                      <span>Scope 2 (market-based)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Heat Export Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 87, 34, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff5722'
                }}>
                  <Thermometer size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>Heat Export</h3>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{currentMetrics.kpi.heatExport} GWh</p>
                </div>
              </div>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                245% increase from 2023
              </p>
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: 'rgba(255, 87, 34, 0.05)', 
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                <p style={{ margin: '0', color: '#666' }}>
                  Heat reuse increases community energy resilience and reduces waste
                </p>
              </div>
            </div>
            
            {/* PPA Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(76, 175, 80, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4caf50'
                }}>
                  <Bolt size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>PPAs Under Contract</h3>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>{currentMetrics.kpi.ppaContracted} GW</p>
                </div>
              </div>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                {currentMetrics.kpi.newPPA} MW of new PPAs executed in 2024
              </p>
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: 'rgba(76, 175, 80, 0.05)', 
                borderRadius: '4px',
                fontSize: '13px'
              }}>
                <p style={{ margin: '0', color: '#666' }}>
                  First APAC region PPAs executed in 2024
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Layout grid for Map/Status and Goals/Targets */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '3fr 1fr', 
          gap: '24px', 
          marginBottom: '24px'
        }}>
          {/* Map Card */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Global Data Center Network</h3>
              
              {/* Map metric selection */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedMapMetric('renewable')}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: selectedMapMetric === 'renewable' ? '#3949ab' : 'transparent',
                    color: selectedMapMetric === 'renewable' ? 'white' : '#666',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Renewable %
                </button>
              </div>
            </div>
            
            <div style={{ height: '400px' }}>
              <MapContainer 
                center={mapSettings.center} 
                zoom={mapSettings.zoom} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {getFilteredDataCenters().map((dc, index) => (
                  <CircleMarker
                    key={index}
                    center={[dc.lat, dc.lng]}
                    radius={dc.size / 2}
                    pathOptions={{
                      fillColor: getMarkerColor(dc),
                      color: getStatusColor(dc.status),
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.7
                    }}
                  >
                    <Tooltip>
                      <div style={{ padding: '4px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px' }}>{dc.name}</div>
                        <div>Renewable: {dc.renewable}%</div>
                        <div>Status: {dc.status.charAt(0).toUpperCase() + dc.status.slice(1)}</div>
                      </div>
                    </Tooltip>
                    <Popup>
                      <div style={{ padding: '4px' }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '16px' }}>{dc.name}</div>
                        <div style={{ marginBottom: '8px' }}>
                          <div><strong>Renewable Energy:</strong> {dc.renewable}%</div>
                          <div>
                            <strong>Status:</strong> 
                            <span style={{ 
                              color: getStatusColor(dc.status),
                              fontWeight: '500',
                              marginLeft: '4px'
                            }}>
                              {dc.status.charAt(0).toUpperCase() + dc.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
            
            <div style={{ padding: '12px', borderTop: '1px solid #f0f0f0', fontSize: '14px' }}>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#4caf50' }}></div>
                  <span>95%+ Renewable</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#8bc34a' }}></div>
                  <span>80-94% Renewable</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffeb3b' }}></div>
                  <span>Below 80% Renewable</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Goals and Targets Section */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={18} style={{ color: '#3949ab' }} />
                Goals & Targets
              </h3>
            </div>
            
            <div style={{ padding: '12px', borderBottom: '1px solid #f0f0f0', display: 'flex', gap: '8px', overflowX: 'auto' }}>
              <button
                onClick={() => setActiveGoalCategory('all')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: activeGoalCategory === 'all' ? '#3949ab' : 'transparent',
                  color: activeGoalCategory === 'all' ? 'white' : '#666',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              <button
                onClick={() => setActiveGoalCategory('energy')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: activeGoalCategory === 'energy' ? '#3949ab' : 'transparent',
                  color: activeGoalCategory === 'energy' ? 'white' : '#666',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                Energy
              </button>
              <button
                onClick={() => setActiveGoalCategory('carbon')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: activeGoalCategory === 'carbon' ? '#3949ab' : 'transparent',
                  color: activeGoalCategory === 'carbon' ? 'white' : '#666',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                Carbon
              </button>
              <button
                onClick={() => setActiveGoalCategory('social')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: activeGoalCategory === 'social' ? '#3949ab' : 'transparent',
                  color: activeGoalCategory === 'social' ? 'white' : '#666',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                Social
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
              {goalsData
                .filter(goal => activeGoalCategory === 'all' || goal.category === activeGoalCategory)
                .map(goal => (
                  <div 
                    key={goal.id}
                    style={{
                      padding: '12px',
                      margin: '8px',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      backgroundColor: '#f9f9f9'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>
                        {goal.title}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        padding: '2px 6px', 
                        borderRadius: '12px',
                        backgroundColor: `${getGoalCategoryColor(goal.category)}10`,
                        color: getGoalCategoryColor(goal.category)
                      }}>
                        {goal.category.charAt(0).toUpperCase() + goal.category.slice(1)}
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                      {goal.description}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#666' }}>Due: {goal.dueDate}</span>
                      <span style={{ fontSize: '12px', fontWeight: '500' }}>{goal.progress}%</span>
                    </div>
                    
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#eeeeee',
                      borderRadius: '3px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${goal.progress}%`,
                        height: '100%',
                        backgroundColor: getGoalCategoryColor(goal.category),
                        borderRadius: '3px'
                      }}></div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
        
        {/* Social Impact Section - Streamlined */}
        <div style={{ 
          marginBottom: '24px',
          background: 'linear-gradient(to right, #e8f5e9, #f5f5f5)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={20} style={{ color: '#4caf50' }} />
              Social Progress Highlights
            </h3>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px'
          }}>
            {/* Employee Volunteering Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2196f3'
                  }}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>Volunteering Hours</h3>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>37,695</p>
                  </div>
                </div>
                <div style={{ 
                  backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                  color: '#4caf50', 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  fontSize: '12px', 
                  fontWeight: '600' 
                }}>
                  +49% YoY
                </div>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                93% of employee volunteers report improved inclusion and belonging
              </p>
            </div>
            
            {/* Funding Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(156, 39, 176, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9c27b0'
                  }}>
                    <PoundSterling size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>Community Funding</h3>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>$4.1M</p>
                  </div>
                </div>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                Donated to 2,300+ causes through donations and Equinix Foundation grants
              </p>
            </div>
            
            {/* Digital Inclusion Card */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ff9800'
                }}>
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '500', color: '#666' }}>Digital Inclusion</h3>
                  <p style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>63</p>
                </div>
              </div>
              <p style={{ margin: '0', fontSize: '14px', color: '#666' }}>
                Organizations partnering in digital inclusion funded by Equinix Foundation
              </p>
            </div>
          </div>
        </div>
        
        {/* Awards and Recognition Section - Removed */}
      </main>
    </div>
  );
};

export default DataCenterHub;