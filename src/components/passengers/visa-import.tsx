"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, Loader2, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { renderPdfPagesToBlobs } from "@/lib/visa/client-render-pdf";
import { isExtractionComplete, mergeExtractions } from "@/lib/visa/parse-fields";
import type { FieldResult, VisaExtractionResult, VisaFieldKey } from "@/lib/visa/types";
import type { PassengerVisaFields } from "@/lib/visa/apply-fields";

const FIELD_META: Array<{ key: VisaFieldKey; label: string }> = [
  { key: "fullName", label: "Full Name" },
  { key: "passportNumber", label: "Passport Number" },
  { key: "nationality", label: "Nationality" },
  { key: "visaType", label: "Visa Type" },
];

interface VisaImportButtonProps {
  onConfirm: (fields: PassengerVisaFields) => void;
  disabled?: boolean;
}

export function VisaImportButton({ onConfirm, disabled }: VisaImportButtonProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [result, setResult] = useState<VisaExtractionResult | null>(null);
  const [draft, setDraft] = useState<PassengerVisaFields>({
    fullName: "",
    passportNumber: "",
    nationality: "",
    visaType: "",
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFile(null);
    setResult(null);
    setError("");
    setBusy(false);
    setDraft({ fullName: "", passportNumber: "", nationality: "", visaType: "" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    if (busy || inFlight.current) return;
    setOpen(false);
    reset();
  };

  const applyResult = (payload: VisaExtractionResult) => {
    setResult(payload);
    setDraft({
      fullName: payload.fullName,
      passportNumber: payload.passportNumber,
      nationality: payload.nationality,
      visaType: payload.visaType,
    });
  };

  const extractFile = async (selected: File, renderedPage?: Blob) => {
    const formData = new FormData();
    formData.append("file", renderedPage ? new File([renderedPage], "visa-page.png", { type: "image/png" }) : selected);
    const res = await fetch("/api/extract-visa", { method: "POST", body: formData });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error || "Failed to extract visa information");
    }
    return payload as VisaExtractionResult;
  };

  const handleFiles = async (selected: File | undefined) => {
    if (!selected || inFlight.current) return;
    inFlight.current = true;
    setOpen(true);
    setBusy(true);
    setError("");
    setResult(null);
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));

    try {
      let payload = await extractFile(selected);
      const isPdf = selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf");
      if ((payload.needsPageRender || !isExtractionComplete(payload)) && isPdf) {
        const pages = await renderPdfPagesToBlobs(selected, 2);
        for (const page of pages) {
          const ocrPayload = await extractFile(selected, page);
          payload = mergeExtractions(payload, ocrPayload);
          if (isExtractionComplete(payload)) break;
        }
      }
      applyResult(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract visa information");
    } finally {
      inFlight.current = false;
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const retry = async () => {
    if (!file || busy || inFlight.current) return;
    await handleFiles(file);
  };

  const confirm = () => {
    if (busy || inFlight.current || !result) return;
    onConfirm({
      fullName: draft.fullName.trim(),
      passportNumber: draft.passportNumber.trim(),
      nationality: draft.nationality.trim(),
      visaType: draft.visaType.trim(),
    });
    toast("Visa fields copied into the Add Passenger form. Review them, then save.", "success");
    setOpen(false);
    reset();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
      >
        <ScanSearch className="h-4 w-4" />
        Import Passenger from Visa
      </Button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp,image/gif,image/bmp,image/tiff,.pdf,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff"
        multiple
        onChange={(event) => {
          const selectedFiles = Array.from(event.target.files || []);
          if (selectedFiles.length > 0) {
            void handleFiles(selectedFiles);
          }
        }}
      />
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <Modal open={open} onClose={close} title="Review visa extraction" size="xl" overlayClassName="z-[80]">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <div className="border-b border-slate-200 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Source document
            </div>
            <div className="flex min-h-[280px] items-center justify-center p-3">
              {file && previewUrl && isImageFile(file) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Uploaded visa" className="max-h-[420px] w-full object-contain" />
              ) : previewUrl ? (
                <iframe title="Visa PDF preview" src={previewUrl} className="h-[420px] w-full rounded-md bg-white" />
              ) : (
                <div className="text-sm text-slate-500">No document loaded</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {busy && (
              <div className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading the visa. This stays on your server and is not sent to an external OCR API.
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {result && (
              <p className="text-xs text-slate-500">
                Extracted via {methodLabel(result.method)}. Highlighted fields need a manual check before you save the passenger.
              </p>
            )}
            {FIELD_META.map(({ key, label }) => {
              const meta = result?.fields[key];
              return (
                <ReviewField
                  key={key}
                  label={label}
                  value={draft[key]}
                  meta={meta}
                  disabled={busy}
                  onChange={(value) => setDraft((current) => ({ ...current, [key]: value }))}
                />
              );
            })}
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <Button type="button" variant="outline" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" variant="secondary" onClick={() => void retry()} disabled={busy || !file}>
                <FileUp className="h-4 w-4" />
                Retry
              </Button>
              <Button type="button" onClick={confirm} disabled={busy || !result}>
                Confirm and Fill
              </Button>
            </div>
          </div>
        </div>
          </Modal>,
          document.body
        )}
    </>
  );
}

function ReviewField({
  label,
  value,
  meta,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  meta?: FieldResult;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const status = !value ? "missing" : meta?.status === "ok" && value === meta.value ? "ok" : "needs_review";
  return (
    <div>
      <Input
        label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          status === "missing" && "border-red-300 bg-red-50",
          status === "needs_review" && "border-amber-300 bg-amber-50",
          status === "ok" && "border-emerald-300"
        )}
      />
      <p className="mt-1 text-xs text-slate-500">
        {status === "missing"
          ? "Missing — leave blank unless you can read it from the document."
          : status === "needs_review"
            ? meta?.warning || "Please confirm this value against the document."
            : "Matched from a labeled field. Still confirm before saving."}
      </p>
    </div>
  );
}

function isImageFile(file: File) {
  return file.type.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|tiff?)$/i.test(file.name);
}

function methodLabel(method: VisaExtractionResult["method"]) {
  if (method === "pdf_text") return "PDF text";
  if (method === "hybrid") return "PDF text plus OCR";
  return "OCR";
}
