"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, Card, CardContent, Badge, EmptyState, LoadingSpinner } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Download, Printer, Trash2 } from "lucide-react";

interface DocumentRow {
  id: string;
  documentNumber: string;
  createdAt: string;
  status: string;
  passengerCount: number;
  ride: {
    rideNumber: string;
    date: string;
    driver: { name: string } | null;
    vehicle: { plateNumber: string } | null;
  };
  template: { name: string };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch(`/api/documents?q=${search}`)
      .then((r) => r.json())
      .then((data) => setDocuments(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <AppLayout>
      <PageHeader
        title="Kashaf Documents"
        description="Generated Kashaf PDFs and document history"
      />

      <div className="mb-4">
        <input
          className="w-full rounded-lg border py-2 px-4 text-sm"
          placeholder="Search by document or ride number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              title="No documents yet"
              description="Generate a Kashaf from a ride to see it here"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="px-4 py-3 text-left">Document #</th>
                  <th className="px-4 py-3 text-left">Ride #</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Driver</th>
                  <th className="px-4 py-3 text-left">Vehicle</th>
                  <th className="px-4 py-3 text-left">Passengers</th>
                  <th className="px-4 py-3 text-left">Template</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium">{doc.documentNumber}</td>
                    <td className="px-4 py-3">{doc.ride.rideNumber}</td>
                    <td className="px-4 py-3">{formatDate(doc.createdAt)}</td>
                    <td className="px-4 py-3">{doc.ride.driver?.name || "—"}</td>
                    <td className="px-4 py-3">{doc.ride.vehicle?.plateNumber || "—"}</td>
                    <td className="px-4 py-3">{doc.passengerCount}</td>
                    <td className="px-4 py-3">{doc.template.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={doc.status === "GENERATED" ? "success" : "default"}>
                        {doc.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" href={`/api/documents/${doc.id}?pdf=1`} target="_blank" rel="noopener noreferrer">
                          <Printer className="h-3 w-3" /> View
                        </Button>
                        <Button variant="outline" size="sm" href={`/api/documents/${doc.id}?download=1`}>
                          <Download className="h-3 w-3" /> Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!window.confirm("Delete this Kashaf PDF? This cannot be undone.")) return;
                            const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
                            if (res.ok) {
                              fetch(`/api/documents?q=${search}`)
                                .then((r) => r.json())
                                .then((data) => setDocuments(Array.isArray(data) ? data : []));
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                        <button
                          type="button"
                          className="text-xs text-indigo-600 hover:underline"
                          onClick={async () => {
                            const res = await fetch(`/api/documents/${doc.id}`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ action: "regenerate" }),
                            });
                            if (res.ok) {
                              fetch(`/api/documents?q=${search}`)
                                .then((r) => r.json())
                                .then((data) => setDocuments(Array.isArray(data) ? data : []));
                            }
                          }}
                        >
                          Regenerate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
