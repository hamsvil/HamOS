import { AppLayout } from "@/components/layout/app-layout";
import { useListScheduledJobs } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ScheduledJobs() {
  const { data: jobs, isLoading } = useListScheduledJobs({ query: { enabled: true } });

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Scheduled Jobs</h1>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : jobs?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    No scheduled jobs.
                  </TableCell>
                </TableRow>
              ) : jobs?.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.keyName || `Key #${job.keyId}`}</TableCell>
                  <TableCell className="font-mono text-xs">{job.cronExpression}</TableCell>
                  <TableCell><Badge variant={job.isActive ? 'default' : 'secondary'}>{job.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-sm">{job.lastRunAt ? new Date(job.lastRunAt).toLocaleString() : 'Never'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
}
