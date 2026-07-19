import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Flag, Save, Trash2 } from "lucide-react";
import { useDrive, useSaveRoute, type RouteStop, type RouteStep } from "@/lib/api-client";

const SPEED = 0.3;
const RESEND_MS = 800; // keep the rover's ~3s heartbeat happy while a button is held

type Action = RouteStep["action"];

const DIRECTION_VECTORS: Record<Action, { left: number; right: number }> = {
  forward: { left: SPEED, right: SPEED },
  backward: { left: -SPEED, right: -SPEED },
  turn_left: { left: -SPEED, right: SPEED },
  turn_right: { left: SPEED, right: -SPEED },
};

export default function Drive() {
  const [, setLocation] = useLocation();
  const drive = useDrive();
  const saveRoute = useSaveRoute();

  const [stops, setStops] = useState<RouteStop[]>([]);
  const [currentSteps, setCurrentSteps] = useState<RouteStep[]>([]);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [treeName, setTreeName] = useState("");
  const [markerId, setMarkerId] = useState("");
  const [saved, setSaved] = useState(false);

  const pressStart = useRef<number | null>(null);
  const resendInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSending = () => {
    if (resendInterval.current) {
      clearInterval(resendInterval.current);
      resendInterval.current = null;
    }
  };

  const startAction = (action: Action) => {
    if (activeAction) return; // already driving
    setActiveAction(action);
    pressStart.current = Date.now();
    const vec = DIRECTION_VECTORS[action];
    drive.mutate(vec);
    resendInterval.current = setInterval(() => drive.mutate(vec), RESEND_MS);
  };

  const endAction = () => {
    if (!activeAction || pressStart.current === null) return;
    const seconds = Math.round(((Date.now() - pressStart.current) / 100)) / 10; // one decimal
    stopSending();
    drive.mutate({ left: 0, right: 0 });
    if (seconds > 0) {
      setCurrentSteps((prev) => [...prev, { action: activeAction, seconds, speed: SPEED }]);
    }
    setActiveAction(null);
    pressStart.current = null;
  };

  useEffect(() => () => stopSending(), []);

  const addStop = () => {
    if (!treeName.trim() || currentSteps.length === 0) return;
    setStops((prev) => [
      ...prev,
      {
        treeName: treeName.trim(),
        markerId: markerId ? parseInt(markerId, 10) : null,
        steps: currentSteps,
      },
    ]);
    setCurrentSteps([]);
    setTreeName("");
    setMarkerId("");
  };

  const removeStop = (i: number) => setStops((prev) => prev.filter((_, idx) => idx !== i));

  const handleSaveRoute = () => {
    setSaved(false);
    saveRoute.mutate({ stops }, { onSuccess: () => setSaved(true) });
  };

  const DirButton = ({ action, icon: Icon, className }: { action: Action; icon: typeof ArrowUp; className?: string }) => (
    <button
      className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-colors select-none ${
        activeAction === action ? "bg-primary border-primary text-primary-foreground" : "border-border hover:bg-muted"
      } ${className || ""}`}
      onMouseDown={() => startAction(action)}
      onMouseUp={endAction}
      onMouseLeave={() => activeAction === action && endAction()}
      onTouchStart={(e) => { e.preventDefault(); startAction(action); }}
      onTouchEnd={(e) => { e.preventDefault(); endAction(); }}
    >
      <Icon className="w-6 h-6" />
    </button>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="text-3xl font-serif">Drive & Record Route</h1>
        <p className="text-muted-foreground mt-1">
          Press and hold to steer the car. When you reach a tree, name it below to save that leg of the trip.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-col items-center gap-2">
          <DirButton action="forward" icon={ArrowUp} />
          <div className="flex gap-2">
            <DirButton action="turn_left" icon={ArrowLeft} />
            <DirButton action="backward" icon={ArrowDown} />
            <DirButton action="turn_right" icon={ArrowRight} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {currentSteps.length > 0
              ? `${currentSteps.length} move(s) recorded since the last stop`
              : "Drive toward the first tree, then name it below"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add stop here</CardTitle>
          <CardDescription>You've arrived at a tree — name it and note its marker number.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="mb-1 block text-sm">Tree name</Label>
            <Input value={treeName} onChange={(e) => setTreeName(e.target.value)} placeholder="Tree 1" className="w-40" />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Marker # (optional)</Label>
            <Input
              type="number" min={0} max={49}
              value={markerId} onChange={(e) => setMarkerId(e.target.value)}
              placeholder="e.g. 3" className="w-28"
            />
          </div>
          <Button onClick={addStop} disabled={!treeName.trim() || currentSteps.length === 0}>
            <Flag className="w-4 h-4 mr-1" /> Add stop
          </Button>
        </CardContent>
      </Card>

      {stops.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Recorded stops</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stops.map((stop, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div>
                  <span className="font-medium">#{i + 1} {stop.treeName}</span>
                  <span className="text-muted-foreground text-sm ml-2">
                    {stop.steps.length} step(s){stop.markerId != null ? `, marker ${stop.markerId}` : ""}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeStop(i)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-lg border">
        <Button onClick={handleSaveRoute} disabled={stops.length === 0 || saveRoute.isPending}>
          <Save className="w-4 h-4 mr-1" /> {saveRoute.isPending ? "Saving..." : "Save route"}
        </Button>
        <Button variant="outline" onClick={() => setLocation("/route")}>View saved route</Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
        {saveRoute.isError && <span className="text-sm text-destructive">Failed to save. Try again.</span>}
      </div>
    </div>
  );
}
