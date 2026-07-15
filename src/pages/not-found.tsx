import { Card, CardContent } from "@/components/ui/card";
import { TreePine } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-10 pb-8 px-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
            <TreePine className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            Lost in the Orchard
          </h1>
          <p className="text-muted-foreground mb-8">
            The page you're looking for seems to have been pruned or never existed.
          </p>
          <Link href="/">
            <Button className="w-full">
              Return to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
