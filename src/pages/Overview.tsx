import { useListTrees, useGetDashboardSummary, useListAlerts, useCreateTree, getListTreesQueryKey, getGetDashboardSummaryQueryKey } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { TreePine, AlertTriangle, Droplet, Activity, Plus, Search, CheckCircle2 } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { formatTime } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Overview() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: trees, isLoading: isLoadingTrees } = useListTrees();
  const { data: alerts, isLoading: isLoadingAlerts } = useListAlerts();
  const createTree = useCreateTree();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isAddTreeOpen, setIsAddTreeOpen] = useState(false);
  const [newTreeName, setNewTreeName] = useState("");

  const filteredTrees = useMemo(() => {
    if (!trees) return [];
    if (!search.trim()) return trees;
    return trees.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  }, [trees, search]);

  const handleAddTree = () => {
    if (!newTreeName.trim()) return;
    createTree.mutate(
      { data: { name: newTreeName } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTreesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setIsAddTreeOpen(false);
          setNewTreeName("");
          toast({ title: "Tree added", description: "The new tree has been added to monitoring." });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to add tree.", variant: "destructive" });
        }
      }
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Orchard Overview</h1>
          <p className="text-muted-foreground mt-1">
            Good morning. {summary?.lastSyncAt ? `Last robot sync was at ${formatTime(summary.lastSyncAt)}.` : "Waiting for robot sync..."}
          </p>
        </div>
        
        <Dialog open={isAddTreeOpen} onOpenChange={setIsAddTreeOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Tree
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register New Tree</DialogTitle>
              <DialogDescription>
                Add a new tree for the robot to monitor on its next route.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="name" className="mb-2 block">Tree Name / Identifier</Label>
              <Input 
                id="name" 
                placeholder="e.g. Apple Row 3 - Tree 12" 
                value={newTreeName}
                onChange={(e) => setNewTreeName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddTreeOpen(false)}>Cancel</Button>
              <Button onClick={handleAddTree} disabled={createTree.isPending || !newTreeName.trim()}>
                {createTree.isPending ? "Adding..." : "Add Tree"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Monitored" 
          value={isLoadingSummary ? null : summary?.totalTrees} 
          icon={TreePine}
          trend="All active"
        />
        <SummaryCard 
          title="Healthy" 
          value={isLoadingSummary ? null : summary?.healthyCount} 
          icon={CheckCircle2}
          valueClassName="text-green-700 dark:text-green-500"
        />
        <SummaryCard 
          title="Stressed" 
          value={isLoadingSummary ? null : summary?.stressedCount} 
          icon={Activity}
          valueClassName={summary?.stressedCount ? "text-orange-600 dark:text-orange-400" : ""}
        />
        <SummaryCard 
          title="Needs Attention" 
          value={isLoadingSummary ? null : summary?.alertCount} 
          icon={AlertTriangle}
          valueClassName={summary?.alertCount ? "text-destructive" : ""}
          alert={summary?.alertCount ? true : false}
        />
      </div>

      {/* Active Alerts */}
      {(!isLoadingAlerts && alerts && alerts.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif text-destructive flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" /> Requires Attention
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map(tree => (
              <AlertCard key={tree.id} tree={tree} />
            ))}
          </div>
        </div>
      )}

      {/* All Trees List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border pb-4">
          <h2 className="text-xl font-serif">All Trees</h2>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search trees..." 
              className="pl-9 bg-card border-card-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoadingTrees ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : filteredTrees.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-xl bg-card/50">
            <TreePine className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">No trees found</h3>
            <p className="text-muted-foreground mt-1">
              {search ? "No trees match your search." : "Add your first tree to start monitoring."}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => setIsAddTreeOpen(true)}>Add Tree</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrees.map(tree => (
              <TreeCard key={tree.id} tree={tree} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, trend, valueClassName, alert }: any) {
  return (
    <Card className={cn("overflow-hidden transition-all duration-200", alert && "border-destructive shadow-sm shadow-destructive/20")}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="mt-2 flex items-baseline gap-2">
              {value === null || value === undefined ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <span className={cn("text-3xl font-serif font-semibold", valueClassName)}>
                  {value}
                </span>
              )}
            </div>
            {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
          </div>
          <div className={cn("p-3 rounded-full", alert ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TreeCard({ tree }: { tree: any }) {
  const status = tree.latestReading?.plantStatus;
  const moisture = tree.latestReading?.moistureValue;
  
  return (
    <Link href={`/trees/${tree.id}`}>
      <Card className="hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer h-full flex flex-col group">
        <CardContent className="p-5 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-serif font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">{tree.name}</h3>
            {tree.alertActive && (
              <div className="w-2 h-2 rounded-full bg-destructive mt-2 flex-shrink-0 animate-pulse" />
            )}
          </div>
          
          <div className="mt-auto space-y-3">
            {tree.latestReading ? (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Activity className="w-4 h-4"/> Health</span>
                  <Badge variant={status === 'healthy' ? 'healthy' : status === 'stressed' ? 'stressed' : 'uncertain'} className="capitalize">
                    {status || 'Unknown'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Droplet className="w-4 h-4"/> Moisture</span>
                  <span className="font-mono">{moisture != null ? `${moisture}%` : '--'}</span>
                </div>
              </>
            ) : (
              <div className="py-2 text-sm text-muted-foreground italic flex items-center justify-center border border-dashed border-border rounded-md bg-muted/20">
                Awaiting first reading
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function AlertCard({ tree }: { tree: any }) {
  const reading = tree.latestReading;
  if (!reading) return null;

  const plantIssue = reading.plantStatus === 'stressed';
  const soilIssue = reading.soilStatus !== 'soil_ok';

  return (
    <Link href={`/trees/${tree.id}`}>
      <Card className="border-destructive/30 bg-destructive/5 hover:border-destructive/50 transition-all cursor-pointer">
        <CardContent className="p-5">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-serif font-semibold text-destructive">{tree.name}</h3>
          </div>
          <div className="space-y-2 mt-3">
            {plantIssue && (
              <div className="text-sm bg-white dark:bg-black/20 p-2 rounded border border-destructive/20 text-destructive/90 flex gap-2 items-start">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{reading.plantMessage || "Plant shows signs of stress"}</span>
              </div>
            )}
            {soilIssue && (
              <div className="text-sm bg-white dark:bg-black/20 p-2 rounded border border-destructive/20 text-orange-700 dark:text-orange-400 flex gap-2 items-start">
                <Droplet className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{reading.soilMessage || "Soil moisture issue detected"}</span>
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-4 text-right">
            Recorded {formatTime(reading.timestamp)}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Needed cn inside this file
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
