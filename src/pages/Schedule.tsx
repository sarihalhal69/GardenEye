import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Check } from "lucide-react";
import { useGetRoute, useSaveSchedule, type ScheduleEntry } from "@/lib/api-client";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Schedule() {
  const { id } = useParams<{ id: string }>();
  const routeId = parseInt(id, 10);
  const [, setLocation] = useLocation();
  const { data: route, isLoading } = useGetRoute(routeId);
  const saveSchedule = useSaveSchedule();

  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [newDays, setNewDays] = useState<Set<number>>(new Set());
  const [newTime, setNewTime] = useState("07:00");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (route) setEntries(route.schedule);
  }, [route]);

  const toggleNewDay = (day: number) => {
    setNewDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const addTimeSlot = () => {
    if (newDays.size === 0 || !newTime) return;
    const additions: ScheduleEntry[] = Array.from(newDays).map((day) => ({ dayOfWeek: day, time: newTime }));
    // avoid exact duplicates
    setEntries((prev) => {
      const existingKeys = new Set(prev.map((e) => `${e.dayOfWeek}-${e.time}`));
      const filtered = additions.filter((a) => !existingKeys.has(`${a.dayOfWeek}-${a.time}`));
      return [...prev, ...filtered];
    });
    setNewDays(new Set());
  };

  const removeEntry = (i: number) => setEntries((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    setSaved(false);
    saveSchedule.mutate({ routeId, entries }, { onSuccess: () => setSaved(true) });
  };

  // Group entries by time for a cleaner display
  const grouped = new Map<string, number[]>();
  for (const e of entries) {
    const days = grouped.get(e.time) || [];
    days.push(e.dayOfWeek);
    grouped.set(e.time, days);
  }

  if (isLoading) return <div className="p-6 text-muted-foreground">Loading schedule...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24">
      <div>
        <Button variant="ghost" size="sm" onClick={() => setLocation("/routes")} className="mb-2 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to routes
        </Button>
        <h1 className="text-3xl font-serif">Schedule{route ? `: ${route.name}` : ""}</h1>
        <p className="text-muted-foreground mt-1">
          Pick which days and times this route runs automatically. The car handles the rest — no need to start it manually.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">Not scheduled yet — add a time below.</p>
          ) : (
            <div className="space-y-2">
              {Array.from(grouped.entries()).map(([time, days]) => (
                <div key={time} className="flex items-center justify-between border-b border-border py-2 last:border-0">
                  <span>
                    <strong>{time}</strong> — {days.sort().map((d) => DAYS[d].slice(0, 3)).join(", ")}
                  </span>
                  <div className="flex gap-1">
                    {days.map((d) => {
                      const idx = entries.findIndex((e) => e.dayOfWeek === d && e.time === time);
                      return (
                        <Button key={d} variant="ghost" size="icon" onClick={() => removeEntry(idx)} title={`Remove ${DAYS[d]}`}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add a time</CardTitle>
          <CardDescription>Pick one or more days, a time, then add.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day, i) => (
              <button
                key={day}
                onClick={() => toggleNewDay(i)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  newDays.has(i)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                {newDays.has(i) && <Check className="w-3 h-3 inline mr-1" />}
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Time</label>
              <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-36" />
            </div>
            <Button onClick={addTimeSlot} disabled={newDays.size === 0}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 sticky bottom-4 bg-background/95 backdrop-blur p-4 rounded-lg border">
        <Button onClick={handleSave} disabled={saveSchedule.isPending}>
          {saveSchedule.isPending ? "Saving..." : "Save schedule"}
        </Button>
        {saved && <span className="text-sm text-green-600">Saved — the car will run automatically at these times.</span>}
        {saveSchedule.isError && <span className="text-sm text-destructive">Failed to save. Try again.</span>}
      </div>
    </div>
  );
}
