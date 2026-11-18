import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./api";
import { Button, ErrorState, Loading, Notice, Text, confirm } from "./ui";

export function PendingIngest({
  id,
  open,
  leave,
  clear,
}: {
  id: string;
  open: (documentId: string) => void;
  leave: () => void;
  clear: () => Promise<void>;
}) {
  const [error, setError] = useState<unknown>(null);
  const job = useQuery({
    queryKey: ["ingest-job", id],
    queryFn: ({ signal }) => api.ingestJob(id, signal),
    refetchInterval: ({ state }) =>
      state.data?.status === "completed" ||
      state.data?.status === "failed" ||
      (state.error instanceof ApiError && state.error.status === 404)
        ? false
        : 3000,
    staleTime: 0,
  });
  const retry = useMutation({
    mutationFn: () => api.retryIngestJob(id),
    onSuccess: () => job.refetch(),
  });
  const expired = job.error instanceof ApiError && job.error.status === 404;
  const status = expired ? undefined : job.data?.status;
  const documentId = job.data?.documentId;
  const clearTracking = async () => {
    try {
      await clear();
    } catch (failure) {
      setError(failure);
    }
  };

  return (
    <>
      <Text size="title">Upload status</Text>
      {job.fetchStatus === "paused" ? (
        <Notice message="You’re offline. Upload status will refresh when you reconnect." />
      ) : (
        job.isPending && <Loading label="Checking upload status…" />
      )}
      {expired ? (
        <Notice message="This upload status has expired." />
      ) : (
        job.error && (
          <ErrorState error={job.error} retry={() => void job.refetch()} />
        )
      )}
      {status === "queued" && (
        <Notice message="Waiting to process. You can leave and return to check this upload." />
      )}
      {status === "processing" && (
        <Notice message="Processing your document. You can leave and return to check this upload." />
      )}
      {status === "failed" && (
        <Notice error message={job.data?.error || "Processing failed."} />
      )}
      {status === "completed" && <Notice message="Document added." />}
      {status === "completed" && documentId && (
        <Button label="Open document" onPress={() => open(documentId)} />
      )}
      {status === "failed" && (
        <Button
          label="Retry processing"
          busy={retry.isPending}
          onPress={() => {
            if (!retry.isPending) retry.mutate();
          }}
        />
      )}
      {(expired || status === "failed" || status === "completed") && (
        <Button
          kind="secondary"
          label="Start another upload"
          disabled={retry.isPending}
          onPress={() => void clearTracking()}
        />
      )}
      {(status === "queued" || status === "processing") && (
        <Button
          kind="secondary"
          label="Stop tracking this upload"
          onPress={() =>
            void confirm(
              "Stop tracking this upload?",
              "Processing will continue in the workspace.",
              "Stop tracking",
            ).then((ok) => {
              if (ok) void clearTracking();
            })
          }
        />
      )}
      {error || retry.error ? (
        <ErrorState error={error || retry.error} />
      ) : null}
      <Button kind="secondary" label="Close upload status" onPress={leave} />
    </>
  );
}
