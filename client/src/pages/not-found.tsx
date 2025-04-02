import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black">
      <Card className="w-full max-w-md mx-4 bg-zinc-900 border-zinc-800 text-white">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center mb-6">
            <AlertCircle className="h-16 w-16 text-pink-500 mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
              404
            </h1>
            <p className="text-xl font-medium text-white mt-2">page not found</p>
          </div>

          <p className="mt-4 text-sm text-zinc-400 text-center mb-6">
            the page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex justify-center">
            <Link href="/">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white lowercase">
                return to home
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
