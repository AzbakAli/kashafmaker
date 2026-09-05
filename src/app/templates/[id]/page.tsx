"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader, LoadingSpinner } from "@/components/ui/card";
import { TemplateEditor } from "@/components/pdf-template-editor/template-editor";
import { TemplateFieldConfig } from "@/lib/pdf/types";

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>();
  const [template, setTemplate] = useState<{
    id: string;
    name: string;
    pageCount: number;
    fieldConfig: TemplateFieldConfig;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/templates/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTemplate({
          ...data,
          fieldConfig: data.fieldConfig || { fields: [] },
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (config: TemplateFieldConfig) => {
    const res = await fetch(`/api/templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldConfig: config }),
    });
    if (!res.ok) throw new Error("Save failed");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (!template) {
    return (
      <AppLayout>
        <p>Template not found</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader
        title={template.name}
        description="Drag fields onto the PDF and save coordinates"
      />
      <TemplateEditor
        templateId={template.id}
        pdfUrl={`/api/templates/${template.id}?pdf=1`}
        initialConfig={template.fieldConfig}
        pageCount={template.pageCount}
        onSave={handleSave}
      />
    </AppLayout>
  );
}
