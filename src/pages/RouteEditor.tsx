import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, ArrowUp, ArrowDown, MoveRight } from "lucide-react";
import { useGetRoute, useSaveRoute, type RouteStop, type RouteStep } from "@/lib/api-client";

const ACTION_LABELS: Record<RouteStep["action"], string> = {
  forward: "Forward",
  backward: "Backward",
  turn_left: "Turn left",
  turn_right: "Turn right",
};

function emptyStep(): RouteStep {
  return { action: "forward", seconds: 2, speed: 0.3 };
}

function emptyStop(): RouteStop {
  return { treeName: "", steps: [emptyStep()] };
}

export default function RouteEditor() {
  const { data, isLoading } = useGetRoute();
  const saveRoute = useSaveRoute();
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data) setStops(data.length ? data : [emptyStop()]);
  }, [data]);

  const updateStop = (i: number, patch: Partial<RouteStop>) => {
    setStops((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  };

  const updateStep = (stopIdx: number, stepIdx: number, patch: Partial<RouteStep>) => {
    setStops((prev) =>
      prev.map((s, idx) =>
        idx !== stopIdx
          ? s
          : { ...s, steps: s.steps.map((st, si) => (si === stepIdx ? { ...st, ...patch } : st)) }
      )
    );
  };

  const addStep = (stopIdx: number) => {
    setStops((prev) =>
      prev.map((s, idx) => (idx !== stopIdx ? s : { ...s, steps: [...s.steps, emptyStep()] }))
    );
  };

  const removeStep = (stopIdx: number, stepIdx: number) => {
    setStops((prev) =>
      prev.map((s, idx) =>
        idx !== stopIdx ? s : { ...s, steps: s.steps.filter((_, si) => si !== stepIdx) }
      )
    );
  };

  const addStop = () => setStops((prev) => [...prev, emptyStop()]);
  const removeStop = (i: number) => setStops((prev) => prev.filter((_, idx) => idx !== i));
  const moveStop = (i: number, dir: -1 | 1) => {
    setStops((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const handleSave = () => {
    setSaved(false);
    saveRoute.mutate({ stops }, { onSuccess: () => setSaved(true) });
  };

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading route...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-serif">Route Editor</h1>
        <p className="text-muted-foreground mt-1">
          Define the trees the car visits, in order, and the movement steps to reach each one
          from the previous stop.
        </p>
      </div>

      {stops.map((stop, stopIdx) => (
        <Card key={stopIdx}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3 flex-1">
              <span className="text-muted-foreground font-mono text-sm">#{stopIdx + 1}</span>
              {stop.isReturn && (
                <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">🏠 Return to station</span>
              )}
              <Input
                placeholder="Tree name (e.g. Tree_1)"
                value={stop.treeName}
                onChange={(e) => updateStop(stopIdx, { treeName: e.target.value })}
                className="max-w-xs"
              />
              <Input
                type="number" min={0} max={49}
                placeholder="Marker #"
                value={stop.markerId ?? ""}
                onChange={(e) => updateStop(stopIdx, { markerId: e.target.value ? parseInt(e.target.value, 10) : null })}
                className="w-24"
              />
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => moveStop(stopIdx, -1)} disabled={stopIdx === 0}>
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => moveStop(stopIdx, 1)} disabled={stopIdx === stops.length - 1}>
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeStop(stopIdx)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <CardDescription>
              {stopIdx === 0 ? "Steps from the start position:" : `Steps from stop #${stopIdx} to here:`}
            </CardDescription>
            {stop.steps.map((step, stepIdx) => (
              <div key={stepIdx} className="flex items-center gap-2 flex-wrap">
                <Select
                  value={step.action}
                  onValueChange={(v) => updateStep(stopIdx, stepIdx, { action: v as RouteStep["action"] })}
                >
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Input
                    type="number" min={0} step={0.1}
                    value={step.seconds}
                    onChange={(e) => updateStep(stopIdx, stepIdx, { seconds: parseFloat(e.target.value) || 0 })}
                    className="w-20"
                  />
                  <Label className="text-muted-foreground text-sm">sec</Label>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    type="number" min={0} max={0.5} step={0.05}
                    value={step.speed}
                    onChange={(e) => updateStep(stopIdx, stepIdx, { speed: parseFloat(e.target.value) || 0 })}
                    className="w-20"
                  />
                  <Label className="text-muted-foreground text-sm">speed</Label>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeStep(stopIdx, stepIdx)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addStep(stopIdx)}>
              <Plus className="w-4 h-4 mr-1" /> Add step
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button variant="outline" onClick={addStop} className="w-full">
        <Plus className="w-4 h-4 mr-1" /> Add tree stop
      </Button>

      <div className="flex items-center gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-lg border">
        <Button onClick={handleSave} disabled={saveRoute.isPending}>
          {saveRoute.isPending ? "Saving..." : "Save route"}
        </Button>
        {saved && <span className="text-sm text-green-600 flex items-center gap-1"><MoveRight className="w-4 h-4" /> Saved — the car will use this next run</span>}
        {saveRoute.isError && <span className="text-sm text-destructive">Failed to save. Try again.</span>}
      </div>
    </div>
  );
}
