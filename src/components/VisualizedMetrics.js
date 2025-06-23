import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const VisualizedMetrics = () => {
  // --------------------------------------
  // 1) STATE MANAGEMENT
  // --------------------------------------
  const [selectedStandard, setSelectedStandard] = useState("EU Taxonomy");
  const [selectedDatacenter, setSelectedDatacenter] = useState("Equinix UK Roll-up");
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedMetrics, setSelectedMetrics] = useState(["PUE", "WUE"]);
  
  // Charts state
  const [complianceTable, setComplianceTable] = useState(null);
  const [trendFig, setTrendFig] = useState(null);
  const [standardsFig, setStandardsFig] = useState(null);
  const [gapFig, setGapFig] = useState(null);
  const [capexFig, setCapexFig] = useState(null);
  
  // --------------------------------------
  // 2) DATA STRUCTURES
  // --------------------------------------
  
  // Enhanced data structure with sustainability metrics
  const complianceData = [
    {
      "company": "Equinix Group",
      "standards": [
        {"standard": "EU Taxonomy", "compliance": 85},
        {"standard": "EU CoC", "compliance": 90},
        {"standard": "EED", "compliance": 88},
      ],
      "sustainability_metrics": {
        "pue": 1.45,
        "wue": 0.65,
        "cue": 0.15,
        "ref": 0.95,
        "hre": 0.35,
      },
      "datacenters": [
        {
          "datacenter": "Equinix UK Roll-up",
          "standards": [
            {"standard": "EU Taxonomy", "compliance": 82},
            {"standard": "EU CoC", "compliance": 88},
            {"standard": "EED", "compliance": 85},
          ],
          "sustainability_metrics": {
            "pue": 1.48,
            "wue": 0.68,
            "cue": 0.16,
            "ref": 0.92,
            "hre": 0.32
          },
          "individual_sites": [
            {
              "site": "London LD1",
              "compliance": 92,
              "sustainability_metrics": {
                "pue": 1.45,
                "wue": 0.62,
                "cue": 0.14,
                "ref": 0.94,
                "hre": 0.35
              }
            },
            {
              "site": "London LD2",
              "compliance": 88,
              "sustainability_metrics": {
                "pue": 1.50,
                "wue": 0.70,
                "cue": 0.17,
                "ref": 0.90,
                "hre": 0.30
              }
            },
            {
              "site": "Manchester MA1",
              "compliance": 76,
              "sustainability_metrics": {
                "pue": 1.52,
                "wue": 0.72,
                "cue": 0.18,
                "ref": 0.88,
                "hre": 0.28
              }
            }
          ]
        },
        {
          "datacenter": "Equinix Germany Roll-up",
          "standards": [
            {"standard": "EU Taxonomy", "compliance": 80},
            {"standard": "EU CoC", "compliance": 92},
            {"standard": "EED", "compliance": 86},
          ],
          "sustainability_metrics": {
            "pue": 1.42,
            "wue": 0.62,
            "cue": 0.14,
            "ref": 0.98,
            "hre": 0.38
          },
          "individual_sites": [
            {
              "site": "Frankfurt FR1",
              "compliance": 90,
              "sustainability_metrics": {
                "pue": 1.40,
                "wue": 0.60,
                "cue": 0.13,
                "ref": 1.00,
                "hre": 0.40
              }
            },
            {
              "site": "Frankfurt FR2",
              "compliance": 85,
              "sustainability_metrics": {
                "pue": 1.42,
                "wue": 0.62,
                "cue": 0.14,
                "ref": 0.98,
                "hre": 0.38
              }
            },
            {
              "site": "Munich MU1",
              "compliance": 75,
              "sustainability_metrics": {
                "pue": 1.44,
                "wue": 0.64,
                "cue": 0.15,
                "ref": 0.96,
                "hre": 0.36
              }
            }
          ]
        }
      ]
    }
  ];

  // Data gaps analysis data
  const dataGaps = {
    "company": "Equinix Group",
    "standards": [
      {
        "standard": "EU Taxonomy",
        "compliance": 85,
        "sections": [
          {"section": "Energy Metrics", "gap": 12, "severity": "Medium"},
          {"section": "Governance", "gap": 3, "severity": "Low"},
          {"section": "PUE/WUE", "gap": 8, "severity": "Medium"},
        ],
      },
      {
        "standard": "EU CoC",
        "compliance": 90,
        "sections": [
          {"section": "Data Security", "gap": 5, "severity": "Low"},
          {"section": "Risk Management", "gap": 2, "severity": "Low"},
          {"section": "Reporting", "gap": 7, "severity": "Medium"},
        ],
      },
      {
        "standard": "EED",
        "compliance": 88,
        "sections": [
          {"section": "Energy Audits", "gap": 10, "severity": "Medium"},
          {"section": "Metering", "gap": 6, "severity": "Medium"},
          {"section": "Compliance Documentation", "gap": 4, "severity": "Low"},
        ],
      },
    ],
  };

  // CapEx data
  const capexData = [
    {"project": "Project A", "alignment": 85},
    {"project": "Project B", "alignment": 92},
    {"project": "Data Center Expansion", "alignment": 78},
    {"project": "Sustainability Initiative", "alignment": 88},
    {"project": "Energy Efficiency Upgrade", "alignment": 95},
  ];

  // Historical data
  const historicalData = {
    "years": [2019, 2020, 2021, 2022, 2023],
    "pue": [1.54, 1.51, 1.48, 1.46, 1.42],
    "renewable_energy": [92, 93, 95, 96, 96],
    "emissions_reduction": [0, -10, -12, -23, -24],
    "energy_investment": [45, 55, 62, 70, 78]
  };

  // --------------------------------------
  // 3) METRIC EXPLANATIONS
  // --------------------------------------
  const metricExplanations = {
    "PUE": "Power Usage Effectiveness: Total Energy / IT Energy",
    "WUE": "Water Usage Effectiveness: Water Consumed / IT Energy",
    "CUE": "Carbon Usage Effectiveness: Carbon Emissions / IT Energy",
    "REF": "Renewable Energy Factor: Renewable Energy / Total Energy",
    "HRE": "Heat Reuse Effectiveness: Heat Reused / Total Heat"
  };

  // --------------------------------------
  // 4) BUILD CHARTS ON COMPONENT MOUNT
  // --------------------------------------
  useEffect(() => {
    generateComplianceTable();
    generateTrendChart();
    generateStandardsChart();
    generateGapChart();
    generateCapexChart();
  }, [selectedStandard, selectedDatacenter, selectedYear, selectedMetrics]);

  // --------------------------------------
  // 5) CHART GENERATION FUNCTIONS
  // --------------------------------------

  // Build compliance table
  const generateComplianceTable = () => {
    const headers = [
      "Entity Level",
      "EU Taxonomy", "EU CoC", "EED",
      "PUE", "WUE", "CUE",
      "REF", "HRE",
      "Notes"
    ];

    const tableData = [];
    const company = complianceData[0];

    // Global level
    tableData.push([
      `🌐 ${company.company}`,
      `${company.standards.find(s => s.standard === 'EU Taxonomy')?.compliance || '-'}%`,
      `${company.standards.find(s => s.standard === 'EU CoC')?.compliance || '-'}%`,
      `${company.standards.find(s => s.standard === 'EED')?.compliance || '-'}%`,
      company.sustainability_metrics.pue,
      company.sustainability_metrics.wue,
      company.sustainability_metrics.cue,
      company.sustainability_metrics.ref,
      company.sustainability_metrics.hre,
      "Global Roll-up"
    ]);

    // Regional level & sites
    for (const dc of company.datacenters) {
      tableData.push([
        `  📍 ${dc.datacenter}`,
        `${dc.standards.find(s => s.standard === 'EU Taxonomy')?.compliance || '-'}%`,
        `${dc.standards.find(s => s.standard === 'EU CoC')?.compliance || '-'}%`,
        `${dc.standards.find(s => s.standard === 'EED')?.compliance || '-'}%`,
        dc.sustainability_metrics.pue,
        dc.sustainability_metrics.wue,
        dc.sustainability_metrics.cue,
        dc.sustainability_metrics.ref,
        dc.sustainability_metrics.hre,
        "Regional Roll-up"
      ]);
      for (const site of dc.individual_sites) {
        tableData.push([
          `    🏢 ${site.site}`,
          `${site.compliance}%`,
          "-",
          "-",
          site.sustainability_metrics.pue,
          site.sustainability_metrics.wue,
          site.sustainability_metrics.cue,
          site.sustainability_metrics.ref,
          site.sustainability_metrics.hre,
          "Site Level"
        ]);
      }
    }

    const figure = {
      data: [
        {
          type: 'table',
          header: {
            values: headers,
            fill: { color: ['#0066cc'] },
            font: { color: 'white', size: 14 },
            align: ['left'],
            height: 40
          },
          cells: {
            values: tableData.map((row, i) => row.map(cell => cell)),
            fill: { color: tableData.map((_, i) => i % 2 === 0 ? '#f5f5f5' : 'white') },
            align: ['left'],
            height: 35,
            font: { size: 13 }
          }
        }
      ],
      layout: {
        title: {
          text: "Equinix Sustainability & Compliance Metrics",
          x: 0.5,
          font: { size: 20 }
        },
        width: 1500,
        height: 400,
        margin: { l: 20, r: 20, t: 60, b: 20 }
      }
    };

    setComplianceTable(figure);
  };

  // Create trend chart
  const generateTrendChart = () => {
    const figure = {
      data: [
        {
          x: historicalData.years,
          y: historicalData.pue,
          name: "PUE",
          type: 'scatter',
          line: { color: '#1f77b4', width: 2 },
          yaxis: 'y'
        },
        {
          x: historicalData.years,
          y: historicalData.renewable_energy,
          name: "Renewable Energy (%)",
          type: 'scatter',
          line: { color: '#2ca02c', width: 2 },
          yaxis: 'y2'
        },
        {
          x: historicalData.years,
          y: historicalData.emissions_reduction,
          name: "Emissions Reduction (%)",
          type: 'scatter',
          line: { color: '#d62728', width: 2 },
          yaxis: 'y2'
        }
      ],
      layout: {
        title: {
          text: "Performance Trends 2019-2023",
          x: 0.5
        },
        legend: {
          orientation: "h",
          y: 1.1
        },
        yaxis: {
          title: "PUE"
        },
        yaxis2: {
          title: "Percentage (%)",
          overlaying: 'y',
          side: 'right'
        }
      }
    };

    setTrendFig(figure);
  };

  // Create standards chart
  const generateStandardsChart = () => {
    const standardsMetrics = {
      "EU Taxonomy": {
        "sections": ["Energy Efficiency", "Renewable Energy", "Carbon Emissions"],
        "values": [78, 96, 85]
      },
      "EU CoC": {
        "sections": ["Data Center Efficiency", "Infrastructure", "Operations"],
        "values": [90, 88, 92]
      },
      "EED": {
        "sections": ["Energy Audits", "Monitoring", "Documentation"],
        "values": [88, 85, 82]
      }
    };

    const figure = {
      data: Object.entries(standardsMetrics).map(([standard, data]) => ({
        type: 'bar',
        name: standard,
        x: data.sections,
        y: data.values,
        text: data.values,
        textposition: 'auto'
      })),
      layout: {
        title: {
          text: "Standard Compliance by Category",
          x: 0.5
        },
        barmode: 'group',
        yaxis: {
          title: "Compliance Score (%)"
        },
        legend: {
          orientation: "h",
          yanchor: "bottom",
          y: 1.02,
          xanchor: "right",
          x: 1
        }
      }
    };

    setStandardsFig(figure);
  };

  // Create gap chart
  const generateGapChart = () => {
    const figure = {
      data: dataGaps.standards.map(standardObj => ({
        type: 'bar',
        name: standardObj.standard,
        x: standardObj.sections.map(sec => sec.section),
        y: standardObj.sections.map(sec => sec.gap)
      })),
      layout: {
        barmode: "group",
        title: {
          text: `Data Gaps by Section - ${dataGaps.company}`,
          x: 0.5
        },
        xaxis: {
          title: "Section"
        },
        yaxis: {
          title: "Gap (numeric value)"
        },
        legend: {
          title: "Standard"
        }
      }
    };

    setGapFig(figure);
  };

  // Create CapEx chart
  const generateCapexChart = () => {
    const figure = {
      data: [
        {
          type: 'scatter',
          x: capexData.map(item => item.project),
          y: capexData.map(item => item.alignment),
          mode: "lines+markers",
        }
      ],
      layout: {
        title: {
          text: "CapEx Alignment with EU Taxonomy - Equinix",
          x: 0.5
        },
        xaxis: {
          title: "Equinix Projects/Initiatives"
        },
        yaxis: {
          title: "CapEx Alignment with EU Taxonomy (%)"
        }
      }
    };

    setCapexFig(figure);
  };

  // Handle filter changes
  const handleFilterChange = () => {
    // Regenerate all charts with selected filters
    generateComplianceTable();
    generateTrendChart();
    generateStandardsChart();
    generateGapChart();
    generateCapexChart();
  };

  // --------------------------------------
  // 6) UI RENDER
  // --------------------------------------
  return (
    <div className="visualized-metrics">
      <h1 className="page-title">Visualized Metrics</h1>
      <p className="page-description">Visual representation of your compliance and sustainability metrics</p>
      
      {/* Filters Section */}
      <div className="filters-section" style={{ marginBottom: "20px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
        <div className="filter-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "16px" }}>
          <div className="filter-item">
            <label htmlFor="standard-select">Standard</label>
            <select 
              id="standard-select"
              value={selectedStandard}
              onChange={(e) => setSelectedStandard(e.target.value)}
              className="form-select"
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ced4da" }}
            >
              <option value="EU Taxonomy">EU Taxonomy</option>
              <option value="EU CoC">EU CoC</option>
              <option value="EED">EED</option>
            </select>
          </div>
          
          <div className="filter-item">
            <label htmlFor="datacenter-select">Data Center</label>
            <select 
              id="datacenter-select"
              value={selectedDatacenter}
              onChange={(e) => setSelectedDatacenter(e.target.value)}
              className="form-select"
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ced4da" }}
            >
              {complianceData[0].datacenters.map(dc => (
                <option key={dc.datacenter} value={dc.datacenter}>{dc.datacenter}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label htmlFor="year-select">Year</label>
            <select 
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="form-select"
              style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ced4da" }}
            >
              {historicalData.years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-item">
            <label>Metrics</label>
            <div className="metrics-checkboxes" style={{ marginTop: "8px" }}>
              {Object.keys(metricExplanations).map(metric => (
                <div key={metric} style={{ display: "inline-block", marginRight: "16px" }}>
                  <input
                    type="checkbox"
                    id={`metric-${metric}`}
                    checked={selectedMetrics.includes(metric)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMetrics([...selectedMetrics, metric]);
                      } else {
                        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
                      }
                    }}
                    style={{ marginRight: "5px" }}
                  />
                  <label htmlFor={`metric-${metric}`}>{metric}</label>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleFilterChange}
          style={{
            backgroundColor: "var(--primary-color)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "8px 16px",
            cursor: "pointer"
          }}
        >
          Apply Filters
        </button>
      </div>
      
      {/* Metrics Explanations */}
      <div className="metric-explanations" style={{ marginBottom: "30px", padding: "15px", backgroundColor: "#f0f7ff", borderRadius: "8px", border: "1px solid #d0e3ff" }}>
        <h3 style={{ marginBottom: "10px" }}>Sustainability Metrics Legend:</h3>
        {Object.entries(metricExplanations).map(([metric, explanation]) => (
          <div key={metric} style={{ marginBottom: "5px" }}>
            <strong>{metric}</strong>: {explanation}
          </div>
        ))}
      </div>

      {/* Compliance Table */}
      <div className="chart-container" style={{ marginBottom: "30px", backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        {complianceTable && <Plot data={complianceTable.data} layout={complianceTable.layout} config={{ responsive: true }} />}
      </div>
      
      {/* Two-column layout for charts */}
      <div className="charts-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "30px" }}>
        <div className="chart-container" style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          {trendFig && <Plot data={trendFig.data} layout={trendFig.layout} config={{ responsive: true }} />}
        </div>
        <div className="chart-container" style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          {standardsFig && <Plot data={standardsFig.data} layout={standardsFig.layout} config={{ responsive: true }} />}
        </div>
      </div>
      
      {/* Gap analysis & CapEx charts */}
      <div className="charts-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div className="chart-container" style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          {gapFig && <Plot data={gapFig.data} layout={gapFig.layout} config={{ responsive: true }} />}
        </div>
        <div className="chart-container" style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          {capexFig && <Plot data={capexFig.data} layout={capexFig.layout} config={{ responsive: true }} />}
        </div>
      </div>
    </div>
  );
};

export default VisualizedMetrics;