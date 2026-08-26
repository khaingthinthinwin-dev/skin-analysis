import { useState } from 'react'
import { Sparkles, Camera, Upload, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function SkinAnalysis() {
  const [analyzing, setAnalyzing] = useState(false)
  const [completed, setCompleted] = useState(true)

  const handleStartScan = () => {
    setAnalyzing(true)
    setTimeout(() => {
      setAnalyzing(false)
      setCompleted(true)
    }, 1500)
  }

  return (
    <div className="space-y-6 p-2 lg:p-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">AI Skin Analysis Console</h1>
        <p className="text-sm text-muted-foreground">Upload or capture a photo to detect skin metrics and concern patterns</p>
      </div>

      {/* Main Scan Action Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upload & Capture Panel */}
        <Card className="border-border/80 shadow-xs flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="h-5 w-5 text-purple-600" /> Facial Skin Scan
            </CardTitle>
            <CardDescription>Position your face in good lighting for high accuracy</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-purple-200 dark:border-purple-800 rounded-2xl p-8 text-center bg-purple-50/40 dark:bg-purple-950/20 flex flex-col items-center justify-center space-y-3">
              <div className="p-4 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-600">
                <Upload className="h-8 w-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Drag & drop photo or click to browse</p>
                <p className="text-xs text-muted-foreground">Supports JPG, PNG, WebP (Max 10MB)</p>
              </div>
            </div>

            <Button
              onClick={handleStartScan}
              disabled={analyzing}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-bold"
            >
              {analyzing ? (
                <>
                  <Sparkles className="mr-2 h-5 w-5 animate-spin" /> Analyzing Skin Metrics...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" /> Run AI Analysis Scan
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Latest Results Summary */}
        <Card className="border-border/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Latest Scan Results
            </CardTitle>
            <CardDescription>Analyzed on August 26, 2026</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {completed ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground">Detected Skin Type</span>
                  <span className="text-sm font-extrabold text-purple-700 dark:text-purple-300">Combination Skin</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Hydration Level</span>
                    <span className="text-emerald-600">78% (Good)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[78%] bg-emerald-500 rounded-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Oil Balance</span>
                    <span className="text-amber-600">62% (Moderate T-Zone)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full w-[62%] bg-amber-500 rounded-full" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-purple-100/60 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1">
                  <div className="font-bold text-purple-800 dark:text-purple-200 flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4 text-pink-500" /> Recommended Action Routine
                  </div>
                  <p className="text-muted-foreground">
                    Use gentle foaming cleanser morning & night, followed by niacinamide serum to control T-zone shine.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-8">No scan performed yet. Click scan to analyze your skin.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
