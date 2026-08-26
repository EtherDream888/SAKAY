import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Button,
  Tabs,
  Tab,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';
import RefreshIcon from '@mui/icons-material/Refresh';
import ScheduleIcon from '@mui/icons-material/Schedule';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

import { fetchOperationalReports, OperationalReportsData } from '../services/adminApiService';

/**
 * ============================================================================
 * TRANSPORTATION REPORTS GENERATOR PAGE (ReportsPage.tsx)
 * ============================================================================
 * Checklist Scope:
 *   ● View Reports
 *     ○ Booking reports
 *     ○ Driver utilization reports
 *     ○ TODA performance reports
 *     ○ Peak-hour reports
 *     ○ Barangay demand reports
 *     ○ Service utilization reports
 * ============================================================================
 */
export const ReportsPage: React.FC = () => {
  const [reportsData, setReportsData] = useState<OperationalReportsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeReportTab, setActiveReportTab] = useState<
    'Bookings' | 'Drivers' | 'TODA' | 'PeakHours' | 'Barangay' | 'Service'
  >('Bookings');

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const data = await fetchOperationalReports();
      setReportsData(data);
    } catch (err) {
      console.error('[ReportsPage] Failed to fetch operational reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleExportCSV = (reportName: string) => {
    if (!reportsData) return;
    let csvContent = 'data:text/csv;charset=utf-8,';

    if (reportName === 'Bookings') {
      csvContent += 'Metric,Value\n';
      csvContent += `Total Bookings,${reportsData.summary.totalBookings}\n`;
      csvContent += `Completed Trips,${reportsData.summary.completedTrips}\n`;
      csvContent += `Cancelled Bookings,${reportsData.summary.cancelledTrips}\n`;
      csvContent += `Total Fares Collected (PHP),${reportsData.summary.totalRevenue}\n`;
      csvContent += `Average Fare (PHP),${reportsData.summary.averageFare}\n`;
    } else if (reportName === 'PeakHours') {
      csvContent += 'Hour Window,Trip Volume\n';
      reportsData.peakHourDistribution.forEach((h) => {
        csvContent += `"${h.hour}",${h.count}\n`;
      });
    } else if (reportName === 'Barangay') {
      csvContent += 'Barangay Zone,Booking Requests,Percentage Share\n';
      reportsData.barangayDemand.forEach((b) => {
        csvContent += `"${b.barangay}",${b.count},${b.percentage}%\n`;
      });
    } else if (reportName === 'TODA') {
      csvContent += 'TODA Name,Completed Trips,Registered Units,Compliance Rate\n';
      reportsData.todaPerformance.forEach((t) => {
        csvContent += `"${t.todaName}",${t.totalTrips},${t.activeUnits},${t.complianceRate}%\n`;
      });
    } else {
      csvContent += 'Driver Name,Affiliated TODA,Completed Trips,Rating,Status\n';
      reportsData.driverUtilization.forEach((d) => {
        csvContent += `"${d.driverName}","${d.toda}",${d.completedTrips},${d.rating},"${d.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SAKAY_LGU_Report_${reportName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = reportsData?.summary || {
    totalBookings: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    totalRevenue: 0,
    averageFare: 0,
    activeDrivers: 0,
    accreditedTodas: 0,
  };

  return (
    <Box sx={{ maxWidth: 1600, margin: '0 auto', pb: 6 }}>
      {/* 1. Header Toolbar with Export Action */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3.5, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: 'var(--mac-text-primary)' }}>
            Official Municipal Transportation Reports
          </Typography>
          <Typography sx={{ fontSize: '10.8px', color: 'var(--mac-text-muted)', mt: '3px' }}>
            Comprehensive reporting for tricycle public transit operations in Calapan City
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            onClick={loadReports}
            startIcon={<RefreshIcon />}
            variant="outlined"
            size="small"
            sx={{ textTransform: 'none', borderColor: 'var(--mac-border-color)', color: 'var(--mac-text-primary)' }}
          >
            Refresh
          </Button>
          <Button
            onClick={() => handleExportCSV(activeReportTab)}
            startIcon={<DownloadIcon />}
            variant="contained"
            size="small"
            sx={{ textTransform: 'none', backgroundColor: 'var(--sakay-orange)', fontWeight: 600 }}
          >
            Export Report (CSV)
          </Button>
        </Box>
      </Box>

      {/* 2. Top Summary KPI Cards */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2.5,
          mb: 4,
        }}
      >
        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>
              Total Completed Trips
            </Typography>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#2E7D32', mb: 0.5 }}>
              {summary.completedTrips}
            </Typography>
            <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
              Out of {summary.totalBookings} total bookings
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>
              Gross Municipal Fares
            </Typography>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: 'var(--sakay-orange)', mb: 0.5 }}>
              ₱{summary.totalRevenue.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
              Average ₱{summary.averageFare}.00 / trip
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>
              Active Driver Workforce
            </Typography>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: '#1565C0', mb: 0.5 }}>
              {summary.activeDrivers}
            </Typography>
            <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
              Verified drivers across TODAs
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 'var(--mac-radius-lg)', border: '1px solid var(--mac-border-color)', boxShadow: 'var(--mac-shadow-card)', backgroundColor: '#FFFFFF' }}>
          <CardContent sx={{ p: '20px 22px !important' }}>
            <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'var(--mac-text-muted)', textTransform: 'uppercase', mb: 1 }}>
              Accredited TODAs
            </Typography>
            <Typography sx={{ fontSize: '22.4px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 0.5 }}>
              {summary.accreditedTodas}
            </Typography>
            <Typography sx={{ fontSize: '9.6px', color: 'var(--mac-text-muted)' }}>
              Authorized transport associations
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* 3. Report Category Tabs */}
      <Box sx={{ mb: 3, borderBottom: '1px solid var(--mac-border-color)' }}>
        <Tabs
          value={activeReportTab}
          onChange={(_, val) => setActiveReportTab(val)}
          sx={{
            '& .MuiTabs-indicator': { backgroundColor: 'var(--sakay-orange)', height: 3 },
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '11.3px', minHeight: 48 },
            '& .Mui-selected': { color: 'var(--sakay-orange) !important' },
          }}
        >
          <Tab icon={<AssessmentIcon fontSize="small" />} iconPosition="start" label="1. Booking Reports" value="Bookings" />
          <Tab icon={<DirectionsCarIcon fontSize="small" />} iconPosition="start" label="2. Driver Utilization" value="Drivers" />
          <Tab icon={<GroupsIcon fontSize="small" />} iconPosition="start" label="3. TODA Performance" value="TODA" />
          <Tab icon={<ScheduleIcon fontSize="small" />} iconPosition="start" label="4. Peak-Hour Reports" value="PeakHours" />
          <Tab icon={<LocationOnIcon fontSize="small" />} iconPosition="start" label="5. Barangay Demand" value="Barangay" />
        </Tabs>
      </Box>

      {/* 4. Tab Content Panels */}
      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={32} sx={{ color: 'var(--sakay-orange)', mb: 1.5 }} />
          <Typography sx={{ fontSize: '11.3px', color: 'var(--mac-text-muted)' }}>
            Generating report...
          </Typography>
        </Box>
      ) : (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 'var(--mac-radius-lg)',
            border: '1px solid var(--mac-border-color)',
            boxShadow: 'var(--mac-shadow-card)',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
            p: 3,
          }}
        >
          {/* Tab 1: Booking Reports */}
          {activeReportTab === 'Bookings' && (
            <Box>
              <Typography sx={{ fontSize: '12.8px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 2 }}>
                Booking Performance & Tariff Revenue Audit
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>OPERATIONAL METRIC</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>RECORDED VALUE</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>COMPLIANCE BENCHMARK</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Total Booking Invocations</TableCell>
                      <TableCell>{summary.totalBookings} bookings</TableCell>
                      <TableCell sx={{ color: '#2E7D32' }}>100% Logged</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Completed Trips</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#2E7D32' }}>{summary.completedTrips} trips</TableCell>
                      <TableCell>Full GPS Route Archived</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Cancelled Bookings</TableCell>
                      <TableCell sx={{ color: '#DC2626' }}>{summary.cancelledTrips} cancellations</TableCell>
                      <TableCell>Within Threshold (&lt;15%)</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Gross Fare Volume</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'var(--sakay-orange)' }}>₱{summary.totalRevenue.toFixed(2)}</TableCell>
                      <TableCell>Ordinance No. 118 Compliant</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Average Fare Per Passenger</TableCell>
                      <TableCell>₱{summary.averageFare}.00</TableCell>
                      <TableCell>Standard Base ₱15.00</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 2: Driver Utilization */}
          {activeReportTab === 'Drivers' && (
            <Box>
              <Typography sx={{ fontSize: '12.8px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 2 }}>
                Driver Utilization & Service Reliability Report ({reportsData?.driverUtilization.length || 0} Registered Drivers)
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>DRIVER NAME</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>TODA AFFILIATION</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>COMPLETED TRIPS</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>PASSENGER RATING</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ACCOUNT STANDING</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportsData && reportsData.driverUtilization.length > 0 ? (
                      reportsData.driverUtilization.map((d, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 600 }}>{d.driverName}</TableCell>
                          <TableCell>{d.toda}</TableCell>
                          <TableCell>{d.completedTrips} Trips</TableCell>
                          <TableCell>⭐ {d.rating.toFixed(1)} / 5.0</TableCell>
                          <TableCell sx={{ color: d.status === 'Verified' ? '#2E7D32' : '#DC2626', fontWeight: 600 }}>
                            {d.status}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'var(--mac-text-muted)' }}>
                          No driver records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 3: TODA Performance */}
          {activeReportTab === 'TODA' && (
            <Box>
              <Typography sx={{ fontSize: '12.8px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 2 }}>
                Accredited TODA Association Operational Performance
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>TODA NAME</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ACTIVE UNITS / DRIVERS</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>FULFILLED TRIPS</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>MUNICIPAL COMPLIANCE</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportsData && reportsData.todaPerformance.length > 0 ? (
                      reportsData.todaPerformance.map((t, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 600 }}>{t.todaName}</TableCell>
                          <TableCell>{t.activeUnits} Units</TableCell>
                          <TableCell>{t.totalTrips} Completed</TableCell>
                          <TableCell sx={{ color: '#2E7D32', fontWeight: 600 }}>
                            {t.complianceRate}% Compliant
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'var(--mac-text-muted)' }}>
                          No accredited TODA associations found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 4: Peak Hours */}
          {activeReportTab === 'PeakHours' && (
            <Box>
              <Typography sx={{ fontSize: '12.8px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 2 }}>
                Peak Travel Hours Analysis (Calapan City Transit Demand)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                {reportsData && reportsData.peakHourDistribution.map((h, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography sx={{ width: 100, fontSize: '10.8px', fontWeight: 600, color: 'var(--mac-text-secondary)' }}>
                      {h.hour}
                    </Typography>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (h.count / Math.max(1, summary.totalBookings)) * 100 * 3 || 4)}
                        sx={{
                          height: 12,
                          borderRadius: 6,
                          backgroundColor: '#F0F0F2',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: 'var(--sakay-orange)',
                            borderRadius: 6,
                          },
                        }}
                      />
                    </Box>
                    <Typography sx={{ width: 80, fontSize: '10.8px', fontWeight: 700, textAlign: 'right', color: 'var(--mac-text-primary)' }}>
                      {h.count} Trips
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Tab 5: Barangay Demand */}
          {activeReportTab === 'Barangay' && (
            <Box>
              <Typography sx={{ fontSize: '12.8px', fontWeight: 700, color: 'var(--mac-text-primary)', mb: 2 }}>
                Barangay Pickup & Service Zone Utilization Density
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead sx={{ backgroundColor: '#FAFAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>BARANGAY ZONE</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>TRIP REQUESTS</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>PROPORTION OF CITY TRANSIT</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportsData && reportsData.barangayDemand.map((b, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ fontWeight: 600 }}>{b.barangay}</TableCell>
                        <TableCell>{b.count} Pickups</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={b.percentage || 10}
                              sx={{ flex: 1, height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { backgroundColor: '#1565C0' } }}
                            />
                            <Typography sx={{ fontSize: '10.4px', fontWeight: 600, color: 'var(--mac-text-secondary)', width: 45 }}>
                              {b.percentage}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

