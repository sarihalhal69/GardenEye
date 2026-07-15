import { Sidebar } from "./sidebar"

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-0 overflow-hidden relative">
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-20">
          {children}
        </main>
      </div>
    </div>
  )
}
