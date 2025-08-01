import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  TrendingUp,
  Shield,
  Target,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUserPortfolios, usePortfolioHoldings, useWatchlist } from "@/hooks/usePortfolio";

interface Report {
  id: string;
  name: string;
  type: "advice" | "simulation" | "optimization" | "risk";
  allocationName: string;
  scenarioName?: string;
  createdAt: string;
  status: "ready" | "generating" | "failed";
  size?: string;
}

const mockReports: Report[] = [
  {
    id: "rpt-1",
    name: "Conservative Portfolio Advice Report",
    type: "advice",
    allocationName: "Conservative Balanced",
    scenarioName: "Q1 2024 Stress Test",
    createdAt: "2024-01-15T10:30:00Z",
    status: "ready",
    size: "2.4 MB"
  },
  {
    id: "rpt-2",
    name: "Risk Parity Optimization Report", 
    type: "optimization",
    allocationName: "Equal Risk Contribution",
    createdAt: "2024-01-14T15:45:00Z",
    status: "ready",
    size: "1.8 MB"
  },
  {
    id: "rpt-3",
    name: "Stress Test Simulation Results",
    type: "simulation", 
    allocationName: "Aggressive Growth",
    scenarioName: "Full Market Crisis",
    createdAt: "2024-01-14T09:15:00Z",
    status: "ready",
    size: "3.2 MB"
  }
];

const reportTypes = [
  { value: "advice", label: "Portfolio Advice", icon: Target },
  { value: "simulation", label: "Simulation Results", icon: BarChart3 },
  { value: "optimization", label: "Optimization Report", icon: TrendingUp },
  { value: "risk", label: "Risk Assessment", icon: Shield }
];

export default function Reports() {
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newReport, setNewReport] = useState({
    name: "",
    type: "advice",
    allocationId: "",
    scenarioId: ""
  });

  // Get user's portfolios and watchlist for report generation
  const { data: portfolios } = useUserPortfolios();
  const { data: watchlist } = useWatchlist();
  const selectedPortfolioId = portfolios?.[0]?.id || null;
  const { data: holdings } = usePortfolioHoldings(selectedPortfolioId);
  
  // Reports should focus on ACTUAL portfolio holdings
  const portfolioSymbols = holdings?.map(h => h.symbol) || [];
  const watchlistSymbols = watchlist?.map(w => w.symbol) || [];
  
  // Display user's actual holdings in reports
  const reportAssets = [...new Set([...portfolioSymbols, ...watchlistSymbols])];

  const handleGenerateReport = async () => {
    if (!newReport.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter a name for the report",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    // Simulate report generation
    setTimeout(() => {
      const report: Report = {
        id: `rpt-${Date.now()}`,
        name: newReport.name,
        type: newReport.type as any,
        allocationName: "Selected Allocation",
        scenarioName: "Selected Scenario",
        createdAt: new Date().toISOString(),
        status: "ready",
        size: `${(Math.random() * 3 + 1).toFixed(1)} MB`
      };

      setReports([report, ...reports]);
      setIsGenerating(false);
      setNewReport({ name: "", type: "advice", allocationId: "", scenarioId: "" });

      toast({
        title: "Report Generated",
        description: `"${report.name}" has been generated successfully`
      });
    }, 3000);
  };

  const handleDownloadReport = (reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    toast({
      title: "Download Started",
      description: `Downloading ${report?.name}...`
    });
  };

  const getTypeIcon = (type: string) => {
    const reportType = reportTypes.find(t => t.value === type);
    return reportType?.icon || FileText;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ready": return "bg-green-500";
      case "generating": return "bg-blue-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Exports</h1>
          <p className="text-muted-foreground">
            Generate and download comprehensive portfolio analysis reports
          </p>
        </div>
        <Button 
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Report"}
        </Button>
      </div>

      <Tabs defaultValue="generator" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generator">Report Generator</TabsTrigger>
          <TabsTrigger value="library">Report Library</TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="space-y-6">
          {/* Report Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generate New Report
              </CardTitle>
              <CardDescription>
                Generate reports for your portfolio: {reportAssets.length > 0 ? reportAssets.join(', ') : 'No assets found'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reportName">Report Name</Label>
                  <Input
                    id="reportName"
                    value={newReport.name}
                    onChange={(e) => setNewReport({ ...newReport, name: e.target.value })}
                    placeholder="e.g., Q1 2024 Portfolio Review"
                  />
                </div>
                <div>
                  <Label htmlFor="reportType">Report Type</Label>
                  <Select 
                    value={newReport.type} 
                    onValueChange={(value) => setNewReport({ ...newReport, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="allocation">Source Allocation</Label>
                  <Select 
                    value={newReport.allocationId} 
                    onValueChange={(value) => setNewReport({ ...newReport, allocationId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select allocation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios?.map((portfolio) => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.name} Portfolio
                        </SelectItem>
                      ))}
                      {portfolios?.length === 0 && (
                        <SelectItem value="none" disabled>No portfolios found</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="scenario">Scenario Set (Optional)</Label>
                  <Select 
                    value={newReport.scenarioId} 
                    onValueChange={(value) => setNewReport({ ...newReport, scenarioId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select scenario..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stress">Q1 2024 Stress Test</SelectItem>
                      <SelectItem value="crisis">Full Market Crisis</SelectItem>
                      <SelectItem value="historical">Historical Episodes Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isGenerating && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                    Generating report... This may take a few minutes.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Report Sections Preview</CardTitle>
              <CardDescription>
                The following sections will be included in your report
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Executive Summary</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Portfolio Allocation</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Risk Metrics</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Performance Attribution</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Scenario Analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Trade Recommendations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Sensitivity Analysis</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <span className="text-sm">Compliance & Disclosures</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {reports.map((report) => {
              const IconComponent = getTypeIcon(report.type);
              return (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-muted rounded-lg">
                          <IconComponent className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{report.name}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{report.allocationName}</span>
                            {report.scenarioName && (
                              <>
                                <span>•</span>
                                <span>{report.scenarioName}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(report.createdAt)}</span>
                            {report.size && (
                              <>
                                <span>•</span>
                                <span>{report.size}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={report.status === "ready" ? "default" : "secondary"}
                          className={report.status === "ready" ? "bg-green-500" : ""}
                        >
                          {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                        </Badge>
                        {report.status === "ready" && (
                          <>
                            <Button variant="outline" size="sm" className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Preview
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleDownloadReport(report.id)}
                              className="flex items-center gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}