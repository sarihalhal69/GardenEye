import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Flag, Save, Trash2, Home } from "lucide-react";
import { useDrive, useSaveRouteStops, useConfigureRoverKeepalive, type RouteStop, type RouteStep } from "@/lib/api-client";

const SPEED = 0.3;
const TURN_SPEED = 0.45; // stronger than forward/backward - turning needs more torque to overcome floor friction
const ROVER_HEARTBEAT_TIMEOUT_MS = 15000; // tell the rover not to auto-stop for 15s at a time

type Action = RouteStep["action"];

const DIRECTION_VECTORS: Record<Action, { left: number; right: number }> = {
  forward: { left: SPEED, right: SPEED },
  backward: { left: -SPEED, right: -SPEED },
  turn_left: { left: -TURN_SPEED, right: TURN_SPEED },
  turn_right: { left: TURN_SPEED, right: -TURN_SPEED },
};

export default function Drive() {
  const { id } = useParams<{ id: string }>();
  const routeId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const drive = useDrive();
  const saveStops = useSaveRouteStops();
  const configureKeepalive = useConfigureRoverKeepalive();

  const [stops, setStops] = useState<RouteStop[]>([]);
  const [currentSteps, setCurrentSteps] = useState<RouteStep[]>([]);
  const [activeAction, setActiveAction] = useState<Action | null>(null);
  const [treeName, setTreeName] = useState("");
  const [markerId, setMarkerId] = useState("");
  const [saved, setSaved] = useState(false);
  const [returnedToStation, setReturnedToStation] = useState(false);

  const pressStart = useRef<number | null>(null);
  const keepaliveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Tell the rover once not to auto-stop for a while, so we don't have to
    // hammer its small onboard server with constant resends while driving.
    configureKeepalive.mutate({ timeoutMs: ROVER_HEARTBEAT_TIMEOUT_MS });
    // Refresh that setting periodically in the background (well under the
    // timeout window) in case the rover resets it after each move command.
    keepaliveInterval.current = setInterval(
      () => configureKeepalive.mutate({ timeoutMs: ROVER_HEARTBEAT_TIMEOUT_MS }),
      ROVER_HEARTBEAT_TIMEOUT_MS - 5000
    );
    return () => {
      if (keepaliveInterval.current) clearInterval(keepaliveInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startAction = (action: Action) => {
    if (activeAction) return; // already driving
    setActiveAction(action);
    pressStart.current = Date.now();
    drive.mutate(DIRECTION_VECTORS[action]);
  };

  const endAction = () => {
    if (!activeAction || pressStart.current === null) return;
    const seconds = Math.round(((Date.now() - pressStart.current) / 100)) / 10; // one decimal
    drive.mutate({ left: 0, right: 0 });
    if (seconds > 0) {
      const recordedSpeed = (activeAction === "turn_left" || activeAction === "turn_right") ? TURN_SPEED : SPEED;
      setCurrentSteps((prev) => [...prev, { action: activeAction, seconds, speed: recordedSpeed }]);
    }
    setActiveAction(null);
    pressStart.current = null;
  };

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

  const removeStop = (i: number) => {
    setStops((prev) => {
      const removed = prev[i];
      if (removed?.isReturn) setReturnedToStation(false);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const markBackAtStation = () => {
    if (currentSteps.length === 0) return;
    setStops((prev) => [...prev, { treeName: "Station", isReturn: true, steps: currentSteps }]);
    setCurrentSteps([]);
    setReturnedToStation(true);
  };

  const handleSaveRoute = () => {
    setSaved(false);
    saveStops.mutate({ routeId, stops }, { onSuccess: () => setSaved(true) });
  };

  const DirButton = ({ action, icon: Icon, className }: { action: Action; icon: typeof ArrowUp; className?: string }) => (
    <button
      disabled={returnedToStation}
      className={`w-16 h-16 rounded-lg border-2 flex items-center justify-center transition-colors select-none disabled:opacity-40 disabled:cursor-not-allowed ${
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
        <Button variant="ghost" size="sm" onClick={() => setLocation("/routes")} className="mb-2 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to routes
        </Button>
        <h1 className="text-3xl font-serif">Drive & Record Route</h1>
        <p className="text-muted-foreground mt-1">
          Press and hold to steer the car. When you reach a tree, name it below to save that leg of the trip.
        </p>
      </div>

      <Card className="bg-muted/40 border-dashed">
        <CardContent className="pt-6">
          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Put the car at its home/station point before you start.</li>
            <li>Drive it to the first tree using the buttons below.</li>
            <li>Click <strong>"Add stop"</strong>, name the tree, and note its marker number.</li>
            <li>Repeat for each remaining tree.</li>
            <li>After the last tree, drive the car back to the station point.</li>
            <li>Click <strong>"I'm back at the station"</strong> instead of "Add stop" for that final leg.</li>
            <li>Click <strong>"Save route"</strong> — the car will now repeat this automatically, ending back home each time.</li>
          </ol>
        </CardContent>
      </Card>

      {returnedToStation && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6 text-green-800 text-sm">
            Route complete — the car will return to the station after its last tree. Click "Save route" below.
          </CardContent>
        </Card>
      )}

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
          {drive.isError && (
            <p className="text-xs text-destructive mt-1">
              Couldn't reach the car: {drive.error instanceof Error ? drive.error.message : "unknown error"}
            </p>
          )}
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
            <Input value={treeName} onChange={(e) => setTreeName(e.target.value)} placeholder="Tree 1" className="w-40" disabled={returnedToStation} />
          </div>
          <div>
            <Label className="mb-1 block text-sm">Marker # (optional)</Label>
            <Input
              type="number" min={0} max={49}
              value={markerId} onChange={(e) => setMarkerId(e.target.value)}
              placeholder="e.g. 3" className="w-28" disabled={returnedToStation}
            />
          </div>
          <Button onClick={addStop} disabled={returnedToStation || !treeName.trim() || currentSteps.length === 0}>
            <Flag className="w-4 h-4 mr-1" /> Add stop
          </Button>
          {stops.some((s) => !s.isReturn) && !returnedToStation && (
            <Button variant="outline" onClick={markBackAtStation} disabled={currentSteps.length === 0}>
              <Home className="w-4 h-4 mr-1" /> I'm back at the station
            </Button>
          )}
        </CardContent>
      </Card>

      {stops.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Recorded stops</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stops.map((stop, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                <div>
                  <span className="font-medium">
                    {stop.isReturn ? "🏠 Return to station" : `#${i + 1} ${stop.treeName}`}
                  </span>
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
        <Button onClick={handleSaveRoute} disabled={stops.length === 0 || saveStops.isPending}>
          <Save className="w-4 h-4 mr-1" /> {saveStops.isPending ? "Saving..." : "Save route"}
        </Button>
        <Button variant="outline" onClick={() => setLocation(`/routes/${routeId}/edit`)}>View saved route</Button>
        {saved && <span className="text-sm text-green-600">Saved!</span>}
        {saveStops.isError && <span className="text-sm text-destructive">Failed to save. Try again.</span>}
      </div>
    </div>
  );
}
